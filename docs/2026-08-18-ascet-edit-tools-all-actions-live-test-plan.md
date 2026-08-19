# ASCET Edit Tools Database-Bound Live 测试方案

日期：2026-08-19
状态：方案重写完成；本文件只定义测试，不表示本轮已执行任何数据库写入。

## 1. 目的和证据边界

本方案针对当前运行中的 ASCET、当前打开的 canonical database，以及 17 个公开 `ascet_edit` action，定义一轮可审计的 database-bound live acceptance 测试。

硬性边界：

1. 所有写入必须通过 public `ascet_edit`。
2. database discovery 和 independent readback 必须通过新的 `AscetBridge.exe` 进程直接 CLI 完成；每条 CLI 命令都保存 stdout、stderr 和 exit code。
3. raw Bridge write 不得作为 `ascet_edit` 通过证据。raw Bridge 只能用于 discovery/readback；若误执行 raw write，该结果必须标记为非验收证据并停止本轮审计。
4. 不使用 mock database、fake ToolAPI、same-session-only readback 或 focused unit test 代替 durable database evidence。
5. 不允许含 `TODO`、placeholder selector、未解析 template request 或未冻结 fixture 的 campaign plan。
6. 在 database identity、Bridge hash、HEAD、fixture baseline、writer lock 和并发 gate 未锁定前，不得发送任何 write request。

本方案分为两个层级：

- **Phase A：17-action primary acceptance**。按 action 汇总，必须有 action-level durable 证据。
- **Phase B：55 variants / 220 scenarios**。55 个 variant 各覆盖 `changed-success`、`confirmed-no-op`、`invalid-selector`、`bridge-failure`，共 220 个 scenario。scenario 级 PASS 不等于 action 级 PASS。

## 2. 已由直接 CLI 确认的数据库事实

以下事实是本轮固定基线，不得用历史 artifact、旧报告或模糊 Search 结果替代：

```text
canonical database:
C:\Repo\F05_IPB_L2_0429

source/packaged Bridge SHA-256:
FBC9B9A443A0845673D53034687A3AB6C8A9D18926DCE7B596A397DF16A395CF

repository HEAD:
3b61ea336e80ff137dde1a4c4e7d95a3ab61d519

fresh campaign root:
PI_ASCET_EDIT_20260819_ALL_ACTIONS_001

fresh root current status:
target_not_found
```

`target_not_found` 是 fresh root 的预期 baseline：它表示该测试根尚未创建，不是本轮失败，也不允许通过 raw Bridge write 预先创建。正式 campaign 必须通过 public `ascet_edit` 的 create actions 创建该 root。

当前允许复用的 anchor project：

```text
project:
PI_ASCET_EDIT_20260818_ALL_ACTIONS_008\Core\Project

OID:
040g00001g001qg71090aneth6302

existing formulas:
ident
PiIdentity_20260818_001
PiIdentity_20260818_003
```

`_008` 中已检查的组件均为 `editable=true`。因此 `_008` 只能用于：

- 读取 database identity 和 anchor baseline；
- 读取已有 project formula baseline；
- 在 guarded formula test 中追加唯一 formula `PI_LIVE_20260819_001_IDENTITY`；
- 通过 digest guard 完成 cleanup/restore。

不得把 `_008` 中已有对象当作 destructive delete fixture，不得修改 `PlatformLibrary`、`Customer` 或其他共享对象。

## 3. 固定运行通道

### 3.1 Bridge 路径

```powershell
$sourceBridge = '.\ascetcli\output\ascet-csharp\bin\AscetBridge.exe'
$packagedBridge = '.\packages\ascet-extension\ascet-cli\bin\AscetBridge.exe'
```

source 和 packaged Bridge 的 SHA-256 必须分别计算并与固定 hash 一致。hash 不一致时 campaign 为 `BLOCKED`。

### 3.2 写入通道

写入边界固定为：

```text
public ascet_edit(request)
```

每个 write scenario 必须保存 public request、public result、mutation/save telemetry、normalized result 和 database identity before/after。即使 public implementation 内部使用 Bridge，也不能把内部 raw Bridge request 单独作为通过证据。

### 3.3 Discovery/readback 通道

每次 discovery/readback 必须直接启动新的 `AscetBridge.exe` 进程。不得复用写入调用的 ToolAPI session，不得从 public tool response 中提取 same-session readback 代替独立 CLI readback。

推荐 packaged Bridge 作为验收 readback channel；source Bridge 仅用于 hash 对照或第二通道复核。每个 readback 命令的 process id、stdout、stderr 和 exit code 都必须落盘。

## 4. Fixture 和对象生命周期

### 4.1 精确 fixture 树

正式 campaign 只允许使用以下 fresh root：

```text
PI_ASCET_EDIT_20260819_ALL_ACTIONS_001
└─ Core
   ├─ LiveClass
   ├─ LiveModule
   ├─ LiveStateMachine
   ├─ LiveEnum
   ├─ DepProvider
   ├─ DepConsumer
   ├─ DeleteMethodHost
   ├─ DeleteClass
   └─ DeleteFolder
```

固定方法名称：

```text
LiveClass\M_Live
LiveClass\P_Live
LiveModule\T_Live
DeleteMethodHost\M_Delete
```

用途约定：

- `M_Live`：`set_method_signature` 和 `set_method_code` 的主目标；
- `P_Live`：`create_method` 的主目标，changed 前不得存在；
- `T_Live`：module/state-machine code 和 binding 场景的固定方法名；
- `M_Delete`：`delete_method` 的专用目标。

`DeleteClass` 是 `delete_component` 的专用目标，`DeleteFolder` 是专用空目录目标。若 component kind 不允许某种 method/binding，必须在 fixture manifest 中记录等价 host 和 selector，不能改用共享对象或保留 TODO。

### 4.2 Fixture 规则

fixture setup 可以由 public `ascet_edit` 的前置 create actions 完成，也可以由已审查的 setup phase 完成；setup 写入同样必须通过 public `ascet_edit`，且每个对象都要有独立 CLI readback。

- create target 在 changed 前必须不存在；
- set/apply/dependency target 在 changed 前必须存在且 baseline 已冻结；
- delete target 在 changed 前必须存在、无后续依赖；
- no-op 紧跟 changed，使用同一对象和同一最终 request；
- cleanup 按 manifest 记录的逆序执行。

### 4.3 Project formula fixture

`apply_project_formula` 复用：

```text
PI_ASCET_EDIT_20260818_ALL_ACTIONS_008\Core\Project
OID 040g00001g001qg71090aneth6302
```

只允许追加：

```text
PI_LIVE_20260819_001_IDENTITY
```

开始前通过新 Bridge 进程读取完整 formula baseline 并保存 canonical digest。cleanup/restore 只有在以下条件全部满足时才允许执行：

1. project OID 仍为固定 OID；
2. 除本轮唯一 formula 外，当前 formula 集合与 baseline digest 一致；
3. 本轮是唯一 writer；
4. scheduler、CLI lock 和人工并发检查均无其他写入；
5. restore 不会删除其他操作者后来新增的 formula。

任一条件不满足，停止 cleanup，标记 `BLOCKED_NEEDS_REVIEW`，不得强制恢复 anchor project。

## 5. Readiness gate：写入前必须全部通过

### G1：源码、Bridge 和版本

- HEAD 为 `3b61ea336e80ff137dde1a4c4e7d95a3ab61d519`；
- source/packaged Bridge SHA-256 都为 `FBC9B9A443A0845673D53034687A3AB6C8A9D18926DCE7B596A397DF16A395CF`；
- 使用的 Bridge 路径与 manifest 一致；
- evidence root 为本轮唯一目录。

### G2：database identity

- `get_database_identity` 返回 path/name 与 `C:\Repo\F05_IPB_L2_0429` 匹配；
- ASCET 已打开目标数据库；
- fresh root 仍为 `target_not_found`；
- anchor project OID 与固定 OID 匹配。

### G3：scheduler 和 writer

- scheduler health 为 healthy；
- active=0、queued=0；
- CLI lock=false；
- 本轮取得独占 writer lock；
- `ASCET_LIVE_WRITER=1`；
- 无其他 live campaign、ASCET 手工修改或后台导入。

### G4：anchor baseline

- 保存 anchor project formula baseline 和 digest；
- 读取 `_008` 相关 editable 状态，确认均为 true；
- 不把 `_008` 当作 mode=set changed fixture。

### G5：mode=set 的 P0 前置

mode=set changed 只有在以下条件真实满足时才允许执行：

1. 预置专用 TCM version；
2. 目标 component 位于该专用 TCM version；
3. 新 Bridge 进程 `component_editable_check` 返回 `false`；
4. component 只属于本轮 campaign；
5. before-state 和 object identity 已写入 manifest。

当前安全测试对象均为 `editable=true`。禁止修改 `PlatformLibrary`、`Customer` 或共享 anchor 对象。没有专用只读 fixture 时：

- `mode=check` 可执行并验收为只读；
- `mode=set` no-op 可在 `editable=true` 对象上执行；
- `mode=set` changed 必须标记 `BLOCKED`，不得伪造为 PASS。

## 6. Phase A：17-action primary acceptance

Phase A 回答每个公开 action 是否有数据库级主路径。每个 action-level verdict 只能是 `PASS`、`FAIL` 或 `BLOCKED`。

| Action | Changed 场景 | Same-request no-op | 独立 CLI readback 和语义比较 | Negative / 安全 | Cleanup |
|---|---|---|---|---|---|
| `create_folder` | public `ascet_edit` 创建 fresh folder；要求 folder 出现且 Save exactly once。 | 立即重复同一 request；`changed=false`、zero-save。 | 新 Bridge `get_tree` 读取 parent，比较 folder 存在、path/OID 正确。 | fresh root 内缺失 child/非法 selector；无 mutation/Save，root 外路径禁止。 | 最后删除专用空 folder。 |
| `create_component` | 创建 `LiveClass`；比较 kind/language。 | 重复同一 path/kind/language；不得再次 Save。 | `read_component_snapshot`/summary 新进程比较 path、OID、kind、language、editable、成员。 | parent/component 不存在或 kind 错误；现有 fixture 不变。 | 依赖 action 完成后删除专用 component。 |
| `create_method` | 在 `LiveClass` 创建不存在的 `P_Live`。 | 重复同一 component/method/kind；不得创建第二个 method。 | 新进程 component snapshot/method surface 比较名称、kind、diagram/operation。 | component 不存在或 method kind 非法；不得写入。 | 完成 code 相关测试后删除 `P_Live` 或 host。 |
| `create_dependent_chain` | 在 `DepProvider`/`DepConsumer` 创建 exported/imported/local 和唯一 formula/formal/mapping。 | 重复完全相同 chain；chain unchanged、zero-save。 | 新进程 `read_dependent_chain` 比较 provider/exported、consumer/imported/local、formula、formal、variant、mapping、OID。 | provider/consumer 缺失、modelType 不匹配、formal 无效；不得留下 partial chain。 | 按依赖逆序删除 local/imported/export。 |
| `set_method_signature` | 修改 `LiveClass\M_Live` return type、参数顺序、名称和类型。 | 提交完全相同 signature；no-op、zero-save。 | 新进程 `read_method_signature` 逐字段比较 return、参数顺序/名称/类型和 ifExists。 | method 不存在、type 非法、参数冲突；确认无部分签名变化。 | 恢复 baseline signature 或删除专用 host。 |
| `delete_method` | 删除 `DeleteMethodHost\M_Delete`，目标无后续依赖。 | 用安全 missing policy 重复删除；no-op、zero-save。 | 新进程读取 host method 列表，断言 `M_Delete` 缺失，不能只依赖 target read 失败。 | 错误 host、不存在 method、越界 selector；其他方法不变。 | action 完成 cleanup；host 最后删除。 |
| `delete_component` | 删除专用 `DeleteClass`。 | 相同 selector 和安全 missing policy 重复删除；no-op。 | 新进程读 parent tree，断言 component path/OID 缺失且 sibling digest 不变。 | 不存在 component、错误 kind、root 外 selector；不得误删。 | action 完成 cleanup。 |
| `delete_folder` | 删除专用且为空的 `DeleteFolder`。 | 重复相同删除；safe no-op、zero-save。 | 新进程读 parent tree，断言 folder 缺失，parent sibling digest 不变。 | 不存在、非空或越界 folder；禁止递归影响其他 fixture。 | 必须最后执行；非空则 BLOCKED。 |
| `set_method_code` | 对 `LiveClass\M_Live` 写入唯一 code marker。 | 重复完全相同 code；no-op。 | 新进程 `read_method_code` 比较规范化后的完整 code 和 marker。 | method/component 不存在或 code 无效；原 code digest 不得异常变化。 | 恢复 baseline code 或删除 host。 |
| `set_module_code` | 对 `LiveModule` 指定 operation/surface 写入唯一 marker；method surface 使用 `T_Live`。 | 重复相同 operation/method/code；no-op。 | 新进程读取对应 module surface，比较 operation、section、method 和完整 code。 | module/operation/method/code 无效；其他 surface 不变。 | 恢复 module baseline。 |
| `set_state_machine_code` | 对 `LiveStateMachine` 预建 state/transition/method surface 写入唯一 marker。 | 重复完全相同 state-machine request；no-op。 | 新进程 `read_state_machine_snapshot`/`read_state_machine` 比较 state、transition、start-state、binding、code surface。 | state/transition/operation/binding 无效；图和其他 transition 不变。 | 恢复 baseline，再删除状态机。 |
| `set_enumerators` | 对 `LiveEnum` 写入冻结的唯一 enumerator 列表。 | 重复相同完整列表；no-op。 | 新进程 `read_element_catalog` 或 enumeration read，比较完整列表、顺序、值、类型。 | 重复值、空列表、错误 selector；不得部分覆盖。 | 恢复 baseline 或删除 enum。 |
| `apply_element_spec` | 对指定 component 应用冻结 element spec；mode、roles、kind、modelType、range、data、implementation 全部固定。 | 同一 spec、mode、flags 重复；no-op、zero-save。 | 新进程 `get_elements`/`read_element_catalog` 逐 element 比较名称、kind、scope、modelType、range、data、implementation、role fields。 | component/spec/enum/reference/dependency 无效；不得 partial mutation。 | 删除新增 elements；恢复 patch baseline；不得误用 deleteMissing。 |
| `apply_project_formula` | anchor project 追加唯一 `PI_LIVE_20260819_001_IDENTITY` formula。 | 完全相同 formula spec 重复；formula unchanged、zero-save。 | 新进程 `get_formulas` 比较完整 formula body，并证明三个 baseline formula 不变。 | project/spec/冲突/越界 selector；anchor baseline 不得破坏。 | 仅 digest guard 通过时删除唯一 formula；否则 BLOCKED_NEEDS_REVIEW。 |
| `set_element_dependency` | canonical component-target exact route：Consumer local element 连接 Provider chain。 | 重复相同 target/element/dependency/formula/mapping；no-op、zero-save。 | 新进程 `read_dependent_chain` 加 `read_element_dependency` 比较 flag、formula、formal、mapping、provider、value。 | element/provider/formal/mapping 无效；不得留下 partial dependency。legacy folder-target 放 Phase B。 | 恢复 independent/value baseline，再删除 fixture。 |
| `mode=check` | 这是只读 check，不是 mutation changed；检查专用/安全 component editable 状态。 | 立即重复 check；仍只读、zero-save。 | 新进程 `component_editable_check` 比较 boolean 和 baseline；无 mutation/Save。 | component/selector 不存在；任何数据库状态不得改变。 | 无写 cleanup。 |
| `mode=set` | 仅在专用 TCM `editable=false` fixture 上执行 `false -> true`；当前对象均 true，缺 fixture 则 BLOCKED。 | 对 `editable=true` 对象重复 set；按契约 no-op、zero-save。 | 新进程 before/after check；changed 比较 `false -> true`，no-op 比较 `true -> true`。 | 非专用只读对象、缺失 selector、PlatformLibrary/Customer；拒绝写入。 | 只清理专用 TCM fixture，不触碰共享库。 |

### 6.1 每个 action 的原子顺序

除纯 `mode=check` 外，严格执行：

```text
A. 冻结 baseline/readback
B. public ascet_edit changed request
C. 立即启动新的 AscetBridge.exe 进程做 independent readback
D. 完成语义比较并记录 changed verdict
E. 用同一个最终 request 立即执行 same-request no-op
F. 再启动新的 AscetBridge.exe 进程做 no-op readback
G. 最后执行该 action 的 negative case
```

不要先执行全部 changed 再集中 readback。delete 顺序固定为：`delete_method`、`delete_component`、`delete_folder`；`delete_folder` 最后执行且必须为空。

## 7. Durable changed/no-op/mode 判定

### 7.1 Durable changed-success

普通可变更 action 必须同时满足：

```text
publicStatus=ok
changed=true
mutationStatus=applied
saveAttempted=true
saveSucceeded=true
saveState=saved
verified=true
verificationStatus=passed
sessionCount=1
saveCount=1
nativeMutationAttemptCount=1
```

并且：

- fresh CLI readback exit code=0；
- readback 是独立 Bridge 进程；
- target identity/OID 匹配；
- actual semantic value 等于 expected postcondition；
- 差异只包含本 action 预期变更。

`partial`、`saveState=failed`、`saveSucceeded=false`、same-session-only、只有 mutationStarted、只有命令成功或只有 raw Bridge write，均不能 PASS。

### 7.2 Confirmed no-op

```text
publicStatus=ok
changed=false
mutationStatus=no_op
saveAttempted=false
saveSucceeded=false
saveState=not_required
verified=true
verificationStatus=passed
sessionCount=1
saveCount=0
nativeMutationAttemptCount=0
```

fresh CLI readback 必须证明目标值仍等于 changed-success 后的 expected value。zero-save 必须同时由 telemetry 和数据库状态不变支持。

### 7.3 mode 判定

`mode=check`：

```text
status=ok
editable=<expected boolean>
mutationStarted=false
saveAttempted=false
saveCount=0
fresh CLI readback matches baseline
```

`mode=set` changed：

```text
专用 TCM fixture
precondition editable=false
public result editable=true
postcondition fresh CLI editable=true
```

`mode=set` no-op：

```text
precondition editable=true
result/postcondition editable=true
saveCount=0
```

## 8. Phase B：55 variants / 220 scenarios

Phase B 使用仓库 runner 的固定 `ACTION_MATRIX`，不得临时删减：

```text
required variants: 55
per variant:
  changed-success
  confirmed-no-op
  invalid-selector
  bridge-failure
total scenarios: 220
```

每个 variant 必须有完整 public request、fixture manifest、expected changed/no-op postcondition、independent readback command、negative selector、bridge-failure injection、`execution=ready|blocked`。不得使用含 TODO 的 template。

以下变体必须单独列出：

- `create_dependent_chain`；
- `set_element_dependency` 的 legacy folder-target；
- module/state-machine 各 operation；
- `mode=check/set` 的 editability classifier；
- `apply_element_spec` 的 role-specific element；
- `apply_project_formula` 的 guarded anchor route。

## 9. 当前 runner 缺口和执行前 gates

### P0-1：schema validation

对每个 public request 执行真实 `ascet_edit` schema validation，对每个 readback request 执行对应 `ascet_read`/`ascet_get` schema validation。未知 action、缺失 required field、错误 enum、TODO 或错误 readback selector 不得进入 execution。

### P0-2：semantic readback comparator

不能只检查 CLI exit code。必须逐 action 比较 create 存在性/path/OID/kind、delete 缺失性/parent digest、signature 全字段、code 完整规范化内容、state-machine surface、enumerator/element 完整字段、formula body/digest、dependency chain 和 editability transition。

### P0-3：bridge-failure injection

`bridge-failure` 必须有真实注入：不存在的 executable、非零 exit、timeout/termination 或受控 failing executor。必须证明不伪造 applied、不产生错误 Save、数据库不变。没有真实注入机制时，55 个 bridge-failure scenario 全部 `BLOCKED`，不能计 PASS。

### P0-4：editability classifier

`mode=check/set` 不得使用普通 `canonicalApplied()`/`canonicalNoOp()`。必须独立判定：check 为 boolean + no mutation/no Save；set changed 为 `false -> true`；set no-op 为 `true -> true` + zero-save。

### P1-1：all-actions independent readback

所有 changed-success 和 confirmed-no-op 都强制至少一个 independent CLI readback，不能只对 dependency 和 mode=set 强制。

### P1-2：filesystem path 与 ASCET path 分离

`componentPath`、`projectPath`、`folderPath` 是 ASCET object path；`codeFile`、`specFile` 是 filesystem path。两者分别 canonicalize 和 validate：ASCET path 必须在 disposable root 或 guarded anchor project，filesystem path 必须在 evidence/temp 目录。不得把 file path 当 ASCET selector。

### P1-3：fixture setup orchestration

runner 必须显式记录 setup phase、对象 manifest、baseline readback、依赖顺序和 cleanup plan。不能假设 no-op target、delete target、state/transition/method 或 read-only TCM fixture 已存在。

### P1-4：telemetry 分类

只读、pre-Bridge validation failure、真实 Bridge failure 和 mutation scenario 的 telemetry 要按不同 contract 分类，不能一刀切要求 write telemetry。

## 10. 证据目录和 manifest

每轮使用唯一 evidence root：

```text
artifacts/ascet-edit-live/source-20260819-all-actions-live-<runId>/
```

至少保存：

```text
run-manifest.json
bridge-manifest.json
database-identity.before.json
database-identity.after.json
source-bridge-sha256.txt
packaged-bridge-sha256.txt
git-head.txt
scheduler-before.json
scheduler-after.json
writer-lock.json
anchor-project-formula-baseline.json
anchor-project-formula-baseline.digest
fixture-manifest.json
phase-a-summary.json
phase-b-summary.json
cleanup/decision.json
cleanup/result.json
```

每个 action/variant/scenario 至少保存：

```text
request/public-tool-request.json
request/public-tool-result.json
result/normalized-result.json
result/telemetry.ndjson
readback/request.json
readback/stdout.json
readback/stderr.txt
readback/exit-code.txt
readback/comparison.json
negative/request.json
negative/result.json
```

`comparison.json` 必须包含：

```text
expected
actual
identityMatched
semanticFieldsCompared
changedFields
unexpectedFields
saveCount
verdict
```

不得因为本方案而生成 campaign JSON；上述文件是正式执行时应保存的 evidence contract，不是本次文档编辑产物。

## 11. 执行顺序

### 11.1 Read-only preflight

```text
1. 读取 git HEAD 和 source/packaged Bridge hash
2. capabilities / offline selftest
3. get_database_identity
4. get_tree 确认 fresh root 为 target_not_found
5. 读取 anchor project OID 和 formula baseline
6. 检查 _008 editable 状态
7. scheduler status、writer lock、并发检查
8. 写入本轮 run manifest
```

### 11.2 Fixture setup

```text
9. public ascet_edit create_folder/create_component/create_method
10. 每个新建对象立即用新的 AscetBridge.exe 进程 readback
11. 创建/确认 LiveClass\M_Live、LiveModule\T_Live、DeleteMethodHost\M_Delete
12. 预建 LiveStateMachine 的 state/transition/binding surface
13. 预建 DepProvider/DepConsumer element baseline
14. 如有专用 TCM fixture，确认 component_editable_check=false
```

### 11.3 Phase A

```text
15. create_folder
16. create_component
17. create_method
18. set_method_signature -> fresh readback -> same-request no-op -> fresh readback -> negative
19. set_method_code -> fresh readback -> same-request no-op -> fresh readback -> negative
20. set_module_code -> fresh readback -> same-request no-op -> fresh readback -> negative
21. set_state_machine_code -> fresh readback -> same-request no-op -> fresh readback -> negative
22. set_enumerators -> fresh readback -> same-request no-op -> fresh readback -> negative
23. apply_element_spec -> fresh readback -> same-request no-op -> fresh readback -> negative
24. apply_project_formula -> fresh readback -> same-request no-op -> fresh readback -> negative
25. create_dependent_chain -> fresh readback -> same-request no-op -> fresh readback -> negative
26. set_element_dependency canonical route -> fresh readback -> no-op -> fresh readback -> negative
27. mode=check -> fresh readback -> repeated check -> fresh readback -> negative
28. mode=set changed only if P0 fixture gate passed；否则 BLOCKED
29. mode=set no-op on editable=true fixture when safe
30. delete_method -> fresh readback -> no-op -> fresh readback -> negative
31. delete_component -> fresh readback -> no-op -> fresh readback -> negative
32. delete_folder -> fresh readback -> no-op -> fresh readback -> negative
```

删除顺序固定为：

```text
delete_method -> delete_component -> delete_folder
```

`delete_folder` 必须最后执行且只能删除空的专用 folder；非空则 BLOCKED，不强制删除。

### 11.4 Phase B 和 cleanup

```text
33. 冻结 55 variants manifest
34. 对每个 variant 执行 changed-success/no-op/negative/bridge-failure
35. changed/no-op 后立即执行 fresh CLI readback
36. 汇总 scenario verdict，再单独汇总 action verdict
37. 审查 partial、save failure、BLOCKED 和 unexpected diff
38. 再读 database identity、anchor OID 和 formula digest
39. 通过 digest guard 后 restore anchor formula
40. 按 fixture manifest 逆序 cleanup
41. fresh CLI 确认 fixture root 不存在或为空
42. 保存 cleanup decision/result 和 scheduler-after
```

## 12. 可复制的只读 CLI 命令

以下命令只执行 discovery/readback，不执行 write。Windows PowerShell 传给 native `.exe` 时，JSON 必须按 `{\"...\"}` 形式写入字符串；不要把未转义双引号直接放进双引号 PowerShell 字符串。

### 12.1 Bridge hash、capability 和 offline selftest

```powershell
$bridge = '.\packages\ascet-extension\ascet-cli\bin\AscetBridge.exe'
$sourceBridge = '.\ascetcli\output\ascet-csharp\bin\AscetBridge.exe'

Get-FileHash -Algorithm SHA256 -LiteralPath $bridge
Get-FileHash -Algorithm SHA256 -LiteralPath $sourceBridge

& $bridge capabilities --json
& $bridge selftest offline --json
```

### 12.2 Database identity

```powershell
& $bridge exec get_database_identity --request-json '{}' --json
```

### 12.3 Database root 和 fresh root

```powershell
$rootRequest = '{\"scope\":\"database\",\"depth\":1,\"maxFolders\":200,\"maxComponents\":200}'
& $bridge exec get_tree --request-json $rootRequest --json

$freshRootRequest = '{\"path\":\"PI_ASCET_EDIT_20260819_ALL_ACTIONS_001\",\"depth\":2,\"maxFolders\":50,\"maxComponents\":100}'
& $bridge exec get_tree --request-json $freshRootRequest --json
```

正式 setup 前 fresh root 必须为 `target_not_found`；如果已存在，停止并重新选择未使用 root，不得删除未知来源对象。

### 12.4 Anchor project 和 formulas

```powershell
$anchor = 'PI_ASCET_EDIT_20260818_ALL_ACTIONS_008\Core\Project'

& $bridge exec read_component_snapshot $anchor --trace-depth 1 --json

$formulaRequest = '{\"projectPath\":\"PI_ASCET_EDIT_20260818_ALL_ACTIONS_008\\Core\\Project\"}'
& $bridge exec get_formulas --request-json $formulaRequest --json
```

formula readback 必须完整比较 `ident`、`PiIdentity_20260818_001`、`PiIdentity_20260818_003` 和全部 formula fields，并保存 digest。

### 12.5 Component、method、element、dependency

```powershell
$component = 'PI_ASCET_EDIT_20260819_ALL_ACTIONS_001\Core\LiveClass'

& $bridge exec read_component_snapshot $component --trace-depth 1 --json
& $bridge exec read_class_summary $component --json
$elementRequest = '{\"path\":\"PI_ASCET_EDIT_20260819_ALL_ACTIONS_001\\Core\\LiveClass\"}'
& $bridge exec get_elements --request-json $elementRequest --json
& $bridge exec read_element_catalog $component --json
& $bridge exec read_method_signature $component 'M_Live' --json
& $bridge exec read_method_code $component 'M_Live' --json
```

```powershell
$consumer = 'PI_ASCET_EDIT_20260819_ALL_ACTIONS_001\Core\DepConsumer'
$provider = 'PI_ASCET_EDIT_20260819_ALL_ACTIONS_001\Core\DepProvider'

& $bridge exec read_dependent_chain $consumer 'LocalDependent_Live' --exporter $provider --json
& $bridge exec read_element_dependency $consumer 'LocalDependent_Live' --target-kind component --json
```

### 12.6 Module、state machine、editable

```powershell
$module = 'PI_ASCET_EDIT_20260819_ALL_ACTIONS_001\Core\LiveModule'
$stateMachine = 'PI_ASCET_EDIT_20260819_ALL_ACTIONS_001\Core\LiveStateMachine'
$editableTarget = 'PI_ASCET_EDIT_20260819_ALL_ACTIONS_001\Core\LiveClass'

& $bridge exec read_module_snapshot $module --json
& $bridge exec read_module_summary $module --json
& $bridge exec read_state_machine_snapshot $stateMachine --json
& $bridge exec read_state_machine $stateMachine --json
& $bridge exec component_editable_check $editableTarget --json
```

`component_editable_check` 是只读命令。`component_editable_set` 属于写操作，本方案不把它作为独立 raw Bridge write 证据；mode=set 必须通过 public `ascet_edit` 执行。

### 12.7 Scheduler/status

scheduler/status 属于 extension 层只读工具，不是 database write：

```text
ascet_status({})
ascet_scheduler_status({"action":"status","format":"json"})
```

不得调用 `recover` 或其他写/恢复动作作为 preflight。

## 13. 失败分类和报告规则

```text
PASS:
  contract、Save、fresh readback、semantic comparison 全部通过。

FAIL:
  已执行且有明确错误，或数据库状态与 expected postcondition 不一致。

BLOCKED:
  fixture、Bridge failure injection、schema validation、writer lock、mode=set P0 或 cleanup guard 不满足。

BLOCKED_NEEDS_REVIEW:
  anchor digest、OID 或并发条件发生非预期变化，禁止继续 cleanup。
```

不得把以下结果重新标为 PASS：

- `partial`；
- `saveState=failed`；
- same-session-only；
- raw Bridge response；
- unit/live harness pass；
- scenario-level pass；
- 成功读取错误对象；
- `target_not_found` 被误解释为 delete PASS 或 setup PASS。

## 14. 完成条件

只有以下条件全部满足，才能报告完整 acceptance：

```text
Phase A: 17 action-level PASS
Phase B: 55 variants / 220 scenarios 均有 verdict
```

同时必须满足：

1. 所有普通 changed action 都有 durable Save exactly once 和 fresh-process semantic readback；
2. 所有 no-op 都有 zero-save 和 unchanged readback；
3. `mode=check` 有真实只读证据；
4. `mode=set` changed 只有在专用 TCM `editable=false` fixture 上才能 PASS；否则明确 BLOCKED；
5. 每个 action 的 negative safety 已验证；
6. bridge-failure 只有真实注入且 contract 通过才算 PASS；
7. database identity、Bridge hash、HEAD、fixture manifest 全部匹配；
8. anchor formula digest guard 通过；
9. cleanup 完成，或有明确授权保留和原因；
10. 没有任何 raw Bridge write 被计入 `ascet_edit` acceptance。

截至 2026-08-19，fresh root 为 `target_not_found`。本文件只定义执行方案；未因本次文档编辑执行任何数据库 write，也未生成 campaign JSON。
