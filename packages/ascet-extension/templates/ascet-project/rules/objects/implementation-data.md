---
id: ascet.object.implementation-data
layer: object
domains:
  - implementation
  - data
---

# Implementation And Data

## When To Load

Load when the task touches implementation type, formulas, limits, memory placement, target-dependent fields, or data configuration that depends on project context.

## Action Rules

1. Assume implementation and data fields may depend on project context until proven otherwise.
2. Do not interpret displayed values in isolation when `Use Implementation Type` or related inherited behavior is present.
3. Check whether the requested field depends on target, project defaults, or associated project configuration.
4. Keep formula and limitation behavior conservative unless the task explicitly requires a semantic change.
5. Verify changes under the intended project context, not only by the immediate field readback.
6. If the task mixes code edits with implementation tuning, treat it as a higher-risk workflow and verify both sides.

## Escalate When

- The active project or target context is unknown.
- The requested change may alter generated behavior rather than only metadata.
- A field appears editable in the UI but may actually inherit from project-level defaults.

## Evidence

- `ascet-agent-coding-best-practices.md`
- `ascet-knowledge/help/ascet-agent-signal-implementation-field-guide.md`
- `ascet-knowledge/help/ascet-agent-help-source-map.md`
