# Tool Recipes

Use `ascet_status` when runtime availability is uncertain. Use bounded `ascet_get.tree` for discovery, then exact `elements`, `formulas`, `component_refs`, `bde_edges`, `import_binding`, or `dbitem_refs`. Use exact `ascet_read` for code, signature, Element, Dependency, implementation, or diagram detail.

For Project ownership, use stored Tree/Catalog evidence to join a Project Module instance to its same-OID canonical definition candidate, then validate the exact target live. `component_refs` and `dbitem_refs` remain outgoing-reference tools, not reverse-reference APIs.

Use `ascet_edit` for one ordinary mutation. Without `executeWrite`, it is Preflight; with `executeWrite=true`, it executes the unchanged approved mutation. Do not add `verifyReadback` or call a separate verification Tool.

Use `configure_parameter_dependency_chain` for a complete Provider Exported -> Consumer Imported -> Consumer Local Dependent Parameter chain. Submit one complete inline request after exact-target discovery. Runtime confirmation, live conflict validation, mandatory readback, and compensating rollback are built in. The chain tool has no `mode`, `planId`, separate commit, or batch path.

For an actual mutation of a shared OID, warn only when the context makes the advisory useful: the user may reasonably assume the change is Project-local, consumer impact has changed, or shared ownership has not yet been explained. Do not warn for reads, preflight-only calls, no-op operations, or repeated writes to the same OID after the impact has already been acknowledged in the active task. Use concise contextual wording rather than a fixed sentence, do not request a second shared-object confirmation, and continue with the ordinary mutation confirmation.
