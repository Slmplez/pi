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

1. Start with bounded `ascet_get.tree`.
2. Stop exploring once one exact target or one small candidate set is identified.
3. Hand the resolved target to `ascet_read`, `ascet_get` reference actions, or `ascet_diff` rather than staying in discovery mode.
4. Do not plan a write until the target is exact.

## Escalate When

- Multiple plausible targets remain and the requested action is destructive.
- The user-supplied name maps to different object kinds with different semantics.
- The route from folder to exact component is still unclear after previewing children.

## Related Docs

- `../tools/explore.md`
- `readonly-analysis.md`
