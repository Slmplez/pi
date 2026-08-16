# ASCET Search/Get Tools Final Development Specification

- Version: 2.0
- Date: 2026-08-15
- Status: Approved design
- Scope: `ascet_search`, `ascet_get`, registration, output contract, packaging, and validation

## 1. Goal

Provide two small discovery tools:

```text
ascet_search
    Run a new native ASCET Search UI query.

ascet_get
    Read hierarchy or Project formulas from an exact scope.
```

Discovery flow:

```text
ascet_search -> exact path -> ascet_get / ascet_read
```

Dependency-chain behavior is specified separately in:

```text
2026-08-15-ascet-dependent-chain-final-spec.md
```

## 2. Public interfaces

### 2.1 `ascet_search`

Request:

```json
{"mode":"element","q":"PCA_Ctrl_slMin_RA","limit":20}
```

Schema:

```ts
type AscetSearchParams = {
	mode:
		| "comp"
		| "comp-ref"
		| "method"
		| "method-ref"
		| "method-element"
		| "element"
		| "element-ref"
		| "sender"
		| "receiver"
		| "text";
	q: string;
	limit?: number;
};
```

Rules:

- `q`: 1 through 512 characters.
- `limit`: default 20, range 1 through 100.
- Every call runs a new native ASCET Search.
- Default lifecycle is open, execute, read, hide, and close.
- Concurrent submissions are accepted; native Search execution is serialized.
- Do not expose PID, timeout, window handles, Mutex, or `keepUi` to the Agent.

Agent-visible result:

```json
{
  "count": 1,
  "items": [
    "PCA_Ctrl_slMin_RA::1D[cont->cont] - _PCA (PlatformLibrary\\Package\\AntiLockController\\Parameter\\private\\SMC\\Regler)"
  ]
}
```

Only these fields are public:

```text
count
items
more
error
```

Search results are live hints. They are not complete metadata and must not be used directly as edit targets.

### 2.2 `ascet_get.tree`

Request:

```json
{"action":"tree","path":"PlatformLibrary\\Package","depth":2}
```

Schema:

```ts
type AscetGetTreeParams = {
	action: "tree";
	path?: string;
	depth?: number;
};
```

Rules:

- `path` omitted means database root.
- `depth` defaults to 1 and is limited to 1 through 5.
- Runtime owns folder/component budgets.
- Tree does not perform name search.
- Unbounded database recursion is forbidden.

Result:

```json
{
  "count": 2,
  "items": [
    {"path":"PlatformLibrary\\Package","kind":"folder"}
  ],
  "more": true
}
```

### 2.3 `ascet_get.formulas`

Request:

```json
{"action":"formulas","path":"DEMO\\Project","name":"VehicleMass"}
```

Schema:

```ts
type AscetGetFormulasParams = {
	action: "formulas";
	path: string;
	name?: string;
};
```

Rules:

- `path` is an exact Project path.
- `name` optionally filters one Formula.
- This action does not discover unknown Projects.
- Large Formula payloads may use automatic artifact delivery.

Result:

```json
{
  "count": 1,
  "items": [
    {"name":"VehicleMass","formula":"..."}
  ]
}
```

## 3. Live-only Search

`ascet_search` must not use or retain:

```text
Catalog
SQLite
custom database traversal
OCR
Observation Store
cache
resultId
artifact
warmup
background refresh
historical result reuse
```

Reuse the existing implementation:

```text
src/search.ts
    runAscetSearch()
    normalizeAscetSearchResult()

tools/search/definition.ts
    public tool adapter only
```

Do not create ten tool implementations or another Search service layer.

## 4. Content and details

Agent content contains business results only.

Tool `details` contains transient diagnostics only:

```text
source/database identity
coverage/truncation diagnostics
CLI path and exit code
Scheduler wait time
Search execution time
timeout and lifecycle data
```

Search items must not be copied into `details`, persisted, or reused by later calls.

## 5. Registration

Canonical domain tools:

```ts
export const canonicalDomainTools = [
	ascetSearchTool,
	ascetGetTool,
	ascetReadTool,
	ascetDiffTool,
	ascetEditTool,
] as const;
```

Separate filesystem and ASCET discovery tools:

```ts
const FILE_TOOLS = ["find", "grep", "read"] as const;
const ASCET_READ_TOOLS = ["ascet_search", "ascet_get", "ascet_read"] as const;
```

Array order is deterministic registration order, not an execution workflow.

Retire from public `ascet_get`:

```text
database_identity
database_catalog
elements
component_refs
bde_edges
import_binding
dbitem_refs
```

Keep old backends only until their callers are migrated. Do not add backward-compatible public schema branches.

## 6. Prompt

```text
Use ascet_search for live candidate discovery. Search results are hints, not complete metadata. Resolve an exact path before calling ascet_get or ascet_read. Read current state before editing.
```

No per-mode prompt duplication is required; the JSON Schema enum documents the ten Search modes.

## 7. Concurrency and lifecycle

Protection remains two-layered:

```text
Extension Scheduler
    resourceKey=ascet.toolapi.global

AscetSearch.exe
    ASCET PID-scoped named Mutex
```

The Scheduler accepts concurrent submissions. `AscetSearch.exe` serializes native UI work. No parallel native Search windows are allowed.

## 8. Packaging

Package assets:

```text
ascet-cli/bin/AscetBridge.exe
ascet-cli/bin/AscetSearch.exe
ascet-cli/bin/Ascetapidll/Etas.AscetNET.dll
```

Search executable resolution order:

```text
ASCET_SEARCH_PATH
ascet-cli/bin/AscetSearch.exe
ascetcli/output/ascet-search/AscetSearch.exe
```

## 9. Minimal implementation sequence

1. Simplify `ascet_get.tree` schema and content.
2. Simplify `ascet_get.formulas` schema and content.
3. Finalize the existing `runAscetSearch()` public adapter.
4. Remove old Get actions from schemas, descriptors, prompts, and profiles.
5. Update registration and packaged assets.
6. Run targeted tests, live validation, then `npm run check`.

Do not introduce repositories, provider classes, generic query planners, or a new persistence layer.

## 10. Tests

### Search

- Ten native modes.
- Empty query and invalid mode rejection.
- Limit validation.
- Empty and truncated results.
- Window cleanup.
- Sequential and concurrent submissions.
- No result retention or cross-request contamination.

### Get

- Root and exact Tree paths.
- Depth 1 through 5.
- Bounded truncation maps to `more`.
- Exact Project Formula read and optional name filter.
- Business content excludes coverage, source, database identity, and delivery diagnostics.

### Registration and package

- Canonical names and order.
- Retired actions are unavailable.
- Package contains two EXEs and one ToolAPI DLL.

## 11. Acceptance criteria

1. `ascet_search` exposes only `mode`, `q`, and `limit`.
2. Search is native, live-only, non-persistent, and closes its window.
3. `ascet_get` exposes only `tree` and `formulas`.
4. Agent content is concise and contains no repeated diagnostics.
5. Old Catalog/index/OCR/custom Search paths are not registered.
6. Concurrent requests do not execute native ASCET UI operations in parallel.
7. Targeted tests, live checks, package verification, and `npm run check` pass.