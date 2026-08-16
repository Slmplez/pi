---
id: ascet.core.workflow
layer: core
always_load: true
---

# ASCET Core Workflow

## What This File Answers

This file answers the first runtime question: what phase is this task in, and which tool family should come next?

## When To Load

Load for every ASCET task before any object-specific or task-specific rule.

## Decision Rules

1. Classify intent first:
   - navigate
   - inspect
   - explain
   - compare
   - change
   - create
   - verify
   - check at scale
2. Classify target certainty next:
   - fuzzy name or text -> use `ascet_search`
   - hierarchy-only uncertainty -> use bounded `ascet_get.tree`
   - exact target -> continue without navigation
3. Classify the exact surface after the target is known:
   - summary
   - snapshot
   - method code
   - implementation
   - block diagram
   - state machine flow
   - references
   - project formulas
4. Start every non-trivial task on the read side, not on the write side.
5. When a write is required, choose the narrowest valid write path.
6. Prefer `ascet_edit` for one approved mutation; use `ascet_batch_write` only when explicitly enabled for aligned batches.
7. After a live write, inspect the automatic verification returned by `ascet_edit`.
8. If the next step needs broader confidence, re-check with `ascet_read`, `ascet_get`, or `ascet_diff` on the exact surface.
9. Close by recording scope, what was verified, and what still remains uncertain.

## Default Tool Chain

1. `ascet_search` when the target name, reference, message, method, element, or code text is not exact
2. `ascet_get.tree` only when hierarchy expansion is required
3. `ascet_read` when the target and surface are exact
4. Exact `ascet_get` actions or `ascet_diff` when structure, dependency, or comparison context matters
5. `ascet_edit` when the mutation is approved
6. Inspect `ascet_edit` automatic verification after the write
7. `ascet_read` or `ascet_diff` again only when broader structural confirmation is needed

## Phase Checklist

### 1. Intake

- Capture intent.
- Capture target certainty.
- Capture the highest plausible risk level.

### 2. Resolve And Read

- Resolve the exact target if needed.
- Read only the minimum exact surface required to plan safely.
- Add references or diff context only when needed.

### 3. Plan The Change

- Confirm the specific element, method, state, transition, or field exists.
- Select the narrowest write surface.
- Predict whether the returned automatic verification is enough for the next step.

### 4. Execute The Write

- Apply the smallest change that satisfies the request.
- Avoid opportunistic cleanup in the same mutation.

### 5. Inspect Automatic Verification

- Inspect the verification status returned by `ascet_edit`.
- Record whether broader follow-up reads are still required for the next step.
- Re-check only the larger surfaces that materially affect correctness.

### 6. Closeout

- Summarize what changed.
- Note what was verified.
- Surface remaining risk or context gaps.

## Escalate When

- The target is still ambiguous after `ascet_search` and any required bounded hierarchy expansion.
- The task spans multiple surfaces such as ESDL plus implementation/data.
- The request changes signatures, bindings, or generated behavior.
- You only have a fragment, not the surrounding ASCET structure.
- The requested certainty level is higher than automatic verification plus exact-surface reads can prove.

## Related Docs

- `core/routing.md`
- `core/execution-modes.md`
- `tools/index.md`
