---
id: ascet.task.signature-change
layer: task
task_types:
  - signature-change
  - rename
  - api-change
---

# Signature Change

## What This File Answers

How should the agent plan and verify a high-risk signature or externally referenced name change?

## When To Load

Load when the task changes method, process, trigger, action, condition, parameter list, return type, or any externally referenced symbol name.

## Decision Rules

1. Treat signature edits as high-risk even when the textual delta is small.
2. Confirm the current signature from read-side sources before writing.
3. Check references, bindings, or role semantics before the mutation.
4. Do not combine the signature change with unrelated cleanup.
5. Execute the approved change through `ascet_edit` and inspect its automatic verification.
6. Re-check the exact larger surfaces that consume the signature only when the next step requires them:
   - references
   - bindings
   - diff
   - summary reads

## Escalate When

- The change may create an unsupported overload-like shape.
- The symbol participates in state-machine bindings or project-level generation behavior.
- Available read surfaces do not show where the signature is consumed.

## Related Docs

- `../tools/reference.md`
- `../tools/diff.md`
- `../core/verification.md`
