# PI ASCET Tool Map

Use canonical PI ASCET tools only.

- Runtime/status: `ascet_status`, `ascet_scheduler_status`
- Exploration: `ascet_explore`
- Search/resolve: `ascet_search`
- Read evidence: `ascet_read`
- Diff: `ascet_diff`
- Write: `ascet_edit`
- Composite dependency-chain write: `configure_parameter_dependency_chain`
- Verify: `ascet_verify`

Do not use old ASCET Copilot tool names such as `AscetExploreTool`, `AscetSearchTool`, or `AscetReadTool`.

For BDE or block diagram reads, use `ascet_read` with action `read_block_diagram`.
For Element writes, use plan/commit. `apply_element_spec` plan accepts inline role-discriminated Elements; commit accepts only `phase="commit"` and `planId`.

For Provider Exported Parameter creation, explicitly provide `unit`, `comment`, `calibration`, `range`, `data`, and `implementation` decision groups. For Local Dependent Parameter creation, explicitly provide `unit`, `comment`, `calibration`, `range`, and `implementation`; `data` is forbidden. Imported Parameter is the lightweight exception and must not contain Data, Implementation, range, or calibration.

For a complete Provider -> Imported -> Local Dependent chain, call `configure_parameter_dependency_chain` with `mode="plan"` and three inline Elements. Do not create or pass `specFile` values. Provide explicit dependency `formals`, `bindingPolicy="explicit"`, typed mappings, `variantPolicy`, and `verifyReadback=true`; commit with only `mode="commit"` and the returned `planId`.
