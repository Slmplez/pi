# ASCET Permission Modes Live Validation Follow-up Task Plan

Date: 2026-08-15

Status: Complete — verified August 15, 2026

Related plan:

- `packages/ascet-extension/docs/2026-08-12-ascet-permission-modes-single-call-write-development-plan.md`

## 1. Objective

Finish the remaining work required to prove the permission-mode and single-call guarded-write implementation complete:

1. recover and clean the interrupted live-validation run;
2. make the live harness deterministic and safely recoverable;
3. rerun the complete Section 21 live matrix without interruption;
4. rerun all required non-live validation;
5. perform a requirement-by-requirement completion audit.

Do not expand production scope unless live evidence exposes an implementation defect.

## 2. Final Authoritative State

Database:

```text
C:\Repo\F05_IPB_L2_0429
fingerprint: 71cf3289aea80d1926ff9e419192dad40c7e01621ffdbdfde6da15f93b74a33c
```

Final evidence:

```text
cleanup recovery: artifacts/ascet-permission-cleanup/20260815-090433
idempotent cleanup: artifacts/ascet-permission-cleanup/20260815-093114
final old-method cleanup: artifacts/ascet-permission-cleanup/20260815-125402
fresh compound discovery: artifacts/ascet-permission-discovery/fresh-compound-20260815-133909
fresh failure discovery: artifacts/ascet-permission-discovery/fresh-failure-20260815-134201
complete live matrix: artifacts/ascet-permission-live/20260815-134337
final non-live validation: artifacts/ascet-permission-validation/20260815-final
```

Final runtime state:

```text
smoke root absent
all test-created methods absent
scheduler active: 0
scheduler queued: 0
CLI lock: not held
unresolved quarantine: 0
live summary ok: true
```

Persistent editability acquired during guarded operations is documented in the parent plan's final Section 26. No verified release/revert API exists, so this is a reportable external effect rather than unresolved cleanup.

## 3. Constraints

- Do not commit unless explicitly requested.
- Use only the authorized database fingerprint above.
- Bind every cleanup and live run to the exact fingerprint.
- Delete only explicitly declared smoke paths and method names.
- Never guess or simulate an editability release operation.
- Preserve persistent editable-state evidence.
- Do not weaken hard gates, permission evaluation, readback, rollback, or quarantine handling to make tests pass.
- Do not run `npm test`, full Vitest directly, or `npm run build`.
- After code changes, run `npm run check` with full output.
- Use the repository test commands defined in `AGENTS.md`.

## 4. Task A — Fix Live Evidence Numbering

### Problem

`executeTool` increments shared `callIndex` before awaiting execution but uses the mutable value again when writing evidence. A scheduler-status call made inside a confirmation callback can change the value, producing duplicate evidence prefixes such as two `011-*` files.

### Implementation

Update both live scripts to capture an immutable call number:

```ts
const callNumber = ++callIndex;
const response = await tool.execute(`ascet-permission-live-${callNumber}`, ...);
writeEvidence(`${String(callNumber).padStart(3, "0")}-${stage}`, ...);
```

Files:

```text
scripts/ascet-permission-modes-live-validation.ts
scripts/ascet-permission-live-discovery.ts
```

### Acceptance criteria

- [x] Nested confirmation checks cannot duplicate or skip evidence file prefixes.
- [x] Tool execution ID and evidence filename use the same number.
- [x] Existing evidence content remains unchanged apart from deterministic numbering.

## 5. Task B — Add Idempotent Cleanup-only Recovery

### Goal

Allow an interrupted run to be cleaned without copying ad-hoc scripts or rerunning mutation scenarios.

### Interface

Add an explicit cleanup-only mode to the existing live harness:

```powershell
$env:ASCET_PERMISSION_SMOKE_CLEANUP_ONLY = "1"
$env:ASCET_PERMISSION_SMOKE_CLEANUP_ROOT = "DEMO\__pi_permission_smoke__20260814-191154"
```

The existing authorization and database fingerprint gates remain mandatory.

Optional exact cleanup targets:

```text
ASCET_PERMISSION_SMOKE_CLEANUP_METHOD_COMPONENT
ASCET_PERMISSION_SMOKE_CLEANUP_METHOD_NAME
ASCET_PERMISSION_SMOKE_CLEANUP_FAILURE_COMPONENT
ASCET_PERMISSION_SMOKE_CLEANUP_FAILURE_METHOD
```

### Safety requirements

Cleanup-only mode must:

1. verify the live database fingerprint;
2. require the exact write-authorization token;
3. reject a cleanup root outside `DEMO\__pi_permission_smoke__*`;
4. reject empty, top-level, wildcard, or normalized parent paths;
5. use `ifMissing=ignore` for idempotency;
6. delete explicitly named methods before deleting the smoke root;
7. perform mandatory live readback;
8. verify scheduler active/queued counts and CLI lock state;
9. verify zero unresolved mutation quarantines;
10. write a separate summary and per-call evidence archive.

Do not add a general-purpose arbitrary cleanup command.

### Acceptance criteria

- [x] Running cleanup twice succeeds safely.
- [x] A wrong fingerprint blocks before mutation.
- [x] An unsafe root path blocks before mutation.
- [x] Missing targets are verified no-ops.
- [x] Cleanup summary distinguishes removed, already absent, and unresolved targets.

## 6. Task C — Recover the Interrupted Run

Use cleanup-only mode with:

```text
smoke root:
DEMO\__pi_permission_smoke__20260814-191154

compound component:
Customer\JLR_FMC\Package\JLR_LeanTCS\Private\TCS_CUS_GenericTCSFunctions\TCS_CUS_RefSuppSuppress\TCS_CUS_RefSuppSuppress_DSCOFF

compound method:
PiCompoundMethod
```

### Required sequence

- [x] Confirm no previous validation process is active.
- [x] Confirm scheduler is idle and CLI lock is not held.
- [x] Read back `EditableClass` methods/elements before cleanup.
- [x] Read back `PiCompoundMethod` before cleanup.
- [x] Delete `PiCompoundMethod` with exact component and method name.
- [x] Delete `EditableClass` if still present.
- [x] Delete `AutoAllowed` and `AcceptEdits` if still present.
- [x] Delete the exact smoke root.
- [x] Prove the smoke root is absent.
- [x] Prove `PiCompoundMethod` is absent.
- [x] Record the compound fixture's final editable state.
- [x] Prove zero scheduler jobs, zero CLI locks, and zero unresolved quarantine.

Persistent editable state is an expected reportable effect, not a cleanup failure, because no verified revert API exists.

## 7. Task D — Select Fresh Fixtures

The previous compound fixture cannot prove initial read-only behavior if it remains editable.

Run:

```powershell
npm run smoke:ascet-extension:permission-discovery
```

### Fixture requirements

#### Compound fixture

- [x] Component kind supports a safe create-method operation.
- [x] Initial editability is exactly `false`.
- [x] Probe method does not exist.
- [x] Authoritative preview returns `preflight`.
- [x] Prefer a low-impact Customer component.

#### Capability regression fixture

- [x] StateMachine `Main` exists.
- [x] `AddAction` is unavailable.
- [x] Preview returns `create_method_capability_not_supported`.
- [x] No approval or mutation is required.

The previous Customer GAC regression fixture may be reused after read-only verification.

#### Post-acquisition failure fixture

- [x] Initial editability is exactly `false`.
- [x] StateMachine `Main` is missing.
- [x] Action preview returns `preflight`.
- [x] `AddDiagram` is available.
- [x] Runtime action creation is expected to fail after acquisition.

The previous PlatformLibrary failure fixture may be reused only if all initial-state checks still pass.

## 8. Task E — Run the Complete Section 21 Matrix

Use a new unique smoke root and evidence directory. Do not reuse the interrupted root.

Required environment:

```powershell
$env:ASCET_PERMISSION_LIVE_VALIDATE = "1"
$env:ASCET_PERMISSION_LIVE_AUTHORIZATION = "I_AUTHORIZE_DISPOSABLE_ASCET_WRITES"
$env:ASCET_PERMISSION_SMOKE_DATABASE_FINGERPRINT = "71cf3289aea80d1926ff9e419192dad40c7e01621ffdbdfde6da15f93b74a33c"
$env:ASCET_PERMISSION_SMOKE_ROOT = "DEMO\__pi_permission_smoke__<timestamp>"
$env:ASCET_PERMISSION_SMOKE_REGRESSION_COMPONENT = "<verified fixture>"
$env:ASCET_PERMISSION_SMOKE_READ_ONLY_COMPONENT = "<fresh verified fixture>"
$env:ASCET_PERMISSION_SMOKE_FAILURE_COMPONENT = "<verified fixture>"
npm run smoke:ascet-extension:permission-modes
```

### Required scenarios

#### Setup

- [x] Runtime healthy.
- [x] Database fingerprint matches.
- [x] Smoke root absent.
- [x] Probe methods absent.
- [x] Compound and failure fixtures initially read-only.
- [x] Scheduler and CLI lock idle.

#### Default

- [x] Safe create asks once.
- [x] Confirmation remains open for more than 30 seconds.
- [x] Scheduler active count remains zero while waiting.
- [x] CLI lock remains unheld while waiting.
- [x] Approved create applies and passes readback.
- [x] Repeated create returns verified no-op without confirmation.

#### Accept Edits

- [x] Safe folder create auto-runs.
- [x] Editable component method create auto-runs.
- [x] Read-only safe-base operation asks once for compound scope.
- [x] Compound execution acquires editability and mutates in one guarded backend operation.
- [x] Readback passes.

#### Auto

- [x] Scoped safe allow auto-runs.
- [x] Medium operation without allow asks.
- [x] High-risk operation asks despite an allow rule.
- [x] Scoped deny blocks before Bridge mutation entry.

#### Capability regression

- [x] Preflight fails with the expected capability code.
- [x] No approval opens.
- [x] No editability acquisition occurs.
- [x] Bridge mutation is not entered.
- [x] Method remains absent.
- [x] Renderer reports `FAILED`, never `DONE`.

#### Post-acquisition failure

- [x] One compound approval opens.
- [x] Editability is acquired.
- [x] Primary mutation fails after acquisition.
- [x] Result is `partial` or verified `rolled_back` as appropriate.
- [x] Mutation-start metadata is accurate.
- [x] Final editable state is reported.
- [x] Method readback proves absence after failure/compensation.

#### Cleanup

- [x] Test-created methods are removed.
- [x] Test component and folders are removed.
- [x] Smoke root is absent by live Tree readback.
- [x] Final runtime and database identity are recorded.
- [x] Scheduler active and queued counts are zero.
- [x] CLI lock is not held.
- [x] Unresolved quarantine count is zero.
- [x] Final `summary.json` has `ok: true`.

## 9. Task F — Final Non-live Validation

Run after the complete live matrix passes.

### TypeScript

- [x] Run every modified specific test file from its owning package.
- [x] Run the ASCET non-e2e test command required by the repository.
- [x] Run the focused coding-agent permission tests.
- [x] Confirm the previous baseline or better: 396 ASCET tests and 30 focused coding-agent tests.

### C# and packaged assets

- [x] Build all registered Bridge sources through the repository command.
- [x] Run the registered C# smoke suite.
- [x] Confirm at least the previous baseline: 147 sources and 71 smoke operations.
- [x] Refresh packaged ASCET assets through the existing copy flow.
- [x] Verify exactly one Bridge executable and one ToolAPI DLL in the package.

### Repository check

```powershell
npm run check
```

- [x] Preserve full output.
- [x] Resolve every error, warning, and info.
- [x] Do not run `npm test` or `npm run build`.

## 10. Task G — Requirement-by-requirement Completion Audit

Audit all requirements from the parent development plan:

```text
CA-1 through CA-8
AP-1 through AP-4
AT-1 through AT-2
PF-1 through PF-4
CM-1 through CM-4
CF-1 through CF-3
EG-1 through EG-5
MC-1 through MC-5
AS-1 through AS-3
RC-1 through RC-3
BE-1 through BE-4
Stage 1 through Stage 5
Sections 19 through 25
```

Use a table with these columns:

```text
Requirement
Implementation evidence
Focused test evidence
Live evidence
Status
Remaining action
```

Rules:

- indirect evidence is insufficient;
- a passing test proves only the behavior it directly covers;
- missing live evidence remains incomplete;
- do not mark the plan complete while cleanup, locks, quarantine, or readback are unresolved.

## 11. Documentation Completion

After all gates pass:

- [x] Update the parent plan's progress checkpoint with final evidence paths.
- [x] Change the parent plan status from `Proposed` to the verified final state.
- [x] Remove or clearly close temporary paused-state warnings.
- [x] Verify all `[Unreleased]` changelog entries are present and no released section changed.
- [x] Record persistent editable-state effects explicitly.
- [x] Record final test counts and `npm run check` result.

## 12. Definition of Done

This follow-up plan is complete only when:

- [x] interrupted-run residue is cleaned and verified;
- [x] evidence numbering is deterministic;
- [x] cleanup-only recovery is safe and idempotent;
- [x] fresh fixtures are documented;
- [x] every Section 21 scenario passes in one uninterrupted serial run;
- [x] final cleanup/readback succeeds;
- [x] scheduler and CLI lock counts are zero;
- [x] unresolved quarantine count is zero;
- [x] all required TypeScript and C# validation passes;
- [x] packaged assets are verified;
- [x] `npm run check` passes;
- [x] every parent-plan requirement has direct completion evidence;
- [x] no required work remains.

## 13. Final Completion Record

Completed on August 15, 2026.

- Deterministic evidence numbering is active in both live scripts.
- Cleanup-only mode is fingerprint-bound, path-restricted, idempotent, and readback-verified.
- Unsafe-root and wrong-fingerprint negative gates were directly exercised and rejected before mutation.
- Interrupted-run residue and the later lingering Hill method were removed.
- Fresh compound and failure fixtures were discovered and verified before the final run.
- The complete Section 21 matrix passed uninterrupted at `artifacts/ascet-permission-live/20260815-134337`.
- Exact scoped deny now matches the planned mutation target rather than the existing safety anchor; focused guarded and tool-definition regressions pass.
- Final validation passed: 400 ASCET tests, 36 focused permission tests, 134 modified coding-agent tests, 147 C# sources, 71 C# smoke operations, strict packaged assets, and `npm run check`.
- Final smoke-root absence, method absence, database identity, zero scheduler/CLI lock, and zero quarantine are archived.
- The requirement-by-requirement audit is in the parent plan, Section 26.5.
- No commit was created.

