# ASCET Action Catalog Optimization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a single `AscetActionCatalog` that drives ASCET tool schemas, prompts, capabilities, index warmup, and agent-facing JSON contracts without drift.

**Architecture:** Treat each ASCET action as the smallest capability unit. Tools remain coarse containers such as `ascet_search`, `ascet_read`, and `ascet_explore`, while action metadata becomes the source of truth for profile exposure, prompt injection, partition warmup, and result-shape validation.

**Tech Stack:** TypeScript, TypeBox, Node test runner through `tsx --test`, existing PI extension APIs, existing ASCET C# CLI JSON envelopes.

---

## 1. Non-Negotiable Rules

- Do not read ASCET UI windows or Win32 controls.
- Do not run live ASCET ToolAPI scans concurrently.
- Do not make `ascet_status` build a full index.
- Do not let `ascet_read.read_code` use the `text_code` index.
- Do not make `ascet_read.read_code` default to summary; default is complete live text.
- Do not expose `search_occurrences` as a public action.
- Do not expose `ascet_batch_write` unless the feature gate explicitly enables it.
- Do not mix model-facing JSON, TUI display payloads, and native CLI JSON. This plan targets the model-facing tool result contract.
- Preserve user or generated changes outside the listed files.

## 2. Target Design

Create a single action catalog:

```text
AscetActionCatalog
  -> TypeBox schema branches
  -> profile active actions
  -> prompt rules and few-shots
  -> ascet_capabilities.actions
  -> index partition warmup policy
  -> result policy and compact JSON tests
```

Target catalog entry:

```ts
export interface AscetActionCatalogEntry {
  id: string;
  tool: AscetToolName;
  action: string;
  visibility: "public" | "internal" | "hidden";
  risk: "read" | "diff" | "write" | "ops";
  profiles: readonly AscetProfile[];
  requiresPartitions?: readonly AscetIndexPartition[];
  featureFlag?: string;
  deprecatedBy?: string;
  prompt: {
    summary: string;
    rules: readonly string[];
    fewShots?: readonly string[];
    tags?: readonly string[];
  };
  resultPolicy: AscetResultPolicyId;
}
```

## 3. Primary Files

- Create: `packages/ascet-extension/src/tools/actions/catalog.ts`
- Create: `packages/ascet-extension/src/tools/actions/catalog.test.ts`
- Modify: `packages/ascet-extension/src/tools/actions/descriptors.ts`
- Modify: `packages/ascet-extension/src/tools/instructions/registry.ts`
- Modify: `packages/ascet-extension/src/tools/instructions/ascet-search.ts`
- Modify: `packages/ascet-extension/src/tools/instructions/ascet-explore.ts`
- Modify: `packages/ascet-extension/src/tools/instructions/ascet-read.ts`
- Modify: `packages/ascet-extension/src/tools/instructions/ascet-write.ts`
- Modify: `packages/ascet-extension/src/tools/exposure/profiled-tools.ts`
- Modify: `packages/ascet-extension/src/tools/capabilities.ts`
- Modify: `packages/ascet-extension/src/tools/search.ts`
- Modify: `packages/ascet-extension/src/list-components.ts`
- Modify: `packages/ascet-extension/src/list-diagrams.ts`
- Modify: `packages/ascet-extension/src/search-text-code.ts`
- Modify: `packages/ascet-extension/src/status-runtime.ts`
- Modify: `packages/ascet-extension/src/tools/status/definition.ts`
- Modify: `packages/ascet-extension/src/tool-response-contract.ts`
- Modify: `packages/ascet-extension/src/tools/reference/schema.ts`
- Modify: `packages/ascet-extension/src/tools/diff/schema.ts`
- Modify: `packages/ascet-extension/src/tools/batch-write/definition.ts`

## 4. Task Plan

### Task 1: Add `AscetActionCatalog`

**Files:**
- Create: `packages/ascet-extension/src/tools/actions/catalog.ts`
- Create: `packages/ascet-extension/src/tools/actions/catalog.test.ts`
- Modify: `packages/ascet-extension/src/tools/actions/descriptors.ts`

**Steps:**

1. Write tests asserting every public action has `tool`, `action`, `profiles`, `visibility`, `risk`, `prompt.summary`, and `resultPolicy`.
2. Add catalog entries for `ascet_search`, `ascet_read`, and `ascet_explore` first.
3. Add helper functions:
   - `listActionCatalogEntries()`
   - `getActionCatalogEntry(tool, action)`
   - `findActionCatalogEntries(query)`
   - `listActionsForProfile(profile)`
4. Keep `descriptors.ts` as a compatibility facade backed by the catalog.
5. Run:

```powershell
npx tsx --test packages/ascet-extension/src/tools/actions/catalog.test.ts
```

**Acceptance:**
- No duplicated search/read/explore action metadata remains in `descriptors.ts`.
- Hidden/internal actions are represented but excluded by default.

### Task 2: Generate Prompt Guidelines From Catalog

**Files:**
- Modify: `packages/ascet-extension/src/tools/instructions/registry.ts`
- Modify: `packages/ascet-extension/src/tools/instructions/ascet-search.ts`
- Modify: `packages/ascet-extension/src/tools/instructions/ascet-explore.ts`
- Modify: `packages/ascet-extension/src/tools/instructions/ascet-read.ts`
- Modify: `packages/ascet-extension/src/tools/instructions/ascet-write.ts`
- Modify: `packages/ascet-extension/src/tools/prompt.test.ts`

**Steps:**

1. Replace hand-assembled instruction arrays with catalog-derived instruction objects.
2. Keep temporary facades only if existing imports need them.
3. Enforce short prompts:
   - one summary line
   - two to four rules
   - one or two few-shots
4. Update `read_code` prompt to say default output is complete live text.
5. Update `text_in_code` prompt to say it returns snippets only.
6. Run:

```powershell
npx tsx --test packages/ascet-extension/src/tools/prompt.test.ts
```

**Acceptance:**
- Prompt text comes from catalog.
- `search_occurrences` and hidden batch-write instructions are not injected in public prompts.

### Task 3: Generate `ascet_capabilities.actions` From Catalog

**Files:**
- Modify: `packages/ascet-extension/src/tools/capabilities.ts`
- Modify: `packages/ascet-extension/src/tools/capabilities.test.ts`

**Steps:**

1. Replace descriptor-based `collectActionStatuses()` with catalog-based action status collection.
2. Return `requiresPartitions`, `state`, `visibility`, `featureFlag`, and short instruction only when requested by `detailLevel`.
3. Keep success payload compact:

```json
{
  "activeProfile": "base",
  "activeTools": ["ascet_status", "ascet_search"],
  "actions": [],
  "total": 0,
  "items": []
}
```

4. Run:

```powershell
npx tsx --test packages/ascet-extension/src/tools/capabilities.test.ts
```

**Acceptance:**
- Capabilities and prompt injection report the same active actions for each profile.

### Task 4: Drive Index Warmup From Catalog

**Files:**
- Modify: `packages/ascet-extension/src/tools/search.ts`
- Modify: `packages/ascet-extension/src/list-components.ts`
- Modify: `packages/ascet-extension/src/list-diagrams.ts`
- Modify: `packages/ascet-extension/src/search-text-code.ts`
- Modify: `packages/ascet-extension/src/search-index.ts`
- Create or modify: `packages/ascet-extension/src/tools/actions/catalog-index.test.ts`

**Steps:**

1. Add catalog helpers:
   - `getRequiredPartitions(tool, action)`
   - `shouldUseIndex(tool, action)`
2. Replace hard-coded partition names in search/explore entrypoints with catalog reads where practical.
3. Keep action-specific options, such as `componentPath`, in each runner.
4. Assert these partition mappings:
   - `ascet_status.default -> components`
   - `search_components -> components`
   - `list_diagrams -> no quick-search index; live ascet_explore navigation`
   - `declarations_of_element -> element_decls`
   - `declarations_of_method_process -> method_decls`
   - `declarations_of_method_process_element -> method_process_elements`
   - `references_to_component -> component_refs`
   - `references_to_element -> element_refs,text_code`
   - `senders_of_message -> messages`
   - `receivers_of_message -> messages`
   - `text_in_code -> text_code`
   - `read_code -> no index`
5. Run:

```powershell
npx tsx --test packages/ascet-extension/src/tools/actions/catalog-index.test.ts packages/ascet-extension/src/search-index.test.ts
```

**Acceptance:**
- No search/explore action warms an undocumented partition.
- `read_code` never triggers `text_code`.

### Task 5: Convert `ascet_status` To JSON

**Files:**
- Modify: `packages/ascet-extension/src/tools/status/definition.ts`
- Modify: `packages/ascet-extension/src/status-runtime.ts`
- Modify: `packages/coding-agent/test/ascet-extension-status.test.ts`

**Steps:**

1. Change model-visible `content[0].text` from `report.summary` to compact JSON.
2. Keep human summary in `details.summary` or UI rendering only.
3. Ensure status does only:
   - connect host
   - detect current database
   - warm `components`
4. Expected JSON shape:

```json
{
  "installation": "ready",
  "runtime": "ready",
  "database": {
    "name": "DemoDb",
    "path": "C:/ASCET/DemoDb"
  },
  "index": {
    "partition": "components",
    "entries": 119,
    "elapsedMs": 520,
    "scanComplete": true
  }
}
```

5. Run:

```powershell
npx tsx --test packages/coding-agent/test/ascet-extension-status.test.ts packages/ascet-extension/src/status-runtime.test.ts
```

**Acceptance:**
- `ascet_status` success output is valid JSON.
- No `ok`, `error:null`, or `meta` appears in success output.

### Task 6: Make `text_in_code` Snippet-Only By Default

**Files:**
- Modify: `packages/ascet-extension/src/search-text-code.ts`
- Modify: `packages/ascet-extension/src/search-index.ts`
- Modify: `packages/ascet-extension/src/search-text-code.test.ts`

**Steps:**

1. Strip full `text` from indexed `text_code` result items.
2. Preserve:
   - `component`
   - `section`
   - `name`
   - `type`
   - `path`
   - `lineNumber`
   - `snippet`
   - optional `hash`
3. Keep `ascet_read.read_code` as the complete live-code path.
4. Run:

```powershell
npx tsx --test packages/ascet-extension/src/search-text-code.test.ts packages/ascet-extension/src/tools/read/definition.test.ts
```

**Acceptance:**
- `ascet_search.text_in_code` never returns full code text by default.
- `ascet_read.read_code` still returns full live text by default.

### Task 7: Fix Normalizer Key Collisions

**Files:**
- Modify: `packages/ascet-extension/src/tool-response-contract.ts`
- Modify: `packages/ascet-extension/src/tool-response-contract.test.ts`
- Modify: `packages/ascet-extension/src/tools/agent-friendly-output.test.ts`

**Steps:**

1. Stop mapping `componentKind` to top-level `kind` inside nested item records when the record already has action-level `kind`.
2. Prefer explicit action fields:
   - method item `kind: "method"`
   - message item `kind: "message"`
   - element item `kind: "element"`
3. Preserve component kind as `componentKind` or nested `component.kind`.
4. Fix `methodName -> name` collision with element names in method/process element results.
5. Add regression tests for:
   - `declarations_of_method_process`
   - `declarations_of_method_process_element`
   - `senders_of_message`
   - `receivers_of_message`
6. Run:

```powershell
npx tsx --test packages/ascet-extension/src/tool-response-contract.test.ts packages/ascet-extension/src/tools/agent-friendly-output.test.ts
```

**Acceptance:**
- Item `kind` always describes the item itself, not the owning component.
- Element result `name` is the element name, not the method name.

### Task 8: Convert `ascet_reference` And `ascet_diff` To Discriminated Unions

**Files:**
- Modify: `packages/ascet-extension/src/tools/reference/schema.ts`
- Modify: `packages/ascet-extension/src/tools/diff/schema.ts`
- Modify: `packages/ascet-extension/src/tools/write/schema.test.ts` only if shared schema helpers move
- Create or modify: `packages/ascet-extension/src/tools/reference/schema.test.ts`
- Create or modify: `packages/ascet-extension/src/tools/diff/schema.test.ts`

**Steps:**

1. Replace wide optional-object schemas with `Type.Union([Type.Object({ action: Type.Literal(...) })])`.
2. Ensure each action exposes only its own parameters.
3. Examples:
   - `component_refs` exposes `componentPath`, `direction`, `depth`.
   - `used_by` exposes `componentPath`, `scopePath`, `kind`, `limit`.
   - `element_refs` exposes `componentPath`, `elementName`.
   - `diff_method` exposes `leftPath`, `rightPath`, `methodName`, `changesOnly`.
   - `diff_element_spec` exposes `componentPath`, `specFile`, `changesOnly`.
4. Run:

```powershell
npx tsx --test packages/ascet-extension/src/tools/reference/schema.test.ts packages/ascet-extension/src/tools/diff/schema.test.ts
```

**Acceptance:**
- No reference or diff action accepts unrelated optional parameters.

### Task 9: Unify Or Disable Hidden `ascet_batch_write`

**Files:**
- Modify: `packages/ascet-extension/src/tools/batch-write/definition.ts`
- Modify: `packages/ascet-extension/src/batch-write.ts`
- Modify: `packages/ascet-extension/src/tools/capabilities.test.ts`

**Steps:**

1. Choose one policy:
   - Preferred now: keep hidden and disabled unless `PI_ASCET_ENABLE_BATCH_WRITE=1`.
   - Later: expose only under `batch-write` profile.
2. If disabled, return:

```json
{
  "error": {
    "code": "ascet_tool_hidden",
    "message": "ascet_batch_write is hidden. Use ascet_write single-operation flow."
  }
}
```

3. If enabled, remove `status/data/warnings` wrapper and use compact success/failure contract.
4. Run:

```powershell
npx tsx --test packages/ascet-extension/src/tools/capabilities.test.ts packages/coding-agent/test/ascet-extension-canonical-tools.test.ts
```

**Acceptance:**
- Hidden batch write does not appear in normal profile prompts or capabilities.
- If called while disabled, it returns structured error only.

### Task 10: Add End-To-End Contract And Focused Live Smoke

**Files:**
- Create or modify: `packages/ascet-extension/src/tools/action-contract-snapshots.test.ts`
- Create or modify: `packages/ascet-extension/scripts/ascet-extension-focused-live-smoke.ts`
- Modify: `packages/ascet-extension/docs/2026-07-25-ascet-index-tooling-redesign-development-plan.md`

**Steps:**

1. Add snapshot-style tests for success payloads:
   - `ascet_status`
   - `search_components`
   - `declarations_of_element`
   - `text_in_code`
   - `list_diagrams`
   - `read_code`
   - `write` preflight
2. Assert success output does not include:
   - `ok`
   - `error:null`
   - `meta`
   - repeated input echo
   - empty arrays except `items`
3. Add focused live smoke that runs serially:
   - `ascet_status`
   - `ascet_search.search_components`
   - `ascet_search.text_in_code`
   - `ascet_read.read_code`
   - optional safe write preflight only
4. Run unit tests:

```powershell
npx tsx --test packages/ascet-extension/src/tools/action-contract-snapshots.test.ts
```

5. Run live smoke only when ASCET GUI and ToolAPI are available:

```powershell
npx tsx packages/ascet-extension/scripts/ascet-extension-focused-live-smoke.ts
```

**Acceptance:**
- Unit tests prove the model-facing JSON contract.
- Live smoke proves status/search/read runtime behavior on a real ASCET session.

## 5. Final Verification Matrix

Run these before calling the work complete:

```powershell
npx tsx --test `
  packages/ascet-extension/src/tools/actions/catalog.test.ts `
  packages/ascet-extension/src/tools/prompt.test.ts `
  packages/ascet-extension/src/tools/capabilities.test.ts `
  packages/ascet-extension/src/tools/read/definition.test.ts `
  packages/ascet-extension/src/search-text-code.test.ts `
  packages/ascet-extension/src/tool-response-contract.test.ts `
  packages/ascet-extension/src/tools/action-contract-snapshots.test.ts
```

Optional live verification:

```powershell
npx tsx packages/ascet-extension/scripts/ascet-extension-focused-live-smoke.ts
```

## 6. Definition Of Done

- `AscetActionCatalog` is the source of truth for action metadata.
- Prompt guidelines are generated from catalog entries.
- `ascet_capabilities.actions` is generated from catalog entries.
- Search/explore index warmup uses catalog partition metadata.
- `ascet_status` returns JSON to the model.
- `text_in_code` does not return full text by default.
- `read_code` returns full live text by default.
- Normalizer collisions are fixed.
- `ascet_reference` and `ascet_diff` use action-specific schemas.
- Hidden `ascet_batch_write` has a strict hidden/disabled policy.
- Snapshot tests cover model-facing JSON.
- Focused live smoke is available and serial-only.
