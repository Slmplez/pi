---
id: ascet.tool.verify
layer: tool
---

# Verify Tool

## What This File Answers

When should the agent use `AscetVerifyTool`?

## When To Load

Load only after a live write when immediate `readback` is needed.

## Use This When

- A live write has just completed.
- The agent needs structured confirmation of what ASCET now contains on the edited surface.

## Do Not Use This When

- The task is general summary browsing.
- The task is broader structural comparison.
- The task is pre-write analysis.

## Common Follow-Up

- `AscetReadTool`
- `AscetDiffTool`
- `tasks/closeout.md`

## Evidence

- `src/ascetcli/contracts/families/verify.json`
- `core/verification.md`
