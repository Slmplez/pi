# Tool Recipes

Use `ascet_status` when runtime availability is uncertain. Use one bounded `ascet_search` call for names, references, methods, elements, messages, or code text. Use `ascet_get.tree` only for hierarchy expansion, then exact `elements`, `formulas`, `component_refs`, `bde_edges`, `import_binding`, or `dbitem_refs`. Use exact `ascet_read` for code, signature, Element, Dependency, implementation, or diagram detail.

For Project ownership, use stored Tree/Catalog evidence to join a Project Module instance to its same-OID canonical definition candidate, then validate the exact target live. `component_refs` and `dbitem_refs` remain outgoing-reference tools, not reverse-reference APIs.

Use `ascet_edit` for one ordinary mutation. Set `intent=apply` when the user requested the write; runtime performs preflight, permission handling, execution, and readback in that call. Set `intent=preview` only for a non-mutating preview. Do not add `verifyReadback` or call a separate verification Tool.

Use `ascet_read.read_dependent_chain` to resolve and validate one Provider -> Imported -> Local chain, then call `ascet_edit.set_dependent_chain` with `intent=preview` or `intent=apply`. Do not guess binding metadata or create missing Elements.

For an actual mutation of a shared OID, warn only when the context makes the advisory useful: the user may reasonably assume the change is Project-local, consumer impact has changed, or shared ownership has not yet been explained. Do not warn for reads, preflight-only calls, no-op operations, or repeated writes to the same OID after the impact has already been acknowledged in the active task. Use concise contextual wording rather than a fixed sentence, do not request a second shared-object confirmation, and continue with ordinary runtime permission handling.
