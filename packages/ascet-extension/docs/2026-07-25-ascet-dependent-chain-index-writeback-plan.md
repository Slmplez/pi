# ASCET Dependent Chain Index Writeback Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Coordinate `ascet_read.read_dependent_chain` and `ascet_write.set_element_dependency` around the ASCET search index so dependency-provider reads are fast, write results immediately update the in-memory index, and returned JSON is compact but complete enough for agent recovery.

**Architecture:** Keep live ASCET access serial and exact. Use the existing quick-search index for provider discovery, use live `read_element_catalog` for full element data, and upsert successful readbacks into an in-memory full-element cache. `set_element_dependency` does not create local/imported/exported parameters; `apply_element_spec` creates or updates elements and then performs targeted live readback to refresh the index.

**Tech Stack:** TypeScript, TypeBox schemas, existing `AscetCli.exe exec ... --json` wrappers, `search-index-store.ts`, `ascet_capabilities.search_actions`, `npx biome`, `npx tsgo`, `tsx --test`.

---

## 1. Scope

This plan covers two public agent-facing workflows:

- `ascet_read.read_dependent_chain`
- `ascet_write.set_element_dependency`

It also touches these supporting surfaces because they are required for correctness:

- `ascet_write.apply_element_spec`, only for post-write index refresh of newly created or updated elements.
- Internal live wrapper for `read_element_catalog`.
- Search index store upsert APIs and full element cache.
- Action descriptors, compact prompt, full action prompt, and few-shot guidance.

This plan does **not** add UI polling, Win32 window reads, batch write, concurrent ToolAPI scans, or startup full-index warmup.

## 2. Current State

### 2.1 `read_dependent_chain`

Current file:

- `packages/ascet-extension/src/read-dependent-chain.ts`
- `packages/ascet-extension/src/tools/read/schema.ts`
- `packages/ascet-extension/src/tools/read/definition.ts`

Current behavior:

- It is a thin wrapper around `AscetCli.exe exec read_dependent_chain <component> <element> --json`.
- Provider discovery is performed inside the C# live command.
- It returns dependency formula and provider-chain information, but it does not use the new `element_decls` index.
- It does not return full provider element catalog data.

Problem:

- The expensive part is provider discovery across components.
- The existing `element_decls` index already has the right information for fast provider discovery: element name, scope, type, kind, component path.
- Full element metadata must come from live `read_element_catalog`; declaration index data is not enough.

### 2.2 `set_element_dependency`

Current files:

- `packages/ascet-extension/src/set-element-dependency.ts`
- `packages/ascet-extension/src/tools/write.ts`
- `packages/ascet-extension/src/write-common.ts`

Current behavior:

- The write command sets or clears dependency state/formula for an existing local parameter.
- On success, `tools/write.ts` calls `createWriteImpact()` and `applyWriteImpactToSearchIndex()`.
- `write-common.ts` currently marks `element_decls` and `text_code` stale for `set_element_dependency`.

Problem:

- Stale invalidation is safe but slower for the next agent action.
- The user requirement is stronger: after a successful write, immediately write the new/changed element and its full content into the in-memory index/cache.

### 2.3 `read_element_catalog`

Current files:

- `packages/ascet-extension/ascet-cli/contracts/commands/AscetReadElementCatalog.json`
- `packages/ascet-extension/ascet-cli/bin/AscetReadElementCatalog.exe`
- `E:/Rep/AscetAgent/src/ascetcli/src/AscetCli/AscetReadElementCatalog.cs`

Current behavior:

- CLI operation exists: `read_element_catalog`.
- It returns:

```json
{
  "elements": [
    {
      "name": "K",
      "kind": "parameter",
      "modelType": "cont",
      "scope": "Exported",
      "physicalRange": { "min": 0, "max": 1 },
      "calibration": true,
      "impl": {
        "valueType": "sint16",
        "implementationRange": { "min": 0, "max": 1000 },
        "formula": "..."
      }
    }
  ]
}
```

Problem:

- There is no canonical TS wrapper in `packages/ascet-extension/src`.
- There is no public or internal `ascet_read` action dispatch for it.
- Existing prompts mention `read_element_catalog`, but the model cannot call it through the canonical `ascet_read` tool.

## 3. Target Behavior

### 3.1 Startup

`ascet_status` keeps the lightweight startup responsibility:

1. Connect to host/current DB.
2. Build or refresh only the `components` partition through `GetAllComponentsOfType`.
3. Do not build `element_decls`, `text_code`, dependency provider data, or full element cache.

### 3.2 Search Index Warm Triggers

Index partitions are warmed by the tools that need them:

| Trigger | Required partition/cache | Behavior |
|---|---|---|
| `ascet_status.status` | `components` | Connect plus components only. |
| `ascet_search.search_elements` | `element_decls` | Warm if empty/stale, then query memory. |
| `ascet_read.read_dependent_chain` | `element_decls`, full element cache | Use existing `element_decls` if ready; warm it if missing/stale; live-read full provider element only on cache miss. |
| `ascet_write.apply_element_spec` success | `element_decls`, full element cache | Live `read_element_catalog(component)`, upsert changed elements immediately. |
| `ascet_write.set_element_dependency` success | `element_decls`, full element cache | Live `read_element_catalog(target component)`, upsert changed local element immediately. Mark `text_code` stale unless targeted code refresh is implemented. |

### 3.3 UI-Side Edits

Do not add cheap polling.

If the user edits ASCET UI outside PI tools:

- On extension restart, do not trust old in-memory indexes; only `components` is rebuilt by `ascet_status`.
- During the same session, the index can be stale if the user edits externally. The safe recovery is explicit tool-driven refresh:
  - `ascet_search.search_elements` can rebuild `element_decls`.
  - `read_dependent_chain` can force provider resolution from a freshly warmed `element_decls` partition if the partition is stale/missing.
  - A future explicit `refreshIndex` parameter may be added, but this plan avoids broad new tool surface unless tests prove it is needed.

## 4. Target JSON Contract

All successful responses return only effective result data.

Do not return:

```json
{
  "ok": true,
  "error": null,
  "meta": {
    "operation": "read_dependent_chain"
  }
}
```

Failures return only structured `error`.

All paths in outputs use `/`.

Use stable fields:

```text
component
path
kind
language
name
type
scope
source
target
left
right
items
total
nextCursor
detailLevel
```

Do not echo input parameters unless a value has been canonicalized.

### 4.1 `read_dependent_chain` Success

Default `detailLevel` is `full` for this action because the user explicitly wants full provider element data.

Example:

```json
{
  "consumer": {
    "component": "PlatformLibrary/Package/AEB/Private/AEB_Core/AEB_pDriverIBooster",
    "dependent": {
      "name": "P_AEB_IB_MaxVelocityDrop_Curve",
      "kind": "parameter",
      "scope": "Local",
      "dependency": "dependent"
    },
    "formula": {
      "code": "C_AEB_IB_MaxVelocityDrop_Curve",
      "references": ["C_AEB_IB_MaxVelocityDrop_Curve"],
      "mappings": [
        {
          "formal": "C_AEB_IB_MaxVelocityDrop_Curve",
          "imported": "C_AEB_IB_MaxVelocityDrop_Curve"
        }
      ]
    }
  },
  "provider": {
    "component": "PlatformLibrary/Package/AEB/Private/AEB_Core/AEB_Parameter",
    "name": "C_AEB_IB_MaxVelocityDrop_Curve",
    "kind": "parameter",
    "type": "cont",
    "scope": "Exported",
    "path": "PlatformLibrary/Package/AEB/Private/AEB_Core/AEB_Parameter/C_AEB_IB_MaxVelocityDrop_Curve"
  },
  "element": {
    "source": "live",
    "data": {
      "name": "C_AEB_IB_MaxVelocityDrop_Curve",
      "kind": "parameter",
      "modelType": "cont",
      "scope": "Exported",
      "calibration": true,
      "physicalRange": {
        "min": 0,
        "max": 100
      },
      "impl": {
        "valueType": "sint16",
        "implementationRange": {
          "min": 0,
          "max": 1000
        }
      }
    }
  },
  "index": {
    "provider": "element_decls",
    "element": "full_element_cache"
  }
}
```

If no provider is found:

```json
{
  "consumer": {
    "component": "PlatformLibrary/Package/AEB/Private/AEB_Core/AEB_pDriverIBooster",
    "dependent": {
      "name": "P_AEB_IB_MaxVelocityDrop_Curve",
      "dependency": "dependent"
    }
  },
  "total": 0,
  "items": [],
  "issues": [
    {
      "code": "exportedProviderNotFound",
      "message": "No same-name scope=Exported provider was found in element_decls."
    }
  ]
}
```

If multiple exported providers remain after filters:

```json
{
  "total": 2,
  "items": [
    {
      "component": "FeatureA/CalibrationParameter",
      "name": "K",
      "scope": "Exported",
      "path": "FeatureA/CalibrationParameter/K"
    }
  ],
  "issues": [
    {
      "code": "exportedProviderAmbiguous",
      "message": "More than one same-name scope=Exported provider matched. Pass exporterComponentPath or providerScopePath."
    }
  ]
}
```

### 4.2 `set_element_dependency` Success

Example:

```json
{
  "changed": {
    "target": "FeatureA/Consumer",
    "element": "K",
    "dependency": {
      "before": "independent",
      "after": "dependent"
    },
    "formula": {
      "after": "K_Exported",
      "changed": true
    }
  },
  "readback": {
    "verified": true
  },
  "index": {
    "updated": ["element_decls", "full_element_cache"],
    "stale": ["text_code"],
    "elements": [
      {
        "component": "FeatureA/Consumer",
        "name": "K",
        "kind": "parameter",
        "type": "cont",
        "scope": "Local",
        "path": "FeatureA/Consumer/K"
      }
    ]
  }
}
```

If write succeeds but targeted readback indexing fails, the write is still successful, but recovery is explicit:

```json
{
  "changed": {
    "target": "FeatureA/Consumer",
    "element": "K"
  },
  "readback": {
    "verified": true
  },
  "index": {
    "updated": [],
    "stale": ["element_decls", "text_code"],
    "issues": [
      {
        "code": "indexReadbackFailed",
        "message": "Write succeeded, but read_element_catalog failed during index refresh."
      }
    ]
  }
}
```

## 5. Architecture

### 5.1 Internal Read Catalog Wrapper

Add:

- `packages/ascet-extension/src/read-element-catalog.ts`
- `packages/ascet-extension/src/read-element-catalog.test.ts`

Responsibilities:

- Build CLI args:

```ts
["exec", "read_element_catalog", normalizeAscetPath(componentPath), "--json"]
```

- Run as `toolName: "ascet_read"`, `commandId: "read_element_catalog"`, `jobKind: "read"`.
- Return raw CLI JSON for internal callers.
- Provide helpers:
  - `extractElementCatalogItems(data)`
  - `findCatalogElement(data, { name, scope?, kind? })`
  - `toElementDeclarationEntry(component, catalogElement, componentMeta?)`

Do not expose `read_element_catalog` as a public action in the first implementation pass unless `read_dependent_chain` cannot satisfy the full-data requirement. Keep tool count low.

### 5.2 Full Element Cache

Extend `search-index-store.ts` with an in-memory full element cache.

Suggested type:

```ts
export interface AscetFullElementCacheEntry {
  componentPath: string;
  name: string;
  kind: string;
  type?: string;
  scope?: string;
  path: string;
  source: "live_readback";
  updatedAtMs: number;
  data: Record<string, unknown>;
}
```

Store full elements separately from `entries`.

Key:

```text
lower(normalized componentPath) + "\0" + lower(name) + "\0" + lower(scope || "")
```

Reason:

- Same name can appear with different scope in some ASCET contexts.
- Provider resolution specifically needs `scope=Exported`.
- Consumer local dependency refresh specifically needs `scope=Local`.

Required exported functions:

```ts
export function getAscetFullElement(params: {
  componentPath: string;
  name: string;
  scope?: string;
}): AscetFullElementCacheEntry | undefined;

export function queryAscetFullElements(params: {
  componentPath?: string;
  name: string;
  scope?: string;
}): AscetFullElementCacheEntry[];

export function upsertAscetFullElements(entries: readonly AscetFullElementCacheEntry[]): void;

export function upsertAscetElementDeclarations(entries: readonly AscetSearchIndexEntry[]): void;
```

Rules:

- Upsert only replaces matching key records.
- Upsert rebuilds `byExactName` and `counts`.
- Upsert must preserve other ready partitions.
- If the global index is not `ready`, create a minimal ready state only if database metadata is available; otherwise keep the full cache local and mark declaration upsert skipped.
- Do not mark `text_code` ready from element writeback.

### 5.3 Targeted Index Writeback Helper

Add:

- `packages/ascet-extension/src/element-index-writeback.ts`
- `packages/ascet-extension/src/element-index-writeback.test.ts`

Main API:

```ts
export async function refreshElementsFromLiveCatalog(params: {
  componentPath: string;
  names?: readonly string[];
  scopes?: readonly string[];
  reason: string;
}, options: RunAscetReadElementCatalogOptions): Promise<AscetElementIndexWritebackResult>;
```

Behavior:

1. Run live `read_element_catalog(componentPath)`.
2. Extract catalog elements.
3. If `names` is provided, select exact-name elements.
4. If `scopes` is provided, filter by scope.
5. Convert selected catalog items to:
   - declaration entries for `element_decls`
   - full cache entries for `full_element_cache`
6. Upsert both.
7. Return compact writeback summary:

```ts
{
  updated: ["element_decls", "full_element_cache"],
  stale: ["text_code"],
  elements: [
    { component: "...", name: "...", kind: "...", type: "...", scope: "...", path: "..." }
  ]
}
```

Do not synthesize full element data from write input. Always read back live state after an executed write.

### 5.4 `read_dependent_chain` Index-First Provider Resolver

Update:

- `packages/ascet-extension/src/read-dependent-chain.ts`
- `packages/ascet-extension/src/tools/read/schema.ts`
- `packages/ascet-extension/src/tools/read/definition.ts`

New params:

```ts
export interface AscetReadDependentChainParams {
  componentPath: string;
  dependentElement: string;
  exporterComponentPath?: string;
  providerScopePath?: string;
  maxCandidates?: number;
  detailLevel?: "summary" | "full";
  fallback?: "none" | "legacy_live";
}
```

Defaults:

- `detailLevel: "full"`
- `fallback: "legacy_live"` during migration

Index-first flow:

1. Normalize `componentPath`.
2. Ensure `element_decls` partition is ready:
   - If ready, query memory.
   - If empty/stale, call existing warm path for `element_decls`.
3. Read current local dependency state/formula:
   - Prefer `read_element_dependency(componentPath, dependentElement)` for dependency flag/formula.
   - If formula references cannot be recovered from `read_element_dependency`, fall back to legacy live `read_dependent_chain` only for formula/mapping extraction.
4. Determine imported parameter names:
   - If mappings are present, use mapping imported names.
   - Otherwise parse formula identifiers.
   - Filter against consumer component `element_decls` where `scope=Imported`.
   - If no imported parameter is found, use a diagnostic issue and avoid guessing.
5. Resolve provider candidates:
   - For each imported parameter name, search `element_decls` exact name.
   - Keep only `scope=Exported`.
   - If `exporterComponentPath` is present, keep only that component.
   - If `providerScopePath` is present, keep only components under that scope.
6. If exactly one exported provider remains, retrieve full element:
   - Check `full_element_cache`.
   - On cache miss, run `read_element_catalog(provider.component)` and upsert result.
7. Return compact chain JSON.
8. If provider discovery fails and `fallback="legacy_live"`, call legacy CLI and include its structured result as recovery evidence, but do not let it replace full element data unless a provider is resolved.

Important semantic rule:

- `read_dependent_chain` resolves provider evidence.
- It does not create imported parameters, exported parameters, local parameters, or dependency relationships.

### 5.5 `set_element_dependency` Writeback

Update:

- `packages/ascet-extension/src/tools/write.ts`
- `packages/ascet-extension/src/write-common.ts`
- `packages/ascet-extension/src/set-element-dependency.ts` only if argument/result formatting needs minor normalization

New success flow in `runAscetWrite`:

```ts
const raw = await dispatchWrite(normalizedParams, options, ctx);
if (!raw.ok) return asResponse(outcomeFromCliResult(raw), raw);

const impact = createWriteImpact(normalizedParams);
const indexUpdate = await applySuccessfulWriteIndexUpdate(normalizedParams, raw, options, impact);
return asResponse(createSuccessfulWriteOutcome(raw, impact, indexUpdate), raw, impact);
```

For `set_element_dependency`:

1. If `dryRun=true`, do not refresh index.
2. If write did not change anything but readback succeeded, still refresh full target element because this confirms current live state.
3. Run `read_element_catalog(targetPath)`.
4. Select exact `elementName`.
5. Prefer `scope=Local` when multiple elements match.
6. Upsert selected element into declaration index and full element cache.
7. Mark `text_code` stale.
8. If readback indexing fails, mark `element_decls` and `text_code` stale and return an `index.issues[]` entry; do not turn the successful write into a failure.

### 5.6 `apply_element_spec` Writeback

Update `runAscetWrite` success handling for `apply_element_spec`.

Reason:

- New local/imported/exported parameters are created through `apply_element_spec`, not through `set_element_dependency`.
- User requirement: after writing, immediately add the new element and its content into memory index.

Behavior:

1. Parse `specFile` JSON after successful write to collect element names and expected scopes.
2. Run `read_element_catalog(componentPath)` once.
3. Select matching names from live catalog.
4. Upsert declaration entries and full cache entries.
5. If parsing `specFile` fails, fall back to refreshing all catalog elements for the component.
6. Mark `text_code` stale only if the spec can affect generated code.

### 5.7 New Dependent Local/Imported/Exported Flow

When creating a new dependent local parameter:

1. Resolve provider:

```json
{
  "action": "read_dependent_chain",
  "componentPath": "FeatureA/Consumer",
  "dependentElement": "K"
}
```

or search exported provider directly if the local parameter does not exist yet.

2. Create or update local parameter with `apply_element_spec`.
3. Create or update imported parameter with `apply_element_spec`.
4. Do not create the exported provider in the consumer component.
5. Call `set_element_dependency` only after the local parameter exists.
6. `set_element_dependency` writeback refreshes the local parameter entry and full local element data.
7. Provider full data remains cached from provider readback.

If the local parameter does not exist:

- `read_dependent_chain` can return provider candidates only if an imported name or provider name is supplied by formula/mapping/user evidence.
- `set_element_dependency` must fail with a recoverable error because it cannot create the local parameter.

If the imported parameter does not exist:

- `set_element_dependency` should not create it.
- The write may fail or formula mapping verification may fail.
- Recovery guidance must say: create the imported parameter with `apply_element_spec`, then retry `set_element_dependency`.

If the exported provider does not exist:

- Do not silently create it unless the user explicitly asked to create provider data.
- Return provider-not-found with a scoped search recovery path.

## 6. Prompt Optimization

### 6.1 Compact Initial Descriptors

Update:

- `packages/ascet-extension/src/tools/actions/descriptors.ts`
- `packages/ascet-extension/src/tools/actions/compact-prompt.ts`
- `packages/ascet-extension/src/tools/instructions/ascet-read.ts`
- `packages/ascet-extension/src/tools/instructions/ascet-write.ts`

Initial compact descriptors should include:

```text
ascet_read.read_dependent_chain - Index-first dependency provider resolver. Use for Local Parameter -> Imported Parameter -> Exported Parameter evidence; returns exported provider path and full provider element data.
miniFewShot: ascet_read({action:"read_dependent_chain",componentPath:"F/Consumer",dependentElement:"K"})
```

```text
ascet_write.set_element_dependency - Set dependency flag/formula on an existing local parameter only; does not create local/imported/exported elements; successful writes refresh element_decls/full element cache.
miniFewShot: ascet_edit({action:"set_element_dependency",targetPath:"F/Consumer",elementName:"K",dependency:"dependent",intent:"apply"})
```

### 6.2 Full Action Prompt After `search_actions`

`ascet_capabilities.search_actions` should return full rules/few-shots.

For `read_dependent_chain`, full rules:

- Use this before writing a dependent parameter when provider evidence matters.
- Provider discovery is index-first; `scope=Exported` is required.
- The Imported Parameter and Exported Parameter have the same name.
- The Local Dependent Parameter may have a different name; use formula/mapping references to find imported names.
- Returned full `element.data` is live `read_element_catalog` data.
- If provider is ambiguous, pass `exporterComponentPath` or `providerScopePath`.
- Do not use this as proof that a write happened; use readback after writes.

Full few-shot:

```json
{
  "action": "read_dependent_chain",
  "componentPath": "FeatureA/Consumer",
  "dependentElement": "P_Feature_K",
  "providerScopePath": "FeatureA"
}
```

For `set_element_dependency`, full rules:

- Use only after target local parameter exists.
- Use `apply_element_spec` first for new local/imported parameters.
- Referenced imported parameters must exist in the consumer component.
- `dependencyFormula` is stored on the local dependent parameter; it is not implementation formula.
- `dependencyFormula` requires `dependency="dependent"`.
- Successful executed writes perform live catalog readback and upsert index/cache.
- If index refresh fails, the write can still be successful; follow `index.issues`.

Full few-shot:

```json
{
  "action": "set_element_dependency",
  "targetPath": "FeatureA/Consumer",
  "elementName": "P_Feature_K",
  "dependency": "dependent",
  "dependencyFormula": "K_Exported",
  "dependencyMappings": {
    "K_Exported": "K_Exported"
  },
  "intent": "apply"
}
```

### 6.3 Tool Selection Guidance

Keep these distinctions in prompt:

| Need | Tool/action |
|---|---|
| Find exported provider and full provider element data | `ascet_read.read_dependent_chain` |
| Read only dependency flag/formula for one element | `ascet_read.read_element_dependency` |
| Create/update local/imported/exported element specs | `ascet_write.apply_element_spec` |
| Set local parameter dependency state/formula | `ascet_write.set_element_dependency` |
| Search arbitrary element declarations | `ascet_search.search_elements` |
| Search code text occurrences | `ascet_search.search_text_code` |
| Read complete live method/code body | `ascet_read.read_code` |

## 7. Development Tasks

### Task 1: Add Internal `read_element_catalog` Wrapper

**Files:**

- Create: `packages/ascet-extension/src/read-element-catalog.ts`
- Create: `packages/ascet-extension/src/read-element-catalog.test.ts`

**Step 1: Write failing tests**

Test:

- `buildReadElementCatalogArgs({componentPath:"A/B"})` returns `["exec","read_element_catalog","A\\B","--json"]`.
- `findCatalogElement` selects exact name and `scope=Exported`.
- `findCatalogElement` returns ambiguity metadata when two same-name elements match without scope.

**Step 2: Implement wrapper**

Implement:

- Params interface.
- TypeBox schema only if exposed later.
- `runAscetReadElementCatalog`.
- `formatReadElementCatalogResult`.
- Catalog extraction helpers.

**Step 3: Run focused tests**

Run:

```powershell
npx tsx --test packages/ascet-extension/src/read-element-catalog.test.ts
```

Expected:

- All new tests pass.

### Task 2: Add Full Element Cache and Declaration Upsert APIs

**Files:**

- Modify: `packages/ascet-extension/src/search-index-store.ts`
- Modify: `packages/ascet-extension/src/search-index.test.ts`

**Step 1: Write failing tests**

Test:

- `upsertAscetFullElements` stores and replaces one full element.
- `getAscetFullElement` finds by component/name/scope.
- `upsertAscetElementDeclarations` updates an existing element declaration without dropping unrelated entries.
- `byExactName` and `counts.entries` update after declaration upsert.
- `resetAscetSearchIndexForTest` clears full element cache.

**Step 2: Implement full cache**

Add:

- `AscetFullElementCacheEntry`.
- Internal map or array plus key builder.
- Query/get/upsert functions.

**Step 3: Implement declaration upsert**

Add:

- Stable key for `AscetSearchIndexEntry`.
- Recompute `byExactName` and `counts`.
- Preserve ready state metadata.

**Step 4: Run focused tests**

Run:

```powershell
npx tsx --test packages/ascet-extension/src/search-index.test.ts
```

Expected:

- Existing and new search index tests pass.

### Task 3: Add Targeted Element Index Writeback Helper

**Files:**

- Create: `packages/ascet-extension/src/element-index-writeback.ts`
- Create: `packages/ascet-extension/src/element-index-writeback.test.ts`

**Step 1: Write failing tests**

Test:

- On live catalog success, helper upserts declaration and full cache.
- `names` filters exact target elements.
- `scopes:["Exported"]` filters provider data.
- Catalog read failure returns `indexReadbackFailed` and does not throw for write-success callers.
- Output paths use `/`.

**Step 2: Implement helper**

Use `read-element-catalog.ts`.

Return:

```ts
interface AscetElementIndexWritebackResult {
  updated: Array<"element_decls" | "full_element_cache">;
  stale: AscetSearchIndexPartition[];
  elements: Array<{
    component: string;
    name: string;
    kind?: string;
    type?: string;
    scope?: string;
    path: string;
  }>;
  issues?: Array<{ code: string; message: string }>;
}
```

**Step 3: Run focused tests**

Run:

```powershell
npx tsx --test packages/ascet-extension/src/element-index-writeback.test.ts
```

Expected:

- All helper tests pass.

### Task 4: Update `set_element_dependency` Write Success Path

**Files:**

- Modify: `packages/ascet-extension/src/tools/write.ts`
- Modify: `packages/ascet-extension/src/write-common.ts`
- Modify: `packages/ascet-extension/src/tools-write.test.ts`

**Step 1: Write failing tests**

Test:

- Successful `set_element_dependency` calls element index writeback with target component and element name.
- `dryRun=true` does not refresh full element cache.
- If writeback succeeds, result includes `index.updated=["element_decls","full_element_cache"]` and `index.stale=["text_code"]`.
- If writeback fails, result includes `index.issues[]` and stale `element_decls/text_code`.
- Failed writes do not update cache.

**Step 2: Refactor write impact application**

Replace unconditional stale invalidation with an action-aware success handler:

```ts
async function applySuccessfulWriteIndexUpdate(
  params: AscetWriteParams,
  raw: AscetCliJsonResult,
  options: RunAscetWriteOperationOptions,
  impact: WriteImpact,
): Promise<AscetWriteIndexUpdate>
```

Rules:

- `set_element_dependency`: targeted live catalog readback.
- `apply_element_spec`: targeted live catalog readback.
- Existing actions: keep old stale invalidation.

**Step 3: Update result shaping**

Ensure success output is compact and does not include useless empty fields.

**Step 4: Run focused tests**

Run:

```powershell
npx tsx --test packages/ascet-extension/src/tools-write.test.ts
```

Expected:

- Existing write tests pass.
- New writeback tests pass.

### Task 5: Add `apply_element_spec` Writeback for New Elements

**Files:**

- Modify: `packages/ascet-extension/src/tools/write.ts`
- Modify: `packages/ascet-extension/src/tools-write.test.ts`

**Step 1: Write failing tests**

Test:

- Successful `apply_element_spec` parses `specFile` and refreshes matching element names.
- New local parameter appears in declaration index and full cache.
- New imported parameter appears in declaration index and full cache.
- New exported parameter appears in declaration index and full cache.
- If spec parsing fails, helper refreshes all component catalog elements and reports a warning/issue.

**Step 2: Implement spec name extraction**

Add a small helper:

```ts
function extractElementNamesFromSpecFile(specFile: string): Array<{ name: string; scope?: string }>;
```

Keep it tolerant:

- Read JSON object.
- Look for `elements[]`.
- Accept `name`, `scope`.
- Return empty list on unsupported shape and let caller refresh all catalog elements.

**Step 3: Run focused tests**

Run:

```powershell
npx tsx --test packages/ascet-extension/src/tools-write.test.ts
```

Expected:

- All write tests pass.

### Task 6: Rework `read_dependent_chain` to Index-First

**Files:**

- Modify: `packages/ascet-extension/src/read-dependent-chain.ts`
- Modify: `packages/ascet-extension/src/tools/read/schema.ts`
- Modify: `packages/ascet-extension/src/tools/read/definition.ts`
- Create or modify: `packages/ascet-extension/src/read-dependent-chain.test.ts`

**Step 1: Write failing tests**

Test:

- With ready `element_decls` and full cache hit, `read_dependent_chain` does not call legacy live chain.
- With ready `element_decls` and full cache miss, it calls `read_element_catalog` for provider component and upserts cache.
- It filters provider candidates to `scope=Exported`.
- It respects `exporterComponentPath`.
- It respects `providerScopePath`.
- It returns ambiguity with candidate `items[]` when more than one exported provider matches.
- It returns provider-not-found with `total:0, items:[]`.
- It falls back to legacy live only when configured and needed.

**Step 2: Implement formula/imported resolution**

Use:

- `read_element_dependency` or legacy chain result for local dependency/formula.
- Formula identifier extraction for references when explicit mappings are not available.
- Consumer component declaration index to validate `scope=Imported`.

**Step 3: Implement provider resolution**

Use:

- `queryAscetSearchIndex` or exact-name map helper.
- Filters for `scope=Exported`, `exporterComponentPath`, `providerScopePath`.
- `maxCandidates` as a guardrail.

**Step 4: Implement full provider element data**

Use:

- `getAscetFullElement`.
- `refreshElementsFromLiveCatalog` on cache miss.

**Step 5: Run focused tests**

Run:

```powershell
npx tsx --test packages/ascet-extension/src/read-dependent-chain.test.ts
```

Expected:

- New tests pass.

### Task 7: Update Action Descriptors and Prompt Instructions

**Files:**

- Modify: `packages/ascet-extension/src/tools/actions/descriptors.ts`
- Modify: `packages/ascet-extension/src/tools/instructions/ascet-read.ts`
- Modify: `packages/ascet-extension/src/tools/instructions/ascet-write.ts`
- Modify: `packages/ascet-extension/src/tools/read/prompt.ts`
- Modify: `packages/ascet-extension/src/tools/prompt.test.ts`
- Modify: `packages/ascet-extension/src/tools/actions/catalog.test.ts`
- Modify: `packages/ascet-extension/src/tools/actions/compact-prompt.test.ts`

**Step 1: Write failing prompt tests**

Test:

- Compact prompt mentions index-first `read_dependent_chain`.
- Compact prompt says `set_element_dependency` does not create local/imported/exported elements.
- `search_actions("dependent parameter")` returns full schema/rules/fewShots for both actions.
- Few-shot for `set_element_dependency` includes `intent:"apply"` only in full/action-level details, not necessarily in minimal compact prompt.

**Step 2: Update descriptors**

Keep initial prompt compact.

Put detailed workflow rules behind `search_actions`.

**Step 3: Run focused tests**

Run:

```powershell
npx tsx --test packages/ascet-extension/src/tools/prompt.test.ts packages/ascet-extension/src/tools/actions/catalog.test.ts packages/ascet-extension/src/tools/actions/compact-prompt.test.ts
```

Expected:

- Prompt tests pass.

### Task 8: Agent-Friendly JSON Normalization

**Files:**

- Modify: `packages/ascet-extension/src/tool-response-contract.ts` if needed.
- Modify: `packages/ascet-extension/src/tools/read/definition.ts`
- Modify: `packages/ascet-extension/src/tools/write.ts`
- Add tests near the changed tool tests.

**Step 1: Write failing JSON contract tests**

Test successful responses do not include:

- `ok`
- `error:null`
- `meta.mode`
- echoed raw request fields
- empty arrays except required empty result `{ total: 0, items: [] }`
- `\\` paths

**Step 2: Add action-specific mappers**

Do not globally mutate all CLI output in a risky way.

Add explicit mappers:

- `toReadDependentChainPayload`
- `toSetElementDependencyPayload`
- `toElementIndexWritebackPayload`

**Step 3: Run focused tests**

Run:

```powershell
npx tsx --test packages/ascet-extension/src/read-dependent-chain.test.ts packages/ascet-extension/src/tools-write.test.ts
```

Expected:

- JSON contract tests pass.

### Task 9: Final Typecheck and Formatter

**Files:**

- All modified TypeScript files.

**Step 1: Run Biome**

Run:

```powershell
npx biome check --write packages/ascet-extension/src
```

Expected:

- No remaining errors.

**Step 2: Run TypeScript**

Run:

```powershell
npx tsgo --noEmit
```

Expected:

- Typecheck passes.

**Step 3: Run focused ASCET extension tests**

Run:

```powershell
npx tsx --test packages/ascet-extension/src/**/*.test.ts
```

Expected:

- All `ascet-extension` tests pass.

Do not run full repo `npm test`.

## 8. Live ASCET Verification Plan

Run only after unit tests pass and ASCET is available.

### 8.1 Status Startup

Call:

```json
{
  "action": "status"
}
```

Expected:

- Host/current DB connects.
- Components partition is ready.
- Full element index is not built by status.

### 8.2 Index Provider Read

Call:

```json
{
  "action": "read_dependent_chain",
  "componentPath": "PlatformLibrary/Package/AEB_AutomaticEmergencyBrake/Private/AEB_Core/AEB_pDriverIBooster",
  "dependentElement": "P_AEB_IB_MaxVelocityDrop_Curve"
}
```

Expected:

- `element_decls` is warmed if needed.
- Provider is found by `scope=Exported`.
- Full provider element comes from live `read_element_catalog`.
- Returned paths use `/`.
- No UI window scraping.

### 8.3 Writeback Refresh

Call `set_element_dependency` on a safe test component with `intent="apply"`; runtime readback verification is mandatory.

Expected:

- Write succeeds.
- Live catalog readback runs immediately after write.
- Changed local element appears in full cache.
- `element_decls` remains usable.
- `text_code` is stale.

### 8.4 New Element Flow

Call `apply_element_spec` on a safe test component to create:

- One local parameter.
- One imported parameter.

Then call `set_element_dependency`.

Expected:

- `apply_element_spec` upserts new elements into declaration/full cache.
- `set_element_dependency` updates local dependency and refreshes local full element.
- `read_dependent_chain` can resolve provider without rescanning full model if `element_decls` is ready.

## 9. Acceptance Criteria

The implementation is complete when:

- `ascet_status` still performs only connect plus components warmup.
- `read_dependent_chain` resolves exported provider candidates from `element_decls` before using legacy live fallback.
- `read_dependent_chain` returns full provider element catalog data.
- `set_element_dependency` writes update the target element declaration and full element cache immediately after successful live readback.
- `apply_element_spec` writes update new/changed element declarations and full element cache immediately after successful live readback.
- `set_element_dependency` still does not create local/imported/exported parameters.
- UI-side changes are not polled; stale-session recovery is explicit through search/read refresh behavior.
- Successful JSON results are result-only and camelCase.
- Failed JSON results return structured `error`.
- Prompt descriptors teach the model the correct action boundary.
- Focused tests, formatter, and typecheck pass.

## 10. Suggested Goal Order

Use separate goals to avoid scope drift.

### Goal 1: Catalog Wrapper and Full Element Cache

Implement Tasks 1 and 2.

Stop when:

- `read-element-catalog.test.ts` passes.
- `search-index.test.ts` passes.

### Goal 2: Writeback Helper and Write Tool Integration

Implement Tasks 3, 4, and 5.

Stop when:

- `element-index-writeback.test.ts` passes.
- `tools-write.test.ts` passes.

### Goal 3: Index-First `read_dependent_chain`

Implement Task 6.

Stop when:

- `read-dependent-chain.test.ts` passes.
- Existing read tests still pass.

### Goal 4: Prompt and JSON Contract Polish

Implement Tasks 7 and 8.

Stop when:

- Prompt tests pass.
- JSON contract tests pass.

### Goal 5: Final Verification

Implement Task 9 and, if ASCET is available, Task 8 live checks.

Stop when:

- Biome passes.
- `npx tsgo --noEmit` passes.
- `npx tsx --test packages/ascet-extension/src/**/*.test.ts` passes.
- Live verification notes are recorded in the final response.

## 11. Risk Notes

- `read_element_catalog` is currently marked `hostEligible=false` and `force_one_shot` in its contract. Treat it as serial live read. Do not parallelize catalog readbacks.
- `set_element_dependency` write success and index refresh are separate concerns. If refresh fails, preserve the successful write result and return index recovery information.
- The full element cache is in-memory only. It must not be treated as durable truth across extension restarts.
- External ASCET UI edits can make memory stale during the same session. This plan does not add polling; explicit search/read refresh remains the recovery path.
- Do not expose broad new public actions unless tests show the model cannot complete the workflow through the existing two public tools.
