# ASCET 隔离写入验证执行清单

## 状态

```text
created: 2026-08-11
status: USER_CONFIRMATION_PENDING
database: C:\Repo\F05_IPB_L2_0429
liveWritesExecuted: 0
```

## 隔离 Fixture

```text
root: PI_LIVE_FIX_20260811_13947C09
class: PI_LIVE_FIX_20260811_13947C09\ClassUnderTest
enumeration: PI_LIVE_FIX_20260811_13947C09\EnumerationUnderTest
```

禁止写入该根目录之外的对象。

## 写入顺序

### Case FIX-W-SETUP

1. `create_folder` 创建隔离根目录。
2. `create_component kind=class` 创建 `ClassUnderTest`。
3. `create_component kind=enumeration` 创建 `EnumerationUnderTest`。
4. 独立 Tree/readback 确认对象 path/OID/kind。

### Case FIX-W-001 apply_element_spec

Plan payload：

```json
{
  "action": "apply_element_spec",
  "phase": "plan",
  "componentPath": "PI_LIVE_FIX_20260811_13947C09\\ClassUnderTest",
  "intent": "create",
  "elements": [
    {
      "role": "providerExportedParameter",
      "name": "P_Input",
      "modelType": "cont",
      "unit": "",
      "comment": "ASCET isolated live validation input",
      "calibration": false,
      "range": { "mode": "none" },
      "data": { "mode": "ascetDefault" },
      "implementation": { "mode": "ascetDefault" }
    },
    {
      "role": "localDependentParameter",
      "name": "P_Dependent",
      "modelType": "cont",
      "unit": "",
      "comment": "ASCET isolated live validation dependent",
      "calibration": false,
      "range": { "mode": "none" },
      "implementation": { "mode": "ascetDefault" }
    }
  ],
  "executeWrite": false
}
```

只有 plan identity、database identity、target identity 和 preflight evidence 完整时才提交：

```json
{
  "action": "apply_element_spec",
  "phase": "commit",
  "planId": "<planId>",
  "executeWrite": true
}
```

随后执行 automatic readback 和独立 `ascet_get.elements`/`ascet_read` 对比。

### Case FIX-W-002 set_element_dependency

Plan payload：

```json
{
  "action": "set_element_dependency",
  "phase": "plan",
  "targetPath": "PI_LIVE_FIX_20260811_13947C09\\ClassUnderTest",
  "elementName": "P_Dependent",
  "dependency": "dependent",
  "dependencyFormula": "P_Input",
  "dependencyMappings": {
    "P_Input": { "kind": "parameter", "name": "P_Input" }
  },
  "variantPolicy": "default",
  "targetKind": "component",
  "match": "exact",
  "executeWrite": false
}
```

Commit 只携带 `planId` 和 `executeWrite=true`。提交后使用 automatic verification 及独立 `read_element_dependency` 验证 formula/mapping。

### Case FIX-W-003 set_enumerators

```json
{
  "action": "set_enumerators",
  "componentPath": "PI_LIVE_FIX_20260811_13947C09\\EnumerationUnderTest",
  "enumerators": ["FIX_OFF", "FIX_ON", "FIX_DIAG"],
  "executeWrite": true
}
```

必须验证 automatic readback 和独立 `read_implementation` 均按以下顺序返回：

```text
FIX_OFF
FIX_ON
FIX_DIAG
```

## 停止条件

任一条件发生立即停止后续写入：

```text
database identity 改变
target path/OID/kind 改变
plan expired/consumed/fingerprint mismatch
preflight 发现 fixture 路径已存在但不属于本 run
mutation outcome unknown
automatic readback mismatch
independent readback/diff mismatch
scheduler degraded 或 CLI lock 异常
任何目标落在隔离根目录之外
```

## 逆序清理

```text
1. delete_component EnumerationUnderTest
2. delete_component ClassUnderTest
3. delete_folder PI_LIVE_FIX_20260811_13947C09
4. Tree/readback 确认三个路径均不存在
5. 重新检查 database identity、runtime、scheduler 和 CLI lock
```

清理仅删除本清单中的精确路径；禁止全局 cleanup。

## 证据文件

每个 case 保存：

```text
request.json
preflight.json
plan.json
commit.json
automatic-readback.json
independent-readback.json
diff.json
cleanup.json
final-readback.json
ledger.json
```
## Schema 冻结验证

2026-08-11 已使用当前 `ascetEditParameters` 对以下 9 个 payload 执行 TypeBox 校验：

```text
create_folder preflight
create_component class preflight
create_component enumeration preflight
apply_element_spec plan
set_element_dependency plan
set_enumerators write
delete_component enumeration
delete_component class
delete_folder
```

结果：`9/9 valid`。该验证不调用 Bridge，数据库写入仍为 0。
