---
name: ascet-full-check
description: Run an extensible ASCET full-check workflow for ASCET components, methods, diagrams, BDE signal mappings, parameter mappings, references, and verification. Use when the user asks for ASCET full check, full inspection, rule-based checking, BDE/signal mapping analysis, parameter mapping analysis, or a maintainable ASCET check report driven by rule-index.yaml.
---

# ASCET Full Check

Use this skill to run a maintainable ASCET checking workflow. Keep this file as the orchestration layer only. Load reference files only when needed.

## Required References

Read these before planning:

- `references/workflow.md` for run modes, ask-user-question policy, and dispatch rules.
- `references/rule-index.yaml` for registered rules and rule families.
- `references/tool-map.md` for ASCET evidence kinds and tool/action mapping.
- `references/evidence-contract.md` for run directory and evidence JSONL format.
- `references/report-contract.md` for finding and final report shape.

Read `references/parameter-mapping.md` when the requested rule range includes parameter mappings, imported/exported parameters, local parameter dependencies, or semantic parameter-name consistency.

Read `references/extension-guide.md` only when adding rules, evidence kinds, agents, or report fields.

## Workflow

1. Confirm the request is an ASCET check request.
2. If target, scope, rule family, verification depth, or output format is ambiguous, call `ask_user_question` before planning. If that tool is unavailable, ask one concise blocking question.
3. Run `ascet_status` before live ASCET work. Use `ascet_scheduler_status` when status is degraded, locked, slow, or unclear.
4. Create a run directory under `.pi/ascet-full-check/runs/<run-id>/`.
5. Write `check-request.json` with user parameters and any answers collected through `ask_user_question`.
6. Resolve scope and write `scope-manifest.json`.
7. Load `rule-index.yaml` and write `check-plan.json`.
8. Compute `check_item_count`. This is the number of objects to inspect, not only class count. It may count classes, methods, diagrams, BDE connections, signals, elements, reference groups, or rule-target pairs.
9. If `check_item_count < 5`, use inline mode in the current agent.
10. If `check_item_count >= 5`, use subagent mode unless the user explicitly asks to keep everything inline.
11. Before dispatching any subagent task that needs live ASCET evidence, preflight the selected agent profile. Confirm its `tools:` include every required `ascet_*` tool. If any required tool is missing, do not dispatch that task; choose an approved ASCET-aware agent or run inline in the current agent.
12. Collect evidence through the evidence kinds in `tool-map.md`.
13. Produce findings that conform to `report-contract.md`.
14. If live verification is enabled, verify high-severity or uncertain findings with exact `ascet_read` or `ascet_diff` evidence.
15. Write final Markdown and JSON reports under the run directory.

## Inline Mode

Use inline mode for small runs. Follow the same contracts and write the same files as subagent mode. Do not skip evidence files or report contracts just because the run is small.

## Subagent Mode

Use the package subagents when available:

- `ascet` may be used as a project-local fallback for live ASCET evidence tasks.
- `ascet-discovery` resolves scope and target inventory.
- `ascet-evidence` collects reusable ASCET evidence and avoids duplicate live calls.
- `ascet-rule-checker` checks implementation and signal-variable rules from evidence.
- `ascet-reference-checker` checks reference and dependency evidence.
- `ascet-semantic-checker` checks naming and semantic consistency rules.
- `ascet-parameter-mapping-checker` checks imported/exported business parameter mappings, local dependency state, and dT exemption boundaries from evidence.
- `ascet-bde-signal-checker` checks BDE diagram signal mapping rules.
- `ascet-verify-checker` verifies high-risk or uncertain findings.
- `ascet-report-merge` deduplicates and writes final reports.

Live ASCET evidence tasks may only be dispatched to `ascet`, `ascet-discovery`, `ascet-evidence`, or `ascet-verify-checker`. Do not dispatch live ASCET evidence collection to builtin `reviewer`, `worker`, `planner`, `researcher`, or other generic agents.

Preflight every live ASCET subagent dispatch:

1. Inspect the target agent profile before dispatch.
2. Compare the task's required tools with the profile's `tools:` list.
3. Dispatch only if every required `ascet_*` tool is present.
4. If the profile lacks a required ASCET tool, use an approved ASCET-aware profile or run the task inline.

Use canonical BDE reads as `ascet_read` action `read_block_diagram`. Never use old fine-grained block-diagram tool names.

Parallel ASCET evidence collection is allowed. The ASCET scheduler coordinates live ToolAPI execution, while the check plan owns evidence de-duplication, baseline consistency, and report traceability.

## Guardrails

- Do not use `ascet_edit` or `ascet_batch_write`.
- Do not modify the ASCET database.
- Parameter mapping checks are read-only. They may use `ascet_read` action `read_dependent_chain`, but must never use `ascet_edit.set_element_dependency`.
- Preserve exact ASCET paths, method names, diagram names, signal names, tool names, and error strings.
- Treat runtime truth as authoritative. If tool success contradicts returned data, investigate before reporting success.
- Keep new checks extensible: add rules to `rule-index.yaml`, tool mapping to `tool-map.md`, and complex logic to a focused subagent.
