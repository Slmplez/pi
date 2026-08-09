# ASCET Project 驱动的 Parameter Class 发现方案（Live 验证版）

> 修正：当前 `get_tree` 保持不变。Project 顶层 Complex Class/Module 改由独立 `project_complex` Action 从 stored Tree 的 Project 清单读取。统一方案见 `docs/2026-08-08-ascet-project-complex-and-message-discovery-plan.md`。本文中的 Tree 增强建议不再采用。

## 1. 最终结论

Live 测试表明，Parameter Class 的主要发现路径应为：

```text
全量 Tree 发现 Project
  -> Project.GetAllModelElements()，仅读取顶层 Element
  -> ComplexModelElement.GetRepresentedClass()
  -> represented kind=class 的 Element 作为 Parameter Class 根
  -> 只递归这些 Class 的 Class->Class Complex 引用
  -> Methods=0 + Parameter/Calibration Element 验证
  -> 结果落盘并通过 grep 搜索
```

以下两条方案不适合作为主路径：

```text
1. Folder/Class 名称聚类
2. Project Module -> get_component_refs -> 全局 Component 图
```

名称规则只用于 orphan 补漏；Module Component Reference 主要包含功能 Class 和 Enumeration，没有稳定暴露 Parameter Class。

## 2. Live 测试环境

测试日期：

```text
2026-08-08
```

Database：

```text
C:\Repo\F05_IPB_L2_0429
```

ToolAPI 状态：

```text
可连接
串行只读调用
```

## 3. 全量 Tree Live 结果

调用：

```json
{
  "action": "tree",
  "traversal": { "depth": 64 }
}
```

结果：

| 指标 | 数值 |
| --- | ---: |
| Live 耗时 | 127.778 s |
| 输出大小 | 1,694,192 bytes |
| Tree 节点 | 10,670 |
| Folder | 1,844 |
| Class | 7,069 |
| Module | 859 |
| Enumeration | 708 |
| Project | 75 |
| StateMachine | 62 |
| Project member edge | 431 |
| Project member unique OID | 428 |
| coverage | complete_for_scope |
| truncated | false |

Project 成员统计：

```text
75/75 Project 有 project::member 行
431/431 member kind 都是 module
没有 project::member kind=class
```

因此当前 `get_tree` 的 Project 展开只覆盖 Module，没有把 Project 顶层 Calibration/Constant Complex Class 输出到 Tree。

## 4. Project Group 方案的 Live 结论

按 Project 根 Module 集合计算结构签名：

```text
ProjectCount = 75
ProjectGroupCount = 75
```

全部 Project 签名均不同，没有发生分组合并。

同时：

```text
Project member edge = 431
Unique root OID = 428
```

只减少 3 个重复根。因此按 Project 根 Module 分组或去重，在当前 Database 上没有明显收益，应从主方案中删除。

## 5. Module Component Reference Live 结果

### 5.1 CM_LFI_IPB

目标：

```text
PlatformLibrary\Package\LFI_LongitudinalForceInterface\Component\Config\CM_LFI_IPB
```

结果：

```text
耗时：3.132 s
引用：37
唯一目标 OID：28
Enumeration 引用：28
Class 引用：9
Parameter/Calibration 命名 Class：0
```

### 5.2 CM_ADCMain_Generic

目标：

```text
CN_Libary\Package\LDM\ADC\Component\Main\CM_ADCMain_Generic
```

结果：

```text
耗时：0.989 s
引用：144
唯一目标 OID：84
_ ADCMain Calibration/Constant 命中：0
```

结论：

```text
GetAllReferencedModelElements()
```

适合功能 Component 引用和 Enumeration/功能 Class 关系，不是 Project Parameter Class 的可靠入口。

## 6. Project Implementation Live 结果

测试三个 Project：

```text
CN_Libary\Package\LDM\ADC\Component\Main\ADCMainCustIPB_ECU_CSW_BB00001
CN_Libary\CNMS_IPB20\IPBCustNonHADHAP\IPBCustNonHADHAP_ECU_CSW_BB88010
PlatformLibrary\Package\AVH_AutomaticVehicleHold\Component\AVH_ECU_CSW_BB00001
```

### 6.1 ADCMain Project

Project 顶层：

```text
9 Elements
1 Primitive dT
6 Complex Module
2 Complex Class
```

两个 Class：

```text
_ADCMain_Calibration
_ADCMain_Constant
```

Parameter Class 分支：

```text
14 个唯一引用 Class
193 个 Primitive Element
193 个 CanonicalKind=parameter
最大深度 4
```

### 6.2 IPBCustNonHADHAP Project

Project 顶层：

```text
13 Elements
1 Primitive dT
10 Complex Module
2 Complex Class
```

两个 Class：

```text
_IPBCustNonHADHAP_BB88010_Parameter_Calibration
_IPBCustNonHADHAP_BB88010_Parameter_Constant
```

Parameter Class 分支：

```text
21 个唯一引用 Class
224 个 Primitive Element
201 个 CanonicalKind=parameter
最大深度 4
```

### 6.3 AVH Project

Project 顶层：

```text
6 Elements
1 Primitive dT
3 Complex Module
2 Complex Class
```

两个 Class：

```text
_Calibration_AVH
_Constant_AVH
```

Parameter Class 分支：

```text
8 个唯一引用 Class
72 个 Primitive Element
72 个 CanonicalKind=parameter
最大深度 3
```

## 7. Live 验证得到的稳定结构

三个不同类型 Project 都满足：

```text
Project 顶层 Complex Element
  represented kind=module -> 功能代码分支
  represented kind=class  -> Calibration/Constant Parameter 根
```

从 Parameter 根继续递归时：

```text
Complex target 全部为 class
没有 module
Primitive Element 大量为 CanonicalKind=parameter
```

三个 Project 的 Parameter 分支合计：

```text
唯一 Class：38
Methods=0：38
Methods>0：0
失败：0
```

批量 `list_methods` 使用 38 个独立 CLI 调用：

```text
总耗时：12.233 s
平均：322 ms/Class
最大：460 ms/Class
```

正式单 Session、直接对象句柄实现应明显减少进程和 Path Resolve 开销，但必须在实现后重新 Benchmark。

## 8. 为什么不能读取完整 Project Implementation

三个 Project 的完整递归 Implementation：

| Project | 耗时 | 输出大小 |
| --- | ---: | ---: |
| ADCMain | 36.789 s | 1,887,139 bytes |
| IPBCustNonHADHAP | 34.695 s | 1,832,054 bytes |
| AVH | 7.351 s | 364,699 bytes |
| 合计 | 78.835 s | 4,083,892 bytes |

完整 Project Implementation 会递归展开所有 Module 和功能 Class，绝大部分与 Parameter Class 发现无关。

只读取六个 Project Parameter 根 Class 的 Implementation：

| Class | 耗时 | 输出大小 |
| --- | ---: | ---: |
| ADC Calibration | 3.845 s | 176,773 bytes |
| ADC Constant | 1.243 s | 29,682 bytes |
| NonHADHAP Calibration | 3.709 s | 141,401 bytes |
| NonHADHAP Constant | 2.448 s | 100,879 bytes |
| AVH Calibration | 0.933 s | 16,875 bytes |
| AVH Constant | 1.665 s | 57,076 bytes |
| 合计 | 13.859 s | 522,686 bytes |

对比：

```text
速度提升：5.69x
输出减少：87.2%
```

而正式实现不需要序列化完整 Class Implementation；只需要 `GetAllModelElements()`、`GetRepresentedClass()` 和 Method/Parameter 标志，因此还可以进一步降低成本。

## 9. 修正后的 Tree 设计

当前 Project Tree 展开逻辑主要通过：

```text
GetAllDataBaseItems / GetAllCodeComponents / GetAllComponents / GetAllModules
```

结果只得到 Project Module。

应专门处理 `AscetProject`：

```csharp
Array elements = project.GetAllModelElements() as Array;
```

对每个 `ComplexModelElement`：

```csharp
DataBaseItem represented = complex.GetRepresentedClass() as DataBaseItem;
```

输出：

```json
{
  "path": "<projectPath>::<elementName>",
  "oid": "<representedOid>",
  "kind": "class|module|...",
  "relation": "project_complex_element",
  "elementKind": "complex"
}
```

这样 Tree 会同时包含：

```text
Project -> Module
Project -> Calibration Class
Project -> Constant Class
```

Project 顶层只读取一次，不递归 ChildElements。

## 10. 修正后的 Parameter Class 算法

### 10.1 本地读取 Tree

从 stored Tree 中提取：

```text
path 包含 ::
relation = project_complex_element
kind = class
```

形成 Parameter Root：

```text
projectPath
elementName
classOid
canonicalClassPath
```

按 Class OID 去重。

### 10.2 单次 Live Class Closure

新增：

```text
get_parameter_classes
```

输入所有唯一 Parameter Root path/OID，在一个 ToolAPI Session 内：

```text
Queue<Class>
HashSet<ClassOid>
```

每个 Class：

1. 直接使用 `GetAllModelElements()`。
2. Primitive Element 检查：
   - `IsParameter=true`
   - `IsCalibration=true`
   - `CanonicalKind=parameter`
3. Complex Element：
   - `GetRepresentedClass()`
   - 仅当 represented kind=class 时入队。
4. 读取 Method count。
5. 使用 OID 去重和循环保护。

禁止：

```text
递归 Module
读取 Method body
序列化完整 Implementation
每个 Class 启动独立 CLI
根据 path 反复 Resolve 已持有的 Class
```

### 10.3 判定

直接 Parameter Class：

```text
Project Class Root 或 Class Root 可达
AND Methods=0
AND 存在直接 Parameter/Calibration primitive evidence
```

聚合 Parameter Class：

```text
Project Class Root 或 Class Root 可达
AND Methods=0
AND Child Class 中存在 Parameter/Calibration evidence
```

如果 Class Root 可达且 Methods=0，但没有任何 Parameter 证据：

```text
project_methodless_class_candidate
```

不能进入最终文件。

## 11. Action 设计

```json
{
  "action": "parameter_classes",
  "sourceTreeResultId": "obs-tree-...",
  "discoveryMode": "project_parameter_roots",
  "delivery": "stored"
}
```

执行顺序：

```text
Extension 读取 stored Tree
  -> 提取 Project Class Roots
  -> 一次 CLI get_parameter_classes
  -> Class-only closure
  -> Methods/Parameter evidence
  -> 落盘
```

不再使用 Project Group、Module Graph 或逐 Project `read_implementation`。

## 12. 落盘文件

### 12.1 Project Parameter Root

```text
<resultId>.project-parameter-roots.ndjson
```

```json
{"projectPath":"...","elementName":"_Calibration","classPath":"...\\_Calibration_AVH","classOid":"..."}
```

### 12.2 Class 引用边

```text
<resultId>.parameter-class-edges.ndjson
```

```json
{"sourceClassPath":"...\\_Calibration_AVH","elementName":"...","targetClassPath":"...","targetClassOid":"..."}
```

### 12.3 最终 Parameter Class

```text
<resultId>.parameter-classes.ndjson
```

```json
{"path":"...","oid":"...","methodCount":0,"classification":"verified_project_parameter_class","projects":["..."],"evidence":["project-complex-class-root","methods=0","CanonicalKind=parameter"]}
```

### 12.4 未确认结果

```text
<resultId>.project-methodless-class-candidates.ndjson
```

## 13. grep 搜索

按 Project 找根 Parameter Class：

```powershell
rg -i 'IPBCustNonHADHAP_ECU_CSW_BB88010' <project-parameter-roots.ndjson>
```

按 Class 找子 Parameter Class：

```powershell
rg -i '_ExternModel_VehicleMass' <parameter-class-edges.ndjson>
```

搜索最终结果：

```powershell
rg -i 'brakera|calibration|constant' <parameter-classes.ndjson>
```

## 14. Orphan 补漏

Project 驱动结果只能证明：

```text
至少被一个 Project Parameter Root 引用的 Parameter Class
```

Database 中可能存在：

```text
未被 Project 使用的共享 Class
历史/废弃 Class
测试 Class
新建但未接入 Project 的 Class
```

需要完整 Database 结果时：

```text
原有结构候选 983
  - Project Class Closure
  = orphan candidates

orphan candidates
  -> Methods=0
  -> Parameter/Calibration semantic verification
```

名称/Folder 规则只用于这个 orphan 集合。

## 15. 性能优先级

### 15.1 先修复 get_tree

当前全量 Tree：

```text
127.778 s
```

此前相同 Database 记录：

```text
19.771 s
```

当前 `ContainsTreePath` 对累计结果线性扫描，可能形成 O(N²)。必须先改为：

```text
HashSet<string> emittedPaths
HashSet<string> visitedFolderOids/paths
```

否则 Parameter Class 算法即使优化，仍被全量 Tree 时间支配。

### 15.2 Parameter Class 服务

目标复杂度：

```text
O(ProjectTopLevelElements + UniqueParameterClasses + ClassEdges)
```

不应与 Module 数量、Module ChildElements 数量成正比。

记录：

```text
projectRootReadMs
uniqueProjectClassRootCount
classClosureMs
uniqueParameterClassCount
methodScanMs
semanticVerificationMs
writeMs
totalMs
```

## 16. 实现顺序

1. 修复 `get_tree` O(N²) path 去重。
2. Project Tree 展开改为读取顶层 `GetAllModelElements()`。
3. Tree 输出 `project_complex_element` relation 和 represented kind。
4. 实现 stored Tree 的 Project Class Root 提取器。
5. 实现单 Session Class-only closure。
6. 复用 Method count 和 Parameter evidence 缓存。
7. 写入 root/edge/result/summary artifacts。
8. 单元测试。
9. 运行 `npm run check`。
10. 重新执行全库 Live Benchmark。
11. 与既有 954 个 `Class + Methods=0` 基线比较。
12. 对缺失结果执行 orphan 补漏分析。

## 17. Live 验收标准

至少验证：

```text
Tree coverage.status = complete_for_scope
Tree truncated = false
75 个 Project 均有顶层 Complex Element 结果
Project Class Root 数量和失败数
Project Class Closure 唯一 Class 数量
Methods=0 数量
Parameter evidence 成功数量
与 954 基线的 missing/extra
orphan 数量和原因
```

本轮 Live 只验证了三个代表 Project。三者均严格符合“顶层 Complex Class 为 Parameter 根、Parameter 分支只递归 Class、全部 Class Methods=0”的模式；是否覆盖全部 75 个 Project，需要实现轻量顶层 Project 扫描后再进行全库验收。
