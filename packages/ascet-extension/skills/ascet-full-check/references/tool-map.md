# Tool Map

Use evidence kinds in rules. Collect live ASCET structure and reference evidence with `ascet_get`; it is the only discovery surface.

## Runtime

- `runtime_status`: `ascet_status`
- `scheduler_status`: `ascet_scheduler_status`

## Navigation And Directory Evidence

- `tree`: `ascet_get` action `tree`
- `components`: derive from `tree`
- `target`: select an exact `path` or `oid` from `tree`
- `children`: `ascet_get` action `elements`
- `formulas`: `ascet_get` action `formulas`
- `occurrences`: Pi `grep` and `read` over stored bounded Get observations; use exact `ascet_read.read_code` only when the rule requires live code context

Use `tree` first. Give a known `target.path`, `target.oid`, or bounded `target.targetPathPrefix`; do not request a database-wide discovery scan. When an observation is stored, use Pi `find`, `grep`, and `read` against its NDJSON and metadata files instead of calling a separate ASCET search tool.

## Reference And Diagram Evidence

- `component_refs`: `ascet_get` action `component_refs`
- `element_refs`: `ascet_get` action `dbitem_refs` with the exact Element/DataBaseItem target
- `dbitem_refs`: `ascet_get` action `dbitem_refs`
- `import_binding`: `ascet_get` action `import_binding`
- `bde_edges`: `ascet_get` action `bde_edges`
- `block_diagram`: derive structural graph evidence from `bde_edges`; use `ascet_read.read_block_diagram` only for required exact detail
- `diagrams`: derive named diagrams from `bde_edges`
- `bde_connections`: derive from `bde_edges`
- `bde_signals`: derive from `bde_edges` and `elements`

`component_refs` and `dbitem_refs` expose outgoing references only. `import_binding` is an exact check, not provider discovery: call it only after `tree`, `elements`, and local observation search identify both the consumer Imported Element and its provider.

## Exact Deep Reads

- `component_code`, `method_code`: `ascet_read` action `read_code`
- `implementation`: `ascet_read` action `read_implementation`
- detailed dependency/formula state: `ascet_read` action `read_element_dependency` or `read_dependent_chain`
- detailed block-diagram surface: `ascet_read` action `read_block_diagram` only when `bde_edges` is insufficient

Use `ascet_read` for one exact resolved target. It is not a discovery or search substitute.

## Parameter Mapping Evidence

1. Use `tree` to bound the consumer and provider feature scope.
2. Use `elements` to collect the consumer directory and explicit provider candidates.
3. Use `component_refs` to establish outgoing consumer relations.
4. Use Pi `grep`/`read` on Get observations to match the Imported Parameter name to `scope=exported` candidates.
5. Use `import_binding` only for an explicit consumer/imported-element/provider tuple. Derive `import_export_matches` and `import_export_match` evidence from the validated binding.
6. Use a precise `ascet_read` dependency or code read only when the returned structure is insufficient.

Do not use write tools in full-check.

## Diff And Verify

- `component_diff`: `ascet_diff`
- `method_diff`: `ascet_diff`
- `readback_verify`: `ascet_verify`

Use `ascet_diff` action `diff` with `objectKind` for detailed semantic component comparison. Use `diff_component_snapshot` only as quick snapshot evidence for child added/removed presence, not for method code, formula, or element signature decisions.

## Fallback Rules

If a bounded Get action is unsupported for a target surface, store the unsupported result in evidence, then use the mapped exact deep read only when the rule accepts that evidence. Do not silently drop missing evidence.
