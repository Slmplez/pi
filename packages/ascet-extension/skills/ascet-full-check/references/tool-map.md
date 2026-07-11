# Tool Map

Use evidence kinds in rules. Resolve evidence kinds through this map when collecting live ASCET data.

## Runtime

- `runtime_status`: `ascet_status`
- `scheduler_status`: `ascet_scheduler_status`

## Target Discovery

- `components`: `ascet_explore` action `list_components`
- `target`: `ascet_explore` action `resolve_target`
- `target_inspection`: `ascet_explore` action `inspect_target`
- `children`: `ascet_explore` action `preview_children`
- `diagrams`: `ascet_explore` action `list_diagrams`

## Code Evidence

- `component_code`: `ascet_read` action `read_code`
- `method_code`: `ascet_read` action `read_code`
- `implementation`: `ascet_read` action `read_implementation`
- `summary`: `ascet_read` action `read_summary`

## Diagram Evidence

- `block_diagram`: `ascet_read` action `read_block_diagram`
- `bde_connections`: derive from `block_diagram`
- `bde_signals`: derive from `block_diagram`, `children`, and `component_code`

## Reference Evidence

- `component_refs`: `ascet_reference` action `component_refs`
- `element_refs`: `ascet_reference` action `element_refs`
- `occurrences`: `ascet_search` action `search_occurrences`

## Diff and Verify

- `component_diff`: `ascet_diff`
- `method_diff`: `ascet_diff`
- `readback_verify`: `ascet_verify`

## Fallback Rules

If a mapped action is unsupported for a target surface, record the unsupported tool result in evidence and use the next available evidence kind. Do not silently drop missing evidence.
