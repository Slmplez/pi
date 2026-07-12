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
   - fuzzy target -> use `AscetExploreTool`
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
6. Prefer `AscetBatchWriteTool` when the task is a repeated multi-target mutation with the same shape.
7. After a live write, use `AscetVerifyTool` only for immediate `readback`.
8. If broader confidence is still needed after `readback`, re-check with `AscetReadTool`, `AscetReferenceTool`, or `AscetDiffTool` on the exact surface.
9. Close by recording scope, what was verified, and what still remains uncertain.

## Default Tool Chain

1. `AscetExploreTool` when the target is not exact
2. `AscetReadTool` when the target and surface are exact
3. `AscetReferenceTool` or `AscetDiffTool` when dependency or comparison context matters
4. `AscetWriteTool` or `AscetBatchWriteTool` when the mutation is approved
5. `AscetVerifyTool.readback` immediately after the write
6. `AscetReadTool` or `AscetDiffTool` again only when broader structural confirmation is needed

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
- Predict whether follow-up `readback` alone is enough.

### 4. Execute The Write

- Apply the smallest change that satisfies the request.
- Avoid opportunistic cleanup in the same mutation.

### 5. Verify By Readback

- Run immediate `readback`.
- Record whether broader follow-up reads are still required.
- Re-check only the larger surfaces that materially affect correctness.

### 6. Closeout

- Summarize what changed.
- Note what was verified.
- Surface remaining risk or context gaps.

## Escalate When

- The target is still ambiguous after `AscetExploreTool`.
- The task spans multiple surfaces such as ESDL plus implementation/data.
- The request changes signatures, bindings, or generated behavior.
- You only have a fragment, not the surrounding ASCET structure.
- The requested certainty level is higher than `readback` plus exact-surface reads can prove.

## Related Docs

- `core/routing.md`
- `core/execution-modes.md`
- `tools/index.md`
