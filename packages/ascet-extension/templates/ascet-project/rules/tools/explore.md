---
id: ascet.tool.explore
layer: tool
---

# Bounded Discovery

## What This File Answers

When should the agent use native `ascet_search` or bounded `ascet_get.tree`?

## When To Load

Load when the target is fuzzy, partial, or folder-scoped.

## Use This When

- The user names a concept, partial path, or likely component name.
- The task begins with name, reference, message, method, element, or code-text discovery.
- The agent must preview hierarchy children or classify a target before deeper reads.

## Do Not Use This When

- The exact component or project path is already known.
- The task is really about reading method code, implementation, references, or diffs.
- A write has already been approved and the exact target is known.

## Tool Choice

- Use `ascet_search` for name, reference, message, method, element, or code-text discovery.
- Use `ascet_get.tree` only for bounded hierarchy expansion.
- After resolution, use exact `ascet_get`, `ascet_read`, or `ascet_diff`.

## Evidence

- `src/ascetcli/contracts/families/get.json`
