# Tool Recipes

Use `ascet_status` when runtime availability is uncertain. Use bounded `ascet_get.tree` for discovery, then exact `elements`, `formulas`, `component_refs`, `bde_edges`, `import_binding`, or `dbitem_refs`. Use exact `ascet_read` for code, signature, Element, Dependency, implementation, or diagram detail.

Use `ascet_edit` for one ordinary mutation. Without `executeWrite`, it is Preflight; with `executeWrite=true`, it executes the unchanged approved mutation. Do not add `verifyReadback` or call a separate verification Tool.

Use `configure_parameter_dependency_chain` for a complete Provider Exported -> Consumer Imported -> Consumer Local dependency chain. Submit one complete inline request after exact-target discovery. Runtime confirmation, live conflict validation, mandatory readback, and compensating rollback are built in. The chain tool has no `mode`, `planId`, separate commit, or batch path.
