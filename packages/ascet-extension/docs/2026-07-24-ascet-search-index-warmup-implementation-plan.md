# ASCET quick-search index warmup implementation plan

## 1. Goal

Replace the current `ascet_status` live runtime probe with a real quick-search index warmup flow.

Current behavior:

```text
ascet_status
  -> createAscetRuntimeStatusReport()
  -> AscetCli.exe exec list_folders --depth 0 --json
```

Target behavior:

```text
ascet_status
  -> createAscetRuntimeStatusReport()
  -> ensureAscetSearchIndex()
  -> scheduler serial ASCET job
  -> AscetCli.exe exec warm_search_index --json
  -> ToolAPI scans current ASCET database
  -> extension builds an in-process quick-search index
  -> status reports runtime + index readiness
```

The user-facing search tool API should not change. Existing calls such as:

```ts
ascet_search({
  action: "search_elements",
  query: "P_AEB_IB_MaxVelocityDrop_Curve",
  match: "exact",
  limit: 20,
})
```

should become fast by checking the warmed index before falling back to the existing CLI path.

## 2. Non-goals

- Do not scrape ASCET UI windows such as `Browse Elements`.
- Do not depend on keyboard automation, screenshots, Win32 listbox reads, or Component Manager UI state.
- Do not make `ascet_status` itself a search API.
- Do not remove the current fallback through `AscetCli.exe exec search_elements`.
- Do not run live ASCET ToolAPI calls concurrently. The scheduler remains the serialization boundary.

## 3. Current code map

Relevant TypeScript entry points:

```text
src/status-runtime.ts
  createAscetRuntimeStatusReport()
  defaultRuntimeProbe()
  currently runs list_folders as the live ToolAPI probe

src/tools/status/definition.ts
  ascet_status tool definition
  calls createAscetRuntimeStatusReport()

src/search-elements.ts
  runAscetSearchElements()
  currently always delegates to runAscetCliJson(buildSearchElementsArgs(...))

src/tools/search.ts
  canonical ascet_search action router

src/cli.ts
  runAscetCliJson()
  executeScheduledAscetCli()
  scheduler + PI local CLI lock integration

src/scheduler/*
  single ASCET ToolAPI global resource queue
```

Relevant command contract:

```text
ascet-cli/contracts/commands/AscetSearchElements.json
  operation: search_elements
  lane: pooled_read
  hostEligible: true
  hostPolicy: prefer_host
```

The existing contract already says `search_elements` may prefer a host-backed path. The implementation should use that direction: warm the host/index once, then serve compatible `search_elements` queries from memory.

## 4. High-level architecture

```text
                         +----------------------+
                         | ascet_status          |
                         +----------+-----------+
                                    |
                                    v
                         +----------------------+
                         | ensureSearchIndex()   |
                         +----------+-----------+
                                    |
                                    v
                         +----------------------+
                         | ASCET scheduler       |
                         | ascet.toolapi.global  |
                         +----------+-----------+
                                    |
                                    v
                         +----------------------+
                         | warm_search_index CLI |
                         +----------+-----------+
                                    |
                                    v
                         +----------------------+
                         | C# ToolAPI scanner    |
                         +----------+-----------+
                                    |
                                    v
                         +----------------------+
                         | TS in-memory index    |
                         +----------+-----------+
                                    |
                  +-----------------+-----------------+
                  |                                   |
                  v                                   v
        +----------------------+          +----------------------+
        | ascet_search         |          | ascet_status report  |
        | search_elements      |          | index ready/failed   |
        +----------------------+          +----------------------+
```

## 5. Data model

Create `src/search-index.ts`.

Core index entry:

```ts
export type AscetSearchIndexGroup =
  | "components"
  | "elements"
  | "methods"
  | "method_process_elements"
  | "messages"
  | "text_code";

export interface AscetSearchIndexEntry {
  group: AscetSearchIndexGroup;
  name: string;
  componentPath: string;
  componentName?: string;
  componentKind?: string;
  componentLanguageKind?: string;
  elementKind?: string;
  displayType?: string;
  displayScope?: string;
  path: string;
  searchText: string;
}
```

Index state:

```ts
export type AscetSearchIndexState =
  | { state: "empty" }
  | { state: "building"; startedAt: number }
  | {
      state: "ready";
      builtAt: number;
      elapsedMs: number;
      databaseName: string;
      databasePath: string;
      entries: AscetSearchIndexEntry[];
      byExactName: Map<string, AscetSearchIndexEntry[]>;
      counts: Record<string, number>;
    }
  | {
      state: "failed";
      builtAt: number;
      error: { code: string; message: string };
    };
```

Warmup result:

```ts
export interface AscetSearchIndexWarmupResult {
  ok: boolean;
  commandId: "warm_search_index";
  databaseName?: string;
  databasePath?: string;
  elapsedMs?: number;
  counts?: Record<string, number>;
  entryCount?: number;
  error?: { code: string; message: string };
}
```

## 6. New backend command

Add a dedicated backend operation:

```text
AscetCli.exe exec warm_search_index --json
```

Recommended contract file:

```text
ascet-cli/contracts/commands/AscetWarmSearchIndex.json
```

Contract metadata:

```json
{
  "id": "AscetWarmSearchIndex",
  "operation": "warm_search_index",
  "lane": "pooled_read",
  "hostEligible": true,
  "host": {
    "hostSafety": "stable",
    "hostPolicy": "prefer_host"
  }
}
```

The command should be read-only. It only reads the current ASCET database and emits JSON.

## 7. C# ToolAPI scanner behavior

The scanner should connect to the current database through ToolAPI:

```text
Ascet ascet = new Ascet();
AscetDataBase db = ascet.GetCurrentDataBase();
```

Then scan all relevant component families:

```text
ClassESDL
CTBlockESDL
ModuleESDL
ClassBDE
CTBlockBDE
ModuleBDE
ClassC
CTBlockC
ModuleC
ConditionalTable
StateMachine
```

For each `DataBaseItem`:

```text
ComponentClassifier.ToItemRef(item)
  -> add group=components

item as CodeComponent
  -> GetAllModelElements()
       -> add group=elements
       -> add group=method_process_elements when IsMethodArgument/IsMethodReturn/IsMethodLocal
       -> add group=messages when IsMessage/IsSendMessage/IsReceiveMessage

  -> GetAllReferencedModelElements()
       -> add referenced candidates if needed by search_occurrences or references later

  -> GetAllDiagrams()
       -> collect DiscreteMethod, ContinuousMethod, Process, Action, Condition, Trigger
       -> add group=methods
       -> AbstractMethod.GetCode()
            -> add group=text_code

item as FunctionalComponent where language is C
  -> GetHeader()
  -> GetExternalCCode()
  -> add group=text_code
```

Expected JSON shape:

```json
{
  "ok": true,
  "databaseName": "AEB",
  "databasePath": "d:\\ETASData\\ASCET6.4\\Database\\",
  "elapsedMs": 20458,
  "counts": {
    "components": 120,
    "elements": 1851,
    "methods": 296,
    "methodProcessElements": 622,
    "messages": 128,
    "textCodeChars": 51587
  },
  "entryCount": 2500,
  "entries": [
    {
      "group": "elements",
      "name": "P_AEB_IB_MaxVelocityDrop_Curve",
      "componentPath": "AEB\\...",
      "componentKind": "Class",
      "componentLanguageKind": "ESDL",
      "elementKind": "PrimitiveModelElement",
      "displayType": "cont",
      "displayScope": "Exported",
      "path": "AEB\\...::P_AEB_IB_MaxVelocityDrop_Curve",
      "searchText": "AEB\\...\nP_AEB_IB_MaxVelocityDrop_Curve\ncont\nExported"
    }
  ],
  "failures": []
}
```

Important implementation detail: suppress ToolAPI banner/log lines on stdout in command mode, or `runAscetCliJson()` will fail JSON parsing. Only the final JSON should go to stdout; diagnostics should go to stderr or the JSON `failures` array.

## 8. TypeScript index manager

Implement `src/search-index.ts` with these exported functions:

```ts
export function getAscetSearchIndexState(): AscetSearchIndexState;

export function invalidateAscetSearchIndex(reason: string): void;

export async function ensureAscetSearchIndex(options: {
  cwd: string;
  env?: Record<string, string | undefined>;
  signal?: AbortSignal;
  timeoutMs?: number;
  executeCli?: (request: AscetCliRequest) => Promise<AscetCliExecutionResult>;
}): Promise<AscetSearchIndexWarmupResult>;

export function queryAscetSearchIndex(params: AscetSearchElementsParams): AscetCliJsonResult | undefined;
```

Warmup rules:

- If state is `ready` and not stale, return current metadata without rebuilding.
- If state is `building`, return or await the existing build promise. Do not start a second ToolAPI scan.
- If state is `empty`, `failed`, or stale, schedule one `warm_search_index` job.
- If warmup fails, store `state="failed"` and return `ok=false`.

Suggested staleness:

```text
default TTL: 10 minutes
env override: PI_ASCET_SEARCH_INDEX_TTL_MS
disable warmup: PI_ASCET_SEARCH_INDEX=0
force rebuild: PI_ASCET_SEARCH_INDEX_FORCE=1
```

## 9. Replace status probe

Update `src/status-runtime.ts`.

Current probe type:

```ts
export interface AscetRuntimeProbeReport {
  ok: boolean;
  commandId: "list_folders";
  description: string;
  ...
}
```

Change to:

```ts
export interface AscetRuntimeProbeReport {
  ok: boolean;
  commandId: "warm_search_index";
  description: string;
  index?: {
    databaseName?: string;
    databasePath?: string;
    elapsedMs?: number;
    entryCount?: number;
    counts?: Record<string, number>;
  };
  ...
}
```

Replace:

```ts
runAscetCliJson(["exec", "list_folders", "--depth", "0", "--json"], ...)
```

with:

```ts
ensureAscetSearchIndex({
  cwd: options.cwd,
  env: options.env,
  signal: options.signal,
  timeoutMs: options.timeoutMs ?? 60_000,
})
```

Update summary text:

```text
ASCET status: ready
ASCET installation: ready
ASCET runtime: ready
ASCET quick-search index: ready
  database: AEB
  entries: 2500
  components=120, elements=1851, methods=296, messages=128
  build: 20458 ms
```

Failure summary:

```text
ASCET status: not ready
ASCET installation: ready
ASCET runtime: not ready
ASCET quick-search index: failed
  warm_search_index failed: database_not_open
Next step: start ASCET GUI with ToolAPI enabled, open the target database, then rerun ascet_status.
```

## 10. Serve search_elements from the index

Update `src/search-elements.ts`.

Current behavior:

```ts
export async function runAscetSearchElements(params, options) {
  return runAscetCliJson(buildSearchElementsArgs(params), options);
}
```

Target behavior:

```ts
export async function runAscetSearchElements(params, options) {
  const indexed = queryAscetSearchIndex(params);
  if (indexed) {
    return indexed;
  }

  const warmup = await ensureAscetSearchIndex(options);
  if (warmup.ok) {
    const warmed = queryAscetSearchIndex(params);
    if (warmed) {
      return warmed;
    }
  }

  return runAscetCliJson(buildSearchElementsArgs(params), options);
}
```

Do not return index results for unsupported filters. Fall back to CLI instead.

Initial supported filters:

```text
query
match: exact | contains | glob
limit
cursor
group
componentPath
```

Optional later filters:

```text
scopePath
kind
displayScope
sender/receiver message direction
```

## 11. Query semantics

Normalize the query:

```ts
const normalized = query.trim().toLowerCase();
```

Exact:

```text
byExactName.get(normalized)
```

Contains:

```text
entry.searchText.toLowerCase().includes(normalized)
```

Glob:

```text
convert * and ? into a safe RegExp
match against entry.name and entry.path
```

Group filtering:

```text
params.group=all
  -> all index groups except text_code unless explicitly requested by text action later

params.group=primitive
  -> elements where elementKind/displayType identifies primitive

params.group=complex
  -> elements where elementKind/displayType identifies complex

params.group=referenced
  -> referenced entries if implemented
```

ASCET Component Manager quick-search UI mapping:

```text
Components
  -> group=components

Declarations of component
  -> group=components

References to component
  -> later: component reference index or fallback search_occurrences

Declarations of method/process
  -> group=methods

References to method/process
  -> later: parse method code/search_occurrences or fallback

Declarations of method/process element
  -> group=method_process_elements

Declarations of element
  -> group=elements

References to element
  -> later: element reference index or fallback read_element_refs/search_occurrences

Senders of message
  -> group=messages with direction=send, later refinement

Receivers of message
  -> group=messages with direction=receive, later refinement

Text in ESDL or C code
  -> group=text_code
```

Pagination:

- Keep the current cursor contract.
- Cursor can be an opaque base64url JSON token:

```json
{ "offset": 20, "query": "...", "match": "exact", "group": "all" }
```

- Validate cursor belongs to the same query/filter. If not, ignore or return a clear error.

Output should mimic current `search_elements` JSON as closely as possible:

```json
{
  "query": "P_AEB_IB_MaxVelocityDrop_Curve",
  "matches": [
    {
      "group": "elements",
      "componentPath": "...",
      "componentKind": "class",
      "componentLanguageKind": "ESDL",
      "elementName": "P_AEB_IB_MaxVelocityDrop_Curve",
      "elementKind": "...",
      "displayType": "cont",
      "displayScope": "Exported",
      "path": "...::P_AEB_IB_MaxVelocityDrop_Curve"
    }
  ],
  "counts": {
    "matches": 2
  },
  "nextCursor": null,
  "source": "quick_search_index"
}
```

## 12. Invalidation

Invalidate the index after any successful write-like operation:

```text
apply_element_spec
apply_project_formula
set_method_code
set_method_signature
set_module_code
set_state_machine_code
create_component
delete_component
create_method
delete_method
batch_* write operations
```

Implementation options:

1. Narrow first version:
   - Invalidate in each write wrapper after `result.ok === true`.

2. Better later version:
   - Centralize invalidation in `runAscetCliJson()` based on inferred command kind.
   - If `jobKind === "write"` and execution succeeded, call `invalidateAscetSearchIndex("write_succeeded")`.

Do not invalidate on failed writes.

## 13. Startup policy

Recommended behavior:

```text
ascet_status:
  always calls ensureAscetSearchIndex unless PI_ASCET_SEARCH_INDEX=0

ascet_search search_elements:
  if index ready -> query immediately
  if index empty -> warm once, then query
  if index failed/timeout -> fallback to CLI search_elements

extension activation:
  optional background warmup only
  should not block activation or UI
```

Default timeout:

```text
status warmup timeout: 60s
search-triggered warmup timeout: 60s
fallback search_elements timeout: existing 60s
```

For very large databases, add an environment cap:

```text
PI_ASCET_SEARCH_INDEX_MAX_ENTRIES
PI_ASCET_SEARCH_INDEX_MAX_TEXT_CHARS
```

If cap is hit:

```text
state=ready
partial=true
fallback required for unsupported/overflow search
```

## 14. Error handling

Expected error classes:

```text
ascet_installation_not_ready
  CLI executable or contracts missing

database_not_open
  ASCET is reachable, but no database is open

tool_connect_failed
  ASCET GUI/ToolAPI unavailable

ascet_scheduler_queue_timeout
  queued behind another long ASCET operation

ascet_scheduler_exec_timeout
  ToolAPI scan exceeded timeout

ascet_cli_lock_timeout
  PI local CLI lock is held/stale

index_parse_failed
  warm_search_index returned invalid JSON shape
```

Status output should distinguish:

```text
installationOk
runtimeOk
indexOk
```

`runtimeOk` should mean the warmup command reached ToolAPI and produced a valid result. If installation is OK but warmup fails due to ToolAPI/database, status is not ready.

## 15. Tests

Add tests near existing package tests.

### status-runtime tests

Test file suggestion:

```text
src/status-runtime.test.ts
```

Cases:

```text
createAscetRuntimeStatusReport calls warm_search_index instead of list_folders
warmup success -> ok=true, runtimeOk=true, index info appears in summary
warmup failure -> ok=false, runtimeOk=false, error code appears in summary
installation missing -> warmup skipped
```

### search-index tests

Test file suggestion:

```text
src/search-index.test.ts
```

Cases:

```text
builds byExactName map
exact match returns only exact entries
contains match uses searchText
glob match supports * and ?
group filter works
componentPath filter works
limit/cursor returns deterministic pages
building state reuses one in-flight promise
failed state can be retried after TTL or force flag
```

### search-elements tests

Test file suggestion:

```text
src/search-elements.test.ts
```

Cases:

```text
ready index -> does not call executeCli
empty index -> calls warmup once, then returns indexed result
warmup failure -> falls back to existing CLI args
unsupported filter -> falls back to CLI
```

### scheduler behavior tests

Use existing scheduler test patterns:

```text
warm_search_index is submitted as kind=read
queueTimeoutMs is bounded
one in-flight warmup is shared across concurrent callers
```

### live smoke

Manual live smoke with ASCET GUI open and database loaded:

```text
1. run ascet_status
2. verify summary says quick-search index ready
3. run ascet_search search_elements exact P_AEB_IB_MaxVelocityDrop_Curve
4. verify source=quick_search_index
5. run same search again
6. verify no new ToolAPI process/job is needed
```

Expected AEB-scale baseline from prior live probing:

```text
first warmup: about 20s
components: about 120
elements: about 1850
methods: about 296
subsequent exact search: milliseconds
```

## 16. Rollout phases

### Phase 1: warmup command and status reporting

Deliverables:

```text
AscetCli.exe exec warm_search_index --json
src/search-index.ts with ensureAscetSearchIndex()
src/status-runtime.ts uses warmup instead of list_folders
status summary reports index metadata
tests for status success/failure
```

Acceptance:

```text
ascet_status proves ToolAPI/database reachability through real model scan
no search behavior changes yet
```

### Phase 2: indexed search_elements fast path

Deliverables:

```text
queryAscetSearchIndex()
src/search-elements.ts fast path before CLI fallback
exact/contains/glob/group/limit/cursor support
tests for index hit and fallback
```

Acceptance:

```text
P_AEB_IB_MaxVelocityDrop_Curve exact search returns from index
fallback still works when index unavailable
```

### Phase 3: invalidation and write integration

Deliverables:

```text
invalidateAscetSearchIndex()
write-success invalidation
status shows stale/empty/ready/failed state
tests for invalidation after write success
```

Acceptance:

```text
after a successful model write, next search rebuilds or falls back safely
```

### Phase 4: richer quick-search parity

Deliverables:

```text
message sender/receiver direction
element references
method/process references
component references
text_code snippets with component/method location
optional persistent cache keyed by database path + fingerprint
```

Acceptance:

```text
ASCET Component Manager quick-search dropdown items are covered by API-backed data or explicit fallback
```

## 17. Main risks

### Large JSON payload

Full `entries` can become large. Mitigations:

```text
omit full method code from returned entries if too large
store text_code search text in memory only if warmup runs in host process
cap max text chars
persist large payload to temp artifact if necessary
```

### ToolAPI stdout pollution

Some ASCET ToolAPI calls print log/banner lines. Mitigation:

```text
in C# command mode, suppress Console.Out during ToolAPI initialization
write only final JSON to stdout
write diagnostics to stderr or JSON failures
```

### Stale index after writes

Mitigation:

```text
invalidate on successful write command
TTL fallback
database identity check on each warmup/status
```

### API gaps for sender/receiver and references

Mitigation:

```text
ship declarations first
return fallback_required for unsupported reference/message refinements
use existing search_occurrences/read_element_refs as fallback
```

### Blocking status for too long

Mitigation:

```text
timeout at 60s
show index=building or failed
allow PI_ASCET_SEARCH_INDEX=0
background warmup later
```

## 18. Recommended first patch set

Patch order:

```text
1. Add C# warm_search_index command and contract.
2. Add src/search-index.ts with state machine, warmup, and JSON validation.
3. Change src/status-runtime.ts probe from list_folders to ensureAscetSearchIndex.
4. Add status tests.
5. Add queryAscetSearchIndex exact/contains/glob implementation.
6. Change src/search-elements.ts to query index before CLI fallback.
7. Add search-index and search-elements tests.
8. Add write-success invalidation.
9. Run package-specific tests.
10. Run live ASCET smoke.
```

Commands after code changes:

```bash
npm run check
```

For targeted tests, use package-specific vitest commands rather than the full e2e suite.

## 19. Definition of done

The feature is done when:

```text
ascet_status no longer uses list_folders as its runtime proof
ascet_status reports quick-search index ready/failed with database metadata
search_elements exact query can return from the warmed index
fallback to existing CLI search still works
write success invalidates the index
tests cover warmup, query, fallback, and invalidation
live smoke confirms first build is seconds-level and later exact search is millisecond-level
```
