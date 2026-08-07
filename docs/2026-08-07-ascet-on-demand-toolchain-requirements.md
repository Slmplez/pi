# ASCET 按需工具链需求目标基线

## 1. 目的

本文定义后续 ASCET `search`、`get`、`read`、`analyze`、`edit` 工具设计必须遵守的需求目标，防止方案重新偏移到 P0、SQLite、全库索引或重型预扫描。

核心目标：在当前实时 ASCET Database 中，Agent 从客户集成范围或功能包范围出发，逐步定位一次代码修改的真实落点，并收敛到可安全读取、分析和修改的精确 Component、Method 或 Diagram。

```text
定位范围
  -> 找到跨层接入点
  -> 展开 Component / Interface / Signal Flow
  -> 确认修改层
  -> 精确读取代码
  -> 精确修改
  -> 读回验证
```

## 2. 需要解决的问题

Agent 必须能够回答：

1. 修改请求属于客户集成范围、功能包范围、跨层接口范围还是外部依赖？
2. 客户范围是否引用目标功能包？
3. 信号如何从客户集成层进入功能包、经过 BDE 或私有 Class / StateMachine，并从功能包输出？
4. 修改应优先落在客户集成层、功能包层，还是必须进行跨层 review？
5. 下一步应该读取哪个精确 Component、Method 或 Diagram？

当前 Database 的真实 Scope 示例：

```text
integrationScope:
  CN_Libary\CNMS_IPB20\IPBCustGeneral

featureScope:
  PlatformLibrary\Package\SCM_SecondaryCollisionMitigation
```

当前实测到跨层绑定：

```text
IPBCustGeneral_ECU_CSW_BB88010
  -> CM_SCM
  -> PlatformLibrary\Package\SCM_SecondaryCollisionMitigation\Component\Config\CM_SCM
```

## 3. Tree First 导航原则

`tree` 是 Agent 的首要导航模型。

当输入是 Folder 或 Scope 时，Agent 先读取 tree：

```text
Folder
  -> Project / Module / Class
  -> Component refs
  -> Elements / BDE edges
  -> Read
  -> Edit
```

但是，不要求每个 Action 的内部实现先调用 tree。若用户或前序调用已提供精确 Component path 或 OID，后续 Action 可直接读取该 Component。

Tree、Component refs 和 BDE edges 表示不同结构：

```text
tree:
  Folder containment tree
  对象放在哪里？

component_refs:
  Component instance graph
  对象引用了谁？

bde_edges:
  Diagram signal graph
  信号从哪个 Pin 流到哪个 Pin？
```

## 4. 无索引原则

以下能力必须移除或禁止：

```text
P0 build
P0 schema
P0 refresh
P0 cache state
P0 background warm
search 触发 P0 warm
list_components 触发 P0 warm
全库 Folder / Component tree 预构建
全库 Element 表预构建
全库 Ref graph 预构建
SQLite 索引
```

允许的唯一状态：

```text
单次 Tool 请求内部的对象句柄、OID 映射和分页状态。
```

请求结束后不形成跨请求索引。Agent 会话可保留响应中的 OID、path、name，但 Tool 服务不维护 P0。

## 5. 实时性与范围约束

所有输出必须来自当前打开的 ASCET Database：

```json
{
  "source": "live",
  "database": {
    "name": "...",
    "path": "..."
  }
}
```

除精确 OID/path resolve 外，所有搜索和批量读取必须带 Scope 与预算：

```text
Folder Scope
Component Scope
integrationScope
featureScope

maxFolders
maxComponents
maxItems
folderDepth
```

结果必须说明覆盖范围：

```json
{
  "coverage": {
    "status": "complete_for_scope",
    "foldersVisited": 4,
    "componentsScanned": 12
  },
  "truncated": false
}
```

若预算耗尽：

```json
{
  "coverage": {
    "status": "partial"
  },
  "truncated": true
}
```

部分扫描结果不得表述为完整结论。

## 6. 对象身份原则

```text
Path:
  用户输入、首次定位、业务可读、日志和错误信息

OID:
  后续 Tool 调用、精确对象身份、Agent 链路传递
```

所有返回对象应包含：

```json
{
  "oid": "...",
  "name": "...",
  "path": "..."
}
```

Element 的定位使用：

```text
componentOid + elementName
```

不为 Element 构造虚假的全局 OID。

## 7. 工具职责边界

| 工具 | 职责 | 禁止承担的职责 |
| --- | --- | --- |
| `ascet_search` | 在明确 Scope 中发现候选 Folder、Component 或已知名称 Element | 代码读取、实现读取、全库索引、无范围全库搜索 |
| `ascet_get` | 实时展开 tree、接口、实例引用、BDE 信号边和跨层接入面 | 代码读取、写入、无限递归、全库反向引用扫描 |
| `ascet_read` | 对已确认 Component、Method、Diagram 或 Element 深读 | Folder/Package 全量代码读取、对象发现 |
| `ascet_analyze` | 对已读取的精确对象进行代码和数据流语义分析 | 导航、全库搜索、对象发现 |
| `ascet_edit` | 对已确认的精确对象写入并验证 | 自动选择修改层、自动修改关联对象 |
| `ascet_verify` | 写后读取与验证 | 索引重建、全库扫描 |

## 8. Search 需求

`ascet_search` 的目标是在指定 Scope 中发现候选对象。它只返回候选 identity 和覆盖范围，不返回深层语义。

支持模式：

```text
resolve
  OID 或完整 path 精确定位，不扫描

node
  在指定 Folder Scope 中找 Folder / Component 名称

element
  在指定 Component 或受限 Folder Scope 中找已知 Element 名称

package
  在指定 PlatformLibrary\Package Scope 中找功能包 Folder
```

Search 禁止读取：

```text
Implementation
Code
Method body
Block Diagram
全量 Ref graph
```

没有索引时，不支持无边界的全库 Element 或代码全文搜索。若用户要求 Element 查询，必须提供 `scopePath`、`maxComponents` 和 `maxResults`。

Search 的候选输出必须可直接交给 `ascet_get`：

```json
{
  "items": [
    {
      "oid": "cm-scm-oid",
      "kind": "module",
      "language": "BDE",
      "name": "CM_SCM",
      "path": "PlatformLibrary\\Package\\SCM_SecondaryCollisionMitigation\\Component\\Config\\CM_SCM",
      "matchReason": "exact_name"
    }
  ],
  "next": {
    "tool": "ascet_get",
    "action": "component_refs",
    "target": {
      "oid": "cm-scm-oid"
    }
  }
}
```

## 9. Get 需求

`ascet_get` 是实时导航与上下文装配层。它保持为一个 Agent Tool，并使用严格 action：

```text
tree
elements
formulas
component_refs
bde_edges
import_binding
dbitem_refs
```

### 9.1 tree

用途：按 Folder 深度返回 Folder / Component identity。

底层 API：

```csharp
AscetDataBase.GetAllAscetFolders()
Folder.GetAllDataBaseItems()
```

不读取 Element、Ref、代码或 Diagram。

### 9.2 elements

用途：读取一个已确定 Component 的接口 Element，或在受限 Folder 范围内读取 Element。

接口投影优先返回：

```text
imported
exported
Complex
Send Message
Receive Message
Send Receive Message
```

底层 API：

```csharp
CodeComponent.GetAllModelElements()
CodeComponent.GetModelElement(name)
AscetModelElement.IsImported()
AscetModelElement.IsExported()
AscetModelElement.GetScope()
```

### 9.3 formulas

用途：读取一个已确定 Project 的完整 Formula catalog，供后续通过 `grep` 搜索名称、类型、单位、注释、正文和参数。

底层实现复用：

```text
ProjectFormulaReadService.ReadCatalog(projectPath)
```

返回字段：

```text
path = ProjectPath::FormulaName
oid = owner Project OID
name
type
unit
comment
contents
parameters
```

不设置 `maxItems`。未指定 `formulaName` 时返回 Project 的全部 Formula；大结果完整写入 NDJSON。
### 9.4 component_refs

用途：读取 Component instance graph：

```text
source Component
  -> instance Element
  -> target Component
```

底层 API：

```csharp
CodeComponent.GetAllReferencedModelElements()
AscetModelElement.GetName()
AscetModelElement.GetScope()
AscetModelElement.GetRepresentedClass()
CodeComponent.GetOIDForComplexModelElementNamed()
CodeComponent.GetAllUndefinedComplexModelElementNames()
```

必须支持目标范围过滤。用户可表达：

```json
{
  "targetScope": {
    "path": "PlatformLibrary\\Package\\SCM_SecondaryCollisionMitigation"
  }
}
```

其语义是：仅返回目标位于该功能包 Folder 下的引用。

### 9.5 bde_edges

用途：读取一个精确 BDE Component / Diagram 的 Pin-to-Pin 数据边。

底层 API：

```csharp
BlockDiagramHierarchy.GetAllDiagramConnections()
BlockDiagramConnection.GetOutputPin()
BlockDiagramConnection.GetInputPin()
```

Component refs 说明“谁引用谁”；BDE edges 说明“信号如何流”。

### 9.6 import_binding

用途：已知 provider、consumer 和 import Element 时，精确验证 export/import 匹配。

底层 API：

```csharp
CodeComponent.ExistsExportForImport()
CodeComponent.GetExportForImport()
```

禁止用它做全库“谁提供 Signal X”查询。

### 9.7 dbitem_refs

用途：补充读取 DataBaseItem 到 DataBaseItem 的依赖。

底层 API：

```csharp
DataBaseItem.GetAllReferecedDataBaseItems()
```

它不用于推断代码读写、Element 数据流或信号方向。


## 10. Read 与 Edit 启动条件

仅当 `get` 已经收敛到精确目标后，才允许 `read`：

```text
已知 Component OID
已知对象属于 integration、feature 或 external
已知读取 Method / Diagram / Implementation 的原因
```

仅当以下信息齐全后，才允许 `edit`：

```text
目标 Component / Method OID
目标 path
读前版本或指纹
修改层判断：integration / feature / cross-layer
用户确认或明确任务指令
```

写后必须读回验证：

```text
ascet_get(elements / component_refs)
ascet_read(method_code / implementation)
```

## 11. 修改落点原则

```text
客户特定映射、客户 Variant、项目装配、调度、客户接口适配：
  integrationScope

通用算法、功能状态机、功能包 Private Class、功能包参数语义：
  featureScope

公共接口、Message、Parameter、BDE 跨层连接：
  cross_layer_review_required
```

Tool 只提供实时证据和候选；在没有业务上下文时，不自动替用户决定修改层。

## 12. 成功标准

### 场景 A：客户 Folder 到 SCM 功能包

输入：

```text
CN_Libary\CNMS_IPB20\IPBCustGeneral
```

系统应找到：

```text
IPBCustGeneral_ECU_CSW_BB88010
  -> CM_SCM
  -> SCM_SecondaryCollisionMitigation\Component\Config\CM_SCM
```

且不返回全部无关功能包依赖。

### 场景 B：只分析一个功能包

输入：

```text
PlatformLibrary\Package\SCM_SecondaryCollisionMitigation
```

系统只展开 SCM 自己的 Component、Private、Public、Parameter；不扫描整个 `PlatformLibrary\Package`。

### 场景 C：分析一个 BDE 信号

系统能够从一个确定 BDE Module 返回：

```text
输入 Element / Pin
  -> 内部 Block / Component Instance / Pin
  -> 输出 Element / Pin
```

而不是只返回 Module 引用了哪些 Class。

### 场景 D：修改前收敛

在启动 `ascet_read` 或 `ascet_edit` 前，Agent 必须已知：

```text
当前对象是谁
对象属于 integration、feature 还是 external
对象与客户/功能包边界的关系
读取或修改对象的原因
```

## 13. 一句话目标

```text
让 Agent 不依赖 P0 或全库索引，从客户集成范围与功能包范围的实时关系出发，逐层收敛到一次修改真正需要读取和编辑的精确 ASCET 对象。
```
