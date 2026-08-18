# ASCET Edit Tools Bug 修复与 Live 测试进度报告

更新时间：2026-08-18

## 1. 当前阶段

当前处于：**代码修复后的验证阶段，最终 17-action live 验收尚未完成**。

已完成核心协议问题分析、部分 C#/TypeScript 修复、Bridge 重建和多项 focused test。当前主要剩余工作是：

1. 验证最新 TypeScript 修改；
2. 补跑剩余 C# focused test 和 `npm run check`；
3. 使用当前最终 Bridge 在新 Project 上重跑关键真实写入；
4. 依据新证据重新生成 17-action 最终矩阵。

旧结论：

```text
15 PASS / 2 FAIL
```

已经失效，不应作为最终验收结论。

## 2. 固定测试环境

```text
database: C:\Repo\F05_IPB_L2_0429
database fingerprint: 71cf3289aea80d1926ff9e419192dad40c7e01621ffdbdfde6da15f93b74a33c
project: PI_ASCET_EDIT_20260818_ALL_ACTIONS_008\Core\Project
live writer: ASCET_LIVE_WRITER=1
cleanup: 不执行，保留真实写入对象和证据
```

当前 Bridge：

```text
source:
ascetcli/output/ascet-csharp/bin/AscetBridge.exe

packaged:
packages/ascet-extension/ascet-cli/bin/AscetBridge.exe

SHA-256:
4C666BB405C25C06DAA8057B92F9029F7E2D47D7FCC5F447F13CB18434245452
```

源 Bridge 与 packaged Bridge SHA-256 一致。

## 3. Bug 修改进度

| Bug | 状态 | 当前修改 | 验证状态 |
|---|---|---|---|
| public `mutationResult` 未展开 `raw.data.result.payload` | 已修改 | `service.ts` 继续读取 nested `result.payload`，公开 canonical 字段 | TypeScript focused test 待重跑 |
| no-op 错误接受 `saveAttempted=false`、`saveSucceeded=true` | 已修改 | fast-path 要求 no-op 必须为 `saveSucceeded=false` | 新增回归测试，待重跑；真实 no-op live 待执行 |
| no-op 被误判为 Save failure | 已修改 | 仅 changed write 的 `saveSucceeded=false` 或 `saveState=failed` 判定为 Save failure | TypeScript focused test 待重跑 |
| code-write 测试未复制 `verificationStatus` | 已修改并通过 | `AscetCodeWriteBehaviorTest.cs` 三个 `CopyProtocol` overload 补充字段 | focused test PASS，94 assertions |
| `set_method_signature` 成功 Save 后未稳定输出成功证据 | 已修改 | C# 写入结果补齐 canonical Save evidence | focused test PASS；最终真实 changed write 待重跑 |
| code write 输出缺少 canonical verification 字段 | 已修改 | Module/StateMachine/Method code 路径统一输出协议字段 | focused test PASS；最终 live 待重跑 |
| `apply_element_spec` SaveState 由 attempted 推断，失败时可能报告 `saved` | 已修改 | 改为 `saved / failed / not_required` 三态 | focused test PASS；最终 live 证据待确认 |
| `create_component` already-existed 被当作 Save 成功 | 已修改 | 返回结果不再使用 `alreadyExisted` 推导 Save 成功 | focused test PASS；真实 no-op live 待执行 |
| `create_folder` 内部 no-op 默认 `SaveSucceeded=true` | 部分收敛 | public formatter 已输出 no-op `saveSucceeded=false`、`saveState=not_required` | 底层内部语义仍不统一；真实 no-op live 必须验证 public contract |
| write executor 异常路径丢失 Save/verification payload | 未修复 | catch 路径仍返回空 `Payload` | 当前成功写入非直接 blocker；失败证据完整性问题仍存在 |
| Formula JSON 同时输出大小写重复字段 | 未修复 | 同时存在 `SaveSucceeded/saveSucceeded`、`VerificationMode/verificationMode` | PowerShell 等大小写不敏感解析器可能失败 |
| `set_element_dependency` 无 authoritative Save 证据 | 未修复 | 旧 live 为 changed=true，但 `saveAttempted=false`、`saveCount=0` | 当前明确 FAIL |
| `create_dependent_chain` 被 extension `write_rejected` | 未修复 | 尚无可证明 canonical Bridge result | 当前明确 FAIL |

## 4. Focused Test 进度

已通过：

```text
AscetCodeWriteBehaviorTest                    PASS, 94 assertions
AscetComponentCreateFastWriteTest             PASS
AscetApplyElementSpecFastWriteTest             PASS
AscetSetMethodSignatureOutputTest              PASS
```

待执行或重新执行：

```text
packages/ascet-extension/src/edit/service.fast-path.test.ts
预期：10 tests

AscetSetElementDependencyOutputTest
npm run check
```

说明：最新 TypeScript 修改发生在上一次 `npm run check` 之后，因此之前的 check 结果不能作为最终结果。

## 5. Live 测试进度

### 5.1 已保留证据

```text
artifacts/ascet-edit-live/source-20260818-create-folder-canonical-002/
artifacts/ascet-edit-live/source-20260818-remaining-actions-001/
artifacts/ascet-edit-live/source-20260818-method-code-retest-001/
artifacts/ascet-edit-live/source-20260818-dependent-chain-direct-001/
artifacts/ascet-edit-live/source-20260818-project-formula-direct-001/
artifacts/ascet-edit-live/source-20260818-all-actions-008/
```

`source-20260818-all-actions-008` 当前只有 runtime telemetry、stdout 和 stderr，共 3 个文件；尚未形成完整的逐 action request/response/readback 证据集。

### 5.2 当前保守 action 矩阵

以下是当前可用于继续测试的保守分类，不是最终验收结果：

| Public action | 当前状态 | 说明 |
|---|---|---|
| `create_folder` | 暂定 PASS | changed write 有旧证据；最终 Bridge no-op 待重跑 |
| `create_component` | 暂定 PASS | changed write 有旧证据；最终 Bridge no-op 待重跑 |
| `create_method` | 暂定 PASS | 有真实创建证据 |
| `create_dependent_chain` | FAIL | `write_rejected`，缺少 canonical result |
| `set_method_signature` | 待最终重跑 | 修复和 focused test 已完成，需 fresh method changed write |
| `delete_component` | 暂定 PASS | 有真实删除证据 |
| `delete_method` | 暂定 PASS | 有真实删除证据 |
| `delete_folder` | 暂定 PASS | 有真实删除证据 |
| `set_method_code` | 暂定 PASS | 有真实代码写入和独立 readback 证据 |
| `set_module_code` | 待最终重跑 | 需当前 Bridge `set-method` changed write |
| `set_state_machine_code` | 待最终重跑 | 需当前 Bridge `set-method` changed write |
| `set_enumerators` | 待最终重跑 | 需新有序枚举值和顺序 readback |
| `apply_element_spec` | 暂定 PASS | 有真实 element 写入证据 |
| `apply_project_formula` | CONDITIONAL PASS | Bridge write/readback 成功；独立 public readback 尚未闭环 |
| `set_element_dependency` | FAIL | mutation/readback 成功但无 Save 证据 |
| `mode=check` | 暂定 PASS | read-only，返回 `editable=true` |
| `mode=set` | BLOCKED | 未证明 `editable=false -> true` 状态转换 |

当前统计：

```text
provisional PASS:       9
pending final rerun:    4
conditional PASS:       1
FAIL:                   2
BLOCKED:                1
total:                 17
```

所有 provisional PASS 仍需结合当前 Bridge SHA 和最终证据审查后才能转为 final PASS。

## 6. 下一轮真实写入测试

按以下顺序执行：

1. `set_method_signature`
   - 创建 fresh method；
   - 执行真实 changed write；
   - 要求 `saveSucceeded=true`、`saveCount=1`。
2. `set_enumerators`
   - 写入新的有序列表；
   - 精确验证名称和顺序。
3. `set_module_code`
   - target：`PI_ASCET_EDIT_20260818_ALL_ACTIONS_008\Core\PiSmokeModule`；
   - operation：`set-method`。
4. `set_state_machine_code`
   - target：`PI_ASCET_EDIT_20260818_ALL_ACTIONS_008\Core\PiSmokeStateMachine`；
   - operation：`set-method`；
   - method：`trigger`。
5. `create_component` no-op
   - `ifExists=return-existing`；
   - 必须证明 `saveAttempted=false`、`saveSucceeded=false`、`saveState=not_required`、`saveCount=0`。
6. `create_folder` no-op
   - 对已存在路径重复创建；
   - 要求相同 no-op Save 语义。
7. `apply_project_formula`
   - 补独立 public formulas readback。
8. `mode=set`
   - 只有找到 `editable=false` fixture 并证明 `false -> true` 才能 PASS；否则保持 BLOCKED。

每次 live 必须保留：

```text
public request
public response
Bridge request
Bridge stdout/stderr
telemetry
readback
Bridge SHA-256
timing
```

## 7. 完成条件

最终验收前必须同时满足：

- TypeScript focused test PASS；
- 所有相关 C# focused tests PASS；
- `npm run check` PASS；
- 当前 packaged Bridge SHA 被记录；
- 关键 action 使用当前 Bridge 完成 fresh live write；
- no-op Save 语义通过真实验证；
- Luna 对最终证据和 action 分类完成复审；
- `docs/2026-08-18-ascet-edit-tools-acceptance-spec.md` 移除过时的 `15 PASS / 2 FAIL` 结论并写入最终矩阵。
