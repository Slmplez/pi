# ASCET Agent Help Source Map

这份地图按“主题 -> 最相关来源”来整理 `help/` 目录，方便你快速知道该去哪个 vendor help 包找依据。

## 核心整理原则

- `Coding Best Practices` 负责操作策略与任务分流。
- `Signal and Implementation Field Guide` 负责 signal / implementation / data 字段语义。
- 其余 editor/help 包作为证据层和细节层存在。

## 1. 编码与 ESDL 语义

核心入口：

- [ASCET Agent Coding Best Practices](../../ascet-agent-coding-best-practices.md)
- [../esdl-editor/index.md](../esdl-editor/index.md)

原始来源：

- [extracted/ESDLEditorEnglishUS/Index.md](extracted/ESDLEditorEnglishUS/Index.md)

重点主题：

- method / process 约束
- 局部变量与组件元素
- 命名唯一性
- ESDL 语法与语义限制

## 2. StateMachine 语义

核心入口：

- [ASCET Agent Coding Best Practices](../../ascet-agent-coding-best-practices.md)
- [../state-machine-editor/index.md](../state-machine-editor/index.md)

原始来源：

- [extracted/StateMachineEditorEnglishUS/Index.md](extracted/StateMachineEditorEnglishUS/Index.md)

重点主题：

- `trigger / condition / action`
- trigger arguments
- inputs / outputs
- action 返回值与绑定影响

## 3. Signal / implementation / data 字段

核心入口：

- [ASCET Agent Signal and Implementation Field Guide](ascet-agent-signal-implementation-field-guide.md)

整理索引：

- [../implementation-editor/index.md](../implementation-editor/index.md)
- [../element-editor/index.md](../element-editor/index.md)
- [../data-editor/index.md](../data-editor/index.md)

原始来源：

- [extracted/ImplementationEditorEnglishUS/Index.md](extracted/ImplementationEditorEnglishUS/Index.md)
- [extracted/ElementEditorEnglishUS/Index.md](extracted/ElementEditorEnglishUS/Index.md)
- [extracted/DataEditorEnglishUS/Index.md](extracted/DataEditorEnglishUS/Index.md)

重点主题：

- `Use Implementation Type`
- `Impl. Type`
- `Min/Max`
- `Impl. Min/Max`
- `Formula`
- `Limit Assignments`
- `Memory Location`
- `Memory Segment`

## 4. 图形结构与 block 语义

建议入口：

- [ASCET Agent Coding Best Practices](../../ascet-agent-coding-best-practices.md)

原始来源：

- [extracted/BlockDiagramEditorEnglishUS/Index.md](extracted/BlockDiagramEditorEnglishUS/Index.md)
- [extracted/ConditionalTableEditorEnglishUS/Index.md](extracted/ConditionalTableEditorEnglishUS/Index.md)
- [extracted/BooleanTableEditorEnglishUS/Index.md](extracted/BooleanTableEditorEnglishUS/Index.md)
- [extracted/SpecifyingCTBlocksEnglishUS/Index.md](extracted/SpecifyingCTBlocksEnglishUS/Index.md)

重点主题：

- BDE / block 结构
- 条件表和布尔表
- 不同图形编辑器的对象语义

## 5. C code / header / external C

建议入口：

- [ASCET Agent Coding Best Practices](../../ascet-agent-coding-best-practices.md)

原始来源：

- [extracted/CCodeEditorEnglishUS/Index.md](extracted/CCodeEditorEnglishUS/Index.md)
- [extracted/ImplementationEditorEnglishUS/Index.md](extracted/ImplementationEditorEnglishUS/Index.md)

重点主题：

- C 文本代码面
- header / external C
- 和 implementation 的联动关系

## 6. 元素、组件与项目管理

原始来源：

- [extracted/ComponentManagerEnglishUS/Index.md](extracted/ComponentManagerEnglishUS/Index.md)
- [extracted/ContainerEnglishUS/Index.md](extracted/ContainerEnglishUS/Index.md)
- [extracted/ProjectEditorEnglishUS/Index.md](extracted/ProjectEditorEnglishUS/Index.md)
- [extracted/RecordsEnglishUS/Index.md](extracted/RecordsEnglishUS/Index.md)

适合的问题：

- 组件层级与容器结构
- project context
- records / project 配置相关事实

## 7. Sender/Receiver 与通信相关

原始来源：

- [extracted/SenderReceiverEditorEnglishUS/Index.md](extracted/SenderReceiverEditorEnglishUS/Index.md)
- [extracted/SignalsandIconsEnglishUS/Index.md](extracted/SignalsandIconsEnglishUS/Index.md)

适合的问题：

- sender/receiver 建模
- signal 图标与通信对象语义

## 8. 系统库与可复用块

原始来源：

- [extracted/SystemLibrariesEnglishUS/Index.md](extracted/SystemLibrariesEnglishUS/Index.md)

高频页面示例：

- [extracted/SystemLibrariesEnglishUS/markdown/PT1.md](extracted/SystemLibrariesEnglishUS/markdown/PT1.md)
- [extracted/SystemLibrariesEnglishUS/markdown/PT2.md](extracted/SystemLibrariesEnglishUS/markdown/PT2.md)
- [extracted/SystemLibrariesEnglishUS/markdown/PID.md](extracted/SystemLibrariesEnglishUS/markdown/PID.md)
- [extracted/SystemLibrariesEnglishUS/markdown/SL_Lowpass.md](extracted/SystemLibrariesEnglishUS/markdown/SL_Lowpass.md)

适合的问题：

- 是否已有标准低通/PID/Timer 块
- 系统库块的接口和行为定义

## 9. 故障排查与一致性告警

原始来源：

- [extracted/TroubleShootingEnglishUS/Index.md](extracted/TroubleShootingEnglishUS/Index.md)
- [extracted/ImplementationEditorEnglishUS/markdown/IEd_Consistency_Checks.md](extracted/ImplementationEditorEnglishUS/markdown/IEd_Consistency_Checks.md)

适合的问题：

- consistency warning / error
- 常见 editor 或 code generation 报错
- 某个奇怪限制到底是语义问题还是工具限制

## 10. 一页速记

如果你只想快速决定“先看哪份文档”，用下面这张表：

| 你现在的问题 | 先看什么 |
| --- | --- |
| 我该怎么安全改 ASCET | [ASCET Agent Coding Best Practices](../../ascet-agent-coding-best-practices.md) |
| implementation 字段到底该怎么填 | [ASCET Agent Signal and Implementation Field Guide](ascet-agent-signal-implementation-field-guide.md) |
| ESDL method/process 规则是什么 | [../esdl-editor/index.md](../esdl-editor/index.md) |
| StateMachine 的 trigger/action/condition 怎么分 | [../state-machine-editor/index.md](../state-machine-editor/index.md) |
| `Use Implementation Type` / `Formula` / `Limit Assignments` | [../implementation-editor/index.md](../implementation-editor/index.md) |
| block/BDE 结构怎么看 | [extracted/BlockDiagramEditorEnglishUS/Index.md](extracted/BlockDiagramEditorEnglishUS/Index.md) |
| 系统库里有没有现成低通/PID | [extracted/SystemLibrariesEnglishUS/Index.md](extracted/SystemLibrariesEnglishUS/Index.md) |
| 某个报错/告警是什么意思 | [extracted/TroubleShootingEnglishUS/Index.md](extracted/TroubleShootingEnglishUS/Index.md) |
