# ASCET Dependent Parameter Exported-Parameter Binding Analysis

Date: 2026-08-12

## Purpose

基于新加载的 ASCET database，对整个 database 中 local dependent parameter 的 dependency formula、imported value、exported provider 和路径分布进行只读分析，并据此给出 `read_dependent_chain` / dependent tools 的 exported-parameter 搜索优化策略。

本轮分析替代旧文档中只针对 `WheelSpeedSensors` 个案得到的结论。旧个案的核心语义仍成立，但本文的统计、规律和搜索策略全部以新 database 的全库证据为准。

No write operation was performed.

## Executive conclusion

当前 `read_dependent_chain` 的自动 Provider 搜索从 Consumer 的直接父目录开始递归，最多取 200 个 code components。新 database 的全库结果表明，这个默认边界与真实 binding 拓扑基本不重合：

- 17,716 条已验证 Consumer-to-Provider edge 中，仅 25 条 Provider 位于 Consumer 直接父目录子树内，覆盖率只有 **0.14%**。
- 73.53% 的 edge 位于同一 Package，21.72% 位于同一 root 但跨 Package，4.75% 跨 database root。
- 对完整 exported-element inventory 做全库 exact-name lookup 后，17,166 条 imported mappings 中：
  - 16,571 条只有一个兼容 Provider，**96.53% 可一次定位**；
  - 571 条有 2 或 3 个真实兼容 Provider，**3.33% 必须返回 ambiguity**；
  - 24 条没有任何兼容 Provider，**0.14% 是真实 unresolved**。
- 对全部 17,166 条 imported mappings，`exactNameCandidateCount == ExistsExportForImport-compatible count`；全部 17,716 个已验证 export 的名称都等于 imported element 名称。
- 对 24 条 unresolved mapping 做 database-wide `ExistsExportForImport()` fallback 后仍然没有找到 Provider。

因此最优策略不是扩大 parent-folder scan，而是：

> 建立 database-wide、按 exported element exact name 分区的物理对象索引；每次只对同名候选调用 `ExistsExportForImport()` / `GetExportForImport()`；Package、Project、Parameter branch 只用于排序和解释，不作为过滤边界。

## Database identity warning

当前 ASCET ToolAPI session 返回：

```text
name / canonicalPath:
C:\Repo\F05_IPB_L2_0429

reported path:
C:\Repo\11_ASCETCopilotLiveTest\AscetDb_Xiaomi_ESP_OBD_upgrade_to_FSR1_int_XmN3xAPPx821031xD5EDxECCxOPD_7599\ASW\Db\

identityStatus:
inconsistent

identityIssues:
database_name_path_mismatch
```

本文所有结论绑定到 `name` / `canonicalPath = C:\Repo\F05_IPB_L2_0429`。由于 database identity 仍然 inconsistent，这些结果只能作为 read evidence，不能用于授权写操作。

## Evidence and coverage

### Database-wide inventory

| Evidence | Count |
|---|---:|
| Database tree items | 10,681 |
| Raw Class/Module/StateMachine paths | 7,990 |
| Physical code components after OID deduplication | 7,559 |
| Model elements inspected | 189,118 |
| Physical components containing local parameters | 3,507 |
| Physical components containing dependent parameters | 3,376 |
| Exported model elements inventoried | 27,799 |
| Imported model elements inventoried | 32,206 |
| Scan failures | 0 |

Project-instance paths such as `Project::Module` were normalized to canonical physical components by OID before final statistics. Alias paths were retained only as assembly-context evidence and were not counted as separate Providers.

### Dependency extraction

Every component containing local parameters was exported read-only to AMD XML. Dependency evidence was read from:

- `*.main.amd`: dependent flag, formula, element schema;
- `*.data.amd`: DataVariant mappings from formula formal to local/imported value.

Results after physical OID deduplication:

| Evidence | Count |
|---|---:|
| Dependent parameters | 14,249 |
| Dependency mappings | 17,585 |
| Mappings whose value resolves to imported scope | 17,166 |
| Mappings whose value resolves to local scope | 392 |
| Mappings with empty/unknown value scope | 26 |
| Mappings whose value resolves to exported scope | 1 |
| Dependent parameters with no DataVariant mapping | 33 |
| Dependent parameters with non-empty formula | 14,249 |
| Multi-variant dependent parameters in this database | 0 |

### Runtime verification

For every imported mapping, the runtime imported model element was resolved from its direct Consumer component. Export candidates were then verified with:

```csharp
provider.ExistsExportForImport(importedElement)
provider.GetExportForImport(importedElement)
```

The AMD `valueOid` was never equal to the runtime imported model-element OID in the 17,166 imported mappings. It is DataVariant/XML identity evidence, not a safe key for model-element or Provider lookup.

## Dependency-model findings

### 1. Dependent parameter names do not follow one prefix convention

Physical dependent-parameter prefix distribution begins with:

| Prefix | Count | Share |
|---|---:|---:|
| `P_` | 5,818 | 40.83% |
| `C_` | 3,512 | 24.65% |
| No conventional alphabetic prefix | 1,395 | 9.79% |
| `DTC_` | 241 | 1.69% |
| `T_` | 201 | 1.41% |
| Other prefixes | 3,082 | 21.63% |

Consequences:

- `C_` is not a reliable dependent-parameter discriminator.
- `P_` does not imply independent parameter.
- Discovery must use AMD dependency state, not name patterns.
- Name patterns remain useful only for diagnostics and ranking.

### 2. Exported Provider search applies only to imported mappings

Of 17,585 physical mappings, 419 are not imported mappings. For these mappings, exported Provider search is either not applicable or requires different semantics.

`read_dependent_chain` should distinguish:

```text
value scope = imported  -> search and verify exported Provider
value scope = local     -> internal dependency; no exported Provider search
value scope = exported  -> already exported; no import-to-export resolution
value scope = unknown   -> incomplete dependency evidence
```

Searching for an exported Provider for every formula formal creates false `value_not_imported` or `export_not_found` noise.

### 3. Formula names and XML OIDs are not Provider identities

The authoritative chain is:

```text
Dependent Parameter
  -> dependency formula formal
  -> DataVariant mapped value name
  -> runtime model element in direct Consumer
  -> ExistsExportForImport-compatible exported element
```

The following are not sufficient Provider keys:

- dependent parameter name;
- formula formal name alone;
- AMD `formalOid`;
- AMD `valueOid`;
- Consumer folder or parent directory;
- `Public` / `Private` folder label.

The runtime imported element handle is the authoritative compatibility input.

## Exported-Provider reference patterns

### 1. Global exact name is the strongest candidate key

For all 17,166 physical imported mappings:

| Compatible physical Providers | Mapping count | Share |
|---:|---:|---:|
| 0 | 24 | 0.14% |
| 1 | 16,571 | 96.53% |
| 2 | 568 | 3.31% |
| 3 | 3 | 0.02% |

Observed invariants in this database:

1. Every exact-name exported candidate passed `ExistsExportForImport()`.
2. Every runtime-compatible exported element had the same name as the imported element.
3. A complete exact-name exported index found every Provider that the database-wide fallback could find.
4. The 24 physical unresolved mappings remained unresolved after a database-wide compatibility scan.

This means exact-name lookup is a safe first-stage candidate generator for this database, but not final proof. Compatibility validation remains mandatory because multiple same-name Providers are real.

### 2. Parent-folder search has effectively zero recall

Current code in `AscetDependentChainReadService.ListProviderCandidates()` uses:

```text
scopePath = explicit providerScopePath ?? parent(componentPath)
maxCandidates = explicit maxCandidates ?? 200
recursive = true
```

Measured against verified edges:

| Relationship | Edge count | Share |
|---|---:|---:|
| Provider under Consumer immediate-parent subtree | 25 | 0.14% |
| Provider outside that subtree | 17,691 | 99.86% |

Increasing `maxCandidates` cannot repair a wrong search boundary. The normal Provider search must not start from the Consumer parent as a completeness boundary.

### 3. Package locality is a ranking signal, not a boundary

| Provider relationship | Edge count | Share |
|---|---:|---:|
| Same Package | 13,027 | 73.53% |
| Same root, different Package | 3,848 | 21.72% |
| Different database root | 841 | 4.75% |

The data supports this ranking order:

1. same Package;
2. same root / central `Parameter` branch;
3. cross-root library or customer override;
4. remaining global exact-name candidates.

But applying step 1 as a filter would lose 26.47% of valid Provider edges.

### 4. Parameter branches dominate, but are not complete

Provider path categories:

| Category | Edge count | Share |
|---|---:|---:|
| Path contains `\Parameter\` or `\Parameters\` | 17,652 | 99.64% |
| Constant/component path outside Parameter branch | 35 | 0.20% |
| Other paths | 20 | 0.11% |
| Direct Private branch outside Parameter branch | 9 | 0.05% |

`Parameter`, `Calibration`, `Constant`, `Public`, and `Private` are excellent ranking hints. They cannot be hard inclusion rules.

### 5. Provider element kinds are broader than `IsParameter()`

Verified Provider element types:

| Element type | Edge count | Share |
|---|---:|---:|
| `ScalarElement` | 15,825 | 89.33% |
| `OneDTableElement` | 1,535 | 8.66% |
| `TwoDTableElement` | 319 | 1.80% |
| `ConstantElement` | 31 | 0.18% |
| `ArrayElement` | 5 | 0.03% |
| `SystemConstantElement` | 1 | <0.01% |

An exported index built only from `IsParameter() == true` is incomplete. A concrete counterexample is:

```text
Consumer:
PlatformLibrary\Package\BrakeDiscTemperatureModel\Private\AcmBtmKeepAwake
::dT_Btm [imported]

Provider:
PlatformLibrary\Package\BrakeDiscTemperatureModel\Parameter\Privat\_BTM_Constant
::dT_Btm [ConstantElement, exported]
```

The same issue occurred for `P_ActLgtSampleTi` in `_Constant_VLC`: it is an exported `ConstantElement`, not an `IsParameter()` element.

### 6. Real ambiguity must be preserved

571 physical mappings had more than one compatible Provider. Examples:

```text
Consumer:
PlatformLibrary_NewBrakeSystems\Package\CRB_CooperativeRegenerativeBraking\Private\PreShaping\Common\CRB_BoundByPCAGradient

Imported:
PCA_PreControl_Gradient_FA

Compatible Providers:
1. PlatformLibrary\Package\AntiLockController\Parameter\private\SMC\Regler\_PCA
2. PlatformLibrary_NewBrakeSystems\Package\CRB_CooperativeRegenerativeBraking\Parameter\CRBParameter\PreShaping\CRB_Parameter_PCA_Gradient
```

```text
Imported:
dT_TCS

Compatible Providers:
1. PlatformLibrary\Parameter\Environment\_Environment_CycleTimes
2. CN_Libary\Package\LDM\APC\Parameter\_Constant_APCAxCust
```

Same-name and ToolAPI compatibility are therefore not enough to select one Provider when multiple physical objects verify. Project assembly evidence, explicit exporter input, or user choice is required.

### 7. Cross-Package and cross-root bindings are normal

Representative verified bindings:

```text
Consumer:
PlatformLibrary\Package\TCS_TractionControlSystem\Class\Core\_20ms\MTC\OpMode\USTrqMode\MTC_US_DecTorque

Imported:
PT_Eng_MTarMotRedIni

Provider:
PlatformLibrary\Package\PT_PowerTrain\Parameter\Public\_PT_ESP_PowerTrainABS
```

```text
Consumer:
CN_Libary\Package\iTAS_IntelligenceTurningAssistanceSystem\Private\EzT_AxTarLim

Imported:
P_LDMdT

Provider:
PlatformLibrary\Package\LDMLibrary\parameter\public\_LDM_Lib_Constant
```

```text
Consumer:
PlatformLibrary_NewBrakeSystems\Package\CRB_CooperativeRegenerativeBraking\Private\PreShaping\Common\CRB_BoundByABS_PreControl_Fb

Imported:
g

Provider:
PlatformLibrary\Parameter\Environment\_Environment_Constants
```

These bindings prove that feature root, Package, library root, and customer root cannot be mandatory search boundaries.

## Unresolved mappings

Twenty-four physical imported mappings had no compatible exported Provider anywhere in the complete inventory or database-wide fallback. Representative imported names include:

```text
P_MaxCoastRegen_Deceleration
P_MaxRegen_Deceleration
P_CRB_EndRampvStop_CST
P_TRP_FxDeltaActTar_BlockInitReq
P_TRP_FxGradBrkAct_BlockInitReq
P_HPA_pSupport
P_HPARollPrevOffs
P_HPAMaxPressure
P_AVH_ADSRequestime
P_FAW_CustCalTreshhold
```

These must be returned as unresolved model evidence, not silently mapped to a fuzzy or nearby name. Likely causes include incomplete customer configuration, stale import declarations, intentionally unbound configuration variants, or missing Provider packages. The search tool should report the exact imported element and the completed search coverage.

## Optimized exported-parameter search strategy

### Required index

Build one database-wide physical exported-element index, keyed first by exact element name:

```ts
type ExportBindingCandidate = {
  databaseIdentityKey: string;
  componentPath: string;
  componentOid: string;
  elementName: string;
  elementOid: string;
  scope: "exported";
  elementType: string;
  modelType?: string;
  unit?: string;
  enumerationPath?: string;
  root: string;
  packageKey?: string;
  ownerKind: string;
  representedTrace?: Array<{ path: string; oid: string }>;
};
```

Index requirements:

- enumerate all physical Class/Module/StateMachine components;
- deduplicate Project-instance aliases by component OID;
- index every exported import-compatible element kind, not only `IsParameter()`;
- include scalar, 1D table, 2D table, array, constant, and system-constant elements;
- preserve canonical path plus Project-instance aliases as provenance;
- partition/cache by database canonical identity and bridge generation;
- invalidate or write back the affected component partition after writes.

### Resolution algorithm

For each dependency mapping:

1. Parse dependency AMD once per Consumer component.
2. Read the DataVariant mapping and obtain `valueName` and `valueScope`.
3. If `valueScope != imported`, do not run exported Provider search; return the appropriate internal/unknown state.
4. Resolve the runtime imported element with the direct Consumer component.
5. Query the global exported index by exact `valueName`.
6. Deduplicate candidates by physical `(componentOid, elementOid)`.
7. Validate every candidate with `ExistsExportForImport(importedElement)`.
8. Obtain the authoritative exported handle with `GetExportForImport(importedElement)`.
9. Return:
   - one verified candidate: resolved;
   - multiple verified candidates: ambiguous;
   - zero verified candidates: refresh/check index coverage, then bounded fallback;
   - still zero after complete fallback: unresolved.

Pseudocode:

```text
if mapping.valueScope != imported:
    return not_applicable

imported = consumer.GetModelElement(mapping.valueName)
candidates = exportIndex.byExactName(mapping.valueName)
candidates = dedupeByPhysicalOid(candidates)

matches = []
for candidate in candidates:
    provider = resolve(candidate.componentOid)
    if provider.ExistsExportForImport(imported):
        exported = provider.GetExportForImport(imported)
        matches.add(candidate + exported)

if matches.count == 1:
    return resolved(matches[0])
if matches.count > 1:
    return ambiguous(rank(matches))

refreshNamePartition(mapping.valueName)
retry exact-name validation
if still empty:
    run project/complex-closure fallback
if still empty and coverage is complete:
    return unresolved
```

### Candidate ranking

Ranking improves diagnostics and interactive selection but must not discard candidates:

1. explicit `exporterComponentPath`;
2. Provider proven by the active Project assembly/Complex-reference closure;
3. same Package and `Parameter` branch;
4. same root central `Parameter` branch;
5. cross-root library/customer Provider;
6. other exact-name compatible Provider.

When multiple physical candidates remain, the tool must return ambiguity. It must not auto-select the nearest path.

### Fallback order

A complete exact-name index found every Provider in this database. Fallback should therefore be exceptional:

1. verify index freshness and element-kind completeness;
2. refresh only the missing exact-name partition or affected component partitions;
3. inspect Project sibling Complex providers and aggregate parameter-container closure;
4. perform a database-wide compatibility scan only for the remaining small miss set;
5. never use fuzzy-name selection as binding proof.

### Expected performance effect

For the 17,166 physical imported mappings in this database:

- 96.53% require one ToolAPI compatibility check;
- 3.31% require two checks;
- 0.02% require three checks;
- 0.14% require no indexed checks and proceed to coverage/fallback handling.

Average exact-name validation fan-out is approximately **1.03 candidates per imported mapping**, compared with the current approach of scanning up to 200 components inside a mostly incorrect folder boundary.

## Recommended tool changes

### `AscetDependentChainReadService`

Replace `ListProviderCandidates()` as the normal discovery mechanism. Keep folder scans only as a diagnostic fallback when the index is unavailable.

The service should:

- resolve one global exact-name candidate set per distinct imported value name;
- reuse candidates across dependency variants/formals;
- validate by runtime imported handle;
- return physical OIDs and canonical paths;
- distinguish `resolved`, `ambiguous`, `unresolved`, `not_applicable`, and `coverage_incomplete`.

### TypeScript wrapper

`packages/ascet-extension/src/read-dependent-chain.ts` currently exposes only:

```text
componentPath
dependentElement
exporterComponentPath?
```

This is sufficient if global index-first discovery is internal. Do not require users to provide `providerScopePath` to compensate for an incomplete search implementation.

### Index/catalog collectors

The collector must not equate exported Provider with `IsParameter()`. It must inventory all exported model-element types that can satisfy `ExistsExportForImport()`.

A parameter-only collector missed real `ConstantElement` Providers in this database. The index should store element family/type and let ToolAPI compatibility remain authoritative.

### Result contract

Recommended result fields:

```json
{
  "consumer": {
    "canonicalPath": "...",
    "componentOid": "...",
    "dependent": "...",
    "imported": "...",
    "importedOid": "..."
  },
  "providerSearch": {
    "strategy": "global_exact_name_index",
    "indexComplete": true,
    "exactNameCandidates": 2,
    "validatedCandidates": 2,
    "fallbackUsed": false
  },
  "binding": {
    "status": "ambiguous",
    "candidates": [
      {
        "canonicalPath": "...",
        "componentOid": "...",
        "exported": "...",
        "elementOid": "...",
        "elementType": "OneDTableElement",
        "evidence": "ExistsExportForImport/GetExportForImport"
      }
    ]
  }
}
```

## Evidence artifacts

Read-only evidence generated for this analysis:

```text
output/database-analysis/20260812-database-03/database-identity.json
output/database-analysis/20260812-database-03/database-tree.json
output/database-analysis/20260812-database-03/full-dependent-parameter-scan.json
output/database-analysis/20260812-database-03/dependent-xml-scan-all-local.json
output/database-analysis/20260812-database-03/element-scope-inventory.json
output/database-analysis/20260812-database-03/provider-compatibility-all-local.json
output/database-analysis/20260812-database-03/global-provider-fallback-all-local.json
output/database-analysis/20260812-database-03/dependent-provider-analysis-summary.json
```

The scans reported zero component, XML-export, inventory, or compatibility failures.

## Final finding

The new database has a highly regular semantic rule and an irregular physical layout:

```text
semantic rule:
Dependent -> mapped imported element -> same-name exported candidate -> ToolAPI compatibility

physical layout:
same Package, cross Package, central Parameter root, customer root, and cross-library root are all valid
```

The exported-parameter search strategy should therefore be global and identity-driven, not folder-driven. Exact-name indexing reduces the normal search to about one compatibility check per imported mapping while preserving all real cross-Package bindings and all real ambiguity. Project/package/path evidence remains valuable for ranking and explanation, but only `ExistsExportForImport()` and `GetExportForImport()` prove the final binding.

## Appendix: relation to the previous WheelSpeedSensors case study

The previous database-specific analysis showed that a Project can assemble aggregate constant Classes whose local Complex elements reference leaf Parameter Classes, while nested algorithm Classes own the imported scalar elements. The new full-database analysis confirms the same semantic separation at scale:

```text
Project / aggregate container = assembly and routing context
leaf exported element owner   = physical Provider evidence
nested direct Consumer owner   = imported element lookup context
```

The old `WheelSpeedSensors` paths and OIDs are not reused as evidence for the new database and must not be mixed with the counts in this document.