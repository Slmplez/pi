# ASCET 单 Bridge Runtime 实施与验收方案

## 1. 目标与范围

将 ASCET extension 的生产运行时收敛为一个 C# Bridge 可执行文件和一个 ASCET ToolAPI 托管 DLL：

```text
packages/ascet-extension/ascet-cli/bin/
  AscetBridge.exe
  Ascetapidll/
    Etas.AscetNET.dll
```

最终生产资产约束：

```text
EXE count = 1
DLL count = 1
```

DLL 数量仅指 extension 私有发布资产，不包含 Windows、.NET Framework、GAC 或 ASCET 安装目录中的系统和供应商组件。

在启用严格资产断言前，必须在干净 staging 目录和目标 ASCET 环境验证 `Etas.AscetNET.dll` 的依赖闭包。如果存在必须随包发布的额外供应商 DLL，应先修订最终资产目标，不得恢复通配复制。

本方案分为两个独立验收里程碑：

### Milestone A：Single Bridge One-shot

完成：

```text
TypeScript extension
  -> scheduler: ascet.toolapi.global
  -> cross-process ToolAPI lock
  -> AscetBridge.exe exec|batch|selftest
  -> in-process handler
  -> ASCET ToolAPI
```

要求达到真实的：

```text
1 EXE + 1 DLL
```

Milestone A 不要求 persistent stdio、shared read session、handshake 或 crash lazy restart。

### Milestone B：Persistent Bridge Runtime

在 Milestone A 稳定后增加：

```text
TypeScript extension
  -> long-running AscetBridge.exe serve --stdio
  -> NDJSON protocol
  -> fixed STA execution lane
  -> shared read session for PersistentSafe handlers
```

Milestone B 才验收 persistent crash restart、request ID、session generation 和 stale-session recovery。

### 1.1 方案合理性结论

结合当前代码，按 Milestone A/B 拆分是合理的：现有 TypeScript scheduler、跨进程锁和 one-shot 进程模型可以直接承接 Single Bridge，不需要先引入 persistent runtime；将 persistent stdio 与 shared session 留到独立 Milestone B，可避免同时改变资产形态、协议、进程生命周期和 ToolAPI session 生命周期。

Milestone A 的完成条件必须同时覆盖四类证据：机器可验证的资产闭包、registry/capabilities/contract 单一事实源、真实进程的协议与终止语义，以及经批准的 live write/readback/cleanup。仅通过 build、dry-run 或非破坏性 read 不足以宣告完成。

当前实现已经基本落地 Milestone A；source-of-truth 与 STA 同线程机器守卫已关闭，剩余真实写入批准门不得被并入或延后到 Milestone B。

---

## 2. 实施前代码基线（历史快照）

以下数据记录方案制定时的实施前工作区，用于解释迁移动机，不代表 2026-08-09 最终复核时的当前状态。Phase 0 已将其重新生成并固化为机器可验证清单；当前实现和验收证据以第 16 节为准。

### 2.1 实施前资产

```text
ascetcli/output/ascet-csharp/bin:
  EXE = 59
  DLL = 1

packages/ascet-extension/ascet-cli/bin:
  EXE = 59
  DLL = 1
```

当前 `build-ascet-csharp.ps1` 即使在默认 core 模式仍设置：

```powershell
$buildStandaloneProxyExecutables = $true
```

并构建 `AscetCli.exe`、read host、selftest、worker、orchestrator、harness 和 operation helper。

当前 `copy-ascet-assets.ps1` 清空目标后通配复制整个 bin：

```powershell
Copy-Item -Path (Join-Path $binSource '*') -Destination $binTarget -Recurse -Force
```

### 2.2 实施前 C# 路由

当前 `OperationRegistry` 约有：

```text
descriptor = 59（包含 capabilities）
legacy helper EXE metadata = 37
无 helper EXE metadata = 22
```

Registry 仍包含：

```text
LegacyProxyExecutables
TryResolveLegacyProxyExecutable()
Ascet*.exe 字符串
```

`ExecCommand` 已直接实现一部分 operation，但仍通过默认 proxy 分支启动 sibling EXE。

### 2.3 实施前 sibling process 路径

生产相关路径至少包括：

- `Commands/ExecCommand.cs` 的 `ExecuteLegacyProxy`；
- `Commands/SelfTestCommand.cs` 启动 quick/deep/smoke EXE；
- `AscetDatabaseExplorerCommon.RunSiblingCliExecOrExe`；
- `AscetDiffMethodCode`；
- `AscetReadComponentChildren`；
- `AscetReadComponentRefs`；
- `AscetReadComponentSummary`；
- `Host/AscetReadHostDispatcher`。

开发工具中的 worker、orchestrator、backend demo、thread harness 和 compatibility shim 不得进入生产 Bridge source closure。

### 2.4 实施前 STA/session 风险

当前 one-shot `AscetCli.Main` 已有 `[STAThread]`，同步 direct operation 可继续利用该基础。

当前 `AscetReadHost` 在后台 STA 线程创建 session，随后可能在 server 主线程使用和释放同一 ToolAPI 对象。该路径不满足 ToolAPI 线程亲和要求，不得直接迁移为最终 persistent Bridge。

### 2.5 实施前 TypeScript runtime

现有基础可保留：

- scheduler 全局并发为 1；
- 默认 resource key 为 `ascet.toolapi.global`；
- scheduler timeout 后等待底层 operation 真正结束再释放槽位；
- cross-process lock 已有 token、owner PID、heartbeat 和文件身份保护。

需要改造：

- runtime resolver 仍查找 `AscetCli.exe`；
- lock metadata 的 PID 是 Node owner PID，不是 Bridge PID；
- lock 没有 Bridge generation；
- `taskkill` 启动后未等待 taskkill 结果；
- timeout 对 read/write 统一标记为 retryable；
- 没有 Bridge transport 或 persistent manager。

### 2.6 实施前 contract

当前 catalog 约有：

```text
commands = 69
kind=unified_cli = 61
kind=standalone = 8
```

contract 中同时存在 command ID、顶层 operation 和 `execution.subcommand + execution.operation`。batch command 的顶层 operation 与实际 runtime operation 不同，因此不能使用简单字符串集合比较 contract 和 capabilities。

### 2.7 实施前测试基线

现有 TypeScript scheduler、lock、CLI failure semantics 和 runtime status 定向测试通过。

当前 `AscetOperationRegistrySmoke.cs` 仍引用已从 registry 删除的旧 search/resolve operation。Phase 0 必须先修复该测试，避免用失真的测试结果作为迁移守卫。

---

## 3. 目标架构

### 3.1 ToolAPI data plane

```text
TypeScript ascet-extension
  -> scheduler: ascet.toolapi.global
  -> cross-process ToolAPI lock
  -> Bridge transport
      -> AscetBridge.exe x86 / STA
          -> protocol parser
          -> operation registry
          -> in-process dispatcher
          -> fixed STA execution lane
          -> session policy
          -> typed handler / audited one-shot legacy adapter
          -> Etas.AscetNET.dll
              -> ASCET ToolAPI
```

Bridge 内禁止启动其他 ASCET helper EXE。

### 3.2 Control plane

以下命令不连接 ASCET、不进入 ToolAPI scheduler、不获取全局 ToolAPI lock：

```text
AscetBridge.exe capabilities --json
AscetBridge.exe selftest offline --json
```

以下命令属于 live data plane，必须经过 scheduler 和 lock：

```text
exec
batch
selftest quick
selftest deep
selftest smoke
serve --stdio 中的 live request
```

### 3.3 TypeScript 与 C# 职责

TypeScript 负责：

- tool schema 和 agent-facing contract；
- approval；
- scheduler；
- cross-process lock；
- Bridge 生命周期；
- timeout、abort 和 process-tree termination；
- write outcome 分类；
- artifact persistence；
- runtime status 和 recovery。

C# Bridge 负责：

- protocol parsing；
- operation registry；
- transport policy；
- fixed STA lane；
- session create/use/dispose；
- handler dispatch；
- ToolAPI error mapping；
- structured result DTO。

---

## 4. Bridge 运行模式

同一个 `AscetBridge.exe` 支持：

```text
AscetBridge.exe exec <operation> ... --json
AscetBridge.exe batch <operation> --request-stdin --json
AscetBridge.exe capabilities --json
AscetBridge.exe selftest offline --json
AscetBridge.exe selftest quick --json
AscetBridge.exe selftest deep --json
AscetBridge.exe selftest smoke --json
AscetBridge.exe serve --stdio
```

### 4.1 One-shot exec

```text
TypeScript
  -> AscetBridge.exe exec <operation>
  -> operation 在 Bridge 主 STA lane 同进程执行
  -> Bridge 输出一个 JSON envelope
  -> Bridge 退出
```

迁移期允许保留现有 operation argv parser，但新 typed handler 应优先使用 `--request-stdin` JSON payload。

### 4.2 One-shot batch

当前生产 contract 和 TypeScript 已使用 batch。第一阶段必须保留明确的 batch route：

```text
AscetBridge.exe batch <operation> --request-stdin --json
```

batch request 内部仍严格串行，不得并行调用 ToolAPI。

### 4.3 Persistent stdio

仅在 Milestone B 实现：

```text
TypeScript
  -> AscetBridge.exe serve --stdio
  -> NDJSON request/response
```

只有 `TransportPolicy=PersistentSafe` 的 typed handler 可以进入 persistent Bridge。

Legacy `Main()` adapter 必须是：

```text
TransportPolicy = OneShotOnly
```

---

## 5. C# Runtime 硬性不变量

### 5.1 Registry 必须持有 handler

Registry descriptor 至少包含：

```text
OperationId
RouteVisibility
ExecutionLane
SessionPolicy
TransportPolicy
MutatesDatabase
RetryPolicy
BatchSupport
ExecutionProfile
HandlerKind
Handler
```

建议类型：

```text
RouteVisibility:
  PublicContract
  InternalRuntime
  DiagnosticOnly

ExecutionLane:
  ControlPlane
  ToolApiSta

SessionPolicy:
  NoSession
  FreshSession
  SharedReadSession

TransportPolicy:
  OneShotOnly
  PersistentSafe

RetryPolicy:
  Never
  FreshSessionReadOnce

HandlerKind:
  Typed
  LegacyOneShotAdapter
```

注册 production operation 时 handler 不能为空。缺少 handler 必须在 registry 构建或测试阶段失败，禁止运行时回退为 `not_implemented`。

Registry 禁止保存：

```text
LegacyProxyExecutables
LegacyProxyExecutableName
TryResolveLegacyProxyExecutable()
AscetRead*.exe
AscetSet*.exe
AscetDiff*.exe
```

### 5.2 Runtime 不启动 sibling ASCET process

生产 Bridge source closure 中不得执行：

```csharp
Process.Start("Ascet*.exe")
Process.Start("AscetCli.exe")
ProcessStartInfo.FileName = siblingExecutable
```

必须清理直接和间接路径，包括 database explorer fallback、selftest helper、compatibility shim 和 legacy operation 内部 fallback。

静态审计必须针对实际生产 source closure，而不是只扫描 `Bridge/` 目录。

### 5.3 Selftest 同进程且无隐式副作用

Selftest 必须复用 Bridge bootstrap、STA lane、session policy 和 error mapper。

禁止：

- 启动独立 selftest EXE；
- 使用硬编码数据库路径；
- 在 package bin 写 trace/log；
- 自动切换或打开 fallback database；
- 绕过 scheduler/lock 执行 live ToolAPI；
- 吞掉结构化错误后只返回文本。

Profile 语义：

```text
offline:
  registry/protocol/assets metadata 检查
  不加载 ToolAPI session
  不获取 ToolAPI lock

quick:
  连接当前 ASCET session
  验证当前 database binding
  执行最小只读检查

deep:
  对当前 database 执行受限的只读能力检查
  必须有 page/time budget

smoke:
  使用显式配置的目标执行生产路径 smoke
  不允许硬编码 fallback database
  不允许隐式 database switch
```

运行诊断写入 stderr 或 extension 临时目录，不得污染生产资产目录。

### 5.4 ToolAPI 生命周期固定在同一 STA lane

以下操作必须发生在同一固定 STA execution lane：

```text
session create
ToolAPI connect
database bind
handle acquire
operation execute
session refresh
handle release
session dispose
```

禁止：

- 后台 STA 创建 session，主线程使用；
- async continuation 在线程池继续访问 ToolAPI；
- 不同线程创建和释放同一 handle；
- `Thread.Abort`；
- handler 将 ToolAPI handle 保存到静态字段。

Milestone A 可以直接使用 Bridge 主 STA 线程同步执行全部 live handler。

Milestone B 的协议读取可以在其他线程，但所有 ToolAPI work item 必须投递到同一 STA lane，并在该 lane 完成 dispose。

### 5.5 Capabilities 不连接 ASCET

`capabilities` 只能读取静态 registry 和协议元数据，不得：

- 创建 ToolAPI session；
- 连接 ASCET GUI；
- 要求 database 已打开；
- 修改 session generation；
- 获取 scheduler slot；
- 获取跨进程 ToolAPI lock。

Capabilities 至少返回：

```text
protocolVersion
bridgeVersion
routes[]:
  commandId
  subcommand
  operationId
  routeVisibility
  sessionPolicy
  transportPolicy
  mutatesDatabase
  retryPolicy
  batchSupport
  executionProfile
capabilitiesHash
```

### 5.6 Stdout 无污染

Bridge stdout 只能承载协议 envelope。

one-shot：

```text
stdout = 一个完整 JSON envelope
```

stdio：

```text
stdout = 每行一个完整 NDJSON envelope
```

协议 writer 必须直接绑定标准输出句柄：

```csharp
new StreamWriter(Console.OpenStandardOutput(), new UTF8Encoding(false))
```

日志和 ToolAPI 诊断写 stderr。TypeScript 保存有界 stderr ring buffer。

必须验证：

- legacy operation 写 `Console.Out` 不污染协议；
- operation 抛错后协议 writer 仍有效；
- stdout 无 BOM、banner、日志和额外空行；
- 超出 stdout/stderr/request size limit 时返回结构化错误或终止失控 Bridge。

### 5.7 Legacy adapter 仅允许审计后的 one-shot handler

迁移期允许：

```text
AscetBridge.exe
  -> InProcessLegacyOperationAdapter
      -> explicit registered delegate
      -> LegacyOperation.Main(args)
```

不得根据字符串任意反射查找并执行 `Main()`。每个 legacy handler 必须在 registry 中显式注册 delegate 或 wrapper。

Adapter 必须保存并恢复：

```text
Console.Out
Console.Error
Console.In
Environment.CurrentDirectory
CurrentCulture
CurrentUICulture
```

Adapter 必须串行化 Console capture，并捕获 stdout/stderr 作为业务输出或诊断。

以下 operation 不允许直接 adapter，必须先提取 typed service：

- 调用 `Environment.Exit` 或 `FailFast`；
- 启动 sibling process；
- 依赖进程退出完成清理；
- 返回后仍有后台线程写 Console；
- 在静态字段保存 ToolAPI handle；
- 修改无法恢复的全局状态；
- 无法判断 write 是否已开始；
- 在 persistent 模式才能正确工作的 operation。

### 5.8 Write 不自动重试

写操作必须区分执行阶段。

#### 确认未开始

以下失败发生在 Bridge spawn/dispatch 前：

```text
scheduler queue timeout
lock acquisition timeout
pre-spawn abort
invalid local request
approval rejected
```

返回：

```json
{
  "code": "write_not_started",
  "retryable": true,
  "requiresReadback": false
}
```

#### 结果不确定

Bridge 已成功启动或 request 已 dispatch 后发生：

```text
Bridge timeout
Bridge crash
ToolAPI connection reset
response 丢失
protocol parse failure
request ID 不匹配
process exit without valid envelope
```

除非 Bridge 返回可信的 mutation-not-started metadata，否则必须返回：

```json
{
  "code": "write_outcome_unknown",
  "retryable": false,
  "requiresReadback": true
}
```

TypeScript 的 retryable 判断必须结合：

```text
jobKind
mutatesDatabase
spawned/dispatched state
structured Bridge error
```

禁止仅按 `*_timeout` 将 write 标记为 retryable。

标准写流程：

```text
plan/preflight
  -> approval
  -> fresh write session
  -> execute once
  -> dispose/rebind
  -> fresh-session readback
  -> verification result
```

---

## 6. Route、Registry 与 Contract 模型

### 6.1 不使用简单 operation 集合比较

以下三者不是天然一一对应：

```text
contract command ID
contract top-level operation
runtime subcommand + runtime operation
```

例如 batch command：

```text
commandId = AscetBatchCreateComponent
top-level operation = batch_create_component
runtime route = batch + create_component
```

验收比较规范化 route：

```text
NormalizedRoute {
  commandId
  subcommand
  operationId
  routeVisibility
  batchMode
}
```

### 6.2 一致性规则

必须满足：

1. 每个 `PublicContract` route 有且只有一个 production contract；
2. 每个 production contract 对应一个 Bridge capability route；
3. `InternalRuntime` route 可以没有独立 public command contract，但必须被显式标记；
4. `DiagnosticOnly` route 不进入 production command catalog；
5. command ID、subcommand 和 operation 的组合唯一；
6. batch route 与单项 operation 的 `BatchSupport` 一致；
7. write/destructive contract 必须对应 `MutatesDatabase=true`；
8. `PersistentSafe` 不得指向 legacy adapter。

### 6.3 Source of truth

优先选择单一 source of truth：

```text
C# registry -> capabilities JSON
contract generator/validator -> normalized route comparison
```

如果 contract 仍由独立 JSON 维护，必须有双向 coverage test，禁止手工只更新一侧。

---

## 7. 协议

### 7.1 One-shot response

Milestone A 允许 argv 或 stdin payload，但 response 统一为：

```json
{
  "type": "response",
  "protocolVersion": 1,
  "id": "optional-one-shot-id",
  "ok": true,
  "result": {},
  "meta": {
    "bridgePid": 1234,
    "bridgeGeneration": "one-shot-uuid",
    "operation": "read_method_code",
    "sessionPolicy": "fresh_session",
    "durationMs": 42,
    "mutationStarted": false
  }
}
```

`mutationStarted` 为可空布尔值：`false` 仅表示 Bridge 可证明尚未修改数据库，`true` 表示已进入实际 mutation，`null` 表示结果不确定；TypeScript 不得把 `null` 当作未开始。

one-shot stdout 必须恰好包含一个 envelope。

### 7.2 Persistent handshake

Milestone B：

```json
{
  "type": "hello",
  "protocolVersion": 1,
  "bridgeVersion": "1.0.0",
  "pid": 1234,
  "bridgeGeneration": "uuid",
  "capabilitiesHash": "sha256:..."
}
```

### 7.3 Persistent request

```json
{
  "type": "request",
  "protocolVersion": 1,
  "id": "ascet-42",
  "operation": "read_method_code",
  "payload": {
    "componentPath": "DEMO\\PID",
    "methodName": "run"
  }
}
```

`args` 和 `payload` 不能同时存在。

### 7.4 Persistent dispatch acknowledgement

为了区分 write 是否已开始，Milestone B 可以返回：

```json
{
  "type": "accepted",
  "protocolVersion": 1,
  "id": "ascet-42",
  "bridgeGeneration": "uuid",
  "mutationPossible": true
}
```

收到 `accepted` 后的 write timeout/crash 一律按 outcome unknown 处理。

### 7.5 Error response

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
    "retryable": false,
    "requiresReadback": false
  },
  "meta": {
    "mutationStarted": false
  }
}
```

### 7.6 协议约束

- request ID 原样返回；
- unsupported operation 返回结构化错误；
- malformed persistent request 不终止 Bridge；
- request ID 不匹配时 TypeScript 终止当前 generation；
- 第一版最多一个 pending live request；
- request、response、stdout 和 stderr 均设置最大大小；
- partial line/chunk 必须正确组装；
- EOF、crash 和无效 JSON 必须拒绝 pending request。

---

## 8. Timeout、Abort 与 Recovery

### 8.1 One-shot

```text
timeout/abort
  -> terminate AscetBridge.exe process tree
  -> await taskkill/termination result
  -> await Bridge close/exit
  -> token-safe release ToolAPI lock
  -> release scheduler slot
```

Bridge 未确认退出前不能释放 scheduler slot 或 lock。

process termination API 必须返回：

```text
termination command started
termination exit code
Bridge close observed
Bridge exit code
termination timeout
```

如果无法终止：

```text
scheduler = occupied/degraded
lock = retained
new live ToolAPI jobs = blocked
manual recovery required
```

### 8.2 Persistent

```text
request timeout/abort
  -> terminate current Bridge PID tree
  -> reject pending request
  -> invalidate bridge generation
  -> await process exit
  -> token-safe clear lock
  -> next request lazy restart
```

Recovery 只能操作本 extension manager 记录的：

```text
Bridge PID
Bridge generation UUID
owner token
process start identity
```

禁止按名称批量终止 ASCET GUI、所有 `AscetBridge.exe` 或其他 session 的 Bridge。

### 8.3 Lock metadata

Milestone A 至少记录：

```text
ownerToken
ownerNodePid
bridgePid
commandId
acquiredAt
heartbeat
```

Milestone B 增加：

```text
bridgeGeneration
bridgeStartedAt
protocolVersion
```

PID 存活检查不能单独作为所有权证明，必须与 token、generation 和文件身份联合验证。

---

## 9. 构建与发布

### 9.1 Staging 构建

```text
compile to unique temporary staging
  -> validate source closure
  -> validate file allowlist
  -> run offline smoke
  -> verify x86 entry
  -> verify ToolAPI DLL hash
  -> verify no sibling process references
  -> replace production output
```

禁止直接在包含旧 helper EXE 的 production bin 上增量编译。

Windows 下如果旧 executable 被运行进程锁定，应明确失败并给出进程锁指导，不得先删除部分资产后留下半更新目录。

### 9.2 单次生产编译

`build-ascet-csharp.ps1` production mode 最终只执行一次 production EXE 编译：

```text
Output = AscetBridge.exe
MainType = AscetBridge
Platform = x86
Target = exe
```

生产 source closure 包含：

- Bridge entry/protocol/dispatcher/registry/session/error mapper；
- typed handler；
- 经审计的 one-shot legacy wrapper；
- operation 所需 domain/service/DTO；
- selftest typed service。

生产 source closure 排除：

```text
AscetWorker.cs
AscetOrchestrator.cs
AscetBackendPoolDemo.cs
AscetThreadHarness.cs
AscetReadOnlyExample.cs
独立 quick/deep/smoke Main entry
Compat/LegacyShimGenerator.cs
AutotestCli entry
```

开发 harness 如需保留，输出到独立 dev-tools staging，不得进入 extension、npm package 或 release zip。

### 9.3 资产 allowlist

唯一允许的生产文件：

```text
AscetBridge.exe
Ascetapidll/Etas.AscetNET.dll
```

禁止：

```powershell
Copy-Item "$binSource\*"
```

必须分别断言：

- C# production staging；
- extension `ascet-cli/bin`；
- `npm pack` staging/tarball；
- standalone release staging；
- release zip。

断言内容：

```text
EXE count = 1
DLL count = 1
PDB count = 0
LOG/OUT/ERR count = 0
unknown file count = 0
ToolAPI DLL SHA-256 matches source
```

---

## 10. TypeScript Runtime 改造

### 10.1 Resolver

使用：

```text
ASCET_BRIDGE_PATH
packages/ascet-extension/ascet-cli/bin/AscetBridge.exe
ascetcli/output/ascet-csharp/bin/AscetBridge.exe
```

删除生产代码中的：

```text
ASCET_CLI_PATH
AscetCli.exe
AscetReadHost.exe
helper EXE fallback
```

本迁移不保留旧 `ASCET_CLI_PATH` 兼容别名。

### 10.2 Transport interface

建议：

```text
AscetBridgeTransport
  executeOneShot(request)
  executeBatch(request)
  getCapabilities()
  terminate(reason)

PersistentAscetBridgeTransport
  start()
  request(request)
  terminate(reason)
  restart()
```

Milestone A 只实现 one-shot transport。

### 10.3 Scheduler 和 lock

- live ToolAPI request concurrency 固定为 1；
- control-plane capabilities/offline selftest 绕过 live scheduler/lock；
- live selftest 与 production operation 共用 `ascet.toolapi.global`；
- scheduler timeout 后保持 slot，直到 transport 完成退出确认；
- lock 在 Bridge close 前不得释放。

### 10.4 Write failure mapping

TypeScript 必须记录：

```text
spawnAttempted
spawnSucceeded
requestDispatched
acceptedReceived
processClosed
validResponseReceived
jobKind
mutatesDatabase
```

write outcome mapper 根据这些字段生成 `write_not_started` 或 `write_outcome_unknown`。

---

## 11. Contract 改造

所有 production command 使用：

```json
{
  "execution": {
    "kind": "bridge",
    "protocolVersion": 1,
    "subcommand": "exec",
    "operation": "read_method_code",
    "sessionPolicy": "fresh_session",
    "transportPolicy": "one_shot_only"
  }
}
```

batch 示例：

```json
{
  "execution": {
    "kind": "bridge",
    "protocolVersion": 1,
    "subcommand": "batch",
    "operation": "create_component",
    "sessionPolicy": "fresh_session",
    "transportPolicy": "one_shot_only"
  }
}
```

Contract 不保存开发树中的物理 executable 路径。Bridge 路径由 TypeScript resolver 负责。

最终 production contract 不得存在：

```text
kind: standalone
kind: unified_cli
executableRelativePath
AscetCli.exe
AscetReadHost.exe
AscetWorker.exe
AscetOrchestrator.exe
```

开发诊断 contract 如必须保留，应移出 production catalog。

---

## 12. 实施阶段

### Phase 0：建立真实基线和守卫

产物：

- normalized route inventory；
- direct/legacy/internal/diagnostic 分类；
- legacy adapter safety audit；
- production source closure；
- runtime `Process.Start` 审计；
- current asset manifest；
- registry/contract/capabilities coverage test；
- 修复 stale `AscetOperationRegistrySmoke`。

Gate：

```text
所有 production route 都有明确迁移策略
无未分类 operation
测试与当前 registry 一致
```

### Phase 1：Bridge one-shot shell

实现：

- `AscetBridge` x86 STA entry；
- stable protocol writer；
- response envelope；
- capabilities；
- offline selftest；
- handler-required registry；
- dispatcher；
- one-shot transport policy validation。

Gate：

```text
capabilities 在 ASCET 未启动时成功
stdout 只有一个 JSON envelope
registry 无 EXE 字符串
```

### Phase 2：迁移 direct 和 batch operation

实现：

- 将 `ExecCommand` direct operation 提取为 typed handler；
- 将 `BatchCommand` 迁移到 Bridge batch route；
- 统一 FreshSession policy；
- typed error mapping；
- write outcome metadata；
- STA create/use/dispose 测试。

Gate：

```text
所有 direct exec/batch route 在 Bridge 内执行
write 不自动 retry
```

### Phase 3：迁移 legacy operation 和 selftest

实现：

- 编译经审计的 legacy source 进入 Bridge；
- 显式注册 one-shot adapter delegate；
- unsafe legacy operation 提取 typed service；
- 删除 `ExecuteLegacyProxy`；
- 删除 sibling CLI/database explorer fallback；
- quick/deep/smoke typed 化；
- 删除 package-bin trace/log。

Gate：

```text
production source closure 无 sibling ASCET Process.Start
所有 production route 有 in-process handler
```

### Phase 4：资产、contract 和 TypeScript 切换

实现：

- production build 只生成 Bridge；
- copy-assets 严格 allowlist；
- resolver 切换为 `ASCET_BRIDGE_PATH`；
- one-shot Bridge transport；
- contract 切换为 `kind=bridge`；
- normalized contract/capabilities coverage；
- npm/release staging asset test。

Gate：Milestone A 完成。

### Phase 5：Persistent stdio

实现：

- NDJSON server；
- handshake；
- generation UUID；
- accepted response；
- one pending request；
- stderr ring buffer；
- crash restart；
- timeout/abort kill；
- 仅开放 `PersistentSafe` typed handler。

### Phase 6：Shared read session

实现：

- fixed STA work queue；
- database binding identity；
- session generation；
- database binding generation；
- stale read session refresh；
- read-only fresh-session retry 一次；
- database switch/GUI restart stress test。

Gate：Milestone B 完成。

### Phase 7：移除 legacy adapter

- 所有 legacy `Main()` 转 typed handler；
- 删除 Console capture；
- 删除重复 argv parser；
- operation 全部使用 payload DTO。

---

## 13. 测试矩阵

### 13.1 Milestone A：资产测试

- production staging：1 EXE、1 DLL；
- extension bin：1 EXE、1 DLL；
- npm pack：1 EXE、1 DLL；
- release staging/zip：1 EXE、1 DLL；
- DLL SHA-256 匹配；
- 无旧 helper EXE；
- 无日志、PDB 和历史输出残留；
- 干净目录启动成功。

### 13.2 Milestone A：Registry/Contract 测试

- 每个 production route 有 handler；
- Registry 不含 `.exe` 字符串；
- operation ID 和 normalized route 唯一；
- PublicContract 双向一致；
- InternalRuntime 显式标记；
- batch support 一致；
- write route 对应 `MutatesDatabase=true`；
- legacy adapter 全部为 `OneShotOnly`。

### 13.3 Milestone A：Protocol/Console 测试

- capabilities 不启动 ASCET session；
- capabilities 不获取 ToolAPI lock；
- stdout 只有一个 JSON；
- stderr 不污染 stdout；
- operation 写 Console 不污染协议；
- Console.Out/Error/In 恢复；
- cwd/culture 恢复；
- operation error 后环境仍恢复；
- oversized output 返回受控错误。

### 13.4 Milestone A：STA/Session 测试

- Bridge Main 为 STA，production source closure 禁止 `Thread`、`Task.Run`、`ThreadPool`、`async`、`await` 等线程切换，session create/use/dispose 保持同步同线程调用链；
- one-shot live operation 使用 FreshSession；
- write 使用 FreshSession；
- readback 使用 fresh session；
- write 不自动 retry；
- session 在 Bridge 退出前 dispose。

### 13.5 Milestone A：Timeout/Recovery 测试

- timeout 终止 Bridge process tree；
- abort 终止 Bridge process tree；
- 等待 taskkill 和 Bridge close；
- Bridge 未退出前 scheduler slot 不释放；
- Bridge 未退出前 lock 不释放；
- kill 失败时保持 degraded/occupied；
- recovery 不终止 ASCET GUI；
- pre-spawn write failure 返回 `write_not_started`；
- post-spawn write timeout 返回 `write_outcome_unknown`。

### 13.6 Milestone B：Persistent Protocol 测试

- hello handshake；
- protocol/capabilities hash 校验；
- partial line/chunk；
- malformed request 返回错误并继续；
- request ID 不匹配时终止当前 generation；
- process crash 拒绝 pending request；
- next request lazy restart；
- `OneShotOnly` operation 被拒绝；
- accepted 后 write crash 返回 outcome unknown。

### 13.7 Milestone B：Shared Session 测试

- 所有 ToolAPI work 在固定 STA lane；
- database switch 刷新 binding；
- stale read session 最多 fresh retry 一次；
- write 永远不进入 shared read session；
- write 不自动 retry；
- shutdown 在 STA lane 释放 session；
- GUI restart 后 generation 更新。

### 13.8 Live 验收

Milestone A 串行执行：

1. capabilities；
2. offline selftest；
3. quick selftest；
4. stable read；
5. fragile read；
6. batch read；
7. diff；
8. write dry-run；
9. actual write；
10. fresh-session readback；
11. operation 中途 kill one-shot Bridge；
12. 下一次 operation 成功；
13. 确认运行期间无 helper ASCET EXE。

Milestone B 追加：

1. persistent startup/handshake；
2. 多次 stable read；
3. database switch；
4. ASCET GUI restart；
5. persistent Bridge 中途 kill；
6. 下一次 request lazy restart；
7. session/database generation 更新；
8. accepted 后 write timeout 不重放。

---

## 14. 完成定义

### 14.1 Milestone A 完成定义

#### 资产

```text
EXE count = 1
DLL count = 1
```

#### C#

- Registry 不含 EXE 名称并强制 handler；
- runtime 不启动 sibling ASCET process；
- exec、batch、selftest 同进程执行；
- ToolAPI 生命周期固定在 Bridge 主 STA lane；
- capabilities/offline selftest 不连接 ASCET；
- stdout 无污染；
- legacy adapter 恢复 Console/cwd/culture；
- write 不自动 retry。

#### TypeScript

- scheduler concurrency 保持 1；
- timeout 后 Bridge 真正退出前不释放槽位和 lock；
- resolver 只查找 `AscetBridge.exe`；
- control plane 绕过 live lock；
- write failure 正确区分 not-started 和 outcome-unknown。

#### Contract

- 所有 production command 使用 `kind=bridge`；
- normalized PublicContract route 与 capabilities 双向一致；
- 无 production standalone/unified_cli/executable path；
- TypeScript 不再查找 `AscetCli.exe` 或 helper EXE。

#### 测试

- C# offline tests；
- TypeScript one-shot/scheduler/lock tests；
- package asset tests；
- isolated staging smoke；
- live read/batch/diff/write/recovery 验收。

### 14.2 Milestone B 完成定义

在 Milestone A 基础上：

- persistent stdio handshake 完成；
- request ID 和 generation 校验完成；
- persistent Bridge crash 后 lazy restart；
- 只有 `PersistentSafe` typed handler 可进入 persistent 模式；
- fixed STA shared read session；
- database switch/GUI restart 可恢复；
- stale read 最多 fresh retry 一次；
- write 永不自动重放；
- accepted 后的不确定 write 返回 `write_outcome_unknown`。

---

## 15. Goal 模式执行清单

建议 Goal objective：

```text
完成 ASCET Milestone A：将生产 runtime 收敛为 AscetBridge.exe + Etas.AscetNET.dll，所有 production exec/batch/selftest 在 Bridge 内执行，TypeScript 和 contract 完成切换，并通过 one-shot 资产、离线和 live 验收。
```

按以下顺序执行，不要把 persistent stdio 纳入同一 Goal。

### Task 1：基线和 route inventory

- [x] 生成 current production route inventory；
- [x] 标记 PublicContract/InternalRuntime/DiagnosticOnly；
- [x] 标记 typed/legacy/unsafe；
- [x] 标记 mutates/session/batch/retry；
- [x] 修复 registry smoke 中的旧 operation；
- [x] 新增 normalized route coverage test。

完成条件：所有 production route 有明确 handler 迁移方案。

### Task 2：Bridge shell

- [x] 新建 Bridge entry、protocol writer、dispatcher、registry；
- [x] 实现 capabilities；
- [x] 实现 offline selftest；
- [x] 强制 x86/STA；
- [x] 新增 protocol/registry offline tests。

完成条件：ASCET 未启动时 capabilities 和 offline selftest 成功。

### Task 3：Direct 和 batch migration

- [x] 提取 `ExecCommand` direct handler；
- [x] 迁移 batch read/write；
- [x] 实现 FreshSession context；
- [x] 实现统一 error mapper；
- [x] 实现 write outcome metadata；
- [x] 以 `[STAThread]` 静态断言、同步 one-shot 调用链和 production source closure 线程切换禁令证明 create/use/dispose 同线程；

完成条件：direct exec/batch 不经过 sibling process。

### Task 4：Legacy 和 selftest migration

- [x] 完成 legacy safety audit；
- [x] 添加显式 one-shot adapter delegate；
- [x] unsafe operation 转 typed service；
- [x] 移除 database explorer sibling fallback；
- [x] quick/deep/smoke typed 化；
- [x] 删除硬编码 database fallback 和 bin trace log；
- [x] 静态断言 production closure 无 sibling ASCET `Process.Start`。

完成条件：所有 production route 在 Bridge 内执行。

### Task 5：Build 和 assets

- [x] production build 只编译 `AscetBridge.exe`；
- [x] staging clean build；
- [x] extension copy allowlist；
- [x] ToolAPI DLL hash test；
- [x] npm pack asset test；
- [x] release staging/zip asset test。

完成条件：所有发布层级均为 1 EXE + 1 DLL。

### Task 6：TypeScript one-shot transport

- [x] 新增 Bridge resolver；
- [x] 删除 `ASCET_CLI_PATH` 和 `AscetCli.exe` fallback；
- [x] 实现 async process-tree termination；
- [x] 等待 taskkill 和 Bridge close；
- [x] 扩展 lock metadata；
- [x] control plane 绕过 live lock；
- [x] write not-started/outcome-unknown mapper；
- [x] 更新 status/recovery/tests。

完成条件：scheduler、lock 和 termination 测试通过。

### Task 7：Contract 和完整验收

- [x] 所有 production contract 改为 `kind=bridge`；
- [x] 删除 physical executable path；
- [x] normalized contract/capabilities 双向测试；
- [x] 将 Bridge 兼容 alias `read_code`、`diff`、`read_block_diagram_raw` 正式注册为 `internal_runtime` route，并移除 dispatcher 绕过；
- [x] 将 root `benchmark` 与 `serve` 明确声明为 reserved non-production control-plane modes，使 dispatcher 与 capabilities 一致；
- [x] 对齐 `AscetSetElementDependency` contract 与 runtime 的完整 option surface，包括 `--variant-mapping`、`--variant-policy`、`--variant`、`--restoration-policy`、`--restore-value`、`--overlay-spec`；
- [x] isolated staging smoke；
- [x] 串行 live acceptance；
- [x] 确认运行期间无 helper ASCET EXE。

完成条件：满足第 14.1 节 Milestone A 完成定义。

### 后续独立 Goal

Milestone A 完成后，再创建独立 Goal：

```text
完成 ASCET Milestone B：实现 persistent stdio Bridge、generation-safe lifecycle 和 fixed-STA shared read session，并通过 crash/database-switch/GUI-restart 验收。
```
---

## 16. 2026-08-09 实施状态与验收证据

### 已完成

- [x] 生产 C# 构建只编译 `AscetBridge.exe`，平台为 x86，入口为 STA。
- [x] 生产 source closure 共 133 个源文件，不包含 `Process.Start` / `ProcessStartInfo`。
- [x] 最终运行资产严格为 `AscetBridge.exe` 与 `Ascetapidll/Etas.AscetNET.dll`。
- [x] Milestone A implemented modes 为 `exec`、`batch`、`capabilities`、`selftest`；`benchmark` 与 `serve` 明确列为 reserved non-production modes，并返回 `not_implemented`。
- [x] 61 个 live operation 均绑定非空 in-process handler；其中 50 个 `public_contract`、11 个 `internal_runtime`，35 个 operation 使用显式注册的 one-shot legacy adapter。
- [x] legacy adapter 恢复 Console、cwd、culture，并在调用前拒绝缺失 positional argument 的危险写请求。
- [x] `capabilities` 与 `selftest offline` 不连接 ToolAPI；quick/deep/smoke 均在 Bridge 进程内执行。
- [x] one-shot envelope 包含 `type=response`、`protocolVersion=1`、Bridge PID、generation、duration 与 session policy。
- [x] batch 使用同一 Bridge envelope，并限制输入大小；TypeScript 限制 request/stdout/stderr 大小。
- [x] TypeScript resolver 只使用 `ASCET_BRIDGE_PATH` / `AscetBridge.exe`，无 `ASCET_CLI_PATH` 兼容别名。
- [x] control plane 绕过 scheduler/ToolAPI lock；live request 保持 concurrency=1。
- [x] timeout/abort 等待 `taskkill` 结果和 Bridge close 后才释放 lock/scheduler slot。
- [x] lock metadata 记录 owner token、Node PID 与 Bridge PID。
- [x] write failure 区分 `write_not_started` 与 `write_outcome_unknown`。
- [x] production contract 全部为 `kind=bridge`，不保存 executable path；50 个 PublicContract operation 与 capabilities 双向一致。
- [x] extension copy、npm pack、release directory 和 release zip 均执行严格资产 allowlist。
- [x] 当前完整工作区重新通过 `npm run check`。
- [x] C# registry/adapter/offline tests 通过。
- [x] TypeScript CLI/scheduler/lock/status tests 与 coding-agent ASCET 定向 tests 通过。
- [x] live quick/deep/smoke、direct read、batch read、diff、timeout kill 与后续 recovery read 通过。
- [x] live 验收后无 helper ASCET EXE，且无残留 `AscetBridge.exe` 进程。

### 已完成的显式批准写入验收

- [x] 在 disposable 根路径 `__PI_BRIDGE_ACCEPTANCE_20260809_01` 执行 actual write。
- [x] 使用独立 Bridge 进程执行 fresh-session readback，确认目录存在。
- [x] 删除 disposable 对象，并由另一独立 Bridge 进程确认 `folder_not_found`。
- [x] 经用户明确批准，确认根目录 `--json` 存在且为空后删除，并由 fresh Bridge 进程确认 `folder_not_found`。

上述四项已于 2026-08-09 完成。Persistent stdio 仍属于独立 Milestone B。

### 本轮最终复核（2026-08-09）

- [x] 已从 production contracts 删除 10 个诊断/开发命令：`AscetBenchmark`、`AscetOrchestrator`、`AscetReadDomainDeepCheck`、`AscetReadDomainQuickCheck`、`AscetReadDomainSmoke`、`AscetReadHost`、`AscetReadOnlyExample`、`AscetSelfTest`、`AscetThreadHarness`、`AscetWorker`。
- [x] 已删除仅引用 worker/orchestrator/harness 的 `ops` family，并将上述命令及 `ops` family 加入 contract validator 的退役断言，防止重新进入生产合同。
- [x] `read_code`、`diff`、`read_block_diagram_raw` 已从 dispatcher 特例迁入 registry，固定为 `internal_runtime`，并由 C# smoke 与 capabilities probe 校验。
- [x] capabilities 明确区分 implemented modes 与 reserved modes；`benchmark`/`serve` 不进入 production command catalog。
- [x] build guard 拒绝 production source closure 中的线程切换原语；结合 `AscetBridge.Main` 的 `[STAThread]` 断言，固定 one-shot session 的同步 STA 生命周期。
- [x] Bridge capabilities：61 个 operation、61 条 route、50 条 `public_contract` route、11 条 `internal_runtime` route、35 个 `legacy_one_shot_adapter`，无空 handler kind；production catalog 为 59 个命令、50 个唯一 Bridge operation。
- [x] `scripts/generate-ascet-contracts.ps1`、Bridge build/test、extension asset copy、`npm pack` allowlist 与 release directory/ZIP allowlist 均通过。
- [x] TypeScript 定向测试 41/41 通过；coding-agent ASCET 定向测试 29/29 通过；最终完整工作区 `npm run check` 通过。
- [x] source bin、package bin 均严格包含 `AscetBridge.exe` 与 `Ascetapidll/Etas.AscetNET.dll`；release 目录/ZIP 仅额外包含 `manifest.json`。
- [x] 所有 production contract 均声明 `requiresSerialLiveAccess=true`，validator 同时检查 normalized route 唯一性、PublicContract 可见性、risk/mutation 和 batch support 一致性。
- [x] `AscetSetElementDependency` contract 已补齐 runtime option surface，并由 validator 同时检查 source/package contract 的必需选项。
- [x] Bridge 现在对 typed read/write failure 也始终输出完整 `type=response` / `protocolVersion=1` envelope；`mutationStarted` 对 read/control、dry-run 和实际 mutation 使用保守语义。
- [x] live write dry-run 已在 `P_CST_pMinhold_max` 上通过：dry-run 前后 dependency 均为 `dependent`，`changed=0`，fresh generation 回读一致，`mutationStarted=false`。
- [x] actual write：PID 40180 / generation `d4ce9a0b-b7d3-4ce2-a377-2277ebbc82c8` 创建 `__PI_BRIDGE_ACCEPTANCE_20260809_01`，`mutationStarted=true`、`readbackVerified=true`。
- [x] fresh-process readback：PID 38068 / generation `5006496a-fc0b-449c-bfb8-5fdef17d3b01` 读取到该目录；删除由 PID 29712 完成，PID 8648 / generation `e3f14e17-d20d-4866-8675-43ebcfc8c7c3` 确认 `folder_not_found`。
- [x] 经批准清理误创建根目录 `--json`：PID 36860 删除且 `readbackVerified=true`；PID 36292 / generation `ea40354c-7668-4688-bc43-daf58bf98afd` 确认 `folder_not_found`。
- [x] 最终复核时无残留 `AscetBridge.exe` 进程。

### Milestone A 批准门结果

用户已明确批准 disposable 对象的创建、fresh-process 回读、删除、删除验证，以及检查并删除误创建根目录 `--json`。上述动作均已成功完成，数据库中不再存在 `__PI_BRIDGE_ACCEPTANCE_20260809_01` 或 `--json`。

Milestone A 的批准门和自动化校验均已完成；Persistent stdio 不属于本 Goal。
