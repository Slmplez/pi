---
id: ascet.core.execution-modes
layer: core
always_load: false
---

# ASCET Execution Modes

## What This File Answers

This file explains the execution modes that matter for runtime planning.

## When To Load

Load when concurrency, verification cost, or write safety materially affects the next action.

## Execution Modes

### `pooled_read`

- Used by host-backed read paths that are safe to schedule concurrently.
- Best for repeated exact-surface reads once the target is already known.
- Do not assume every read command qualifies.

### `legacy_read`

- One-shot read execution without pooled host support.
- Safe for exact reads, but not the high-throughput path.
- Use when the routed command contract still says `hostEligible=false`.

### `serial_write`

- One live mutation at a time.
- Required for individual write operations.
- Executed `ascet_edit` writes always request Runtime action-specific verification.

### `batch_write`

- Multiple mutations in one operation shape.
- Prefer when 2 or more similar changes are being applied with the same structure.
- Still requires post-write confirmation.

### `automatic_verification`

- Action-specific readback performed inside Runtime after an executed `ascet_edit` mutation.
- A passed result completes the write; it is not a separate model Tool call.
- Follow-up reads are for the next engineering step, failure diagnosis, or an explicit user request.

## Planning Rules

1. Prefer exact-surface reads over broad reads.
2. Prefer `pooled_read` only when the routed contract actually supports it.
3. Never treat a write as concurrent-safe because nearby reads are.
4. Use `batch_write` only when the task shape is actually repeated and aligned.
5. Inspect the executed `ascet_edit` verification result, then add larger-surface reads only when the next step or risk requires them.

## Related Docs

- `core/workflow.md`
- `core/verification.md`
- `tools/write.md`
- `tools/batch-write.md`
