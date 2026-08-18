# ASCET Read Tools TDD Bug-Fix Specification

## 1. 文档状态

- 日期：2026-08-18
- 状态：Implemented and verified
- 输入报告：`C:\Repo\11_ASCETCopilotLiveTest\01_TESTPLAN\F05_IPB_L2_0429\ReadToolsBugReport.md`
- 范围：ASCET `ascet_read` 结果 Contract 根本修复
- 方法：按公开行为进行纵向 TDD，严格执行 Red → Green

## 2. 目标

恢复下列 Read Tools 的完整公开能力，并消除后端成功后被上层误判为 Contract violation 的问题：

1. `read_code(detailLevel=full)`；
2. `read_implementation` 的 `list/default/class-impl/impl`；
3. `read_state_machine_flow(detailLevel=full)`；
4. `read_dependent_chain` 完整依赖链；
5. `read_element_dependency(targetKind=project)` 的真实能力语义；
6. Read Action 的业务错误与 Contract 错误区分。

本次修复的完成标准不是“错误文本消失”，而是公开工具返回的数据完整、语义真实、Contract 可验证。

## 3. 第一性原理

Read Tool 的公开承诺是：

```text
后端成功读取了什么，公开结果就必须无损表达什么。
```

由此得到以下不可违反的规则：

1. public result 必须始终是机器可读 JSON，不能因结果较大而变成普通文本提示；
2. `full` 必须返回完整内容，不能静默降级成 summary/topology 或仅返回 artifact 提示；
3. 不同 Action 或 mode 可以返回不同结构，不应强制压入一个通用业务 payload；
4. 不得通过删除字段、丢弃嵌套对象或返回空数组绕过校验；
5. “没有结果”和“无法执行该范围”必须是不同语义；
6. `result_contract_mismatch` 只表示内部 Contract 缺陷，不能覆盖正常业务负例。

## 4. 当前代码基线与根因

### 4.1 已确认的公共校验链

当前公共执行链为：

```text
ascetReadTool.execute
→ formatAscetReadResult
→ content[0].text
→ assertAscetActionResult
→ JSON.parse(content text)
→ TypeBox result Contract
```

相关路径：

- `packages/ascet-extension/src/tools/read/definition.ts`
- `packages/ascet-extension/src/core/tool.ts`
- `packages/ascet-extension/src/tools/actions/contracts/read.ts`
- `packages/ascet-extension/src/cli.ts`
- `packages/ascet-extension/src/tool-response-contract.ts`

### 4.2 根因 A：大结果被转换成非 JSON 文本

`formatAscetCliJsonResult` 在格式化结果超过阈值时调用 `formatPersistedSuccess`。后者返回包含摘要、文件路径和搜索提示的普通文本。

`assertAscetActionResult` 随后无法把该文本解析成 JSON object，最终抛出：

```text
ASCET action result violates Contract
```

这能够解释为什么小型 summary 成功，而包含完整代码或完整实现的结果失败。

根本修复要求：

> 公开 Read Action 的 `content[0].text` 不论大小都必须保持 Contract-valid JSON；承诺 `full` 的 Action 必须在公开结果中保留完整内容。

### 4.3 根因 B：公共结果压缩是有损的

`compactObject` 会统一重命名、删除空字段和折叠部分结构。该行为适合展示摘要，不适合作为 Read Tools 的无损公共 Contract。

`read_dependent_chain` 还通过 `createDependentChainOutput` 将后端完整结果压缩为：

```text
found + local/imported/exported
```

从而丢失报告要求的：

```text
dependencyFormula
binding.formal
binding.formula
binding.variantPolicy
complete
```

根本修复要求：

> 展示压缩不能发生在公开数据 Contract 之前；公开 Read payload 只能做确定性命名适配，不能删除业务信息。

### 4.4 根因 C：请求模式被静默改写

`read_state_machine_flow` 当前将：

```text
detailLevel=topology
```

改写为：

```text
detailLevel=summary
```

这违反了调用方请求语义，也使 topology 无法形成独立可验证行为。

根本修复要求：

> public 参数必须一对一传递到实际能力；后端不支持时返回明确错误，不允许静默降级。

### 4.5 根因 D：能力不可用被包装成空成功

Project dependency enumeration 当前可能返回：

```json
{
  "total": 0,
  "items": [],
  "issues": ["project_component_enumeration_unavailable"]
}
```

该结果不能证明“没有 dependency”，只能证明“没有完成枚举”。

根本修复要求：

> 未执行完整读取时不能返回完整成功语义。

## 5. 测试接缝

本 spec 锁定以下三个行为接缝。实施前如需更改接缝，必须先更新本 spec；不得转而测试私有 helper 来绕过公开失败。

### Seam A：TypeScript 公开工具接缝

入口：

```text
ascetReadTool.execute(...)
```

观察：

- `content[0].text` 是否为可解析 JSON；
- JSON 是否通过对应 Action Contract；
- 完整业务字段是否保留；
- 请求 mode/detailLevel 是否保持语义；
- 负例是否返回正确错误。

主要测试文件：

- `packages/ascet-extension/src/tools/read/definition.test.ts`
- `packages/ascet-extension/src/tools/read/schema.test.ts`
- 必要时新增对应 Action 的公开行为测试文件。

### Seam B：Bridge command 接缝

入口：

```text
AscetCli exec <read operation> ... --json
```

观察：

- Bridge JSON envelope；
- 后端成功结果的真实字段；
- mode/detailLevel 参数行为；
- 后端业务错误码；
- Project enumeration capability 状态。

主要测试位置：

- `ascetcli/tests/AscetReadHostSmoke.cs`
- 各 Read command 已有 focused smoke tests。

不得通过 mock C# 内部私有方法代替 command 行为测试。

### Seam C：Live ASCET 接缝

入口：报告中的真实 `ascet_read` 调用。

观察：

- Scheduler 成功后 public tool 是否返回完整结果；
- live 字段与 Contract 是否一致；
- 正例和负例是否可区分。

Live 测试只在对应非 live Red → Green 完成后执行，不能用 live 调试代替自动回归测试。

## 6. TDD 执行规则

每个切片严格执行：

```text
一个公开行为测试失败
→ 只实现使该测试通过的最小修改
→ 运行该测试确认 Green
→ 运行已完成切片的聚焦回归
→ 进入下一切片
```

禁止：

- 一次写完所有测试后再实现；
- 先修改实现再补测试；
- 测试私有 helper 或内部调用次数；
- 用 snapshot 代替关键字段断言；
- mock 掉公开结果格式化和 Contract 校验；
- 在 Green 修改中提前实现后续切片；
- 为通过测试删除 mode、字段或完整内容。

预期值必须来自本 spec、Bug Report 中的固定样例或 Bridge 已确认的真实结果，不能由生产代码重新计算后再断言自己。

# 7. 纵向 TDD 切片

## Slice 1：锁定“Read 成功结果始终为 JSON”

### 行为

任何成功的公开 Read Action，即使结果超过输出阈值，`content[0].text` 仍是可解析 JSON，并能通过 Action Contract。

### Red

在 `definition.test.ts` 增加公开工具测试：

1. mock Bridge 返回超过当前 artifact threshold 的成功 JSON；
2. 调用 `ascetReadTool.execute`；
3. 断言 `JSON.parse(content[0].text)` 成功；
4. 断言完整标记字段仍存在；
5. 断言执行不抛出 Contract violation；
6. 断言结果不是普通文本 artifact 提示。

测试应先在当前实现上失败。

### Green

最小修改公共 Read 格式化边界，使 Read 成功结果始终输出 JSON。

约束：

- 不修改全局阈值来碰巧覆盖 7 KB fixture；
- 不把普通文本提示包在 JSON 字符串中；
- 不只针对 `read_code` 写特殊长度判断；
- 不删除现有 artifact 基础设施；
- artifact 可以作为附加信息存在，但不能替代 `full` payload。

### 退出条件

- 大结果公开测试 Green；
- 原有小结果测试保持 Green；
- `assertAscetActionResult` 无需放宽为接受任意字符串。

## Slice 2：恢复 `read_code(full)` 无损返回

### 行为

报告中的 `read_code(full)` 返回完整 method body 及稳定元数据。

### Red

增加公开工具测试，Bridge 固定返回：

```text
componentPath
componentKind
languageKind
section
methodName
text
```

其中 `text` 长度必须超过当前 artifact threshold。

断言公开结果包含：

```text
component
kind
language
section
name
code 或 text
hash
lineCount
byteCount
```

并断言：

- 完整代码中的首行、中间行、末行都存在；
- `lineCount` 和 `byteCount` 使用固定预期值；
- `detailLevel=full` 没有变成 artifact-only 结果；
- summary/topology 不返回完整代码，但继续返回 hash/count。

### Green

只修复 `read_code` 的结果映射和 detail-level 行为。

允许统一公开字段名称，但不得删除原始代码内容。字段选择必须固定，例如选择 `code` 后不得在不同路径交替返回 `text/body/code`。

### Live 退出条件

使用报告 fixture：

```text
PlatformLibrary\Package\AVH_AutomaticVehicleHold\private\AVH_CustStateLogic
methodName=calc
section=body
detailLevel=full
```

验证完整代码可读取，且 Search line/span 能定位到公开返回的代码文本。

## Slice 3：恢复 `read_implementation` 各模式

### 行为

以下调用均返回机器可读且完整的对应结果：

```text
list
default
class-impl
impl + implementationName
```

### Red

按纵向顺序逐个增加测试，每个模式独立完成 Red → Green：

1. `list` 保持当前行为；
2. `default` 返回解析后的默认实现内容；
3. `class-impl` 返回 class implementation 内容；
4. `impl` 返回指定实现内容；
5. `impl` 缺少名称返回参数错误；
6. 实现名称不存在返回 `not_found` 或 Bridge 现有等价错误；
7. 后端明确不支持 mode 时返回 `unsupported_implementation_mode`。

每个成功测试必须包含超过阈值的嵌套 payload，用于证明不是只修复小结果。

### Green

- 保持 mode 与 Bridge 参数一对一；
- 根据真实 Bridge 结果建立最小 mode-specific Contract；
- 不把具体实现读取压缩为 list；
- 不添加新的遍历参数或 speculative metadata；
- 不改变 Enumeration `typeDefinition.enumerators` 的现有读取路径。

### Live 退出条件

使用报告中的 `AVH_CustStateLogic`，按 `list → impl` 链路验证：

- list 返回 `Impl`；
- `default`、`class-impl` 和 `impl=Impl` 不再触发 Contract mismatch；
- 返回内容能证明实际读取的是哪一个 implementation。

## Slice 4：恢复 StateMachine detail-level 语义

### 行为

`summary`、`topology`、`full` 是三个不同且不静默降级的公开请求。

### Red

依次增加：

1. topology 请求必须原样传递，不得映射为 summary；
2. full 返回 states、transitions、startState；
3. full 保留 entry/exit/static method；
4. full 保留 transition condition/action；
5. `traceDepth` 在结果或可验证行为中反映实际值；
6. Class 目标仍返回 kind mismatch。

### Green

- 删除 topology → summary 的静默改写；
- 如果 Bridge 已支持 topology，直接传递；
- 如果 Bridge 尚不支持 topology，先在 Bridge command 接缝实现真实 topology 行为，不能在 TypeScript 层伪造；
- full 只做字段命名适配，不压缩嵌套 flow。

### Live 退出条件

使用报告中的 `AVH_StateMachine`：

- summary/topology/full 均保持独立语义；
- full 返回完整 state 和 transition 细节；
- 不再因结果大小返回 Contract violation。

## Slice 5：恢复完整 dependent chain

### 行为

成功结果表达完整关系：

```text
Provider Exported Parameter
→ Consumer Imported Parameter
→ Consumer Local Dependent Parameter
```

并保留：

```text
dependencyFormula
binding.formal
binding.formula
binding.variantPolicy
complete
```

### Red

增加一个公开工具正例，固定 Bridge 结果包含完整 dependent-chain metadata。

断言公开结果同时包含：

- provider/exported；
- consumer/imported；
- consumer/local；
- binding；
- `complete=true`。

该测试必须在当前 `createDependentChainOutput` 投影上失败，以证明当前有损输出被捕获。

随后分别增加负例：

- 普通 imported parameter → `not_dependent_chain`；
- 普通 local variable → `not_dependent_chain`；
- element 不存在 → `not_found`；
- provider 无法唯一解析 → 保持当前精确业务错误。

### Green

- 用一个无损 dependent-chain 公开结构替代当前 `found + chain` 有损投影；
- 可以保留易读的 local/imported/exported 层级，但必须包含 binding 和 complete；
- 不为本切片重写 provider discovery；
- 不删除当前明确 exporter 路径能力；
- 不把“不完整链”当成完整成功。

### Live 退出条件

使用报告中的：

```text
PI_ASCET_EDIT_20260818_DEP_CHAIN_DIRECT_001\Consumer
C_Threshold
```

验证正例完整链，并验证两个普通 element 负例不再返回 Contract mismatch。

## Slice 6：修正 Project dependency capability 语义

### 行为

当 Project component enumeration 不可用时，公开工具返回明确错误，而不是 `total=0` 的成功结果。

### Red

固定 Bridge 返回：

```text
items=[]
issues=[project_component_enumeration_unavailable]
```

公开行为断言：

```text
error.code=project_component_enumeration_unavailable
```

并增加对照测试：真实完成枚举且没有依赖时，才允许返回：

```text
total=0
items=[]
```

### Green

在能力状态第一次被确定的边界上返回错误。不得在渲染层通过字符串匹配制造错误。

component 和 folder scope 不得受影响。

### Live 退出条件

使用报告中的 Project fixture，确认调用方可以区分：

```text
没有 dependency
```

与：

```text
Project enumeration unavailable
```

## Slice 7：收紧公开 Contract

### 行为

每个已修复 Action 的 Contract 能验证其真实结果，并能在字段被意外删除时使测试失败。

### Red

为四个 P0 Action 增加 Contract regression：

- 删除 full code 字段时失败；
- 删除 implementation identity/content 时失败；
- 删除 StateMachine transitions 时失败；
- 删除 dependent-chain binding 时失败；
- 错误对象缺少 code/message 时失败。

### Green

将当前所有 Read Action 共用的宽泛：

```text
Type.Object({}, { additionalProperties: true })
```

替换为本轮已确认 Action 的最小真实结果 Contract。

约束：

- 只为已确认字段建模；
- 不建立万能 envelope；
- 不要求所有模式拥有相同字段；
- 不为未来能力增加大量 optional 字段；
- 未纳入本轮的 Read Action 保持现状，避免扩大修复范围。

# 8. 测试矩阵

| Action | 场景 | 自动测试 | Live | 必须证明 |
|---|---|---:|---:|---|
| `read_code` | summary | 是 | 是 | 无 full code，hash/count 存在 |
| `read_code` | topology | 是 | 是 | 请求语义不变 |
| `read_code` | full/large | 是 | 是 | 完整代码仍为 JSON payload |
| `read_implementation` | list | 是 | 是 | 实现列表完整 |
| `read_implementation` | default | 是 | 是 | 默认实现内容完整 |
| `read_implementation` | class-impl | 是 | 是 | class impl 内容完整或明确 unsupported |
| `read_implementation` | impl | 是 | 是 | 指定实现可回读 |
| `read_state_machine_flow` | summary | 是 | 是 | 摘要稳定 |
| `read_state_machine_flow` | topology | 是 | 是 | 不被改写为 summary |
| `read_state_machine_flow` | full | 是 | 是 | 完整 states/transitions/code |
| `read_dependent_chain` | 完整链 | 是 | 是 | provider/imported/local/binding |
| `read_dependent_chain` | 非 chain element | 是 | 是 | `not_dependent_chain` |
| `read_element_dependency` | component | 是 | 是 | 现有能力不回退 |
| `read_element_dependency` | folder | 是 | 是 | 现有能力不回退 |
| `read_element_dependency` | project unavailable | 是 | 是 | 明确 capability error |

# 9. 预期修改范围

## TypeScript

核心候选路径：

- `packages/ascet-extension/src/cli.ts`
- `packages/ascet-extension/src/tool-response-contract.ts`
- `packages/ascet-extension/src/core/tool.ts`
- `packages/ascet-extension/src/tools/actions/contracts/read.ts`
- `packages/ascet-extension/src/tools/read/definition.ts`
- `packages/ascet-extension/src/read-text-code.ts`
- `packages/ascet-extension/src/read-implementation.ts`
- `packages/ascet-extension/src/read-state-machine-flow.ts`
- `packages/ascet-extension/src/read-dependent-chain.ts`
- `packages/ascet-extension/src/read-element-dependency.ts`

测试候选路径：

- `packages/ascet-extension/src/tools/read/definition.test.ts`
- `packages/ascet-extension/src/tools/read/schema.test.ts`
- `packages/ascet-extension/src/read-implementation.test.ts`
- `packages/ascet-extension/src/read-dependent-chain.test.ts`

修改必须以 Red 测试证明需要为前提，不要求上述文件全部发生变化。

## C# Bridge

只有当 Bridge command seam 的 Red 测试证明实际结果缺失或 mode 未实现时，才修改：

- `ascetcli/src/AscetCli/AscetReadTextCode.cs`
- `ascetcli/src/AscetCli/AscetReadImplementation.cs`
- `ascetcli/src/AscetCli/AscetReadStateMachineFlow.cs`
- `ascetcli/src/AscetCli/AscetReadElementDependency.cs`
- `ascetcli/src/AscetCopilot/Services/Read/AscetDependentChainReadService.cs`
- `ascetcli/tests/AscetReadHostSmoke.cs`

禁止先重构 Bridge 再寻找测试理由。

# 10. 验证命令策略

每个切片只运行对应聚焦测试，测试文件修改后必须立即运行并修复到 Green。

TypeScript 聚焦测试从 `packages/ascet-extension` 目录执行，例如：

```text
node ../../node_modules/vitest/dist/cli.js --run src/tools/read/definition.test.ts
node ../../node_modules/vitest/dist/cli.js --run src/tools/read/schema.test.ts
node ../../node_modules/vitest/dist/cli.js --run src/read-implementation.test.ts
node ../../node_modules/vitest/dist/cli.js --run src/read-dependent-chain.test.ts
```

C# 使用仓库现有 focused smoke 脚本，只运行涉及的 Read smoke，不新增真实 provider/API 调用。

全部代码切片完成后执行：

```text
npm run check
```

不得运行：

```text
npm test
npm run build
完整 vitest suite
```

除非用户明确要求。

# 11. 明确非目标

本轮不做：

- 重建所有 ASCET Tool 的统一响应框架；
- Search → GetTree → Read resolver 重构；
- 实现新的 Project 全局枚举引擎；
- Contract 版本化系统；
- observability 平台；
- 为展示目的重写全部 Read payload；
- 删除或重命名已有公开 Action；
- 修改 Edit Tools 行为；
- 以性能优化替代正确性修复。

# 12. 停止条件

出现以下任一情况必须停止当前切片并重新确认事实：

1. Bridge raw result 不包含报告预期的业务信息；
2. 修复需要删除已有 Action、mode 或字段；
3. 需要改变与报告无关的 Read Action；
4. 自动测试与 live ASCET 对同一输入返回不同语义；
5. Project enumeration 实际已支持，与报告 baseline 不一致；
6. 需要修改当前任务之外的 intentional behavior；
7. 测试只能通过依赖内部实现细节完成。

# 13. Definition of Done

全部条件满足后，本 Bug Fix 才完成：

- [x] 大型 Read success 始终产生 Contract-valid JSON；
- [x] `read_code(full)` 返回完整代码，不是 artifact-only 提示；
- [x] `read_implementation` 四种 mode 均有明确、可验证行为；
- [x] `read_state_machine_flow(topology)` 不再静默降级；
- [x] `read_state_machine_flow(full)` 保留完整状态和转换信息；
- [x] `read_dependent_chain` 保留 Provider/Imported/Local/binding/complete；
- [x] 非 dependent-chain 目标返回业务错误；
- [x] Project enumeration unavailable 不再表现为合法空结果；
- [x] 四个 P0 Action 使用能够捕获字段丢失的结果 Contract；
- [x] 原有 summary、component、folder 和 Enumeration readback 能力无回退；
- [x] 每个切片均有可观察的 Red 记录和 Green 记录；
- [x] 所有修改过的测试文件通过；
- [x] `npm run check` 无 error、warning、info；
- [x] 报告中的 live fixtures 完成最终验证；
- [x] 未通过删除能力、降低 detailLevel 或丢弃字段完成修复。

## 14. 最终开发决策

本次开发只围绕一个根本边界修复：

```text
ASCET Read 后端成功结果必须以无损、机器可读、Action-specific 的 JSON 形式到达 public tool seam。
```

先用公开失败测试固定该行为，再做最小实现。所有错误分类、Contract 调整和 Bridge 修改都必须服务于这一边界，不新增与该目标无关的架构层。


# 15. 实施结果（2026-08-18）

## 15.1 根因修复

已完成以下根因级修复：

1. Read Action 的大型成功结果不再被替换为普通文本 artifact 提示，public tool 始终返回 Contract-valid JSON；
2. `full` 代码返回完整文本，并补充稳定 `hash`、`lineCount`、`byteCount` 和 `detailLevel=full`；
3. 空代码文本和空语义数组不再被公共结果压缩逻辑删除；
4. `read_implementation` 保留 `list/default/class-impl/impl` 四种模式，`impl` 强制要求非空 `implementationName`；
5. `read_state_machine_flow(topology)` 从 TypeScript public tool 到 C# Bridge 全链路保持 topology，不再降级为 summary；
6. StateMachine topology 返回独立 states/transitions 结构，full 保留嵌套 binding、code analysis、transition action、reference trace 和 `traceDepth`；
7. `read_dependent_chain` 返回完整 Provider/Imported/Local、dependency formula、binding 和 complete 状态；
8. backend 未直接返回 binding 时，从唯一 formula mapping 和 variants 无损派生 binding；
9. 普通 imported/local 非 chain 目标返回 `not_dependent_chain`；真实 local dependent 但映射缺失仍返回 `incomplete_chain`；
10. Project dependency enumeration unavailable 不再表现为 `total=0` 成功结果；
11. 四个 P0 Action 和 element dependency 使用能够检测关键字段丢失的独立结果 Contract；
12. Action catalog 和 packaged Bridge 已重新生成并同步。

## 15.2 TDD 自动验证

聚焦 Read Tools 测试：

```text
68 tests
68 pass
0 fail
```

覆盖：

- public `ascetReadTool.execute`；
- Read 参数 schema；
- Action result Contract；
- Action catalog；
- 大结果、空代码和空数组无损语义；
- implementation 四模式；
- StateMachine summary/topology/full；
- dependent-chain 正例、负例、Provider resolution 和 binding 派生；
- component/folder/project dependency 语义。

C# StateMachine focused runtime：

```text
StateMachineFlowFocusedTest passed.
FOCUSED_RUNTIME_RESULT: LEGACY_COMPATIBILITY_PASS
```

仓库检查：

```text
npm run check
PASS
```

Package asset 校验：

```text
npm run verify-assets --workspace @vaf-agentworks/ascet-copilot-extension
PASS: exactly 2 EXEs and 1 ToolAPI DLL
```

## 15.3 Live ASCET 验证

Live 调用通过 public `ascet_read` 执行，未修改 ASCET 模型。

### `read_code(full)`

```json
{
  "component": "PlatformLibrary/Package/AVH_AutomaticVehicleHold/private/AVH_CustStateLogic",
  "name": "calc",
  "hash": "1193fdb52593a8cc571f43c9b073ca59362da37b19d35b65026961a23e90fece",
  "lineCount": 223,
  "byteCount": 7293
}
```

完整代码正文成功返回，没有 artifact-only 降级或 Contract violation。

### `read_implementation`

| 请求模式 | Live 结果 |
|---|---|
| `list` | 1 个 implementation |
| `default` | `Default`，resolved=`Impl`，35 elements |
| `class-impl` | `Class`，resolved=`AVH_CustStateLogic`，35 elements |
| `impl=Impl` | `Named`，resolved=`Impl`，35 elements |

### `read_state_machine_flow`

| detailLevel | Live 结果 |
|---|---|
| `summary` | 成功，返回 summary Contract |
| `topology` | 6 states，14 transitions |
| `full` | 6 stateFlows，14 transitionFlows，完整嵌套结构 |

### `read_dependent_chain`

报告中的生成式 fixture：

```text
PI_ASCET_EDIT_20260818_DEP_CHAIN_DIRECT_001\Consumer::C_Threshold
```

在本次验证时已不再包含该 Element，Bridge 返回 `dependent_element_not_found`。为避免写入 ASCET 模型，本次使用现有真实完整链进行等价验证：

```text
PlatformLibrary_NewBrakeSystems\Package\BSM_BrakeSignalsAndMonitorings\Private\SignalOffset\BSP_OffsetAnalysis_IPB
P_SumFilterCoeffMax
```

Live 结果：

```json
{
  "complete": true,
  "binding": {
    "importedElement": "BSP_SumFilterCoeffOffsetIsCmpMax",
    "formula": "SumFilterCoeff",
    "formal": "SumFilterCoeff",
    "variantPolicy": "default"
  }
}
```

报告中的两个普通 element 负例均返回：

```text
not_dependent_chain
```

不再返回 Contract mismatch 或错误的 `incomplete_chain`。

### `read_element_dependency`

| scope | Live 结果 |
|---|---|
| component | `total=1` |
| folder | `total=1` |
| project | `project_component_enumeration_unavailable` |

Project unavailable 与合法空结果已经明确分离。

## 15.4 最终结论

本轮实施已完成本 spec 的根本目标：

```text
ASCET Read 后端成功结果
→ 无损、机器可读、Action-specific JSON
→ public Contract 校验通过
```

修复没有删除 Action、mode、detailLevel、依赖链层级或结果字段，也没有通过 summary 降级、字段过滤或空结果掩盖后端能力。
