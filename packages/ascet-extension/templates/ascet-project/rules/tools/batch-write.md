---
id: ascet.tool.batch-write
layer: tool
---

# Batch Write

## What This File Answers

When should the agent use explicitly enabled `ascet_batch_write`?

## When To Load

Load when the task applies the same mutation shape across multiple exact targets.

## Use This When

- Two or more aligned mutations share the same operation shape.
- The task is sync-oriented or bulk-oriented.
- The performance and consistency benefits of batch execution matter.

## Do Not Use This When

- The task is only one mutation.
- Each target needs different write semantics.
- The target set is still fuzzy.

## Common Follow-Up

- `ascet_read`
- `ascet_diff`

## Evidence

- `src/ascetcli/contracts/families/write.json`
