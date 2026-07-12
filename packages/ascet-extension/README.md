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
npm --workspace @zeerke/ascet-copilot-extension run copy-assets
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
- `ascet_requirements`
- `ascet_explore`
- `ascet_search`
- `ascet_read`
- `ascet_reference`
- `ascet_diff`
- `ascet_write`
- `ascet_batch_write`
- `ascet_verify`

Old fine-grained tools are not registered as model tools or legacy aliases. Their low-level runner modules remain available internally for canonical tools.

`ascet_requirements` is a read-only pre-design tool for requirements Excel risk retrieval. It supports `.xlsx` workbooks, maps requirement ID, title, description, Supplier Comments, feature, CCP, Signal, Reused Signal, Bosch Defect, COEM SWIM, and LL columns, and returns evidence with sheet, row, column, cell address, value, reason, and direct/inferred evidence kind. The default `relationDepth` is `1`, meaning one-hop related requirements and signals only.

Guarded write tools are preflight-only by default and require explicit interactive approval before CLI execution. Canonical `ascet_write` returns a non-error `status: "preflight"` outcome when `executeWrite` is false. `ascet_batch_write` uses operation-specific request schemas and reports partial completion as `status: "partial"` when the ASCET batch backend returns item failures.

## Design Command

Use `/ascet-design` when starting from a requirement, signal, function description, or design intent:

```text
/ascet-design 907829
/ascet-design WhlSlipSt quality handling
/ascet-design implement wheel speed plausibility fallback for reused vehicle speed signal
```

The command asks the model to clarify missing anchors with `ask_user_question`, then call `ascet_requirements.risk_context` before ASCET live design. If Excel retrieval returns ambiguous candidates, the workflow asks the user to choose the target requirement before continuing.

The first requirements-risk retrieval phase is read-only. `/ascet-design` must not call `ascet_write` or `ascet_batch_write` unless the user explicitly asks to apply changes, and any later write must be preceded by design intent, risk controls, and verification plan.

## Import/Export And Dependency Actions

`ascet_read` includes these ASCET ToolAPI-backed actions:

- `read_import_export_match`: resolve one imported element in an importer component against an exporter component.
- `read_import_export_matches`: inspect all imported elements in an importer component against an exporter component.
- `plan_element_dependency`: find dependency candidates for an element in a component, folder, or project.

`ascet_write` includes `set_element_dependency` for dependency flag changes. It uses the same guarded write contract as other write actions: preflight by default, interactive approval when `executeWrite=true`, optional `dryRun`, optional `backupDir`, and readback verification. Folder writes require `match="all"` so multi-component changes are explicit.

All four actions call `runAscetCliJson`, enter the ASCET scheduler, and execute under the shared `ascet.toolapi.global` resource.

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

Run focused static coverage for status, scheduler, read-only tools, guarded write policy, and catalog negative cases:

```powershell
npm --workspace @earendil-works/pi-coding-agent test -- test/ascet-extension-status.test.ts test/ascet-extension-scheduler.test.ts test/ascet-extension-readonly-tools.test.ts test/ascet-extension-write-tools.test.ts
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
- `ascet_read`
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
