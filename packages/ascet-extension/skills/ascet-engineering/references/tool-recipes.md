# Tool Recipes

Use `ascet_status` when runtime availability is uncertain. Use bounded `ascet_get.tree` first for discovery, then exact `elements`, `formulas`, `component_refs`, `bde_edges`, `import_binding`, or `dbitem_refs`. Use Pi `find`/`grep`/`read` on stored observations. Use exact `ascet_read` for code, signature, element, dependency, implementation, or diagram detail.

Use `ascet_edit` for one mutation. Without `executeWrite`, it is Preflight; with `executeWrite=true`, it executes the approved mutation. Use Action Descriptors as the sole Tool Prompt source. Do not add `verifyReadback` or call a separate verification Tool.
