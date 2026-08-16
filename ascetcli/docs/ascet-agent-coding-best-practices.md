# ASCET Agent Coding Best Practices

面向 `Codex`、`ASCET Copilot` 等 coding agent 的 ASCET/ESDL 操作与编码最佳实践清单。

这份文档按“渐进式披露”组织：

- 先给 agent 一页可执行规则
- 再按任务和对象分流
- 最后给出处和延伸阅读

配套导航：

- [ASCET Help Curated Index](ascet-knowledge/help/index.md)
- [ASCET Agent Help Task Map](ascet-knowledge/help/ascet-agent-help-task-map.md)
- [ASCET Agent Help Source Map](ascet-knowledge/help/ascet-agent-help-source-map.md)

如果你只需要知道下一步该怎么做，先读“TL;DR”与“任务路由”；只有在真正落到对象细节时，再往下展开。

## 1. TL;DR

下面 10 条是默认硬规则。

1. `[Task Routing]` 先判断对象是 `Class`、`Module` 还是 `StateMachine`，再判断描述方式是 `ESDL`、`BDE` 还是 `C`。
2. `[Workflow]` 先 `summary`，再 `snapshot`，必要时补 `block / implementation / references`，最后才进入写入。
3. `[Repo Constraint]` live ASCET ToolAPI 访问必须串行，不并发读写同一个打开的 ASCET 实例。
4. `[Workflow]` 写入后必须 `readback`，并至少再做一次相关 `summary / snapshot / diff` 级验证。
5. `[Vendor Rule]` ESDL 的 method/process 名称必须唯一，不支持 overloading。
6. `[Vendor Rule]` 不要把模型元素声明和方法体文本替换混成一件事；很多结构不只存在于代码文本里。
7. `[Vendor Rule]` `StateMachine` 中必须严格区分 `trigger / condition / action` 三类角色。
8. `[Vendor Rule]` 如果 action 增加返回值，它就不能再正常作为状态或 transition 的 `<action>` 绑定目标。
9. `[Vendor Rule]` 如果 action/condition 在单独图里使用 trigger argument，参数名和类型必须与 trigger 完全一致。
10. `[Vendor Rule + Practice]` implementation/data 字段经常依赖 project context；看到 `Use Implementation Type` 时，不要把界面显示值当成随时可自由改单值。

## 2. 任务路由

先定位你现在属于哪一类任务，再展开对应章节。

| 任务 | 先读什么 | 优先写入口 | 最容易踩坑的点 |
| --- | --- | --- | --- |
| 只读分析 | `summary` + `snapshot` | 不写 | 把局部文本误当完整模型 |
| `Class` / `Module` 的 ESDL 改动 | `summary` + `snapshot` + 必要签名/引用信息 | 对应的 class/module ESDL 写入口 | 误用 overloading、乱补声明、大片重写 |
| `Module` 的 BDE/图形结构分析 | `snapshot` + `block` | 只在确认支持结构化写入时才改 | 把图结构当普通文本代码 |
| `C` 组件代码调整 | `summary` + `snapshot` + implementation | `code / header / external C` 对应写入口 | 假设已有 AST 级语义保护 |
| `StateMachine` 逻辑调整 | `summary` + `snapshot` + state/transition 相关读取 | state machine 专用写入口 | 搞混 trigger/condition/action；漏同步 trigger arguments |
| implementation/data 字段调整 | project context + implementation/data 读取 | implementation/data 对应入口 | `Use Implementation Type`、公式约束、target 相关字段 |

## 3. 默认安全工作流

### 3.1 只读分析

1. 识别对象类型与语言类型。
2. 运行 `summary`。
3. 运行 `snapshot`。
4. 按需补读：
   - `block`
   - `implementation`
   - `references`
5. 只有在结构、签名、绑定关系都清楚后，才决定是否写入。

### 3.2 安全修改

1. 读取当前对象。
2. 确认目标 method / state / transition / field 真实存在。
3. 选对专用写入口，不用“万能文本修改”心智。
4. 只做最小必要改动，尽量保持已有名称、参数、绑定和图面结构稳定。
5. 立刻 `readback`。
6. 再跑一次 `summary / snapshot`，必要时做 `diff`。

### 3.3 StateMachine 修改

1. 先确认改的是 `trigger`、`condition` 还是 `action`。
2. 如果涉及 trigger arguments，先找清是哪个 trigger 驱动该行为。
3. 再统一 action/condition 中的参数名与类型。
4. 修改 ESDL 或绑定关系。
5. 读回验证，并检查图面是否仍可读。

## 4. 按对象展开

### 4.1 Class / Module

#### ESDL

- ESDL 的 method/process header 和 body 是两层结构：签名与参数不应靠随意改正文去“顺手补齐”。
- 方法名必须唯一，不支持仅靠参数个数或参数类型区分重载。
- 变量名在当前作用域内必须唯一；导入 class/module 时尤其要防命名冲突。
- 不要因为 ESDL 看起来像 Java，就把通用 Java/C# 的能力默认外推到 ASCET。

对 agent 的直接约束是：

- 不新增“同名不同参”的 method/process。
- 不因为缺一个元素就直接往方法体顶部乱补声明。
- 不对大段 ESDL 做无结构的大块重写。

#### BDE

- `BDE` 更像图形/结构描述，不适合按普通文本代码思维去写。
- 如果你手里只有文本片段，却没有 block/snapshot 级结构上下文，默认先停下来补读。

#### C

- `C` 相关面通常是 `code`、`header`、`external C code` 等文本表面。
- 不要假设 ASCET 对这类内容天然具备 AST 级语义分析和结构修复能力。
- 如果任务同时涉及代码与 implementation 配置，必须两边一起看。

### 4.2 StateMachine

#### 角色语义

- `trigger` 是无返回值的 public method。
- `condition` 是返回值类型为 `logical` 的 private method。
- `action` 是 private method，默认无参数、无返回值。

不要把这三者当成普通 helper method 的三个别名。

#### action 返回值

- action 可以增加返回值。
- 但一旦有返回值，它就不能再正常作为状态或 transition editor 里的 `<action>` 绑定目标。
- 如果先绑定、后改返回值，代码生成会给出 warning。

这意味着：

- 不要为了“复用”随手给现有 action 加返回值。
- 只要改 action signature，就要同步检查绑定关系。

#### inputs/outputs 与 trigger arguments

- inputs/outputs 是缓冲到状态机内部的，适合稳定输入输出。
- trigger arguments 更省静态 RAM，但规则更严格。

默认选择：

- 语义上是状态机稳定输入输出时，优先用 inputs/outputs。
- 只有在明确要压静态 RAM 时，才优先考虑 trigger arguments。

#### trigger arguments 映射规则

- 如果 action/condition 在单独的 ActionCondition 图中使用 trigger argument，必须声明相同名称、相同类型的参数。
- 不要只改 action/condition，不同步对应 trigger。

#### 图面可读性

- 状态或 transition 上直接写 ESDL 是允许的，但长代码会让图面迅速变差。
- 对复杂逻辑，优先让图上显示简短注释或提炼过的意图，而不是塞整段代码。

#### 项目级优化开关

- 状态机相关的 project/code-generation 优化选项可能改变行为，而不只是改变代码形态。
- 这类开关不能和普通代码微调混成一次“顺手配置优化”；改动后必须做行为验证。

### 4.3 Implementation / Data

#### 先确认是否在 project context 中

- implementation type、memory location、memory segment、公式和限制行为，都可能依赖 associated/default project。
- 如果某元素启用了 `Use Implementation Type`，界面中看到的值可能只是默认值，或来自最近使用该元素的项目上下文。

因此：

- 不要脱离 project context 解释 implementation 字段。
- 不要把界面显示值当成始终可独立改单值。

#### inline / formula / limitation

- method/process 的 `Automatic` 与 `Compiler` inline 选项不适合 process。
- 对 `cont + real32/real64`，以及所有非 `cont` 模型类型，代码生成只支持 identity formula。
- `Limit Assignments` 默认应保持开启；只有在你能明确确认不会越界时才考虑关闭。

#### target 相关字段

- `Memory Location`、`Memory Segment`、`Use FPU` 等字段都依赖 target。
- 没有明确 target/project 上下文时，不要臆测填写。

更细的 implementation/data 字段对照，见附录：

- [ASCET Agent Signal and Implementation Field Guide](ascet-knowledge/help/ascet-agent-signal-implementation-field-guide.md)

## 5. 禁止动作

以下做法默认禁止：

- 把 ASCET 当普通源码仓库，做大范围文本替换
- 不读 `snapshot` 就直接改 live 模型
- 并发调用多个 live CLI 去访问同一个 ASCET 实例
- 给 ESDL 方法新增同名重载
- 把组件级元素声明直接塞进方法体
- 给 StateMachine action 增加返回值却不检查绑定影响
- 使用 trigger argument 却不在相关 trigger 与 action/condition 中同步声明
- 把 `BDE Module` 当成自由文本对象
- 在不明确 project/target context 时擅自改 implementation 字段
- 把实验性并发工具混进正常 live 写链路

## 6. 证据地图

### 规则

- ESDL 方法/过程与 overloading 限制：
  - [extracted/ESDLEditorEnglishUS/markdown/esdl_working_with_methods_and_processes.md](ascet-knowledge/help/extracted/ESDLEditorEnglishUS/markdown/esdl_working_with_methods_and_processes.md)
- ESDL 变量命名：
  - [extracted/ESDLEditorEnglishUS/markdown/ESDL_Variable_Names.md](ascet-knowledge/help/extracted/ESDLEditorEnglishUS/markdown/ESDL_Variable_Names.md)
- StateMachine 作为类、`trigger / condition / action` 语义、action 返回值影响：
  - [extracted/StateMachineEditorEnglishUS/markdown/SM_State_Machines_as_Classes.md](ascet-knowledge/help/extracted/StateMachineEditorEnglishUS/markdown/SM_State_Machines_as_Classes.md)
- trigger arguments 在 action/condition 中的同名同型要求：
  - [extracted/StateMachineEditorEnglishUS/markdown/adding_arguments.md](ascet-knowledge/help/extracted/StateMachineEditorEnglishUS/markdown/adding_arguments.md)
- StateMachine 与外部通信：
  - [extracted/StateMachineEditorEnglishUS/markdown/communications_components.md](ascet-knowledge/help/extracted/StateMachineEditorEnglishUS/markdown/communications_components.md)
- methods/processes implementation 的 inline 选项：
  - [extracted/ImplementationEditorEnglishUS/markdown/ied_implementation_editor_methodsprocesses.md](ascet-knowledge/help/extracted/ImplementationEditorEnglishUS/markdown/ied_implementation_editor_methodsprocesses.md)
- implementation type 的 project-context 依赖：
  - [extracted/ImplementationEditorEnglishUS/markdown/using_impl_types.md](ascet-knowledge/help/extracted/ImplementationEditorEnglishUS/markdown/using_impl_types.md)
- implementation value tab 字段语义：
  - [extracted/ImplementationEditorEnglishUS/markdown/Value_Tab.md](ascet-knowledge/help/extracted/ImplementationEditorEnglishUS/markdown/Value_Tab.md)
- formula 选择限制：
  - [extracted/ImplementationEditorEnglishUS/markdown/IEd_select_formula.md](ascet-knowledge/help/extracted/ImplementationEditorEnglishUS/markdown/IEd_select_formula.md)

### 仓库运行约束

- live ASCET 串行访问、验证现实与限制：
  - [../../docs/plans/2026-03-16-ascet-live-verification-note.md](../../docs/plans/2026-03-16-ascet-live-verification-note.md)
- CLI/命令能力边界：
  - [../../docs/ascet-cli-reference.md](../../docs/ascet-cli-reference.md)
- 读写包装与控制边界：
  - [../../docs/ascet-api-readwrite-packaging.md](../../docs/ascet-api-readwrite-packaging.md)
- 当前帮助 Markdown 总入口：
  - [ascet-knowledge/help/extracted/index.md](ascet-knowledge/help/extracted/index.md)

## 7. 何时继续下钻

按下面顺序读取通常最省时间：

1. 先读本文 `TL;DR`
2. 再看“任务路由”
3. 命中对象后，只展开对应章节
4. 遇到争议或高风险配置，再跳到“证据地图”
5. 如果是在填 implementation/data 字段，再读附录：
  - [ASCET Agent Signal and Implementation Field Guide](ascet-knowledge/help/ascet-agent-signal-implementation-field-guide.md)
