---
id: ascet.tool.reference
layer: tool
---

# Reference Reads

## What This File Answers

When should the agent use `ascet_get` reference actions?

## When To Load

Load when the task depends on caller, usage, or dependency context.

## Use This When

- The agent needs to know who references a method, signal, action, or component.
- A signature or binding change may affect other surfaces.
- The task needs dependency-aware confidence before or after a mutation.

## Do Not Use This When

- The target is still fuzzy.
- The task is only a direct content read.
- The task only needs the automatic verification returned by `ascet_edit`.

## Common Follow-Up

- `ascet_read`
- `ascet_diff`
- `ascet_edit`

## Evidence

- `src/ascetcli/contracts/families/refs.json`
