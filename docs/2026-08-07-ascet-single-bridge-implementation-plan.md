# ASCET 单 Bridge EXE 优化与实施方案

## 1. 背景

当前 `ascet-extension` 通过 TypeScript 工具层调用 C# CLI，再由统一 CLI 调用大量独立 operation EXE：

```text
TypeScript tool
  -> AscetCli.exe
    -> ExecCommand
      -> Process.Start("AscetXXX.exe")
```

这会带来以下问题：

- 发布目录包含大量 C# EXE，包体积和资产管理成本较高。
- 同一个 operation 同时存在合同、TS wrapper、统一 CLI 路由和独立 EXE，多处定义容易漂移。
- 每次 operation 都可能创建新进程，错误处理、超时和进程回收复杂。
- `AscetCli.exe` 名义上是统一入口，但部分 operation 仍依赖 legacy proxy executable。
- read host、write host 和 one-shot CLI 各自维护部分重复的协议、session 和 dispatcher 逻辑。

最终目标是将运行时资产收敛为：

```text
packages/ascet-extension/ascet-cli/bin/
  AscetBridge.exe
  Ascetapidll/
    Etas.AscetNET.dll
```

TypeScript 继续负责工具、调度、审批、索引和输出处理；C# Bridge 仅负责 ASCET ToolAPI 互操作和结构化 DTO 返回。

---

## 2. 现状分析

分析目录：

```text
C:\Repo\09_ASCETCopilot\pi-ascet-extension-prototype
```

### 2.1 Operation 路由

`ascetcli/src/AscetCli/Routing/OperationRegistry.cs` 当前注册约 58 个 operation：

- 21 个未配置 legacy executable。
- 37 个仍配置 `LegacyProxyExecutable`。
- 部分配置了 legacy executable 的 operation 已经在 `ExecCommand` 中有直接实现，但 registry 尚未完成清理。

`ExecCommand.cs` 的默认分支仍调用：

```csharp
ProcessStartInfo startInfo = new ProcessStartInfo();
startInfo.FileName = executablePath;
process.Start();
```

因此当前单 CLI 仍然依赖大量独立 EXE。

### 2.2 Host 实现

当前存在两套 host 代码：

- `AscetReadHostServer`
- `AscetWriteHostServer`

存在以下缺口：

1. `AscetCli.exe host --lane read` 尚未连接 `AscetReadHostServer`，会返回 `not_implemented`。
2. 真正的 read host 仍然是独立 `AscetReadHost.exe`。
3. write host 默认构造函数没有创建 `AscetLiveContext` 和 `AscetWriteHostContext`。
4. read host 在后台 STA 线程创建 session，随后可能在主线程使用，存在 ToolAPI 线程亲和风险。
5. read/write dispatcher 只覆盖部分 operation。

### 2.3 TypeScript 调用方式

`packages/ascet-extension/src/cli.ts` 当前按 operation 启动子进程：

```ts
spawn(request.cliPath, request.args)
```

现有 scheduler 已经将 ASCET ToolAPI 调用限制为：

```text
resource: ascet.toolapi.global
concurrency: 1
```

因此 Bridge 不需要并行执行请求，应继续保持严格串行。

---

## 3. 目标架构

```text
+--------------------------------------+
| TypeScript ascet-extension           |
|                                      |
| tools / schemas / routing            |
| validation / approval                |
| scheduler / global lock              |
| timeout / abort / recovery           |
| cache / SQLite index                 |
| rendering / artifact                 |
+-------------------+------------------+
                    | NDJSON over stdio
                    v
+--------------------------------------+
| AscetBridge.exe x86                  |
| .NET Framework 4.x                   |
|                                      |
| protocol server                      |
| operation registry                   |
| in-process dispatcher                |
| STA session manager                  |
| error normalization                  |
| ToolAPI DTO conversion               |
+-------------------+------------------+
                    |
                    v
        Ascetapidll/Etas.AscetNET.dll
                    |
                    v
               ASCET ToolAPI
```

### 3.1 Bridge 运行模式

建议 `AscetBridge.exe` 同时提供：

```powershell
AscetBridge.exe serve --stdio
AscetBridge.exe exec <operation> ...
AscetBridge.exe capabilities
AscetBridge.exe selftest <profile>
```

用途：

- `serve --stdio`：扩展正式运行入口。
- `exec`：迁移期、调试和 live smoke 使用。
- `capabilities`：不连接 ASCET 即可读取协议和 operation 能力。
- `selftest`：替代独立的 quick/deep/smoke 诊断 EXE。

---

## 4. 实施原则

1. 单 EXE 合并和长驻 host 分阶段完成。
2. 第一阶段不要求立即重写全部 legacy operation。
3. 所有 ToolAPI 操作必须在同一 STA 线程执行。
4. Bridge 内部不得启动其他 ASCET EXE。
5. ToolAPI 调用发生超时时，恢复单位是整个 Bridge 进程。
6. TypeScript scheduler 和跨进程文件锁继续保留。
7. C# 只承担 ToolAPI 边界职责，业务审批和索引继续放在 TypeScript。
8. 构建和发布测试必须强制限制为一个 EXE、一个 DLL。

---

## 5. C# Bridge 设计

建议新增：

```text
ascetcli/src/AscetCli/Bridge/
  AscetBridge.cs
  AscetBridgeServer.cs
  AscetBridgeProtocol.cs
  AscetBridgeDispatcher.cs
  AscetBridgeOperationRegistry.cs
  AscetBridgeSessionManager.cs
  InProcessLegacyOperationAdapter.cs
  AscetBridgeErrorMapper.cs
```

### 5.1 Bridge 入口

```csharp
public sealed class AscetBridge
{
    [STAThread]
    public static int Main(string[] args)
    {
        Console.InputEncoding = Encoding.UTF8;
        Console.OutputEncoding = new UTF8Encoding(false);
        AscetToolApiBootstrap.ConfigureAssemblyResolution();

        switch (GetMode(args))
        {
            case "serve":
                return new AscetBridgeServer().Run();
            case "exec":
                return AscetBridgeCli.RunExec(Slice(args, 1));
            case "capabilities":
                return AscetBridgeCli.RunCapabilities();
            case "selftest":
                return AscetBridgeCli.RunSelfTest(Slice(args, 1));
            default:
                return WriteInvalidArguments();
        }
    }
}
```

必须使用 x86 编译，并保留 `[STAThread]`。

### 5.2 Operation handler

最终 handler 接口建议为：

```csharp
public interface IAscetOperationHandler
{
    string OperationId { get; }
    AscetExecutionStrategy Strategy { get; }

    Dictionary<string, object> Execute(
        AscetBridgeContext context,
        Dictionary<string, object> payload);
}
```

执行策略：

```csharp
public enum AscetExecutionStrategy
{
    NoSession,
    SharedReadSession,
    SharedWriteSession,
    FreshSession,
    LegacyInProcess
}
```

### 5.3 Registry 改造

当前 registry 中的：

```csharp
LegacyProxyExecutableName
TryResolveLegacyProxyExecutable()
```

应改为 operation handler 和 execution strategy：

```csharp
Register(
    "get_tree",
    ExecutionLane.PooledRead,
    AscetExecutionStrategy.SharedReadSession,
    HandleGetTree);

RegisterLegacy(
    "diff_class",
    ExecutionLane.LegacyRead,
    delegate(string[] args)
    {
        return AscetDiffClass.Main(args);
    });
```

完成后删除：

```text
ExecuteLegacyProxy()
ProcessStartInfo
Process.Start()
legacy executable path
```

---

## 6. Legacy operation 单 EXE 合并策略

第一阶段不建议一次性将所有 legacy CLI 重写为 typed service。

将现有 operation 源码编译进 `AscetBridge.exe`，由 Bridge 同进程调用其静态 `Main()`：

```csharp
ExecuteInProcess(
    "diff_class",
    args,
    delegate(string[] invocationArgs)
    {
        return AscetDiffClass.Main(invocationArgs);
    });
```

### 6.1 In-process adapter

```csharp
internal delegate int AscetLegacyEntryPoint(string[] args);

internal sealed class InProcessLegacyOperationAdapter
{
    private readonly object _consoleGate = new object();

    public AscetBridgeExecutionResult Execute(
        string operation,
        string[] args,
        string workingDirectory,
        AscetLegacyEntryPoint entryPoint)
    {
        lock (_consoleGate)
        {
            TextWriter originalOut = Console.Out;
            TextWriter originalError = Console.Error;
            string originalDirectory = Environment.CurrentDirectory;

            using (StringWriter stdout = new StringWriter())
            using (StringWriter stderr = new StringWriter())
            {
                try
                {
                    Console.SetOut(stdout);
                    Console.SetError(stderr);

                    if (!String.IsNullOrWhiteSpace(workingDirectory))
                    {
                        Environment.CurrentDirectory = workingDirectory;
                    }

                    int exitCode = entryPoint(args);
                    return new AscetBridgeExecutionResult(
                        exitCode,
                        stdout.ToString(),
                        stderr.ToString());
                }
                finally
                {
                    Console.SetOut(originalOut);
                    Console.SetError(originalError);
                    Environment.CurrentDirectory = originalDirectory;
                }
            }
        }
    }
}
```

### 6.2 协议输出隔离

现有 operation 大量使用 `Console.SetOut`，Bridge 协议不能直接使用 `Console.Out`。

必须直接打开标准输出句柄：

```csharp
StreamWriter writer = new StreamWriter(
    Console.OpenStandardOutput(),
    new UTF8Encoding(false));
writer.AutoFlush = true;
```

业务 stdout 可以被捕获或抑制，协议 writer 不受影响。

### 6.3 迁移后的行为

```text
迁移前：
AscetCli.exe -> AscetDiffClass.exe -> ToolAPI

迁移后：
AscetBridge.exe -> AscetDiffClass.Main() -> ToolAPI
```

这样可以先移除全部 operation EXE，同时保留原参数解析和输出行为。

---

## 7. Session 生命周期

### 7.1 第一阶段

第一版优先保持现有 session 语义：

| Operation 类型 | Session 策略 |
|---|---|
| capabilities、ping、status | NoSession |
| 原 legacy operation | LegacyInProcess/FreshSession |
| 已完成 typed service 的稳定读 | FreshSession，暂不复用 |
| write operation | FreshSession |

第一版目标是资产合并，而不是 session 性能优化。

### 7.2 第二阶段共享 read session

稳定后将以下 operation 迁移为 `SharedReadSession`：

```text
get_*
list_folders
list_methods
list_diagrams
read_method_code
read_method_signature
read_component_children
read_component_summary
read_implementation
```

Bridge session manager 负责：

- lazy connect
- 当前数据库绑定检测
- session generation
- database binding generation
- stale session 刷新
- 一次 fresh-session retry

### 7.3 Write session

write operation 最后迁移。写后必须执行：

1. database rebind。
2. 失效 handle 清理。
3. fresh-session readback。
4. verification result 返回。
5. 必要时刷新 shared session。

### 7.4 STA 约束

ToolAPI session 的创建、使用和释放必须发生在 Bridge 主 STA 线程。

不要继续使用：

```text
后台 STA 线程创建 session
主线程执行 operation
```

Bridge 超时由 TypeScript 终止整个进程，不使用 `Thread.Abort`。

---

## 8. NDJSON 协议

### 8.1 请求

迁移期同时支持 `args` 和 `payload`，两者只能使用一个：

```json
{
  "type": "request",
  "protocolVersion": 1,
  "id": "ascet-42",
  "operation": "read_method_code",
  "args": [
    "/Components/A",
    "run",
    "--json"
  ],
  "cwd": "C:\\workspace"
}
```

Typed handler 使用：

```json
{
  "type": "request",
  "protocolVersion": 1,
  "id": "ascet-43",
  "operation": "read_method_code",
  "payload": {
    "componentPath": "/Components/A",
    "methodName": "run"
  }
}
```

### 8.2 成功响应

```json
{
  "type": "response",
  "protocolVersion": 1,
  "id": "ascet-42",
  "ok": true,
  "result": {},
  "meta": {
    "bridgePid": 1234,
    "operation": "read_method_code",
    "executionStrategy": "fresh_session",
    "durationMs": 86,
    "sessionGeneration": 2,
    "databaseBindingGeneration": 3
  }
}
```

### 8.3 失败响应

```json
{
  "type": "response",
  "protocolVersion": 1,
  "id": "ascet-42",
  "ok": false,
  "error": {
    "code": "target_not_found",
    "message": "...",
    "operation": "read_method_code",
    "retryable": false
  },
  "meta": {
    "bridgePid": 1234,
    "durationMs": 35
  }
}
```

### 8.4 控制请求

```json
{"type":"ping","id":"1"}
{"type":"capabilities","id":"2"}
{"type":"refresh_session","id":"3"}
{"type":"shutdown","id":"4"}
```

协议要求：

- stdout 每行只能有一个完整 JSON envelope。
- ToolAPI 和业务诊断只能写 stderr 或被抑制。
- request ID 必须原样返回。
- operation 不支持时返回结构化 `unsupported_operation`。
- capabilities 不得要求 ASCET 已启动。

---

## 9. TypeScript Transport 改造

建议新增：

```text
packages/ascet-extension/src/bridge/
  protocol.ts
  transport.ts
  bridge-process.ts
  stdio-transport.ts
  one-shot-transport.ts
  manager.ts
  errors.ts
```

### 9.1 Transport 接口

```ts
export interface AscetTransport {
	execute(
		request: AscetOperationRequest,
		options: AscetTransportExecuteOptions,
	): Promise<AscetOperationResponse>;

	dispose(): Promise<void>;
}
```

实现：

```text
OneShotBridgeTransport
StdioBridgeTransport
FakeAscetTransport
```

### 9.2 Bridge manager

职责：

- lazy spawn `AscetBridge.exe serve --stdio`
- capabilities handshake
- 按行解析 NDJSON
- 维护一个 pending request
- 保存 stderr ring buffer
- 进程退出时拒绝 pending request
- 下一次 operation 自动重启
- extension dispose 时发送 shutdown
- parent process 退出时终止 Bridge

由于现有 ASCET scheduler concurrency 为 1，第一版不需要实现多请求并发 multiplex。

### 9.3 Timeout 和 abort

处理流程：

```text
operation timeout / AbortSignal
  -> 终止 AscetBridge.exe 进程树
  -> 返回 ascet_bridge_timeout 或 ascet_bridge_aborted
  -> operation health 标记 degraded
  -> 下一次请求重新启动 Bridge
```

不能仅取消 Bridge 内部 ToolAPI 调用，因为挂起的 ToolAPI 调用通常无法安全中断。

### 9.4 Scheduler 和 lock

保留现有：

```text
ascet.toolapi.global
concurrency = 1
```

锁范围：

```text
scheduler submit
  -> acquire global ToolAPI lock
  -> transport.execute(request)
  -> release lock
```

锁中记录的 process name 改为：

```text
AscetBridge.exe
```

---

## 10. TypeScript 文件调整

### 10.1 `src/status.ts`

从：

```text
ascet-cli/bin/AscetCli.exe
ASCET_CLI_PATH
```

改为：

```text
ascet-cli/bin/AscetBridge.exe
ASCET_BRIDGE_PATH
```

状态报告增加：

- Bridge 文件存在。
- ToolAPI DLL 存在。
- protocol handshake 成功。
- capabilities 可读取。
- live session 状态。
- database binding 状态。

### 10.2 `src/cli.ts`

建议拆分职责：

```text
cli.ts
  保留结果 envelope、错误格式化、artifact 输出

bridge/*
  负责进程和协议

operation-runner.ts
  负责 scheduler、lock 和 transport
```

最终将：

```ts
runAscetCliJson(...)
```

替换为：

```ts
runAscetOperation(...)
```

第一阶段 tool wrapper 仍可生成 args，不要求同步改成结构化 payload。

### 10.3 测试注入

当前：

```ts
executeCli?: (request: AscetCliRequest) => Promise<AscetCliExecutionResult>;
```

改为：

```ts
transport?: Pick<AscetTransport, "execute">;
```

---

## 11. 构建优化

### 11.1 单次编译

`ascetcli/scripts/build-ascet-csharp.ps1` 最终只生成 Bridge：

```powershell
Invoke-AscetCsc `
  -OutputPath (Join-Path $binDir 'AscetBridge.exe') `
  -MainType 'AscetBridge' `
  -Sources $bridgeSources `
  -References (Get-AscetReferences -IncludeWebExtensions)
```

`$bridgeSources` 包含：

- `AscetCopilot` domain、service、core、protocol。
- Bridge 源码。
- 所有生产 operation 源码。

排除：

```text
AscetWorker.cs
AscetOrchestrator.cs
AscetBackendPoolDemo.cs
AscetThreadHarness.cs
AscetReadOnlyExample.cs
AscetReadDomainQuickCheck.cs
AscetReadDomainDeepCheck.cs
AscetReadDomainSmoke.cs
Compat/LegacyShimGenerator.cs
```

对应诊断能力迁移到：

```powershell
AscetBridge.exe selftest quick
AscetBridge.exe selftest deep
AscetBridge.exe selftest smoke
```

### 11.2 删除旧构建路径

发布构建不再执行：

- legacy executable builds
- standalone proxy executable builds
- compatibility shim builds
- read host 独立构建
- worker/orchestrator 独立构建

### 11.3 资产断言

```powershell
$executables = @(
  Get-ChildItem $binDir -Recurse -File -Filter '*.exe'
)
if ($executables.Count -ne 1) {
  throw "Expected exactly one ASCET executable."
}

$dlls = @(
  Get-ChildItem $binDir -Recurse -File -Filter '*.dll'
)
if ($dlls.Count -ne 1) {
  throw "Expected exactly one ASCET runtime DLL."
}
```

---

## 12. 合同与发布资产

所有生产 command contract 统一改为：

```json
{
  "execution": {
    "kind": "bridge",
    "executableRelativePath": "ascet-cli/bin/AscetBridge.exe",
    "operation": "read_method_code"
  }
}
```

移除：

```text
kind: standalone
legacy executableRelativePath
AscetReadHost.exe
AscetWorker.exe
AscetOrchestrator.exe
```

`copy-ascet-assets.ps1` 改为严格 allowlist：

```powershell
$runtimeAssets = @(
  'AscetBridge.exe',
  'Ascetapidll\Etas.AscetNET.dll'
)
```

禁止继续使用：

```powershell
Copy-Item "$binSource\*"
```

---

## 13. 分阶段实施计划

### Phase 1：单 EXE one-shot

目标：

```text
TypeScript -> AscetBridge.exe exec <operation>
```

任务：

1. 新建 Bridge entry。
2. 将所有生产 operation 源码编译进 Bridge。
3. 实现 `InProcessLegacyOperationAdapter`。
4. 删除 `ExecCommand` 中的 `Process.Start`。
5. 将 selftest 改为同进程调用。
6. 构建只输出一个 EXE。
7. 发布只复制 Bridge 和 ToolAPI DLL。
8. TS 每次 operation 仍可 one-shot spawn Bridge。

验收：

- 所有当前 operation 行为保持一致。
- 运行目录只有一个 EXE。
- Bridge 运行时不启动其他 ASCET helper EXE。

### Phase 2：持久 stdio Bridge

目标：

```text
TypeScript -> long-running AscetBridge.exe serve --stdio
```

任务：

1. 完成 Bridge NDJSON server。
2. 实现 TS `StdioBridgeTransport`。
3. 实现 handshake、shutdown、crash restart。
4. 实现 timeout/abort 终止进程。
5. 保留所有 operation 的 fresh-session 行为。

### Phase 3：共享 read session

任务：

1. 合并现有 read host server 和 dispatcher。
2. session 创建、使用、释放全部回到主 STA 线程。
3. 将稳定 read/get operation 改为 typed handler。
4. 增加数据库切换和 stale session 恢复测试。

### Phase 4：共享 write session

任务：

1. 修复 write host 默认 context 初始化。
2. 迁移 host-safe write operation。
3. 写后强制 rebind/readback。
4. 验证 dry-run、backup 和 verification 语义。

### Phase 5：清理 legacy adapter

任务：

1. 将剩余 legacy Main 改为 typed handler。
2. 删除 Console capture。
3. 删除 argv parser 重复实现。
4. operation 参数统一使用 payload DTO。
5. 删除旧 `AscetCli`、read/write host entry 和兼容 shim 源码。

---

## 14. 测试方案

### 14.1 C# 非 live 测试

新增：

```text
AscetBridgeProtocolSmoke.cs
AscetBridgeDispatcherSmoke.cs
AscetBridgeLegacyAdapterSmoke.cs
AscetBridgeRegistryCoverageSmoke.cs
AscetBridgeSessionPolicySmoke.cs
```

必须验证：

- 每个 catalog operation 都有 handler。
- registry 不包含 legacy executable path。
- runtime 源码不包含 `Process.Start`。
- invalid JSON 后 Bridge 可以继续处理请求。
- operation 失败不终止 Bridge。
- stdout 每行只有一个 JSON response。
- Console.Out、Console.Error 和 cwd 在 operation 后恢复。
- capabilities 不连接 ASCET。
- shutdown 正常释放 session。

### 14.2 TypeScript 测试

必须覆盖：

- lazy spawn
- handshake
- partial line/chunk
- malformed response
- request ID 不匹配
- process crash
- timeout kill
- abort kill
- restart on next request
- stderr diagnostics
- scheduler queue
- global lock
- status report

### 14.3 Live 验收

至少覆盖：

1. ASCET 未启动时 capabilities。
2. stable read。
3. fragile read。
4. diff operation。
5. write dry-run。
6. 实际 write 和 fresh-session readback。
7. ASCET 当前数据库切换。
8. ASCET GUI 重启。
9. operation 执行中强制结束 Bridge。
10. 下一次 operation 自动恢复。

---

## 15. 完成定义

以下条件全部满足后，可认为最终方案完成：

### 资产

```text
ascet-cli/bin/AscetBridge.exe
ascet-cli/bin/Ascetapidll/Etas.AscetNET.dll
```

没有其他运行时 EXE 或 DLL。

### 运行时

- TypeScript 默认通过长驻 stdio Bridge 调用 ToolAPI。
- Bridge 同一时间只执行一个请求。
- Bridge 超时或崩溃后可以自动重启。
- 所有 operation 都在进程内执行。
- Bridge 不再启动 legacy executable。

### 合同

- 所有生产 command 使用 `execution.kind = bridge`。
- catalog operation 与 Bridge capabilities 完全一致。
- 不再存在 standalone 或 legacy executable path。

### 测试

- C# 非 live 测试通过。
- TypeScript bridge transport 测试通过。
- package asset count 测试通过。
- live read/write/diff/recovery 验收通过。

---

## 16. 推荐优先执行内容

第一批改动应控制在以下范围：

```text
1. AscetBridge entry
2. InProcessLegacyOperationAdapter
3. OperationRegistry 去除 executable 名称
4. ExecCommand 去除 Process.Start
5. SelfTest 同进程化
6. build script 单次编译
7. copy-assets allowlist
8. TS status/path 切换
```

这批完成后即可达到真实的：

```text
1 个 AscetBridge.exe + 1 个 Etas.AscetNET.dll
```

持久 stdio、共享 session 和 typed handler 可以继续分阶段优化，不应阻塞单 EXE 交付。
