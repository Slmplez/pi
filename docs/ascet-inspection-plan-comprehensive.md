# ASCET Tools 全面检查方案

## 概述

本文档定义了覆盖 ASCET 模型全生命周期的完整检查方案。包含 **9 大规则家族**、**30+ 具体规则**、**6 类 ASCET ToolAPI 操作**，涵盖结构检查、代码检查、映射检查、语义检查、引用分析、差异对比、特殊判定和验证报告。

---

## 一、检查架构总览

```
┌─────────────────────────────────────────────┐
│              ASCET 检查框架                    │
├─────────────────────────────────────────────┤
│  Layer 0: 环境与可用性检查  (ascet_status)     │
│  Layer 1: 项目结构探索      (ascet_explore)   │
│  Layer 2: 组件搜索与定位    (ascet_search)     │
│  Layer 3: 组件内容读取      (ascet_read)       │
│  Layer 4: 确定性规则检查    (code_review)      │
│  Layer 5: 语义映射检查      (ai_review)        │
│  Layer 6: 引用分析          (ascet_reference)  │
│  Layer 7: 差异对比          (ascet_diff)       │
│  Layer 8: 特殊规则判定      (special_rules)    │
│  Layer 9: 回读验证与报告    (ascet_verify)     │
└─────────────────────────────────────────────┘
```

---

## 二、Layer 0：环境与可用性检查

检查 ASCET 安装路径和 ToolAPI 运行时可达性。

| 检查项 | 工具/方法 | 预期结果 |
|---|---|---|
| ASCET 运行时状态 | `ascet_status` | 返回安装路径 + live ToolAPI 可达 |
| 操作目录加载 | `ascet_capabilities(family="ops")` | 返回所有可用操作列表 |
| 计划任务队列健康 | `ascet_scheduler_status(action="status")` | 队列空闲 / 锁释放 |
| 排程恢复 | `ascet_recover(action="scheduler_recover")` | 清除卡住的任务 |

**场景**：
- 首次连接时验证 ASCET 是否就绪
- 超时/卡死时诊断排程器

---

## 三、Layer 1：项目结构探索

### 3.1 文件夹浏览

| 检查项 | 工具/方法 | 用途 |
|---|---|---|
| 列出根组件 | `ascet_explore(action="list_components", scopePath="DEMO")` | 浏览项目顶层 |
| 列出子组件 | `ascet_explore(action="preview_children", componentPath="DEMO\XXX")` | 展开组件内部结构 |
| 解析目标 | `ascet_explore(action="resolve_target", query="PID")` | 从名称推断完整路径 |
| 检查文件夹 | `ascet_explore(action="inspect_target", componentPath="DEMO\PID", detailLevel="summary")` | 获取组件概要 |

### 3.2 组件类型检查

| 检查项 | 工具/方法 | 验证点 |
|---|---|---|
| Class 类型确认 | `ascet_explore(action="inspect_target", kind="class")` | 确认为 Class 类型 |
| Module 类型确认 | `ascet_explore(action="inspect_target", kind="module")` | 确认为 Module 类型 |
| StateMachine 确认 | `ascet_explore(action="inspect_target", kind="statemachine")` | 确认为 StateMachine |
| 图表列表 | `ascet_explore(action="list_diagrams", componentPath="...")` | 查看所有 Block / State 图表 |

---

## 四、Layer 2：组件搜索与定位

### 4.1 组件搜索

| 检查项 | 工具/方法 | 说明 |
|---|---|---|
| 精确搜索 | `ascet_search(action="search_components", query="PID", match="exact")` | 精确名称匹配 |
| 通配搜索 | `ascet_search(action="search_components", query="*PID*", match="glob")` | 模糊名称匹配 |
| 包含搜索 | `ascet_search(action="search_components", query="PID", match="contains", limit=50)` | 部分名称匹配 |
| 组件解析 | `ascet_search(action="resolve_component", query="DEMO\PID")` | 唯一路径解析 |

### 4.2 元素搜索

| 检查项 | 工具/方法 | 说明 |
|---|---|---|
| 元素搜索 | `ascet_search(action="search_elements", componentPath="DEMO\PID", query="Speed")` | 在组件内搜索元素 |
| 元素分组过滤 | `ascet_search(action="search_elements", componentPath="...", group="primitive")` | 基本类型元素 |
| 复杂元素 | `ascet_search(action="search_elements", group="complex")` | 引用/结构体元素 |
| 引用元素 | `ascet_search(action="search_elements", group="referenced")` | 外部引用元素 |

### 4.3 出现位置搜索

| 检查项 | 工具/方法 | 说明 |
|---|---|---|
| 组件级出现 | `ascet_search(action="search_occurrences", query="SpeedFiltered", target="component")` | 组件名中包含 |
| 元素级出现 | `ascet_search(action="search_occurrences", query="SpeedFiltered", target="element")` | 元素定义中出现 |
| 代码级出现 | `ascet_search(action="search_occurrences", query="SpeedFiltered", target="code")` | 代码文本中出现 |

---

## 五、Layer 3：组件内容读取

### 5.1 类/模块/状态机摘要

| 检查项 | 工具/方法 | 内容 |
|---|---|---|
| 类摘要 | `ascet_read(action="read", componentPath="DEMO\PID")` | 方法列表、元素、变量 |
| 指定方法体 | `ascet_read(action="read", componentPath="...", methodName="calcOutput")` | 单个方法代码 |
| 代码读取 | `ascet_read(action="read_code", componentPath="...")` | Header / External-C |
| 实现列表 | `ascet_read(action="read_implementation", componentPath="...", implementationMode="list")` | 所有实现 |

### 5.2 代码块/数据流

| 检查项 | 工具/方法 | 用途 |
|---|---|---|
| Block Diagram | `ascet_read(action="read_block_diagram", componentPath="...", diagramName="Main")` | 读取块图结构 |
| State Flow | `ascet_read(action="read_state_machine_flow", componentPath="...")` | 读取状态机流转 |

### 5.3 导入/导出映射

| 检查项 | 工具/方法 | 说明 |
|---|---|---|
| 单元素映射 | `ascet_read(action="read_import_export_match", importerComponentPath="A", exporterComponentPath="B", elementName="SignalX")` | 检查一个元素的映射关系 |
| 全部映射 | `ascet_read(action="read_import_export_matches", importerComponentPath="A", exporterComponentPath="B")` | 检查两个组件间的所有映射 |

### 5.4 元素依赖规划

| 检查项 | 工具/方法 | 说明 |
|---|---|---|
| 规划依赖 | `ascet_read(action="plan_element_dependency", targetPath="DEMO\PID", targetKind="component")` | 列出可操作的依赖变更 |
| 文件夹依赖规划 | `ascet_read(action="plan_element_dependency", targetPath="DEMO", targetKind="folder")` | 文件夹范围依赖评估 |

---

## 六、Layer 4：确定性规则检查（核心）

这是 ASCET 代码审查的核心。所有检查由 `RAGEnhancedCodeReviewer` 实现，按规则家族分类。

### 6.1 信号与变量定义检查（Signal & Variable）

| 规则 ID | 规则名称 | 检查方法 | 严重度 |
|---|---|---|---|
| `signal.unused-local-variable` | 局部变量未使用 | `check_unused_variables()` | low |
| `signal.used-before-assignment` | 变量先读后赋值 | `check_used_but_unassigned_variables()` | high |
| `signal.imported-parameter-unmapped-or-unused` | 导入参数未映射或未使用 | `check_parameter_mismatches()` | medium |
| `signal.local-constant-parameter-unused` | 本地常量参数未使用 | `check_unused_variables()` | low |
| `signal.range-abnormal` | 信号范围异常 | `check_signal_range_issues()` | medium |

**检查逻辑示例**：

```
signal.used-before-assignment:
  1. 解析代码中的所有变量引用
  2. 按执行顺序扫描：
     - 读操作前没有写操作 → 标记缺陷
  3. 排除注释、字符串字面量、声明语句
```

**验证案例**：
- TP-001: 未引用局部变量
- TP-002: 先读后赋值
- FP-001: 赋值在读之前 → 无缺陷

### 6.2 方法返回值检查（Method & Return）

| 规则 ID | 规则名称 | 检查方法 | 严重度 |
|---|---|---|---|
| `method.illegal-main-return` | Main 代码中非法 return | `check_return_statement()` | high |
| `method.return-value-missing-method` | 返回值缺少对应方法 | `analyze_local_return_mappings()` | high |
| `method.method-missing-return` | 方法缺少 return | `check_return_statement()` | high |
| `method.local-variable-return-attribute-mismatch` | 局部变量与返回值属性不匹配 | `check_local_return_mismatch()` | medium |
| `method.assigned-local-return-attribute-mismatch` | 赋值源与返回值属性不兼容 | `check_local_return_mismatch()` | medium |

**特殊规则引用**：`special.formula-equivalence`（公式等价比较后判定）

**验证案例**：
- TP-001: Main 代码中直接 return
- TP-002: 有返回值声明但无 return
- FP-001: 有 return → 无缺陷

### 6.3 条件与循环结构检查（Condition & Loop）

| 规则 ID | 规则名称 | 检查方法 | 严重度 |
|---|---|---|---|
| `condition.too-many-if-conditions` | IF 条件过于复杂 | `check_complex_conditions()` | medium |
| `condition.duplicate-if-condition` | 重复的 IF 条件 | `check_duplicate_conditions()` | medium |
| `loop.potential-infinite-loop` | 潜在无限循环 | `check_infinite_loops()` | high |

**检查逻辑补充**：

```
condition.duplicate-if-condition:
  1. 提取同一 IF 链中的所有条件表达式
  2. 规范化空白和注释后比较
  3. 重复条件 → 后分支不可达 → 标记

loop.potential-infinite-loop:
  1. 识别循环控制变量
  2. 检查循环体内是否有控制变量更新
  3. 检查是否有明确的 break 出口
  4. 无更新 + 无 break → 标记无限循环
```

**验证案例**：
- TP-001: 重复 Else-IF 条件
- LOOP-TP-001: 循环变量未更新
- LOOP-FP-001: 循环变量更新 → 无缺陷

### 6.4 数值精度与位宽风险检查（Numeric）

| 规则 ID | 规则名称 | 检查方法 | 严重度 |
|---|---|---|---|
| `numeric.sint16-three-variable-multiply-overflow` | sint16 三变量乘法溢出 | `check_resolution_issues()` | high |
| `numeric.uint32-multiply-overflow` | uint32 乘法溢出 | `check_resolution_issues()` | high |
| `numeric.uint32-addition-precision-loss` | uint32 加法精度损失 | `check_resolution_issues()` | high |

**检查逻辑**：

```
numeric.sint16-three-variable-multiply-overflow:
  1. 识别乘法表达式中的操作数
  2. 检查是否有 ≥3 个 sint16 操作数
  3. 使用 min/max 元数据计算最大乘积
  4. 超出 sint16 支持范围 → 标记

numeric.uint32-multiply-overflow:
  1. 识别 uint32 乘法
  2. 计算操作数最大可能乘积
  3. 超过 uint32 容量 (2^32-1) → 标记
```

**验证案例**：
- TP-001: 三个 sint16 相乘
- TP-002: uint32 乘法超容量
- FP-001: 小范围 uint32 加法 → 无缺陷

### 6.5 参数映射一致性检查（Parameter Mapping）

| 规则 ID | 规则名称 | 检查方法 | 严重度 |
|---|---|---|---|
| `parameter.imported-local-attribute-mismatch` | 导入/本地参数属性不匹配 | `check_parameter_mismatches()` | medium |
| `parameter.mapping-missing-imported` | 映射缺少导入参数 | `check_parameter_mismatches()` | high |
| `parameter.mapping-missing-local` | 映射缺少本地参数 | `check_parameter_mismatches()` | high |
| `parameter.imported-unmapped-and-unused` | 导入参数未映射且未使用 | `check_parameter_mismatches()` | medium |
| `parameter.local-constant-unmapped` | 本地常量未映射 | `check_parameter_mismatches()` | low |
| `parameter.multiple-dependency-local-parameter` | 多依赖本地参数 | `check_parameter_mismatches()` | medium |

**特殊规则引用**：
- `special.noncalibration` - 非校准参数减轻严重度
- `special.dt-parameter` - dT 时间步长参数特殊处理
- `special.formula-equivalence` - 公式等价比较
- `special.multi-dependency-parameter` - 多依赖不自动标记

**验证案例**：
- TP-001: 导入/本地参数 range 不匹配
- TP-002: 映射引用不存在的本地参数
- FP-001: noncalibration 属性差异 → 无缺陷

---

## 七、Layer 5：语义映射检查（AI Review）

由 `RAGEnhancedAIReviewer` 实现，基于语义理解和规则匹配。

### 7.1 位置变量映射检查

| 规则 ID | 规则名称 | 严重度 |
|---|---|---|
| `semantic.position-variable-mapping` | 位置变量映射错误 | high |

**已知位置令牌**：

| 令牌 | 含义 |
|---|---|
| `FL` | 左前 (Front Left) |
| `FR` | 右前 (Front Right) |
| `RL` | 左后 (Rear Left) |
| `RR` | 右后 (Rear Right) |

**检查逻辑**：
- 标记：具体车轮位置的值被赋给不兼容的位置输出
- 不标记：顺序不同但语义不变；抽象变量不含 FL/FR/RL/RR；后缀如 `_U` 与位置无关

**验证案例**：
- TP-001: FR 信号赋给 FL 输出
- FP-001: 条件顺序不同但赋值正确 → 无缺陷

### 7.2 返回值名称映射检查

| 规则 ID | 规则名称 | 严重度 |
|---|---|---|
| `semantic.return-variable-name-mapping` | 返回值命名映射错误 | medium |

**检查逻辑**：
- 标记：返回变量名与方法声明的语义角色矛盾
- 不标记：泛型后缀差异（除非后缀被定义为 ASCET 映射语义）

**验证案例**：
- FP-001: `_U` 后缀非位置令牌 → 无缺陷

### 7.3 参数名称一致性检查

| 规则 ID | 规则名称 | 严重度 |
|---|---|---|
| `semantic.parameter-name-consistency` | 参数命名一致性错误 | high |

**检查逻辑**：
- 标记：参数名与方法名代表矛盾语义角色
- 不标记：命名变化无语义冲突且无行为影响 → No Defect

**验证案例**：
- TP-001: `calcFrontLeft(WheelSpeed_FR)` → FR 参数传给 FL 方法

### 7.4 AI 报告格式合约

```json
// 无缺陷时
{"findings":[],"review_summary":"No defects found."}

// 有缺陷时
{
  "findings": [
    {
      "type": "semantic.position-variable-mapping",
      "severity": "high",
      "is_error": true,
      "message": "位置变量映射错误",
      "evidence": "WheelSpeed_FL = WheelSpeed_FR",
      "location": "method calcOutput line 42",
      "involved_variables": ["WheelSpeed_FL", "WheelSpeed_FR"],
      "recommendation": "检查 FL/FR 赋值是否正确"
    }
  ]
}
```

---

## 八、Layer 6：引用分析

### 8.1 引用类辅助检查（Reference Class）

| 规则 ID | 规则名称 | 严重度 |
|---|---|---|
| `reference.code-extraction-failed` | 引用类代码提取失败 | medium |
| `reference.complexity-risk` | 引用类复杂度风险 | risk |
| `reference.error-handling-focus` | 引用类错误处理关注项 | low (attention) |

### 8.2 ASCET 引用操作

| 操作 | 工具/方法 | 用途 |
|---|---|---|
| 组件出站引用 | `ascet_reference(action="component_refs", componentPath="DEMO\PID", direction="out")` | 查看组件依赖了哪些其他组件 |
| 组件出站引用（含深度） | `ascet_reference(action="component_refs", componentPath="...", depth=2)` | 递归依赖分析 |
| 反向引用 | `ascet_reference(action="used_by", componentPath="DEMO\PID", scopePath="DEMO")` | 哪些组件引用了我 |
| 元素引用 | `ascet_reference(action="element_refs", componentPath="DEMO\PID", elementName="SpeedFiltered")` | 元素被引用的位置 |

### 8.3 依赖分析场景

```
场景 1：组件变更影响分析
  1. component_refs(direction="out") → 找出所有依赖的外部组件
  2. used_by(scopePath="DEMO") → 找出所有依赖我的组件
  3. 评估变更波及范围

场景 2：循环依赖检测
  1. component_refs(direction="out", depth=3)
  2. 检查结果中是否包含自身 → 循环依赖
```

---

## 九、Layer 7：差异对比

### 9.1 组件/方法对比

| 操作 | 工具/方法 | 用途 |
|---|---|---|
| 组件比较 | `ascet_diff(action="diff", leftPath="A", rightPath="B", objectKind="class")` | 两个 Class 差异 |
| Module 比较 | `ascet_diff(action="diff", objectKind="module")` | 两个 Module 差异 |
| StateMachine 比较 | `ascet_diff(action="diff", objectKind="statemachine")` | 两个状态机差异 |
| 方法比较 | `ascet_diff(action="diff_method", leftPath="A", rightPath="B", methodName="calc")` | 单个方法差异 |
| 仅变化项 | `ascet_diff(..., changesOnly=true)` | 只返回有差异的部分 |

### 9.2 规格/公式对比

| 操作 | 工具/方法 | 用途 |
|---|---|---|
| 元素规格对比 | `ascet_diff(action="diff_element_spec", componentPath="DEMO\PID", specFile="spec.json")` | 规格文件与组件对比 |
| 项目公式对比 | `ascet_diff(action="diff_project_formulas", projectPath="DEMO")` | 对比项目级别的公式 |
| 状态机域对比 | `ascet_diff(action="diff_state_machine_domain", componentPath="...")` | 状态机域定义对比 |

### 9.3 差异对比场景

```
场景 1：审查变更 - 比较修改前后
  ascet_diff(action="diff", leftPath="DEMO\PID_old", rightPath="DEMO\PID_new", changesOnly=true)

场景 2：合规检查 - 与规格文件对比
  ascet_diff(action="diff_element_spec", componentPath="DEMO\PID", specFile="baseline_spec.json")

场景 3：代码审查 - 方法级别差异
  ascet_diff(action="diff_method", leftPath="A", rightPath="B", methodName="calcOutput")
```

---

## 十、Layer 8：特殊规则判定

所有特殊规则作为**前置规则**在报告其他规则之前应用。

### 10.1 特殊规则总表

| 规则 ID | 规则名称 | 应用场景 |
|---|---|---|
| `special.noncalibration` | 非校准规则 | 参数映射属性差异中，当元数据为 noncalibration，减轻或抑制缺陷 |
| `special.dt-parameter` | dT 参数规则 | dT 和已知时间步长参数，避免假阳性 |
| `special.formula-equivalence` | 公式等价规则 | 比较公式前规范化文本，无害格式变化不算缺陷 |
| `special.multi-dependency-parameter` | 多依赖参数规则 | 一个本地参数被多个导入参数映射不自动标记，仅当语义重叠不安全时标记 |
| `special.abstract-mapping` | 抽象映射规则 | 抽象变量不包含具体位置，不触发位置变量映射缺陷 |

### 10.2 特殊规则应用流程

```
对所有确定性规则结果:
  for each issue:
    if issue involves formula:
      apply special.formula-equivalence → 如果等价则抑制

    if issue involves calibration metadata:
      apply special.noncalibration → 如果仅校准差异则降级/抑制

    if issue involves dT parameter:
      apply special.dt-parameter → 如果符合 dT 约定则抑制

    if issue involves multi-dependency local parameter:
      apply special.multi-dependency-parameter → 如果不含语义冲突则降级

    if issue involves abstract variable:
      apply special.abstract-mapping → 如果不映射具体位置则抑制
```

---

## 十一、Layer 9：回读验证与报告

### 11.1 回读验证

| 操作 | 工具/方法 | 说明 |
|---|---|---|
| Class 回读 | `ascet_verify(action="readback", objectKind="class", componentPath="DEMO\PID")` | 验证写入后的 Class 状态 |
| Module 回读 | `ascet_verify(action="readback", objectKind="module", componentPath="...")` | 验证写入后的 Module 状态 |
| StateMachine 回读 | `ascet_verify(action="readback", objectKind="statemachine", componentPath="...")` | 验证写入后的 StateMachine |
| 项目公式回读 | `ascet_verify(action="readback", objectKind="project", projectPath="DEMO")` | 验证写入后的项目公式 |

### 11.2 报告输出合约

检查结果必须遵循以下输出合约：

```
输出字段:
  basic_issues:       原始规则检查结果列表
  rule_error_details: 规则错误详细信息（含类型/严重度/描述/行号）
  rule_severity_stats:按严重度统计
  total_rule_errors:  规则错误总数
  severity_distribution: 严重度分布

AI 检查输出:
  findings:           AI 检查结果列表
  review_summary:     审查摘要
  ai_errors:          AI 发现的错误
  ai_error_details:   AI 错误详细信息
  arbitrated_ai_errors: 仲裁后的 AI 错误

报告汇总:
  rule_errors:        规则错误数
  ai_errors:          AI 错误数
  total_errors:       总错误数
  rule_error_details: 规则错误详情
  ai_error_details:   AI 错误详情
  rule_severity_stats:规则严重度统计
```

### 11.3 报告生成流程

```
1. 执行所有确定性规则检查 → basic_issues + rule_error_details
2. 执行 AI 语义检查 → findings + ai_error_details
3. 运行特殊规则仲裁 → 更新/抑制部分错误
4. 统计汇总 → total_rule_errors, severity_distribution
5. 打包报告 → rule_errors, ai_errors, total_errors
6. GUI 渲染 → error_statistics_dialog + main_window
```

---

## 十二、完整检查场景示例

### 场景 1：组件代码审查流水线

```
1. ascet_status                              # 验证环境
2. ascet_explore(action="resolve_target")    # 定位目标组件
3. ascet_explore(action="inspect_target")    # 获取组件摘要
4. ascet_read(action="read")                 # 读取组件代码
5. check_unused_variables()                  # 信号变量检查
6. check_used_but_unassigned_variables()     # 先读后赋值检查
7. check_return_statement()                  # 返回值检查
8. check_signal_range_issues()              # 信号范围检查
9. check_parameter_mismatches()             # 参数映射检查
10. check_complex_conditions()              # 条件复杂度检查
11. check_duplicate_conditions()            # 重复条件检查
12. check_infinite_loops()                  # 无限循环检查
13. check_resolution_issues()               # 数值风险检查
14. check_local_return_mismatch()           # 本地返回值匹配检查
15. check_coverage_issues()                 # 覆盖率检查
16. check_missing_final_else()              # 缺少 final else 检查
17. RAGEnhancedAIReviewer.review()          # 语义映射检查
18. 应用特殊规则仲裁                       # 特殊规则抑制/降级
19. 生成报告                               # 统计汇总输出
```

### 场景 2：跨组件变更影响分析

```
1. ascet_reference(action="component_refs", componentPath="A", depth=2)
2. ascet_reference(action="used_by", componentPath="A", scopePath="DEMO")
3. ascet_search(action="search_occurrences", query="A.SignalX", target="code")
4. ascet_diff(action="diff", leftPath="A_old", rightPath="A_new", changesOnly=true)
5. 汇总受影响的组件列表
```

### 场景 3：写入操作前的验证

```
1. ascet_read(action="plan_element_dependency", targetPath="DEMO\PID")
2. ascet_write(action="set_method_code", ..., executeWrite=false)  # 预检
3. ascet_write(action="set_method_code", ..., executeWrite=true)   # 确认写入
4. ascet_verify(action="readback", objectKind="class", componentPath="DEMO\PID")
5. ascet_diff(action="diff_method", leftPath="DEMO\PID", rightPath="DEMO\PID.backup")
```

### 场景 4：模块导入/导出映射审查

```
1. ascet_read(action="read_import_export_matches",
       importerComponentPath="DEMO\Importer",
       exporterComponentPath="DEMO\Exporter")
2. check_parameter_mismatches()  # 参数映射一致性
3. 应用 special.noncalibration   # 校准元数据检查
4. 应用 special.dt-parameter     # 时间步长特殊处理
5. 报告所有映射缺陷
```

### 场景 5：状态机审查

```
1. ascet_read(action="read_state_machine_flow", componentPath="DEMO\SM")
2. ascet_diff(action="diff_state_machine_domain", componentPath="DEMO\SM")
3. 检查状态入口/出口/静态 ESDL
4. 检查转换条件和动作
5. 验证起始状态
```

---

## 十三、测试验证要求

### 13.1 案例验证

```powershell
python scripts/validate-cases.py C:\Users\ZJR\.agents\skills\ascet-inspection-rules\cases
```

所有案例文件必须通过字段验证。

### 13.2 项目测试

| 测试文件 | 测试范围 |
|---|---|
| `test_code_review_service_contract.py` | 确定性规则检查合约 |
| `test_ai_review_service_contract.py` | AI 语义检查合约 |
| `test_ai_error_extractor_contract.py` | AI 错误提取合约 |
| `test_report_generation_service.py` | 报告生成合约 |
| `test_generate_report_use_case.py` | 用例层报告合约 |
| `test_review_domain_compatibility.py` | 域兼容性 |
| `smoke/test_compatibility_imports.py` | 导入兼容性冒烟测试 |

### 13.3 变更最小验证矩阵

| 变更类型 | 最低检查要求 |
|---|---|
| 规则文本/参考更新 | 案例验证 |
| 新增或修改案例 | 案例验证 |
| 确定性规则代码变更 | `test_code_review_service_contract.py` + 相关案例 |
| 语义检查输出变更 | `test_ai_review_service_contract.py` + `test_ai_error_extractor_contract.py` |
| 报告/统计变更 | `test_report_generation_service.py` + `test_generate_report_use_case.py` |

---

## 十四、数据流总图

```
ASCET Model (ToolAPI)
       │
       ▼
┌─────────────────┐
│ ascet_explore   │──→ 组件/文件夹/图表列表
├─────────────────┤
│ ascet_search    │──→ 精确/模糊搜索
├─────────────────┤
│ ascet_read      │──→ 代码/方法/块图/状态流
├─────────────────┤
│ ascet_reference │──→ 出站/入站引用
├─────────────────┤
│ ascet_diff      │──→ 差异对比
├─────────────────┤
│ ascet_verify    │──→ 回读验证
└─────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│       Code Review Service            │
│                                      │
│  check_unused_variables              │
│  check_used_but_unassigned_variables │
│  check_return_statement              │
│  check_signal_range_issues           │
│  check_complex_conditions            │
│  check_duplicate_conditions          │
│  check_infinite_loops                │
│  check_resolution_issues             │
│  check_parameter_mismatches          │
│  check_local_return_mismatch         │
│  check_missing_final_else            │
│  check_coverage_issues               │
└──────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│       AI Review Service              │
│                                      │
│  semantic.position-variable-mapping  │
│  semantic.return-variable-name-mapping│
│  semantic.parameter-name-consistency │
└──────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│       Special Rules Arbitration      │
│                                      │
│  special.noncalibration              │
│  special.dt-parameter                │
│  special.formula-equivalence         │
│  special.multi-dependency-parameter  │
│  special.abstract-mapping            │
└──────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│       Report Generation              │
│                                      │
│  basic_issues / rule_error_details   │
│  findings / ai_error_details        │
│  total_errors / severity_dist        │
└──────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│       GUI Consumers                  │
│                                      │
│  error_statistics_dialog             │
│  main_window_legacy_base             │
└──────────────────────────────────────┘
```

---

## 十五、附录

### A. 规则 ID 完整清单

| 家族 | 规则数量 | 规则 ID |
|---|---|---|
| Signal & Variable | 5 | `signal.unused-local-variable`, `signal.used-before-assignment`, `signal.imported-parameter-unmapped-or-unused`, `signal.local-constant-parameter-unused`, `signal.range-abnormal` |
| Method & Return | 5 | `method.illegal-main-return`, `method.return-value-missing-method`, `method.method-missing-return`, `method.local-variable-return-attribute-mismatch`, `method.assigned-local-return-attribute-mismatch` |
| Condition & Loop | 3 | `condition.too-many-if-conditions`, `condition.duplicate-if-condition`, `loop.potential-infinite-loop` |
| Numeric | 3 | `numeric.sint16-three-variable-multiply-overflow`, `numeric.uint32-multiply-overflow`, `numeric.uint32-addition-precision-loss` |
| Parameter Mapping | 6 | `parameter.imported-local-attribute-mismatch`, `parameter.mapping-missing-imported`, `parameter.mapping-missing-local`, `parameter.imported-unmapped-and-unused`, `parameter.local-constant-unmapped`, `parameter.multiple-dependency-local-parameter` |
| Reference Class | 3 | `reference.code-extraction-failed`, `reference.complexity-risk`, `reference.error-handling-focus` |
| Semantic Mapping | 3 | `semantic.position-variable-mapping`, `semantic.return-variable-name-mapping`, `semantic.parameter-name-consistency` |
| Special Rules | 5 | `special.noncalibration`, `special.dt-parameter`, `special.formula-equivalence`, `special.multi-dependency-parameter`, `special.abstract-mapping` |
| Implementation-Only | 1 | `implementation.missing-final-else` |

### B. ASCET ToolAPI 操作索引

| 家族 | 可操作 | 不支持 |
|---|---|---|
| explore | `list_components`, `list_diagrams`, `resolve_target`, `inspect_target`, `preview_children` | `list_folders`, `list_methods` |
| search | `search_components`, `resolve_component`, `search_elements`, `search_occurrences` | - |
| read | `read`, `read_code`, `read_implementation`, `read_block_diagram`, `read_state_machine_flow`, `read_import_export_match`, `read_import_export_matches`, `plan_element_dependency` | `read_component_snapshot`, `read_class_snapshot`, `read_module_snapshot`, `read_state_machine_snapshot`, `read_element_catalog`, `read_module_closure`, `read_component_code` |
| reference | `component_refs`, `used_by`, `element_refs` | - |
| diff | `diff`, `diff_method`, `diff_component_snapshot`, `diff_state_machine_domain`, `diff_element_spec`, `diff_project_formulas` | - |
| write | `create_folder`, `create_component`, `create_method`, `delete_component`, `delete_method`, `delete_folder`, `set_method_code`, `set_class_method_code`, `set_module_code`, `set_state_machine_code`, `apply_element_spec`, `apply_project_formula`, `set_element_dependency` | - |
