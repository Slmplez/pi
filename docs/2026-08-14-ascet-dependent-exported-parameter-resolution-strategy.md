# ASCET Dependent Parameter Exported-Parameter Resolution Strategy

Date: 2026-08-14

## Purpose

Define the final read-only search method for resolving an ASCET local dependent parameter to the exported parameter(s) that can satisfy its mapped imported input.

This strategy combines Project/Complex-reference context with a database-wide exported-element index. It uses ASCET ToolAPI compatibility as the only final binding proof.

## Core rule

```text
Project / Module / Complex graph provides context and ranking.
Global exact-name index provides fast candidate recall.
ExistsExportForImport() and GetExportForImport() prove the binding.
```

Do not use folder proximity, Package, `Public`/`Private`, parameter prefixes, or AMD XML OIDs as final binding rules.

## Model graph

```text
Project
├─ Complex reference -> Module definition
│  └─ local Complex reference -> nested Consumer Class
│     ├─ local dependent parameter
│     └─ imported parameter
│
└─ Complex reference -> aggregate parameter / constant container Class
   └─ local Complex reference -> leaf Parameter Class
      └─ exported scalar, table, constant, array, or system constant element
```

Terminology:

```text
Complex element --GetRepresentedClass()--> referenced CodeComponent
Parameter Class --owns--> exported model element
Dependent mapping --selects--> Consumer imported model element
Provider compatibility --proves--> exported element binding
```

A Parameter Class owns its exported elements; it does not reference them.

## Preconditions

For every query, preserve:

```text
Consumer canonical component OID and path
Project instance path(s) and Project OID(s), if available
Dependent element name
Imported element runtime handle and OID
Database canonical identity and index generation
```

A canonical component can be used by multiple Project instances. Do not assume one unique Project context.

## Resolution algorithm

### 1. Resolve the direct Consumer

1. Start with the supplied dependent component path.
2. If the dependent parameter is not directly owned there, descend local Complex represented-class references.
3. Stop at the direct Class/Module that owns the dependent parameter and its mapped imported element.

Do not search an imported scalar from a top-level Module that only owns a Complex reference to the actual Consumer Class.

### 2. Parse the dependency mapping

Read the dependent element's AMD/XML evidence and obtain:

```text
formula
formalName
valueName
valueScope
```

Classify the mapped value before Provider search:

| `valueScope` | Action |
|---|---|
| `imported` | Resolve exported Provider candidates. |
| `local` | Internal dependency; do not search exported Providers. |
| `exported` | Already exported; do not perform import-to-export lookup. |
| empty/unknown | Return incomplete evidence. |

### 3. Build Project-context candidates

For every Project instance context that contains the Consumer:

1. Read Project Complex references.
2. Identify the Module instance/definition containing the Consumer.
3. Identify aggregate parameter or constant-container Classes.
4. Recursively follow local Complex `GetRepresentedClass()` references.
5. Collect leaf Parameter Classes and their same-name exported elements.

Traversal requirements:

```text
Deduplicate visited components by component OID.
Preserve Project instance paths as provenance.
Do not treat a Project alias path as a distinct physical Provider.
```

### 4. Build global exact-name candidates

Use the mapped imported name as the index key:

```text
exportByName[valueName]
```

The exported-element index must include every physical `scope=exported` element that can satisfy an import, including:

```text
ScalarElement
OneDTableElement
TwoDTableElement
ConstantElement
ArrayElement
SystemConstantElement
```

Do not build the index from `IsParameter() == true` alone. Real Providers can be `ConstantElement` or table elements.

### 5. Union, deduplicate, and validate

```text
candidates =
  dedupeByPhysicalOid(
    projectContextCandidates
    UNION
    globalExactNameCandidates
  )
```

Physical deduplication key:

```text
(componentOid, elementOid)
```

For each candidate:

```csharp
if (provider.ExistsExportForImport(importedElement))
{
    export = provider.GetExportForImport(importedElement);
}
```

This validation is mandatory even when names match and the candidate belongs to the active Project.

### 6. Return an explicit terminal state

| Verified physical matches | Result |
|---:|---|
| 0 | `unresolved` |
| 1 | `resolved` |
| 2 or more | `ambiguous` |

For `ambiguous`, return every verified physical Provider. Project context may rank candidates but must not silently remove compatible candidates.

## Candidate ranking

Ranking is explanatory only. It never excludes a ToolAPI-compatible candidate.

```text
1. User-supplied exporterComponentPath
2. Candidate proven by active Project / Complex assembly closure
3. Same Package Parameter branch
4. Same root public/shared Parameter branch
5. Cross-root library or customer Parameter branch
6. Other exact-name compatible candidate
```

## Fallback policy

The normal path is index-first. Use fallback only when no verified candidate remains.

```text
1. Check index identity, generation, and element-kind completeness.
2. Refresh the exact-name index partition for valueName.
3. Re-run Project/Complex closure collection.
4. If coverage remains incomplete, perform a bounded database-wide compatibility scan.
5. If completed coverage still yields zero matches, return unresolved.
```

Do not use Consumer-parent recursive scan as a normal search path. It is diagnostic fallback only.

## Known database evidence

The F05 database analysis established:

```text
96.53% of imported mappings have one compatible Provider.
3.33% have two or three compatible Providers.
0.14% have no compatible Provider.
0.14% of verified Provider edges are under the Consumer immediate-parent subtree.
73.53% are same-Package; valid cross-Package and cross-root Providers are common.
```

The exact-name exported index was complete for all resolved imported mappings when it included every exported element kind. The AMD `valueOid` did not equal the runtime imported model-element OID and must not be used as the Provider join key.

## Result contract

```json
{
  "consumer": {
    "canonicalPath": "...",
    "componentOid": "...",
    "dependent": "...",
    "imported": "...",
    "importedOid": "..."
  },
  "mapping": {
    "formal": "...",
    "value": "...",
    "valueScope": "imported"
  },
  "providerSearch": {
    "strategy": "project_context_plus_global_exact_name_index",
    "indexState": "ready",
    "projectContextCandidates": 1,
    "exactNameCandidates": 2,
    "validatedCandidates": 2,
    "fallbackUsed": false
  },
  "binding": {
    "status": "resolved | ambiguous | unresolved | not_applicable | incomplete",
    "providers": []
  }
}
```

## Implementation target

`AscetDependentChainReadService` should replace parent-folder component enumeration as its normal Provider discovery mechanism with:

```text
Dependency mapping -> global exact-name index -> ToolAPI validation
```

Project/Complex traversal should provide context, candidate ranking, provenance, and fallback coverage rather than becoming a hard path boundary.