# AEB Hold 后 AVH 重复激活及 APB Apply 调试分析

## 1. 结论

### 1.1 主根因

主根因不是 `AVHActivationByBrakePedal` 的“压力记忆”，而是 **AEB 接管 Hold 请求与 DriveOff 请求的仲裁不完整**：

1. `AVH_CustStateLogic` 以电平条件持续产生 `CM_AVH_CustTrigHold=true`：
   - `LDMSelectedController == LDMSelectedController_AEB`
   - `AVH_Standstill == true`
   - `OnePedalToStop_Active == false`
   - `CsmHoldState` 不属于 `NotActive/Deact/DriveOff/DriveOffTrqBal`
2. 该条件没有检查：
   - `DriverAccelPedalApplied`
   - `DriveOffRequested`
   - AEB Hold 请求是否为一次性、是否已被 AVH 消费
   - AEB 本次制停事件是否已经被驾驶员起步动作终止
3. `AVH_TriggerAvhStatemachine` 中，`req_DriveOff == false` 只限制“标准制动踏板激活路径”，没有限制 `CustTrigHold` 和 `ADSRequestAVH_Trigger` 路径。
4. 因此可同时出现：
   - `req_DriveOff = true`
   - `CustTrigHold = true`
   - `trig_Hold = true`
5. 油门松开后 `DriveOffRequested` 立即消失，但 AEB controller 选择、Standstill 或 CSM Hold 状态可能仍满足 Hold 条件，`CM_AVH_CustTrigHold` 再次置位，造成 AVH 在 Hold/DriveOff/Standby 间反复进入。

这与用户观察“AVH 接管时踩油门，松开后 AVH 反复激活”直接一致。

### 1.2 APB Apply 的直接原因

踩制动本身不会直接请求 APB Apply。状态机只有进入 `MechHold` 才输出：

```text
AVHParkReq = CSMParkReq_Apply
ParkReqTriggered = true
```

`MechHold` 的触发源为：

```text
TargetStateAvh != AVH_On
OR !AvhValidityOk
OR CurrentSystemMode != NORMAL
OR !DriverPresence
OR (AvhTimeUp && AvhState == Hold)
OR RollPrevOver
OR StateDrvUnit == Off
OR CustTrigTakeOver
```

PDF 将原因直接归为 `RollPrevOver`，当前证据不足。PDF 图中还出现 `VCUTarGearLvr = P_Park_gear`，而实码存在：

```text
GearBoxValid && AvhGear == P(-3)
    -> CM_AVH_CustTrigTakeOver = true
    -> trig_MechHold = true
    -> MechHold
    -> CSMParkReq_AVH = Apply
```

因此 APB Apply 必须重点区分两个候选：

1. **P 挡触发 `CM_AVH_CustTrigTakeOver`**：PDF 已有 P 挡信号证据，优先级较高。
2. **`RollPrevOver` 达到最大防溜次数**：逻辑成立，但 PDF 没有 `CSMCountRollPrev/RollPrevOver` 实测信号，尚未证实。

判断方法：比较 `CM_AVH_CustTrigTakeOver`、`RollPrevOver` 与 `CSMParkReq_AVH=Apply` 的 20 ms 原始时序，谁先置位即为直接触发源。

## 2. PDF 时序

PDF 给出的关键时间：

| 时间 | 事件 |
| --- | --- |
| 09:40:05.623 | AEB Active |
| 09:40:06.643 | AVH 第一次 Active |
| 约 09:40:06.994 | 深踩油门，DriveOff 请求应置位 |
| 09:40:07.643 | AVH Standby |
| 09:40:08.263 | AVH 第二次 Active |
| 09:40:11.003 | AVH 第三次 Active |
| 09:40:13.343 | AVH Standby |
| 约 09:40:13.363 | APB Applying |
| 约 09:40:14.403 | APB Applied |

这些是云端/图表抽样时间，不足以判断同一 20 ms proc 内的执行先后。原始 xlsx 未随 PDF 附带，也不在 Downloads 中。

## 3. ASCET Database CLI 证据

数据库：

```text
C:\Repo\13_XIAOMIAVH\px_Backup\px_Backup
```

### 3.1 `CM_AVH_CustTrigHold` 生成逻辑

组件：

```text
PlatformLibrary\Package\AVH_AutomaticVehicleHold\private\AVH_CustStateLogic
```

实码：

```text
if (CM_AVH_CustTrigRelease || CM_AVH_CustCondDisableHold)
{
    CM_AVH_CustTrigHold = false;
}
else if (LDMSelectedController == AEB
      && AVH_Standstill
      && !OnePedalToStop_Active
      && CsmHoldState != NotActive
      && CsmHoldState != Deact
      && CsmHoldState != DriveOff
      && CsmHoldState != DriveOffTrqBal)
{
    CM_AVH_CustTrigHold = true;
}
```

缺陷点：这是持续电平请求，不是 AEB Hold 接管的一次性脉冲；也没有驾驶员起步后的“本次 AEB 接管已消费”锁存。

### 3.2 DriveOff 与 Hold 仲裁

组件：

```text
PlatformLibrary\Package\AVH_AutomaticVehicleHold\private\AVH_TriggerAvhStatemachine
```

实码结构：

```text
req_DriveOff = ... && DriveOffRequested;

trig_Hold = HoldCoreConditions
         && !CustCondDisableHold
         && (
              StandardBrakePath && !req_DriveOff
              || CustTrigHold
              || ADSRequestAVH_Trigger
            )
         && !trig_Release;
```

关键点：`!req_DriveOff` 不在整个 OR 外部。因此 `CustTrigHold=true` 时，油门导致的 DriveOff 请求不能禁止 `trig_Hold`。

### 3.3 AVH 状态机的握手窗口

组件：

```text
PlatformLibrary\Package\AVH_AutomaticVehicleHold\private\AVH_StateMachine
```

`Trig_DriveOff` 不是看到油门后立即置位，而是还要求 CSM 已进入：

```text
CsmHoldState == DriveOff
OR CsmHoldState == DriveOffTrqBal
OR CsmHoldState == Deact
```

在此之前，AVH 仍可保持 `Hold` 状态，但把 `AVHHoldReq` 改为 `DriveOff`。这形成一个 CSM 确认窗口：

```text
油门置位
-> AVHReq_DriveOff=true
-> Hold 状态输出 CSMHoldReq_DriveOff
-> 等待 CSMHoldState 反馈 DriveOff/Deact
-> 才真正触发 AVH 状态迁移
```

若油门短按后松开，或者 `CustTrigHold` 在该窗口持续为真，就可能在 CSM/AVH 两个状态机之间形成重入和抖动。

### 3.4 APB Apply 链路

已验证链路：

```text
AVH_TriggerAvhStatemachine.trig_MechHold
-> AVH_StateMachine: Hold -> MechHold
-> AVHParkReq = CSMParkReq_Apply
-> AVH20ms::CSMParkReq_AVH
-> Asw2Asw_AVH / CSM 仲裁
-> APB Apply
```

消息目录确认：

- `AVH20ms::CSMParkReq_AVH`：send message
- `Asw2Asw_AVH::CSMParkReq_AVH`：跨模块转发
- `Asw2Asw_CSM::CSMParkReq_AVH`：CSM 输入

## 4. PDF 原分析中的错误

### 4.1 `AVHActivationByBrakePedal` 不会在压力消失后自动保持 true

实码每个周期先执行：

```text
AVHActivationByBrakePedal = false;
AVHPressureSuffcient = false;
```

最终置位仍要求本周期：

```text
ActivationAllowedInNewBrakeCycle
&& AVHPressureSuffcient
&& !DeactivationBrakeCycle
&& !OnePedalToStop_Active
```

所以 PDF 中“以前压力足够一次，之后即使压力为 0 仍保持 true”的描述不成立。

### 4.2 `DeactivationBrakeCycle` 不是重复激活的正反馈

当 `DeactivationBrakeCycle == true` 时，代码明确强制：

```text
AVHActivationByBrakePedal = false
```

它复位过慢会阻止重新激活，而不是促成重新激活。PDF 对该变量的因果方向判断相反。

### 4.3 `C_AVH_DGearActivationPressure = 0` 是敏感性问题，不是本问题主根因

阈值为 0 时，任何非零 `ABrkAct` 都可能使压力充分条件成立，确实过于敏感。但：

- `ABrkAct == 0` 时使用的是严格 `>`，不会置位。
- 当前已观察到 `CM_AVH_CustTrigHold=true`，该路径完全绕过制动踏板激活条件。

因此提高该阈值可以降低误触发，但不能修复 AEB CustTrigHold 与 DriveOff 的仲裁缺陷。

### 4.4 APB 原因不能只看车速

“AVH Hold 中出现轮速”不会直接请求 APB。必须先由 CSM 统计并达到 `RollPrevOver` 阈值，或者其他 MechHold 条件置位。必须记录真实触发位。

## 5. 建议添加的测量信号

### 5.1 AEB 接管和重复激活

```text
AEBActv
AEBRequest
LDMSelectedControllerT5
CM_AVH_Standstill
OnePedalToStop_Active
CSMHoldState
CM_AVH_CustTrigHold
CM_AVH_CustTrigRelease
CM_AVH_CustCondDisableHold
CM_AVH_DriveoffRequested
DriverAccelPedalApplied
AVH20ms.req_DriveOff
AVH20ms.trig_Hold
AVH_StateMachine.Trig_Hold
AVH_StateMachine.Trig_DriveOff
AvhState
CSMHoldReq_AVH
```

### 5.2 制动踏板路径排除项

```text
CM_AVH_AVHActivationByBrakePedal
ABrkAct
BrakePedalIsApplied
CSMBrakePedalApplied
BrkPedlPerct
BCPMstCylP
AVHPressureSuffcient
ActivationAllowedInNewBrakeCycle
DeactivationBrakeCycle
```

### 5.3 APB Apply 直接原因

```text
AVHTrig_MechHold
TargetStateAVH
AvhValidityOk
CSMCurrentSystemMode
CM_AVH_DriverPresent
AvhTimeUp
CSMCountRollPrev
RollPrevOver / AvhMaxCountRollPrevReached
CSMStateDrvUnit
CM_AVH_CustTrigTakeOver
GearBoxValid
AvhGear
VCUTarGearLvr
CSMParkReq_AVH
CSMApbSystemState
APBSts
```

## 6. 推荐断点/观察点

1. `AVH_CustStateLogic.calc`
   - 在 `CM_AVH_CustTrigHold=true` 分支断点。
   - 检查 AEB controller、Standstill、CSMHoldState 和油门状态。
2. `AVH_TriggerAvhStatemachine.calc`
   - 同时观察 `req_DriveOff`、`CustTrigHold`、`trig_Hold`。
   - 若三者出现 `true/true/true`，仲裁缺陷被直接证实。
3. `AVH_StateMachine.calc`
   - 观察 `CsmHoldState` 何时允许 `Trig_DriveOff`。
   - 观察两次 `TriggerTransition()` 前后的状态变化。
4. APB Apply 前一个周期
   - 记录全部 `trig_MechHold` 输入。
   - 特别确认 `CustTrigTakeOver` 与 `RollPrevOver` 谁先置位。

## 7. 修复建议

### 7.1 必须修复：DriveOff 对所有 Hold 请求具有全局优先级

建议将 `req_DriveOff == false` 放到 Hold OR 条件外层：

```text
trig_Hold = HoldCoreConditions
         && !CustCondDisableHold
         && !trig_Release
         && !req_DriveOff
         && (StandardBrakePath || CustTrigHold || ADSRequestAVH_Trigger);
```

如果 ADS 业务要求在油门下仍可强制 Hold，应单独定义明确优先级，不能由当前括号结构隐式决定。

### 7.2 必须修复：AEB Hold 接管改为一次性事件

仅增加“油门按下时 CustTrigHold=false”不够，因为松开油门后会再次激活。应增加本次 AEB 事件锁存：

```text
AEB Hold 请求新事件 -> takeoverEligible = true
AVH 成功接管一次      -> takeoverEligible = false
DriveOffRequested      -> takeoverEligible = false
AEB deselect/新事件    -> 允许下一次置位
```

`CM_AVH_CustTrigHold` 应要求：

```text
AEB 请求仍有效
&& takeoverEligible
&& !DriveOffRequested
&& Standstill
&& CSM 状态允许
```

不要只使用 `LDMSelectedController == AEB` 的持续电平作为重复 Hold 触发源。

### 7.3 增加重入抑制

DriveOff 后，在以下条件满足前禁止 AEB Cust Hold 重入：

```text
CSMHoldState == NotActive 稳定若干周期
AND AEB 请求已撤销/重新产生边沿
```

### 7.4 APB Apply 防护

不要直接屏蔽 MechHold 安全功能。应先确认触发源：

- 若为 P 挡：检查 `VCUTarGearLvr` 是否真实、是否在运动中错误跳 P。
- 若为 RollPrevOver：检查计数是否跨本次 AVH 重入错误继承，必要时在 DriveOff/新 Hold 周期复位计数。
- 若为 DriverPresence/StateDrvUnit/Validity：修复对应输入抖动或状态同步。

## 8. 最终判断

- **AVH 反复激活：高置信度根因是 `CM_AVH_CustTrigHold` 的持续电平请求绕过 DriveOff 仲裁，并缺少 AEB 事件消费/重入抑制。**
- **APB Apply：已确认由 MechHold 路径发出，但当前不能只归因于 Roll Prevention。P 挡 `CustTrigTakeOver` 在 PDF 中有直接信号线索，必须与 `RollPrevOver` 一起测量确认。**
- **仅调整 `C_AVH_DGearActivationPressure` 不能解决主问题。**
