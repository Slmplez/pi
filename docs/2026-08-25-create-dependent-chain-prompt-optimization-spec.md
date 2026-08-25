# Create Dependent Chain Prompt Optimization Specification

Date: 2026-08-25

## 1. Objective

Improve the first-call success rate of `ascet_edit.create_dependent_chain` by reducing the default model-facing Prompt to the minimum information required to produce a valid complete dependency-chain request.

The Prompt must emphasize positive request construction rather than negative compatibility constraints or internal execution details.

The target chain is:

```text
Provider Exported P_<Name>
    -> Consumer Imported P_<Name>
    -> Consumer Local Dependent C_<Name>
```

## 2. Design Principles

```text
Default Tool Prompt:
  Provide the smallest complete call-construction guide.

Capabilities / action details:
  Provide exact rules, limitAssignments selection, and examples on demand.

Schema and runtime:
  Reject unsupported modes, missing required fields, unknown fields,
  missing Project context, invalid Formula references, and conflicts.

Bridge:
  Perform the guarded mutation, rollback where required, and readback.
```

Do not use the default Prompt to describe:

- `ascetDefault` rejection;
- rollback or compensating transaction mechanics;
- editable-gate implementation details;
- historical compatibility behavior;
- exhaustive readback field lists;
- internal Bridge-only binding mapping fields.

Removing those statements from model-facing guidance must not relax schema or runtime validation.

## 3. Prompt Architecture

```text
Action Contract guidance.compact
    -> Action Catalog
    -> buildCompactToolPromptGuidelines("ascet_edit")
    -> ascet_edit default promptGuidelines
    -> AgentSession system prompt

Action Contract guidance.rules + guidance.fewShots
    -> Action Instruction Registry
    -> ascet_capabilities action details / search_actions

Skill + .ascet project rules
    -> Engineering routing and project onboarding guidance
    -> Must not duplicate the full action contract
```

`packages/ascet-extension/src/tools/actions/contracts/dependency.ts` is the single source of truth for the public action contract, detailed rules, and few-shot examples.

## 4. Default Compact Prompt

Replace the `create_dependent_chain` compact descriptor with the following text:

```text
Create one Provider Exported P_<Name> -> Consumer Imported P_<Name> -> Consumer Local Dependent C_<Name> Parameter chain. Provider and Local require explicit implementation with valueType, memoryLocation, formula, and limitAssignments; Imported is structural only. ident needs no projectPath; another formula needs the matching Provider or Consumer projectPath. Standard binding uses formula="x", formal="x"; apply verifies readback.
```

The default Prompt must contain only enough information to answer these first-call questions:

1. Which action creates the complete chain?
2. What are the Provider, Imported, and Local roles?
3. Which implementation fields are required for Provider and Local?
4. When is `projectPath` required?
5. What is the standard binding request shape?
6. How is a successful write verified?

## 5. Detailed Action Rules

The following rules are returned only through action details, such as `ascet_capabilities` action search/details. They replace the current verbose and partly negative dependency-chain Prompt rules.

```ts
rules: [
	"Use this action once for one complete Provider Exported P_<Name> -> Consumer Imported P_<Name> -> Consumer Local Dependent C_<Name> chain.",
	"Provider and Local each require implementation.mode=\"explicit\" with valueType, memoryLocation, formula, and limitAssignments.",
	"For a ranged discrete implementation, set limitAssignments=true. For real32 or real64, set limitAssignments=null.",
	"Imported contains only name, modelType, and optional unit. Provider and Imported names must match exactly.",
	"Use formula=\"ident\" without projectPath. Another Provider formula requires provider.projectPath; another Local formula requires consumer.projectPath; each Formula must exist in that Project.",
	"For the standard one-input binding, use binding.formula=\"x\", binding.formal=\"x\", and binding.variantPolicy=\"default\". Do not add a mapping field.",
	"Use intent=\"apply\". Missing compatible endpoints are created, exact endpoints are reused, conflicts are rejected, and success includes automatic readback.",
],
```

### 5.1 `limitAssignments` Rules

`limitAssignments` is mandatory for the explicit Provider and Local implementation request shape.

```text
Ranged discrete implementation:
  limitAssignments=true

real32 or real64 implementation:
  limitAssignments=null
```

The Prompt must not advise `false` for range-bearing Parameter writes. The Bridge rejects `false` when writing a physical or implementation range.

### 5.2 Formula and Project Context

```text
formula="ident":
  no projectPath is required

non-ident Provider formula:
  provider.projectPath is required

non-ident Local formula:
  consumer.projectPath is required

non-ident Formula:
  must exist in the specified Project
```

Do not instruct the model to infer a Project from a component path or folder layout.

### 5.3 Public Binding Shape

The public request contains:

```json
{
  "binding": {
    "formula": "x",
    "formal": "x",
    "variantPolicy": "default"
  }
}
```

The public `create_dependent_chain` schema does not accept `binding.mappings`. The Prompt must not refer to or demonstrate a mapping field. For the standard binding, the action binds `x` to `consumer.importedElement.name` internally.

## 6. Few-shot Strategy

### 6.1 Default Few-shot: Identity Formula

The first and default few-shot must use `formula="ident"` and omit both `provider.projectPath` and `consumer.projectPath`.

```json
{
  "action": "create_dependent_chain",
  "provider": {
    "componentPath": "FeatureA/Provider",
    "element": {
      "name": "P_Threshold",
      "modelType": "cont",
      "unit": "",
      "comment": "Threshold calibration",
      "calibration": true,
      "range": {
        "mode": "implementation",
        "min": 0,
        "max": 65535
      },
      "data": {
        "mode": "explicit",
        "value": 100
      },
      "implementation": {
        "mode": "explicit",
        "valueType": "uint16",
        "memoryLocation": "Default",
        "formula": "ident",
        "limitAssignments": true
      }
    }
  },
  "consumer": {
    "componentPath": "FeatureA/Consumer",
    "importedElement": {
      "name": "P_Threshold",
      "modelType": "cont",
      "unit": ""
    },
    "localElement": {
      "name": "C_Threshold",
      "modelType": "cont",
      "unit": "",
      "comment": "Threshold dependency",
      "calibration": false,
      "range": {
        "mode": "implementation",
        "min": 0,
        "max": 65535
      },
      "implementation": {
        "mode": "explicit",
        "valueType": "uint16",
        "memoryLocation": "Default",
        "formula": "ident",
        "limitAssignments": true
      }
    }
  },
  "binding": {
    "formula": "x",
    "formal": "x",
    "variantPolicy": "default"
  },
  "intent": "apply"
}
```

The default example establishes these successful-request conventions:

- Provider and Imported names match exactly;
- Local uses `C_<Name>`;
- Provider owns data/default metadata;
- Imported has no implementation;
- Local has no independent scalar data/default;
- identity Formula does not require a Project;
- standard binding uses `x` / `x`.

### 6.2 On-demand Few-shot: Custom Project Formula

The second few-shot is visible through detailed action instructions only. It must use Project and Formula placeholders, never a Formula name that may not exist in the current user database.

```json
{
  "action": "create_dependent_chain",
  "provider": {
    "componentPath": "FeatureA/Provider",
    "projectPath": "<Provider Project containing ProviderFormula>",
    "element": {
      "name": "P_Value",
      "modelType": "cont",
      "unit": "",
      "comment": "",
      "calibration": true,
      "range": {
        "mode": "implementation",
        "min": 0,
        "max": 65535
      },
      "data": {
        "mode": "explicit",
        "value": 100
      },
      "implementation": {
        "mode": "explicit",
        "valueType": "uint16",
        "memoryLocation": "Default",
        "formula": "<ProviderFormula>",
        "limitAssignments": true
      }
    }
  },
  "consumer": {
    "componentPath": "FeatureA/Consumer",
    "projectPath": "<Consumer Project containing LocalFormula>",
    "importedElement": {
      "name": "P_Value",
      "modelType": "cont",
      "unit": ""
    },
    "localElement": {
      "name": "C_Value",
      "modelType": "cont",
      "unit": "",
      "comment": "",
      "calibration": false,
      "range": {
        "mode": "implementation",
        "min": 0,
        "max": 65535
      },
      "implementation": {
        "mode": "explicit",
        "valueType": "uint16",
        "memoryLocation": "Default",
        "formula": "<LocalFormula>",
        "limitAssignments": true
      }
    }
  },
  "binding": {
    "formula": "x",
    "formal": "x",
    "variantPolicy": "default"
  },
  "intent": "apply"
}
```

Before using this path, the exact Project Formula must be validated with bounded live Project Formula evidence.

## 7. Skill and Project Rule Changes

### 7.1 Skill

Update these files:

```text
packages/ascet-extension/skills/ascet-engineering/SKILL.md
packages/ascet-extension/skills/ascet-engineering/references/dependency-advanced-path.md
packages/ascet-extension/skills/ascet-engineering/references/implementation-type-and-memory-layout.md
```

Keep engineering semantics:

```text
Provider owns calibration/data.
Imported is structural.
Local is dependent.
Use create_dependent_chain for the complete chain.
Do not manage the same chain with apply_element_spec.
```

Remove or shorten repeated public action-field rules and negative statements about unsupported modes. The detailed action contract remains the authority for request construction.

### 7.2 Project Rules

Update the live and template copies together:

```text
.ascet/rules/tools/pi-ascet-tools.md
packages/ascet-extension/templates/ascet-project/rules/tools/pi-ascet-tools.md
```

Replace the verbose dependency-chain implementation paragraph with the same compact construction guidance used by the action descriptor. Do not duplicate the detailed rules or examples.

## 8. Files to Modify

### Primary implementation

```text
packages/ascet-extension/src/tools/actions/contracts/dependency.ts
packages/ascet-extension/skills/ascet-engineering/SKILL.md
packages/ascet-extension/skills/ascet-engineering/references/dependency-advanced-path.md
packages/ascet-extension/skills/ascet-engineering/references/implementation-type-and-memory-layout.md
.ascet/rules/tools/pi-ascet-tools.md
packages/ascet-extension/templates/ascet-project/rules/tools/pi-ascet-tools.md
packages/ascet-extension/contracts/catalog-snapshot.json
```

### Tests

```text
packages/ascet-extension/src/tools/actions/catalog.test.ts
packages/ascet-extension/src/tools/prompt.test.ts
packages/ascet-extension/src/tools/edit/public-write-contract-docs.test.ts
packages/ascet-extension/src/ascet-engineering-skill.test.ts
packages/ascet-extension/src/tools/edit/schema.test.ts
```

### Do not modify for this Prompt-only task

```text
packages/ascet-extension/src/create-dependent-chain.ts
packages/ascet-extension/src/configure-parameter-dependency-chain.ts
ascetcli/src/AscetCopilot/AscetParameterDependencyChainExecute.cs
ascetcli/src/AscetCopilot/AscetElementSync.cs
```

The schema and runtime must keep their existing enforcement behavior.

## 9. Test Plan

### 9.1 Catalog and default Prompt

Assert that the default compact action descriptor includes:

```text
Provider / Imported / Local
explicit implementation
ident
projectPath
formula="x" and formal="x"
automatic readback
```

Assert that model-facing `create_dependent_chain` rules no longer include:

```text
ascetDefault is not supported for this action.
```

### 9.2 Detailed action rules

Assert that detailed rules include:

```text
limitAssignments=true for ranged discrete implementations
limitAssignments=null for real32/real64
Provider / Imported exact-name rule
Provider projectPath / Consumer projectPath split
no public mapping field
```

### 9.3 Few-shot validation

Assert that the identity few-shot:

```text
omits provider.projectPath and consumer.projectPath
uses implementation.formula="ident"
uses limitAssignments=true for uint16
uses binding.formula="x" and binding.formal="x"
contains no binding.mappings
```

Assert that the custom Formula few-shot:

```text
contains provider.projectPath and consumer.projectPath
uses distinct Provider and Local Formula placeholders
contains no binding.mappings
```

Validate both few-shots against the public TypeBox action schema.

### 9.4 Schema regression

Keep the existing schema test proving that the following remains invalid:

```json
{
  "implementation": {
    "mode": "ascetDefault"
  }
}
```

The Prompt change must not alter behavior.

### 9.5 Documentation synchronization

Ensure the Skill, live project rules, template project rules, action contract, and generated Catalog express the same compact contract and do not introduce a public mapping field.

## 10. Execution Order

1. Read all target Prompt, Skill, project-rule, and test files in full.
2. Update `guidance.compact`, `guidance.rules`, and `guidance.fewShots` in `dependency.ts`.
3. Update Skill and project-rule copies.
4. Update documentation and catalog tests.
5. Regenerate the Catalog snapshot if required.
6. Run focused tests.
7. Run repository quality checks.

## 11. Validation Commands

```powershell
npm run check:ascet-contract
npm run check:ascet-action-catalog
npm run check:ascet-bridge-tools

cd packages/ascet-extension
node --import tsx --test `
  src/tools/actions/catalog.test.ts `
  src/tools/prompt.test.ts `
  src/tools/edit/public-write-contract-docs.test.ts `
  src/ascet-engineering-skill.test.ts `
  src/tools/edit/schema.test.ts `
  src/create-dependent-chain.test.ts

cd ../..
npm run check
```

If `npm run check` remains blocked by unrelated unstaged root `package.json` dependency ranges, preserve the full output and report that blocker. Do not modify or revert unrelated worktree changes.

## 12. Acceptance Criteria

```text
[x] The default ascet_edit Prompt exposes create_dependent_chain as one compact construction guide.
[x] The default Prompt contains only the information required for a first complete call.
[x] Model-facing dependency-chain guidance does not use the ascetDefault rejection sentence.
[x] The detailed action rules explain limitAssignments=true/null correctly.
[x] The Prompt distinguishes implementation.formula from binding.formula.
[x] The Prompt does not describe or demonstrate a public binding.mappings field.
[x] The identity few-shot omits projectPath.
[x] The custom Formula few-shot uses explicit Provider and Consumer Project placeholders.
[x] Schema rejection of unsupported implementation modes remains unchanged.
[x] Skill, live project rules, template rules, action contract, and Catalog snapshot are synchronized.
[x] Focused tests pass.
[x] `npm run check` completes all preceding ASCET checks and Biome, then stops only at the unrelated root `package.json` exact-version gate; the remaining independent checks pass when run separately.
```