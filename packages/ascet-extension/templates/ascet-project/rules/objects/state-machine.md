---
id: ascet.object.state-machine
layer: object
object_types:
  - StateMachine
---

# State Machine

## When To Load

Load when the target is a `StateMachine` or when the task mentions `trigger`, `condition`, `action`, `state`, `transition`, or trigger arguments.

## Action Rules

1. Distinguish `trigger`, `condition`, and `action` before planning the edit.
2. Confirm whether the change affects state logic, transition logic, or binding semantics.
3. Treat action signatures as binding-sensitive. A return value change can invalidate normal action bindings.
4. When trigger arguments are involved, align parameter names and types across the trigger and the referenced action or condition.
5. Prefer stable diagram readability. Do not inject long code into places where the graph becomes unreadable unless the task explicitly demands it.
6. Verify state machine edits at both the edited code surface and the state/transition relation level.

## Escalate When

- The task mixes trigger argument changes with action or condition refactors.
- An action is being repurposed as a helper with a return value.
- The request could affect code generation or project-level optimization behavior.

## Evidence

- `ascet-agent-coding-best-practices.md`
- `ascet-knowledge/help/ascet-agent-help-task-map.md`
- `ascet-knowledge/help/ascet-agent-help-source-map.md`
