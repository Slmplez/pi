# Tool Map

Use evidence kinds in rules. Resolve evidence kinds through this map when collecting live ASCET data.

## Runtime

- `runtime_status`: `ascet_status`
- `scheduler_status`: `ascet_scheduler_status`

## Target Discovery

- `components`: `ascet_explore` action `list_components`
- `target`: `ascet_search` action `resolve_component`
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

Do not use old fine-grained block-diagram tool names. They are not part of the canonical model-facing tool surface.

If `read_block_diagram` returns a valid empty graph, keep it as empty `block_diagram` evidence. If the target surface is unsupported, store the unsupported result and use alternate evidence only when the rule accepts code, implementation, or child evidence.

## Reference Evidence

- `component_refs`: `ascet_reference` action `component_refs`
- `element_refs`: `ascet_reference` action `element_refs`
- `occurrences`: `ascet_search` action `search_occurrences`

## Parameter Mapping Evidence

- `import_export_matches`: `ascet_read` action `read_import_export_matches`
- `import_export_match`: `ascet_read` action `read_import_export_match`
- `element_dependency_plan`: `ascet_read` action `plan_element_dependency`
- `parameter_children`: collect `children` with `group="parameters"` when parameter-only evidence is needed
- `parameter_occurrences`: `occurrences` filtered to the parameter element under inspection
- `parameter_code_context`: `component_code` or `method_code` only when the rule needs code context

Parameter mapping checks may use only read, explore, reference, and search evidence. Do not use `ascet_write.set_element_dependency` in full-check.

Project-level `element_dependency_plan` enumerates code components and aggregates component dependency candidates. If the ASCET ToolAPI surface does not expose a supported project enumeration method, record `project_component_enumeration_unavailable` as an evidence gap instead of inventing dependency candidates.

## Diff and Verify

- `component_diff`: `ascet_diff`
- `method_diff`: `ascet_diff`
- `readback_verify`: `ascet_verify`

Use `ascet_diff` action `diff` with `objectKind` for detailed semantic component comparison. Use `diff_component_snapshot` only as quick snapshot evidence for child added/removed presence, not for method code, formula, or element signature decisions.

## Fallback Rules

If a mapped action is unsupported for a target surface, record the unsupported tool result in evidence and use the next available evidence kind. Do not silently drop missing evidence.
