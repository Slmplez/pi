# ASCET Index-Based Tooling Redesign Development Plan

## 1. Goal

Redesign the `ascet-extension` ASCET tools around a unified, partitioned index store and a clearer tool responsibility model.

The main objective is not just faster search. The objective is to make ASCET tools easier for an agent to use:

- `ascet_status` verifies the live ASCET host/current database and builds only the `components` index partition.
- `ascet_search` exposes ASCET quick-search-like actions for declarations, references, messages, and text search.
- `ascet_explore` provides navigation and structure previews.
- `ascet_read` performs live reads of exact targets only.
- `ascet_write` performs single-operation writes, targeted readback, and index impact updates.
- `ascet_batch_write` is hidden for now, but its source code remains available.
- All tool responses use compact, stable, agent-friendly JSON.

## 2. Hard Guardrails

These rules are non-negotiable for this redesign:

- Do not read ASCET UI windows or Win32 controls.
- Do not use polling to detect ASCET UI-side edits.
- Do not make `ascet_status` build a full index.
- Do not expose `search_occurrences`.
- Do not let `read_code` use the `text_code` index.
- Do not let `ascet_read` return component summary.
- Do not expose `ascet_batch_write`.
- Do not run live ASCET ToolAPI scans concurrently.
- Do not trust TTL/fresh cache across extension startup.
- Do not replace live write preconditions with index-only checks.
- Do not change unrelated UI or tool behavior while implementing this plan.

## 3. Agent-Friendly JSON Contract

All ASCET tool results must prioritize agent decision-making:

- Minimal tokens.
- Stable fields.
- Clear recovery paths.
- No ambiguous success/failure envelopes.
- Pagination and continuation where needed.
- No repeated context on every item.
- No large text payload by default.

### 3.1 Successful Responses

Successful tool responses return the business result directly.

Do not return:

```json
{
  "ok": true,
  "error": null,
  "meta": {
    "mode": "index",
    "operation": "search_components"
  }
}
```

Return:

```json
{
  "total": 2,
  "items": [
    {
      "name": "AEB_pDriverIBooster",
      "path": "PlatformLibrary/Package/AEB/Private/AEB_Core/AEB_pDriverIBooster",
      "kind": "class",
      "language": "ESDL"
    }
  ]
}
```

### 3.2 Failed Responses

Failures return only structured error data:

```json
{
  "error": {
    "code": "databaseNotOpen",
    "message": "ASCET is reachable, but no database is open.",
    "recover": {
      "nextStep": "Open the target database in ASCET UI, then rerun ascet_status."
    }
  }
}
```

### 3.3 Field Naming

All output fields use camelCase.

Use these stable names consistently:

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

Reference outputs use:

```text
source
target
```

Diff outputs use:

```text
left
right
```

### 3.4 Path Format

All output paths use `/`.

Input may accept `/` or `\`, but output must be canonical:

```text
PlatformLibrary/Package/AEB/Private/AEB_Core/AEB_pDriverIBooster
```

Do not output:

```text
PlatformLibrary\Package\AEB\Private\AEB_Core\AEB_pDriverIBooster
```

### 3.5 No Input Echo

Do not repeat request parameters in the response unless the value was resolved, normalized, or corrected.

Avoid:

```json
{
  "query": "AEB",
  "componentPath": "Demo/PID",
  "total": 0,
  "items": []
}
```

Allow:

```json
{
  "canonical": {
    "component": "Demo/PID"
  },
  "total": 0,
  "items": []
}
```

### 3.6 Omit Empty and Default Values

Do not return empty strings, nulls, empty optional arrays, or default fields.

Empty result:

```json
{
  "total": 0,
  "items": []
}
```

Only include `nextCursor` when more results exist.

### 3.7 Detail Levels

Large-output tools must support:

```ts
detailLevel?: "summary" | "topology" | "full";
```

Default is `summary`.

| detailLevel | Meaning |
|---|---|
| `summary` | Counts, hash, line count, compact structure |
| `topology` | Relationships, children, graph/topology without full bodies |
| `full` | Full text, full diagram payload, full implementation, full diff |

Code, diagrams, implementation details, and diffs must not return full bodies by default.

### 3.8 Structured Data Over Strings

Do not return string signatures:

```json
{
  "signature": "Variable ModelType=cont Scope=local Calibration=True"
}
```

Return structured fields:

```json
{
  "kind": "variable",
  "type": "cont",
  "scope": "local",
  "calibration": true
}
```

### 3.9 Shared Context at Top Level

Do not repeat common component context on every item.

Avoid:

```json
{
  "items": [
    { "component": "Demo/PID", "name": "calc", "kind": "method" },
    { "component": "Demo/PID", "name": "init", "kind": "method" }
  ]
}
```

Prefer:

```json
{
  "component": "Demo/PID",
  "total": 2,
  "items": [
    { "name": "calc", "kind": "method" },
    { "name": "init", "kind": "method" }
  ]
}
```

## 4. Schema Rules

Tool schemas must be action-specific discriminated unions.

Do not use one large object with unrelated optional fields:

```ts
Type.Object({
  action: Type.Union([...]),
  componentPath: Type.Optional(Type.String()),
  methodName: Type.Optional(Type.String()),
  depth: Type.Optional(Type.Number()),
  query: Type.Optional(Type.String())
})
```

Use action-specific schemas:

```ts
const readCodeParams = Type.Object({
  action: Type.Literal("read_code"),
  componentPath: Type.String(),
  methodName: Type.Optional(Type.String()),
  section: Type.Optional(Type.Union([
    Type.Literal("body"),
    Type.Literal("header"),
    Type.Literal("external-c"),
    Type.Literal("all")
  ])),
  detailLevel: Type.Optional(Type.Union([
    Type.Literal("summary"),
    Type.Literal("full")
  ]))
});

const referencesToComponentParams = Type.Object({
  action: Type.Literal("references_to_component"),
  query: Type.String(),
  scopePath: Type.Optional(Type.String()),
  limit: Type.Optional(Type.Number()),
  cursor: Type.Optional(Type.String())
});
```

Examples:

- `read_code` must not expose `depth`.
- `references_to_component` must not expose `methodName`.
- `text_in_code` must not expose write parameters.
- `write` actions must not expose search pagination.

## 5. Action-Level Instruction System

Tool instructions must be split at action level, not written as one large prompt per tool.

The instruction system must support:

- Searchable instruction units.
- Composition by selected tool/action.
- Injection by profile.
- Extremely short few-shot examples.
- Clear action boundaries.
- Stable IDs for tests and prompt assembly.

### 5.1 Instruction Unit Shape

Each action should have one compact instruction unit:

```ts
type AscetActionInstruction = {
  id: string;
  tool: string;
  action: string;
  profiles: string[];
  requiresPartitions?: IndexPartition[];
  intent: string;
  useWhen: string[];
  do: string[];
  dont: string[];
  parameters: string[];
  resultShape: string;
  fewShot: Array<{
    user: string;
    call: Record<string, unknown>;
    expect?: string;
  }>;
};
```

Example:

```ts
{
  id: "ascet.search.declarationsOfElement",
  tool: "ascet_search",
  action: "declarations_of_element",
  profiles: ["default", "search", "readPlanning"],
  requiresPartitions: ["element_decls"],
  intent: "Find where an ASCET element is declared.",
  useWhen: [
    "User asks where an element is defined.",
    "User has an element name but not the owning component."
  ],
  do: [
    "Use exact match when the user gives a full element name.",
    "Return component, kind, type, and scope."
  ],
  dont: [
    "Do not use this for text occurrences in ESDL/C code.",
    "Do not read full code."
  ],
  parameters: ["query", "match", "scopePath", "limit", "cursor"],
  resultShape: "{ total, items: [{ name, component, kind, type, scope }] }",
  fewShot: [
    {
      user: "Find declaration of P_AEB_IB_MaxVelocityDrop_Curve",
      call: {
        action: "declarations_of_element",
        query: "P_AEB_IB_MaxVelocityDrop_Curve",
        match: "exact",
        limit: 20
      },
      expect: "Return declaration items, not code snippets."
    }
  ]
}
```

### 5.2 Storage Layout

Use a data-driven registry instead of long handwritten prompt strings.

Suggested layout:

```text
src/tools/instructions/
  registry.ts
  profiles.ts
  types.ts
  ascet-status.ts
  ascet-search.ts
  ascet-explore.ts
  ascet-read.ts
  ascet-write.ts
  ascet-verify.ts
```

Each file exports action instruction units:

```ts
export const ascetSearchInstructions = [
  declarationsOfElementInstruction,
  referencesToComponentInstruction,
  referencesToElementInstruction,
  textInCodeInstruction
] satisfies AscetActionInstruction[];
```

### 5.3 Profiles

Profiles control which instruction units are injected.

Suggested profiles:

| Profile | Purpose |
|---|---|
| `default` | Minimal everyday ASCET tool use |
| `search` | Search/explore focused tasks |
| `readPlanning` | Resolve target before live reads |
| `writePlanning` | Preflight and write safety |
| `writeExecution` | Explicit write execution only |
| `debug` | Recovery, scheduler, raw failure diagnosis |
| `compact` | Lowest-token instruction set |

Profile assembly rule:

```text
base tool rules
  + selected profile rules
  + action-level instruction units
  + 0-2 few-shot examples
```

Do not inject all ASCET action instructions into every prompt.

### 5.4 Few-Shot Rules

Few-shot examples must be extremely short.

Rules:

- At most 1-2 examples per active action group.
- Prefer one-line user intent.
- Prefer compact JSON tool call.
- No long explanations.
- No full response payloads unless the shape is the point.

Good:

```ts
{
  user: "Where is AEB_pDriverIBooster referenced?",
  call: {
    action: "references_to_component",
    query: "AEB_pDriverIBooster",
    match: "exact",
    limit: 20
  }
}
```

Bad:

```text
Long paragraph explaining all ASCET search modes, then several verbose examples.
```

### 5.5 Searchability and Composition

Instruction units must be searchable by:

```text
tool
action
profile
required partition
intent keywords
parameter names
```

The runtime prompt builder should expose helpers:

```ts
findActionInstructions({ tool, action });
findInstructionsForProfile(profile);
buildToolPrompt({ tool, profile, activeActions });
```

Tests must verify:

- Hidden actions do not inject instructions.
- `search_occurrences` is not injected.
- `ascet_batch_write` is not injected unless explicitly enabled.
- `read_code` instruction says live read only.
- `text_in_code` instruction says search snippets only.

## 6. Dynamic Tool Action Activation

PI practical design:

```text
Do not destroy tool implementations.
Do not split one canonical action into many tiny public tools.
Do not rely on tool results to inject long prompts.
Do dynamically switch:
  - active tool names
  - profile-specific promptGuidelines
  - compact action-level instruction units
```

Action-level splitting is still required, but it is an internal instruction and metadata structure. It does not mean every action becomes a separate public tool, and it does not require mid-run schema mutation.

### 6.1 Practical PI Activation Model

Implementation has four parts:

```text
profile
  -> exposure controller
  -> profiled tool definitions
  -> ascet_capabilities activation trigger
```

The core flow:

```text
extension registers canonical tool implementations
  -> exposure controller activates base profile
  -> PI visible tool set is set by setActiveTools()
  -> profile-specific promptGuidelines are re-registered for same tool names
  -> model sees only active tools plus compact profile instructions
  -> runtime still rejects disabled/hidden actions
```

This gives dynamic behavior without changing the executor implementation.

### 6.2 PI API Type Extension

Current tool registration should be extended with optional active-tool APIs:

```ts
export interface AscetExtensionAPI {
  registerTool(tool: unknown): void;
  getActiveTools?(): string[];
  getAllTools?(): Array<{
    name: string;
    description: string;
    promptGuidelines?: string[];
  }>;
  setActiveTools?(toolNames: string[]): void;
}
```

If `setActiveTools` is unavailable, fall back to static registration and profile prompt only. Runtime guards still apply.

### 6.3 Profiles

Suggested profiles:

```ts
export type AscetProfile =
  | "base"
  | "advanced-read"
  | "reference"
  | "diff"
  | "verify"
  | "write-preflight"
  | "batch-write"
  | "component-edit"
  | "ops";
```

Tool visibility by profile:

```ts
export const profileTools: Record<AscetProfile, string[]> = {
  base: [
    "ascet_status",
    "ascet_capabilities",
    "ascet_explore",
    "ascet_search",
    "ascet_read"
  ],
  "advanced-read": [
    "ascet_status",
    "ascet_capabilities",
    "ascet_explore",
    "ascet_search",
    "ascet_read"
  ],
  reference: [
    "ascet_status",
    "ascet_capabilities",
    "ascet_explore",
    "ascet_search",
    "ascet_read",
    "ascet_reference"
  ],
  diff: [
    "ascet_status",
    "ascet_capabilities",
    "ascet_explore",
    "ascet_search",
    "ascet_read",
    "ascet_diff"
  ],
  verify: [
    "ascet_status",
    "ascet_capabilities",
    "ascet_explore",
    "ascet_search",
    "ascet_read",
    "ascet_verify",
    "ascet_scheduler_status"
  ],
  "write-preflight": [
    "ascet_status",
    "ascet_capabilities",
    "ascet_explore",
    "ascet_search",
    "ascet_read",
    "ascet_write",
    "ascet_verify",
    "ascet_scheduler_status"
  ],
  "batch-write": [
    "ascet_status",
    "ascet_capabilities",
    "ascet_explore",
    "ascet_search",
    "ascet_read",
    "ascet_write",
    "ascet_verify",
    "ascet_scheduler_status"
  ],
  "component-edit": [
    "ascet_status",
    "ascet_capabilities",
    "ascet_explore",
    "ascet_search",
    "ascet_read",
    "ascet_component_editable",
    "ascet_verify"
  ],
  ops: [
    "ascet_status",
    "ascet_capabilities",
    "ascet_recover",
    "ascet_scheduler_status"
  ]
};
```

`ascet_batch_write` remains hidden even in `batch-write` unless `PI_ASCET_ENABLE_BATCH_WRITE=1`.

### 6.4 Exposure Controller

Activation should preserve non-ASCET tools:

```ts
export function createAscetExposureController(pi: AscetExtensionAPI) {
  function activateProfile(profile: AscetProfile) {
    const activeAscetTools = resolveProfileTools(profile);
    const current = pi.getActiveTools?.() ?? [];
    const nonAscet = current.filter((name) => !canonicalAscetToolNameSet.has(name));

    for (const tool of buildProfiledAscetTools(profile)) {
      pi.registerTool(tool);
    }

    pi.setActiveTools?.([...new Set([...nonAscet, ...activeAscetTools])]);
  }

  return { activateProfile };
}
```

Important order:

```text
registerTool(same-name profiled tool)
then setActiveTools(profile tool names)
```

Same-name re-registration refreshes `promptGuidelines` for the next PI provider request.

### 6.5 Profiled Tool Definitions

Do not change `execute`, `schema`, or `render` during profile switching.

Only append compact profile instructions:

```ts
export function buildProfiledAscetTools(profile: AscetProfile) {
  const extraGuidelines = getProfileGuidelines(profile);

  return canonicalAscetTools.map((tool) => ({
    ...tool,
    promptGuidelines: [
      ...(tool.promptGuidelines ?? []),
      ...(extraGuidelines[tool.name] ?? [])
    ]
  }));
}
```

Example profile guideline:

```ts
{
  ascet_read: [
    "Use ascet_read action=read_block_diagram for block diagram, BDE, wiring, connection, or signal-flow questions after resolving componentPath.",
    "Example: ascet_read({ action: \"read_block_diagram\", componentPath: \"DEMO/PID\", detailLevel: \"summary\" })"
  ]
}
```

### 6.6 Action-Level Metadata Still Exists

Action descriptors are still useful, but they are used for:

- instruction lookup;
- profile prompt assembly;
- capabilities search;
- runtime validation;
- index partition requirements;
- deprecation/replacement hints.

They should not require per-turn schema hot swapping.

Suggested metadata:

```ts
type ActionDescriptor = {
  id: string;
  tool: string;
  action: string;
  visibility: "public" | "internal" | "hidden";
  profiles: AscetProfile[];
  featureFlag?: string;
  deprecatedBy?: string;
  requiresPartitions?: IndexPartition[];
  instruction?: AscetActionInstruction;
};
```

Examples:

- `ascet_search.text_in_code` is public metadata and injects search-snippet guidance.
- `ascet_search.search_occurrences` is internal metadata and never injects.
- `ascet_batch_write` is hidden metadata and only appears when the feature gate enables it.

### 6.7 Runtime Gate

Every tool execution must validate action activation before dispatch:

```ts
function assertActionActive(
  tool: string,
  action: string,
  ctx: ActionActivationContext,
): ActionDescriptor {
  const descriptor = getActionDescriptor(tool, action);
  const state = descriptor ? resolveActionActivation(descriptor, ctx) : "hidden";

  if (!descriptor || state !== "active") {
    throw createToolError("actionUnavailable", "This ASCET action is not active in the current profile.", {
      recover: {
        nextAction: "ascet_capabilities",
        action: "search",
        query: action
      }
    });
  }

  return descriptor;
}
```

The runtime gate remains mandatory because hidden actions may still be invoked by stale clients, tests, or hand-written calls.

### 6.8 Capabilities Activation Trigger

`ascet_capabilities` can recommend and optionally activate a profile.

Suggested shape:

```ts
export function createAscetCapabilitiesTool(deps: {
  exposure: ReturnType<typeof createAscetExposureController>;
}) {
  return defineSequentialAscetTool({
    name: "ascet_capabilities",
    async execute(_id, params, _signal, _onUpdate, ctx) {
      const result = runAscetCapabilities(params, { cwd: ctx.cwd });

      if (params.activate && result.recommendedProfile) {
        deps.exposure.activateProfile(result.recommendedProfile);
      }

      return result;
    }
  });
}
```

Runtime flow:

```text
user request
  -> model calls ascet_capabilities({ query, activate: true })
  -> capabilities recommends a profile
  -> exposure.activateProfile(profile)
  -> same-name registerTool refreshes promptGuidelines
  -> setActiveTools switches visible ASCET tools
  -> next provider request uses new active tools and profile prompt
```

`before_agent_start` is suitable for global startup routing prompt only. Mid-run activation should use `registerTool + setActiveTools`.

### 6.9 Capability Output

`ascet_capabilities` should expose compact activation truth:

```json
{
  "profile": "search",
  "tools": [
    {
      "name": "ascet_search",
      "actions": [
        { "name": "declarations_of_element", "state": "active" },
        { "name": "references_to_component", "state": "active" },
        { "name": "search_occurrences", "state": "hidden", "replacement": "references_to_element" }
      ]
    }
  ]
}
```

Omit hidden actions from default capabilities output unless `detailLevel=full`.

### 6.10 Must-Test Points

```text
startup active ASCET tools are base profile only
activate advanced-read refreshes ascet_read promptGuidelines with read_block_diagram few-shot
activate write-preflight exposes ascet_write/ascet_verify but not ascet_batch_write
activate batch-write still hides ascet_batch_write unless PI_ASCET_ENABLE_BATCH_WRITE=1
non-ASCET tools remain active after setActiveTools
inactive profile promptGuidelines do not enter system prompt
runtime rejects hidden/internal actions
```

## 7. Final Tool Boundary

| Tool | Final Responsibility |
|---|---|
| `ascet_status` | Connect host/current DB; build `components` partition |
| `ascet_search` | Search declarations, references, messages, text |
| `ascet_explore` | Navigate components, children, diagrams |
| `ascet_read` | Live read exact target content |
| `ascet_write` | Single write + targeted readback + index impact update |
| `ascet_verify` | Verify/readback consistency |
| `ascet_diff` | Diff files, snapshots, specs |
| `ascet_reference` | Temporarily kept; later can become a compatibility wrapper over search reference actions |
| `ascet_batch_write` | Hidden |
| `ascet_component_editable` | Temporarily kept; later may merge into `ascet_write` |

## 8. Status Behavior

`ascet_status` only performs:

```text
Connect
  -> AscetSession / current DB

Components
  -> GetAllComponentsOfType
```

Expected backend command:

```text
AscetCli.exe exec warm_search_index --partition components --force --json
```

`ascet_status` must not call:

```text
GetAllModelElements
GetAllDiagrams
GetCode
GetAllReferencedModelElements
element refs scan
message scan
```

Expected success response:

```json
{
  "host": "connected",
  "database": {
    "name": "AEB",
    "path": "ETASData/ASCET6.4/Database/AEB"
  },
  "components": {
    "status": "ready",
    "total": 119,
    "elapsedMs": 520
  }
}
```

## 9. Index Partitions

```ts
type IndexPartition =
  | "components"
  | "element_decls"
  | "method_decls"
  | "method_process_elements"
  | "component_refs"
  | "element_refs"
  | "messages"
  | "text_code";
```

| Partition | Backend API | Trigger |
|---|---|---|
| `components` | `GetAllComponentsOfType` | status, component search, explore list |
| `element_decls` | `GetAllModelElements + GetName/GetScope/GetType().Name` | declarations of element |
| `method_decls` | diagrams + methods/processes | declarations of method/process |
| `method_process_elements` | arguments + locals | declarations of method/process element |
| `component_refs` | `GetAllReferencedModelElements + GetRepresentedClass` | references to component |
| `element_refs` | diagram refs + optional text refs | references to element |
| `messages` | derived from element runtime type | senders/receivers |
| `text_code` | `GetCode` + C header/external code | text in ESDL/C code |

Each partition has independent lifecycle:

```text
missing -> building -> ready
ready -> stale -> building -> ready
building -> failed
```

One partition failure must not invalidate the entire index store.

## 10. Index Store API

Add a partition-aware index manager.

Suggested API:

```ts
type EnsureIndexOptions = {
  cwd: string;
  env?: Record<string, string | undefined>;
  signal?: AbortSignal;
  timeoutMs?: number;
  forceRefresh?: boolean;
  reason: string;
  component?: string;
};

function getIndexState(): AscetIndexState;

async function ensureIndexPartition(
  partition: IndexPartition,
  options: EnsureIndexOptions,
): Promise<PartitionWarmupResult>;

async function ensureIndexPartitions(
  partitions: IndexPartition[],
  options: EnsureIndexOptions,
): Promise<PartitionWarmupResult[]>;

function queryIndex<TParams, TResult>(
  partition: IndexPartition,
  params: TParams,
): TResult | undefined;

function installPartition(
  partition: IndexPartition,
  payload: unknown,
): void;

function markPartitionsStale(
  partitions: IndexPartition[],
  reason: string,
): void;
```

## 11. Backend Partition Command

Extend the existing `warm_search_index` backend command.

Required command forms:

```text
warm_search_index --partition components --force --json
warm_search_index --partition element_decls --json
warm_search_index --partition method_decls --json
warm_search_index --partition method_process_elements --json
warm_search_index --partition component_refs --json
warm_search_index --partition element_refs --json
warm_search_index --partition messages --json
warm_search_index --partition text_code --json
warm_search_index --partition all --json
```

Component-scoped refresh where feasible:

```text
warm_search_index --partition element_decls --component PlatformLibrary/Package/AEB/... --json
warm_search_index --partition text_code --component PlatformLibrary/Package/AEB/... --json
```

Backend output must already follow the agent-friendly JSON contract as closely as possible. The PI layer can normalize old payloads during transition.

## 12. Search Redesign

Hide old public action:

```text
search_occurrences
```

Expose UI-semantic search actions:

```ts
type AscetSearchAction =
  | "search_components"
  | "resolve_component"
  | "declarations_of_element"
  | "declarations_of_method_process"
  | "declarations_of_method_process_element"
  | "references_to_component"
  | "references_to_element"
  | "senders_of_message"
  | "receivers_of_message"
  | "text_in_code";
```

Action to partition mapping:

| Action | Required Partition |
|---|---|
| `search_components` | `components` |
| `resolve_component` | `components` |
| `declarations_of_element` | `element_decls` |
| `declarations_of_method_process` | `method_decls` |
| `declarations_of_method_process_element` | `method_process_elements` |
| `references_to_component` | `component_refs` |
| `references_to_element` | `element_refs`, `text_code` |
| `senders_of_message` | `messages` |
| `receivers_of_message` | `messages` |
| `text_in_code` | `text_code` |

Example `declarations_of_element` result:

```json
{
  "total": 2,
  "items": [
    {
      "name": "P_AEB_IB_MaxVelocityDrop_Curve",
      "component": "PlatformLibrary/Package/AEB/Private/AEB_Core/AEB_CoreParameter",
      "kind": "element",
      "type": "OneDTableElement",
      "scope": "exported"
    },
    {
      "name": "P_AEB_IB_MaxVelocityDrop_Curve",
      "component": "PlatformLibrary/Package/AEB/Private/AEB_Core/AEB_MaxActivationTime",
      "kind": "element",
      "type": "OneDTableElement",
      "scope": "imported"
    }
  ]
}
```

Example `text_in_code` result:

```json
{
  "total": 1,
  "items": [
    {
      "component": "PlatformLibrary/Package/AEB/Private/AEB_Core/AEB_pDriverIBooster",
      "method": "calc",
      "section": "body",
      "line": 42,
      "snippet": "C_AEB_IB_MaxVelocityDrop_Curve.getAt(AEB_v_Init)"
    }
  ]
}
```

## 13. Explore Redesign

`ascet_explore` is navigation-only.

| Action | New Behavior |
|---|---|
| `list_components` | Query `components` partition |
| `preview_children` with `group=elements` | Ensure/query `element_decls` |
| `preview_children` with `group=methods` | Ensure/query `method_decls` |
| `preview_children` with `group=diagrams` | Ensure/query diagram metadata from `method_decls` |
| `inspect_target` | Lightweight index summary only |
| `list_diagrams` | Ensure/query diagram metadata |

`ascet_explore` must not:

- Return full code bodies.
- Search text.
- Perform reference graph analysis.
- Perform write/readback.

## 14. Read Redesign

`ascet_read` is live-read only.

Expose:

```ts
type AscetReadAction =
  | "read_code"
  | "read_method_signature"
  | "read_implementation"
  | "read_block_diagram"
  | "read_state_machine_flow"
  | "read_dependent_chain"
  | "read_element_dependency";
```

Hide/remove from public schema:

```ts
action: "read"
```

Rules:

- `read_code` always calls live ASCET ToolAPI.
- `read_code` must not query `text_code` partition.
- `ascet_read` does not return component summary.
- Component summary/navigation belongs to `ascet_search` or `ascet_explore`.
- `ascet_read` requires explicit target paths.
- Omitted `detailLevel` returns complete live code text.
- `detailLevel=summary` returns only hash/count metadata when explicitly requested.

Example default `read_code` response:

```json
{
  "component": "PlatformLibrary/Package/AEB/Private/AEB_Core/AEB_pDriverIBooster",
  "name": "calc",
  "section": "body",
  "text": "..."
}
```

Example `read_code` with `detailLevel=summary`:

```json
{
  "component": "PlatformLibrary/Package/AEB/Private/AEB_Core/AEB_pDriverIBooster",
  "name": "calc",
  "section": "body",
  "hash": "sha256:...",
  "lineCount": 128,
  "byteCount": 4096
}
```

## 15. Write Redesign

`ascet_write` remains single-operation only.

Pipeline:

```text
normalize params
-> index-aware preflight
-> C# live precondition check
-> serial write
-> targeted readback
-> emit WriteImpact
-> mark affected partitions stale for next indexed read
```

Write impact shape:

```ts
type WriteImpact = {
  action: string;
  affectedComponents: string[];
  affectedMethods: Array<{ component: string; method: string }>;
  affectedElements: Array<{ component: string; name: string }>;
  stale: IndexPartition[];
};
```

Partition update policy:

| Write Action | Index Update |
|---|---|
| `create_component` | Stale `components` |
| `delete_component` | Stale `components`, `element_decls`, `text_code` |
| `create_method` | Stale `element_decls` |
| `delete_method` | Stale `element_decls`, `text_code` |
| `set_method_code` | Stale `text_code` |
| `set_method_signature` | Stale `element_decls` |
| `apply_element_spec` | Stale `element_decls`, `text_code` |
| `set_element_dependency` | Stale `element_decls`, `text_code` |
| `set_module_code` | Stale `text_code` |
| `set_state_machine_code` | Stale `text_code` |

Successful write response:

```json
{
  "changed": true,
  "target": {
    "component": "Demo/PID",
    "method": "calc"
  },
  "readback": {
    "status": "verified",
    "hash": "sha256:..."
  },
  "index": {
    "stale": ["text_code"]
  }
}
```

Failed write response:

```json
{
  "error": {
    "code": "preconditionFailed",
    "message": "Method calc no longer exists in Demo/PID.",
    "recover": {
      "nextAction": "ascet_explore",
      "action": "preview_children",
      "componentPath": "Demo/PID",
      "group": "methods"
    }
  }
}
```

## 16. Batch Write Hiding

`ascet_batch_write` is hidden for now.

Implementation rules:

- Remove `ascetBatchWriteTool` from public canonical tool registration.
- Remove `"ascet_batch_write"` from public canonical tool names.
- Remove batch examples from prompts/examples.
- Keep `src/batch-write.ts`.
- Keep `src/tools/batch-write/`.
- Optional later gate: `PI_ASCET_ENABLE_BATCH_WRITE=1`.

## 17. External ASCET UI Modification Policy

No polling.

Rules:

```text
Extension activation:
  IndexStore starts empty.

ascet_status:
  Always force-refresh components.

First search/explore call for a partition:
  Build that partition.

Writes through ascet_write:
  Apply WriteImpact stale policy.

Strict mode:
  Optional forceRefresh=true on tool calls.
```

This avoids treating old startup cache as runtime truth.

## 18. Development Phases

### Phase -1: Response Contract First

Scope:

- Add global response contract helpers.
- Normalize output paths to `/`.
- Compact successful payloads.
- Standardize failure payloads.
- Add contract tests.

Files:

```text
src/tool-response-contract.ts
src/tool-response-contract.test.ts
src/*format*.ts
src/tools/**/ui.ts
src/tools/**/definition.ts
```

Tasks:

- [x] Add `normalizeApiPath()`.
- [x] Add `compactObject()`.
- [x] Add `createToolError()`.
- [x] Add `createPagedResult()`.
- [x] Add `createHashSummary()` for code/large bodies.
- [x] Add contract tests for no `ok:true`, `error:null`, `meta.mode`, `meta.operation` on success.
- [x] Add contract tests for slash-normalized paths.
- [x] Add contract tests for empty result shape.

Acceptance:

- Successful tool details do not contain `ok:true`, `error:null`, `meta.mode`, or `meta.operation`.
- Failure output uses `error.code`, `error.message`, and optional `error.recover`.
- Output paths use `/`.
- Empty result is `{ "total": 0, "items": [] }`.

### Phase -0.5: Action-Level Instructions

Scope:

- Split prompt instructions by tool action.
- Make instruction units searchable and profile-injectable.
- Add short few-shot examples per action.
- Remove hidden action/tool instructions from public prompt assembly.

Files:

```text
src/tools/instructions/types.ts
src/tools/instructions/registry.ts
src/tools/instructions/profiles.ts
src/tools/instructions/ascet-search.ts
src/tools/instructions/ascet-explore.ts
src/tools/instructions/ascet-read.ts
src/tools/instructions/ascet-write.ts
src/tools/**/prompt.ts
src/tools/prompt.test.ts
```

Tasks:

- [x] Define `AscetActionInstruction`.
- [x] Add instruction registry.
- [x] Add profile registry.
- [x] Move `ascet_search` instructions to action-level units.
- [x] Move `ascet_explore` instructions to action-level units.
- [x] Move `ascet_read` instructions to action-level units.
- [x] Move `ascet_write` instructions to action-level units.
- [x] Add 1-2 tiny few-shots per major action.
- [x] Add prompt assembly helper.
- [x] Add tests for hidden action/tool instruction exclusion.

Acceptance:

- Instructions can be found by tool/action/profile.
- Prompt injection can include only the actions relevant to a profile.
- `search_occurrences` instructions are not injected.
- `ascet_batch_write` instructions are not injected unless the env gate enables it.
- `read_code` few-shot and rules describe live read only.
- `text_in_code` few-shot and rules describe search snippets only.

### Phase -0.25: Dynamic Action Activation

Scope:

- Add profiles and profile-to-active-tool mappings.
- Add exposure controller around `registerTool` and optional `setActiveTools`.
- Add profiled tool definitions that refresh `promptGuidelines` without changing execute/schema/render.
- Add action descriptors for instruction/capabilities/runtime metadata.
- Add runtime gate before action dispatch.
- Add compact capabilities reporting for action activation.

Files:

```text
src/tools/exposure/profiles.ts
src/tools/exposure/controller.ts
src/tools/exposure/profiled-tools.ts
src/tools/actions/types.ts
src/tools/actions/registry.ts
src/tools/actions/activation.ts
src/tools/instructions/registry.ts
src/tools/capabilities/definition.ts
src/tools/registry.ts
src/index.ts
```

Tasks:

- [x] Extend PI API types with optional `getActiveTools`, `getAllTools`, and `setActiveTools`.
- [x] Define `AscetProfile`.
- [x] Define `profileTools`.
- [x] Add `createAscetExposureController()`.
- [x] Add `buildProfiledAscetTools()`.
- [x] Define `ActionDescriptor`.
- [x] Add action descriptor registry.
- [x] Add profile/env feature flag resolver.
- [x] Add runtime `assertActionActive()`.
- [x] Convert `ascet_capabilities` to a factory that can call `activateProfile()`.
- [x] Ensure hidden actions are excluded from profile promptGuidelines.
- [x] Ensure runtime rejects hidden actions with structured recovery error.

Acceptance:

- Base profile exposes only base ASCET tools.
- Activating `advanced-read` refreshes `ascet_read` promptGuidelines with read-specific few-shot.
- Activating `write-preflight` exposes `ascet_write`/`ascet_verify` but not `ascet_batch_write`.
- `ascet_batch_write` cannot appear unless `PI_ASCET_ENABLE_BATCH_WRITE=1`.
- `search_occurrences` cannot appear in profile promptGuidelines.
- Non-ASCET active tools are preserved after `setActiveTools`.
- Runtime rejects hidden actions even if manually invoked.
- Capabilities can show active actions compactly.
- Activation does not depend on current index partition readiness.

### Phase 0: Hide Batch Write

Scope:

- Hide `ascet_batch_write` from public tool registry.
- Keep implementation files.
- Remove batch write prompt/examples.

Files:

```text
src/tools/registry.ts
src/tools/_shared/action-examples.ts
src/agents.test.ts
```

Tasks:

- [x] Remove `ascetBatchWriteTool` from `canonicalDomainTools`.
- [x] Remove `"ascet_batch_write"` from `canonicalAscetToolNames`.
- [x] Remove batch examples from shared action examples.
- [x] Update tests that assert agent prompt/tool availability.

Acceptance:

- `ascet_batch_write` is not exposed.
- Batch source files still compile.
- Non-batch tool registry order remains stable.

### Phase 1: Status Builds Components Only

Scope:

- Change `ascet_status` runtime probe to force-refresh only `components`.
- Remove status partial full-index behavior.
- Return compact status JSON.

Files:

```text
src/status-runtime.ts
src/status-runtime.test.ts
src/search-index.ts
```

Tasks:

- [x] Replace `ensureAscetSearchIndex(maxComponents: 50)` with `ensureIndexPartition("components", forceRefresh=true)`.
- [x] Ensure backend args include `--partition components --force`.
- [x] Update status summary/details.
- [x] Ensure status does not request text/elements/refs.

Acceptance:

- `ascet_status` only triggers connect/current DB/components.
- Status does not mention `list_folders`.
- Status does not trigger full index warmup.

### Phase 2: Partition-Aware Index Store

Scope:

- Replace single global index state with independent partition state.
- Add shared in-flight promise per partition.
- Keep compatibility adapter for old warmup payload during transition.

Files:

```text
src/search-index-store.ts
src/search-index.ts
src/search-index.test.ts
```

Tasks:

- [x] Define `IndexPartition`.
- [x] Define partition state machine.
- [x] Implement `ensureIndexPartition()`.
- [x] Implement `ensureIndexPartitions()`.
- [x] Implement `installPartition()`.
- [x] Implement `markPartitionsStale()`.
- [x] Keep old query helpers working temporarily.

Acceptance:

- Partitions are independently `missing/building/ready/stale/failed`.
- Same-partition concurrent calls share one build.
- One partition failure does not invalidate another partition.

### Phase 3: Components Consumers

Scope:

- Route component search, resolve, and explore list through `components`.

Files:

```text
src/search-components.ts
src/resolve-component.ts
src/list-components.ts
src/tools/explore/definition.ts
```

Tasks:

- [x] Update `search_components` to query `components`.
- [x] Update `resolve_component` to query `components`.
- [x] Update `explore.list_components` to query `components`.
- [x] Keep live CLI fallback when partition build fails.
- [x] Normalize component output fields.

Acceptance:

- Component search returns compact JSON from index.
- Resolve component returns canonical path/kind/language.
- Explore list components no longer needs a separate live folder list path.

### Phase 4: Search Action Redesign

Scope:

- Replace public `search_occurrences` with UI-semantic actions.
- Map each action to required partitions.
- Normalize result JSON.

Files:

```text
src/tools/search.ts
src/tools/search/schema.ts
src/tools/search/prompt.ts
src/search-elements.ts
src/search-text-code.ts
src/search-occurrences.ts
src/quick-search-ui-mapping.ts
```

Tasks:

- [x] Remove `search_occurrences` from public schema.
- [x] Add `declarations_of_element`.
- [x] Add `declarations_of_method_process`.
- [x] Add `declarations_of_method_process_element`.
- [x] Add `references_to_component`.
- [x] Add `references_to_element`.
- [x] Add `senders_of_message`.
- [x] Add `receivers_of_message`.
- [x] Add `text_in_code`.
- [x] Convert schema to action-specific discriminated union.
- [x] Add compact pagination.

Acceptance:

- Public actions match ASCET quick-search UI semantics.
- `search_occurrences` is not shown to the agent.
- Search result items are compact and stable.
- Query can continue with `nextCursor` where needed.

### Phase 5: Explore Navigation Redesign

Scope:

- Make explore index-backed and navigation-only.
- Keep full content out of explore.

Files:

```text
src/tools/explore/schema.ts
src/tools/explore/definition.ts
src/read-component-children.ts
src/read-component-summary.ts
```

Tasks:

- [x] Convert schema to action-specific discriminated union.
- [x] `preview_children(elements)` uses `element_decls`.
- [x] `preview_children(methods)` uses `method_decls`.
- [x] `list_diagrams` uses diagram metadata partition.
- [x] `inspect_target` returns lightweight index summary only.

Acceptance:

- Explore does not return full code.
- Explore does not perform reference search.
- Explore output has top-level component context where applicable.

### Phase 6: Read Live-Only Redesign

Scope:

- Remove generic public `read` action.
- Ensure `read_code` always live reads.
- Remove component summary from `ascet_read`.

Files:

```text
src/tools/read/schema.ts
src/tools/read/definition.ts
src/read-text-code.ts
src/read-method-code.ts
```

Tasks:

- [x] Hide/remove `action: "read"` from public schema.
- [x] Convert read schema to action-specific discriminated union.
- [x] Add `detailLevel` to large read actions.
- [x] Make `read_code` return full live text by default.
- [x] Keep `read_code detailLevel=summary` as explicit hash/count mode.
- [x] Add tests proving `read_code` does not query `text_code` partition.

Acceptance:

- `read_code` calls live backend every time.
- `ascet_read` does not return component summary.
- Large non-code reads default to compact semantic summaries; `read_code` defaults to live code text.

### Phase 7: WriteImpact and Partition Invalidation

Scope:

- Add write impact generation.
- Replace global index invalidation with partition-level stale marking.
- Preserve live precondition checks.

Files:

```text
src/tools/write.ts
src/cli.ts
src/search-index-store.ts
src/write-common.ts
```

Tasks:

- [x] Define `WriteImpact`.
- [x] Generate impact per write action.
- [x] Do not update index for preflight-only writes.
- [x] Do not update index for failed writes.
- [x] Replace global `invalidateAscetSearchIndex()` with partition-aware updates.
- [x] Add write result compact formatter.

Acceptance:

- `set_method_code` stales only text-related partitions.
- `apply_element_spec` stales element/text partitions.
- Failed writes leave index state unchanged.
- Successful writes return compact `changed/readback/index` result.

### Phase 8: C# Partition Backend

Scope:

- Extend backend `warm_search_index` with partition support.
- Keep live ToolAPI access serial.
- Return consistent JSON per partition.

Tasks:

- [x] Add `--partition`.
- [x] Add `--force`.
- [x] Add optional `--component` for scoped refresh.
- [x] Implement `components`.
- [x] Implement `element_decls`.
- [x] Implement `method_decls`.
- [x] Implement `method_process_elements`.
- [x] Implement `component_refs`.
- [x] Implement `element_refs`.
- [x] Implement `messages`.
- [x] Implement `text_code`.
- [x] Suppress ToolAPI stdout pollution.

Acceptance:

- Each partition can be built independently.
- `components` partition is fast enough for status.
- Backend failures are structured JSON errors.
- JSON parsing is stable.

### Phase 9: Live Smoke Verification

Required live checks:

```text
1. ascet_status
   -> connects host
   -> builds components only

2. ascet_search search_components
   -> returns from components partition

3. ascet_search declarations_of_element
   -> builds element_decls
   -> finds P_AEB_IB_MaxVelocityDrop_Curve

4. ascet_search text_in_code
   -> builds text_code
   -> returns snippets

5. ascet_read read_code
   -> live reads full current code by default

6. ascet_write set_method_code
   -> writes live
   -> targeted readback verifies
   -> text_code/element_refs partition states update correctly
```

Acceptance:

- Live output matches the response contract.
- Status does not do full scan.
- Search/explore use index partitions.
- Read stays live-only.
- Write updates index state by impact.

## 19. Task Checklist

### Planning

- [x] Confirm final exposed tool list.
- [x] Confirm hidden `ascet_batch_write`.
- [x] Confirm hidden `search_occurrences`.
- [x] Confirm `read_code` live-only.
- [x] Confirm response contract.

### TypeScript

- [x] Add response contract helpers.
- [x] Add action-level instruction registry.
- [x] Add profile-based instruction injection.
- [x] Add dynamic action activation descriptors.
- [x] Add exposure controller with active tool switching.
- [x] Add profiled tool definitions for promptGuidelines.
- [x] Add runtime action activation gate.
- [x] Hide batch write.
- [x] Implement partition-aware index store.
- [x] Update status runtime.
- [x] Update component search/resolve/list.
- [x] Redesign search actions.
- [x] Redesign explore actions.
- [x] Redesign read actions.
- [x] Add write impact.
- [x] Replace global invalidation.
- [x] Update prompts/examples/tests.

### C#

- [x] Extend `warm_search_index --partition`.
- [x] Implement all required partitions.
- [x] Add component-scoped refresh where feasible.
- [x] Preserve serial ToolAPI access.
- [x] Normalize paths in JSON output.
- [x] Emit structured failures.

### Tests

- [x] Response contract tests.
- [x] Action-level instruction registry tests.
- [x] Profile prompt injection tests.
- [x] Dynamic action activation tests.
- [x] Runtime hidden-action rejection tests.
- [x] Tool schema discriminated union tests.
- [x] Registry tests for hidden batch write.
- [x] Status components-only tests.
- [x] Partition index store tests.
- [x] Search action mapping tests.
- [x] Explore navigation tests.
- [x] Read live-only tests.
- [x] Write impact tests.
- [x] Live smoke tests.

## 20. Verification Record

Verification completed on 2026-07-25 against the local ASCET AEB database.

Non-live regression:

- `node --test --test-timeout=10000 src\*.test.ts src\tools\**\*.test.ts`
  - Result: 110 passed / 0 failed.
- `src\ascetcli\output\ascet-csharp\tests\AscetCliJsonOutputTest.exe`
  - Result: passed.
  - Coverage added for raw `warm_search_index` slash-normalized paths and JSON-mode structured failures.
- `npx tsgo --noEmit --pretty false`
  - Result: failed only in sibling packages under `../ai`; no `PI/packages/ascet-extension/src` diagnostics were reported.

Live smoke:

- `ascet_status` used the startup host/components probe and returned `runtimeOk=true`, `entryCount=140`, `scanComplete=true`, `elapsedMs=1` against `d:/ETASData/ASCET6.4/Database/AEB`.
- Direct `AscetCli.exe exec warm_search_index --partition diagram_metadata --component ... --json` returned `componentPath`, `database.path`, and `diagramMetadata[].path` with `/`; `hasBackslash=false`.
- `list_diagrams` for `PlatformLibrary/Package/AEB_AutomaticEmergencyBrake/Private/AEB_Core/AEB_pDriverIBooster` returned `source=quick_search_index`, `index.elapsedMs=58`, `diagramCount=1`, and `Main` from the scoped `diagram_metadata` partition. The top-level payload carries `component`; each diagram item keeps only its own fields.
- `declarations_of_element` found `P_AEB_IB_MaxVelocityDrop_Curve` from `element_decls`.
- `declarations_of_method_process` found `calc` for `PlatformLibrary/Package/AEB_AutomaticEmergencyBrake/Private/AEB_Core/AEB_pDriverIBooster`.
- `declarations_of_method_process_element` found `AEB_pDriver/return`.
- `references_to_component` and `references_to_element` returned partition-backed matches.
- `senders_of_message` / `receivers_of_message` returned scoped partition-backed matches for `TEST`/AEB live message targets.
- `text_in_code` returned a scoped snippet for `TEST/TestClassESDL` (`/* test code */`) through the text-code search/fallback path; `read_code detailLevel=full` returned live text for `TEST/TestClassESDL::calc` with `textLength=42`.
- `ascet_write set_method_code` wrote the existing body of `TEST/TestClassESDL::calc` back unchanged, verified targeted readback, and marked only `text_code` stale with `invalidatedReason=write_succeeded:set_method_code`.

## 21. Definition of Done

The redesign is complete when:

```text
ascet_status only builds components
ascet_batch_write is hidden
search_occurrences is hidden
search actions match ASCET quick-search UI semantics
explore/search share IndexStore partitions
read_code always live reads ASCET
ascet_read no longer returns component summary
write emits WriteImpact
index updates are partition-level
success responses are compact business JSON
failure responses are structured recovery JSON
paths are slash-normalized
schemas are action-specific discriminated unions
instructions are action-level, searchable, composable, and profile-injected
actions are dynamically activated by profile/feature/backend capability
hidden actions are excluded from schema, prompt, and runtime dispatch
live smoke proves status/search/explore/read/write cooperation
```
