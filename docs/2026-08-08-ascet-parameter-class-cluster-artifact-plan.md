# ASCET Parameter Class 候选聚类与落盘方案

> 状态：该方案中的“路径/名称聚类作为主发现路径”已被 Project 驱动方案替代。当前方案见 `docs/2026-08-08-ascet-project-driven-parameter-class-discovery-plan.md`。路径规则仅保留为 orphan 补漏。

## 1. 第一阶段目标

第一版只实现基于 `ascet_get action="tree"` 落盘数据的 Parameter Class 结构候选分类，不实现通用 Database 聚类，也不在该阶段逐个读取 Methods。

```text
全量 Tree Observation
  -> 本地 Parameter Class 候选分类
  -> 候选 NDJSON 落盘
  -> Pi find/grep/read 搜索
  -> 必要时对选中候选执行 Methods=0 Live 精筛
```

候选结果必须明确标记：

```text
methodStatus = unchecked
verified = false
```

不能把 Tree 结构候选直接称为最终 Parameter Class。

## 2. 推荐调用方式

不新增后台常驻索引，也不让每个普通 Tree 请求自动产生候选文件。为 `tree` 增加显式本地派生选项：

```json
{
  "action": "tree",
  "traversal": { "depth": 64 },
  "delivery": "stored",
  "derive": ["parameter_class_candidates"]
}
```

执行顺序：

1. 串行调用 ASCET `get_tree`。
2. Tree Observation 成功落盘。
3. 从落盘的 Tree NDJSON 流式读取。
4. 执行本地候选分类。
5. 原子写入候选 NDJSON、Summary 和 Meta。
6. 在 `ascet_get` 返回值中同时返回源 Tree 和派生 Observation。

聚类阶段不再访问 ToolAPI，因此不需要占用 ASCET scheduler lane。

建议返回结构：

```json
{
  "delivery": "stored",
  "observation": {
    "resultId": "obs-tree-...",
    "domain": "tree",
    "format": "ndjson",
    "dataPath": "...tree.ndjson",
    "metaPath": "...meta.json",
    "itemCount": 10670
  },
  "derivedObservations": {
    "parameterClassCandidates": {
      "domain": "parameter_class_candidates",
      "format": "ndjson",
      "dataPath": "...parameter-class-candidates.ndjson",
      "metaPath": "...parameter-class.meta.json",
      "summaryPath": "...parameter-class-summary.json",
      "itemCount": 983
    }
  }
}
```

## 3. 候选分类规则

输入行：

```json
{"path":"...","oid":"...","kind":"class"}
```

先要求：

```text
kind = class
```

然后满足以下任一结构规则即可进入候选文件：

### 3.1 Folder 规则

完整路径段匹配：

```text
Parameter
Parameters
Calibration
Calibrations
Constant
Constants
```

必须按完整 segment 匹配，不能用任意子字符串匹配。

### 3.2 Class Name 规则

Class 名称分词后匹配：

```text
Parameter / Param
Calibration / Calib
Constant / Const
```

支持 `_`、`-`、空格、大小写边界和数字边界分词。

### 3.3 IDs 特殊规则

Folder segment 为：

```text
ID
IDs
```

### 3.4 Enumeration Settings 特殊规则

同时满足：

```text
路径包含 Enumeration/Enumerations Folder
Class 名称包含 Settings token
```

### 3.5 多标签

同一个 Class 可以命中多个 cluster，例如：

```text
IPBCustNonHADHAP_BB88010_Parameter_Calibration
```

应产生：

```json
[
  "folder.parameter",
  "folder.calibration",
  "name.parameter",
  "name.calibration"
]
```

不使用互斥分类，不使用 K-Means，也不计算无法解释的相似度分数。

## 4. grep 友好的候选 NDJSON

文件名：

```text
<sourceResultId>.parameter-class-candidates.ndjson
```

每行一个候选，字段顺序保持稳定：

```json
{"path":"PlatformLibrary\\Parameter\\ExternModel\\_ExternModel_BrakeRA","oid":"...","kind":"class","name":"_ExternModel_BrakeRA","root":"PlatformLibrary","clusters":["folder.parameter","folder.external-model"],"signals":["folder-segment:Parameter","folder-segment:ExternModel"],"methodStatus":"unchecked","verified":false,"searchText":"platformlibrary parameter externmodel external model brakera brake ra folder.parameter folder.external-model"}
```

字段说明：

| 字段 | 用途 |
| --- | --- |
| `path` | 精确定位 ASCET 对象 |
| `oid` | 后续 Live 精筛使用 |
| `kind` | 固定为 `class` |
| `name` | Class 名称 |
| `root` | Library/顶层范围过滤 |
| `clusters` | 结构规则分组 |
| `signals` | 可解释的命中证据 |
| `methodStatus` | 防止误认为已检查 Methods |
| `verified` | 是否已经完成最终验证 |
| `searchText` | 小写、展开缩写后的 grep 搜索文本 |

候选按标准化 `path` 排序，确保输出稳定并便于 diff。

## 5. 搜索方式

### 5.1 按 Class 名称搜索

```powershell
rg -i 'brakera' <candidate-data-path>
```

### 5.2 按 Feature 搜索

```powershell
rg -i 'ipbcustnonhadhap' <candidate-data-path>
```

### 5.3 按聚类规则搜索

```powershell
rg -F 'folder.calibration' <candidate-data-path>
rg -F 'special.ids' <candidate-data-path>
rg -F 'special.enumeration-settings' <candidate-data-path>
```

### 5.4 组合搜索

```powershell
rg -i 'calibration.*bb88010|bb88010.*calibration' <candidate-data-path>
```

### 5.5 使用 Pi 工具

推荐顺序：

```text
find：定位最新 parameter-class-candidates.ndjson
 grep：根据名称、Feature、cluster、signal 搜索
 read：读取命中行附近内容或 Summary
 ascet_read/ascet_get：只对选中的 path/oid 做 Live 精筛
```

## 6. Summary 文件

文件名：

```text
<sourceResultId>.parameter-class-summary.json
```

示例：

```json
{
  "sourceResultId": "obs-tree-...",
  "rulesVersion": "parameter-class-candidate-v1",
  "scope": "full_database",
  "coverage": {
    "status": "complete_for_scope",
    "foldersVisited": 1853,
    "componentsScanned": 8065
  },
  "counts": {
    "treeItems": 10670,
    "classItems": 7069,
    "candidates": 983,
    "duplicates": 0,
    "parseErrors": 0
  },
  "clusters": {
    "folder.parameter": 0,
    "folder.calibration": 0,
    "folder.constant": 0,
    "name.parameter": 0,
    "name.calibration": 0,
    "name.constant": 0,
    "special.ids": 0,
    "special.enumeration-settings": 0
  },
  "verification": {
    "methodsChecked": false,
    "verifiedParameterClasses": null
  }
}
```

Cluster 数量在正式全库运行时填写真实值，不能预置推断值。

## 7. Meta 和源依赖

文件名：

```text
<sourceResultId>.parameter-class.meta.json
```

至少记录：

```text
sourceResultId
sourceDataPath
sourceMetaPath
sourceHash
sourceCapturedAt
sourceTarget
sourceCoverage
rulesVersion
createdAt
candidateCount
dataPath
summaryPath
database identity（可获得时）
```

使用候选文件前必须验证：

1. 源 Tree 文件仍然存在。
2. `sourceHash` 与当前 Tree 文件一致。
3. `rulesVersion` 与当前分类器一致。
4. Database identity 没有变化。
5. `coverage.status` 是否允许回答“全库”问题。

如果 Tree 是 bounded 或 partial，候选文件仍可搜索，但必须标记：

```text
scope = bounded 或 partial
```

不能声称覆盖整个 Database。

## 8. 失效策略

派生 Observation 必须跟随源 Tree 失效。

建议扩展 Observation metadata：

```ts
sourceResultId?: string;
sourceDomain?: string;
```

失效流程：

```text
ASCET edit
  -> invalidates matching Tree Observation
  -> 根据 sourceResultId 删除派生 candidate/summary/meta
```

全库 Tree 的 target 通常不包含 path。当前按 target path 匹配的 invalidation 不能可靠删除全库快照，因此需要增加规则：

```text
任意 ASCET Database edit
  -> invalidate full_database tree observations
  -> invalidate their derived observations
```

不能继续使用编辑前生成的全库候选文件。

## 9. 实现模块

建议新增：

```text
packages/ascet-extension/src/parameter-class-cluster.ts
packages/ascet-extension/src/parameter-class-cluster.test.ts
```

职责：

```ts
interface ParameterClassCandidate {
  path: string;
  oid: string;
  kind: "class";
  name: string;
  root: string;
  clusters: string[];
  signals: string[];
  methodStatus: "unchecked";
  verified: false;
  searchText: string;
}
```

需要修改：

```text
packages/ascet-extension/src/get.ts
  - tree 参数增加 derive
  - Tree 落盘后调用本地分类器
  - 返回 derivedObservations

packages/ascet-extension/src/observation-store.ts
  - 支持派生 Observation sourceResultId
  - 支持源 Observation 级联失效
  - 原子写入 candidate/summary/meta

packages/ascet-extension/src/tools/instructions/ascet-get.ts
packages/ascet-extension/src/tools/actions/descriptors.ts
  - 说明 derive 和 grep 使用方式
```

第一版不需要修改 C# ASCET CLI，因为分类完全基于已经返回的 Tree NDJSON。

## 10. 单元测试

至少覆盖：

1. `Parameter` Folder 下的 Class 命中。
2. `Calibration` Folder 下的 Class 命中。
3. `Constant` Folder 下的 Class 命中。
4. 不在特殊 Folder，但名称包含 `_Calibration_` 的 Class 命中。
5. `IDs` Folder 下 `_LdmId_*` 命中。
6. `Enumerations/*_Settings` 命中。
7. `kind=module/statemachine/project/folder` 不进入候选。
8. `SomeParameterLogic` 不因任意子字符串误命中，必须符合 token 规则。
9. 同一候选可拥有多个 clusters。
10. OID 去重；OID 为空时按标准化 path 去重。
11. `::` Project member 路径正确解析。
12. malformed NDJSON 行进入 `parseErrors`，不会导致静默丢失。
13. partial coverage 正确传播。
14. 候选文件每行均为合法 JSON。
15. `searchText` 可以用 `rg -i` 搜到名称缩写和展开词。
16. 输出路径排序稳定。
17. 源 Tree 失效时派生文件级联删除。

## 11. Live 验收

ASCET ToolAPI 可连接后执行一次全库调用：

```json
{
  "action": "tree",
  "traversal": { "depth": 64 },
  "delivery": "stored",
  "derive": ["parameter_class_candidates"]
}
```

验收指标：

```text
coverage.status = complete_for_scope
truncated = false
Tree items = 10,670（若 Database 未变化）
Class items = 7,069（若 Database 未变化）
Structural candidates = 983（若规则和 Database 未变化）
parseErrors = 0
```

必须用 grep 验证代表对象：

```text
PlatformLibrary\Parameter\ExternModel\_ExternModel_BrakeRA
CN_Libary\CNMS_IPB20\IPBCustNonHADHAP\Parameter\Calibration\IPBCustNonHADHAP_BB88010_Parameter_Calibration
PlatformLibrary\Package\LDMCoor_LongitudinalDynamicArbitrator\public\IDs\_LdmId_CDD
PlatformLibrary_NewBrakeSystems\Package\CRB_CooperativeRegenerativeBraking\Enumerations\CRB_Internal_Enumeration_Settings
```

记录本地处理耗时：

```text
readNdjsonMs
classifyMs
sortMs
writeMs
totalMs
```

## 12. 后续阶段

第一版完成后，再实现最终验证：

```text
candidate NDJSON
  -> 用户通过 grep 选择范围，或读取全部候选
  -> 单次 Live ToolAPI 操作内检查 Methods
  -> 保留 Methods=0
  -> 输出 verified parameter-classes.ndjson
```

最终文件必须与候选文件分开：

```text
*.parameter-class-candidates.ndjson   Tree-only，未验证
*.parameter-classes.ndjson            Methods=0，已验证
```

这样可以避免搜索结果把“结构候选”和“最终 Parameter Class”混为一谈。
