# ASCET 按需 Get Tools 设计

## 1. 目标

ASCET Database 很大，不构建 P0、search index、SQLite 索引、全量 Element 表或全量引用图。

工具直接读取当前 Database，并以 JSON 返回可继续定位的数据：

```text
ascet_get_tree
ascet_get_elements
ascet_get_refs
```

调用方保存响应中的 `oid`、`path`、`name`，再向下展开 Folder、Component、Element 或 refs。工具不预构建，也不将历史缓存作为实时数据库事实。

## 2. 读取范围与非目标

读取范围：

```text
Folder / Component tree
Folder 范围内的 Component Elements
Folder 范围内的 Component refs
单个 Component 的 Elements / refs
单个 Element 的 Component-instance target
```

非目标：

- 不后台扫描整个 Database。
- 不读取 Element 实现、Method、代码、图、表格、公式或注释。
- 不建立全局 Element / ref 索引。
- 不提供无范围限制的 `used_by` 或 incoming refs。
- 不把未扫描的 Folder / Component 描述为“没有数据”。

## 3. 通用约束

### 3.1 目标定位

OID 是优先身份：

```csharp
DataBaseItem item = database.GetItemForOID(oid);
```

路径和名称只作回退：

```csharp
DataBaseItem item = database.GetItemInFolder(name, folderPath);
```

所有响应都返回 OID。Agent 后续调用应优先传 OID。

### 3.2 Folder 递归边界

Folder 范围的 Elements / refs 不是全库查询，而是受控的 Folder 子树遍历：

```text
folderDepth = 0：仅目标 Folder 内的直接 Component
folderDepth = 1：目标 Folder 加直接子 Folder 内的 Component
folderDepth = N：继续展开 N 层子 Folder
```

Folder 展开必须设置：

```text
maxFolders
maxComponents
```

refs 等关系读取可以设置 `maxItems`。`elements` 不设置 `maxItems`：选中 Component 后返回该 Component 的全部 Element；Folder 场景仅通过 `folderDepth`、`maxFolders` 和 `maxComponents` 限定扫描范围，不截断单个 Component 的 Element 列表。

超过预算时返回：

```json
{
  "truncated": true,
  "coverage": "partial",
  "nextExpandTargets": []
}
```

### 3.3 串行执行与路径

- ToolAPI 实例方法不保证线程安全，所有 ToolAPI 调用严格串行。
- Folder tree 的路径由已知 `parentPath + name` 构造。
- 不对每个节点调用 `GetNameWithPath()`。
- 所有响应固定带 `source: "live"`。

## 4. ToolAPI 快速读取映射

这组工具只使用直接 `GetAll...` / `Get...` API，不经由现有的完整实现读取、代码解析或索引路径。

| 目标 | 首选 ToolAPI | 用途 | 读取范围 |
| --- | --- | --- | --- |
| Database 根 Folder | `AscetDataBase.GetAllAscetFolders()` | 取得当前 ASCET Database 顶层 Folder | 仅顶层 Folder |
| 一个 Folder 的直接子项 | `Folder.GetAllDataBaseItems()` | 取得直接子 Folder / Component | 仅一个 Folder |
| 一个 Component 的全部 Element | `CodeComponent.GetAllModelElements()` | 批量 Element catalog | 仅一个 Component |
| 一个确定 Element | `CodeComponent.GetModelElement(name)` | 精确 Element lookup | 仅一个 Element |
| 一个 Component 的被包含组件实例 | `CodeComponent.GetAllReferencedModelElements()` | 返回当前 Component 中引用/包含的 Component Model Element | 仅一个 Component |
| 一个 Item 的数据库对象依赖 | `DataBaseItem.GetAllReferecedDataBaseItems()` | 返回当前 Item 引用的 DataBaseItem | 仅一个 Item |
| Complex / Enum Element 的目标 Component | `AscetModelElement.GetRepresentedClass()` | 取得该实例所表示的 Component | 仅一个 Element |

关键语义：

- `GetAllModelElements()` 是 Component 内的 Element 批量目录。
- `GetAllReferencedModelElements()` 返回当前 CodeComponent 中被引用/包含的**组件实例 Element**；它不是代码级“全部 Element 读写关系”。
- `GetAllReferecedDataBaseItems()` 返回 Item 级依赖；它不提供依赖对应到哪个源 Element 的归因。
- 对 Primitive Element 的代码读写引用，当前已确认的 ToolAPI 没有直接快速 `GetAll` API；不能通过上述 API 伪造为完整 Element refs。该能力若需要，必须单独做代码/实现分析工具。

## 5. `ascet_get_tree`

### 5.1 职责

按 Folder 深度返回当前 Folder / Component tree。仅返回结构和身份，不读取 Elements、Methods、实现、代码或 refs。

### 5.2 输入

```ts
type AscetGetTreeInput = {
  target?: {
    oid?: string;
    folderPath?: string;
  };
  depth?: number;
  maxFolders?: number;
  maxComponents?: number;
};
```

约定：

```text
target 缺失：调用 GetAllAscetFolders()，只返回顶层 Folder。
target 存在：读取指定 Folder。
depth = 0：仅目标 Folder 本身。
depth = 1：目标 Folder 的直接子项。
depth > 1：递归展开子 Folder。
```

### 5.3 读取算法

```text
根目录：AscetDataBase.GetAllAscetFolders()
指定 Folder：Folder.GetAllDataBaseItems()
递归子 Folder：对每个 Folder 再调用 GetAllDataBaseItems()
```

当返回项是 Folder 时，加入下一层队列；当返回项是 Component 时，返回轻量身份信息并停止，不读取其内容。

### 5.4 返回 JSON

```json
{
  "kind": "tree",
  "target": {
    "oid": "folder-abs-oid",
    "path": "PlatformLibrary/ABS"
  },
  "depth": 1,
  "nodes": [
    {
      "oid": "folder-controller-oid",
      "kind": "folder",
      "name": "Controller",
      "path": "PlatformLibrary/ABS/Controller",
      "parentOid": "folder-abs-oid",
      "parentPath": "PlatformLibrary/ABS",
      "hasChildren": true
    },
    {
      "oid": "brake-controller-oid",
      "kind": "component",
      "name": "BrakeController",
      "path": "PlatformLibrary/ABS/BrakeController",
      "parentOid": "folder-abs-oid",
      "parentPath": "PlatformLibrary/ABS",
      "componentType": "Class"
    }
  ],
  "truncated": false,
  "coverage": "complete_for_requested_depth",
  "source": "live"
}
```

`nodes` 采用扁平数组，并带 `parentOid` / `parentPath`，便于 Agent 后续查找或自行重建 JSON tree。

## 6. `ascet_get_elements`

### 6.1 职责

按一个 Component 或一个 Folder 子树读取 Element。Folder 是范围选择器：先找出范围内 Component，再对每个 Component 调用相应的快速 Element API。

### 6.2 输入

```ts
type AscetGetElementsInput = {
  target: {
    kind: "component" | "folder";
    oid?: string;
    folderPath?: string;
    name?: string;
  };
  folderDepth?: number;
  elementName?: string;
  detail?: "identity" | "summary";
  maxFolders?: number;
  maxComponents?: number;
};
```

`elements` 不接受 `maxItems`。Component 一旦进入选定范围，就返回其全部 Element。

### 6.3 API 选择

#### Component 范围

| 请求 | ToolAPI | 原因 |
| --- | --- | --- |
| `elementName` 缺失 | `CodeComponent.GetAllModelElements()` | 单个 Component 内最快的批量 Element 读取 |
| 指定 `elementName` | `CodeComponent.GetModelElement(elementName)` | 精确查找，避免读取该 Component 的全部 Element |

#### Folder 范围

```text
1. 以 folderDepth 遍历 Folder：Folder.GetAllDataBaseItems()
2. 只挑选 CodeComponent
3. 未指定 elementName：每个 Component 调用 GetAllModelElements()
4. 指定 elementName：每个 Component 调用 GetModelElement(elementName)
```

因此：

```text
Folder + 无 elementName = 每个选中 Component 的 GetAllModelElements()
Folder + elementName   = 每个选中 Component 的 GetModelElement(name)
```

后者适合“在这个 Folder 子树内查哪些 Component 有 Element X”，不需要枚举所有 Element。

### 6.4 返回 JSON

Folder 范围使用扁平结果；每个 Element 都包含 Component 和 Folder 定位信息：

```json
{
  "kind": "elements",
  "scope": {
    "kind": "folder",
    "oid": "folder-abs-oid",
    "path": "PlatformLibrary/ABS",
    "folderDepth": 1
  },
  "componentsScanned": 2,
  "items": [
    {
      "folderPath": "PlatformLibrary/ABS/Controller",
      "component": {
        "oid": "brake-controller-oid",
        "name": "BrakeController",
        "componentType": "Class"
      },
      "element": {
        "name": "VehicleSpeed",
        "runtimeType": "PrimitiveModelElement",
        "scope": "Public",
        "modelType": "real",
        "representedClass": null
      }
    },
    {
      "folderPath": "PlatformLibrary/ABS/Controller",
      "component": {
        "oid": "brake-controller-oid",
        "name": "BrakeController",
        "componentType": "Class"
      },
      "element": {
        "name": "WheelSignals",
        "runtimeType": "ComplexModelElement",
        "scope": "Private",
        "representedClass": {
          "oid": "wheel-signals-oid",
          "name": "WheelSignals"
        }
      }
    }
  ],
  "truncated": false,
  "coverage": "complete_for_selected_components",
  "source": "live"
}
```

`detail: "summary"` 只读取 Element identity、scope、model type 和 represented class；不读取 Element 的值、范围、表格、公式、注释或实现。

## 7. `ascet_get_refs`

### 7.1 职责

按 Component 或 Folder 子树读取两种出向引用。`refKind` 必须显式指定，避免为了“all”而对每个 Component 执行两种 GetAll 调用。

```text
component_instances：Component 内被引用/包含的 Component Model Element
 database_items     ：DataBaseItem 层面的出向依赖
```

### 7.2 输入

```ts
type AscetGetRefsInput = {
  target: {
    kind: "component" | "folder" | "element" | "database_item";
    oid?: string;
    componentOid?: string;
    folderPath?: string;
    elementName?: string;
  };
  refKind: "component_instances" | "database_items";
  folderDepth?: number;
  maxFolders?: number;
  maxComponents?: number;
  maxItems?: number;
};
```

### 7.3 API 选择

#### Component / Folder 范围：`component_instances`

```csharp
CodeComponent.GetAllReferencedModelElements();
```

对每个返回的 `AscetModelElement`：

```csharp
element.GetName();
element.GetRepresentedClass();
```

此结果表达：

```text
source Component
  -> named Component instance Element
  -> represented target Component
```

它不表达 Primitive Element 的代码读写引用。

#### Component / Folder 范围：`database_items`

```csharp
DataBaseItem.GetAllReferecedDataBaseItems();
```

此结果表达：

```text
source DataBaseItem -> referenced DataBaseItem
```

它不保证提供具体 source Element 名称。

#### 单个 Element：`component_instances`

```csharp
CodeComponent.GetModelElement(elementName);
AscetModelElement.GetRepresentedClass();
```

仅当该 Element 是 Complex / Enumeration Model Element 时，`GetRepresentedClass()` 才有明确语义。若是 Primitive Element，应返回：

```json
{
  "references": [],
  "coverage": "not_available_without_code_analysis"
}
```

不能将空数组误标为“该 Element 没有代码引用”。

### 7.4 Folder 范围读取算法

```text
1. 按 folderDepth 调用 Folder.GetAllDataBaseItems()，找出范围内 CodeComponent。
2. 对每个 CodeComponent 串行调用指定 refKind 的 GetAll API。
3. 将每条引用附上 source Component OID、名称和 Folder path。
4. 达到 maxFolders、maxComponents 或 maxItems 后停止，并返回 partial coverage。
```

### 7.5 返回 JSON：组件实例 refs

```json
{
  "kind": "refs",
  "refKind": "component_instances",
  "scope": {
    "kind": "folder",
    "oid": "folder-abs-oid",
    "path": "PlatformLibrary/ABS",
    "folderDepth": 1
  },
  "componentsScanned": 2,
  "items": [
    {
      "sourceFolderPath": "PlatformLibrary/ABS/Controller",
      "sourceComponent": {
        "oid": "brake-controller-oid",
        "name": "BrakeController"
      },
      "elementName": "VehicleState",
      "targetComponent": {
        "oid": "vehicle-state-oid",
        "name": "VehicleState"
      }
    }
  ],
  "truncated": false,
  "coverage": "complete_for_selected_components",
  "source": "live"
}
```

### 7.6 返回 JSON：数据库对象 refs

```json
{
  "kind": "refs",
  "refKind": "database_items",
  "scope": {
    "kind": "component",
    "oid": "brake-controller-oid"
  },
  "items": [
    {
      "sourceItem": {
        "oid": "brake-controller-oid",
        "name": "BrakeController"
      },
      "targetItem": {
        "oid": "vehicle-state-oid",
        "name": "VehicleState",
        "runtimeType": "CodeComponent"
      }
    }
  ],
  "truncated": false,
  "coverage": "complete_for_selected_components",
  "source": "live"
}
```

## 8. Agent 调用路径

```text
已知 Database 根
  -> ascet_get_tree(depth: 1)

已知 Folder
  -> ascet_get_tree(folderOid, depth: 1)

在 Folder 子树内批量读取 Element
  -> ascet_get_elements(folderOid, folderDepth: 1)

在 Folder 子树内查名称确定的 Element
  -> ascet_get_elements(folderOid, folderDepth: 2, elementName: "VehicleSpeed")

读取 Folder 子树内的 Component instance refs
  -> ascet_get_refs(folderOid, folderDepth: 1, refKind: "component_instances")

读取一个 Component 的数据库对象依赖
  -> ascet_get_refs(componentOid, refKind: "database_items")

读取确定 Element 的 Component-instance target
  -> ascet_get_refs(componentOid + elementName, refKind: "component_instances")
```

所有调用都只处理给定 Folder / Component 范围。响应 JSON 的 OID、路径和名称是下一次调用的输入，而不是写入索引的原始数据。

## 9. 第一阶段实现范围

```text
ascet_get_tree
ascet_get_elements
ascet_get_refs
```

第一阶段不复用重型 `read_element_catalog`、`search_elements`、`read_element_refs` 或任何全库索引路径作为底层实现。

如需读取 Element 值、范围、表格、公式、Method body、Component implementation、图或 Primitive Element 的代码级引用，应增加独立、精确、显式的 read / analysis tools；不能由 get tools 隐式加载。

## 10. Search / Get 最小返回约束（最新决策）

本节是最新输出约束；如与前文较详细的 JSON 示例冲突，以本节为准。

职责必须保持：

```text
Search：只定位命中对象。
Get：只返回最小结构与关系。
Read：读取类型、值、实现、代码和详细语义。
Edit：修改已由 Search / Get / Read 精确定位的对象。
```

### 10.1 Search Elements 返回

`ascet_search` 搜索 Element 时，每个命中只返回：

```json
{
  "path": "CN_Libary\\CNMS_IPB20\\IPBCustGeneral\\IPBCustGeneral_ECU_CSW_BB88010::CM_SCM",
  "oid": "owner-component-oid",
  "scope": "exported"
}
```

字段语义：

```text
path：ComponentPath::ElementName

oid：Element 所属 Component 的 OID；
     Model Element 没有可靠全局 OID 时，不构造虚假的 Element OID。

scope：local | imported | exported
```

Search Elements 不返回：

```text
runtimeType
modelType
technicalKind
functionalTags
representedComponent
value / range / unit
implementation
match score 或长匹配解释
```

如需类型或详细信息，使用返回的 owner Component OID 和 Element path 调用 `ascet_read`。

### 10.2 Get Tree 返回

```json
{
  "items": [
    {
      "path": "CN_Libary\\CNMS_IPB20\\IPBCustGeneral\\IPBCustGeneral_ECU_CSW_BB88010",
      "oid": "project-oid",
      "kind": "project"
    }
  ]
}
```

Tree 只返回节点定位信息，不返回 Component summary、接口、refs 或实现信息。

### 10.3 Get Elements 返回

```json
{
  "items": [
    {
      "path": "ComponentPath::ElementName",
      "oid": "owner-component-oid",
      "scope": "imported"
    }
  ]
}
```

Get Elements 与 Search Elements 使用相同的最小 Element identity，便于 Search 直接查询 Get 返回的数据。

`elements` 不提供 `maxItems`，也不对结果进行数量截断：

```text
Component target：返回该 Component 的全部 Element。
Folder target：通过 folderDepth、maxFolders、maxComponents 限定 Component 范围；
               对每个已选中的 Component 返回全部 Element。
```

名称和 scope filter 只负责筛选结果，不作为隐式数量上限。

### 10.4 Get Component Refs 返回

```json
{
  "items": [
    {
      "sourcePath": "CN_Libary\\CNMS_IPB20\\IPBCustGeneral\\IPBCustGeneral_ECU_CSW_BB88010",
      "sourceOid": "project-oid",
      "elementPath": "CN_Libary\\CNMS_IPB20\\IPBCustGeneral\\IPBCustGeneral_ECU_CSW_BB88010::CM_SCM",
      "scope": "exported",
      "targetPath": "PlatformLibrary\\Package\\SCM_SecondaryCollisionMitigation\\Component\\Config\\CM_SCM",
      "targetOid": "cm-scm-oid"
    }
  ]
}
```

只保留表达关系所必需的数据：

```text
source Component
instance Element
scope
target Component
```

### 10.5 Get BDE Edges 返回

```json
{
  "items": [
    {
      "fromPath": "ComponentPath::ElementName/outputPin",
      "toPath": "ComponentPath::ElementName/inputPin"
    }
  ]
}
```

详细连接类型、坐标、原始证据和 Diagram 实现信息由 `ascet_read` 提供。

### 10.6 Get Import Binding 返回

```json
{
  "matched": true,
  "importPath": "ConsumerComponent::ImportedElement",
  "exportPath": "ProviderComponent::ExportedElement"
}
```

### 10.7 通用响应状态

除 `items` 或 Action 特定结果外，只保留必要状态：

```json
{
  "coverage": {
    "status": "complete_for_scope"
  },
  "truncated": false,
  "source": "live"
}
```

Get / Search 默认不返回：

```text
长 summary
evidence
diagnostics
功能分类
推荐修改层
大段 nextRequests
实现细节
```

### 10.8 Search 与 Get 的关系

```text
Get 是唯一 ASCET 实时数据入口。
Search 查询 Get 已返回的 tree、elements、component_refs 和 bde_edges 数据。
缺少某类数据时，Search 只按预算请求对应的现有 Get Action 补齐。
Search 不维护 P0、SQLite 或独立持久化索引。
```
