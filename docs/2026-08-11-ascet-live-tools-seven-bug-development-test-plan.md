# ASCET Live Tools 七项 Bug 开发修复测试方案

## 1. 文档信息

| 项目 | 内容 |
|---|---|
| 日期 | 2026-08-11 |
| 基线提交 | `c86f95200 fix: harden ASCET live tool contracts and evidence` |
| 关联设计 | `docs/2026-08-11-ascet-live-tools-bug-fix-plan.md` 第 19、20 节 |
| 覆盖范围 | Element 原子写入、Method 一致性、Element preflight、unknown quarantine、统一 resolver、共享 OID 影响、统一 confirmation |
| 当前状态 | `FIXED / NON-LIVE PASS / STABLE ISOLATED LIVE PASS / CLEANUP COMPLETE` |
| 开发方式 | 按公共 seam 的纵向 TDD；每个切片执行 Red → Green，再进入 review |
| Live 边界 | 只允许 read-only Live 和 isolated fixture mutation；禁止业务 Component 写入 |

## 2. 测试目标

本方案验证的不是“调用没有抛异常”，而是以下用户可观察行为：

```text
1. 一次批量写入要么全部成功，要么恢复原状态。
2. Method 文本回读成功时，引用符号和 Component consistency 也必须成功。
3. preflight 不能生成一个 commit 时才会发现配置不可写的 plan。
4. unknown outcome 会阻止同一真实 OID 的所有后续写入。
5. 同一 target 在 get/read/edit/editability 中解析为同一 OID。
6. 共享对象实际写入前，由 ASCET Engineering Skill 根据当前上下文判断是否需要提示共享影响；不使用固定句式，不增加专项确认。
7. 确认必须绑定 plan、database、target、impact，并且只能使用一次。
```

## 3. TDD 执行规则

### 3.1 Red-Green 规则

每个开发切片严格执行：

```text
1. 先增加一个通过公共 seam 观察行为的失败测试。
2. 运行该测试，保存失败输出，确认失败原因与目标 Bug 一致。
3. 只实现让该测试通过的最小代码。
4. 重新运行该测试和当前切片已有回归测试。
5. Green 后停止增加功能，进入代码 review。
6. review 通过后才开始下一个切片。
```

禁止：

- 一次写完所有测试后再实现全部代码。
- 测试 private method 或内部字段布局。
- 用与生产代码相同算法重新计算 expected value。
- 通过删除断言、放宽状态或增加 sleep 让测试变绿。
- 在单元测试中调用真实 ASCET、真实 Provider API 或付费服务。

### 3.2 拟采用的公共测试 seams

实施前应确认以下 seams；测试只从这些边界观察行为。

| Seam | 公共入口 | 观察结果 |
|---|---|---|
| S1 Public Tool | `runAscetEdit` / `ascet_edit` | outcome、mutationStatus、verification、guard、approval、impact |
| S2 Bridge CLI | `AscetBridge.exe exec <operation> --json` | JSON envelope、错误码、rollback evidence、target identity |
| S3 Target Resolver | 公共 resolver service contract | requested/canonical path、OID、owner、alias、kind |
| S4 Persistent Safety State | Guard/Plan/Approval store 的公开 load/create/consume/reconcile API | 原子写入、过期、并发、重放和 generation |
| S5 Isolated Live | 对 fixture 的 public get/read/edit actions | 独立 readback、diff、rollback、quarantine、cleanup |

不以 telemetry 文件是否存在代替 mutation 结果验证；telemetry 只作为附加审计证据。

## 4. 环境和安全边界

### 4.1 开发环境

```text
Repository:
C:\Repo\09_ASCETCopilot\pi-ascet-extension-prototype

Branch baseline:
codex/pi-ascet-extension-prototype @ c86f95200
```

### 4.2 Live fixture

每次 Live run 使用唯一根目录：

```text
PI_LIVE_TOOLS_TX_<YYYYMMDD>_<random>
```

建议对象：

```text
<fixture>\AtomicClass
<fixture>\MethodClass
<fixture>\SharedClass
<fixture>\ModeEnum
```

所有写入 request 必须携带：

```text
PI_ASCET_RUN_ID
PI_ASCET_PHASE_ID
PI_ASCET_CASE_ID
PI_ASCET_ATTEMPT_ID
PI_ASCET_WRITE_CLASS=isolated_fixture|cleanup
```

### 4.3 禁止目标

- `CN_Libary` 下真实业务 Component。
- `PlatformLibrary\Package` 下现有共享对象。
- 任何无法完整 snapshot 或无法精确 cleanup 的对象。
- 任何 database identity 与测试基线不一致的数据库。

### 4.4 Evidence 根目录

```text
output/live-tools/<runId>/seven-bug-fix/
```

目录：

```text
00-baseline/
10-resolver/
20-guard-approval/
30-preflight/
40-element-transaction/
50-method-consistency/
60-shared-impact/
70-regression/
80-cleanup/
90-summary/
```

每个 case 至少保存：

```text
request.json
response.json
independent-readback.json
expected.json
assertions.json
lifecycle.json
```

## 5. 测试层级

| 层级 | 类型 | 是否连接 ASCET | 用途 |
|---|---|---:|---|
| L0 | Schema/contract tests | 否 | public schema、result contract、error code |
| L1 | TypeScript focused tests | 否 | coordinator、plan、guard、approval、impact |
| L2 | C# contract/fake ToolAPI tests | 否 | resolver、transaction、preflight、consistency |
| L3 | Bridge non-live tests | 否 | operation registry、JSON envelope、packaged binary |
| L4 | Read-only Live | 是 | identity、resolver、impact completeness、capability probe |
| L5 | Isolated mutation Live | 是 | rollback、quarantine、reconciliation、Method restore |
| L6 | Cleanup and evidence audit | 是 | fixture 不存在、identity 不变、unexpectedWrites=0 |

## 6. 开发切片总览

| 切片 | 目标 | 首个 Red 测试 | Green 输出 |
|---|---|---|---|
| V1 | 统一 result 状态 | rolled_back 目前无法表达 | mutationStatus 支持 rolled_back |
| V2 | Shared target resolver | Project child 在 read/edit 解析失败 | 三种输入返回同一 OID |
| V3 | Persistent quarantine | unknown 后第二次写入仍被 dispatch | `target_quarantined`，Bridge 未启动 |
| V4 | Plan v3 + approval receipt | approval 可跨 target/重放 | 绑定校验和一次性消费 |
| V5 | Authoritative Element preflight | unresolved 配置仍生成 planId | preflight blocked，无 planId |
| V6 | Element compensating transaction | 第 4 项失败留下前三项 | rollback 后 0 个新增 |
| V7 | Method consistency | 缺失 Element 仍 readbackVerified | 失败并恢复旧代码 |
| V8 | Shared object impact | 同 OID alias 缺少上下文风险提示 | Skill 按需提示共享影响，底层 impact evidence 保留 |
| V9 | Reconciliation | quarantine 无正式解除流程 | inspect/rollback/accept-current 闭环 |
| V10 | Full isolated regression | 单项通过但整体证据不闭环 | 完整 run summary 和 cleanup |

---

## 7. V1：统一 mutation 结果状态

### 7.1 Red tests

文件：

```text
packages/ascet-extension/src/edit/verification.test.ts
packages/ascet-extension/src/edit/write-telemetry.test.ts
packages/ascet-extension/src/edit/service.test.ts
```

用例：

| ID | 行为 |
|---|---|
| RES-001 | backend 返回 rollback verified 时，必须分类为 `rolled_back` |
| RES-002 | rolled_back 不得触发 quarantine |
| RES-003 | rollback failed 必须分类为 unknown |
| RES-004 | unknown 必须 `cleanupRequired=true` |
| RES-005 | not_started 不得 invalidate observations |

### 7.2 最小实现

- 扩展 `AscetEditMutationStatus`。
- 统一 consistencyStatus 和 rollback payload 提取。
- 更新 telemetry aggregation。
- 保持 unknown 的保守分类，不把普通错误自动降级为 not_started。

### 7.3 Green 命令

```powershell
npx tsx --test `
  packages/ascet-extension/src/edit/verification.test.ts `
  packages/ascet-extension/src/edit/write-telemetry.test.ts `
  packages/ascet-extension/src/edit/service.test.ts
```

### 7.4 Gate

```text
rolled_back、unknown、not_started 可被 public result、telemetry 和测试一致识别。
```

---

## 8. V2：Shared Target Resolver

### 8.1 Red tests

新增：

```text
ascetcli/tests/AscetTargetResolverContractTest.cs
```

用 fake database/project/component 验证：

| ID | 输入 | Expected |
|---|---|---|
| RESOLVE-001 | `Folder\Component` | canonical path + stable OID |
| RESOLVE-002 | `ProjectPath::Child` | represented Component OID |
| RESOLVE-003 | OID | 与 path 解析相同 identity |
| RESOLVE-004 | path + OID 一致 | success |
| RESOLVE-005 | path + OID 不一致 | `target_identity_mismatch` |
| RESOLVE-006 | `::` 左侧不是 Project | `invalid_project_child_path` |
| RESOLVE-007 | child 无 represented Component | `represented_component_missing` |
| RESOLVE-008 | target kind 不匹配 | `unsupported_target_kind` |

### 8.2 最小实现

- 新增 `AscetTargetResolver` 和 `AscetResolvedTarget`。
- 先迁移一个 read action 和一个 editability action，证明 resolver 可复用。
- 再逐个迁移 get/read/edit/verification 调用方。
- 调用方使用 resolver 返回的当前 session object，不重新按 path 查找。

### 8.3 Integration tests

扩展 Bridge contract：

```text
get target identity
read target identity
editability target identity
```

相同 fake target 的 `targetOid` 必须一致。

### 8.4 Live read-only tests

对已知 Project child 只执行：

```text
ascet_get.tree
ascet_get.elements
ascet_read.read_implementation
ascet_edit.check
```

不执行 mutation。保存四个 response，并断言 OID 相同。

### 8.5 Gate

```text
任何写入代码不再直接使用 AscetItemPath + GetItemInFolder 解析 Component target。
```

---

## 9. V3：Persistent Mutation Quarantine

### 9.1 Red tests

新增：

```text
packages/ascet-extension/src/edit/mutation-guard-store.test.ts
packages/ascet-extension/src/edit/mutation-coordinator.test.ts
```

| ID | 行为 |
|---|---|
| GUARD-001 | unknown outcome 创建 quarantine record |
| GUARD-002 | 同 path 第二次 mutation 被阻止 |
| GUARD-003 | 不同 alias、同 OID 同样被阻止 |
| GUARD-004 | 不同 OID 不被误锁 |
| GUARD-005 | rollback_failed 创建 quarantine |
| GUARD-006 | store 并发写入保持完整 JSON |
| GUARD-007 | generation 变化使旧 plan 失效 |
| GUARD-008 | blocked request 不调用 Bridge runner |

### 9.2 最小实现

- Guard key：database fingerprint + target OID。
- 使用临时文件 + atomic rename 写入。
- 使用 lock file 防止并发 mutation。
- coordinator 在 preflight 前和 dispatch 前检查 guard。
- unknown classification 后立即持久化 guard。

### 9.3 Recovery startup test

模拟 operation journal 停在：

```text
bridge_entered=true
backend_response_received=false
```

重新创建 coordinator 后必须自动恢复为 quarantined。

### 9.4 Gate

```text
unknown 之后，无论使用哪个 alias path，Bridge 都不会再次启动。
```

---

## 10. V4：Plan v3 和 Approval Receipt

### 10.1 Red tests

文件：

```text
packages/ascet-extension/src/edit/plan-store.test.ts
packages/ascet-extension/src/edit/approval-store.test.ts
packages/ascet-extension/src/edit/mutation-coordinator.test.ts
```

| ID | 行为 |
|---|---|
| PLAN3-001 | v3 fingerprint 包含 target impact 和 guard generation |
| PLAN3-002 | v2 plan 返回 `plan_version_unsupported` |
| APPROVAL-001 | receipt 绑定正确 plan/target 时可消费 |
| APPROVAL-002 | 不同 target OID 拒绝 |
| APPROVAL-003 | 不同 database fingerprint 拒绝 |
| APPROVAL-004 | 不同 impact fingerprint 拒绝 |
| APPROVAL-005 | receipt 过期拒绝 |
| APPROVAL-006 | receipt 重放拒绝 |
| APPROVAL-007 | guard generation 改变拒绝 |
| APPROVAL-008 | signal 在 dispatch 前 aborted，Bridge 不启动 |

### 10.2 最小实现

- Plan record 升级为 v3。
- 新增 ApprovalStore，保存 token hash，不保存明文 token。
- UI confirm=true 后由 extension 内部创建 receipt。
- receipt 只能由 coordinator 消费。
- 普通 `executeWrite=true` 创建 ephemeral plan，不能直接 dispatch。

### 10.3 Security assertions

Public schema 不得暴露：

```text
approvalToken
tokenHash
forceApproved
skipConfirmation
```

模型不能自行构造 approval receipt。

### 10.4 Gate

```text
apply_element_spec commit 和 set_method_code executeWrite 进入同一个 coordinator 和 approval state machine。
```

---

## 11. V5：Authoritative Element Preflight

### 11.1 Red tests

新增：

```text
ascetcli/tests/AscetElementSpecPreflightContractTest.cs
packages/ascet-extension/src/edit/service.test.ts
```

| ID | 注入状态 | Expected |
|---|---|---|
| PREFLIGHT-001 | DataConfiguration missing | no planId，`data_configuration_unresolved` |
| PREFLIGHT-002 | ImplConfiguration missing | no planId |
| PREFLIGHT-003 | Data Item capability unavailable | no planId |
| PREFLIGHT-004 | Impl Item capability unavailable | no planId |
| PREFLIGHT-005 | unsupported requested field | per-element blocking reason |
| PREFLIGHT-006 | 全部 capability proven | plan ready |
| PREFLIGHT-007 | commit 前 evidence fingerprint 改变 | stale_plan，not_started |
| PREFLIGHT-008 | preflight command | writesPerformed=false |

### 11.2 最小实现

- 新增 Bridge read operation `preflight_element_spec`。
- 返回 per-element capability evidence。
- TypeScript 只有在所有 element.writable=true 时创建 plan。
- 保留 diff 作为变更计划，但不再把 diff 成功等同于可写。

### 11.3 ToolAPI capability spike

在实现新 Element materialization 前执行只读 probe：

1. 列出可用 Data/Impl validation/factory API。
2. 确认是否支持 non-mutating validation 或 disposable clone。
3. 记录支持矩阵：scalar、array、1D table、2D table、enum。
4. 无安全 API 的 kind 返回 capability unavailable，不允许 live create/delete probe。

### 11.4 Gate

```text
任何 `validated:true` plan 都包含 Data 和 Implementation 的明确证明，不含 unresolved/unavailable。
```

---

## 12. V6：Element Compensating Transaction

### 12.1 C# Red tests

新增：

```text
ascetcli/tests/AscetElementMutationTransactionTest.cs
```

使用 fake mutation adapter，不连接 ASCET。

| ID | 场景 | Expected |
|---|---|---|
| TX-001 | create 4，第 4 项失败 | rollback 删除前三项 |
| TX-002 | create 2 + update 1，update 失败 | 新增删除，旧值恢复 |
| TX-003 | deleteMissing 后失败 | 删除项恢复 |
| TX-004 | full-batch verification mismatch | rollback |
| TX-005 | rollback 全部成功 | rolled_back/restored |
| TX-006 | rollback stage 失败 | unknown/quarantined |
| TX-007 | snapshot incomplete | not_started，无 mutation |
| TX-008 | database save result unknown | unknown/quarantined |
| TX-009 | journal 顺序 | rollback 严格逆序 |
| TX-010 | 同 request success | 单次 Save，full readback passed |

### 12.2 TypeScript Red tests

| ID | 行为 |
|---|---|
| TX-PUBLIC-001 | backend rolled_back 映射为 public rolled_back |
| TX-PUBLIC-002 | rollback_failed 生成 guard |
| TX-PUBLIC-003 | created/updated arrays 不得在 rollback 后报告 applied |
| TX-PUBLIC-004 | old plan 在 rollback 后不可重放 |

### 12.3 最小实现

- 抽象 snapshot、journal、rollback stage。
- 复用 `AscetElementCatalogReader.BuildSpecDocument`，增加 completeness 字段。
- `ApplyInSession` 在 transaction 内执行。
- full-batch verification 通过前不 Save。
- rollback 成功后保存恢复状态并再次 diff。

### 12.4 Failure injection

仅测试环境启用：

```text
ASCET_ELEMENT_TX_ENABLE_FAILURE_INJECTION=1
ASCET_ELEMENT_TX_FAIL_AFTER_STAGE=create:3
ASCET_ELEMENT_TX_FAIL_DURING_ROLLBACK=remove:2
```

必须增加测试证明未设置 enable flag 时注入变量无效。

### 12.5 Isolated Live tests

#### LIVE-TX-001：4→0

```text
Precondition: AtomicClass 不含四个测试 Element
Action: 创建 4 个，在第 4 项前/后注入失败
Expected: request rolled_back；独立 elements/read_implementation 证明 4 个均不存在
```

#### LIVE-TX-002：rollback quarantine

```text
Action: apply failure + rollback failure injection
Expected: mutationStatus=unknown；guard=quarantined；第二次写入 blocked
```

#### LIVE-TX-003：reconcile

```text
Action: inspect → rollback_to_before
Expected: current diff 与 before snapshot 一致；guard 清除；generation 增加
```

### 12.6 Gate

```text
不得出现 4 个请求留下 1/2/3 个对象的可观察最终状态。
```

---

## 13. V7：Method Symbol 和 Component Consistency

### 13.1 Red tests

新增：

```text
ascetcli/tests/AscetMethodConsistencyContractTest.cs
```

| ID | 场景 | Expected |
|---|---|---|
| METHOD-001 | 所有 Element 存在且配置有效 | success |
| METHOD-002 | 一个 Element 缺失 | `method_symbol_not_found` |
| METHOD-003 | Element 存在，Data unresolved | configuration error |
| METHOD-004 | Element 存在，Impl unresolved | configuration error |
| METHOD-005 | parser 返回语法失败 | `method_parse_failed` |
| METHOD-006 | 文本 readback 相同但 consistency 失败 | readbackVerified=false |
| METHOD-007 | 写后验证失败，旧代码恢复 | rolled_back |
| METHOD-008 | 旧代码恢复失败 | unknown/quarantined |
| METHOD-009 | 注释/字符串内名称 | 不作为引用符号 |
| METHOD-010 | method argument/keyword | 不误报 Element 缺失 |

### 13.2 最小实现

- 写前保存旧代码 fingerprint。
- 增加 native parser/consistency adapter。
- lexical scan 只作为 precheck，不作为最终 PASS。
- 对解析出的 Element 读取 Data/Impl configuration 状态。
- 验证失败时恢复旧代码并重新验证。

### 13.3 ToolAPI discovery gate

在实现前必须记录：

```text
native parser method
native compile/consistency method
supported language kinds
返回错误结构
是否产生数据库 mutation
```

如果没有权威只读验证 API，默认阻止高风险 Method 写入，不能用 regex 结果宣称一致。

### 13.4 Isolated Live tests

#### LIVE-METHOD-001

写入引用所有存在 Element 的方法，验证：

```text
textReadbackVerified=true
symbolResolutionVerified=true
componentConsistencyVerified=true
```

#### LIVE-METHOD-002

写入引用 `C_Missing_<runId>` 的方法：

```text
Expected: 写入拒绝或旧代码恢复；独立 read_method_code 返回旧代码
```

#### LIVE-METHOD-003

在 Method 验证失败后再次写入：

- rollback 成功：允许新 plan。
- rollback 失败：target quarantined，禁止写。

### 13.5 Gate

```text
`ReadbackVerified=true` 必须同时代表文本、符号、配置和 Component consistency 全部通过。
```

---

## 14. V8：Shared Object Impact

### 14.1 Red tests

新增：

```text
packages/ascet-extension/src/edit/target-impact.test.ts
ascetcli/tests/AscetTargetImpactContractTest.cs
```

| ID | 场景 | Expected |
|---|---|---|
| IMPACT-001 | Project path 与 Package path 同 OID | sharedObject=true |
| IMPACT-002 | 多个 Project consumer | 全部列出 |
| IMPACT-003 | Tree truncated | completeness=unknown，write blocked |
| IMPACT-004 | collector error | impact unknown |
| IMPACT-005 | owner path 与 requested path 不同 | targetImpact 内部保存 owner，普通 confirmation 不展示专项详情 |
| IMPACT-006 | plan 后新增 consumer | impact fingerprint changed |
| IMPACT-007 | 实际 mutation 且用户可能误认为是 Project 局部修改 | Skill 按需提醒；不固定句式；不增加第二次专项确认 |
| IMPACT-008 | receipt 绑定旧 impact | approval_binding_mismatch |

### 14.2 最小实现

- 从 complete database Tree 和 Project collector 建立 OID alias/consumer index。
- `dbitem_refs` 只能作为辅助，不用于证明 consumer completeness。
- targetImpact 进入 Plan v3 fingerprint。
- shared target 不使用独立 confirmation message；Skill 仅在实际写入且当前上下文存在误解风险时按需提醒，普通 mutation confirmation 保持不变。

### 14.3 Read-only Live tests

对现有已知同 OID 的 Project/Package 路径只做 read：

```text
resolve both aliases
compare targetOid
collect ownerPath
collect affectedProjects
verify completeness
```

不执行真实共享对象 mutation。

### 14.4 Isolated reminder and confirmation test

在 isolated fixture 中创建可模拟 alias/consumer 的对象；如果 ToolAPI 无法安全创建 Project alias，则仅执行 non-live contract test，不在共享业务对象上补测写入。

### 14.5 Gate

```text
impact 不完整时 mutationStatus 必须为 not_started；影响证据完整且 sharedObject=true 时，由 Skill 根据实际 mutation 和当前上下文决定是否提醒，再进入普通 mutation confirmation。
```

---

## 15. V9：Reconciliation

### 15.1 Red tests

| ID | 模式 | Expected |
|---|---|---|
| RECON-001 | inspect | read-only before/current/desired diff |
| RECON-002 | rollback_to_before success | guard clear，generation+1 |
| RECON-003 | rollback_to_before failure | guard 保持 quarantined |
| RECON-004 | accept_current consistent | guard clear，记录 evidence |
| RECON-005 | accept_current inconsistent | blocked |
| RECON-006 | cleanup_created | 仅删除 journal 证明由本次创建的对象 |
| RECON-007 | 无 guard 调 reconcile | `target_not_quarantined` |
| RECON-008 | 错误 target OID | binding mismatch |

### 15.2 安全约束

- 不提供 public `forceUnlock`。
- cleanup_created 不能按名称猜测，只使用 journal 中的 after OID/name。
- accept_current 必须通过完整 consistency validation。
- reconciliation mutation 也需要 approval receipt。

### 15.3 Gate

```text
所有 quarantine 都有可审计的 inspect 和受控解除路径。
```

---

## 16. V10：完整回归测试

### 16.1 Focused Node tests

最终至少运行：

```powershell
npx tsx --test `
  packages/ascet-extension/src/edit/verification.test.ts `
  packages/ascet-extension/src/edit/write-telemetry.test.ts `
  packages/ascet-extension/src/edit/plan-store.test.ts `
  packages/ascet-extension/src/edit/approval-store.test.ts `
  packages/ascet-extension/src/edit/mutation-guard-store.test.ts `
  packages/ascet-extension/src/edit/mutation-coordinator.test.ts `
  packages/ascet-extension/src/edit/target-impact.test.ts `
  packages/ascet-extension/src/edit/service.test.ts `
  packages/ascet-extension/src/tools/edit/schema.test.ts `
  packages/ascet-extension/src/tools/edit/definition.test.ts
```

### 16.2 Bridge non-live

```powershell
& 'ascetcli/scripts/test-ascet-bridge.ps1'
```

该脚本必须包含新增 C# contract tests，并继续保证不连接 ASCET ToolAPI。

### 16.3 Repository check

代码修改完成后：

```powershell
npm run check
```

要求完整输出且：

```text
errors=0
warnings=0
infos=0
```

不运行：

```text
npm test
npm run build
完整 vitest suite
```

除非用户另行明确要求。

### 16.4 Read-only Live gate

在任何 isolated mutation 前必须通过：

1. database identity 与 baseline 一致。
2. Runtime healthy。
3. Scheduler healthy，无残留 CLI lock。
4. Project child resolver across tools OID 一致。
5. shared impact completeness 可证明。
6. ToolAPI preflight/consistency capability probe 已完成。

### 16.5 Isolated mutation gate

执行前必须保存：

```text
00-user-confirmation.json
01-database-identity.json
02-runtime-scheduler.json
03-fixture-precondition.json
```

执行顺序：

```text
create fixture
→ happy-path baseline
→ element rollback test
→ unknown/quarantine test
→ reconciliation
→ method consistency test
→ approval replay/binding test
→ reverse cleanup
→ final identity/runtime audit
```

### 16.6 Cleanup 顺序

```text
1. 删除测试 Method/恢复旧代码
2. 删除 Enumeration
3. 删除 Class/Module
4. 删除 fixture Folder
5. 读取 Tree 确认 fixture 不存在
6. 读取 database identity
7. 检查 runtime/scheduler/CLI lock
8. 汇总 telemetry，确认 unexpectedWrites=0
```

## 17. Case 级验收表

| Bug | 核心 case | Non-live | Read-only Live | Isolated write | Cleanup evidence |
|---|---|---:|---:|---:|---:|
| 非原子 Element | 4→failure→0 | 必须 | 不适用 | 必须 | 必须 |
| Method 缺失符号 | old code restored | 必须 | capability probe | 必须 | 必须 |
| Preflight 不一致 | unresolved→no planId | 必须 | 必须 | 可选验证 | 不适用 |
| Unknown guard | second write blocked | 必须 | 不适用 | 必须 | reconciliation |
| Path resolver | same OID across tools | 必须 | 必须 | 不需要 | 不适用 |
| Shared OID advisory | 按实际 mutation 和上下文决定是否提示 | 必须 | 规则验证 | 仅 fixture | 不适用 |
| Confirmation | expired/replay/cross-target rejected | 必须 | 不适用 | 必须一个端到端 case | 不适用 |

## 18. Evidence Summary 格式

最终生成：

```text
output/live-tools/<runId>/seven-bug-fix/90-summary/completion-audit.md
```

内容必须包括：

```json
{
  "status": "FIXED|PARTIAL|FAILED",
  "databaseFingerprintBefore": "...",
  "databaseFingerprintAfter": "...",
  "fixtureRemaining": false,
  "unexpectedWrites": 0,
  "unknownOutcomes": 1,
  "quarantinesCreated": 1,
  "quarantinesResolved": 1,
  "rollbackVerified": true,
  "methodOldCodeRestored": true,
  "approvalReplayRejected": true,
  "sharedImpactVerified": true
}
```

测试中故意产生并成功 reconciliation 的 unknown 必须单独统计，不能被最终 `unknownOutcomes=0` 掩盖。

## 19. Review 门禁

每个切片完成后 review：

1. 测试是否通过 public seam，而不是 private implementation。
2. Red 阶段是否确实因目标 Bug 失败。
3. 是否新增了 blind retry、force unlock 或 silent fallback。
4. 是否存在 path-keyed safety state，而不是 OID-keyed。
5. 是否把 unavailable 错误标记成 validated。
6. 是否确保 rollback readback 使用独立读取路径。
7. 是否有新 public schema 和 catalog snapshot drift。
8. 是否更新错误码、action catalog 和工具说明。

## 20. 提交计划

建议按纵向切片提交：

```text
1. fix: unify ASCET mutation result states
2. feat: add shared ASCET target resolver
3. feat: quarantine unknown ASCET mutation targets
4. fix: bind ASCET approvals to plan and target identity
5. fix: validate element data and implementation in preflight
6. fix: rollback partial element spec mutations
7. fix: validate method symbols and component consistency
8. fix: add shared ASCET OID Skill advisory while retaining impact guards
9. test: cover ASCET mutation reconciliation and isolated rollback
10. docs: record seven-bug completion evidence
```

每次提交：

- 只暂存本切片修改。
- 不包含版本升级、发布文件或其他并行会话修改。
- 不提交 Live 原始输出，除非仓库已有明确 evidence 目录规范。

## 21. 完成标准

只有以下全部满足，整体状态才能从 `NOT FIXED` 改为 `FIXED`：

```text
[ ] 4 Element 第 4 项失败后 0 个残留
[ ] rollback success 和 rollback failure 状态可区分
[ ] rollback failure 自动 quarantine
[ ] alias path 无法绕过 quarantine
[ ] Method 缺失 Element 不会返回 readbackVerified=true
[ ] Method 验证失败后旧代码恢复
[ ] Data/Impl unresolved 时无 planId
[ ] get/read/edit/editability 返回同一 target OID
[ ] shared owner 和 affectedProjects 可由内部 evidence 证明，Skill 仅在实际写入且有必要时按上下文提醒
[ ] impact incomplete 时 Bridge 不启动
[ ] approval 过期、重放、跨 target 均拒绝
[ ] reconciliation 可审计地解除 quarantine
[ ] focused tests 全部通过
[ ] Bridge non-live 全部通过
[ ] npm run check 通过
[ ] isolated Live 全部通过
[ ] fixtureRemaining=false
[ ] database identity 未变化
[ ] unexpectedWrites=0
```

在测试 seams 确认并开始第一个 Red 测试前，不修改生产实现。
## 22. 执行进度

### 2026-08-11 第一轮

| 切片 | 状态 | 当前证据 |
|---|---|---|
| V1 mutation result | `GREEN` | `verification.test.ts` 12/12；支持 rolled_back、consistencyStatus、rollback evidence |
| V2 shared resolver | `FOUNDATION GREEN` | C# shared resolver contract 已实现并接入 ReadDomain；Bridge non-live 通过；公共 schema 和 Live 一致性尚未闭环 |
| V3 quarantine | `NON-LIVE INTEGRATED` | plan-managed 和普通 executeWrite 都使用 OID guard/coordinator；unknown、rollback_failed、process_interrupted 自动 quarantine |
| V4 approval receipt | `NON-LIVE INTEGRATED` | 所有 mutation 统一为 Plan v3 + UI confirmation + 单次 approval receipt + target lock；`set_method_code` 已有回归证据 |
| V5 preflight | `NON-LIVE GREEN (FAIL CLOSED)` | existing Element 必须有真实 default/class Data/Implementation configuration；新 primitive Element 无法无写入证明时不生成 planId |
| V6 Element transaction | `INTEGRATED NON-LIVE GREEN` | 补偿事务已接入 `ComponentElementSyncService.ApplyInSession`；支持写前快照、mutation-start、Restore、精确 rollback readback 和 rollback_failed |
| V7 Method consistency | `NON-LIVE GREEN` | Method text readback、Element symbol、Data/Implementation configuration 和失败补偿回滚已接入；等待 isolated Live |
| V8 shared impact | `NON-LIVE INTEGRATED` | 所有 mutation 写前采集完整 Database Tree；Skill 对实际写入按上下文提示；普通 confirmation 不展示专项详情；impact incomplete 时 Bridge 不启动 |
| V9 reconciliation | `PARTIAL NON-LIVE` | stale target lock 自动转为 process_interrupted quarantine；Guard clear primitive 已有；public reconcile action 未实现 |
| V10 full regression | `NOT STARTED` | 等待全部切片集成 |

本轮验证：

```text
focused foundation tests: 21/21 passed
service/verification/telemetry tests: 32/32 passed
ASCET Bridge non-live: passed
npm run check: passed
```

注意：foundation test 通过不代表对应 Bug 已修复。只有 coordinator、Bridge、ToolAPI 和 isolated Live 证据全部闭环后才能升级为 `FIXED`。

### 2026-08-11 第二轮：V6 Element transaction

已完成：

```text
1. AscetElementMutationTransaction 增加 batch recovery seam。
2. ApplyInSession 写入前捕获 Element 快照并验证 rollback 完整性。
3. mutation-start 标记位于 editability 检查之后、首个真实 mutation 之前。
4. 任意写入或 readback 失败后使用 Restore + deleteMissing + recreateIncompatible 恢复。
5. rollback 后独立读取并精确校验 Element 数量、名称和字段。
6. rollback 成功返回 element_transaction_rolled_back。
7. rollback 或恢复验证失败返回 element_transaction_rollback_failed。
8. TypeScript 将 rolled-back 错误分类为 mutationStatus=rolled_back、consistencyStatus=restored。
```

本轮证据：

```text
AscetElementMutationTransactionTest: passed
ASCET Bridge non-live: passed
focused ASCET edit safety/regression tests: 43/43 passed
npm run check: passed
```

尚未满足：

```text
- isolated Live 第 4 项失败注入及 4→0 证据
- rollback failure Live quarantine 证据
- mutation coordinator 持久化 guard 集成
```

### 2026-08-11 第三轮：Plan v3 和 mutation coordinator

已完成：

```text
1. Plan record 升级为 version=3。
2. Plan fingerprint 绑定 targetImpact 和 guardGeneration。
3. Plan 状态增加 planned -> executing -> consumed。
4. executing/consumed plan 均不可重放。
5. plan 和 commit 都读取完整 Database Tree 收集 OID alias/owner/affectedProjects。
6. impact incomplete 或 target OID 未在完整 Tree 中出现时 fail closed。
7. coordinator 按 OID 加跨进程 target lock。
8. UI 确认后创建一次性 approval receipt，在 guard generation 复查后 consume。
9. unknown/rollback_failed/process_interrupted 自动写入 persistent quarantine。
10. 同一 OID 的 alias path 无法绕过 quarantine。
```

本轮证据：

```text
Plan Store v3 tests: 6/6 passed
Mutation Coordinator tests: 2/2 passed
Focused ASCET edit safety/regression tests: 51/51 passed
npm run check: passed
```

当前限制：

```text
- coordinator 目前覆盖 apply_element_spec 和 set_element_dependency 的 plan-managed commit
- set_method_code 等普通 executeWrite 仍使用旧 confirmation dispatch
- process crash 后的 stale target lock startup reconciliation 尚未完成
- public reconcile action 尚未实现
```

### 2026-08-11 第四轮：统一普通 executeWrite

已完成：

```text
1. create/delete/set/apply 类普通 executeWrite 在写入前生成内部 Plan v3。
2. 通过完整 Database Tree 解析 mutation anchor OID。
3. 创建类 action 绑定父 Folder OID，现有对象 action 绑定目标 OID。
4. 所有普通 mutation 统一进入 target-impact/guard/approval/target-lock/coordinator 流程。
5. 旧 runApproved... 双重 confirmation dispatch 已从 mutation service 移除。
6. set_method_code 已验证只弹出一次普通确认，只显示 plan/targetOid；共享 OID 影响由 Skill 在实际写入且有必要时按上下文提醒。
7. set_method_code 返回 write_outcome_unknown 后，Package/Project alias 均被同一 OID quarantine 阻止。
8. 内联 Method 代码不明文持久到 Plan，仅持久 codeFingerprint。
```

本轮证据：

```text
set_method_code unified confirmation regression: passed
unknown direct mutation alias quarantine regression: passed
Focused ASCET edit safety/regression tests: 53/53 passed
npm run check: passed
```

尚未满足：

```text
- stale target lock startup reconciliation
- public reconcile action
- authoritative Element Data/Implementation preflight
- Method symbol/config/component consistency
- isolated Live mutation and cleanup evidence
```
### 2026-08-12 第五轮：V5 authoritative Element preflight

已完成：

```text
1. apply_element_spec plan 先读取 live Element catalog，再进行 capability gate。
2. existing Element 仅在 DataConfiguration 来源为 default/class、selected=true、configurationName 非空时通过。
3. existing Element 仅在 ImplConfiguration 来源为 default/class、selected=true、configurationName 非空时通过。
4. elementValue 和 elementImplementation fallback 不再作为权威配置证据。
5. Data unresolved 返回 data_item_not_resolvable_preflight，不生成 planId。
6. Implementation unresolved 返回 implementation_item_not_resolvable_preflight，不生成 planId。
7. 新 primitive Element 因 ToolAPI 无法在创建前调用 GetItem 证明 item resolution，当前 fail closed。
8. preflight 被阻止时不调用 diff_element_spec、get_database_identity 或 mutation Bridge。
9. 成功 plan 将逐 Element capability evidence 写入 Plan v3 backendPreflight 并参与 evidence fingerprint。
10. 测试 fixture 使用独立 artifact root，避免共享 guard/quarantine 污染。
```

本轮证据：

```text
apply_element_spec authoritative preflight regressions: passed
Focused ASCET edit safety/regression tests: 55/55 passed
npm run check: passed
```

当前限制：

```text
- 新 primitive Element 创建暂时被安全阻止。
- 后续如需恢复创建能力，必须实现独立 temporary fixture/session 创建探针并证明完整 cleanup/rollback。
- 不允许退回“存在 default configuration 即 validated=true”的旧逻辑。
```

### 2026-08-12 第六轮：V7 Method consistency 和补偿回滚

已完成：

```text
1. set_method_code 写前捕获旧 Method code。
2. 写后独立读取 Method code、Element catalog、Method catalog 和 Method signature。
3. Method code lexer 排除注释、字符串、关键字、声明的局部变量、Method 调用和 signature symbol。
4. 对 Element 风格标识符执行 symbol resolution。
5. 缺失 C_AVH_DoubleBrakeReq 类引用返回 method_symbol_not_found。
6. 被引用 Element 必须解析到 selected default/class DataConfiguration。
7. 被引用 Element 必须解析到 selected default/class ImplConfiguration。
8. text readback 或 component consistency 失败后恢复旧 Method code。
9. rollback 后独立读取旧代码并验证。
10. rollback 成功返回 method_consistency_rolled_back，并映射为 mutationStatus=rolled_back、consistencyStatus=restored。
11. rollback 失败返回 method_consistency_rollback_failed，并由 coordinator 归类为 unknown/quarantine。
```

本轮证据：

```text
AscetMethodConsistencyTest: passed
ASCET Bridge non-live: passed
Focused ASCET edit safety/regression tests: 56/56 passed
npm run check: passed
```

当前限制：

```text
- Element symbol 识别当前采用保守 lexical 规则，isolated Live 必须覆盖真实 ESDL calc code。
- isolated Live 仍需证明缺失 C_AVH_DoubleBrakeReq 时旧代码恢复且 readbackVerified 不为 true。
- public reconciliation action、stale target lock recovery 和最终 fixture cleanup 尚未完成。
```
### 2026-08-12 第七轮：V9 stale target lock recovery

已完成：

```text
1. coordinator 暴露稳定的 OID target lock path 计算。
2. target lock 冲突时读取 lock owner PID。
3. owner process 仍存活时保持 mutation_target_busy，不破坏有效锁。
4. owner process 已不存在或 lock metadata 损坏时判定为 stale lock。
5. stale lock 不会被 silent/force unlock 后继续 mutation。
6. coordinator 先写入 process_interrupted quarantine，再删除 stale lock，并拒绝本次 mutation。
7. stale lock 场景 Bridge dispatch=0。
8. 同一 OID 的后续 alias mutation 继续由 quarantine 阻止。
```

本轮证据：

```text
Mutation Coordinator tests: 3/3 passed
Focused ASCET edit safety/regression tests: 57/57 passed
npm run check: passed
```

尚未满足：

```text
- public reconcile inspect/clear action
- reconciliation 独立 readback evidence 和 expected guard generation 绑定
- isolated Live quarantine -> reconcile -> alias write gate 证据
```

### 2026-08-12 第八轮：共享 OID 提醒简化

已完成：

```text
1. sharedObject/OID alias/owner/affectedProjects 的底层收集和 Plan v3 evidence 保持不变。
2. targetImpactFingerprint 继续绑定 plan、approval receipt 和 coordinator。
3. impact incomplete 继续返回 shared_object_impact_unknown，Bridge 不启动。
4. 删除普通 confirmation 中的 sharedObject、ownerPath、affectedProjects 专项详情。
5. 不增加共享对象第二次 confirmation 或独立弹窗。
6. ASCET Engineering Skill 仅在实际写入共享 OID，且用户可能误认为是 Project 局部修改、影响范围变化或共享归属尚未说明时按需提醒。
7. read、preflight、no-op 不提醒；同一任务已说明或确认过同一 OID 的影响后不重复提醒。
8. 提醒使用简洁的上下文文案，不规定固定句式；继续使用现有单次普通 mutation confirmation。
```

本轮验收：

```text
Skill 和 Tool recipe 定义按上下文提醒规则
read、preflight、no-op 不触发提醒
同一任务已确认同一 OID 影响后不重复提醒
不存在固定提醒句式或第二次共享对象 confirmation
plan-managed confirmation 不包含共享对象专项详情
direct mutation confirmation 不包含共享对象专项详情
普通 confirmation 次数仍为 1
targetImpact 和 OID quarantine 安全能力未删除
```

## 23. 最终 Tools 测试执行方案

### 23.1 最终目标

本节是七项 Tools Bug 的最终执行入口。只有 Non-live、Bridge、Read-only Live、Isolated mutation Live 和 Cleanup audit 全部通过，才能将整体状态标记为 `FIXED`。

| Bug | 最终证明 | Live 类型 |
|---|---|---|
| Element 非原子批量写入 | 4 个 Element 全部创建，或失败后 0 个残留 | isolated mutation |
| Method 引用缺失 Element | 写入拒绝或旧代码恢复，不能返回完整 readback success | isolated mutation |
| Element preflight/commit 不一致 | unresolved Data/Implementation 不生成 planId，Bridge dispatch=0 | fixture preflight |
| unknown 后继续写入 | 同一 OID 及其 alias 的后续 mutation 全部 blocked | isolated mutation |
| Project child path resolver 不一致 | get/read/edit/editability 返回相同 targetOid | read-only Live |
| Shared OID 缺少影响提示 | 影响证据完整；Agent 只在实际写入且上下文有必要时提示 | read-only + Skill contract；可选 fixture mutation |
| Confirmation 不一致 | approval 绑定 plan/database/target/impact，过期、重放和跨目标均拒绝 | non-live + one isolated commit |

### 23.2 2026-08-12 执行准备状态

```text
Skill contextual advisory tests: 5/5 passed
npm run check: passed
Focused ASCET safety tests: 61/62 passed
Current focused failure:
  service.test.ts
  set_element_dependency preflight expected=preflight actual=blocked

Public reconcile action: not implemented
Live Element transaction failure-injection seam: not implemented
Final isolated Live run: not executed
```

因此当前允许执行：

```text
Non-live tests
Bridge non-live tests
ASCET Live read-only tests
ASCET fixture preflight-only tests
```

当前禁止执行以下最终 mutation case：

```text
rollback failure -> quarantine
quarantine -> public reconcile -> write enabled
failure at Element stage 4 -> verified 4-to-0 rollback
```

这些 case 必须等待 test-only failure injection 和 public reconciliation action 实现，不能通过人工中断 ASCET、杀进程、修改业务对象或伪造 evidence 代替。

### 23.3 Live run 身份和隔离范围

每次执行生成唯一 run ID：

```text
PI_ASCET_RUN_ID=LIVE_TOOLS_<YYYYMMDD_HHMMSS>_<8-char-random>
fixtureRoot=PI_LIVE_TOOLS_TX_<runId>
atomicClass=<fixtureRoot>\AtomicClass
methodClass=<fixtureRoot>\MethodClass
method=<methodClass>::calc
```

允许的 mutation target 必须满足：

```text
canonicalPath startsWith fixtureRoot
resolved owner is fixtureRoot
requested path/OID pair matches resolver result
fixtureRoot did not exist at baseline
writeClass is isolated_fixture or cleanup
```

禁止写入：

```text
CN_Libary 下业务对象
PlatformLibrary\Package 下现有共享对象
现有 Project 表示的共享 Package Component
不属于本 runId 的历史 fixture
无法完整 snapshot 或精确 cleanup 的对象
```

用户之前的对话确认不能跨 runId、planId 或 targetOid 重用。开始实际 Live mutation 前，必须展示本次数据库、fixtureRoot、目标 OID 和写入 case，再取得新的普通 mutation confirmation。

### 23.4 Phase 0：Non-live release gate

按顺序执行：

```powershell
node --import tsx --test `
  packages/ascet-extension/src/ascet-engineering-skill.test.ts `
  packages/ascet-extension/src/edit/verification.test.ts `
  packages/ascet-extension/src/edit/write-telemetry.test.ts `
  packages/ascet-extension/src/edit/plan-store.test.ts `
  packages/ascet-extension/src/edit/approval-store.test.ts `
  packages/ascet-extension/src/edit/mutation-guard-store.test.ts `
  packages/ascet-extension/src/edit/mutation-coordinator.test.ts `
  packages/ascet-extension/src/edit/target-impact.test.ts `
  packages/ascet-extension/src/edit/service.test.ts `
  packages/ascet-extension/src/tools/edit/schema.test.ts `
  packages/ascet-extension/src/tools/edit/definition.test.ts

& 'ascetcli/scripts/test-ascet-bridge.ps1'

npm run check
```

Gate：

```text
all focused tests passed
all C# transaction/method/resolver contract tests passed
Bridge tests did not connect to ASCET ToolAPI
npm run check errors=0 warnings=0 infos=0
```

任一失败时，不进入 Live mutation。

### 23.5 Phase 1：ASCET Live 基线和只读 Gate

Agent 调用顺序：

```text
1. ascet_status
2. ascet_scheduler_status.status
3. ascet_get.database_identity
4. ascet_get.tree(scope=database, delivery=stored)
5. ascet_get.database_catalog
6. ascet_get.tree(target=<approved Project child>)
7. ascet_get.elements(target=<same Project child>)
8. ascet_read.read_implementation(componentPath=<same Project child>)
9. ascet_edit(mode=check, componentPath=<same Project child>)
```

示例只读 payload：

```json
{"action":"database_identity"}
```

```json
{"action":"tree","scope":"database","delivery":"stored"}
```

```json
{
  "action": "elements",
  "target": { "path": "<ProjectPath>::<ChildComponent>" },
  "delivery": "inline"
}
```

```json
{
  "action": "read_implementation",
  "componentPath": "<ProjectPath>::<ChildComponent>",
  "implementationMode": "default"
}
```

```json
{
  "mode": "check",
  "componentPath": "<ProjectPath>::<ChildComponent>"
}
```

断言：

```text
database fingerprint equals approved baseline
runtime and scheduler healthy
no stale CLI/target lock
all four target resolvers return the same OID
Project alias and Package alias identity is recorded
shared impact completeness is complete
no mutation confirmation is requested
no shared OID advisory is emitted for these reads
```

### 23.6 Phase 2：Shared OID 和 Agent 提醒行为

对现有真实共享对象只做读取，不执行 mutation：

```text
Project alias -> targetOid
Package alias -> targetOid
ownerPath
aliasPaths
affectedProjects
impactFingerprint
completeness
```

Agent 行为测试：

| 场景 | Expected |
|---|---|
| read/tree/elements/read_implementation | 不提醒 |
| apply_element_spec preflight | 不提醒 |
| mutation 最终 no-op | 不提醒 |
| 首次实际写入，用户可能认为是 Project 局部修改 | 使用上下文文案提示共享影响 |
| 同一任务、同一 OID、影响未变化且已说明 | 不重复提醒 |
| affectedProjects 或 impactFingerprint 变化 | 重新说明新增影响 |

共享对象提示之后仍只使用普通 mutation confirmation，不增加共享对象专项弹窗或第二次确认。真实业务共享对象不得用于 mutation 测试；如果无法安全创建 fixture alias，则该项以 Skill contract test 和 read-only Live evidence 完成。

### 23.7 Phase 3：创建隔离 fixture

每个 action 先执行 preflight，再使用完全相同的 payload 执行 `executeWrite=true`。示例：

```json
{
  "action": "create_folder",
  "folderPath": "PI_LIVE_TOOLS_TX_<runId>",
  "executeWrite": true
}
```

```json
{
  "action": "create_component",
  "componentPath": "PI_LIVE_TOOLS_TX_<runId>\\AtomicClass",
  "kind": "class",
  "language": "ESDL",
  "ifExists": "fail",
  "rollbackOnFailure": true,
  "executeWrite": true
}
```

对 `MethodClass` 重复创建 Class，并创建 Method：

```json
{
  "action": "create_method",
  "componentPath": "PI_LIVE_TOOLS_TX_<runId>\\MethodClass",
  "componentKind": "class",
  "methodName": "calc",
  "ifExists": "fail",
  "executeWrite": true
}
```

每次写入后由 runtime automatic verification 验证；随后仅为测试 evidence 执行独立 Tree/readback。独立读取不是普通 Agent 工作流的重复验证，而是本测试方案的第二证据通道。

### 23.8 Phase 4：Element authoritative preflight

#### PREFLIGHT-LIVE-001：有效配置

对 `AtomicClass` 提交四个 Element 的 plan 请求。首选精确复现四个 local variable；只有 capability probe 证明该类型可以无 mutation 解析 Data/Implementation 时才允许继续。

```json
{
  "action": "apply_element_spec",
  "phase": "plan",
  "componentPath": "PI_LIVE_TOOLS_TX_<runId>\\AtomicClass",
  "intent": "create",
  "elements": [
    {"role":"standardPrimitive","name":"TxPressCount_<id>","kind":"variable","modelType":"sdisc","scope":"local"},
    {"role":"standardPrimitive","name":"TxWindow_<id>","kind":"variable","modelType":"cont","scope":"local"},
    {"role":"standardPrimitive","name":"TxPrev_<id>","kind":"variable","modelType":"log","scope":"local"},
    {"role":"standardPrimitive","name":"TxReq_<id>","kind":"variable","modelType":"log","scope":"local"}
  ],
  "executeWrite": false
}
```

Expected：

```text
validated=true only when every Data and Implementation item is authoritative
planId exists only for a fully writable plan
writesPerformed=false
Bridge mutation dispatch=0
```

如果当前 ASCET ToolAPI 无法安全证明新 local variable 的配置，Expected 必须是 fail-closed/no planId；不得改用猜测的 memoryLocation、implType 或配置值绕过 Gate。该能力未完成时，原始 local-variable Live case 保持未关闭。

#### PREFLIGHT-LIVE-002：unresolved 配置

使用 capability probe 确认的 schema-valid 但无法解析的 Data/Implementation 请求。Expected：

```text
status=blocked
validated=false
planId absent
data_configuration_unresolved or implementation_configuration_unresolved
writesPerformed=false
Bridge mutation dispatch=0
```

### 23.9 Phase 5：Element transaction、unknown guard 和 reconciliation

此阶段仅在以下能力存在后执行：

```text
test-only failure injection is disabled by default
failure injection is restricted to fixtureRoot and runId
public reconcile inspect/rollback_to_before/cleanup_created exists
all injected failures are written to lifecycle evidence
```

#### LIVE-TX-FINAL-001：第 4 项失败后 4→0

```text
1. 获取完整 planId。
2. 启用 fixture-scoped fail-after-stage=4。
3. commit 只携带 action/phase/planId/executeWrite。
4. 期望 mutationStatus=rolled_back，consistencyStatus=restored。
5. ascet_get.elements 独立读取四个名称。
6. ascet_read.read_implementation 独立读取配置。
7. 四个 Element 必须全部不存在。
```

Commit shape：

```json
{
  "action": "apply_element_spec",
  "phase": "commit",
  "planId": "<planId>",
  "executeWrite": true
}
```

#### LIVE-TX-FINAL-002：rollback failure quarantine

```text
1. 注入 apply failure 和 rollback failure。
2. Expected mutationStatus=unknown。
3. guard record 使用 database fingerprint + targetOid。
4. 使用同路径再次写入：target_quarantined，Bridge dispatch=0。
5. 使用 Project/Package/alternate path alias 再次写入：同样 blocked。
6. 禁止 blind retry。
```

#### LIVE-TX-FINAL-003：public reconcile

```text
1. reconcile.inspect：只读 before/current/desired/journal evidence。
2. reconcile.rollback_to_before 或 cleanup_created：需要新的 approval receipt。
3. 独立 readback 证明当前状态与 before snapshot 一致。
4. guard cleared，generation + 1。
5. 创建新 plan，证明同一 targetOid 可以再次正常写入。
```

未实现 public reconcile 时，此 case 必须报告 `BLOCKED_BY_MISSING_CAPABILITY`，不能直接删除 guard 文件或 force unlock。

### 23.10 Phase 6：Method symbol 和 Component consistency

准备：在 `MethodClass` 创建四个配置完整的测试 Element，并保存 `calc` 的旧代码及 fingerprint。

#### LIVE-METHOD-FINAL-001：有效引用

```json
{
  "action": "set_method_code",
  "componentPath": "PI_LIVE_TOOLS_TX_<runId>\\MethodClass",
  "methodName": "calc",
  "code": "<ESDL code referencing all four existing fixture Elements>",
  "executeWrite": true
}
```

Expected：

```text
writeSucceeded=true
textReadbackVerified=true
symbolResolutionVerified=true
configurationVerified=true
componentConsistencyVerified=true
mutationStatus=applied
```

#### LIVE-METHOD-FINAL-002：缺失符号

写入引用 `TxMissing_<runId>` 的代码。Expected：

```text
method_symbol_not_found or component consistency failure
readbackVerified must not be true
old method code restored
independent ascet_read.read_code(componentPath, methodName=calc) returns old code
mutationStatus=rolled_back
consistencyStatus=restored
```

#### LIVE-METHOD-FINAL-003：Method rollback failure

仅使用 fixture-scoped test injection：

```text
rollback failure -> mutationStatus=unknown -> target quarantined
subsequent set_method_code -> blocked before Bridge
public reconcile -> old code verified -> guard cleared
```

### 23.11 Phase 7：Confirmation 和 approval binding

Non-live 必须覆盖：

```text
expired receipt
consumed receipt replay
wrong plan fingerprint
wrong database fingerprint
wrong targetOid
wrong targetImpactFingerprint
wrong guard generation
```

Live 只执行一个最小端到端 case：

```text
1. fixture preflight 创建 plan。
2. 用户确认该 plan/targetOid 的普通 mutation。
3. commit 成功并消费 receipt。
4. 重放相同 planId/receipt。
5. Expected replay rejected，Bridge dispatch=0，没有第二次 mutation。
```

对 shared OID 的上下文提示不属于 approval receipt，也不能替代普通 mutation confirmation。

### 23.12 Agent 最终模拟调用链

```text
Agent: ascet_status
Agent: ascet_scheduler_status.status
Agent: ascet_get.database_identity
Agent: ascet_get.tree(database, stored)
Agent: read-only resolver/shared-impact calls
Agent: 检查 Live gates

Agent: 创建唯一 fixtureRoot
Agent: 独立读取 fixture OID/kind
Agent: apply_element_spec preflight
Agent: 不对 preflight 发出共享 OID 提示

If target is shared and context needs clarification:
  Agent: 使用自然、具体的上下文文案说明跨 Project 影响

Agent: 展示 planId、targetOid、操作摘要并请求普通 mutation confirmation
User: 确认本次精确 mutation
Agent: commit unchanged plan
Agent: 接受 runtime automatic verification
Agent: 为测试 evidence 执行独立 readback

If mutationStatus=unknown:
  Agent: 立即停止后续 mutation
  Agent: 不重试，不换 alias 绕过
  Agent: reconcile.inspect
  Agent: 请求 reconciliation mutation confirmation
  Agent: rollback_to_before/cleanup_created
  Agent: 独立 readback 后再允许新 mutation

Agent: Method consistency cases
Agent: approval replay case
Agent: reverse cleanup
Agent: final identity/runtime/scheduler/telemetry audit
```

### 23.13 停止条件

任一条件发生，立即停止 mutation：

```text
database identity changed
target path/OID/kind changed
fixture path is outside fixtureRoot
pre-existing object collides with fixture name
preflight incomplete or no authoritative Data/Implementation evidence
plan expired/consumed/fingerprint mismatch
impact completeness unknown
mutationStatus=unknown
rollback verification failed
independent readback differs from automatic verification
runtime/scheduler unhealthy
stale CLI or target lock
unexpected write outside fixtureRoot
```

unknown 后只能执行 read-only diagnosis 和 public reconciliation；不能继续 create/update/delete。

### 23.14 Cleanup 和最终审计

严格逆序清理：

```text
1. 恢复或删除测试 Method。
2. 删除 MethodClass 中测试 Elements。
3. 删除 AtomicClass 中测试 Elements。
4. 删除 MethodClass。
5. 删除 AtomicClass。
6. 删除 fixtureRoot。
7. ascet_get.tree 证明 fixtureRoot 不存在。
8. ascet_get.database_identity 证明数据库身份未切换。
9. ascet_status 和 scheduler status 为 healthy。
10. guard/plan/approval store 不含未处理的本 run 记录。
11. telemetry 中 fixture writes 与计划一致，unexpectedWrites=0。
```

最终 summary 必须包含：

```json
{
  "status": "FIXED|PARTIAL|FAILED|BLOCKED",
  "runId": "<runId>",
  "databaseFingerprintBefore": "<hash>",
  "databaseFingerprintAfter": "<hash>",
  "fixtureRemaining": false,
  "unexpectedWrites": 0,
  "elementFourToZeroVerified": true,
  "rollbackFailureQuarantined": true,
  "aliasWriteBlocked": true,
  "reconciliationVerified": true,
  "methodOldCodeRestored": true,
  "preflightFailClosed": true,
  "resolverOidConsistent": true,
  "sharedImpactVerified": true,
  "approvalReplayRejected": true
}
```

### 23.15 最终判定

```text
FIXED:
  七项 Bug 的 mandatory case 全部通过，isolated Live cleanup 完成。

PARTIAL:
  Non-live 通过，但一个或多个 mandatory Live case 尚未执行。

BLOCKED:
  缺少 public reconcile、safe failure injection、authoritative preflight capability
  或 Live 环境/数据库未获批准。

FAILED:
  出现残留 Element、旧 Method 未恢复、alias 绕过 quarantine、approval 重放成功、
  fixture 无法清理、database identity 改变或 unexpectedWrites > 0。
```
## 24. 2026-08-12 最终方案首次执行结果

```text
runId: LIVE_TOOLS_20260812-105126_F1DF11BC
status: BLOCKED
liveWritesExecuted: 0
fixtureCreated: false
unexpectedWrites: 0
```

### 24.1 Phase 0

```text
Focused Node/Tools tests: 79/79 passed
ASCET Bridge non-live: passed
npm run check: passed
```

本轮同时修复了两个测试/确认契约问题：

1. Preflight 总表测试改用独立 artifact root，避免历史 `C-1` quarantine 污染测试。
2. Plan v3 confirmation UI failure 恢复为 `error`，不再错误报告为 `blocked`；拒绝或取消确认仍在 mutation dispatch 前停止。

### 24.2 ASCET Live read-only

```text
ASCET installation: ready
ASCET DLL: ready
ASCET ToolAPI: ready
Scheduler: healthy
CLI lock: none
Database Tree coverage: complete
Database Tree truncated: false
```

当前共享 OID：

```text
OID: 040gpc83142g1no70o90q9iltgggg
Package alias:
  PlatformLibrary\Package\AVH_AutomaticVehicleHold\Component\Config\CM_AVH
Project aliases:
  PlatformProjects\Gen10\ESP10\ESP4DPB\Product\ESP4DPBCust1MotxWD_ECU_CSW_BB88962::CM_AVH_1MotxWD
  PlatformProjects\Gen10\ESP10\ESP4DPB\Product\ESP4DPBCust2MotAWDAxleSplit_ECU_CSW_BB88962::CM_AVH_2MotAWDAxleSplit
```

只读操作未触发共享 OID 提醒，符合按需提醒规则。

### 24.3 Read-only Gate 失败

对当前有效 Project alias：

```text
ascet_get.tree exact target: target_not_found
ascet_get.elements: passed，componentOid=040gpc83142g1no70o90q9iltgggg
ascet_get.component_refs: passed
ascet_read.read_implementation: passed
ascet_edit.check: passed
```

Package alias 的对应调用全部通过。说明 Project child resolver 仍未在 `ascet_get.tree` exact-target 路径统一。

另外：

```text
ascet_get.database_identity: ascet_action_unavailable in current profile
public reconcile action: not implemented
fixture-scoped Live failure injection: not implemented
```

### 24.4 执行结论

按照停止条件，本轮未创建 fixture，未执行任何 Live mutation。必须先修复 `ascet_get.tree` Project child resolution，并完成 public reconciliation 和安全 failure injection，才能进入 Element 4→0、rollback quarantine 和 Method rollback Live 测试。

证据目录：

```text
output/live-tools/LIVE_TOOLS_20260812-105126_F1DF11BC/seven-bug-fix/
```

## 25. 2026-08-12 R1/R2 修复执行结果

```text
runId: LIVE_TOOLS_20260812-115336_55C66E66
status: R1/R2 FIXED; R3/R4 PENDING
liveWritesExecuted: 0
unexpectedWrites: 0
```

### 25.1 R1：统一 Project child resolver

修复内容：

1. `ascet_get.tree` exact-target 不再单独使用普通 database path resolver。
2. `Project::Child` 通过共享 `AscetTargetResolver` 解析到 represented Component。
3. 同时提供 path/OID 时强制校验同一目标，保留请求的 Project alias。
4. `depth=0` 返回目标自身，Tree item OID 为 represented Component OID。

验证结果：

```text
ascet_get.tree Project alias: PASS
ascet_get.elements Project alias: PASS
ascet_get.component_refs Project alias: PASS
ascet_read.read_implementation Project alias: PASS
ascet_edit.check Project alias: PASS
resolved OID: 040gpc83142g1no70o90q9iltgggg
```

### 25.2 R2：恢复 database_identity public action

修复内容：

1. 注册 `ascet_get.database_identity` public descriptor。
2. 注册 `AscetGetDatabaseIdentity -> get_database_identity` route。
3. 纳入全部 read profiles 和 Action Catalog snapshot。
4. 保持 action 无参数、只读。

Live 结果：

```text
ascet_get.database_identity: PASS
database coverage: complete_for_scope
mutationStarted: false
```

### 25.3 验证证据

```text
ASCET Bridge non-live: PASS
Focused action tests: 14/14 PASS
npm run check: PASS
Live evidence:
output/live-tools/LIVE_TOOLS_20260812-115336_55C66E66/r1-r2-read-only/
```

所有 Live 调用均为只读，`mutationStarted=false`。R3 public reconciliation 与 R4 fixture-scoped failure injection 尚未完成，因此仍不进入 isolated Live mutation 阶段。
### 25.4 R3 public reconciliation 第一切片

已实现：

```text
ascet_recover.reconcile_mutation
mode: inspect
profiles: write-preflight, batch-write, component-edit, ops
```

`inspect` 必须提供：

```text
databaseFingerprint
targetOid
expectedGeneration
```

行为约束：

1. 只读取 mutation guard，不调用 ASCET Bridge。
2. 不修改 guard status，不清除 quarantine。
3. generation 不匹配时返回 `guard_generation_mismatch`。
4. 不允许通过 alias path 绕过 OID guard。

验证：

```text
Focused reconciliation/router/guard tests: 5/5 PASS
npm run check: PASS
```

尚待实现：

```text
rollback_to_before
cleanup_created
accept_current
```

这三种模式必须依赖 durable mutation journal 和完整 consistency evidence；在 journal 尚未接入前不提供伪 rollback 或直接清除 quarantine。
### 25.5 R3 durable mutation journal 与 reconciliation claim

已实现 durable mutation journal：

```text
mutation-journals/<database-hash>/<target-oid-hash>/<plan-hash>.json
```

执行顺序：

1. approval receipt 消费成功。
2. 在进入 Bridge 前原子写入 `status=prepared` journal。
3. journal 记录 database fingerprint、target OID、plan、impact、before snapshot、attempted mutation 及各自 fingerprint。
4. Bridge 返回后更新为 `applied`、`rolled_back`、`unknown` 或 `not_started`。
5. `mutationStatus=unknown` 时，将 journalPath、beforeSnapshotFingerprint、desiredFingerprint 写入 quarantine guard。

安全约束：

- journal 文件限制在 extension artifact root 下。
- snapshot/attempted mutation 不通过 public inspect 输出。
- public inspect 会校验 journal 与 guard 的 database、OID、before/desired fingerprints。
- 不匹配时按 guard corruption 失败关闭。

同时实现 reconciliation claim：

```text
quarantined generation N
-> beginReconciliation(expectedGeneration=N)
-> reconciling generation N+1
```

该 CAS 语义阻止两个 Agent 同时 rollback/cleanup 同一 OID。

验证：

```text
Mutation guard/coordinator/reconciliation/edit service: 34/34 PASS
npm run check: PASS
```

下一步：在 `reconciling` claim 内实现 `rollback_to_before` 的数据库身份复核、显式确认、restore write、完整 readback 和 guard clear。

### 25.6 R3 public reconciliation 完成结果

已完成 public action：

```text
ascet_recover.reconcile_mutation
modes:
  inspect
  rollback_to_before
  cleanup_created
  accept_current
```

最终行为：

1. durable journal 在 Bridge 前写入 `prepared`，随后更新为 `applied`、`rolled_back`、`unknown` 或 `not_started`。
2. `mutationStatus=unknown` 时按 database fingerprint + target OID 建立 quarantine。
3. 后续同 OID mutation 在进入 Bridge 前返回 `mutation_target_quarantined`。
4. `inspect` 只公开 journal metadata 和 fingerprints，不公开 before snapshot/code payload。
5. `cleanup_created` 只删除 journal 证明为本次新增的 Element。
6. reconciliation 使用 generation CAS；成功 readback 后才清除 guard。

Live 证据：

```text
commitStatus: partial
mutationStatus: unknown
guard generation: 1
journal status: unknown
follow-up plan: blocked / mutation_target_quarantined
cleanup_created: rolled_back
guard clear: true
post-reconcile element count: 0
```

### 25.7 R4 fixture-scoped failure injection 完成结果

生产 Bridge 支持以下测试专用环境变量：

```text
PI_ASCET_ENABLE_LIVE_FAILURE_INJECTION=1
PI_ASCET_RUN_ID=<runId>
PI_ASCET_FIXTURE_ROOT=<fixture-root>
PI_ASCET_WRITE_CLASS=isolated_fixture
ASCET_ELEMENT_TX_FAIL_AFTER_STAGE=<positive integer>
ASCET_ELEMENT_TX_FAIL_DURING_ROLLBACK=0|1
```

安全约束：

- 默认关闭。
- runId、fixture root、write class 缺失时失败关闭。
- target 不在 fixture root 下时，在 mutation 前返回 `failure_injection_scope_invalid`。
- rollback 成功注入结果为 `element_transaction_rolled_back`，完整 readback 为 0 个 Element。
- rollback failure 注入结果进入 `mutationStatus=unknown`、journal 和 quarantine。

Live 结果：

```text
rollback-success case: PASS
4 requested -> injected after stage 3 -> rollback verified -> 0 remaining
scope-negative case: PASS
outside configured fixture -> failure_injection_scope_invalid -> 0 remaining
rollback-failure/quarantine/reconcile case: PASS
```

### 25.8 Live 暴露并修复的两个附加回归

#### A. 根级 create_folder mutation anchor 缺失

原行为：

```text
ascet_edit.create_folder(top-level fixture)
-> plan_target_identity_missing
-> mutationStarted=false
```

修复：

- 顶层 folder 没有父 folder 时，以当前 database identity 生成稳定 database-root mutation anchor。
- guard、plan、approval 和 journal 仍绑定该 anchor。

验证：

```text
public create_folder: preflight -> ok
public create_component: preflight -> ok
automatic readback: passed
```

#### B. 新 primitive Element 被 preflight 无条件拒绝

原行为：

```text
create primitive
-> data_item_not_resolvable_preflight
-> implementation_item_not_resolvable_preflight
```

修复：

1. `read_element_catalog` 新增 `componentConfigurationProvenance`。
2. Bridge 返回 default/class Data 与 Implementation configuration 的 source、name、selected。
3. create preflight 按 Element scope 选择真实 configuration：
   - local：default Data/default Implementation
   - exported：class configuration，缺失时回退 default configuration
4. configuration 缺失、未选中或名称为空仍失败关闭。

Live readback：

```json
{
  "componentConfigurationProvenance": {
    "defaultDataConfiguration": { "configurationName": "Data", "selected": true },
    "classDataConfiguration": { "configurationName": "ClassUnderTest", "selected": true },
    "defaultImplementationConfiguration": { "configurationName": "Impl", "selected": true },
    "classImplementationConfiguration": { "configurationName": "ClassUnderTest", "selected": true }
  }
}
```

### 25.9 Live run 证据和环境阻塞

#### Run 1

```text
runId: LIVE_TOOLS_20260812-125307_C42293AC
fixture: PI_LIVE_FIX_20260812_C42293AC
```

通过：

```text
rollback success: PASS
scope guard: PASS
rollback failure -> unknown: PASS
quarantine: PASS
public inspect: PASS
follow-up write blocked: PASS
cleanup_created: PASS
guard clear: PASS
fixture cleanup in active identity: PASS
scheduler healthy: PASS
CLI lock none: PASS
```

但运行期间 database name 从：

```text
AscetDb_20260707223121
```

切换为：

```text
AscetDb_20260205055732
```

两次返回的 database path 相同，但 database name 指向不同数据库目录，违反 database identity 稳定条件。

#### Run 2

```text
runId: LIVE_TOOLS_20260812-132609_2257A020
fixture: PI_LIVE_FIX_20260812_2257A020
```

Gate 连续三次返回 `AscetDb_20260205055732`，随后完成：

```text
public fixture setup: PASS
rollback success 4 -> 0: PASS
scope guard: PASS
negative fixture cleanup: PASS
```

在 quarantine case 前，database identity 再次切换为 `AscetDb_20260707223121`，并且当前 identity 下 target 返回 `target_not_found`。按停止条件未继续新增 mutation。

当前可观测状态：

```text
current identity: AscetDb_20260707223121
PI_LIVE_FIX_20260812_2257A020: target_not_found
PI_LIVE_NEG_20260812_2257A020: target_not_found
scheduler: healthy
CLI lock: none
```

由于 alternate identity `AscetDb_20260205055732` 当前不可稳定选择，无法通过 ToolAPI 最终证明该 identity 下 fixture 不存在。数据库文件仍可能包含已删除对象、索引或 tombstone 文本，因此文件内容搜索不能替代 Live Tree readback。

证据目录：

```text
output/live-tools/LIVE_TOOLS_20260812-125307_C42293AC/
output/live-tools/LIVE_TOOLS_20260812-132609_2257A020/
```

### 25.10 最终回归结果

```text
Focused Node regression: 43/43 PASS
ASCET Bridge production build: PASS (141 source files)
ASCET Bridge non-live tests: PASS
AscetElementProvenanceOutputTest: included in Bridge test runner
npm run check: PASS
packaged AscetBridge.exe refreshed: PASS
```

### 25.11 最终判定

```json
{
  "status": "BLOCKED",
  "codeStatus": "FIXED",
  "nonLiveStatus": "PASS",
  "liveCoreCasesObserved": "PASS",
  "blockingReason": "ASCET database identity switched between AscetDb_20260707223121 and AscetDb_20260205055732 during fresh-session calls",
  "unexpectedBusinessWrites": 0,
  "elementFourToZeroVerified": true,
  "rollbackFailureQuarantined": true,
  "aliasWriteBlocked": true,
  "reconciliationVerified": true,
  "preflightFailClosed": true,
  "resolverOidConsistent": true,
  "approvalReplayRejected": true,
  "currentIdentityFixtureRemaining": false,
  "alternateIdentityFixtureRemaining": "unknown"
}
```

代码修复和 non-live 验证已完成。最终单一稳定数据库上的完整 Live 签收仍被 ASCET 环境的 database identity 切换阻塞；在固定唯一 ASCET database identity 后，只需重跑第 23 节 mandatory Live matrix，不需要继续修改当前修复代码。


## 26. 2026-08-12 最终稳定 Live 签收

用户清理导致数据库身份干扰的环境项后，重新启动全新 run：

```text
runId: LIVE_TOOLS_20260812-134514_EE770C82
fixture: PI_LIVE_FIX_20260812_EE770C82
component: PI_LIVE_FIX_20260812_EE770C82\ClassUnderTest
database: AscetDb_20260707223121
databaseFingerprint: 49be9da8ddaa5ac7b09b24a394229cbbd9a9dc3dbabadf9704da7ff25633274a
```

### 26.1 稳定 Gate

```text
database identity 10/10 identical: PASS
database name/path consistency: PASS
old fixtures absent: PASS
new fixture initially absent: PASS
ASCET quick selftest: PASS
scheduler healthy: PASS
CLI lock none: PASS
```

每个关键 mutation 前后均重新检查 database identity，整个 run 未发生变化。

### 26.2 Public fixture setup

```text
ascet_edit.create_folder preflight/write: PASS
ascet_edit.create_component preflight/write: PASS
fresh-session read_element_catalog: PASS
automatic readback: PASS
```

### 26.3 Element transaction Live cases

```text
Case A rollback success:
  requested Elements: 4
  injected failure after stage: 3
  result: element_transaction_rolled_back
  remaining Elements: 0
  status: PASS

Scope guard:
  target outside configured fixture root
  result: failure_injection_scope_invalid
  remaining Elements: 0
  negative fixture cleanup: PASS

Case B rollback failure:
  commitStatus: partial
  mutationStatus: unknown
  guard quarantined: true
  journal status: unknown
  follow-up write: mutation_target_quarantined
  cleanup_created: rolled_back
  guard cleared: true
  remaining Elements: 0
  status: PASS
```

### 26.4 Post-reconcile mutation

Guard 清除后再次通过 public flow 执行真实写入：

```text
create C_FIX_PostReconcile: PASS
restore/deleteMissing cleanup: PASS
final Element count: 0
```

证明 target 不再被错误 quarantine，并且 reconciliation 后可以继续正常 mutation。

### 26.5 顶层 folder Tree resolver 附加修复

Live 过程中发现：新建顶层 folder 可以被创建和读取，但 `get_tree` exact target 返回 `target_not_found`。

修复：

- 普通 database item lookup 失败后，shared resolver 继续尝试 folder hierarchy resolution。
- 顶层和嵌套 folder 使用同一 canonical target identity。

Live 验证：

```text
create PI_LIVE_TREE_FIX_20260812_EE770C82: PASS
get_tree depth=0: PASS
returned items: 1
delete fixture: PASS
```

### 26.6 最终清理与健康状态

```text
PI_LIVE_FIX_20260812_EE770C82: target_not_found
PI_LIVE_NEG_20260812_EE770C82: target_not_found
PI_LIVE_TREE_FIX_20260812_EE770C82: target_not_found
fixtureRemaining: false
database identity unchanged: true
ASCET selftest: PASS
scheduler healthy: true
CLI lock: none
unexpectedBusinessWrites: 0
```

### 26.7 最终回归

```text
Focused Node regression: 43/43 PASS
ASCET Bridge build: PASS (141 source files)
ASCET Bridge non-live tests: PASS
packaged AscetBridge.exe refreshed: PASS
npm run check: PASS
```

### 26.8 最终结论

第 25.11 节的环境 `BLOCKED` 结论已被本次稳定 run 取代。

```json
{
  "status": "FIXED",
  "runId": "LIVE_TOOLS_20260812-134514_EE770C82",
  "databaseIdentityStable": true,
  "fixtureRemaining": false,
  "unexpectedBusinessWrites": 0,
  "elementFourToZeroVerified": true,
  "rollbackFailureQuarantined": true,
  "followUpWriteBlocked": true,
  "reconciliationVerified": true,
  "postReconcileMutationVerified": true,
  "preflightFailClosed": true,
  "resolverOidConsistent": true,
  "topLevelFolderTreeResolved": true,
  "schedulerHealthy": true,
  "cliLockClear": true,
  "nonLiveStatus": "PASS",
  "liveStatus": "PASS"
}
```

证据目录：

```text
output/live-tools/LIVE_TOOLS_20260812-134514_EE770C82/
```
