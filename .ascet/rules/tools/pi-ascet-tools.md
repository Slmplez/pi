# PI ASCET Tool Map

Use canonical PI ASCET tools only.

- Runtime/status: `ascet_status`, `ascet_scheduler_status`, `ascet_recover`
- Live native discovery: `ascet_search`
- Bounded hierarchy or exact Project formulas: `ascet_get`
- Exact live evidence: `ascet_read`
- Diff: `ascet_diff`
- Guarded write with automatic verification: `ascet_edit`

Use `ascet_search` for live candidate discovery. Search results are hints, not complete metadata. Resolve and validate an exact path before `ascet_get`, `ascet_read`, or an edit. `ascet_get` exposes only `tree` and `formulas`; it does not retain a Catalog.

For a dependency-chain write, use `ascet_edit.create_dependent_chain`: Create one Provider Exported P_<Name> -> Consumer Imported P_<Name> -> Consumer Local Dependent C_<Name> Parameter chain. Provider and Local require explicit implementation with valueType, memoryLocation, formula, and limitAssignments; Imported is structural only. ident needs no projectPath; another formula needs the matching Provider or Consumer projectPath. Standard binding uses formula="x", formal="x"; apply verifies readback. Use `ascet_read.read_dependent_chain` for current-state inspection.

For every write, use one `ascet_edit` call with `intent="apply"`. Use `mode="check"` only for read-only editability inspection. Executed writes perform mandatory automatic readback verification.
