# PI ASCET Tool Map

Use canonical PI ASCET tools only.

- Runtime/status: `ascet_status`, `ascet_scheduler_status`, `ascet_recover`
- Live native discovery: `ascet_search`
- Bounded hierarchy or exact Project formulas: `ascet_get`
- Exact live evidence: `ascet_read`
- Diff: `ascet_diff`
- Guarded write with automatic verification: `ascet_edit`

Use `ascet_search` for live candidate discovery. Search results are hints, not complete metadata. Resolve and validate an exact path before `ascet_get`, `ascet_read`, or an edit. `ascet_get` exposes only `tree` and `formulas`; it does not retain a Catalog.

For a dependency-chain write, call `ascet_edit.create_dependent_chain` with explicit Provider, Imported, Local, Formula, Formal, and DataVariant definitions. Missing Elements are created, exact Elements are reused, and conflicts are rejected without overwrite. If the Provider path is omitted, Runtime uses live native Element Search and accepts only one exact validated Exported Parameter. Apply performs automatic full readback. Use `ascet_read.read_dependent_chain` for current-state inspection.

For every write, use one `ascet_edit` call with `intent="preview"` or `intent="apply"`. Executed writes perform mandatory automatic readback verification.
