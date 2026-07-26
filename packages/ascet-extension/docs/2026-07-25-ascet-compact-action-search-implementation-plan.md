# ASCET Compact Action Search Implementation Plan

## 1. Goal

Implement a simple, robust ASCET tool action discovery system:

```text
Extension startup
  -> inject compact descriptors for every public ASCET action
  -> include one-line miniFewShot per action
  -> include explicit guidance to call ascet_capabilities.search_actions when unsure

Runtime
  -> ascet_capabilities.search_actions(query)
  -> search ActionCatalog, not CLI catalog
  -> return full schema/rules/fewShot/resultShape for matched actions

Tool execution
  -> model calls normal ASCET tools directly
  -> existing canonical tool schemas remain registered
  -> existing runtime hidden/internal guard remains
```

This plan intentionally does **not** implement dynamic action activation, pruned tool schemas, or schema hot swapping. Those can be revisited later if compact descriptors plus `search_actions` are not enough.

## 2. Design Summary

The core idea:

```text
Initial prompt gives action selection hints.
search_actions gives action calling details.
Actual ASCET tools remain normal PI tools.
```

Initial prompt:

```text
ASCET action guide:
Use these compact descriptors to choose an ASCET action. If the right action is unclear, call:
ascet_capabilities({action:"search_actions",query:"...",limit:3})

Search:
- ascet_search.text_in_code: search ESDL/C snippets; not full code. Ex: ascet_search({action:"text_in_code",query:"getAt",limit:20})

Read:
- ascet_read.read_code: read complete live code; not global search. Ex: ascet_read({action:"read_code",componentPath:"DEMO/PID",methodName:"calc",section:"body"})
```

Expanded lookup:

```json
{
  "action": "search_actions",
  "query": "complete code",
  "limit": 3
}
```

Returns:

```json
{
  "total": 1,
  "items": [
    {
      "tool": "ascet_read",
      "action": "read_code",
      "intent": "Read full current code text from a resolved component or method.",
      "useWhen": "Need complete current code for a known component or method.",
      "avoidWhen": "Need global code search; use ascet_search.text_in_code.",
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
  ]
}
```

## 3. Explicitly Out Of Scope

Do not implement these in this phase:

- `activate_actions`
- `describe_action`
- action activation state
- pruned schema registration
- same-name tool schema hot swap
- hidden domain tools at startup
- a generic `call_action` proxy
- embedding/vector search
- runtime prompt injection from ordinary tool results

Keep this phase small:

```text
ActionCatalog
CompactActionGuide
ActionSearch
ascet_capabilities.search_actions
tests
```

## 4. Non-Negotiable Rules

- Search target is a tool action, not a CLI command.
- `cli-catalog.json` is backend metadata only.
- Initial compact guide includes all public ASCET actions.
- Initial compact guide includes `compact + miniFewShot` only.
- Initial compact guide does not include full schemas, full rules, full few-shot objects, backend command details, or result field lists.
- `search_actions` returns full schema summary, rules, fewShot, and result shape for matched actions.
- `search_actions` success output is compact JSON with no `ok`, `error:null`, or `meta`.
- `search_actions` must support exact action id lookup such as `ascet_read.read_code`.
- Keep `ascet_read.read_code` live-only and defaulting to full live text.
- Keep `ascet_search.text_in_code` snippet-only by default.
- Keep paths slash-normalized in model-facing JSON.

## 5. Target Files

Create:

```text
packages/ascet-extension/src/tools/actions/catalog.ts
packages/ascet-extension/src/tools/actions/catalog.test.ts
packages/ascet-extension/src/tools/actions/compact-prompt.ts
packages/ascet-extension/src/tools/actions/compact-prompt.test.ts
packages/ascet-extension/src/tools/actions/search.ts
packages/ascet-extension/src/tools/actions/search.test.ts
```

Modify:

```text
packages/ascet-extension/src/tools/capabilities.ts
packages/ascet-extension/src/tools/capabilities/definition.ts
packages/ascet-extension/src/tools/capabilities/schema.ts
packages/ascet-extension/src/tools/capabilities.test.ts
packages/ascet-extension/src/tools/instructions/registry.ts
packages/ascet-extension/src/tools/status/prompt.ts
packages/ascet-extension/src/tools/capabilities/prompt.ts
packages/ascet-extension/src/tools/prompt.test.ts
```

Optional compatibility modifications:

```text
packages/ascet-extension/src/tools/actions/descriptors.ts
packages/ascet-extension/src/tools/_shared/action-examples.ts
```

## 6. ActionCatalog

`AscetActionCatalog` is the source of truth for action discovery and prompt generation.

### 6.1 Catalog Entry

```ts
export type AscetActionFamily =
  | "ops"
  | "explore"
  | "search"
  | "read"
  | "reference"
  | "diff"
  | "write"
  | "verify";

export type AscetActionRisk = "read" | "diff" | "write" | "ops";
export type AscetActionVisibility = "public" | "internal" | "hidden";

export interface AscetActionCatalogEntry {
  id: string;
  tool: string;
  action: string;

  family: AscetActionFamily;
  risk: AscetActionRisk;
  visibility: AscetActionVisibility;
  profiles: readonly string[];
  featureFlag?: string;
  deprecatedBy?: string;

  compact: string;
  miniFewShot: string;

  intent: string;
  useWhen: readonly string[];
  avoidWhen: readonly string[];
  aliases: readonly string[];
  tags: readonly string[];
  nextActions?: readonly string[];

  schema: {
    required: readonly string[];
    optional: readonly string[];
    enums?: Readonly<Record<string, readonly string[]>>;
  };

  rules: readonly string[];
  fewShots: readonly Array<{
    args: Readonly<Record<string, unknown>>;
  }>;

  result: {
    shape: string;
    fields: readonly string[];
  };

  requiresPartitions?: readonly string[];
  backendCommands?: readonly string[];
}
```

### 6.2 Example Entries

`ascet_read.read_code`:

```ts
{
  id: "ascet_read.read_code",
  tool: "ascet_read",
  action: "read_code",
  family: "read",
  risk: "read",
  visibility: "public",
  profiles: ["base", "advanced-read", "reference", "diff", "verify", "write-preflight"],
  compact: "read complete live code; not global code search",
  miniFewShot: "ascet_read({action:\"read_code\",componentPath:\"DEMO/PID\",methodName:\"calc\",section:\"body\"})",
  intent: "Read full current code text from a resolved component or method.",
  useWhen: ["Need complete current code for a known component or method."],
  avoidWhen: ["Need to find where code appears globally; use ascet_search.text_in_code."],
  aliases: ["complete code", "full code", "method body", "live code", "read code"],
  tags: ["read", "code", "live", "method"],
  nextActions: ["ascet_write.set_method_code", "ascet_diff.diff_method"],
  schema: {
    required: ["action", "componentPath"],
    optional: ["methodName", "section", "detailLevel"],
    enums: {
      section: ["body", "header", "external-c", "all"],
      detailLevel: ["summary", "topology", "full"]
    }
  },
  rules: [
    "Live ToolAPI read only.",
    "Defaults to complete code text.",
    "Does not search across the database."
  ],
  fewShots: [
    {
      args: {
        action: "read_code",
        componentPath: "DEMO/PID",
        methodName: "calc",
        section: "body"
      }
    }
  ],
  result: {
    shape: "codeText",
    fields: ["component", "name", "section", "text"]
  },
  backendCommands: ["AscetReadTextCode"]
}
```

`ascet_search.text_in_code`:

```ts
{
  id: "ascet_search.text_in_code",
  tool: "ascet_search",
  action: "text_in_code",
  family: "search",
  risk: "read",
  visibility: "public",
  profiles: ["base", "advanced-read", "reference", "diff", "verify", "write-preflight"],
  compact: "search ESDL/C snippets; not full code",
  miniFewShot: "ascet_search({action:\"text_in_code\",query:\"getAt\",limit:20})",
  intent: "Find where a code snippet appears in ESDL or C code.",
  useWhen: ["Need to locate occurrences of a code expression."],
  avoidWhen: ["Need complete current method code; use ascet_read.read_code."],
  aliases: ["code search", "text in code", "ESDL code search", "C code search"],
  tags: ["search", "code", "snippet", "esdl", "c"],
  schema: {
    required: ["action", "query"],
    optional: ["componentPath", "scopePath", "methodName", "section", "match", "limit", "cursor"],
    enums: {
      section: ["auto", "body", "all", "header", "external-c"],
      match: ["exact", "glob", "contains"]
    }
  },
  rules: [
    "Returns snippet matches only.",
    "Does not return complete code text.",
    "Use ascet_read.read_code for complete live code."
  ],
  fewShots: [
    {
      args: {
        action: "text_in_code",
        query: "getAt",
        limit: 20
      }
    }
  ],
  result: {
    shape: "snippetList",
    fields: ["component", "section", "name", "lineNumber", "snippet", "path"]
  },
  requiresPartitions: ["text_code"],
  backendCommands: ["AscetReadTextCode", "AscetWarmSearchIndex"]
}
```

### 6.3 Helpers

```ts
export function listActionCatalogEntries(options?: {
  includeHidden?: boolean;
  includeInternal?: boolean;
}): AscetActionCatalogEntry[];

export function getActionCatalogEntry(tool: string, action: string): AscetActionCatalogEntry | undefined;

export function getActionCatalogEntryById(id: string): AscetActionCatalogEntry | undefined;

export function listPublicActionCatalogEntries(): AscetActionCatalogEntry[];

export function listCompactPromptActions(): AscetActionCatalogEntry[];
```

### 6.4 Initial Coverage

Phase 1 must include all public actions currently exposed by registry:

```text
ascet_status.default
ascet_capabilities.search_actions
ascet_explore.list_components
ascet_explore.list_diagrams
ascet_explore.inspect_target
ascet_explore.preview_children
ascet_search.search_components
ascet_search.resolve_component
ascet_search.search_elements
ascet_search.declarations_of_element
ascet_search.declarations_of_method_process
ascet_search.declarations_of_method_process_element
ascet_search.references_to_component
ascet_search.references_to_element
ascet_search.senders_of_message
ascet_search.receivers_of_message
ascet_search.text_in_code
ascet_read.read_code
ascet_read.read_method_signature
ascet_read.read_implementation
ascet_read.read_block_diagram
ascet_read.read_state_machine_flow
ascet_read.read_dependent_chain
ascet_read.read_element_dependency
ascet_reference.component_refs
ascet_reference.used_by
ascet_reference.element_refs
ascet_diff.diff
ascet_diff.diff_method
ascet_diff.diff_component_snapshot
ascet_diff.diff_state_machine_domain
ascet_diff.diff_element_spec
ascet_diff.diff_project_formulas
ascet_write.create_folder
ascet_write.create_component
ascet_write.create_method
ascet_write.set_method_signature
ascet_write.delete_component
ascet_write.delete_method
ascet_write.delete_folder
ascet_write.set_method_code
ascet_write.set_module_code
ascet_write.set_state_machine_code
ascet_write.set_enumerators
ascet_write.apply_element_spec
ascet_write.apply_project_formula
ascet_write.set_element_dependency
ascet_component_editable.check
ascet_component_editable.set
ascet_verify.readback
ascet_recover.status
ascet_recover.clear_extension_temp
ascet_recover.scheduler_status
ascet_recover.scheduler_recover
ascet_recover.clear_stale_cli_lock
ascet_scheduler_status.status
ascet_scheduler_status.recover
```

Internal/hidden actions are cataloged but excluded from compact prompt by default:

```text
ascet_search.search_occurrences
ascet_search.search_text_code
ascet_batch_write.*
```

## 7. Compact Prompt Builder

Create:

```text
packages/ascet-extension/src/tools/actions/compact-prompt.ts
```

### 7.1 Builder API

```ts
export interface BuildCompactActionGuideOptions {
  includeHidden?: boolean;
  groupByFamily?: boolean;
  maxLineLength?: number;
}

export function buildCompactActionGuide(options?: BuildCompactActionGuideOptions): string[] {
  // returns promptGuidelines lines
}
```

### 7.2 Header

Always include this guide line:

```text
Use these compact ASCET action descriptors to choose a tool action. If the right ASCET action is unclear or parameters are uncertain, call ascet_capabilities({action:"search_actions",query:"...",limit:3}) to get full schema, rules, and fewShot.
```

### 7.3 Action Line Format

```text
- ascet_read.read_code: read complete live code; not global code search. Ex: ascet_read({action:"read_code",componentPath:"DEMO/PID",methodName:"calc",section:"body"})
```

The line must include only:

```text
id
compact
miniFewShot
```

Do not include:

```text
schema
rules
full fewShots
result fields
backend commands
partition details
```

### 7.4 Grouping

Group by family to improve scanning:

```text
ASCET Search actions:
- ascet_search.text_in_code: ...

ASCET Read actions:
- ascet_read.read_code: ...
```

Family order:

```text
ops
explore
search
read
reference
diff
write
verify
```

### 7.5 Injection Point

Inject compact guide into one place to avoid duplicated prompt:

Preferred:

```text
ascet_capabilities.promptGuidelines
```

Reason:

```text
ascet_capabilities is the discovery tool. Keeping the action guide there makes the prompt purpose explicit.
```

Alternative:

```text
global before_agent_start ASCET action guide
```

Avoid injecting the full guide into every ASCET tool prompt.

## 8. ascet_capabilities.search_actions

Modify:

```text
packages/ascet-extension/src/tools/capabilities.ts
packages/ascet-extension/src/tools/capabilities/schema.ts
packages/ascet-extension/src/tools/capabilities/definition.ts
```

### 8.1 Parameters

```ts
export interface AscetCapabilitiesParams {
  action: "search_actions";
  query?: string;
  tool?: string;
  name?: string;
  includeHidden?: boolean;
  limit?: number;
  detailLevel?: "summary" | "full";
}
```

Compatibility:

```text
No legacy capabilities action compatibility.
Do not expose backend CLI catalog search through ascet_capabilities.
Do not expose activate_profile through ascet_capabilities.
```

Recommended final:

```text
search_actions is the only ascet_capabilities action
```

### 8.2 Search Actions Output

`search_actions` returns full action details by default:

```json
{
  "total": 1,
  "items": [
    {
      "tool": "ascet_search",
      "action": "text_in_code",
      "score": 94,
      "family": "search",
      "risk": "read",
      "intent": "Find where a code snippet appears in ESDL or C code.",
      "useWhen": "Need to locate occurrences of a code expression.",
      "avoidWhen": "Need complete current method code; use ascet_read.read_code.",
      "schema": {
        "required": ["action", "query"],
        "optional": ["componentPath", "scopePath", "methodName", "section", "match", "limit", "cursor"],
        "enums": {
          "section": ["auto", "body", "all", "header", "external-c"],
          "match": ["exact", "glob", "contains"]
        }
      },
      "rules": [
        "Returns snippet matches only.",
        "Does not return complete code text.",
        "Use ascet_read.read_code for complete live code."
      ],
      "fewShots": [
        {
          "args": {
            "action": "text_in_code",
            "query": "getAt",
            "limit": 20
          }
        }
      ],
      "result": {
        "shape": "snippetList",
        "fields": ["component", "section", "name", "lineNumber", "snippet", "path"]
      }
    }
  ]
}
```

Empty result:

```json
{
  "total": 0,
  "items": []
}
```

Failure:

```json
{
  "error": {
    "code": "ascet_capabilities_search_failed",
    "message": "..."
  }
}
```

### 8.3 Exact Lookup

Support these exact lookup forms:

```json
{ "action": "search_actions", "query": "ascet_read.read_code" }
```

```json
{ "action": "search_actions", "tool": "ascet_read", "name": "read_code" }
```

Exact lookup should return the exact action with score `100` or higher.

## 9. Action Search

Create:

```text
packages/ascet-extension/src/tools/actions/search.ts
```

### 9.1 Query Normalization

Normalize:

```text
lowercase
trim
replace backslashes with slashes only for path-like fragments
split snake_case and dot action ids into tokens
preserve full id exact match
```

### 9.2 Scoring

Use deterministic lexical scoring first.

Recommended score:

```text
exact id match              +120
exact tool/action match     +110
exact action match          +90
exact alias match           +80
alias contains              +60
id/action contains          +55
tag match                   +45
intent/useWhen token match  +35
compact token match         +30
schema field match          +25
rule token match            +20
backend command match       +10
```

Add BM25 later only if tests show weak selection. For initial implementation, deterministic scoring plus aliases is enough.

### 9.3 Aliases

Aliases are the main way to support Chinese and domain vocabulary.

Required aliases:

```text
complete code, full code, method body, read code
code search, text in code, ESDL code search, C code search
element declaration, element definition, variable definition
element reference, element usage, variable usage
component reference, component used by
method declaration, process declaration
method local variables, method arguments, return element
list diagrams, browse diagrams
read block diagram, BDE wiring, signal flow
write method code, set method code
verify readback, check write result
```

If Chinese aliases are accepted in source files later, add:

```text
完整代码, 读取代码, 方法代码
代码搜索, 搜代码
变量定义, 元素声明
变量引用, 元素使用
组件引用
方法定义
局部变量
列出图
读取图
写方法代码
写完验证
```

Current file encoding is ASCII by default, so Chinese aliases can be added only if the team accepts non-ASCII in catalog data. Otherwise keep English aliases and add Chinese tests later through external fixtures.

### 9.4 Search API

```ts
export interface SearchActionsParams {
  query?: string;
  tool?: string;
  name?: string;
  family?: AscetActionFamily;
  risk?: AscetActionRisk;
  tags?: string[];
  includeHidden?: boolean;
  limit?: number;
}

export interface SearchActionResultItem {
  entry: AscetActionCatalogEntry;
  score: number;
  reasons: string[];
}

export function searchActions(params: SearchActionsParams): SearchActionResultItem[];
```

Default limit:

```text
3
```

Maximum limit:

```text
20
```

## 10. Prompt Optimization

### 10.1 Initial Prompt

Initial prompt should include all public action compact descriptors.

Token discipline:

```text
one line per action
max around 160-220 chars per action
no full schema
no full rules
no result fields
no backend commands
```

### 10.2 Tool Prompt Placement

Preferred prompt ownership:

```text
ascet_capabilities prompt:
  action guide and search_actions instruction

individual tool prompts:
  only short tool-level rules
```

This avoids repeated action guide lines across every tool.

### 10.3 Full Details

Full details only come from:

```text
ascet_capabilities.search_actions
```

Do not inject full details into initial prompt.

### 10.4 Prompt Tests

Tests must assert:

```text
all public actions appear once in compact guide
compact guide contains miniFewShot
compact guide includes search_actions guidance
compact guide does not include schema required/optional arrays
compact guide does not include rules arrays
compact guide does not include result fields
hidden/internal actions do not appear
```

## 11. Capabilities And CLI Catalog

Current capabilities searches CLI catalog. This plan changes primary search to action catalog.

New relationship:

```text
ActionCatalog is the search source.
CLI catalog is optional backend metadata.
```

`search_actions` should not return backend command details by default.

If backend metadata is needed later:

```json
{
  "action": "search_backend_commands",
  "query": "read_text_code"
}
```

or:

```json
{
  "action": "search_actions",
  "query": "read code",
  "includeBackend": true
}
```

Do not overload `detailLevel="full"` to expose hidden/internal actions.

## 12. Migration Plan

### Phase 1: Catalog

Goal:

```text
Create ActionCatalog covering every public ASCET action.
```

Tasks:

- Create `catalog.ts`.
- Add entries for all public actions.
- Add internal/hidden entries for `search_occurrences`, `search_text_code`, and `ascet_batch_write`.
- Add catalog integrity tests.

Acceptance:

- Every registry public action has a catalog entry.
- Every catalog public action has compact, miniFewShot, intent, useWhen, avoidWhen, aliases, schema, rules, fewShots, result.
- Hidden/internal actions are excluded by default.

### Phase 2: Compact Prompt

Goal:

```text
Initial prompt exposes compact action descriptors for all public actions.
```

Tasks:

- Create `compact-prompt.ts`.
- Add family grouping.
- Inject compact guide into `ascet_capabilities` prompt.
- Remove or avoid duplicate action guide injection elsewhere.
- Add prompt tests.

Acceptance:

- Compact prompt contains all public actions.
- Compact prompt contains search_actions guidance.
- Compact prompt does not contain full details.

### Phase 3: Action Search

Goal:

```text
search_actions returns full action details from ActionCatalog.
```

Tasks:

- Create `search.ts`.
- Implement exact lookup and deterministic scorer.
- Implement `ascet_capabilities.search_actions`.
- Keep old capabilities search temporarily.
- Add search tests.

Acceptance:

- Exact id lookup works.
- Tool/action lookup works.
- Intent queries return correct top results.

### Phase 4: Capabilities Contract

Goal:

```text
capabilities output is compact, stable, and action-first.
```

Tasks:

- Update formatter.
- Ensure `search_actions` success has `{total,items}`.
- Ensure failure has `{error}` only.
- Ensure no input echo unless normalized.
- Add contract tests.

Acceptance:

- Model-facing JSON follows ASCET response contract.

### Phase 5: Compatibility Cleanup

Goal:

```text
Reduce drift between old descriptors/instructions/examples and ActionCatalog.
```

Tasks:

- Make descriptors facade read from catalog where practical.
- Make instruction registry read from catalog where practical.
- Keep `_shared/action-examples.ts` only as compatibility or remove duplicates.
- Update tests.

Acceptance:

- No duplicated action prompt truth for migrated actions.

## 13. Required Tests

### 13.1 Catalog Integrity

File:

```text
packages/ascet-extension/src/tools/actions/catalog.test.ts
```

Assertions:

```text
every public registry action has catalog entry
every catalog id is unique
tool.action equals id
public entries have compact
public entries have miniFewShot
public entries have intent/useWhen/avoidWhen
public entries have schema
public entries have rules/fewShots
public entries have result shape
hidden/internal entries excluded by listPublicActionCatalogEntries()
```

### 13.2 Compact Prompt

File:

```text
packages/ascet-extension/src/tools/actions/compact-prompt.test.ts
```

Assertions:

```text
guide includes search_actions guidance
guide includes every public action id
guide includes miniFewShot text
guide excludes search_occurrences
guide excludes ascet_batch_write unless includeHidden
guide does not include "required:"
guide does not include "optional:"
guide does not include "Result:"
guide does not include backend command ids
```

### 13.3 Action Search

File:

```text
packages/ascet-extension/src/tools/actions/search.test.ts
```

Required queries:

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

Acceptance:

```text
top1 >= 90%
top3 = 100%
```

### 13.4 Capabilities

File:

```text
packages/ascet-extension/src/tools/capabilities.test.ts
```

Assertions:

```text
search_actions exact id returns one high-score item
search_actions query returns full schema/rules/fewShots
search_actions excludes hidden by default
search_actions includeHidden includes hidden/internal entries
operationQuery is not exposed
activate_profile is not exposed
```

### 13.5 Prompt Integration

File:

```text
packages/ascet-extension/src/tools/prompt.test.ts
```

Assertions:

```text
ascet_capabilities prompt includes compact guide
individual tool prompts do not duplicate full action guide
read_code compact says complete live code
text_in_code compact says snippets, not full code
```

## 14. Verification Commands

Focused tests:

```powershell
npx tsx --test `
  packages/ascet-extension/src/tools/actions/catalog.test.ts `
  packages/ascet-extension/src/tools/actions/compact-prompt.test.ts `
  packages/ascet-extension/src/tools/actions/search.test.ts `
  packages/ascet-extension/src/tools/capabilities.test.ts `
  packages/ascet-extension/src/tools/prompt.test.ts
```

Optional broader extension tests:

```powershell
npx tsx --test packages/ascet-extension/src/**/*.test.ts
```

No live ASCET test is required for this phase because no ToolAPI behavior changes. Live smoke is optional after the catalog/search path is stable.

## 15. Goal Mode Development Plan

Use separate goal-mode objectives to avoid scope drift.

### Goal 1: ActionCatalog Foundation

Objective:

```text
Create ActionCatalog covering all public ASCET actions and integrity tests.
```

Allowed files:

```text
src/tools/actions/catalog.ts
src/tools/actions/catalog.test.ts
```

Done when:

```text
catalog integrity tests pass
all public actions have entries
hidden/internal excluded by default
```

Do not modify capabilities or prompts in this goal.

### Goal 2: Compact Prompt Guide

Objective:

```text
Generate compact action guide with all public action compact descriptors and miniFewShots.
```

Allowed files:

```text
src/tools/actions/compact-prompt.ts
src/tools/actions/compact-prompt.test.ts
src/tools/capabilities/prompt.ts
src/tools/prompt.test.ts
```

Done when:

```text
capabilities prompt includes compact guide
guide contains all public action ids
guide excludes full schema/rules/result fields
```

Do not modify search scoring in this goal.

### Goal 3: search_actions

Objective:

```text
Implement action-first search_actions returning full schema/rules/fewShot/result details.
```

Allowed files:

```text
src/tools/actions/search.ts
src/tools/actions/search.test.ts
src/tools/capabilities.ts
src/tools/capabilities/schema.ts
src/tools/capabilities/definition.ts
src/tools/capabilities.test.ts
```

Done when:

```text
exact id lookup works
intent queries pass top1/top3 tests
search_actions returns full action details
legacy capabilities behavior remains compatible or explicitly routed
```

Do not implement activation or schema pruning in this goal.

### Goal 4: Metadata Facade Cleanup

Objective:

```text
Reduce drift by deriving descriptors/instructions/examples from ActionCatalog where practical.
```

Allowed files:

```text
src/tools/actions/descriptors.ts
src/tools/instructions/registry.ts
src/tools/_shared/action-examples.ts
related tests
```

Done when:

```text
prompt/capabilities/descriptors agree for migrated actions
no duplicate prompt truth remains for search/read/explore
```

This goal can be deferred if Goal 1-3 already deliver enough value.

## 16. Risks And Decisions

### 16.1 Initial Prompt Size

Risk:

```text
All public action descriptors may add prompt tokens.
```

Mitigation:

```text
one line per action
compact + miniFewShot only
group by family
no schema/rules/result fields
```

If prompt grows too large later:

```text
keep all action ids but remove some miniFewShots
or move rare actions to search_actions only
```

### 16.2 Schema Still Visible

Risk:

```text
Existing active tool schemas may still expose broad unions.
```

Decision:

```text
Accept for this phase.
Do not add pruned schema activation until action selection tests show schema confusion remains.
```

### 16.3 Chinese Queries

Risk:

```text
ASCII-only source means Chinese aliases may not be added initially.
```

Decision:

```text
Start with English aliases and exact action ids.
If Chinese action search is required, allow UTF-8 catalog strings or load aliases from a UTF-8 JSON fixture.
```

### 16.4 CLI Catalog Drift

Risk:

```text
Backend commands and action catalog can drift.
```

Mitigation:

```text
backendCommands are optional metadata.
Add tests only for action ids and model-facing behavior in this phase.
```

## 17. Definition Of Done

- All public ASCET actions have catalog entries.
- Initial prompt includes all public action compact descriptors and miniFewShots.
- Initial prompt explicitly tells the model to use `ascet_capabilities.search_actions` when action choice or parameters are unclear.
- Initial prompt does not include full schemas, full rules, full few-shot objects, result fields, or backend command details.
- `ascet_capabilities.search_actions` searches `ActionCatalog`, not CLI catalog.
- `search_actions` returns full schema summary, rules, fewShots, and result shape.
- Exact action lookup works with `ascet_read.read_code` and `{tool,name}` inputs.
- Required action selection tests pass.
- Existing canonical tools remain callable without dynamic activation.
- No action activation or pruned schema complexity is introduced in this phase.
