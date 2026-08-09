# ASCET 全量 Tree 后的 Project Complex 与 Module Message 发现方案

> 定位修正：Project Complex 与 Module Message 只作为 Parameter Class + Enumeration 合集的内部数据源，不作为独立通用 Catalog 主目标。最终方案见 `docs/2026-08-08-ascet-parameter-class-enumeration-catalog-plan.md`。

## 1. 边界

本方案不修改当前 `get_tree`。

当前流程保持：

```text
ascet_get action="tree" delivery="stored"
```

全量 Tree 落盘后，本地读取 Tree，提取：

```text
kind=project
path
oid
```

然后新增独立的 Project Complex 读取步骤。

## 2. 正确的总体流程

```text
stored full tree.ndjson
  -> 本地提取所有 Project path/OID
  -> 单次 Live get_project_complex
  -> Project 顶层 GetAllModelElements()
  -> 过滤 ComplexModelElement
  -> GetRepresentedClass()
  -> 同时输出 represented Class 和 Module
  -> Module 直接 Element 中提取 Message
  -> Class 进入 Parameter Class 专项分析
  -> 结果分别落盘供 grep
```

不应把 Project Complex 结果只当成 Parameter Class 入口。它同时是 Project Module 和 Message 使用关系入口。

## 3. 当前能力状态

仓库中目前没有：

```text
getComplex
get_complex
project_complex
complex_elements
```

公开 Action。

现有 `read_implementation` 能返回：

```text
ElementKind
CanonicalKind
MessageKind
ReferencedComponentPath
ChildElements
```

但它会递归展开完整 Implementation，不适合作为全库 Project Complex 扫描接口。

因此需要新增轻量只读 Action，而不是循环调用 `read_implementation`。

## 4. Live 证据

全量 Tree：

```text
Project：75
project::member：431
431 条全部为 Module
```

三个代表 Project 的顶层 Complex Element：

```text
ADCMain：6 Module + 2 Class
IPBCustNonHADHAP：10 Module + 2 Class
AVH：3 Module + 2 Class
```

19 个 Module 的 Message 统计：

```text
Send Message：626
Receive Message：593
SendReceive Message：46
合计：1,265
```

其中：

```text
Module 直接 Element Message：1,264
递归后总 Message：1,265
```

即代表样本中 99.9% 的 Message 是 Module 直接 Element。因此第一版默认读取 Module 直接 Message，不做全递归；递归作为可选模式。

## 5. 新 Action

建议新增：

```text
ascet_get action="project_complex"
```

请求：

```json
{
  "action": "project_complex",
  "sourceTreeResultId": "obs-tree-...",
  "include": ["class", "module", "messages"],
  "messageDepth": 0,
  "delivery": "stored"
}
```

字段：

| 字段 | 含义 |
| --- | --- |
| `sourceTreeResultId` | 已落盘全量或 bounded Tree |
| `include` | 输出 represented Class、Module、Module Message |
| `messageDepth` | `0` 只读 Module 直接 Message；大于 0 才递归 Complex child |
| `delivery` | 建议 `stored` |

第一版固定支持：

```text
include = class,module,messages
messageDepth = 0
```

## 6. Extension 处理

Extension 从 Tree Observation 中读取：

```text
metadata.coverage
metadata.target
dataPath
```

流式提取：

```text
kind=project
```

形成：

```json
{
  "projectPath": "...",
  "projectOid": "..."
}
```

然后把 Project 列表一次性传给 CLI。禁止每个 Project 启动一次 CLI。

如果 Tree 是 partial/bounded，Project Complex 结果必须继承同一 coverage，不能宣称全库完整。

## 7. CLI 单 Session 算法

```text
打开一次 ASCET ToolAPI Session
  -> 顺序 Resolve Project
  -> Project.GetAllModelElements()
  -> 处理顶层 ComplexModelElement
  -> represented = GetRepresentedClass()
  -> 输出 Project Complex Edge
  -> represented kind=module 时加入 uniqueModule map
  -> represented kind=class 时加入 uniqueClass map
  -> 全部 Project 完成后扫描 unique Module Message
```

### 7.1 Project Complex Edge

每个 Complex Element 输出：

```json
{
  "projectPath": "...\\ADCMainCustIPB_ECU_CSW_BB00001",
  "projectOid": "...",
  "elementName": "CM_ADCMain_Generic",
  "scope": "exported",
  "representedPath": "...\\CM_ADCMain_Generic",
  "representedOid": "...",
  "representedKind": "module"
}
```

Class 示例：

```json
{
  "projectPath": "...\\ADCMainCustIPB_ECU_CSW_BB00001",
  "elementName": "_ADCMain_Calibration",
  "representedPath": "...\\_ADCMain_Calibration",
  "representedOid": "...",
  "representedKind": "class"
}
```

### 7.2 去重

使用：

```text
uniqueModules[representedOid]
uniqueClasses[representedOid]
```

同一个 Module/Class 被多个 Project 使用时，只扫描一次，但 Project Complex Edge 全部保留。

## 8. Module Message 提取

对每个唯一 Module：

```csharp
Array elements = module.GetAllModelElements() as Array;
```

检查：

```text
IsSendMessage()
IsReceiveMessage()
IsSendReceiveMessage()
```

标准化为：

```text
send_message
receive_message
send_receive_message
```

每条 Message 输出：

```json
{
  "modulePath": "...\\CM_ADCMain_Generic",
  "moduleOid": "...",
  "elementName": "ADC_Message",
  "elementPath": "...\\CM_ADCMain_Generic::ADC_Message",
  "scope": "imported",
  "messageKind": "receive_message",
  "modelType": "cont",
  "unit": "m/s2",
  "referencedTypePath": "...",
  "referencedTypeOid": "..."
}
```

`referencedTypePath/Oid` 仅在 Message 引用了 Enumeration、Record 或其他类型时填写。

第一版不读取：

```text
Message value
Implementation range
Method body
Diagram
```

## 9. 可选递归 Message

默认：

```text
messageDepth=0
```

只扫描 Project 直接 Module 的直接 Element。

当指定：

```text
messageDepth > 0
```

才沿 Module/Class 的 Complex Element 继续扫描子 Component。必须使用：

```text
visitedComponentOid
maxDepth
cycleCount
```

Live 样本中直接扫描已覆盖 1,264/1,265 条 Message，因此全库默认不应启用递归。

## 10. Class 分支

Project Complex 中：

```text
representedKind=class
```

的记录全部保留，作为后续专项入口：

```text
Parameter Class
Calibration/Constant Class
其他 Project 直接 Class
```

Parameter Class 专项再执行：

```text
Project Class roots
  -> Class-only Complex closure
  -> Methods=0
  -> Parameter/Calibration evidence
```

`project_complex` 本身不应把所有 represented Class 强制声明为 Parameter Class。

## 11. 落盘文件

### 11.1 Project Complex

```text
<sourceTreeResultId>.project-complex.ndjson
```

包含所有 Project -> Class/Module Edge。

### 11.2 Unique Component Summary

```text
<sourceTreeResultId>.project-complex-components.ndjson
```

每个唯一 represented Component 一行：

```json
{
  "path": "...",
  "oid": "...",
  "kind": "module",
  "projectCount": 3,
  "projectPaths": ["..."]
}
```

### 11.3 Module Message

```text
<sourceTreeResultId>.module-messages.ndjson
```

每条 Message 一行。

### 11.4 Parameter Class 下游产物

```text
<sourceTreeResultId>.project-parameter-roots.ndjson
<sourceTreeResultId>.parameter-class-edges.ndjson
<sourceTreeResultId>.parameter-classes.ndjson
```

### 11.5 Summary/Meta

```text
<sourceTreeResultId>.project-complex-summary.json
<sourceTreeResultId>.project-complex.meta.json
```

统计：

```text
projectCount
resolvedProjectCount
failedProjectCount
complexElementCount
uniqueModuleCount
uniqueClassCount
moduleMessageCount
sendMessageCount
receiveMessageCount
sendReceiveMessageCount
recursiveMessageCount
cycleCount
```

## 12. grep 搜索

所有 Project Module：

```powershell
rg -F '"representedKind":"module"' <project-complex.ndjson>
```

所有 Project Class：

```powershell
rg -F '"representedKind":"class"' <project-complex.ndjson>
```

Send Message：

```powershell
rg -F '"messageKind":"send_message"' <module-messages.ndjson>
```

Receive Message：

```powershell
rg -F '"messageKind":"receive_message"' <module-messages.ndjson>
```

SendReceive Message：

```powershell
rg -F '"messageKind":"send_receive_message"' <module-messages.ndjson>
```

按 Module 搜索：

```powershell
rg -i 'CM_ADCMain_Generic' <module-messages.ndjson>
```

按 Project 搜索 Module/Class：

```powershell
rg -i 'IPBCustNonHADHAP_ECU_CSW_BB88010' <project-complex.ndjson>
```

## 13. 性能约束

禁止：

```text
每个 Project 启动一次 CLI
调用完整 read_implementation
递归展开全部 Module ChildElements
重复扫描同一个 Module/Class
```

必须：

```text
一次 ToolAPI Session
Project 顶层浅扫描
Module OID 去重
Module direct Message 扫描
NDJSON 流式落盘
```

记录：

```text
treeLoadMs
projectResolveMs
projectComplexMs
uniqueModuleCount
moduleMessageMs
messageCount
writeMs
totalMs
```

## 14. 与 get_tree 的关系

第一版不修改 `get_tree`：

```text
get_tree 只负责全库结构和 Project 清单
project_complex 负责 Project 顶层 Complex Element
module_messages 作为 project_complex 的派生结果
parameter_classes 作为 Class 分支的派生结果
```

这样职责清晰，也不会让每次普通 Tree 查询都承担 Project/Message 深读成本。

## 15. 实现位置

建议新增：

```text
ascetcli/src/AscetCopilot/Services/Get/ProjectComplexDiscoveryService.cs
ascetcli/src/AscetCopilot/Services/Get/ModuleMessageDiscoveryService.cs
```

接入：

```text
ascetcli/src/AscetCopilot/Services/Get/AscetGetService.cs
ascetcli/src/AscetCli/Commands/ExecCommand.cs
ascetcli/src/AscetCli/Routing/OperationRegistry.cs
packages/ascet-extension/src/get.ts
packages/ascet-extension/src/observation-store.ts
```

## 16. Live 验收

实现后使用当前 Database 验证：

```text
Tree Project = 75
全部 Project Resolve 成功
Project Complex 同时包含 Class 和 Module
Module Message 包含三种 MessageKind
代表样本消息基线：
  send=626
  receive=593
  send_receive=46
```

全库验收还需记录实际：

```text
uniqueModuleCount
uniqueClassCount
moduleMessageCount
Project Complex 总耗时
Module Message 总耗时
```
