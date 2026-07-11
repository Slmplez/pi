# ASCET create_component Expected Scaffold Plan

Date: 2026-07-11

## Goal

Expose two minimal facts after `ascet_write.create_component`:

1. ASCET is expected to auto-create which default items.
2. The expected default entry method name.

This plan intentionally avoids broader write-flow changes. The result must help the AI choose the likely first method to inspect or write, without claiming live-verified scaffold state.

## Live Verification Snapshot

Temporary components were created under `DEMO` and deleted after inspection with:

```text
create_component -> read_component_children --group all/methods/elements -> delete_component
```

Observed current ASCET behavior:

| Component creation request | Observed default items | Observed default entry method |
| --- | --- | --- |
| `kind=class`, `language=ESDL` | method `calc`, kind `AbstractMethod` | `calc` |
| `kind=module`, `language=ESDL` | method `process`, kind `Process` | `process` |
| `kind=statemachine` | method `trigger`, kind `Trigger`; variable `sm`, type `enum`, scope `local` | `trigger` |

Important UI note: ASCET's UI creation menu is layered as `Project`, `Module`, `Class`; state-machine creation is not represented as a simple peer in that menu screenshot. The CLI still accepts `kind=statemachine`, so the tool response should describe the CLI creation kind and expected scaffold, not over-explain UI menu hierarchy.

## Problem

Current `create_component` response only says creation succeeded, for example:

```json
{
  "summary": "Created ESDL class DEMO\\TestClass.",
  "payload": {
    "kind": "class",
    "languageKind": "ESDL",
    "created": true
  }
}
```

The AI does not know that an ESDL class is expected to start with `calc`, an ESDL module with `process`, or a state machine with `trigger` and `sm`.

## Key Decision

Use an expectation field, not a confirmation field:

```text
expectedDefaultScaffold
```

The field means:

- It is derived from known ASCET creation behavior for this component kind/language.
- It is not a post-create live readback.
- It must include `verified: false`.

Do not name it `defaultScaffold`, `generatedScaffold`, or `actualDefaultScaffold`, because those names imply confirmed live state.

## Target Payload

### ESDL Class

```json
{
  "expectedDefaultScaffold": {
    "verified": false,
    "generatedItems": [
      { "kind": "method", "name": "calc" }
    ],
    "defaultEntryMethod": "calc"
  }
}
```

### ESDL Module

```json
{
  "expectedDefaultScaffold": {
    "verified": false,
    "generatedItems": [
      { "kind": "method", "name": "process" }
    ],
    "defaultEntryMethod": "process"
  }
}
```

### State Machine

```json
{
  "expectedDefaultScaffold": {
    "verified": false,
    "generatedItems": [
      { "kind": "method", "name": "trigger" },
      { "kind": "variable", "name": "sm" }
    ],
    "defaultEntryMethod": "trigger"
  }
}
```

### Existing Component

If `created=false` or `alreadyExisted=true`, do not report expected scaffold:

```json
{
  "expectedDefaultScaffold": {
    "verified": false,
    "generatedItems": [],
    "defaultEntryMethod": ""
  }
}
```

Reason: an existing component may have had its default methods or variables deleted, renamed, or changed. Returning scaffold expectations for existing components would be misleading.

### Unsupported Or Unknown Cases

For BDE/C class or module creation, return an empty expectation until verified behavior is explicitly tested:

```json
{
  "expectedDefaultScaffold": {
    "verified": false,
    "generatedItems": [],
    "defaultEntryMethod": ""
  }
}
```

## Implementation Scope

### C# Helper

Add a small helper in the ASCET C# layer, for example:

```text
AscetComponentScaffoldMetadata
```

Responsibilities:

- Accept `AscetComponentCreateResult`.
- Return a dictionary with:
  - `verified`
  - `generatedItems`
  - `defaultEntryMethod`
- Return empty scaffold when `result == null`, `!result.Created`, or `result.AlreadyExisted`.
- Only emit non-empty expectations for:
  - `Class + ESDL`
  - `Module + ESDL`
  - `StateMachine`

Do not call ToolAPI from this helper.

### C# Payload Call Sites

Add `expectedDefaultScaffold` to all `create_component` payload builders:

1. `src/ascetcli/src/AscetCli/AscetCreateComponent.cs`
   - `FormatJsonOutput(AscetComponentCreateResult result)`

2. `src/ascetcli/src/AscetCopilot/Services/Write/ComponentWriteService.cs`
   - `BuildPayload(AscetComponentCreateResult result)`

3. `src/ascetcli/src/AscetCli/Host/AscetWriteHostDispatcher.cs`
   - `BuildCreateComponentPayload(AscetComponentCreateResult result)`

This keeps standalone CLI, unified `AscetCli.exe exec create_component`, batch/write executor payloads, and write-host payloads aligned.

### PI TypeScript Layer

Minimal changes only:

1. `packages/ascet-extension/src/create-component.ts`
   - Update parameter/result description text to mention that result may include `expectedDefaultScaffold`.
   - No custom post-processing required if JSON is passed through.

2. `packages/ascet-extension/src/tools/write/prompt.ts`
   - Add one concise guideline:

```text
After create_component, inspect expectedDefaultScaffold.defaultEntryMethod as an unverified hint for the likely initial method.
```

Do not add next-action automation.

### Contracts

Regenerate/update command contract metadata for `AscetCreateComponent` so capabilities describe:

```text
create_component result may include expectedDefaultScaffold with unverified expected default items and defaultEntryMethod.
```

## Tests

### C# Unit Tests

Add focused tests in `AscetCliJsonOutputTest.cs`:

1. ESDL class created result includes:
   - `expectedDefaultScaffold.verified == false`
   - one generated method `calc`
   - `defaultEntryMethod == "calc"`

2. ESDL module created result includes:
   - method `process`
   - `defaultEntryMethod == "process"`

3. State machine created result includes:
   - method `trigger`
   - variable `sm`
   - `defaultEntryMethod == "trigger"`

4. Existing component result does not report expected items:
   - `generatedItems` empty
   - `defaultEntryMethod == ""`

### PI Tests

Add or extend targeted tests in `packages/coding-agent/test/ascet-extension-write-tools.test.ts`:

- Mock `create_component` JSON containing `expectedDefaultScaffold`.
- Assert the tool returns/preserves the field through the canonical `ascet_write` path.

### Live Smoke

Focused live validation after build:

1. Create temporary ESDL class, module, and state machine.
2. Confirm `create_component` response includes expected field.
3. Read children to compare current actual behavior.
4. Delete temporary components.

The live smoke should not fail solely because actual child readback differs from expectation unless the feature is later upgraded to `actualDefaultScaffold`.

## Non-Goals

- Do not add `nextActions`.
- Do not change `create_method` validation or error messages.
- Do not add live readback to `create_component`.
- Do not infer or document BDE/C defaults.
- Do not change `set_class_method_code`, `set_module_code`, or `set_state_machine_code`.
- Do not expose UI menu hierarchy as tool logic.

## Rollout Steps

1. Add C# scaffold metadata helper.
2. Wire helper into the three create-component payload builders.
3. Add C# focused tests.
4. Update PI prompt/schema wording.
5. Update or regenerate ASCET contracts.
6. Rebuild ASCET C# core and sync bundled PI CLI artifacts if needed.
7. Run targeted PI tests and C# tests.
8. Run focused live smoke against temporary components.

## Acceptance Criteria

- New `create_component` result includes `expectedDefaultScaffold`.
- The field is non-empty only for newly created supported kinds.
- The field uses `verified: false`.
- Existing components do not display expected generated items.
- No additional live readback is introduced.
- Existing write behavior remains unchanged.
