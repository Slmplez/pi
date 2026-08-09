# ASCET Database Model Catalog 方案

## 1. Catalog 主对象

最终 Catalog 包含四类正式对象：

```text
Parameter Class
Enumeration
Module
Message
```

同时保留关系：

```text
Project -> Module
Project -> Parameter Class
Module -> Message
Message -> Enumeration
Parameter Class -> Enumeration
Parameter Class -> Child Parameter Class
```

Project 主要作为使用范围和关系入口，不必作为 Catalog 主对象输出。

## 2. 输入

基础输入保持为现有全量 Tree Observation：

```text
ascet_get action="tree" delivery="stored"
```

不修改当前 `get_tree`。

从 Tree NDJSON 直接提取：

```text
kind=project
kind=module
kind=enumeration
```

当前 Live Database：

| 类型 | Tree 行数 | 唯一 OID |
| --- | ---: | ---: |
| Project | 75 | 75 |
| Module | 859 | 428 |
| Enumeration | 708 | 708 |
| Class | 7,069 | 7,069 |

Module 的 859 行包含：

```text
428 条 canonical Module
431 条 project::module alias
```

因此 Module Catalog 必须按 OID 去重，结果为 428 个唯一 Module。

## 3. 总体流程

```text
stored full tree.ndjson
  |
  +-> Enumeration rows
  |     -> Enumeration Catalog
  |
  +-> Module rows
  |     -> canonical module map，按 OID 去重
  |     -> Module Catalog
  |     -> Module.GetAllModelElements()
  |     -> Message Catalog
  |     -> Message -> Enumeration Edge
  |
  +-> Project rows
        -> Project 顶层 getComplex
        -> represented Module
        |     -> Project -> Module Edge
        |
        -> represented Class
              -> Parameter Class Root
              -> Class-only closure
              -> Parameter Class Catalog
              -> Parameter Class -> Enumeration Edge
```

## 4. Enumeration Catalog

Tree 已包含 Database 全部 Enumeration 定义：

```json
{"path":"...\\AVH_ModeType","oid":"...","kind":"enumeration"}
```

第一阶段直接生成：

```json
{
  "catalogKind": "enumeration",
  "path": "...\\AVH_ModeType",
  "oid": "...",
  "usedByMessage": false,
  "usedByParameterClass": false,
  "messageUsageCount": 0,
  "parameterUsageCount": 0
}
```

随后通过关系 Edge 更新 usage 标记和计数。

第一版不全量读取：

```text
Enum literals
Comment
Implementation
```

这些字段只对 grep 选中的 Enum 按需读取。

## 5. Module Catalog

Tree 中 Module 按 OID 去重：

```text
canonical path：不包含 :: 的 Module path
project alias：包含 :: 的 Project member path
```

Module 记录：

```json
{
  "catalogKind": "module",
  "path": "...\\CM_ADCMain_Generic",
  "oid": "...",
  "projectCount": 1,
  "messageCount": 282,
  "sendMessageCount": 120,
  "receiveMessageCount": 150,
  "sendReceiveMessageCount": 12
}
```

Project 归属不需要复制到每个 Message；使用独立 Project -> Module Edge。

## 6. Message Catalog

对每个唯一 Module OID 执行一次：

```csharp
module.GetAllModelElements()
```

识别：

```text
IsSendMessage()
IsReceiveMessage()
IsSendReceiveMessage()
```

标准化：

```text
send_message
receive_message
send_receive_message
```

Message 记录：

```json
{
  "catalogKind": "message",
  "messageId": "<stable hash>",
  "name": "ADC_State",
  "modulePath": "...\\CM_ADCMain_Generic",
  "moduleOid": "...",
  "scope": "imported",
  "messageKind": "receive_message",
  "modelType": "enum",
  "unit": "",
  "enumPath": "...\\ADC_StateType",
  "enumOid": "..."
}
```

如果 Element 没有稳定 OID：

```text
messageId = SHA-256(moduleOid + elementName + messageKind)
```

### 6.1 Message 深度

默认：

```text
messageDepth=0
```

只读取 Module 直接 Element。

Live 代表数据：

```text
19 个 Module
直接 Message：1,264
递归 Message：1,265
```

第一版直接扫描已覆盖代表样本的 99.9%。递归作为可选模式。

## 7. Project Complex

从 stored Tree 提取 75 个 Project path/OID 后，在一个 ToolAPI Session 内：

```text
Project.GetAllModelElements()
  -> ComplexModelElement
  -> GetRepresentedClass()
```

同时输出 represented Module 和 Class。

```json
{
  "projectPath": "...",
  "projectOid": "...",
  "elementName": "AVH20ms",
  "scope": "exported",
  "representedPath": "...\\AVH20ms",
  "representedOid": "...",
  "representedKind": "module"
}
```

```json
{
  "projectPath": "...",
  "elementName": "_Calibration",
  "representedPath": "...\\_Calibration_AVH",
  "representedOid": "...",
  "representedKind": "class"
}
```

Module 形成 Project -> Module Edge；Class 形成 Parameter Class Root。

## 8. Parameter Class Catalog

Project 顶层 represented Class 作为根：

```text
Class root
  -> GetAllModelElements()
  -> Primitive Parameter/Calibration evidence
  -> Complex represented kind=class 时递归
  -> Methods=0
```

判定：

```text
Methods=0
AND (
  IsParameter=true
  OR IsCalibration=true
  OR CanonicalKind=parameter
  OR Child Class 中存在上述证据
)
```

记录：

```json
{
  "catalogKind": "parameter_class",
  "path": "...\\_Calibration_AVH",
  "oid": "...",
  "methodCount": 0,
  "classification": "verified_project_parameter_class",
  "directParameterCount": 12,
  "childParameterClassCount": 2,
  "enumUsageCount": 3
}
```

Project 未覆盖的 Parameter Class 通过现有结构候选规则做 orphan 补漏。

## 9. Parameter Class -> Enumeration

Parameter Class 的 Element 为 enum 类型时输出：

```json
{
  "relationKind": "parameter_class_enumeration",
  "parameterClassPath": "...\\_Calibration_AVH",
  "parameterClassOid": "...",
  "elementName": "AVH_Mode",
  "scope": "local",
  "enumPath": "...\\AVH_ModeType",
  "enumOid": "..."
}
```

Enumeration Catalog 根据 Edge 更新：

```text
usedByParameterClass=true
parameterUsageCount++
```

## 10. Message -> Enumeration

Message 为 enum 类型或引用 Enum 时输出：

```json
{
  "relationKind": "message_enumeration",
  "modulePath": "...",
  "moduleOid": "...",
  "messageName": "AVH_State",
  "messageKind": "send_message",
  "enumPath": "...\\AVH_StateType",
  "enumOid": "..."
}
```

Enumeration Catalog 更新：

```text
usedByMessage=true
messageUsageCount++
```

## 11. Public Action

建议新增：

```text
ascet_get action="database_catalog"
```

请求：

```json
{
  "action": "database_catalog",
  "sourceTreeResultId": "obs-tree-...",
  "include": [
    "parameter_class",
    "enumeration",
    "module",
    "message"
  ],
  "messageDepth": 0,
  "delivery": "stored"
}
```

原 `parameter_classes` 专项 Action 可以复用 Catalog 内部服务，只返回 Parameter Class 子集。

Project Complex 不一定需要单独暴露给模型，可作为 `database_catalog` 内部步骤。

## 12. 落盘文件

### 12.1 统一合集

```text
<sourceTreeResultId>.database-model-catalog.ndjson
```

每行的 `catalogKind` 为：

```text
parameter_class
enumeration
module
message
```

### 12.2 分类型文件

```text
<sourceTreeResultId>.parameter-classes.ndjson
<sourceTreeResultId>.enumerations.ndjson
<sourceTreeResultId>.modules.ndjson
<sourceTreeResultId>.messages.ndjson
```

### 12.3 关系文件

```text
<sourceTreeResultId>.project-complex-edges.ndjson
<sourceTreeResultId>.project-module-edges.ndjson
<sourceTreeResultId>.module-message-edges.ndjson
<sourceTreeResultId>.message-enum-edges.ndjson
<sourceTreeResultId>.parameter-enum-edges.ndjson
<sourceTreeResultId>.parameter-class-edges.ndjson
```

### 12.4 Summary/Meta

```text
<sourceTreeResultId>.database-model-summary.json
<sourceTreeResultId>.database-model.meta.json
```

统计：

```text
parameterClassCount
enumerationCount
moduleCount
messageCount
sendMessageCount
receiveMessageCount
sendReceiveMessageCount
projectModuleEdgeCount
projectParameterClassEdgeCount
messageEnumEdgeCount
parameterEnumEdgeCount
```

## 13. grep 搜索

Parameter Class：

```powershell
rg -F '"catalogKind":"parameter_class"' <database-model-catalog.ndjson>
```

Enumeration：

```powershell
rg -F '"catalogKind":"enumeration"' <database-model-catalog.ndjson>
```

Module：

```powershell
rg -F '"catalogKind":"module"' <database-model-catalog.ndjson>
```

Message：

```powershell
rg -F '"catalogKind":"message"' <database-model-catalog.ndjson>
```

SendReceive Message：

```powershell
rg -F '"messageKind":"send_receive_message"' <messages.ndjson>
```

某个 Enum 的所有使用点：

```powershell
rg -i 'AVH_ModeType' <message-enum-edges.ndjson> <parameter-enum-edges.ndjson>
```

某个 Project 的 Module/Parameter Class：

```powershell
rg -i 'AVH_ECU_CSW_BB00001' <project-complex-edges.ndjson>
```

## 14. 性能设计

```text
Tree Enumeration/Module：本地 OID 去重
Project Complex：单 Session、Project 顶层浅扫描
Module Message：428 个唯一 Module，各扫描一次直接 Element
Parameter Class：Class-only closure
关系 Join：本地 OID join
```

禁止：

```text
完整 Project read_implementation
每个 Project/Module 启动独立 CLI
默认递归整个 Module 功能图
全量读取 Enum literal
```

## 15. 当前状态

当前没有代码修改：

```text
get_tree 保持原样
没有 database_catalog action
没有 project_complex action
```

本文件仅记录最终设计。
## 16. 全库范围与 include 选择（最终设计）

Catalog 的范围固定为：

```text
all_database
```

调用者不选择 Project、Component 或 Folder，只选择需要生成的类型：

```text
parameter_class
enumeration
module
message
```

请求中不再提供：

```text
selection
projectPaths
componentPaths
targetPathPrefix
oids
```

### 16.1 最终请求

```json
{
  "action": "database_catalog",
  "sourceTreeResultId": "obs-tree-...",
  "include": [
    "parameter_class",
    "enumeration",
    "module",
    "message"
  ],
  "messageDepth": 0,
  "delivery": "stored"
}
```

`include` 必填且至少包含一种类型。

没有 `include` 时返回：

```text
include_required
```

源 Tree 必须满足：

```text
coverage.status = complete_for_scope
无 target path/oid/prefix
无 maxFolders/maxComponents 截断
```

否则返回：

```text
full_tree_required
```

## 17. include 扫描依赖矩阵

### 17.1 enumeration

```text
数据来源：stored Tree kind=enumeration
Live 调用：无
输出：enumerations.ndjson
```

只生成 Database 全部 Enum 定义。

如果没有同时 include `message` 或 `parameter_class`：

```text
messageUsageStatus = not_scanned
parameterUsageStatus = not_scanned
```

不能错误写成 `false`。

### 17.2 module

```text
数据来源：stored Tree kind=module，按 OID 去重
Live 调用：无
输出：modules.ndjson
```

当前 Live Tree：

```text
859 个 Module 行
428 个唯一 Module OID
```

只 include `module` 时不读取 Module Element。

### 17.3 message

```text
数据来源：Tree 中全部唯一 Module
Live 调用：扫描 428 个唯一 Module 的直接 GetAllModelElements()
输出：messages.ndjson、module-message-edges.ndjson
```

内部必须读取 Module identity，但如果没有 include `module`，不生成 `modules.ndjson`。

Message 本身仍可携带：

```text
enumPath
enumOid
```

如果同时 include `enumeration`，再更新 Enum usage 统计并生成 `message-enum-edges.ndjson`。

### 17.4 parameter_class

```text
数据来源：Tree 中全部 Project
Live 调用：Project 顶层 getComplex + Class-only closure + Methods/Parameter evidence
输出：parameter-classes.ndjson、parameter-class-edges.ndjson
```

内部会读取 represented Module/Class 类型，但如果没有 include `module` 或 `message`，不生成对应 Catalog 文件，也不扫描 Module Message。

如果同时 include `enumeration`，扫描 Parameter Class enum Element，并生成：

```text
parameter-enum-edges.ndjson
```

## 18. include 组合示例

### 18.1 只生成 Enum

```json
{
  "action": "database_catalog",
  "sourceTreeResultId": "obs-tree-...",
  "include": ["enumeration"],
  "delivery": "stored"
}
```

纯本地处理，不访问 ASCET ToolAPI。

### 18.2 只生成 Module

```json
{
  "action": "database_catalog",
  "sourceTreeResultId": "obs-tree-...",
  "include": ["module"],
  "delivery": "stored"
}
```

纯本地按 OID 去重。

### 18.3 只生成 Message

```json
{
  "action": "database_catalog",
  "sourceTreeResultId": "obs-tree-...",
  "include": ["message"],
  "messageDepth": 0,
  "delivery": "stored"
}
```

扫描全库唯一 Module，但只输出 Message。

### 18.4 Parameter Class + Enum

```json
{
  "action": "database_catalog",
  "sourceTreeResultId": "obs-tree-...",
  "include": ["parameter_class", "enumeration"],
  "delivery": "stored"
}
```

不扫描 Module Message，只生成 Parameter Class、Enum 和 Parameter -> Enum 关系。

### 18.5 Module + Message + Enum

```json
{
  "action": "database_catalog",
  "sourceTreeResultId": "obs-tree-...",
  "include": ["module", "message", "enumeration"],
  "messageDepth": 0,
  "delivery": "stored"
}
```

不执行 Parameter Class Closure。

### 18.6 全部四类

```json
{
  "action": "database_catalog",
  "sourceTreeResultId": "obs-tree-...",
  "include": ["parameter_class", "enumeration", "module", "message"],
  "messageDepth": 0,
  "delivery": "stored"
}
```

## 19. 按 include 落盘

只创建 include 对应文件：

```text
parameter_class -> parameter-classes.ndjson
 enumeration    -> enumerations.ndjson
 module         -> modules.ndjson
 message        -> messages.ndjson
```

关系文件按实际执行的关系生成：

```text
parameter-class-edges.ndjson    include parameter_class
module-message-edges.ndjson     include message
parameter-enum-edges.ndjson     include parameter_class + enumeration
message-enum-edges.ndjson       include message + enumeration
project-complex-edges.ndjson    include parameter_class 或需要 Project usage 时
```

始终生成：

```text
database-model-summary.json
database-model.meta.json
```

Meta 记录：

```text
sourceTreeResultId
include
messageDepth
coverage
per-type item counts
per-stage timings
```

## 20. 按 include 的时间预期

在完整 Tree 已落盘的前提下：

| include | 预计时间 |
| --- | ---: |
| `enumeration` | <1 s |
| `module` | <1 s |
| `module,enumeration` | <1 s |
| `message` | 15–45 s |
| `module,message,enumeration` | 15–45 s |
| `parameter_class` | 10–30 s |
| `parameter_class,enumeration` | 10–30 s |
| 全部四类 | 30–90 s |

正式实现后以全库 Live Benchmark 为准。
