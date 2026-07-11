# Report Contract

All checker agents must output JSONL findings with this shape:

```json
{
  "rule_id": "implementation.missing-final-else",
  "family": "condition-loop",
  "severity": "medium",
  "component_path": "DEMO\\PID",
  "method_name": "calc",
  "diagram_name": null,
  "element_name": null,
  "signal_name": null,
  "importer_component_path": null,
  "exporter_component_path": null,
  "actual_mapping": null,
  "expected_mapping": null,
  "evidence": "IF/ELSE IF chain assigns output without terminal ELSE",
  "recommendation": "Add a final ELSE or explicit default assignment",
  "tool_evidence": [
    {
      "evidence_id": "code:DEMO\\PID:calc",
      "tool": "ascet_read",
      "action": "read_code",
      "target": "DEMO\\PID"
    }
  ],
  "confidence": "medium"
}
```

## Merge Rules

- Deduplicate by `rule_id`, `component_path`, `method_name`, `diagram_name`, `element_name`, and `signal_name`.
- For parameter mapping findings, include `importer_component_path` and `exporter_component_path` in the deduplication key when present.
- Keep the highest severity when duplicate findings disagree.
- Keep all distinct evidence IDs.
- Sort by severity, component path, rule ID, and target name.

## Parameter Mapping Findings

Parameter mapping findings must include, when applicable:

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

dT system-parameter exemptions are not findings. If emitted for audit transparency, put them in appendix or evidence metadata as suppressions with `suppression: "special.dt-parameter-exemption"`.

## Final Markdown Sections

1. Summary
2. Scope
3. Runtime Status
4. Findings by Severity
5. Parameter Mapping Findings
6. BDE Signal Mapping Findings
7. Evidence Gaps
8. Verification Notes
9. Appendix: Rule IDs and Evidence IDs
