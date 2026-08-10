# Write Execution

Freeze target, scope, changes, mappings, variants, and approval before writing. Ordinary `ascet_edit` mutations use non-mutating Preflight followed by the unchanged payload with `executeWrite=true`.

A complete parameter dependency chain is different: call `configure_parameter_dependency_chain` once. It does not use `executeWrite`, public preflight, plan/commit, or `planId`. Runtime asks for one confirmation before opening Bridge. Bridge then uses one fresh ToolAPI session to validate every live target, capture rollback evidence, write Provider/Imported/Local/Dependency in order, and perform mandatory readback.

`committed` and `no_change` are successful terminal results. Existing conflicts must return zero mutation. `rolled_back` means the attempted write failed but the original state was readback-verified. Stop on `rollback_failed` or `unknown_outcome`; do not blindly retry.
