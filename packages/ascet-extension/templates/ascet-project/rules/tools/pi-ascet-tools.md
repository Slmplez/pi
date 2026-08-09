# PI ASCET Tool Map

Use canonical PI ASCET tools only.

- Runtime/status: `ascet_status`, `ascet_scheduler_status`, `ascet_recover`
- On-demand structure and references: `ascet_get`
- Exact deep reads: `ascet_read`
- Semantic comparison: `ascet_diff`
- Guarded writes with automatic verification: `ascet_edit`

Executed `ascet_edit` writes perform mandatory automatic action-specific readback verification. Inspect the returned verification feedback and do not issue a redundant live read after verification passes. Use `ascet_read` for an explicit independent Component check and `ascet_get.formulas` for Project formulas.

`ascet_get` is the only discovery surface. Its actions are `tree`, `elements`, `formulas`, `component_refs`, `bde_edges`, `import_binding`, and `dbitem_refs`.

Start with `tree`, then use exact returned `path` or `oid` for a bounded follow-up action. Small results return inline; for stored observations use Pi `find`, `grep`, and `read` on the returned NDJSON/meta paths. Use `ascet_read` only when a selected target needs detailed code, implementation, dependency, or diagram data.

Do not use legacy CamelCase ASCET Copilot tool identifiers or retired ASCET discovery/search/index tools.
