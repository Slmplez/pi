---
id: ascet.core.verification
layer: core
always_load: false
---

# ASCET Verification

## What This File Answers

This file answers what "verified" means after a live ASCET mutation.

## When To Load

Load before a live write is executed and before claiming completion after a live write.

## Action Rules

1. `ascet_edit` performs action-specific verification inside Runtime for every executed mutation.
2. A successful executed `ascet_edit` result completes the write; do not call a separate verification Tool.
3. Treat returned verification as confirmation of the edited action, not as a substitute for evidence needed by a different next step.
4. If the next engineering step needs broader confidence, use `ascet_read`, `ascet_get`, or `ascet_diff` on the exact larger surface that matters.
5. If signatures changed, verify dependent references, bindings, or generated-role assumptions.
6. If a state machine changed, verify both the edited code surface and the affected state or transition relation.
7. If implementation or data changed, verify under the intended project or target context, not only by displayed field text.
8. Report both what was verified and what remains unverified.

## Minimum Verification Matrix

| Change type | Required checks |
| --- | --- |
| Read-only | none beyond source consistency |
| Local text edit | automatic action-specific verification; read again only if the next step needs it |
| Signature change | automatic verification plus references or diff when the next step needs them |
| State machine binding change | automatic verification plus state or transition read when the next step needs them |
| Implementation/data change | automatic verification plus project-context-sensitive read when required |
| Batch change | per-action verification in the approved write path; inspect exact follow-up evidence only when required |

## Escalate When

- automatic verification fails or is missing.
- Exact larger-surface reads still show inconsistent structure or bindings.
- Validation depends on project context that is not available.
- The requested certainty level exceeds what the returned verification and exact-surface reads can prove.

## Related Docs

- `core/execution-modes.md`
- `tasks/closeout.md`
