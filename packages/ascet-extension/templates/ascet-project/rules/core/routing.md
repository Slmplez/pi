---
id: ascet.core.routing
layer: core
always_load: true
---

# ASCET Routing

## What This File Answers

This file answers the second runtime question: which tool, object rule, or task rule should load next?

## When To Load

Load after `core/workflow.md`.

## Tool Routing Rules

1. If the target is fuzzy, load `tools/explore.md`.
2. If the target is exact and the task is content inspection, load `tools/read.md`.
3. If the task is about callers, references, or usage sites, load `tools/reference.md`.
4. If the task compares two exact targets or two exact surfaces, load `tools/diff.md`.
5. If the task is a single approved mutation, load `tools/write.md`.
6. If the task is a repeated or synchronized mutation across multiple targets, load `tools/batch-write.md`.
7. If an executed write returned partial, failed, or unknown verification, load `core/verification.md` and refresh only the evidence needed for the next step.
8. If the task is folder-scale or project-scale checking, load `tools/autocheck.md`.

## Object Routing Rules

1. If the target is `Class` or `Module` and the surface is textual model code, load `objects/class-module-esdl.md`.
2. If the target is `Module` and the surface is graph or wiring structure, load `objects/module-bde.md`.
3. If the target is `StateMachine`, load `objects/state-machine.md`.
4. If the task mentions implementation type, formulas, memory location, memory segment, limits, or inherited implementation behavior, load `objects/implementation-data.md`.

## Task Routing Rules

| Task shape | Next runtime docs |
| --- | --- |
| Read-only explanation | `tools/read.md` or `tasks/readonly-analysis.md` |
| Fuzzy target request | `tools/explore.md` or `tasks/target-resolution.md` |
| Small local edit | `tools/write.md` and `tasks/small-safe-edit.md` |
| Signature change | `tools/write.md`, `tasks/signature-change.md`, and `core/verification.md` |
| Batch or sync change | `tools/batch-write.md`, `tasks/batch-change.md`, and `core/verification.md` |
| Post-write reporting | `core/verification.md` and `tasks/closeout.md` |

## Escalate When

- More than one object rule materially applies.
- The task crosses from ESDL into state-machine binding or implementation configuration.
- The correct write surface is still unclear after exact-surface reads.

## Related Docs

- `tools/index.md`
- `ascet-knowledge/help/ascet-agent-help-task-map.md`
