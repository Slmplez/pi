---
id: ascet.task.batch-change
layer: task
task_types:
  - batch
  - sync
  - multi-target-change
---

# Batch Change

## What This File Answers

How should the agent decide whether a repeated mutation belongs on the batch path?

## When To Load

Load when the task applies the same mutation shape to multiple exact targets.

## Decision Rules

1. Confirm that the targets are exact before batching.
2. Confirm that the mutation shape is aligned enough for one batch operation.
3. Prefer explicitly enabled `ascet_batch_write` only when it preserves the aligned mutation shape; otherwise use sequential `ascet_edit` actions.
4. Inspect the automatic verification returned by the executed write path.
5. Add larger-surface reads only where the next step or risk actually requires them.

## Escalate When

- Targets need materially different write actions.
- The batch action would hide target-specific risks.
- Post-write confirmation needs a custom per-target strategy.

## Related Docs

- `../tools/batch-write.md`
- `../core/verification.md`
