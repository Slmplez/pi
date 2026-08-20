# ASCET `apply_element_spec` Identity Formula Project-Context Fix Specification

## Status

Approved repair specification.

Snapshot date: August 20, 2026.

This document records the required correction for `apply_element_spec` formula validation. It is a specification only; implementation and live acceptance remain pending.

## Objective

Correct `apply_element_spec` so that ASCET's built-in identity formula, `ident`, can be written without an artificial Project fixture or a guessed Project path.

Only non-`ident` formulas require a real, explicit ASCET Project context.

The repair must prevent the backend from interpreting a component's parent Folder as proof that a sibling item named `Project` exists or owns the component.

## Confirmed ASCET semantics

The following rules are authoritative for this repair:

1. `ident` is supported by default by ASCET.
2. `ident` is not dependent on a user-created Project formula definition.
3. `ident` matching is case-insensitive after trimming surrounding whitespace.
4. A non-`ident` formula is Project-defined and must be validated against one explicit Project.
5. A Class Folder location does not identify its Project context.
6. The same Class may be referenced by zero, one, or multiple Projects.
7. The backend must never create a Project as a side effect of formula validation.
8. The backend must never infer Project ownership by appending `\Project` to a Folder path.

## Reproduced failure

The live call used:

```text
componentPath:
PI_EDIT_TEST_READWRITE_004\Core\ClassUnderTest
```

The Element spec contained:

```json
{
  "impl": {
    "valueType": "uint8",
    "formula": "ident"
  }
}
```

No `projectPath` was supplied.

The isolated fixture contained:

```text
PI_EDIT_TEST_READWRITE_004
└─ Core
   └─ ClassUnderTest
```

The backend inferred:

```text
PI_EDIT_TEST_READWRITE_004\Core\Project
```

That inferred item did not exist, so the operation failed before mutation with:

```text
invalid_formula_reference
Failed to resolve project ...
```

This failure does not mean ASCET created or required a new Project for the Class. It is produced by the Bridge's Project-path resolution policy.

## Current implementation behavior

### TypeScript caller

`packages/ascet-extension/src/apply-element-spec.ts` and `packages/ascet-extension/src/edit/fast-path.ts` correctly pass `--project-path` only when the caller supplies `projectPath`.

The public schema currently makes `projectPath` optional in:

```text
packages/ascet-extension/src/element-spec-contract.ts
```

The TypeScript layer does not currently distinguish `ident` from a Project-defined formula before entering the Bridge.

### Bridge validation

The current Bridge implementation is in:

```text
ascetcli/src/AscetCopilot/AscetElementSync.cs
```

The current behavior is:

```text
any non-empty impl.formula
-> ContainsFormulaReferences = true
-> ValidateProjectFormulas
-> ResolveProjectPathForFormulaValidation
-> infer <component folder>\Project and ancestor candidates
-> resolve formulas from the inferred Project
```

The formula membership check is also performed before the existing identity-formula allowance. Therefore `ident` is treated as requiring Project lookup even though later compatibility logic recognizes it as the identity formula.

## Required behavior matrix

| Element spec | Explicit `projectPath` | Required result |
| --- | --- | --- |
| No `impl.formula` | omitted | No Project lookup |
| `formula: "ident"` | omitted | Accept; no Project lookup |
| `formula: " IDENT "` | omitted | Accept; no Project lookup |
| `formula: "ident"` | supplied | Accept; identity formula does not require Project formula membership |
| Non-`ident` formula | omitted | Reject before mutation with `project_context_required` |
| Non-`ident` formula | valid Project supplied | Validate formula against that Project |
| Non-`ident` formula | missing Project supplied | Reject with `project_not_found` |
| Non-`ident` formula | non-Project item supplied | Reject with `invalid_project_target` |
| Non-`ident` formula absent from valid Project | valid Project supplied | Reject with `invalid_formula_reference` |
| Mixed `ident` and non-`ident` formulas | omitted | Reject with `project_context_required` |
| Mixed `ident` and non-`ident` formulas | valid Project supplied | Validate only non-`ident` formula membership |

## Backend design

### 1. Expose the identity-formula predicate

The existing identity check must be reusable by the formula-reference scan and Project-context validator.

Preferred shape:

```csharp
internal static bool IsIdentityFormula(string formulaName)
```

It must:

- trim whitespace;
- compare case-insensitively;
- return `false` for null, empty, or whitespace-only input.

### 2. Distinguish formula presence from Project-formula presence

Replace or supplement the broad `ContainsFormulaReferences` check with a function that detects only Project-defined formulas:

```csharp
private bool ContainsProjectFormulaReferences(AscetElementSpecDocument spec)
```

Required logic:

```text
for every requested element:
  formula missing or blank -> ignore
  formula is ident -> ignore
  otherwise -> Project context required
```

If the complete spec contains only blank formulas or `ident`, `ValidateProjectFormulas` must return without resolving any Project item.

### 3. Skip Project membership checks for `ident`

`AscetElementFormulaRules.ValidateForProjectContext` currently checks formula membership before calling the formula-compatibility rule.

The order must become:

```text
read and normalize formula
-> if ident: accept without Project formula membership lookup
-> otherwise: require formula in the resolved Project formula set
-> enforce non-ident model-type and implementation-type compatibility
```

`ident` must not be added artificially to the Project formula-name set merely to satisfy the old validator. The validator must model the semantic distinction explicitly.

### 4. Require explicit Project context for non-`ident` formulas

When at least one non-`ident` formula exists and `projectPath` is missing, fail before mutation:

```text
code: project_context_required
operation: validate_element_formula
message: projectPath is required when apply_element_spec specifies a non-ident implementation formula.
```

The formula-validation path must not call:

```text
BuildProjectPathCandidates
InferProjectPathForComponent
```

`ResolveProjectPathForFormulaValidation` must resolve only the explicitly supplied path.

If `InferProjectPathForComponent` remains required by unrelated code, such as Project-file writing or table behavior, it must not be deleted as part of this slice. Its use must be removed only from Element formula validation.

### 5. Validate before mutation

All Project-context and formula validation must complete before:

- creating an Element;
- changing an Element implementation;
- starting a native mutation attempt;
- saving the ASCET database.

A validation failure must report canonical no-mutation evidence:

```text
mutationStatus: not_started
writesPerformed: false
saveAttempted: false
saveCount: 0
```

## TypeScript design

### 1. Add a shared formula-context predicate

Add a small reusable helper at the Element-spec contract or normalization boundary:

```typescript
function requiresExplicitProjectContext(elements: readonly AscetElementInput[]): boolean
```

Required logic:

```typescript
return elements.some((element) => {
  const formula = element.impl?.formula?.trim();
  return formula !== undefined && formula.length > 0 && formula.toLowerCase() !== "ident";
});
```

The implementation must use the actual normalized Element input shape. It must not use `any`.

### 2. Fail before Bridge entry

For `apply_element_spec`:

```text
requiresExplicitProjectContext(elements) = true
and projectPath is absent
```

must return a model-visible validation error before:

- authorization for a mutation that cannot be valid;
- temporary spec-file creation where practical;
- Bridge process entry.

Required public error:

```text
ascet_edit_project_context_required
```

Required message:

```text
projectPath is required when apply_element_spec uses a non-ident implementation formula.
```

The Bridge must retain the same semantic validation because direct CLI and batch callers can bypass the TypeScript layer.

### 3. Preserve `projectPath` forwarding

When supplied, `projectPath` must continue to be normalized and forwarded as:

```text
--project-path <exact path>
```

No TypeScript code may synthesize a Project path from `componentPath`.

## Public contract and skill rules

The `apply_element_spec` action contract must state:

```text
- ident is ASCET's default identity formula and does not require projectPath.
- Any non-ident impl.formula requires one explicit projectPath.
- Never infer a Project from componentPath, Folder layout, or an item named Project.
- Do not create a Project merely to satisfy ident validation.
```

The ASCET engineering skill must use the same rule and must not advise agents to create `<component folder>\Project` automatically.

## Error contract

| Error code | Meaning |
| --- | --- |
| `ascet_edit_project_context_required` | Public TypeScript validation rejected a non-`ident` formula without `projectPath` |
| `project_context_required` | Bridge or direct CLI rejected a non-`ident` formula without `projectPath` |
| `project_not_found` | Explicit `projectPath` could not be resolved |
| `invalid_project_target` | Explicit path resolved to an item that is not an ASCET Project |
| `invalid_formula_reference` | Explicit Project exists but does not define the requested non-`ident` formula |
| `invalid_formula_for_element` | Formula exists but is incompatible with the Element model or implementation type |

`invalid_formula_reference` must no longer represent a missing inferred Project.

## TDD implementation sequence

### Slice 1: Bridge identity formula behavior

Red tests:

1. `ident` without `projectPath` does not resolve a Project.
2. whitespace/case variants of `ident` do not resolve a Project.
3. a non-`ident` formula without `projectPath` returns `project_context_required`.

Minimum implementation:

- expose the identity predicate;
- add Project-formula detection;
- bypass Project lookup for identity-only specs;
- reject missing explicit context for non-identity formulas.

Focused green test must run before the next slice.

### Slice 2: Formula membership and target errors

Red tests:

1. valid explicit Project and valid custom formula pass;
2. missing explicit Project returns `project_not_found`;
3. explicit Class path returns `invalid_project_target`;
4. missing formula in a valid Project returns `invalid_formula_reference`;
5. mixed identity and custom formulas validate only the custom formula membership.

### Slice 3: TypeScript public-tool preflight

Red tests through the public `ascet_edit` seam:

1. identity-only spec without `projectPath` reaches the Bridge;
2. non-identity spec without `projectPath` fails before Bridge entry;
3. explicit `projectPath` is forwarded unchanged except for path normalization;
4. no formula and no Project remains valid;
5. mixed formula spec requires `projectPath`.

### Slice 4: Contract and skill synchronization

Update and verify:

- action contract rules;
- generated/snapshotted action catalog where required;
- ASCET engineering skill guidance;
- README examples where formula context is described.

## Focused test matrix

### Bridge tests

| Test | Expected result |
| --- | --- |
| Class fixture, `uint8`, `ident`, no Project | validation succeeds |
| Class fixture, `uint8`, `IDENT`, no Project | validation succeeds |
| Class fixture, no formula, no Project | validation succeeds |
| Class fixture, custom formula, no Project | `project_context_required` |
| Custom formula with explicit Project | succeeds when formula exists |
| Custom formula with explicit Project but missing formula | `invalid_formula_reference` |
| Explicit path points to Class | `invalid_project_target` |
| Parent Folder contains an item named `Project`, but request omits `projectPath` | custom formula still returns `project_context_required` |

### TypeScript tests

Verify:

- schema still accepts identity-only calls without `projectPath`;
- runtime conditional validation handles custom formulas;
- Bridge is not called for the missing custom-formula context case;
- identity-only calls do not gain a synthesized `--project-path` argument;
- explicit Project paths are normalized and forwarded;
- returned error is concise and actionable.

## Live ASCET acceptance

### Identity-only fixture

The original isolated fixture is valid for identity-formula testing:

```text
PI_EDIT_TEST_READWRITE_004
└─ Core
   └─ ClassUnderTest
```

No Project must be created for this case.

Run:

```text
negative contract regression
-> ident changed write
-> fresh readback
-> same request
-> zero-save no-op proof
-> fresh readback
-> cleanup
-> absence proof
```

The changed request must use:

```json
{
  "impl": {
    "valueType": "uint8",
    "formula": "ident"
  }
}
```

Required evidence:

- Project resolution is not attempted;
- the Element is changed as requested;
- readback reports `formula: "ident"`;
- exactly one Save occurs for the changed request;
- the identical second request performs zero Save;
- cleanup removes only the test Element or disposable fixture created by the test;
- every public tool and Bridge call records elapsed time in seconds.

### Custom-formula fixture

A separate fixture must contain a deliberately created Project with the required formula. The call must pass its exact `projectPath`.

The Project must have a descriptive fixture name; it must not rely on the magic name `Project`.

Required negative checks:

- omit `projectPath` and prove `project_context_required` before mutation;
- pass a non-Project path and prove `invalid_project_target`;
- pass a valid Project without the formula and prove `invalid_formula_reference`.

## Acceptance criteria

The repair is complete only when all of the following are true:

1. `ident` can be applied to the isolated Class fixture without any Project item.
2. No formula-validation code appends `\Project` to `componentPath` or its ancestor Folders.
3. No Project is created automatically.
4. Non-`ident` formulas require explicit `projectPath` in both public-tool and Bridge paths.
5. Project and formula errors use the correct distinct error codes.
6. Validation failures prove that no mutation or Save occurred.
7. Changed identity writes pass mandatory same-session readback.
8. Repeating the same identity request proves a zero-save no-op.
9. Focused Bridge and TypeScript tests pass.
10. Required live ASCET acceptance evidence and per-call timing are retained.
11. `npm run check` passes after implementation.
12. Repository-wide `test.sh` and `npm test` are not run for this ASCET-scoped repair.

## Non-goals

This repair does not:

- create or rename Projects;
- discover Project ownership by scanning Folder names;
- select one Project when multiple Projects reference the same Class;
- change Project formula creation or editing behavior;
- change implementation-type legality rules;
- change formula semantics beyond the confirmed built-in `ident` exception;
- modify unrelated table or Project-file write behavior.

## Separate audit note

`CommitTableVisibility` and other code paths also use `InferProjectPathForComponent` for Project-file operations. Those paths must be audited separately.

This specification authorizes removing Folder-based inference from Element formula validation only. It does not silently authorize changing unrelated Project-file behavior.

## Expected implementation files

Primary files:

```text
ascetcli/src/AscetCopilot/AscetElementSync.cs
packages/ascet-extension/src/element-spec-contract.ts
packages/ascet-extension/src/edit/fast-path.ts
packages/ascet-extension/src/tools/actions/contracts/edit.ts
```

Expected focused tests:

```text
ascetcli/tests/*Element*Formula*.cs
packages/ascet-extension/src/element-write-schema.test.ts
packages/ascet-extension/src/edit/fast-path.test.ts
packages/ascet-extension/src/edit/service.test.ts
packages/ascet-extension/src/tools/actions/catalog.test.ts
packages/ascet-extension/src/ascet-engineering-skill.test.ts
```

Exact test-file placement may follow the existing closest focused suite, but tests must use approved public or Bridge seams rather than private implementation mocks.
