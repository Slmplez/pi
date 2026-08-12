---
name: ascet-engineering
description: Complete ASCET engineering workflow for locating Project, Package, Class, BDE, Method, ESDL, Element, Parameter, Dependency, and Variant targets; designing evidence-backed changes; planning writes; and executing guarded ascet_edit mutations. Use for ASCET implementation, modification, ESDL, signal-flow, parameter-chain, ownership, or preflight tasks.
---

# ASCET Engineering

Use this Skill as the authoritative ASCET engineering workflow. Keep the active scope bounded and load only the References needed for the request. System Prompt and Tool Prompt guidance must not replace this workflow.

## Input and scope routing

- Fuzzy functional requests start from feature semantics and a bounded Core Package candidate; do not guess a Customer Project.
- A Customer Project request starts at Project → Formula/assembly → customer interface or wrapper → Package join point.
- A Core Package request starts at Package → Module/Class/StateMachine → Method/BDE/Provider → representative customer impact.
- An exact Class path or OID is a locator, not a scope decision; resolve owner role and candidate Projects before editing.
- Freeze exactly one `integrationScope` or `featureScope`, modification layer, excluded objects, and success criteria. Ask the user when both scopes remain plausible.

## Workflow

1. Classify the request as customer integration, feature-package work, exact-class work, read-only analysis, or write work.
2. Resolve an exact Project/Package/Component target with bounded `ascet_get.tree` evidence. Preserve paths and OIDs; do not edit the first name match.
3. Read the relevant Project chain, Component references, BDE/signal flow, Method signature/code, Elements, Parameters, and Dependencies. Check coverage and truncation.
4. Freeze `integrationScope` or `featureScope`, ownership, modification layer, excluded objects, and success criteria. If both scopes remain plausible, ask the user.
5. For non-trivial tasks, maintain a concrete todolist covering scope, evidence, design, preflight/write, and completion. Do not mechanically split every read or Tool call.
6. Before `PREFLIGHTED`, present a complete implementation plan: requirement, scope/ownership, signal reuse, ESDL patch, Elements, Parameters, Dependencies/Variants, write order, assumptions, and risks. Keep `blockingUnknowns` empty before preflight.
7. For ordinary mutations, run exact-target preflight and execute the unchanged payload with `executeWrite=true`. For a complete Provider -> Imported -> Local dependency chain, call `configure_parameter_dependency_chain` once with the complete inline definition; do not call plan, commit, a separate preflight, batch, or three independent writes.
8. Accept a passed automatic readback as completion. Runtime performs automatic action-specific verification: `ascet_edit` verifies ordinary writes; `configure_parameter_dependency_chain` confirms once, validates all live targets before mutation, verifies all four stages, and compensates in reverse order on failure. Stop on conflict, rollback failure, or unknown outcome.

## Evidence and planning state

- Treat stored observations, grep hits, and reverse-reference candidates as evidence to validate, not as proof of identity, ownership, editability, or absence.
- Check observation coverage and `truncated`/partial state. Refresh exact live data when the next step depends on it or a prior write invalidated it.
- Understand `source → transform → consumer`, current signature/code, relevant Elements/Parameters, and ownership before selecting a modification point. Prefer compatible reuse.
- Keep `blockingUnknowns` explicit; do not enter Preflight while any unknown could change target, scope, business value, mapping, or write behavior.

## Todolist and implementation plan

- Size the todolist to the work: exact-target reads or single-field operations may use 1–2 items, routine ESDL/Element changes usually use 3–5, and complex work adds items only for real dependencies or independent write units.
- For non-trivial work, cover scope, evidence, design, Preflight/write, and completion. Each item names the object/action, dependency, and completion condition; never use vague “analyze/modify” items or split every read mechanically.
- Before `PREFLIGHTED`, show a complete implementation plan covering requirement/success criteria, Scope/Ownership, Signal Flow/reuse, ESDL patch, Element metadata, Parameter values or sources, Dependency/Variant mappings, write order, assumptions, and risks.
- When evidence is complete, include concrete ESDL code or an exact patch. For a new or changed Parameter include P_/C_ role, owner, type, unit, range, initial/default, calibration/constant, implementation, value/source, dependency, variant policy, and usage point.
- Values not supported by user input, existing model data, Formula, Requirement, or database evidence are decisions for the user, never invented thresholds.

## Write readiness and stop conditions

- Ordinary `ascet_edit` preflight must use the exact target and approved changes and must not mutate ASCET. Execute only the same payload with `executeWrite=true` after required confirmation.
- Preflight, plan, diff, and dry-run remain available when a Component is not editable. Immediately before every real mutation, runtime checks the affected Component internally in the same ASCET session and blocks the write unless `editable=true`.
- Do not call `mode=check` merely to authorize a write; earlier checks do not grant permission. Never call `mode=set` automatically; acquiring editability requires explicit user intent.
- A complete parameter dependency chain is the explicit exception: discovery -> exact evidence -> one `configure_parameter_dependency_chain` call. It has no public preflight, `executeWrite`, `mode`, `planId`, or commit step. Runtime checks Provider and Consumer editability before mutation and checks the affected Component again before compensating writes.
- Runtime automatically verifies executed writes. A successful `ascet_edit` or chain `committed`/`no_change` result completes the write; do not issue a redundant verification read. Read again only for the next engineering step, failure diagnosis, or an explicit user request.
- Stop and report failure or unknown outcome without blind retry. Stop and ask when target identity, ownership, scope, business values, mappings, editability, or required evidence remains ambiguous.

## Surface-specific guardrails

- Use `ascet_read.read_block_diagram` for BDE structure and signal flow; `bde_edges=0` does not prove that no diagram exists.
- Do not call code reads on BDE-only Components. Use `read_element` for exact Element metadata; `elements` is only an identity/scope directory.
- For ESDL, keep Method shell, signature, and body separate. Do not fake arguments, returns, declarations, or same-name overloads in body text.
- Prefer existing Signals, Elements, Parameters, Enums, Formulas, BDE connections, and Package interfaces; record why any new object is necessary.
- New Provider/Imported Parameters use `P_` with the same name; Consumer Local Parameters use `C_`. Use explicit dependency formals, mappings, and variant policy.

## Reference loading

| Need | Reference |
|---|---|
| Scope/ownership | `references/scope-resolution-and-ownership.md` |
| Database discovery | `references/database-root-discovery.md` |
| Customer integration | `references/customer-integration-workflow.md` |
| Feature package | `references/feature-package-workflow.md` |
| Exact Class context | `references/class-path-project-context.md` |
| Project/signal/ESDL | `references/project-to-esdl-signal-flow.md` |
| BDE/surface routing | `references/bde-and-surface-routing.md` |
| ESDL implementation | `references/esdl-fast-path.md`, `references/esdl-design-and-signal-reuse.md` |
| Elements | `references/elements-fast-path.md` |
| Parameters | `references/parameter-naming.md`, `references/parameter-provider-placement.md` |
| Dependencies | `references/dependency-advanced-path.md` |
| Planning | `references/task-planning-and-implementation-plan.md` |
| Literals | `references/esdl-literals-and-configuration-values.md` |
| Tool calls/writes | `references/tool-recipes.md`, `references/write-execution.md` |

Do not replace missing evidence with guessed business values, provider paths, ranges, formulas, or implementation settings.
