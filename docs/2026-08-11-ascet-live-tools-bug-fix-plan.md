# ASCET Copilot Live Tools Bug 根本修复方案

## 1. 文档信息

| 项目 | 内容 |
|---|---|
| 文档名称 | ASCET Copilot Live Tools Bug Root Fix Plan |
| 创建日期 | 2026-08-11 |
| 适用测试 run | `20260810_1342_019FEB` |
| 关联测试方案 | `C:\Repo\11_ASCETCopilotLiveTest\ASCET_Tools_Complete_Test_Plan.md` |
| 关联 Bug Report | `C:\Repo\11_ASCETCopilotLiveTest\output\live-tools\20260810_1342_019FEB\ASCET_Tools_Bug_Report.md` |
| 方案状态 | FIXED：代码、non-live、read-only Live、isolated write/readback/diff/cleanup 和外部报告全部闭环 |
| 修复目标 | 消除 Bug-001、Bug-002、Bug-003、Bug-004、Bug-006 的根因，建立可持续的 public contract、scope、object-kind 和 evidence 闭环 |

---

## 1.1 本轮执行边界

本文件同时承担两种用途：

1. **根因修复设计**：定义 public contract、scope、object-kind、plan/commit 和 evidence 的长期边界。
2. **实施验收记录**：记录已经落地的代码、测试证据以及仍然不能宣称完成的 live 验证。

状态定义：

```text
IMPLEMENTED  = 代码和 focused/contract test 已通过，但不代表 live 已关闭
LIVE-READY   = 非 live 检查通过，具备进入隔离 live 验证条件
LIVE-PENDING = 尚未取得本轮 live 证据
FIXED        = 代码、测试、live 证据和外部报告全部闭环
```

本轮不能把 `IMPLEMENTED` 直接升级为 `FIXED`。尤其是 Database Tree、Enumeration readback 和任何写入类 action，必须取得对应 case 的独立证据。

## 1.2 已确认的第一性原理根因

| Bug | 直接根因 | 为什么会发生 | 根治方向 |
|---|---|---|---|
| Bug-001 | 根 Tree 请求默认 `depth=1`，且 observation 只把 folder 视为完整结果；没有显式 database scope 和 Project identity 证明 | “遍历成功”被错误等同于“数据库身份树完整” | 将 scope、identity、completeness、truncated 作为强制协议字段；database catalog 只能消费显式完整的 database-scope Tree |
| Bug-002 | capabilities/catalog 存在手写 schema override，且 nested `anyOf`/`oneOf` 没有完整展开 | 同一个 action 的 public schema、catalog、dispatcher 各自维护，天然会漂移 | 从 action contract 生成 schema、catalog、fingerprint；禁止 catalog 重写 required/enum/variant |
| Bug-003 | Enumeration 是独立 object kind，却被 `ascet_get.elements` 当成普通 Element Directory 目标 | 工具能力按“路径像不像组件”判断，而不是按 ASCET 对象模型判断 | 明确 Enumeration 能力边界；使用 `ascet_read.read_implementation` 返回 `typeDefinition.enumerators`，不得伪造未验证的 numeric value |
| Bug-004 | 没有可比较的 catalog snapshot、schema fingerprint 和 breaking-change 分类 | action 数量变化无法区分新增能力与破坏性变化 | 建立 snapshot/diff；required、enum、variant 删除必须阻断；新增 action 只标记 drift |
| Bug-006 | `set_element_dependency` 的 plan/commit strict schema 漏掉 `writeControlSchema`；公共 validator 又对所有 union 分支同时报错 | 合法的 `executeWrite` 在进入 Bridge 前被拒绝，错误信息来自无关 action 分支 | action discriminator 先选分支，再做 action-specific 校验；plan/commit 分支从同一 write-control 定义派生 |

## 2. 执行摘要

当前问题不能按单个错误码修复。系统目前至少存在五套相互独立的契约来源：

```text
TypeScript public schema
Action catalog schema override
Runtime dispatcher/semantic validation
C# CLI/backend contract
测试方案和 prompt 文档
```

这会产生以下结构性故障：

```text
Capabilities 暴露 Action，但 public tool 不能接受参数
public schema 接受参数，但 dispatcher 不能正确路由
Tree 显示 complete_for_scope，但不能证明是完整 Database
Enumeration 被当成普通 CodeComponent 处理
Action 数量发生变化，但无法判断是正常 drift 还是 breaking change
测试 artifact 的整体写入统计与 case 级写入证据不一致
```

本方案的根本目标是建立以下单向链路：

```text
领域对象模型 / 作用域模型
        ↓
public Action Contract Registry
        ↓
TypeBox runtime schema
        ↓
public tool schema
        ↓
capabilities catalog
        ↓
Action dispatcher
        ↓
backend adapter / ASCET Bridge
        ↓
automatic readback / independent diff
        ↓
case-level evidence / final report
```

任何一层都不能再自行复制 required 字段、enum、variant 或 object-kind 能力。

---

## 3. 当前证据和测试状态

### 3.1 原始 live run

```text
runId: 20260810_1342_019FEB
database: C:/Repo/F05_IPB_L2_0429
test date: 2026-08-10
```

已确认：

```text
runtime ready
scheduler healthy
root Tree returned stored and truncated=false
read-only and diff cases mostly executable
shared-object safety checks passed
```

### 3.2 写入证据必须分层记录

当前报告顶部记录：

```text
ASCET database writes: 0
```

但关联的：

```text
C:\Repo\11_ASCETCopilotLiveTest\output\live-tools\20260810_1342_019FEB\dependency-chain-pass.json
```

明确记录：

```text
W-012 status: PASS
writesPerformed: true
mutationStarted: true
automaticVerification: passed
cleanup: PASS
```

这不一定是数据矛盾，可能表示：

```text
整体测试汇总统计只覆盖主流程；
dependency-chain-pass.json 是之后单独执行的 case artifact；
```

但当前 artifact 没有 epoch、case scope 或 snapshot 语义，读者无法确认两者关系。

因此本方案把 Evidence 统计也列为修复范围：

```text
run summary
case-level write telemetry
database mutation ledger
cleanup ledger
```

必须区分记录，不能用一个全局布尔值覆盖所有阶段。

### 3.3 Bug 状态总览

| Bug | 问题 | 根因类别 | 优先级 | 当前状态 |
|---|---|---|---|---|
| Bug-001 | `database_catalog` 与 full Tree 前置条件无法闭合 | scope/identity contract | P1 | FIXED |
| Bug-002 | capabilities 与 public plan/commit schema 不一致 | schema source/catalog generation | P1 | FIXED |
| Bug-003 | Enumeration 不支持 `ascet_get.elements` | object-kind capability boundary | P2 | FIXED |
| Bug-004 | runtime catalog 与文档类别 drift | catalog versioning/compatibility | P2 | FIXED |
| Bug-006 | public `ascet_edit.set_element_dependency` 参数校验拒绝合法调用 | public schema dispatch | P1 | FIXED |

---

## 3.4 本轮已落地内容与证据边界

### 已落地代码

```text
P1 / Bug-006
- public set_element_dependency plan/commit 分支补齐 writeControlSchema
- public union validator 先按 action/phase 选择分支
- 错误只返回被选择 action 的字段错误

P1 / Bug-002
- 删除 set_element_dependency 的陈旧 catalog schema override
- 递归展开 nested anyOf/oneOf
- catalog 暴露 phase/mode/scope/objectKind discriminator
- 增加 action/schema/rules/result fingerprint
- 增加 catalog snapshot 与 breaking diff

P1 / Bug-001
- get tree 增加显式 scope=database
- database scope 禁止与 oid/path/target/budget 混用
- C# backend 对 database scope 执行不截断的数据库级采集
- coverage 增加 scopeKind/scopeId/completeness/truncated/identityKinds
- database_catalog 在缺失 Project identity 时快速失败

P2 / Bug-003
- public contract 明确 Enumeration 不是 ascet_get.elements 的 Element Directory 目标
- read_implementation 明确返回 typeDefinition.enumerators
- 不再根据未经验证的 API 猜测枚举 numeric value

Evidence
- write telemetry 增加 run/phase/case/attempt、bridgeEntered、mutationStarted、writesPerformed、cleanupRequired
- 聚合按 phase/case 保留 unknown outcome，不允许全局汇总覆盖单 case 事实
```

### 已取得的非 live 证据

```text
npx tsx --test packages/ascet-extension/src/tools/edit/schema.test.ts
npx tsx --test packages/ascet-extension/src/tools/edit/definition.test.ts
npx tsx --test packages/ascet-extension/src/tools/actions/catalog.test.ts packages/ascet-extension/src/tools/actions/search.test.ts
npx tsx --test packages/ascet-extension/src/get.test.ts packages/ascet-extension/src/database-catalog/tree-source.test.ts packages/ascet-extension/src/database-catalog/catalog-service.test.ts
npx tsx --test packages/ascet-extension/src/tools/read/definition.test.ts
npx tsx --test packages/ascet-extension/src/edit/write-telemetry.test.ts
& 'ascetcli/scripts/test-ascet-bridge.ps1'
npm run check
```

上述证据证明契约层、TypeScript runtime validation、C# non-live contract 和仓库静态检查通过；它们**不能**证明真实 ASCET database 已经取得 Project identity，也不能证明 live write/readback/cleanup 已通过。

### 尚未关闭的验证项

```text
LIVE-PENDING: database-scope Tree 的真实 ASCET 结果必须包含 Project identity
LIVE-PENDING: database_catalog 必须消费该 Tree 成功完成
LIVE-PENDING: 已知 Enumeration 的 read_implementation 必须在 live Bridge 返回 enumerators
LIVE-PENDING: isolated fixture 上的 write/readback/diff/cleanup 必须逐 case 记录
LIVE-PENDING: 外部 Complete Test Plan 和 Bug Report 必须以本轮 artifact 更新
```

在这些证据产生前，Bug 状态只能写成 `IMPLEMENTED` 或 `LIVE-PENDING`，不能写成 `FIXED`。

## 4. 根本设计原则

### 4.1 作用域必须显式

`complete_for_scope` 只能说明“在某个 scope 内完整”，不能说明 scope 是什么。

目标 coverage 结构：

```ts
interface AscetObservationCoverage {
  status: "complete_for_scope" | "partial" | "failed";
  scopeKind: "database" | "project" | "folder" | "component";
  scopeId: string;
  completeness: "complete" | "partial" | "failed";
  truncated: boolean;
  identityKinds?: readonly string[];
}
```

`database_catalog` 的 full catalog 输入必须满足：

```text
coverage.scopeKind == database
coverage.completeness == complete
coverage.truncated == false
Project identity 存在
Database identity 与当前 live database 一致
```

### 4.2 Public schema 只有一个 source of truth

公共 schema 必须从一个 registry 派生：

```text
ActionContractRegistry
  -> TypeBox schema
  -> public tool parameters
  -> capabilities catalog
  -> prompt schema hints
  -> schema fingerprint
```

禁止：

```text
catalog.ts 重新手写 required/optional
文档手写 action enum
CLI contract 直接作为 public schema
```

### 4.3 先 discriminator，再 action-specific validation

不得直接对整个大 `anyOf` union 输出聚合错误。

正确流程：

```text
识别 action/mode
  -> 选择 Action variant
  -> 校验该 variant
  -> 运行语义校验
  -> 进入 preflight/backend
```

失败时必须指出：

```text
action
variant
field
keyword
expected
actual
```

### 4.4 Plan 是不可变意图，Commit 只执行 Plan

```text
phase=plan
  只读 preflight
  不修改数据库
  生成不可变 plan

phase=commit
  只接受 planId
  校验 plan identity/fingerprint/expiry
  用户确认
  执行已保存 plan
  automatic readback
```

Commit 不能重新接受并重新解释完整写入参数。

### 4.5 能力按 object kind 声明

每个 Action 必须声明：

```text
supportedObjectKinds
resultShape
read/write risk
scope requirements
```

工具不得通过名称暗示超出实际能力的范围。

### 4.6 Evidence 必须按 case 和时间阶段记录

所有 live run 必须至少有：

```text
runId
phaseId
caseId
attemptId
runtime snapshot
arguments
raw response
mutationStarted
bridgeEntered
write outcome
readback outcome
cleanup outcome
```

全局总结只能由 case ledger 聚合生成。

---

## 5. 目标架构

## 5.1 Public Action Contract Registry

建议新增：

```text
packages/ascet-extension/src/tools/actions/contracts.ts
packages/ascet-extension/src/tools/actions/contracts.test.ts
```

目标接口：

```ts
interface AscetActionContract {
  id: string;
  tool: string;
  action: string;
  visibility: "public" | "internal" | "hidden";
  variants: readonly AscetActionVariant[];
  supportedObjectKinds: readonly AscetObjectKind[];
  scope: readonly AscetScopeKind[];
  risk: "read" | "diff" | "write" | "ops";
  resultShape: string;
  prompt: {
    summary: string;
    rules: readonly string[];
    fewShots: readonly Record<string, unknown>[];
  };
}
```

Variant：

```ts
interface AscetActionVariant {
  name: string;
  discriminator: Readonly<Record<string, readonly string[]>>;
  schema: TSchema;
  required: readonly string[];
  optional: readonly string[];
}
```

例如：

```text
set_element_dependency
  plan variant
  commit variant

apply_element_spec
  create variant
  patch variant
  upsert variant
  restore variant
  commit variant
```

### 5.1.1 生成关系

```text
contracts.ts
  -> ascetEditParameters
  -> ascetGetParameters
  -> ascetReadParameters
  -> capabilities catalog
  -> action guard
  -> dispatcher lookup
```

`catalog.ts` 只负责展示和索引，不再维护独立 schema 字段。

### 5.1.2 Nested union 展开

必须实现：

```text
flattenSchemaVariants(schema)
```

支持：

```text
anyOf
oneOf
nested anyOf
```

`apply_element_spec` 的 plan union 不能被当成一个未命名节点，否则 catalog 可能只暴露 commit 分支。

---

## 5.2 Public Tool 参数校验

建议新增：

```text
packages/ascet-extension/src/tools/_shared/action-validation.ts
packages/ascet-extension/src/tools/_shared/action-validation.test.ts
```

算法：

```text
validatePublicToolParams(tool, params)
  1. params 必须是 object
  2. 读取 discriminator
  3. lookup contract/tool/action
  4. 根据 phase/mode 选择 variant
  5. 只运行 selected variant 的 Value.Check
  6. 将 Value.Errors 转换为 action-specific diagnostics
```

Bug-006 的目标错误：

```json
{
  "code": "ascet_edit_invalid_parameter",
  "action": "set_element_dependency",
  "variant": "plan",
  "field": "executeWrite",
  "keyword": "additionalProperties",
  "message": "executeWrite is not valid for the selected public variant."
}
```

如果最终 contract 允许 `executeWrite`，则该字段必须通过；如果最终 contract 移除该字段，则 capabilities 也必须同步移除，不能一边暴露一边拒绝。

---

## 5.3 Plan/Commit 状态机

当前实现已经有 `AscetPlanStore`，但需要把它提升为明确的 public protocol。

### Plan record 最低字段

```json
{
  "planId": "...",
  "operation": "set_element_dependency",
  "params": {},
  "backendPreflight": {},
  "binding": {
    "databaseIdentity": "...",
    "sessionId": "...",
    "agentId": "..."
  },
  "targetIdentity": {
    "path": "...",
    "oid": "...",
    "kind": "class"
  },
  "evidenceFingerprint": "sha256:...",
  "contractFingerprint": "sha256:...",
  "createdAt": "...",
  "expiresAt": "...",
  "consumedAt": null
}
```

### Commit 校验顺序

```text
1. planId 格式
2. plan 文件存在
3. plan 未过期
4. plan 未消费
5. operation 与当前 action 一致
6. public contract fingerprint 一致
7. database identity 一致
8. target OID/path/kind 一致
9. backend preflight 仍有效
10. 用户确认
11. consume plan
12. 进入 Bridge
13. automatic readback
14. 写入 ledger
```

任一步失败都不得设置：

```text
mutationStarted=true
```

### executeWrite 处理策略

分两步执行：

#### R0：兼容性修复

在所有 public plan-managed variant 中显式加入公共写入字段，确保 capabilities 与 validator 一致：

```text
...writeControlSchema
```

覆盖：

```text
set_element_dependency plan
set_element_dependency commit
apply_element_spec plan variants
apply_element_spec commit
```

增加 schema regression test。

#### R1：最终契约清理

重新决定 plan-managed Action 是否需要 `executeWrite`。

推荐最终规则：

```text
普通 Action：executeWrite + 用户确认
Plan-managed Action：phase=plan/commit + 用户确认
```

如果采用该规则，必须同步删除：

```text
plan-managed public schema 中的 executeWrite
catalog 中的 executeWrite
writePreflightRules 对 plan-managed Action 的描述
相关 fewShots 和测试
```

不能只删除 schema 或只删除文档，必须一次性同步整个 registry。

在 R1 完成前，R0 的 `executeWrite` 只能作为兼容字段，不能改变 plan/commit 的状态机语义。

---

## 6. Bug-001 修复方案：Database Scope 和 Identity

### 6.1 现状

当前 `database_catalog` 通过 Tree observation 获取：

```text
projects
modules
enumerations
classes
```

但 Tree 的 root traversal 不保证 Project identity 出现。当前 `tree-source.ts` 也通过 bounded target、coverage 和 truncated 进行间接 full-tree 判断。

### 6.2 目标协议

扩展 `ascet_get.tree`：

```json
{
  "action": "tree",
  "scope": {
    "kind": "database"
  },
  "traversal": {
    "depth": "all"
  },
  "delivery": "stored"
}
```

如果暂时不能修改 public request，至少在 observation metadata 中增加：

```text
coverage.scopeKind
coverage.scopeId
coverage.completeness
coverage.identityKinds
```

### 6.3 Backend identity collector

建议在：

```text
ascetcli/src/AscetCopilot/Services/Get/AscetGetService.cs
```

中拆出：

```text
CollectDatabaseIdentities
CollectProjectIdentities
CollectFolderIdentities
CollectComponentIdentities
CollectEnumerationIdentities
```

Tree display traversal 和 database identity traversal 不应共享“恰好能遍历到什么”的隐式行为。

### 6.4 database_catalog 校验

在：

```text
packages/ascet-extension/src/database-catalog/tree-source.ts
packages/ascet-extension/src/database-catalog/catalog-service.ts
```

中统一校验：

```text
source domain == tree
scopeKind == database
completeness == complete
truncated == false
source database identity == current database identity
```

缺失 Project 时返回：

```text
project_identity_required
```

不要继续返回泛化的：

```text
catalog_live_scan_failed
```

### 6.5 不允许的修复

禁止：

```text
允许 bounded Tree 直接进入 full database catalog
把空 target 当作 database scope
只增加 Project identity 的 fallback 字段但不改变 coverage
吞掉 Project 缺失错误并生成 partial catalog
```

### 6.6 验收

```text
database-scope Tree 必须包含 Project identity
bounded Tree 必须被明确拒绝
truncated Tree 必须被拒绝
database_catalog 必须记录 database scope
Parameter Class scan 不得再因 root Tree 缺失 Project 而死锁
```

---

## 7. Bug-002 修复方案：Capabilities 与 Public Contract

### 7.1 现状

public edit service 和 element contract 已经包含部分 plan/commit 实现，但 catalog 存在：

```text
nested union 未递归展开
set_element_dependency schema override 过期
public schema 与 capabilities 不是同一生成源
```

### 7.2 目标

对每个 Action 输出：

```json
{
  "id": "ascet_edit.set_element_dependency",
  "schema": {
    "required": [],
    "optional": [],
    "variants": []
  },
  "schemaFingerprint": "sha256:...",
  "contractVersion": "..."
}
```

### 7.3 代码范围

```text
packages/ascet-extension/src/tools/actions/catalog.ts
packages/ascet-extension/src/tools/actions/catalog.test.ts
packages/ascet-extension/src/edit/service.ts
packages/ascet-extension/src/element-spec-contract.ts
packages/ascet-extension/src/tools/edit/schema.ts
packages/ascet-extension/src/edit/contract.ts
```

### 7.4 规则

`catalog.ts` 不得手写 Action required/optional 字段。允许保留：

```text
intent
useWhen
avoidWhen
aliases
nextActions
result metadata
```

schema 字段必须从 registry 生成。

### 7.5 Contract tests

必须覆盖：

```text
apply_element_spec plan/create
apply_element_spec plan/patch
apply_element_spec plan/upsert
apply_element_spec plan/restore
apply_element_spec commit
set_element_dependency plan
set_element_dependency commit
executeWrite 与 schema 一致性
catalog variant 与 TypeBox variant 一致性
```

---

## 8. Bug-003 修复方案：Enumeration Object-kind Boundary

### 8.1 现状

`ascet_get.elements` 当前通过 `ResolveComponents()`，只接受：

```text
CodeComponent
Folder
```

Enumeration 是独立对象，不能直接当普通 Component。

### 8.2 目标对象模型

新增统一解析结构：

```ts
interface ResolvedAscetTarget {
  kind: "folder" | "class" | "module" | "statemachine" | "enumeration" | "project";
  path: string;
  oid: string;
  nativeObject: unknown;
}
```

每个 Action 使用 capability matrix 声明支持范围。

### 8.3 推荐 API

当前已验证的公共 readback 路径是：

```text
ascet_read.read_implementation
```

`ascet_get.elements` 不承担 Enumeration 的实现内容读取。`read_implementation` 应返回：

```json
{
  "kind": "enumeration",
  "path": "...",
  "typeDefinition": {
    "enumerators": ["E_OFF", "E_ON"]
  }
}
```

当前 ToolAPI 已确认 `AscetEnumeration.GetEnumerators()` 只提供 `string[]`。因此本方案只验收 enumerator 名称和顺序；没有经过 ToolAPI 证据支持时，不得伪造 numeric value。

### 8.4 代码范围

```text
ascetcli/src/AscetCopilot/Services/Get/AscetGetService.cs
ascetcli/src/AscetCopilot/Services/Read/*
ascetcli/src/AscetCli/Commands/ExecCommand.cs
ascetcli/src/AscetCli/Routing/OperationRegistry.cs
packages/ascet-extension/src/tools/read/schema.ts
packages/ascet-extension/src/tools/read/definition.ts
packages/ascet-extension/src/tools/actions/descriptors.ts
packages/ascet-extension/src/tools/actions/catalog.ts
```

### 8.5 测试调整

```text
R-003 = Enumeration summary + enumerator content
W-008 = set_enumerators + independent enumeration readback + diff
```

不能把：

```text
ascet_read.read_implementation 成功
```

直接等同于：

```text
enumerator name/order readback 成功
```

### 8.6 验收

```text
Enumeration 能被 tree 识别
Enumeration 能通过 `read_implementation` 读到完整 enumerator name/order
ascet_get.elements 对 Enumeration 返回明确能力边界
set_enumerators 自动 readback 与独立 readback 一致
```

---

## 9. Bug-004 修复方案：Catalog Drift 与 Breaking Change

### 9.1 现状

当前只记录：

```text
action count = 45
```

该数字不能作为 API 正确性的判断依据。

### 9.2 Snapshot 结构

新增：

```text
catalog-snapshot.json
```

每个 Action 至少保存：

```json
{
  "id": "ascet_edit.set_element_dependency",
  "visibility": "public",
  "supportedObjectKinds": ["class", "module", "folder"],
  "schema": {},
  "schemaFingerprint": "sha256:...",
  "rulesFingerprint": "sha256:...",
  "resultFingerprint": "sha256:..."
}
```

### 9.3 变化分类

```text
catalogDrift
  action 新增、删除、描述或非破坏性字段变化

breakingSchemaChange
  required 字段新增
  enum 值删除
  variant 删除
  object-kind 范围缩小
  result shape 改变

testFailure
  具体测试断言失败

blocked
  环境、授权、fixture 或前置契约不满足
```

### 9.4 验收

```text
相同代码生成稳定 fingerprint
新增 Action 不因数量变化直接失败
required 字段新增触发 breaking warning
plan/commit variant 消失触发 breaking warning
报告输出 action 级变化明细
```

---

## 10. Evidence 和 Live Report 修复方案

### 10.1 问题

当前全局报告和 case artifact 可能来自不同执行阶段。例如：

```text
报告 summary：ASCET database writes=0
dependency-chain-pass.json：writesPerformed=true
```

如果没有 phase/epoch，无法准确解释。

### 10.2 Evidence model

新增 run ledger：

```json
{
  "runId": "20260810_1342_019FEB",
  "databaseIdentity": "...",
  "phases": [
    {
      "phaseId": "readonly-001",
      "kind": "read_only",
      "startedAt": "...",
      "endedAt": "...",
      "databaseWrites": 0
    },
    {
      "phaseId": "write-001",
      "kind": "isolated_write",
      "startedAt": "...",
      "endedAt": "...",
      "databaseWrites": 4,
      "cleanupWrites": 4
    }
  ]
}
```

每个 case 保存：

```text
caseId
phaseId
attemptId
tool
action
arguments
rawResponse
bridgeEntered
mutationStarted
writeOutcome
readbackOutcome
cleanupOutcome
```

### 10.3 汇总规则

全局字段必须由 ledger 聚合：

```text
writesPerformed = any(case.mutationStarted == true)
bridgeEntered = any(case.bridgeEntered == true)
cleanupRequired = any(case.cleanupRequired == true)
```

同时输出：

```text
readOnlyWrites
isolatedFixtureWrites
cleanupWrites
unexpectedWrites
```

不能使用手工维护的全局布尔值覆盖 case artifact。

### 10.4 代码/文件范围

```text
packages/ascet-extension/src/write-telemetry.ts
packages/ascet-extension/src/edit/verification.ts
packages/ascet-extension/src/observation-store.ts
scripts/ascet-extension-live-smoke.ts
C:\Repo\11_ASCETCopilotLiveTest\ASCET_Tools_Complete_Test_Plan.md
```

---

## 11. 分阶段实施计划

## Phase 0：冻结和建立基线

### 目标

防止修复过程混入其它 session 的改动，并保留当前行为证据。

### 工作

```text
1. 记录当前 git status 和当前 runtime bundle 版本
2. 保存当前 capabilities snapshot
3. 保存 public ascet_edit schema JSON
4. 保存 Bug-006 原始参数和完整 validation errors
5. 保存 dependency-chain-pass.json
6. 为每个 case 标记 phaseId/attemptId
```

### 退出条件

```text
所有基线 artifact 可追溯到 runId
当前 runtime 与源码 commit/bundle version 已确认
```

---

## Phase 1：修复 public schema 和 Bug-006

### 目标

让 public `ascet_edit.set_element_dependency` 能通过声明的合法参数，并保证错误只属于选中的 Action。

### 任务

```text
1. 补齐 set_element_dependency plan/commit 的 writeControlSchema
2. 检查 apply_element_spec 各 variant 的公共字段
3. 引入 action-specific schema registry
4. 实现 discriminator-first validation
5. 改善 union error normalization
6. 删除 catalog schema hardcode
7. 增加 schema/capabilities consistency tests
```

### 退出条件

```text
Value.Check 合法请求为 true
带 executeWrite 的声明请求不再被 public schema 拒绝
非法请求不会输出其它 Action 的 required 错误
Bridge 只在 schema 和 semantic validation 完成后进入
```

---

## Phase 2：修复 Plan/Commit 一致性

### 任务

```text
1. plan 不得产生数据库 mutation
2. plan 保存 target/database/evidence/contract fingerprint
3. commit 只接受 planId
4. commit 重新 preflight 后验证 fingerprint
5. 过期、消费、operation mismatch、binding mismatch 都必须阻止写入
6. commit 前后写入 ledger
7. automatic readback 失败时进入 unknown/rollback 流程
```

### 退出条件

```text
plan=preflight 且 database writes=0
valid commit 执行 exactly-once
重复 commit 被拒绝
过期 plan 被拒绝
stale target 被拒绝
readback mismatch 不被标为成功
```

---

## Phase 3：修复 Database Scope

### 任务

```text
1. 增加 database-scope Tree
2. 显式收集 Project identity
3. 增加 scopeKind/scopeId/completeness
4. database_catalog 使用严格 scope 校验
5. 增加 root/full/bounded/truncated 测试
```

### 退出条件

```text
database_catalog 可由 database-scope Tree 稳定执行
bounded Tree 不能冒充 full database Tree
Project identity 缺失有明确错误码
```

---

## Phase 4：修复 Enumeration

### 任务

```text
1. 建立 ResolvedTarget object kind
2. 建立 Action capability matrix
3. 确认并固化 `read_implementation` 的 Enumeration read contract
4. 更新 descriptors/catalog
5. 更新 R-003/W-008
6. 自动 readback 和独立 readback 都验证 enumerator name/order；numeric value 仅在 backend 明确提供时验收
```

### 退出条件

```text
Enumeration summary/readback 可用
set_enumerators 独立验证可用
ascet_get.elements 的边界明确
```

---

## Phase 5：Catalog Snapshot 和 Breaking Detection

### 任务

```text
1. 生成 catalog-snapshot.json
2. 对 schema/rules/result 计算 fingerprint
3. 实现 snapshot diff
4. 分类 drift/breaking/test/blocked
5. 在 CI 增加 breaking schema gate
```

### 退出条件

```text
catalog 变化可重现
breaking schema 变化能阻断
Action count 变化不再直接造成错误判定
```

---

## Phase 6：Live 回归和发布

### 顺序

```text
1. runtime status
2. scheduler status
3. capabilities snapshot
4. public schema validation
5. database-scope Tree
6. database_catalog
7. Enumeration read
8. read-only regression
9. diff regression
10. isolated fixture preflight
11. user confirmation
12. plan
13. commit
14. automatic readback
15. independent diff
16. reverse cleanup
17. final runtime/scheduler status
18. final report
```

在 Phase 1-5 全部通过前，不得执行共享数据库写入。

---

## 12. 精确文件变更清单

### 12.1 Public schema/dispatch

```text
packages/ascet-extension/src/edit/service.ts
packages/ascet-extension/src/tools/edit/schema.ts
packages/ascet-extension/src/tools/edit/definition.ts
packages/ascet-extension/src/tools/_shared/openai-schema.ts
packages/ascet-extension/src/tools/_shared/validation.ts
packages/ascet-extension/src/edit/contract.ts
```

### 12.2 Catalog

```text
packages/ascet-extension/src/tools/actions/catalog.ts
packages/ascet-extension/src/tools/actions/catalog.test.ts
packages/ascet-extension/src/tools/actions/descriptors.ts
packages/ascet-extension/src/tools/actions/search.ts
```

### 12.3 Plan/approval/evidence

```text
packages/ascet-extension/src/edit/plan-store.ts
packages/ascet-extension/src/edit/plan-store.test.ts
packages/ascet-extension/src/edit/approval.ts
packages/ascet-extension/src/edit/service.test.ts
packages/ascet-extension/src/write-telemetry.ts
packages/ascet-extension/src/edit/verification.ts
```

### 12.4 Database scope/catalog

```text
packages/ascet-extension/src/observation-store.ts
packages/ascet-extension/src/database-catalog/types.ts
packages/ascet-extension/src/database-catalog/tree-source.ts
packages/ascet-extension/src/database-catalog/catalog-service.ts
packages/ascet-extension/src/database-catalog/tree-source.test.ts
packages/ascet-extension/src/database-catalog/catalog-service.test.ts
packages/ascet-extension/src/get.ts
packages/ascet-extension/src/get.test.ts
ascetcli/src/AscetCopilot/Services/Get/AscetGetService.cs
ascetcli/tests/AscetDatabaseCatalogContractTest.cs
```

### 12.5 Enumeration

```text
ascetcli/src/AscetCopilot/Services/Read/*
ascetcli/src/AscetCli/Commands/ExecCommand.cs
ascetcli/src/AscetCli/Routing/OperationRegistry.cs
packages/ascet-extension/src/tools/read/schema.ts
packages/ascet-extension/src/tools/read/definition.ts
packages/ascet-extension/src/tools/actions/descriptors.ts
```

### 12.6 Test plan/report

```text
C:\Repo\11_ASCETCopilotLiveTest\ASCET_Tools_Complete_Test_Plan.md
C:\Repo\11_ASCETCopilotLiveTest\output\live-tools\20260810_1342_019FEB\ASCET_Tools_Bug_Report.md
```

---

## 13. 测试矩阵

### 13.1 Public schema

| Case | 输入 | 预期 |
|---|---|---|
| S-001 | `set_element_dependency` plan，无 `executeWrite` | 通过 |
| S-002 | `set_element_dependency` plan，`executeWrite=false` | 按最终 R0/R1 contract 通过或返回明确 action-specific 错误 |
| S-003 | `set_element_dependency` commit + `planId` | 通过 |
| S-004 | `apply_element_spec` create plan | 通过 |
| S-005 | `apply_element_spec` commit | 通过 |
| S-006 | 发送其它 Action 字段 | 只返回 selected Action 错误 |
| S-007 | 未知 action | `unknown_action`，不输出其它 Action required 错误 |

### 13.2 Plan/Commit

| Case | 预期 |
|---|---|
| P-001 plan 只做 preflight | `mutationStarted=false` |
| P-002 plan 保存 fingerprint | plan artifact 完整 |
| P-003 commit 使用正确 plan | 进入 confirmation |
| P-004 commit 使用错误 action | `plan_operation_mismatch` |
| P-005 commit 使用过期 plan | `plan_expired` |
| P-006 commit 重复使用 | `plan_consumed` |
| P-007 target/database 已变化 | `stale_plan` 或 binding mismatch |
| P-008 readback mismatch | 不得标记 PASS |

### 13.3 Database Catalog

| Case | 预期 |
|---|---|
| DBC-001 database-scope Tree 含 Project | 通过 |
| DBC-002 bounded Tree | `database_scope_required` 或 `full_tree_required` |
| DBC-003 truncated Tree | 拒绝 |
| DBC-004 Project identity 缺失 | `project_identity_required` |
| DBC-005 database identity 不一致 | 拒绝 |
| DBC-006 module/enumeration local catalog | 不触发不必要 live scan |

### 13.4 Enumeration

| Case | 预期 |
|---|---|
| E-001 tree 识别 Enumeration | 通过 |
| E-002 summary read | 通过 |
| E-003 enumerator name/order read | 通过；numeric value 仅在 backend 明确提供时验收 |
| E-004 `ascet_get.elements` 目标为 Enumeration | 明确 unsupported capability |
| E-005 set_enumerators automatic readback | LIVE-PENDING；通过后才可关闭 Bug-003 |
| E-006 set_enumerators independent readback | LIVE-PENDING；通过后才可关闭 Bug-003 |

### 13.5 Catalog Drift

| Case | 预期 |
|---|---|
| C-001 action 新增 | catalogDrift，不阻断 |
| C-002 required 字段新增 | breakingSchemaChange，阻断 |
| C-003 enum 删除 | breakingSchemaChange，阻断 |
| C-004 plan variant 消失 | breakingSchemaChange，阻断 |
| C-005 仅 rules 文案变化 | metadata drift |
| C-006 相同 catalog 重复生成 | fingerprint 相同 |

### 13.6 Evidence

| Case | 预期 |
|---|---|
| EV-001 只读 phase | writes=0 |
| EV-002 isolated write phase | case-level writes 可见 |
| EV-003 cleanup phase | cleanup writes 单独统计 |
| EV-004 多 phase 汇总 | 由 ledger 聚合，不手工覆盖 |
| EV-005 unknown outcome | 停止重试并保留原始响应 |

---

## 14. 测试命令和执行规则

代码修改后按仓库规则执行：

```text
npm run check
```

不运行：

```text
npm run build
npm test
```

除非另行明确要求。

修改或新增测试文件后，先运行对应的 focused test。例如：

```text
node ../../node_modules/vitest/dist/cli.js --run test/specific.test.ts
```

ASCET C# contract 需要使用仓库已有脚本：

```text
ascetcli/scripts/test-ascet-csharp.ps1
ascetcli/scripts/test-ascet-bridge.ps1
```

Live 测试必须满足：

```text
serial-only
isolated fixture
explicit user confirmation before write
automatic readback
independent readback/diff
reverse cleanup
```

---

## 15. 风险和回滚

### 15.1 风险

| 风险 | 防护 |
|---|---|
| Public schema breaking change | 先生成 snapshot，执行 contract diff |
| Plan/commit 行为变化 | 保留 R0 兼容层，先测试再清理 |
| Database Tree 性能变慢 | database-scope 走独立 collector，记录 timings |
| Enumeration API 与 ToolAPI 版本差异 | 先做 read-only capability probe |
| catalog 递归展开导致 schema 变大 | 只对 capabilities full detail 展开，summary 保持 compact |
| evidence 聚合改变历史统计 | 旧 artifact 保留，新增 report version 和 aggregation version |

### 15.2 回滚原则

```text
1. 不回滚到放宽 database_catalog 校验的实现
2. 不回滚到可接受未知写入字段的 schema
3. 不回滚到 commit 重新接受完整写入参数的实现
4. 保留旧 artifact 和新 artifact，不覆盖原始证据
5. bundle 发布失败时只回滚 extension bundle，不修改 ASCET 数据库
```

---

## 16. Definition of Done

本方案全部完成必须满足：

```text
1. public ascet_edit 能调用 set_element_dependency
2. Bug-006 的 executeWrite/schema mismatch 已关闭
3. capabilities、TypeBox、dispatcher、backend adapter 一致
4. union 错误不再泄露其它 Action 的 required 错误
5. plan 不产生数据库写入
6. commit 只执行已验证 plan
7. plan fingerprint、target identity、database identity 可校验
8. database-scope Tree 稳定返回 Project identity
9. database_catalog 不再存在公开调用死锁
10. Enumeration 有明确 object-kind contract
11. Enumeration enumerator name/order 可独立 readback；numeric value 不得无证据承诺
12. set_enumerators 自动和独立 readback 都通过
13. catalog drift 与 breaking schema change 分离
14. evidence 按 phase/case/attempt 聚合
15. W-012 的成功不能掩盖 W-007 的失败
16. 所有 P1/P2 focused tests 通过
17. npm run check 通过，且无 warnings/infos/errors
18. isolated live write、readback、diff、cleanup 全部通过
19. 原始共享数据库无非预期修改
```

---

## 17. 最终执行顺序

```text
Phase 0  基线和证据冻结
   ↓
Phase 1  public schema registry + Bug-006
   ↓
Phase 2  plan/commit state machine
   ↓
Phase 3  database scope + Project identity
   ↓
Phase 4  Enumeration capability/readback
   ↓
Phase 5  catalog snapshot/breaking detection
   ↓
Phase 6  read-only live regression
   ↓
Phase 7  isolated fixture write regression
   ↓
Phase 8  final report and release gate
```

在 Phase 1 至 Phase 5 未完成前：

```text
不得执行共享数据库写入
不得将 BLOCKED 标记为 PASS
不得用 configure_parameter_dependency_chain 代替 set_element_dependency
不得用 summary 成功代替 Enumeration 内容 readback
不得通过放宽 full_tree_required 掩盖 scope/identity 缺陷
```

## 18. 2026-08-11 修复进度复核

### 已修复的问题

1. Database Tree 不再把空结果、collector failure、缺失 identity 或 truncated 结果标记为完整。
2. Database Catalog 只消费完整 database-scope Tree，并在昂贵扫描前通过 `get_database_identity` 拒绝错误数据库来源。
3. Public schema、validator、capabilities 和 Action catalog 使用共享 contract/registry，unknown Action 不再泄露其他 variant 错误。
4. `set_element_dependency` 和 `apply_element_spec` 的 plan/commit write-control 已统一。
5. Plan v2 已绑定 contract、database、target 和 preflight evidence，并提供 exactly-once consume/replay 防护。
6. Enumeration 自动与独立回读均按 enumerator 名称和顺序验证。
7. Catalog snapshot、semantic diff 和 breaking gate 已接入 `npm run check`。
8. Evidence 已按 run/phase/case/attempt 聚合，并从真实 Bridge 生命周期记录 entry/outcome。

### 当前证据

```text
focused tests: 104/104 passed
ASCET Bridge non-live tests: passed
npm run check: passed
Read-only Live: passed
Database Tree: complete, 10,681 items, truncated=false
Database Catalog: 26,743 items
Database mismatch: rejected before Catalog scan
apply_element_spec isolated write/readback/diff: passed
set_element_dependency isolated write/readback/diff: passed
set_enumerators automatic/independent name-order readback: passed
reverse cleanup: passed
fixture remaining: false
unexpected writes: 0
Final runtime/scheduler: healthy
```

证据目录：

```text
output/live-tools/20260811-fix-validation/read-only
output/live-tools/20260811-fix-validation/isolated-write
output/live-tools/20260811-fix-validation/completion-audit.md
```

### 当前判定

```text
Bug-001: FIXED
Bug-002: FIXED
Bug-003: FIXED
Bug-004: FIXED
Bug-006: FIXED
Overall: FIXED
```

隔离 fixture `PI_LIVE_FIX_20260811_13947C09` 已逆序清理；数据库 identity 未改变，原共享数据库无非预期修改。

---

## 19. 2026-08-11 新增 P0/P1 缺陷复核

### 19.1 结论

本节复核范围不属于第 18 节已关闭的 Bug-001/002/003/004/006。第 18 节的 `Overall: FIXED` 不能证明以下 7 项已经修复。

| 优先级 | 问题 | 当前状态 | 简要结论 |
|---|---|---|---|
| P0 | `apply_element_spec` 批量写入非原子 | **NOT FIXED** | 创建和更新按顺序直接落库；异常时没有事务、快照恢复或补偿回滚。 |
| P0 | `set_method_code` 不验证引用 Element | **NOT FIXED** | 自动验证只比较方法文本 readback，不解析或验证引用符号及组件一致性。 |
| P1 | Element preflight/commit 不一致 | **NOT FIXED** | preflight 只执行 catalog、normalize 和 diff；Data/Implementation 实际解析仍在 commit。 |
| P1 | `mutationStatus=unknown` 后不锁定目标 | **NOT FIXED** | unknown 只进入 telemetry，并标记 `cleanupRequired`；没有持久 target quarantine 或后续写入拦截。 |
| P1 | Project 子组件路径解析不一致 | **NOT FIXED** | `ascet_get` 单独支持 `Project::Child`，read/edit 仍使用普通 folder/item resolver。 |
| P1 | 共享 OID 无影响警告 | **NOT FIXED** | plan 绑定单个 target OID，但没有 `sharedObject`、owner、alias 或 consumer Project 影响分析。 |
| P1 | Confirmation 协议不一致 | **PARTIAL** | 普通写入和 plan commit 已复用同一 UI confirmation helper；但没有绑定 planId/correlationId 的一次性 approval token，也不承接对话文本确认。 |

总体状态：

```text
新增问题 Overall: NOT FIXED
P0: 2/2 NOT FIXED
P1: 4 NOT FIXED, 1 PARTIAL
```

### 19.2 代码审计证据

1. 非原子写入：`ascetcli/src/AscetCopilot/AscetElementSync.cs` 的 `ApplyInSession` 在 create/update loop 中逐项调用 `CreateElement`、`UpdateElement`，成功项立即保留；异常路径没有 rollback。
2. Data Item 失败点：同文件在 `effectiveData.GetItem(element)` 和 `element.GetValue()` 均为空时抛出 `data_item_not_found`，该检查发生在 commit 写入流程内。
3. Method readback：`ascetcli/src/AscetCopilot/Services/Write/MethodWriteService.cs` 的 `SetMethodCodeVerificationHook` 仅比较 `actualCode` 与 `expectedCode`。
4. Preflight：`packages/ascet-extension/src/edit/service.ts` 的 `runBackendMutationPreflight` 只调用 `read_element_catalog` 和 `diff_element_spec`，并明确声明不执行 Data/Implementation write/readback。
5. Unknown guard：`recordManagedWriteTelemetry` 仅记录 `mutationStatus=unknown` 和 `cleanupRequired=true`；调用入口没有读取该状态并阻止相同 database/target 的后续 mutation。
6. 路径解析：`AscetGetService.ResolveComponents` 对 `::` 调用 Project `GetModule`/`GetRepresentedClass`；公共 `ResolveItemByPath`、`AscetEditableService` 和 Element sync resolver 仍按 `GetItemInFolder` 解析。
7. Confirmation：`requestAscetEditApproval` 只接收 `executeWrite/title/message/signal`，无 approval token、plan binding 或 correlation binding；plan commit 仅把 planId/fingerprint显示在确认消息中。
8. 当前测试中没有覆盖这 7 项所要求的原子回滚、symbol consistency、unknown quarantine、跨工具 Project child resolver、shared-object warning 回归场景。

### 19.3 开发修复方案

#### A. P0：Element 批量写入原子化

```text
pre-resolve all targets
→ capture Element/Data/Implementation snapshot
→ apply all mutations
→ verify full batch
→ commit database save
```

任一阶段失败时必须逆序补偿：删除本次新增项、恢复更新/删除项及其 Data/Implementation。只有完整回滚成功才能返回 `rolled_back`；回滚失败返回 `unknown` 并锁定目标。

#### B. P0：Method 写入组件一致性验证

写入前后增加统一 consistency validator：解析方法引用符号，确认 Element 存在、scope/type/DataConfiguration/ImplementationConfiguration 可解析；优先调用 ASCET 原生 parse/compile/consistency API。验证失败时恢复旧方法代码，不得返回 `readbackVerified=true`。

#### C. P1：强化 Element preflight

preflight 必须在生成 planId 前完成：目标 OID 解析、Element kind/scope 可创建性、DataConfiguration、Data Item、ImplementationConfiguration、Impl Item 和 requested type/range/value 的可写能力验证。任一配置 unresolved 时不生成 commit plan。

#### D. P1：Unknown outcome target quarantine

建立持久 guard store，key 至少包含：

```text
database identity + target OID + mutation domain
```

任何 unknown/rollback_failed 都写入 quarantine。所有 mutation 在确认前检查 guard；只允许 read、reconcile、rollback、cleanup。解除锁定必须有显式 reconciliation 结果和审计证据。

#### E. P1：统一 Project child/OID resolver

在 C# Bridge 建立唯一 `AscetTargetResolver`，统一支持：

```text
folder\item path
projectPath::childName
OID
```

`ascet_get`、`ascet_read`、`ascet_edit`、editability、verification 全部依赖该 resolver，并返回规范 path、OID、owner kind 和 alias paths。

#### F. P1：共享对象影响确认

preflight 根据目标 OID 反查所有 alias/owner/consumer，输出：

```json
{
  "sharedObject": true,
  "targetOid": "...",
  "ownerPath": "...",
  "aliasPaths": [],
  "affectedProjects": []
}
```

共享对象写入必须使用独立的 impact confirmation，确认内容绑定 OID 和 affectedProjects；不能只展示用户输入的 Project path。

#### G. P1：统一 Confirmation contract

所有 mutation 使用同一个 plan/approval middleware。approval 必须是一次性 token，并绑定：

```text
action + planId + planFingerprint + database identity + target OID + expiry + nonce
```

对话中的“确认执行”本身不直接等于授权；它必须触发并成功生成上述 token。普通 `executeWrite=true` 也必须先生成等价的 ephemeral plan，禁止绕过 plan-bound approval。

### 19.4 必须新增的回归测试

1. 四 Element 中第 4 个故障：最终必须为 0 个新增或完整 4 个，禁止留下 3 个。
2. rollback 注入故障：返回 unknown，并验证 target quarantine 生效。
3. Method 引用缺失 Element：写入被拒绝或旧代码被恢复。
4. preflight Data/Implementation unresolved：不得生成 planId。
5. unknown 后再次 commit：必须返回 `target_quarantined`。
6. 同一个 `Project::Child` 路径在 get/read/edit/editability 中解析到同一 OID。
7. Project path 与 Package path 同 OID：plan 必须包含 shared-object impact，未专项确认不得 commit。
8. approval token 被篡改、过期、复用或绑定不同 target：全部拒绝。

在上述实现和 isolated fixture 回归测试完成前，不得把本节状态升级为 `FIXED`。

---

## 20. 七个 Tools Bug 详细开发修复方案

### 20.1 目标和边界

本节是第 19 节的可执行开发设计。目标不是让错误信息更友好，而是建立以下强约束：

```text
写入前可证明
写入中可追踪
写入失败可恢复
无法证明时禁止继续写
所有路径和确认绑定同一个真实对象身份
```

本轮完成后必须满足：

1. 一个批量 Element 请求不会留下部分成功状态。
2. Method 文本成功回读不能掩盖缺失符号或无效 Element 配置。
3. `apply_element_spec` plan 只能在 Data/Implementation 可写性得到证明后生成。
4. unknown/rollback_failed 会持久锁定真实 target OID，而不是只记录日志。
5. get/read/edit/editability 使用同一目标解析结果。
6. Project alias 指向共享 Package OID 时，plan 和确认必须显示真实影响范围。
7. 所有 mutation 使用 plan-bound、target-bound、一次性的 approval receipt。

不在本轮范围内：

- 不通过放宽验证或把 unknown 改名为 warning 来关闭问题。
- 不使用重试掩盖部分写入。
- 不把对话中的普通文本自动当作数据库写入授权。
- 不保留旧 Plan v2 的执行兼容性；升级后旧 plan 必须明确返回 `plan_version_unsupported`。

### 20.2 当前实现约束

| 领域 | 当前实现 | 关键限制 |
|---|---|---|
| Element apply | `ComponentElementSyncService.ApplyInSession` 顺序执行 create/update/remove | ToolAPI mutation 会立即改变当前 session 中的模型，不能把“尚未 Save”当成事务 |
| Element snapshot | `AscetElementCatalogReader.ReadExistingElements` 和 `BuildSpecDocument` 已能回读多数 Element/Data/Impl 字段 | snapshot 必须增加 completeness 证明；字段 unresolved 时不能承诺可回滚 |
| 已有补偿模式 | `AscetParameterDependencyChainExecute` 已有 before snapshot、逆序 rollback、rollback readback 和 failure injection | 可复用模式，但需要抽象为通用 transaction，而不是复制代码 |
| Method verification | `SetMethodCodeVerificationHook` 只比较方法文本 | 不检查符号、DataConfiguration、ImplementationConfiguration 或 Component consistency |
| Element preflight | TypeScript 调用 `read_element_catalog`、normalize、`diff_element_spec` | diff 不会解析新 Element 的实际 Data/Implementation item |
| unknown 分类 | `verification.ts` 将失败分类为 applied/not_started/unknown | unknown 只影响返回值和 telemetry，没有持久 guard |
| 路径解析 | `AscetGetService.ResolveComponents` 单独支持 `Project::Child` | read/edit/editability 仍通过 `AscetItemPath + GetItemInFolder` |
| Plan | Plan v2 已绑定 database、target、contract 和 evidence | 未绑定 impact、approval receipt 和 mutation guard generation |
| Approval | `requestAscetEditApproval` 只有 executeWrite/UI bool | 无 planId、target OID、database identity、impact fingerprint 和一次性消费 |

### 20.3 共享基础架构

七个问题不能分别增加局部判断。需要先建立四个共享组件。

#### 20.3.1 `AscetTargetResolver`

建议新增：

```text
ascetcli/src/AscetCopilot/Resolution/AscetTargetResolver.cs
```

核心输入：

```csharp
public sealed class AscetTargetRequest
{
    public string Path { get; set; }
    public string Oid { get; set; }
    public string ExpectedKind { get; set; }
}
```

核心输出：

```csharp
public sealed class AscetResolvedTarget
{
    public string RequestedPath { get; set; }
    public string CanonicalPath { get; set; }
    public string TargetOid { get; set; }
    public string TargetKind { get; set; }
    public string OwnerPath { get; set; }
    public string OwnerOid { get; set; }
    public string ReferenceOid { get; set; }
    public string ResolutionKind { get; set; }
    public IList<string> AliasPaths { get; set; }
    public DataBaseItem Item { get; set; }
}
```

支持三种输入：

```text
folder\component
projectPath::childName
OID
```

解析规则：

1. path 和 OID 同时提供时必须解析到同一 `TargetOid`，否则返回 `target_identity_mismatch`。
2. `Project::Child` 必须先解析 Project，再通过 Project 模型元素取得 represented Component。
3. 对 Project child 同时保留：Project reference identity、represented Component identity、canonical Package path。
4. resolver 返回的是当前 session 内的真实对象，调用方不得再根据字符串重新解析一次。
5. object kind 不符合 action contract 时返回 `unsupported_target_kind`，不能在后续写入阶段才失败。
6. OID 为空或 ToolAPI 无法提供稳定 OID 时，mutation action 返回 `target_identity_unavailable`。

#### 20.3.2 `AscetMutationCoordinator`

TypeScript 所有 mutation 统一进入一个 coordinator：

```text
validate contract
→ resolve database identity
→ resolve target identity
→ check quarantine
→ run backend preflight
→ persist plan
→ resolve shared-object impact
→ request approval
→ acquire target mutation lock
→ consume approval and plan
→ dispatch Bridge
→ classify outcome
→ verify/rollback/quarantine
```

建议新增：

```text
packages/ascet-extension/src/edit/mutation-coordinator.ts
packages/ascet-extension/src/edit/mutation-coordinator.test.ts
```

所有现有 `runApprovedAscet*` 入口改为 coordinator adapter。普通 `executeWrite=true` 不再直接绕过 plan：内部生成短生命周期 ephemeral plan，再走相同 approval 和 guard 流程。

#### 20.3.3 Plan v3

`AscetPlanRecord` 升级为 version 3，新增：

```ts
interface AscetPlanTargetImpact {
  sharedObject: boolean;
  ownerPath: string;
  ownerOid: string;
  aliasPaths: string[];
  affectedProjects: Array<{ path: string; oid: string }>;
  completeness: "complete" | "unknown";
  fingerprint: string;
}

interface AscetPlanRecordV3 {
  version: 3;
  planId: string;
  operation: string;
  databaseIdentity: AscetPlanDatabaseIdentity;
  targetIdentity: AscetPlanTargetIdentity;
  targetImpact: AscetPlanTargetImpact;
  backendPreflight: AscetPlanJsonValue;
  preMutationSnapshotFingerprint?: string;
  guardGeneration: number;
  contractFingerprint: string;
  evidenceFingerprint: string;
  planFingerprint: string;
  createdAt: string;
  expiresAt: string;
  state: "ready" | "executing" | "consumed" | "reconciliation_required";
}
```

Plan fingerprint 必须包含：

```text
operation
normalized params
database identity
target OID/kind
impact fingerprint
backend preflight evidence
snapshot fingerprint
guard generation
contract fingerprint
expiry
```

#### 20.3.4 统一 mutation 状态

扩展当前 mutation 状态：

```ts
type AscetEditMutationStatus =
  | "not_started"
  | "applied"
  | "rolled_back"
  | "unknown";
```

统一结果至少包含：

```json
{
  "mutationStatus": "applied|not_started|rolled_back|unknown",
  "consistencyStatus": "consistent|restored|unknown",
  "verification": {
    "status": "passed|failed|missing|unknown"
  },
  "rollback": {
    "required": false,
    "status": "not_required|passed|failed",
    "verified": true,
    "stages": []
  },
  "guard": {
    "status": "clear|quarantined",
    "targetOid": "...",
    "generation": 1
  }
}
```

状态约束：

| 情况 | mutationStatus | consistencyStatus | guard |
|---|---|---|---|
| Bridge 前拒绝 | not_started | consistent | clear |
| 写入且完整验证 | applied | consistent | clear |
| 写入失败但完整回滚 | rolled_back | restored | clear |
| 写入/回滚/进程结果无法证明 | unknown | unknown | quarantined |

---

### 20.4 Bug 1：`apply_element_spec` 批量写入非原子

#### 20.4.1 根因

当前 `ApplyInSession` 在同一个 loop 内直接执行：

```text
CreateElement(A)
CreateElement(B)
CreateElement(C)
CreateElement(D) → failure
```

A/B/C 已经进入当前 ASCET session，异常只终止调用，不会自动删除前三项。`SaveCurrentDatabase` 尚未调用也不能证明修改未生效。

#### 20.4.2 目标语义

对一个 apply request，外部只能观察到两种稳定结果：

```text
全部目标状态与请求一致
或
目标恢复到请求前状态
```

不得返回“部分成功但继续可写”。

#### 20.4.3 事务模型

ASCET ToolAPI 未提供已验证的数据库事务 API，因此实现 application-level compensating transaction。

建议新增：

```text
ascetcli/src/AscetCopilot/Transactions/AscetElementMutationTransaction.cs
ascetcli/src/AscetCopilot/Transactions/AscetElementMutationSnapshot.cs
```

事务阶段：

```text
PREPARE
  1. 解析 component OID。
  2. 计算完整 mutation set：create/update/remove/recreate。
  3. 回读所有受影响 Element 的 before state。
  4. 验证 snapshot completeness。
  5. 生成 snapshot fingerprint。

APPLY
  6. 逐项写入，并在 journal 记录完成的 stage。
  7. 每个 stage 记录 element name、operation、before OID、after OID。
  8. 此阶段禁止 SaveCurrentDatabase。

VERIFY
  9. 对完整请求执行一次 full-batch readback/diff。
  10. 任一 Element 不一致视为事务失败。

COMMIT
  11. 只有 full-batch verification 通过后调用一次 SaveCurrentDatabase。
  12. Save 后再次执行轻量 identity/readback。

ROLLBACK
  13. 逆序处理 journal。
  14. create → remove。
  15. update → restore before spec。
  16. remove/recreate → recreate before spec。
  17. 验证 rollback diff 与 snapshot 完全一致。
  18. rollback 通过后保存恢复状态。
```

#### 20.4.4 Snapshot completeness

`AscetExistingElementState` 已包含多数恢复字段，但必须新增：

```text
snapshotStatus: complete|incomplete
unresolvedFields: string[]
dataItemResolved: boolean
implementationItemResolved: boolean
sourceElementOid
configuration fingerprints
```

以下任一情况必须在 mutation 前返回 `mutation_snapshot_incomplete`：

- 受影响 Element 无法回读 kind/scope/type。
- 请求会修改 Data，但 before Data Item unresolved。
- 请求会修改 Implementation，但 before Impl Item unresolved。
- table/array shape 或 values 无法完整回读。
- delete/recreate 的 Element 无法生成可 round-trip 的 restore spec。

#### 20.4.5 Journal

Journal 不包含完整业务数据，只记录可审计阶段：

```json
{
  "operationId": "...",
  "componentOid": "...",
  "snapshotFingerprint": "...",
  "stages": [
    {
      "sequence": 1,
      "element": "C_AVH_DoubleBrakePressCount",
      "operation": "create",
      "status": "applied",
      "afterOid": "..."
    }
  ]
}
```

journal 必须在每个 mutation stage 后立即刷新，进程异常退出时 reconciliation 可以知道最后已知阶段。

#### 20.4.6 Failure injection

参考 Parameter Dependency Chain，增加仅测试环境生效的注入点：

```text
ASCET_ELEMENT_TX_ENABLE_FAILURE_INJECTION=1
ASCET_ELEMENT_TX_FAIL_AFTER_STAGE=create:3
ASCET_ELEMENT_TX_FAIL_DURING_ROLLBACK=remove:2
```

生产环境未显式启用时必须忽略这些变量。

#### 20.4.7 错误码

| 错误码 | 含义 |
|---|---|
| `mutation_snapshot_incomplete` | 写入前无法生成完整恢复快照 |
| `element_transaction_apply_failed` | apply 阶段失败，尚待 rollback 结果 |
| `element_transaction_verification_failed` | full-batch readback/diff 不一致 |
| `element_transaction_rolled_back` | 写入失败且已恢复，mutationStatus=rolled_back |
| `element_transaction_rollback_failed` | rollback 无法完整证明，mutationStatus=unknown |
| `database_save_outcome_unknown` | Save 调用结果无法证明 |

#### 20.4.8 修改文件

主要修改：

```text
ascetcli/src/AscetCopilot/AscetElementSync.cs
ascetcli/src/AscetCopilot/Transactions/*
ascetcli/src/AscetCli/AscetApplyElementSpec.cs
packages/ascet-extension/src/apply-element-spec.ts
packages/ascet-extension/src/edit/verification.ts
packages/ascet-extension/src/edit/service.ts
packages/ascet-extension/src/edit/write-telemetry.ts
```

#### 20.4.9 验收测试

1. 四个新 Element，第 4 个 create 注入失败：最终四个均不存在。
2. 两个 create + 一个 update 失败：新增项删除，更新项恢复。
3. deleteMissing 后失败：被删除项恢复。
4. rollback 自身失败：返回 unknown，并生成 quarantine。
5. rollback 成功：返回 rolled_back，允许新 plan，但旧 plan 不可重放。
6. Save 失败：不得报告 rolled_back 或 applied，必须 unknown + quarantine。

---

### 20.5 Bug 2：`set_method_code` 不验证引用 Element

#### 20.5.1 根因

当前验证条件等价于：

```text
writtenText == readbackText
```

这只能证明文本被保存，不能证明：

- 引用的 Element 存在。
- Element scope/type 与用法兼容。
- DataConfiguration/ImplementationConfiguration 可解析。
- ASCET parser/compiler 接受该方法。
- 整个 Component 保持一致。

#### 20.5.2 验证层次

新增 `AscetComponentConsistencyService`：

```text
ascetcli/src/AscetCopilot/Services/Validation/AscetComponentConsistencyService.cs
```

验证分四层：

```text
L1 text readback
L2 referenced symbol resolution
L3 referenced Element configuration resolution
L4 native ASCET parse/compile/consistency validation
```

只有四层全部通过，`ReadbackVerified=true`。

#### 20.5.3 写入前流程

1. 统一 resolver 获取 Component 和 OID。
2. 回读旧方法代码并生成 `previousCodeFingerprint`。
3. 获取 Component symbol catalog：Elements、Method arguments、合法 method names、Enumeration literals 和语言内建符号。
4. 对新代码执行 native parser capability probe。
5. 如果 ToolAPI 有公开 parse/compile/consistency API，必须使用原生结果作为权威验证。
6. 如果没有可用原生 API，只允许 lexical symbol scan 作为 precheck；不能把 lexical scan 标记为最终 consistency verified。
7. 无法进行权威一致性验证时返回 `method_consistency_validation_unavailable`，默认不写。

不得用简单正则表达式作为最终符号解析器。

#### 20.5.4 写入后流程

```text
set code
→ exact text readback
→ native method parse
→ resolve referenced Elements
→ resolve each referenced Data/Impl configuration
→ component consistency check
```

引用 Element 的验证记录：

```json
{
  "name": "C_AVH_DoubleBrakeReq",
  "resolved": false,
  "scope": null,
  "dataConfiguration": "missing",
  "implementationConfiguration": "missing"
}
```

#### 20.5.5 Method rollback

写入后任一 L2-L4 验证失败：

1. 写回旧代码。
2. 精确 readback 旧代码。
3. 再次执行 consistency validation。
4. rollback 通过返回 `rolled_back`。
5. rollback 失败返回 unknown 并 quarantine Component OID。

#### 20.5.6 结果契约

```json
{
  "writeSucceeded": true,
  "textReadbackVerified": true,
  "symbolResolutionVerified": false,
  "configurationResolutionVerified": false,
  "componentConsistencyVerified": false,
  "readbackVerified": false,
  "missingSymbols": ["C_AVH_DoubleBrakeReq"],
  "mutationStatus": "rolled_back"
}
```

#### 20.5.7 错误码

| 错误码 | 含义 |
|---|---|
| `method_symbol_not_found` | 引用符号不存在 |
| `method_symbol_ambiguous` | 引用符号无法唯一解析 |
| `method_element_configuration_unresolved` | 引用 Element 存在但 Data/Impl 配置不可解析 |
| `method_parse_failed` | ASCET parser 拒绝代码 |
| `component_consistency_failed` | Component 一致性检查失败 |
| `method_consistency_validation_unavailable` | 无权威验证能力，写入被阻止 |
| `method_code_rollback_failed` | 旧代码恢复失败，进入 quarantine |

#### 20.5.8 修改文件

```text
ascetcli/src/AscetCopilot/Services/Write/MethodWriteService.cs
ascetcli/src/AscetCopilot/Services/Read/MethodReadService.cs
ascetcli/src/AscetCopilot/Services/Validation/*
ascetcli/src/AscetCli/AscetSetMethodCode.cs
packages/ascet-extension/src/set-method-code.ts
packages/ascet-extension/src/edit/service.ts
```

#### 20.5.9 验收测试

1. 引用四个存在 Element：通过。
2. 引用一个缺失 Element：写入被拒绝或自动恢复旧代码。
3. Element 存在但 DataConfiguration unresolved：失败并恢复。
4. Method 文本 round-trip 成功但 parser 失败：不得返回 success。
5. rollback 失败：unknown + Component quarantine。
6. 注释、字符串、关键字和 Method argument 不得被误报为缺失 Element。

---

### 20.6 Bug 3：Element preflight/commit 不一致

#### 20.6.1 根因

当前 preflight 证明的是：

```text
JSON contract valid
+ current catalog readable
+ requested diff computable
```

它没有证明 commit 中这些调用会成功：

```text
defaultData.GetItem(element)
element.GetValue()
defaultImplementation.GetItem(...)
classImplementation.GetItem(...)
Data/Impl setters
```

#### 20.6.2 新后端操作

新增只读操作：

```text
preflight_element_spec
```

建议文件：

```text
ascetcli/src/AscetCli/AscetPreflightElementSpec.cs
ascetcli/src/AscetCopilot/Services/Validation/ElementSpecPreflightService.cs
```

TypeScript 不再把 `diff_element_spec` 的成功包装为 `validated=true`；必须消费新操作返回的 capability evidence。

#### 20.6.3 每个 Element 的 preflight evidence

```json
{
  "name": "C_AVH_DoubleBrakeWindow",
  "operation": "create",
  "modelElement": {
    "kindSupported": true,
    "scopeSupported": true,
    "creationApiAvailable": true
  },
  "data": {
    "required": true,
    "configurationResolved": true,
    "itemResolution": "proven|not_applicable|unavailable",
    "requestedFieldsSupported": true
  },
  "implementation": {
    "required": true,
    "defaultConfigurationResolved": true,
    "classConfigurationResolved": true,
    "itemResolution": "proven|not_applicable|unavailable",
    "requestedFieldsSupported": true
  },
  "writable": true,
  "blockingReasons": []
}
```

#### 20.6.4 新 Element 的证明策略

新 Element 在真实创建前可能没有 Data Item。实现必须按以下顺序选择权威策略：

1. 使用 ASCET 原生 non-mutating validation/factory capability API。
2. 如果 ToolAPI 支持内存 clone 或 disposable object，使用不连接数据库持久状态的 materialization probe。
3. 如果只能通过修改真实 Component 才能知道结果，则 preflight 不得执行该修改，也不得返回 validated。
4. 对无法证明的类型返回 `element_preflight_capability_unavailable`，不生成 planId。

禁止在共享目标上“创建后立即删除”来冒充只读 preflight。

#### 20.6.5 Plan gate

只有满足以下条件才创建 Plan v3：

```text
所有 element.writable == true
所有 blockingReasons 为空
snapshot complete
impact completeness == complete
target guard == clear
```

backend preflight fingerprint 必须包含每个 Element 的 capability evidence。Commit 时重新运行并比较 fingerprint；变化则返回 `stale_plan`。

#### 20.6.6 错误码

| 错误码 | 含义 |
|---|---|
| `element_preflight_failed` | 一个或多个 Element 不可写 |
| `data_configuration_unresolved` | DataConfiguration 不可解析 |
| `implementation_configuration_unresolved` | ImplConfiguration 不可解析 |
| `data_item_preflight_unavailable` | 无法在只读阶段证明 Data Item |
| `implementation_item_preflight_unavailable` | 无法在只读阶段证明 Impl Item |
| `element_preflight_capability_unavailable` | ToolAPI 不支持安全证明 |
| `preflight_evidence_changed` | Commit 前证据变化 |

#### 20.6.7 修改文件

```text
ascetcli/src/AscetCli/AscetPreflightElementSpec.cs
ascetcli/src/AscetCopilot/AscetElementSync.cs
ascetcli/src/AscetCopilot/Services/Validation/ElementSpecPreflightService.cs
ascetcli/src/AscetCli/Routing/OperationRegistry.cs
ascetcli/contracts/commands/*
packages/ascet-extension/src/edit/service.ts
packages/ascet-extension/src/element-spec-contract.ts
packages/ascet-extension/src/tools/actions/*
```

#### 20.6.8 验收测试

1. DataConfiguration unresolved：preflight error，无 planId，无 mutation。
2. ImplConfiguration unresolved：preflight error，无 planId。
3. preflight 成功后配置变化：commit 返回 stale_plan，mutationStatus=not_started。
4. 只读 preflight telemetry 必须证明 Bridge 进入 read lane，writesPerformed=false。
5. 不支持安全 materialization 的类型：明确 blocked，不能降级为 diff-only plan。

---

### 20.7 Bug 4：unknown 后没有阻止后续写入

#### 20.7.1 Guard store

新增持久化 guard：

```text
packages/ascet-extension/src/edit/mutation-guard-store.ts
packages/ascet-extension/src/edit/mutation-guard-store.test.ts
```

存储路径：

```text
<artifactRoot>/mutation-guards/<databaseFingerprint>/<targetOid>.json
```

不能使用用户输入 path 作为 key，因为 Project alias 和 Package path 可能指向同一 OID。

#### 20.7.2 Guard record

```ts
interface AscetMutationGuardRecord {
  version: 1;
  databaseFingerprint: string;
  targetOid: string;
  targetKind: string;
  canonicalPath: string;
  generation: number;
  status: "quarantined" | "reconciling";
  reason: "unknown_outcome" | "rollback_failed" | "process_interrupted";
  operation: string;
  operationId: string;
  planId?: string;
  journalPath?: string;
  beforeSnapshotFingerprint?: string;
  desiredFingerprint?: string;
  detectedAt: string;
  evidence: {
    bridgeEntered: boolean;
    backendResponseReceived: boolean;
    mutationStarted: boolean;
  };
}
```

#### 20.7.3 写入拦截点

必须检查两次：

1. plan/preflight 前：快速阻止明显被隔离目标。
2. approval 后、Bridge dispatch 前：在 target lock 内再次检查，防止竞态。

被隔离时返回：

```json
{
  "status": "blocked",
  "code": "target_quarantined",
  "mutationStatus": "not_started",
  "targetOid": "...",
  "operationId": "...",
  "requiredAction": "reconcile"
}
```

#### 20.7.4 何时写入 quarantine

- Bridge 已进入但没有可信 backend response。
- backend 返回 `write_outcome_unknown`。
- rollback 任一 stage 失败或 rollback readback 不一致。
- SaveCurrentDatabase 结果无法证明。
- 进程恢复时发现 journal 停留在 `bridge_entered`、`mutation_started` 或 `rollback_started`。

#### 20.7.5 Reconciliation API

新增受控 action：

```text
ascet_edit.reconcile_target
```

支持模式：

```text
inspect
rollback_to_before
accept_current
cleanup_created
```

规则：

- `inspect` 只读，返回 before/current/desired diff。
- `rollback_to_before` 和 `cleanup_created` 是 mutation，必须专项确认。
- `accept_current` 只允许 current state 完整可读且 consistency validation 通过。
- guard 解除必须原子增加 generation，并记录 reconciliation evidence fingerprint。
- 禁止提供无证据的 `forceUnlock=true`。

#### 20.7.6 修改文件

```text
packages/ascet-extension/src/edit/mutation-guard-store.ts
packages/ascet-extension/src/edit/mutation-coordinator.ts
packages/ascet-extension/src/edit/service.ts
packages/ascet-extension/src/edit/verification.ts
packages/ascet-extension/src/edit/write-telemetry.ts
packages/ascet-extension/src/tools/edit/schema.ts
ascetcli/src/AscetCopilot/Transactions/*
```

#### 20.7.7 验收测试

1. unknown 后对同 OID 的相同 path 写入：blocked。
2. unknown 后通过另一个 alias path 写同 OID：同样 blocked。
3. 不同 Component OID：不被误锁。
4. inspect reconciliation 不写数据库。
5. rollback_to_before 成功：guard generation 增加并解除。
6. reconciliation 失败：guard 保持 quarantined。
7. 并发两个 commit：只有一个取得 target lock。

---

### 20.8 Bug 5：Project 子组件路径解析不一致

#### 20.8.1 统一调用方式

以下服务必须删除自己的字符串解析逻辑，改用 `AscetTargetResolver`：

```text
AscetGetService
ComponentLocatorService
MethodReadService
ComponentReadService
SummaryReadService
AscetEditableService
ComponentElementSyncService
MethodWriteService
所有 verification hooks
```

#### 20.8.2 Identity 语义

对于：

```text
CN_Libary\...\IPBCustGeneral_ECU_CSW_BB88010::CM_AVH
```

resolver 返回：

```json
{
  "requestedPath": "...Project::CM_AVH",
  "canonicalPath": "PlatformLibrary\\Package\\...\\CM_AVH",
  "targetOid": "040gpc83142g1no70o90q9iltgggg",
  "targetKind": "module",
  "resolutionKind": "project_reference",
  "ownerPath": "PlatformLibrary\\Package\\...\\CM_AVH",
  "aliasPaths": ["...Project::CM_AVH", "...Package\\CM_AVH"]
}
```

所有 read/write response 必须同时返回 requestedPath 和 canonical identity，避免用户误以为修改的是 Project 私有副本。

#### 20.8.3 OID-first commit

Plan 生成后，commit 不再使用原始 path 作为最终定位依据：

```text
resolve current database
→ resolve target by stored OID
→ verify requested/canonical path aliases still point to same OID
→ execute on resolved object
```

path 只用于可读展示和 alias drift 检测。

#### 20.8.4 歧义处理

- Project 中同名 child 多于一个：`target_ambiguous`。
- `::` 左侧不是 Project：`invalid_project_child_path`。
- child 存在但无 represented Component：`represented_component_missing`。
- stored OID 存在但 path 指向其他 OID：`target_identity_mismatch`。
- OID 指向不支持 object kind：`unsupported_target_kind`。

#### 20.8.5 修改文件

```text
ascetcli/src/AscetCopilot/Resolution/*
ascetcli/src/AscetCopilot/AscetReadDomain.cs
ascetcli/src/AscetCopilot/Services/Get/AscetGetService.cs
ascetcli/src/AscetCopilot/Services/Read/*
ascetcli/src/AscetCopilot/Services/Write/*
ascetcli/src/AscetCli/AscetComponentEditable.cs
ascetcli/src/AscetCopilot/AscetElementSync.cs
```

#### 20.8.6 验收测试

对同一个 Project child：

```text
ascet_get.tree
ascet_get.elements
ascet_read.read_implementation
ascet_read.read_method_code
ascet_edit.check
apply_element_spec preflight
set_method_code preflight
```

必须返回同一个 `targetOid`。另外验证 OID 直接输入与两个 alias path 的结果一致。

---

### 20.9 Bug 6：共享 OID 没有影响警告

#### 20.9.1 Impact resolver

新增：

```text
packages/ascet-extension/src/edit/target-impact.ts
ascetcli/src/AscetCopilot/Services/Get/TargetImpactService.cs
```

输入是 database identity + resolved target OID，不是用户 path。

#### 20.9.2 影响数据来源

按可靠性排序：

1. 当前 database-scope complete Tree 中的 OID/alias 信息。
2. Project module/reference collector 对 target OID 的精确匹配。
3. Package owner path 和 database item identity。

现有 `dbitem_refs` 只有 outgoing references，不能单独证明全部 consumer；不得用于宣称 impact complete。

#### 20.9.3 Completeness gate

impact 结果必须有：

```text
complete
unknown
```

只有 database identity 匹配、Tree 未 truncated、Project collector 无错误时才能标记 complete。impact unknown 时共享对象 mutation 默认 blocked：

```text
shared_object_impact_unknown
```

#### 20.9.4 sharedObject 判定

以下任一成立即为 shared：

- 同一 target OID 存在多个 alias path。
- requested path 是 Project reference，而 owner path 是 Package object。
- affectedProjects 数量大于 1。
- 当前 target 是可被多个 Project 消费的 Package-owned object。

输出：

```json
{
  "sharedObject": true,
  "requestedPath": "Project::CM_AVH",
  "ownerPath": "PlatformLibrary\\Package\\...\\CM_AVH",
  "targetOid": "040gpc83142g1no70o90q9iltgggg",
  "aliasPaths": [],
  "affectedProjects": [],
  "completeness": "complete",
  "fingerprint": "sha256:..."
}
```

#### 20.9.5 Plan 和确认

impact 必须进入：

```text
plan payload
plan fingerprint
approval message
approval receipt binding
write telemetry
final result
```

共享对象确认文本至少显示：

```text
Requested path
Canonical owner path
Target OID
Affected Project count
Affected Project paths
```

用户未通过专项 impact confirmation 时返回 `shared_object_confirmation_required`。

#### 20.9.6 Impact drift

commit 前重新计算 impact：

- fingerprint 相同：继续。
- consumer 增加、owner 变化或 completeness 下降：`target_impact_changed`，旧 approval 失效。
- consumer 减少也视为 plan evidence 变化，必须重新 plan。

#### 20.9.7 验收测试

1. Project alias 与 Package path 同 OID：sharedObject=true。
2. 通过 Project path 发起，确认显示 Package owner。
3. 未确认 shared impact：Bridge 不启动。
4. impact incomplete：blocked。
5. plan 后新增 consumer：commit stale。
6. 同一个 approval 不能用于不同 alias/不同 OID。

---

### 20.10 Bug 7：Confirmation contract 不一致

#### 20.10.1 Approval receipt

`ctx.ui.confirm()` 返回 true 后，由 extension 内部生成 receipt。模型和用户参数不能直接提供 receipt。

建议新增：

```text
packages/ascet-extension/src/edit/approval-store.ts
packages/ascet-extension/src/edit/approval-store.test.ts
```

结构：

```ts
interface AscetApprovalReceipt {
  version: 1;
  approvalId: string;
  tokenHash: string;
  action: string;
  planId: string;
  planFingerprint: string;
  databaseFingerprint: string;
  targetOid: string;
  targetImpactFingerprint: string;
  guardGeneration: number;
  sessionId: string;
  approvedAt: string;
  expiresAt: string;
  consumedAt?: string;
}
```

receipt TTL 建议 60 秒，必须小于或等于 plan TTL。

#### 20.10.2 统一确认状态机

```text
PLAN_READY
→ APPROVAL_REQUESTED
→ APPROVED_RECEIPT_CREATED
→ TARGET_LOCK_ACQUIRED
→ RECEIPT_CONSUMED
→ PLAN_EXECUTING
→ BRIDGE_DISPATCHED
→ FINALIZED
```

消费顺序必须避免竞态：

1. 获取 target mutation lock。
2. 再次验证 guard generation、database、target、impact 和 plan fingerprint。
3. 原子消费 approval receipt。
4. 将 plan 标记 executing。
5. 写 operation journal `before_bridge`。
6. dispatch Bridge。

#### 20.10.3 进程中断语义

| 最后 journal 阶段 | 结论 |
|---|---|
| approval created，未取得 lock | not_started，可重新确认 |
| lock acquired，before_bridge=false | not_started，receipt 已消费，需重新确认 |
| before_bridge=true，bridge_entered=false | not_started 或可证明未启动 |
| bridge_entered=true，无 response | unknown + quarantine |
| response received，rollback 未完成 | 根据 backend result；无法证明则 quarantine |

#### 20.10.4 普通 executeWrite

`set_method_code(executeWrite=true)` 等普通写入必须内部执行：

```text
create ephemeral plan
→ backend preflight
→ resolve impact
→ request same approval
→ consume same receipt
→ execute
```

这样普通写入和 `apply_element_spec phase=commit` 不再使用两套授权语义。

#### 20.10.5 对话确认

对话中的“确认执行”只表示用户意图，不能直接作为数据库授权证据。系统必须满足以下之一：

1. 触发结构化 UI confirmation，并生成 receipt。
2. 平台提供可验证的 structured consent event，extension 将其转换为同样的 receipt。

普通聊天文本、模型转述或 `executeWrite=true` 字段不能生成 receipt。

#### 20.10.6 错误码

| 错误码 | 含义 |
|---|---|
| `approval_required` | 尚未产生结构化确认 |
| `approval_not_granted` | 用户拒绝 |
| `approval_expired` | receipt 过期 |
| `approval_consumed` | receipt 已使用 |
| `approval_binding_mismatch` | action/plan/database/target/impact 不匹配 |
| `approval_guard_generation_mismatch` | 确认后目标 guard 状态变化 |
| `approval_ui_unavailable` | 当前上下文无确认 UI |

#### 20.10.7 验收测试

1. apply_element_spec 和 set_method_code 使用相同 coordinator。
2. receipt 绑定错误 planId：拒绝。
3. receipt 绑定错误 target OID：拒绝。
4. receipt 过期：拒绝且 Bridge 不启动。
5. receipt 重放：拒绝。
6. impact fingerprint 改变：旧 receipt 失效。
7. guard generation 改变：旧 receipt 失效。
8. UI confirm=true 但 signal 在 dispatch 前 aborted：not_started，不写。

---

### 20.11 测试矩阵

#### 20.11.1 TypeScript focused tests

新增或扩展：

```text
packages/ascet-extension/src/edit/mutation-coordinator.test.ts
packages/ascet-extension/src/edit/mutation-guard-store.test.ts
packages/ascet-extension/src/edit/approval-store.test.ts
packages/ascet-extension/src/edit/plan-store.test.ts
packages/ascet-extension/src/edit/service.test.ts
packages/ascet-extension/src/edit/verification.test.ts
packages/ascet-extension/src/edit/write-telemetry.test.ts
packages/ascet-extension/src/edit/target-impact.test.ts
packages/ascet-extension/src/tools/edit/schema.test.ts
```

必须覆盖：状态机、原子文件写入、并发锁、过期、重放、alias OID、impact drift 和 guard generation。

#### 20.11.2 C# non-live tests

新增：

```text
ascetcli/tests/AscetTargetResolverContractTest.cs
ascetcli/tests/AscetElementMutationTransactionTest.cs
ascetcli/tests/AscetElementSpecPreflightContractTest.cs
ascetcli/tests/AscetMethodConsistencyContractTest.cs
ascetcli/tests/AscetTargetImpactContractTest.cs
```

使用 fake/faux ToolAPI adapter 注入：

- 第 N 个 create 失败。
- rollback remove 失败。
- Data Item unresolved。
- Impl Item unresolved。
- Project child 与 Package object 同 OID。
- native consistency validator 返回 missing symbol。

#### 20.11.3 Isolated Live tests

只能在独立 fixture 下执行：

```text
PI_LIVE_TOOLS_TX_<runId>
```

测试顺序：

1. 创建 isolated Folder/Class/Enumeration。
2. 验证三种 target resolver 输入返回同一 OID。
3. 执行 Element happy path。
4. 启用 failure injection，验证 4→0 rollback。
5. 注入 rollback failure，验证 quarantine。
6. 验证同 OID alias 后续写入被阻止。
7. reconcile rollback_to_before。
8. 写入引用缺失 Element 的 Method，验证旧代码恢复。
9. 构造 shared alias impact，验证专项确认。
10. 逆序 cleanup。
11. 确认 fixture 不存在、database identity 不变、unexpectedWrites=0。

#### 20.11.4 禁止的测试方式

- 不在真实业务 Component 上制造部分失败。
- 不通过人工删除残留项来把 case 标记为 PASS。
- 不把 rollback failed 的 case 当成“预期失败所以通过”；必须同时验证 quarantine。
- 不复用旧 plan 或旧 approval receipt。

---

### 20.12 实施顺序和依赖

```text
Phase 0  冻结当前失败复现与结果契约
   ↓
Phase 1  Shared Target Resolver + identity contract
   ↓
Phase 2  Mutation Guard Store + target lock + operation journal
   ↓
Phase 3  Plan v3 + Approval Receipt + Mutation Coordinator
   ↓
Phase 4  Element Spec authoritative preflight
   ↓
Phase 5  Element compensating transaction and rollback
   ↓
Phase 6  Method consistency validation and rollback
   ↓
Phase 7  Shared-object impact resolver and impact confirmation
   ↓
Phase 8  Focused tests + Bridge non-live + npm run check
   ↓
Phase 9  Read-only Live resolver/impact validation
   ↓
Phase 10 Isolated failure-injection write/rollback/quarantine/reconcile
```

优先级说明：

- P0 业务行为仍是最高优先级。
- 但原子写入必须依赖 stable target OID 和 quarantine，因此先完成 resolver/guard 基础层。
- shared impact 与 confirmation 最后接入，但 approval receipt 基础必须在所有写入重构前完成。

### 20.13 分阶段提交建议

建议拆分提交，避免一个提交同时改变所有安全边界：

```text
1. feat: add shared ASCET target resolver
2. feat: add persistent mutation quarantine guard
3. fix: bind mutation approval to plan and target identity
4. fix: validate element data and implementation during preflight
5. fix: make element spec mutation compensating-atomic
6. fix: validate method symbol and component consistency
7. fix: warn and confirm shared ASCET object impact
8. test: add isolated mutation failure and reconciliation coverage
9. docs: update live tools safety and release gates
```

每个代码提交都必须运行对应 focused tests；涉及 TypeScript/C# 代码的最终集成提交必须运行：

```text
focused node tests
ASCET Bridge non-live tests
npm run check
```

### 20.14 Definition of Done

七个问题只有同时满足以下条件才能标记 `FIXED`：

1. 四 Element 第四项失败后，独立 readback 证明没有留下前三项。
2. rollback 成功返回 rolled_back；rollback 失败返回 unknown 并锁定 OID。
3. unknown 后任何 alias path 的 mutation 都被 `target_quarantined` 阻止。
4. Method 引用缺失 Element 时不能返回 readbackVerified=true。
5. Method consistency 失败后旧代码恢复并通过独立回读。
6. Data/Implementation unresolved 时 preflight 不生成 planId。
7. get/read/edit/editability 对 Project child 返回同一 target OID。
8. Project alias 与 Package path 同 OID 时 plan 显示 owner 和 affectedProjects。
9. impact incomplete 时禁止共享对象写入。
10. 所有 mutation 使用 plan-bound、target-bound、impact-bound receipt。
11. approval 过期、篡改、重放、跨 target 使用全部被拒绝。
12. focused tests、Bridge non-live tests 和 `npm run check` 全部通过。
13. isolated failure-injection、rollback、quarantine、reconcile 和 cleanup 全部通过。
14. fixture 精确清理，原数据库 identity 不变，unexpectedWrites=0。
15. 外部 Bug Report 和测试计划包含 case-level 证据，而不是只引用整体 PASS。

在以上 15 项全部具备证据之前，本节整体状态保持：

```text
NOT FIXED
```

### 20.15 与四项 Root Fix 的范围关系

以下四项基础缺陷已通过独立方案和新的 Live run 完成修复：

```text
Plan consume lock ownership
Runtime Evidence Ledger Event v2
Catalog base-ref breaking gate
Database mandatory collector completeness proof
```

权威证据：

```text
docs/2026-08-11-ascet-live-tools-root-fix-development-plan.md
output/live-tools/20260811-root-fix-live-ED3C9BC9/completion-audit.md
```

该完成状态不改变本节七项更大范围 mutation atomicity/rollback/quarantine 方案的 `NOT FIXED` 状态，两者范围必须分开审计。
