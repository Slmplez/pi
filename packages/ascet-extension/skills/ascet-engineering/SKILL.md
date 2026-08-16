---
name: ascet-engineering
description: Complete ASCET engineering workflow for fast CNMS/CUST and Project routing, canonical OID ownership, ESDL/BDE and Element/Parameter implementation design, guarded preflight, and ascet_edit execution. Use for ASCET implementation, modification, signal-flow, ownership, dependency, configuration, or final implementation planning.
---

# ASCET Engineering

Use this Skill as the authoritative ASCET engineering workflow. Keep scope bounded and load only the References needed for the request. System Prompt and Tool Prompt guidance must not replace this workflow.

## Input and scope routing

- Exact Project, Class, Module, Method, path, or OID requests take the shortest exact-target route; do not begin with a database-wide scan.
- Fuzzy requests start from feature semantics and keep generic Package, China Package/CNMS, and CUST candidates separate. Do not guess a Customer Project or assume CNMS feature coverage.
- Treat `Project::Module` as assembly context. Resolve its exact OID to the same-OID canonical definition before deciding ownership or editing ESDL/Elements.
- Bind stored database evidence to exact identity only when database discovery is required. Track `databaseRole` and `ownerLayer` as routing evidence, not as modification scope.
- Freeze exactly one `integrationScope` or `featureScope`, modification layer, excluded objects, and success criteria. Ask when both scopes remain plausible.

## Workflow

1. Classify the request as customer integration, shared feature work, exact-target work, read-only analysis, or write work and choose the shortest route.
2. Resolve the exact active Project/Package/Component target with bounded Tree/Catalog evidence; preserve instance paths, definition paths, and OIDs.
3. Read the relevant assembly, canonical definition, references, BDE/signal flow, Method signature/code, Elements, Parameters, and Dependencies. Check coverage and truncation.
4. Freeze scope, canonical owner, modification layer, excluded objects, and success criteria; keep `blockingUnknowns` explicit.
5. For non-trivial tasks, maintain a concrete todolist covering scope, evidence, design, preflight/write, and completion without splitting every read or Tool call.
6. Before `PREFLIGHTED`, present a complete implementation plan: requirement, ownership, source/transform/consumer, concrete ESDL patch, Element/Parameter metadata, Dependencies/Variants, write order, assumptions, and risks.
7. For ordinary mutations, use one `ascet_edit` call with `intent=apply`; use `intent=preview` only for a non-mutating preview. For dependency changes, call `ascet_read.read_dependent_chain` first, then `ascet_edit.set_dependent_chain`.
8. Accept passed automatic action-specific verification as completion. Stop on conflict, rollback failure, unknown outcome, or evidence that invalidates the frozen target or scope.

## Evidence and planning state

- Stored observations, grep hits, and reverse-reference candidates are evidence to validate, not proof of identity, ownership, editability, or absence.
- A changed `database.name` invalidates prior database artifacts even if `database.path` is unchanged. Report identity inconsistency and never mix database evidence.
- Check observation coverage and `truncated`/partial state. Refresh exact live data when the next step depends on it or a prior write invalidated it.
- Understand `source → transform → consumer`, current code/signature, relevant Elements/Parameters, and canonical ownership before selecting a modification point. Prefer compatible reuse.
- Keep `blockingUnknowns` explicit; do not enter Preflight while any unknown could change target, scope, business value, mapping, or write behavior.

## Todolist and implementation plan

- Size the todolist to the work: exact-target reads or single-field operations may use 1–2 items, routine ESDL/Element changes usually use 3–5, and complex work adds items only for real dependencies or independent write units.
- Each item names the object/action, dependency, and completion condition; never use vague “analyze/modify” items or split every read mechanically.
- With complete evidence, include concrete ESDL code or an exact patch and every changed Element's owner, role, type, unit, range source, initial/default source, calibration/constant decision, implementation, and usage point.
- For a dependency-chain Parameter, include Provider/Imported/Local Dependent role, applicable P_/C_ prefix, value/source, metadata, formals, mappings, variants, and usage point.
- Values not supported by user input, existing model data, Formula, Requirement, or database evidence are user decisions; never invent thresholds.

## Write readiness and stop conditions

- `ascet_edit` with `intent=preview` is non-mutating. `intent=apply` performs exact-target preflight, permission evaluation, optional approval, revalidation, optional editability acquisition, mutation, and mandatory readback in the same call.
- Preview, diff, and dry-run remain available when a Component is not editable. Immediately before every real mutation, runtime rechecks the affected Component inside the guarded ASCET session and either acquires editability when authorized or blocks before the primary mutation.
- Do not call `mode=check` merely to authorize a write; earlier checks do not grant permission. Do not issue a separate `mode=set` as part of an ordinary write flow; the guarded `intent=apply` call owns authorized editability acquisition and reports that the editable state may persist.
- For dependency chains, use `ascet_edit.create_dependent_chain` with complete explicit Element and binding definitions. Runtime may use live native Element Search to resolve one exact Provider, creates only missing Elements, reuses exact matches, rejects conflicts, and automatically verifies apply results. Use `ascet_read.read_dependent_chain` for current-state inspection.
- Runtime automatically verifies executed writes. A successful `ascet_edit` or chain `committed`/`no_change` result completes the write; read again only for the next engineering step, failure diagnosis, or explicit request.
- Stop and report failure or unknown outcome without blind retry. Stop and ask when target identity, canonical ownership, scope, values, mappings, editability, or required evidence remains ambiguous.

## Shared OID and surface guardrails

- For an actual shared-OID mutation, explain non-local impact when context requires it; do not repeat advisories after ownership and impact are already acknowledged.
- Match reads to the surface: use block-diagram reads for BDE, exact code/signature reads for ESDL, and `read_element` for exact Element metadata; `elements` is only an identity/scope directory.
- Keep Method shell, signature, and body separate. Do not fake arguments, returns, declarations, or same-name overloads in body text.
- Prefer existing Signals, Elements, Parameters, Enums, Formulas, BDE connections, and interfaces; record why a new object is necessary.
- New Provider Exported and Consumer Imported Parameters use the same `P_<Name>`; Consumer Local Dependent Parameters use `C_<Name>`. `C_` is not a generic prefix for Local State/Internal Variables.

## Reference loading

| Need | Reference |
|---|---|
| CNMS/CUST routing and canonical owner | `references/cnms-cust-routing-and-ownership.md` |
| Database discovery | `references/database-root-discovery.md` |
| Scope/ownership | `references/scope-resolution-and-ownership.md` |
| Customer integration | `references/customer-integration-workflow.md` |
| Shared feature package | `references/feature-package-workflow.md` |
| Exact Class/Module context | `references/class-path-project-context.md` |
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

