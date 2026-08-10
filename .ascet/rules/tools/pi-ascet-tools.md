# PI ASCET Tool Map

Use canonical PI ASCET tools only.

- Runtime/status: `ascet_status`, `ascet_scheduler_status`
- Bounded discovery and structural catalog: `ascet_get`
- Exact live evidence: `ascet_read`
- Diff: `ascet_diff`
- Write with automatic verification: `ascet_edit`
- Composite dependency-chain write: `configure_parameter_dependency_chain`

Executed `ascet_edit` writes perform mandatory automatic action-specific readback verification. Inspect the returned verification feedback and do not issue a redundant live read after verification passes. Use `ascet_read` for an explicit independent Component check and `ascet_get.formulas` for Project formulas.

Use `ascet_get` as the only live discovery entry point. Start with `tree`, then expand the selected scope with `elements`, `formulas`, `component_refs`, `bde_edges`, `import_binding`, or `dbitem_refs`. For large observations, use Pi `find`, `grep`, and `read`; use `ascet_read` only to deeply inspect an exact target.

Do not use retired tools `ascet_index`, `ascet_search`, or `ascet_explore`. Do not use old ASCET Copilot tool names such as `AscetExploreTool`, `AscetSearchTool`, or `AscetReadTool`.

For BDE or block diagram reads, use `ascet_get` with action `bde_edges` for structural flow, then `ascet_read` with action `read_block_diagram` only when exact diagram detail is required.
For Element writes, use plan/commit. `apply_element_spec` plan accepts inline role-discriminated Elements; commit accepts only `phase="commit"` and `planId`.

For Provider Exported Parameter creation, explicitly provide `unit`, `comment`, `calibration`, `range`, `data`, and `implementation` decision groups. For Local Dependent Parameter creation, explicitly provide `unit`, `comment`, `calibration`, `range`, and `implementation`; `data` is forbidden. Imported Parameter is the lightweight exception and must not contain Data, Implementation, range, or calibration.

For a complete Provider -> Imported -> Local Dependent chain, call `configure_parameter_dependency_chain` once with three complete inline Elements. Do not create or pass `specFile` values. Provider and Imported use the same `P_<Name>`; Local uses `C_<Name>`. Provide explicit dependency `formals`, `bindingPolicy="explicit"`, typed mappings, and `variantPolicy`. Runtime confirms once; Bridge validates all live targets before mutation, performs mandatory readback, and compensates in reverse order on failure. Do not use plan, commit, `planId`, separate preflight, or batch.
