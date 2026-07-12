# ASCET Agent Signal And Implementation Field Guide

## What This File Answers

How should the agent interpret implementation-sensitive fields that may depend on project or target context?

## When To Use

Use this when the task touches implementation type, formulas, limits, memory location, memory segment, or inherited data behavior.

## Decision Rules

1. Treat implementation and data fields as context-sensitive until proven otherwise.
2. Do not assume a displayed value is independently owned by the current element when inherited behavior such as `Use Implementation Type` is present.
3. Confirm whether the field depends on:
   - project defaults
   - target configuration
   - generated behavior rather than only metadata
4. Verify implementation-sensitive changes under the intended project or target context, not only by immediate displayed text.

## Interpretation Rules

### `Use Implementation Type`

- Treat this as an inheritance flag, not as a harmless toggle.
- When it is active, most implementation-side inputs behave like inherited display values rather than fully local values.
- The inherited values come from the associated project or default project implementation type.
- If inheritance is active and later disabled, the inherited values can become the starting point of the element's individual implementation.
- Do not describe the displayed implementation value as safely editable in isolation until the project context is known.

### `Impl. Type`

- Interpret `Impl. Type` together with the active project context.
- Changing it may affect generated representation and downstream behavior, not just editor metadata.
- It must be able to represent the implementation-side range.

### `Formula`

- Treat formula changes as semantic, not cosmetic.
- Verify formula-sensitive changes under the intended project context.
- When the formula rules are target- or type-constrained, prefer vendor evidence over guesswork.
- Treat formula choice as two-layered:
  - the project defines available formulas
  - the element chooses from that project-defined set
- `ident` is the default safe starting point and is always expected to exist.

### `Min` / `Max`

- Treat these as model-side physical bounds.
- Do not change them casually during unrelated code edits.
- Re-check effective behavior when formula or implementation settings move with them.

### `Impl. Min` / `Impl. Max`

- Treat these as implementation-side storage bounds.
- Keep them inside the representable range of `Impl. Type`.
- Validate them together with `Formula` and the model-side `Min/Max`.

### `Limit Assignments`

- Treat this as a semantic guardrail.
- Keep the default conservative unless the task explicitly requires different saturation behavior and the risk is understood.

### `Limit To Maximum Bit Length`

- Use this only when the task explicitly needs fixed-point overflow handling behavior.
- Do not turn it into a default field to tweak during ordinary business changes.

### `Memory Location` / `Memory Segment`

- Treat both as target-dependent fields.
- Do not guess their safe values without the intended target or project context.
- Distinguish object-specific memory fields such as instance, reference, or distribution/search-result locations when they are present.

## State-Machine Adjacent Signal Rules

- If trigger arguments are used inside an action or condition, keep names and types aligned with the trigger definition.
- If a state-machine action gains a return value, treat the change as binding-sensitive and verify the affected state or transition relation.

## Common Field Matrix

| Field | Meaning | Rule |
| --- | --- | --- |
| `Type` | Model-side signal type | Pick this first; later field legality depends on it |
| `Use Implementation Type` | Inherit implementation settings | Requires project-context interpretation |
| `Impl. Type` | Implementation-side representation | Must contain `Impl. Min/Max` |
| `Min` / `Max` | Model-side physical range | Do not replace with storage bounds |
| `Impl. Min` / `Impl. Max` | Implementation-side range | Keep inside `Impl. Type` |
| `Formula` | Project-defined conversion selection | Must match model-type and impl-type rules |
| `Limit Assignments` | Assignment saturation behavior | Keep enabled by default |
| `Memory Location` / `Memory Segment` | Target-sensitive placement | Do not guess without target context |

## Formula Compatibility Quick Matrix

| Model / implementation combination | Safe formula choice |
| --- | --- |
| `cont` + `real32` / `real64` | `ident` only |
| `cont` + integer implementation type | `ident` or legal `linear` |
| `sdisc` / `udisc` / `limitInt` / `wrapInt` | `ident` only |
| `log` | formula usually not applicable |

## Formula Selection Flow

1. Confirm the model-side signal type.
2. Confirm whether the implementation type is floating-point or integer.
3. Decide whether the task really needs scaling or only identity behavior.
4. Reuse an existing project-level formula when possible.
5. If a non-`ident` formula is needed, define or select it at the project level first.
6. Then select it from the element implementation side.
7. Re-check consistency, ranges, and implementation fit.

## Signal-Type Templates

| Signal kind | Default safe interpretation |
| --- | --- |
| `log` | focus on `Type`, `Impl. Type`, and target-sensitive placement fields |
| `cont` with float implementation | use real implementation type and stay on `ident` |
| `cont` with integer implementation | validate `Min/Max`, `Impl. Min/Max`, `Impl. Type`, and formula together |
| `sdisc` / `udisc` | keep `ident` and validate discrete bounds |
| `limitInt` / `wrapInt` | keep `ident` and validate integer bounds carefully |
| explicit reference | use only the reference-specific memory fields that actually apply |
| distribution / search result | use only the distribution-specific memory fields that actually apply |

## Coupled Fields

Validate these together:

- `Type` + `Min/Max`
- `Impl. Type` + `Impl. Min/Max`
- `Formula` + compatibility + consistency
- `Limit Assignments` + bit-length behavior
- `Memory Location` + `Memory Segment` + target context

## Pre-Submit Checklist

- `Use Implementation Type` was interpreted in project context.
- `Min/Max` and `Impl. Min/Max` were not confused.
- `Impl. Type` still contains the implementation-side range.
- `Formula` matches the model-type and impl-type rules.
- `Limit Assignments` was not disabled casually.
- Target-sensitive memory fields were not guessed without target context.
- `readback` was followed by larger-surface checks when the risk required them.

## High-Risk Fields

- `Use Implementation Type`
- `Impl. Type`
- `Formula`
- `Min` / `Max`
- `Limit Assignments`
- `Memory Location`
- `Memory Segment`
- target-dependent floating-point or platform options

## Verification Hints

- Immediate `readback` confirms the edited field surface.
- Broader confirmation may still require:
  - project-context-sensitive re-read
  - exact larger-surface reads
  - binding-aware re-checks for state-machine-related changes

## Evidence Sources

- `extracted/ImplementationEditorEnglishUS/Index.md`
- `extracted/ElementEditorEnglishUS/Index.md`
- `extracted/DataEditorEnglishUS/Index.md`
- `extracted/StateMachineEditorEnglishUS/Index.md`
- `../../../../src/ascetcli/docs/ascet-knowledge/implementation-editor/Index.md`
