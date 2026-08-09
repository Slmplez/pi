# ASCET Parameter Class 发现方案

## 1. 目的

本文记录基于当前 ASCET Database Live 数据验证得到的 Parameter Class 发现方案。

目标是新增：

```text
ascet_get action="parameter_classes"
```

该 Action 应在不构建持久化 P0、SQLite 或后台索引的前提下，通过轻量结构树初筛和 Method 精筛，快速发现指定 Scope 或整个 Database 中的 Parameter Class。

设计原则：

```text
结构树模糊初筛
  -> Class 候选
  -> Methods=0 精筛
  -> 可选 Parameter/Calibration 语义验证
```

禁止采用：

```text
get_tree
  -> 对全部 Class 逐个 read_component_summary
```

因为该方式存在明显的 N+1 ToolAPI 调用问题。

## 2. 定义

本文中的 Parameter Class Candidate 使用项目实测规则：

```text
Kind = Class
AND Methods = 0
```

最终识别还结合结构特征：

```text
Parameter/Calibration/Constant Folder
OR Parameter/Calibration/Constant Class Name
OR IDs Folder
OR Enumerations + Settings
```

严格语义验证模式进一步要求：

```text
存在 IsParameter=true
OR IsCalibration=true
OR BDE 聚合子 Class 中存在上述元素
```

`Methods=0` 是当前 Database 的项目规则，不应直接推广为所有 ASCET Database 的通用标准。Action 返回中必须保留识别证据和置信级别。

## 3. Live 测试环境

测试 Database：

```text
C:\Repo\F05_IPB_L2_0429
```

Live Tree 规模：

| 类型 | 数量 |
| --- | ---: |
| 顶层 Folder | 9 |
| 全部 Folder | 1,853 |
| 全部 Tree 节点 | 10,670 |
| Code Component | 8,065 |
| Class | 7,069 |
| Methods=0 Class | 954 |

覆盖结果：

```json
{
  "status": "complete_for_scope",
  "foldersVisited": 1853,
  "componentsScanned": 8065,
  "truncated": false
}
```

954 个 `Methods=0` Class 的语言分布：

| LanguageKind | 数量 |
| --- | ---: |
| ESDL | 844 |
| BDE | 109 |
| C | 1 |

## 4. 命名与结构特征分析

### 4.1 Folder 路径特征

863 个 `Methods=0` Class 位于以下 Folder 范围：

```text
Parameter
Parameters
Calibration
Calibrations
Constant
Constants
```

具体命中次数：

| Folder 段 | 数量 |
| --- | ---: |
| `Parameter` | 859 |
| `Parameters` | 4 |
| `Calibration` | 5 |
| `Calibrations` | 0 |
| `Constant` | 2 |
| `Constants` | 20 |

存在路径重叠，因此唯一 Class 总数为 863。

Folder 匹配必须按完整路径段判断，不能简单使用子字符串包含。

### 4.2 Class 名称特征

620 个 `Methods=0` Class 的名称包含：

```text
Parameter / Param
Calibration / Calib
Constant / Const
```

| 名称特征 | 数量 |
| --- | ---: |
| Parameter 类 | 204 |
| Calibration 类 | 245 |
| Constant 类 | 204 |

部分名称同时命中多个特征。

名称示例：

```text
_ADCMain_Calibration
_ADCMain_Constant
_iTAS_Parameter_Calibration
ATM_Parameter_GAC
_Calibration_AVH
_Constant_AVH
_AVDC_Parameter
```

### 4.3 路径和名称组合

| 组合 | 数量 |
| --- | ---: |
| Folder 与名称都命中 | 546 |
| 仅 Folder 命中 | 317 |
| 仅名称命中 | 74 |
| 两者均不命中 | 17 |

因此不能只依赖 Folder，也不能只依赖 Class 名称。

仅 Folder 命中的示例：

```text
...\Parameter\_PataButton
...\Parameter\private\_CST_Private_ClosedLoop
...\Parameter\...\_TCS_CUS_Hill_ForRefSupp
```

仅名称命中的示例：

```text
...\Component\_Calibration_AVH
...\Component\_Constant_AVH
...\Component\_iTAS_Parameter_Calibration
Customer\GAC\_AVDC_Parameter
```

## 5. 特殊 Parameter Class 模式

### 5.1 IDs Folder

12 个 Class 位于：

```text
...\public\IDs\_LdmId_*
```

例如：

```text
_LdmId_CDD
_LdmId_LFI
_LdmId_AVH
_LdmId_EMC
_LdmId_SCM
_LdmId_None
```

Live Implementation 检查确认这些 Class 都直接包含 Parameter Element。

因此增加结构规则：

```text
Folder 段等于 IDs 或 ID
```

### 5.2 Enumeration Settings

5 个 Class 位于：

```text
...\Enumeration\*_Settings
...\Enumerations\*_Settings
```

例如：

```text
STM_State_BSM_Settings
CRB_Internal_Enumeration_Settings
CRB_Public_Enumeration_Settings
CRB_External_Enumeration_Settings
CPE_External_Enumeration_Settings
```

Live 检查结果：

- 一个 Class 直接包含 `CanonicalKind=parameter`。
- 另外四个 Class 没有 `CanonicalKind=parameter`，但包含多个 `IsCalibration=true` 的配置元素。

因此严格验证不能只检查：

```text
CanonicalKind = parameter
```

还必须检查：

```text
IsParameter = true
OR IsCalibration = true
```

## 6. 最终结构初筛规则

一个 Class 进入 Method 精筛阶段，当且仅当满足以下任一结构规则。

### 6.1 Parameter Folder 规则

路径中存在完整 Folder 段：

```text
Parameter
Parameters
Calibration
Calibrations
Constant
Constants
```

### 6.2 Parameter 名称规则

Class 名称包含：

```text
Parameter
Calibration
Constant
```

或者包含独立缩写 Token：

```text
Param
Calib
Const
```

缩写必须具有分隔边界，避免将普通单词中的 `const` 等字符串误判为关键词。

### 6.3 ID 规则

路径中存在完整 Folder 段：

```text
ID
IDs
```

### 6.4 Enumeration Settings 规则

```text
路径中存在 Enumeration 或 Enumerations Folder
AND
Class 名称包含 Settings
```

### 6.5 精筛规则

结构候选进入精筛后要求：

```text
Kind = Class
AND Methods = 0
```

## 7. 推荐 API

建议在现有 `ascet_get` 中增加 Action，不新增顶层 Tool：

```ts
ascet_get({
  action: "parameter_classes",
  target: {
    targetPathPrefix: "PlatformLibrary"
  },
  discovery: {
    strategy: "tree_fuzzy"
  },
  refinement: {
    requireMethodCount: 0,
    verifyElements: false,
    includeAggregates: true
  },
  traversal: {
    depth: 20,
    maxFolders: 10000,
    maxComponents: 50000
  },
  delivery: "stored"
});
```

建议类型：

```ts
type AscetGetParameterClassesParams = {
  action: "parameter_classes";

  target?: {
    oid?: string;
    path?: string;
    targetPathPrefix?: string;
  };

  discovery?: {
    strategy?: "tree_fuzzy" | "all_methodless_classes";
    folderTerms?: string[];
    nameTerms?: string[];
    minScore?: number;
    maxCandidates?: number;
  };

  refinement?: {
    requireMethodCount?: number;
    verifyElements?: boolean;
    includeAggregates?: boolean;
  };

  traversal?: {
    depth?: number;
    maxFolders?: number;
    maxComponents?: number;
  };

  delivery?: "auto" | "inline" | "stored";
};
```

默认值：

```text
discovery.strategy = tree_fuzzy
refinement.requireMethodCount = 0
refinement.verifyElements = false
refinement.includeAggregates = true
```

`all_methodless_classes` 是显式慢模式，不得作为默认值。

## 8. 后端遍历设计

必须复用新 P0 Tree 的单次 Folder 枚举算法，但不创建持久化 P0 索引。

```text
GetAllAscetFolders()
  -> Queue
  -> 每个 Folder 只调用一次 GetAllDataBaseItems()
  -> 本地 parentPath + name 拼接 path
  -> 流式应用结构候选规则
  -> 只对候选 Class 读取 Methods
```

禁止：

```text
每个 Folder 同时调用 GetAllDataBaseItems() 和 GetChildFolders()
线性 ContainsTreePath() 查重
为所有 Tree 节点读取 OID
为所有 Component 读取 Language
先构造完整 Tree JSON，再按 Path 重新 Resolve Class
```

推荐公共服务：

```csharp
internal sealed class AscetTreeTraversalService
{
    public void Traverse(
        AscetDataBase database,
        TreeTraversalRequest request,
        Action<TreeEntry> visitor);
}
```

`get_tree` 和 `get_parameter_classes` 应共用该 Traversal Service。

### 8.1 字段读取策略

全部 Folder：

```text
GetName()
GetAllDataBaseItems()
```

全部 Component：

```text
仅在结构规则需要 Class 名称时读取 GetName()
不读取 OID
不读取 Language
```

结构候选 Class：

```text
读取 Method 数量
```

最终匹配 Class：

```text
读取 OID
按需读取 Language
```

该策略避免对全部 10,248 个节点调用 `GetOID()`。

## 9. Method 精筛

Method 数量读取必须直接使用已有 `CodeComponent` 句柄，不能根据 Path 重新 Resolve。

建议提取共享服务：

```csharp
internal sealed class MethodDiscoveryService
{
    public int CountMethods(
        CodeComponent component,
        string componentPath);
}
```

统计逻辑与现有 `MethodReadService` 保持一致：

- 遍历 Component Diagram。
- 获取 Diagram Method。
- 按 Method 身份去重。
- 不读取 Method body。

## 10. 严格语义验证

默认模式不读取 Implementation。

当请求：

```ts
refinement: {
  verifyElements: true
}
```

对最终候选进行严格验证。

直接 Parameter Class：

```text
Methods=0
AND
至少存在 IsParameter=true 或 IsCalibration=true
```

BDE Parameter 聚合 Class：

```text
Methods=0
AND
存在 Complex Element
AND
子 Class 或 Child Element 中存在 IsParameter=true 或 IsCalibration=true
```

验证必须：

- 支持 ChildElements 递归。
- 使用 OID 或规范化 Path 做缓存。
- 有循环引用保护。
- 有最大引用深度。
- 找到第一个 Parameter/Calibration 证据后可提前停止。

建议分类：

```text
parameter_class_candidate
verified_direct_parameter_class
verified_parameter_aggregate_class
verified_calibration_settings_class
verified_id_parameter_class
```

## 11. 返回结构

```json
{
  "items": [
    {
      "path": "PlatformLibrary\\Parameter\\ExternModel\\_ExternModel_BrakeRA",
      "oid": "...",
      "kind": "class",
      "languageKind": "ESDL",
      "methodCount": 0,
      "classification": "parameter_class_candidate",
      "confidence": "high",
      "evidence": [
        "folder=Parameter",
        "kind=Class",
        "methodCount=0"
      ]
    }
  ],
  "coverage": {
    "status": "complete_for_scope",
    "foldersVisited": 1853,
    "componentsScanned": 8065,
    "classesScanned": 7069,
    "structuralCandidates": 983,
    "parameterClassesFound": 954
  },
  "timing": {
    "treeMs": 19771,
    "methodScanMs": 9541,
    "totalMs": 29325
  },
  "truncated": false,
  "source": "live"
}
```

如果达到 `maxFolders` 或 `maxComponents`：

```text
coverage.status = partial
truncated = true
```

部分结果不得表述为完整的 Parameter Class 集合。

## 12. Live 性能测试

### 12.1 全量基线

流程：

```text
get_tree
  -> 全部 7,069 个 Class
  -> 每个 Class 读取 Methods
```

结果：

| 阶段 | 时间 |
| --- | ---: |
| Tree | 19.654 秒 |
| 7,069 个 Class Method 扫描 | 223.081 秒 |
| 总计 | 242.736 秒 |

输出：

```text
Methods=0 Class：954
失败：0
```

### 12.2 第一版关键词漏斗

规则：

```text
Parameter/Calibration/Constant Folder
OR
Parameter/Calibration/Constant Class Name
```

结果：

| 项目 | 数量/时间 |
| --- | ---: |
| 结构候选 | 966 |
| Methods=0 结果 | 937 |
| Tree | 19.522 秒 |
| 候选 Method 扫描 | 8.934 秒 |
| 总计 | 28.466 秒 |

该规则漏掉 17 个 ID/Enumeration Settings Class。

### 12.3 扩展后的最终漏斗

增加规则：

```text
IDs Folder
Enumeration/Enumerations + Settings
```

结果：

| 项目 | 数量/时间 |
| --- | ---: |
| 全部 Class | 7,069 |
| 结构候选 | 983 |
| Methods=0 结果 | 954 |
| 期望结果 | 954 |
| 遗漏 | 0 |
| 额外结果 | 0 |
| 失败 | 0 |
| Tree | 19.771 秒 |
| 候选 Method 扫描 | 9.541 秒 |
| 总计 | 29.325 秒 |

相比全量基线：

```text
242.736 / 29.325 = 8.28
```

即约 8.3 倍加速。

该测试使用现有 `get_tree + AscetListMethods` 组合。正式 Action 在同一后端遍历中直接使用 Component 句柄，避免 JSON 往返和 Path 重新 Resolve，预计会进一步降低耗时；正式实现后必须重新进行 Live Benchmark，不应将预计值写成保证值。

## 13. 准确性说明

本次“0 遗漏、0 额外”是相对于当前项目规则：

```text
Class + Methods=0
```

严格语义层还验证了以下边界样本：

- 名称命中但不在 Parameter Folder 的 ESDL/BDE 聚合 Class。
- Parameter Folder 中名称不含关键词的 ESDL/BDE Class。
- 唯一 C Parameter Class。
- IDs Class。
- Enumeration Settings Class。

验证表明：

- 聚合 Class 的直接元素可能不是 Parameter，但 ChildElements 中存在大量 Parameter。
- C Parameter Class 可能 `IsCalibration=false`，但 `CanonicalKind=parameter`。
- Enumeration Settings 可能没有 `CanonicalKind=parameter`，但存在 `IsCalibration=true`。

因此严格验证必须同时支持：

```text
直接 Parameter
Calibration Element
递归 ChildElements
BDE 聚合引用
```

## 14. 测试要求

### 14.1 单元测试

至少覆盖：

1. `Parameter` Folder 下 `Methods=0` Class 被返回。
2. 名称为 `_Calibration_*` 但不在 Parameter Folder 的 Class 被返回。
3. 名称不含关键词但在 Parameter Folder 的 Class 被返回。
4. `IDs` Folder 下的 Class 被返回。
5. `Enumerations/*_Settings` Class 被返回。
6. 结构命中但 `Methods>0` 的 Class 被排除。
7. Module/StateMachine 即使 `Methods=0` 也被排除。
8. ESDL、BDE、C Class 均受支持。
9. `maxFolders` 和 `maxComponents` 截断正确。
10. `coverage.status` 与 `truncated` 一致。
11. OID 只对最终结果读取。
12. 同一 Class 不重复返回。
13. 严格模式识别 `IsParameter=true`。
14. 严格模式识别 `IsCalibration=true`。
15. 严格模式递归 ChildElements。
16. BDE 循环引用不会无限递归。

### 14.2 Live 验收

至少验证：

```text
全库结果数：954
结构候选数：983
遗漏：0
额外：0
失败：0
coverage.status=complete_for_scope
truncated=false
```

代表对象：

```text
PlatformLibrary\Parameter\ExternModel\_ExternModel_BrakeRA
CN_Libary\CNMS_IPB20\IPBCustNonHADHAP\Parameter\Calibration\IPBCustNonHADHAP_BB88010_Parameter_Calibration
CN_Libary\Package\LDM\ADC\Component\Main\_ADCMain_Calibration
PlatformLibrary\Package\LDMCoor_LongitudinalDynamicArbitrator\public\IDs\_LdmId_CDD
PlatformLibrary_NewBrakeSystems\Package\CRB_CooperativeRegenerativeBraking\Enumerations\CRB_Internal_Enumeration_Settings
PlatformLibrary\Package\ModelBasedProcessing\Parameter\Private\ModelValuesValidity\_SspMbp_ReferenceYawRate
```

性能验收应分别记录：

```text
Tree traversal
Structural filtering
Method scan
Identity/language reads
Optional semantic verification
Total
```

## 15. 实现位置建议

Extension：

```text
packages/ascet-extension/src/get.ts
packages/ascet-extension/src/routing/route-manifests.ts
packages/ascet-extension/src/tools/actions/descriptors.ts
packages/ascet-extension/src/tools/instructions/ascet-get.ts
```

CLI：

```text
ascetcli/src/AscetCli/Commands/ExecCommand.cs
ascetcli/src/AscetCli/Routing/OperationRegistry.cs
ascetcli/src/AscetCopilot/Services/Get/AscetGetService.cs
```

建议新增共享服务：

```text
ascetcli/src/AscetCopilot/Services/Get/AscetTreeTraversalService.cs
ascetcli/src/AscetCopilot/Services/Read/MethodDiscoveryService.cs
```

Contracts：

```text
AscetGetParameterClasses.json
cli-catalog.json
get family contract
```

操作命名：

```text
Logical Command: AscetGetParameterClasses
Operation:       get_parameter_classes
Tool Action:     parameter_classes
```

## 16. 非目标

本方案不包括：

- 持久化 P0。
- SQLite 索引。
- 后台 Tree warmup。
- 跨请求缓存。
- 全库 Implementation 预读取。
- 全库 Parameter Element 表。
- 将 `Methods=0` 声明为所有 ASCET 项目的通用 Parameter Class 定义。

允许在一次 Tool 请求内部使用：

- Queue。
- HashSet。
- OID/Path 去重表。
- Class 语义验证缓存。
- 循环引用保护。

请求结束后不得保留持久化索引状态。

## 17. 推荐实施顺序

1. 提取 P0 Tree 风格的共享 Traversal Service。
2. 修复 `get_tree` 无 Target 和重复 Folder 枚举问题。
3. 增加结构候选匹配器及测试。
4. 增加直接 Component 句柄的 Method 统计。
5. 接入 `parameter_classes` Action。
6. 增加 coverage、timing 和 stored delivery。
7. 运行非 Live 具体测试。
8. 运行 `npm run check`。
9. 串行执行 ASCET Live 全库验收。
10. 根据正式实现结果更新本文件中的性能数据。