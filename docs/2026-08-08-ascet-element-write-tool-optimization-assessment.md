# ASCET Element 写入工具最终优化方案

## 1. 状态与目标

本文是 `apply_element_spec`、`set_element_dependency` 及其相关 read、preflight、commit、readback 链路的最终优化方案。

本方案已采纳以下关键决策：

1. 保留 `apply_element_spec` 和 `set_element_dependency` 名称，重构为真实的 plan/commit 两阶段操作；
2. Dependency 原生支持 Parameter、Constant、System Constant；
3. 多 DataVariant 必须显式选择，禁止默认修改全部；
4. Local Dependent Parameter 不要求 `data.value`；
5. Independent 第一版固定清理 formula，并要求 snapshot、explicit value 或显式 ASCET default；
6. 增加 `configure_parameter_dependency_chain` 高层事务工具。

优化目标：

- 提高 Agent 首次 plan 成功率；
- 避免 Agent 猜测 ASCET Data、Implementation、Dependency 参数；
- 防止写错 DataConfiguration、ImplementationConfiguration 或 DataVariant；
- 保证用户确认内容与实际写入内容一致；
- 支持 ASCET 原生 Dependency binding；
- 写后验证 ASCET 实际状态，而不只验证工具返回值。

## 2. 最终判断

当前实现不能判定为“后端语义正确性基本完成”。现有能力已经覆盖部分 Element spec 校验、Provider 发现和写后读取，但仍存在以下语义安全缺口：

- Dependency dry-run 未校验 data AMD 和 DataVariant mapping；
- dependent 转 independent 未清理 DataVariant Dependency，也未恢复 ScalarType；
- 当前 mapping 会静默写入全部 DataVariant；
- Dependency readback 只验证 dependent flag 和 formula；
- Element readback 没有 Data/Implementation provenance；
- Exported Table 的读写 Data 来源选择不一致；
- prompt 强制新 primitive 提供 data、implementation 和 range，导致 Agent 发明参数；
- Imported logical Parameter 可能绕过 Imported data/impl 校验；
- unknown spec fields 仍可能被后端忽略；
- 后端结构化错误仍可能退化为 `ascet_cli_failed`。

因此必须先修复 ASCET Data 和 Dependency 语义，再完成严格 Tool Contract 和 planId。

## 3. ASCET 领域模型

### 3.1 Element Definition、Data、Implementation 分层

工具内部必须明确区分：

```text
Element Definition
Data
Implementation
```

Element Definition 包括：

- name；
- kind；
- modelType；
- scope；
- unit；
- calibration；
- dimension 和结构信息。

Data 包括：

- Data Set/DataConfiguration；
- Element 初始化值；
- DataVariant；
- dependent parameter 的 formal-to-model-value binding。

Implementation 包括：

- implementation type；
- physical range；
- implementation range；
- conversion formula；
- limit assignment；
- memory location。

这些层次不能继续压缩为一个无来源信息的扁平 Element JSON。

### 3.2 Data Set 和 DataVariant

一个组件可以存在多个 Data Set。Dependency formula 属于模型定义层，而 formal parameter 到模型 Parameter、Constant、System Constant 的绑定属于 Data 层，并可能随 DataVariant 不同。

因此：

- formula 不能与 mapping 混为一个字段；
- DataVariant 选择必须显式；
- 不同 DataVariant 可以使用不同 mapping；
- readback 必须同时读取 main AMD 和 data AMD。

### 3.3 Provider 链的数据所有权

项目常用链路：

```text
Provider Exported Parameter
  -> Consumer Imported Parameter
  -> Consumer Local Dependent Parameter
```

Provider Exported Parameter 权威拥有：

- model type；
- unit；
- physical data value；
- calibration role；
- implementation type；
- physical/implementation range；
- implementation conversion formula；
- limit behavior。

Consumer Imported Parameter 只拥有结构身份：

- 与 Provider Exported Parameter 同名；
- 匹配的 kind、modelType 和 dimension；
- `scope=imported`。

Imported Parameter 不应拥有独立的：

- `data.value`；
- range；
- implementation；
- calibration；
- dependency。

Consumer Local Dependent Parameter 拥有本地语义名称和 implementation 信息，但其值来自 Dependency binding，不应强制提供普通 `data.value`。

## 4. 总体架构

所有复杂写入统一采用：

```text
Agent structured request
        |
        v
Strict canonical schema
        |
        v
Live no-write plan
        |
        v
Normalized plan + blockers + warnings
        |
        v
User confirmation
        |
        v
Commit(planId)
        |
        v
Configuration-aware readback
        |
        v
Rollback on failure
```

核心原则：

1. plan 必须读取真实 ASCET 状态；
2. plan 必须完成业务语义校验；
3. plan 不写 ASCET；
4. commit 不重新接收复杂业务参数；
5. commit 只执行用户确认的 planId；
6. 所有 Data/Implementation 值必须携带 provenance；
7. 所有 DataVariant 写入必须显式；
8. 所有结构化后端错误必须原样保留。

## 5. Element 深度读取

### 5.1 扩展 `ascet_read.read_element`

保留现有 `read_element`，但输出扩展为完整 Snapshot：

```json
{
  "target": {
    "componentPath": "Feature/Consumer",
    "componentOid": "...",
    "elementName": "P_Limit",
    "elementOid": "..."
  },
  "definition": {
    "kind": "parameter",
    "modelType": "cont",
    "scope": "local",
    "unit": "bar",
    "calibration": true
  },
  "dataConfigurations": [
    {
      "name": "Data",
      "isDefault": true,
      "source": "defaultData",
      "valueState": "scalar",
      "value": 10
    }
  ],
  "implementationConfigurations": [
    {
      "name": "Implementation",
      "isDefault": true,
      "source": "defaultImplementation",
      "valueType": "sint16",
      "physicalRange": {
        "min": 0,
        "max": 100
      }
    }
  ],
  "dependency": {
    "state": "independent",
    "formula": null,
    "bindingsByVariant": []
  }
}
```

### 5.2 Provenance

Data 来源至少区分：

```text
defaultData
classData
elementValue
namedDataConfiguration
none
```

Implementation 来源至少区分：

```text
defaultImplementation
classImplementation
elementImplementation
namedImplementationConfiguration
none
```

Plan、fingerprint 和 readback 必须使用相同 provenance。

### 5.3 统一 Data Configuration Resolver

Scalar、Array、Table 必须共用同一个 Data Configuration 选择规则：

```text
Exported Element:
  preferred = classData
  fallback = defaultData
  fallback2 = elementValue

Local Element:
  preferred = selected/defaultData
  fallback = elementValue
```

当前 Exported Table 读取不应继续绕过 class data。读写必须使用同一 resolver，避免写入 class data 后从其他来源 readback。

## 6. `apply_element_spec` 最终接口

### 6.1 保留名称，改为 plan/commit

Plan：

```json
{
  "action": "apply_element_spec",
  "phase": "plan",
  "componentPath": "Feature/Consumer",
  "intent": "create",
  "elements": []
}
```

Commit：

```json
{
  "action": "apply_element_spec",
  "phase": "commit",
  "planId": "element-plan-123"
}
```

原有 `executeWrite` 仅作为内部兼容字段，不再由 Agent 直接生成。

### 6.2 Role-specific Element Schema

Element spec 使用判别联合，至少区分：

```text
standardPrimitive
providerExportedParameter
consumerImportedParameter
localDependentParameter
array
enumeration
table
componentReference
```

#### Standard Primitive

```json
{
  "role": "standardPrimitive",
  "name": "P_Limit",
  "kind": "parameter",
  "modelType": "cont",
  "scope": "local",
  "data": {
    "value": 10
  }
}
```

创建时最少要求：

- name；
- kind；
- modelType；
- scope。

不再强制：

- `data.value`；
- `impl.valueType`；
- range。

未提供时，plan 必须返回将使用的 ASCET default：

```json
{
  "defaults": {
    "data": "ascetDefault",
    "implementation": "ascetDefault",
    "range": "derivedFromDefaultImplementation"
  }
}
```

#### Provider Exported Parameter

```json
{
  "role": "providerExportedParameter",
  "name": "P_Shared",
  "modelType": "cont",
  "unit": "bar",
  "comment": "Shared provider parameter",
  "calibration": false,
  "range": {
    "mode": "physical",
    "min": 0,
    "max": 200
  },
  "data": {
    "mode": "explicit",
    "value": 10
  },
  "implementation": {
    "mode": "explicit",
    "valueType": "sint16",
    "memoryLocation": "Default",
    "formula": "",
    "limitAssignments": true
  }
}
```

Provider create 不允许通过字段缺失隐式选择默认值。`unit`、`comment`、`calibration`、`range`、`data` 和 `implementation` 决策组全部必填；使用 ASCET default 时也必须显式传 `mode=ascetDefault`。`kind=parameter` 和 `scope=exported` 由 role 固定。

#### Consumer Imported Parameter

```json
{
  "role": "consumerImportedParameter",
  "name": "P_Shared",
  "modelType": "cont"
}
```

Schema 直接禁止：

- data；
- physicalRange；
- impl；
- calibration；
- dependency。

Plan 验证：

- Provider 名称相同；
- Provider 为 Exported；
- Provider 唯一；
- kind、modelType 和 dimension 兼容。

#### Local Dependent Parameter

```json
{
  "role": "localDependentParameter",
  "name": "P_Effective",
  "modelType": "cont",
  "unit": "bar",
  "comment": "Calculated dependent parameter",
  "calibration": false,
  "range": {
    "mode": "none"
  },
  "implementation": {
    "mode": "ascetDefault"
  }
}
```

Local Dependent create 的 `unit`、`comment`、`calibration`、`range` 和 `implementation` 决策组全部必填；`data` 不是 optional，而是禁止输入，因为值来自 Dependency binding。`kind=parameter` 和 `scope=local` 由 role 固定。

### 6.3 Create、Patch、Upsert、Restore

支持：

```text
create
patch
upsert
restore
```

Create：目标已存在时返回 blocker。

Patch：允许部分字段，例如：

```json
{
  "intent": "patch",
  "elements": [
    {
      "name": "P_Limit",
      "comment": "Updated"
    }
  ]
}
```

Plan 必须：

1. 读取完整 live Element；
2. 将 patch 合并到 live Snapshot；
3. 生成完整 normalized spec；
4. 再交给 C# parser/planner。

Upsert：plan 阶段确定最终是 create 还是 patch，不能推迟到 commit。

Restore：保留完整恢复语义，但 delete/recreate 必须列为 destructive changes。

### 6.4 Data 和 Implementation Target

基础模式：

```json
{
  "dataTarget": {
    "mode": "default"
  },
  "implementationTarget": {
    "mode": "default"
  }
}
```

扩展模式：

```json
{
  "dataTarget": {
    "mode": "named",
    "name": "DataVariantA"
  },
  "implementationTarget": {
    "mode": "named",
    "name": "ImplA"
  }
}
```

第一阶段如尚不支持 named configuration，可以暂不开放 schema，但 plan 必须报告实际使用的 default/class configuration。禁止静默 fallback。

## 7. `set_element_dependency` 最终接口

### 7.1 保留通用名称

保留：

```text
set_element_dependency
```

完成态支持 ASCET 原生 binding：

```text
parameter
constant
systemConstant
```

Imported Parameter 只是 Parameter binding 的一种跨组件 Provider 场景，不再是唯一 mapping target。

### 7.2 Formula Definition 与 Data Binding 分离

```json
{
  "action": "set_element_dependency",
  "phase": "plan",
  "targetPath": "Feature/Consumer",
  "elementName": "P_Effective",
  "desiredState": "dependent",
  "formula": {
    "expression": "A * Gain + Offset",
    "formals": ["A", "Gain", "Offset"]
  },
  "bindings": {
    "variantPolicy": "default",
    "mappings": [
      {
        "formal": "A",
        "target": {
          "kind": "parameter",
          "name": "P_Input"
        }
      },
      {
        "formal": "Gain",
        "target": {
          "kind": "constant",
          "name": "C_Gain"
        }
      },
      {
        "formal": "Offset",
        "target": {
          "kind": "systemConstant",
          "name": "SC_Offset"
        }
      }
    ]
  }
}
```

其中：

- formula 写 main AMD；
- bindings 写 data AMD；
- 两者分别验证、分别 readback。

### 7.3 Formula Formal

禁止继续通过正则从 expression 猜测 formal 并默认映射到同名 Imported Parameter。

Formals 必须显式声明：

```json
{
  "expression": "max(A, B) * 1e-3",
  "formals": ["A", "B"]
}
```

验证规则：

- 每个 formal 必须有 mapping；
- mapping 不能包含不存在的 formal；
- formal 名称不能重复；
- 函数名、关键字和科学计数法不能被识别为 formal。

允许有限自动模式：

```json
{
  "bindingPolicy": "autoExactName"
}
```

仅在以下条件全部满足时自动绑定：

1. formal 已显式声明；
2. 存在唯一 exact-name candidate；
3. candidate kind 合法；
4. candidate 类型和可见性合法；
5. 没有歧义。

禁止 fuzzy match。

### 7.4 Parameter Binding

```json
{
  "kind": "parameter",
  "name": "P_Input"
}
```

验证：

- Element 存在；
- `IsParameter=true`；
- 当前组件上下文可见；
- OID 存在；
- 不产生 self dependency；
- 不产生 dependency cycle；
- model type 和 dimension 可被 formula 使用。

如果 scope 为 Imported，再验证同名 Exported Provider。

如果 Parameter 本身 dependent，允许 ASCET 支持的间接 dependency，但必须执行 cycle detection。

### 7.5 Constant Binding

```json
{
  "kind": "constant",
  "name": "C_Gain"
}
```

验证：

- `IsConstant=true`；
- 当前模型上下文可见；
- OID 存在；
- value 可读；
- model type 合法。

Constant 不支持 implementation，不能套用 Parameter 的 implementation 校验。

### 7.6 System Constant Binding

```json
{
  "kind": "systemConstant",
  "name": "SC_Offset"
}
```

验证：

- `IsSystemConstant=true`；
- 当前组件或项目上下文可见；
- OID 存在；
- value/model type 合法；
- implementation 状态可读取。

Plan 可以返回 System Constant generation/compile/run-time resolution warning。

## 8. DataVariant 安全

### 8.1 Variant Policy

支持：

```text
default
all
selected
```

Default：只修改 default DataVariant。

```json
{
  "variantPolicy": "default"
}
```

Selected：只修改指定 DataVariant。

```json
{
  "variantPolicy": "selected",
  "variants": ["DataA", "DataB"]
}
```

All：必须在 plan 中列出全部将修改的 DataVariant，并标记为 bulk change。

```json
{
  "variantPolicy": "all"
}
```

第一阶段：

- 只有一个 variant 时允许；
- 多个 variant 且未显式选择时返回 blocker；
- 禁止默认或静默修改全部 variants。

### 8.2 Per-Variant Mapping

不同 DataVariant 可以使用不同 mapping：

```json
{
  "variantPolicy": "selected",
  "variants": [
    {
      "name": "DataA",
      "mappings": [
        {
          "formal": "Gain",
          "target": {
            "kind": "constant",
            "name": "C_Gain_A"
          }
        }
      ]
    },
    {
      "name": "DataB",
      "mappings": [
        {
          "formal": "Gain",
          "target": {
            "kind": "constant",
            "name": "C_Gain_B"
          }
        }
      ]
    }
  ]
}
```

不能再假设所有 Data Set 使用相同 binding。

## 9. Dependent 转 Independent

### 9.1 完整转换语义

```json
{
  "desiredState": "independent",
  "formulaPolicy": "clear",
  "valueRestoration": {
    "policy": "explicit",
    "valuesByVariant": {
      "Data": 0
    }
  }
}
```

执行步骤：

1. main AMD 设置 `dependent=false`；
2. main AMD 删除 Formula；
3. data AMD 删除 `<Dependency>`；
4. data AMD 恢复 `<ScalarType>`；
5. 写回各 selected variant 的 scalar value；
6. 联合 readback main/data AMD。

### 9.2 Value Restoration Policy

支持：

```text
fromSnapshot
explicit
ascetDefault
```

`fromSnapshot`：使用设置 dependent 前保存的 scalar snapshot，是默认推荐方式。

`explicit`：用户或 Agent 明确提供每个 variant 的值。

`ascetDefault`：高级模式，必须显式选择并返回 destructive warning。

如果没有 snapshot，也没有 explicit value，plan 必须失败，不能自动写 0。

第一版固定：

```text
formulaPolicy = clear
```

暂不支持 `preserve`，避免 independent 状态下残留 formula 和 Dependency binding。

## 10. 真实 Plan / Dry-run

### 10.1 `apply_element_spec` Plan

必须执行：

1. strict schema 校验；
2. inline/file spec 解析；
3. unknown field 校验；
4. live Element Snapshot；
5. patch merge；
6. role validation；
7. Data/Implementation configuration 选择；
8. diff；
9. ASCET default/fallback 解析；
10. destructive change 检测；
11. readback plan 生成。

Plan 不写 ASCET。

### 10.2 `set_element_dependency` Plan

必须执行：

1. 读取目标 Element；
2. 验证 Local/Exported Parameter；
3. Export main/data AMD 到临时目录；
4. 选择 DataVariant；
5. 对临时 main AMD 写 formula/formals；
6. 对临时 data AMD 写 mappings；
7. 验证 Parameter/Constant/System Constant；
8. 重新读取临时 AMD；
9. 使用 dependent-chain reader 验证结果；
10. 删除临时目录。

Plan 禁止调用 `ImportXMLFromFile`。

完整 dry-run 必须提前发现：

- missing DataEntry；
- missing binding target；
- wrong target kind；
- wrong scope；
- missing OID；
- incomplete mappings；
- duplicate formal；
- multi-variant ambiguity；
- stale Dependency；
- invalid independent restoration。

## 11. Strict Schema 和 Canonical Contract

### 11.1 拒绝 Unknown Fields

必须同时在以下层次拒绝 unknown properties：

1. TypeScript TypeBox；
2. inline payload parser；
3. file spec parser；
4. C# parser；
5. Bridge typed DTO。

仅设置 TypeBox `additionalProperties:false` 不够，因为 file mode 可以绕过 TypeScript Element schema。

### 11.2 单一 Canonical Schema

由一个 contract source 生成：

- TypeScript schema；
- C# request DTO/parser；
- Bridge contract；
- CLI contract；
- prompt field descriptions；
- examples；
- tests。

避免 standalone schema、action schema、catalog override、generated C# contract 和 parser 独立维护。

### 11.3 路径和枚举去歧义

单组件 Dependency 工具固定：

```text
targetPath
targetKind = component
match = exact
```

模型接口删除：

- `componentPath` alias；
- `targetKind`；
- `match`。

Folder bulk 使用独立 action：

```text
set_element_dependency_bulk
```

兼容层规则：

- 只有 `componentPath` 时转换为 `targetPath`；
- 两者同时出现且不同，直接报错；
- 两者相同，返回 deprecated warning。

## 12. 结构化错误

### 12.1 聚合 Plan Blockers

Plan 应尽可能一次返回全部 blockers：

```json
{
  "status": "blocked",
  "blockingIssues": [
    {
      "code": "missing_formula_mapping",
      "path": "bindings.mappings",
      "formal": "Gain"
    },
    {
      "code": "invalid_binding_target",
      "path": "bindings.mappings[1].target",
      "expected": [
        "parameter",
        "constant",
        "systemConstant"
      ],
      "actual": "variable"
    }
  ],
  "warnings": []
}
```

### 12.2 保留后端原始错误

统一错误结构：

```json
{
  "code": "invalid_dependency_mapping",
  "stage": "plan_dependency_data",
  "path": "bindings.mappings[1].target",
  "message": "...",
  "expected": {},
  "actual": {},
  "candidates": [],
  "suggestedFix": {},
  "retryable": false
}
```

TypeScript CLI 层必须：

1. 即使 exit code 非零，也先解析 stdout/stderr JSON envelope；
2. 存在结构化后端错误时直接保留；
3. exit code 只作为 transport metadata；
4. 仅在无法解析结构化错误时使用 `ascet_cli_failed`。

## 13. Plan ID、Commit、Readback 和 Rollback

### 13.1 Plan Fingerprint

Plan 至少记录：

- target component OID；
- target Element OID；
- Element definition hash；
- selected Data Configuration；
- selected DataVariant names；
- selected Implementation Configuration；
- formula/formals；
- binding target kind/name/OID；
- inline spec hash 或 file hash；
- safety options；
- expiration time。

Commit 前重新读取并比较。变化时返回：

```json
{
  "code": "stale_plan"
}
```

### 13.2 Apply Element Readback

验证：

- Element definition；
- selected Data Configuration；
- data value；
- selected Implementation Configuration；
- valueType；
- physical/implementation range；
- conversion formula；
- calibration；
- Data/Implementation provenance。

### 13.3 Dependency Readback

main AMD 验证：

- dependency flag；
- formula expression；
- formal names；
- formal OID。

data AMD 对每个 selected DataVariant 验证：

- Dependency 是否存在；
- mapping 数量；
- formalName/formalOID；
- target name/OID；
- target kind；
- target scope；
- independent 时 ScalarType/value 是否恢复。

仅对 Imported Parameter binding 验证：

- 同名 Exported Provider；
- Provider 唯一；
- Provider kind/modelType/dimension 兼容。

只有全部验证通过，才返回 `write.succeeded=true`。

### 13.4 Rollback

Commit 前创建完整 backup。

写入或 readback 失败时：

1. 从 backup 恢复；
2. 对恢复后的 main/data AMD 再次 readback；
3. 恢复成功时保留原始错误，并返回 `rollbackSucceeded=true`；
4. 恢复失败时返回 `write_rollback_failed`，同时保留原始错误。

## 14. 高层组合工具

新增：

```text
configure_parameter_dependency_chain
```

适用于：

```text
Exported Provider
  -> Imported Consumer Parameter
  -> Local Dependent Parameter
```

Plan 输入三个完整的 role-specific inline Element，不接受 model-created `specFile`：

1. Provider Exported Parameter 完整显式决策组校验；
2. Consumer Imported Parameter 轻量结构校验；
3. Local Dependent Parameter 完整显式决策组校验；
4. formula、formals、`bindingPolicy=explicit` 和 mappings 一致性校验；
5. DataVariant bindings；
6. 内部规范化为三个单 Element spec，并生成 SHA-256；
7. combined diff；
8. combined readback plan。

Commit 只接受 `mode=commit + planId`。任一步失败执行逆序 compensating rollback；该机制不是 ASCET 数据库原生事务。

底层复用：

- Element planner；
- Dependency planner；
- common planId；
- common rollback/readback。

## 15. 实施顺序

### P0：语义正确性

1. Element Snapshot 和 provenance；
2. 统一 Scalar/Table/Array configuration resolver；
3. Dependency temp XML dry-run；
4. DataVariant 显式选择；
5. 支持 Parameter、Constant、System Constant；
6. 删除 formula regex 自动推断；
7. independent cleanup 和 value restoration；
8. main/data 联合 readback；
9. 修复 Imported logical 校验；
10. 修复 default implementation planner 矛盾；
11. 后端错误码透传。

### P1：Agent 成功率

1. role-specific Element schema；
2. Local Dependent 不要求 `data.value`；
3. create 时允许 ASCET defaults；
4. inline structured spec；
5. patch live merge；
6. aggregate blockers；
7. exact-name deterministic auto-binding；
8. Provider Chain 组合工具；
9. action-specific examples。

### P2：确认一致性和工程化

1. planId；
2. target/config/spec fingerprint；
3. stale plan；
4. plan expiration；
5. session/agent binding；
6. canonical generated contracts；
7. telemetry；
8. bulk tools。

## 16. 测试与验收

### 16.1 Element 测试

- Imported logical Parameter 带 data 时拒绝；
- Local Dependent 不提供 `data.value` 时允许；
- create 不提供 data/impl/range 时使用 ASCET defaults；
- patch 只提供 name/comment 时正确 merge；
- unknown fields 在 inline 和 file mode 都拒绝；
- Exported Table 读写使用同一 class data；
- provenance 正确；
- named/default configuration 不歧义；
- default implementation 缺失时能够按计划创建。

### 16.2 Dependency 测试

- Parameter binding；
- Imported Parameter + Exported Provider binding；
- Constant binding；
- System Constant binding；
- mixed binding；
- dependent Parameter 间接依赖；
- dependency cycle 拒绝；
- formula `max(A,B)` 不把 `max` 当 formal；
- formula `1e-3*A` 不把 `e` 当 formal；
- formal mapping 缺失；
- wrong target kind；
- missing target OID；
- 单 DataVariant；
- 多 DataVariant default；
- selected variants；
- all variants；
- 不同 variant 使用不同 mapping；
- dry-run 不写 ASCET；
- independent 清理 Dependency；
- independent 恢复 ScalarType；
- independent 无恢复值时拒绝；
- readback 检测 stale mapping。

### 16.3 Plan/Commit 测试

- commit 只接受 planId；
- target OID 变化返回 stale plan；
- DataVariant 变化返回 stale plan；
- spec file hash 变化返回 stale plan；
- user reject 不产生写入；
- readback mismatch 触发 rollback；
- rollback 后 main/data AMD 均恢复；
- 后端 error code 100% 保留。

## 17. 验收指标

- 首次 plan ready rate >= 90%；
- Agent 参数类重试平均次数 <= 1.2；
- commit 参数类失败率接近 0；
- unknown/ignored 参数数量为 0；
- 后端原始错误码保留率为 100%；
- Dependency main/data readback 覆盖率为 100%；
- 未显式批准的 multi-variant bulk write 数量为 0；
- independent 后 stale Dependency 数量为 0；
- 用户确认后 semantic parameter error 比例小于 3%；
- 所有成功写入都能定位 Data/Implementation provenance。

## 18. 完成标准

只有同时满足以下条件，才能认为 Element 写入工具优化完成：

1. `apply_element_spec` 和 `set_element_dependency` 使用真实 live plan；
2. schema、file parser、C# parser 和 Bridge DTO 均拒绝 unknown fields；
3. Element Data/Implementation 读取包含 configuration provenance；
4. Dependency 支持 Parameter、Constant、System Constant；
5. DataVariant 写入必须显式选择；
6. dependent 和 independent 转换在 main/data AMD 中保持一致；
7. readback 联合验证 Element、configuration、formula 和 per-variant mappings；
8. 后端原始错误码完整透传；
9. commit 只执行用户确认的 planId；
10. write/readback 失败能够验证 rollback 结果。

## 19. 实施进度记录（2026-08-08）

### 19.1 已落地并验证

1. Canonical contract、Tool contract 与错误保真：
   - 新增 `contracts/ascet-element-write-contract.json` 作为 Element 写入高风险契约轴的单一来源；
   - `scripts/generate-ascet-element-write-contract.mjs` 生成 TypeScript role/intent/kind/scope/field metadata 和 C# strict-parser field constants；
   - `element-spec-contract.ts` 与 `AscetElementSync.cs` 均直接消费 generated output，不再分别维护 canonical field list；
   - `npm run check:ascet-contract` 校验生成物 SHA-256 和内容漂移，并已接入根 `npm run check`；
   - `apply_element_spec`、`set_element_dependency` 和组合工具均使用严格 TypeBox contract，拒绝 unknown properties；
   - 直接函数调用执行运行时 schema 校验；
   - CLI 非零退出和 `ok:false` 均保留后端 `code/message/stage/details/operation`；
   - Scheduler 保留后端错误码，不再统一退化为 `ascet_cli_failed`。
2. Inline `apply_element_spec`：
   - model-facing plan 使用 `intent=create|patch|upsert|restore` 与 inline `elements`，不再暴露 `specFile`；
   - commit 只接受 `phase=commit + planId`；
   - 已实现 `standardPrimitive`、`providerExportedParameter`、`consumerImportedParameter`、`localDependentParameter`、`array`、`enumeration`、`table`、`componentReference` 八种 role；
   - Imported role 在 schema 层拒绝 data、implementation、range、calibration 和 dependency；
   - Local Dependent role 在 schema 层拒绝 `data.value`；
   - patch 先执行 live `read_element_catalog`，再 merge live snapshot，生成完整 normalized spec，写入内部临时 JSON，并调用 `diff_element_spec`；
   - upsert 在 plan 阶段确定每个 Element 的 create/patch 结果；
   - 多 Element semantic blocker 聚合返回；
   - Provider Exported create 强制显式输入 unit/comment/calibration/range/data/implementation 决策组；Local Dependent create 强制显式输入 unit/comment/calibration/range/implementation，且禁止 data；Imported 保持轻量；
   - named Data/Implementation configuration 当前不开放，防止后端不支持时静默回退。
3. Element snapshot、identity 与 provenance：
   - `read_element_catalog` 输出 `identity.componentOID` 和 `identity.elementOIDs`；
   - Element catalog 输出 DataConfiguration/ImplementationConfiguration provenance，包括 source、configurationName、selected；
   - Exported Table 读取和写入统一使用相同 class/default DataConfiguration resolver；
   - apply plan fingerprint 显式包含完整 catalog snapshot、identity、live snapshot hash、normalized inline spec hash、resolved intent/operations 和安全选项。
4. Dependency Data 语义：
   - dry-run 导出并修改临时 main/data AMD，不执行 import；
   - mapping 目标支持 Parameter、Constant、System Constant 和 mixed binding；
   - readback 校验 formalName/formalOID/valueName/valueOID、target kind 和 target scope；
   - 公式 formal 默认必须显式 mapping；另外支持受限 `bindingPolicy=autoExactName`，但仍要求显式 `dependencyFormals`，只生成唯一同名 mapping，不解析公式 token、不 fuzzy match；
   - DataVariant 支持 `default | selected | all` 和 per-variant mappings；
   - 多 variant 未显式选择时拒绝；
   - dependent 转 independent 必须显式选择 `fromSnapshot | explicit | ascetDefault`；
   - `ascetDefault` 根据逻辑/数值 model type 恢复 `false` 或 `0.0`，不再无条件写数值 0；
   - rollback 后联合校验 main AMD 和 DataVariant Dependency/ScalarType。
5. Snapshot 与 cycle 生命周期：
   - independent 转 dependent 成功后自动保存转换前 ScalarType snapshot；
   - `fromSnapshot` 自动解析 snapshot，Agent 不需要传原始 ScalarType XML；
   - independent 恢复成功后消费 snapshot，失败时保留或回滚 snapshot 状态；
   - dependency cycle detector 覆盖 self、direct 和 indirect Parameter cycle；
   - Constant/System Constant 不进入 Parameter dependency cycle 图。
6. Plan、fingerprint 与确认一致性：
   - 使用持久化 `AscetPlanStore`，stable canonical JSON + SHA-256 fingerprint；
   - 支持 stale、expired、consumed/replay、operation mismatch、plan identity mismatch 和 atomic consume lock；
   - plan 绑定 workspace、agent 和 runtime session，跨 binding commit 在任何 live preflight 前拒绝；
   - fingerprint 显式覆盖 component/Element OID、definition/snapshot hash、configuration、DataVariant、formula/mappings、target kind/name/OID、inline/spec-file hash、snapshot hash 和 safety options；
   - `apply_element_spec`、`set_element_dependency` commit 均重新执行 backend preflight 后比较 fingerprint；
   - privacy-bounded JSONL telemetry 记录 plan-ready、commit、blocked、error、duration 和 error code，不记录 mutation 参数内容。
7. `configure_parameter_dependency_chain`：
   - Dependency plan 在 C# 后端导出 Consumer 临时 main/data AMD，并 overlay pending Consumer Imported Parameter 与 Local Parameter spec；
   - overlay 后执行真实 `SetMainAmdDependencyAndFormula`、cycle、mapping kind/scope/OID、DataVariant 和 readback 校验，全程不 import；
   - `--overlay-spec` 仅作为组合工具内部 dry-run 参数，不暴露给 standalone Agent schema，也不允许用于非 dry-run；
   - preflight 结果返回 `elementOverlay.mode=temporaryAmd`、spec SHA-256 和 deterministic temporary Element OID，并进入 plan fingerprint；
   - plan 使用 common `AscetPlanStore` 保存三个 Element preflight 和一个 Dependency preflight；
   - commit 只接受 `mode=commit + planId`，从持久化 plan 恢复完整 definition；
   - commit 在确认前重新执行四个 preflight，并验证 stale/expired/consumed/binding；
   - model-facing contract 不再接受三个 `specFile`；inline Element 在内部规范化为权限受限临时 spec，plan fingerprint 保存 normalized spec SHA-256；
   - 成功写入必须完成四步 readback 后才返回 `atomic:true`；
   - 任一步失败按 Dependency、Local、Consumer、Provider 的逆序执行 compensating rollback；
   - Element rollback 使用完整 live catalog restore；Dependency rollback 保存并恢复原 dependency、formula、Parameter/Constant/System Constant mapping 和 DataVariant；
   - rollback 失败返回 `write_rollback_failed`，同时保留 originalError 与每个 rollback stage 结果。
8. Agent 调用指导：
   - `apply_element_spec` 和组合工具 prompt/few-shot 均切换为 inline plan/planId-only commit；
   - 新增 `configure_parameter_dependency_chain.plan|commit` action descriptor、route manifest 和 runtime guard；
   - 明确 Provider/Local 必填决策组、Imported 轻量例外、Enumeration 和显式 ASCET default 语义；
   - 明确 Parameter/Constant/System Constant、显式 formals/mappings、受限 autoExactName、DataVariant 和 independent restoration；
   - action catalog、prompt、registry 和 coding-agent few-shot 均通过 schema 验证。

### 19.2 自动化验证证据

- TypeScript/Node ASCET 全量非 live 测试串行执行：207 passed，0 failed；
- coding-agent Vitest few-shot contract：7 passed，0 failed；
- `AscetPlanStore`：canonical fingerprint、binding、stale、过期、operation mismatch、consume 防重放均通过；
- composite：inline Element schema、planId-only commit、normalized spec hash、binding mismatch、逆序 rollback、默认 Element restore、原 Dependency mapping restore、rollback failure 均通过；
- C# focused suite：`ascetcli/scripts/test-ascet-csharp.ps1` 通过；新增 temporary AMD Element overlay + Dependency mapping 验证；
- C# 覆盖 Parameter/Constant/System Constant、DataVariant default/selected/all、per-variant mapping、snapshot lifecycle、logical/numeric default restoration、indirect cycle、identity/provenance 和 main/data rollback；
- `npm run check`：2026-08-08 最终复核通过。

### 19.3 ASCET 6.1.5 live 验证结果

Live 测试在已运行的 ASCET 6.1.5 和数据库 `C:\Repo\AI_AEB\AI_AEB` 上串行执行，使用一次性目录 `TEST\__pi_element_live_20260808055217`，最终证据保存在 `output/ascet-element-write-live-20260808055217.json`。

1. Inline `apply_element_spec`：
   - 创建 `P_Input` 和 `P_Local`；
   - inline plan 成功生成持久化 plan；
   - commit 仅传 `phase=commit + planId` 即成功；
   - 写后 Element readback 通过。
2. Standalone `set_element_dependency`：
   - `P_Local` 以公式 `P_Input` 转为 dependent；
   - 使用显式 Parameter mapping 和 `default` DataVariant；
   - live readback 确认 dependency 为 `dependent`、formula 为 `P_Input`；
   - 随后使用 `restoration.policy=fromSnapshot` 恢复 independent，live readback 确认 dependency 为 `independent`。
3. `configure_parameter_dependency_chain`：
   - Provider、Consumer、Local 三个 future Element spec 均完成 preflight；
   - Dependency preflight 使用 `temporaryAmd` overlay，plan 中包含 spec SHA-256 和 deterministic temporary Element OID；
   - planId-only commit 返回 `status=committed`、`atomic=true`、`writesPerformed=true`；
   - Provider、Consumer、Local、Dependency 四个 commit stage 均 `readbackVerified=true`；
   - 最终 live readback 确认 Consumer 的 `P_Local` 为 dependent，formula 为 `P_Imported`。
4. 清理：
   - 三个一次性组件和测试目录均删除成功；
   - delete readback 全部通过；
   - `TEST` 下未残留本次 `__pi_element_live_*` 目标。

Live 测试同时发现并修复两个会直接降低 Agent commit 成功率的问题：

1. `set_element_dependency` 持久化 plan 在 commit 时泄漏内部 `dryRun=false`，但 public `ascet_edit` schema 禁止该字段，导致工具拒绝自己的 plan。现已停止向 stored commit params 注入 `dryRun`，并增加 planId-only commit 回归测试。
2. Dependency dry-run 使用随机 formula formal OID，导致相同请求的 backend preflight fingerprint 不稳定并误报 `stale_plan`。现已改为基于 owning Element name 和 formal name 的 deterministic SHA-256-derived OID，并增加确定性回归测试。

通用只读 smoke 仍有一个与本次 Element/Dependency 写入无关的限制：discovery/read 已到达 `ascet_edit`，但 single-exe router 尚未实现 `component_editable_check`，因此通用 smoke 在该步骤返回 `not_implemented`。这不影响上述 disposable live write、readback 和 cleanup 结果。

### 19.4 Inline composite 二次优化与 live 验证

本轮进一步移除了组合工具的 model-created `specFile` 输入，并将 canonical Element write contract 升级到 version 2：

1. `provider.element` 直接复用完整 `providerExportedParameter` create schema，强制 `unit/comment/calibration/range/data/implementation`；
2. `consumer.element` 复用轻量 `consumerImportedParameter` schema，并禁止 Data、Implementation、range 和 calibration；
3. `local.element` 复用完整 `localDependentParameter` schema，强制 `unit/comment/calibration/range/implementation`，并禁止 data；
4. 删除重复的 `exportedParameterName/importedParameterName/dependentParameterName`，统一从 `element.name` 派生；
5. Dependency 强制提供 `formals`、`bindingPolicy=explicit`、typed mappings、`variantPolicy` 和 `verifyReadback=true`，且 formals 必须与 mapping keys 完全一致；
6. 组合工具内部生成、使用并清理权限受限临时 spec，Agent 不再承担文件路径、JSON 文件和 plan 后文件漂移风险；
7. action catalog、prompt、few-shot、route manifest 和 runtime action guard 均增加 `configure_parameter_dependency_chain.plan|commit`。

ASCET 6.1.5 最新 contract live 证据保存在 `output/ascet-inline-chain-live-20260808105605.json`。该次测试在 runtime action guard 接入后，直接执行真实 standalone `configureParameterDependencyChainTool.execute` 路径：

- `mode=plan` 返回 `status=planned`，planId 为 `241ae982-dcfc-4802-a6c6-8a84f4934816`；
- Provider、Consumer、Local 三个 inline spec preflight 均通过，并分别返回 normalized spec SHA-256：`27b4d8d8fc32f4d6a720a996703355af4e865898b633983468deeeef347e03e7`、`30d579ec0be3a18f63c076561179da0d4b19d6bde3ac8c721eb58b07d6044454`、`878ad4d7b93d5eee72730bcf18f10de7d04813968aa8e0e94a1927aee61f243e`；
- commit 仅输入 `mode=commit + planId`，返回 `status=committed`、`atomic=true`、`writesPerformed=true`；
- Provider、Consumer、Local、Dependency 四个 committed stage 均 `readbackVerified=true`；
- 最终 live readback 确认 Consumer 的 `P_Local` 为 `dependent`，formula 为 `P_Imported`；
- Consumer、Provider 和一次性目录 `TEST/__pi_inline_chain_live_20260808105605` 均删除成功，delete readback 全部通过；后续 `list_folders` 复核确认无目录残留，并确认无残留 `AscetCli` 进程。

较早证据 `output/ascet-inline-chain-live-20260808072310.json` 保留用于历史对照；以上最新证据覆盖 runtime action guard 接入后的最终 live 路径。

### 19.5 已审计但仍保留的工程化限制

1. named DataConfiguration/ImplementationConfiguration 仍未开放；当前 schema 只允许 default 模式，并在 catalog/plan 中报告实际 default/class/element provenance，禁止静默 fallback。
2. temporary AMD overlay 只复现 Dependency preflight 所需的 Parameter identity、scope、dependency、formula、mapping 和 DataVariant 结构，不替代完整 ASCET ToolAPI Element 创建语义；每个 Element spec 仍必须先通过独立 `diff_element_spec`，Dependency 写入路径还会基于真实 ASCET Element 再执行相同的 cycle、mapping、DataVariant 和 readback 校验。
3. ASCET 后端仍没有覆盖四个命令的原生 transaction；组合工具依赖 preflight fingerprint、readback 和逆序 compensating rollback。只有四步 readback 全部成功时才返回 `atomic:true`。

因此当前状态是：跨语言 canonical contract version 2 生成与漂移检查、future-element temporary AMD overlay dry-run、完整显式 Provider/Local inline Element、轻量 Imported Element、Dependency 多目标映射、planId/fingerprint/stale/expiry/binding、telemetry 和无 model-created specFile 的 composite 均已落地。当前明确保留的扩展项是 named configuration、完整 ToolAPI 语义级 overlay 和后端原生 transaction，不得将 compensating rollback 描述为数据库级原子事务。
