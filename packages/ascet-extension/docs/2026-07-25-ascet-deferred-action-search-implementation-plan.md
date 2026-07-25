# ASCET Deferred Action Search Implementation Plan

## 1. Goal

Implement a deferred ASCET action-discovery flow:

```text
initial prompt
  -> compact action descriptors + one-line mini few-shot
  -> no full schema, no full rules, no full few-shot

ascet_capabilities.search_actions
  -> action-first search over AscetActionCatalog

ascet_capabilities.describe_action
  -> exact schema summary, full rules, full few-shot, result shape
  -> optional action activation

activated canonical tool
  -> pruned schema containing only activated actions
  -> full prompt for activated actions only
  -> runtime guard still enforces activation
```

The objective is to improve action selection accuracy while reducing initial context size and preventing prompt/schema/capabilities drift.

## 2. Non-Negotiable Rules

- Search target is an ASCET action, not a CLI command.
- CLI catalog is backend metadata only.
- Initial prompt contains compact action descriptors and one-line mini few-shots only.
- Full schema, full rules, and full few-shots are returned by `describe_action` and injected only after activation.
- Do not inject long prompt text from ordinary tool results.
- Do not expose all canonical tool schemas at startup.
- Runtime guard must reject unactivated actions even if a stale client calls them.
- Keep live ASCET ToolAPI access serial.
- Keep `ascet_read.read_code` live-only and defaulting to complete text.
- Keep `ascet_search.text_in_code` snippet-only by default.
- Keep model-facing JSON compact and action-specific.

## 3. Current Gap

Current implementation already has these pieces:

- Canonical tools are registered in `src/index.ts`.
- Profiles switch active tool names through `src/tools/exposure/controller.ts`.
- Action descriptors exist in `src/tools/actions/descriptors.ts`.
- Action instructions exist in `src/tools/instructions/*.ts`.
- `ascet_capabilities` can search CLI catalog and action descriptors.
- Runtime action guard exists in `src/tools/actions/guard.ts`.

Current limitations:

- `ascet_capabilities` is not action-first; it searches `cli-catalog.json` first.
- Action descriptors and action instructions are separate truth sources.
- Full action few-shots are injected during tool registration/profile activation.
- Tool schemas are not pruned by activated action.
- `detailLevel="full"` currently also implies hidden action visibility in capabilities.
- Search is substring-based, not action intent search.
- Profile controls active tools, but not a separate activated-action set.

## 4. Target Architecture

```text
AscetActionCatalog
  -> compact action prompt builder
  -> action search index
  -> describe_action payload
  -> activation state store
  -> pruned TypeBox schema builder
  -> profiled tool definition builder
  -> runtime action guard
  -> capabilities output
  -> result policy and tests
```

The single source of truth is `AscetActionCatalog`.

Old metadata files become facades or generated views:

```text
src/tools/actions/descriptors.ts      -> derived from catalog
src/tools/instructions/registry.ts    -> derived from catalog prompt fields
src/tools/exposure/profiled-tools.ts  -> derives compact/full prompt from catalog and activation state
src/tools/capabilities.ts             -> action-first search/describe over catalog
```

## 5. Action Catalog

Create:

```text
packages/ascet-extension/src/tools/actions/catalog.ts
packages/ascet-extension/src/tools/actions/catalog.test.ts
```

Catalog entry shape:

```ts
export interface AscetActionCatalogEntry {
  id: string;
  tool: AscetToolName;
  action: string;

  family: "search" | "explore" | "read" | "reference" | "diff" | "write" | "verify" | "ops";
  risk: "read" | "diff" | "write" | "ops";
  visibility: "public" | "internal" | "hidden";
  profiles: readonly AscetProfile[];
  featureFlag?: string;
  deprecatedBy?: string;

  title: string;
  intent: string;
  aliases: readonly string[];
  tags: readonly string[];
  useWhen: readonly string[];
  avoidWhen: readonly string[];
  nextActions?: readonly string[];

  requiresPartitions?: readonly AscetIndexPartition[];
  backendCommands?: readonly string[];

  schema: unknown;
  schemaSummary: {
    required: readonly string[];
    optional: readonly string[];
    enums?: Readonly<Record<string, readonly string[]>>;
  };

  result: {
    shape: string;
    fields: readonly string[];
    defaultDetailLevel?: "summary" | "topology" | "full";
  };

  prompt: {
    compact: string;
    miniFewShot: string;
    rules: readonly string[];
    fullFewShots: readonly Array<{
      args: Readonly<Record<string, unknown>>;
    }>;
  };
}
```

Example:

```ts
{
  id: "ascet_read.read_code",
  tool: "ascet_read",
  action: "read_code",
  family: "read",
  risk: "read",
  visibility: "public",
  profiles: ["base", "advanced-read", "reference", "diff", "verify", "write-preflight"],
  title: "Read complete live ASCET code",
  intent: "Read full current code text from a resolved component or method.",
  aliases: ["complete code", "full code", "method body", "live code", "read code"],
  tags: ["read", "code", "live", "method"],
  useWhen: ["Need complete current code for a known component or method."],
  avoidWhen: ["Need to find where code appears globally; use ascet_search.text_in_code."],
  nextActions: ["ascet_write.set_method_code", "ascet_diff.diff_method"],
  requiresPartitions: [],
  backendCommands: ["AscetReadTextCode"],
  schema: readCodeSchema,
  schemaSummary: {
    required: ["action", "componentPath"],
    optional: ["methodName", "section", "detailLevel"]
  },
  result: {
    shape: "codeText",
    fields: ["component", "name", "section", "text"]
  },
  prompt: {
    compact: "Read complete live code; not for global code search.",
    miniFewShot: "ascet_read({action:\"read_code\",componentPath:\"DEMO/PID\",methodName:\"calc\",section:\"body\"})",
    rules: [
      "Live ToolAPI read only.",
      "Defaults to complete code text.",
      "Does not search across the database."
    ],
    fullFewShots: [
      {
        args: {
          action: "read_code",
          componentPath: "DEMO/PID",
          methodName: "calc",
          section: "body"
        }
      }
    ]
  }
}
```

Required helpers:

```ts
listActionCatalogEntries(options?)
getActionCatalogEntry(tool, action)
getActionCatalogEntryById(id)
listActionsForProfile(profile, options?)
listCompactPromptActions(profile, options?)
getRequiredPartitions(tool, action)
getBackendCommands(tool, action)
```

## 6. Compact Initial Prompt

Initial prompt includes:

- compact intent
- first `useWhen`
- first `avoidWhen`
- one-line `miniFewShot`

Initial prompt excludes:

- full schema
- full rules
- full few-shot objects
- backend command details
- result field lists

Create:

```text
packages/ascet-extension/src/tools/actions/prompt.ts
packages/ascet-extension/src/tools/actions/prompt.test.ts
```

Builder:

```ts
export interface BuildCompactActionPromptOptions {
  profile: AscetProfile;
  maxActions?: number;
  includeMiniFewShot?: boolean;
  includeHidden?: boolean;
}

export function buildCompactActionPrompt(options: BuildCompactActionPromptOptions): string[] {
  // Returns one line per action.
}
```

Line format:

```text
ascet_read.read_code: Read complete live code; not for global code search. Use: Need complete current code for a known component or method. Avoid: Need global code search; use ascet_search.text_in_code. Example: ascet_read({action:"read_code",componentPath:"DEMO/PID",methodName:"calc",section:"body"})
```

Global compact ASCET instruction:

```text
ASCET action selection:
- Use ascet_capabilities.search_actions(query) when the required ASCET action is unclear.
- Use ascet_capabilities.describe_action(tool,name,activate=true) before calling an action whose schema is not active.
- Initial compact descriptors are for action selection only; exact schema appears after describe_action.
```

Default initial active tools:

```text
ascet_status
ascet_capabilities
```

Optional compatibility mode may keep existing base tools active, but the target design should move toward schema deferral.

## 7. Full Prompt After Activation

Full prompt is injected only for activated actions.

Create helpers in:

```text
packages/ascet-extension/src/tools/actions/prompt.ts
```

```ts
export function buildActivatedActionPrompt(actionIds: readonly string[]): string[] {
  // Returns full rules, full few-shot, result shape, and schema summary.
}
```

Activated prompt format:

```text
ascet_read.read_code: Read complete live ASCET code.
Rules:
- Live ToolAPI read only.
- Defaults to complete code text.
- Use ascet_search.text_in_code for global code search.
Schema: required action, componentPath; optional methodName, section, detailLevel.
Example: ascet_read({action:"read_code",componentPath:"DEMO/PID",methodName:"calc",section:"body"})
Result: codeText fields component, name, section, text.
```

Do not put activated full prompt into `ascet_capabilities.search_actions` results. `search_actions` remains compact.

## 8. Capabilities API Redesign

Modify:

```text
packages/ascet-extension/src/tools/capabilities.ts
packages/ascet-extension/src/tools/capabilities/definition.ts
packages/ascet-extension/src/tools/capabilities/schema.ts
packages/ascet-extension/src/tools/capabilities.test.ts
```

Replace wide optional params with a discriminated union:

```ts
export type AscetCapabilitiesParams =
  | {
      action: "search_actions";
      query?: string;
      family?: AscetActionFamily;
      risk?: AscetActionRisk;
      tags?: string[];
      profile?: AscetProfile;
      activeOnly?: boolean;
      includeHidden?: boolean;
      limit?: number;
      detailLevel?: "summary" | "schema" | "full";
    }
  | {
      action: "describe_action";
      tool: AscetToolName;
      name: string;
      activate?: boolean;
      detailLevel?: "schema" | "full";
    }
  | {
      action: "activate_actions";
      actions: string[];
    }
  | {
      action: "activate_profile";
      profile: AscetProfile;
    }
  | {
      action: "status";
    };
```

Keep legacy compatibility:

```text
operationQuery -> search_actions.query
action omitted -> search_actions
```

Do not bind `detailLevel="full"` to hidden visibility. Use `includeHidden` only.

### 8.1 search_actions Result

Default result:

```json
{
  "activeProfile": "base",
  "total": 2,
  "items": [
    {
      "tool": "ascet_read",
      "action": "read_code",
      "score": 96,
      "state": "available",
      "family": "read",
      "risk": "read",
      "intent": "Read full current code text from a resolved component or method.",
      "useWhen": "Need complete current code for a known component or method.",
      "avoidWhen": "Need global code search; use ascet_search.text_in_code.",
      "resultShape": "codeText"
    }
  ]
}
```

No schema or full few-shot in summary.

`detailLevel="schema"` adds `schema` and `miniFewShot`.

`detailLevel="full"` adds rules, full few-shots, backend metadata, result fields, and partition requirements.

### 8.2 describe_action Result

```json
{
  "tool": "ascet_read",
  "action": "read_code",
  "state": "activated",
  "schema": {
    "required": ["action", "componentPath"],
    "optional": ["methodName", "section", "detailLevel"]
  },
  "rules": [
    "Live ToolAPI read only.",
    "Defaults to complete code text.",
    "Does not search across the database."
  ],
  "fewShots": [
    {
      "args": {
        "action": "read_code",
        "componentPath": "DEMO/PID",
        "methodName": "calc",
        "section": "body"
      }
    }
  ],
  "result": {
    "shape": "codeText",
    "fields": ["component", "name", "section", "text"]
  }
}
```

If `activate=true`, activate the action and return `state: "activated"`.

Failure:

```json
{
  "error": {
    "code": "ascet_action_not_found",
    "message": "ASCET action ascet_read.foo was not found.",
    "recover": [
      {
        "tool": "ascet_capabilities",
        "action": "search_actions",
        "args": {
          "query": "foo"
        }
      }
    ]
  }
}
```

## 9. Action Search

Create:

```text
packages/ascet-extension/src/tools/actions/search.ts
packages/ascet-extension/src/tools/actions/search.test.ts
```

Search source is `AscetActionCatalog`, not CLI catalog.

Search document fields:

```ts
{
  id,
  tool,
  action,
  title,
  intent,
  aliases,
  tags,
  useWhen,
  avoidWhen,
  promptCompact,
  rules,
  schemaFields,
  resultShape,
  backendCommands
}
```

Hybrid score:

```text
exact id/action          +100
exact alias              +80
alias contains           +60
tag match                +45
BM25 lexical score       +0..50
active profile boost     +20
active tool boost        +10
avoidWhen query penalty  -20
```

Start with a deterministic lexical scorer plus a small BM25 implementation. Do not add embeddings in this phase.

Aliases must cover Chinese and ASCET phrasing:

```text
complete code, full code, method body, read code
code search, text in code, ESDL code search
element declaration, variable definition, declared element
element reference, variable usage, used by
component reference, component used by
method declaration, process declaration
method argument, local element, return element
list diagrams, read block diagram
write method code, set method code
verify readback, check write result
```

Required query tests:

```text
complete code                  -> ascet_read.read_code
read calc method body          -> ascet_read.read_code
code search                    -> ascet_search.text_in_code
where getAt appears            -> ascet_search.text_in_code
element declaration            -> ascet_search.declarations_of_element
element usage                  -> ascet_search.references_to_element
component reference            -> ascet_search.references_to_component
method declaration             -> ascet_search.declarations_of_method_process
method local variables         -> ascet_search.declarations_of_method_process_element
list diagrams                  -> ascet_explore.list_diagrams
read block diagram             -> ascet_read.read_block_diagram
write method code              -> ascet_write.set_method_code
verify write result            -> ascet_verify.readback
```

Acceptance:

```text
top1 >= 90% on selection tests
top3 = 100% on selection tests
confusion pairs do not invert
```

Confusion pairs:

```text
ascet_search.text_in_code vs ascet_read.read_code
ascet_search.declarations_of_element vs ascet_search.references_to_element
ascet_explore.list_diagrams vs ascet_read.read_block_diagram
ascet_explore.inspect_target vs ascet_read.read_code
ascet_read.read_element_dependency vs ascet_read.read_dependent_chain
ascet_search.references_to_component vs ascet_reference.component_refs
ascet_write.set_method_code vs ascet_read.read_code
ascet_verify.readback vs ascet_read.read_code
```

## 10. Activation State

Create:

```text
packages/ascet-extension/src/tools/actions/activation.ts
packages/ascet-extension/src/tools/actions/activation.test.ts
```

Separate profile availability from activation:

```text
profile = which actions are available in the mode
activation = which actions have expanded schema/prompt right now
```

State names:

```text
available       allowed by profile, not expanded yet
activated       schema and full prompt are currently registered
inactive        not allowed by active profile
hidden          internal or hidden
featureDisabled feature flag off
deprecated      use replacement
```

Store:

```ts
interface AscetActionActivationState {
  profile: AscetProfile;
  activatedActionIds: string[];
  activeTools: string[];
}
```

Helpers:

```ts
getActionActivationState()
activateActions(actionIds)
deactivateActions(actionIds)
resetActivatedActionsForProfile(profile)
isActionActivated(tool, action)
resolveCatalogActionState(entry, context)
```

Profile switch behavior:

```text
activate_profile(profile)
  -> update profile
  -> clear activatedActionIds by default
  -> keep only ascet_status and ascet_capabilities active
  -> rebuild compact descriptors for new profile
```

Optional compatibility mode may preserve still-available activated actions, but default should clear them for predictable context.

## 11. Schema Deferral

Create:

```text
packages/ascet-extension/src/tools/actions/schema.ts
packages/ascet-extension/src/tools/actions/schema.test.ts
```

Goal:

```text
Before activation:
  model cannot see full canonical tool schemas.

After activation:
  model sees only schemas for activated actions.
```

Functions:

```ts
buildPrunedToolParameters(toolName, actionIds)
buildPrunedToolDefinition(baseTool, actionIds, promptGuidelines)
groupActivatedActionsByTool(actionIds)
```

Example:

If activated:

```text
ascet_read.read_code
```

then `ascet_read.parameters` is:

```ts
Type.Object({
  action: Type.Literal("read_code"),
  componentPath: Type.String(),
  methodName: Type.Optional(Type.String()),
  section: Type.Optional(...),
  detailLevel: Type.Optional(...)
})
```

If activated:

```text
ascet_read.read_code
ascet_read.read_block_diagram
```

then `ascet_read.parameters` is:

```ts
Type.Union([readCodeSchema, readBlockDiagramSchema])
```

Do not expose unactivated branches.

Implementation note:

- Catalog entries should carry their action schema branch.
- Existing `schema.ts` files may still export canonical unions for compatibility.
- Pruned schema builder must use catalog branch schemas.

## 12. Exposure Controller Changes

Modify:

```text
packages/ascet-extension/src/tools/exposure/controller.ts
packages/ascet-extension/src/tools/exposure/profiled-tools.ts
packages/ascet-extension/src/index.ts
```

Current controller activates tools by profile. New controller must activate actions.

Startup:

```text
register ascet_status
register ascet_capabilities
setActiveTools(nonAscet + ascet_status + ascet_capabilities)
inject compact action descriptors for default profile
```

Action activation:

```text
describe_action(activate=true)
  -> activateActions([id])
  -> build pruned tool definitions grouped by tool
  -> registerTool(prunedTool)
  -> setActiveTools(nonAscet + ascet_status + ascet_capabilities + activated tool names)
```

Prompt building:

```text
ascet_status / ascet_capabilities:
  compact action descriptors for active profile

activated domain tool:
  full prompt for activated actions in that tool only
```

Keep non-ASCET tools:

```ts
const current = pi.getActiveTools?.() ?? [];
const nonAscet = current.filter((name) => !allAscetToolNameSet.has(name));
pi.setActiveTools([...new Set([...nonAscet, ...ascetCoreTools, ...activatedToolNames])]);
```

If `setActiveTools` is unavailable:

- still return `describe_action` schema and prompt in tool result;
- still enforce runtime guard;
- mark `activationMode: "describe_only"` in capabilities details.

## 13. Runtime Guard

Modify:

```text
packages/ascet-extension/src/tools/actions/guard.ts
packages/ascet-extension/src/core/tool.ts
```

Guard logic:

```text
hidden/internal/feature-disabled -> reject
profile-inactive -> reject with activate_profile recover
available but not activated -> reject with describe_action activate=true recover
activated -> allow
```

Error:

```json
{
  "error": {
    "code": "ascet_action_inactive",
    "message": "ascet_read.read_block_diagram is not activated.",
    "recover": [
      {
        "tool": "ascet_capabilities",
        "action": "describe_action",
        "args": {
          "tool": "ascet_read",
          "name": "read_block_diagram",
          "activate": true
        }
      }
    ]
  }
}
```

Do not rely on schema pruning alone.

## 14. Result Contract

Model-facing success responses:

- no `ok: true`
- no `error: null`
- no `meta`
- no echoed input unless normalized/canonicalized
- camelCase fields
- slash-normalized paths
- compact by default

Failure:

```json
{
  "error": {
    "code": "...",
    "message": "...",
    "recover": []
  }
}
```

Capabilities success:

```json
{
  "activeProfile": "base",
  "total": 1,
  "items": []
}
```

Describe success:

```json
{
  "tool": "ascet_read",
  "action": "read_code",
  "state": "activated",
  "schema": {},
  "rules": [],
  "fewShots": [],
  "result": {}
}
```

## 15. CLI Catalog Integration

Do not search CLI catalog first.

New flow:

```text
query
  -> search AscetActionCatalog
  -> attach backend metadata from cli-catalog.json by backendCommands
  -> return action result
```

Backend metadata to attach only in `detailLevel="full"`:

```text
backendCommands
lane
hostEligible
supportsJson
supportsBatch
argumentEnums
logicalCommandId
coverageCategory
```

Do not show `AscetReadTextCode` as the primary result when the real action is `ascet_read.read_code`.

## 16. Migration Phases

### Phase 1: Catalog Foundation

Files:

```text
src/tools/actions/catalog.ts
src/tools/actions/catalog.test.ts
src/tools/actions/descriptors.ts
```

Tasks:

- Add catalog types and helpers.
- Add entries for `ascet_status`, `ascet_capabilities`, `ascet_search`, `ascet_explore`, and `ascet_read`.
- Keep `descriptors.ts` as a facade.
- Add integrity tests.

Acceptance:

- Every public action has compact prompt, mini few-shot, schema branch, result shape, profiles, and visibility.

### Phase 2: Action Search

Files:

```text
src/tools/actions/search.ts
src/tools/actions/search.test.ts
src/tools/capabilities.ts
```

Tasks:

- Implement deterministic + BM25 action search.
- Add `search_actions`.
- Keep legacy `operationQuery` mapping to `search_actions.query`.
- Add selection tests.

Acceptance:

- Required query tests hit correct top1/top3.
- CLI command names do not dominate action result shape.

### Phase 3: Describe Action

Files:

```text
src/tools/capabilities.ts
src/tools/actions/catalog.ts
src/tools/capabilities.test.ts
```

Tasks:

- Add `describe_action`.
- Return schema summary, rules, full few-shots, result shape.
- Add `activate` parameter but initially allow describe-only implementation.

Acceptance:

- `describe_action` gives enough information to call the target action.

### Phase 4: Compact Prompt

Files:

```text
src/tools/actions/prompt.ts
src/tools/actions/prompt.test.ts
src/tools/instructions/registry.ts
src/tools/status/prompt.ts
src/tools/capabilities/prompt.ts
src/tools/prompt.test.ts
```

Tasks:

- Generate compact descriptors from catalog.
- Remove full few-shots from initial prompt.
- Keep one-line mini few-shot in compact prompt.
- Ensure hidden/internal actions are excluded.

Acceptance:

- Initial prompt contains compact descriptors only.
- Full action rules/few-shots are absent before activation.

### Phase 5: Activation Store

Files:

```text
src/tools/actions/activation.ts
src/tools/actions/activation.test.ts
src/tools/exposure/state.ts
src/tools/exposure/controller.ts
```

Tasks:

- Add `activatedActionIds`.
- Add `activate_actions`.
- Make `describe_action(activate=true)` update activation state.
- Preserve non-ASCET active tools.

Acceptance:

- Activation state distinguishes available vs activated.

### Phase 6: Pruned Schema Registration

Files:

```text
src/tools/actions/schema.ts
src/tools/actions/schema.test.ts
src/tools/exposure/profiled-tools.ts
src/tools/exposure/controller.ts
```

Tasks:

- Build pruned schemas from activated catalog entries.
- Register pruned tool definitions.
- Active domain tool exposes only activated action branches.

Acceptance:

- Activating one action exposes only that action schema for the tool.

### Phase 7: Runtime Guard

Files:

```text
src/tools/actions/guard.ts
src/core/tool.ts
src/tools/actions/guard.test.ts
```

Tasks:

- Reject unactivated actions.
- Return structured recover steps.
- Keep hidden/internal/feature-disabled rejection.

Acceptance:

- Manual stale calls cannot bypass activation.

### Phase 8: Expand Catalog Coverage

Files:

```text
src/tools/actions/catalog.ts
src/tools/reference/schema.ts
src/tools/diff/schema.ts
src/tools/write.ts
src/tools/verify.ts
src/tools/recover.ts
```

Tasks:

- Add `ascet_reference`, `ascet_diff`, `ascet_write`, `ascet_verify`, `ascet_component_editable`, `ascet_recover`, `ascet_scheduler_status`.
- Convert reference/diff schemas to discriminated unions if not already done.
- Add write action prompt compact/full separation.

Acceptance:

- All canonical ASCET actions are searchable and describable.

### Phase 9: JSON And Live Verification

Files:

```text
src/tool-response-contract.ts
src/tools/action-contract-snapshots.test.ts
scripts/ascet-extension-deferred-action-live-smoke.ts
```

Tasks:

- Add snapshot tests for `search_actions`, `describe_action`, inactive guard, and activated call result.
- Add focused live smoke:
  - `ascet_status`
  - `search_actions("complete code")`
  - `describe_action(ascet_read, read_code, activate=true)`
  - `ascet_read.read_code`
  - `search_actions("code search")`
  - `describe_action(ascet_search, text_in_code, activate=true)`
  - `ascet_search.text_in_code`

Acceptance:

- Deferred flow works against a live ASCET session.

## 17. Test Plan

Run focused unit tests:

```powershell
npx tsx --test `
  packages/ascet-extension/src/tools/actions/catalog.test.ts `
  packages/ascet-extension/src/tools/actions/search.test.ts `
  packages/ascet-extension/src/tools/actions/prompt.test.ts `
  packages/ascet-extension/src/tools/actions/activation.test.ts `
  packages/ascet-extension/src/tools/actions/schema.test.ts `
  packages/ascet-extension/src/tools/actions/guard.test.ts `
  packages/ascet-extension/src/tools/capabilities.test.ts `
  packages/ascet-extension/src/tools/prompt.test.ts
```

Run contract tests:

```powershell
npx tsx --test `
  packages/ascet-extension/src/tool-response-contract.test.ts `
  packages/ascet-extension/src/tools/action-contract-snapshots.test.ts
```

Run live smoke only when ASCET GUI and ToolAPI are available:

```powershell
npx tsx packages/ascet-extension/scripts/ascet-extension-deferred-action-live-smoke.ts
```

## 18. Required Regression Cases

Action selection:

```text
complete code -> ascet_read.read_code
read calc method body -> ascet_read.read_code
code search -> ascet_search.text_in_code
where getAt appears -> ascet_search.text_in_code
element declaration -> ascet_search.declarations_of_element
element usage -> ascet_search.references_to_element
component reference -> ascet_search.references_to_component
method declaration -> ascet_search.declarations_of_method_process
method local variables -> ascet_search.declarations_of_method_process_element
list diagrams -> ascet_explore.list_diagrams
read block diagram -> ascet_read.read_block_diagram
write method code -> ascet_write.set_method_code
verify write result -> ascet_verify.readback
```

Prompt:

```text
initial prompt includes compact descriptors
initial prompt includes mini few-shot
initial prompt does not include full rules
initial prompt does not include full few-shot objects
initial prompt does not include full schema
activated prompt includes full rules and full few-shot for activated actions only
```

Schema:

```text
startup active tools do not expose full domain schemas
activating ascet_read.read_code exposes only read_code schema
activating two actions in one tool exposes exactly two schema branches
profile switch clears activated schemas by default
```

Guard:

```text
available but unactivated action returns describe_action recover
profile-inactive action returns activate_profile recover
hidden action returns hidden error
feature-disabled batch write returns feature-disabled error
```

JSON:

```text
success has no ok/error/meta
failure has only error
paths are slash-normalized
empty search is { total: 0, items: [] }
```

## 19. Risks And Decisions

### 19.1 PI Tool Schema Hot Refresh

Risk:

```text
registerTool/setActiveTools may not affect the current provider request immediately.
```

Decision:

```text
Accept next-turn activation semantics.
describe_action returns schema/few-shot immediately so the model can still reason in the current turn.
```

### 19.2 Meta Tool Proxy

Avoid implementing:

```text
ascet_capabilities.call_action
```

Reason:

```text
It centralizes all permissions and type safety into one meta tool and makes write safety harder to audit.
```

### 19.3 Embedding Search

Do not add embeddings in this phase.

Reason:

```text
Action count is small, aliases are controllable, and deterministic tests matter more than semantic novelty.
```

### 19.4 Prompt Cache

Keep compact prompt stable.

Rules:

```text
No random prompt noise.
No per-result long prompt injection.
Profile activation and action activation are explicit cache boundary events.
```

## 20. Definition Of Done

- `AscetActionCatalog` is the action metadata source of truth.
- Initial context exposes compact descriptors and one-line mini few-shots only.
- Full schema, full rules, and full few-shots appear only through `describe_action` or activated tool definitions.
- `ascet_capabilities.search_actions` is action-first.
- `ascet_capabilities.describe_action` returns exact schema summary, full rules, full few-shots, and result shape.
- `describe_action(activate=true)` activates the action.
- Activated tool schemas are pruned to activated action branches.
- Runtime guard rejects unactivated actions with structured recovery.
- CLI catalog is backend metadata only.
- Selection tests meet top1/top3 acceptance.
- Model-facing JSON remains compact and recovery-oriented.
- Focused live smoke proves the deferred flow on a real ASCET session.

