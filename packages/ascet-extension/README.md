# ASCET PI Extension

ASCET tool extension package for PI. It registers ASCET read, verify, and guarded write tools while keeping all ASCET ToolAPI-backed access sequential.

## Resolver Modes

The runtime resolver uses these modes:

- `env`: `ASCET_CLI_PATH` or `ASCET_CONTRACTS_PATH` is set.
- `bundle`: package assets exist under `ascet-cli/contracts` or `ascet-cli/bin`.
- `source`: development fallback beside the parent `E:\Rep\AscetAgent` checkout.

Bundle mode is fail-closed. If any bundled ASCET asset exists but another required bundled asset is missing, `ascet_status` reports bundle mode with missing checks instead of silently falling back to source mode.

## Bundled Assets

Refresh bundled contracts and C# binaries from the parent `AscetAgent` checkout:

```powershell
npm --workspace @ascet/pi-extension run copy-assets
```

Expected bundled paths:

- `packages/ascet-extension/ascet-cli/contracts/cli-catalog.json`
- `packages/ascet-extension/ascet-cli/bin/AscetCli.exe`

## Tools

Canonical Copilot-aligned tools:

- `ascet_status`
- `ascet_capabilities`
- `ascet_recover`
- `ascet_scheduler_status`
- `ascet_browse`
- `ascet_search`
- `ascet_resolve`
- `ascet_inspect`
- `ascet_read_code`
- `ascet_references`
- `ascet_compare`
- `ascet_write`
- `ascet_verify`
- `ascet_batch_write`

Legacy compatibility tools remain registered for one-operation workflows:

- `ascet_contract_catalog`
- `ascet_list_folders`
- `ascet_list_components`
- `ascet_search_components`
- `ascet_search_elements`
- `ascet_search_occurrences`
- `ascet_resolve_component`
- `ascet_read_component_summary`
- `ascet_read_component_children`
- `ascet_list_methods`
- `ascet_read_method_code`
- `ascet_read_project_formulas`
- `ascet_list_diagrams`
- `ascet_read_block_diagram`
- `ascet_read_element_refs`
- `ascet_diff_component_snapshot`
- `ascet_verify_readback`
- `ascet_create_folder`
- `ascet_create_component`
- `ascet_create_method`
- `ascet_set_class_method_code`

Guarded write tools are preflight-only by default and require explicit interactive approval before CLI execution. Canonical `ascet_write` returns a non-error `status: "preflight"` outcome when `executeWrite` is false. `ascet_batch_write` uses operation-specific request schemas and reports partial completion as `status: "partial"` when the ASCET batch backend returns item failures.

## Scheduler Diagnostics

ASCET ToolAPI-backed calls are serialized through the PI extension scheduler resource `ascet.toolapi.global` with concurrency `1`. This protects the ASCET CLI and ToolAPI host from concurrent calls that can otherwise overlap in the same local ASCET database session.

Use `ascet_status` for resolver, bundled asset, and ASCET runtime availability. Use `ascet_scheduler_status` or the PI command `ascet-scheduler-status` for queue, active job, CLI lock, and per-operation health diagnostics. Use `ascet_recover` with `scheduler_status`, `scheduler_recover`, or `clear_stale_cli_lock` when a stale local lock or degraded operation needs recovery.

Default PI-local runtime files:

- lock: `%LOCALAPPDATA%\PI\ascet\locks\ascet-toolapi.lock`
- operation health: `%LOCALAPPDATA%\PI\ascet\operation-health.json`

`ascet_scheduler_status` returns the same information as the command:

```text
ASCET Scheduler Status

Host: healthy
Active: 0
Resource: ascet.toolapi.global active=0 queued=0 concurrency=1
Pending: 0
Running: none

CLI Lock:
  owner: none

Operation Health:
  degraded: none
```

## Verification

Run the read-only live smoke from the PI repo root while an ASCET database containing `DEMO` is open:

```powershell
npm run smoke:ascet-extension
```

Run focused static coverage for status, read-only tools, guarded write policy, and catalog negative cases:

```powershell
npm --workspace @earendil-works/pi-coding-agent test -- test/ascet-extension-status.test.ts test/ascet-extension-readonly-tools.test.ts test/ascet-extension-write-tools.test.ts
```

Run the default write smoke gate:

```powershell
npm run smoke:ascet-extension:write
```

The default write smoke does not write. It exits with `skipped: true`.

The real disposable write smoke requires explicit operator approval because it modifies the open ASCET database:

```powershell
$env:ASCET_WRITE_SMOKE = "1"
npm run smoke:ascet-extension:write
```

Default disposable target:

- component: `DEMO\__pi_write_smoke__\PiSmoke`
- method: `calc`

When enabled, setup, write, readback, and verify all run through canonical PI tools:

- `ascet_write`
- `ascet_read_code`
- `ascet_verify`

## Environment Overrides

- `ASCET_CLI_PATH`
- `ASCET_CONTRACTS_PATH`
- `PI_ASCET_RUNTIME_DIR`
- `PI_ASCET_LOCK_PATH`
- `PI_ASCET_OPERATION_HEALTH_PATH`
- `ASCET_WRITE_SMOKE`
- `ASCET_WRITE_SMOKE_COMPONENT`
- `ASCET_WRITE_SMOKE_METHOD`
