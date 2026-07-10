# ASCET Canonical Tools Refactor Task Plan

Date: 2026-07-10

## Goal

Refactor `packages/ascet-extension` so the model-facing ASCET tool surface is Copilot-aligned, canonical-only, and easy to extend.

Final model-facing tools:

```text
ascet_status
ascet_capabilities
ascet_recover
ascet_scheduler_status

ascet_explore
ascet_search
ascet_read
ascet_reference
ascet_diff
ascet_write
ascet_batch_write
ascet_verify
```

Old fine-grained tools must not be registered as model tools or legacy aliases. Keep their low-level runner modules only where canonical tools still need them.

## Non-Goals

- Do not expose every ASCET CLI command as a separate PI tool.
- Do not keep old fine-grained tools as `legacy_alias`.
- Do not treat `packages/ascet-extension/src/scheduler/*` as tools; it is runtime infrastructure.
- Do not rename the backend `AscetReadTextCode` executable unless the ASCET CLI contract layer is intentionally migrated later.

## Key Decisions

### Canonical-Only Registration

Remove model registration for these old fine-grained tools:

```text
ascet_list_components
ascet_list_folders
ascet_contract_catalog
ascet_search_elements
ascet_search_components
ascet_search_occurrences
ascet_resolve_component
ascet_read_component_summary
ascet_read_component_children
ascet_read_method_code
ascet_read_project_formulas
ascet_list_methods
ascet_list_diagrams
ascet_read_block_diagram
ascet_read_element_refs
ascet_diff_component_snapshot
ascet_verify_readback
ascet_create_folder
ascet_create_component
ascet_create_method
ascet_set_class_method_code
```

### Read Code Alias

Model-facing route:

```text
ascet_read.read_code
  logicalCommandId: AscetReadCode
  backendCommandId: AscetReadTextCode
  operation: read_code
```

`AscetReadTextCode` is a backend implementation detail and must not be presented as the model-facing concept.

### Scheduler Status Boundary

`ascet_scheduler_status` is a new canonical ops tool.

`ascet_recover` is not a new tool; it is the existing tool with added actions:

```text
scheduler_status
scheduler_recover
clear_stale_cli_lock
```

`packages/ascet-extension/src/scheduler/*` is bottom-layer runtime infrastructure for scheduler queue state, `ascet.toolapi.global` resource state, PI local CLI lock state, and operation health/degraded state.

## Target Code Structure

```text
packages/ascet-extension/src/
  index.ts

  core/
    path.ts
    results.ts
    temp-files.ts
    tool.ts

  scheduler/
    cli-lock.ts
    errors.ts
    format.ts
    global.ts
    operation-health.ts
    paths.ts
    scheduler.ts
    status.ts
    types.ts

  routing/
    router.ts
    route-manifests.ts
    command-aliases.ts
    coverage.ts

  tools/
    index.ts
    registry.ts

    _shared/
      define.ts
      envelope.ts
      render.ts

    status/
      definition.ts
      prompt.ts
      ui.ts
      index.ts

    capabilities/
      definition.ts
      schema.ts
      prompt.ts
      ui.ts
      index.ts

    recover/
      definition.ts
      schema.ts
      prompt.ts
      ui.ts
      index.ts

    scheduler-status/
      definition.ts
      schema.ts
      manifest.ts
      prompt.ts
      ui.ts
      index.ts

    explore/
      definition.ts
      schema.ts
      manifest.ts
      prompt.ts
      ui.ts
      index.ts

    search/
      definition.ts
      schema.ts
      manifest.ts
      prompt.ts
      ui.ts
      index.ts

    read/
      definition.ts
      schema.ts
      manifest.ts
      prompt.ts
      ui.ts
      index.ts

    reference/
      definition.ts
      schema.ts
      manifest.ts
      prompt.ts
      ui.ts
      index.ts

    diff/
      definition.ts
      schema.ts
      manifest.ts
      prompt.ts
      ui.ts
      index.ts

    write/
      definition.ts
      schema.ts
      manifest.ts
      prompt.ts
      ui.ts
      index.ts

    batch-write/
      definition.ts
      schema.ts
      manifest.ts
      prompt.ts
      ui.ts
      index.ts

    verify/
      definition.ts
      schema.ts
      manifest.ts
      prompt.ts
      ui.ts
      index.ts
```

`src/index.ts` must only register tools and commands:

```ts
export default function ascetExtension(pi: AscetExtensionAPI) {
  for (const tool of canonicalAscetTools) {
    pi.registerTool(tool);
  }

  pi.registerCommand("ascet-status", ...);
  pi.registerCommand("ascet-scheduler-status", ...);
}
```

## Canonical Action Matrix

### ascet_explore

```text
list_components
list_diagrams
resolve_target
inspect_target
preview_children
```

### ascet_search

```text
search_components
resolve_component
search_elements
search_occurrences
```

### ascet_read

```text
read
read_code
read_implementation
read_block_diagram
read_state_machine_flow
```

### ascet_reference

```text
component_refs
used_by
element_refs
```

### ascet_diff

```text
diff
diff_method
diff_component_snapshot
diff_state_machine_domain
diff_element_spec
diff_project_formulas
```

### ascet_write

```text
create_folder
delete_folder
create_component
create_method
delete_component
delete_method
set_method_code
set_class_method_code
set_module_code
set_state_machine_code
apply_element_spec
apply_project_formula
```

### ascet_batch_write

```text
batch_set_method_code
batch_set_element_spec
batch_create_component
batch_create_method
batch_set_project_formula
batch_delete_component
batch_delete_method
batch_create_folder
batch_delete_folder
```

### ascet_verify

```text
readback
```

### ascet_recover

```text
status
clear_extension_temp
scheduler_status
scheduler_recover
clear_stale_cli_lock
```

### ascet_scheduler_status

```text
status
recover
```

## Development Tasks

### Phase 1 - Registration Cleanup

- [x] Create `src/tools/registry.ts`.
- [x] Split registry into `canonicalOpsTools`, `canonicalDomainTools`, and `canonicalAscetTools`.
- [x] Ensure `canonicalAscetToolNames` contains only the final 12 tools.
- [x] Delete `legacyAscetTools` registration.
- [x] Remove all old fine-grained ToolDefinition objects from `src/index.ts`.
- [x] Keep low-level runner modules available for canonical tools.
- [x] Ensure `src/index.ts` only loops over `canonicalAscetTools` and registers commands.

### Phase 2 - Shared Tool Infrastructure

- [x] Add `tools/_shared/envelope.ts` for canonical result envelopes.
- [x] Add `tools/_shared/define.ts` for common tool definition helpers.
- [x] Add `tools/_shared/render.ts` for default render helpers.
- [x] Standardize canonical output fields:

```text
ok
tool
action
summary
command.logicalCommandId
command.backendCommandId
command.operation
data
error
diagnostics
```

### Phase 3 - Routing Layer

- [x] Add `routing/command-aliases.ts`.
- [x] Add `routing/route-manifests.ts`.
- [x] Add `routing/router.ts`.
- [x] Add `routing/coverage.ts`.
- [x] Make router consume manifests instead of hardcoded branch chains.
- [x] Add alias `AscetReadCode -> AscetReadTextCode`.
- [x] Include logical and backend command ids in tool diagnostics.

### Phase 4 - Copilot-Aligned Domain Tools

- [x] Rename or replace `ascet_browse` with `ascet_explore`.
- [x] Rename or replace `ascet_read_code` with `ascet_read`.
- [x] Rename or replace `ascet_references` with `ascet_reference`.
- [x] Rename or replace `ascet_compare` with `ascet_diff`.
- [x] Merge `ascet_inspect` actions into `ascet_explore` and `ascet_read`.
- [x] Merge `ascet_resolve` into `ascet_explore.resolve_target` and `ascet_search.resolve_component`.
- [x] Keep `ascet_write`, `ascet_batch_write`, and `ascet_verify`, but attach manifests and shared envelopes.

### Phase 5 - Scheduler Status Tool

- [x] Keep the actual tool under `tools/scheduler-status/`.
- [x] Split into `definition.ts`, `schema.ts`, `manifest.ts`, `prompt.ts`, `ui.ts`, and `index.ts`.
- [x] Support `action?: "status" | "recover"`.
- [x] Support `format?: "text" | "json"`.
- [x] Ensure `execute()` passes `ctx.cwd` to scheduler status APIs.
- [x] Ensure output includes scheduler queue, active job, pending jobs, PI local CLI lock, and operation health/degraded state.
- [x] Keep `ascet_scheduler_status` in canonical ops tools.

### Phase 6 - Recover Tool Enhancement

- [x] Treat `ascet_recover` as an existing enhanced tool.
- [x] Move recover schema into `tools/recover/schema.ts`.
- [x] Keep existing actions `status` and `clear_extension_temp`.
- [x] Add `scheduler_status`, `scheduler_recover`, and `clear_stale_cli_lock`.
- [x] Route `scheduler_status` to `createAscetSchedulerStatusReport("status")`.
- [x] Route `scheduler_recover` to `createAscetSchedulerStatusReport("recover")`.
- [x] Route `clear_stale_cli_lock` to `clearStaleAscetCliLock()`.
- [x] Ensure recover actions pass `cwd/env` where applicable.

### Phase 7 - Human Commands

- [x] Keep `ascet-status`.
- [x] Keep `ascet-scheduler-status`.
- [x] Ensure `ascet-scheduler-status` uses the same scheduler status/recover implementation as the tool.
- [x] Ensure command handler passes `ctx.cwd`.
- [x] Support command args: `status`, `recover`, `--recover`, `reset`, `--reset`.

### Phase 8 - CLI Catalog Coverage

- [x] Read `ascet-cli/contracts/cli-catalog.json`.
- [x] Categorize every visible command as one of:

```text
exposed_by_canonical_tool
backend_alias
internal_only
unsupported_with_reason
```

- [x] Remove `legacy_alias` as a category.
- [x] Mark hidden commands as not model-facing.
- [x] Mark `AscetReadTextCode` as backend alias for `AscetReadCode`.
- [x] Classify operations such as `benchmark`, `selftest`, `host`, `worker`, `thread-harness`, and `orchestrator` as internal-only unless intentionally exposed later.

### Phase 9 - Documentation

- [x] Update `packages/ascet-extension/README.md`.
- [x] List only the 12 canonical tools.
- [x] Document scheduler status vs recover:

```text
ascet_scheduler_status: observe status / optionally recover scheduler state
ascet_recover: recovery actions and cleanup
```

- [x] Remove old fine-grained tool usage examples.
- [x] Ensure capabilities output does not imply old fine-grained PI tools are directly callable.

### Phase 10 - Tests

- [x] Update `test/ascet-extension-canonical-tools.test.ts`.
- [x] Add `test/ascet-extension-copilot-routing.test.ts`.
- [x] Add `test/ascet-extension-cli-coverage.test.ts`.
- [x] Add `test/ascet-extension-read-code-alias.test.ts`.
- [x] Update `test/ascet-extension-scheduler.test.ts`.
- [x] Update `test/ascet-extension-status.test.ts`.
- [x] Add assertions that old fine-grained tools are not registered.
- [x] Add assertions that only the 12 canonical tools are registered.
- [x] Add assertions for `read_code -> AscetReadCode -> AscetReadTextCode`.
- [x] Add assertions that visible CLI commands are fully categorized.

## Verification Commands

```powershell
npm --workspace @earendil-works/pi-coding-agent test -- test/ascet-extension-canonical-tools.test.ts test/ascet-extension-copilot-routing.test.ts test/ascet-extension-cli-coverage.test.ts test/ascet-extension-read-code-alias.test.ts test/ascet-extension-scheduler.test.ts test/ascet-extension-status.test.ts

npm --workspace @earendil-works/pi-coding-agent run build

npm run smoke:ascet-extension
npm run smoke:ascet-extension:write
```

## Final Acceptance Criteria

- [x] The model sees only 12 canonical ASCET tools.
- [x] Old fine-grained ASCET tools are not registered.
- [x] Copilot 8 domain tool action matrix is implemented.
- [x] PI ops tools include `ascet_status`, `ascet_capabilities`, `ascet_recover`, and `ascet_scheduler_status`.
- [x] `ascet_scheduler_status` is a canonical ops tool.
- [x] `ascet_recover` is enhanced in place and not duplicated.
- [x] `scheduler/*` remains bottom-layer runtime infrastructure.
- [x] `read_code -> AscetReadCode -> AscetReadTextCode` is locked by routing and tests.
- [x] New tools can be added by adding one tool directory, one manifest, one registry entry, and tests without changing `src/index.ts` tool definition logic.
- [x] `src/index.ts` no longer contains large inline tool definitions.
- [x] CLI catalog coverage has no uncategorized visible commands.

## Implementation Status - 2026-07-11

Status: implemented and verified.

Completed:

- `src/index.ts` registers only `canonicalAscetTools` plus `ascet-status` and `ascet-scheduler-status`.
- The registered model-facing tool list is the final 12 canonical tools.
- Old fine-grained tool definitions and legacy wrapper directories were removed from `src/tools/`.
- Old aggregate runner wrappers `tools/browse.ts`, `tools/compare.ts`, `tools/inspect.ts`, `tools/read-code.ts`, `tools/references.ts`, and `tools/resolve.ts` were removed.
- Each canonical tool directory now has `definition.ts`, `schema.ts`, `prompt.ts`, `ui.ts`, and `index.ts`; domain tools and `scheduler-status` also have `manifest.ts`.
- Routing files are present: `command-aliases.ts`, `route-manifests.ts`, `router.ts`, and `coverage.ts`.
- `read_code -> AscetReadCode -> AscetReadTextCode` is locked by route tests.
- `ascet_diff.diff` now routes `objectKind=class|module|statemachine` to `diff_class|diff_module|diff_state_machine`.
- `ascet_scheduler_status` passes `ctx.cwd`, supports `status/recover`, supports `text/json`, and shares implementation with `ascet-scheduler-status`.
- `ascet_recover` remains the existing tool and includes `scheduler_status`, `scheduler_recover`, and `clear_stale_cli_lock`.
- `ascet_capabilities` now marks each CLI match with `coverageCategory`, `canonicalTool`, and `canonicalAction` so CLI operations are not mistaken for old PI tools.
- Canonical domain/write/batch/verify/ops tool details include `tool`, `action`, `command.logicalCommandId`, `command.backendCommandId`, and `command.operation` where applicable.
- CLI catalog coverage no longer uses `legacy_alias`; runtime commands such as worker/thread-harness/orchestrator/read-host are classified as `internal_only`.
- README and smoke scripts were migrated to canonical tool names.

Verified:

```powershell
npm --workspace @earendil-works/pi-coding-agent test -- test/ascet-extension-canonical-tools.test.ts test/ascet-extension-copilot-routing.test.ts test/ascet-extension-cli-coverage.test.ts test/ascet-extension-read-code-alias.test.ts test/ascet-extension-scheduler.test.ts test/ascet-extension-status.test.ts test/ascet-extension-readonly-tools.test.ts
```

Result: 7 test files passed, 49 tests passed.

```powershell
npm --workspace @earendil-works/pi-coding-agent run build
```

Result: passed.

```powershell
npm pack --workspace @ascet/pi-extension --dry-run
```

Result: passed; package contains canonical tool directories and no old wrapper directories.

```powershell
npm run smoke:ascet-extension:write
```

Result: passed in default no-write mode with `skipped: true`.

```powershell
npm run smoke:ascet-extension
```

Result: passed against the live ASCET database with canonical tools. The smoke exercised `ascet_status`, `ascet_scheduler_status`, `ascet_capabilities`, `ascet_explore`, `ascet_search`, `ascet_read`, `ascet_reference`, `ascet_diff`, and `ascet_verify`; scheduler status ended healthy with no CLI lock and no degraded operation health.
