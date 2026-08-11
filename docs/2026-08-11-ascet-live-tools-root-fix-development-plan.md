# ASCET Live Tools 根本修复开发方案

## 1. 文档信息

| 项目 | 内容 |
|---|---|
| 文档名称 | ASCET Live Tools Root Fix Development Plan |
| 创建日期 | 2026-08-11 |
| 当前状态 | FIXED / LIVE VERIFIED |
| 关联方案 | `docs/2026-08-11-ascet-live-tools-development-fix-plan.md` |
| 关联根因分析 | `docs/2026-08-11-ascet-live-tools-bug-fix-plan.md` |
| 修复原则 | 最少改动，修复核心不变量，不引入不必要架构 |

## 2. 修复目标

本轮关闭以下未完成问题：

1. Plan 竞争者会删除其他消费者持有的 consume lock。
2. 普通写入和 cleanup 没有进入原始 runtime telemetry。
3. Catalog optional 变化被误判为 breaking，且更新 snapshot 可以绕过 breaking gate。
4. Catalog 仍存在手写 input schema override。
5. Database Tree 的 complete 缺少 collector 完成证明。
6. 完成审计使用人工整理后的 Ledger，而不是原始 runtime telemetry 的直接聚合结果。

## 3. 非目标

本轮不执行以下工作：

- 不升级 Plan Record 版本。
- 不重写 Plan/Commit 状态机。
- 不引入数据库或新的持久化框架。
- 不建立多阶段事件流框架。
- 不重构所有 Action result descriptor。
- 不执行完整历史 Live 测试。
- 不修改无关 package、lockfile 或其他并行会话文件。

## 4. 核心不变量

```text
1. 一个 Plan 最多进入一次 Bridge。
2. 未持有 consume lock 的调用方不得删除该 lock。
3. 所有写入事实必须直接来自 runtime execution boundary。
4. Ledger 只能聚合原始事件，不能修改或过滤事件。
5. Catalog breaking 判断必须与外部 Git 基线比较。
6. Database complete 必须包含 collector completed 证明。
```

---

## 5. Phase 0：建立回归基线

### 5.1 工作

记录：

```text
git status
相关 focused tests
ASCET Bridge non-live tests
Catalog snapshot check
原始 telemetry 与整理后 Ledger 差异
```

在新验证完成前，状态统一调整为：

```text
Overall: REOPENED
Live functional validation: PASS
Plan concurrency: PENDING
Runtime Evidence Ledger: PENDING
Catalog breaking gate: PENDING
Database collector proof: PENDING
```

### 5.2 退出条件

- 每个已知问题都有失败测试或稳定复现方式。
- 当前工作区边界已确认。
- 不覆盖旧 Live evidence。

---

## 6. Phase 1：修复 Plan consume lock

### 6.1 文件范围

```text
packages/ascet-extension/src/edit/plan-store.ts
packages/ascet-extension/src/edit/plan-store.test.ts
packages/ascet-extension/src/edit/service.test.ts
```

### 6.2 实现

当前缺陷：调用方未成功获取 lock 时，`finally` 仍可能删除其他消费者持有的 lock。

最小修复：只有成功执行 `openSync(lockPath, "wx")` 的调用方才能删除 lock。

```ts
let lockHandle: number | undefined;

try {
	try {
		lockHandle = openSync(lockPath, "wx");
	} catch (error) {
		if (this.isFileExistsError(error)) {
			throw new AscetPlanStoreError(
				"plan_busy",
				`Plan is currently being consumed: ${planId}`,
				{ planId },
			);
		}
		throw error;
	}

	const record = this.readRecord(planId);
	this.assertAvailable(record);
	this.assertMatches(record, input);

	const consumedRecord = {
		...record,
		consumedAt: assertDate(this.now(), "now").toISOString(),
	};
	this.writeRecord(filePath, consumedRecord);
	return consumedRecord;
} finally {
	if (lockHandle !== undefined) {
		closeSync(lockHandle);
		if (existsSync(lockPath)) unlinkSync(lockPath);
	}
}
```

保留 Plan v2 和现有 `consumedAt` 协议。

### 6.3 对外语义

文档中的严格 `exactly-once` 改为：

```text
single-dispatch / at-most-once Bridge entry
```

规则：

- consume 必须发生在 Bridge 前。
- consumed Plan 不允许 replay。
- Bridge 已进入但没有可靠结果时返回 `outcome_unknown`。
- `outcome_unknown` 禁止自动重试，必须执行独立读取和人工恢复。

### 6.4 测试

```text
PL-001 plan_busy 后现存 lock 仍存在
PL-002 成功 consume 后由 lock owner 释放 lock
PL-003 consumed Plan 不能再次 consume
PL-004 commit replay 在进入 Bridge 前被拒绝
PL-005 Bridge 后 unknown outcome 不允许 replay
```

### 6.5 验证命令

```powershell
npx tsx --test packages/ascet-extension/src/edit/plan-store.test.ts
npx tsx --test packages/ascet-extension/src/edit/service.test.ts
```

### 6.6 退出条件

- 竞争失败者不再删除其他消费者的 lock。
- 一个 Plan 最多有一个成功 consume。
- replay 不会进入 Bridge。

---

## 7. Phase 2：统一 Runtime Telemetry

### 7.1 文件范围

```text
packages/ascet-extension/src/edit/service.ts
packages/ascet-extension/src/edit/write-telemetry.ts
packages/ascet-extension/src/edit/write-telemetry.test.ts
packages/ascet-extension/src/edit/service.test.ts
scripts/generate-ascet-write-ledger.ts
```

### 7.2 统一记录入口

将当前 `runAscetMutation()` 的执行主体提取为：

```ts
async function runAscetMutationCore(...): Promise<AscetEditResult>
```

外层 `runAscetMutation()` 统一完成：

```text
1. 记录 startedAt
2. 创建 lifecycle evidence
3. 包装 options.onLifecycle
4. 调用 runAscetMutationCore
5. 根据最终 result 和 raw execution classification 记录一次 telemetry event
6. 返回原 result
```

不再只为 `apply_element_spec` 和 `set_element_dependency` 单独记录 telemetry。

统一覆盖：

```text
create_folder
create_component
create_method
apply_element_spec
set_element_dependency
set_enumerators
delete_component
delete_folder
```

Cleanup 继续通过环境变量分类：

```text
PI_ASCET_WRITE_CLASS=cleanup
```

### 7.3 Lifecycle helper

新增内部 helper：

```ts
function withLifecycleTracking(
	options: RunAscetEditOperationOptions,
	lifecycle: AscetWriteLifecycleEvidence,
): RunAscetEditOperationOptions
```

捕获：

```text
before_bridge
bridge_entered
backend_response_received
```

`bridgeEntered` 必须来自真实 lifecycle callback，不能从 mutation status 推导。

### 7.4 Event v2

每次工具调用记录一个最终 attempt event：

```ts
interface AscetWriteTelemetryEventV2 {
	version: 2;
	timestamp: string;
	operation: string;
	phase: "plan" | "commit" | "execute";
	outcome: AscetWriteTelemetryOutcome;
	durationMs: number;
	runId?: string;
	phaseId?: string;
	caseId?: string;
	attemptId?: string;
	planId?: string;
	writeClass?: "read_only" | "isolated_fixture" | "cleanup" | "unexpected";
	bridgeEntered: boolean;
	backendResponseReceived: boolean;
	mutationStarted: boolean;
	writesPerformed: boolean;
	cleanupRequired: boolean;
}
```

将 runtime 写入的事件版本从 `1` 改为 `2`。

### 7.5 自动 Ledger 生成

新增：

```text
scripts/generate-ascet-write-ledger.ts
```

输入：

```text
artifacts/telemetry/element-write.jsonl
```

输出：

```text
50-evidence-ledger.json
51-evidence-ledger-summary.json
```

规则：

1. 验证每条 event 的 `version=2`。
2. 保留全部成功和失败 attempt。
3. 不修改任何 lifecycle、mutation 或 outcome 字段。
4. Ledger event count 必须等于 raw JSONL event count。
5. Summary 使用 `aggregateAscetWriteTelemetry()` 生成。
6. Summary 保存 raw JSONL 的 SHA-256。
7. 生成文件禁止人工修正。

### 7.6 测试

```text
EV-001 普通 create 写入生成 telemetry
EV-002 普通 delete 写入生成 telemetry
EV-003 set_enumerators 生成 telemetry
EV-004 plan 和 commit 分别生成 telemetry
EV-005 cleanup 使用 writeClass=cleanup
EV-006 failed attempt 被保留
EV-007 raw event count 等于 Ledger event count
EV-008 所有新事件 version=2
EV-009 unknown outcome 设置 cleanupRequired=true
```

### 7.7 验证命令

```powershell
npx tsx --test packages/ascet-extension/src/edit/write-telemetry.test.ts
npx tsx --test packages/ascet-extension/src/edit/service.test.ts
```

### 7.8 退出条件

- 所有 public write Action 自动生成 telemetry。
- Cleanup 不再依赖人工补写 Ledger。
- Ledger 可以从 raw JSONL 完整重建。

---

## 8. Phase 3：修复 Catalog Diff 和 Breaking Gate

### 8.1 文件范围

```text
packages/ascet-extension/src/tools/actions/catalog.ts
packages/ascet-extension/src/tools/actions/catalog.test.ts
scripts/generate-ascet-action-catalog-snapshot.ts
package.json
```

### 8.2 删除 input schema override

从 `ActionOverride` 删除：

```ts
schema?: AscetActionCatalogEntry["schema"];
```

删除现有手写 input schema。Catalog input schema 必须全部从 TypeBox schema registry 推导。

本轮暂时保留 result override，避免扩大修改范围。Result 仍参与 fingerprint 和 breaking comparison。

### 8.3 稳定 variant key

禁止使用完整 variant JSON 作为 key。

```ts
function schemaVariantKey(variant: CatalogVariant): string {
	return Object.entries(variant.when ?? {})
		.sort(([left], [right]) => left.localeCompare(right))
		.flatMap(([key, values]) => [...values].sort().map((value) => `${key}=${value}`))
		.join("|");
}
```

按 key 比较对应 variant：

```text
旧 key 不存在于当前 snapshot => variant_removed
同一 key required 新增         => breaking
同一 key enum 删除             => breaking
同一 key optional 新增         => non-breaking
新 key                          => non-breaking variant added
```

### 8.4 Base-ref breaking gate

保留现有：

```text
--check
```

新增：

```text
--check-breaking <base-ref>
```

实现步骤：

```text
1. git show <base-ref>:packages/ascet-extension/contracts/catalog-snapshot.json
2. 解析 base snapshot
3. 生成当前 runtime snapshot
4. 调用 diffActionCatalogSnapshots(base, current)
5. breakingSchemaChange=true 时退出非零
6. 输出 Action ID、classification 和 reasons
```

Root scripts：

```json
{
  "check:ascet-action-catalog": "tsx scripts/generate-ascet-action-catalog-snapshot.ts --check",
  "check:ascet-action-catalog-breaking": "tsx scripts/generate-ascet-action-catalog-snapshot.ts --check-breaking"
}
```

CI 必须传入 PR base SHA。重新生成当前 snapshot 不能绕过 base snapshot comparison。

### 8.5 测试

```text
CAT-001 optional 新增不阻断
CAT-002 required 新增阻断
CAT-003 enum 删除阻断
CAT-004 variant 删除阻断
CAT-005 Action 新增不阻断
CAT-006 相同 discriminator key 不因 optional 变化而消失
CAT-007 Catalog 不存在手写 input schema override
CAT-008 当前 snapshot 更新后，base breaking comparison 仍然失败
```

### 8.6 验证命令

```powershell
npx tsx --test packages/ascet-extension/src/tools/actions/catalog.test.ts
npm run check:ascet-action-catalog
```

### 8.7 退出条件

- Optional 新增不会被误判为 `variant_removed`。
- Breaking change 无法通过更新当前 snapshot 绕过。
- Catalog input schema 只有一个来源。

---

## 9. Phase 4：补齐 Database Collector Proof

### 9.1 文件范围

```text
ascetcli/src/AscetCopilot/Services/Get/AscetGetService.cs
ascetcli/tests/AscetDatabaseCatalogContractTest.cs
packages/ascet-extension/src/database-catalog/tree-source.ts
packages/ascet-extension/src/database-catalog/tree-source.test.ts
```

### 9.2 C# traversal state

保留现有一次 Database Tree 遍历，不建立多套扫描器。

增加：

```csharp
public bool ProjectCollectionCompleted { get; set; }
public bool FolderCollectionCompleted { get; set; }
public bool ComponentCollectionCompleted { get; set; }
public bool EnumerationCollectionCompleted { get; set; }
```

数据库级遍历完整结束后设置为 `true`。对应采集 API 返回 `null`、抛错或遍历提前终止时保持 `false`，并记录 collector error。

### 9.3 Coverage 输出

```json
{
  "collectors": {
    "projects": {
      "completed": true,
      "itemCount": 12
    },
    "folders": {
      "completed": true,
      "itemCount": 1855
    },
    "components": {
      "completed": true,
      "itemCount": 8065
    },
    "enumerations": {
      "completed": true,
      "itemCount": 708
    }
  }
}
```

`complete_for_scope` 必须要求：

```text
ProjectCollectionCompleted
FolderCollectionCompleted
ComponentCollectionCompleted
EnumerationCollectionCompleted
无 collector error
无 mandatory identity 缺失
not truncated
```

Project collector 完成但返回零项时，Tree 仍可以是 complete；这表示数据库确实没有 Project，而不是 collector 没有执行。

### 9.4 TypeScript source validation

`tree-source.ts` 增加：

```text
collectors.projects.completed == true
collectors.folders.completed == true
collectors.components.completed == true
collectors.enumerations.completed == true
```

缺失时返回：

```text
database_collector_incomplete
```

Parameter Class 请求继续要求至少一个 Project identity：

```text
project_identity_required
```

### 9.5 测试

```text
DBC-001 Project collector 未完成时 Tree 不得 complete
DBC-002 任意 mandatory collector error 时 Tree 为 partial
DBC-003 collector 完成但 Project 数量为零时 Tree 可 complete
DBC-004 Project 数量为零时 Parameter Class Catalog 被拒绝
DBC-005 全部 collector 完成时 Tree source 通过
DBC-006 missing OID/path 时不得 complete
```

### 9.6 验证命令

```powershell
npx tsx --test packages/ascet-extension/src/database-catalog/tree-source.test.ts
npx tsx --test packages/ascet-extension/src/database-catalog/catalog-service.test.ts
& 'ascetcli/scripts/test-ascet-bridge.ps1'
```

### 9.7 退出条件

- Database complete 包含明确 collector proof。
- Collector 未执行和 collector 返回零项可以明确区分。
- Parameter Class Catalog 不会消费缺少 Project collector proof 的 Tree。

---

## 10. Phase 5：Non-live 完整验证

按顺序运行：

```powershell
npx tsx --test <本轮修改的测试文件>
& 'ascetcli/scripts/test-ascet-bridge.ps1'
npm run check
```

要求：

```text
focused tests全部通过
Bridge non-live tests通过
Catalog snapshot check通过
Catalog breaking base check通过
npm run check errors=0
npm run check warnings=0
npm run check infos=0
```

不运行：

```text
npm test
npm run build
```

任一项失败不得进入 Live write。

---

## 11. Phase 6：最小 Live 回归

旧的 `output/live-tools/20260811-fix-validation` 作为历史证据保留，不覆盖、不删除。

创建新的验证目录：

```text
output/live-tools/<new-run-id>/
```

只执行受本轮修改影响的最小集合：

```text
1. runtime status
2. scheduler status
3. current database identity
4. database-scope Tree及collector proof
5. database_catalog
6. isolated fixture创建
7. apply_element_spec plan/commit/readback
8. set_element_dependency plan/commit/readback
9. set_enumerators write/readback
10. reverse cleanup
11. cleanup readback
12. final database identity
13. final runtime/scheduler status
14. 从raw telemetry自动生成Ledger和Summary
```

必须验证：

```text
raw telemetry event count == generated Ledger event count
raw telemetry SHA-256 == Summary记录值
失败attempt未被过滤
unexpectedWrites=0
unknownOutcome=false
cleanupRequired=false
fixtureRemaining=false
final database identity unchanged
```

---

## 12. 文档闭环

新验证通过后更新：

```text
docs/2026-08-11-ascet-live-tools-development-fix-plan.md
docs/2026-08-11-ascet-live-tools-bug-fix-plan.md
output/live-tools/<new-run-id>/completion-audit.md
C:\Repo\11_ASCETCopilotLiveTest\ASCET_Tools_Complete_Test_Plan.md
C:\Repo\11_ASCETCopilotLiveTest\output\live-tools\20260810_1342_019FEB\ASCET_Tools_Bug_Report.md
```

完成审计必须引用：

```text
raw telemetry路径
raw telemetry SHA-256
Ledger路径
Summary路径
focused test结果
Bridge test结果
npm run check结果
Live readback/diff/cleanup证据
```

---

## 13. 实施顺序

```text
1. Plan lock ownership修复
2. 统一write telemetry和Event v2
3. 自动Ledger生成
4. Catalog variant diff修复
5. Catalog base-ref breaking gate
6. 删除Catalog input schema override
7. Database collector completion proof
8. focused tests
9. Bridge non-live tests
10. npm run check
11. 最小Live回归
12. 文档和审计闭环
```

---

## 14. Definition of Done

```text
1. plan_busy不会删除其他消费者持有的lock
2. 一个Plan最多有一个成功consume
3. consumed Plan不能replay
4. 所有public write Action自动生成v2 telemetry
5. cleanup自动进入telemetry并正确分类
6. Ledger直接由raw JSONL生成
7. 失败attempt完整保留
8. raw event count和Ledger event count一致
9. optional新增不再被误判为variant_removed
10. required/enum/variant删除能够阻断
11. 更新当前snapshot不能绕过base breaking gate
12. Catalog不存在手写input schema override
13. Database complete包含mandatory collector proof
14. focused tests全部通过
15. ASCET Bridge non-live tests通过
16. npm run check无errors/warnings/infos
17. 新的最小Live write/readback/diff/cleanup通过
18. fixture最终不存在
19. 原数据库identity未改变
20. completion audit完全由原始机器证据支持
```

## 15. 最终交付物

```text
Plan consume lock修复
Plan并发回归测试
统一Event v2 telemetry
自动Ledger/Summary生成脚本
Catalog discriminator-based variant diff
Catalog base-ref breaking gate
Catalog input schema override清理
Database collector completion proof
focused tests结果
Bridge non-live结果
npm run check结果
新的最小Live验证目录
新的completion audit
更新后的测试计划和Bug Report
```

---

## 16. 2026-08-11 实施结果

### 16.1 当前状态

```text
Plan consume lock: FIXED / FOCUSED TEST PASS
Runtime Evidence Ledger: FIXED / LIVE VERIFIED
Catalog breaking gate: FIXED / CHECK PASS
Database collector proof: FIXED / LIVE VERIFIED
npm run check: PASS
Full ASCET Bridge non-live suite: PASS
Fresh Live revalidation: PASS
Overall: FIXED
```

### 16.2 最小实现清单

1. `AscetPlanStore.consume()` 只允许成功持有 `wx` lock 的调用方在 `finally` 中删除 lock；`plan_busy` 竞争者不再破坏持有者锁。
2. 所有 mutation Action 统一经过 `runAscetMutation()` lifecycle/telemetry 边界；Event 升级为 v2，普通写入、Plan、commit、cleanup 和异常逃逸均产生原始事件。
3. 异常在进入 Bridge 后逃逸时记录 `outcome_unknown`、`mutationStatus=unknown` 和 `cleanupRequired=true`，避免 Ledger 静默漏记不确定写入。
4. `generate-ascet-write-ledger.ts` 直接读取原始 JSONL，保留全部 attempt，并写入原始内容 SHA-256、Ledger 和 Summary。
5. Catalog variant identity 仅由 `when` discriminator 决定；optional 字段新增不再误报 variant removal。
6. Catalog input schema 全部从 descriptor 推导，删除手写 input schema override。
7. CI breaking gate 使用 PR base SHA 的历史 snapshot 与当前 runtime Catalog 比较；更新当前 snapshot 不能绕过 breaking 检查。
8. Database Tree 仍只遍历一次；遍历状态新增 projects/folders/components/enumerations 四类 collector completion proof。TypeScript Catalog source 在任一 proof 缺失或为 false 时拒绝 `complete` Tree。

### 16.3 已完成验证

```text
Focused TypeScript tests: 45/45 PASS
Database Catalog targeted C# contract: PASS
Full ASCET Bridge Milestone A non-live suite: PASS
Runtime Ledger CLI smoke: PASS (2 raw events retained, SHA-256 matched)
npm run check: PASS
Catalog snapshot check: PASS
Catalog base-ref breaking check against HEAD: PASS (non-breaking drift only)
git diff --check for task files: PASS
```

聚焦测试覆盖：

```text
plan-store.test.ts
write-ledger.test.ts
write-telemetry.test.ts
service.test.ts
catalog.test.ts
tree-source.test.ts
catalog-service.test.ts
```

### 16.4 Live 验证闭环

用户已明确授权最小 Live 写入验证。第一次 run `20260811-root-fix-live-8A8C254E` 发现 Bridge 前 `ui_required` 被误记为 unknown；fixture 已完整清理，该 run 保留为 `FAILED_DISCOVERY` 证据。

最小修复后，第二次 run 完整通过：

```text
runId: 20260811-root-fix-live-ED3C9BC9
fixture: PI_LIVE_ROOTFIX_20260811_ED3C9BC9
Database Tree traversal: 1
mandatory collectors: all completed
apply_element_spec: PASS
set_element_dependency: PASS
set_enumerators: PASS
reverse cleanup: PASS
fixtureRemaining: false
databaseIdentityMatches: true
rawEventCount: 19
ledgerEventCount: 19
rawSha256: 2402106d1e02754c4f0bb71a040e9a8d6b1e99871890d628e7063e6467e93338
failedAttemptRetained: true
failedAttemptSemanticsCorrect: true
unexpectedWrites: 0
unknownOutcome: false
cleanupRequired: false
```

权威完成审计：

```text
output/live-tools/20260811-root-fix-live-ED3C9BC9/completion-audit.md
```

### 16.5 最终关闭条件

```text
1. 明确 Live write 确认: PASS
2. 新 run isolated write/readback/diff/cleanup: PASS
3. raw telemetry 自动生成 Ledger/Summary: PASS
4. event count、SHA-256、unknownOutcome、cleanupRequired 核对: PASS
5. 新 completion audit 引用机器生成证据: PASS
```
