# ASCET Engineering Skill Optimization Specification

- 日期：2026-08-16
- 状态：Final Design, Revised after Evaluation
- 评估依据：`2026-08-16-ascet-engineering-skill-optimization-evaluation-spec.md`
- 实施范围：`packages/ascet-extension/skills/ascet-engineering`

## 1. 决策

`ascet-engineering` Skill 必须围绕当前公开 ASCET Tools 设计，并遵守以下权威层级：

```text
System and Developer instructions
  -> 全局行为、安全要求和执行边界

Active Tool schemas and Agent Action Contracts
  -> 公开 Tool、Action、参数、结果和运行时行为

SKILL.md
  -> 请求分类、工程决策、证据要求、升级条件和 Reference 选择

Skill References
  -> Search、Ownership、ESDL、Element、Parameter、Dependency 等领域知识
```

Skill 不得覆盖 System、Developer 或 active Tool schema。具体 Tool 调用必须使用完整 Public Action ID，并与 Agent Action Contract Registry 一致。

本任务不提供 Skill 层向后兼容。被替换的文件和历史指导内容必须直接删除，不创建兼容副本、重定向文件、deprecated 章节或占位文件。

## 2. 目标

本优化必须实现：

1. 精确目标请求使用最短安全路径。
2. 精确目标跳过无意义 Search，但不跳过修改所需的 exact read。
3. Search 只承担候选发现，不承担完整 metadata、Ownership、Editability 或 absence proof。
4. 纯候选发现请求可以结束于 Search。
5. Search candidate 用于写入或精确工程结论时必须完成 exact validation。
6. Search candidate 不得直接进入 Edit。
7. Skill 中公开 `ascet_get` Action 只有 `ascet_get.tree` 和 `ascet_get.formulas`。
8. 具体 Tool 调用使用完整 Public Action ID。
9. ESDL、Element、Parameter 和 Dependency 使用当前公开 Action。
10. 普通 Element 与完整 Parameter Dependency Chain 使用互斥写入路径。
11. Skill 只描述当前 `intent=preview` / `intent=apply` 写入模型。
12. 历史 Action、参数、状态和流程从 Skill 目录物理删除。
13. 简单 ESDL 修改不被强制升级为完整 Project、CNMS/CUST 或 Signal Flow 分析。
14. Search/Get/Read 和 Mutation 使用不同 Result 处理规则。
15. References 无重复、无孤立、无相互矛盾。
16. Skill 通过 Registry、结构、quick validation 和 mock forward tests。

## 3. 非目标

本任务不修改：

- Action Contract schema；
- Tool Runtime；
- Bridge operation；
- CLI command；
- Permission controller；
- Batch Write behavior；
- `.ascet/rules` 项目模板；
- `src/ascet-coding-policy.ts`；
- Tool Prompt 或 `promptGuidelines`。

内部 Bridge operations 不属于 Skill 清理对象。OID 相关身份策略不在本次修订范围内，保持原设计不变。

## 4. 已确认问题

当前 Skill 存在：

1. `SKILL.md` 将自身声明为高于 System Prompt 和 Tool Prompt 的权威工作流。
2. 仍引用已退出 Public API 的 Dependency write action。
3. 仍包含历史写入状态和参数。
4. 仍描述 `apply_element_spec` 的历史多阶段写入流程。
5. References 将旧 Get operation 描述为公开 Action。
6. Dependency guidance 同时包含“创建缺失 Element”和“缺失时拒绝”的冲突语义。
7. Search 缺少 mode 选择、截断语义、终止条件和 exact validation 规则。
8. Tool routing、write execution、scope、ownership、parameter placement 和 change design 存在重复。
9. 当前测试锁定部分过期术语和产品特定变量示例。

本任务属于行为修复和维护性收敛，不是单纯文档改名。

## 5. Public Tool 基线

### 5.1 Search

唯一公开 Search Action：

```text
ascet_search.search
```

支持模式：

```text
comp
comp-ref
method
method-ref
method-element
element
element-ref
sender
receiver
text
```

### 5.2 Get

Skill 中完整 Get Action 只允许：

```text
ascet_get.tree
ascet_get.formulas
```

### 5.3 Exact Read

Skill 可以按工程需要引用：

```text
ascet_read.read
ascet_read.read_code
ascet_read.read_method_signature
ascet_read.read_element
ascet_read.read_implementation
ascet_read.read_block_diagram
ascet_read.read_state_machine_flow
ascet_read.read_element_dependency
ascet_read.read_dependent_chain
```

### 5.4 Write

Skill 的主要 mutation routing 使用：

```text
ascet_edit.create_method
ascet_edit.set_method_signature
ascet_edit.set_method_code
ascet_edit.set_module_code
ascet_edit.set_state_machine_code
ascet_edit.apply_element_spec
ascet_edit.create_dependent_chain
```

Skill 不复制完整 Public Action 清单。其他明确 mutation 直接遵循 active Tool schema 和 Action Contract。

## 6. Public Action 引用规范

具体 Tool 调用、路由表和调用示例必须使用完整 Action ID：

```text
ascet_read.read_code
ascet_edit.set_method_code
ascet_edit.create_dependent_chain
```

不得在具体调用位置只使用无法由 Registry 校验的裸名称：

```text
read_code
set_method_code
create_dependent_chain
```

领域说明可以使用自然语言术语，但具体 Tool 路径必须满足：

1. Contract 存在；
2. visibility 为 `public`；
3. 不属于 internal 或 hidden Action；
4. 与 active Tool schema selector 一致。

## 7. 最终目录结构

建议目标结构：

```text
packages/ascet-extension/skills/ascet-engineering/
├── SKILL.md
├── agents/
│   └── openai.yaml
└── references/
    ├── search-and-target-resolution.md
    ├── database-root-discovery.md
    ├── target-scope-and-ownership.md
    ├── cnms-cust-routing-and-ownership.md
    ├── customer-integration-workflow.md
    ├── feature-package-workflow.md
    ├── surface-and-signal-flow-routing.md
    ├── esdl-fast-path.md
    ├── esdl-design-and-signal-reuse.md
    ├── esdl-literals-and-configuration-values.md
    ├── elements-fast-path.md
    ├── parameter-design-and-placement.md
    ├── dependency-advanced-path.md
    ├── task-planning-and-change-design.md
    └── tool-routing-and-write-execution.md
```

文件数量不是验收目标。每个 Reference 必须具备独立职责和按需加载价值。如果目标文件只能重复其他 Reference，应继续合并，不得为了匹配目录设计保留空壳文件。

Reference 保持单层结构，不建立 Reference 到深层 Reference 的递归加载链。

## 8. 文件迁移

### 8.1 保留并重写

```text
SKILL.md
agents/openai.yaml
references/database-root-discovery.md
references/cnms-cust-routing-and-ownership.md
references/customer-integration-workflow.md
references/feature-package-workflow.md
references/esdl-fast-path.md
references/esdl-design-and-signal-reuse.md
references/esdl-literals-and-configuration-values.md
references/elements-fast-path.md
references/dependency-advanced-path.md
```

### 8.2 新增或由旧内容合并形成

```text
references/search-and-target-resolution.md
references/target-scope-and-ownership.md
references/surface-and-signal-flow-routing.md
references/parameter-design-and-placement.md
references/task-planning-and-change-design.md
references/tool-routing-and-write-execution.md
```

### 8.3 迁移完成后删除

```text
references/bde-and-surface-routing.md
references/class-path-project-context.md
references/parameter-naming.md
references/parameter-provider-placement.md
references/project-to-esdl-signal-flow.md
references/scope-resolution-and-ownership.md
references/task-planning-and-implementation-plan.md
references/tool-recipes.md
references/write-execution.md
```

不创建同名兼容文件、deprecated 章节、重定向副本或占位文件。

## 9. `SKILL.md` 规范

主 Skill 建议控制在约 60 至 80 行，但不把精确行数作为行为正确性的唯一指标。

只包含：

```text
Authority
Request Routing
Exact-Target Fast Path
Engineering Escalation
Write Rules
Stop Conditions
Reference Loading
```

不得包含：

- Tool schema；
- Bridge operation；
- 参数字段大全；
- Runtime 内部状态机；
- 产品特定变量；
- 历史写入流程；
- 重复领域设计规则；
- 完整 Public Action 清单。

### 9.1 Authority

必须明确：

```text
System and Developer instructions remain authoritative.

Active Tool schemas and Action Contracts are authoritative for public
Tool names, actions, parameters, result shapes, and runtime behavior.

This Skill defines ASCET engineering decisions, evidence requirements,
and multi-tool workflow.

If this Skill conflicts with an active Tool contract, follow the Tool
contract and report the Skill drift.
```

### 9.2 Request Routing

请求分类：

```text
exact-target read
exact-target mutation
fuzzy target discovery
candidate discovery only
customer integration
shared feature modification
dependency-chain work
read-only impact analysis
```

### 9.3 Exact-Target Fast Path

```text
exact validated target
-> skip Search
-> read only required exact surfaces
-> design the smallest safe change
-> invoke the matching public edit action
-> inspect required automatic verification
-> complete
```

“跳过 Search”不代表跳过修改所需的 exact read。

精确目标的小型修改不得默认要求：

- Database discovery；
- CNMS/CUST routing；
- 完整 Project impact；
- 完整 Signal Flow；
- 无关 Element metadata；
- 复杂 todolist。

### 9.4 Engineering Escalation

以下情况才升级：

- target identity 不明确；
- Search 返回多个候选且需要精确结论；
- Search 返回 `more=true` 且当前 items 不足以完成请求；
- canonical definition 不明确；
- Customer 与 Shared owner 均可能；
- signature 变化；
- 新增或改变 Element；
- Dependency Chain 变化；
- Formula、Variant、mapping 或 implementation 会影响结果；
- Tool 返回 blocked、partial、rolled-back、unknown 或 verification failure。

### 9.5 Write Rules

Skill 只描述：

```text
intent=preview
-> explicit non-mutating preview

intent=apply
-> guarded Runtime execution and automatic readback
```

非简单任务在第一次 `intent=apply` 前形成 evidence-backed change design，包括：

- exact target；
- requested behavior；
- exact code change；
- Element/Parameter metadata；
- Dependency definition；
- write order；
- assumptions；
- blocking unknowns；
- risks。

### 9.6 Stop Conditions

必须停止并报告：

- target ambiguity；
- ownership ambiguity that changes the edit layer；
- missing business value or metadata；
- conflicting existing state；
- blocked or failed mutation result；
- partial mutation；
- rolled-back result；
- unknown final state；
- missing required mutation verification。

## 10. Frontmatter 与 Agent Metadata

### 10.1 Skill frontmatter

`description` 必须同时说明能力和适用场景。建议：

```yaml
---
name: ascet-engineering
description: ASCET engineering guidance for exact and fuzzy target
  resolution, ESDL/BDE changes, Element and Parameter design, ownership
  analysis, dependency chains, guarded edits, and evidence-backed change
  design. Use for ASCET reads, analysis, modification, signal flow,
  configuration, or dependency work.
---
```

最终文本可以压缩，但不得将“何时使用”仅放在正文。

### 10.2 `agents/openai.yaml`

```yaml
interface:
  display_name: "ASCET Engineering"
  short_description: "Tool-aligned ASCET engineering and guarded edits"
  default_prompt: >-
    Use $ascet-engineering to take the shortest safe route for the exact
    ASCET request, load only the necessary references, use canonical
    ascet_* actions, and escalate to Search, ownership, or Project
    analysis only when required.
policy:
  allow_implicit_invocation: true
```

更新后使用 Skill Creator 的 metadata 生成或验证流程，避免 metadata 与 Skill 漂移。

## 11. Search Reference 规范

文件：

```text
references/search-and-target-resolution.md
```

### 11.1 Exact-target 规则

- Exact validated target skips Search.
- Skipping Search does not skip the exact read required for the engineering decision or mutation.

### 11.2 Discovery-only 终止条件

纯候选发现请求允许结束于 Search：

```text
discovery-only request
-> ascet_search.search
-> report candidates
```

例如用户仅要求列出名称匹配的 Components、Methods 或 Elements 时，不要求逐项 exact read。

### 11.3 Candidate 用于工程结论

当 candidate 用于以下目的时必须 exact validation：

- mutation；
- ownership judgment；
- identity conclusion；
- absence proof；
- impact judgment；
- Dependency Provider selection；
- 其他精确工程结论。

标准路径：

```text
ascet_search.search
-> exact target resolution
-> matching ascet_read.* action
-> optional matching ascet_edit.* action
```

禁止：

```text
ascet_search.search
-> ascet_edit.*
```

### 11.4 Mode 路由

| Mode | 意图 | 精确验证 |
|---|---|---|
| `comp` | Component 声明 | `ascet_read.read` 或匹配 surface read |
| `comp-ref` | Component 引用 | 验证相关 Component |
| `method` | Method/Process 声明 | `ascet_read.read_code` / `ascet_read.read_method_signature` |
| `method-ref` | Method/Process 引用 | 精确读取调用者 |
| `method-element` | Method Element 声明 | 解析 owner 后 exact read |
| `element` | Element 声明 | `ascet_read.read_element` |
| `element-ref` | Element 使用位置 | 精确读取相关 Component |
| `sender` | Message sender | 验证 sender 和 owner |
| `receiver` | Message receiver | 验证 receiver 和 owner |
| `text` | ESDL/C 文本位置 | `ascet_read.read_code` 获取完整代码 |

### 11.5 Result 语义

- Search 结果是候选，不是完整 metadata。
- Search 结果不是 ownership、identity、editability 或 absence proof。
- `count` 是 native Search 总匹配数。
- `items` 受 `limit` 限制。
- `more=true` 表示返回列表被截断。
- `text` item 是代码片段和位置提示，不是完整 Method body。
- 多个同名候选不得选择第一项直接写入。
- 零结果在 mode、query 或 scope 可能错误时不能证明全局不存在。
- 使用解决当前 unknown 所需的最少 bounded Search calls。
- 没有新证据时不重复相同 mode/query。

## 12. Result 处理规范

Result 规则必须按 Tool 类型区分。

### 12.1 Search/Get/Read

```text
successful result
-> interpret according to the selected Action Contract
```

Search、Get 或 Read 不要求 write verification。

### 12.2 Mutation

```text
mutation success with passed required automatic verification
-> terminal success

verified no-op or idempotent mutation
-> terminal success

blocked or error
-> stop and report

partial, rolled-back, or unknown
-> stop and report final known state

missing required mutation verification
-> stop and report
```

成功写入后，不执行仅用于重复证明同一写入成功的额外 read。

Skill 不要求模型读取 Bridge 内部状态字段。

## 13. Tool Routing Reference 规范

文件：

```text
references/tool-routing-and-write-execution.md
```

只保留工程选择规则：

```text
Method body
-> ascet_edit.set_method_code

Module header or external C
-> ascet_edit.set_module_code

StateMachine state/transition/binding/start-state
-> ascet_edit.set_state_machine_code

ordinary Elements
-> ascet_edit.apply_element_spec

complete Parameter Dependency Chain
-> ascet_edit.create_dependent_chain
```

不得复制：

- Tool 参数 schema；
- 完整 result 字段；
- Bridge operation；
- Permission controller 实现；
- Runtime 内部阶段；
- 全部 Public Action 清单；
- hidden Batch behavior。

其他明确 mutation 直接遵循 active Tool schema 和 Action Contract。

## 14. ESDL Reference 规范

文件：

```text
references/esdl-fast-path.md
```

### 14.1 Existing Method Body

```text
ascet_read.read_code
-> ascet_edit.set_method_code
```

### 14.2 Signature Change

```text
ascet_read.read_code
-> ascet_read.read_method_signature
-> ascet_edit.set_method_signature
-> ascet_edit.set_method_code
```

### 14.3 New Method

```text
ascet_edit.create_method
-> ascet_edit.set_method_signature when required
-> ascet_edit.set_method_code
```

### 14.4 ESDL And Ordinary Elements

```text
ascet_read.read_code
-> ascet_read.read_element only when current metadata affects the design
-> ascet_edit.apply_element_spec
-> ascet_edit.set_method_code
```

### 14.5 ESDL And Dependency Chain

```text
ascet_read.read_dependent_chain only when current state affects the design
-> ascet_edit.create_dependent_chain
-> ascet_edit.set_method_code
```

Skill 只描述首选 Action，不宣传具有重叠能力的替代调用路径。

## 15. Element 与 Dependency 边界

### 15.1 Ordinary Element

```text
ordinary Element create or patch
-> ascet_edit.apply_element_spec
```

同一 Component 的多个普通 Element 应优先使用一个 `ascet_edit.apply_element_spec` 调用。

Existing Element：

- Exact Element 已知时不强制 Search。
- 只有当前 metadata 会影响修改设计时才调用 `ascet_read.read_element`。
- Existing patch 只发送请求修改的字段。
- 不复制无语义等价证据的 sibling metadata。

New Element 必须明确：

- role；
- kind；
- model type；
- scope；
- unit；
- range；
- data/default；
- implementation；
- calibration；
- ESDL/BDE usage point。

未知必填信息必须停止，不得猜测。

### 15.2 Complete Parameter Dependency Chain

```text
Provider Exported Parameter
+ Consumer Imported Parameter
+ Consumer Local Dependent Parameter
+ Formula/Formal/Variant binding
-> ascet_edit.create_dependent_chain
```

运行时语义：

```text
missing Element    -> create
exact Element      -> reuse
metadata conflict  -> reject without overwrite
binding conflict   -> reject without overwrite
successful apply   -> automatic full readback
```

完整 Chain 中的三个 Element 不得在同一变更中再次由 `ascet_edit.apply_element_spec` 管理。

`ascet_read.read_dependent_chain` 只在当前链状态会影响设计、补全、冲突分析或诊断时使用，不是每次创建前的强制调用。

如果省略 Provider component path，由 Runtime 完成唯一精确 Provider 发现。Skill 不得要求 Agent 手工选择 Search 第一项。

## 16. Parameter Reference 规范

文件：

```text
references/parameter-design-and-placement.md
```

包含：

- Provider Exported、Consumer Imported 和 Consumer Local Dependent 的角色命名；
- Customer/Project Provider placement；
- China Package/CNMS Provider placement；
- Generic Package Provider placement；
- Calibration Provider；
- Constant Provider；
- exact path/OID 验证；
- business value/source；
- type/unit/range/implementation compatibility。

删除产品特定变量名示例。

Provider placement 为 `ascet_edit.create_dependent_chain` 提供定义，不意味着需要独立的 Element 写入。

## 17. Surface And Signal Flow Reference 规范

文件：

```text
references/surface-and-signal-flow-routing.md
```

路由：

```text
BDE candidate
-> ascet_search.search mode=comp when required
-> ascet_read.read_block_diagram

ESDL/C target
-> ascet_read.read_code

implementation target
-> ascet_read.read_implementation

StateMachine flow
-> ascet_read.read_state_machine_flow
```

规则：

- Search 不返回完整 BDE。
- 空 diagram payload 不证明 Component 不存在。
- BDE-only Component 不应走 Method code 路径。
- code text 不应通过 block-diagram read 获取。
- signal name 不证明 identity 或 ownership。
- 只有 source/transform/consumer 会改变修改点时才展开完整 Signal Flow。

## 18. Ownership References 规范

### 18.1 `target-scope-and-ownership.md`

包含：

- exact path/OID 是 locator，不自动决定 scope；
- Project instance 与 canonical definition；
- same-OID resolution；
- owner layer；
- `integrationScope`；
- `featureScope`；
- shared impact；
- exact target 不需要无关 Project 搜索。

### 18.2 `cnms-cust-routing-and-ownership.md`

保留 CNMS/CUST 路由启发式，仅在 Scope 或 owner 不明确时加载。

### 18.3 `customer-integration-workflow.md`

只负责 Customer Project、wrapper、mapping、Project Parameter 和 customer-only behavior。

### 18.4 `feature-package-workflow.md`

只负责 Shared Package、China Package/CNMS、公共接口和代表性 Project 影响。

## 19. Planning Reference 规范

文件：

```text
references/task-planning-and-change-design.md
```

### 19.1 不需要 todolist

- exact read；
- 小型 Method body 修改；
- 单字段 Element patch；
- 明确的单 Action 操作。

### 19.2 建议 2 至 4 项

- ESDL + Element；
- Method + signature；
- 新 Method；
- Parameter Chain。

### 19.3 需要详细 change design

- 多 Component；
- 多 Project；
- Ownership 冲突；
- 多 Variant；
- 多独立写入单元；
- shared OID 非局部影响。

内容只包括：

- exact target；
- requirement；
- exact code change；
- Element metadata；
- Dependency definition；
- write order；
- assumptions；
- blocking unknowns；
- risks。

## 20. 强制清理要求

Skill 目录中不得包含以下稳定历史标识符：

```text
ascet_edit.set_dependent_chain
configure_parameter_dependency_chain
PREFLIGHTED
executeWrite
planId
ascet_get.elements
ascet_get.component_refs
ascet_get.bde_edges
ascet_get.import_binding
ascet_get.dbitem_refs
ascet_get.database_catalog
```

历史多阶段写入指导必须从 Skill prose 中物理删除，但自动测试不使用脆弱的整句匹配。

不得保留：

- deprecated 说明；
- 历史流程说明；
- 兼容别名；
- 同名占位文件；
- 被合并 Reference 的副本；
- 产品特定变量名示例。

## 21. 测试规范

主要测试文件：

```text
packages/ascet-extension/src/ascet-engineering-skill.test.ts
```

### 21.1 Frontmatter 与结构

验证：

- `name` 正确；
- `description` 非空并包含适用场景；
- 主 Skill 长度受控；
- Reference 表存在；
- References 保持单层结构。

### 21.2 Public Action Registry

扫描：

```text
SKILL.md
agents/openai.yaml
references/**/*.md
```

提取完整 `ascet_<tool>.<action>` ID，并验证：

- Contract 存在；
- visibility 为 `public`；
- 不存在 internal/hidden Action 引用。

### 21.3 Search Mode 集合

`search-and-target-resolution.md` 中的 mode 集合必须与 `ascetSearchModes` 完全一致。

### 21.4 Search 语义

验证 Skill 明确包含：

- Search 结果是候选；
- exact validated target skips Search；
- discovery-only request 可以结束于 Search；
- `more=true` 表示截断；
- text candidate 使用 `ascet_read.read_code` 验证；
- element candidate 使用 `ascet_read.read_element` 验证；
- 用于写入的 Search candidate 不得直接进入 Edit。

不增加“已知 Method body 修改跳过 Search”的单独行为测试，由通用 exact-target 不变量覆盖。

### 21.5 Get 边界

Skill 中出现的完整 Get Action 只能是：

```text
ascet_get.tree
ascet_get.formulas
```

### 21.6 Dependency 语义

验证：

```text
missing -> create
exact -> reuse
metadata conflict -> reject
binding conflict -> reject
```

同时验证普通 Element 与完整 Dependency Chain 的写入路径互斥。

### 21.7 Code Surface 路由

验证：

```text
Method body               -> ascet_edit.set_method_code
Module header/external C  -> ascet_edit.set_module_code
StateMachine surfaces     -> ascet_edit.set_state_machine_code
```

### 21.8 Reference 完整性

验证：

- `SKILL.md` 引用的所有 Reference 存在；
- References 中不存在孤立文件；
- Reference 集合与最终实际目标集合一致；
- 九个旧文件不存在；
- 不存在兼容副本。

### 21.9 稳定历史标识符清理

验证第 20 节列出的稳定历史标识符均不存在。

### 21.10 Skill 标准验证

运行 Skill Creator 的快速验证：

```text
quick_validate.py packages/ascet-extension/skills/ascet-engineering
```

### 21.11 Forward Tests

使用 mock/faux Tool，不执行真实 ASCET 写入。

覆盖：

1. 模糊 Element：Search 后 exact read。
2. 纯候选发现：Search 后返回 candidates。
3. Dependency Chain：选择 `ascet_edit.create_dependent_chain`。
4. 普通 Element：选择 `ascet_edit.apply_element_spec`。
5. Module header：选择 `ascet_edit.set_module_code`。
6. StateMachine transition：选择 `ascet_edit.set_state_machine_code`。
7. 缺少业务值、Formula 或 metadata：停止，不猜测。

## 22. 实施任务

### Task 1：建立失败测试

增加：

- Frontmatter 和结构校验；
- Public Action Registry 校验；
- Search mode 集合校验；
- Search 语义校验；
- Get 边界校验；
- Dependency 和 Code surface 路由校验；
- 稳定历史标识符清理；
- Reference 完整性校验。

### Task 2：重写主入口

修改：

```text
SKILL.md
agents/openai.yaml
```

完成 Authority、frontmatter、request routing、fast path、escalation、write/stop rules 和 Reference 表。

### Task 3：合并领域 References

创建目标 Reference，将旧文件中的有效领域知识迁移并去重。如果某个目标文件没有独立按需加载价值，应继续合并。

### Task 4：删除历史文件

删除九个旧 Reference，不保留兼容副本。

### Task 5：验证

运行：

```text
Skill 定向测试
Public Action Contract 回归测试
Skill quick validation
mock forward tests
npm run check
```

## 23. 验收标准

任务完成必须同时满足：

1. System/Developer、Action Contract、Skill 的权威边界正确。
2. Public Tool API 只由 active schema 和 Action Contract 定义。
3. Exact validated target 不执行无意义 Search。
4. 跳过 Search 不跳过必要 exact read。
5. Search 结果只作为 candidates。
6. 纯候选发现请求可以结束于 Search。
7. 用于工程结论或写入的 Search candidate 完成 exact validation。
8. Search candidate 不得直接进入 Edit。
9. Skill 中公开 Get Action 只有 `ascet_get.tree` 和 `ascet_get.formulas`。
10. 所有完整 Action ID 属于 Public Action Registry。
11. Dependency 使用 create/reuse/conflict-reject 语义。
12. 普通 Element 与完整 Dependency Chain 不重复管理。
13. 三种代码 surface 具有唯一首选 Action。
14. Search/Get/Read 与 Mutation Result 规则正确区分。
15. 不存在历史 Action、参数、状态和流程。
16. 不存在孤立、重复或兼容 Reference。
17. Frontmatter 能正确触发 Skill。
18. 静态定向测试通过。
19. Skill quick validation 通过。
20. Mock forward tests 通过。
21. `npm run check` 无 error、warning 或 info。

## 24. 最终工作流

```text
User request
  -> System/Developer instructions define global constraints
  -> SKILL.md classifies exact, fuzzy, or discovery-only work
  -> exact target skips Search but performs required exact reads
  -> discovery-only request may return Search candidates
  -> engineering conclusions resolve Search candidates to exact targets
  -> matching ascet_read action validates the required surface
  -> domain Reference designs ESDL/Element/Parameter/Dependency changes
  -> tool-routing-and-write-execution selects the canonical public edit action
  -> intent=apply performs guarded Runtime execution and automatic readback
  -> public result determines completion or stop
```