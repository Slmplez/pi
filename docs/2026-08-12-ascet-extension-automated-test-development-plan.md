# ASCET Extension 自动化执行测试开发方案

## 1. 文档信息

| 项目 | 内容 |
|---|---|
| 文档日期 | 2026-08-12 |
| 测试对象 | `packages/ascet-extension` |
| 集成对象 | `packages/coding-agent` 的 `AgentSession` |
| 主要目标 | 验证 ASCET Extension 的 Action、Tool、Route、写入安全和恢复逻辑 |
| 测试 Provider | Faux Provider |
| ASCET Bridge | Mock CLI，不启动真实 `AscetBridge.exe` |
| 真实数据库 | 不连接、不读取、不修改 |
| Skills | 不在本方案范围内 |
| 真实模型行为 | 不在本方案范围内 |

---

## 2. 目标与非目标

### 2.1 测试目标

建立以下自动化测试闭环：

```text
Action Catalog / Descriptor
    -> Profile / Feature Flag / Action Guard
    -> Tool Definition
    -> Schema Validation
    -> Route
    -> Mock CLI / Scheduler / Confirmation
    -> Tool Result Contract
    -> AgentSession 代表性集成
```

需要验证：

1. 全部 60 个 Action 的静态契约。
2. 全部 60 个 Action 的真实 Tool Definition 执行路径。
3. Action 参数 Schema 和 Discriminator 校验。
4. Profile、Feature Flag 和 Action Guard。
5. Action 到 Route 和 Backend Operation 的映射。
6. CLI 请求参数、调用次数和调用顺序。
7. Tool Result 的结构和状态传播。
8. 写入 Preflight、Confirmation、Execute、Readback 流程。
9. `unknown_outcome`、锁冲突、Readback 失败和 Rollback 失败。
10. Mutation Guard、Plan Store、Recovery 状态。
11. 代表性 Action 的 AgentSession 多轮 Tool Loop。
12. 所有测试的 Runtime、Lock、Plan 和 Artifact 隔离。

### 2.2 非目标

以下内容不纳入本方案：

```text
Skills Discovery
/skill:ascet-engineering
SKILL.md 和 Reference 读取
模型自主 Tool Selection
模型对自然语言模糊请求的判断
Prompt Injection 下的模型行为评估
真实 Provider 调用
真实 ASCET GUI
真实 ASCET 数据库连接
真实数据库读写
```

Faux Provider 只用于驱动确定性的 Tool Call，不用于证明模型决策质量。

---

## 3. 当前代码基线

### 3.1 已有基础设施

#### Faux Provider

位置：

```text
packages/ai/src/providers/faux.ts
```

可用能力：

- 固定响应队列。
- 动态响应函数。
- 多轮模型响应。
- 多个 Tool Call。
- Streaming 事件。
- 错误和取消。
- Prompt Context 检查。
- `callCount` 和待消费响应数。

#### AgentSession Harness

位置：

```text
packages/coding-agent/test/suite/harness.ts
```

可用能力：

- 创建真实 `AgentSession`。
- 注册 Faux Provider。
- 注入 Agent Tools。
- 加载测试 Extension。
- 注入 ResourceLoader。
- 捕获 AgentSession Events。
- 检查消息、Tool Call 和 Tool Result。
- 使用临时目录隔离测试。

#### ASCET Action 来源

主要来源：

```text
packages/ascet-extension/src/tools/actions/descriptors.ts
packages/ascet-extension/src/tools/actions/catalog.ts
packages/ascet-extension/contracts/catalog-snapshot.json
packages/ascet-extension/src/tools/_shared/action-examples.ts
packages/ascet-extension/src/routing/route-manifests.ts
packages/ascet-extension/src/tools/registry.ts
packages/ascet-extension/src/tools/exposure/profiles.ts
```

当前 Action Catalog Snapshot 和 Route Manifest 均包含 60 个 Action：

| Tool | Action 数量 |
|---|---:|
| `ascet_batch_write` | 9 |
| `ascet_capabilities` | 1 |
| `ascet_diff` | 6 |
| `ascet_edit` | 16 |
| `ascet_get` | 9 |
| `ascet_read` | 9 |
| `ascet_recover` | 6 |
| `ascet_scheduler_status` | 2 |
| `ascet_status` | 1 |
| `configure_parameter_dependency_chain` | 1 |
| **总计** | **60** |

### 3.2 当前已知静态基线问题

复验时间：2026-08-12。

相关测试结果：

```text
Test Files: 2 failed, 3 passed
Tests:      5 failed, 50 passed
```

已确认的问题：

1. `ascet_get.tree` 有两个没有 `variant` 的 Few-shot，导致重复 Key。
2. `GET_ACTIONS` 测试没有同步 `database_identity`。
3. `GET_ACTIONS` 测试没有同步 `database_catalog`。
4. 实际 `ascet_get` Route 数量为 9，旧测试仍期望 7。
5. Catalog 断言与当前 Descriptor 不一致。

在自动生成全 Action 测试前，必须先修复这些问题。

---

## 4. 总体测试架构

采用三层测试结构：

```text
L0 静态契约测试
    ↓
L1 全部 Action 的真实 Tool Definition 执行测试
    ↓
L2 代表性 AgentSession 集成测试

另行覆盖：
写入状态机测试
Recovery 状态机测试
测试隔离和稳定性测试
```

### 4.1 L0：静态契约测试

目标：验证 60 个 Action 的元数据没有漂移。

测试内容：

```text
Descriptor
Catalog
Catalog Snapshot
Few-shot
Schema
Profile
Feature Flag
Visibility
Tool Registration
Route
独立 Action Oracle
Execution Fixture
```

此层不执行 CLI，不创建 AgentSession，不依赖 ASCET Runtime。

### 4.2 L1：全 Action Definition 执行测试

直接执行真实 Tool Definition：

```text
真实 ASCET Tool Definition
+ Mock CLI
+ Recording Scheduler
+ Mock Confirmation
+ Mock Status Probe
+ 临时 Runtime / Artifact 目录
```

此层覆盖全部 60 个 Action，是本方案的主要覆盖层。

### 4.3 L2：代表性 AgentSession 集成测试

只验证 AgentSession 与 ASCET Tool 的连接，不重复覆盖 60 个 Action 的全部业务分支。

建议覆盖：

```text
ascet_get.tree
ascet_read.read_code
ascet_diff.diff_method
ascet_edit.set_method_code
ascet_edit.apply_element_spec
configure_parameter_dependency_chain.execute
ascet_recover.reconcile_mutation
ascet_scheduler_status.status
```

每个测试验证：

```text
Faux Provider Tool Call
    -> AgentSession Schema 校验
    -> ASCET Tool 执行
    -> Mock CLI / Mock Runtime
    -> Tool Result
    -> 下一轮 Provider Context
    -> 最终 Assistant Message
```

---

## 5. 目录结构

建议新增：

```text
packages/coding-agent/test/suite/ascet/
├── harness.ts
├── tool-adapter.ts
├── runtime-sandbox.ts
├── mock-cli.ts
├── recording-scheduler.ts
├── mock-confirmation.ts
├── response-builders.ts
├── action-oracle.ts
├── action-fixtures.ts
├── trace.ts
├── fixtures/
│   ├── get.ts
│   ├── read.ts
│   ├── diff.ts
│   ├── edit.ts
│   ├── batch-write.ts
│   ├── dependency-chain.ts
│   └── ops.ts
├── action-contract.test.ts
├── all-actions-execution.test.ts
├── profile-action-guard.test.ts
├── write-state-machine.test.ts
├── recovery-state-machine.test.ts
├── agent-session-integration.test.ts
└── isolation.test.ts
```

### 5.1 文件职责

| 文件 | 职责 |
|---|---|
| `harness.ts` | 组装 Sandbox、Mock 依赖、真实 Tool Definition 和 AgentSession |
| `tool-adapter.ts` | 向真实 Tool Definition 注入测试依赖 |
| `runtime-sandbox.ts` | 创建和清理临时 Runtime、Lock、Artifact、Contract 目录 |
| `mock-cli.ts` | 严格匹配和记录 ASCET CLI 请求 |
| `recording-scheduler.ts` | 复用真实 Scheduler，同时记录 Job |
| `mock-confirmation.ts` | 模拟确认通过、拒绝、缺少 UI 和异常 |
| `response-builders.ts` | 构造合法 Bridge Success、Failure、Timeout 和 Invalid JSON 结果 |
| `action-oracle.ts` | 提供独立的 Action 到 Operation 和 Job Kind 预期 |
| `action-fixtures.ts` | 汇总所有 Action Execution Fixture |
| `fixtures/*.ts` | 按 Tool Family 提供执行参数和 Mock 响应 |
| `trace.ts` | 采集和输出失败 Trace |
| `action-contract.test.ts` | 验证 Action 集合和元数据契约 |
| `all-actions-execution.test.ts` | 执行全部 60 个真实 Tool Definition |
| `profile-action-guard.test.ts` | 验证 Profile、Feature Flag 和 Action Guard |
| `write-state-machine.test.ts` | 验证普通写入状态机和错误等价类 |
| `recovery-state-machine.test.ts` | 验证 Mutation Guard、Recovery 和 Rollback |
| `agent-session-integration.test.ts` | 验证代表性 AgentSession Tool Loop |
| `isolation.test.ts` | 验证测试之间的 Runtime 和 Artifact 隔离 |

---

## 6. P0：恢复静态测试基线

### T0.1 修复重复 Few-shot Key

修改：

```text
packages/ascet-extension/src/tools/actions/descriptors.ts
```

为第二个 `ascet_get.tree` Few-shot 增加明确 `variant`：

```ts
shot(
	"capture database identities",
	{
		action: "tree",
		scope: "database",
		delivery: "stored",
	},
	"database-identities",
)
```

实际参数应以当前 Schema 和 Descriptor 语义为准。

验收：

```text
ascet_get.tree
ascet_get.tree.database-identities
```

Key 唯一。

### T0.2 更新 Get Action 测试

修改：

```text
packages/coding-agent/test/ascet-extension-canonical-tools.test.ts
```

更新为实际 9 个 Get Action：

```ts
const GET_ACTIONS = [
	"database_identity",
	"tree",
	"database_catalog",
	"elements",
	"formulas",
	"component_refs",
	"bde_edges",
	"import_binding",
	"dbitem_refs",
] as const;
```

Catalog 断言直接与 `GET_ACTIONS` 比较，不再单独追加 `database_catalog`。

### T0.3 运行基线检查

```powershell
npm run check:ascet-action-catalog

cd packages/coding-agent
node ./node_modules/vitest/dist/cli.js --run `
  test/ascet-extension-action-fewshots.test.ts `
  test/ascet-extension-canonical-tools.test.ts
```

### T0.4 完成标准

```text
Few-shot 唯一性测试通过
Canonical Tool 测试通过
Catalog Snapshot 检查通过
Route 数量与测试一致
```

完成 P0 后才能开始自动化 Fixture 开发。

---

## 7. P1：Runtime Sandbox

### 7.1 临时目录结构

每个 Test Harness 创建独立目录：

```text
<tempDir>/
├── runtime/
│   ├── ascet-cli.lock
│   └── operation-health.json
├── artifacts/
│   ├── plans/
│   ├── mutation-guards/
│   └── observations/
├── bridge/
│   └── AscetBridge.exe
├── contracts/
│   └── cli-catalog.json
└── fixtures/
```

### 7.2 环境变量

每个 Harness 使用独立 `env`：

```ts
const env = {
	ASCET_BRIDGE_PATH: bridgePath,
	ASCET_CONTRACTS_PATH: contractsPath,
	PI_ASCET_RUNTIME_DIR: runtimeDir,
	PI_ASCET_LOCK_PATH: lockPath,
	PI_ASCET_OPERATION_HEALTH_PATH: operationHealthPath,
	PI_ASCET_EXTENSION_ARTIFACT_ROOT: artifactRoot,
	PI_ASCET_ENABLE_BATCH_WRITE: options.batchWrite ? "1" : undefined,
};
```

不要修改全局 `process.env`。

### 7.3 Bridge 占位文件

`runAscetCliJson()` 会先检查 `cliPath` 是否存在。因此 Sandbox 创建一个不可执行的占位文件即可：

```text
<tempDir>/bridge/AscetBridge.exe
```

测试必须通过 Adapter 注入 `executeCli`。如果未注入，不得回退到生产 CLI 执行器。

### 7.4 Contract 文件

将仓库内版本控制的 Contract 文件复制到 Sandbox：

```text
ascetcli/contracts/cli-catalog.json
```

测试应使用隔离路径，不应从用户机器上的 ASCET 安装目录读取 Contract。

### 7.5 Sandbox 接口

```ts
interface AscetRuntimeSandbox {
	root: string;
	env: Record<string, string | undefined>;
	bridgePath: string;
	contractsPath: string;
	runtimeDir: string;
	artifactRoot: string;
	fixturesDir: string;
	cleanup(): void;
}
```

`cleanup()` 只能删除当前 Sandbox 创建的绝对路径。

### 7.6 Sandbox 验收

新增 `isolation.test.ts`，验证：

```text
两个 Sandbox 路径不同
Lock 路径不同
Operation Health 路径不同
Artifact Root 不同
清理一个 Sandbox 不影响另一个
所有路径均位于测试临时目录
```

---

## 8. P2：Mock 外部依赖

## 8.1 Mock CLI

新增 `mock-cli.ts`。

### 类型设计

```ts
interface MockCliMatch {
	operation?: string;
	commandId?: string;
	jobKind?: "read" | "write";
	args?: readonly string[];
	argsContaining?: readonly string[];
	stdin?: string | RegExp;
}

interface MockCliStep {
	match: MockCliMatch;
	result:
		| AscetCliExecutionResult
		| ((request: AscetCliRequest) => AscetCliExecutionResult);
}

interface RecordedCliRequest {
	index: number;
	request: AscetCliRequest;
	operation?: string;
	commandId?: string;
}
```

### 核心行为

1. 严格按队列消费。
2. 记录所有请求。
3. 从 `request.args` 提取 Operation。
4. 请求不匹配时立即失败。
5. 队列为空但收到请求时立即失败。
6. 测试结束时检查所有 Step 已消费。

```ts
class MockAscetCli {
	readonly requests: RecordedCliRequest[];

	constructor(steps: readonly MockCliStep[]);

	execute(request: AscetCliRequest): Promise<AscetCliExecutionResult>;

	expectComplete(): void;

	countOperation(operation: string): number;
}
```

### 请求字段边界

真实 `AscetCliRequest` 主要包含：

```text
cwd
cliPath
args
stdin
timeoutMs
jobKind
mutatesDatabase
```

以下信息不应假设存在于 CLI Request 中：

```text
toolName
action
logicalCommandId
backendCommandId
resourceKey
```

这些信息分别从 Tool Call、Route 或 Scheduler Job 中断言。

## 8.2 Response Builder

新增 `response-builders.ts`：

```ts
function bridgeSuccess(
	request: AscetCliRequest,
	result: unknown,
): AscetCliExecutionResult;

function bridgeFailure(
	request: AscetCliRequest,
	options: {
		exitCode?: number;
		code: string;
		message: string;
		stage?: string;
		details?: unknown;
	},
): AscetCliExecutionResult;

function bridgeInvalidJson(request: AscetCliRequest): AscetCliExecutionResult;

function bridgeTimeout(request: AscetCliRequest): AscetCliExecutionResult;
```

Success 输出使用真实 Bridge Envelope：

```json
{
  "ok": true,
  "result": {}
}
```

错误、超时和非法 JSON 应从 CLI 层进入真实错误映射，不在最终 Tool Result 层直接伪造。

## 8.3 Recording Scheduler

新增 `recording-scheduler.ts`。

复用生产 `createAscetScheduler()`，只增加记录：

```ts
interface RecordedSchedulerJob {
	index: number;
	agentId: string;
	toolName: string;
	commandId: string;
	kind: string;
	resourceKey?: string;
	queueTimeoutMs?: number;
	executionTimeoutMs?: number;
}
```

需要验证：

```text
read Action 使用 read Job
write Action 使用 write Job
Control Action 使用正确类别
Resource Key 正确
队列和取消行为不被测试替身破坏
```

## 8.4 Mock Confirmation

新增 `mock-confirmation.ts`，支持：

```text
approve
reject
throw
cancel/timeout
unavailable
```

记录：

```text
title
message
timeout
signal
call order
```

接口：

```ts
class MockConfirmation {
	readonly requests: ConfirmationRequest[];

	constructor(responses: readonly ConfirmationResponse[]);

	confirm(
		title: string,
		message: string,
		options?: ConfirmationOptions,
	): Promise<boolean>;

	expectComplete(): void;
}
```

---

## 9. P3：真实 Tool Definition Adapter

### 9.1 注入问题

AgentSession 的标准 `ExtensionContext` 不包含：

```text
executeCli
scheduler
env
agentId
sessionId
statusProbe
```

因此不能只加载真实 ASCET Extension 后期待 Mock CLI 自动生效。

### 9.2 Adapter 设计

新增 `tool-adapter.ts`，保留真实 Tool Definition 全部字段，只包装 `execute()`：

```ts
function injectAscetTestContext(
	tool: ToolDefinition,
	dependencies: AscetTestDependencies,
): ToolDefinition {
	return {
		...tool,
		execute(toolCallId, params, signal, onUpdate, runtimeContext) {
			return tool.execute(
				toolCallId,
				params,
				signal,
				onUpdate,
				{
					...runtimeContext,
					env: dependencies.env,
					executeCli: dependencies.executeCli,
					scheduler: dependencies.scheduler,
					agentId: dependencies.agentId,
					sessionId: dependencies.sessionId,
					hasUI: dependencies.confirmation !== undefined,
					ui: dependencies.confirmation
						? {
								...runtimeContext.ui,
								confirm: dependencies.confirmation.confirm,
							}
						: runtimeContext.ui,
					ascetStatusLiveToolApiProbe: dependencies.statusProbe,
				},
			);
		},
	};
}
```

实际实现必须按当前 TypeScript 类型调整，不得使用 `any`。

必须保留：

```text
真实 TypeBox Schema
prepareArguments
真实 Action Guard
真实 Tool execute
真实 Result Contract
```

不修改生产 `ExtensionContext` 公共接口。

### 9.3 ASCET Test Dependencies

```ts
interface AscetTestDependencies {
	executeCli: (
		request: AscetCliRequest,
	) => Promise<AscetCliExecutionResult>;
	scheduler: AscetScheduler;
	confirmation?: MockConfirmation;
	statusProbe?: LiveToolApiProbe;
	env: Record<string, string | undefined>;
	agentId: string;
	sessionId: string;
}
```

### 9.4 Profile Tool 注册

使用生产函数：

```text
buildProfiledAscetTools()
resolveProfileTools()
```

流程：

```text
解析 Profile
    -> 构建真实 Profile Tool Definition
    -> 应用测试 Context Adapter
    -> Inline Extension 注册
    -> AgentSession 使用
```

不要同时加载真实 ASCET Extension 和测试 Extension，避免同名 Tool 注册冲突。

### 9.5 ASCET Harness 接口

```ts
interface AscetHarness {
	sandbox: AscetRuntimeSandbox;
	mockCli: MockAscetCli;
	scheduler: RecordingAscetScheduler;
	confirmation?: MockConfirmation;
	tools: Map<string, ToolDefinition>;
	trace: AscetTrace;
	executeTool(toolName: string, args: unknown): Promise<AgentToolResult>;
	createAgentSession(): Promise<AgentSessionHarness>;
	cleanup(): void;
}
```

`executeTool()` 用于 L1 全 Action 测试。

`createAgentSession()` 用于 L2 代表性集成测试。

---

## 10. P4：Action Contract Matrix

### 10.1 独立 Action Oracle

新增 `action-oracle.ts`。

不能从同一个 Route Manifest 同时生成测试输入和预期 Operation，否则 Route 映射错误时测试仍可能通过。

```ts
interface ActionOracleEntry {
	id: string;
	tool: string;
	action: string;
	expectedOperation: string;
	expectedJobKind: "read" | "write" | "local";
	resultFamily:
		| "get"
		| "read"
		| "diff"
		| "edit"
		| "dependency-chain"
		| "status"
		| "capabilities"
		| "scheduler"
		| "recover"
		| "batch";
}
```

全部 60 个 Action 都必须有一条 Oracle。

Oracle 只维护稳定的外部契约：

```text
Action ID
Tool
Action
Backend Operation
Job Kind
Result Family
```

### 10.2 Contract Test

新增 `action-contract.test.ts`。

检查以下集合相等：

```text
Descriptor IDs
Catalog IDs
Catalog Snapshot IDs
Route IDs
Oracle IDs
Execution Fixture IDs
```

断言：

```text
数量均为 60
不存在重复 ID
不存在缺失 Action
不存在多余 Action
Tool 注册存在
Schema 存在
Route 存在或有明确 Composite Handler
每个 Action 至少一个 Execution Fixture
```

### 10.3 Schema Test

对每个 Fixture：

```ts
expect(Value.Check(tool.parameters, fixture.args)).toBe(true);
```

以下复合调用需要分别覆盖：

```text
apply_element_spec plan
apply_element_spec commit
set_element_dependency plan
set_element_dependency commit
```

---

## 11. P5：Execution Fixture

### 11.1 Fixture 原则

Few-shot 只证明调用示例可被 Prompt 使用，不等于可执行 Fixture。

Execution Fixture 必须额外提供：

```text
有效目标参数
最小合法 Bridge Response
文件输入
Profile
Feature Flag
Confirmation Response
CLI Step 顺序
预期 Result Family
预期最终状态
```

### 11.2 Fixture 类型

```ts
interface AscetToolInvocationFixture {
	args: Record<string, unknown>;
}

interface AscetActionFixture {
	id: string;
	profile: AscetProfile;
	env?: Record<string, string | undefined>;
	files?: Record<string, string>;
	cliSteps?: readonly MockCliStep[];
	confirmation?: readonly ConfirmationResponse[];
	invocations: readonly AscetToolInvocationFixture[];
	expected: {
		operations: readonly string[];
		jobKinds?: readonly string[];
		confirmationCount?: number;
		writeRequestCount?: number;
		resultFamily: ActionResultFamily;
		finalStatus?: string;
	};
}
```

### 11.3 Fixture 分类

```text
read-success
read-empty
read-truncated
diff-success
preflight
confirmation-rejected
write-success
readback-failed
unknown-outcome
rollback-failed
lock-conflict
invalid-json
timeout
feature-disabled
inactive-profile
target-not-found
```

每个 Action 至少有一个成功执行、合法 Preflight 或合法停止 Fixture。

---

## 12. Tool Family Fixture 任务

## 12.1 `ascet_get`

文件：

```text
fixtures/get.ts
```

覆盖：

```text
database_identity
tree
database_catalog
elements
formulas
component_refs
bde_edges
import_binding
dbitem_refs
```

每个 Fixture 断言：

```text
真实 ascet_get Definition 被调用
Mock Operation 为 get_<action>
details.tool/action 正确
details.command.operation 正确
details.data 可解析
coverage/truncated 结构保留
```

重点补充：

```text
database_identity 的 fingerprint/name/path
tree 的 coverage 和 OID
database_catalog 的大输出处理
```

## 12.2 `ascet_read`

文件：

```text
fixtures/read.ts
```

覆盖：

```text
read
read_code
read_method_signature
read_element
read_implementation
read_block_diagram
read_state_machine_flow
read_dependent_chain
read_element_dependency
```

重点：

```text
componentPath/methodName 参数转换
timeoutMs 传递
read_code detailLevel
read_block_diagram 默认 Main
read_dependent_chain exporter 参数
Result 格式化
```

## 12.3 `ascet_diff`

文件：

```text
fixtures/diff.ts
```

覆盖：

```text
diff
diff_method
diff_component_snapshot
diff_state_machine_domain
diff_element_spec
diff_project_formulas
```

`diff` Action 额外覆盖动态 Object Kind：

```text
class
module
statemachine
默认 component snapshot
```

断言：

```text
left/right 参数不被交换
changesOnly 正确传递
specFile 位于 Sandbox
objectKind Route 正确
```

## 12.4 普通 `ascet_edit`

文件：

```text
fixtures/edit.ts
```

覆盖：

```text
create_folder
create_component
create_method
set_method_signature
delete_component
delete_method
delete_folder
set_method_code
set_module_code
set_state_machine_code
set_enumerators
apply_project_formula
check
set
```

普通写入成功 Fixture 应准备实际需要的 CLI Step：

```text
Database Identity
完整 Tree
目标 OID
Action-specific preflight 或 safety check
Action-specific write operation
Action-specific readback
```

具体 Step 顺序以实现实际调用为准，Mock CLI 必须严格匹配。

成功写入断言：

```text
executeWrite=true
Scheduler Job Kind=write
mutatesDatabase=true
写入只执行一次
自动 Readback 存在
verification.status=passed
最终状态为成功或 committed
```

## 12.5 Plan/Commit Action

覆盖：

```text
apply_element_spec
set_element_dependency
```

每个 Action 至少两个 Invocation：

```text
Invocation 1: phase=plan
Invocation 2: phase=commit + planId
```

断言：

```text
Plan Artifact 被创建
Plan ID 返回
Commit 使用相同 Plan
Database Identity 未漂移
Target OID 未漂移
Confirmation 只发生在 Commit
Backend 写入只发生在 Commit
Plan 最终被 consume
临时 spec 文件被删除
```

## 12.6 `ascet_batch_write`

文件：

```text
fixtures/batch-write.ts
```

覆盖 9 个隐藏 Action。

执行条件：

```text
profile=batch-write
PI_ASCET_ENABLE_BATCH_WRITE=1
```

断言：

```text
operation discriminator 正确
requests 数组正确
Confirmation 正确
batch operation 正确
items result 正确
write count 正确
```

另行测试：

```text
Flag 关闭时不可调用
Profile 不匹配时不可调用
默认 Prompt 不暴露
```

## 12.7 Dependency Chain

文件：

```text
fixtures/dependency-chain.ts
```

覆盖：

```text
Provider Exported
Consumer Imported
Consumer Local Dependent
Dependency Mapping
```

断言：

```text
只发生一次 configure_parameter_dependency_chain_execute
临时 request JSON 在执行期间存在
Provider/Imported/Local 三个角色完整
writesPerformed 正确
mutationStarted 正确
verification 正确
rollback.required 正确
执行后临时请求文件删除
```

## 12.8 Ops Tool

文件：

```text
fixtures/ops.ts
```

覆盖：

```text
ascet_status.status
ascet_capabilities.search_actions
ascet_scheduler_status.status
ascet_scheduler_status.recover
ascet_recover.status
ascet_recover.clear_extension_temp
ascet_recover.scheduler_status
ascet_recover.scheduler_recover
ascet_recover.clear_stale_cli_lock
ascet_recover.reconcile_mutation
```

这些 Action 需要按依赖类型准备：

```text
Status Probe
Scheduler Snapshot
Stale Lock 文件
Extension Temp 文件
Mutation Guard Record
Confirmation
Recovery Evidence
```

不能假设所有 Ops Action 都经过 Mock CLI。

---

## 13. P5：全 Action 执行测试

新增：

```text
all-actions-execution.test.ts
```

测试流程：

```ts
describe.each(actionFixtures)("$id", (fixture) => {
	it("executes the real ASCET tool definition", async () => {
		const harness = await createAscetHarness(fixture);

		try {
			for (const invocation of fixture.invocations) {
				await harness.executeFixtureInvocation(fixture, invocation);
			}

			harness.assertFixtureComplete(fixture);
		} finally {
			harness.cleanup();
		}
	});
});
```

统一断言：

```text
参数通过真实 Schema
真实 Tool Definition 被调用
Mock CLI 队列按预期消费
Confirmation 队列按预期消费
Operation 与 Oracle 一致
Scheduler Job Kind 正确
Tool Result 可 JSON 序列化
details.tool/action 正确
临时文件清理完成
```

按 Result Family 使用专用断言，不对所有工具统一要求 `details.outcome`。

---

## 14. P6：Profile、Feature Flag 和 Action Guard

新增：

```text
profile-action-guard.test.ts
```

### 14.1 Profile Tool Matrix

覆盖：

```text
base
advanced-read
reference
diff
write-preflight
batch-write
component-edit
ops
```

检查 Active Tools 与：

```ts
resolveProfileTools(profile, env)
```

一致。

保留关键独立断言：

```text
diff Profile 包含 ascet_diff
ops Profile 包含 ascet_recover
component-edit 包含 ascet_edit
batch-write Flag 关闭时不包含 ascet_batch_write
```

### 14.2 Guard 拒绝

场景：

```text
未知 Action
Profile 不允许
Feature Flag 关闭
Hidden Batch Tool 未激活
Internal Action
Deprecated Replacement
```

断言：

```text
返回 ascet_action_unavailable
包含 recover.ascet_capabilities
Mock CLI 调用次数为 0
Scheduler Job 数为 0
Confirmation 调用次数为 0
```

### 14.3 Base Profile 特殊语义

当前 `base` Profile 具有特殊兼容逻辑。应添加测试锁定该行为，避免后续误把 Descriptor 的 Profile 列表作为唯一判断依据。

---

## 15. P7：写入状态机

新增：

```text
write-state-machine.test.ts
```

以状态机和错误等价类为中心，不进行全部 Action 与全部错误的笛卡尔积测试。

### 15.1 正常状态

```text
INPUT
  -> VALIDATED
  -> TARGET_RESOLVED
  -> PREFLIGHTED
  -> CONFIRMATION_REQUIRED
  -> APPROVED
  -> BRIDGE_ENTERED
  -> WRITE_RESULT
  -> READBACK
  -> COMMITTED
```

### 15.2 Preflight

输入：

```text
executeWrite=false
```

断言：

```text
返回 preflight
无 Confirmation
无 write Job
无 mutation
```

允许执行 Backend Dry Run 或安全读取，但不得执行真实写入。

### 15.3 无 UI

```text
executeWrite=true
hasUI=false
```

断言：

```text
返回 *_ui_required
无写请求
无 Mutation Guard Quarantine
```

### 15.4 确认拒绝

断言：

```text
返回 *_confirmation_not_granted
Confirmation 调用一次
无写请求
```

### 15.5 Target Not Found

完整 Tree 不包含目标：

```text
plan_target_identity_missing
```

断言：

```text
无 Confirmation
无写请求
```

### 15.6 Tree 不完整

模拟：

```json
{
  "coverage": {
    "status": "partial"
  },
  "truncated": true
}
```

断言：

```text
shared_object_impact_unknown
无写请求
```

### 15.7 SCM Lock Conflict

模拟锁冲突或结构化错误：

```text
scm_lock_conflict
```

断言：

```text
不自动重试
写 Operation 最多一次
后续 Readback 行为符合实现契约
```

### 15.8 Readback Failure

写请求成功，但 Readback 失败：

```text
verification.status != passed
```

断言：

```text
最终结果不是 committed/PASS
Observations 正确失效
```

### 15.9 Invalid JSON

断言：

```text
ascet_cli_invalid_json
diagnostics.stage=json_parse
```

### 15.10 Timeout

断言：

```text
ascet_cli_timeout 或 write_outcome_unknown
mutationStarted 根据 lifecycle 正确
Operation Health 写入当前 Sandbox
```

### 15.11 Unknown Outcome

模拟：

```text
Bridge 已进入
请求已派发
没有可信最终结果
```

断言：

```text
mutationStarted=true
cleanupRequired=true
目标进入 quarantine
相同目标的第二次写入被阻止
第二次调用不进入 Bridge
```

---

## 16. P8：Recovery 状态机

新增：

```text
recovery-state-machine.test.ts
```

### 16.1 Mutation Guard Seed Helper

提供：

```ts
seedMutationGuard({
	databaseFingerprint,
	targetOid,
	targetKind,
	canonicalPath,
	status: "quarantined",
	operation,
	operationId,
});
```

所有记录必须位于当前 Sandbox Artifact Root。

### 16.2 Reconcile Success

准备：

```text
quarantined target
current database identity
live target evidence
confirmation approve
reconciliation success
```

断言：

```text
Guard generation 增加
最终状态 clear
Evidence fingerprint 被保存
```

### 16.3 Reconcile Reject

断言：

```text
Guard 仍为 quarantined
无恢复写入
```

### 16.4 Database Identity Drift

断言：

```text
Recovery 被拒绝
旧 Database Evidence 不被复用
Guard 不被清除
```

### 16.5 Rollback Success

断言：

```text
status=rolled_back
mutationStarted 正确
writesPerformed 正确
Guard 最终状态符合实现契约
```

### 16.6 Rollback Failed

断言：

```text
status=rollback_failed
目标保持 quarantined
不能继续普通写入
Scheduler/Operation Health 进入对应降级状态
恢复证据存在
```

### 16.7 Stale CLI Lock Recovery

覆盖：

```text
可证明 stale 的 Lock
仍活跃的 Lock Owner
格式损坏的 Lock Record
非当前 Extension 所有的 Lock
```

不得删除无法证明 stale 或属于其他用户的 Lock。

---

## 17. P9：AgentSession 代表性集成测试

新增：

```text
agent-session-integration.test.ts
```

覆盖 8 个代表性 Action：

```text
ascet_get.tree
ascet_read.read_code
ascet_diff.diff_method
ascet_edit.set_method_code
ascet_edit.apply_element_spec
configure_parameter_dependency_chain.execute
ascet_recover.reconcile_mutation
ascet_scheduler_status.status
```

### 17.1 测试流程

```ts
harness.setResponses([
	fauxAssistantMessage(
		fauxToolCall(toolName, args),
		{ stopReason: "toolUse" },
	),
	(context) => {
		const result = context.messages.findLast(
			(message) => message.role === "toolResult",
		);
		expect(result).toBeDefined();
		return fauxAssistantMessage("done");
	},
]);

await harness.session.prompt("execute ASCET test action");
```

### 17.2 必须断言

```text
Faux response queue 消费完
Faux Provider callCount 正确
Tool Call ID 一致
Tool 实际执行
Mock CLI Operation 正确
Tool Result role=toolResult
Tool Result toolName 正确
下一轮 Provider Context 包含 Tool Result
最终 Assistant Message 存在
```

### 17.3 非法参数集成测试

增加一条非法参数测试：

```text
Faux Provider 发出缺少必填字段的 ASCET Tool Call
```

断言：

```text
Mock CLI 未调用
AgentSession 生成 Tool Error Result
下一轮 Provider 可以看到错误
```

### 17.4 Event 断言

只断言关键事件子序列：

```text
agent_start
message_start
tool_execution_start
tool_execution_end
message_end
agent_end
```

不要断言完整 Event 数组，避免内部新增非关键事件导致无关失败。

---

## 18. Trace 设计

新增 `trace.ts`。

```ts
interface AscetTestTrace {
	actionId: string;
	profile: AscetProfile;
	activeTools: string[];
	invocations: Array<{
		toolCallId?: string;
		tool: string;
		action: string;
		args: Record<string, unknown>;
	}>;
	cliRequests: Array<{
		index: number;
		operation?: string;
		args: string[];
		stdin?: string;
		jobKind?: string;
		timeoutMs?: number;
	}>;
	schedulerJobs: RecordedSchedulerJob[];
	confirmations: ConfirmationRequest[];
	results: unknown[];
	finalStatus?: string;
}
```

默认保存在内存。

测试失败时输出：

```text
Action
Profile
Invocation
Expected Operation
Actual Operation
CLI Request Count
Scheduler Job Count
Confirmation Count
Result Status
Verification Status
Rollback Status
```

普通 CI 不向仓库 `output/` 写固定 Trace Artifact。

---

## 19. 测试隔离与防真实执行

### 19.1 强制 Mock CLI

Harness 创建时必须注入 `executeCli`。如果未注入，应立即失败：

```text
ASCET test harness requires an injected executeCli implementation
```

不得回退到生产 `executeAscetCli()`。

### 19.2 占位 Bridge 不可执行

占位 Bridge 文件只满足路径存在检查，不复制或运行真实 EXE。

### 19.3 每个测试独立依赖

每个 `it()` 独立创建：

```text
Sandbox
Mock CLI
Scheduler
Confirmation
Artifact Root
Session ID
Agent ID
```

### 19.4 并行隔离

并行启动两个 Harness，验证：

```text
请求不串线
Lock 不冲突
Operation Health 不共享
Artifact 不共享
```

### 19.5 清理前检查

每个 Harness 清理前执行：

```text
Mock CLI 队列已消费完
Confirmation 队列已消费完
没有未结束 Scheduler Job
没有未消费 Faux Response
```

---

## 20. 开发阶段和任务依赖

```text
T0 修复静态基线
  ↓
T1 Runtime Sandbox
  ↓
T2 Mock CLI / Scheduler / Confirmation
  ↓
T3 Tool Adapter / Harness
  ├──→ T4 Action Contract Matrix
  │       ↓
  │     T5 全 Action Fixtures
  │       ├──→ T7 写入状态机
  │       └──→ T8 Recovery 状态机
  └──→ T9 AgentSession Integration
          ↑
          └── 复用 T5 Fixture

全部完成
  ↓
T10 Isolation / Stability
  ↓
npm run check
```

### 20.1 任务列表

| 编号 | 任务 | 依赖 | 交付物 |
|---|---|---|---|
| T0 | 恢复静态基线 | 无 | Few-shot 和 Get Action 测试通过 |
| T1 | Runtime Sandbox | T0 | `runtime-sandbox.ts`、隔离测试 |
| T2 | Mock CLI | T1 | `mock-cli.ts`、Response Builder |
| T3 | Recording Scheduler | T1 | `recording-scheduler.ts` |
| T4 | Mock Confirmation | T1 | `mock-confirmation.ts` |
| T5 | Tool Adapter | T2–T4 | `tool-adapter.ts` |
| T6 | ASCET Harness | T5 | `harness.ts` |
| T7 | Action Oracle | T0 | `action-oracle.ts` |
| T8 | Contract Matrix | T6–T7 | `action-contract.test.ts` |
| T9 | Read Fixtures | T8 | `get.ts`、`read.ts`、`diff.ts` |
| T10 | Ops Fixtures | T8 | `ops.ts` |
| T11 | Edit Fixtures | T8–T9 | `edit.ts` |
| T12 | Batch/Chain Fixtures | T11 | `batch-write.ts`、`dependency-chain.ts` |
| T13 | 全 Action 执行测试 | T9–T12 | `all-actions-execution.test.ts` |
| T14 | Profile/Guard 测试 | T6–T8 | `profile-action-guard.test.ts` |
| T15 | 写入状态机 | T11–T13 | `write-state-machine.test.ts` |
| T16 | Recovery 状态机 | T12–T15 | `recovery-state-machine.test.ts` |
| T17 | AgentSession 集成 | T6、T9、T11、T12 | `agent-session-integration.test.ts` |
| T18 | 隔离和稳定性 | T13–T17 | `isolation.test.ts` 和并行测试 |
| T19 | 最终检查 | T18 | `npm run check` 通过 |

### 20.2 预计工作量

| 阶段 | 预计工作量 |
|---|---:|
| P0 静态基线 | 0.5 天 |
| P1 Sandbox | 1 天 |
| P2 Mock 依赖 | 1.5 天 |
| P3 Adapter/Harness | 1 天 |
| P4 Contract Matrix | 1 天 |
| P5 Action Fixtures | 3–5 天 |
| P6 写入和 Recovery | 2–3 天 |
| P7 AgentSession 集成 | 1–2 天 |
| P8 稳定性和最终检查 | 1 天 |
| **总计** | **11–16 天** |

实际工作量主要取决于写入 Action 的最小合法 Readback Response 和 Recovery 状态准备。

---

## 21. 分批交付计划

### 批次 A：基础设施和 Read Vertical Slice

交付：

```text
静态基线修复
Runtime Sandbox
Mock CLI
Recording Scheduler
Tool Adapter
ASCET Harness
ascet_get.tree Definition 执行
ascet_get.tree AgentSession 集成
```

验收：

> 真实 `ascet_get` Tool Definition 能够在 AgentSession 中通过 Mock CLI 完整执行。

### 批次 B：Contract Matrix 和只读 Action

交付：

```text
Action Oracle
60 Action Contract Matrix
全部 ascet_get
全部 ascet_read
全部 ascet_diff
status/capabilities/scheduler status
```

### 批次 C：普通写入

交付：

```text
普通 ascet_edit Action
Preflight
Confirmation
Write
Readback
Target/Tree/Identity Guard
```

### 批次 D：复杂写入和恢复

交付：

```text
apply_element_spec Plan/Commit
set_element_dependency Plan/Commit
Dependency Chain
Batch Write
Unknown Outcome
Mutation Guard
Recovery
Rollback
```

### 批次 E：稳定性和最终验收

交付：

```text
并行隔离
无真实 Bridge 证明
完整 60 Action Execution
代表性 AgentSession Loop
npm run check
```

---

## 22. 测试命令

开发期间逐文件运行：

```powershell
cd packages/coding-agent
node ./node_modules/vitest/dist/cli.js --run test/suite/ascet/action-contract.test.ts
node ./node_modules/vitest/dist/cli.js --run test/suite/ascet/profile-action-guard.test.ts
node ./node_modules/vitest/dist/cli.js --run test/suite/ascet/all-actions-execution.test.ts
node ./node_modules/vitest/dist/cli.js --run test/suite/ascet/write-state-machine.test.ts
node ./node_modules/vitest/dist/cli.js --run test/suite/ascet/recovery-state-machine.test.ts
node ./node_modules/vitest/dist/cli.js --run test/suite/ascet/agent-session-integration.test.ts
node ./node_modules/vitest/dist/cli.js --run test/suite/ascet/isolation.test.ts
```

修改测试文件后必须立即运行对应测试并迭代到通过。

代码变更完成后执行：

```powershell
npm run check
```

按照仓库规则，不执行以下命令，除非用户明确要求：

```text
npm run build
npm test
完整 Vitest Suite
```

---

## 23. 最终验收标准

### 23.1 Action 覆盖

```text
Descriptor 数量为 60
Catalog Snapshot 数量为 60
Route 数量为 60
独立 Oracle 数量为 60
Execution Fixture 覆盖全部 60 个 Action
```

### 23.2 执行正确性

```text
全部 Fixture 通过真实 TypeBox Schema
全部 Fixture 执行真实 ASCET Tool Definition
全部 Route 与独立 Operation Oracle 一致
全部 Mock CLI 请求严格按预期消费
Tool Result 可序列化
Tool Result 的 tool/action/command 正确
```

### 23.3 Profile 和 Guard

```text
Profile Active Tools 正确
Feature Flag 关闭时 Batch Write 不可执行
Feature Flag 开启且 Profile 合法时 Batch Write 可执行
Action Guard 拒绝时不调用 CLI
Action Guard 拒绝时不提交 Scheduler Job
Action Guard 拒绝时不请求 Confirmation
```

### 23.4 写入安全

```text
Preflight 不执行写入
无 UI 时不执行写入
确认拒绝时不执行写入
目标不完整或不存在时不执行写入
成功写入执行自动 Readback
Readback 失败不返回成功状态
SCM Lock Conflict 不自动重试
```

### 23.5 Unknown Outcome 和 Recovery

```text
Unknown Outcome 不被视为成功
Unknown Outcome 后目标进入保护状态
相同目标的重复写入被 Mutation Guard 阻止
Rollback Failed 保留恢复状态和证据
Recovery 不清除无法证明安全的 Guard/Lock
Database Identity Drift 不复用旧 Evidence
```

### 23.6 AgentSession 集成

```text
代表性 Tool Call 能被 AgentSession 接收
真实 ASCET Tool 能被执行
Tool Result 正确写回下一轮 Context
Faux Provider 响应队列正确消费
AgentSession 最终结束状态正确
```

### 23.7 隔离

```text
不调用真实 Provider
不启动真实 AscetBridge.exe
不连接真实 ASCET
不读取用户 ASCET Runtime 状态
Runtime、Lock、Plan、Guard 和 Artifact 均在临时目录
测试结束后临时状态清理完成
npm run check 无 error、warning 或 info
```

---

## 24. 最终结论

本方案将测试范围定义为：

> **ASCET Extension 全 Action 执行、外部依赖隔离、写入安全和恢复状态机测试。**

采用以下覆盖比例：

```text
L0 静态契约：100% Action
L1 Tool Definition 执行：100% Action
L2 AgentSession 集成：代表性 Action
写入/恢复状态机：按风险和状态分支覆盖
```

实施时应先完成批次 A，验证以下三条链路：

```text
真实 Tool Definition -> Mock CLI
真实 Tool Definition -> 写入/确认依赖
真实 Tool Definition -> AgentSession Tool Loop
```

三条链路打通后，再批量开发 60 个 Action Fixture。
