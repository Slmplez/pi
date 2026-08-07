# Evidence Contract

Each run writes evidence under:

```text
.pi/ascet-full-check/runs/<run-id>/evidence/
```

## Run Files

```text
check-request.json
check-plan.json
scope-manifest.json
evidence/status.json
evidence/components.jsonl
evidence/diagrams.jsonl
evidence/block-diagrams.jsonl
evidence/elements.jsonl
evidence/code.jsonl
evidence/references.jsonl
evidence/parameter-mappings.jsonl
evidence/parameter-dependencies.jsonl
evidence/parameter-occurrences.jsonl
evidence/diffs.jsonl
evidence/verify.jsonl
findings/*.jsonl
report/ascet-full-check-report.md
report/ascet-full-check-report.json
```

## Evidence JSONL Record

```json
{
  "run_id": "20260711-120000",
  "evidence_id": "code:DEMO\\PID:calc",
  "kind": "method_code",
  "component_path": "DEMO\\PID",
  "method_name": "calc",
  "diagram_name": null,
  "element_name": null,
  "tool": "ascet_read",
  "action": "read_code",
  "target": "DEMO\\PID",
  "ok": true,
  "payload": {},
  "error": null
}
```

Parameter mapping evidence may add these fields when applicable:

```json
{
  "importer_component_path": "DEMO\\Importer",
  "exporter_component_path": "DEMO\\Exporter",
  "actual_mapping": {},
  "expected_mapping": {},
  "dependency": {
    "state": "dependent",
    "supported": true
  },
  "suppression": null
}
```

Use these evidence id conventions:

- `import_export_matches:<importer>-><exporter>`
- `import_export_match:<importer>-><exporter>:<element>`
- `element_dependency_plan:<component>:<element>`
- `parameter_occurrences:<component>:<element>`
- `parameter_mapping_relation_gap:<component>`

When importer/exporter relations cannot be established, write an `ok: false` evidence record instead of skipping the component:

```json
{
  "run_id": "20260711-120000",
  "evidence_id": "parameter_mapping_relation_gap:DEMO\\Importer",
  "kind": "parameter_mapping_relation_gap",
  "component_path": "DEMO\\Importer",
  "tool": "ascet_get",
  "action": "component_refs",
  "target": "DEMO\\Importer",
  "ok": false,
  "payload": null,
  "error": {
    "code": "importer_exporter_relation_not_found",
    "message": "No importer/exporter component relation could be established for DEMO\\Importer."
  }
}
```

## Requirements

- Preserve exact tool, action, target, and ASCET path strings.
- Store unsupported-surface and not-found responses as evidence with `ok: false`.
- Reuse evidence records when multiple rules require the same kind and target.
- Do not require checker agents to read child transcripts to prove findings.
- Parameter mapping findings must cite `tree`, `elements`, `component_refs`, and the specific import-binding or exact dependency evidence used to decide the rule.
