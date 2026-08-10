# ASCET Agent Coding Best Practices

## What This File Answers

This file gives the high-level guardrails for coding agents working on ASCET tasks with the current ASCET tool surface.

It is not the first file to load for every task. Use it as the compact "global rules of engagement" document after the runtime workflow has already identified the likely path.

## Current Tool Model

The current ASCET tool model is:

1. `ascet_get` for bounded discovery and references
2. `ascet_read` for exact-surface inspection
3. `ascet_diff` for exact-target comparison
4. `ascet_edit` for guarded mutations and Runtime automatic verification
5. `configure_parameter_dependency_chain` for explicit dependency-chain plans and commits
6. `ascet_batch_write` only when the explicit batch feature is enabled

Do not collapse all of these back into a generic "read, write, verify everything everywhere" mental model.

## Golden Rules

1. Resolve fuzzy targets before deep reads or writes.
2. Read the minimum exact surface needed to plan safely.
3. Use references or diff only when the task actually needs dependency or comparison context.
4. Choose the narrowest write path that satisfies the request.
5. Prefer batch writes only when multiple targets share the same mutation shape.
6. Inspect the verification returned by an executed `ascet_edit`; do not call a separate verification Tool.
7. Use broader reads or diffs only when the next engineering step or an explicit request requires them.
8. Do not assume all reads are serialized; the routed command contract determines whether the read is pooled or legacy one-shot.
9. Do not assume any write is concurrency-safe; individual writes remain serialized.
10. Report what was verified and what remains unverified.

## Tool Choice Heuristics

### Use `ascet_get` When

- the user names a concept, folder, or partial path
- the target kind is uncertain
- the agent needs to preview children before deciding what to read next

### Use `ascet_read` When

- the target is exact
- the task needs summary, snapshot, code, implementation, block diagram, or state-machine-flow content
- the agent needs exact current structure before a mutation
- for BDE/block diagram analysis, `read_block_diagram` returns the default semantic graph for signal flow, dependencies, node relations, operations, and rule checks

### Use `ascet_get` reference actions when

- the task asks who uses a symbol or binding
- a signature or binding change may affect other targets

### Use `ascet_diff` When

- both sides are exact
- the task is fundamentally about comparison
- a broader post-write structural comparison is still needed

### Use `ascet_edit` When

- one exact mutation is approved
- the change shape is singular and focused

### Use `ascet_batch_write` When

- two or more exact targets share the same mutation shape
- the task is sync-oriented or bulk-oriented

### After an executed write

- inspect the `verification` result returned by `ascet_edit`
- accept a passed verification as completion of that write
- read again only for the next engineering step, failure diagnosis, or an explicit request

## Execution And Concurrency Rules

### Reads

- Some reads are `pooled_read` and safe to schedule concurrently through the host-backed read path.
- Some reads remain `legacy_read` one-shot operations.
- The routed command contract, not prose memory, decides which mode applies.

### Writes

- Individual writes remain serialized.
- Batch writes are first-class, but still represent a write path and still require confirmation.
- Do not mix unrelated cleanup into the same live mutation.

### Verification

- Runtime performs action-specific readback inside every executed `ascet_edit` mutation.
- A passed result completes the write; it is not a second model Tool step.
- When signatures, bindings, state-machine semantics, or implementation/data context are involved, add an exact larger-surface read only when the next step requires it.

## Object-Specific Guardrails

### Class And Module ESDL

- Method and process names must remain unique.
- Do not fake overloads by reusing names with different parameters.
- Do not patch missing declarations by dropping model elements into body text.
- Keep changes local and structure-aware.

### Module BDE

- Treat BDE as structured model state, not free-form text.
- Use `read_block_diagram` as the block-level semantic graph source for agent analysis.
- Do not force a graph edit down a text-edit path just because text is easier to reach.

### State Machine

- Distinguish roles before planning:
  - `trigger` = public method with no return value
  - `condition` = private method returning `logical`
  - `action` = private method, default no arguments and no return value
- Treat action signatures as binding-sensitive.
- A return value on an existing action can invalidate normal state or transition `<action>` bindings.
- If an action is already bound and later gains a return value, code generation can emit warnings.
- Prefer `inputs/outputs` for stable state-machine I/O.
- Use `trigger arguments` only when the task explicitly needs the tighter RAM profile and can tolerate stricter synchronization rules.
- Keep trigger arguments aligned across trigger and referenced action or condition.
- If trigger arguments are used in a separate `ActionCondition` diagram, keep parameter names and types aligned with the trigger side.
- Prefer stable diagram readability; do not stuff long code into state or transition labels unless the task explicitly demands it.
- Verify state or transition relations after relevant edits.

### Implementation And Data

- Assume project or target context matters until proven otherwise.
- Treat inherited behavior such as `Use Implementation Type` carefully.
- Do not interpret displayed values in isolation when `Use Implementation Type` or other inherited behavior is active.
- If `Use Implementation Type` is toggled off after inheritance was active, the inherited values may become the starting point of a local individual implementation.
- Treat `Impl. Type`, `Formula`, `Min`, `Max`, `Impl. Min`, `Impl. Max`, and `Limit Assignments` as semantic settings, not cosmetic metadata.
- `Min/Max` are model-side physical bounds; `Impl. Min/Max` are implementation-side storage bounds and must fit inside `Impl. Type`.
- For `cont + real32/real64`, code generation supports `ident` only.
- For `cont` with an integer implementation type, use `ident` or a legal `linear` formula.
- For `sdisc`, `udisc`, `limitInt`, and `wrapInt`, stay on `ident`.
- `Formula` is project-defined first and element-selected second; do not treat it as ad hoc per-element free text.
- Keep `Limit Assignments` enabled by default unless the task explicitly accepts out-of-range writes.
- `Automatic` and `Compiler` inline options are not appropriate for process-level usage.
- Treat `Memory Location` and `Memory Segment` as target-dependent fields.
- Treat `Use FPU` and similar target-sensitive switches the same way.
- Verify implementation-sensitive changes under the intended project context.

## High-Density Domain Reminders

### State-Machine Binding Rules

- `trigger`, `condition`, and `action` are not interchangeable helper categories.
- Changing an action signature is higher risk than a local body edit because bindings may no longer be valid.
- Adding a return value to an existing action is not a harmless refactor; it can change whether the action is a valid binding target.
- `inputs/outputs` are the default choice for stable state-machine I/O; `trigger arguments` are the stricter RAM-saving path.
- If a task mixes trigger arguments with action or condition refactors, verify both the code surface and the state or transition relation after the change.

### Signal And Implementation Rules

- `Use Implementation Type` usually means the current field view is not fully self-owned by the current element.
- `Use Implementation Type` values are only safely interpretable in project context, not from one displayed field snapshot alone.
- `Impl. Type`, `Formula`, `Min`, `Max`, `Impl. Min/Max`, and `Limit Assignments` often change generated behavior, not just displayed configuration.
- `Formula` selection is constrained by the model type and implementation type combination.
- `Formula` is selected from the associated project's defined formulas; non-`ident` formulas are not invented ad hoc on the element.
- `Limit Assignments` should stay on by default.
- `Memory Location` and `Memory Segment` are target-sensitive and should not be changed casually without the intended target or project context.
- If the task touches implementation or data fields and code in the same change, treat it as a higher-risk mixed-surface workflow.

## Task-Shape Routing Reminders

- Fuzzy target -> bounded `ascet_get.tree` first.
- Exact content inspection -> `ascet_read`.
- Signature or binding impact -> use `ascet_get` references or `ascet_diff` when needed.
- One focused mutation -> `ascet_edit`.
- Repeated aligned mutations -> explicitly enabled `ascet_batch_write`.
- Post-write confirmation -> inspect `ascet_edit` automatic verification.
- Implementation or data tuning -> always pair the runtime tool path with project-context-aware field interpretation.

## Anti-Patterns

Do not:

- jump from a fuzzy request directly to a write
- add a separate verification Tool after a successful `ascet_edit`
- assume every live read must be globally serialized
- assume every read can be pooled
- make one large mutation when a narrow write action exists
- batch unrelated changes just because multiple targets are involved
- treat implementation or data fields as context-free values
- add a return value to an existing state-machine action without checking binding implications
- switch from `inputs/outputs` to `trigger arguments` casually when the task is not actually RAM-driven
- change inherited implementation settings as though they were ordinary local scalar values
- change `Min/Max`, `Impl. Min/Max`, or `Formula` in isolation without checking the coupled fields
- claim completion when automatic verification is failed, missing, or unknown

## Escalate When

- the target is still ambiguous after exploration
- more than one object rule materially applies
- the task spans ESDL, state-machine binding, and implementation behavior together
- the requested certainty level exceeds what automatic verification and exact-surface reads can prove

## Recommended Companion Docs

- `index.md`
- `core/workflow.md`
- `core/routing.md`
- `core/verification.md`
- `core/execution-modes.md`
- `tools/index.md`
- `ascet-knowledge/help/index.md`
