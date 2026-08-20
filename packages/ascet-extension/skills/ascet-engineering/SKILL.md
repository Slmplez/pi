---
name: ascet-engineering
description: Tool-aligned ASCET engineering for exact or fuzzy target resolution, ESDL/BDE changes, Element and Parameter design, ownership analysis, dependency chains, and guarded edits. Use when reading, analyzing, or modifying ASCET code, models, signal flow, configuration, or dependencies.
---

# ASCET Engineering

## Authority

System and Developer instructions remain authoritative.

Active Tool schemas and Action Contracts are authoritative for public Tool names, actions, parameters, result shapes, and runtime behavior. This Skill defines ASCET engineering decisions, evidence requirements, multi-tool workflow, and Reference selection. If this Skill conflicts with an active Tool contract, follow the Tool contract and report the Skill drift.

## Request routing

- Exact validated target: skip Search, read only the exact surfaces needed, design the smallest safe change, invoke the matching public edit action, and inspect automatic verification.
- Fuzzy target: use `ascet_search.search` for bounded candidate discovery, then resolve one exact target and validate it with the matching read action before any edit.
- Discovery-only request: return Search candidates without reading every candidate unless the user asks for an engineering conclusion.
- Customer integration or shared feature work: load ownership References only when the requested layer, canonical definition, or affected consumers are unclear.
- Dependency-chain work: keep complete chains separate from ordinary Element changes.

Never pass a Search candidate directly to an edit action. Skipping Search never skips an exact read required by the engineering decision or mutation.

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
| Parameter naming and placement | `references/parameter-design-and-placement.md` |
| Complete dependency chains | `references/dependency-advanced-path.md` |
| Task sizing and evidence-backed change design | `references/task-planning-and-change-design.md` |
| Canonical Tool and result routing | `references/tool-routing-and-write-execution.md` |
