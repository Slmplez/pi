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

1. Never treat a successful write call as sufficient proof.
2. Use `AscetVerifyTool` only for immediate `readback`.
3. Treat `readback` as confirmation of the edited surface, not as a full structural audit.
4. If broader confidence is still needed, use `AscetReadTool`, `AscetReferenceTool`, or `AscetDiffTool` on the exact larger surface that matters.
5. If signatures changed, verify dependent references, bindings, or generated-role assumptions.
6. If a state machine changed, verify both the edited code surface and the affected state or transition relation.
7. If implementation or data changed, verify under the intended project or target context, not only by displayed field text.
8. Report both what was verified and what remains unverified.

## Minimum Verification Matrix

| Change type | Required checks |
| --- | --- |
| Read-only | none beyond source consistency |
| Local text edit | `readback` plus one exact larger-surface read when needed |
| Signature change | `readback` plus references or diff check |
| State machine binding change | `readback` plus state or transition re-check |
| Implementation/data change | `readback` plus project-context-sensitive re-check |
| Batch change | representative `readback` plus exact larger-surface follow-up |

## Escalate When

- `readback` does not match the intended mutation.
- Exact larger-surface reads still show inconsistent structure or bindings.
- Validation depends on project context that is not available.
- The requested certainty level exceeds what current read surfaces can prove.

## Related Docs

- `tools/verify.md`
- `core/execution-modes.md`
- `tasks/closeout.md`
