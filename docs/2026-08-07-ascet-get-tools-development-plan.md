# ASCET Get Tools 开发任务计划

## 1. 最终目标

将 ASCET 发现与搜索链路收敛为：

```text
ascet_get
  -> 小结果直接返回 AI
  -> 大结果写入临时 NDJSON + meta.json
  -> Pi find / grep / read
  -> ascet_read 深读精确对象
  -> ascet_edit 修改
  -> ascet_verify 验证
```

直接移除，不提供兼容层：

```text
ascet_index
ascet_search
ascet_explore
ascet_read.read_project_formulas
P0 / SQLite / startup warmup / index footer / background refresh
```

最终 `ascet_get` Actions：

```text
tree
elements
formulas
component_refs
bde_edges
import_binding
dbitem_refs
```

## 2. 不可偏移约束

- `ascet_get` 是唯一 ASCET 实时发现入口。
- 保持当前 Extension -> CLI Router -> Scheduler -> CLI Lock -> Read Host -> ToolAPI 架构。
- 所有 live ToolAPI 调用必须经过 `runAscetCliJson()` 和全局 ASCET Scheduler。
- 一个 Get 请求只能提交一个 Scheduler Job；Folder/Component 遍历在该 Job 内严格串行。
- 禁止 `Promise.all` 并发 ToolAPI。
- `elements` 和 `formulas` 不接受 `maxItems`，选中目标后返回完整集合。
- 不调用 `GetNameWithPath()` 构造每个 Tree 节点路径，使用已知 `parentPath + name`。
- Get 不读取 Method、实现、Element 值或代码；Formula 本身的完整字段是 `formulas` Action 的正式数据。
- 大输出落盘只是任务级 Observation，不是索引，不跨任务维护数据库事实。
- 不保留旧 Tool、旧 Action、旧 Route、旧 Profile 或 Feature Flag 兼容入口。

## 3. Luna 执行规则

每个任务开始时：

1. 阅读仓库根目录 `AGENTS.md`。
2. 完整阅读任务涉及的文件后再修改。
3. 只修改任务声明的写入范围；共享注册文件只能由指定集成任务修改。
4. 不提交 Git commit，除非用户明确要求。
5. 修改或新增测试文件后，运行对应的具体测试并修复。
6. TypeScript 代码修改完成后运行完整 `npm run check`，不得截断输出。
7. 不运行 `npm run build` 或完整 `npm test`，除非用户明确要求。
8. 不清理、重置、stash 或覆盖其他会话的文件。

## 4. 任务依赖图

```text
T01 Get 后端基础模型与定位器
  ├─ T02 tree/elements
  ├─ T03 formulas
  └─ T04 refs/edges/binding
       └─ T05 CLI Host/Router/Contracts 集成

T06 Observation Store
  └─ T07 ascet_get Extension Tool
       └─ T08 Registry/Profile/Route/Prompt 集成

T05 + T07
  ├─ T09 Startup/Status 去索引
  ├─ T10 Read 去索引
  └─ T11 Edit/Batch Observation 失效
       └─ T12 Search/Index/Explore 直接删除
            └─ T13 测试与文档收尾
                 └─ T14 Live ASCET 串行验收
```

---

## T01：Get 后端基础模型与精确定位器

### 目标

建立所有 Get Action 共用的请求、响应、目标定位和最小序列化模型，不注册 CLI Operation。

### 写入范围

```text
ascetcli/src/AscetCopilot/Services/Get/AscetGetModels.cs
ascetcli/src/AscetCopilot/Services/Get/AscetGetTargetResolver.cs
ascetcli/tests/*GetTargetResolver*.cs
```

### 实现要求

- 支持 `oid`、`path`、`targetPathPrefix`。
- OID 优先使用 `DataBase.GetItemForOID()`。
- Path 使用精确数据库对象定位；不执行名称模糊搜索。
- Element identity 为 `ownerComponentOid + elementName`。
- Formula identity 为 `ownerProjectOid + formulaName`。
- 定义统一 coverage：`complete_for_scope | partial | failed`。
- 定义 Tree、Element、Formula、ComponentRef、BdeEdge、ImportBinding、DbItemRef DTO。
- 所有输出字段使用最终小写 JSON contract。

### 验收

- OID/path 指向同一对象时返回一致身份。
- 无法定位时返回明确错误，不回退到全库扫描。
- 不依赖 Search Index 类型或代码。

---

## T02：实现 `tree` 和 `elements`

### 依赖

T01。

### 写入范围

```text
ascetcli/src/AscetCopilot/Services/Get/AscetGetTreeService.cs
ascetcli/src/AscetCopilot/Services/Get/AscetGetElementsService.cs
ascetcli/tests/*GetTree*.cs
ascetcli/tests/*GetElements*.cs
```

### `tree`

ToolAPI：

```text
AscetDataBase.GetAllAscetFolders()
Folder.GetAllDataBaseItems()
```

输出：

```json
{"path":"...","oid":"...","kind":"folder|project|module|class|..."}
```

要求：

- 根请求只读取顶层 Folder。
- Folder 默认展开一层，显式支持 depth。
- 使用 `parentPath + name` 构造路径。
- 不读取 Elements、refs、代码或实现。

### `elements`

ToolAPI：

```text
CodeComponent.GetAllModelElements()
CodeComponent.GetModelElement(name)
```

输出：

```json
{"path":"ComponentPath::ElementName","oid":"owner-component-oid","scope":"local|imported|exported"}
```

要求：

- 不提供 `maxItems`。
- Component target 返回全部 Elements。
- Folder target 只通过 depth/maxFolders/maxComponents 限制 Component 范围。
- 每个已选中 Component 的 Element 集合必须完整。
- name/scope 只过滤，不作为数量限制。

---

## T03：实现 `formulas`

### 依赖

T01。

### 写入范围

```text
ascetcli/src/AscetCopilot/Services/Get/AscetGetFormulasService.cs
ascetcli/tests/*GetFormulas*.cs
```

### 实现

复用：

```text
ProjectFormulaReadService.ReadCatalog(projectPath)
```

输出每个 Formula：

```json
{
  "path": "ProjectPath::FormulaName",
  "oid": "owner-project-oid",
  "name": "FormulaName",
  "type": "Linear",
  "unit": "km/h",
  "comment": "...",
  "contents": "x * 0.01",
  "parameters": [0.01]
}
```

要求：

- 不提供 `maxItems`。
- 无 formulaName 时返回全部 Formula。
- 有 formulaName 时执行精确过滤。
- Formula 没有稳定全局 OID，`oid` 使用所属 Project OID。
- `contents` 保持完整；NDJSON 序列化时换行转义为 `\n`。

---

## T04：实现关系与信号 Action

### 依赖

T01。

### 写入范围

```text
ascetcli/src/AscetCopilot/Services/Get/AscetGetComponentRefsService.cs
ascetcli/src/AscetCopilot/Services/Get/AscetGetBdeEdgesService.cs
ascetcli/src/AscetCopilot/Services/Get/AscetGetImportBindingService.cs
ascetcli/src/AscetCopilot/Services/Get/AscetGetDbItemRefsService.cs
ascetcli/tests/*GetComponentRefs*.cs
ascetcli/tests/*GetBdeEdges*.cs
ascetcli/tests/*GetImportBinding*.cs
ascetcli/tests/*GetDbItemRefs*.cs
```

### `component_refs`

```text
CodeComponent.GetAllReferencedModelElements()
AscetModelElement.GetRepresentedClass()
```

输出：

```json
{
  "sourcePath":"...",
  "sourceOid":"...",
  "elementPath":"Source::Instance",
  "scope":"exported",
  "targetPath":"...",
  "targetOid":"..."
}
```

不得将其描述成 Primitive Element 代码引用。

### `bde_edges`

```text
BlockDiagramHierarchy.GetAllDiagramConnections()
BlockDiagramConnection.GetOutputPin()
BlockDiagramConnection.GetInputPin()
```

输出：

```json
{"fromPath":"Component::Element/outputPin","toPath":"Component::Element/inputPin"}
```

### `import_binding`

```text
CodeComponent.ExistsExportForImport()
CodeComponent.GetExportForImport()
```

### `dbitem_refs`

```text
DataBaseItem.GetAllReferecedDataBaseItems()
```

只表示数据库对象依赖。

---

## T05：CLI Read Host、Operation Registry 和 Contracts 集成

### 依赖

T02、T03、T04。

### 独占写入范围

```text
ascetcli/src/AscetCli/Host/AscetReadHostDispatcher.cs
ascetcli/src/AscetCli/Routing/OperationRegistry.cs
ascetcli/src/AscetCli/Commands/ExecCommand.cs
ascetcli/contracts/commands/AscetGet*.json
ascetcli/contracts/families/get.json
ascetcli/contracts/cli-catalog.json
packages/ascet-extension/ascet-cli/contracts/**
```

### Operations

```text
get_tree
get_elements
get_formulas
get_component_refs
get_bde_edges
get_import_binding
get_dbitem_refs
```

全部配置为：

```text
ExecutionLane.PooledRead
hostEligible = true
jobKind = read
resourceKey = ascet.toolapi.global
```

### 调度要求

- 一次 Operation 内完成全部串行遍历。
- 不在 C# 服务内部启动子进程或第二个 Scheduler Job。
- 支持 Abort/Timeout 的现有 CLI 行为。
- 不增加修改面组合分析 Action。

### 验收

- 每个 Operation 可由 `AscetCli.exe exec <operation>` 调用。
- Read Host capability catalog 包含 7 个 Get Operations。
- CLI JSON contract 与 T01 DTO 一致。

---

## T06：实现任务级 Observation Store

### 写入范围

```text
packages/ascet-extension/src/observation-store.ts
packages/ascet-extension/src/observation-store.test.ts
packages/ascet-extension/src/cli.ts
```

### 要求

- 复用 `PI_ASCET_EXTENSION_ARTIFACT_ROOT`。
- 复用 `PI_ASCET_EXTENSION_OUTPUT_THRESHOLD_BYTES`，默认保持当前 4096 bytes。
- 小结果 inline；大结果生成：

```text
<result-id>.meta.json
<result-id>.<domain>.ndjson
```

- NDJSON 每行一个完整 JSON 对象。
- 使用临时文件后原子 rename，避免生成半文件。
- Metadata 包含 resultId、domain、target、itemCount、coverage、source、capturedAt。
- 支持按 Component/Project OID/path 失效 Observation。
- 文件存储在系统临时目录，不写入 Git workspace。
- Observation 不是查询索引，不构建倒排结构。

### 验收

- N 个输入对象产生 N 行 NDJSON。
- Formula 多行 contents 保持单行合法 JSON。
- 失效后 meta 标记或文件删除行为确定且可测试。
- Inline/Stored 边界测试覆盖。

---

## T07：实现 `ascet_get` Extension Tool

### 依赖

T05、T06。

### 写入范围

```text
packages/ascet-extension/src/get.ts
packages/ascet-extension/src/tools/get/definition.ts
packages/ascet-extension/src/tools/get/schema.ts
packages/ascet-extension/src/tools/get/prompt.ts
packages/ascet-extension/src/tools/get/manifest.ts
packages/ascet-extension/src/tools/get/ui.ts
packages/ascet-extension/src/tools/get/index.ts
packages/ascet-extension/src/tools/get/*.test.ts
```

### 要求

- 使用 `defineSequentialAscetTool()`。
- 使用 `routeAscetAction()`、`runAscetCliJson()` 和 `createAscetCliToolDetails()`。
- 每个 Tool 调用只调用一次 `runAscetCliJson()`。
- `delivery=auto|inline|stored`。
- Get 成功后再由 Node 层决定 inline 或 Observation。
- 标准状态：

```json
{"coverage":{"status":"complete_for_scope"},"truncated":false,"source":"live"}
```

- Schema 不出现 `maxItems`。
- 不出现 Search、Index、cursor、paging、searchComplete 字段。

---

## T08：最终 Registry、Routes、Profiles、Capabilities 和 Prompt

### 依赖

T07。

### 独占写入范围

```text
packages/ascet-extension/src/tools/registry.ts
packages/ascet-extension/src/tools/index.ts
packages/ascet-extension/src/routing/route-manifests.ts
packages/ascet-extension/src/routing/command-aliases.ts
packages/ascet-extension/src/tools/actions/descriptors.ts
packages/ascet-extension/src/tools/actions/catalog.ts
packages/ascet-extension/src/tools/actions/gates.ts
packages/ascet-extension/src/tools/exposure/profiles.ts
packages/ascet-extension/src/tools/exposure/controller.ts
packages/ascet-extension/src/tools/exposure/profiled-tools.ts
packages/ascet-extension/src/agent-routing.ts
packages/ascet-extension/src/tools/capabilities/**
相关测试
```

### 最终 Canonical Tools

Ops：

```text
ascet_status
ascet_capabilities
ascet_recover
ascet_scheduler_status
```

Domain：

```text
ascet_get
ascet_read
ascet_diff
ascet_edit
ascet_verify
```

### Profile

所有需要 ASCET 发现能力的 Profile 必须激活：

```text
ascet_get
find
grep
read
```

直接从注册、Profile、Prompt 和 Action Catalog 删除：

```text
ascet_index
ascet_search
ascet_explore
ascet_read.read_project_formulas
```

不保留 retired tool set、alias 或 feature flag。

---

## T09：移除启动 Warmup、Footer 和 Status 索引语义

### 依赖

T08 可同时准备，但最终合并在 T08 后。

### 写入范围

```text
packages/ascet-extension/src/index.ts
packages/ascet-extension/src/status-runtime.ts
packages/ascet-extension/src/tools/status/**
packages/ascet-extension/src/ascet-init.ts
相关测试
```

### 删除

```text
scheduleStartupAscetSearchIndexWarmup()
startupIndexWarmupTimer
installAscetIndexFooterStatus()
ensureAscetSearchIndex()
P0/SQLite status fields
```

### 新 Status

只报告：

```text
CLI/Contracts 路径
DLL 版本
ASCET GUI/Database live connection
ToolAPI probe
Scheduler/CLI lock
```

启动和 status 调用不得出现 `warm_search_index`。

---

## T10：Read 去除 Index/Search 依赖

### 写入范围

```text
packages/ascet-extension/src/read-dependent-chain.ts
packages/ascet-extension/src/read-element-catalog.ts
packages/ascet-extension/src/tools/read/definition.ts
packages/ascet-extension/src/tools/read/schema.ts
packages/ascet-extension/src/tools/read/prompt.ts
packages/ascet-extension/src/read-project-formulas.ts（删除）
相关测试
```

### 要求

- 删除 `read_project_formulas` Action。
- 删除 provider discovery 中的 index-first、ensure index 和 SQLite query。
- `read_dependent_chain` 只返回精确目标的实时链路；候选 provider 发现交给 Agent 使用 Get + grep。
- 不在 Read 中隐式执行 Folder/全库扫描。
- 保留精确 read_code、implementation、diagram、state machine、element dependency/ref 能力。

---

## T11：Edit/Batch 改为 Observation 失效

### 依赖

T06。

### 写入范围

```text
packages/ascet-extension/src/edit/service.ts
packages/ascet-extension/src/edit/common.ts
packages/ascet-extension/src/batch-write.ts
packages/ascet-extension/src/tools/edit/**
相关 Edit/Batch 测试
```

### 删除

```text
refreshElementsFromLiveCatalog()
ensureAscetSearchIndex()
invalidateAscetSearchIndexPartitions()
SQLite mark stale
background P0 refresh
index writeback result
```

### 替换

成功写入后：

```text
invalidateObservations(componentOid/componentPath/projectOid/projectPath)
```

Edit 输出改为：

```json
{"observations":{"invalidated":["result-id"]}}
```

失败或 dry-run 不得失效 Observation。

---

## T12：直接删除 Search、Index、Explore 和旧 CLI Operations

### 依赖

T08、T09、T10、T11。

### 删除 Extension

```text
packages/ascet-extension/src/tools/search/
packages/ascet-extension/src/tools/ascet-index/
packages/ascet-extension/src/tools/explore/
packages/ascet-extension/src/tools/search.ts
packages/ascet-extension/src/search-index.ts
packages/ascet-extension/src/search-index-store.ts
packages/ascet-extension/src/search-index-sqlite/
packages/ascet-extension/src/ascet-index-footer-status.ts
packages/ascet-extension/src/element-index-writeback.ts
packages/ascet-extension/src/search-components.ts
packages/ascet-extension/src/search-elements.ts
packages/ascet-extension/src/search-occurrences.ts
packages/ascet-extension/src/search-text-code.ts
packages/ascet-extension/src/list-components.ts
```

删除前使用 `rg` 确认没有运行时 import。若某个文件包含仍需复用的精确 path resolver，先移动到无 Search/Index 语义的新文件，然后删除旧文件。

### 删除 CLI 公共 Operations/Contracts

```text
warm_search_index
search_components
search_elements
search_occurrences
search_text_code
list_components（若无其他精确内部调用）
read_project_formulas
```

删除对应：

```text
OperationRegistry entries
ReadHost dispatch cases
ExecCommand cases
contracts/commands
contracts/families/search.json
contracts 中的 P0/index 描述
```

不得保留 deprecated alias 或环境变量开关。

---

## T13：测试、文档和 Changelog 收尾

### 依赖

T12。

### 工作内容

- 更新所有 Registry、Profile、Route、Capabilities snapshot/tests。
- 删除 Search/Index/P0 专用测试。
- 将仍有效的回归场景改写为 Get + Observation + grep 流程。
- 更新 Extension README、初始化模板和工具说明。
- 在 `packages/ascet-extension/CHANGELOG.md` 的 `[Unreleased]`：
  - `Added`：`ascet_get` 与 Observation。
  - `Removed`：`ascet_index`、`ascet_search`、`ascet_explore`、`read_project_formulas`。
- 不修改已发布 Changelog 版本。

### 静态检查

```text
rg "ascet_index|ascet_search|ascet_explore|warm_search_index|P0|SQLite" packages/ascet-extension/src ascetcli/src
```

允许命中的位置只能是明确保留的历史文档；运行时代码不得命中。

---

## T14：最终验证

### 自动测试

- Get Schema/Definition/Route tests。
- Observation Store tests。
- Scheduler 串行测试：并发 Get 时 `activeCount` 始终为 1。
- Startup 不调用 warmup。
- Profile 包含 `ascet_get/find/grep/read`，不包含旧工具。
- Elements/Formulas 完整集合测试。
- Edit Observation invalidation 测试。
- 运行所有本次修改过的具体测试文件。
- 运行完整 `npm run check`。

### Live ASCET 串行验证

按顺序执行，禁止并发：

1. `tree`：`CN_Libary\CNMS_IPB20\IPBCustGeneral`
2. `component_refs`：定位 `CM_SCM`
3. `tree`：`PlatformLibrary\Package\SCM_SecondaryCollisionMitigation`
4. `elements`：SCM 目标 Component，验证全部 Elements 和 scope
5. `formulas`：SCM/客户 Project，验证完整 Formula NDJSON
6. Pi `grep`：按 Formula name/contents/type 搜索
7. `import_binding`：验证 import/export
8. `bde_edges`：`EMC_Drive_Main20ms/Main`
9. Edit smoke：成功写后相关 Observation 失效

### 最终验收

```text
启动无 P0/SQLite/warmup
工具列表无 ascet_index/ascet_search/ascet_explore
ascet_get 仅有 7 个 Actions
所有 ToolAPI 严格串行
Elements/Formulas 无 item count 截断
大数据完整写入 NDJSON
find/grep/read 可以完成后续搜索
Read/Edit 不再依赖任何索引
```

## 5. 推荐 Luna 执行批次

如果串行开发：

```text
T01 -> T02 -> T03 -> T04 -> T05 -> T06 -> T07 -> T08
    -> T09 -> T10 -> T11 -> T12 -> T13 -> T14
```

如果使用多个隔离工作区并行：

```text
Wave 1: T01
Wave 2: T02 + T03 + T04 + T06
Wave 3: T05 + T07
Wave 4: T08
Wave 5: T09 + T10 + T11
Wave 6: T12
Wave 7: T13 + T14
```

共享文件任务 T05、T08、T12 必须单独执行，不能与其他写相同文件的任务并行。

## 6. Luna 通用任务提示模板

```text
阅读仓库根目录 AGENTS.md，并完整阅读本任务涉及文件。
只完成任务 <TASK_ID>，不要提前实现后续任务，也不要修改任务写入范围外的文件。
保持现有 ascet-extension -> CLI router -> global scheduler -> CLI lock -> Read Host 架构。
禁止新增 P0、SQLite、持久化索引、后台 warmup 或 Search 兼容层。
所有 live ToolAPI 调用严格串行；不得使用 Promise.all 调用 ToolAPI。
不要提交 Git commit。
修改测试后运行对应具体测试；TypeScript 修改完成后运行完整 npm run check。
最终列出：修改文件、实现内容、测试命令及结果、尚未解决的问题。
```
