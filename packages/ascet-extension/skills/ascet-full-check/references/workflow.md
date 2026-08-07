# Workflow

## Purpose

`ascet-full-check` is a rule-driven ASCET inspection workflow. It keeps command parsing, skill orchestration, evidence collection, rule checking, and report merging separate so future checks can be added without rewriting the main flow.

## Layers

1. `/ascet-full-check` command: parse arguments, ask missing questions, create the initial task prompt, and invoke the skill.
2. `ascet-full-check` skill: orchestrate status, scope, evidence, checking, verification, and reporting.
3. References and agents: hold rule definitions, tool mappings, evidence contracts, report contracts, and specialized checker behavior.

## Ask-User-Question Policy

Call `ask_user_question` when any of these are ambiguous:

- target: current database, folder, component, method, diagram, or BDE surface
- scope: quick, standard, or full
- rule range: all, one family, or specific rule IDs
- live verification: enabled or disabled
- output format: markdown, json, or both

Do not infer the live ASCET check scope from repository files alone.

## Dispatch Policy

Compute `check_item_count` after scope discovery and plan generation. This count is not class count. It can count classes, methods, diagrams, BDE connections, signals, elements, references, or rule-target pairs.

- If `check_item_count < 5`, run inline in the current agent.
- If `check_item_count >= 5`, dispatch subagents unless the user explicitly requests inline execution.

The main agent decides what counts as a check item based on target type and rule family. For parameter mapping checks, count importer/exporter component pairs, mapped elements, unmapped imported parameters, local dependency candidates, and evidence-gap records as check items.

### Live ASCET Dispatch Gate

Live ASCET evidence work is any task that must call `ascet_status`, `ascet_scheduler_status`, `ascet_get`, `ascet_read`, `ascet_diff`, or `ascet_verify`.

Only these agent profiles may receive live ASCET evidence work:

- `ascet`
- `ascet-discovery`
- `ascet-evidence`
- `ascet-verify-checker`

Before dispatching live ASCET evidence work, preflight the selected agent profile:

1. Inspect the selected profile's `tools:` allowlist.
2. List the `ascet_*` tools required by the planned task.
3. Dispatch only when every required `ascet_*` tool appears in `tools:`.
4. If any required tool is missing, do not dispatch. Choose one of the approved ASCET-aware profiles or run the task inline in the parent agent.

Never send live ASCET evidence collection to builtin `reviewer`, `worker`, `planner`, `researcher`, or any generic agent. Those agents may review plans or evidence files only when the task does not require live ASCET tools.

BDE structure evidence must use `ascet_get` action `bde_edges` for a resolved Component or diagram. Use `ascet_read.read_block_diagram` only when the rule requires exact deep diagram detail not returned by BDE edges.

An empty BDE edge result is not automatically a design defect. Store valid empty graph evidence as evidence, and let the specific rule decide whether missing diagram content matters.

Parameter mapping evidence starts with `ascet_get.tree`, `ascet_get.elements`, and `ascet_get.component_refs`. Use Pi `find`, `grep`, and `read` for stored observations; use `ascet_get.import_binding` only for an explicit provider pair.

Do not use `ascet_edit.set_element_dependency` in full-check.

## Standard Flow

1. Run `ascet_status`.
2. Run `ascet_scheduler_status` if runtime state is degraded, locked, stale, or slow.
3. Write `check-request.json`.
4. Resolve targets with `ascet_get.tree` and write `scope-manifest.json`.
5. Load `rule-index.yaml` and write `check-plan.json`.
6. Collect bounded Get observations into `evidence/*.jsonl`; use Pi `find`, `grep`, and `read` for stored NDJSON.
7. Make exact `ascet_read` calls only for evidence not present in Get observations.
8. Run inline checks or subagent checks.
9. Verify high-risk or uncertain findings when enabled.
10. Merge findings and write final reports.

## Parameter Mapping Flow

Use this flow when `parameter-mapping` or `semantic.parameter-name-consistency` is in scope:

1. Use `ascet_get.tree` to bound candidate consumer and provider components.
2. Collect `component_refs` for each consumer and derive likely provider relations.
3. Collect `elements` for the consumer and explicit provider candidates.
4. Use Pi `grep`/`read` to match Imported Parameter names to `scope=exported` candidates.
5. Call `import_binding` only when the consumer, Imported Element, and provider are explicit.
6. Record an evidence gap when no exact provider pair remains, the binding fails, or a required precise dependency read is unsupported.
7. Collect `component_code` only when exact code context is required.
8. Run the dT exemption policy before normal parameter mapping rules.
9. Emit findings to `findings/parameter-mapping.jsonl` and evidence gaps to the run evidence files.

## ASCET Scheduler Use

All live ASCET tools go through the ASCET extension scheduler. The scheduler is the ToolAPI safety boundary: issue live Get, Read, Diff, and Verify calls strictly one at a time. The full-check workflow is still responsible for de-duplicating observations, preserving a consistent evidence baseline, and keeping reports traceable.
