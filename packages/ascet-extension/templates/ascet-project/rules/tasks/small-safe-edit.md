---
id: ascet.task.small-safe-edit
layer: task
task_types:
  - edit
  - patch
  - local-change
---

# Small Safe Edit

## What This File Answers

How should the agent execute one intentionally narrow mutation?

## When To Load

Load when the change should remain local and should not expand into restructuring.

## Decision Rules

1. Confirm the exact target and exact surface before editing.
2. Choose the narrowest specific write action.
3. Change only what is required for the request.
4. Execute through `ascet_edit` only after preflight and inspect its automatic verification.
5. Add one larger-surface read only when the next step or risk requires it.

## Escalate When

- The change expands into signature, binding, or project-context changes.
- The smallest safe write path is still unclear.
- Automatic verification reports a mismatch or collateral change outside the intended surface.

## Related Docs

- `../tools/write.md`
- `../core/verification.md`
