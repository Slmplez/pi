---
name: ascet-engineering
description: Tool-aligned ASCET engineering for exact or fuzzy target resolution, ESDL/BDE changes, Element and Parameter design, calibration-parameter placement, ownership analysis, dependency chains, and guarded edits. Use when reading, analyzing, or modifying ASCET code, models, signal flow, configuration, or dependencies.
---

# ASCET Engineering

## Authority

System and Developer instructions remain authoritative.

Active Tool schemas and Action Contracts are authoritative for public Tool names, actions, parameters, result shapes, and runtime behavior. This Skill defines ASCET engineering decisions, evidence requirements, multi-tool workflow, and Reference selection. If this Skill conflicts with an active Tool contract, follow the Tool contract and report the Skill drift.

## Request routing

- Exact validated target: skip Search, read only the exact surfaces needed, design the smallest safe change, invoke the matching public edit action, and inspect automatic verification.
- Fuzzy target: use `ascet_search.search` for bounded candidate discovery, then resolve one exact target and validate it with the matching read action before any edit.
- Text search query: For `mode=text`, prefer a complete symbol, signal, or Parameter name instead of a broad domain word; refine a high-count or truncated query before reading candidates.
- Discovery-only request: return Search candidates without reading every candidate unless the user asks for an engineering conclusion.
- Customer integration or shared feature work: load ownership References only when the requested layer, canonical definition, or affected consumers are unclear.
- Dependency-chain work: keep complete chains separate from ordinary Element changes.
- New calibratable or tunable values requested for use by a consumer/business Class default to the complete chain in `references/parameter-design-and-placement.md`. Treat the named/current Class as the usage site, not proof of calibration ownership; resolve and validate an external or dedicated Calibration Parameter Class as Provider before routing to `ascet_edit.create_dependent_chain`. Do not route this to `ascet_edit.apply_element_spec`; use the ordinary path only for the documented narrow exceptions. Stop rather than infer Provider ownership, metadata, or bindings.

Never pass a Search candidate directly to an edit action. Skipping Search never skips an exact read required by the engineering decision or mutation.

## Hard calibration configuration gate

For every new calibratable or tunable dependency chain, configuration correctness is a mutation gate, not a best-effort preference. Block the mutation unless exact requirements or exact live readback provide all of the following:

- The current/consumer Class is confirmed as the usage location only; it is not ownership evidence. Resolve one evidence-backed Provider Calibration Parameter Class.
- The roles and scopes are exactly Provider Exported Parameter, Consumer Imported Parameter, and Consumer Local Dependent Parameter. The Provider Exported and Consumer Imported names match exactly as `P_<Name>`; the Local Dependent name is `C_<Name>`, unless an exact, verified legacy name is being preserved. Never create a calibratable standalone local shortcut.
- Provider and Imported `modelType` and unit are compatible. Local `modelType`, unit, and implementation are compatible with the dependency result and the actual ESDL usage. The Provider owns the evidence-backed calibration value/data; Imported carries structural compatibility metadata only; Local Dependent receives no independent scalar data/default.
- Range, value/data/default, implementation, and calibration decisions are explicit and evidence-backed. Validate every value/default against the selected range; integer `valueType` must cover the complete required range and signedness; real precision (`real32`/`real64`) requires an explicit engineering rule. Never use `ascetDefault` to hide an unknown decision.
- Formula, Formal, Imported mapping, and DataVariant policy are explicit and internally consistent. Do not assume or hardcode a universal `x` mapping.
- For existing endpoints, preserve exact compatible metadata. Any material mismatch is a conflict and must not be overwritten.

After apply, automatic readback must confirm all three endpoints and the binding: exact names, roles/scopes, model and implementation types, units, range, value/data/default and calibration fields where applicable, plus Formula, Formal, Imported mapping, and DataVariant. Missing or contradictory configuration, or incomplete verification, blocks completion.

## Exact-target fast path

1. Confirm the supplied path or identity is exact for the requested surface.
2. Read only current code, signature, Element, implementation, diagram, flow, Formula, or dependency data that can affect the change.
3. Reuse compatible existing objects and produce the exact ESDL, metadata, binding, or surface change.
4. Use `intent=preview` only for an explicit non-mutating preview; use `intent=apply` when the user requested the exact write.
5. Accept passed required automatic verification as completion; do not add a redundant verification read.

Do not expand a small exact ESDL or Element change into database-wide discovery, CNMS/CUST routing, complete Project impact, or full Signal Flow analysis unless evidence shows it is required.

## Engineering escalation

Escalate only for ambiguous identity or ownership, truncated Search results that block resolution, signature or interface changes, new Elements, complete dependency chains, Formula/Variant/mapping effects, shared non-local impact, or mutation results that are blocked, partial, rolled back, unknown, or unverified.

Before a non-trivial apply, record the exact target, requested behavior, code or metadata change, dependency definition, write order, assumptions, blocking unknowns, and risks. Stop rather than guess business values, Formula/Formal mappings, units, ranges, implementation settings, variants, provider paths, or ownership.

## Write and result rules

- Method bodies use `ascet_edit.set_method_code`; Module headers or external C use `ascet_edit.set_module_code`; StateMachine surfaces use `ascet_edit.set_state_machine_code`.
- Ordinary Elements use `ascet_edit.apply_element_spec`; complete Parameter Dependency Chains use `ascet_edit.create_dependent_chain`. Do not manage the same chain Elements through both actions.
- Search, Get, and Read results are interpreted by their Action Contract and do not require write verification.
- Mutation completion requires successful required automatic verification. Stop and report blocked, error, partial, rolled-back, unknown, or missing-verification outcomes.
- Formula context: `ident` is ASCET's built-in identity formula and needs no Project; non-`ident` `impl.formula` requires one explicit Project path. Never infer or create a Project for identity validation; load `references/elements-fast-path.md` for the exact rules.

## Reference loading

| Need | Reference |
|---|---|
| Search and exact target resolution | `references/search-and-target-resolution.md` |
| Database root discovery | `references/database-root-discovery.md` |
| Scope, canonical definition, and ownership | `references/target-scope-and-ownership.md` |
| CNMS/CUST routing | `references/cnms-cust-routing-and-ownership.md` |
| Customer integration | `references/customer-integration-workflow.md` |
| Shared feature packages | `references/feature-package-workflow.md` |
| BDE, implementation, StateMachine, and Signal Flow surfaces | `references/surface-and-signal-flow-routing.md` |
| ESDL write fast path | `references/esdl-fast-path.md` |
| ESDL design and signal reuse | `references/esdl-design-and-signal-reuse.md` |
| ESDL literals and configuration values | `references/esdl-literals-and-configuration-values.md` |
| Ordinary Elements | `references/elements-fast-path.md` |
| Implementation type, memory location, Formula, and ranges | `references/implementation-type-and-memory-layout.md` |
| Calibration Parameter placement, ownership, and naming | `references/parameter-design-and-placement.md` |
| Complete dependency chains and consumer calibration routing | `references/dependency-advanced-path.md` |
| Task sizing and evidence-backed change design | `references/task-planning-and-change-design.md` |
| Canonical Tool and result routing | `references/tool-routing-and-write-execution.md` |
