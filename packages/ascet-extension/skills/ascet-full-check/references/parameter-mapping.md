# Parameter Mapping Checks

Use this reference when `/ascet-full-check` includes Imported Parameter, Exported Parameter, Local Parameter, dependency, or semantic parameter-name consistency checks.

## Goal

Check business Imported/Exported Parameter mapping chains with traceable on-demand ASCET evidence. The workflow identifies missing mappings, missing endpoints, attribute mismatches, unused imported parameters, unsupported local constants, ambiguous local dependencies, and semantic name mismatches without a full database index.

## Read-Only Boundary

Parameter mapping checks are read-only. Use the canonical ASCET tools through the scheduler:

- `ascet_get` action `tree` to bound folder, Project, and Component scope
- `ascet_get` action `elements` to read the selected Component or bounded Folder directory
- `ascet_get` action `component_refs` to read outgoing component relations
- `ascet_get` action `import_binding` to verify one explicit Imported Element/provider pair
- Pi `find`, `grep`, and `read` for stored Get observations
- `ascet_read` exact deep reads only when dependency, implementation, or code detail is required

Do not use `ascet_edit.set_element_dependency` in full-check.

For deterministic offline evaluation of collected evidence, run:

```powershell
node packages\ascet-extension\skills\ascet-full-check\scripts\check-parameter-mapping.mjs --evidence-dir .pi\ascet-full-check\runs\<run-id>\evidence --out .pi\ascet-full-check\runs\<run-id>\findings\parameter-mapping.jsonl
```

Use the bundled fixture under `fixtures/parameter-mapping/evidence/` as the smoke-test shape for this script.

## Tool Orchestration

1. Use `ascet_get.tree` to resolve the scoped consumer and a bounded feature/provider scope. Keep each returned path and OID together.
2. Use `ascet_get.elements` for the consuming component. Identify Local and Imported Parameter candidates by name and scope.
3. Use `ascet_get.component_refs` for the consumer to establish likely provider component relations.
4. Use `ascet_get.elements` for explicit provider candidates only. For stored results, use Pi `grep` and `read` to find the Imported Parameter name with `scope=exported`.
5. If one provider remains, call `ascet_get.import_binding` with the consumer, Imported Element, and provider.
6. Use `ascet_read.read_dependent_chain` or `ascet_read.read_element_dependency` only for exact live dependency/formula detail that is absent from Get evidence.
7. Use `ascet_read.read_code` only when the mapping evidence is ambiguous or semantic consistency requires code context.
8. Run the dT exemption policy before normal rule evaluation.
9. Emit findings to `findings/parameter-mapping.jsonl`.

All live calls must pass through the ASCET scheduler and run strictly one at a time. The report must retain evidence IDs so every finding can be traced back to the tool/action that produced it.

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

Do not report a parameter mapping defect from name similarity alone. Name-based checks can only raise `semantic.parameter-name-consistency` when Get, binding, dependency, or code evidence also supports the mismatch.

## Evidence Gaps

Record evidence gaps when:

- No consumer/provider relation can be derived from bounded `component_refs` and `tree` evidence.
- `elements` does not expose enough metadata to classify a parameter.
- No exact `scope=exported` provider candidate remains after inspecting the bounded provider scope.
- `import_binding` is unsupported, fails, or contradicts the explicit candidate pair.
- A required precise dependency/code read is unsupported or incomplete.

Evidence gaps should appear in the final report, not as silent omissions.
