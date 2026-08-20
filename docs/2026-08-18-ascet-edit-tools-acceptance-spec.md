# ASCET Edit Tools Final Action-Level Acceptance Specification

## 1. Current status

Snapshot date: 2026-08-18.

This is the coordinator result for the 17 public `ascet_edit` action entries.

```text
PASS:     17
FAIL:      0
BLOCKED:   0
TOTAL:    17
```

The requested action-level scope is complete. The 17/17 classification applies to the accepted component-direct action-level route; it does not certify every target kind or variant. The broader 55-variant/220-scenario matrix, independent packaged-Bridge campaign, performance acceptance, and cleanup acceptance are not claimed complete.

## 2. Fixed environment

```text
database: C:\Repo\F05_IPB_L2_0429
project: PI_ASCET_EDIT_20260818_ALL_ACTIONS_008\Core\Project
source Bridge: ascetcli/output/ascet-csharp/bin/AscetBridge.exe
packaged Bridge: packages/ascet-extension/ascet-cli/bin/AscetBridge.exe
Bridge SHA-256: FBC9B9A443A0845673D53034687A3AB6C8A9D18926DCE7B596A397DF16A395CF
cleanup: not executed; user-authorized mutation intentionally retained for this session
```

Source and packaged Bridge files have identical SHA-256. The live repair evidence was executed through the source Bridge. The `20260818` campaign identifier and document snapshot date are the evidence provenance labels; filesystem timestamps are environment-local and are not used as acceptance chronology.

## 3. Acceptance gates

Changed write PASS requires:

```text
outcome.status=ok
changed=true
mutationStatus=applied
saveAttempted=true
saveSucceeded=true
saveState=saved
verified=true
verificationStatus=passed
sessionCount=1
saveCount=1
nativeMutationAttemptCount=1
```

For `mode=set`, the action-level changed-success gate is:

```text
precondition: mode=check -> editable=false
write:       mode=set -> editable=true
postcondition: mode=check -> editable=true
```

## 4. Action-level matrix

| Public action | Result | Evidence / decision |
|---|---:|---|
| `create_folder` | PASS | changed/no-op: `source-20260818-remaining-pass-final-001`, `source-20260818-final-targeted-003`. |
| `create_component` | PASS | changed/no-op: `source-20260818-remaining-pass-final-001`, `source-20260818-final-targeted-003`. |
| `create_method` | PASS | `source-20260818-final-targeted-003`, `source-20260818-remaining-pass-final-001`. |
| `create_dependent_chain` | PASS | `source-20260818-edit-fixes-live-004`: changed/no-op and independent `read_dependent_chain` readback. |
| `set_method_signature` | PASS | `source-20260818-final-targeted-003`. |
| `delete_component` | PASS | `source-20260818-remaining-pass-final-001`. |
| `delete_method` | PASS | `source-20260818-remaining-pass-final-001`. |
| `delete_folder` | PASS | `source-20260818-remaining-pass-final-001`. |
| `set_method_code` | PASS | `source-20260818-final-targeted-003`. |
| `set_module_code` | PASS | `source-20260818-final-targeted-003`. |
| `set_state_machine_code` | PASS | `source-20260818-final-targeted-003`. |
| `set_enumerators` | PASS | `source-20260818-final-targeted-003`. |
| `apply_element_spec` | PASS | `source-20260818-remaining-pass-final-001` plus independent element readback. |
| `apply_project_formula` | PASS | `source-20260818-project-formula-final-001` plus public formula readback. |
| `set_element_dependency` | PASS | `source-20260818-edit-fixes-live-003`: changed/no-op and independent dependency readback. |
| `mode=check` | PASS | Existing read-only checks plus current target precondition. |
| `mode=set` | PASS | `source-20260818-mode-set-live-001`: current database target `PlatformLibrary\Parameter\Environment\_Environment_MBP`, precondition false, set returned true, postcondition true. |

## 5. Repair implementation

### `create_dependent_chain`

- Provider, Consumer, and Local element stages use deferred Save.
- Dependency stage uses the internal deferred-save dependency route.
- The composed operation performs one explicit database Save after all stages.
- Changed and no-op results expose canonical Save/session/mutation fields.

### `set_element_dependency`

- Public direct path performs one explicit database Save for changed writes.
- Composed chain path can defer Save to its outer transaction.
- Independent restoration compares selected DataVariant state against the requested policy before importing XML.
- `ascetDefault` Numeric `0.0` and Logic `false` states are confirmed no-op; non-default states still write.

### `mode=set`

- Source-level TCM and generic SCM behavior is covered by focused tests.
- Live changed-success was executed on the user-authorized current database target `PlatformLibrary\Parameter\Environment\_Environment_MBP`.
- The target transitioned from `editable=false` to `editable=true` and was independently checked after the write.
- A second set probe returned `editable=true`; it is recorded as an idempotence probe, not promoted to canonical no-op because the Bridge metadata reports `mutationStarted=true`.

## 6. Retained repair evidence

```text
artifacts/ascet-edit-live/source-20260818-edit-fixes-live-003/
  03-changed-independent.json
  04-independent-readback.json
  05-confirmed-no-op.json
  06-no-op-readback.json
  focused-set-dependency.log
  verification-summary.json

artifacts/ascet-edit-live/source-20260818-edit-fixes-live-004/
  02-create-dependent-chain-changed.json
  03-independent-readback-changed.json
  04-create-dependent-chain-confirmed-no-op.json
  05-independent-readback-no-op.json
  focused-chain.log
  focused-mode-set-source.log
  live-harness.log
  npm-run-check.log
  verification-summary.json

artifacts/ascet-edit-live/source-20260818-mode-set-live-001/
  01-mode-check-before.json
  02-mode-set.json
  03-mode-check-after.json
  04-mode-set-confirmed-no-op.json
  05-mode-check-after-no-op.json
  database-identity.stdout.json
  verification-summary.json
```

Historical failed/blocked evidence remains retained and was not overwritten.

## 7. Verification record

```text
AscetSetElementDependencyOutputTest:        PASS, 38 runtime assertions
AscetDependencyCanonicalOutputTest:         PASS, 30 runtime assertions
AscetComponentEditableTcmOutputTest:       PASS
ASCET live harness tests:                   PASS, 19/19
npm run check:                              PASS (FINAL_EXIT_CODE=0)
mode=set precondition:                      editable=false
mode=set changed write:                     editable=true
mode=set independent postcondition:         editable=true
```

The retained focused logs include explicit `FINAL_EXIT_CODE=0` markers. Their `NativeCommandError`-formatted lines are expected PowerShell rendering of the runner pass marker written to stderr, not functional test failures. The selected public edit test command still contains two stale assertions expecting retired `intent=preview` behavior. The current implementation intentionally rejects that parameter; this is outside the three-action repair scope and was not used as acceptance evidence.

## 8. Scope caveats and remaining work

1. The legacy folder-target path of `set_element_dependency` still has separate blocked Save evidence; it is outside the repaired component-direct action-level route.
2. Execute the full 55-variant/220-scenario matrix.
3. Run an independent packaged-Bridge live campaign.
4. Run performance acceptance with retained warm-run data, median, and P95.
5. Perform cleanup only after human evidence review; retain all evidence.

## 9. Decision

```text
Action-level classification: 17 PASS / 0 FAIL / 0 BLOCKED
Requested three-action repair: complete
Full release/variant Definition of Done: incomplete
```


