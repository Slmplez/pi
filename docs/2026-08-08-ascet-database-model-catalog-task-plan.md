# ASCET Database Model Catalog 实施任务规划

## 1. 目标

在不修改现有 `get_tree` 行为的前提下，新增：

```text
ascet_get action="database_catalog"
```

它消费已经落盘的全量 Tree Observation，按 `include` 选择性生成全库 Catalog：

```text
Parameter Class
Enumeration
Module
Message
```

本规划的设计依据：

```text
docs/2026-08-08-ascet-database-model-catalog-plan.md
```

## 2. 已冻结的设计决策

### 2.1 输入范围

- 输入必须是 `ascet_get action="tree" delivery="stored"` 生成的完整全库 Tree。
- `database_catalog` 不接受 Project、Folder、Component、path prefix 或 OID 范围选择。
- `include` 只控制需要扫描和输出的对象类型。
- 当前 `get_tree` 保持不变，本任务不处理 Tree 性能优化。

### 2.2 第一等 Catalog 对象

```text
parameter_class
enumeration
module
message
```

Project 只作为发现入口和关系节点，不作为主 Catalog 对象。

### 2.3 关系

```text
Project -> Module
Project -> Parameter Class
Module -> Message
Message -> Enumeration
Parameter Class -> Enumeration
Parameter Class -> Child Parameter Class
```

### 2.4 执行原则

- Enumeration、Module 优先从已落盘 Tree 本地提取。
- Project Complex、Parameter Class、Message 需要 ASCET Live ToolAPI。
- 一次 Catalog 请求最多启动一次 Live CLI operation。
- Live operation 内只创建一个 ToolAPI Session，所有 Project/Module 串行扫描。
- 按 OID 去重，禁止对 Project alias 和 canonical Module 重复扫描。
- 禁止对每个 Project、Module 或 Class 启动单独 CLI 进程。
- 禁止全量执行 Project `read_implementation`。

## 3. Public API 合同

### 3.1 请求

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

约束：

- `sourceTreeResultId` 必填。
- `include` 必填、非空、去重。
- `messageDepth` 默认 `0`。
- 第一版只支持 `delivery="stored"`；不要把全量 Catalog 内联返回给模型。
- 不允许 `target`、`filters`、`traversal`。

### 3.2 明确错误

```text
include_required
source_tree_not_found
source_tree_domain_invalid
full_tree_required
source_tree_data_missing
catalog_live_scan_failed
catalog_artifact_write_failed
```

`full_tree_required` 的判断至少包含：

- Tree `coverage.status` 必须为 `complete_for_scope`。
- Tree 不能带 target path、OID、prefix 范围。
- Tree 不能因 `maxFolders`、`maxComponents` 或其他限制被截断。
- Tree 元数据不能标记 `truncated=true`。

### 3.3 返回

Tool 只返回 Catalog artifact 元数据：

```json
{
  "delivery": "stored",
  "catalog": {
    "resultId": "obs-database-catalog-...",
    "sourceTreeResultId": "obs-tree-...",
    "include": ["parameter_class", "enumeration"],
    "artifacts": {
      "parameterClasses": {
        "dataPath": "...parameter-classes.ndjson",
        "itemCount": 954
      },
      "enumerations": {
        "dataPath": "...enumerations.ndjson",
        "itemCount": 708
      },
      "summaryPath": "...database-model-summary.json",
      "metaPath": "...database-model.meta.json"
    }
  },
  "coverage": {
    "status": "complete_for_scope"
  },
  "timings": {}
}
```

每次 Catalog 请求必须生成独立 `catalog.resultId`。不能使用 `sourceTreeResultId` 覆盖不同 `include` 请求的结果。

## 4. 任务分解

### Phase 0：基线冻结

#### Task 0.1 记录当前 Tree 基线

- [x] 保留当前全库 Tree Observation 作为 Live 验证输入。
- [x] 记录 `sourceTreeResultId`、meta path、data path。
- [x] 记录 Project、Class、Module、Enumeration 行数。
- [x] 记录 canonical Module 和 `project::module` alias 数量。
- [x] 确认 `coverage.status=complete_for_scope`、`truncated=false`。

当前参考基线：

```text
Tree nodes:          10,670
Project rows:        75
Class rows:          7,069
Module rows:         859
Unique Module OIDs:  428
Enumeration rows:    708
```

#### Task 0.2 冻结非目标范围

- [x] 不修改 `get_tree`。
- [x] 不增加 SQLite、常驻 P0、后台 warmup。
- [x] 不新增 Catalog 专用搜索工具。
- [x] 不全量读取 Enum literal、Comment 或 Implementation。

验收：开始实现前后，现有 `tree` 请求和输出合同保持一致。

---

### Phase 1：TypeScript API 与输入验证

主要文件：

```text
packages/ascet-extension/src/get.ts
packages/ascet-extension/src/get.test.ts
packages/ascet-extension/src/tools/instructions/ascet-get.ts
packages/ascet-extension/src/tools/agent-friendly-output.test.ts
packages/ascet-extension/src/tools/prompt.test.ts
```

#### Task 1.1 扩展 Action 类型和 Schema

- [x] 向 `AscetGetAction` 增加 `database_catalog`。
- [x] 为 `AscetGetParams` 增加独立 union branch。
- [x] 定义 `AscetDatabaseCatalogInclude` 字面量联合类型。
- [x] Schema 中限制 `include` 至少一个成员。
- [x] Schema 中将 `messageDepth` 限制为非负整数，默认语义为 `0`。
- [x] 不复用带 `target/filters/traversal` 的通用 base properties。

#### Task 1.2 增加 Catalog 专用执行分支

- [x] `runAscetGet` 对 `database_catalog` 走专用 orchestration。
- [x] `enumeration`/`module` 本地模式不得调用 ASCET CLI。
- [x] `message`/`parameter_class` 需要 Live 时，只调用一次 `get_database_catalog` operation。
- [x] 保留现有 Get action 路径，避免影响 `tree/elements/formulas/...`。

#### Task 1.3 Tool 指令

新增说明：

- [x] 必须先获得全量 stored Tree。
- [x] `include` 表示扫描和输出类型，不表示路径范围。
- [x] Enum/Module 查询优先使用本地 artifact。
- [x] 精确详情继续使用 grep/read 后再调用现有 exact read tool。

验收：模型可以明确区分 `tree`、`database_catalog` 和深度读取。

---

### Phase 2：Tree Observation 加载与本地索引

主要文件：

```text
packages/ascet-extension/src/observation-store.ts
packages/ascet-extension/src/observation-store.test.ts
packages/ascet-extension/src/get.ts
```

如果 `observation-store.ts` 继续膨胀，新增：

```text
packages/ascet-extension/src/database-catalog/tree-source.ts
packages/ascet-extension/src/database-catalog/types.ts
```

#### Task 2.1 按 resultId 加载 Observation

- [x] 增加只读 metadata lookup。
- [x] 安全解析并校验 `metaPath` 和 `dataPath`。
- [x] 拒绝非 `tree` domain。
- [x] 拒绝不完整、截断或有目标范围的 Tree。
- [x] 使用逐行 NDJSON 读取，不一次性复制完整 Tree 字符串。

#### Task 2.2 单次遍历提取本地输入

单次扫描 Tree NDJSON，构建：

```text
projectsByOid
canonicalModulesByOid
moduleAliasesByOid
enumerationsByOid
classRowsByOid（只供候选补漏，不直接判定 Parameter Class）
```

- [x] Project 按 OID 去重。
- [x] Module canonical path 优先选择不含 `::` 的路径。
- [x] alias 保留 Project 关系，但不参与重复 Live 扫描。
- [x] Enumeration 按 OID 去重。
- [x] 遇到缺失 OID 的行时记录 warning，不用 path 静默覆盖不同对象。

#### Task 2.3 本地统计

输出阶段统计：

```text
sourceTreeRowCount
projectCount
moduleRowCount
uniqueModuleCount
moduleAliasCount
enumerationCount
classRowCount
invalidRowCount
```

验收：参考数据库得到 75 Project、428 unique Module、708 Enumeration。

---

### Phase 3：C# Live Catalog Operation

主要文件：

```text
ascetcli/src/AscetCopilot/Services/Get/AscetGetService.cs
ascetcli/src/AscetCli/Commands/ExecCommand.cs
ascetcli/src/AscetCli/Routing/OperationRegistry.cs
```

建议将复杂逻辑拆分为：

```text
ascetcli/src/AscetCopilot/Services/Get/DatabaseCatalogService.cs
ascetcli/src/AscetCopilot/Services/Get/DatabaseCatalogDtos.cs
```

#### Task 3.1 定义 Live 请求 DTO

TypeScript 向一次 CLI operation 发送：

```json
{
  "scanParameterClasses": true,
  "scanMessages": true,
  "messageDepth": 0,
  "projects": [{"path": "...", "oid": "..."}],
  "modules": [{"path": "...", "oid": "..."}]
}
```

- [x] `projects` 只在需要 Parameter Class 时发送。
- [x] `modules` 只在需要 Message 时发送。
- [x] C# 再次按 OID 防御性去重。
- [x] 返回 DTO 不包含完整 Project Implementation。

#### Task 3.2 Operation 注册与路由

- [x] 注册 `get_database_catalog`。
- [x] `ExecCommand` 将请求路由到 typed service。
- [x] 保证一次 operation 只创建一个 ASCET ToolAPI Session。
- [x] Project 和 Module 在该 Session 内严格串行处理。
- [x] 单对象失败应记录 structured diagnostic；是否终止由错误类型决定。

#### Task 3.3 返回阶段计时

C# 返回：

```text
sessionOpenMs
projectScanMs
parameterClosureMs
moduleScanMs
sessionCloseMs
projectSuccessCount
projectFailureCount
moduleSuccessCount
moduleFailureCount
```

验收：全类型请求不产生 Project/Module 级 N+1 CLI 进程。

---

### Phase 4：Project Complex 与 Parameter Class

#### Task 4.1 Project 顶层 Complex 扫描

对全部唯一 Project：

```text
Project.GetAllModelElements()
  -> ComplexModelElement
  -> GetRepresentedClass()
```

- [x] 只读取 Project 顶层 model elements。
- [x] 识别 represented `Class` 和 `Module`。
- [x] 输出 `project_complex` DTO。
- [x] represented Module 形成 Project -> Module relation。
- [x] represented Class 作为 Parameter Class root 候选。

#### Task 4.2 Class-only Closure

从 represented Class root 开始：

- [x] 使用 OID visited set，防止环和重复 Class。
- [x] 只沿 represented kind=`class` 的 Complex Element 递归。
- [x] 不递归 Module、Project、Enumeration 或完整功能图。
- [x] 每个 Class 只读取一次 methods 和 model elements。

#### Task 4.3 Parameter Class 判定

正式判定不能只使用名称，也不能只使用 `Methods=0`：

```text
Methods=0
AND (
  direct Parameter evidence
  OR direct Calibration evidence
  OR canonical parameter kind evidence
  OR child Parameter Class evidence
)
```

输出证据：

```text
methodCount
directParameterCount
directCalibrationCount
childParameterClassCount
classification
evidence[]
```

建议 classification：

```text
verified_project_parameter_class
verified_child_parameter_class
orphan_parameter_class
rejected_no_parameter_evidence
rejected_has_methods
```

拒绝项默认只进入 summary diagnostics，不写入正式 Parameter Class Catalog。

#### Task 4.4 Parameter Class 关系

- [x] Project root 输出 Project -> Parameter Class edge。
- [x] Closure 输出 Parent Parameter Class -> Child Parameter Class edge。
- [x] enum typed Element 输出 Parameter Class -> Enumeration edge。
- [x] Edge 按稳定 identity 去重。

#### Task 4.5 Orphan 补漏

Project closure 完成后，才处理 Tree 中未覆盖 Class：

- [x] 使用已验证 Parameter Class 的 path/name/folder 结构生成候选规则。
- [x] Tree 模糊规则只做初筛，不直接写入 Catalog。
- [x] 候选必须经过相同的 Methods 和 Parameter evidence 精筛。
- [x] 单独统计 candidate、verified、rejected 数量和耗时。
- [x] 如果 Live 结果表明补漏代价过高，保留可关闭的内部开关，但不能把候选误报为已验证对象。

验收：三个已测试 Project 的 38 个 Parameter Class 全部满足 `Methods=0`，且无误报。

---

### Phase 5：Module 与 Message

#### Task 5.1 Module Catalog 本地构建

- [x] 从 Tree canonical Module 按 OID 输出 428 个唯一 Module。
- [x] Project alias 只用于 `projectCount` 和 Project -> Module edge。
- [x] 只 include `module` 时不调用 Live ToolAPI。

#### Task 5.2 Message 扫描

对全部唯一 Module：

```text
Module.GetAllModelElements()
```

默认 `messageDepth=0`：

- [x] 只识别直接 Element。
- [x] 使用 `IsSendMessage()`、`IsReceiveMessage()`、`IsSendReceiveMessage()`。
- [x] 标准化为 `send_message`、`receive_message`、`send_receive_message`。
- [x] 输出 scope、model type、unit 和 enum identity。
- [x] 递归模式作为后续可选能力，不阻塞 P0。

#### Task 5.3 Message identity

优先使用 Element 稳定 OID；没有时：

```text
SHA-256(moduleOid + "\0" + elementName + "\0" + messageKind)
```

使用分隔符避免字符串拼接碰撞。

#### Task 5.4 Message 关系与聚合

- [x] 输出 Module -> Message edge。
- [x] enum typed Message 输出 Message -> Enumeration edge。
- [x] 回填 Module send/receive/send-receive counts。
- [x] 同一 Module 内按 stable messageId 去重。

验收：代表样本直接扫描覆盖 1,264/1,265 Message；默认不为 0.1% 差异支付全库递归成本。

---

### Phase 6：Catalog 聚合与落盘

建议新增：

```text
packages/ascet-extension/src/database-catalog/catalog-service.ts
packages/ascet-extension/src/database-catalog/artifact-writer.ts
packages/ascet-extension/src/database-catalog/types.ts
```

#### Task 6.1 Catalog resultId

- [x] 每次请求生成 `obs-database-catalog-*`。
- [x] Tree resultId 只作为 lineage，不能作为输出文件主键。
- [x] 同一 Tree 不同 include 的结果可以并存。

#### Task 6.2 主文件

按 `include` 选择性创建：

```text
<catalogResultId>.database-model-catalog.ndjson
<catalogResultId>.parameter-classes.ndjson
<catalogResultId>.enumerations.ndjson
<catalogResultId>.modules.ndjson
<catalogResultId>.messages.ndjson
```

统一合集只包含本次 include 的类型。

#### Task 6.3 关系文件

按实际扫描依赖创建：

```text
project-complex-edges.ndjson
project-module-edges.ndjson
module-message-edges.ndjson
message-enum-edges.ndjson
parameter-enum-edges.ndjson
parameter-class-edges.ndjson
```

- [x] 没有执行对应扫描时不创建空关系文件，除非合同明确要求。
- [x] Summary/Meta 明确列出 `notCreatedReason` 或 artifact 不存在状态。

#### Task 6.4 Enumeration usage 三态

没有扫描 usage 时必须写：

```text
not_scanned
```

扫描完成且没有使用时才写：

```text
scanned_not_used
```

发现使用时写：

```text
used
```

不要用 `false` 混淆“未扫描”和“确认未使用”。

#### Task 6.5 原子写入

- [x] NDJSON 写入临时文件。
- [x] 全部成功后原子 rename。
- [x] 失败时清理本次 Catalog 的临时文件。
- [x] 不删除或覆盖 source Tree artifact。
- [x] 不影响其他并发 Pi session 的 artifact。

#### Task 6.6 Summary 和 Meta

始终创建：

```text
<catalogResultId>.database-model-summary.json
<catalogResultId>.database-model.meta.json
```

Meta 至少包含：

```text
catalogResultId
sourceTreeResultId
include
messageDepth
capturedAt
coverage
sourceTreeCounts
perTypeCounts
perRelationCounts
perStageTimings
warnings
failures
```

---

### Phase 7：搜索和消费方式

P0 不新增搜索 Action。利用现有文件工具：

```text
find
grep
read
```

#### Task 7.1 保证 grep-friendly NDJSON

- [x] 每行一个完整紧凑 JSON 对象。
- [x] 常用字段顺序稳定：`catalogKind`、`path/name`、`oid/id`、关系字段、统计字段。
- [x] path 和 OID 不拆分到多行。
- [x] 不在同一行嵌入大段 Implementation。

#### Task 7.2 预期搜索返回

`grep/rg` 返回：

```text
artifact 文件路径 + 行号 + 完整 NDJSON record
```

示例：

```powershell
rg -n -i 'BB88010.*Calibration' <parameter-classes.ndjson>
rg -n -F '"messageKind":"send_receive_message"' <messages.ndjson>
rg -n -i 'AVH_ModeType' <message-enum-edges.ndjson> <parameter-enum-edges.ndjson>
```

搜索命中的 path/OID 可直接用于后续精确 Live read。

---

### Phase 8：测试

#### 8.1 TypeScript 单元测试

新增或扩展：

```text
packages/ascet-extension/src/get.test.ts
packages/ascet-extension/src/observation-store.test.ts
packages/ascet-extension/src/database-catalog/catalog-service.test.ts
packages/ascet-extension/src/database-catalog/artifact-writer.test.ts
```

必须覆盖：

- [x] `include` 缺失或为空。
- [x] 非 Tree resultId。
- [x] Tree artifact 不存在。
- [x] bounded/partial/truncated Tree 被拒绝。
- [x] 859 Module rows 去重为 428 identity 的 fixture。
- [x] canonical path 优先于 `project::module` alias。
- [x] 只 include Enum/Module 时 CLI 调用次数为 0。
- [x] include Message/Parameter 时 CLI 调用次数为 1。
- [x] 不同 include 生成不同 catalog resultId。
- [x] 只生成 include 对应文件。
- [x] Enumeration usage 的三态语义。
- [x] 临时文件失败清理和原子发布。
- [x] compact NDJSON 可被逐行解析。

#### 8.2 C# 非 Live 测试

建议新增：

```text
ascetcli/tests/AscetDatabaseCatalogContractTest.cs
ascetcli/tests/AscetDatabaseCatalogClassificationTest.cs
ascetcli/tests/AscetDatabaseCatalogIdentityTest.cs
```

通过纯 DTO/fixture 验证：

- [x] operation registry 包含 `get_database_catalog`。
- [x] request JSON 解析。
- [x] Module/Project OID 去重。
- [x] Message kind 标准化。
- [x] fallback messageId 稳定且无简单拼接碰撞。
- [x] `Methods=0` 但无 Parameter evidence 时拒绝。
- [x] 有 Parameter evidence 但 `Methods>0` 时拒绝。
- [x] Class closure visited set 防环。
- [x] Edge 去重。

#### 8.3 测试命令

修改测试文件后运行对应测试：

```powershell
cd packages/ascet-extension
node ../../node_modules/vitest/dist/cli.js --run src/get.test.ts
node ../../node_modules/vitest/dist/cli.js --run src/observation-store.test.ts
node ../../node_modules/vitest/dist/cli.js --run src/database-catalog/catalog-service.test.ts
node ../../node_modules/vitest/dist/cli.js --run src/database-catalog/artifact-writer.test.ts
```

完成代码修改后运行：

```powershell
npm run check
```

不运行 `npm test` 或 `npm run build`，除非用户明确要求。

---

### Phase 9：Live 验证与性能验收

所有 ASCET Live 调用严格串行。

#### Task 9.1 include 组合测试

按顺序执行：

1. [x] `include=["enumeration"]`
2. [x] `include=["module"]`
3. [x] `include=["module","enumeration"]`
4. [x] `include=["message"]`
5. [x] `include=["parameter_class"]`
6. [x] `include=["parameter_class","enumeration"]`
7. [x] `include=["module","message","enumeration"]`
8. [x] 全部四类

#### Task 9.2 内容验收

- [x] Enumeration 为 708 个唯一 OID，或解释数据库变化。
- [x] Module 为 428 个唯一 OID，或解释数据库变化。
- [x] Project Complex 覆盖全部 75 Project。
- [x] 已知 Calibration/Constant root 被发现。
- [x] Parameter Class 与此前约 954 基线对比，逐项分析 missing/extra。
- [x] Module Message 统计与代表样本趋势一致。
- [x] Message Enum、Parameter Enum edge 可通过 grep 追踪。
- [x] 任一 failure 都写入 Meta，不静默丢失。

#### Task 9.3 性能验收

完整 Tree 已经落盘后：

| include | 目标时间 |
| --- | ---: |
| `enumeration` | `<1 s` |
| `module` | `<1 s` |
| `module,enumeration` | `<1 s` |
| `message` | `15–45 s` |
| `parameter_class` | `10–30 s` |
| `parameter_class,enumeration` | `10–30 s` |
| 全部四类 | `30–90 s` |

记录分阶段耗时，而不只记录总耗时。

当前全量 Tree 本身约 `127.778 s`，不计入 Catalog 已落盘后的目标时间。

---

## 5. include 执行矩阵

| include | 本地 Tree | Project Live | Module Live | 输出 |
| --- | --- | --- | --- | --- |
| `enumeration` | Enum | 否 | 否 | Enum |
| `module` | Module | 否 | 否 | Module |
| `message` | Module identity | 否 | 是 | Message |
| `parameter_class` | Project/Class identity | 是 | 否 | Parameter Class |
| `parameter_class,enumeration` | Project/Class/Enum | 是 | 否 | Parameter Class、Enum、Parameter-Enum edge |
| `module,message,enumeration` | Module/Enum | 否 | 是 | Module、Message、Enum、Message-Enum edge |
| 全部四类 | Project/Class/Module/Enum | 是 | 是 | 全部对象和关系 |

原则：未 include 的对象不输出；非依赖扫描不执行。

## 6. 推荐提交切片

不要一次提交全部实现。建议按以下顺序拆分：

### Slice A：合同和 Tree loader

```text
schema
types
sourceTreeResultId lookup
full Tree validation
local Enum/Module extraction
unit tests
```

可独立验收：Enum/Module Catalog 全程不访问 ASCET。

### Slice B：Artifact writer

```text
catalog resultId
NDJSON writer
summary/meta
include-dependent files
atomic publish
unit tests
```

### Slice C：C# Project/Parameter pipeline

```text
operation + DTO
Project Complex
Class-only closure
Parameter evidence
relations
non-Live tests
```

### Slice D：C# Module/Message pipeline

```text
unique Module scan
Message classification
Message identity
Enum relation
non-Live tests
```

### Slice E：集成与 Live benchmark

```text
TS orchestration
one-session Live call
all include combinations
954 Parameter baseline comparison
performance report
```

每个切片完成代码修改后执行 `npm run check`。不自动 commit。

## 7. 工期预估

在 ASCET Live 环境稳定、现有 Bridge/CLI 不需要额外重构的前提下：

| 工作 | 预估 |
| --- | ---: |
| Slice A | 0.5–1 天 |
| Slice B | 0.5–1 天 |
| Slice C | 1–2 天 |
| Slice D | 1–1.5 天 |
| Slice E | 0.5–1 天 |
| 合计 | 3.5–6.5 天 |

不包含：

- `get_tree` 当前约 127 秒的性能优化。
- ASCET ToolAPI 不稳定导致的环境排查。
- 新增 SQLite/P0 常驻索引。
- Message 全递归模式。

## 8. 完成定义

以下条件全部满足才算完成：

### 合同

- [x] `ascet_get action="database_catalog"` 可用。
- [x] `include` 必填并真正控制扫描和输出。
- [x] 不完整 Tree 被拒绝。
- [x] 现有 `get_tree` 合同未改变。

### 正确性

- [x] Module 按 OID 去重。
- [x] Parameter Class 由 Project root + Class closure + evidence 判定。
- [x] `Methods=0` 不被单独当作充分条件。
- [x] Message kind 正确识别。
- [x] Enum usage 区分未扫描、未使用和已使用。

### 性能

- [x] Enum/Module 本地请求不连接 ASCET。
- [x] Live Catalog 一次请求最多一个 CLI operation 和一个 ToolAPI Session。
- [x] 全类型 Catalog 在已落盘 Tree 后达到 30–90 秒目标，或有明确瓶颈报告。

### Artifact

- [x] 每次请求有独立 Catalog resultId。
- [x] 文件按 include 生成。
- [x] Summary/Meta 完整记录 lineage、coverage、counts、timings、warnings、failures。
- [x] NDJSON 可被 grep/find/read 直接消费。

### 验证

- [x] 新增单元测试通过。
- [x] `npm run check` 无 error、warning、info。
- [x] 全部 include 组合完成串行 Live 测试。
- [x] Parameter Class 与约 954 基线完成差异分析。
