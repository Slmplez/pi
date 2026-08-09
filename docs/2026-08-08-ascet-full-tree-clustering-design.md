# ASCET 全量 Database Tree 聚类设计

## 1. 输入定义

本方案的唯一基础输入是以下调用落盘后的全量 Database Tree：

```text
ascet_get action="tree" delivery="stored"
```

全库采集要求：

```json
{
  "action": "tree",
  "traversal": { "depth": 64 },
  "delivery": "stored"
}
```

不设置 `target`、`maxFolders`、`maxComponents`。只有同时满足以下条件，数据才可标记为全库快照：

```text
metadata.domain = tree
metadata.coverage.status = complete_for_scope
metadata.target 不包含 path/oid/targetPathPrefix
未设置 maxFolders/maxComponents
```

Tree NDJSON 每行只有结构字段：

```json
{"path":"PlatformLibrary\\Parameter\\ExternModel\\_ExternModel_BrakeRA","oid":"...","kind":"class"}
```

因此第一阶段聚类只能使用 `path`、`kind`、层级关系和名称模式。`Methods`、`Language`、Element 类型、References 不属于 Tree 数据，必须在候选集形成后通过 Live 精筛获得。

## 2. 已知全库规模

当前 Database 的既有 Live 全库统计：

| 指标 | 数量 |
| --- | ---: |
| Tree 节点 | 10,670 |
| Folder | 1,853 |
| Code Component | 8,065 |
| Class | 7,069 |
| Methods=0 Class | 954 |

10,670 行 NDJSON 适合单遍流式处理，不需要 K-Means、向量数据库、SQLite 或常驻 P0 索引。

## 3. 聚类模型

采用“层次结构分区 + 多标签语义分类”，而不是单一互斥聚类。

### 3.1 层次结构分区

每个节点只能属于一个结构分区，用于导航和限定 Live 查询范围：

```text
L1 root/library
L2 collection/domain anchor
L3 feature/package/project
L4 responsibility folder
L5 object kind/name family
```

示例：

```text
PlatformLibrary
  -> Package
  -> SCM_SecondaryCollisionMitigation
  -> Private/Controller
  -> class

CN_Libary
  -> CNMS_IPB20/IPBCustNonHADHAP
  -> Parameter/Calibration
  -> class
```

结构层级不能依赖固定下标，因为不同 Library 的目录深度不同。应通过路径锚点和父子关系识别。

### 3.2 多标签语义分类

同一个节点可以同时具有多个标签：

```json
{
  "ownership": ["PlatformLibrary"],
  "feature": ["ExternModel"],
  "visibility": [],
  "roles": ["parameter", "external-model"],
  "kind": "class",
  "nameFamilies": ["brake"]
}
```

例如 `_iTAS_Parameter_Calibration` 应同时拥有 `parameter` 和 `calibration` 标签，不能强制放入单一类别。

## 4. 路径解析

### 4.1 规范化

对每一行执行：

1. 保留原始 `path`。
2. 将 Database 文件夹分隔符 `\` 解析为 folder edge。
3. 将 Project 成员分隔符 `::` 解析为 project-member edge。
4. 去除空段，但不修改原始大小写。
5. 额外生成小写匹配值和名称 token。
6. 以 `oid` 为主键去重；OID 为空时使用标准化 path。

`::` 不能直接当作 `\`，否则会丢失 Project 与其 Module/Class 之间的关系类型。

### 4.2 名称分词

名称同时按以下边界切分：

```text
_ - 空格 大小写边界 数字边界
```

例如：

```text
IPBCustNonHADHAP_BB88010_Parameter_Calibration
```

生成：

```text
ipb, cust, non, hadhap, bb, 88010, parameter, calibration
```

保留原始 token，并生成缩写同义词：

```text
param -> parameter
calib -> calibration
const -> constant
enum -> enumeration
config/cfg -> configuration
ext/extern -> external
```

## 5. 单遍聚类算法

### 5.1 第一遍：构建轻量 Trie 和统计量

流式读取 NDJSON，每个节点只保存：

```text
segment
parentId
kind counts
child count
descendant count
class count
depth
role labels
```

同时统计：

- root 分布；
- 每层 segment 频率；
- parent -> child 组合频率；
- kind 分布；
- 名称 token 频率；
- folder 下各 kind 的数量；
- 每个 folder 的后代 Class 数量。

复杂度：

```text
时间 O(N * D)
空间 O(N)
```

其中 `N` 为节点数，`D` 为平均路径深度。10,670 节点规模可直接在内存完成。

### 5.2 第二遍：识别结构锚点

优先使用确定性路径锚点：

```text
Package / Packages
Parameter / Parameters
Calibration / Calibrations
Constant / Constants
Enumeration / Enumerations
Component / Components
Project / Projects
Public / Private
Config / Configuration
ID / IDs
ExternModel / ExternalModel
```

特征归属规则：

1. 路径包含 `Package` 时，其下一段作为 feature/package。
2. 路径包含 `Project` 或节点 `kind=project` 时，Project 节点作为 feature。
3. 无标准锚点时，选择 root 下第一个具有稳定后代规模的业务 folder 作为 domain。
4. `Public/Private` 只作为 visibility，不作为 feature。
5. `Parameter/Calibration/...` 只作为 role，不作为 ownership。

### 5.3 第三遍：自适应切分结构簇

从 root 向下递归：

```text
若节点是已识别 feature/package/project：建立结构簇
若簇过大：继续按责任 folder 切分
若簇过小：保留在父 feature 的 misc 子簇
```

建议默认阈值：

```text
目标 Class 数：20..300
强制继续切分：Class > 500
小簇阈值：Class < 5
```

小簇只能在“同父节点 + 相同 role + 相同 kind 主分布”时合并，禁止跨 Library 或跨 Feature 合并。

### 5.4 第四遍：语义多标签

标签由证据规则产生，并保留 evidence：

```json
{
  "roles": ["parameter", "calibration"],
  "evidence": [
    "folder-segment:Parameter",
    "folder-segment:Calibration",
    "name-token:parameter",
    "name-token:calibration"
  ]
}
```

Parameter Class 初筛标签继续使用已验证规则：

```text
kind = class
AND (
  folder segment in Parameter/Parameters/Calibration/Calibrations/Constant/Constants
  OR class name token in Parameter/Param/Calibration/Calib/Constant/Const
  OR folder segment in ID/IDs
  OR Enumerations folder + Settings class name
)
```

聚类阶段只产生 `parameter-candidate` 标签；最终 Parameter Class 仍需 Live 验证 `Methods=0`。

## 6. 输出产物

建议派生文件与源 Observation 绑定：

```text
<resultId>.tree-clusters.ndjson
<resultId>.tree-cluster-summary.json
<resultId>.tree-cluster.meta.json
```

节点记录示例：

```json
{
  "path": "PlatformLibrary\\Parameter\\ExternModel\\_ExternModel_BrakeRA",
  "oid": "...",
  "kind": "class",
  "depth": 4,
  "structuralClusterId": "PlatformLibrary/Parameter/ExternModel",
  "root": "PlatformLibrary",
  "feature": "ExternModel",
  "roles": ["parameter", "external-model"],
  "candidateLabels": ["parameter-class"],
  "evidence": ["folder-segment:Parameter", "folder-segment:ExternModel"]
}
```

Summary 示例：

```json
{
  "sourceResultId": "obs-tree-...",
  "sourceItemCount": 10670,
  "rulesVersion": "tree-cluster-v1",
  "coverage": { "status": "complete_for_scope" },
  "counts": {
    "clusters": 0,
    "classes": 7069,
    "parameterCandidates": 983
  },
  "clusters": []
}
```

Meta 必须包含：

```text
sourceResultId
sourceDataPath/sourceHash
rulesVersion
createdAt
coverage
sourceItemCount
clusteredItemCount
parseErrorCount
duplicateCount
```

## 7. 与落盘数据的结合方式

推荐按需派生，不做无控制的后台任务：

```text
ascet_get tree stored
  -> 返回 sourceResultId/dataPath
  -> 本地 cluster_tree(sourceResultId)
  -> 写入派生 artifacts
  -> parameter_classes 从候选簇读取 path/oid
  -> 仅对候选 Class 做 Methods 精筛
```

原因：

- 聚类是本地 CPU/文件处理，不需要占用 ASCET ToolAPI；
- 全量 Tree 获取很慢，聚类本身很快；
- 明确的调用边界便于报错、取消和版本管理；
- 后台任务可能在进程退出后留下不完整产物。

如果要求自动生成，应在 Tree Observation 成功写盘后同步调用本地聚类器，而不是启动 detached background process。对 10k 级节点，这部分预计远小于 Live Tree 遍历时间，但正式实现后必须记录 `parseMs/buildTrieMs/classifyMs/writeMs/totalMs`。

## 8. Parameter Class 查询流程

```text
1. 读取 tree-cluster-summary
2. 选择 candidateLabels 包含 parameter-class 的结构簇
3. 从 clusters.ndjson 提取 kind=class 的 path/oid
4. 批量或单次 ToolAPI 会话内读取 Methods 数量
5. 保留 Methods=0
6. 可选读取 Language、Elements、ChildElements 做严格语义验证
```

既有实测：

```text
全部 Class Method 扫描：242.736 s
Tree 候选 + Method 扫描：29.325 s
加速约：8.3x
```

因此聚类的主要价值不是替代 Live 语义读取，而是把 7,069 个 Class 缩减到约 983 个结构候选。

## 9. 正确性约束

1. `coverage.status != complete_for_scope` 时，Summary 必须标记 partial。
2. partial Tree 可以用于搜索，但不能宣称“全部 Parameter Class”。
3. 聚类不能把 `Methods=0` 推断为 Tree 字段。
4. 不能仅按名称包含 `Param` 判断，必须记录路径和名称证据。
5. 所有标签规则必须版本化。
6. 源 Observation 被 edit invalidation 删除时，其派生产物应同时失效。
7. 数据库切换后不能复用旧 Observation。
8. OID 重复且 path 不同应记录冲突，不应静默覆盖。

## 10. 当前实现风险

当前 `get_tree` 的 Tree 构建中，`ContainsTreePath` 对累计结果执行线性扫描，并在 folder 枚举中用于重复检查。全库节点增长时可能形成 O(N²) 行为。

另外，folder 可能先从 direct items 枚举一次，再从 child folders 枚举一次，随后通过 path 扫描去重。全库采集性能优化应优先改为：

```text
HashSet<string> emittedPaths
HashSet<string> visitedFolderOids/paths
单次 folder child 枚举
```

这属于 `get_tree` 采集优化，与聚类器分离。聚类器自身必须保持 O(N * D)，不能再次引入逐节点全表扫描。

## 11. 实施顺序

1. 定义 `TreeNodeRecord`、cluster record 和 metadata schema。
2. 实现 NDJSON 流式解析与 path tokenizer。
3. 实现 Trie、统计和确定性标签规则。
4. 实现自适应结构切分和 Summary。
5. 增加 source hash/rulesVersion/coverage 校验。
6. 用已落盘小范围 Tree 做单元测试。
7. ASCET 可连接后重新生成完整 `delivery=stored` Tree。
8. 对完整 Tree 统计真实 root、depth、kind、folder/token 分布。
9. 固化阈值并验证 Parameter 候选仍为 983、最终 Methods=0 为 954。
10. 再决定暴露为本地分析 action，或作为 `parameter_classes` 内部步骤。
