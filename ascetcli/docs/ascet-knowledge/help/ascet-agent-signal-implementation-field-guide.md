# ASCET Agent Signal and Implementation Field Guide

面向 `Codex`、`ASCET Copilot` 等 agent 的信号与 implementation 字段操作附录。

这份附录只处理一类问题：当你已经确定要改 element/data/implementation 字段时，哪些值是自由填写的，哪些值受 project、implementation type、target 或 code-generation 规则约束。

配套导航：

- [ASCET Help Curated Index](index.md)
- [ASCET Agent Help Task Map](ascet-agent-help-task-map.md)
- [ASCET Agent Help Source Map](ascet-agent-help-source-map.md)

## 1. 先记住这 5 条

1. `Use Implementation Type` 打开时，implementation 区域通常是继承显示，不是自由逐格填写。
2. implementation type 只能在 project context 中被真正解析；脱离项目时看到的值可能只是默认值，或来自最近使用该元素的项目。
3. `Formula` 不是任意可选；很多类型组合只允许 `ident`。
4. `Limit Assignments` 默认应保持开启；只有确定不会越界时才考虑关闭。
5. `Memory Location`、`Memory Segment`、`Use FPU` 等字段是 target-sensitive 的，没有 target 上下文不要臆测填写。

## 2. 开始前的判断顺序

在改字段之前，先按这个顺序判断：

1. 当前编辑的是不是 signal-like element，还是 dependent parameter / explicit reference / distribution。
2. 当前值是 individual implementation，还是 implementation type 继承。
3. 当前上下文是否有 associated/default project。
4. 当前 target 是否会影响 memory、segment、FPU 等字段。
5. 当前修改是否会影响 code generation，而不只是界面显示。

## 3. 继承与 project context

### 3.1 `Use Implementation Type`

- 开启后，implementation field 中的大部分输入项会被禁用，界面更像“显示继承结果”。
- 这些结果来自 associated project 或 default project 中定义的 implementation type。
- 如果先启用 implementation type，再关闭，也可能把当时的继承值复制为当前元素的个体实现起点。

### 3.2 不要误读显示值

- 对使用 implementation types 的元素，帮助文档明确说明：implementation 信息只能在 project context 中解析。
- 在 generated documentation、component editor 或 Component Manager 中看到的值，可能只是默认值，或来自最后一个使用该元素的项目。

对 agent 的直接含义是：

- 不要脱离 project context 给 implementation 字段下结论。
- 不要因为界面里“看起来有值”，就假设这些值都是可以局部独立改写的最终事实。

## 4. 通用字段对照表

| 字段 | 是否通常需要填写 | 适用条件 | 填写要求 | 推荐做法 |
| --- | --- | --- | --- | --- |
| `Name` | 总是 | 所有信号 | 当前作用域内唯一，语义清晰，遵守现有命名风格 | 不靠大小写变化规避重名 |
| `Type` | 总是 | 所有信号 | 先确定模型类型：`log`、`cont`、`sdisc`、`udisc`、`limitInt`、`wrapInt`、`enum` | 先定 `Type` 再看后续字段 |
| `Use Implementation Type` | 按需 | 使用项目定义实现类型时 | 开启后 implementation 参数通常从 implementation type 继承 | 改之前先确认 associated/default project |
| `Impl. Type` | 总是 | 所有信号 | 必须能覆盖实现区间；逻辑量、连续量、离散量可选集合不同 | 选能覆盖区间的最小合适类型 |
| `Min` | 非逻辑标量通常必填 | `cont`、`sdisc`、`udisc`、`limitInt`、`wrapInt` | 表示模型侧物理下限 | 先按真实物理含义填写，不要拿存储边界代替 |
| `Max` | 非逻辑标量通常必填 | `cont`、`sdisc`、`udisc`、`limitInt`、`wrapInt` | 表示模型侧物理上限 | 与 `Min` 成对填写 |
| `Impl. Min` | 非逻辑标量通常必填 | 使用 individual implementation 时 | 表示实现侧下限，必须落在 `Impl. Type` 可表示范围内 | 与 `Impl. Max`、`Impl. Type` 一起检查 |
| `Impl. Max` | 非逻辑标量通常必填 | 使用 individual implementation 时 | 表示实现侧上限，必须落在 `Impl. Type` 可表示范围内 | 避免超出实现类型极限 |
| `Formula` | 非逻辑标量通常必填 | 使用 individual implementation 时 | 必须满足模型类型与实现类型的公式约束 | 优先选合法的最简单公式 |
| `Q` / `Qu. Exp.` | 通常不是自由必填项 | 量化实现显示场景 | 只在特定 experiment/quantization 场景下有意义 | 不把它当成普通业务字段手填 |
| `Limit Assignments` | 建议填写 | 非逻辑标量 | 控制代码生成赋值时是否按 `Min/Max` 限幅 | 默认开启，除非能确认永不越界 |
| `Limit to maximum bit length` | 按需 | 定点算术、需要显式控制溢出时 | 选择溢出处理策略：`Automatic`、`Keep Resolution`、`Reduce Resolution` | 只在明确有定点溢出风险时配置 |
| `Memory Loc. Inst.` | 按需 | 元素实例、组件实例 | 指定实例所在内存区域；与 target 相关 | 微控制器 target 下重点检查 |
| `Memory Loc. Ref.` | 仅特定情况 | explicit reference | 仅显式引用对象使用 | 普通信号一般不填 |
| `Memory Loc. SR` | 仅特定情况 | distribution/search result | 仅 distribution 搜索结果使用 | 普通信号一般不填 |
| `Memory Segment` | 按 target 决定 | 特定 target，如 ASCET-SE | 仅在特定项目/目标上下文有意义 | 没有 target 约束时不要臆测填写 |

## 5. 公式与类型组合速查

| 场景 | `Formula` 要求 | 备注 |
| --- | --- | --- |
| `cont` + `real32/real64` | 只能用 `ident` | 帮助文档明确说代码生成只支持 identity |
| `cont` + 整数实现类型 | 用 `ident` 或合法线性公式 | 需要同时满足 consistency 检查 |
| `sdisc` / `udisc` / `limitInt` / `wrapInt` | 只能用 `ident` | 非 `ident` 会给出 warning/error |
| `log` | 不适用 | 逻辑量大多不需要这些转换字段 |

## 6. Formula 选择与制定流程

### 6.1 先分清两层

`Formula` 在 ASCET 里有两层：

1. `project` 层定义
2. `element implementation` 层选用

也就是说：

- `ident` 一定存在于项目中。
- 其他公式要先在 project 里创建，元素 implementation 才能选到。
- 元素侧不是“现写公式”，而是“从 associated project 的公式集合里选择”。

### 6.2 推荐判断顺序

在选公式前，先按下面顺序判断：

1. 确认 signal 的模型类型。
2. 确认实现类型是不是整数/定点。
3. 确认是否需要物理量到实现量的缩放。
4. 去 project 里看已有公式，能复用就复用，也可以自己设计。
5. 选完后检查 `Consistency`。
6. 如果改了 project 级公式，再考虑做 implementation update / replace formula recursively。

### 6.3 如何按需求选

- 如果需求是“物理量直接表达，不做量化缩放”，优先 `ident`。
- 如果需求是“连续量要映射到整数实现”，优先考虑 `linear`。
- 如果是离散量或整数模型量，保持 `ident`。
- 如果要自定义非线性公式，先确认当前模型类型和代码生成链是否真的支持；很多情况下它只会产生 warning，甚至在代码生成时被当成 identity 处理。

### 6.4 什么时候可以自己设计公式

可以，但前提是你在 project 层操作，而不是在单个元素上临时发明。

推荐流程是：

1. 先判断有没有现成公式可复用。
2. 如果没有，再到 project editor 的 formulas 里新增。
3. 给新公式明确命名，并确保它服务的是一个真实的量化/缩放需求，而不是为了“凑一个非 ident”。
4. 再回到元素 implementation 里选这个公式。
5. 检查 consistency、量程和实现类型是否仍一致。

### 6.5 `ident` 的正确定位

`ident` 不是“永远正确”，而是：

- 没有明确缩放需求时的默认安全起点
- `cont + real32/real64` 的唯一正确选项
- 大多数离散/整数模型类型的唯一受支持选项

如果需求明确要求“物理量和实现值不在同一尺度”，那就不能机械地停在 `ident`，而应该回到项目中评估已有 `linear` 或其他合规公式。

## 7. 按信号类型的最小填写模板

| 信号类型 | 最小必看字段 | 推荐默认做法 | 常见误填 |
| --- | --- | --- | --- |
| `log` | `Name`、`Type`、`Impl. Type`、`Memory Loc. Inst.` | 实现类型按目标要求选 `bit/bool/...`，其余大多保持禁用或默认 | 去填 `Formula`、`Min/Max`、`Q` 这类对逻辑量无意义的字段 |
| `cont` + 浮点实现 | `Name`、`Type`、`Min/Max`、`Impl. Type=real32/real64`、`Formula=ident` | 物理区间按真实量程填写 | 给浮点实现选线性或其他非 `ident` 公式 |
| `cont` + 整数实现 | `Name`、`Type`、`Min/Max`、`Impl. Type`、`Impl. Min/Max`、`Formula` | 先定物理区间，再选能容纳实现区间的最小整数类型 | 模型区间、实现区间、公式三者不一致 |
| `sdisc` / `udisc` | `Name`、`Type`、`Min/Max`、`Impl. Type`、`Impl. Min/Max`、`Formula=ident` | 保持离散量 identity 公式 | 给离散量配线性或非线性公式 |
| `limitInt` / `wrapInt` | `Name`、`Type`、`Min/Max`、`Impl. Type`、`Impl. Min/Max`、`Formula=ident` | 先确认模型整数边界，再确认实现类型可表示 | 只改实现侧，不校验模型侧边界 |
| explicit reference | `Memory Loc. Ref.` | 仅在显式引用对象上填写引用内存位置 | 把它当普通变量字段填写 |
| distribution | `Memory Loc. SR` | 仅在 distribution/search result 上填写 | 普通信号误填该列 |

## 8. 代理操作建议

### 7.1 先确认你到底在改哪一层

- 如果你改的是 `Name`、`Type`、`Min/Max`，本质上是在改模型语义。
- 如果你改的是 `Impl. Type`、`Formula`、`Limit Assignments`、`Memory Location`，本质上是在改实现或生成行为。
- 如果 `Use Implementation Type` 开着，先别改单个 implementation 格子，先确认是否应该回到 implementation type 定义侧。

### 7.2 一次只改一组耦合字段

下面这些字段要一起看，不要拆开赌：

- `Type` + `Min/Max`
- `Impl. Type` + `Impl. Min/Max`
- `Formula` + consistency warning/error
- `Limit Assignments` + `Limit to maximum bit length`
- `Memory Location` + `Memory Segment` + target context

### 7.3 保存后一定要读回

至少做下面的验证之一：

- 重新打开 implementation/data 视图确认最终值
- 再跑一次相关 `summary / snapshot`
- 检查 `Consistency` 区域是否仍有 warning/error

原因很简单：字段之间有派生、继承和 target 约束，写成功不等于最终生效值就是你以为的那个值。

## 9. 新增信号提交前自检清单

- 已确认 `Type` 对应的字段集合是否真的适用，不给逻辑量乱填非逻辑字段。
- `Min/Max` 表示的是模型物理区间，不是简单照抄实现类型边界。
- `Impl. Min/Max` 没有超出 `Impl. Type` 的表示范围。
- `Formula` 与模型类型、实现类型组合合法。
- 如果启用了 `Use Implementation Type`，已确认当前值来自实现类型继承，而不是误以为要逐字段手填。
- `Limit Assignments` 是否保持开启；如果关闭，已经明确接受越界赋值只受实现类型边界限制。
- `Limit to maximum bit length` 只在确有定点溢出处理需要时开启。
- `Memory Loc. Inst./Ref./SR/Segment` 只在对应对象类型和 target 上填写，不做想当然配置。
- `Consistency` 区域没有残留 warning/error。
- 写入或保存后，重新读回 implementation/snapshot，确认最终值没有被自动修正到意料之外的类型或区间。

## 10. 证据链接

- implementation type 的 project-context 依赖：
  - [extracted/ImplementationEditorEnglishUS/markdown/using_impl_types.md](extracted/ImplementationEditorEnglishUS/markdown/using_impl_types.md)
- implementation value tab 字段语义：
  - [extracted/ImplementationEditorEnglishUS/markdown/Value_Tab.md](extracted/ImplementationEditorEnglishUS/markdown/Value_Tab.md)
- 公式选择限制：
  - [extracted/ImplementationEditorEnglishUS/markdown/IEd_select_formula.md](extracted/ImplementationEditorEnglishUS/markdown/IEd_select_formula.md)
- 公式规则总览：
  - [extracted/ImplementationEditorEnglishUS/markdown/IEd_Formulas.md](extracted/ImplementationEditorEnglishUS/markdown/IEd_Formulas.md)
- 公式规则示例：
  - [extracted/ImplementationEditorEnglishUS/markdown/IEd_Examples_RulesFormulas.md](extracted/ImplementationEditorEnglishUS/markdown/IEd_Examples_RulesFormulas.md)
- methods/processes implementation 的 inline 选项：
  - [extracted/ImplementationEditorEnglishUS/markdown/ied_implementation_editor_methodsprocesses.md](extracted/ImplementationEditorEnglishUS/markdown/ied_implementation_editor_methodsprocesses.md)
- implementation consistency checks：
  - [extracted/ImplementationEditorEnglishUS/markdown/IEd_Consistency_Checks.md](extracted/ImplementationEditorEnglishUS/markdown/IEd_Consistency_Checks.md)
- project 中新增公式：
  - [extracted/ProjectEditorEnglishUS/markdown/PE_add_formula.md](extracted/ProjectEditorEnglishUS/markdown/PE_add_formula.md)
- project formulas tab：
  - [extracted/ProjectEditorEnglishUS/markdown/PE_FormulasTab.md](extracted/ProjectEditorEnglishUS/markdown/PE_FormulasTab.md)
- 递归替换公式：
  - [extracted/ProjectEditorEnglishUS/markdown/replaceformula.md](extracted/ProjectEditorEnglishUS/markdown/replaceformula.md)

主文档入口：

- [ASCET Agent Coding Best Practices](../../ascet-agent-coding-best-practices.md)
