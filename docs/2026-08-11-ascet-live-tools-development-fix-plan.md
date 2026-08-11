# ASCET Live Tools 完整开发修复方案

## 1. 文档信息

| 项目 | 内容 |
|---|---|
| 文档名称 | ASCET Live Tools Complete Development Fix Plan |
| 创建日期 | 2026-08-11 |
| 关联根因方案 | `docs/2026-08-11-ascet-live-tools-bug-fix-plan.md` |
| 当前状态 | FIXED：non-live、read-only Live、isolated write/readback/diff/cleanup 全部验证通过 |
| 修复范围 | Bug-001、Bug-002、Bug-003、Bug-004、Bug-006、Plan/Commit、Evidence、Live closure |

## 1.1 实施进度

| Phase | 状态 | 证据 |
|---|---|---|
| Phase 0 | COMPLETED | 已确认并行工作区边界，仅修改 ASCET 修复相关文件 |
| Phase 1 | IMPLEMENTED / NON-LIVE VERIFIED | 共享 write-control、schema registry、discriminator-first validation 已完成 |
| Phase 2 | IMPLEMENTED / NON-LIVE VERIFIED | Plan record v2、contract/database/target/evidence fingerprints、过期/消费/原子锁、旧版本拒绝均已完成 |
| Phase 3 | IMPLEMENTED / NON-LIVE VERIFIED | 新增轻量 `get_database_identity`；Database Tree root/collector/identity/truncation completeness gate 已完成 |
| Phase 4 | COMPLETED / LIVE VERIFIED | Enumeration 自动与独立回读均已按名称和顺序验证 |
| Phase 5 | IMPLEMENTED / NON-LIVE VERIFIED | Catalog snapshot、result/object-kind/variant breaking gate 已接入 `npm run check` |
| Phase 6 | IMPLEMENTED / NON-LIVE VERIFIED | Evidence 支持 run/phase/case/attempt 聚合；Bridge lifecycle 来自 CLI 执行边界，并增加写入分类桶 |
| Phase 7 | COMPLETED | focused tests 103/103、Bridge non-live tests、`npm run check` 均通过 |
| Phase 8 | COMPLETED | Read-only Live、Catalog 全量扫描、Enumeration 独立读取、bounded/mismatch 负向验证和最终健康检查均通过 |
| Phase 9 | COMPLETED | `apply_element_spec`、`set_element_dependency`、`set_enumerators` 隔离写入、双重回读和逆序清理全部通过 |
| Phase 10 | COMPLETED | 完成审计、外部测试计划和 Bug Report 已更新为 `FIXED` |

## 2. 修复目标

| 范围 | 目标 |
|---|---|
| Bug-001 | Database Tree 具备可信的 database scope、identity 和 completeness |
| Bug-002 | Public schema、validator、catalog、dispatcher 使用同一契约来源 |
| Bug-003 | Enumeration object-kind、读取和写后验证闭环 |
| Bug-004 | Catalog snapshot、兼容性 diff 和 CI gate 完整落地 |
| Bug-006 | 所有 plan-managed Action 的 schema 和运行时行为一致 |
| Plan/Commit | 绑定 contract、database、target、preflight evidence，并保证 exactly-once |
| Evidence | 按 run/phase/case/attempt 记录真实 Bridge 和写入结果 |
| Live closure | Read-only、isolated write、readback、diff、cleanup 全部取得独立证据 |

## 3. 执行原则

1. 不修改或清理其他并行会话文件。
2. 不运行 `npm test` 或 `npm run build`。
3. 每次修改测试文件后立即运行对应 focused test。
4. 每阶段完成后运行 `npm run check`。
5. Phase 1 至 Phase 6 完成前不执行任何 ASCET 数据库写入。
6. Live write 只允许 serial-only、isolated fixture、用户明确确认、automatic readback、independent readback/diff 和 reverse cleanup。
7. 不保留旧 public contract 的兼容行为，除非明确需要 R0 过渡。
8. 不直接修改其他会话产生的 release、lockfile 或无关 C# 文件。

---

## 4. Phase 0：冻结本轮修改范围

### 工作

记录：

```text
git status
git diff --name-only
git diff --stat
当前源码 commit
当前 extension/package 版本
当前 runtime bundle 版本
```

本轮允许修改：

```text
packages/ascet-extension/src/**
packages/ascet-extension/scripts/**
packages/ascet-extension/contracts/**
ascetcli/src/AscetCopilot/**
ascetcli/tests/**
docs/2026-08-11-ascet-live-tools-bug-fix-plan.md
docs/2026-08-11-ascet-live-tools-development-fix-plan.md
```

不处理其他 package、release 或 lockfile 修改。

### 退出条件

```text
本轮文件清单明确
不覆盖其他会话未提交内容
当前 catalog/schema 基线 artifact 已保存
```

---

## 5. Phase 1：统一 Public Action Contract

### 5.1 建立共享 write-control schema

新增：

```text
packages/ascet-extension/src/edit/write-control-contract.ts
```

目标结构：

```ts
export interface AscetPublicWriteControl {
	executeWrite?: boolean;
}

export const ascetWriteControlProperties = {
	executeWrite: Type.Optional(Type.Boolean()),
};
```

替换：

```text
packages/ascet-extension/src/edit/service.ts 中本地 writeControlSchema
packages/ascet-extension/src/element-spec-contract.ts 中 plan/commit schema
```

必须覆盖：

```text
set_element_dependency plan
set_element_dependency commit
apply_element_spec create plan
apply_element_spec patch plan
apply_element_spec upsert plan
apply_element_spec restore plan
apply_element_spec commit
```

R0 阶段允许 `executeWrite`，但不改变状态机：

```text
phase=plan   始终只做 preflight
phase=commit 才可能申请确认并写入
```

### 5.2 建立 schema variant registry

新增：

```text
packages/ascet-extension/src/tools/actions/schema-registry.ts
packages/ascet-extension/src/tools/actions/schema-registry.test.ts
```

最低结构：

```ts
interface AscetPublicActionVariant {
	tool: string;
	action?: string;
	mode?: string;
	phase?: string;
	intent?: string;
	name: string;
	schema: TSchema;
}

interface AscetPublicActionContract {
	id: string;
	tool: string;
	action: string;
	variants: readonly AscetPublicActionVariant[];
}
```

Registry 直接引用 TypeBox variant，不重新编写 required、optional、enum、phase、mode 或 intent。

### 5.3 完整 discriminator-first validation

重构：

```text
packages/ascet-extension/src/tools/_shared/validation.ts
```

执行顺序：

```text
1. params 必须为 object
2. 识别 tool 主 discriminator：action 或 mode
3. 未知 action 直接返回 unknown_action
4. 选中 action 后识别 phase/mode/intent
5. 未知 variant 返回 invalid_variant
6. 只对选中的 variant 执行 Value.Check
7. 只返回该 variant 的错误
8. 对重复 TypeBox errors 去重
```

目标错误：

```json
{
  "code": "ascet_invalid_parameters",
  "tool": "ascet_edit",
  "action": "apply_element_spec",
  "variant": "commit",
  "errors": [
    {
      "keyword": "required",
      "path": "/planId",
      "message": "planId is required"
    }
  ]
}
```

未知 Action：

```json
{
  "code": "unknown_action",
  "tool": "ascet_edit",
  "action": "does_not_exist"
}
```

不得返回其他 Action 的 `folderPath`、`componentPath` 或 `methodName` 错误。

### 5.4 测试矩阵

修改或新增：

```text
packages/ascet-extension/src/tools/edit/schema.test.ts
packages/ascet-extension/src/tools/edit/definition.test.ts
packages/ascet-extension/src/tools/_shared/validation.test.ts
```

| Case | 输入 | 预期 |
|---|---|---|
| S-001 | `set_element_dependency` plan，无 `executeWrite` | 通过 |
| S-002 | `set_element_dependency` plan，`executeWrite=false` | 通过 |
| S-003 | `set_element_dependency` commit，`executeWrite=true` | 通过 |
| S-004 | `apply_element_spec` 四种 plan intent，`executeWrite=false` | 通过 |
| S-005 | `apply_element_spec` commit，`executeWrite=true` | 通过 |
| S-006 | 已知 Action 带非法字段 | 只返回选中 Action 错误 |
| S-007 | unknown Action | 返回 `unknown_action` |
| S-008 | invalid phase | 返回选中 Action 的 variant 错误 |
| S-009 | `mode=check/set` | 不泄露 Action schema errors |

### 退出条件

```text
所有 plan-managed Action 的 public type/schema 一致
未知 Action 不再运行整个 union
Capabilities 与 validator 使用同一 variant registry
```

---

## 6. Phase 2：Plan/Commit 写入安全协议

### 6.1 Plan record v2

重构：

```text
packages/ascet-extension/src/edit/plan-store.ts
packages/ascet-extension/src/edit/plan-store.test.ts
```

目标结构：

```ts
interface AscetPlanRecordV2 {
	version: 2;
	planId: string;
	operation: string;
	params: AscetPlanJsonValue;
	binding: {
		workspace: string;
		agentId: string;
		sessionId: string;
	};
	databaseIdentity: {
		name?: string;
		path: string;
		fingerprint: string;
	};
	targetIdentity: {
		path: string;
		oid: string;
		kind: string;
	};
	backendPreflight: AscetPlanJsonValue;
	evidenceFingerprint: string;
	contractFingerprint: string;
	planFingerprint: string;
	createdAt: string;
	expiresAt: string;
	consumedAt?: string;
}
```

旧 v1 plan 不兼容执行，返回：

```text
plan_version_unsupported
```

### 6.2 Fingerprint 分层

```text
contractFingerprint
  当前 Action selected variant 的规范化 public schema

evidenceFingerprint
  backend preflight + database identity + target identity

planFingerprint
  operation + params + binding + identity + evidence + contract
```

### 6.3 Plan 创建规则

```text
1. public schema validation
2. semantic validation
3. backend read-only preflight
4. 必须取得 database identity
5. 必须取得 target OID/path/kind
6. 计算 fingerprints
7. 保存 plan
8. mutationStarted=false
9. writesPerformed=false
```

缺失 identity：

```text
plan_database_identity_missing
plan_target_identity_missing
```

### 6.4 Commit 验证顺序

```text
1. planId 格式
2. record 存在
3. version=2
4. 未过期
5. 未消费
6. operation 匹配
7. workspace/agent/session binding 匹配
8. 当前 contractFingerprint 匹配
9. 当前 database identity 匹配
10. 重新执行 read-only preflight
11. target OID/path/kind 匹配
12. evidenceFingerprint 匹配
13. 用户确认
14. 原子 consume
15. 进入 Bridge
16. automatic readback
17. 写入 case ledger
```

### 6.5 Exactly-once

`consume()` 必须执行：

```text
读取未消费 record
验证 fingerprint
写入 consumedAt
原子 rename 替换
```

重复 commit 返回 `plan_consumed`。

未知执行结果：

```text
outcome_unknown
cleanupRequired=true
禁止自动重试
```

### 6.6 测试

| Case | 预期 |
|---|---|
| P-001 | plan 不写数据库 |
| P-002 | plan identity 完整 |
| P-003 | contract fingerprint 改变时阻止 commit |
| P-004 | database identity 改变时阻止 commit |
| P-005 | target OID 改变时阻止 commit |
| P-006 | operation mismatch 被拒绝 |
| P-007 | expired plan 被拒绝 |
| P-008 | consumed plan 被拒绝 |
| P-009 | 并发 consume 只有一个成功 |
| P-010 | readback mismatch 不返回成功 |

---

## 7. Phase 3：Database Scope、Identity 和 Completeness

### 7.1 Public schema

调整：

```text
packages/ascet-extension/src/get.ts
```

Database Tree variant：

```ts
{
	action: "tree";
	scope: "database";
	delivery: "stored";
}
```

`delivery=stored` 必须为 required literal。该 variant 不允许 inline、auto、target、traversal 或 filters。

### 7.2 Backend 请求限制

修改：

```text
ascetcli/src/AscetCopilot/Services/Get/AscetGetService.cs
```

```text
scope 只允许用于 get_tree
scope=database 不能与 oid/path/targetPathPrefix/depth/budget 混用
其他 operation 带 scope 必须返回 invalid_scope
```

### 7.3 独立 Database Identity Collector

拆分：

```text
CollectDatabaseIdentity
CollectProjectIdentities
CollectFolderIdentities
CollectComponentIdentities
CollectEnumerationIdentities
```

实现前必须检查现有 ToolAPI 类型和仓库用法，不猜测未验证 API。

Collector 记录：

```text
collectorStarted
collectorCompleted
collectionErrors
rootCollectionAvailable
projectCollectionAvailable
missingOidCount
missingPathCount
```

只有以下全部成立才能返回 `complete`：

```text
database identity 可用
root collection 调用成功
完整遍历完成
无 collector error
未被截断
mandatory identity collector 完成
```

`GetAllAscetFolders() == null` 必须返回：

```text
coverage.status=failed
coverage.completeness=failed
```

### 7.4 Coverage contract

```ts
interface AscetObservationCoverage {
	status: "complete_for_scope" | "partial" | "failed";
	scopeKind: "database" | "project" | "folder" | "component";
	scopeId: string;
	completeness: "complete" | "partial" | "failed";
	truncated: boolean;
	identityKinds: readonly string[];
	collectorErrors?: readonly string[];
}
```

### 7.5 Observation database identity

扩展：

```text
packages/ascet-extension/src/observation-store.ts
```

```ts
sourceIdentity?: {
	database?: {
		name?: string;
		path: string;
		fingerprint: string;
	};
};
```

`get.ts` 从 backend payload 的 `database` 写入 observation metadata。

### 7.6 Catalog source validation

修改：

```text
packages/ascet-extension/src/database-catalog/tree-source.ts
packages/ascet-extension/src/database-catalog/catalog-service.ts
packages/ascet-extension/src/database-catalog/types.ts
```

必须验证：

```text
domain == tree
scopeKind == database
completeness == complete
status == complete_for_scope
truncated == false
database identity 存在
database identity 与当前 live database 一致
```

Parameter Class 请求还必须存在至少一个 Project identity。

错误码：

```text
database_scope_required
database_identity_required
database_identity_mismatch
project_identity_required
full_tree_required
source_tree_data_missing
```

### 7.7 当前数据库 identity 获取

优先复用已有 status/runtime database identity。如果现有接口无法提供，增加只读 operation：

```text
get_database_identity
```

该操作不执行模型扫描，只返回当前 open database identity。

### 7.8 测试

| Case | 预期 |
|---|---|
| DBC-001 | 完整 database Tree 通过 |
| DBC-002 | null root collection 不得标记 complete |
| DBC-003 | bounded Tree 被拒绝 |
| DBC-004 | truncated Tree 被拒绝 |
| DBC-005 | Project identity 缺失返回明确错误 |
| DBC-006 | database identity mismatch 被拒绝 |
| DBC-007 | 非 Tree operation 使用 scope 被拒绝 |
| DBC-008 | database delivery 非 stored 被拒绝 |
| DBC-009 | local catalog 不执行完整 database scan |

---

## 8. Phase 4：Enumeration Object-kind 闭环

### 8.1 Public capability contract

Action descriptor 增加：

```ts
supportedObjectKinds: readonly AscetObjectKind[];
```

能力边界：

```text
ascet_get.tree                 支持 Enumeration identity
ascet_get.elements             不支持 Enumeration
ascet_read.read_implementation 支持 Enumeration
ascet_edit.set_enumerators     支持 Enumeration
```

`ascet_get.elements` 收到 Enumeration 时返回：

```json
{
  "code": "unsupported_target_kind",
  "action": "elements",
  "targetKind": "enumeration",
  "recover": {
    "tool": "ascet_read",
    "action": "read_implementation"
  }
}
```

### 8.2 Enumeration readback parser

新增：

```text
packages/ascet-extension/src/read/enumeration-readback.ts
packages/ascet-extension/src/read/enumeration-readback.test.ts
```

```ts
interface AscetEnumerationReadback {
	kind: "enumeration";
	path: string;
	oid?: string;
	typeDefinition: {
		enumerators: readonly string[];
	};
}
```

只验证 enumerator name 和 order，不生成或承诺 numeric value。

### 8.3 `set_enumerators` 自动验证

```text
1. automatic read_implementation
2. 比较 name/order
3. mismatch => partial/error，不能 success
4. 记录 expected/actual hash
```

Independent readback 必须再次执行 `read_implementation`，不能复用 automatic readback response。

### 8.4 测试

| Case | 预期 |
|---|---|
| E-001 | Tree 识别 Enumeration |
| E-002 | `read_implementation` 返回 name/order |
| E-003 | `elements` 对 Enumeration 返回明确能力边界 |
| E-004 | `set_enumerators` automatic readback 通过 |
| E-005 | independent readback 通过 |
| E-006 | order mismatch 不得标记成功 |
| E-007 | public contract 不承诺 numeric value |

---

## 9. Phase 5：Catalog Snapshot 和 Breaking Gate

### 9.1 Catalog entry 扩展

每个 Action 保存：

```ts
{
	id;
	visibility;
	risk;
	supportedObjectKinds;
	scopes;
	schema;
	result;
	schemaFingerprint;
	rulesFingerprint;
	resultFingerprint;
	contractFingerprint;
}
```

移除 `catalog.ts` 中所有手写 schema override，包括 capabilities override。

允许 override 的字段只有：

```text
intent
compact
useWhen
avoidWhen
aliases
nextActions
```

### 9.2 Variant identity

使用 discriminator key：

```text
action=set_element_dependency|phase=plan
action=set_element_dependency|phase=commit
action=apply_element_spec|phase=plan|intent=create
```

不能用完整 variant JSON 作为 variant key。

```text
新增 optional 字段 => non-breaking
删除 variant => breaking
variant required 增加 => breaking
```

### 9.3 Breaking 分类

必须阻断：

```text
action removed
public action hidden
required field added
enum value removed
variant removed
supportedObjectKind removed
scope removed
result shape changed
result required field removed
```

仅记录 drift：

```text
action added
optional field added
enum value added
rules 文案变化
few-shot 变化
alias 变化
```

### 9.4 持久化 snapshot

新增：

```text
packages/ascet-extension/contracts/catalog-snapshot.json
packages/ascet-extension/scripts/generate-action-catalog-snapshot.ts
```

支持：

```text
generate       更新 snapshot
--check        比较当前 registry 与 snapshot
--diff         输出 Action-level changes
```

### 9.5 CI/check gate

将 snapshot check 加入 `npm run check`。

Breaking change 时退出非零，并输出：

```text
Action id
variant
change type
before
after
```

### 9.6 测试

| Case | 预期 |
|---|---|
| C-001 | 相同 catalog fingerprint 稳定 |
| C-002 | Action 新增不阻断 |
| C-003 | required 新增阻断 |
| C-004 | enum 删除阻断 |
| C-005 | variant 删除阻断 |
| C-006 | optional 新增不阻断 |
| C-007 | result shape 改变阻断 |
| C-008 | object kind 删除阻断 |
| C-009 | rules 文案变化不阻断 |

---

## 10. Phase 6：Evidence Ledger

### 10.1 Event model

扩展：

```text
packages/ascet-extension/src/edit/write-telemetry.ts
```

```ts
interface AscetWriteLedgerEvent {
	version: 2;
	timestamp: string;
	runId: string;
	phaseId: string;
	caseId: string;
	attemptId: string;
	operation: string;
	phase: "plan" | "commit" | "execute" | "cleanup";
	bridgeEntered: boolean;
	mutationStarted: boolean;
	writesPerformed: boolean;
	cleanupRequired: boolean;
	writeOutcome:
		| "not_started"
		| "applied"
		| "no_change"
		| "rolled_back"
		| "rollback_failed"
		| "unknown";
	readbackOutcome?: "matched" | "mismatched" | "failed" | "not_run";
	cleanupOutcome?: "completed" | "failed" | "not_required" | "not_run";
}
```

### 10.2 不再推断 `bridgeEntered`

`bridgeEntered` 必须在 CLI/Bridge 调用边界实际设置，不能从 mutation status 反向推断。

生命周期：

```text
beforeBridge
bridgeEntered
backendResponseReceived
readbackStarted
readbackFinished
cleanupStarted
cleanupFinished
```

### 10.3 聚合结构

```ts
interface AscetWriteLedgerSummary {
	byRun: unknown;
	byPhase: unknown;
	byCase: unknown;
	byAttempt: unknown;
	bridgeEntered: boolean;
	mutationStarted: boolean;
	writesPerformed: boolean;
	unknownOutcome: boolean;
	cleanupRequired: boolean;
	readOnlyWrites: number;
	isolatedFixtureWrites: number;
	cleanupWrites: number;
	unexpectedWrites: number;
}
```

所有 summary 必须由事件生成，不能手工覆盖。

### 10.4 Unknown outcome

以下情况标记 unknown：

```text
timeout after Bridge entry
process disconnect
unparseable backend response after mutation start
```

处理：

```text
outcome=unknown
cleanupRequired=true
停止自动重试
保留 raw response/stderr
```

### 10.5 测试

| Case | 预期 |
|---|---|
| EV-001 | plan writes=0 |
| EV-002 | Bridge entered 但 mutation not started 可独立记录 |
| EV-003 | unknown outcome 保留 |
| EV-004 | phase/case/attempt 独立聚合 |
| EV-005 | cleanup 独立统计 |
| EV-006 | W-012 不能覆盖 W-007 |
| EV-007 | 手工全局布尔值不能覆盖 ledger |

---

## 11. Phase 7：Non-live 完整验证

按顺序运行：

```text
focused TypeScript tests
ASCET C# contract tests
ASCET Bridge non-live tests
npm run check
```

命令：

```powershell
npx tsx --test <modified-test-files>
& 'ascetcli/scripts/test-ascet-bridge.ps1'
npm run check
```

退出条件：

```text
0 errors
0 warnings
0 infos
所有 focused tests 通过
catalog snapshot check 通过
无意外 lockfile/package diff
```

---

## 12. Phase 8：Read-only Live 验证

不写数据库，串行执行：

```text
1. runtime status
2. scheduler status
3. current database identity
4. capabilities snapshot
5. database-scope Tree
6. coverage/identity 检查
7. database_catalog
8. Enumeration read_implementation
9. bounded Tree rejection
10. database mismatch rejection
11. final runtime/scheduler status
```

必须取得：

```text
database-scope Tree stored resultId
Project identity
database identity
coverage.completeness=complete
truncated=false
Enumeration enumerator name/order
```

任一项失败即停止，不进入 write。

---

## 13. Phase 9：Isolated Write Live 验证

仅使用隔离 fixture。

每个 case 独立执行：

```text
preflight
plan
检查 writes=0
用户确认
commit
automatic readback
independent readback/diff
reverse cleanup
cleanup readback
```

至少覆盖：

```text
set_element_dependency
apply_element_spec
set_enumerators
```

每个 case 保存：

```text
request
plan artifact
commit response
automatic readback
independent readback
diff
cleanup response
final readback
ledger events
```

禁止用一个 Action 的成功替代另一个 Action 的失败。

---

## 14. Phase 10：文档和报告闭环

更新：

```text
docs/2026-08-11-ascet-live-tools-bug-fix-plan.md
C:\Repo\11_ASCETCopilotLiveTest\ASCET_Tools_Complete_Test_Plan.md
C:\Repo\11_ASCETCopilotLiveTest\output\live-tools\20260810_1342_019FEB\ASCET_Tools_Bug_Report.md
```

状态只能按证据升级：

```text
IMPLEMENTED
LIVE-READY
LIVE-PENDING
FIXED
```

只有同时满足以下条件才能标记 `FIXED`：

```text
代码完成
focused tests 通过
npm run check 通过
read-only live 通过
isolated write/readback/diff/cleanup 通过
外部报告更新
原数据库无非预期修改
```

---

## 15. 推荐开发顺序

```text
1. apply_element_spec write-control schema
2. discriminator-first validator
3. plan record v2 + identity/fingerprints
4. database completeness 和 identity
5. Enumeration verification
6. catalog semantic diff + persisted snapshot
7. evidence ledger v2
8. 全部 non-live tests
9. read-only live
10. isolated write live
11. 文档和报告闭环
```

前四项为最高优先级。在它们完成前，不执行 live write 验证。

## 16. Definition of Done

```text
1. set_element_dependency 和 apply_element_spec public schema 与 TypeScript type 一致
2. unknown Action 不泄露其他 Action 的字段错误
3. Plan record 强制包含 contract/database/target/evidence identity
4. Commit 只执行未过期、未消费且 identity/fingerprint 一致的 Plan
5. Database Tree 不会把空结果或 collector failure 标记为 complete
6. database_catalog 验证 source database 与当前 live database 一致
7. Enumeration readback 验证 enumerator name/order
8. set_enumerators automatic 和 independent readback 均通过
9. Catalog result/object-kind/variant breaking change 能阻断
10. Catalog snapshot 可持久化、可重现并受 npm run check 约束
11. Evidence 按 run/phase/case/attempt 聚合
12. bridgeEntered 来自真实调用边界，不由 mutation status 推断
13. 所有 focused tests 和 ASCET Bridge non-live tests 通过
14. npm run check 通过且无 warnings/infos/errors
15. Read-only live regression 通过
16. Isolated write/readback/diff/cleanup 通过
17. 外部测试计划和 Bug Report 已更新
18. 原始共享数据库无非预期修改
```

## 17. 2026-08-11 实施与验证记录

### 17.1 简洁修复摘要

| 问题 | 已完成修复 |
|---|---|
| Database Tree / Catalog | 增加显式 database scope、数据库 identity、collector completeness；Catalog 扫描前后校验数据库身份，并为大型 Catalog 单独提高受限 stdout 上限 |
| Public schema / Bug-006 | write-control 使用共享契约；按 Action discriminator 先选 variant，再执行精确校验，合法 `executeWrite` 不再被拒绝 |
| Plan/Commit | Plan v2 绑定 contract、database、target、preflight evidence；增加过期、消费、重放、identity mismatch 和原子 consume 防护 |
| Enumeration | 明确 object-kind 边界；自动回读和独立回读统一比较 enumerator 名称及顺序 |
| Catalog compatibility | 持久化 Catalog snapshot，required/enum/variant/result/object-kind 破坏性变化会阻断检查 |
| Evidence | 按 run/phase/case/attempt 聚合；`bridgeEntered` 来源于真实 CLI 生命周期，区分只读、隔离写入、清理和意外写入 |

### 17.2 Non-live 验证

```text
focused TypeScript tests: 103/103 passed
ASCET Bridge non-live tests: passed
npm run check: passed
errors=0, warnings=0, infos=0
```

### 17.3 Read-only Live 验证

证据目录：

```text
output/live-tools/20260811-fix-validation/read-only
```

结果：

```text
runtime/ToolAPI/scheduler: healthy
CLI lock: false
Database Tree: 10,681 items, complete, not truncated
foldersVisited: 1,855
componentsScanned: 8,065
missingOidCount: 0
missingPathCount: 0
Database Catalog: 26,743 items
Parameter Classes: 951
Enumerations: 708
Modules: 428
Messages: 24,656
Enumeration independent read: enumerator name/order verified
bounded database Tree: rejected with invalid_scope
mismatched Catalog source database: rejected before catalog scan
every Bridge response: mutationStarted=false
```

关键证据：

```text
runtime-scheduler-initial.json
runtime-scheduler-final.json
database-identity.json
database-tree.json
database-tree-observation.json
database-catalog.json
enumeration-read-implementation.json
bounded-database-tree-rejection.json
database-catalog-identity-mismatch.json
```

### 17.4 Isolated Write Live 验证

隔离 fixture：

```text
PI_LIVE_FIX_20260811_13947C09
```

结果：

```text
apply_element_spec: plan/commit/automatic readback/independent readback PASS
set_element_dependency: plan/commit/automatic readback/independent readback PASS
set_enumerators: automatic readback/independent name-order diff PASS
reverse cleanup: Enumeration -> Class -> Folder PASS
fixture final state: folder_not_found
current database identity: unchanged
runtime/scheduler/CLI lock after cleanup: healthy / healthy / false
```

Evidence Ledger：

```text
eventCount: 12
isolatedFixtureWrites: 6
cleanupWrites: 3
unexpectedWrites: 0
unknownOutcome: false
cleanupRequired: false
```

Live 期间额外发现并修复：

1. `set_element_dependency` 的 Live dry-run identity 位于 `payload.identity`，且 `elementOID` 可为空；现使用精确 element path 和 stable component OID 形成 `component_element` identity。
2. `read_implementation` Live 输出使用 PascalCase `TypeDefinition.Enumerators`；独立 Enumeration parser 已按真实 Bridge 契约兼容。
3. managed telemetry 对成功 commit 的 mutation 状态及 plan lifecycle 记录不准确；现从 raw execution classification 和真实 lifecycle 记录。

最终验证：

```text
focused TypeScript tests: 104/104 passed
ASCET Bridge non-live tests: passed
npm run check: passed
```

权威完成审计：

```text
output/live-tools/20260811-fix-validation/completion-audit.md
```

当前状态：`FIXED`。


---

## 18. Root Fix 重新验证（2026-08-11）

原 `20260811-fix-validation` 不能证明 Plan lock ownership、Event v2 自动 Ledger、base-ref Catalog gate 和 mandatory collector proof，因此仅作为历史证据。

新的权威验证：

```text
runId: 20260811-root-fix-live-ED3C9BC9
fixture: PI_LIVE_ROOTFIX_20260811_ED3C9BC9
focused tests: 45/45 PASS
ASCET Bridge non-live: PASS
npm run check: PASS
Database Tree mandatory collectors: PASS
isolated writes/readback/diff: PASS
reverse cleanup: PASS
raw Event v2 count: 19
Ledger count: 19
raw SHA-256: 2402106d1e02754c4f0bb71a040e9a8d6b1e99871890d628e7063e6467e93338
failed attempt retained: true
unexpectedWrites: 0
unknownOutcome: false
cleanupRequired: false
fixtureRemaining: false
```

完成审计：

```text
output/live-tools/20260811-root-fix-live-ED3C9BC9/completion-audit.md
```

本文件中与四项 Root Fix 有关的结论以该 run 为准。状态：`FIXED`。
