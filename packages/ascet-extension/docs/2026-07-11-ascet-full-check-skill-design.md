# ASCET Full Check Skill Design

## Objective

Build `ascet-full-check` as a maintainable, package-shipped skill inside `@ascet/pi-extension`. The skill supports rule-driven ASCET inspection without hard-coding all checks into the main prompt.

## Architecture

The design has three layers:

```text
/ascet-full-check command
  parse arguments, ask missing questions, create run prompt

ascet-full-check skill
  orchestrate status, scope, evidence, checks, verification, and report merge

references and agents
  define rules, tool mappings, evidence contracts, report contracts, and focused subagents
```

The current implementation includes the package skill, reference files, package subagent profiles, and the `/ascet-full-check` command entrypoint.

## Command Entrypoint Design

`/ascet-full-check` is registered by the ASCET extension. The command should not execute inspection logic itself. It should:

1. Parse lightweight arguments such as `target`, `scope`, `rules`, `verify`, and `output`.
2. If required information is missing, ask the current model to call `ask_user_question` through the generated prompt rather than guessing.
3. Create or suggest a stable run ID and run directory.
4. Send or inject a `/skill:ascet-full-check` task prompt containing the parsed arguments.

The command must avoid hard-coding rule steps. Rule definitions stay in `rule-index.yaml`; tool mappings stay in `tool-map.md`.

Example command prompt generated for the agent:

```text
Use /skill:ascet-full-check.
Request:
- target: DEMO\PID
- scope: standard
- rules: all
- verify: ask if ambiguous
- output: both
If any required field is ambiguous, call ask_user_question before planning.
```

## Package Layout

```text
packages/ascet-extension/
|-- skills/ascet-full-check/
|   |-- SKILL.md
|   `-- references/
|       |-- workflow.md
|       |-- tool-map.md
|       |-- rule-index.yaml
|       |-- evidence-contract.md
|       |-- report-contract.md
|       `-- extension-guide.md
`-- agents/
    |-- ascet-discovery.md
    |-- ascet-evidence.md
    |-- ascet-rule-checker.md
    |-- ascet-reference-checker.md
    |-- ascet-semantic-checker.md
    |-- ascet-bde-signal-checker.md
    |-- ascet-verify-checker.md
    `-- ascet-report-merge.md
```

`package.json` exposes the skill through `pi.skills` and the agents through `pi.subagents.agents`.

## Parameter Collection

The workflow must call `ask_user_question` when target, scope, rule range, verification depth, or output format is ambiguous. It must not infer live ASCET scope from repository files alone.

## Dispatch

The workflow computes `check_item_count` after scope discovery. This is not class count. It may count classes, methods, diagrams, BDE connections, signals, elements, references, or rule-target pairs.

- `check_item_count < 5`: run inline in the current agent.
- `check_item_count >= 5`: dispatch subagents unless the user asks for inline execution.

## Evidence and Scheduler Model

The ASCET scheduler remains the ToolAPI safety boundary. The full-check workflow adds run-level evidence caching so multiple checks do not repeatedly ask ASCET for the same target. Discovery, evidence, and verification agents may call live ASCET tools. Rule, semantic, reference, BDE, and report agents should primarily read evidence files.

## BDE Signal Mapping

The initial rule index includes `bde.signal-mapping-mismatch`. It detects likely BDE signal mapping errors such as mismatched line labels, source/target signal conflicts, direction/type conflicts, position-variable mapping errors, and block output mismatches.

## Definition of Done

The skill is considered structurally ready when:

- Pi can discover it from the ASCET extension package.
- `SKILL.md` stays concise and routes details to references.
- Rules live in `rule-index.yaml`.
- Tool mappings live in `tool-map.md`.
- Findings conform to `report-contract.md`.
- Package subagents are available for large checks.
