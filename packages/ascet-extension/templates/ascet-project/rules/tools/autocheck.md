---
id: ascet.tool.autocheck
layer: tool
---

# AutoCheck And Diagnostics

## What This File Answers

When should the agent use ASCET check and diagnostics surfaces?

## When To Load

Load when the task asks for folder-scale or project-scale checking instead of one exact mutation.

## Use This When

- The user wants to inspect many targets at once.
- The task is a batch quality check, audit, or rule-driven inspection.
- The agent needs capability or help discovery before choosing a specific check path.

## Do Not Use This When

- The task is only one exact target.
- The agent already knows the exact read, diff, or write path.

## Current Guidance

- Prefer capability and help discovery first:
  - `AscetCapabilityTool`
  - `AscetCliHelpTool`
- Use the approved `ascet-autocheck` design docs when the dedicated surface is not yet available.

## Evidence

- `docs/plans/2026-04-17-ascet-autocheck-design.md`
- `src/ascetcli/contracts/families/ops.json`
