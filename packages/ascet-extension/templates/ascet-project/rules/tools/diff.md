---
id: ascet.tool.diff
layer: tool
---

# Diff

## What This File Answers

When should the agent use `ascet_diff`?

## When To Load

Load when both sides are exact and comparison drives the decision.

## Use This When

- The task compares two components, two methods, or two exact surfaces.
- The agent needs a focused review before applying a change.
- The task needs a broader post-write comparison beyond the automatic verification returned by `ascet_edit`.

## Do Not Use This When

- Either side is still fuzzy.
- The task is only direct reading.
- The task only needs the automatic verification returned by `ascet_edit`.

## Common Follow-Up

- `ascet_read`
- `ascet_edit`

## Evidence

- `src/ascetcli/contracts/families/diff.json`
