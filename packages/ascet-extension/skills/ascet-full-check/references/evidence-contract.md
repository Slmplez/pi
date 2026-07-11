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

## Requirements

- Preserve exact tool, action, target, and ASCET path strings.
- Store unsupported-surface and not-found responses as evidence with `ok: false`.
- Reuse evidence records when multiple rules require the same kind and target.
- Do not require checker agents to read child transcripts to prove findings.
