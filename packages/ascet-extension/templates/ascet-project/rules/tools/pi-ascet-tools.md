# PI ASCET Tool Map

Use canonical PI ASCET tools only.

- Runtime/status: `ascet_status`, `ascet_scheduler_status`, `ascet_recover`
- Live native discovery: `ascet_search`
- Bounded hierarchy or exact Project formulas: `ascet_get`
- Exact live evidence: `ascet_read`
- Diff: `ascet_diff`
- Guarded write with automatic verification: `ascet_edit`

Use `ascet_search` for live candidate discovery. Search results are hints, not complete metadata. Resolve and validate an exact path before `ascet_get`, `ascet_read`, or an edit. `ascet_get` exposes only `tree` and `formulas`; it does not retain a Catalog.

For a dependency-chain write, call `ascet_edit.create_dependent_chain` with explicit Provider, Imported, Local, Formula, Formal, and DataVariant definitions. For the standard identity binding, send `formula="x"`, `formal="x"`, and map `x` to the Consumer Imported Parameter; never substitute the Imported Parameter name for the formal. Missing Elements are created, exact Elements are reused, and conflicts are rejected without overwrite. The Provider component path is required for the normal write route; resolve it with `ascet_search` before calling the mutation when necessary. Apply performs automatic full readback. Use `ascet_read.read_dependent_chain` for current-state inspection.

For every write, use one `ascet_edit` call with `intent="apply"`. Use `mode="check"` only for read-only editability inspection. Executed writes perform mandatory automatic readback verification.
