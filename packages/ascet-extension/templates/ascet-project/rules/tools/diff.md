---
id: ascet.tool.diff
layer: tool
---

# Diff Tool

## What This File Answers

When should the agent use `AscetDiffTool`?

## When To Load

Load when both sides are exact and comparison drives the decision.

## Use This When

- The task compares two components, two methods, or two exact surfaces.
- The agent needs a focused review before applying a change.
- The task needs a broader post-write comparison beyond immediate `readback`.

## Do Not Use This When

- Either side is still fuzzy.
- The task is only direct reading.
- The task is immediate post-write `readback`.

## Common Follow-Up

- `AscetReadTool`
- `AscetWriteTool`
- `AscetVerifyTool`

## Evidence

- `src/ascetcli/contracts/families/diff.json`
