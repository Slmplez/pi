# ASCET Edit Contract/Runtime Alignment Development Specification

## 1. Metadata

- Date: 2026-08-23
- Status: Implementation-ready development specification
- Priority: P0
- Scope: Public `ascet_edit` contract, runtime validation, permission evidence, result envelopes, editability recovery, and documentation alignment
- Primary objective: remove the contract/runtime drift introduced by the direct fast-write migration

This specification is based on:

- `docs/2026-08-17-ascet-edit-fast-write-development-task-spec.md`
- `docs/2026-08-18-ascet-edit-tools-p0-repair-spec.md`
- `docs/2026-08-18-ascet-edit-tools-acceptance-spec.md`
- the current TypeScript and C# implementation as of 2026-08-23

### Authority and precedence

For behavior not changed here, the 2026-08-17 fast-write development specification remains authoritative. The 2026-08-18 P0 repair specification remains authoritative for explicit Save ownership, changed/no-op persistence evidence, rollback safety, and action-level evidence requirements. The 2026-08-18 acceptance specification is historical acceptance evidence, not proof that the current public contract is aligned.

Where this specification conflicts with an older document, this specification controls the public `ascet_edit` contract and the implementation work described here. Historical documents must not be rewritten to conceal their previous behavior; they may be reconciled in a later documentation task as described in Section 12.

## 2. Problem statement

The direct fast-write path is now the normal runtime for `ascet_edit` mutations, but the public Schema, action guidance, capabilities catalog, static rules, templates, Skills, and parts of the test suite still describe the retired guarded preview/preflight flow.

The current drift is visible in the source:

- `packages/ascet-extension/src/edit/write-control-contract.ts` exposes `AscetMutationIntent = "preview" | "apply"`.
- `packages/ascet-extension/src/tools/actions/contracts/edit.ts` applies that control to all 14 ordinary mutation actions and exposes `mode=set` with `preview | apply`.
- `packages/ascet-extension/src/tools/actions/contracts/dependency.ts` exposes `create_dependent_chain` with `preview | apply` and an optional `provider.componentPath`.
- `packages/ascet-extension/src/edit/fast-path.ts` rejects non-`apply` mutation calls before Bridge dispatch.
- `packages/ascet-extension/src/create-dependent-chain.ts` rejects `preview` and requires `provider.componentPath` at runtime.
- `packages/ascet-extension/src/edit/editability.ts` currently translates `mode=set, intent=preview` into a check request, while the public wrapper can still report the original `set` route metadata.
- `packages/ascet-extension/src/tools/actions/contracts/edit.ts` still publishes preflight rules and a permissive result schema.
- `packages/ascet-extension/src/edit/service.ts` contains semantic validation in `_validateAscetMutationParams`, but the active fast path does not call it.
- The permission evaluation API already accepts `databaseFingerprint`, `targetCount`, and `variantCount`, but the direct paths currently hard-code or omit parts of that evidence.
- `ascetcli/src/AscetCli/AscetComponentEditable.cs` can perform multiple SCM-native commands on the TCM path, while the adapter/error path does not preserve enough partial-success state for recovery.

This is a contract/runtime alignment defect. It is not an AVH model logic defect and must not be fixed by changing AVH formulas, model data, or Bridge dependency semantics.

## 3. Final public contract

The public contract is deliberately narrower than the historical guarded contract.

```text
ascet_edit mutation action       -> intent="apply" only
ascet_edit mode="set"            -> intent="apply" only
ascet_edit mode="check"          -> sole public read-only editability entry
```

`preview` is removed from the public `ascet_edit` API. It must not appear in public TypeScript types, TypeBox/OpenAI schemas, guidance, few-shots, capabilities/catalog output, compact prompts, project rules, templates, Skills, public tests, or public operation allowlists.

A lower-level Bridge or recovery implementation may retain a dry-run or legacy preview operation only when it is unreachable from normal `ascet_edit` routes, explicitly marked legacy/recovery-only, and covered by a separate allowlist. Internal retention is not public support.

### 3.1 Retained public action set

The public action set remains 17 entries:

1. `create_folder`
2. `create_component`
3. `create_method`
4. `set_method_signature`
5. `delete_component`
6. `delete_method`
7. `delete_folder`
8. `set_method_code`
9. `set_module_code`
10. `set_state_machine_code`
11. `set_enumerators`
12. `apply_element_spec`
13. `apply_project_formula`
14. `set_element_dependency`
15. `create_dependent_chain`
16. `mode=check`
17. `mode=set`

No action may be removed, renamed, hidden, or redirected to a legacy plan/preflight route.

### 3.2 Public intent types

Replace the shared public union with an apply-only public type. If an internal operation still needs a preview-like control, define a separate internal type that cannot be imported by public action contracts.

```ts
export type AscetPublicMutationIntent = "apply";

export const ascetPublicWriteControlProperties = {
  intent: Type.Literal("apply"),
};
```

The implementation must not use one `"preview" | "apply"` type for both public requests and internal Bridge controls.

### 3.3 Editability modes

```ts
type AscetEditabilityParams =
  | { mode: "check"; componentPath: string }
  | { mode: "set"; componentPath: string; intent: "apply" };
```

`mode=check` is read-only, performs exactly one `component_editable_check`, does not enter write approval, and does not accept `intent`.

`mode=set` is a write, requires `intent="apply"`, performs exactly one public `component_editable_set` request, and must not alias `preview` to `check`.

Direct callers that bypass the public Schema must fail closed before native SCM work when intent is invalid or missing.

## 4. Required normal route

The normal mutation route remains a bounded direct fast-write route:

```text
request
-> structural Schema validation
-> normalization
-> active semantic validation
-> canonical target and permission evidence
-> permission decision and approval
-> one Bridge write request
-> one ASCET session
-> native mutation
-> bounded same-session read-only retry when proven safe
-> explicit Save when data changed
-> same-session minimum verification
-> strict result normalization
```

The normal route must not perform full-library `get_tree`, database-wide identity/search/read orchestration, preview-to-plan-to-commit, plan stores/IDs, TypeScript preflight for ordinary writes, a second Bridge request/session solely for verification, or database-wide impact collection.

Normal routes must not call legacy `preflight_*`, `guarded_*`, or `configure_parameter_dependency_chain_execute` operations when a dedicated direct operation exists. Native calls inside one Bridge session remain allowed; adapter-level multi-session orchestration does not.

## 5. Active semantic validation

Structural TypeBox validation is not sufficient. The normalized request must be validated before permission approval and Bridge dispatch.

### 5.1 Required order

```text
1. Resolve the public discriminator.
2. Validate the action schema.
3. Normalize aliases, whitespace, paths, and defaults.
4. Validate action-specific cross-field constraints.
5. Validate public intent/mode invariants.
6. Build truthful permission evidence.
7. Evaluate permission and request approval.
8. Dispatch one Bridge request.
```

Steps 1-5 must make zero Bridge calls and return structured `ascet_edit_invalid_parameter` or a more specific error with `mutationStatus=not_started`. Plain builder/temp-file exceptions must not escape the public boundary.

The existing `_validateAscetMutationParams` in `packages/ascet-extension/src/edit/service.ts` must be moved to a shared validation module or called from the active fast path. It must not remain dead code.

### 5.2 Normalization

Normalize once and reuse the result for validation, permission matching, approval text, Bridge arguments/request files, telemetry, and result metadata.

At minimum:

- trim and canonicalize paths;
- reject empty-after-trim paths;
- resolve `targetPath`/`componentPath` aliases before validation;
- apply only documented defaults, such as ESDL for class/module creation when language is omitted;
- reject conflicting aliases rather than silently preferring one;
- never infer a Provider path or dependency mapping from an unrelated search result.

## 6. Action-specific contract matrix

Every violation below must be rejected before Bridge dispatch.

| Action | Required/conditional constraints | Required verification |
|---|---|---|
| `create_folder` | Non-empty canonical `folderPath`; `intent="apply"`; explicit `ifExists` result behavior. | Created folder or confirmed existing/no-op state. |
| `create_component` | Valid path/kind; compatible language; honor `ifExists` and rollback policy. | Component exists with requested kind/language. |
| `create_method` | Valid component/method; compatible `methodKind`/`componentKind`, or resolve kind in the same Bridge session. | Method exists and is resolvable. |
| `set_method_signature` | `returnType` or non-empty `arguments`; unique argument names; `ifReturnExists` only with return update. | Target method remains resolvable. |
| `delete_component` | Canonical path and explicit `ifMissing` behavior. | Absence or authoritative ignored no-op. |
| `delete_method` | Canonical component/method and explicit `ifMissing` behavior. | Method absence or authoritative ignored no-op. |
| `delete_folder` | Canonical path; actual impact count, not fixed 1. | Folder absence and bounded deletion result. |
| `set_method_code` | Exactly one of `code` and `codeFile`; neither/both invalid. | Method target/code verification. |
| `set_module_code` | One required `operation`; `set-method` requires `methodName`; exactly one code source; reject alias conflicts. | Operation-specific target verification. |
| `set_state_machine_code` | Operation-discriminated schema; operation-specific required fields. | Same-session operation-specific verification. |
| `set_enumerators` | At least one; unique names; no transport delimiter; preserve order. | Exact names and order. |
| `apply_element_spec` | At least one element; role/intent fields; explicit project for non-identity formula; no accepted-and-ignored targets. | Role-specific persistence/readback. |
| `apply_project_formula` | Required readable project/spec paths; explicit restore/delete-missing semantics; impact not assumed single-target. | Formula application/restore and required presence/absence checks. |
| `set_element_dependency` | One target; aliases agree; dependency constraints in Section 6.2; folder writes require `match="all"`. | Formula, mappings, variants, restoration, persistence. |
| `create_dependent_chain` | Required provider path; complete Provider/Imported/Local definitions; Section 7 binding rules; apply-only. | Complete chain readback and strict persistence. |

### 6.1 State-machine operation variants

Use a discriminated union keyed by `operation`:

| Operation family | Required fields | Forbidden/irrelevant fields |
|---|---|---|
| `set-method` | `methodName` and exactly one code source | state/transition fields |
| `set-state-entry-esdl`, `set-state-exit-esdl`, `set-state-static-esdl` | `stateName` and exactly one code source | transition/method-binding fields |
| `bind-state-entry-method`, `bind-state-exit-method`, `bind-state-static-method` | `stateName` and `methodName` | code and transition fields |
| `set-transition-condition-esdl`, `set-transition-action-esdl` | `sourceState`, `targetState`, `priority`, exactly one code source | state-only/method fields |
| `bind-transition-condition-method`, `bind-transition-action-method` | `sourceState`, `targetState`, `priority`, `methodName` | code and state-only fields |
| `set-start-state` | `stateName` | code, method, transition, priority fields |

Do not build positional arguments by deleting `undefined` values when omitted leading fields can shift later arguments.

### 6.2 `set_element_dependency` rules

- `targetPath` or `componentPath` is required; both, if present, normalize to the same path.
- Dependent writes require formula and explicit mapping policy.
- Formula requires mappings, or `autoExactName` plus explicit formals; formula token inference is disabled.
- Mapping keys and formals match exactly.
- `autoExactName` cannot combine with per-variant explicit mappings.
- Data writes require `variantPolicy`.
- `selected` requires unique non-empty `variants`; other policies omit them.
- `variantMappings` requires `selected` and defines exactly every selected variant.
- Independent conversion requires `valueRestoration`; explicit restoration requires `valuesByVariant`.
- Folder targets require `targetKind="folder"` and `match="all"`.
- Folder impact count must reflect actual/conservative scope, never fixed 1.

### 6.3 `apply_element_spec` rules

- `elements` has `minItems=1`.
- Role-specific create fields are validated before writing.
- Existing patches preserve unspecified live fields.
- `upsert` reads/merges a live object in the same Bridge session or requires a complete create shape.
- `dataTarget` and `implementationTarget` are wired end-to-end or removed; accepted-and-ignored fields are forbidden.
- `ident` does not require a project; every other implementation formula requires one explicit `projectPath`.

## 7. `create_dependent_chain` contract

### 7.1 Provider path

`provider.componentPath` becomes required in the public schema and TypeScript type.

The direct runtime already returns `provider_path_required` when it is absent. The public contract must not promise provider discovery while the normal direct route rejects it.

If a future provider-discovery feature is required, it must be a separately specified route with bounded candidate validation, explicit ambiguity errors, permission impact calculation, and dedicated tests. It is not part of this repair.

### 7.2 Binding semantics

The fields have distinct meanings:

```text
binding.formula -> dependency expression
binding.formal  -> local formal identifier used inside formula
consumer.importedElement.name -> target Imported Parameter name
```

The public request:

```ts
binding: {
  formula: "x",
  formal: "x",
  variantPolicy: "default",
}
```

with:

```text
consumer.importedElement.name = "P_AVH_SlopeSuppressOn"
```

must produce the Bridge dependency body:

```text
formula = "x"
formals = ["x"]
mappings["x"] = { kind: "parameter", name: "P_AVH_SlopeSuppressOn" }
```

The mapping is therefore:

```text
x -> P_AVH_SlopeSuppressOn
```

The implementation must not rewrite the formula to the Imported Parameter name and must not assume that `formal` equals the Imported Parameter name.

### 7.3 Binding validation

Before Bridge dispatch:

- `formal` must be a valid identifier according to the supported ASCET expression grammar.
- `formula` must reference the declared formal identifier.
- The public contract must document the current single-formal mapping behavior.
- Provider and Imported Parameter names must match where the ASCET chain contract requires same-named endpoints.
- Provider and Imported model types must be compatible.
- `variantPolicy="selected"` requires unique `variants`; other policies must omit them.
- Missing, conflicting, or guessed metadata is a structured validation failure.

### 7.4 Chain persistence

The complete public chain write remains one composed transaction:

```text
resolve exact provider/consumer targets
-> create/reuse Provider, Imported, and Local elements in one session
-> configure the dependency with deferred internal Save ownership
-> perform one final database Save when changed
-> verify the complete chain in the same session
```

An internal stage success is not public persistence success. The final chain result owns the single canonical Save decision.

## 8. Permission evidence and safety gates

The permission layer already supports path, database fingerprint, shared-object, target-count, and variant-count inputs. The fast path must provide truthful values instead of bypassing the model.

### 8.1 Canonical path

Create one canonical path before permission evaluation. Use it for:

- permission rule matching;
- confirmation messages;
- Bridge request construction;
- telemetry and diagnostics;
- result metadata.

Do not evaluate permissions on the untrimmed path while dispatching the trimmed/normalized path.

### 8.2 Database fingerprint

Database-scoped rules must not be silently ignored because identity is unavailable.

Required behavior:

- Obtain the database fingerprint from the existing runtime/session context or a bounded Bridge-provided identity already available to the route.
- Do not reintroduce a separate normal-path `get_database_identity` orchestration call.
- Pass the same fingerprint to permission evaluation and audit metadata.
- If a database-scoped rule exists and the fingerprint is unknown, fail closed or require explicit confirmation according to the approved policy; never treat the scoped rule as non-matching and auto-allow through a broad rule.
- Record `databaseFingerprintKnown` and the fingerprint source in diagnostics without exposing secrets unnecessarily.

### 8.3 Target and variant counts

Remove hard-coded permission evidence such as:

```ts
hardGatesPassed: true,
evidenceComplete: true,
targetCount: 1,
variantCount: 1,
```

Compute counts from the normalized request and bounded target resolution:

- single component/method target: target count 1;
- `create_dependent_chain`: provider and consumer component targets are at least 2;
- folder or `match="all"` dependency writes: count actual matched targets or fail closed when impact cannot be bounded;
- selected DataVariants: count selected variants;
- `all`: use the resolved variant count, not 1;
- `deleteMissing`, bulk element specs, and other multi-object operations must report the actual or conservative impact.

Unknown impact must not be represented as complete evidence. The permission evaluator must treat unknown or multi-target impact as a higher risk requiring the appropriate scoped allow or confirmation.

### 8.4 Approval and evidence semantics

Permission approval does not prove mutation success. It only authorizes the attempt. Mutation success requires the strict result envelope in Section 9.

`hardGatesPassed` and `evidenceComplete` must mean the evidence actually available before approval. They must not be used as unconditional booleans to bypass validation.

## 9. Strict result envelopes

The public result contract must be strict enough that capabilities and tests can identify success without recursively searching arbitrary nested objects.

### 9.1 Mutation result

All 15 mutation actions use one normalized top-level mutation payload. Action-specific fields may be added, but the common fields are mandatory.

Changed success:

```json
{
  "outcome": "succeeded",
  "changed": true,
  "mutationStatus": "applied",
  "saveAttempted": true,
  "saveSucceeded": true,
  "saveState": "saved",
  "verified": true,
  "verificationStatus": "passed",
  "verificationMode": "same_session_target_resolvable",
  "sessionCount": 1,
  "saveCount": 1,
  "editableRetryCount": 0,
  "nativeMutationAttemptCount": 1
}
```

Confirmed no-op:

```json
{
  "outcome": "succeeded",
  "changed": false,
  "mutationStatus": "no_op",
  "saveAttempted": false,
  "saveSucceeded": false,
  "saveState": "not_required",
  "verified": true,
  "verificationStatus": "passed",
  "verificationMode": "same_session_target_resolvable",
  "sessionCount": 1,
  "saveCount": 0,
  "editableRetryCount": 0,
  "nativeMutationAttemptCount": 0
}
```

Invalid success combinations include:

- `ok=true` with `saveState="failed"` or `"unknown"`;
- `ok=true` with `verified=false`;
- `mutationStatus="applied"` with `changed=false`;
- `saveAttempted=true` and `saveCount=0`;
- `saveSucceeded=true` without `saveState="saved"`;
- missing session, Save, mutation, or verification fields.

When mutation may have started, the failure envelope must preserve the normalized result fields plus:

```json
{
  "error": {
    "code": "save_failed | verification_failed | partial_failure | outcome_unknown",
    "message": "..."
  },
  "recovery": {
    "required": true,
    "actions": []
  }
}
```

Pre-mutation validation failures may use `result=null`, but must include structured error code/details and `mutationStatus=not_started`.

### 9.2 Editability check result

`mode=check` uses a separate strict read-only envelope:

```json
{
  "outcome": "succeeded",
  "editable": false,
  "mutationStatus": "read_only",
  "changed": false,
  "verified": true,
  "verificationStatus": "passed",
  "verificationMode": "same_session_scm_state",
  "sessionCount": 1,
  "nativeMutationAttemptCount": 0
}
```

It must not claim a database Save.

### 9.3 Editability set result

`mode=set` uses a strict SCM envelope. Database Save fields are `not_applicable` because editability is an SCM operation rather than an ASCET data mutation:

```json
{
  "outcome": "succeeded",
  "editable": true,
  "beforeEditable": false,
  "afterEditable": true,
  "changed": true,
  "mutationStatus": "applied",
  "saveAttempted": false,
  "saveSucceeded": false,
  "saveState": "not_applicable",
  "verified": true,
  "verificationStatus": "passed",
  "verificationMode": "same_session_scm_state",
  "sessionCount": 1,
  "saveCount": 0,
  "nativeMutationAttemptCount": 1,
  "nativeScmOperationCount": 1
}
```

`nativeMutationAttemptCount` counts the public editability mutation attempt. `nativeScmOperationCount` counts actual SCM commands. TCM may produce two commands (`ReserveItem`, `CreateEdition`), so the result must not overload one field with two meanings.

`mode=set` with an already editable target is a confirmed no-op only when the Bridge proves no SCM mutation was attempted. If the backend reports that a mutation started, it must not be reclassified as a no-op merely because the final state is editable.

### 9.4 Error/result parity

The TypeScript result normalizer must consume exact top-level fields. It must not recursively search `data.result.payload`, compatibility wrappers, or arbitrary nested objects as the normal contract.

The Bridge envelope, direct CLI result, Host result, batch item result, and public tool details must agree on field names and meanings. Adapter metadata may remain outside the canonical action payload.

## 10. SCM editability partial-success and recovery

The current C# TCM route can execute:

```text
ReserveItem
CreateEdition
```

and the non-TCM route can execute `Lock`. A failure after the first native operation is not an ordinary pre-mutation failure.

### 10.1 Required state tracking

`AscetComponentEditable` and its adapter must retain:

- normalized target path;
- before `IsVersion`/`IsEdition` and editable state;
- SCM binding type;
- every native SCM operation attempted;
- whether each operation returned or threw;
- component re-resolution state after each operation;
- after editable state when available;
- original exception/error code;
- whether recovery is required;
- recovery actions attempted and their results.

### 10.2 Partial-success classification

Examples:

| Situation | Required result |
|---|---|
| No native SCM call entered | `mutationStatus=not_started`, `recoveryRequired=false` |
| `ReserveItem` failed before mutation guarantee | structured failure, no retry unless classifier proves safe read-only rejection |
| `ReserveItem` succeeded, `CreateEdition` failed | `partial_failure` or `unknown`, `recoveryRequired=true`, retain reservation risk |
| Lock may have succeeded but re-resolution failed | `outcome_unknown` or partial, retain attempted operation and recovery guidance |
| Set completed but final editable verification failed | `verification_failed`, never success |
| Recovery succeeded and final state is verified restored | `rolled_back` failure result, never public PASS |
| Recovery failed | `partial_failure`/`outcome_unknown` with original and recovery errors |

### 10.3 Recovery requirements

When a safe release/rollback operation exists:

1. attempt it only through an explicitly approved recovery path;
2. verify the final SCM state in the same session when possible;
3. retain both original and recovery errors;
4. mark `recoveryRequired=false` only after successful recovery verification.

When no safe automatic release exists:

- return a structured partial/unknown result;
- set `recoveryRequired=true`;
- provide the exact target and likely residual reservation/lock state;
- stop without blindly retrying.

The legacy adapter must not collapse a structured partial result into `result=null` and a generic failure if mutation may already have started.

### 10.4 Retry rule

Only a proven read-only native failure may trigger one editability request and one same-session retry. Ambiguous, partial, or post-mutation failures must never be retried automatically.

## 11. Legacy preview deletion/isolation

### 11.1 Public removal

Remove public preview behavior from:

- `write-control-contract.ts`;
- mutation and dependent-chain TypeBox schemas;
- editability `mode=set` schema;
- action guidance and few-shots;
- `ascet_edit` prompt text;
- catalog/capabilities output;
- static project rules and templates;
- Skills and coding policy;
- tests that assert public preview acceptance or successful preview execution.

### 11.2 Runtime behavior

The runtime must reject direct/bypassed calls with non-apply mutation intent before Bridge dispatch. The error should state:

```text
intent=apply is required for ascet_edit writes; use mode=check for read-only editability inspection.
```

`mode=set, intent=preview` must be rejected, not translated to `mode=check`.

### 11.3 Internal legacy boundary

First establish a reachability test. If no production caller remains, delete the old preview orchestration in a later cleanup phase. If it is intentionally retained:

- rename or annotate it as legacy/recovery-only;
- exclude it from normal operation allowlists;
- add `ascetcli/tests/allowlists/legacy.operations.txt` entries only for retained operations;
- ensure normal route tests prove no call reaches it;
- do not expose its request shape through public capabilities.

Potential candidates include `runLegacyAscetCreateDependentChain`, `collectCreateDependentChainPreflight`, and Bridge preview controls. Do not remove a retained recovery function until its callers and ownership are reviewed.

## 12. Documentation, templates, Skills, and changelog

The implementation phase after code changes must update all model-facing sources. The new specification itself does not modify them.

### 12.1 Contract/guidance sources

Update:

- `packages/ascet-extension/src/tools/actions/contracts/edit.ts`
- `packages/ascet-extension/src/tools/actions/contracts/dependency.ts`
- `packages/ascet-extension/src/tools/edit/prompt.ts`
- `packages/ascet-extension/src/tools/edit/definition.ts`
- `packages/ascet-extension/src/tools/actions/compact-prompt.ts` if required by generated wording
- `packages/ascet-extension/src/tools/actions/catalog.ts` tests/derivation as required
- `packages/ascet-extension/src/ascet-coding-policy.ts`

Required wording:

```text
Mutation actions execute only with intent=apply.
Use mode=check for read-only editability inspection.
Use ascet_read or ascet_diff for independent inspection/diff.
Successful writes require automatic same-session verification and canonical persistence evidence.
```

Do not describe mutation actions as default preflight tools.

### 12.2 Project rules and templates

Update both live and generated sources:

- `.ascet/rules/tools/pi-ascet-tools.md`
- `packages/ascet-extension/templates/ascet-project/rules/tools/pi-ascet-tools.md`
- `packages/ascet-extension/templates/ascet-project/rules/tools/write.md`
- `packages/ascet-extension/templates/ascet-project/rules/tasks/small-safe-edit.md`

Remove claims that:

- provider path may be omitted for normal dependent-chain writes;
- every write accepts `preview` or `apply`;
- write execution is preceded by a public preflight call.

### 12.3 Skills and references

Update:

- `packages/ascet-extension/skills/ascet-engineering/SKILL.md`
- `packages/ascet-extension/skills/ascet-engineering/references/tool-routing-and-write-execution.md`
- `packages/ascet-extension/skills/ascet-engineering/references/dependency-advanced-path.md`

Document the correct binding distinction:

```text
formula is the expression;
formal is the expression-local identifier;
formal maps to the consumer Imported Parameter.
```

### 12.4 Changelog

Update only the current `[Unreleased]` section of:

- `packages/ascet-extension/CHANGELOG.md`

Add a concise `### Fixed` entry describing:

- public mutation intent is now apply-only;
- `mode=set` no longer aliases preview to check;
- dependent-chain provider path and binding guidance now match runtime;
- semantic validation and canonical result evidence are aligned.

Do not modify released sections. Do not retain the obsolete `intent: "preview" | "apply"` statement under an Unreleased breaking-change entry after the implementation lands; reconcile it rather than adding a contradictory duplicate.

## 13. Files and ownership

This section is the implementation allowlist. The current task creates only the new spec file; implementation phases may modify the following files.

### 13.1 TypeScript public contracts and guidance

```text
packages/ascet-extension/src/edit/write-control-contract.ts
packages/ascet-extension/src/tools/actions/contracts/edit.ts
packages/ascet-extension/src/tools/actions/contracts/dependency.ts
packages/ascet-extension/src/tools/edit/schema.ts
packages/ascet-extension/src/tools/edit/definition.ts
packages/ascet-extension/src/tools/edit/prompt.ts
packages/ascet-extension/src/tools/actions/compact-prompt.ts
packages/ascet-extension/src/tools/actions/catalog.ts
packages/ascet-extension/src/tools/actions/descriptors.ts
packages/ascet-extension/src/tools/actions/contract-registry.ts
packages/ascet-extension/src/tools/_shared/action-examples.ts
packages/ascet-extension/src/ascet-coding-policy.ts
```

Only modify derived/catalog files when their current implementation requires a change; prefer fixing the source contract and updating derivation tests.

### 13.2 TypeScript runtime and validation

```text
packages/ascet-extension/src/edit/service.ts
packages/ascet-extension/src/edit/fast-path.ts
packages/ascet-extension/src/edit/editability.ts
packages/ascet-extension/src/edit/contract.ts
packages/ascet-extension/src/create-dependent-chain.ts
packages/ascet-extension/src/core/temp-files.ts
packages/ascet-extension/src/permissions/types.ts
packages/ascet-extension/src/permissions/rules.ts
packages/ascet-extension/src/permissions/evaluate.ts
new shared mutation-validation module, if required
```

### 13.3 C# Bridge and result boundary

```text
ascetcli/src/AscetCli/AscetComponentEditable.cs
ascetcli/src/AscetCli/Bridge/InProcessLegacyOperationAdapter.cs
ascetcli/src/AscetCli/Bridge/AscetCliEnvelope.cs
shared normalized write-result DTO/builders and their existing execution adapters
```

Do not modify unrelated Bridge operations or regenerate binaries as part of a contract-only phase. A binary rebuild is required only after implementation changes to Bridge/C# sources.

### 13.4 Tests

At minimum, inspect or update:

```text
packages/ascet-extension/src/tools/edit/schema.test.ts
packages/ascet-extension/src/tools/edit/definition.test.ts
packages/ascet-extension/src/tools/edit/create-dependent-chain-direct.test.ts
packages/ascet-extension/src/tools/edit/set-element-dependency-public.test.ts
packages/ascet-extension/src/edit/service.fast-path.test.ts
packages/ascet-extension/src/edit/service.test.ts
packages/ascet-extension/src/edit/editability.test.ts
packages/ascet-extension/src/tools/actions/catalog.test.ts
packages/ascet-extension/src/tools/actions/contracts.test.ts
packages/ascet-extension/src/tools/prompt.test.ts
packages/ascet-extension/src/create-dependent-chain.test.ts
ascetcli/tests/AscetComponentEditableTcmOutputTest.cs
ascetcli/tests/AscetEditableWriteGateOutputTest.cs
focused normalized-result and permission tests
```

Add tests rather than weakening existing assertions. Tests that assert retired public preview behavior must be rewritten to assert Schema/runtime rejection and zero Bridge calls.

## 14. Phased implementation plan

### Phase 0: Baseline and contract freeze

Tasks:

1. Record complete `git status --short` without modifying unrelated worktree changes.
2. Confirm the current 15 mutation actions and two editability modes in schema, catalog, route, and tool definition.
3. Capture the current failing/contradictory tests as baseline evidence.
4. Freeze the public matrix in a table-driven test.
5. Add no code behavior yet.

Exit gate:

- public action set is unchanged;
- current preview drift is reproduced by tests/evidence;
- no unrelated worktree path is touched.

### Phase 1: Public schema and guidance alignment

Tasks:

1. Change all 15 mutation schemas to `intent: Type.Literal("apply")`.
2. Make `provider.componentPath` required.
3. Change `mode=set` to apply-only and leave `mode=check` without intent.
4. Correct dependent-chain binding examples to `formula="x", formal="x"`.
5. Remove preview/preflight claims from guidance, few-shots, prompt, catalog snapshots, templates, rules, and Skill references.
6. Update schema/catalog/prompt tests.

Exit gate:

- Schema rejects `preview` for all public mutations and `mode=set`.
- Schema accepts `apply` for all 15 mutations and `mode=set`.
- `mode=check` remains valid without intent.
- No public generated guidance contains the retired preview contract.

### Phase 2: Active semantic validation boundary

Tasks:

1. Extract or activate normalization and semantic validation before authorization.
2. Return structured errors before Bridge dispatch.
3. Implement code/codeFile XOR validation.
4. Implement module operation/methodName validation.
5. Implement signature non-empty validation.
6. Implement state-machine discriminated validation.
7. Implement enumerator uniqueness/delimiter validation.
8. Implement element/project formula conditions.
9. Implement dependency mapping/variant/restoration/folder-scope validation.
10. Implement dependent-chain formal identifier/formula reference validation.

Exit gate:

- Every invalid matrix case makes zero Bridge calls.
- No parameter builder throws an unstructured public error.
- All 15 mutation actions have a tested semantic-validation owner.

### Phase 3: Permission evidence alignment

Tasks:

1. Normalize target path once.
2. Supply database fingerprint from existing runtime/session context.
3. Fail closed or require confirmation when database-scoped rules cannot be evaluated.
4. Compute target and variant counts from bounded request evidence.
5. Remove hard-coded `evidenceComplete=true` and fixed counts.
6. Add database-scoped deny/allow, normalized-path, multi-target, and multi-variant tests.

Exit gate:

- Permission matching path equals Bridge path.
- Database-scoped rules cannot be silently skipped.
- Target/variant impact is conservative and testable.

### Phase 4: Strict result envelopes

Tasks:

1. Define strict TypeScript mutation success/failure schemas.
2. Define strict editability check/set schemas.
3. Align C# Bridge envelope and adapters with top-level canonical fields.
4. Remove recursive result discovery from the normal path.
5. Preserve mutation-started failure results.
6. Add state-combination tests for success, no-op, Save failure, verification failure, unknown, and partial failure.

Exit gate:

- No route can return success without valid persistence and verification evidence.
- No route can return `ok=true, verified=false`.
- Direct, Host, batch, Bridge, and public tool envelopes have matching meanings.

### Phase 5: Editability SCM recovery

Tasks:

1. Make `mode=set` dispatch only `component_editable_set`.
2. Reject missing/invalid/set-preview intent before native SCM calls.
3. Record TCM `ReserveItem`/`CreateEdition` and generic `Lock` operations separately.
4. Preserve before/after state and re-resolution failures.
5. Return partial/unknown with recovery requirements when a native operation may have succeeded.
6. Add safe recovery only where the backend supports and verifies it.
7. Ensure one safe read-only retry maximum and no retry after ambiguous mutation.

Exit gate:

- A real SCM failure after a first native command is not reported as a clean pre-mutation failure.
- Recovery status is explicit.
- `mode=check` remains read-only and `mode=set` remains one public write request.

### Phase 6: Legacy preview isolation and documentation closure

Tasks:

1. Add normal/legacy operation reachability tests.
2. Delete unused legacy preview code after caller review, or isolate and annotate it.
3. Update templates, project rules, Skills, coding policy, and CHANGELOG Unreleased.
4. Add a documentation lint test that rejects public `intent=preview`, default-preflight, and provider-auto-search claims except in explicit legacy documentation.

Exit gate:

- No normal route reaches legacy preview.
- New projects receive correct guidance.
- Changelog and model-facing docs agree with the active Schema/runtime.

### Phase 7: Integration, focused verification, and live acceptance

Tasks:

1. Run every modified TypeScript test explicitly from its package with `node ../../node_modules/vitest/dist/cli.js --run <test-file>`.
2. Run `./test.sh` from the repository root for the aggregate non-e2e regression suite; never run the unrestricted full Vitest suite.
3. Run focused C# result, permission, and editability protocol tests.
4. Build/synchronize Bridge only if C# source changed; verify source/package SHA equality.
5. Run live changed/no-op evidence for representative mutation groups.
6. Run `mode=check -> mode=set -> mode=check` on a real SCM-controlled fixture.
7. Preserve old evidence and create new uniquely named evidence roots.
8. Run `npm run check` after all code changes and resolve every error, warning, and info.

Exit gate:

- Focused tests pass.
- Contract/runtime parity passes.
- Live evidence proves changed/no-op and editability transitions where required.
- No unrelated file is modified by the implementation.

## 15. Test matrix

### 15.1 Public intent parity

Table-drive all 15 mutation actions:

| Input | Expected Schema | Expected runtime | Bridge calls |
|---|---|---|---:|
| `intent="apply"` with valid action data | accept | reaches permission/dispatch | 0 or 1 depending approval/result |
| `intent="preview"` | reject | structured invalid parameter if bypassed | 0 |
| missing intent | reject | structured invalid parameter if bypassed | 0 |
| unknown intent | reject | structured invalid parameter | 0 |

For `mode=set`:

| Input | Expected |
|---|---|
| `mode=set, intent=apply` | one `component_editable_set` request after permission |
| `mode=set, intent=preview` | reject, zero native SCM calls |
| `mode=set` without intent | reject, zero native SCM calls |
| `mode=check` | one read-only `component_editable_check` request |
| `mode=check, intent=apply` | reject by strict schema |

### 15.2 Action semantic matrix

Cover at least:

- create component kind/language combinations;
- create method kind/component kind combinations;
- empty signature patch;
- code/codeFile neither and both;
- module operation/section conflicts and missing methodName;
- every state-machine operation variant;
- duplicate/invalid enumerators;
- empty element list and sparse upsert;
- project formula context and unreadable spec;
- dependency target aliases, formula mappings, formals, variants, restoration, and folder scope;
- dependent-chain provider path, same-name endpoint, model-type compatibility, formula/formal reference, and `x -> Imported Parameter` mapping.

### 15.3 Permission matrix

Cover:

- canonical path with slash, backslash, repeated separators, leading/trailing whitespace;
- path-scoped deny/allow precedence;
- database-scoped deny plus broad allow with known fingerprint;
- database-scoped rule with unknown fingerprint;
- single-target versus folder/multi-target risk;
- selected/all variant counts;
- shared provider/consumer chain impact;
- denied/cancelled approval with zero Bridge calls.

### 15.4 Result matrix

Cover:

- changed + Save success + verification success;
- confirmed no-op with zero Save;
- Save returns false;
- Save throws before confirmation;
- verification failure after Save;
- missing or malformed canonical fields;
- transport loss after mutation may have started;
- partial failure with preserved result and recovery requirement;
- editability check success/failure;
- editability set changed/no-op/failure/partial TCM path.

### 15.5 Legacy reachability matrix

Assert that normal public routes do not call:

- `runLegacyAscetCreateDependentChain`;
- `collectCreateDependentChainPreflight`;
- preview Bridge operations;
- plan/guard/coordinator/search-read orchestration;
- TypeScript `mode=check`/`mode=set` calls for ordinary mutation actions.

If retained, legacy-only tests must use explicit legacy names and allowlists.

### 15.6 Documentation/catalog matrix

For every public action:

1. Schema intent set equals runtime supported intent set.
2. Every few-shot passes its action Schema.
3. No few-shot is immediately rejected by public runtime.
4. Catalog and compact prompt contain no retired preview claim.
5. Required fields and result fields match the active contract.

## 16. Acceptance criteria

The implementation is accepted only when all statements are true:

1. All 15 mutation actions accept only `intent="apply"` publicly.
2. `mode=set` accepts only `intent="apply"`.
3. `mode=check` is the only public read-only editability route.
4. Public `preview` is absent from Schema, guidance, catalog, prompts, templates, Skills, rules, and tests.
5. `create_dependent_chain.provider.componentPath` is required.
6. `create_dependent_chain` correctly preserves `formula="x"`, `formal="x"`, and `x -> Imported Parameter` mapping.
7. Active semantic validation runs before permission and Bridge dispatch.
8. Every action-specific conditional field rule in Section 6 is enforced or represented by a discriminated Schema.
9. Permission evaluation uses one canonical target path and handles database fingerprint availability explicitly.
10. Permission impact reflects target and variant counts rather than hard-coded 1 values.
11. Strict result envelopes reject missing Save/verification evidence and preserve mutation-started failures.
12. SCM partial success preserves native operations, before/after state, original error, recovery requirement, and recovery result.
13. Normal writes use one Bridge request and one ASCET session, subject only to the bounded same-session retry defined by the fast-write specification.
14. Legacy preview is either deleted after reachability review or isolated behind an explicit legacy/recovery boundary.
15. Templates, Skills, project rules, coding policy, catalog guidance, and CHANGELOG Unreleased are updated together.
16. Focused TypeScript tests pass.
17. Focused C# protocol tests pass.
18. `npm run check` passes with no errors, warnings, or infos after code changes.
19. If Bridge code changed, source and packaged Bridge SHA-256 values match and new evidence uses the current SHA.
20. No unrelated worktree change was reset, cleaned, stashed, staged, or overwritten.

## 17. Non-goals

This specification does not require:

- restoring public preview;
- implementing a new provider-discovery feature;
- redesigning the entire ASCET action catalog;
- changing AVH model logic or AVH parameter values;
- changing public action names;
- introducing a public caller-controlled Save toggle;
- reintroducing full-library preflight/tree collection;
- building a new batch mutation product;
- proving every one of the 55 variants and 220 scenarios before contract tests pass;
- independent packaged-Bridge live acceptance when no Bridge source changed;
- cleaning existing ASCET test objects or historical evidence;
- modifying released changelog sections;
- changing unrelated UI, package, or release files.

## 18. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Schema becomes apply-only while an internal caller still sends preview | Separate public/internal types; add route reachability tests before deleting internal code. |
| Old tests encode preview success | Rewrite them to assert public rejection and zero Bridge calls; preserve legacy tests under explicit legacy names only. |
| Semantic validation changes accepted inputs unexpectedly | Use a complete action matrix, document intentional narrowing, and reject only combinations proven invalid by runtime/Bridge semantics. |
| Database fingerprint cannot be obtained without a forbidden extra orchestration call | Source it from existing context/session; otherwise fail closed or require confirmation. Do not silently skip scoped rules. |
| Target count is not cheaply knowable | Use explicit bounded input counts; otherwise conservative risk/approval rather than false `1`. |
| Strict result validation rejects an adapter with an outdated envelope | Update the shared normalized result builder first, then migrate all adapters and add protocol tests. |
| TCM ReserveItem succeeds before CreateEdition fails | Preserve partial state, expose recovery requirement, and never return clean failure with `mutationStatus=not_started`. |
| Automatic recovery itself changes SCM state | Make recovery explicit, bounded, separately recorded, and never classify rollback as action success. |
| Legacy preview is accidentally reachable through catalog or routing | Maintain separate normal/legacy operation allowlists and static/runtime reachability tests. |
| Documentation is updated in source but not in new project templates | Treat live rules and templates as one owned documentation change and test both copies. |
| Existing dirty worktree causes unrelated file changes | Record baseline status, use an exclusive allowlist, inspect scoped diff only, and never reset/clean/stash. |
| Current historical acceptance says 17/17 while contract tests fail | Label historical evidence clearly; require new contract/runtime parity evidence before declaring this work complete. |

## 19. Definition of Done

```text
public mutation intent: apply-only                         PASS
mode=set intent: apply-only                                PASS
mode=check read-only route                                 PASS
preview absent from public surfaces                        PASS
provider path required                                     PASS
formula/formal x mapping tested                            PASS
active semantic validation                                 PASS
all action conditional constraints                         PASS
canonical permission path                                  PASS
database fingerprint handling                              PASS
truthful target/variant counts                             PASS
strict mutation/editability result envelopes               PASS
SCM partial-success recovery                               PASS
legacy preview deleted or isolated                         PASS
docs/templates/skills/rules/changelog aligned              PASS
focused TypeScript tests                                   PASS
focused C# protocol tests                                  PASS
npm run check                                              PASS
current Bridge SHA evidence, if applicable                 PASS
no unrelated worktree changes                              PASS
```

The work is not complete if any public surface still tells the model to use `intent="preview"`, if a Schema accepts a request that the active runtime immediately rejects, or if a mutation-started SCM failure is reported without partial-state/recovery evidence.
