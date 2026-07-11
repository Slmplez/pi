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

The main agent decides what counts as a check item based on target type and rule family.

### Live ASCET Dispatch Gate

Live ASCET evidence work is any task that must call `ascet_status`, `ascet_scheduler_status`, `ascet_explore`, `ascet_search`, `ascet_read`, `ascet_reference`, `ascet_diff`, or `ascet_verify`.

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

BDE and block diagram evidence must use the canonical tool call `ascet_read` with action `read_block_diagram`. Do not use old fine-grained block-diagram tool names.

## Standard Flow

1. Run `ascet_status`.
2. Run `ascet_scheduler_status` if runtime state is degraded, locked, stale, or slow.
3. Write `check-request.json`.
4. Resolve targets and write `scope-manifest.json`.
5. Load `rule-index.yaml` and write `check-plan.json`.
6. Collect evidence into `evidence/*.jsonl`.
7. Run inline checks or subagent checks.
8. Verify high-risk or uncertain findings when enabled.
9. Merge findings and write final reports.

## ASCET Scheduler Use

All live ASCET tools go through the ASCET extension scheduler. The scheduler is the ToolAPI safety boundary. The full-check workflow is still responsible for de-duplicating evidence requests, preserving a consistent evidence baseline, and keeping reports traceable.
