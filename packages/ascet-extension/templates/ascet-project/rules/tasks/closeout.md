---
id: ascet.task.closeout
layer: task
task_types:
  - verify
  - report
  - closeout
---

# Closeout

## What This File Answers

What should the agent report after an ASCET task completes?

## When To Load

Load before claiming completion, especially after any live write.

## Decision Rules

1. State what changed.
2. State which surfaces were verified.
3. Distinguish Runtime automatic verification from broader follow-up reads.
4. State what remains unverified or requires fresh evidence.
5. Surface residual risk or missing context.

## Escalate When

- The requested certainty level is higher than the available read surfaces can prove.
- Automatic verification passed but larger-surface re-checks still disagree.
- Project context required for validation is missing.

## Related Docs

- `../core/verification.md`
