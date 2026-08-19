# ASCET Edit Tools 全量 Live 测试方案

日期：2026-08-18

## 1. 目的

基于当前 ASCET 数据库，对 17 个公开 `ascet_edit` action 执行真实 Live 测试。

本方案不使用 mock 数据库、不把 focused unit test 当作 Live 证据，并分别验证：

- changed-success：真实 mutation、Save、独立 readback；
- confirmed-no-op：重复请求不产生 Save；
- invalid-selector / bridge-failure：失败安全；
- `mode=check`：只读行为，不计为写入。

## 2. 固定环境

```text
database:
C:\Repo\F05_IPB_L2_0429

project:
PI_ASCET_EDIT_20260818_ALL_ACTIONS_008\Core\Project

source Bridge:
ascetcli/output/ascet-csharp/bin/AscetBridge.exe

packaged Bridge:
packages/ascet-extension/ascet-cli/bin/AscetBridge.exe
```

Source / packaged Bridge 当前 SHA-256：

```text
FBC9B9A443A0845673D53034687A3AB6C8A9D18926DCE7B596A397DF16A395CF
```

之前使用过的共享对象：

```text
PlatformLibrary\Parameter\Environment\_Environment_MBP
```

该对象已经被之前授权的测试设置为 `editable=true`。本方案不再使用它作为 `mode=set` 的 changed fixture，避免继续污染共享库。

## 3. Fixture 策略

每一轮使用唯一测试根目录：

```text
PI_ASCET_LIVE_20260818_<runId>\Core\LiveFixture
```

建议 Fixture 对象：

```text
LiveFolder
LiveClass
LiveModule
LiveMethod
LiveProvider
LiveConsumer
LiveLocalElement
LiveEnum
LiveFormula
LiveStateMachine
DeleteFolder
DeleteClass
DeleteMethod
```

所有新对象都创建在当前数据库的测试项目内。测试开始前保存 manifest，记录 path、OID、初始状态和预期清理顺序。

## 4. 17-action 测试矩阵

| Action | Changed 测试 | 独立 readback | No-op / 只读测试 |
|---|---|---|---|
| `create_folder` | 创建 `LiveFolder` | 确认目录存在 | 再次创建，确认 no-op |
| `create_component` | 创建 `LiveClass` | 读取 component | 再次创建，确认 no-op |
| `create_method` | 创建 `LiveMethod` | 读取 method | 再次创建，确认 no-op |
| `create_dependent_chain` | 创建 Provider、Consumer、Local 和 dependency | `read_dependent_chain` 新进程读取 | 重复提交相同 chain |
| `set_method_signature` | 修改 `LiveMethod` 返回值和参数 | 独立读取方法签名 | 重复提交相同签名 |
| `delete_component` | 删除专用 `DeleteClass` | 确认 component 不存在 | 再次删除，确认安全 no-op |
| `delete_method` | 删除专用 `DeleteMethod` | 确认 method 不存在 | 再次删除，确认安全 no-op |
| `delete_folder` | 删除空的 `DeleteFolder` | 确认 folder 不存在 | 再次删除，确认安全 no-op |
| `set_method_code` | 写入唯一代码标记 | 独立读取 method code | 重复写入相同代码 |
| `set_module_code` | 写入唯一 module code | 独立读取 module code | 重复写入相同代码 |
| `set_state_machine_code` | 写入唯一 state-machine code | 独立读取状态机代码 | 重复写入相同代码 |
| `set_enumerators` | 写入唯一枚举和值 | 独立读取 enumerators | 重复提交相同枚举 |
| `apply_element_spec` | 设置唯一 element spec | 独立读取 element spec | 重复提交相同 spec |
| `apply_project_formula` | 写入唯一 project formula | 独立 formula readback | 重复提交相同 formula |
| `set_element_dependency` | 设置 Consumer 到 Provider 的 dependency | 独立 dependency readback | 重复提交相同 dependency |
| `mode=check` | 检查新对象初始 editable 状态 | 新进程检查 | 再次 check，确认无 Save |
| `mode=set` | 新对象 `editable=false -> true` | 新进程检查为 true | 再次 set，记录幂等行为 |

## 5. 推荐执行顺序

```text
1. get_database_identity
2. 校验 Bridge SHA-256
3. 校验 scheduler 空闲、无 writer lock
4. 创建 LiveFixture 和 manifest
5. create_folder
6. create_component
7. create_method
8. set_method_signature
9. set_method_code
10. set_module_code
11. set_state_machine_code
12. set_enumerators
13. apply_element_spec
14. apply_project_formula
15. create_dependent_chain
16. set_element_dependency
17. 创建 mode 专用对象
18. mode=check
19. mode=set
20. 对所有 changed action 执行独立 readback
21. 对所有 action 执行 confirmed-no-op
22. 执行 invalid-selector / bridge-failure 安全场景
23. 人工审查证据
24. 清理临时 Fixture
```

删除类 action 使用独立对象，不能提前删除仍被其他 action 使用的对象。

## 6. Durable changed-success 判定

一个 changed action 只有同时满足以下条件，才能判定为真实持久化写入：

```text
status=ok
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

此外必须使用新进程或独立 Bridge session readback，确认数据库中的目标值已经改变。

以下情况不能计为 PASS：

```text
status=partial
saveState=failed
saveSucceeded=false
same-session-only readback
只有 mutationStarted=true，没有 Save 证据
只有 focused unit test 通过
```

特别关注 `set_method_signature`，曾经出现过 `changed=true` 但 `saveState=failed` 的 partial 结果，必须重新验证。

## 7. No-op 和只读判定

### Confirmed no-op

```text
status=ok
changed=false
mutationStatus=no_op
saveAttempted=false
saveSucceeded=false
saveState=not_required
saveCount=0
nativeMutationAttemptCount=0
verified=true
```

### `mode=check`

```text
status=ok
mutationStarted=false
saveCount=0
```

`mode=check` 是只读 action，不能把它当作真实写入 action。

## 8. 失败安全场景

每个 action 至少保留一个 invalid-selector 或等价无效请求，验证：

- 不进入真实 mutation；
- 不产生 Save；
- 返回明确错误；
- 不破坏已存在的 Fixture；
- 能通过独立 readback 证明状态未变化。

Bridge failure 场景需要验证：

- Bridge 错误被保留；
- 不伪造 `mutationStatus=applied`；
- 不把 partial 或 BLOCKED 提升为 PASS；
- 后续 action 仍能继续执行。

## 9. 证据布局

每轮使用唯一目录：

```text
artifacts/ascet-edit-live/source-20260818-all-actions-live-<runId>/
```

保留：

```text
database-identity.json
bridge-identity.json
campaign-plan.json
campaign-summary.json
manifest-before.json
manifest-after.json
```

每个 action 至少保留：

```text
<action>.changed.request.json
<action>.changed.response.json
<action>.changed.readback.json
<action>.noop.request.json
<action>.noop.response.json
<action>.noop.readback.json
<action>.negative.response.json
```

每个 action 的最终记录字段：

```text
action
scenario
status
changed
mutationStatus
saveAttempted
saveSucceeded
saveState
saveCount
nativeMutationAttemptCount
readbackStatus
evidencePath
```

## 10. 最终完成条件

只有以下条件全部满足，才能报告全量 `17 PASS`：

- 16 个可变更 action 都有至少一个 durable changed-success；
- `mode=check` 有真实只读验证；
- 每个 changed action 都有独立 readback；
- 每个 no-op action 都有 zero-save 证据；
- 没有 partial、BLOCKED 或 in-memory-only 结果被提升为 PASS；
- database identity 和 Bridge hash 全部匹配；
- 临时 Fixture 的 cleanup 在证据审查后完成或有明确授权保留说明。

## 11. 当前进度

```text
测试方案：已完成并落盘
全量 17-action live 执行：未开始
本次中断尝试产生的新 live 调用：0
新 campaign 结果：暂无
```

当前已确认的历史修复证据：

```text
create_dependent_chain:  changed write + independent readback
set_element_dependency:  changed write + independent readback
mode=set:                editable=false -> editable=true + postcondition
```

这些历史证据不替代本方案要求的全量 17-action fresh live campaign。
