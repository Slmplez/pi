# AEB Hold 后 AVH 反复激活及 APB Apply Bug 分析报告

## 1. 基本信息

| 项目 | 内容 |
| --- | --- |
| 车型 | MX11 |
| 软件版本 | BCS 26RC07 |
| 问题场景 | AEB 刹停后 AVH 接管，踩油门起步并松开，AVH 反复激活；后续踩制动时 APB Apply |
| 问题时间 | 2026-08-04 09:40 左右 |
| ASCET 数据库 | `C:\Repo\13_XIAOMIAVH\px_Backup\px_Backup` |

## 2. 问题描述

### 2.1 期望行为

AEB 刹停并由 AVH 接管后，驾驶员踩油门起步：

1. AVH 应进入 DriveOff 并退出 Hold。
2. 松开油门后，不应因为原 AEB Hold 请求再次自动激活。
3. 正常起步和低速制动过程中，不应无原因请求 APB Apply。

### 2.2 实际行为

1. AEB 制停后 `CM_AVH_CustTrigHold = true`，AVH 接管。
2. 驾驶员踩油门，AVH 短暂退出。
3. 松开油门后 AVH 再次激活，出现多次 Active/Standby 切换。
4. 后续踩制动，AVH 再次进入 Hold。
5. AVH 状态机进入 MechHold，输出 `CSMParkReq_AVH = Apply`，最终 APB 拉起。

---

# 第一部分：Bug 根因分析

## 3. 根因结论

**AVH 反复激活的主根因是：`CM_AVH_CustTrigHold` 为持续电平请求，并且能够绕过 DriveOff 仲裁。**

该问题由两个逻辑缺陷共同导致：

1. AEB Hold 接管请求没有一次性消费机制。
2. `req_DriveOff` 只禁止标准制动踏板激活路径，没有禁止 `CustTrigHold` 路径。

## 4. Bug 证据

### 4.1 `CM_AVH_CustTrigHold` 持续置位条件

ASCET 组件：

```text
PlatformLibrary\Package\AVH_AutomaticVehicleHold\private\AVH_CustStateLogic
```

核心逻辑：

```text
if (CM_AVH_CustTrigRelease == true
    || CM_AVH_CustCondDisableHold == true)
{
    CM_AVH_CustTrigHold = false;
}
else if (LDMSelectedController == LDMSelectedController_AEB
      && AVH_Standstill == true
      && OnePedalToStop_Active == false
      && CsmHoldState != CSMHoldState_NotActive
      && CsmHoldState != CSMHoldState_Deact
      && CsmHoldState != CSMHoldState_DriveOff
      && CsmHoldState != CSMHoldState_DriveOffTrqBal)
{
    CM_AVH_CustTrigHold = true;
}
```

该条件没有检查：

```text
DriverAccelPedalApplied
DriveOffRequested
AEBRequest 是否仍有效
本次 AEB Hold 是否已经由 AVH 接管
本次 AEB 事件是否已经被驾驶员起步终止
```

因此，只要 AEB 仍是 `LDMSelectedController`，且 CSM 状态重新满足条件，`CM_AVH_CustTrigHold` 就会再次置位。

### 4.2 DriveOff 没有禁止全部 Hold 路径

ASCET 组件：

```text
PlatformLibrary\Package\AVH_AutomaticVehicleHold\private\AVH_TriggerAvhStatemachine
```

实际逻辑结构：

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

`!req_DriveOff` 只属于 `StandardBrakePath`。

当油门被踩下时，可能同时出现：

```text
req_DriveOff = true
CustTrigHold = true
trig_Hold = true
```

因此驾驶员的 DriveOff 请求没有全局禁止 AVH Hold。

### 4.3 状态机存在 CSM 确认窗口

ASCET 组件：

```text
PlatformLibrary\Package\AVH_AutomaticVehicleHold\private\AVH_StateMachine
```

AVH 状态机只有在 CSM 已反馈以下状态后，才真正触发 DriveOff 状态迁移：

```text
CsmHoldState == CSMHoldState_DriveOff
|| CsmHoldState == CSMHoldState_DriveOffTrqBal
|| CsmHoldState == CSMHoldState_Deact
```

触发过程为：

```text
驾驶员踩油门
-> DriveOffRequested = true
-> AVHReq_DriveOff = true
-> Hold 状态输出 CSMHoldReq_DriveOff
-> 等待 CSMHoldState 反馈
-> AVH 状态机才进入 DriveOff
```

如果驾驶员短按油门后松开，`DriveOffRequested` 可能在 CSM 完成状态确认前消失。与此同时，`CustTrigHold` 仍可能保持或重新置位，导致 AVH 重入 Hold。

## 5. 非主根因说明

### 5.1 `AVHActivationByBrakePedal` 不会因为历史压力自动保持 true

实际代码每个周期先执行：

```text
AVHActivationByBrakePedal = false;
AVHPressureSuffcient = false;
```

最终置位要求本周期同时满足：

```text
ActivationAllowedInNewBrakeCycle
&& AVHPressureSuffcient
&& !DeactivationBrakeCycle
&& !OnePedalToStop_Active
```

因此，“以前压力足够一次，即使当前压力为 0 仍保持激活”的判断不成立。

### 5.2 `DeactivationBrakeCycle` 不会促进重复激活

当该变量为 true 时：

```text
AVHActivationByBrakePedal = false
```

它会禁止激活，而不是促成激活。

### 5.3 `C_AVH_DGearActivationPressure = 0` 是次要风险

D 挡阈值为 0 会使任何非零 `ABrkAct` 容易满足压力条件，属于激活过敏问题。

但当前问题已经观察到：

```text
CM_AVH_CustTrigHold = true
```

该路径不依赖 `AVHActivationByBrakePedal`，因此仅修改压力阈值不能修复本 Bug。

---

# 第二部分：触发报告分析

## 6. AVH 反复激活触发链

```text
AEB 制动并刹停车辆
    ↓
LDMSelectedController = AEB
AVH_Standstill = true
CSMHoldState 满足接管条件
    ↓
CM_AVH_CustTrigHold = true
    ↓
AVH trig_Hold = true
    ↓
AVH 第一次进入 Hold
    ↓
驾驶员踩油门
    ↓
DriveOffRequested = true
req_DriveOff = true
    ↓
CustTrigHold 路径未被 req_DriveOff 禁止
    ↓
AVH/CSM 开始 DriveOff 握手
    ↓
驾驶员松开油门
DriveOffRequested = false
    ↓
AEB controller 和 CSM 状态仍满足 Cust Hold 条件
    ↓
CM_AVH_CustTrigHold 再次为 true
    ↓
AVH 再次进入 Hold
    ↓
出现 Active/Standby 反复切换
```

## 7. PDF 对应时序

| 时间 | 事件 |
| --- | --- |
| 09:40:05.623 | AEB Active |
| 09:40:06.643 | AVH 第一次 Active |
| 约 09:40:06.994 | 深踩油门，DriveOff 请求置位 |
| 09:40:07.643 | AVH Standby |
| 09:40:08.263 | AVH 第二次 Active |
| 09:40:11.003 | AVH 第三次 Active |
| 09:40:13.343 | AVH Standby |
| 约 09:40:13.363 | APB Applying |
| 约 09:40:14.403 | APB Applied |

PDF 为云端抽样数据，无法确认同一个 20 ms proc 内信号的执行顺序。最终确认需要内部测量数据。

## 8. APB Apply 触发链

踩制动不会直接请求 APB Apply。

AVH 只有进入 `MechHold` 后才输出：

```text
AVHParkReq = CSMParkReq_Apply
ParkReqTriggered = true
```

完整链路：

```text
AVHTrig_MechHold = true
    ↓
AVH_StateMachine: Hold -> MechHold
    ↓
AVHParkReq = CSMParkReq_Apply
    ↓
AVH20ms::CSMParkReq_AVH
    ↓
CSM 仲裁
    ↓
APB Applying
    ↓
APB Applied
```

## 9. MechHold 可能触发源

`trig_MechHold` 的输入条件包括：

```text
TargetStateAvh != AVH_On
|| AvhValidityOk == false
|| CurrentSystemMode != NORMAL
|| DriverPresence == false
|| (AvhTimeUp && AvhState == Hold)
|| RollPrevOver
|| StateDrvUnit == Off
|| CustTrigTakeOver
```

### 9.1 P 挡接管路径

`AVH_CustStateLogic` 中存在：

```text
GearBoxValid == true
&& AvhGear == P(-3)
    ↓
CM_AVH_CustTrigTakeOver = true
```

随后：

```text
CM_AVH_CustTrigTakeOver = true
-> trig_MechHold = true
-> MechHold
-> CSMParkReq_AVH = Apply
```

PDF 截图中出现：

```text
VCUTarGearLvr = P_Park_gear
```

因此 P 挡接管是 APB Apply 的高优先级候选原因。

### 9.2 Roll Prevention 路径

若：

```text
CSMCountRollPrev 达到最大值
-> RollPrevOver = true
-> trig_MechHold = true
-> APB Apply
```

该链路在代码上成立，但 PDF 没有提供 `CSMCountRollPrev` 和 `RollPrevOver` 的实测数据，当前不能确认。

### 9.3 APB Apply 判定方法

检查 `CSMParkReq_AVH=Apply` 前一个周期：

```text
CM_AVH_CustTrigTakeOver
RollPrevOver
DriverPresence
StateDrvUnit
AvhValidityOk
TargetStateAVH
AvhTimeUp
CurrentSystemMode
```

最先满足的条件即为直接触发源。

---

# 第三部分：Debug 方案

## 10. 必须测量的信号

### 10.1 AVH 重入

```text
AEBActv
AEBRequest
LDMSelectedControllerT5
CM_AVH_Standstill
CSMHoldState
CM_AVH_CustTrigHold
CM_AVH_CustTrigRelease
CM_AVH_CustCondDisableHold
DriverAccelPedalApplied
CM_AVH_DriveoffRequested
AVH20ms.req_DriveOff
AVH20ms.trig_Hold
AVH_StateMachine.Trig_Hold
AVH_StateMachine.Trig_DriveOff
AvhState
CSMHoldReq_AVH
```

### 10.2 APB Apply

```text
AVHTrig_MechHold
CM_AVH_CustTrigTakeOver
CSMCountRollPrev
RollPrevOver
TargetStateAVH
AvhValidityOk
CSMCurrentSystemMode
CM_AVH_DriverPresent
AvhTimeUp
CSMStateDrvUnit
GearBoxValid
AvhGear
VCUTarGearLvr
CSMParkReq_AVH
CSMApbSystemState
APBSts
```

## 11. 关键 Debug 判据

### 11.1 确认 AVH 仲裁 Bug

若同一周期出现：

```text
req_DriveOff = true
CM_AVH_CustTrigHold = true
trig_Hold = true
```

则可以确认 DriveOff 未能禁止 Cust Hold 路径。

### 11.2 确认重复激活

若油门松开后：

```text
AEBRequest 已结束或 AEBActv 已退出
但 LDMSelectedController 仍为 AEB
并且 CM_AVH_CustTrigHold 再次置位
```

则可以确认 AEB Hold 接管缺少一次性消费或重入抑制。

### 11.3 确认 APB Apply 原因

```text
CustTrigTakeOver 先于 CSMParkReq_AVH=Apply
    -> P 挡/客户接管路径

RollPrevOver 先于 CSMParkReq_AVH=Apply
    -> Roll Prevention 路径
```

## 12. 推荐断点

1. `AVH_CustStateLogic.calc`
   - `CM_AVH_CustTrigHold = true` 分支。
   - `CM_AVH_CustTrigTakeOver = true` 分支。
2. `AVH_TriggerAvhStatemachine.calc`
   - `req_DriveOff` 计算位置。
   - `trig_Hold` 计算位置。
   - `trig_MechHold` 计算位置。
3. `AVH_StateMachine.calc`
   - `Trig_DriveOff` 计算位置。
   - `Hold -> MechHold` 转移。
   - `AVHParkReq = CSMParkReq_Apply` 输出位置。

---

# 第四部分：修复建议

## 13. 修复 DriveOff 仲裁

建议将 `!req_DriveOff` 放到全部 Hold 路径外层：

```text
trig_Hold = HoldCoreConditions
         && !CustCondDisableHold
         && !trig_Release
         && !req_DriveOff
         && (StandardBrakePath
             || CustTrigHold
             || ADSRequestAVH_Trigger);
```

这样驾驶员起步请求可以禁止全部 Hold 触发源。

## 14. AEB Hold 接管改为一次性事件

建议增加状态锁存：

```text
新的 AEB Hold 请求    -> takeoverEligible = true
AVH 成功接管一次      -> takeoverEligible = false
DriveOffRequested      -> takeoverEligible = false
AEB 请求撤销并重新出现 -> 允许下一次接管
```

`CM_AVH_CustTrigHold` 应要求：

```text
AEBRequest 仍有效
&& takeoverEligible
&& !DriveOffRequested
&& AVH_Standstill
&& CSM 状态允许
```

## 15. 增加重入抑制

DriveOff 后，在以下条件满足前禁止 AEB Cust Hold 再次激活：

```text
CSMHoldState == NotActive 并稳定若干周期
&& AEB 请求已撤销
&& 检测到新的 AEB Hold 请求边沿
```

## 16. APB Apply 修复原则

不要直接屏蔽 MechHold 安全功能。

1. 如果由 P 挡触发：检查 `VCUTarGearLvr/AvhGear` 是否错误跳变。
2. 如果由 `RollPrevOver` 触发：检查防溜计数是否跨 DriveOff/AVH 重入错误继承。
3. 如果由 DriverPresence、StateDrvUnit 或 Validity 触发：修复对应输入状态或通信同步问题。

---

# 17. 最终结论

1. **AVH 反复激活的主根因是 `CM_AVH_CustTrigHold` 持续请求绕过 DriveOff 仲裁。**
2. **AEB Hold 接管缺少一次性消费和 DriveOff 后重入抑制。**
3. **`C_AVH_DGearActivationPressure=0` 是次要敏感性问题，不是主根因。**
4. **APB Apply 已确认来自 MechHold，但必须通过内部信号区分 P 挡 `CustTrigTakeOver` 和 `RollPrevOver`。**
5. **推荐首先修复 Hold/DriveOff 仲裁和 AEB 接管生命周期，再评估标定优化。**
