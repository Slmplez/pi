# ASCET Engineering Prompt、Skill 与 Tool 最终优化方案

日期：2026-08-09
状态：Final Design

## 1. 目标

本方案用于在大型 ASCET Database 中快速、正确地完成以下任务：

- 从模糊功能需求定位 Core Package；
- 从 Customer Project、Package 或 Class path 定位真实修改对象；
- 从 Project 自顶向下展开至目标 Class、BDE、Method 和 ESDL；
- 理解接口、Signal Flow、当前代码、Elements 和 Parameters 后形成完整实现方案再修改；
- 将完整实现方案拆分为可执行、可追踪的细粒度 Todo；
- 快速编写或修改 ESDL；
- 正确配置 Element、Parameter 和 Dependency；
- 通过 Preflight 检查计划后执行真实写入；
- 将写入验证完全交给 `ascet_edit` Runtime 自动完成。

最终标准流程：

```text
定位正确对象
→ 理解 Project、Signal Flow、代码和 Elements
→ 冻结 Scope 与修改层
→ 输出完整实现方案
→ 使用 todolist 工具维护细粒度执行计划
→ 用户确认需要确认的设计和写入范围
→ Preflight
→ executeWrite=true
→ ascet_edit 成功返回
→ 完成
```

`ascet_edit` 的真实写入会在 Runtime 内部自动完成 action-specific verify/readback。Agent 不调用独立验证 Tool，也不为了证明写入成功而执行额外读取。

---

## 2. 最终分层架构

```text
System Prompt
  最小化路由、Scope 和安全边界
        ↓
ascet-engineering Skill
  完整 ASCET 工程 Workflow
        ↓
Skill References
  按任务加载定位、ESDL、Elements、Parameter 等规则
        ↓
Tool Action Descriptor
  当前单步 Action 的准确调用方式
        ↓
Schema / Runtime
  字段校验、Preflight、真实写入、自动验证和串行调度
```

职责边界：

| 层 | 负责 | 不负责 |
|---|---|---|
| System Prompt | 触发 Skill、Scope、安全门、禁止错误写入 | 完整工程流程和参数矩阵 |
| Skill | 定位、Ownership、Signal Flow、完整实现方案、todolist 工具规划、ESDL、Elements、Parameters、写入顺序 | Tool schema 细节 |
| Skill Reference | 按领域保存详细规则 | 全量常驻上下文 |
| Tool Prompt | 当前单步如何正确调用 | 判断整个需求修改哪一层 |
| Runtime | Schema、Preflight、真实写入、自动验证、锁和调度 | 替 Agent 判断工程 Ownership |

核心原则：

> System Prompt 决定必须遵守什么；Skill 决定任务如何完成；Tool Prompt 决定当前一步如何调用；Runtime 强制执行写入和自动验证。

---

## 3. Todolist 工具调用与完整实现方案

这里包含两个聚焦要求：

1. 非简单 ASCET 任务调用 todolist/plan 工具时，任务条目不能只有 1～2 条模糊描述；
2. 在 Preflight 前，必须先向用户给出可审查的完整工程实现方案。

这不是两套 Todo、两个额外状态或独立交付流程。Todolist 工具只用于跟踪当前任务执行，完整实现方案用于说明最终准备如何修改 ASCET。

### 3.1 Todolist 工具调用规则

非简单任务应在开始实质分析时调用 todolist/plan 工具，并根据实际工作内容生成足够具体的任务条目。禁止只生成：

```text
1. 分析需求
2. 修改代码
```

条目数不设硬性下限，按任务复杂度控制：

| 任务类型 | 建议粒度 |
|---|---|
| Exact target 的单一读取或单字段操作 | 1～2 条即可 |
| 常规 ESDL/Element 修改 | 通常 3～5 条 |
| 跨 Component、Signal Flow、Parameter chain 或多 Project | 围绕关键里程碑和真实依赖展开，通常 4～6 条；确有独立写入单元时再增加 |

重点是覆盖关键决策和执行边界，不按每个对象、每次读取或每个 Tool 调用机械拆项。每条必须：

- 对应一个可执行、可判断完成的动作；
- 指明当前阶段或对象，例如 Project 定位、Signal Flow、Method、Element、Parameter、Dependency 或 Preflight；
- 体现关键依赖顺序；
- 避免把多个不同对象压缩为“实施修改”；
- 至多一个条目处于 `in_progress`；
- 完成后及时更新状态；
- Scope、目标或设计发生实质变化时更新现有计划。

标准 ASCET 修改任务的 todolist 工具调用通常覆盖 3～5 个关键里程碑：

```text
1. 确认 Scope、目标对象和成功标准
2. 读取并理解 Signal Flow、当前实现、Elements 和 Parameters
3. 形成完整工程实现方案并确认关键决策
4. 执行必要的 Preflight 和已授权写入
5. 汇报完成范围、未修改对象和风险
```

可以合并相邻步骤。只有存在明确先后依赖、不同授权点或独立写入单元时才继续拆分，例如 Parameter Provider、Imported/Local、Dependency 与 ESDL 分别需要独立操作。不要把每次读取或每个 Tool 调用都变成一条 Todo。

### 3.2 完整工程实现方案

在 `CHANGE_READY` 进入 `PREFLIGHTED` 前，Agent 必须先给出针对当前 ASCET 对象的完整实现方案。方案不能只是“修改代码并增加参数”。

至少包含：

| 区块 | 必须说明 |
|---|---|
| 需求与成功标准 | 输入条件、目标行为、输出、边界行为、安全默认和不修改范围 |
| Scope 与 Ownership | `integrationScope`/`featureScope`、Project/Package/Component、修改层、选择原因和排除对象 |
| Signal Flow 与复用 | 现有 Signal 的 source/transform/consumer、复用点、新 Signal 的必要性、公共接口影响 |
| ESDL 实现 | 目标 Method/process、Signature 变化、拟写 ESDL 代码或精确 patch、状态、默认值、异常分支和执行顺序 |
| Element 清单 | 新建/修改/复用对象及 name、scope、kind、model type、unit、formula、range、initial value、implementation 决策 |
| Parameter 清单 | P_/C_ 名称、Provider、Imported/Exported/Local 关系、具体值或来源、type、unit、range、initial、constant/calibration、implementation 和 dependency |
| Dependency 与 Variant | formals、explicit mappings、dependency 方向、DataVariant/variantPolicy 和兼容约束 |
| 写入计划 | Action、exact target、Preflight/Write 顺序和需要用户确认的步骤 |
| 风险与假设 | 未知事实、业务值来源、跨客户影响、接口兼容性和待确认决策 |

建议输出模板：

```text
实施方案

1. Scope
- scopeMode:
- target Project/Package/Component:
- modification layer and reason:
- excluded scope:

2. Signal 和接口
- reused signals/elements/methods:
- new or changed signals:
- source → transform → consumer:
- public-interface impact:

3. ESDL
- target method/process:
- signature change:
- proposed ESDL code or patch:
- defaults, state, limits and boundary behavior:
- execution order:

4. Elements 和 Parameters
- reused objects:
- new/modified elements:
- provider exported P_:
- consumer imported P_:
- consumer local C_:
- type/unit/formula/range/initial/calibration/constant/implementation:
- parameter value or source:
- dependency formals/mappings/variants:
- ESDL/BDE usage point:

5. Write order
- element/dependency/signature/code actions:
- Preflight order:
- executeWrite order:

6. Assumptions and decisions
- confirmed facts:
- user decisions required:
- risks:
```

当 Method signature、当前代码和相关 Elements 已读取完整时，方案必须给出可直接进入 Preflight 的拟写 ESDL code 或明确 patch，不能只有高层伪代码。

如果证据不足，可以先列出精确伪代码和 `blockingUnknowns`，继续读取并补全；`blockingUnknowns` 未清空前不得进入 Preflight。

新建或修改 Parameter 时，方案必须给出实际参数内容，至少包括：

```text
name and role
owner component
scope and parameter kind
model type and unit
formula if applicable
physical or implementation range
initial/default value
calibration or constant role
implementation choice
value or source rationale
dependency formals and mappings
variant policy
ESDL/BDE usage point
```

业务值尚未由用户、现有 Parameter、Formula、Requirement 或 Database evidence 给出时，必须列为用户决策点，不能自行生成一个看似合理的阈值。

不涉及 ESDL、Parameter、Dependency 或新 Signal 的小修改，对应区块写明 `not applicable` 及原因，而不是静默省略。

### 3.3 Signal 和对象复用优先

完整方案必须先说明相关的：

```text
source → transform → consumer
```

并检查是否可以复用现有：

- Imported/Exported Signal；
- Local Element；
- Method output 或 Return Method；
- Parameter、Enum、Formula；
- BDE connection 或现有 Package interface。

复用结论应列出 exact object、owner、scope、type/unit 和使用点。只有现有对象的语义、scope、type、unit、生命周期或 Ownership 不适合时才新建，并说明不复用原因。不得只因为新建对象更直接，就复制一个已有 Signal 或 Parameter。

### 3.4 字面量与“魔法数字”

此前绝对化的 magic-number 约束过于严苛，替换为按语义和配置职责判断：

> 禁止无语义、不可追溯、会影响业务、标定、安全或客户差异，却未命名或未说明来源的业务字面量；不强制把所有数值都创建成 Parameter 或 Constant。

可以直接作为局部 ESDL literal 使用：

- `0`、`1`、`-1` 等基础初始化值或算法控制值；
- 明确的索引、计数边界、位掩码和 Enum literal；
- 数学恒等式、明确单位换算或协议固定值；
- 数据类型或现有接口语义直接决定的饱和边界；
- 只在一个局部表达式使用、不会成为标定点或客户差异点，且语义清晰的值；
- 已有命名 Element、Parameter、Enum 或 Constant 的引用。

应优先复用或创建命名 Element、Parameter、Enum 或 Local Constant：

- 客户可标定的阈值、时间、限幅、偏置、增益和默认业务值；
- 可能随 Customer、Variant、车型或 Package 配置变化的值；
- 多个 Method/Component 复用的业务值；
- 安全边界、诊断阈值或公共功能行为值；
- 无法从变量名、Method 名或紧邻说明理解含义的值。

决策顺序：

```text
值是否来自需求、标定、客户差异、安全边界或公共业务规则？
  是 → 优先复用/创建 Parameter、Enum 或命名 Element
  否 → 是否跨位置复用或难以理解？
       是 → 使用命名 Local Element；属于模型配置数据时使用 C_ Local Parameter，或明确说明来源
       否 → 允许局部 ESDL literal
```

不得因为普通局部字面量而无必要地扩展 P_/C_ Parameter chain 或创建 Provider Class。

---

## 4. 写入与自动验证模型

### 4.1 Agent 可见流程

```text
ascet_edit Preflight
→ 检查 target、changes、variant、mapping 和影响范围
→ 使用相同的已批准变更执行 executeWrite=true
→ Tool 成功返回
→ 写入完成
```

### 4.2 Runtime 内部流程

```text
执行 mutation
→ 自动 action-specific readback/verify
→ 生成成功或失败结果
→ 必要时失效相关 stored observations
```

自动验证是 Runtime 内部能力，不是 Agent Workflow 中的第二个 Tool 步骤。

### 4.3 成功与失败语义

```text
ascet_edit executeWrite=true 成功返回
  → 接受写入完成
  → 不调用独立验证 Tool
  → 不执行冗余验证读取

ascet_edit 返回失败
  → 报告失败
  → 不声明完成
  → 不盲目重复写入
```

只有以下情况允许后续读取：

- 下一步工程修改需要最新 Signature、Code、Element 或 Dependency 数据；
- Tool 返回失败，需要确认当前实际状态；
- 用户明确要求查看写入后的具体内容；
- 原 stored observation 已失效，需要继续分析结构。

这些读取属于后续工程数据获取，不属于固定写入验证步骤。

### 4.4 参数边界

模型公开 schema 不提供：

```text
verifyReadback
```

Runtime 内部可以继续强制：

```text
verifyReadback: true
--verify-readback
```

模型不决定是否验证；Runtime 始终自动验证。

---

## 5. Scope 模型

所有修改任务在 Preflight 前必须明确以下两种 Scope 之一。

### 5.1 `integrationScope`

适用于：

- Customer Project 适配；
- Variant；
- Formula；
- 客户接口映射；
- 调度与装配；
- 客户专属参数；
- Customer wrapper。

分析方向：

```text
Customer Project
→ Formula / assembly / Module instances
→ Customer interfaces
→ Customer wrapper
→ Package join point
→ Package Class
```

主要目标：

> 尽可能在客户集成层完成需求，避免不必要地修改公共功能包。

### 5.2 `featureScope`

适用于：

- Core Package 功能；
- 公共算法；
- StateMachine；
- 公共接口；
- 公共 Parameter；
- 跨客户缺陷；
- Package 内部行为。

分析方向：

```text
Core Package
→ Module / Class / StateMachine
→ Method / BDE / Parameter Provider
→ Public interface
→ Representative Customer Projects
```

主要目标：

> 验证公共行为和客户兼容性，避免破坏现有 Project。

### 5.3 Scope 对照

| 项目 | 客户项目适配 | 功能包修改 |
|---|---|---|
| 起始范围 | Customer/Cust Project | Package/Feature |
| Scope | `integrationScope` | `featureScope` |
| 分析方向 | 客户层向功能包 | 功能包内部向客户影响 |
| 主要对象 | Project、Formula、装配、客户接口 | Module、Class、StateMachine、Method、BDE |
| 常见修改 | Variant、映射、调度、客户参数 | 算法、状态机、公共功能 |
| 影响范围 | 通常单个客户 | 可能影响多个客户 |
| 风险重点 | 避免污染通用功能包 | 避免破坏公共接口和现有客户 |
| 验证重点 | 客户装配和参数是否正确 | 算法、接口和已知客户兼容性 |

两种 Scope 同时合理时，Agent 必须保留候选并询问用户，不得自行选择修改层或执行 Preflight。

---

## 6. 用户输入路由

### 6.1 模糊需求，没有 Class 或 Project path

默认先根据功能语义定位 Core Package，客户名不是必要条件。

```text
功能 / 行为 / Signal / Parameter 语义
→ 候选 Core Package
→ Package public interface
→ Class / BDE / Parameter Provider
→ Candidate 或 representative Projects
→ Project → Package → Class 正向验证
→ 确定 integrationScope 或 featureScope
```

规则：

- 客户名仅用于后续 Project、Variant 或装配消歧；
- 不先猜客户 Project；
- 不执行全库名称搜索并修改第一个匹配对象；
- Package 按需展开，不一次展开整个 Database。

### 6.2 用户给出 Customer Project

```text
Project
→ Formula / assembly / Module instances
→ Customer interfaces / Parameters
→ Customer wrapper
→ Package join point
→ Package Class
→ BDE / Method / ESDL
```

主要判断：

- 能否只在客户集成层完成适配；
- 是否真的需要修改公共 Package；
- Variant、mapping、调度和客户参数应放在哪一层。

### 6.3 用户给出 Core Package

```text
Package
→ Public interface
→ Module / Class / StateMachine
→ Method / BDE / Parameter Provider
→ Public behavior
→ Representative Projects
→ Customer compatibility impact
```

主要判断：

- 需求是否具有跨客户公共语义；
- 公共接口是否变化；
- 是否影响多个 Customer Projects；
- 是否可以在客户层完成而无需修改 Package。

### 6.4 用户给出 Exact Class path

Class path 是定位锚点，不是 Scope 结论。

```text
Exact Class / OID
→ 读取 Component summary、surface 和正向 references
→ 判断 ownerRole
→ Class role × requirement intent 形成 Scope 候选
→ 在完整 stored Project/Tree/Catalog artifact 中查找候选 Project
→ 选择 Project
→ Project → wrapper → Package → Class 正向验证
→ 理解 Signal Flow 和当前代码
→ 冻结 Scope 和修改点
```

Class Role 判断：

| Class 角色 | 需求意图 | 推荐方向 |
|---|---|---|
| Customer wrapper | 单客户适配 | `integrationScope` |
| Customer Class | 单客户映射或装配 | `integrationScope` |
| Customer Class | 跨客户公共缺陷 | 回到 Core Package 分析 |
| Core Package Class | 公共算法或接口 | `featureScope` |
| Core Package Class | 单客户差异 | 定位 Customer wrapper |
| 角色或需求不明确 | 两种 Scope 都合理 | 询问用户 |

---

## 7. Database 大型化与证据规则

### 7.1 有界探索

- 先使用用户路径、功能语义或已知范围形成候选；
- `tree` 只用于必要的有界结构发现，不是所有任务永远第一步；
- 已知 exact path 或 OID 时直接读取精确对象；
- Package、Project 和 Component 按需展开；
- 不执行无界 live Database scan。

### 7.2 正向引用和反向候选发现

`component_refs` 和 `dbitem_refs` 只提供 outgoing references。

反向 Class/Package → Project 定位使用：

```text
完整 stored Tree / Catalog / Project closure / export
→ find / grep / Select-String
→ Candidate Projects
→ Project → Class exact live validation
```

规则：

- grep 命中只是候选；
- grep 不能单独证明 identity、ownership 或 editability；
- 多个 Project 命中时按 Customer、Variant 和装配范围消歧；
- 不选择第一个同名结果。

### 7.3 Partial 和 truncated

- 必须检查 observation 的 coverage 和 truncated 状态；
- Partial/truncated artifact 未命中不能证明对象未被使用；
- Partial Tree 不能作为完整 Database 结论；
- 写入后受影响的 stored observations 视为可能失效。

### 7.4 根目录泛化

常见根目录只能作为启发式，例如 Customer、Library、Package、Project 或 Platform 类目录。

Skill 不硬编码：

- `CN_Libary`；
- `Customer`；
- `PlatformLibrary*`；
- `PlatformProjects*`；
- 具体 Customer、Project 或 Component 名称。

如果常见根目录不存在，使用对象类型、Project 结构、Component 引用和接口语义进行结构化 fallback。

---

## 8. Project 到目标 ESDL 和 Signal Flow

该 Workflow 属于 Skill Reference，不进入 System Prompt 或 Tool Prompt。

```text
Project tree
→ Formula / assembly / Module instance
→ Customer interface
→ Customer wrapper
→ Package join point
→ Component references
→ BDE / Diagram
→ Signal source / transform / consumer
→ Method call
→ Method signature
→ Current ESDL body
→ Related Elements
→ Exact Element metadata
→ Modification point
```

执行步骤：

1. 有界读取 Project 结构；
2. 找到 Formula、Module instance、装配入口或调度关系；
3. 找到 Customer wrapper 与 Package join point；
4. 展开目标链路上的正向 Component references；
5. 读取 BDE summary 或完整 Diagram；
6. 确定 Signal source、transform、consumer 和 Method call；
7. 读取 Method signature；
8. 读取完整当前 ESDL；
9. 使用 `elements` 建立名称和 scope 目录；
10. 对参与修改的 Element 使用精确读取；
11. 判断真正修改点和 Ownership；
12. 冻结 Scope 后才进入设计与 Preflight。

注意：

- `bde_edges=0` 不能证明没有 Diagram；
- BDE Component 不调用 `read_code`；
- `kind=Class` 不能单独判断 ESDL 或 BDE surface；
- Signal 名称不能单独决定修改对象。

---

## 9. ESDL Fast Path

只有以下条件全部满足才能使用：

```text
Project/Class context 已验证
Scope 已冻结
Modification layer 已确定
Method 已存在或创建计划明确
Method signature 已读取
Current ESDL 已读取
Relevant Elements 已确认
Signal Flow 已理解
blockingUnknowns 为空
```

推荐顺序：

```text
1. Element Preflight / Write（需要时）
2. Dependency Preflight / Write（需要时）
3. Method shell Preflight / Write（需要时）
4. Method signature Preflight / Write（需要时）
5. ESDL body Preflight / Write
```

Method 规则：

- Method/process signature 与 ESDL body 是不同结构；
- `create_method` 只创建 Method/process shell；
- Argument 和 Return 使用 Signature Action；
- `set_method_signature` 只处理 return type 和 arguments；
- `set_method_code` 只处理 ESDL body；
- 不在 ESDL body 中伪造 Argument、Return 或 Element declaration；
- 不创建同名 overload；
- Return Method 必须有一个明确 return value，并覆盖所有路径。

每个真实写入成功后可直接进入下一步骤。只有下一步骤需要新数据时才执行读取。

---

## 10. Elements Fast Path

### 10.1 `elements` 的职责

`ascet_get.elements` 只用于：

- Element 名称；
- owner/path/OID；
- scope；
- 初步 kind 目录；
- 候选筛选。

不能用它决定：

- 完整 model type；
- unit；
- formula；
- physical range；
- implementation range；
- calibration；
- dependency；
- implementation configuration。

精确配置必须使用 `read_element` 或对应精确读取 Action。

### 10.2 Existing Element

修改 Existing Element 时：

```text
只发送需要改变的 patch
```

不得根据默认值覆盖未读取字段。

### 10.3 多 Element 修改

同一个 Component 的多个 Element 使用一次：

```text
apply_element_spec plan
→ 检查完整计划
→ apply_element_spec commit/write
```

避免逐 Element 重复调用。

### 10.4 Range

每个 Element 最多选择一个 range source：

```text
Physical Range
或
Implementation Range
```

不得同时配置两者。

---

## 11. Parameter 命名与 Ownership

### 11.1 新参数命名

```text
Provider Exported Parameter: P_<Name>
Consumer Imported Parameter: P_<Name>
Consumer Local Parameter:    C_<Name>
```

示例：

```text
Provider:
  P_Threshold

Consumer:
  Imported P_Threshold
  Local C_Threshold
```

### 11.2 Dependency Chain

```text
C_Threshold
→ Imported P_Threshold
→ Exported P_Threshold
→ Provider Component
```

规则：

- Imported 和 Exported 必须完全同名；
- Consumer Local 使用 `C_`；
- Local dependency formal 可以与 Imported 名称不同，但必须使用显式 mapping；
- Existing legacy Parameter 不自动重命名；
- 名称不能替代 kind、scope、calibration 和 implementation 的 live evidence。

### 11.3 Provider Placement

| 参数语义 | Provider 位置 |
|---|---|
| 单客户专属参数 | 已验证的 Customer/Project owner layer |
| 跨客户公共功能参数 | Core Package 的对应 Provider Class |
| 可标定参数 | 对应 Calibration Provider |
| 固定功能常量 | 对应 Constant Provider |
| Ownership 不明确 | 不创建，继续定位 |

Generic Provider 必须有跨客户语义证据。不能因为发现已有公共 Parameter Class，就自动把客户专属值放入其中。

---

## 12. Preflight 与真实写入

### 12.1 Preflight

Mutation Action 缺少 `executeWrite:true` 时只生成 Preflight。

```text
ascet_edit({
  action: "set_method_code",
  componentPath,
  methodName,
  code
})
```

Preflight 检查：

- exact target；
- Action；
- changes；
- create/update/delete 类型；
- DataVariant；
- dependency mapping；
- 是否超出 frozen Scope；
- 是否影响非目标层；
- 是否存在 blocking unknowns。

### 12.2 真实写入

```text
ascet_edit({
  action: "set_method_code",
  componentPath,
  methodName,
  code,
  executeWrite: true
})
```

要求：

- 使用已经检查并批准的变更；
- 不在执行阶段扩大 Scope；
- 不增加模型侧验证参数；
- Tool 成功返回即完成；
- Tool 失败时停止，不盲目重试。

### 12.3 Plan/Commit Action

对于具有持久化计划的 Action：

```text
mode=plan
→ 检查 planId、fingerprint、target 和 changes
→ mode=commit + 原 planId
→ 成功完成
```

Commit 使用原 planId，不重新生成参数或扩大变更。

---

## 13. Tool Prompt 最终设计

### 13.1 唯一规范源

Tool Action Prompt 的唯一规范来源：

```text
packages/ascet-extension/src/tools/actions/descriptors.ts
```

Family Prompt 只保留：

```text
短 promptSnippet
+ descriptor-generated selected Action rules
```

停止同时注入：

```text
手写 family guidelines
+ descriptor guidelines
+ legacy instruction arrays
```

### 13.2 Descriptor 内容

每个 Descriptor 只回答：

1. Action 做什么；
2. 什么时候调用；
3. 需要什么 exact target；
4. 返回结果能证明什么；
5. Preflight 和真实写入如何区分。

Descriptor 不负责：

- Customer/Package Scope 判断；
- Project-to-Class Workflow；
- Parameter ownership；
- 完整 ESDL 设计；
- 跨多个 Tool 的工程流程。

### 13.3 关键 Action 规则

#### `tree`

- 用于有界结构发现；
- 不是所有任务永远第一步；
- exact path/OID 已知时可直接读取目标。

#### `elements`

- 只提供 identity/scope directory；
- 精确配置使用 `read_element`。

#### `component_refs` / `dbitem_refs`

- 仅 outgoing references；
- 不能作为 reverse-reference API。

#### `bde_edges`

- `0` 不证明不存在 Diagram。

#### `ascet_edit`

```text
- Without executeWrite, mutation actions perform Preflight.
- With executeWrite=true, the approved mutation is executed.
- Verification is automatic and internal.
- A successful executed call completes the write.
- Do not add a verifyReadback field.
- Do not call a separate verification Tool.
- If execution fails, stop instead of blindly retrying.
```

### 13.4 Profile Prompt

Profile Prompt 只描述 Profile 增量能力：

- `advanced-read`：启用 Diagram 等深读；
- `write-preflight`：启用 mutation Preflight 和真实写入；
- `component-edit`：启用 editability 操作；
- `ops`：启用 scheduler 和 recovery。

Profile 不重复通用工程规则。

---

## 14. System Prompt 开发方案

修改：

```text
packages/ascet-extension/src/ascet-coding-policy.ts
packages/ascet-extension/src/agent-routing.ts
```

目标：

- 1000～1500 字符；
- 不超过 15 条顶层规则；
- 保留 `buildAscetCodingPolicyPrompt()` API；
- 保留 `AscetCodingPolicyOptions`；
- 保留 Prompt 只追加一次的行为；
- 删除完整 Parameter、Dependency、Method、Enum 和 Implementation 矩阵；
- 删除绝对化的 magic-number 禁止规则；
- 删除独立验证 Workflow；
- 明确 ASCET 工程任务必须读取 `ascet-engineering`；
- 对非简单任务要求 todolist 工具生成足够具体的任务条目；
- 在 Preflight 前要求输出完整工程实现方案。

System Prompt 最终只回答：

```text
何时触发 Skill
如何冻结 Scope
哪些证据不足
todolist 工具何时调用以及条目如何保持清晰
完整工程方案何时必须先展示
什么时候允许 Preflight
什么时候允许真实写入
成功和失败如何结束
```

---

## 15. Skill 开发方案

新增：

```text
packages/ascet-extension/skills/ascet-engineering/
├── SKILL.md
├── agents/
│   └── openai.yaml
└── references/
    ├── scope-resolution-and-ownership.md
    ├── database-root-discovery.md
    ├── customer-integration-workflow.md
    ├── feature-package-workflow.md
    ├── class-path-project-context.md
    ├── project-to-esdl-signal-flow.md
    ├── esdl-fast-path.md
    ├── elements-fast-path.md
    ├── parameter-naming.md
    ├── parameter-provider-placement.md
    ├── dependency-advanced-path.md
    ├── bde-and-surface-routing.md
    ├── task-planning-and-implementation-plan.md
    ├── esdl-design-and-signal-reuse.md
    ├── esdl-literals-and-configuration-values.md
    ├── tool-recipes.md
    └── write-execution.md
```

### 15.1 `SKILL.md`

控制在约 60～80 行，只包含：

1. 触发范围；
2. 输入分类；
3. Scope Resolution；
4. Evidence 状态；
5. Reference 加载表；
6. todolist 工具调用和条目粒度；
7. 完整工程实现方案；
8. Write readiness；
9. Preflight 与真实写入；
10. 停止并询问用户的条件。

### 15.2 Reference 加载

| 任务 | References |
|---|---|
| 模糊需求 | scope、root discovery、feature workflow |
| Customer Project | customer workflow、project signal flow |
| Exact Class | class context、project signal flow |
| ESDL 修改 | esdl fast path、surface routing、esdl design and signal reuse、literals and configuration values |
| Element 配置 | elements fast path |
| Parameter | naming、provider placement |
| Dependency | dependency advanced path |
| 任务规划/完整方案 | task planning and implementation plan、esdl design and signal reuse、tool recipes |
| 写入 | write execution |

### 15.3 Skill 状态机

```text
DISCOVER
→ CANDIDATES
→ CONTEXT_VALIDATED
→ SCOPE_FROZEN
→ CHANGE_READY
→ PREFLIGHTED
→ WRITTEN
```

进入 `WRITTEN` 的条件：

```text
ascet_edit executeWrite=true 成功返回
```

---

## 16. Agent 移除方案

删除：

```text
packages/ascet-extension/agents/ascet-implementation.md
```

不再将该 Agent 改造成继承 Skill 的薄封装。ASCET 工程任务直接由 System Prompt 路由到 `ascet-engineering` Skill，再由 Skill 按需加载 References 并调用 Tool。

同步处理：

- 删除 `ascet-implementation.md` 的注册、资源发现、打包和测试引用；
- 如果 `packages/ascet-extension/agents/` 删除该文件后为空，则删除空目录；
- 不新增替代 Agent、兼容 wrapper 或重定向文件；
- Agent 通用行为约束继续由 System Prompt 和 `ascet-engineering` Skill 提供；
- 发布包中只验证 Skill 可发现，并验证已删除的 Agent 不再被打包。

---

## 17. 独立验证 Tool 移除

删除 standalone Tool 和仅为它服务的 wrapper：

```text
packages/ascet-extension/src/tools/verify.ts
packages/ascet-extension/src/tools/verify.test.ts
packages/ascet-extension/src/tools/verify/
packages/ascet-extension/src/verify-readback.ts
packages/ascet-extension/src/verify-readback.test.ts
```

从以下位置删除注册、Descriptor、Profile、Prompt 和测试引用：

```text
packages/ascet-extension/src/tools/registry.ts
packages/ascet-extension/src/tools/actions/catalog.ts
packages/ascet-extension/src/tools/actions/descriptors.ts
packages/ascet-extension/src/tools/actions/gates.ts
packages/ascet-extension/src/tools/exposure/profiles.ts
packages/ascet-extension/src/tools/exposure/profiled-tools.ts
```

必须保留自动验证内部实现：

```text
packages/ascet-extension/src/edit/verification.ts
packages/ascet-extension/src/edit/verification.test.ts
packages/ascet-extension/src/edit/service.ts
packages/ascet-extension/src/edit/service-impact.test.ts
```

必须保留 Runtime 内部：

```text
verifyReadback: true
--verify-readback
```

但从模型公开 schema 和 Tool Prompt 中移除 `verifyReadback`。

---

## 18. Dependency Chain 更新

`configure_parameter_dependency_chain` 的模型输入不再要求：

```text
verifyReadback=true
```

模型只提供：

- Provider Exported Parameter；
- Consumer Imported Parameter；
- Consumer Local Parameter；
- dependency formals；
- explicit mappings；
- variantPolicy；
- Plan 或 Commit 信息。

Provider、Imported、Local、Dependency 和 rollback 的真实写入均由 Runtime 内部自动验证。

Prompt 从：

```text
variantPolicy and verifyReadback=true are mandatory.
```

改为：

```text
variantPolicy is mandatory.
Executed stages and rollback writes use automatic internal verification.
```

---

## 19. Package 与资源发现

修改：

```text
packages/ascet-extension/package.json
packages/ascet-extension/scripts/verify-packed-assets.mjs
packages/ascet-extension/README.md
packages/ascet-extension/CHANGELOG.md
```

扩展包：

```json
{
  "pi": {
    "extensions": ["src/index.ts"],
    "skills": ["skills/ascet-engineering"]
  }
}
```

`files` 增加：

```json
[
  "skills/ascet-engineering"
]
```

`verify-packed-assets.mjs` 增加检查：

- Skill `SKILL.md` 存在；
- Skill References 完整；
- Skill 的 `agents/openai.yaml` 存在；
- package manifest 引用路径有效；
- 发布包中不存在 `agents/ascet-implementation.md`。

---

## 20. 测试驱动开发阶段

### Phase 0：基线与失败测试

先增加或更新测试：

```text
packages/ascet-extension/src/agent-routing.test.ts
packages/ascet-extension/src/index.test.ts
packages/ascet-extension/src/tools/prompt.test.ts
packages/ascet-extension/src/tools/actions/catalog.test.ts
packages/ascet-extension/src/tools/actions/compact-prompt.test.ts
packages/ascet-extension/src/tools/exposure/controller.test.ts
```

建议新增：

```text
packages/ascet-extension/src/ascet-engineering-skill.test.ts
packages/ascet-extension/src/package-resources.test.ts
```

主要断言：

- System Prompt 为 1000～1500 字符；
- System Prompt 顶层规则不超过 15；
- System Prompt 包含 Skill 路由、Scope、todolist 工具规划、完整实施方案和写入安全门；
- System Prompt 不包含完整 Parameter/Dependency 矩阵；
- Skill frontmatter 和 Reference links 有效；
- `ascet-implementation.md` 已删除，且没有注册、打包或测试引用；
- Canonical Tool 和 Profile 中没有 standalone verify Tool；
- 模型 schema 不接受 `verifyReadback`；
- Runtime 真实写入内部始终启用自动验证；
- Tool Prompt 没有重复 guideline；
- Tool Prompt 默认体积相比基线降低至少 70%；
- 模糊 ESDL/Parameter 需求在 Preflight 前输出完整实现方案；
- 有完整 evidence 时方案包含具体拟写 ESDL，而非只有伪代码；
- 新建 Parameter 方案包含名称、位置、值/来源、type、unit、range、initial、calibration/constant、implementation、dependency 和使用点；
- todolist 工具条目数与复杂度匹配；常规任务通常 3～5 条，避免含糊的“分析/修改”，也避免过度拆分；
- 字面量规则允许局部有语义 literal，不强制无必要的 Parameter chain。

### Phase 1：创建 Skill

实现 Scope、Root Discovery、Project、Class、Signal Flow、todolist 工具规划、完整工程方案、Signal reuse、ESDL、Elements、Parameter、Dependency 和 Write References。

### Phase 2：精简 System Prompt

只有 Skill 测试通过后，才从 System Prompt 删除详细工程规则。

### Phase 3：移除 Agent

删除 `agents/ascet-implementation.md`，清理注册、资源发现、打包和测试引用，不保留薄封装或兼容文件。

### Phase 4：规范 Tool Prompt

以 descriptors 为唯一规范源，停止 legacy instruction 重复注入。

### Phase 5：移除 Standalone Verify Tool

删除 Tool、注册、Descriptor、Profile、Prompt、Agent 工具声明和测试引用。

### Phase 6：隐藏自动验证参数

从模型公开 schema 移除 `verifyReadback`，Runtime 内部继续强制启用。

### Phase 7：Package 与隔离安装

验证 Skill 资源进入 npm package 并能从仓库外安装发现，同时验证已删除的 `ascet-implementation` Agent 不再进入发布包。

### Phase 8：ASCET Live 验收

所有 ToolAPI 操作串行执行。

---

## 21. 测试与检查命令

定向测试：

```powershell
npx tsx --test `
  packages/ascet-extension/src/agent-routing.test.ts `
  packages/ascet-extension/src/index.test.ts `
  packages/ascet-extension/src/ascet-engineering-skill.test.ts `
  packages/ascet-extension/src/package-resources.test.ts `
  packages/ascet-extension/src/tools/prompt.test.ts `
  packages/ascet-extension/src/tools/actions/catalog.test.ts `
  packages/ascet-extension/src/tools/actions/compact-prompt.test.ts `
  packages/ascet-extension/src/tools/exposure/controller.test.ts
```

代码修改后：

```powershell
npm run check
```

打包验证：

```powershell
cd packages/ascet-extension
npm pack --dry-run --json --ignore-scripts
npm run verify-assets
```

不运行完整 `npm test` 或 `npm run build`，除非用户明确要求。

---

## 22. ASCET Live 验收

### 22.1 Read-only 场景

1. 模糊功能需求 → Core Package；
2. Customer Project → Package → Class → Method；
3. Exact Class → Candidate Project → 正向链验证；
4. BDE/Signal → 目标 ESDL；
5. Parameter → Provider/Consumer Ownership。

### 22.2 ESDL 写入场景

```text
读取 baseline signature/code
→ 输出 Signal reuse、ESDL、Elements 和 Parameter 的完整实现方案
→ 使用 todolist 工具按对象和写入单元更新任务条目
→ 确认设计和写入范围
→ Signature Preflight（需要时）
→ Signature executeWrite=true
→ Code Preflight
→ Code executeWrite=true
→ 成功完成
```

### 22.3 Local Parameter 场景

```text
读取 Component、现有 Elements、Parameter Class 和使用 Signal
→ 输出 C_ 的名称、type、unit、range、initial value、用途和值来源
→ 在 todolist 工具中拆分 Element plan/write 条目
→ 规划 C_ Local Parameter
→ apply_element_spec plan
→ commit/write
→ 成功完成
```

### 22.4 完整 Parameter Chain

```text
确认 Provider ownership、复用 Signal 和业务值来源
→ 输出 P_/P_/C_ 名称、内容、metadata、mapping 和 variant 方案
→ 在 todolist 工具中拆分 Provider/Imported/Local/Dependency 条目
→ Provider P_ Exported
→ Consumer P_ Imported
→ Consumer C_ Local
→ Explicit dependency mapping
→ 各 Stage plan/commit
→ 成功完成
```

### 22.5 Live 规则

- 使用明确授权的 exact target；
- 所有 ToolAPI 操作串行执行；
- Preflight 成功后才执行真实写入；
- 成功写入后直接完成；
- 测试对象需要恢复时，恢复操作本身也通过正常 Preflight/Write 完成；
- Tool 失败时停止并记录错误，不盲目重试。

---

## 23. 最终验收标准

1. System Prompt 控制在约 1000～1500 字符。
2. System Prompt 顶层规则不超过 15。
3. `ascet-engineering` 是工程 Workflow 唯一规范来源。
4. 不再提供 `ascet-implementation` Agent；System Prompt 直接路由到 Skill，且不存在薄封装、兼容 wrapper 或残留引用。
5. 模糊需求先根据功能语义定位 Core Package。
6. 客户名仅用于 Project、Variant 或装配消歧。
7. Customer Project 按 Project → Package 方向分析。
8. Core Package 按 Package → Customer impact 方向分析。
9. Class path 本身不决定 Scope。
10. Exact Class 必须补充 Candidate Project 和自顶向下正向验证。
11. 两种 Scope 同时合理时不自行选择修改层。
12. 不执行全库名称搜索并修改第一个匹配对象。
13. `component_refs` 和 `dbitem_refs` 不被当作 reverse-reference API。
14. find/grep 只用于候选发现。
15. Partial/truncated artifact 不被当作完整证据。
16. Project/Signal 请求能够沿 Component/BDE 链定位目标 ESDL。
17. `bde_edges=0` 不被解释为没有 Diagram。
18. BDE Component 不错误调用代码读取接口。
19. 写入前理解 Project chain、Signal Flow 和当前代码。
20. `elements` 只用于 identity/scope directory。
21. 精确 Element 配置使用 `read_element`。
22. Existing Element 只发送 patch。
23. 同一 Component 的多个 Element 使用一次 `apply_element_spec` plan。
24. 新建 Provider Exported Parameter 使用 `P_`。
25. 新建 Consumer Imported Parameter 与 Provider 完全同名并使用 `P_`。
26. 新建 Consumer Local Parameter 使用 `C_`。
27. Existing legacy Parameter 不自动重命名。
28. Customer-specific Provider 放在 Customer/Project owner layer。
29. Generic Provider 必须具有跨客户语义证据。
30. Dependency 使用显式 formals 和 mappings。
31. Preflight 不执行真实写入。
32. `executeWrite=true` 才执行真实写入。
33. 真实写入由 Runtime 自动验证。
34. `ascet_edit` 成功返回即完成。
35. 不存在独立验证 Tool 或独立验证 Workflow。
36. 模型不能提供 `verifyReadback`。
37. Runtime 内部继续强制自动验证。
38. 写入失败时不盲目重试。
39. Tool Prompt 只负责单步正确调用。
40. Action Descriptor 是 Tool Prompt 唯一规范源。
41. 默认 ASCET Tool Prompt 总量降低至少 70%。
42. Skill 在隔离安装后的发布包中可发现，且 `ascet-implementation` Agent 不在发布包中。
43. Todolist 工具不设硬性最低条目数；简单任务可 1～2 条，常规任务通常 3～5 条，复杂任务只按关键依赖增加。
44. Todolist 工具覆盖 Scope、分析、方案、写入等实际里程碑，不使用含糊条目，也不按每个对象或 Tool 调用机械拆分。
45. todolist 工具任务指明对象、动作、依赖和完成条件，并随目标变化更新状态。
46. 模糊或有设计影响的需求在 Preflight 前输出完整工程实现方案。
47. 有完整 evidence 时，方案包含具体拟写 ESDL code/patch，而非只有高层伪代码。
48. 新建 Parameter 方案包含 P_/C_ 名称、Provider、实际值或来源、type、unit、range、initial、calibration/constant、implementation、dependency、variant 和使用点。
49. 实现方案明确 Signal source/transform/consumer、复用对象和不复用原因。
50. 无语义且影响业务、标定或安全的字面量不直接散落在 ESDL；普通局部 literal 不被强制参数化。
51. 定向测试、`npm run check`、打包和 ASCET Live 验收全部通过。

---

## 24. 最终结论

最终工程 Workflow 为：

```text
需求分类
→ Scope Resolution
→ Project/Package/Class 正向定位
→ Signal Flow 与当前实现理解
→ Element/Parameter Ownership 与 Signal reuse 确认
→ 输出完整工程实现方案
→ 使用 todolist 工具维护足够具体的执行计划
→ 确认设计与授权范围
→ Preflight
→ executeWrite=true
→ Tool 成功返回
→ 完成
```

最终验证边界为：

```text
Agent 负责正确写入
Runtime 负责自动验证
成功返回即完成
失败返回即停止
```
