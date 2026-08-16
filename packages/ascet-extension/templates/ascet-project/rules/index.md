---
id: ascet.index
layer: entry
always_load: true
---

# ASCET Workflow Rules

This directory is the runtime-facing workflow layer for ASCET work.

Use it to answer one question first: what should the agent do next with the current target and risk level?

Use the curated knowledge docs only after the next tool or next workflow phase is still ambiguous.

## Default Loading Order

1. Load `core/workflow.md`.
2. Load `core/routing.md`.
3. Load `tools/index.md`.
4. Classify intent, target certainty, and change risk.
5. Load object and task rules only when the target surface is known.
6. Load `core/verification.md` only when an executed write has incomplete verification or a verification claim needs clarification.

## ASCET Workflow Spine

The default runtime spine is tool-first and phase-aware:

1. Explore when the target is fuzzy
2. Read when the target and surface are exact
3. Reference or diff when dependency or comparison context matters
4. Write through `ascet_edit` when the mutation is approved
5. Inspect the automatic verification returned by the executed write
6. Close out with scope, verification, and residual risk

Do not jump directly from user intent to a live write.

Do not load vendor evidence by default.

## Object Plugins

Load object-specific rules only after the target surface is known:

- `objects/class-module-esdl.md`
- `objects/module-bde.md`
- `objects/state-machine.md`
- `objects/implementation-data.md`

## Runtime Tool Index

When the next action is still unclear after `workflow` and `routing`, load:

- `tools/index.md`

It is the small, agent-facing chooser for:

- `ascet_get`
- `ascet_read`
- `ascet_diff`
- `ascet_edit`
- `ascet_read.read_dependent_chain` and `ascet_edit.create_dependent_chain`
- `ascet_batch_write` when explicitly enabled
- ASCET check and diagnostics surfaces

## Curated Knowledge

Load these only when workflow or tool docs still leave semantic ambiguity:

- `ascet-knowledge/index.md`
- `ascet-knowledge/help/index.md`
- `ascet-knowledge/help/ascet-agent-help-task-map.md`
- `ascet-knowledge/help/ascet-agent-help-source-map.md`
- `ascet-knowledge/help/ascet-agent-signal-implementation-field-guide.md`

Use vendor-extracted help only after the curated maps still leave ambiguity.

## Evidence Resolution Order

1. Runtime workflow docs in this directory
2. Tool and task docs in this directory
3. Curated knowledge maps under `ascet-knowledge/`
4. Vendor-extracted help under `ascet-knowledge/help/extracted/`
5. Historical design and implementation plans under `docs/plans/`
