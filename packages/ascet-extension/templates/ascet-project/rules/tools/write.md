---
id: ascet.tool.write
layer: tool
---

# Guarded Write

## What This File Answers

When should the agent use `ascet_edit`?

## When To Load

Load when one exact mutation has been approved.

## Use This When

- The target is exact.
- The mutation shape is singular and focused.
- The agent can pick a specific write action instead of a repeated batch operation.

## Do Not Use This When

- The target is still fuzzy.
- The task is primarily exploratory or comparative.
- The task is a repeated multi-target sync better suited for explicitly enabled `ascet_batch_write`.

## Common Follow-Up

- `ascet_read`
- `ascet_diff`

## Evidence

- `src/ascetcli/contracts/families/write.json`
