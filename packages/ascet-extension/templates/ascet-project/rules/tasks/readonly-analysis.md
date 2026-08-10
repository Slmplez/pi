---
id: ascet.task.readonly-analysis
layer: task
task_types:
  - analyze
  - explain
  - inspect
---

# Read-Only Analysis

## What This File Answers

How should the agent stay on the read path without drifting into write intent?

## When To Load

Load when the user wants explanation, diagnosis, or evidence gathering without a mutation.

## Decision Rules

1. Resolve the exact target first if needed.
2. Prefer `ascet_read` once the surface is exact.
3. Add `ascet_get` reference actions only when dependency context matters.
4. Add `ascet_diff` only when two exact targets or surfaces must be compared.
5. End with findings, next reads, or risks rather than implicit write intent.

## Escalate When

- The task silently depends on a mutation to answer it.
- Available read surfaces contradict each other.
- The task is really a change request disguised as analysis.

## Related Docs

- `target-resolution.md`
- `../tools/read.md`
- `../tools/reference.md`
