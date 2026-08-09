# ASCET Parameter Class 与 Enumeration 合集方案

> 范围修正：Module 和 Message 也是正式 Catalog 主对象，不只是 Enumeration 的内部数据源。最终四类对象方案见 `docs/2026-08-08-ascet-database-model-catalog-plan.md`。

## 1. 目标

本方案的最终产物不是通用 Project/Module/Message 索引，而是：

```text
Parameter Class Catalog
+
Enumeration Catalog
+
Parameter/Message 到 Enumeration 的使用关系
```

Module 和 Message 是 Enumeration 使用关系的数据来源，不是主输出对象。

## 2. 总体流程

```text
stored full tree.ndjson
  |
  +-> kind=enumeration
  |     -> Database 全部 Enumeration 定义
  |
  +-> kind=project
        -> Project 顶层 getComplex
        -> represented Class
        |     -> Parameter Class roots
        |     -> Class-only closure
        |     -> Methods=0 + Parameter evidence
        |     -> Parameter Class Catalog
        |
        -> represented Module
              -> 直接 Send/Receive/SendReceive Message
              -> Message 引用 Enumeration
              -> Enum usage relation

Parameter Class 内 enum 类型 Element
  -> Parameter Class -> Enumeration relation

最后按 Enumeration OID 合并
  -> Parameter Class + Enum 合集
```

## 3. 数据来源

### 3.1 Tree Enumeration

全量 Tree 已直接包含：

```json
{"path":"...","oid":"...","kind":"enumeration"}
```

当前 Live Database：

```text
Enumeration = 708
```

因此 Database 全部 Enum 定义不需要通过 Module 扫描发现。Tree 提供：

```text
path
oid
kind=enumeration
```

Enum literal、comment、implementation 等详细信息按需 Live 读取，不在第一阶段全量展开。

### 3.2 Project Complex Class

从 Tree 提取全部 Project 后，执行 Project 顶层 Complex 扫描：

```text
Project.GetAllModelElements()
  -> ComplexModelElement
  -> GetRepresentedClass()
```

其中：

```text
represented kind=class
```

进入 Parameter Class 发现流程。

### 3.3 Project Complex Module

其中：

```text
represented kind=module
```

不作为 Catalog 主对象，而是作为 Message/Enum usage 数据源。

对唯一 Module OID 扫描：

```text
Module.GetAllModelElements()
```

只保留：

```text
IsSendMessage
IsReceiveMessage
IsSendReceiveMessage
```

然后解析 Message 引用的 Enumeration。

### 3.4 Parameter Class Enum Element

对已确认 Parameter Class 的 Element：

```text
DisplayType/model type = enum
或 represented/type definition kind = enumeration
```

输出：

```text
Parameter Class -> Element -> Enumeration
```

该关系用于识别 Parameter/Calibration 数据中使用的 Enum。

## 4. 为什么 Module 必须读取

Module 不进入最终合集，但 Module 中包含大量 Message。

三个代表 Project 的 19 个 Module Live 数据：

```text
Send Message：626
Receive Message：593
SendReceive Message：46
合计：1,265
```

其中 1,264 条是 Module 直接 Element，只有 1 条来自更深层级。

因此默认：

```text
messageDepth = 0
```

即可低成本获得主要 Message -> Enum 使用关系。

## 5. 内部 Project Complex 服务

建议将 `getComplex` 实现为合集 Action 的内部服务，而不是先扩展成通用独立索引工具：

```text
ProjectComplexDiscoveryService
```

输入：

```text
Tree 中提取的 Project path/OID 列表
```

输出内部流：

```text
ProjectComplexEdge
```

结构：

```json
{
  "projectPath": "...",
  "projectOid": "...",
  "elementName": "_Calibration",
  "scope": "exported",
  "representedPath": "...\\_Calibration_AVH",
  "representedOid": "...",
  "representedKind": "class"
}
```

Module 示例：

```json
{
  "projectPath": "...",
  "elementName": "AVH20ms",
  "representedPath": "...\\AVH20ms",
  "representedOid": "...",
  "representedKind": "module"
}
```

Class 和 Module 均必须输出到内部流，后续分别进入 Parameter 和 Enum usage 分支。

## 6. Parameter Class 分支

Project Complex Class 作为根：

```text
Class root
  -> GetAllModelElements()
  -> Primitive Parameter/Calibration evidence
  -> Complex represented kind=class 时继续递归
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

输出：

```text
verified_project_parameter_class
verified_project_parameter_aggregate
```

Project 未覆盖的对象再通过 orphan 规则补漏。

## 7. Message -> Enumeration 分支

Message 记录：

```json
{
  "projectPath": "...",
  "modulePath": "...\\CM_ADCMain_Generic",
  "moduleOid": "...",
  "messageName": "ADC_State",
  "messageKind": "receive_message",
  "scope": "imported",
  "enumPath": "...\\ADC_StateType",
  "enumOid": "..."
}
```

如果 Message 不是 Enum 类型：

- 可以记录 Message 基本统计；
- 不进入 Enum relation 文件；
- 不进入最终 Parameter/Enum Catalog。

同一个 Module 被多个 Project 使用时：

- Module Element 只扫描一次；
- Project -> Module Edge 保留；
- Enum usage 可通过 Module OID关联到多个 Project。

## 8. Parameter Class -> Enumeration 分支

记录：

```json
{
  "parameterClassPath": "...\\_Calibration_AVH",
  "parameterClassOid": "...",
  "elementName": "AVH_Mode",
  "scope": "local",
  "enumPath": "...\\AVH_ModeType",
  "enumOid": "..."
}
```

该关系比名称搜索更重要，因为它能回答：

```text
某个 Parameter Class 使用了哪些 Enum？
某个 Enum 被哪些 Parameter Class 使用？
```

## 9. Public Action

建议最终只暴露一个专项入口：

```text
ascet_get action="parameter_enum_catalog"
```

请求：

```json
{
  "action": "parameter_enum_catalog",
  "sourceTreeResultId": "obs-tree-...",
  "includeUsage": true,
  "messageDepth": 0,
  "delivery": "stored"
}
```

内部执行：

```text
Tree Enum extraction
Project Complex shallow scan
Parameter Class closure
Module direct Message scan
Enum OID join
Artifact write
```

如果仍保留：

```text
ascet_get action="parameter_classes"
```

它可以复用相同内部结果，只返回 Parameter Class 子集。

## 10. 最终落盘文件

### 10.1 合集

```text
<sourceTreeResultId>.parameter-enum-catalog.ndjson
```

Parameter Class：

```json
{
  "catalogKind": "parameter_class",
  "path": "...",
  "oid": "...",
  "classification": "verified_project_parameter_class",
  "methodCount": 0,
  "projectCount": 2,
  "searchText": "..."
}
```

Enumeration：

```json
{
  "catalogKind": "enumeration",
  "path": "...",
  "oid": "...",
  "databaseDefined": true,
  "usedByParameterClass": true,
  "usedByMessage": true,
  "projectCount": 3,
  "searchText": "..."
}
```

### 10.2 Parameter Class

```text
<sourceTreeResultId>.parameter-classes.ndjson
```

### 10.3 Enumeration

```text
<sourceTreeResultId>.enumerations.ndjson
```

包含 Tree 中全部 Enum，并附加 usage 标记。

### 10.4 关系边

```text
<sourceTreeResultId>.parameter-enum-edges.ndjson
<sourceTreeResultId>.message-enum-edges.ndjson
<sourceTreeResultId>.project-complex-edges.ndjson
```

### 10.5 Summary/Meta

```text
<sourceTreeResultId>.parameter-enum-summary.json
<sourceTreeResultId>.parameter-enum.meta.json
```

统计：

```text
parameterClassCount
enumerationCount
projectUsedEnumerationCount
parameterUsedEnumerationCount
messageUsedEnumerationCount
unusedEnumerationCount
parameterEnumEdgeCount
messageEnumEdgeCount
```

## 11. grep 搜索

所有 Parameter Class：

```powershell
rg -F '"catalogKind":"parameter_class"' <parameter-enum-catalog.ndjson>
```

所有 Enumeration：

```powershell
rg -F '"catalogKind":"enumeration"' <parameter-enum-catalog.ndjson>
```

Message 使用的 Enum：

```powershell
rg -F '"usedByMessage":true' <parameter-enum-catalog.ndjson>
```

Parameter Class 使用的 Enum：

```powershell
rg -F '"usedByParameterClass":true' <parameter-enum-catalog.ndjson>
```

查 Enum 的 Message 使用位置：

```powershell
rg -i 'AVH_ModeType' <message-enum-edges.ndjson>
```

查 Enum 的 Parameter 使用位置：

```powershell
rg -i 'AVH_ModeType' <parameter-enum-edges.ndjson>
```

## 12. 性能原则

```text
Tree Enum：纯本地提取
Project Complex：单 Session、顶层浅扫描
Module Message：唯一 Module OID、直接 Element
Parameter Class：Class-only closure
Enum Join：纯本地 OID join
```

禁止：

```text
完整 Project read_implementation
递归全部 Module 功能图
每个 Project/Module 启动独立 CLI
全量读取 708 个 Enum literal
```

Enum literal 只对 grep 选中的 Enum 按需读取。

## 13. 当前代码状态

当前没有代码修改：

```text
get_tree 保持原样
没有 project_complex action
没有 parameter_enum_catalog action
```

本文仅定义后续实现方案。
