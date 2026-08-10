---
id: ascet.tool.explore
layer: tool
---

# Bounded Discovery

## What This File Answers

When should the agent use bounded `ascet_get` discovery?

## When To Load

Load when the target is fuzzy, partial, or folder-scoped.

## Use This When

- The user names a concept, partial path, or likely component name.
- The task begins with navigation, discovery, or target resolution.
- The agent must preview children or classify a target before deeper reads.

## Do Not Use This When

- The exact component or project path is already known.
- The task is really about reading method code, implementation, references, or diffs.
- A write has already been approved and the exact target is known.

## Common Follow-Up

- `ascet_read`
- `ascet_get` reference actions
- `ascet_diff`

## Evidence

- `src/ascetcli/contracts/families/get.json`
