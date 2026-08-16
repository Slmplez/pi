# ASCET Help Curated Index

本目录已经整理成一套面向 agent 的帮助入口，建议把它理解成四层：

1. `核心规则`
2. `任务导航`
3. `主题/来源导航`
4. `原始厂商资料`

默认不要直接从 `.chm` 或 `extracted/` 大目录开始读。先看下面两个核心文档，再按任务或主题继续下钻。

## 核心文档

- [ASCET Agent Coding Best Practices](../../ascet-agent-coding-best-practices.md)
  - 这是第一入口。
  - 适合回答：现在该怎么读、怎么改、哪些动作不能做、不同对象该走哪条路线。
- [ASCET Agent Signal and Implementation Field Guide](ascet-agent-signal-implementation-field-guide.md)
  - 这是 implementation/data/信号字段附录。
  - 适合回答：`Use Implementation Type`、`Formula`、`Min/Max`、`Impl. Type`、`Limit Assignments`、`Memory Location` 等字段到底该怎么理解。

## 新增导航文档

- [ASCET Agent Help Task Map](ascet-agent-help-task-map.md)
  - 按任务找资料。
  - 适合：`我要改 ESDL`、`我要分析 StateMachine`、`我要查 signal 字段`、`我要定位厂商依据`。
- [ASCET Agent Help Source Map](ascet-agent-help-source-map.md)
  - 按主题和来源找资料。
  - 适合：快速知道该去哪个 editor/help 包里查证据。

## 目录组织

### 1. 面向 agent 的核心层

- [ascet-agent-coding-best-practices.md](../../ascet-agent-coding-best-practices.md)
- [ascet-agent-signal-implementation-field-guide.md](ascet-agent-signal-implementation-field-guide.md)

这两份文档是当前 `help/` 目录的主轴。

### 2. 面向 agent 的导航层

- [ascet-agent-help-task-map.md](ascet-agent-help-task-map.md)
- [ascet-agent-help-source-map.md](ascet-agent-help-source-map.md)

这两份文档负责把核心层和厂商原始资料连起来。

### 3. 提炼后的知识目录

- [../esdl-editor/index.md](../esdl-editor/index.md)
- [../state-machine-editor/index.md](../state-machine-editor/index.md)
- [../implementation-editor/index.md](../implementation-editor/index.md)
- [../element-editor/index.md](../element-editor/index.md)
- [../data-editor/index.md](../data-editor/index.md)
- [../sender-receiver-editor/index.md](../sender-receiver-editor/index.md)

如果你已经知道自己要查哪个编辑器主题，优先走这些二级目录，而不是直接翻原始 CHM。

### 4. 原始厂商资料层

- [extracted/index.md](extracted/index.md)
- 本目录下的 `.chm` 原件

这里保留原始事实来源，便于追溯，但不适合作为默认起点。

## 推荐阅读顺序

### 默认顺序

1. [ASCET Agent Coding Best Practices](../../ascet-agent-coding-best-practices.md)
2. [ASCET Agent Signal and Implementation Field Guide](ascet-agent-signal-implementation-field-guide.md)
3. [ASCET Agent Help Task Map](ascet-agent-help-task-map.md)
4. 按需进入 editor 级索引或 [extracted/index.md](extracted/index.md)

### 如果你在做编码任务

1. [ASCET Agent Coding Best Practices](../../ascet-agent-coding-best-practices.md)
2. [../esdl-editor/index.md](../esdl-editor/index.md)
3. [../state-machine-editor/index.md](../state-machine-editor/index.md)
4. [ASCET Agent Help Source Map](ascet-agent-help-source-map.md)

### 如果你在改 signal / implementation

1. [ASCET Agent Signal and Implementation Field Guide](ascet-agent-signal-implementation-field-guide.md)
2. [../implementation-editor/index.md](../implementation-editor/index.md)
3. [../element-editor/index.md](../element-editor/index.md)
4. [../data-editor/index.md](../data-editor/index.md)

## 使用原则

- 先读核心层，再下钻。
- 先按任务定位，再看来源。
- 原始 `.chm` 和 `extracted/` 只在需要证据或细节时再进入。
- 如果一个问题同时涉及编码和字段语义，默认同时查两份核心文档。
