# Dependency Advanced Path

Resolve the exact Provider Component, Consumer Component, Imported Parameter, Local Parameter, mapping targets, and variants before writing. Provider Exported and Consumer Imported Parameters must use the same `P_<Name>`; the Consumer Local Parameter uses `C_<Name>`.

For one complete Provider -> Imported -> Local chain, call `configure_parameter_dependency_chain` once with three complete inline Element definitions plus explicit `formula`, `formals`, typed `mappings`, and `variantPolicy`. Do not call plan, commit, a separate preflight, batch, or three independent `ascet_edit` writes.

The tool uses create-or-verify semantics:

- missing Element or Dependency: create
- exact existing state: no-op and return `no_change`
- different existing Element, formula, mapping, or variant state: reject before mutation
- successful mutation: mandatory readback of all stages
- failure after mutation: reverse compensating rollback with readback

Treat `rollback_failed` and `unknown_outcome` as stop conditions. Do not retry until the exact live state is read. Use `set_element_dependency` only for an existing single local Element; it does not create the complete chain.
