# ASCET Engineering Prompt、Skill 与 Tool 最终优化方案

日期：2026-08-09
状态：Final Design

## 1. 目标

本方案用于在大型 ASCET Database 中快速、正确地完成以下任务：

- 从模糊功能需求定位 Core Package；
- 从 Customer Project、Package 或 Class path 定位真实修改对象；
- 从 Project 自顶向下展开至目标 Class、BDE、Method 和 ESDL；
- 理解接口、Signal Flow、当前代码、Elements 和 Parameters 后再修改；
- 快速编写或修改 ESDL；
- 正确配置 Element、Parameter 和 Dependency；
- 通过 Preflight 检查计划后执行真实写入；
- 将写入验证完全交给 `ascet_edit` Runtime 自动完成。

最终标准流程：

```text
定位正确对象
→ 理解 Project、Signal Flow、代码和 Elements
→ 冻结 Scope 与修改层
→ 设计修改
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
ascet-implementation Agent
  Skill 的薄封装
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
| Skill | 定位、Ownership、Signal Flow、ESDL、Elements、Parameters、写入顺序 | Tool schema 细节 |
| Skill Reference | 按领域保存详细规则 | 全量常驻上下文 |
| Agent | 读取 Skill 并执行当前任务 | 维护另一套工程规则 |
| Tool Prompt | 当前单步如何正确调用 | 判断整个需求修改哪一层 |
| Runtime | Schema、Preflight、真实写入、自动验证、锁和调度 | 替 Agent 判断工程 Ownership |

核心原则：

> System Prompt 决定必须遵守什么；Skill 决定任务如何完成；Tool Prompt 决定当前一步如何调用；Runtime 强制执行写入和自动验证。

---

## 3. 写入与自动验证模型

### 3.1 Agent 可见流程

```text
ascet_edit Preflight
→ 检查 target、changes、variant、mapping 和影响范围
→ 使用相同的已批准变更执行 executeWrite=true
→ Tool 成功返回
→ 写入完成
```

### 3.2 Runtime 内部流程

```text
执行 mutation
→ 自动 action-specific readback/verify
→ 生成成功或失败结果
→ 必要时失效相关 stored observations
```

自动验证是 Runtime 内部能力，不是 Agent Workflow 中的第二个 Tool 步骤。

### 3.3 成功与失败语义

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

### 3.4 参数边界

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

## 4. Scope 模型

所有修改任务在 Preflight 前必须明确以下两种 Scope 之一。

### 4.1 `integrationScope`

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

### 4.2 `featureScope`

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

### 4.3 Scope 对照

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

## 5. 用户输入路由

### 5.1 模糊需求，没有 Class 或 Project path

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

### 5.2 用户给出 Customer Project

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

### 5.3 用户给出 Core Package

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

### 5.4 用户给出 Exact Class path

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

## 6. Database 大型化与证据规则

### 6.1 有界探索

- 先使用用户路径、功能语义或已知范围形成候选；
- `tree` 只用于必要的有界结构发现，不是所有任务永远第一步；
- 已知 exact path 或 OID 时直接读取精确对象；
- Package、Project 和 Component 按需展开；
- 不执行无界 live Database scan。

### 6.2 正向引用和反向候选发现

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

### 6.3 Partial 和 truncated

- 必须检查 observation 的 coverage 和 truncated 状态；
- Partial/truncated artifact 未命中不能证明对象未被使用；
- Partial Tree 不能作为完整 Database 结论；
- 写入后受影响的 stored observations 视为可能失效。

### 6.4 根目录泛化

常见根目录只能作为启发式，例如 Customer、Library、Package、Project 或 Platform 类目录。

Skill 不硬编码：

- `CN_Libary`；
- `Customer`；
- `PlatformLibrary*`；
- `PlatformProjects*`；
- 具体 Customer、Project 或 Component 名称。

如果常见根目录不存在，使用对象类型、Project 结构、Component 引用和接口语义进行结构化 fallback。

---

## 7. Project 到目标 ESDL 和 Signal Flow

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

## 8. ESDL Fast Path

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

## 9. Elements Fast Path

### 9.1 `elements` 的职责

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

### 9.2 Existing Element

修改 Existing Element 时：

```text
只发送需要改变的 patch
```

不得根据默认值覆盖未读取字段。

### 9.3 多 Element 修改

同一个 Component 的多个 Element 使用一次：

```text
apply_element_spec plan
→ 检查完整计划
→ apply_element_spec commit/write
```

避免逐 Element 重复调用。

### 9.4 Range

每个 Element 最多选择一个 range source：

```text
Physical Range
或
Implementation Range
```

不得同时配置两者。

---

## 10. Parameter 命名与 Ownership

### 10.1 新参数命名

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

### 10.2 Dependency Chain

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

### 10.3 Provider Placement

| 参数语义 | Provider 位置 |
|---|---|
| 单客户专属参数 | 已验证的 Customer/Project owner layer |
| 跨客户公共功能参数 | Core Package 的对应 Provider Class |
| 可标定参数 | 对应 Calibration Provider |
| 固定功能常量 | 对应 Constant Provider |
| Ownership 不明确 | 不创建，继续定位 |

Generic Provider 必须有跨客户语义证据。不能因为发现已有公共 Parameter Class，就自动把客户专属值放入其中。

---

## 11. Preflight 与真实写入

### 11.1 Preflight

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

### 11.2 真实写入

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

### 11.3 Plan/Commit Action

对于具有持久化计划的 Action：

```text
mode=plan
→ 检查 planId、fingerprint、target 和 changes
→ mode=commit + 原 planId
→ 成功完成
```

Commit 使用原 planId，不重新生成参数或扩大变更。

---

## 12. Tool Prompt 最终设计

### 12.1 唯一规范源

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

### 12.2 Descriptor 内容

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

### 12.3 关键 Action 规则

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

### 12.4 Profile Prompt

Profile Prompt 只描述 Profile 增量能力：

- `advanced-read`：启用 Diagram 等深读；
- `write-preflight`：启用 mutation Preflight 和真实写入；
- `component-edit`：启用 editability 操作；
- `ops`：启用 scheduler 和 recovery。

Profile 不重复通用工程规则。

---

## 13. System Prompt 开发方案

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
- 删除独立验证 Workflow；
- 明确 ASCET 工程任务必须读取 `ascet-engineering`。

System Prompt 最终只回答：

```text
何时触发 Skill
如何冻结 Scope
哪些证据不足
什么时候允许 Preflight
什么时候允许真实写入
成功和失败如何结束
```

---

## 14. Skill 开发方案

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
    ├── tool-recipes.md
    └── write-execution.md
```

### 14.1 `SKILL.md`

控制在约 60～80 行，只包含：

1. 触发范围；
2. 输入分类；
3. Scope Resolution；
4. Evidence 状态；
5. Reference 加载表；
6. Write readiness；
7. Preflight 与真实写入；
8. 停止并询问用户的条件。

### 14.2 Reference 加载

| 任务 | References |
|---|---|
| 模糊需求 | scope、root discovery、feature workflow |
| Customer Project | customer workflow、project signal flow |
| Exact Class | class context、project signal flow |
| ESDL 修改 | esdl fast path、surface routing |
| Element 配置 | elements fast path |
| Parameter | naming、provider placement |
| Dependency | dependency advanced path |
| 写入 | tool recipes、write execution |

### 14.3 Skill 状态机

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

## 15. Agent 开发方案

修改：

```text
packages/ascet-extension/agents/ascet-implementation.md
```

Frontmatter：

```yaml
systemPromptMode: replace
inheritProjectContext: true
inheritSkills: true
tools: read, grep, find, ls, bash, write, edit,
  ascet_status, ascet_scheduler_status,
  ascet_get, ascet_read, ascet_diff, ascet_edit
```

正文缩减为：

```text
Read and follow ascet-engineering.

The Skill is authoritative for scope routing, Project-to-Class tracing,
signal-flow analysis, ESDL, Elements, Parameters, Preflight, and writes.

Do not duplicate Skill rules.
Do not broaden the frozen scope.
A successful executed ascet_edit call completes the write because
verification is automatic.
Do not call or simulate a separate verification step.
```

Agent 不再维护独立 Method、Parameter、Dependency、ESDL 或验证规则副本。

---

## 16. 独立验证 Tool 移除

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

## 17. Dependency Chain 更新

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

## 18. Package 与资源发现

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
  "agents/ascet-implementation.md",
  "skills/ascet-engineering"
]
```

注意：Pi 核心 package manifest 原生解析 `extensions/skills/prompts/themes`。Agent 文件进入 npm 包后，由 ASCET 聚合发行包中的 subagent 扩展路径加载，不在扩展包中假设核心直接解析 subagent manifest。

`verify-packed-assets.mjs` 增加检查：

- Skill `SKILL.md` 存在；
- Skill References 完整；
- `agents/openai.yaml` 存在；
- `ascet-implementation.md` 存在；
- package manifest 引用路径有效。

---

## 19. 测试驱动开发阶段

### Phase 0：基线与失败测试

先增加或更新测试：

```text
packages/ascet-extension/src/agent-routing.test.ts
packages/ascet-extension/src/agents.test.ts
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
- System Prompt 包含 Skill 路由、Scope 和写入安全门；
- System Prompt 不包含完整 Parameter/Dependency 矩阵；
- Skill frontmatter 和 Reference links 有效；
- Agent `inheritSkills=true`；
- Canonical Tool 和 Profile 中没有 standalone verify Tool；
- 模型 schema 不接受 `verifyReadback`；
- Runtime 真实写入内部始终启用自动验证；
- Tool Prompt 没有重复 guideline；
- Tool Prompt 默认体积相比基线降低至少 70%。

### Phase 1：创建 Skill

实现 Scope、Root Discovery、Project、Class、Signal Flow、ESDL、Elements、Parameter、Dependency 和 Write References。

### Phase 2：精简 System Prompt

只有 Skill 测试通过后，才从 System Prompt 删除详细工程规则。

### Phase 3：精简 Agent

设置 `inheritSkills=true`，删除 Agent 内重复规则。

### Phase 4：规范 Tool Prompt

以 descriptors 为唯一规范源，停止 legacy instruction 重复注入。

### Phase 5：移除 Standalone Verify Tool

删除 Tool、注册、Descriptor、Profile、Prompt、Agent 工具声明和测试引用。

### Phase 6：隐藏自动验证参数

从模型公开 schema 移除 `verifyReadback`，Runtime 内部继续强制启用。

### Phase 7：Package 与隔离安装

验证 Skill 和 Agent 资源进入 npm package，并能从仓库外安装发现。

### Phase 8：ASCET Live 验收

所有 ToolAPI 操作串行执行。

---

## 20. 测试与检查命令

定向测试：

```powershell
npx tsx --test `
  packages/ascet-extension/src/agent-routing.test.ts `
  packages/ascet-extension/src/agents.test.ts `
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

## 21. ASCET Live 验收

### 21.1 Read-only 场景

1. 模糊功能需求 → Core Package；
2. Customer Project → Package → Class → Method；
3. Exact Class → Candidate Project → 正向链验证；
4. BDE/Signal → 目标 ESDL；
5. Parameter → Provider/Consumer Ownership。

### 21.2 ESDL 写入场景

```text
读取 baseline signature/code
→ Signature Preflight（需要时）
→ Signature executeWrite=true
→ Code Preflight
→ Code executeWrite=true
→ 成功完成
```

### 21.3 Local Parameter 场景

```text
读取 Component 和现有 Elements
→ 规划 C_ Local Parameter
→ apply_element_spec plan
→ commit/write
→ 成功完成
```

### 21.4 完整 Parameter Chain

```text
Provider P_ Exported
→ Consumer P_ Imported
→ Consumer C_ Local
→ Explicit dependency mapping
→ 各 Stage plan/commit
→ 成功完成
```

### 21.5 Live 规则

- 使用明确授权的 exact target；
- 所有 ToolAPI 操作串行执行；
- Preflight 成功后才执行真实写入；
- 成功写入后直接完成；
- 测试对象需要恢复时，恢复操作本身也通过正常 Preflight/Write 完成；
- Tool 失败时停止并记录错误，不盲目重试。

---

## 22. 最终验收标准

1. System Prompt 控制在约 1000～1500 字符。
2. System Prompt 顶层规则不超过 15。
3. `ascet-engineering` 是工程 Workflow 唯一规范来源。
4. Agent 通过 `inheritSkills=true` 使用 Skill，不复制完整规则。
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
42. Skill 和 Agent 在隔离安装后的发布包中可发现。
43. 定向测试、`npm run check`、打包和 ASCET Live 验收全部通过。

---

## 23. 最终结论

最终工程 Workflow 为：

```text
需求分类
→ Scope Resolution
→ Project/Package/Class 正向定位
→ Signal Flow 与当前实现理解
→ Element/Parameter Ownership 确认
→ 修改设计
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
