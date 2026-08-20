# ASCET `apply_element_spec` Identity Formula Fix Development Task Plan

## Status

Implemented and live accepted by three Luna High execution agents under one Sol High coordinator.

Snapshot date: August 20, 2026.

This document is the executable development plan for:

```text
docs/2026-08-20-ascet-apply-element-spec-ident-project-context-fix-spec.md
```

The governing specification defines behavior. This task plan defines agent ownership, implementation order, focused tests, integration gates, live ASCET acceptance, evidence retention, and completion reporting.

No implementation phase may be marked complete from source inspection alone. Its assigned tests and review gate must pass.

## Objective

Implement the confirmed formula-context rule:

```text
formula absent
-> no Project context required

formula = ident, case-insensitive after trim
-> ASCET built-in default
-> no Project context required
-> no Project lookup

formula != ident
-> one explicit projectPath required
-> validate only against that exact ASCET Project
-> never infer <component folder>\Project
```

The completed repair must allow the isolated fixture:

```text
PI_EDIT_TEST_READWRITE_004
└─ Core
   └─ ClassUnderTest
```

to accept:

```json
{
  "impl": {
    "valueType": "uint8",
    "formula": "ident"
  }
}
```

without creating, resolving, or guessing any Project.

## Governing rules

1. The design source is `docs/2026-08-20-ascet-apply-element-spec-ident-project-context-fix-spec.md`.
2. `ident` is a built-in ASCET default and does not require Project formula membership.
3. Non-`ident` formulas require an explicit `projectPath`.
4. Folder layout is not Project ownership evidence.
5. Do not create `<component folder>\Project` automatically.
6. Validation must finish before mutation or Save.
7. The TypeScript public tool and direct Bridge path must enforce the same semantic rule.
8. Tests must observe behavior through the closest approved public/runtime seam; do not replace the implementation under test with private mocks.
9. Do not modify unrelated `CommitTableVisibility` or Project-file behavior in this repair.
10. Do not preserve the old implicit `\Project` formula-validation fallback.
11. Do not run repository-wide `test.sh`, `npm test`, or the complete Vitest suite.
12. Run `npm run check` only after integration, not independently in every worker.
13. Do not commit or push unless the user explicitly asks after implementation review.

## Agent routing

### Coordinator

```text
model: gpt-5.6-sol
reasoning: high
role: analysis, decomposition, integration, live acceptance, final review
```

### Execution workers

Use exactly three execution workers:

```text
model: gpt-5.6-luna
reasoning: high
```

| Worker | Scope | Exclusive write domain |
| --- | --- | --- |
| Luna A | Bridge formula policy and C# focused tests | `ascetcli/src/**`, `ascetcli/tests/**` assigned files |
| Luna B | TypeScript runtime/public-tool preflight and focused tests | assigned `packages/ascet-extension/src/**` runtime files |
| Luna C | Action contract, ASCET engineering skill, snapshots and focused tests | assigned contract/skill/generated files |

The coordinator owns all files not explicitly assigned to a worker.

## Parallelization model

After baseline gate G0, all three Luna workers may start in parallel because their write sets are disjoint.

```text
                    ┌─ Luna A: Bridge C# ───────────┐
G0 baseline ────────┼─ Luna B: TypeScript runtime ─┼─ G1 integration
                    └─ Luna C: Contract + Skill ───┘

G1 integration
-> combined focused tests
-> Bridge build
-> packaged asset refresh
-> npm run check
-> source-Bridge live ASCET campaign
-> final review
```

Workers must not edit another worker's files to fix a failing dependency. They must report the dependency to the coordinator.

## Shared worker instructions

Each Luna worker must:

1. Read the governing specification in full.
2. Read every assigned source and test file in full before editing it.
3. Inspect working-tree status only for assigned paths.
4. Never revert, stage, move, or delete unrelated changes.
5. Use erasable TypeScript syntax; no `any`, dynamic imports, enums, namespaces, parameter properties, or inline type imports.
6. Keep C# compatible with the repository's existing .NET Framework compiler and language level.
7. Write a failing focused test first and record the observed red failure.
8. Implement only the minimum behavior needed for the assigned slice.
9. Run the assigned focused tests until they pass.
10. Run `git diff --check` for assigned paths.
11. Do not run live ASCET writes; live execution is coordinator-owned.
12. Do not rebuild or copy the packaged Bridge executable; packaging is coordinator-owned.
13. Do not commit.
14. Return a structured handoff containing behavior, changed paths, commands, red/green evidence, elapsed seconds, and remaining risks.

## Workspace safety

Multiple sessions may have unrelated modifications in the same worktree.

All agents must:

- use explicit paths for inspection and staging;
- never use `git add .`, `git add -A`, stash, reset, checkout, clean, or force push;
- never overwrite unrelated changes;
- stop and report if an assigned file contains concurrent edits that cannot be safely merged;
- treat `artifacts/**`, `output/**`, `.pi/**`, `.ascet/**`, and unrelated source modifications as externally owned unless explicitly assigned.

## G0: Coordinator baseline gate

### Required inspection

Read in full:

```text
docs/2026-08-20-ascet-apply-element-spec-ident-project-context-fix-spec.md
ascetcli/src/AscetCopilot/AscetElementSync.cs
packages/ascet-extension/src/element-spec-contract.ts
packages/ascet-extension/src/edit/fast-path.ts
packages/ascet-extension/src/tools/actions/contracts/edit.ts
packages/ascet-extension/skills/ascet-engineering/SKILL.md
packages/ascet-extension/skills/ascet-engineering/references/implementation-type-and-memory-layout.md
```

### Required baseline facts

Record:

1. current branch and HEAD;
2. tracked modifications in every assigned path;
3. source Bridge hash and packaged Bridge hash;
4. exact failure evidence showing `ident` triggers Project resolution;
5. whether the target live fixture still exists;
6. ASCET scheduler and CLI lock state before eventual live execution.

### Baseline tests

```powershell
$env:ASCET_REPO_ROOT = (Get-Location).Path
powershell -NoProfile -ExecutionPolicy Bypass `
  -File .\ascetcli\scripts\test-ascet-csharp-focused.ps1 `
  -TestSource .\ascetcli\tests\AscetApplyElementSpecFastWriteTest.cs `
  -MainType AscetApplyElementSpecFastWriteTest
```

```powershell
node --import tsx --test `
  packages/ascet-extension/src/edit/service.fast-path.test.ts `
  packages/ascet-extension/src/element-write-schema.test.ts
```

The baseline may pass because the regression is not yet represented. G0 records current behavior; it does not count as repair acceptance.

### G0 exit criteria

- assigned paths have known ownership;
- all worker prompts use the same behavior matrix and error codes;
- no concurrent edit blocks delegation;
- baseline output and elapsed seconds are recorded.

### G0 execution record

Completed August 20, 2026.

```text
HEAD: 5ece69732 fix(agent): lock ASCET Copilot aggregate 0.1.43
source Bridge SHA256: C032E874E2893389E721703849E37E3E417E6E50639313940E2AB6199DB76108
packaged Bridge SHA256: C032E874E2893389E721703849E37E3E417E6E50639313940E2AB6199DB76108
assigned source paths: no pre-existing tracked modifications
```

Baseline results:

```text
AscetApplyElementSpecFastWriteTest: PASS, 62 runtime assertions, 6.020 seconds
TypeScript public fast-path/schema: PASS, 21/21 tests, 43.396 seconds
```

Environment corrections discovered by G0 and applied to this plan:

- focused C# source-inspection tests require `ASCET_REPO_ROOT` to point to the repository root;
- ASCET extension tests use Node's test runner through `node --import tsx --test`, not Vitest.

Live readiness discovery:

```text
database path: C:\Repo\13_XIAOMIAVH\px_Backup\
database canonical path: C:\Repo\13_XIAOMIAVH\px_Backup\px_Backup
get_database_identity: PASS, 0.696 seconds
PI_EDIT_TEST_READWRITE_004 tree probe: target_not_found, 3.002 seconds through public ascet_get
```

The identity fixture must therefore be created deliberately during G2 and fully removed afterward. The missing fixture is not a blocker and must not be replaced by a hidden Project.

---

# Luna A Task: Bridge Formula Policy

## Worker identity

```text
worker: Luna A
model: gpt-5.6-luna
reasoning: high
role: C# Bridge implementation and focused runtime tests
```

## Exclusive write scope

Luna A may modify only:

```text
ascetcli/src/AscetCopilot/AscetElementSync.cs
ascetcli/tests/AscetApplyElementFormulaContextTest.cs
```

If extending an existing focused test is necessary, Luna A must ask the coordinator first.

Luna A must not modify `packages/**`, `ascetcli/scripts/**`, contracts, generated files, or packaged Bridge assets.

## Required red tests

Create `ascetcli/tests/AscetApplyElementFormulaContextTest.cs` with a canonical JSON runtime report and assertions covering:

1. blank/missing formula does not require Project context;
2. `ident` does not require Project context;
3. ` IDENT ` does not require Project context;
4. identity formula passes with an empty available Project-formula list;
5. non-`ident` is classified as requiring Project context;
6. missing explicit Project context for non-`ident` produces `project_context_required`;
7. a non-`ident` formula absent from a valid explicit Project formula set produces `invalid_formula_reference`;
8. mixed identity/custom formulas require context only because of the custom formula;
9. non-identity compatibility checks remain active;
10. the identity path does not call Folder-based candidate construction.

The new test must fail against current source for the expected reason before implementation.

## Required implementation

### A1. Reusable identity predicate

Make the existing identity predicate reusable by all formula-context logic.

```text
null/blank -> false
trimmed case-insensitive ident -> true
all other values -> false
```

### A2. Project-formula detection

Replace broad formula-presence routing with Project-formula detection. Preferred name:

```csharp
ContainsProjectFormulaReferences
```

### A3. Identity membership bypass

In `ValidateForProjectContext`:

```text
normalize formula
-> ident: accept and continue
-> non-ident: require formula in Project formula names
-> enforce compatibility rules
```

Do not add a fake `ident` entry to the Project formula set.

### A4. Explicit context for custom formulas

For at least one non-`ident` formula:

- reject missing path with `project_context_required`;
- resolve only the exact explicit path;
- use `project_not_found` when it cannot resolve;
- use `invalid_project_target` when it is not a Project;
- reserve `invalid_formula_reference` for a formula absent from a valid Project.

### A5. Remove formula-validation inference

Formula validation must not call:

```text
BuildProjectPathCandidates
InferProjectPathForComponent
```

Do not remove `InferProjectPathForComponent` if unrelated table or Project-file code still uses it. Remove candidate helpers only if unused across the complete file.

### A6. Preserve mutation ordering

Validation remains before native mutation, Element write, and Save. Do not change transaction, rollback, verification, or Save semantics.

## Focused commands

```powershell
$env:ASCET_REPO_ROOT = (Get-Location).Path
powershell -NoProfile -ExecutionPolicy Bypass `
  -File .\ascetcli\scripts\test-ascet-csharp-focused.ps1 `
  -TestSource .\ascetcli\tests\AscetApplyElementFormulaContextTest.cs `
  -MainType AscetApplyElementFormulaContextTest

powershell -NoProfile -ExecutionPolicy Bypass `
  -File .\ascetcli\scripts\test-ascet-csharp-focused.ps1 `
  -TestSource .\ascetcli\tests\AscetApplyElementSpecFastWriteTest.cs `
  -MainType AscetApplyElementSpecFastWriteTest
```

## Luna A exit criteria

- red failure recorded;
- both focused C# tests pass;
- identity-only specs cannot enter Project resolution;
- custom formulas cannot use Folder inference;
- error codes match the governing spec;
- table/Project-file behavior is unchanged;
- `git diff --check` passes.

## Luna A handoff

```text
Implemented:
Changed paths:
Red command/result:
Green commands/results:
Assertion count:
Elapsed seconds:
Integration dependency:
Risks:
```

---

# Luna B Task: TypeScript Public-Tool Preflight

## Worker identity

```text
worker: Luna B
model: gpt-5.6-luna
reasoning: high
role: TypeScript runtime, public-tool validation, and focused tests
```

## Exclusive write scope

Luna B may modify only:

```text
packages/ascet-extension/src/element-spec-contract.ts
packages/ascet-extension/src/edit/fast-path.ts
packages/ascet-extension/src/element-write-schema.test.ts
packages/ascet-extension/src/edit/service.fast-path.test.ts
```

Luna B must not modify action contracts, skills, catalog snapshots, C# files, generated files, or packaged Bridge assets.

## Required red tests

Add focused tests through the existing public `runAscetEdit`/fast-path seam:

1. identity-only create without `projectPath` reaches exactly one Bridge call;
2. identity-only patch without `projectPath` reaches exactly one Bridge call;
3. ` IDENT ` is treated as identity;
4. no formula without `projectPath` remains valid;
5. custom formula without `projectPath` returns `ascet_edit_project_context_required`;
6. the rejected request performs zero Bridge calls;
7. the rejected request does not leave a temporary Element-spec file;
8. mixed identity/custom formulas without `projectPath` are rejected;
9. custom formula with explicit `projectPath` reaches Bridge;
10. the exact Project path is normalized and forwarded with `--project-path`;
11. no path is synthesized from `componentPath` for identity-only calls.

The missing-project custom-formula test must first fail against the current implementation.

## Required implementation

### B1. Shared predicate

Add a typed helper at the Element-spec contract/normalization boundary:

```typescript
requiresExplicitProjectContext(elements)
```

Required semantics:

```text
formula absent/blank -> false
trimmed case-insensitive ident -> false
any other formula -> true
```

Use the actual `AscetElementInput` union. Do not use `any`.

The helper must support create, patch, upsert, and restore inputs that can carry `impl.formula`.

### B2. Fast-path validation

After parameter normalization/schema validation, but before authorization, temporary file creation, and Bridge entry where practical:

```text
apply_element_spec
and custom formula exists
and projectPath absent
-> return public validation error
```

Required public error code:

```text
ascet_edit_project_context_required
```

Required message:

```text
projectPath is required when apply_element_spec uses a non-ident implementation formula.
```

The result must classify the write as not started.

### B3. Preserve identity path

Identity-only calls continue through authorization, spec normalization, Bridge execution, canonical evidence validation, and mandatory readback.

Do not remove or blank `formula: "ident"`.

### B4. Preserve explicit path forwarding

Use only the caller-supplied `projectPath`, normalized by existing ASCET path normalization. Never synthesize `<component parent>\Project`.

### B5. Temporary-file lifetime

Do not regress existing temporary Element-spec lifetime behavior. Rejected custom-formula requests must not leak files; accepted requests keep the spec alive until Bridge consumption finishes.

## Focused commands

Run from the repository root:

```powershell
node --import tsx --test `
  packages/ascet-extension/src/element-write-schema.test.ts `
  packages/ascet-extension/src/edit/service.fast-path.test.ts
```

If lifetime behavior is touched, also run:

```powershell
node --import tsx --test `
  packages/ascet-extension/src/tools/edit/apply-element-spec-lifetime.test.ts
```

## Luna B exit criteria

- public-seam red failure recorded;
- assigned focused tests pass;
- identity-only calls reach Bridge without `projectPath`;
- custom formulas without `projectPath` never enter Bridge;
- mixed specs follow the custom-formula rule;
- no temporary spec leak exists;
- no `any`, dynamic import, or non-erasable syntax was added;
- `git diff --check` passes.

## Luna B handoff

```text
Implemented:
Changed paths:
Red test/result:
Green command/result:
Vitest counts:
Elapsed seconds:
Bridge-call assertions:
Temporary-file assertions:
Integration dependency:
Risks:
```

---

# Luna C Task: Contract, Skill, and Catalog Synchronization

## Worker identity

```text
worker: Luna C
model: gpt-5.6-luna
reasoning: high
role: public action contract, ASCET engineering guidance, generated catalog synchronization
```

## Exclusive write scope

Luna C may modify only:

```text
packages/ascet-extension/src/tools/actions/contracts/edit.ts
packages/ascet-extension/src/tools/actions/catalog.test.ts
packages/ascet-extension/src/ascet-engineering-skill.test.ts
packages/ascet-extension/skills/ascet-engineering/SKILL.md
packages/ascet-extension/skills/ascet-engineering/references/elements-fast-path.md
packages/ascet-extension/skills/ascet-engineering/references/implementation-type-and-memory-layout.md
packages/ascet-extension/contracts/catalog-snapshot.json
packages/ascet-extension/ascet-cli/contracts/cli-catalog.json
```

If the generator updates another generated catalog file, report it before retaining the diff. Never edit generated JSON manually.

Luna C must not modify runtime TypeScript, Bridge C#, packaged binaries, or release manifests.

## Required red tests

Update focused contract and skill tests so current guidance fails because it does not yet state:

1. `ident` is the built-in default and needs no `projectPath`;
2. non-`ident` `impl.formula` requires explicit `projectPath`;
3. Project ownership must not be inferred from Folder layout;
4. a Project must not be created only to satisfy identity validation;
5. custom formula validation uses exactly one explicit Project;
6. missing Project context differs from a missing formula reference.

Assert durable semantic phrases, not complete paragraph snapshots.

## Required contract changes

Update the authoritative `apply_element_spec` rules with concise model-facing guidance:

```text
- ident is ASCET's default identity formula and does not require projectPath.
- Any non-ident impl.formula requires one explicit projectPath.
- Never infer a Project from componentPath, Folder layout, or a sibling item named Project.
- Do not create a Project merely to satisfy ident validation.
```

`projectPath` remains structurally optional.

## Required skill changes

Update the minimum authoritative skill references:

```text
identity formula
-> use ident directly
-> do not search for or create Project

custom formula
-> identify one exact existing Project
-> pass projectPath explicitly
-> if no unique Project context exists, stop rather than guess
```

Keep implementation guidance consistent:

- real implementation types remain identity-only;
- integer implementation types may use identity or a legal custom formula;
- custom formula legality remains Project-dependent;
- formula changes remain semantic, not cosmetic.

## Catalog generation

After contract changes:

```powershell
npm run generate:ascet-action-catalog
```

Review generated diffs and retain only expected action-rule/catalog changes.

## Focused commands

Run from the repository root:

```powershell
node --import tsx --test `
  packages/ascet-extension/src/tools/actions/catalog.test.ts `
  packages/ascet-extension/src/ascet-engineering-skill.test.ts
```

Then from repository root:

```powershell
npm run check:ascet-action-catalog
```

## Luna C exit criteria

- red contract/skill failures recorded;
- action rules distinguish identity and custom formulas;
- no guidance suggests Folder-based Project inference;
- no guidance suggests creating a Project for `ident`;
- catalog snapshots are generator-produced and current;
- focused tests and catalog check pass;
- `git diff --check` passes.

## Luna C handoff

```text
Implemented:
Changed paths:
Red tests/results:
Green commands/results:
Generated files:
Elapsed seconds:
Catalog diff summary:
Integration dependency:
Risks:
```

---

# G1: Coordinator integration gate

## Integration order

1. Review Luna A diff and focused output.
2. Review Luna B diff and focused output.
3. Review Luna C diff and generated catalog output.
4. Confirm write sets remain disjoint.
5. Resolve only cross-layer semantic mismatches.
6. Run combined focused tests.
7. Rebuild production Bridge.
8. Refresh packaged assets.
9. Run packaging verification and `npm run check`.
10. Execute live ASCET acceptance.

## Cross-layer review checklist

Confirm:

- TypeScript and Bridge use the same trimmed case-insensitive identity rule;
- public code is `ascet_edit_project_context_required`;
- Bridge direct-call code is `project_context_required`;
- custom formulas still forward `--project-path`;
- public missing custom context fails before Bridge;
- direct CLI callers cannot bypass Bridge validation;
- identity-only calls do not resolve a Project;
- `invalid_formula_reference` only means a valid explicit Project lacks the formula;
- Folder inference is absent from formula validation;
- unrelated `CommitTableVisibility` behavior is unchanged.

## Combined focused C# tests

```powershell
$env:ASCET_REPO_ROOT = (Get-Location).Path
powershell -NoProfile -ExecutionPolicy Bypass `
  -File .\ascetcli\scripts\test-ascet-csharp-focused.ps1 `
  -TestSource .\ascetcli\tests\AscetApplyElementFormulaContextTest.cs `
  -MainType AscetApplyElementFormulaContextTest

powershell -NoProfile -ExecutionPolicy Bypass `
  -File .\ascetcli\scripts\test-ascet-csharp-focused.ps1 `
  -TestSource .\ascetcli\tests\AscetApplyElementSpecFastWriteTest.cs `
  -MainType AscetApplyElementSpecFastWriteTest
```

## Combined focused TypeScript tests

Run from the repository root:

```powershell
node --import tsx --test `
  packages/ascet-extension/src/element-write-schema.test.ts `
  packages/ascet-extension/src/edit/service.fast-path.test.ts `
  packages/ascet-extension/src/tools/edit/apply-element-spec-lifetime.test.ts `
  packages/ascet-extension/src/tools/actions/catalog.test.ts `
  packages/ascet-extension/src/ascet-engineering-skill.test.ts
```

## Bridge non-live regression gate

```powershell
powershell -NoProfile -ExecutionPolicy Bypass `
  -File .\ascetcli\scripts\test-ascet-bridge.ps1
```

This command must not connect to ASCET ToolAPI.

## Production Bridge build

Only after source tests pass:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass `
  -File .\ascetcli\scripts\build-ascet-csharp.ps1
```

Record build exit code, output path, SHA256, and elapsed seconds.

## Packaged asset refresh

```powershell
npm --workspace @vaf-agentworks/ascet-copilot-extension run copy-assets
npm --workspace @vaf-agentworks/ascet-copilot-extension run verify-assets
npm --workspace @vaf-agentworks/ascet-copilot-extension run verify-isolated-install
```

If the user explicitly waives isolated installation for this campaign, record the waiver and run the other commands. Do not silently omit it.

Verify source and packaged Bridge SHA256 values match.

## Repository check

```powershell
npm run check
```

Retain full output. Do not run `test.sh`, `npm test`, or the full Vitest suite.

Before live testing:

```powershell
git diff --check
```

Review explicit changed paths and confirm no unrelated files were modified.

---

# G2: Live ASCET acceptance campaign

## Ownership

Live ASCET execution is coordinator-owned. Luna workers must not run competing writes.

Before execution confirm:

```text
scheduler active = 0
CLI lock locked = false
one selected source Bridge hash
one disposable fixture namespace
```

## Fixture A: Identity-only Class

Required structure:

```text
PI_EDIT_TEST_READWRITE_004
└─ Core
   └─ ClassUnderTest
```

No Project may be created for this fixture.

### Request

Use public `ascet_edit.apply_element_spec` with:

```json
{
  "impl": {
    "valueType": "uint8",
    "formula": "ident"
  }
}
```

Do not provide `projectPath`.

### Sequence

```text
1. negative contract regression
2. changed identity request
3. fresh readback
4. same identity request
5. zero-save no-op proof
6. fresh readback
7. cleanup
8. final absence proof
```

### Required changed evidence

```text
changed = true
mutationStatus = applied
saveAttempted = true
saveSucceeded = true
saveState = saved
saveCount = 1
verified = true
verificationStatus = passed
sessionCount = 1
```

Fresh readback must prove:

```text
valueType = uint8
formula = ident
```

### Required no-op evidence

```text
changed = false
mutationStatus = no_op
saveAttempted = false
saveState = not_required
saveCount = 0
verified = true
verificationStatus = passed
```

### Project absence proof

Prove this campaign did not create:

```text
PI_EDIT_TEST_READWRITE_004\Core\Project
```

Use a bounded public read/get action or final tree evidence.

## Fixture B: Custom-formula Project context

Use a separate disposable Project with a descriptive name, for example:

```text
PI_EDIT_TEST_READWRITE_004\Core\FormulaValidationProject
```

Do not name it only `Project`.

### Negative cases

1. custom formula without `projectPath`:
   - public tool returns `ascet_edit_project_context_required`;
   - Bridge is not entered;
   - no mutation or Save occurs.
2. direct Bridge custom formula without `projectPath`:
   - Bridge returns `project_context_required`;
   - no mutation or Save occurs.
3. `projectPath` points to `ClassUnderTest`:
   - Bridge returns `invalid_project_target`.
4. valid Project lacks the custom formula:
   - Bridge returns `invalid_formula_reference`.

### Positive case

If a legal disposable custom formula can be created through approved public tools:

- pass its exact Project path;
- apply the Element spec;
- perform fresh readback;
- repeat the request and prove zero-save no-op;
- clean up formula, Element, and disposable Project;
- prove absence.

If it cannot be safely created through an approved public tool, retain the negative cases and record the positive case as blocked with exact evidence. Do not guess or use an unapproved mutation.

## Timing evidence

Record elapsed time in seconds for every public tool, Bridge operation, cleanup call, and scheduler wait.

Minimum columns:

```text
sequence
layer
operation
requestIntent
startedAt
endedAt
elapsedSeconds
outcome
changed
saveCount
errorCode
```

## Live evidence directory

Create one new campaign directory under the established live-evidence root. Do not overwrite previous evidence.

Required contents:

```text
manifest.json
requests/
responses/
readbacks/
timing.csv or timing.json
bridge-hash.txt
cleanup/
summary.md
```

The manifest records source identity, source and packaged Bridge SHA256, fixture paths, scheduler/lock preconditions, tool versions, and waivers.

## G2 exit criteria

- identity changed write passes without Project;
- identity same request proves zero-save no-op;
- custom missing context fails at public and Bridge layers;
- no hidden `Project` is created;
- cleanup and absence proof pass;
- scheduler returns to active `0`;
- CLI lock returns to `locked=false`;
- timing and raw evidence are retained.

---

# G3: Final review and reporting

## Coordinator source review

Review all changed files in full after integration.

Confirm:

1. identity handling is centralized rather than inconsistently duplicated;
2. public and Bridge errors are actionable;
3. inferred Project paths are absent from formula validation;
4. no unrelated functionality was removed;
5. no compatibility shim retains the old path guess;
6. no temporary/generated artifacts remain in source directories;
7. packaged Bridge matches reviewed source;
8. skill guidance matches runtime behavior.

## Result classification

### PASS

All code, focused tests, Bridge non-live tests, packaging checks, `npm run check`, identity live acceptance, no-op proof, cleanup, and timing evidence pass.

### PASS WITH EXPLICIT WAIVER

Only a user-approved non-functional gate, such as isolated installation, is skipped. Quote the waiver in the report.

### BLOCKED

A required live custom-formula fixture cannot be created through approved public APIs, or runtime behavior contradicts confirmed identity semantics. Identity-only acceptance must still pass before reporting partial success.

### FAIL

A required focused test, build, package check, public/Bridge contract, Save proof, verification proof, or cleanup proof fails.

## Final report contents

Report:

- implementation summary;
- changed paths grouped by worker;
- exact focused commands and counts;
- Bridge non-live result;
- `npm run check` result;
- source and packaged Bridge SHA256;
- live changed/no-op/readback/cleanup results;
- timing summary in seconds;
- whether any Project was created;
- custom-formula status;
- waivers and risks;
- current git status for changed paths;
- statement that no commit was made unless separately requested.

## Commit and push policy

This plan does not authorize commit, push, or publication.

Wait for explicit user instruction before:

```text
git add
git commit
git push
npm publish
```

If later authorized, stage only files changed for this repair.

---

# Execution tracker

Update this table during implementation. Do not mark a row complete from inspection alone.

| Gate/task | Owner | Status | Required evidence |
| --- | --- | --- | --- |
| G0 baseline | Coordinator | completed | HEAD, matching Bridge hashes, C# 62 assertions, TS 21/21 |
| A red tests | Luna A | completed | old ident path failed against inferred `Core\\Project`, 10.295s |
| A implementation | Luna A | completed | 13 formula-context + 62 regression assertions; coordinator rerun passed |
| B red tests | Luna B | completed | focused public-tool tests demonstrated the missing pre-Bridge custom-formula guard |
| B implementation | Luna B | completed | runtime slice 27/27 passed; coordinator combined rerun passed |
| C red tests | Luna C | completed | 2 expected semantic assertion failures, 2.479s |
| C implementation | Luna C | completed | 23/23 tests and catalog check passed; coordinator verified |
| Tool prompt | Coordinator | completed | `ascet_edit` prompt documents identity/custom Project rules and public/direct errors; focused test passed |
| G1 integration review | Coordinator | completed | disjoint Bridge, runtime, contract, skill, snapshot, binary, and prompt diffs reviewed |
| Combined focused C# | Coordinator | completed | formula-context 13 assertions and fast-write 62 assertions passed |
| Combined focused TS | Coordinator | completed | 56/56 selected tests passed in 30.940s after prompt update |
| Bridge non-live suite | Coordinator | completed | `test-ascet-bridge.ps1` passed in 61.641s |
| Production Bridge build | Coordinator | completed | build passed in 9.791s; SHA256 `F3B6D9488C19389492EDBF0842D7728EA4CDF4ED74DFFC19A10E6BE0DBA4FC84` |
| Asset refresh/verification | Coordinator | completed | copy 7.330s, verify 23.548s, source/package Bridge hashes match |
| Isolated installation | User waiver | waived | user instruction: `隔离安装验证 不需要了` |
| `npm run check` | Coordinator | completed | full check passed after integrated runtime/contract/skill/prompt changes |
| G2 identity live changed | Coordinator | completed | one Save, same-session verification, fresh readback |
| G2 identity live no-op | Coordinator | completed | zero Save, same-session verification, fresh readback |
| G2 custom negative cases | Coordinator | completed | public plus four direct Bridge error cases matched the contract |
| G2 cleanup | Coordinator | completed | fixture absent; scheduler healthy; active/queued zero; CLI lock false |
| G3 final review | Coordinator | completed | final diff, requirement audit, hashes, evidence, and cleanup state verified |

## Execution evidence — August 20, 2026

Final live evidence:

```text
artifacts/ascet-edit-live/ident-project-context-20260820072730/
```

Scope was intentionally limited to the repaired `apply_element_spec` behavior. Folder/component creation, `read_element`, tree absence probes, and deletion were supporting fixture/readback/cleanup operations, not additional action acceptance.

### Public acceptance

| Call | Result | Public seconds | Bridge seconds |
| --- | --- | ---: | ---: |
| custom formula without `projectPath` | `ascet_edit_project_context_required`; mutation `not_started`; Bridge calls `0`; no temp leak | 0.006 | not entered |
| `ident` changed write | `changed=true`, `applied`, Save `1`, verified | 3.797 | 3.730 |
| changed fresh `read_element` | `valueType=uint8`, `formula=ident` | 1.900 | 1.865 |
| same request | `changed=false`, `no_op`, Save `0`, verified | 4.294 | 4.256 |
| no-op fresh `read_element` | `valueType=uint8`, `formula=ident` | 1.993 | 1.955 |
| inferred `Core\\Project` absence | `target_not_found` | 2.526 | 2.485 |

### Direct Bridge negative acceptance

| Case | Raw Bridge code | Bridge seconds |
| --- | --- | ---: |
| missing custom-formula context | `project_context_required` | 3.031 |
| explicit Project missing | `project_not_found` | 3.154 |
| explicit target is not a Project | `invalid_project_target` | 2.459 |
| valid Project lacks requested formula | `invalid_formula_reference` | 2.808 |

The valid negative-test Project was resolved read-only from the current live database as:

```text
PI_ASCET_EDIT_20260818_ALL_ACTIONS_008\\Core\\Project
```

No Project was created under the isolated fixture. Cleanup deleted `ClassUnderTest`, `Core`, and `PI_EDIT_TEST_READWRITE_004`; final tree lookup returned `target_not_found`. Final scheduler state was `healthy`, with zero active jobs, zero queued jobs, and `cliLock.locked=false`.

Classification: **PASS WITH EXPLICIT WAIVER** because isolated installation validation was explicitly waived by the user. No commit or push is authorized by this plan.

## Recommended delegation prompts

### Prompt for Luna A

```text
Implement Luna A from docs/2026-08-20-ascet-apply-element-spec-ident-project-context-fix-development-task-plan.md. Use gpt-5.6-luna with high reasoning. Read the governing spec and assigned files in full. Modify only AscetElementSync.cs and AscetApplyElementFormulaContextTest.cs. Work test-first, run the two specified focused C# commands, do not build/package/live-test/commit, and return changed paths plus red/green evidence and elapsed seconds.
```

### Prompt for Luna B

```text
Implement Luna B from docs/2026-08-20-ascet-apply-element-spec-ident-project-context-fix-development-task-plan.md. Use gpt-5.6-luna with high reasoning. Read the governing spec and assigned files in full. Modify only the four assigned TypeScript runtime/test files. Work test-first through the public fast-path seam, run only the specified focused Node test files, do not touch contracts/skills/C#/generated files, do not commit, and return changed paths plus red/green evidence and elapsed seconds.
```

### Prompt for Luna C

```text
Implement Luna C from docs/2026-08-20-ascet-apply-element-spec-ident-project-context-fix-development-task-plan.md. Use gpt-5.6-luna with high reasoning. Read the governing spec and assigned files in full. Modify only the assigned action-contract, skill, test, and generated catalog files. Work test-first, regenerate the action catalog through the repository command, run the specified focused tests/check, do not touch runtime/C#/binary files, do not commit, and return changed paths plus red/green evidence and elapsed seconds.
```
