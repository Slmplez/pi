---
id: ascet.tool.read
layer: tool
---

# Exact Read

## What This File Answers

When should the agent use `ascet_read`?

## When To Load

Load when the target is exact and the task needs direct content inspection.

## Use This When

- The task needs summary, snapshot, method code, implementation, block diagram, or state-machine-flow content.
- The agent must confirm the exact current surface before planning a change.
- A broader structural read is required after an executed write.

## Block Diagram Reads

- For BDE or block diagram logic, call `ascet_read` with `action="read_block_diagram"`, `componentPath`, and `diagramName`.
- Treat the returned block diagram as an agent semantic graph for signal flow, dependencies, node relations, and rule checks.

## Do Not Use This When

- The target is still fuzzy.
- The main question is about references or dependency sites.
- The task only needs the automatic verification returned by `ascet_edit`.

## Common Follow-Up

- `ascet_get` reference actions
- `ascet_diff`
- `ascet_edit`

## Evidence

- `src/ascetcli/contracts/families/read.json`
