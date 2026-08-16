# ASCET Database Test Plan: ADC Brake Disc Temperature Degradation

## 1. Purpose

This test plan is designed for execution with ASCET Copilot against the current ASCET Database. It validates the existing ADC/VLC brake-disc-temperature degradation chain without inventing new model objects.

The first execution phase is read-only. Any database write is optional, isolated, and must be followed by automatic readback, diff, and cleanup.

## 2. Current Database Scope

### Database

```text
C:\Repo\F05_IPB_L2_0429
```

### ADC main project

```text
CN_Libary\Package\LDM\ADC\Component\Main\ADCMainCustIPB_ECU_CSW_BB00001
```

### Existing modules

```text
CN_Libary\Package\LDM\ADC\Component\Main\ADCMainCustIPB_ECU_CSW_BB00001::CM_ADCMain_Generic
CN_Libary\Package\LDM\ADC\Component\Main\ADCMainCustIPB_ECU_CSW_BB00001::CM_ADCMain_IPB
CN_Libary\Package\LDM\ADC\Component\Main\ADCMainCustIPB_ECU_CSW_BB00001::CM_ADCMain_APBHost
CN_Libary\Package\LDM\ADC\Component\Main\ADCMainCustIPB_ECU_CSW_BB00001::CM_ADC_CcoInteraction
CN_Libary\Package\LDM\ADC\Component\Main\ADCMainCustIPB_ECU_CSW_BB00001::Asw2Asw_ADCMain_IPB
CN_Libary\Package\LDM\ADC\Component\Main\ADCMainCustIPB_ECU_CSW_BB00001::XPass_BB00001_ADCMain_IPB
```

### Existing classes relevant to this test

```text
CN_Libary\Package\LDM\ADC\Private\ADC_VLCDegradedByBrakeDiscTemperature
CN_Libary\Package\LDM\ADC\Private\ADC_VLCStateManager_Main
CN_Libary\Package\LDM\ADC\Private\ADC_VLCPtMonitoring
CN_Libary\Package\LDM\ADC\Private\ADC_VLCPtMonitoringActualFx
CN_Libary\Package\LDM\ADC\Private\ADC_VLCPtMonitoringPtVsBrkDetection
```

### Existing ADC elements

`ADC_VLCDegradedByBrakeDiscTemperature` currently contains:

```text
VLCRampOffByHighBrakeDiscTemperature
VLCOffByCriticalBrakeDiscTemperature
calc/BrakeDiscTemperatureStatus
calc/BrakeDiscTemperatureStatusAvailability
```

`ADC_VLCStateManager_Main` currently contains related integration elements:

```text
VLCRampOffByHighBrakeDiscTemperature
VLCOffByCriticalBrakeDiscTemperature
VLC_Degradation
VLCAvailableState_Main
VLCAvailableState_Main_Com1
VLCAvailableState_Main_Com2
```

## 3. Test Objective

Verify that brake-disc-temperature information is correctly processed and propagated through the existing ADC logic:

```text
BrakeDiscTemperatureStatus
        |
        v
ADC_VLCDegradedByBrakeDiscTemperature
        |
        v
ADC_VLCStateManager_Main
        |
        v
CM_ADCMain_Generic
        |
        v
VLC_Degradation / VLC availability state
```

The test must confirm:

1. Normal temperature does not create a degradation.
2. High temperature requests ramp-off degradation.
3. Critical temperature requests VLC-off degradation.
4. Unavailable temperature status follows the existing safety strategy.
5. High-to-critical and critical-to-normal transitions do not leave stale flags.
6. CCO/HDC interaction does not incorrectly override the brake-disc-temperature protection.
7. Existing object references, method signatures, implementations, and formulas remain consistent.

## 4. Safety and Execution Rules

1. Do not modify the live database during the read-only phases.
2. Do not create or delete objects unless the user explicitly requests the write phase.
3. Do not assume enumeration integer values. Read the current enumeration definitions first.
4. Do not hardcode names or OIDs discovered from another database.
5. Use canonical ASCET Copilot tools only:
   - `ascet_status`
   - `ascet_scheduler_status`
   - `ascet_get`
   - `ascet_read`
   - `ascet_diff`
   - `ascet_edit`
6. Use `ascet_get` for discovery and `ascet_read` for exact implementation evidence.
7. For any write, use the supported plan/commit workflow and inspect automatic readback.
8. Keep a baseline snapshot before every write.
9. Restore all temporary objects and formulas before finishing.
10. Stop if the live Bridge, scheduler, or database status is not healthy.

## 5. Preconditions

The ASCET Copilot operator must confirm:

```text
[ ] No concurrent user is editing the ADC project.
[ ] ASCET and the Bridge are connected to C:\Repo\F05_IPB_L2_0429.
[ ] ascet_status reports a healthy runtime.
[ ] ascet_scheduler_status reports no stale operation.
[ ] The target project resolves exactly.
[ ] The test is being run against the intended database, not a different workspace.
```

## 6. Phase A: Runtime and Scope Check

### A-001: Runtime status

Prompt ASCET Copilot:

```text
检查 ASCET runtime、Bridge、ToolAPI 和 scheduler 状态。只读，不修改数据库。报告每项状态以及是否可以继续执行 ADC 测试。
```

Expected result:

```text
PASS: Runtime and scheduler are healthy.
FAIL: Stop and run recovery diagnostics before database access.
```

### A-002: Resolve the ADC project

Prompt:

```text
只读检查以下 ASCET Project 是否存在，并返回 canonical path、OID、kind 和 project members：
CN_Libary\Package\LDM\ADC\Component\Main\ADCMainCustIPB_ECU_CSW_BB00001
不要展开整个数据库。
```

Expected result:

```text
kind = project
project exists = true
project members include CM_ADCMain_Generic and CM_ADCMain_IPB
```

### A-003: Resolve target classes

Prompt:

```text
只读解析以下 ASCET Class，并返回 canonical path、OID、kind 和直接元素：
1. CN_Libary\Package\LDM\ADC\Private\ADC_VLCDegradedByBrakeDiscTemperature
2. CN_Libary\Package\LDM\ADC\Private\ADC_VLCStateManager_Main
3. CN_Libary\Package\LDM\ADC\Private\ADC_VLCPtMonitoring
```

Expected result:

```text
PASS: All three classes resolve exactly.
FAIL: Stop if any target resolves to multiple objects or a different kind.
```

## 7. Phase B: Read-Only Baseline

Create a baseline report containing the following evidence:

```text
baseline/
├─ runtime-status.json
├─ adc-project-tree.json
├─ adc-target-elements.json
├─ adc-component-refs.json
├─ adc-method-signatures.json
├─ adc-method-code.json
├─ adc-state-machine-flow.json
└─ adc-formulas.json
```

The report may be stored outside the database, for example under:

```text
output/adc-brake-disc-temperature-test/<timestamp>/baseline/
```

### B-001: Read target element definitions

Prompt:

```text
只读读取 ADC_VLCDegradedByBrakeDiscTemperature 的完整元素定义。重点报告：
- calc/BrakeDiscTemperatureStatus 的类型和作用域
- calc/BrakeDiscTemperatureStatusAvailability 的类型和作用域
- VLCRampOffByHighBrakeDiscTemperature 的类型、作用域和实现类型
- VLCOffByCriticalBrakeDiscTemperature 的类型、作用域和实现类型
不要修改任何对象。
```

Expected evidence:

```text
The two temperature-status inputs are method arguments.
The two degradation outputs are local Boolean/logical elements.
Their actual implementation types are recorded from the database.
```

### B-002: Read state-manager integration

Prompt:

```text
只读读取 ADC_VLCStateManager_Main，并检查以下元素的来源、作用域、类型和实现：
- VLCRampOffByHighBrakeDiscTemperature
- VLCOffByCriticalBrakeDiscTemperature
- VLC_Degradation
- VLCAvailableState_Main
- VLCAvailableState_Main_Com1
- VLCAvailableState_Main_Com2
同时读取该类的精确方法签名和实现代码。
```

Expected evidence:

```text
The degradation inputs used by the state manager are type-compatible with the producer class.
The output mapping to VLC_Degradation and availability states is explicit.
No unresolved reference is present.
```

### B-003: Read component references

Prompt:

```text
只读检查 ADCMainCustIPB_ECU_CSW_BB00001 及 CM_ADCMain_Generic 的 component references。
重点确认：
- ADC_VLCDegradedByBrakeDiscTemperature 是否被 CM_ADCMain_Generic 使用
- ADC_VLCStateManager_Main 是否被 CM_ADCMain_Generic 使用
- BrakeDiscTemperatureStatus 的来源和目标
- BrakeDiscTemperatureStatusAvailability 的来源和目标
输出 sourcePath、elementPath、scope、targetPath 和 targetOid。
```

Expected result:

```text
PASS: The producer-to-consumer chain is present and resolvable.
FAIL: Report the first missing, ambiguous, or mismatched reference.
```

### B-004: Read enumeration definitions

Prompt:

```text
只读读取当前数据库中与 ADC 制动盘温度和 VLC 状态相关的 Enumeration 定义。
至少检查：
- BTM_BrakeDiscTemperatureStatus 使用的枚举类型
- BrakeDiscTemperatureStatusAvailability 使用的枚举类型
- VLC_Degradation 使用的枚举类型
- VLCAvailableState_Main 使用的枚举类型
返回每个 enumeration 的完整枚举名称和值，不要猜测整数值。
```

Important:

The test must use the labels and values returned by the current database. Do not assume that `NORMAL`, `HIGH`, `CRITICAL`, or `NOT_AVAILABLE` have a specific integer representation.

## 8. Phase C: Functional Test Cases

The following cases are logical test vectors. If the current ASCET environment has no simulation runner exposed through ASCET Copilot, validate them using the exact method code, state-machine flow, and integration mapping. Do not claim dynamic execution unless ASCET actually executes the model.

### TC-ADC-BDT-001: Normal status

Input:

```text
BrakeDiscTemperatureStatus = current database NORMAL value
BrakeDiscTemperatureStatusAvailability = current database AVAILABLE value
```

Expected:

```text
VLCRampOffByHighBrakeDiscTemperature = false
VLCOffByCriticalBrakeDiscTemperature = false
No brake-disc-temperature degradation is requested.
```

### TC-ADC-BDT-002: High temperature

Input:

```text
BrakeDiscTemperatureStatus = current database HIGH value
BrakeDiscTemperatureStatusAvailability = current database AVAILABLE value
```

Expected:

```text
VLCRampOffByHighBrakeDiscTemperature = true
VLCOffByCriticalBrakeDiscTemperature = false
VLC_Degradation = the database-defined ramp-off degradation value
```

The exact `VLC_Degradation` value must come from the current enumeration and implementation.

### TC-ADC-BDT-003: Critical temperature

Input:

```text
BrakeDiscTemperatureStatus = current database CRITICAL value
BrakeDiscTemperatureStatusAvailability = current database AVAILABLE value
```

Expected:

```text
VLCOffByCriticalBrakeDiscTemperature = true
VLC_Degradation = the database-defined critical/off degradation value
VLCAvailableState_Main = the database-defined unavailable/off state
```

### TC-ADC-BDT-004: Status unavailable

Input:

```text
BrakeDiscTemperatureStatusAvailability = current database NOT_AVAILABLE value
```

Expected:

```text
The result follows the existing safety strategy in the current implementation.
No stale HIGH or CRITICAL output remains from a previous cycle unless the implementation explicitly specifies latching.
```

This case is an implementation-conformance check. The expected result must be derived from the existing requirement, method code, or state-machine flow.

### TC-ADC-BDT-005: Normal to high to critical

Input sequence:

```text
NORMAL -> HIGH -> CRITICAL
```

Expected sequence:

```text
NORMAL:
  RampOff = false
  CriticalOff = false

HIGH:
  RampOff = true
  CriticalOff = false

CRITICAL:
  CriticalOff = true
```

### TC-ADC-BDT-006: Critical recovery

Input sequence:

```text
CRITICAL -> HIGH -> NORMAL
```

Expected:

```text
The outputs follow the current implementation's recovery behavior.
No output remains set permanently unless the implementation explicitly defines fault latching.
```

### TC-ADC-BDT-007: CCO/HDC interaction

Execute the following combinations using the existing `CM_ADC_CcoInteraction` path:

```text
CCO inactive + HIGH
CCO active   + HIGH
HDC active   + HIGH
CCO/HDC active + CRITICAL
```

Expected:

```text
High brake-disc temperature still produces the database-defined ramp-off behavior.
Critical brake-disc temperature still produces the database-defined off behavior.
CCO/HDC logic does not silently suppress the safety degradation.
```

## 9. Phase D: Structural and Diff Validation

### D-001: Type and scope validation

Check that:

```text
[ ] Producer and consumer elements have compatible types.
[ ] Method arguments are not accidentally converted into local variables.
[ ] Output elements retain their existing scope.
[ ] Existing implementation types are unchanged.
[ ] No unexpected calibration flag or memory-location change exists.
```

### D-002: Dependency validation

Prompt:

```text
对 ADC 制动盘温度降级链执行只读依赖检查：
ADC_VLCDegradedByBrakeDiscTemperature -> ADC_VLCStateManager_Main -> CM_ADCMain_Generic。
报告所有 imported、exported、local 和 unresolved dependency。
```

Expected:

```text
unresolved dependency count = 0
ambiguous dependency count = 0
```

### D-003: Baseline diff

After any approved test write, compare the current database with the baseline:

```text
[ ] Only the requested test objects or implementation elements changed.
[ ] No unrelated ADC, CCO, HDC, VLC, or project formula changed.
[ ] No duplicate object was created.
[ ] No stale temporary object remains.
```

## 10. Optional Controlled Write Test

This section is optional and must not be executed automatically.

Use it only when the purpose is to validate ASCET Copilot write and rollback capabilities in addition to read-only analysis.

### Write rules

1. Use a unique temporary name such as:

```text
PI_ADC_BDT_TEST_<timestamp>
```

2. Capture the complete baseline first.
3. Use `ascet_edit` plan/commit only.
4. Do not overwrite the production ADC method unless explicitly approved.
5. After commit, inspect the automatic readback.
6. Run `ascet_diff` against the baseline.
7. Remove the temporary object or restore the original implementation.
8. Read the object again and confirm cleanup.

### Suggested write test

Create a temporary test formula or temporary test element associated with the existing ADC project, then verify:

```text
create -> readback -> diff -> restore/delete -> readback -> diff
```

Expected final state:

```text
temporary object count = 0
unexpected ADC diff = 0
original project formulas unchanged
original target class code unchanged
```

## 11. ASCET Copilot Master Prompt

Paste the following prompt into ASCET Copilot:

```text
请对当前连接的 ASCET Database 执行只读测试，不要修改任何数据库对象。

测试范围：
CN_Libary\\Package\\LDM\\ADC\\Component\\Main\\ADCMainCustIPB_ECU_CSW_BB00001

重点对象：
1. CN_Libary\\Package\\LDM\\ADC\\Private\\ADC_VLCDegradedByBrakeDiscTemperature
2. CN_Libary\\Package\\LDM\\ADC\\Private\\ADC_VLCStateManager_Main
3. CN_Libary\\Package\\LDM\\ADC\\Component\\Main\\ADCMainCustIPB_ECU_CSW_BB00001::CM_ADCMain_Generic
4. CN_Libary\\Package\\LDM\\ADC\\Component\\Main\\ADCMainCustIPB_ECU_CSW_BB00001::CM_ADC_CcoInteraction

请按以下顺序执行：
1. 检查 ASCET runtime、Bridge 和 scheduler 状态。
2. 解析上述 Project、Module 和 Class 的 canonical path、OID、kind。
3. 读取 ADC_VLCDegradedByBrakeDiscTemperature 的元素、方法签名和实现。
4. 读取 ADC_VLCStateManager_Main 的相关元素、方法签名和状态流程。
5. 检查以下元素的引用链：
   - BrakeDiscTemperatureStatus
   - BrakeDiscTemperatureStatusAvailability
   - VLCRampOffByHighBrakeDiscTemperature
   - VLCOffByCriticalBrakeDiscTemperature
   - VLC_Degradation
   - VLCAvailableState_Main
6. 读取相关 Enumeration 的真实枚举值，不要猜测整数值。
7. 按 NORMAL、HIGH、CRITICAL、NOT_AVAILABLE、CRITICAL->HIGH->NORMAL 五组场景进行静态行为验证。
8. 检查 CCO/HDC 交互是否会覆盖制动盘温度保护。
9. 输出 PASS、FAIL 或 INCONCLUSIVE，并为每个结论提供 path、elementPath、OID、方法名或代码证据。
10. 不要执行 ascet_edit，不要写入、删除或恢复任何对象。
```

## 12. Test Report Format

ASCET Copilot 完成后，报告至少包含：

```text
Database:
Database path:
Execution time:
Runtime status:
Scheduler status:

Target objects:
- path:
- oid:
- kind:

Baseline evidence:
- method signatures:
- method code:
- state-machine flow:
- component references:
- enumerations:

Results:
- TC-ADC-BDT-001: PASS/FAIL/INCONCLUSIVE
- TC-ADC-BDT-002: PASS/FAIL/INCONCLUSIVE
- TC-ADC-BDT-003: PASS/FAIL/INCONCLUSIVE
- TC-ADC-BDT-004: PASS/FAIL/INCONCLUSIVE
- TC-ADC-BDT-005: PASS/FAIL/INCONCLUSIVE
- TC-ADC-BDT-006: PASS/FAIL/INCONCLUSIVE
- TC-ADC-BDT-007: PASS/FAIL/INCONCLUSIVE

Unexpected findings:

Write operations:
- performed: yes/no
- plan/commit IDs:
- automatic readback:
- diff result:
- cleanup result:

Final verdict:
```

## 13. Pass Criteria

The test is considered passed only when:

```text
1. All target paths resolve to the expected object kind.
2. The producer-to-state-manager reference chain is complete.
3. Actual enumeration values are read from the current database.
4. Normal, high, and critical brake-disc-temperature behavior is consistent with the implementation.
5. Status-unavailable behavior is explicitly explained by implementation evidence.
6. No unresolved or ambiguous dependency exists.
7. No unrelated object changes are found.
8. Any optional write is read back successfully and fully cleaned up.
9. The final database state matches the baseline for all non-test objects.
```

## 14. Known Limitation

The current database evidence confirms the target elements and their integration structure, but the exact enumeration value mapping and complete runtime simulation result must be read from the live database during execution. The test must report `INCONCLUSIVE` rather than guessing when that evidence is unavailable.
