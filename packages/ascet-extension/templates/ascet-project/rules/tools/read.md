---
id: ascet.tool.read
layer: tool
---

# Read Tool

## What This File Answers

When should the agent use `AscetReadTool`?

## When To Load

Load when the target is exact and the task needs direct content inspection.

## Use This When

- The task needs summary, snapshot, method code, implementation, block diagram, or state-machine-flow content.
- The agent must confirm the exact current surface before planning a change.
- A broader post-write structural re-check is required after `readback`.

## Block Diagram Reads

- For BDE or block diagram logic, call `ascet_read` with `action="read_block_diagram"`, `componentPath`, and `diagramName`.
- Treat the returned block diagram as an agent semantic graph for signal flow, dependencies, node relations, and rule checks.

## Do Not Use This When

- The target is still fuzzy.
- The main question is about references or dependency sites.
- The task is really an immediate post-write `readback`.

## Common Follow-Up

- `AscetReferenceTool`
- `AscetDiffTool`
- `AscetWriteTool`

## Evidence

- `src/ascetcli/contracts/families/read.json`
