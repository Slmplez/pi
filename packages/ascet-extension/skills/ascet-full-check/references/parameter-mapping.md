# Parameter Mapping Checks

Use this reference when `/ascet-full-check` includes Imported Parameter, Exported Parameter, Local Parameter, dependency, or semantic parameter-name consistency checks.

## Goal

Check only business Imported/Exported Parameter mapping chains. The workflow must identify missing mappings, missing endpoints, attribute mismatches, unused imported parameters, unsupported local constants, ambiguous local dependencies, and semantic name mismatches with traceable ASCET tool evidence.

## Read-Only Boundary

Parameter mapping checks are read-only. Use these tools only through the canonical ASCET extension tools and scheduler:

- `ascet_reference` action `component_refs`
- `ascet_explore` action `preview_children`
- `ascet_read` action `read_import_export_matches`
- `ascet_read` action `read_import_export_match`
- `ascet_read` action `plan_element_dependency`
- `ascet_search` action `search_occurrences`
- `ascet_read` action `read_code` only when code context is required

Do not use `ascet_write.set_element_dependency` in full-check.

For deterministic offline evaluation of collected evidence, run:

```powershell
node packages\ascet-extension\skills\ascet-full-check\scripts\check-parameter-mapping.mjs --evidence-dir .pi\ascet-full-check\runs\<run-id>\evidence --out .pi\ascet-full-check\runs\<run-id>\findings\parameter-mapping.jsonl
```

Use the bundled fixture under `fixtures/parameter-mapping/evidence/` as the smoke-test shape for this script.

## Tool Orchestration

1. Resolve scoped components.
2. Collect `component_refs` for each scoped component.
3. Derive importer/exporter component pairs from reference evidence.
4. If no importer/exporter pair can be established, write a `parameter_mapping_relation_gap` evidence record.
5. Collect `children` with `preview_children` for importer and exporter components. Derive parameters from child payloads; do not assume a `group="parameters"` model exists.
6. Call `read_import_export_matches` for each importer/exporter pair.
7. Call `read_import_export_match` for mapped elements, missing endpoints, dT candidates, and semantic-name suspects.
8. Call `plan_element_dependency` for local parameter candidates to determine dependent/independent state and multiple dependency risk.
9. Call `search_occurrences` for unmapped imported parameters before reporting unused state.
10. Call `read_code` only when occurrence evidence is ambiguous or semantic consistency needs code context.
11. Run the dT exemption policy before normal rule evaluation.
12. Emit findings to `findings/parameter-mapping.jsonl`.

All live calls must pass through the ASCET scheduler. The report must retain evidence IDs so every finding can be traced back to the tool/action that produced it.

## Rule IDs

- `parameter.imported-local-attribute-mismatch`
- `parameter.mapping-missing-imported`
- `parameter.mapping-missing-local`
- `parameter.imported-unmapped-and-unused`
- `parameter.local-constant-unmapped`
- `parameter.multiple-dependency-local-parameter`
- `parameter.mapping-dt-business-crosswire`
- `semantic.parameter-name-consistency`

## dT Exemption

Apply `special.dt-parameter-exemption` before reporting any normal parameter mapping issue.

Treat an element as an ASCET dT system parameter when any of these are true:

- The name is case-insensitively equal to `dt`, including `dT`, `dt`, `DT`, or `Dt`.
- Element metadata explicitly identifies it as `system parameter`, `delta time parameter`, `time step parameter`, or `dt system parameter`.
- Tool evidence identifies the element as the ASCET system time-step parameter.

When the element is a dT system parameter and it is not part of a business Imported/Exported Parameter mapping chain, suppress:

- `parameter.mapping-missing-imported`
- `parameter.mapping-missing-local`
- `parameter.imported-unmapped-and-unused`
- `parameter.local-constant-unmapped`
- `parameter.imported-local-attribute-mismatch`
- `semantic.parameter-name-consistency`

Do not suppress if tool evidence shows a non-dT business parameter is mapped to dT, or dT is mapped into a non-dT business parameter. Report that as `parameter.mapping-dt-business-crosswire`.

## Finding Requirements

Every parameter mapping finding must include:

- `rule_id`
- `severity`
- `component_path`
- `element_name`
- `importer_component_path`
- `exporter_component_path`
- `actual_mapping`
- `expected_mapping`
- `tool_evidence`
- `recommendation`
- `confidence`

Do not report a parameter mapping defect from name similarity alone. Name-based checks can only raise `semantic.parameter-name-consistency` when mapping, dependency, occurrence, or code evidence also supports the mismatch.

## Evidence Gaps

Record evidence gaps when:

- No importer/exporter relation can be derived from `component_refs`.
- `read_import_export_matches` is unsupported or fails for a component pair.
- `children` payload does not expose enough element metadata to classify a parameter.
- `plan_element_dependency` cannot inspect a local parameter candidate.
- `search_occurrences` cannot confirm whether an unmapped imported parameter is used.

Evidence gaps should appear in the final report, not as silent omissions.
