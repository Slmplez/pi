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
- Keep the highest severity when duplicate findings disagree.
- Keep all distinct evidence IDs.
- Sort by severity, component path, rule ID, and target name.

## Final Markdown Sections

1. Summary
2. Scope
3. Runtime Status
4. Findings by Severity
5. BDE Signal Mapping Findings
6. Evidence Gaps
7. Verification Notes
8. Appendix: Rule IDs and Evidence IDs
