---
id: ascet.task.target-resolution
layer: task
task_types:
  - resolve
  - locate
  - navigate
---

# Target Resolution

## What This File Answers

How should the agent move from a fuzzy name to an exact ASCET target?

## When To Load

Load when the user provides a partial path, fuzzy component name, or folder-level hint instead of an exact target.

## Decision Rules

1. Start with one bounded `ascet_search` call using the closest native mode.
2. Use `ascet_get.tree` only when the remaining uncertainty is hierarchical.
3. Stop exploring once one exact target or one small candidate set is identified.
4. Hand the resolved target to exact `ascet_get`, `ascet_read`, or `ascet_diff`.
5. Do not plan a write until the target is exact.

## Escalate When

- Multiple plausible targets remain and the requested action is destructive.
- The user-supplied name maps to different object kinds with different semantics.
- The route from folder to exact component is still unclear after previewing children.

## Related Docs

- `../tools/explore.md`
- `readonly-analysis.md`
