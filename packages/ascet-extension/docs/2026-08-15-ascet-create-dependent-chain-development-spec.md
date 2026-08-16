# ASCET Create Dependent Chain Development Task Specification

- Version: 1.1
- Date: 2026-08-15
- Status: Implemented and live-verified
- Scope: merge `ascet_edit.set_dependent_chain` into `ascet_edit.create_dependent_chain`

## 1. Decision

Expose one Agent-facing write action:

```text
ascet_edit.create_dependent_chain
```

It uses create-or-verify semantics and covers both creation and the previous set-only case:

```text
resolve Provider
    -> create or verify Provider Exported Element
    -> create or verify Consumer Imported Element
    -> create or verify Consumer Local Element
    -> configure or verify dependency binding
    -> automatic full readback
```

Remove these actions from Agent-facing schemas, descriptors, profiles, and prompts:

```text
ascet_edit.set_dependent_chain
configure_parameter_dependency_chain
```

Keep their useful validation, Bridge, readback, and rollback implementations as internal code. Do not maintain public compatibility aliases.

This specification supersedes the write-action, write-scope, registration, prompt, and write-test sections of:

```text
2026-08-15-ascet-dependent-chain-final-spec.md
```

The existing `ascet_read.read_dependent_chain` design remains valid.

## 2. Goals

The action must support:

1. Creating a complete Provider -> Imported -> Local dependency chain.
2. Reusing exact existing Elements.
3. Creating only missing Elements.
4. Configuring dependency metadata when all Elements already exist.
5. Returning an idempotent result when the complete chain already matches.
6. Rejecting same-named conflicting Elements or dependency bindings before mutation.
7. Performing mandatory automatic readback for every apply request.
8. Reversing mutations created by the current request when a later stage fails.
9. Serializing native ASCET writes without deadlock.
10. Returning compact Agent-oriented JSON without duplicated diagnostics.

## 3. Non-goals

Do not add:

```text
new top-level tool
new permission system
new Scheduler
new transaction framework
new Catalog, cache, index, or observation store
parallel native ASCET Search windows
multiple-link or graph creation in V1
implicit selection of an ambiguous Provider
backward-compatible public set_dependent_chain alias
```

V1 creates or verifies exactly one explicit dependency link.

## 4. Public request contract

```json
{
  "action": "create_dependent_chain",
  "provider": {
    "componentPath": "FeatureA\\Provider",
    "element": {
      "name": "P_TestValue",
      "modelType": "cont",
      "unit": "",
      "comment": "Test provider",
      "calibration": false,
      "range": {"mode": "none"},
      "data": {"mode": "ascetDefault"},
      "implementation": {"mode": "ascetDefault"}
    }
  },
  "consumer": {
    "componentPath": "FeatureA\\Consumer",
    "importedElement": {
      "name": "P_TestValue",
      "modelType": "cont",
      "unit": ""
    },
    "localElement": {
      "name": "C_TestValue",
      "modelType": "cont",
      "unit": "",
      "comment": "Test dependent parameter",
      "calibration": false,
      "range": {"mode": "none"},
      "implementation": {"mode": "ascetDefault"}
    }
  },
  "binding": {
    "formula": "P_TestValue",
    "formal": "P_TestValue",
    "variantPolicy": "default"
  },
  "intent": "preview"
}
```

Public TypeScript shape:

```ts
type CreateDependentChainParams = {
	action: "create_dependent_chain";
	provider: {
		componentPath?: string;
		element: ExportedElementSpec;
	};
	consumer: {
		componentPath: string;
		importedElement: ImportedElementSpec;
		localElement: LocalElementSpec;
	};
	binding: {
		formula: string;
		formal: string;
		variantPolicy: "default" | "selected" | "all";
		variants?: string[];
	};
	intent: "preview" | "apply";
};
```

Rules:

- Element definitions are explicit so creation never guesses model type, scope, unit, value, range, implementation, or calibration metadata.
- `variants` is required only for `variantPolicy="selected"` and forbidden otherwise.
- Empty names, paths, Formula, and Formal values are rejected.
- Reject old generic fields: `formals`, `mappings`, `bindingPolicy`, `mode`, and `planId`.
- Do not accept `set_dependent_chain` as a public action.

## 5. Provider resolution

When `provider.componentPath` is present:

```text
read and validate the exact Component and Element
```

Do not run Search.

When it is omitted:

```text
run a new live native Element Search for provider.element.name
    -> parse bounded Component path hints
    -> exact-read and validate every candidate
```

A valid Provider candidate must match:

```text
exact Element name
Parameter kind
scope=exported
compatible model type
same database identity
existing exact Component path
```

Resolution:

```text
0 valid candidates -> provider_not_found
1 valid candidate  -> continue
2+ candidates      -> provider_ambiguous
```

Search results are hints only. Never select the first same-named result. Do not retain Search data in a Catalog or cache.

Search must finish and release its scheduled ToolAPI operation before the guarded write operation starts.

## 6. Create-or-verify rules

For Provider Exported, Consumer Imported, and Consumer Local Elements:

```text
missing             -> add create operation
existing and exact  -> reuse
same name, conflict -> reject before first mutation
```

Canonical comparison must include every field that affects the requested ASCET Element definition. ASCET default values may be normalized before comparison, but a material mismatch must never be silently overwritten.

For the dependency binding:

```text
missing             -> add configure operation
existing and exact  -> reuse
existing, different -> dependency_conflict before first mutation
```

Do not delete, recreate, overwrite, or retarget conflicting existing objects.

## 7. Preview behavior

`intent="preview"` performs:

```text
resolve Provider
    -> exact current-state reads
    -> canonical comparison
    -> conflict validation
    -> mutation-plan generation
```

Preview must not:

```text
request approval
acquire editable targets
perform mutation
perform post-write readback
```

Example:

```json
{
  "ok": true,
  "changed": true,
  "effects": {
    "create": ["consumer.imported", "consumer.local"],
    "configure": ["dependency"]
  }
}
```

A fully matching chain returns:

```json
{"ok":true,"changed":false,"idempotent":true}
```

## 8. Apply and permission flow

Use the existing standard edit pipeline:

```text
runAscetEdit
    -> initial preflight
    -> permission decision
    -> one approval
    -> guarded Scheduler submission
    -> preflight revalidation
    -> expected-before-state comparison
    -> fresh Provider and Consumer editability checks
    -> one Bridge apply session
    -> mandatory automatic readback
```

Permission descriptor:

```ts
create_dependent_chain: high({
	autoApprovable: false,
	requiresEditableTarget: true,
	requiresCompleteImpact: true,
	requiresReadback: true,
})
```

Requirements:

- Preview does not request approval.
- Apply uses the same permission modes and errors as other `ascet_edit` actions.
- Missing approval UI returns the standard `ascet_edit_approval_required` result.
- Approval occurs exactly once and outside the Scheduler slot.
- Do not call the standalone tool's legacy `requestAscetEditApproval()` flow.
- Both Provider and Consumer receive fresh editability checks after approval.

## 9. State binding and concurrency

Initial preflight captures a target-specific semantic snapshot:

```text
Provider Element
Consumer Imported Element
Consumer Local Element
Dependency binding
```

It does not hash or compare the complete Component Catalog.

After approval and inside the Scheduler write slot:

```text
repeat preflight
    -> compare the four semantic target states directly
    -> reject when any target state differs
```

A mismatch returns `target_state_changed` without mutation.

The guarded write slot covers:

```text
preflight revalidation
mutation
post-write readback
optional rollback
rollback readback
```

Do not run native Search while holding this slot. Concurrent calls may be submitted, but native ASCET writes remain serialized per ASCET instance.

## 10. Mutation order

Use one Bridge apply session:

```text
1. Provider Exported Element create-or-verify
2. Consumer Imported Element create-or-verify
3. Consumer Local Element create-or-verify
4. Dependency binding configure-or-verify
5. Full automatic readback
```

Track only mutations performed by the current request. Existing exact objects are not rollback entries.

## 11. Mandatory automatic readback

Every apply request performs full readback, including a fully idempotent request that performed no mutation.

Extract or reuse one internal reader:

```ts
readDependentChainSnapshot()
```

Both public read and internal write verification use it directly:

```text
ascet_read.read_dependent_chain
    -> readDependentChainSnapshot()

ascet_edit.create_dependent_chain
    -> readDependentChainSnapshot()
```

`create_dependent_chain` must not invoke the public `ascet_read` tool adapter.

Readback verifies:

```text
Provider Component path and Exported Element
Consumer Component path and Imported Element
Consumer Component path and Local Element
Element kinds, scopes, and compatible types
dependency Formula
Formal-to-Imported mapping
variant policy and selected variants
complete Provider -> Imported -> Local direction
same database identity
```

Success invariant:

```text
ok=true for apply implies verified=true
```

No completed readback means no successful apply result.

## 12. Rollback

When a mutation or readback stage fails, reverse only changes made by the current request:

```text
Dependency binding
    -> Consumer Local Element
    -> Consumer Imported Element
    -> Provider Exported Element
```

After rollback, perform rollback readback before reporting `rolled_back`.

Result classes:

```text
rolled_back
rollback_failed
unknown_outcome
```

Rules:

- Never delete an object that existed before the request.
- Stop after rollback failure; do not continue mutation.
- A lost Bridge/ASCET connection that prevents final-state verification returns `unknown_outcome`.
- Never convert an unverified final state into `ok=true`.

## 13. Compact result contract

Created complete chain:

```json
{
  "ok": true,
  "changed": true,
  "verified": true,
  "created": ["provider", "imported", "local"],
  "configured": ["dependency"]
}
```

Previous set-only case:

```json
{
  "ok": true,
  "changed": true,
  "verified": true,
  "configured": ["dependency"]
}
```

Idempotent apply:

```json
{
  "ok": true,
  "changed": false,
  "idempotent": true,
  "verified": true
}
```

Ambiguous Provider:

```json
{
  "ok": false,
  "code": "provider_ambiguous",
  "candidates": [
    "FeatureA\\ProviderA\\P_TestValue",
    "FeatureA\\ProviderB\\P_TestValue"
  ]
}
```

Conflict:

```json
{
  "ok": false,
  "code": "element_conflict",
  "target": "consumer.local"
}
```

Agent content is limited to business outcome fields:

```text
ok
changed
idempotent
verified
effects
created
configured
code
target
candidates
```

Tool `details` contains diagnostics only:

```text
database identity and semantic target snapshots
Search timing and Scheduler wait
candidate rejection reasons
Bridge request and stage telemetry
before/after canonical snapshots
expected/actual readback differences
rollback diagnostics
```

Do not duplicate business results or the full dependency chain in both content and `details`.

## 14. Public error contract

Keep the public set small:

```text
component_not_found
provider_not_found
provider_ambiguous
provider_incompatible
element_definition_invalid
element_conflict
dependency_conflict
binding_invalid
database_changed
target_state_changed
ascet_edit_approval_required
write_rejected
readback_mismatch
rolled_back
rollback_failed
unknown_outcome
```

CLI, ToolAPI, parsing, stack, and transport errors stay in `details`.

## 15. Implementation files

Add:

```text
packages/ascet-extension/src/create-dependent-chain.ts
```

Modify as required:

```text
packages/ascet-extension/src/set-dependent-chain.ts
packages/ascet-extension/src/configure-parameter-dependency-chain.ts
packages/ascet-extension/src/read-dependent-chain.ts
packages/ascet-extension/src/tools/edit/schema.ts
packages/ascet-extension/src/tools/edit/definition.ts
packages/ascet-extension/src/tools/actions/descriptors.ts
packages/ascet-extension/src/permissions/descriptors.ts
packages/ascet-extension/src/edit/contract.ts
packages/ascet-extension/src/edit/service.ts
packages/ascet-extension/contracts/catalog-snapshot.json
```

C# Bridge code may be changed only where required to add preview, expected-state validation, create-or-verify, readback, or rollback behavior to the existing dependency-chain operation.

Do not create repository, strategy, provider, pipeline, or transaction class hierarchies. Use plain functions and small discriminated result types.

## 16. Development tasks

### Task 1: Contract tests first

- [x] Add failing Schema tests for `create_dependent_chain`.
- [x] Reject `set_dependent_chain` and old generic fields.
- [x] Add compact result contract tests.

### Task 2: Shared readback

- [x] Extract or normalize `readDependentChainSnapshot()`.
- [x] Keep `ascet_read.read_dependent_chain` behavior stable.
- [x] Add exact snapshot comparison tests.

### Task 3: Provider resolution

- [x] Reuse live `runAscetSearch()`.
- [x] Skip Search for explicit Provider paths.
- [x] Validate every Search hint with exact reads.
- [x] Reject zero and ambiguous valid candidates.

### Task 4: Preflight and planning

- [x] Canonicalize requested and current Element definitions.
- [x] Build a minimal mutation plan.
- [x] Reject all conflicts before mutation.
- [x] Capture the target-specific before-state semantic snapshot.

### Task 5: Guarded edit integration

- [x] Register the permission descriptor.
- [x] Route through `runAscetEdit` and the guarded mutation service.
- [x] Confirm once outside Scheduler.
- [x] Revalidate state and editability inside Scheduler.

### Task 6: Bridge execution

- [x] Add preview/apply and expected semantic-state comparison to the existing operation.
- [x] Execute create-or-verify stages in fixed order.
- [x] Record only current-request mutations.
- [x] Perform automatic full readback before success.

### Task 7: Rollback

- [x] Reverse current-request mutations on failure.
- [x] Perform rollback readback.
- [x] Distinguish rolled-back, rollback-failed, and unknown outcomes.

### Task 8: Registration migration

- [x] Register `ascet_edit.create_dependent_chain`.
- [x] Remove `set_dependent_chain` from public Schema and descriptors.
- [x] Remove standalone dependency-chain tool registration.
- [x] Update prompts and catalog snapshot.
- [x] Retain internal helpers until all callers are migrated.

### Task 9: Verification

- [x] Run targeted tests after each changed test file.
- [x] Run `npm run check` after code changes.
- [x] Perform real ASCET preview, apply, idempotency, conflict, and concurrency tests.
- [x] Save a final live-test report.

Verification record on 2026-08-15:

```text
TypeScript targeted tests: 54/54 passed
C# production build: passed
C# dependency-chain output test: passed
npm run check: passed
Real ASCET report: ascetcli/output/ascet-create-chain-tests/20260815-230930/FINAL-TEST-RESULTS.json
Real ASCET acceptance: preview, apply, independent readback, idempotency, set-only, partial, Element conflict, Dependency conflict, rollback, same-chain concurrency, different-chain concurrency, cleanup
Final cleanup: temporary Folder absent
ASCET process: responding
```

## 17. Automated test matrix

### Schema

- Accept the new complete request.
- Reject incomplete Provider, Consumer, binding, and intent data.
- Reject illegal variant combinations.
- Reject old fields and old public actions.

### Provider resolution

- Explicit path performs no Search.
- Unique live Search result succeeds after exact validation.
- Zero result returns `provider_not_found`.
- Multiple valid results return `provider_ambiguous`.
- Malformed Search labels are skipped safely.
- Wrong kind, scope, type, path, or database candidates are rejected.

### Preview

- Performs zero mutation.
- Requests no approval.
- Acquires no editable target.
- Produces exact create/configure effects.
- Fully existing chain reports no change.

### Permission and state guards

- Matches other `ascet_edit` permission modes.
- Missing approval UI returns the standard error.
- Approval occurs once and outside Scheduler.
- Provider and Consumer receive fresh editability checks.
- Changed database identity is rejected.
- Changed Provider, Imported, Local, or Dependency semantic state is rejected before mutation.

### Create-or-verify

- All missing Elements are created.
- Partial exact chain creates only missing objects.
- Existing Elements plus missing dependency reproduces the previous set behavior.
- Fully existing chain returns `changed=false`.
- Element conflict causes zero mutation.
- Dependency conflict causes zero mutation.

### Automatic readback

- Mutating apply performs full readback.
- Idempotent apply also performs full readback.
- Exact state returns `verified=true`.
- Mismatch never returns success.
- Public `ascet_read` adapter is not called internally.
- Scheduler lock remains held until readback completes.

### Rollback

- Failure after each mutation stage reverses completed current-request mutations.
- Readback mismatch triggers rollback.
- Existing pre-request objects are never removed.
- Successful rollback is verified.
- Rollback failure stops processing.
- Lost final-state visibility returns `unknown_outcome`.

### Concurrency

- Concurrent same-chain requests serialize without duplicate objects.
- Concurrent different-chain requests serialize without deadlock.
- Preview and apply combinations complete without nested Scheduler acquisition.
- A failed call does not block subsequent calls.
- No Search window, helper process, handle, or temporary-file residue remains.

## 18. Test commands

Run targeted tests from `packages/ascet-extension`:

```powershell
node ../../node_modules/vitest/dist/cli.js --run test/create-dependent-chain-schema.test.ts
node ../../node_modules/vitest/dist/cli.js --run test/create-dependent-chain-permissions.test.ts
node ../../node_modules/vitest/dist/cli.js --run test/create-dependent-chain.test.ts
node ../../node_modules/vitest/dist/cli.js --run test/create-dependent-chain-concurrency.test.ts
```

After code changes run from the repository root:

```powershell
npm run check
```

Do not run the full Vitest suite, `npm test`, or `npm run build` unless explicitly requested.

## 19. Live ASCET acceptance

Use a dedicated test scope and unique names:

```text
P_PI_ChainTest_<timestamp>
C_PI_ChainTest_<timestamp>
```

Execute:

1. Preview a fully missing chain and verify zero mutation.
2. Apply it and require `changed=true` and `verified=true`.
3. Independently call `read_dependent_chain` and compare the complete chain.
4. Apply the same request again and require `changed=false`, `idempotent=true`, and `verified=true`.
5. Test the previous set-only case with three existing exact Elements and a missing dependency.
6. Test a partially existing chain and verify only missing objects are created.
7. Introduce an Element definition conflict and verify zero mutation.
8. Introduce a dependency conflict and verify no overwrite.
9. Submit concurrent same-chain and different-chain requests.
10. Verify no deadlock, ASCET crash, Search window residue, process residue, handle growth, or temporary-file residue.
11. Save requests, compact results, timings, and failure diagnostics in the final report.

A live apply is successful only when automatic readback completes. An independent `read_dependent_chain` call is an acceptance cross-check, not part of normal Agent workflow.

## 20. Completion criteria

The task is complete only when:

1. `ascet_edit.create_dependent_chain` is the only Agent-facing dependency-chain write action.
2. The previous set-only behavior works through create-or-verify semantics.
3. Preview performs no approval, editability acquisition, or mutation.
4. Apply uses the standard edit permission and Scheduler pipeline.
5. Approval occurs once outside Scheduler.
6. Provider and Consumer are revalidated and editable before mutation.
7. Conflicts are detected before the first mutation.
8. Every apply result marked successful has `verified=true` from automatic readback.
9. Failure rollback and rollback readback follow the defined outcome contract.
10. Concurrent calls complete without deadlock or duplicate creation.
11. Agent JSON is compact and does not duplicate diagnostics.
12. Targeted tests and `npm run check` pass.
13. Real ASCET preview, apply, idempotency, set-only, conflict, rollback, and concurrency acceptance passes.
