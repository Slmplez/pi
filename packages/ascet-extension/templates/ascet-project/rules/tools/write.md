---
id: ascet.tool.write
layer: tool
---

# Write Tool

## What This File Answers

When should the agent use `AscetWriteTool`?

## When To Load

Load when one exact mutation has been approved.

## Use This When

- The target is exact.
- The mutation shape is singular and focused.
- The agent can pick a specific write action instead of a repeated batch operation.

## Do Not Use This When

- The target is still fuzzy.
- The task is primarily exploratory or comparative.
- The task is a repeated multi-target sync better suited for `AscetBatchWriteTool`.

## Common Follow-Up

- `AscetVerifyTool`
- `AscetReadTool`
- `AscetDiffTool`

## Evidence

- `src/ascetcli/contracts/families/write.json`
