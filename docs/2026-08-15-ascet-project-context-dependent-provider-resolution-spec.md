# ASCET Project-Context Dependent Provider Resolution Specification

Date: 2026-08-15
Status: Proposed final specification

## 1. Purpose

Define the authoritative read-only workflow for resolving an ASCET Local Dependent Parameter to the Exported Parameter used by its mapped Imported Parameter.

Provider discovery is strictly bound to the Consumer's active Project assembly context. Database-wide exported-element indexes, database-wide exact-name searches, Package-wide fallback searches, and path-proximity searches are outside this specification.

This specification supersedes the global-index and global-fallback behavior proposed in `docs/2026-08-14-ascet-dependent-exported-parameter-resolution-strategy.md`.

## 2. Core rule

```text
Direct Consumer Class
-> owner Module
-> exact Project::Module instance context
-> Project parameter aggregate Class
-> Complex-reference closure
-> leaf Parameter Class
-> same-name Exported Element
-> ExistsExportForImport() / GetExportForImport()
```

The Project assembly closure defines the Provider search boundary. ToolAPI compatibility validates the final candidate inside that boundary.

```text
Project context is the search boundary.
ToolAPI compatibility is the final verification.
No database-wide Provider search is allowed.
```

## 3. Non-goals

The resolver must not:

- build or require a database-wide exported-element index;
- scan every database Component for the imported element name;
- use the Consumer parent folder as the Provider search boundary;
- search unrelated Projects, Packages, roots, or Parameter folders;
- select a Provider because its path is nearest to the Consumer;
- use fuzzy-name matching;
- treat Package, `Public`, `Private`, `Parameter`, or `Constant` path segments as binding proof;
- treat AMD `formalOid` or `valueOid` as runtime Provider identity;
- treat a ToolAPI-compatible Provider outside the active Project assembly as an actual binding candidate.

## 4. Terminology

### 4.1 Direct Consumer

The physical Class or Module that directly owns both:

- the Local Dependent Parameter; and
- the Imported Element selected by the dependency mapping.

A top-level Module that only owns a Complex reference to the real Consumer Class is not the direct Consumer.

### 4.2 Owner Module

A top-level Module whose Class/reference closure contains the direct Consumer.

A Consumer Class can be referenced by more than one Module. All owner Module candidates must be preserved until Project context identifies the active one.

### 4.3 Project instance context

The exact assembly identity represented by:

```text
<Project path>::<Module instance name>
```

A canonical Module definition and a `Project::Module` instance can share the same physical OID while representing different evidence roles:

- canonical Module path: physical definition identity;
- `Project::Module` path: assembly context and provenance.

### 4.4 Parameter aggregate Class

A Class reachable from a Module in the active Project that groups parameter, calibration, constant, or configuration Classes through Complex references.

Names and paths can rank likely aggregates, but actual outgoing represented-Class references define the graph.

### 4.5 Leaf Provider Class

A Class in the aggregate Complex-reference closure that owns a same-name Exported Element compatible with the Consumer Imported Element.

A Class does not need to have zero outgoing references to qualify. Every Class reached through the closure must be checked for the exact exported element name.

### 4.6 Compatible Provider

A Project-context Provider for which:

```csharp
provider.ExistsExportForImport(importedElement) == true
```

and:

```csharp
provider.GetExportForImport(importedElement)
```

returns the exported element handle.

Compatibility is necessary but is evaluated only after Project-context candidate generation.

## 5. Required inputs

The public request remains centered on the exact Consumer and dependent element:

```ts
type ReadDependentChainParams = {
  componentPath: string;
  dependentElement: string;
  projectContext?: {
    projectPath?: string;
    moduleInstancePath?: string;
  };
  exporterComponentPath?: string;
};
```

Rules:

- `componentPath` identifies the known or candidate direct Consumer.
- `dependentElement` identifies the Local Dependent Parameter.
- `projectContext` is optional only when one unique context can be proven.
- `exporterComponentPath` is an explicit verification constraint and bypasses automatic Provider discovery.

## 6. Resolution workflow

### 6.1 Resolve the direct Consumer

1. Resolve `componentPath` to an exact physical Component.
2. Read the dependent element and confirm that it is directly owned by the Component.
3. Parse the dependency AMD/XML evidence.
4. Resolve the mapped value in the same direct Consumer Component.
5. Confirm the mapped value scope.

Mapping classification:

| Mapped value scope | Result |
|---|---|
| `imported` | Continue with Project-context Provider resolution. |
| `local` | Return `not_applicable` with reason `internal_dependency`. |
| `exported` | Return `not_applicable` with reason `already_exported`. |
| empty or unknown | Return `coverage_incomplete` with reason `mapping_scope_unknown`. |

The runtime Imported Element handle from the direct Consumer is the authoritative compatibility input.

### 6.2 Resolve the owner Module

Use bounded reverse-reference traversal:

```text
Direct Consumer Class
<- referencing parent Class
<- referencing parent Class
<- top-level owner Module
```

The existing backend operation is:

```text
read_component_used_by
```

Traversal requirements:

- start from the Consumer Package or verified feature root, not the database root;
- preserve every incoming reference edge;
- recurse until Module owners are found;
- deduplicate by physical Component OID;
- maintain a recursion guard;
- report truncation and scan limits;
- preserve the complete Consumer-to-Module owner chain as evidence.

If no Module owner can be proven with complete coverage, return:

```text
coverage_incomplete / owner_module_not_resolved
```

### 6.3 Resolve the Project instance context

Map every owner Module OID to `Project::Module` aliases from the complete Tree observation.

Resolution rules:

1. If `projectContext.moduleInstancePath` is supplied, validate that its represented Module OID matches an owner Module OID.
2. If the input path already identifies a `Project::Module` instance, use that context.
3. If exactly one Project instance context remains, select it automatically.
4. If multiple contexts remain, do not merge their Provider closures.

Multiple contexts return:

```json
{
  "status": "project_context_required",
  "contexts": [
    {
      "projectPath": "...",
      "moduleInstancePath": "...",
      "moduleOid": "..."
    }
  ]
}
```

This state is not Provider ambiguity. It means the caller has not identified the active assembly context.

### 6.4 Collect the active Project Module instances

From the selected Project context, read the Project's Module instance set from Tree/Catalog evidence.

Preserve for each Module:

```text
projectPath
moduleInstancePath
canonicalComponentPath
componentOid
```

Project aliases must not be counted as separate physical Components.

### 6.5 Locate aggregate candidates

For the active Project Module set:

1. Read outgoing represented-Class references with `component_refs`.
2. Preserve the source element name and scope for every edge.
3. Rank likely parameter aggregate references using parameter, calibration, constant, and configuration evidence.
4. Do not remove non-ranked references solely because their path or name lacks those tokens.

Recommended `component_refs` result enrichment:

```json
{
  "sourcePath": "...",
  "sourceOid": "...",
  "sourceElementName": "...",
  "sourceElementType": "ComplexModelElement",
  "sourceElementScope": "local",
  "isComplex": true,
  "targetPath": "...",
  "targetOid": "..."
}
```

Until those fields are available, traverse every resolved represented-Class reference returned for the selected Project modules.

### 6.6 Expand the Complex-reference closure

Recursively traverse represented-Class references from each aggregate candidate.

Pseudocode:

```text
walk(component):
    if component.oid in visited:
        return

    visited.add(component.oid)
    checkExactExport(component, importedName)

    for ref in componentRefs(component):
        if ref resolves to a Class or Module:
            walk(ref.target)
```

Requirements:

- check every visited Class for the exact exported element name;
- deduplicate by physical Component OID;
- preserve every traversal edge as provenance;
- apply a cycle guard;
- use a configured maximum depth;
- treat depth exhaustion or truncated references as incomplete coverage, not absence.

### 6.7 Find the exact Exported Element

For every Component in the active Project aggregate closure, perform an exact element lookup:

```json
{
  "action": "elements",
  "target": {
    "oid": "<provider-component-oid>",
    "path": "<provider-component-path>"
  },
  "elementName": "<imported-element-name>",
  "filters": {
    "scope": ["exported"]
  }
}
```

The backend should use:

```csharp
component.GetModelElement(importedElementName)
```

It must not enumerate every element in the Component when an exact name is available.

All exported element families are valid candidates if ToolAPI accepts them, including scalar, table, array, constant, and system-constant elements.

### 6.8 Verify Project-context candidates

For every same-name Exported Element found inside the active Project closure, execute:

```csharp
provider.ExistsExportForImport(importedElement)
provider.GetExportForImport(importedElement)
```

Verification requirements:

- validate every candidate inside the active Project closure;
- do not stop after the first compatible candidate;
- preserve every compatible candidate if multiple active Project candidates exist;
- return the runtime exported handle reported by `GetExportForImport()`;
- record Provider Component path/OID, element name/type, and assembly provenance.

## 7. Terminal states

### 7.1 `resolved`

Exactly one compatible Provider exists in the complete active Project assembly closure.

```json
{
  "status": "resolved",
  "resolutionReason": "project_assembly_closure"
}
```

### 7.2 `ambiguous`

More than one compatible Provider exists in the same complete active Project assembly closure.

```json
{
  "status": "ambiguous",
  "resolutionReason": "multiple_project_assembly_providers"
}
```

Return all candidates and their distinct assembly paths. Do not select by path proximity or ranking.

### 7.3 `project_context_required`

The direct Consumer can be reached from multiple Project instance contexts and the active context is not supplied or cannot be uniquely inferred.

Do not combine candidates from multiple Projects.

### 7.4 `unresolved`

The active Project context is known, the owner chain and Project aggregate closure are complete, all exact same-name candidates in that closure were validated, and none is compatible.

```json
{
  "status": "unresolved",
  "resolutionReason": "provider_not_present_in_project_assembly"
}
```

No Package-wide or database-wide search follows this state.

### 7.5 `coverage_incomplete`

Return this state when any required Project-context evidence is incomplete, including:

- reverse-reference traversal was truncated;
- owner Module was not resolved;
- Project Module collection was incomplete;
- a represented-Class reference could not be resolved;
- Complex traversal exceeded its depth limit;
- a ToolAPI read failed;
- the database identity does not match stored Tree/Catalog evidence.

Do not convert incomplete coverage into `unresolved`.

### 7.6 `not_applicable`

The mapped dependency value is local or already exported, so import-to-export Provider resolution does not apply.

## 8. Explicit exporter behavior

When `exporterComponentPath` is supplied:

1. Resolve the explicit Provider exactly.
2. Validate it with the direct Consumer Imported Element handle.
3. Return `resolved` only when compatibility succeeds.
4. Return `unresolved` with reason `explicit_exporter_incompatible` when compatibility fails.
5. Do not search for alternative Providers automatically.

An explicit Provider outside the selected Project assembly context must be reported with its context mismatch. It must not silently redefine the Project context.

## 9. Tool coordination

```text
read_dependent_chain
├─ AMD dependency mapping reader
├─ component_used_by
│  └─ direct Consumer -> owner Module chain
├─ tree/catalog
│  └─ owner Module OID -> exact Project::Module context
├─ component_refs
│  ├─ Project Module -> aggregate candidates
│  └─ aggregate -> nested represented Classes
├─ elements
│  └─ exact same-name Exported Element lookup
└─ import_binding compatibility primitive
   └─ ExistsExportForImport() / GetExportForImport()
```

### 9.1 `ascet_get.elements`

Use only for exact Component element identity/scope lookup. Do not use it for database-wide or Package-wide Provider discovery.

### 9.2 `component_used_by`

Use for bounded Consumer-owner resolution. The operation should be internal to `read_dependent_chain` or exposed as `ascet_get.component_used_by` if independent diagnostics are required.

### 9.3 `ascet_get.component_refs`

Use for outgoing represented-Class traversal. It is not a reverse-reference API.

### 9.4 `ascet_get.import_binding`

Use as the exact compatibility primitive or for explicit diagnostic verification. The normal Skill workflow should not need to call it separately when `read_dependent_chain` already performs final verification.

## 10. Skill behavior

The `ascet-engineering` Skill must use this workflow:

```text
resolve exact Consumer
-> resolve or request exact Project context
-> call read_dependent_chain
-> handle resolved / ambiguous / project_context_required /
   unresolved / coverage_incomplete / not_applicable
```

Required Skill rules:

- Provider resolution is strictly Project-context-bound.
- Do not perform database-wide, root-wide, or Package-wide Provider searches.
- Do not require the user to find the Exported Provider before calling `read_dependent_chain`.
- Treat multiple Project contexts as `project_context_required`, not Provider ambiguity.
- Treat multiple compatible Providers inside one active Project closure as `ambiguous`.
- Stop on `coverage_incomplete`; do not infer absence.
- Require a `resolved` Provider before dependency-chain writes.

## 11. Cache policy

Cache only bounded assembly evidence:

```text
Consumer component OID -> owner Module chains
Module OID -> Project instance contexts
Project OID -> Module instances
Component OID -> outgoing represented-Class references
Aggregate component OID -> Complex-reference closure
```

Cache keys must include the current database fingerprint and runtime generation.

Do not cache or build:

```text
database-wide exported-element inventory
database-wide exact-name index
database-wide compatibility graph
```

After a PI-managed write, invalidate or refresh only affected Component references and closures. External ASCET UI changes require explicit evidence refresh; no polling is required.

## 12. Result contract

```json
{
  "consumer": {
    "canonicalPath": "...",
    "componentOid": "...",
    "dependentElement": "...",
    "importedElement": "...",
    "variant": "default"
  },
  "projectContext": {
    "projectPath": "...",
    "moduleInstancePath": "...",
    "ownerModulePath": "...",
    "ownerModuleOid": "..."
  },
  "providerSearch": {
    "strategy": "project_assembly_closure",
    "ownerChainComplete": true,
    "projectModulesComplete": true,
    "complexClosureComplete": true,
    "visitedComponentCount": 12,
    "sameNameCandidateCount": 1,
    "compatibleCandidateCount": 1,
    "truncated": false
  },
  "binding": {
    "status": "resolved",
    "resolutionReason": "project_assembly_closure",
    "provider": {
      "canonicalPath": "...",
      "componentOid": "...",
      "exportedElement": "...",
      "elementType": "ScalarElement"
    },
    "candidates": []
  },
  "evidenceChain": [
    {
      "relation": "consumer_used_by",
      "source": "...",
      "target": "..."
    },
    {
      "relation": "project_module_instance",
      "source": "...",
      "target": "..."
    },
    {
      "relation": "complex_reference",
      "source": "...",
      "target": "..."
    }
  ],
  "issues": []
}
```

## 13. Required implementation changes

1. Replace `AscetDependentChainReadService.ListProviderCandidates()` parent-folder scanning with Project-context resolution.
2. Reuse the existing `read_component_used_by` backend for bounded Consumer-to-Module traversal.
3. Add optional `projectContext` support to the TypeScript and backend request contracts.
4. Resolve owner Module OIDs to `Project::Module` aliases from complete Tree evidence.
5. Traverse active Project represented-Class references with OID deduplication and cycle guards.
6. Enrich `component_refs` with source element type and Complex-reference evidence where available.
7. Perform exact same-name lookup only inside the active Project closure.
8. Validate every Project-context candidate with `ExistsExportForImport()` and `GetExportForImport()`.
9. Remove parent-folder Provider discovery as a normal path.
10. Do not add a database-wide Provider fallback.
11. Update action descriptors and Skill references so `read_dependent_chain` is the authoritative automatic Provider resolver.

## 14. Acceptance criteria

The implementation is complete when:

- a nested Consumer Class can be traced to its owner Module;
- an owner Module can be mapped to an exact `Project::Module` context;
- multiple Project contexts produce `project_context_required` unless one is supplied;
- the resolver collects only the selected Project's Module and Complex-reference closure;
- same-name Exported Elements are searched only inside that closure;
- scalar, table, array, constant, and system-constant Providers can be validated;
- exactly one active compatible Provider returns `resolved`;
- multiple active compatible Providers return `ambiguous`;
- complete Project closure with no compatible Provider returns `unresolved`;
- incomplete owner, Project, or Complex traversal returns `coverage_incomplete`;
- no database-wide exported index or database-wide Provider scan is performed;
- the returned result contains the full Consumer-to-Provider assembly evidence chain;
- dependency-chain writes require a previously resolved Provider and exact Project context.

## 15. Validation plan

Before removing the legacy implementation, run the Project-context resolver against the existing full-database evidence set:

```text
17,166 physical imported mappings
```

Measure:

```text
owner Module resolution rate
unique Project context rate
multiple Project context rate
aggregate closure completion rate
Project-context Provider resolution rate
ambiguous active-Project Provider rate
unresolved rate
coverage-incomplete reasons
median and maximum visited Component count
median and maximum ToolAPI calls per mapping
```

The validation must compare the returned Provider against known ToolAPI-compatible evidence, but it must not add Providers from outside the selected Project context. Any mismatch must be classified as owner-resolution, Project-context, reference-closure, compatibility, or evidence-quality failure.

## 16. Final decision

The authoritative Provider discovery boundary is the active Project assembly closure.

```text
Consumer Class
-> owner Module
-> Project instance
-> Project aggregate
-> Complex leaf Provider
-> same-name Exported Element
-> ToolAPI verification
```

If that chain is complete and no Provider is found, the result is unresolved for that Project. If the chain is incomplete, the result is coverage incomplete. The resolver must not search the rest of the database.
