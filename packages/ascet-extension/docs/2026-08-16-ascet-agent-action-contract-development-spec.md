# ASCET Agent Action Contract Development Specification

- Version: 1.0
- Date: 2026-08-16
- Status: Implemented
- Scope: Agent action definition, public parameter schema, routing, Bridge operation mapping, result contract, registration, catalog, and consistency validation

## Implementation status

### Checkpoint 1 - 2026-08-16

Completed:

- Added the typed Action Contract registry and shared result schemas.
- Migrated `ascet_search.search`, both public Get actions, all public Read actions, all Diff actions, and the dependency-chain read/write pair.
- Moved Search/Get/Read/Diff public parameter schemas to Contract-owned definitions.
- Moved `create_dependent_chain` public types and schema out of the runtime implementation.
- Derived Get, Read, Diff, and dependency-chain routes from Contract entries.
- Replaced Diff router hardcoding with declarative `objectKind` route variants.
- Removed retired Get routes, `ascet_edit.set_element_dependency`, and `configure_parameter_dependency_chain.execute` from Agent routing.
- Added the `AscetCreateDependentChain -> AscetConfigureParameterDependencyChainExecute` backend command alias.
- Derived tool-name arrays from keyed implementation registries.
- Added Contract, route, Bridge-operation, result-shape, and regression tests.

Current coverage:

```text
19 Contract-backed actions
53 descriptor-visible actions
34 actions remaining
```

Remaining migration scope:

```text
ascet_edit excluding create_dependent_chain
ascet_status
ascet_capabilities
ascet_recover
ascet_scheduler_status
ascet_batch_write
catalog result/guidance derivation cleanup
edit runtime contract reduction
legacy descriptor and route source deletion
```

Verification evidence:

```text
49 targeted tests passed
npm run check passed
```

This checkpoint is not task completion. Completion still requires every item in section 23.

### Checkpoint 2 - 2026-08-16

Completed:

- Moved all public `ascet_edit` mutation schemas into the Contract module.
- Registered all 15 public Edit actions, including `set_module_code` and all 12 `set_state_machine_code` operation examples.
- Derived every public Edit descriptor and route from Action Contract entries.
- Kept `set_element_dependency` as an internal runtime/Bridge-only schema.
- Removed the public Edit schema filter and the duplicated hand-written Edit descriptor/route blocks.
- Migrated Status, Capabilities, Recover, Scheduler Status, and all hidden Batch actions.
- Reduced `descriptors.ts` and `route-manifests.ts` to pure Contract-derived adapters.
- Verified the Contract registry and descriptor catalog contain the same 53 action IDs with no duplicates.

Current coverage:

```text
53 Contract-backed actions
53 descriptor-visible actions
0 actions remaining
```

Remaining migration scope:

```text
catalog result/guidance derivation cleanup
edit runtime contract reduction
legacy descriptor and route source deletion
```

Verification evidence:

```text
23 focused Contract/Edit/route/catalog tests passed after full action migration
npm run check passed
```

Checkpoint 2 was not task completion; the remaining catalog, runtime-contract, and few-shot audit work is completed in Checkpoint 3.

### Checkpoint 3 - 2026-08-16

Completed:

- Migrated all 53 Agent action identities into the unified Contract registry.
- Made tool parameter unions, descriptors, routes, catalog entries, prompt examples, activation metadata, and result documentation derive from Contract entries.
- Removed `actionOverrides`, tool-schema lookup maps, result inference, hand-written descriptor entries, hand-written route entries, and the public Edit schema filter.
- Reduced `edit/contract.ts` to runtime executor, discriminator, job-kind, and permission policy only.
- Added `operation` as the canonical selector for hidden Batch actions instead of overloading `mode`.
- Added runtime validation of normalized Agent content with `Value.Check(contract.result, payload)`.
- Removed duplicate public Capabilities, Recover, and Batch parameter schemas from runtime implementation files.
- Added bidirectional Contract/descriptor/tool-schema/route/result consistency validation.
- Updated few-shot auditing to support nested schemas, multiple ordinary examples, and exact operation variants.

Final coverage:

```text
53 Contract-backed actions
44 public actions
9 hidden Batch actions
55 derived route entries, including conditional Diff variants
0 descriptor-visible actions outside the Contract registry
```

Verification evidence:

```text
40 specification-targeted tests passed
7 action few-shot audit tests passed
30 guarded write tool tests passed
ASCET Bridge coverage passed: 35 required tool operations, 72 registered operations, 71 packaged Bridge operations
npm run check passed with no errors, warnings, or infos
```

Section 23 completion criteria are satisfied. No compatibility aliases, IDL, cross-language generation, new CLI command, or runtime registry framework were introduced.

## 1. Decision

建立一套权威的 Agent Action Contract，作为 ASCET Agent 对外动作的唯一事实来源。

每个 Agent action 只在 Contract 中定义一次：

```text
tool + action identity
public visibility
profile exposure
parameter schema
execution route
Bridge operation
Agent-visible result schema
prompt and catalog guidance
```

以下内容必须从 Contract 派生，不再维护独立 action 清单：

```text
Tool parameter union
Action descriptor/catalog
Route manifest
Prompt action instructions
Capabilities action search
Public action activation
Result shape metadata
```

Bridge 后端仍保留自己的实现注册表：

```text
ascetcli/src/AscetCli/Routing/OperationRegistry.cs
```

它是 Bridge operation 实现与执行策略的事实来源，不是 Agent action 的事实来源。Agent Contract 通过 operation id 引用 Bridge，并由自动测试验证引用有效。

不引入跨语言代码生成、IDL、数据库、运行时反射框架或新的 CLI 命令。

## 2. Superseded decisions

本规格只覆盖 Action Contract、命名和派生关系。既有工具业务语义继续有效，除非本节明确覆盖。

### 2.1 Search

本规格覆盖 `2026-08-15-ascet-search-get-tools-final-spec.md` 中 `ascet_search` 的请求 schema：

```json
{"action":"search","mode":"element","q":"PCA_Ctrl_slMin_RA","limit":20}
```

`action="search"` 是固定 Agent action；`mode` 是 Search 查询模式，不再被当作 action。

Search 的 live-only、无持久化、Scheduler 和窗口生命周期设计保持不变。

### 2.2 Get

`ascet_get` 仍只公开：

```text
ascet_get.tree
ascet_get.formulas
```

旧 Get operation 可以保留为内部 Bridge 能力，但不能保留为 Agent route。

### 2.3 Dependency chain

`2026-08-15-ascet-create-dependent-chain-development-spec.md` 保持有效。

唯一 Agent-facing dependency write action 是：

```text
ascet_edit.create_dependent_chain
```

它映射到内部 Bridge operation：

```text
configure_parameter_dependency_chain_execute
```

以下名称不能继续作为 Agent action：

```text
configure_parameter_dependency_chain.execute
ascet_edit.set_element_dependency
ascet_edit.set_dependent_chain
```

`set_element_dependency` 可以继续作为内部 Bridge operation。

## 3. Current problem

同一个 action 的信息目前分散在：

```text
packages/ascet-extension/src/tools/registry.ts
packages/ascet-extension/src/tools/actions/descriptors.ts
packages/ascet-extension/src/tools/actions/catalog.ts
packages/ascet-extension/src/tools/actions/schema-registry.ts
packages/ascet-extension/src/tools/*/schema.ts
packages/ascet-extension/src/routing/route-manifests.ts
packages/ascet-extension/src/edit/contract.ts
ascetcli/src/AscetCli/Routing/OperationRegistry.cs
ascetcli/contracts/
packages/ascet-extension/ascet-cli/contracts/
```

其中 `schema-registry.ts` 本身主要是通用 schema 解析器，但当前 catalog 通过它反向推断 action schema，导致 action identity、schema 和 catalog 没有共同定义点。

当前已知差异：

1. Descriptor 中 `ascet_get` 只有 `tree` 和 `formulas`，route manifest 仍包含多个旧 Get action。
2. `ascet_search` descriptor 使用 `*`，schema 没有 `action`，tool details 又把 `mode` 写为 action。
3. `set_element_dependency` 存在于 route、edit runtime contract 和 Bridge registry，但公共 edit schema 显式过滤它。
4. Dependency chain 同时存在 Agent action、旧 tool name、logical command 和 Bridge operation 等多套名称。
5. `AscetCreateDependentChain` 当前没有明确映射到实际 backend command `AscetConfigureParameterDependencyChainExecute`。
6. 当前 route 测试只验证“每个 public descriptor 有 route”，不验证“每个 public route 有 descriptor/schema”，因此无法发现多余 route。
7. Result contract 主要由 `catalog.ts` 中的 shape/fields override 描述，与实际 formatter/normalizer 分离。

## 4. Goals

实现完成后必须满足：

1. 每个 Agent action 在 Contract 中只定义一次。
2. Tool schema、descriptor、route 和 catalog 不再各自维护 action 名称。
3. 所有 public action 使用稳定的 `tool.action` identity。
4. 所有多动作 domain tool 使用显式 discriminator。
5. `ascet_search` 使用标准 `action="search"`。
6. Agent route 只包含 Agent-facing actions，不暴露内部 Bridge operations。
7. 每个 Bridge action 的 logical command 和 operation 都能自动验证。
8. Agent-visible result 使用实际 JSON Schema，而不是只维护字段名称列表。
9. Contract 查询、schema 组合和 route 查找均为静态内存操作。
10. 删除旧清单后总代码量和修改 action 所需文件数下降。

目标修改路径：

```text
新增或修改一个 action：通常只修改一个 contract 文件和对应 executor
```

## 5. Non-goals

本任务不做：

```text
修改 ASCET 业务读写语义
重写 Scheduler
重写 permission system
重写 Bridge dispatcher
从 TypeScript 生成 C#
从 C# 生成 TypeScript
新增 CLI subcommand
新增持久化 action registry
保留旧 Agent action alias
把所有内部 Bridge operation 暴露为 Agent action
运行时读取或解析 C# 源代码
```

不为未来未知需求设计插件化 Contract DSL。

## 6. Contract boundaries

系统分为三层，每层只有一个明确职责。

### 6.1 Agent Action Contract

位置：

```text
packages/ascet-extension/src/tools/actions/contracts/
```

负责：

```text
Agent identity
public schema
visibility/profile
prompt guidance
Agent execution target
Agent-visible result schema
```

### 6.2 TypeScript runtime implementation

位置保持现状，例如：

```text
src/tools/search/definition.ts
src/tools/get/definition.ts
src/tools/read/definition.ts
src/tools/edit/definition.ts
src/edit/service.ts
```

负责：

```text
parameter adaptation
runtime orchestration
Scheduler use
permission checks
Bridge invocation
result normalization
```

Runtime implementation 可以按 contract id 查找 executor metadata，但不能重新声明 logical command、operation、public visibility 或 public schema。

### 6.3 Bridge operation registry

位置：

```text
ascetcli/src/AscetCli/Routing/OperationRegistry.cs
```

负责：

```text
operation availability
execution lane
session policy
handler kind
host eligibility
batch support
mutation flag
retry policy
```

Agent Contract 不复制这些 Bridge 执行策略。

### 6.4 CLI contracts

位置：

```text
ascetcli/contracts/commands/*.json
ascetcli/contracts/cli-catalog.json
packages/ascet-extension/ascet-cli/contracts/
```

这些文件是 backend command contract 和打包产物，不是 Agent action source。

禁止为了修复 Agent action drift 手工增加一个新的 CLI command JSON。现有生成/复制流程保持不变。

## 7. Target structure

建议结构：

```text
src/tools/actions/
  contracts/
    types.ts
    shared-results.ts
    ops.ts
    search.ts
    get.ts
    read.ts
    diff.ts
    edit.ts
    batch-write.ts
    index.ts
  contract-registry.ts
  catalog.ts
  guard.ts
  schema-registry.ts
```

按 tool family 拆分 Contract，避免把当前 1000 行以上的 descriptor 文件扩展成更大的单文件。

这些文件仍构成一套单一事实来源：action 只能出现在 `contracts/*.ts` 中，其他模块只查询或派生。

`schema-registry.ts` 保留为无状态通用工具，只允许包含：

```text
flatten schema variants
read discriminator values
select matching variants
describe schema variants
```

它不得包含 action 清单、route 或 result metadata。

### 7.1 Dependency direction

Contract 模块必须保持纯声明依赖：

```text
TypeBox
shared schema fragments
profile and prompt types
```

Contract 模块禁止导入：

```text
tool definition
executor/service
catalog
router
capabilities
```

当前 `edit/schema.ts` 从 `edit/service.ts` 取得 `ascetMutationActionSchemas`。迁移时应把这些 TypeBox schema 从 service 移入 `contracts/edit.ts` 或纯 schema fragment 文件，service 反向导入参数类型。这样可以删除 `catalog.ts` 当前的 lazy schema getter，而不会制造循环初始化。

`create-dependent-chain.ts` 中的 public TypeBox schema 同样应移动到纯 Contract 模块；runtime 文件只保留执行、验证和 orchestration。

## 8. Contract types

### 8.1 Action selector

```ts
export type AscetActionSelector = "action" | "mode" | "operation" | "fixed";
```

规则：

- `action`: schema 包含 `action: Type.Literal(contract.action)`。
- `mode`: schema 包含 `mode: Type.Literal(contract.action)`，只用于现有 editability 等兼容接口。
- `fixed`: tool 没有 public discriminator，runtime 固定使用 contract action。

新增 domain action 默认必须使用 `action`。禁止新增以 `mode` 充当 action identity 的接口。

### 8.2 Execution contract

```ts
export type AscetActionExecution =
	| {
			kind: "bridge";
			logicalCommandId: string;
			operation: string;
			variants?: readonly AscetBridgeRouteVariant[];
	  }
	| {
			kind: "native-search";
	  }
	| {
			kind: "local";
	  };
```

含义：

- `bridge`: 通过 `AscetBridge.exe exec <operation>` 或现有适配层执行。
- `native-search`: 通过现有 `runAscetSearch()` 执行。
- `local`: 仅在扩展内执行，例如纯状态组合或本地控制逻辑。

禁止为 Search 创建假的 Bridge operation。

### 8.3 Conditional Bridge routes

`ascet_diff.diff` 会根据 `objectKind` 选择不同 command。只为该类动作提供简单声明式 variants：

```ts
export interface AscetBridgeRouteVariant {
	when?: Readonly<Record<string, string>>;
	logicalCommandId: string;
	operation: string;
}
```

Contract execution 可以包含：

```ts
{
	kind: "bridge",
	logicalCommandId: "AscetDiffComponentSnapshot",
	operation: "diff_component_snapshot",
	variants: [
		{
			when: { objectKind: "class" },
			logicalCommandId: "AscetDiffClass",
			operation: "diff_class",
		},
		{
			when: { objectKind: "module" },
			logicalCommandId: "AscetDiffModule",
			operation: "diff_module",
		},
		{
			when: { objectKind: "statemachine" },
			logicalCommandId: "AscetDiffStateMachine",
			operation: "diff_state_machine",
		},
	],
}
```

Router 按数组顺序匹配 `when`，无匹配时使用 default route。不要引入通用规则引擎。

### 8.4 Action contract

```ts
import type { TSchema } from "typebox";
import type { AscetProfile } from "../../exposure/profiles.ts";

export interface AscetActionContract {
	id: string;
	tool: string;
	action: string;
	selector: AscetActionSelector;
	visibility: "public" | "internal" | "hidden";
	profiles: readonly AscetProfile[];
	featureFlag?: string;
	deprecatedBy?: string;
	supportedObjectKinds?: readonly string[];
	parameters: TSchema;
	result: TSchema;
	execution: AscetActionExecution;
	guidance?: AscetActionGuidance;
}
```

`id` 不手写，由 helper 生成：

```ts
export function defineAscetAction(
	contract: Omit<AscetActionContract, "id">,
): AscetActionContract {
	return {
		...contract,
		id: `${contract.tool}.${contract.action}`,
	};
}
```

helper 只负责生成 id 和开发期 invariant，不实现 DSL。

### 8.5 Guidance

把当前 descriptor prompt 和 `catalog.ts` action overrides 合并为一个可选字段：

```ts
export interface AscetActionGuidance {
	summary: string;
	compact?: string;
	intent?: string;
	result?: { shape: string; fields: readonly string[] };
	rules?: readonly string[];
	fewShots?: readonly AscetActionFewShot[];
	tags?: readonly string[];
	aliases?: readonly string[];
	useWhen?: readonly string[];
	avoidWhen?: readonly string[];
	nextActions?: readonly string[];
	hidden?: boolean;
}
```

不再单独维护 `actionOverrides`。

## 9. Contract examples

### 9.1 Search

```ts
const searchResultSchema = Type.Union([
	Type.Object(
		{
			count: Type.Integer({ minimum: 0 }),
			items: Type.Array(Type.Unknown()),
			more: Type.Optional(Type.Literal(true)),
		},
		{ additionalProperties: false },
	),
	ascetPublicErrorResultSchema,
]);

export const ascetSearchAction = defineAscetAction({
	tool: "ascet_search",
	action: "search",
	selector: "action",
	visibility: "public",
	profiles: READ_PROFILES,
	parameters: Type.Object(
		{
			action: Type.Literal("search"),
			mode: Type.String({ enum: [...ascetSearchModes] }),
			q: Type.String({ minLength: 1, maxLength: 512 }),
			limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100 })),
		},
		{ additionalProperties: false },
	),
	result: searchResultSchema,
	execution: { kind: "native-search" },
	guidance: {
		summary: "Run one live native ASCET Search query for candidate discovery.",
	},
});
```

Runtime details：

```ts
{
	tool: "ascet_search",
	action: "search",
	mode: params.mode,
}
```

禁止继续使用：

```ts
action: params.mode
```

### 9.2 Get tree

```ts
export const ascetGetTreeAction = defineAscetAction({
	tool: "ascet_get",
	action: "tree",
	selector: "action",
	visibility: "public",
	profiles: READ_PROFILES,
	parameters: Type.Object(
		{
			action: Type.Literal("tree"),
			path: Type.Optional(Type.String({ minLength: 1 })),
			depth: Type.Optional(Type.Integer({ minimum: 1, maximum: 5 })),
		},
		{ additionalProperties: false },
	),
	result: ascetItemsResultSchema,
	execution: {
		kind: "bridge",
		logicalCommandId: "AscetGetTree",
		operation: "get_tree",
	},
	guidance: {
		summary: "Read a bounded ASCET hierarchy from an exact path.",
	},
});
```

### 9.3 Create dependent chain

```ts
export const ascetCreateDependentChainAction = defineAscetAction({
	tool: "ascet_edit",
	action: "create_dependent_chain",
	selector: "action",
	visibility: "public",
	profiles: WRITE_PROFILES,
	parameters: ascetCreateDependentChainActionSchema,
	result: ascetDependentChainWriteResultSchema,
	execution: {
		kind: "bridge",
		logicalCommandId: "AscetCreateDependentChain",
		operation: "configure_parameter_dependency_chain_execute",
	},
	guidance: {
		summary: "Create or verify one complete parameter dependency chain.",
	},
});
```

Backend alias 必须补充：

```ts
export const ascetBackendCommandAliases = {
	AscetReadCode: "AscetReadTextCode",
	AscetCreateDependentChain: "AscetConfigureParameterDependencyChainExecute",
} as const;
```

## 10. Parameter schema derivation

每个 tool 的公共参数 schema 从 Contract 组合。

```ts
export function createAscetToolParameters<T>(toolName: string) {
	const schemas = listAscetActionContractsForTool(toolName)
		.filter((contract) => contract.visibility === "public")
		.map((contract) => contract.parameters);

	return schemas.length === 1
		? openAiObjectSchema<T>(schemas[0])
		: openAiObjectUnionSchema<T>(schemas);
}
```

现有 schema 文件变为薄适配层：

```ts
export type AscetGetParams = AscetGetTreeParams | AscetGetFormulasParams;

export const ascetGetParameters =
	createAscetToolParameters<AscetGetParams>("ascet_get");
```

禁止：

- 在 schema 文件中重新列 action 名称。
- 从 mutation schema union 中先加入再 filter 掉内部 action。
- 为内部 operation 创建 public schema branch。

`set_element_dependency` 应从公共 action schema 的生成输入中彻底消失，而不是继续使用 `filter()` 隐藏。

## 11. Route derivation

`route-manifests.ts` 不再保存手工数组，只保留派生和兼容 export：

```ts
export const ascetRouteEntries = listAscetActionContracts()
	.filter(isBridgeActionContract)
	.flatMap(toAscetRouteEntries);
```

规则：

1. 只为 Contract 中的 Bridge action 生成 Agent route。
2. `visibility="internal"` 只有明确存在内部 Tool caller 时才生成 internal route。
3. C# operation 存在不代表必须生成 Agent route。
4. `backendCommandId` 统一通过 `resolveAscetBackendCommandId()` 生成。
5. `(tool, action, when)` 必须唯一。

`routeAscetAction()` 改为查询 Contract registry 或派生 route entries，不再包含 `ascet_diff` 硬编码分支。

## 12. Descriptor and catalog derivation

### 12.1 Descriptor compatibility

短期可保留 `AscetActionDescriptor` 类型和以下 API：

```ts
getActionDescriptor()
listActionDescriptors()
```

实现必须从 Contract 映射：

```ts
export function listActionDescriptors(): AscetActionDescriptor[] {
	return listAscetActionContracts().map(toActionDescriptor);
}
```

迁移期禁止 Contract 和 descriptor 两边同时写 action 数据。

### 12.2 Catalog

`catalog.ts` 直接使用：

```text
contract.parameters
contract.result
contract.guidance
contract.profiles
contract.visibility
```

删除：

```text
actionParameterSchemas
schemaVariantsForAction() 的 action 推断用途
actionOverrides 中的 action-specific result
inferResult()
根据 tool 名称猜测 result shape
```

Catalog 的 `shape` 和 `fields` 如仍被 capabilities UI 使用，应从 `contract.result` 计算，不再手写。

### 12.3 Prompt and examples

以下模块改为查询 Contract：

```text
tools/instructions/registry.ts
tools/_shared/action-examples.ts
tools/prompt.ts
tools/capabilities.ts
```

Prompt 文本仍可以使用现有 formatter，但数据来源只能是 Contract guidance。

## 13. Tool registration

`tools/registry.ts` 继续注册 tool implementation object，不从 action 数量创建 tool implementation。

删除并行手写名称数组：

```ts
export const canonicalAscetToolNames =
	canonicalAscetTools.map((tool) => tool.name);

export const allAscetToolNames =
	allAscetTools.map((tool) => tool.name);
```

保留确定性的 implementation 注册顺序。

Contract integrity test 验证每个 public contract 的 `tool` 都存在于 `allAscetTools`。

## 14. Edit runtime contract migration

当前 `src/edit/contract.ts` 同时包含：

```text
Agent action identity
logical command
Bridge operation
permission
executor
schemaKey
promptKey
profiles
```

迁移后：

- Agent identity、route、schema、profiles 和 prompt 移入全局 Action Contract。
- edit runtime 只保留 executor 和 permission implementation mapping。

建议重命名：

```text
src/edit/contract.ts
    -> src/edit/runtime-actions.ts
```

目标结构：

```ts
export interface AscetEditRuntimeAction {
	contractId: string;
	executor: string;
	permission?: AscetEditPermissionDescriptor;
}
```

内部 backend action 可以存在于 runtime mapping：

```text
set_element_dependency
```

但它不能使用 `ascet_edit.set_element_dependency` public contract id。建议使用明确内部 id：

```text
internal.set_element_dependency
```

如果内部调用可以直接使用 operation constant，则不需要为它建立 runtime action entry。

删除无实际用途的：

```text
schemaKey
promptKey
profileNames
logicalCommandId
operation
```

## 15. Result contract

### 15.1 Boundary

Contract 的 `result` 只描述 Agent-visible JSON content，不描述 `details`。

```text
content = stable Agent API
details = diagnostics and runtime telemetry
```

不得把 CLI request、exit code、database fingerprint、queue wait 或临时路径加入 public result schema。

### 15.2 Shared result schemas

`shared-results.ts` 只定义可复用结构：

```text
public error
items result
search result
code result
diff result
preflight/write result
dependent-chain read/write result
```

它不包含 action 到 result 的映射；映射只存在于 action contract entry。

### 15.3 Validation

不新增复杂 runtime response framework。

第一阶段使用测试验证：

1. 每个 public action 必须有 result schema。
2. 现有 normalizer/formatter 的成功、失败和 empty 样例必须通过 schema。
3. Catalog fingerprint 直接基于 result schema。

对于新 action，要求 executor 单元测试直接执行：

```ts
assert.equal(Value.Check(contract.result, output), true);
```

后续如需要统一 runtime assertion，可以增加一个小型 helper，但不作为本任务前置条件。

## 16. Bridge alignment

### 16.1 TypeScript verification

新增测试读取 source CLI catalog：

```text
ascetcli/contracts/cli-catalog.json
```

对每个 Bridge contract：

1. 解析 logical command 的 backend alias。
2. 找到对应 command id。
3. 验证 command execution operation 与 Contract operation 相同。
4. 验证 operation 非空。
5. 验证 packaged catalog 中存在同一 command/operation。

### 16.2 C# verification

保留 `OperationRegistry` 和现有 smoke test。

C# 测试继续负责：

```text
catalog operation is registered
operation has handler
lane/session/visibility policy is valid
bridge registry covers live operations
```

不要让 TypeScript Contract 复制 lane、handler kind 或 host policy。

### 16.3 Internal operations

以下情况合法：

```text
Bridge operation exists, Agent Contract does not exist
```

例如：

```text
set_element_dependency
get_database_identity
get_database_catalog
read_block_diagram_raw
guarded_mutation
```

以下情况非法：

```text
public Agent Bridge Contract references missing operation
public Agent route has no Contract
Contract command operation differs from CLI catalog
```

## 17. Canonical action cleanup

### 17.1 Search

最终 identity：

```text
ascet_search.search
```

最终请求：

```json
{
  "action": "search",
  "mode": "element",
  "q": "P_Threshold",
  "limit": 20
}
```

修改：

```text
src/search.ts
src/tools/search/definition.ts
src/tools/actions/contracts/search.ts
Search tests
prompt examples
catalog snapshot
```

### 17.2 Get

Contract 中只允许：

```text
ascet_get.tree
ascet_get.formulas
```

从 Agent routes 删除：

```text
ascet_get.database_identity
ascet_get.database_catalog
ascet_get.elements
ascet_get.component_refs
ascet_get.bde_edges
ascet_get.import_binding
ascet_get.dbitem_refs
```

不要删除仍被内部 runtime 使用的 Bridge implementation。

### 17.3 Dependency chain

Contract 中只允许：

```text
ascet_read.read_dependent_chain
ascet_edit.create_dependent_chain
```

删除 Agent route：

```text
configure_parameter_dependency_chain.execute
ascet_edit.set_element_dependency
```

补充 command alias：

```text
AscetCreateDependentChain
    -> AscetConfigureParameterDependencyChainExecute
```

### 17.4 Diff

把 `router.ts` 中 object-kind 特例迁入 `ascet_diff.diff` Contract variants。

### 17.5 Editability

现有调用继续接受：

```json
{"mode":"check", ...}
{"mode":"set", ...}
```

Contract identity 保持：

```text
ascet_edit.check
ascet_edit.set
```

`selector="mode"` 明确记录兼容 discriminator。不要在本任务中修改 public editability schema。

## 18. Implementation tasks

### Task 1: Add contract primitives

新增：

```text
src/tools/actions/contracts/types.ts
src/tools/actions/contracts/shared-results.ts
src/tools/actions/contract-registry.ts
```

实现：

```text
defineAscetAction()
listAscetActionContracts()
listAscetActionContractsForTool()
getAscetActionContract()
resolveAscetActionContract()
```

Invariant：

```text
unique id
unique tool/action
selector matches schema discriminator
public action has parameter and result schema
bridge action has logicalCommandId and operation
```

### Task 2: Add integrity tests before migration

新增：

```text
src/tools/actions/contracts.test.ts
src/routing/contract-routes.test.ts
src/tools/actions/bridge-contract.test.ts
```

初始测试可以明确记录当前已知差异，迁移完成后改为严格集合相等。不要使用 snapshot 掩盖差异。

### Task 3: Migrate Search

1. 新增 `ascet_search.search` contract。
2. schema 增加固定 `action="search"`。
3. tool details 使用 `action="search"` 和单独的 `mode`。
4. descriptor/catalog/prompt 从 Contract 派生。
5. 更新 Search tests 和 final spec references。

### Task 4: Migrate Get

1. 建立 tree/formulas contracts。
2. 从 contracts 生成 `ascetGetParameters`。
3. 从 route manifest 删除旧 public Get routes。
4. 确认内部 Get callers直接调用 service/operation，不依赖 Agent route。
5. 保留 Bridge operations 和 C# registration。

### Task 5: Migrate dependency chain

1. 建立 read/create contracts。
2. 删除 standalone configure Agent route。
3. 删除 `ascet_edit.set_element_dependency` Agent route。
4. 将内部 set dependency 保留在 service/Bridge 层。
5. 增加 `AscetCreateDependentChain` backend alias。
6. 验证 command id 和 operation。

### Task 6: Migrate Read and Diff

1. 将 read action schemas、routes、result schemas 和 guidance 移入 contracts。
2. 将 diff action schemas 和 routes 移入 contracts。
3. 将 objectKind route variants 移出 router hardcode。
4. 保持 executor 业务实现不变。

### Task 7: Migrate Edit

1. 将 public edit action schemas 和 Agent metadata 移入 contracts。
2. 将 `ascetMutationActionSchemas` 从 `edit/service.ts` 移入纯 Contract/schema 模块，service 只导入类型和 contract 查询函数。
3. 将 `edit/contract.ts` 缩减为 runtime executor/permission mapping。
4. 删除 public schema filtering。
5. 确认 hidden/internal mutation helpers不进入 public contract registry。
6. 保持 guarded mutation、approval、editability 和 readback流程不变。

### Task 8: Migrate Ops and hidden batch actions

迁移：

```text
```

单 action tool 可使用 `selector="fixed"`，避免无价值的 public schema 变更。

Hidden batch action 保持 hidden，不进入 public prompt/catalog，但仍参与完整 Contract integrity 校验。

### Task 9: Derive catalog, prompts, routes, and names

修改：

```text
tools/actions/catalog.ts
tools/actions/descriptors.ts
tools/instructions/registry.ts
tools/_shared/action-examples.ts
routing/route-manifests.ts
routing/router.ts
tools/registry.ts
```

删除所有手写 action mapping。

### Task 10: Remove obsolete sources

迁移完成后删除或清空：

```text
descriptors.ts 中的手写 catalog
actionOverrides
route-manifests.ts 中的手写数组
edit/schema.ts 中的 set_element_dependency filter
edit/contract.ts 中的 Agent metadata
router.ts 中的 diff hardcode
registry.ts 中的手写 tool name arrays
```

不要为了降低单次 diff 而长期保留双写。

## 19. Test matrix

### 19.1 Contract integrity

- Contract id 等于 `${tool}.${action}`。
- id 唯一。
- `(tool, action)` 唯一。
- selector 与 schema discriminator 一致。
- public contract 有 result schema。
- guidance few-shot action 与 Contract action 一致。
- `deprecatedBy` 指向存在的 contract。

### 19.2 Schema equality

双向验证：

```text
public Contract actions == public schema variants
```

必须同时发现：

```text
Contract missing from schema
schema action missing from Contract
```

Search 单独验证：

```text
action=search
mode is not action
```

### 19.3 Route equality

双向验证：

```text
public Bridge Contract routes == public route entries
```

必须拒绝：

```text
stale route
missing route
duplicate route
route operation mismatch
```

### 19.4 Bridge catalog

- logical command 可以解析到 backend command。
- backend command 存在于 source catalog。
- bundled catalog 与 source catalog 一致。
- catalog operation 等于 Contract operation。
- C# OperationRegistry 注册 operation。

### 19.5 Result contract

每个 action 至少覆盖：

```text
success
empty success where applicable
public failure
truncated/more where applicable
```

实际 normalized content 必须通过 `Value.Check(contract.result, value)`。

### 19.6 Regression cases

必须包含：

```text
ascet_get only tree/formulas
ascet_search.search exists
ascet_search.* does not exist
ascet_edit.set_element_dependency is not public
configure_parameter_dependency_chain.execute is not public
ascet_edit.create_dependent_chain maps to configure_parameter_dependency_chain_execute
ascet_diff.diff objectKind routes remain correct
editability mode=check/set remains valid
```

## 20. Targeted test commands

从 `packages/ascet-extension` 执行规范定向测试：

```powershell
node --import tsx --test src/tools/actions/contracts.test.ts src/routing/contract-routes.test.ts src/tools/actions/bridge-contract.test.ts src/tools/actions/catalog.test.ts src/routing/router.test.ts src/tools/search/definition.test.ts src/tools/get/definition.test.ts src/tools/edit/schema.test.ts src/create-dependent-chain.test.ts src/edit/contract.test.ts
```

从 `packages/coding-agent` 执行 prompt/few-shot 和 guarded-write 回归：

```powershell
node node_modules/vitest/dist/cli.js --run test/ascet-extension-action-fewshots.test.ts
node node_modules/vitest/dist/cli.js --run test/ascet-extension-write-tools.test.ts --testTimeout=60000
```

修改代码后从仓库根目录执行：

```powershell
npm run check
```

不要运行：

```text
npm run build
npm test
完整 vitest suite
```

除非用户明确要求。

## 21. Migration safety

### 21.1 No compatibility layer

不为以下旧 Agent names保留 alias：

```text
ascet_search.*
configure_parameter_dependency_chain.execute
ascet_edit.set_element_dependency
retired ascet_get actions
```

内部 operation 保留不等于 public compatibility。

### 21.2 No behavior rewrite

迁移 Contract 时，executor 业务逻辑保持不变。每一阶段只改变：

```text
metadata source
schema composition
route lookup
catalog/prompt source
```

Search action 字段是明确的公共 schema 变更，应在同一阶段更新所有调用测试和 prompt examples。

### 21.3 Small commits or review units

建议按以下 review unit 分组：

1. Contract primitives and integrity tests.
2. Search/Get migration and stale-route cleanup.
3. Dependency-chain naming cleanup.
4. Read/Diff migration.
5. Edit migration.
6. Ops/batch migration and old-source deletion.

本任务不要求提交；只有用户明确要求时才 commit。

## 22. Performance requirements

Contract registry 在模块初始化时构建两个 Map：

```text
id -> contract
tool -> contracts
```

Route lookup 使用：

```text
tool/action -> contract
```

禁止每次 tool call：

```text
读取 JSON catalog
扫描 C# 文件
重新计算 schema fingerprints
重新构建 prompt catalog
```

CLI catalog 只在测试、capabilities 初始化或既有受控加载路径中读取。

典型 action lookup 必须是 O(1)。同一 tool 的 schema union 在模块初始化时创建一次。

## 23. Completion criteria

任务完成必须同时满足：

1. 所有 Agent-facing actions 都存在于统一 Contract registry。
2. schema、descriptor、route、catalog 和 prompt 不再维护独立 action 清单。
3. `ascet_search` 使用 `action="search"`，`mode` 仅表示查询模式。
4. `ascet_get` public contract 和 routes 只有 tree/formulas。
5. `set_element_dependency` 只作为内部 Bridge/runtime operation。
6. Dependency chain 只有 `ascet_edit.create_dependent_chain` Agent write action。
7. `AscetCreateDependentChain` 正确解析到实际 backend command。
8. Diff conditional routing 从 Contract 派生。
9. 每个 public action 有实际 result schema。
10. Contract/schema/routes 使用双向集合一致性测试。
11. 每个 Bridge action 通过 CLI catalog 和 OperationRegistry 验证。
12. 旧手写 descriptor catalog、route array、schema filter 和 action overrides 已删除。
13. Targeted tests 全部通过。
14. `npm run check` 无 error、warning 或 info。
15. 未引入代码生成、IDL、新 CLI command 或新运行时框架。

验收结果：

```text
1-2: Contract registry、tool schema、descriptor、route、catalog、prompt 通过双向集合测试
3-8: Search/Get/Dependency/Diff 命名与路由回归通过
9: 每个 Contract 都包含 result schema，工具执行后统一执行 Value.Check
10: contracts.test.ts 验证 Contract/schema/routes 双向集合
11: bridge-contract.test.ts 验证 CLI catalog 与 OperationRegistry
12: legacy actionOverrides、schema lookup、descriptor/route arrays 和 schema filter 搜索结果为空
13: 规范定向测试及 coding-agent 回归通过
14: npm run check 通过
15: 未新增生成器、IDL、CLI command 或运行时框架
```


## 24. Final architecture

```text
Agent call
    -> Tool parameter schema derived from Action Contract
    -> Contract lookup by tool/action
    -> existing executor/service
    -> native Search, local runtime, or Bridge operation
    -> existing normalizer
    -> Agent content validated against Contract result schema

Action Contract
    -> public schema
    -> descriptors/catalog
    -> prompts/capabilities
    -> route entries
    -> result documentation

Bridge OperationRegistry
    -> implementation and execution policy

Automated checks
    -> Contract route references CLI catalog command
    -> CLI catalog operation exists in OperationRegistry
```

最终原则：

> Agent API 只由 Action Contract 定义；Bridge API 只由 OperationRegistry 实现；两者通过 operation reference 和自动一致性测试连接，而不是通过多份手工清单同步。


