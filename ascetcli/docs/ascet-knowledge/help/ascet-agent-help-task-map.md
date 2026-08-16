# ASCET Agent Help Task Map

这份地图按“你现在要做什么”来组织 `help/` 目录。

默认规则：

1. 先读核心文档。
2. 再读对应 editor 索引。
3. 最后才进 `extracted/` 找厂商原文。

## 1. 我想先搞清楚 ASCET agent 的通用工作方式

先读：

- [ASCET Agent Coding Best Practices](../../ascet-agent-coding-best-practices.md)

补充读：

- [ASCET Agent Help Source Map](ascet-agent-help-source-map.md)
- [extracted/index.md](extracted/index.md)

适合的问题：

- ASCET live 访问有哪些硬约束
- 改代码前应该先读什么
- StateMachine / Class / Module 的修改路线有什么不同

## 2. 我要改 ESDL 代码

先读：

- [ASCET Agent Coding Best Practices](../../ascet-agent-coding-best-practices.md)
- [../esdl-editor/index.md](../esdl-editor/index.md)

必要时补读：

- [../state-machine-editor/index.md](../state-machine-editor/index.md)
- [extracted/ESDLEditorEnglishUS/Index.md](extracted/ESDLEditorEnglishUS/Index.md)

适合的问题：

- method/process 有什么命名和签名约束
- ESDL 局部变量和组件元素如何区分
- 哪些写法看起来像普通语言但在 ASCET 里不成立

## 3. 我要分析或修改 StateMachine

先读：

- [ASCET Agent Coding Best Practices](../../ascet-agent-coding-best-practices.md)
- [../state-machine-editor/index.md](../state-machine-editor/index.md)

必要时补读：

- [extracted/StateMachineEditorEnglishUS/Index.md](extracted/StateMachineEditorEnglishUS/Index.md)

适合的问题：

- `trigger / condition / action` 的角色边界
- trigger arguments 如何在 action/condition 中同步
- action 返回值为什么会破坏绑定

## 4. 我要改 signal / implementation / data 字段

先读：

- [ASCET Agent Signal and Implementation Field Guide](ascet-agent-signal-implementation-field-guide.md)

再读：

- [../implementation-editor/index.md](../implementation-editor/index.md)
- [../element-editor/index.md](../element-editor/index.md)
- [../data-editor/index.md](../data-editor/index.md)

必要时补读：

- [extracted/ImplementationEditorEnglishUS/Index.md](extracted/ImplementationEditorEnglishUS/Index.md)
- [extracted/ElementEditorEnglishUS/Index.md](extracted/ElementEditorEnglishUS/Index.md)
- [extracted/DataEditorEnglishUS/Index.md](extracted/DataEditorEnglishUS/Index.md)

适合的问题：

- `Use Implementation Type` 什么时候表示继承而不是自由填写
- `Formula` 什么时候只能用 `ident`
- `Limit Assignments`、`Memory Location`、`Memory Segment` 怎么看

## 5. 我要分析 block / BDE / 图结构

先读：

- [ASCET Agent Coding Best Practices](../../ascet-agent-coding-best-practices.md)

再读：

- [extracted/BlockDiagramEditorEnglishUS/Index.md](extracted/BlockDiagramEditorEnglishUS/Index.md)
- [extracted/ConditionalTableEditorEnglishUS/Index.md](extracted/ConditionalTableEditorEnglishUS/Index.md)
- [extracted/BooleanTableEditorEnglishUS/Index.md](extracted/BooleanTableEditorEnglishUS/Index.md)

适合的问题：

- 图形结构对象的语义
- 为什么不能把 BDE 当普通文本代码改
- block editor 相关厂商规则在哪

## 6. 我要查 C code / header / external C

先读：

- [ASCET Agent Coding Best Practices](../../ascet-agent-coding-best-practices.md)

再读：

- [extracted/CCodeEditorEnglishUS/Index.md](extracted/CCodeEditorEnglishUS/Index.md)
- [../implementation-editor/index.md](../implementation-editor/index.md)

适合的问题：

- C 组件的代码面和 implementation 面如何配合
- 哪些配置影响代码生成而不只是文本内容

## 7. 我要找系统库或厂商现成块

先读：

- [ASCET Agent Help Source Map](ascet-agent-help-source-map.md)

再读：

- [extracted/SystemLibrariesEnglishUS/Index.md](extracted/SystemLibrariesEnglishUS/Index.md)

适合的问题：

- 低通、PID、Timer 之类系统库块的帮助页在哪
- 是否已有现成标准块可复用

## 8. 我要找错误、告警或疑难问题的出处

先读：

- [ASCET Agent Coding Best Practices](../../ascet-agent-coding-best-practices.md)

再读：

- [extracted/TroubleShootingEnglishUS/Index.md](extracted/TroubleShootingEnglishUS/Index.md)
- [extracted/ImplementationEditorEnglishUS/markdown/IEd_Consistency_Checks.md](extracted/ImplementationEditorEnglishUS/markdown/IEd_Consistency_Checks.md)

适合的问题：

- consistency warning/error 的来源
- 某些 code generation / editor 报错代表什么

## 9. 如果我不确定该读什么

默认从这里开始：

1. [ASCET Agent Coding Best Practices](../../ascet-agent-coding-best-practices.md)
2. [ASCET Agent Signal and Implementation Field Guide](ascet-agent-signal-implementation-field-guide.md)
3. [ASCET Agent Help Source Map](ascet-agent-help-source-map.md)

如果还是不确定，再进：

- [extracted/index.md](extracted/index.md)
