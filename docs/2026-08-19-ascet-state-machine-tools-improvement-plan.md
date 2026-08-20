# ASCET StateMachine Tools 完善方案

## 1. 目标

补齐 ASCET StateMachine 的结构化创建、已有结构修改、精确 readback、canonical write evidence 和真实 live regression，使隔离测试能够从空 StateMachine 创建完整、可验证、可清理的状态机。

目标能力：

```text
create_method(Action/Condition/Trigger)
create_state
create_transition
set_start_state
set state entry/exit/static behavior
set transition condition/action/trigger
bind state/transition methods
read exact topology and behavior
same-request zero-save no-op
negative/conflict rejection
```

V1 不通过猜测或反射开放未经验证的 State/Transition 删除。测试 cleanup 继续删除整个隔离 StateMachine component。

## 2. 当前能力与实测结论

### 2.1 已有读取能力

现有 Bridge operation：

```text
read_state_machine_flow
```

`detailLevel=topology` 当前可返回：

```text
StateName
IsStartState
TransitionName
SourceState
TargetState
Priority
```

`detailLevel=full` 还可返回 State bindings、Transition guard/action/trigger 和 dependency/reference 信息。

### 2.2 已有写入能力

现有 `ascet_edit.set_state_machine_code` 支持：

```text
set-method
set-state-entry-esdl
set-state-exit-esdl
set-state-static-esdl
bind-state-entry-method
bind-state-exit-method
bind-state-static-method
set-transition-condition-esdl
set-transition-action-esdl
bind-transition-condition-method
bind-transition-action-method
set-start-state
```

这些操作只能修改已经存在的 State/Transition，不能创建 topology。

### 2.3 底层 ToolAPI 已确认能力

KnowledgeBase 中已确认：

```csharp
StateMachineDiagram.PlaceState(...)
StateMachineDiagram.ConnectStateToState(...)
State.SetStartState()
State.ClearStartState()
StateMachineDiagram.AddTrigger(...)
AscetStateMachine.AddActionConditionDiagram(...)
ActionConditionDiagram.AddAction(...)
ActionConditionDiagram.AddCondition(...)
Transition.SetPriority(...)
Transition.SetCondition(...)
Transition.SetConditionESDL(...)
Transition.SetAction(...)
Transition.SetActionESDL(...)
Transition.SetTrigger(...)
```

结论：ASCET ToolAPI 支持创建 State 和 Transition；当前缺口位于 Bridge 和 Public Tool 封装层。

## 3. 当前缺陷

### 3.1 P0：Action/Condition 创建路由到错误 Diagram

当前文件：

```text
ascetcli/src/AscetCopilot/AscetMethodCreate.cs
```

当前实现默认解析 `Main`，然后在目标 Diagram 上反射调用：

```text
AddAction
AddCondition
AddTrigger
```

但实际 ToolAPI 分工为：

```text
StateMachineDiagram       → AddTrigger
ActionConditionDiagram    → AddAction / AddCondition
```

因此当前真实行为是：

```text
Trigger   → 可在 Main StateMachineDiagram 创建
Action    → Main 不支持 AddAction
Condition → Main 不支持 AddCondition
```

修复要求：

- `methodKind=trigger` 使用 `StateMachineDiagram`；
- `methodKind=action|condition` 使用 `ActionConditionDiagram`；
- Action/Condition 要求显式 diagram 名，例如 `Actions`；
- ActionConditionDiagram 不存在时，使用 `AscetStateMachine.AddActionConditionDiagram(name)` 创建；
- 禁止在 `Main` StateMachineDiagram 上尝试 AddAction/AddCondition。

### 3.2 P0：StateMachine canonical result 缺少 VerificationStatus

当前文件：

```text
ascetcli/src/AscetCopilot/AscetComponentWriteDomain.cs
```

`StateMachineWriteService.BuildWriteResult()` 当前映射了：

```text
Verified
VerificationMode
```

但未映射：

```csharp
VerificationStatus = transaction.VerificationStatus
```

TypeScript fast path 要求：

```text
verified=true
verificationStatus=passed
verificationMode 非空
sessionCount=1
```

未补齐该字段时，成功写入可能被归类为：

```text
ascet_edit_canonical_evidence_invalid
```

该问题必须在新增结构写入前修复。

### 3.3 P1：缺少 topology 创建命令

当前 Bridge、contract 和 Public Tool 均没有：

```text
create_state
create_transition
```

因此新建 StateMachine 保持：

```text
states=0
transitions=0
startState=none
```

现有 `set_state_machine_code` 无法对不存在的 State/Transition 执行操作。

### 3.4 P1：Public schema 缺少 operation-specific required fields

当前 `set_state_machine_code` 使用一个包含大量 optional 字段的 schema：

```text
stateName?
sourceState?
targetState?
priority?
methodName?
code?
codeFile?
```

应改成以 `operation` 为 discriminator 的严格 union。例如：

```text
set-start-state
→ stateName required

set-transition-condition-esdl
→ sourceState, targetState, priority, code/codeFile required

bind-transition-condition-method
→ sourceState, targetState, priority, methodName required
```

非法请求应在 Bridge 前拒绝，返回 `mutationStarted=false`。

## 4. V1 Public Action 设计

### 4.1 create_state

建议请求：

```json
{
  "action": "create_state",
  "stateMachinePath": "TEST\\SM",
  "diagramName": "Main",
  "stateName": "Idle",
  "x": 100,
  "y": 100,
  "hierarchyState": null,
  "ifExists": "fail",
  "intent": "apply"
}
```

V1 约束：

- 仅支持顶层 State；
- `hierarchyState` 必须为 `null` 或省略；
- `x/y` 必须显式提供，禁止猜测；
- exact diagram 必须存在且唯一；
- 不在 create_state 内隐式设置 start state，继续使用已有 `set-start-state` operation。

底层调用：

```csharp
State state = diagram.PlaceState(stateName, x, y, null);
```

幂等策略：

```text
ifExists=fail
→ 同名存在时 state_already_exists，mutationStarted=false

ifExists=return-existing
→ exact existing 时 changed=false, saveCount=0, nativeMutationAttemptCount=0
```

### 4.2 create_transition

建议请求：

```json
{
  "action": "create_transition",
  "stateMachinePath": "TEST\\SM",
  "diagramName": "Main",
  "sourceState": "Idle",
  "targetState": "Running",
  "priority": 0,
  "sourcePoint": { "x": 100, "y": 50 },
  "targetPoint": { "x": 0, "y": 50 },
  "ifExists": "fail",
  "intent": "apply"
}
```

底层调用：

```csharp
Transition transition = diagram.ConnectStateToState(
    source,
    sourceX,
    sourceY,
    target,
    targetX,
    targetY
);
transition.SetPriority(priority);
```

Transition exact key：

```text
sourceState + targetState + priority
```

示例：

```text
Idle->Running#0
```

不得仅使用 `Idle->Running`，因为两个 State 之间可能存在多条 Transition。

前置校验：

- source State 唯一存在；
- target State 唯一存在；
- priority >= 0；
- exact source/target/priority 不存在；
- target component 为 StateMachine；
- diagramName 精确存在；
- component editable=true。

幂等策略：

```text
ifExists=fail
→ exact triple 存在时 transition_already_exists

ifExists=return-existing
→ exact triple 存在时 zero-save no-op
```

## 5. Start State 行为完善

继续使用：

```json
{
  "action": "set_state_machine_code",
  "stateMachinePath": "TEST\\SM",
  "operation": "set-start-state",
  "stateName": "Idle",
  "intent": "apply"
}
```

必须补充验证：

- 目标 State 的 `IsStartState=true`；
- 同 hierarchy 其他 State 的 `IsStartState=false`；
- 重复请求为 zero-save no-op；
- 更换 start state 时返回 previous start state；
- live test 验证 ASCET 是否自动清除旧 start flag，不得靠假设。

## 6. Bridge 事务模型

### 6.1 create_state

同一 ASCET session 内：

```text
resolve exact component
→ resolve exact diagram
→ duplicate/conflict check
→ editable check
→ PlaceState
→ Save once
→ GetAllStates same-session readback
→ exact state identity verification
```

### 6.2 create_transition

同一 ASCET session 内：

```text
resolve exact component
→ resolve exact diagram
→ resolve source/target State
→ duplicate triple check
→ editable check
→ ConnectStateToState
→ SetPriority
→ Save once
→ GetAllTransitions same-session readback
→ exact source/target/priority verification
```

### 6.3 Canonical changed result

```json
{
  "changed": true,
  "mutationStatus": "applied",
  "saveAttempted": true,
  "saveSucceeded": true,
  "saveState": "saved",
  "verified": true,
  "verificationStatus": "passed",
  "verificationMode": "same_session_exact_topology",
  "sessionCount": 1,
  "saveCount": 1,
  "editableRetryCount": 0,
  "nativeMutationAttemptCount": 1
}
```

### 6.4 Canonical no-op result

```json
{
  "changed": false,
  "mutationStatus": "no_op",
  "saveAttempted": false,
  "saveSucceeded": false,
  "saveState": "not_required",
  "verified": true,
  "verificationStatus": "passed",
  "verificationMode": "same_session_exact_topology",
  "sessionCount": 1,
  "saveCount": 0,
  "editableRetryCount": 0,
  "nativeMutationAttemptCount": 0
}
```

## 7. Readback 增强

V1 已有 topology 字段可验证基本创建：

```text
StateName
IsStartState
SourceState
TargetState
Priority
```

建议扩展 State：

```text
name
kind
isStartState
hierarchyName
graphicalObjectIdentifier
width
height
```

建议扩展 Transition：

```text
sourceState
targetState
priority
graphicalObjectIdentifier
condition mode/code/method
action mode/code/method
trigger
```

KnowledgeBase 未明确提供 State/Transition 坐标 read API。V1 将 `x/y` 定义为 placement 参数，不声称坐标完成 exact readback；结构 verification 以 state identity 和 transition triple 为准。

## 8. 权限与运行策略

建议权限：

```text
create_state       → medium, requiresEditableTarget=true, requiresReadback=true
create_transition  → high, autoApprovable=false, requiresEditableTarget=true, requiresReadback=true
set-start-state    → high（保持现有 set_state_machine_code high）
```

初始 Bridge profile：

```text
lane=serial_write
hostEligible=false
transportPolicy=one_shot_only
resourceKey=ascet.toolapi.global
```

结构写入先保持 force-one-shot，完成稳定性验证后再评估 write host。

## 9. 暂不开放结构删除

KnowledgeBase 已确认创建 API，但尚未找到明确的：

```text
RemoveState
RemoveTransition
```

V1 不通过反射猜测删除 API。

当前测试 cleanup 使用：

```text
delete_component <isolated StateMachine>
```

后续只有在底层删除能力经过静态和 live 验证后，才增加：

```text
delete_transition
delete_state
```

删除顺序必须为：

```text
transition → state
```

## 10. V2 apply_state_machine_spec

低层 Action 稳定后，增加声明式高层 Action：

```json
{
  "action": "apply_state_machine_spec",
  "stateMachinePath": "TEST\\SM",
  "diagramName": "Main",
  "states": [
    { "name": "Idle", "x": 100, "y": 100, "start": true },
    { "name": "Running", "x": 300, "y": 100 }
  ],
  "transitions": [
    {
      "source": "Idle",
      "target": "Running",
      "priority": 0,
      "condition": { "mode": "esdl", "code": "input > 0" },
      "action": { "mode": "method", "methodName": "onStart" }
    }
  ],
  "deleteMissing": false,
  "intent": "apply"
}
```

单 session 执行顺序：

```text
create Action/Condition/Trigger methods
→ create States
→ set start State
→ create Transitions
→ apply condition/action/trigger bindings
→ Save once
→ full topology readback
```

V2 初始必须固定：

```text
deleteMissing=false
```

## 11. 实现文件清单

### 11.1 Bridge/C#

修改：

```text
ascetcli/src/AscetCopilot/AscetComponentWriteDomain.cs
ascetcli/src/AscetCopilot/AscetMethodCreate.cs
ascetcli/src/AscetCopilot/AscetReadDomain.cs
ascetcli/src/AscetCli/Bridge/AscetLegacyOperationRegistry.cs
ascetcli/src/AscetCli/Bridge/InProcessLegacyOperationAdapter.cs
ascetcli/src/AscetCli/Routing/OperationRegistry.cs
```

新增：

```text
ascetcli/src/AscetCopilot/AscetStateMachineStructureWrite.cs
ascetcli/src/AscetCli/AscetCreateState.cs
ascetcli/src/AscetCli/AscetCreateTransition.cs
ascetcli/contracts/commands/AscetCreateState.json
ascetcli/contracts/commands/AscetCreateTransition.json
```

是否加入 `AscetWriteHostDispatcher` 在 one-shot live 验证通过后决定；V1 不要求 hostEligible。

### 11.2 TypeScript/Public Tool

新增：

```text
packages/ascet-extension/src/create-state.ts
packages/ascet-extension/src/create-transition.ts
```

修改：

```text
packages/ascet-extension/src/tools/actions/contracts/edit.ts
packages/ascet-extension/src/edit/contract.ts
packages/ascet-extension/src/edit/service.ts
packages/ascet-extension/src/edit/fast-path.ts
packages/ascet-extension/src/permissions/descriptors.ts
packages/ascet-extension/src/routing/coverage.ts
```

Public action 数量：

```text
17 → 19
```

V2 增加 `apply_state_machine_spec` 后为 20。

### 11.3 Catalog/packaged assets

更新 source contracts 和 catalog 后，通过现有复制流程同步：

```text
ascetcli/contracts/**
ascetcli/output/ascet-csharp/bin/AscetBridge.exe
→ packages/ascet-extension/ascet-cli/contracts/**
→ packages/ascet-extension/ascet-cli/bin/AscetBridge.exe
```

必须校验 source/package Bridge SHA256 一致。

## 12. 测试方案

### 12.1 C# 单元/行为测试

覆盖：

```text
create_state argument parsing
create_transition argument parsing
exact diagram resolution
duplicate fail
return-existing no-op
missing source State
missing target State
invalid priority
ambiguous State
ambiguous Transition
Save failure
readback mismatch
canonical result fields
ActionConditionDiagram routing
Trigger StateMachineDiagram routing
```

### 12.2 TypeScript 测试

覆盖：

```text
strict schemas
operation-specific required fields
action contract matrix 17 → 19
permission descriptors
fast-path direct dispatch
route manifest
contract/catalog parity
capabilities discovery
canonical evidence classification
observation invalidation
```

### 12.3 真实 live regression

在新隔离 campaign 中执行：

```text
create StateMachine

create_state Idle
→ fresh topology readback
→ same-request zero-save no-op

create_state Running
→ fresh topology readback
→ same-request zero-save no-op

set-start-state Idle
→ fresh readback
→ same-request zero-save no-op

create_transition Idle->Running#0
→ fresh topology readback
→ same-request zero-save no-op

create_method Action
create_method Condition
create_method Trigger
→ fresh method catalog
→ same-request zero-save no-op

bind State/Transition methods
set State/Transition ESDL
→ fresh full readback

negative duplicate/conflict tests
→ confirm mutationStarted=false

cleanup isolated StateMachine component
→ fresh target_not_found
```

每个调用记录：

```text
Public seconds
Bridge seconds
changed
saveCount
nativeMutationAttemptCount
verificationStatus
fresh readback
```

## 13. 分阶段实施顺序

### Phase 0：修复现有状态机写路径

1. 补齐 `VerificationStatus`；
2. 将 set_state_machine_code schema 改为 operation-specific union；
3. 修复 Action/Condition/Trigger Diagram 路由；
4. 增加现有路径回归测试。

### Phase 1：结构创建 MVP

1. 实现 `create_state` Bridge/domain/contract；
2. 实现 `create_transition` Bridge/domain/contract；
3. 接入 Public `ascet_edit`；
4. 完成 canonical evidence 和 topology readback；
5. 同步 packaged Bridge/contracts。

### Phase 2：真实 live 验证

1. 新建隔离 StateMachine campaign；
2. 执行 changed/readback/no-op/negative；
3. 执行 Action/Condition/Trigger 和 binding；
4. 记录 Public/Bridge 秒级 Timing；
5. cleanup 并验证 scheduler/lock。

### Phase 3：声明式完整状态机

1. 实现 `apply_state_machine_spec`；
2. 单 session、单 Save；
3. `deleteMissing=false`；
4. full topology readback；
5. 后续独立调研删除和 hierarchy mutation。

## 14. 完成标准

满足以下条件后，StateMachine Tools 可视为 V1 完成：

```text
create_state changed/readback/no-op PASS
create_transition changed/readback/no-op PASS
set-start-state changed/readback/no-op PASS
Action create/readback/no-op PASS
Condition create/readback/no-op PASS
Trigger create/readback/no-op PASS
State and Transition code/binding PASS
negative/conflict mutationStarted=false
all changed writes saveCount=1
all no-op writes saveCount=0
all calls sessionCount=1
cleanup target_not_found
scheduler healthy
active=0
queued=0
CLI lock=false
```

## 15. 推荐优先级

```text
P0 VerificationStatus canonical evidence
P0 ActionConditionDiagram routing
P1 create_state
P1 create_transition
P1 operation-specific schemas
P1 topology readback enhancement
P2 apply_state_machine_spec
P2 hierarchy state support
P3 delete_transition/delete_state（底层 API 验证后）
```