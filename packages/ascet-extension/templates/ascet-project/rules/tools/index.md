---
id: ascet.tools.index
layer: tool
always_load: true
---

# ASCET Tool Index

## What This File Answers

This file helps the agent choose the next ASCET tool family with minimal context.

## When To Load

Load after `core/workflow.md` and `core/routing.md`.

## Tool Chooser

| Situation | Next doc |
| --- | --- |
| Target is fuzzy or only partially named | `explore.md` |
| Target is exact and content inspection is needed | `read.md` |
| Dependency, caller, or usage questions matter | `reference.md` |
| Two exact targets or surfaces must be compared | `diff.md` |
| One exact mutation must be applied | `write.md` |
| Many aligned mutations must be applied | `batch-write.md` |
| An executed write has returned | inspect `ascet_edit` automatic verification |
| Folder-scale or project-scale checking is requested | `autocheck.md` |

## Stop Rules

- If the next tool is already obvious, stop here.
- Do not load object docs until the target surface is known.
- Do not load vendor evidence until tool and task docs still leave ambiguity.
