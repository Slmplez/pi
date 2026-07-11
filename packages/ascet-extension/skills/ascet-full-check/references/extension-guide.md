# Extension Guide

## Add a Rule

1. Add the rule to `rule-index.yaml`.
2. Use existing evidence kinds when possible.
3. Add a tool mapping to `tool-map.md` only when the rule needs a new evidence kind.
4. Assign the rule to an existing checker agent unless the rule requires a distinct reasoning mode.
5. Ensure findings conform to `report-contract.md`.

## Add a Rule Family

Create a family when rules share evidence and reviewer behavior. Examples:

- `signal-variable`
- `condition-loop`
- `semantic`
- `reference`
- `bde-signal-mapping`

## Add an Agent

Add a package agent under `packages/ascet-extension/agents/`. Keep tools narrow. Prefer local evidence readers for checker agents. Give live ASCET tools only to discovery, evidence collection, and verification agents unless a specialized live checker needs them.

## Add an Evidence Kind

Add the evidence kind to `tool-map.md`, document its JSONL payload expectations in `evidence-contract.md`, and reference it from `rule-index.yaml`.

## Maintain SKILL.md

Do not add rule details or long examples to `SKILL.md`. Keep `SKILL.md` focused on orchestration and reference routing.
