# ASCET Permission Modes and Single-Call Guarded Write Development Plan

Date: 2026-08-12

Status: Complete — verified August 15, 2026

Scope:

- `packages/coding-agent`
- `packages/ascet-extension`
- `ascetcli`
- generated ASCET CLI contracts and bundled Bridge assets

## 1. Objective

Replace the current two-call ASCET write flow with one guarded public `ascet_edit` call. The same call must perform authoritative preflight, hard safety gates, permission evaluation, optional approval, post-approval revalidation, optional editable-state acquisition, mutation, and mandatory readback.

Add exactly three session permission modes:

```text
default -> acceptEdits -> auto -> default
```

Use configurable `Shift+Tab` to cycle them. Preserve the ASCET editable write gate as a non-bypassable runtime condition. Remove the 30-second approval timeout. Prevent the UI from displaying `DONE` when the business operation failed.

## 2. Required User Experience

### 2.1 Permission modes

The footer continuously shows one of:

```text
Permissions: Default
Permissions: Accept Edits
Permissions: Auto
```

`Shift+Tab` cycles:

```text
default -> acceptEdits -> auto -> default
```

Also provide:

```text
/permission
/permission default
/permission acceptEdits
/permission auto
```

The command without an argument reports the current mode and behavior.

### 2.2 One public tool call

Apply example:

```json
{
  "action": "create_method",
  "intent": "apply",
  "componentPath": "PI_LIVE_TEST_20260812_EDIT\\StateMachineUnderTest",
  "componentKind": "statemachine",
  "methodName": "stateProbe",
  "methodKind": "action"
}
```

Internal sequence:

```text
normalize
-> validate
-> authoritative preflight
-> hard gates
-> classify risk
-> permission decision
-> optional approval
-> revalidate approved scope
-> optional editable acquisition
-> execute
-> readback
-> final result
```

The model must not call the same operation again with `executeWrite=true`.

### 2.3 Explicit preview

Preview example:

```json
{
  "action": "create_folder",
  "intent": "preview",
  "folderPath": "A\\B\\C"
}
```

`preview` performs authoritative preflight only. It never asks and never writes.

### 2.4 Approval behavior

Interactive approval has no fixed timeout. It ends only when the user approves, rejects, presses Escape, cancels the tool run, closes the session, or the UI transport fails. Failure or absence of UI never implies approval.

## 3. Current Problems

1. `packages/ascet-extension/src/edit/service.ts` uses missing `executeWrite` as preflight-only and requires a second call.
2. `packages/ascet-extension/src/core/results.ts` tells the model to rerun with `executeWrite=true`.
3. `packages/ascet-extension/src/edit/approval.ts` supplies `timeout: 30_000` and does not pass the request signal directly to the dialog.
4. Direct mutations have database/tree/impact checks but incomplete operation-specific capability preflight.
5. `create_method` discovers missing `AddAction`, `AddCondition`, `AddTrigger`, `AddProcess`, or `AddMethod` support during mutation.
6. `create_folder` discovers `AddFolder` failures during mutation instead of returning a complete path plan first.
7. Normal mutations cannot acquire editability and perform the requested write as one approved compound operation.
8. `packages/ascet-extension/src/rendering.ts` can infer `DONE` from process completion when the business operation actually failed.
9. `Shift+Tab` currently belongs to `app.thinking.cycle`.

## 4. Non-Goals

- Do not add `plan`, `dontAsk`, or `bypassPermissions` modes.
- Do not let permission modes bypass capability, database identity, target identity, shared-object, editable-state, quarantine, readback, rollback, or reconciliation checks.
- Do not introduce an LLM risk classifier in the first implementation.
- Do not auto-approve delete or code-replacement operations.
- Do not hold the serial ASCET scheduler or Bridge lock while waiting for approval.
- Do not remove explicit editability check/set functionality.
- Do not preserve the old public `executeWrite` flow unless separately requested before implementation.

## 5. Safety Principles

### 5.1 Permission is not capability

Permission answers whether the user authorizes a proven mutation scope. Hard gates answer whether the exact target can safely be mutated now. Permission evaluation occurs only after sufficient preflight evidence exists.

### 5.2 Unknown evidence fails closed

Block rather than raise risk when any required evidence is missing:

- database fingerprint;
- target OID/kind;
- complete shared-object impact;
- required Diagram/container capability;
- editable-state result;
- mutation guard state;
- required readback support.

### 5.3 Approval is fingerprinted

Approval covers action, normalized parameters, database fingerprint, target identity, impact fingerprint, planned effects, editable-state transition, risk, and verification plan. Material changes after approval invalidate it.

### 5.4 Do not wait inside scheduler ownership

Required ordering:

```text
scheduled read preflight
-> release scheduler, CLI lock, Bridge scope, ToolAPI session
-> wait for approval
-> scheduled revalidation and write
```

### 5.5 Snapshot mode per call

Capture permission mode at tool-call start. Switching mode while a dialog is open affects only future calls and never auto-resolves the existing dialog.

## 6. Permission Behavior

```ts
export const PERMISSION_MODES = ["default", "acceptEdits", "auto"] as const;
export type PermissionMode = (typeof PERMISSION_MODES)[number];
```

### 6.1 `default`

All actual writes ask after preflight passes. Verified no-op results do not ask.

### 6.2 `acceptEdits`

Safe, single-target, non-destructive, fully verified edits auto-run. Medium and high-risk writes ask. A safe base action requiring editable-state acquisition becomes at least medium.

### 6.3 `auto`

Decision order:

```text
hard gate failure       -> deny/block
explicit scoped deny    -> deny
high risk               -> ask
explicit scoped ask     -> ask
matching scoped allow   -> allow when autoApprovable
safe                    -> allow
medium without allow    -> ask
unknown                 -> ask only when hard evidence is complete
```

A scoped allow cannot override a hard gate or mandatory high-risk confirmation.

### 6.4 Initial risk matrix

Safe base risk:

- `create_folder`
- `create_component`
- `create_method`
- `set_method_signature`
- `set_enumerators`

Medium base risk:

- `set_element_dependency`
- `apply_element_spec`
- `apply_project_formula`
- bounded create-only batch writes
- explicit `component_editable_set`
- any safe operation requiring editable-state acquisition

High base risk:

- `delete_folder`
- `delete_component`
- `delete_method`
- `set_method_code`
- `set_module_code`
- `set_state_machine_code`
- shared-object writes
- mixed or large batches
- non-compensable partial-effect operations

Dynamic modifiers:

```text
editable acquisition -> at least medium
multiple targets      -> at least medium
multiple variants     -> at least medium
shared object         -> high
code replacement      -> high
delete                -> high
incomplete evidence   -> blocked, not high
```

## 7. Coding-Agent Development Tasks

### CA-1: Add permission mode core type

Create:

```text
packages/coding-agent/src/core/permission-mode.ts
packages/coding-agent/test/permission-mode.test.ts
```

Responsibilities:

- define exactly three modes;
- parse and validate strings;
- provide display titles;
- implement the pure cycle order;
- reject invalid values without falling into `auto`;
- keep ASCET-specific risk logic out of coding-agent core.

Suggested API:

```ts
export type PermissionMode = "default" | "acceptEdits" | "auto";
export function parsePermissionMode(value: unknown): PermissionMode | undefined;
export function getNextPermissionMode(mode: PermissionMode): PermissionMode;
export function getPermissionModeTitle(mode: PermissionMode): string;
```

### CA-2: Add settings and CLI support

Modify:

```text
packages/coding-agent/src/core/settings-manager.ts
packages/coding-agent/src/cli.ts
packages/coding-agent/src/main.ts
packages/coding-agent/docs/settings.md
packages/coding-agent/docs/usage.md
```

Add:

```ts
permissionMode?: PermissionMode;
```

Add CLI override:

```text
--permission-mode default|acceptEdits|auto
```

Resolution order:

```text
CLI override
> restored session value
> effective settings value
> default
```

The safe fallback is `default`. Shift+Tab changes current session state only and does not rewrite global settings.

Acceptance tests:

- valid and invalid settings;
- global/project/local merge behavior;
- CLI precedence;
- new-session default;
- resumed-session restore.

### CA-3: Persist mode in session history

Modify:

```text
packages/coding-agent/src/core/session-manager.ts
packages/coding-agent/src/core/agent-session.ts
packages/coding-agent/docs/session-format.md
```

Add a built-in entry analogous to thinking-level changes:

```ts
interface PermissionModeChangeEntry {
  type: "permission_mode_change";
  id: string;
  timestamp: string;
  permissionMode: PermissionMode;
}
```

Add:

```ts
appendPermissionModeChange(mode: PermissionMode): string;
```

`AgentSession` exposes:

```ts
get permissionMode(): PermissionMode;
setPermissionMode(mode: PermissionMode): void;
cyclePermissionMode(): PermissionMode;
```

Requirements:

- append only when changed;
- restore the latest entry on resume;
- tree navigation and branch restoration use the mode at the selected point;
- new sessions use configured default;
- tool calls capture a value snapshot when execution starts.

### CA-4: Add configurable keybinding and migration

Modify:

```text
packages/coding-agent/src/core/keybindings.ts
packages/coding-agent/docs/keybindings.md
packages/coding-agent/test/keybindings-migration.test.ts
```

Add:

```ts
"app.permission.cycle": {
  defaultKeys: "shift+tab",
  description: "Cycle permission mode",
}
```

Change the default thinking binding:

```ts
"app.thinking.cycle": {
  defaultKeys: "ctrl+shift+t",
  description: "Cycle thinking level",
}
```

Migration rules:

- explicit user bindings win;
- never overwrite an explicit `app.thinking.cycle`;
- never overwrite an explicit `app.permission.cycle`;
- update generated/help documentation if applicable;
- do not add a raw `matchesKey(data, "shift+tab")` check.

### CA-5: Bind the action and render mode

Modify:

```text
packages/coding-agent/src/modes/interactive/interactive-mode.ts
packages/coding-agent/src/modes/interactive/components/*footer*
```

Use the actual existing footer implementation after inspecting files in full.

Bind:

```ts
this.defaultEditor.onAction("app.permission.cycle", () => this.cyclePermissionMode());
```

On change:

- update `AgentSession`;
- invalidate footer;
- show a concise status message;
- do not abort or alter an in-flight tool call;
- do not resolve an open confirmation.

Suggested status text:

```text
Permission mode: Default - ASCET writes require confirmation.
Permission mode: Accept Edits - safe ASCET edits may run automatically.
Permission mode: Auto - scoped rules and risk classification control ASCET writes.
```

### CA-6: Add `/permission`

Add a built-in command to the normal command registry:

```text
/permission                 report current mode and cycle key
/permission default         set current session mode
/permission acceptEdits     set current session mode
/permission auto            set current session mode
/permission invalid         report error; leave mode unchanged
```

The command changes session state, not global settings.

### CA-7: Expose permission mode to extensions

Modify:

```text
packages/coding-agent/src/core/extensions/types.ts
packages/coding-agent/src/core/extensions/runner.ts
packages/coding-agent/src/core/agent-session.ts
packages/coding-agent/src/modes/interactive/interactive-mode.ts
packages/coding-agent/src/modes/rpc/*
packages/coding-agent/src/modes/print-mode.ts
```

Add to `ExtensionContext`:

```ts
readonly permissionMode: PermissionMode;
```

Add `getPermissionMode` to `ExtensionContextActions` and bind it from `AgentSession`. Update all hand-built contexts, including extension shortcuts.

Tool execution must see the mode snapshot captured at call start, not a mutable global read halfway through permission evaluation.

Add runner/context tests for TUI, RPC, JSON, print, command, shortcut, and tool execution contexts.

### CA-8: Add RPC control

Add RPC commands:

```text
get_permission_mode
set_permission_mode
```

`set_permission_mode` changes current session state and appends a session entry. It does not update global settings.

Include `permissionMode` in relevant init/session-state responses for remote UI rendering.

## 8. ASCET Permission Model Tasks

### AP-1: Add permission modules

Create:

```text
packages/ascet-extension/src/permissions/types.ts
packages/ascet-extension/src/permissions/descriptors.ts
packages/ascet-extension/src/permissions/evaluate.ts
packages/ascet-extension/src/permissions/rules.ts
```

Core types:

```ts
type AscetWriteRisk = "safe" | "medium" | "high";
type AscetPermissionBehavior = "allow" | "ask" | "deny";

interface AscetPermissionDecision {
  behavior: AscetPermissionBehavior;
  mode: PermissionMode;
  risk: AscetWriteRisk;
  reason: string;
  rule?: AscetPermissionRuleMatch;
}
```

The evaluator is pure and performs no UI, filesystem, scheduler, or ToolAPI calls.

### AP-2: Replace static approval metadata

Modify:

```text
packages/ascet-extension/src/edit/contract.ts
packages/ascet-extension/src/edit/contract.test.ts
```

Replace mutation `requiresApproval: true` with:

```ts
interface AscetEditPermissionDescriptor {
  baseRisk: AscetWriteRisk;
  autoApprovable: boolean;
  destructive: boolean;
  replacesExistingContent: boolean;
  requiresEditableTarget: boolean;
  requiresCompleteImpact: boolean;
  requiresReadback: boolean;
}
```

The editability `check` action stays read-only. Explicit editability `set` is a medium-risk write.

### AP-3: Add deterministic scoped rules

Support effective settings:

```json
{
  "ascetPermissions": {
    "rules": [
      {
        "behavior": "allow",
        "action": "create_method",
        "path": "PI_LIVE_TEST_*"
      },
      {
        "behavior": "allow",
        "action": "request_editability",
        "path": "PI_LIVE_TEST_*"
      },
      {
        "behavior": "ask",
        "action": "set_element_dependency"
      },
      {
        "behavior": "deny",
        "action": "delete_folder",
        "path": "PRODUCTION_*"
      }
    ]
  }
}
```

Initial rule type:

```ts
interface AscetPermissionRule {
  behavior: "allow" | "ask" | "deny";
  action: AscetEditActionId | "request_editability" | "*";
  path?: string;
  databaseFingerprint?: string;
}
```

Requirements:

- normalize ASCET separators before path matching;
- use an existing repository glob helper if available;
- deny wins over ask; ask wins over allow;
- high-risk mandatory ask wins over allow;
- hard gates run before rules;
- include matched rule source/reason in audit output;
- no LLM classifier in this phase.

If extension settings are not exposed safely, add a typed extension-settings getter. Do not make the ASCET extension parse coding-agent settings files directly.

### AP-4: Implement and test decision matrix

| Evidence/risk | default | acceptEdits | auto |
|---|---|---|---|
| preflight failed/incomplete | deny | deny | deny |
| no-op | allow | allow | allow |
| safe | ask | allow | allow unless rule asks/denies |
| medium | ask | ask | allow only with scoped allow |
| high | ask | ask | ask |
| explicit deny | deny | deny | deny |

Additional rules:

- `request_editability` is part of the compound scope;
- denied editable acquisition denies the primary mutation before it starts;
- `acceptEdits` never auto-acquires editability;
- `auto` auto-acquires only with a matching scoped allow;
- unknown risk becomes ask only when hard evidence is complete; otherwise block.

Tests:

```text
packages/ascet-extension/src/permissions/evaluate.test.ts
packages/ascet-extension/src/permissions/rules.test.ts
```

## 9. Public ASCET Contract Tasks

### AT-1: Replace `executeWrite` with explicit intent

Modify all public mutation schemas in:

```text
packages/ascet-extension/src/edit/service.ts
packages/ascet-extension/src/tools/edit/schema.ts
packages/ascet-extension/src/tools/actions/schema-registry.ts
packages/ascet-extension/src/tools/actions/descriptors.ts
```

New required mutation field:

```ts
intent: "preview" | "apply";
```

Rules:

- `preview` never writes and never asks;
- `apply` runs the complete one-call flow;
- `intent` is required on mutation variants;
- editability `mode=check` remains read-only;
- editability `mode=set` must use equivalent apply semantics consistently;
- remove public/model-facing `executeWrite` fields and instructions;
- do not retain a hidden second-call branch.

Regenerate, do not hand-edit, generated action catalogs and contract snapshots. This is a breaking public contract change and requires an `[Unreleased]` Breaking Changes entry.

### AT-2: Update prompts, rules, and Skill guidance

Modify:

```text
packages/ascet-extension/src/core/results.ts
packages/ascet-extension/src/tools/edit/prompt.ts
packages/ascet-extension/src/tools/actions/descriptors.ts
packages/ascet-extension/src/ascet-coding-policy.ts
packages/ascet-extension/skills/ascet-engineering/**
.ascet/rules/tools/pi-ascet-tools.md
```

Replace two-call guidance with:

```text
Use intent=apply when the user asked to perform the exact write. The runtime performs preflight, permission evaluation, optional confirmation, write, and readback in the same tool call. Use intent=preview only when the user requested the planned effect without writing.
```

Do not instruct the model to perform separate editability check/set calls before ordinary mutations.

## 10. Authoritative Preflight Foundation

### PF-1: Define normalized evidence

Create:

```text
packages/ascet-extension/src/edit/preflight/types.ts
packages/ascet-extension/src/edit/preflight/service.ts
packages/ascet-extension/src/edit/preflight/fingerprint.ts
```

Suggested shape:

```ts
interface AscetMutationPreflightEvidence {
  version: 1;
  action: AscetEditActionId;
  paramsFingerprint: string;
  generatedAt: string;
  database: { path: string; fingerprint: string };
  target: { path: string; oid: string; kind: string };
  impact: {
    complete: boolean;
    sharedObject: boolean;
    ownerPath: string;
    affectedProjects: string[];
    fingerprint: string;
  };
  capability: {
    status: "supported" | "unsupported" | "unknown";
    operation: string;
    evidence: Record<string, unknown>;
  };
  editability: {
    applicable: boolean;
    status: "editable" | "read_only" | "unknown" | "not_applicable";
    canRequestEditable: boolean;
  };
  effects: AscetPlannedEffect[];
  verification: {
    available: boolean;
    operation: string;
    target: Record<string, unknown>;
  };
  riskModifiers: string[];
  approvalMaterialFingerprint: string;
}
```

The approval fingerprint excludes timestamps/durations but includes every field that can change approved scope.

### PF-2: Generalize backend preflight

Refactor `runBackendMutationPreflight` into an operation-specific preflight registry. Each apply-capable action must provide authoritative preflight or explicitly return migration/unsupported status. Do not silently use summary-only preflight when capability evidence is required.

Normalize existing `apply_element_spec` and `set_element_dependency` dry-run results into the common evidence structure.

### PF-3: Release resources before approval

After preflight, release all scheduler jobs, CLI locks, Bridge request scopes, and ToolAPI sessions before showing approval. Approval must not consume serial ASCET capacity.

### PF-4: Revalidate approved scope

After approval:

1. run fresh authoritative preflight;
2. compare `approvalMaterialFingerprint`;
3. continue when identical;
4. permit only non-material freshness changes without another dialog;
5. re-prompt in the same public call when effects, target, impact, editability acquisition, capability, or risk materially change;
6. stop after a bounded number of changes with `ascet_edit_target_unstable`.

Any short-lived execution authorization TTL starts after approval and successful revalidation, not before the user sees the dialog.

## 11. `create_method` Preflight and Execution

### CM-1: Add read-only backend preflight

Add an internal operation with a consistent final name such as:

```text
preflight_create_method
```

Resolve live data rather than trusting only model-supplied `componentKind`.

Return:

- database identity;
- component path/OID/kind/language;
- target Diagram name/existence/runtime type;
- existing same-name methods;
- component/method-kind compatibility;
- required ToolAPI method and expected signature;
- whether the method exists;
- editable state;
- readback capability;
- planned effects, including Diagram creation if missing.

Required mapping:

| methodKind | ToolAPI method |
|---|---|
| `abstract` | `AddMethod(string)` |
| `process` | `AddProcess(string)` |
| `action` | `AddAction(string)` |
| `condition` | `AddCondition(string)` |
| `trigger` | `AddTrigger(string)` |

For an existing Diagram without the required API, fail preflight:

```json
{
  "code": "create_method_capability_not_supported",
  "message": "Diagram 'Main' does not support creating 'Action'.",
  "mutationStatus": "not_started"
}
```

Do not show approval.

### CM-2: Preserve missing-Diagram creation safely

Current behavior may intentionally create a missing Diagram. Do not remove it without explicit confirmation from the user.

For a missing Diagram:

- prove `AddDiagram(string)` availability;
- list Diagram creation as a planned effect;
- classify as at least medium until the new runtime object's method capability can be proven;
- ask in `default` and `acceptEdits`;
- require scoped allow in `auto`, otherwise ask;
- validate the created Diagram before method creation;
- compensate the new empty Diagram if a verified removal API exists;
- otherwise return `partial` and quarantine/reconcile when failure follows Diagram creation.

Do not claim capability proof for an object that does not yet exist.

### CM-3: Keep runtime validation

Retain execution-time `ValidateMethodKind`, actual reflection/API checks, editable gate, target resolution, and readback. Preflight does not replace them.

Structured failures must include required API, Diagram runtime type, whether Diagram creation occurred, mutation-started state, and rollback/compensation result.

### CM-4: Idempotency

When `ifExists=return-existing` finds an exact compatible method:

- return verified no-op;
- do not ask;
- do not mutate.

A conflicting same-name method fails preflight with observed kind/owner details.

## 12. `create_folder` Preflight and Execution

### CF-1: Add path-plan backend preflight

Add an internal read-only operation such as:

```text
preflight_create_folder
```

Return:

- normalized path;
- database identity;
- observed state per segment;
- existing Folder segments;
- missing segments;
- same-name non-Folder conflicts;
- parent container runtime types;
- `AddFolder(string)` capability for every missing level;
- save/readback capability;
- planned effects.

Example:

```json
{
  "existing": ["A"],
  "willCreate": ["A\\B", "A\\B\\C"],
  "conflicts": [],
  "capability": { "status": "supported" }
}
```

### CF-2: No-op and conflict behavior

If all segments exist as Folders:

- return verified no-op;
- do not ask;
- do not call `Save()`.

If a segment conflicts with a non-Folder item:

- fail preflight;
- include path and observed kind;
- do not call `AddFolder`.

### CF-3: Preserve execution checks

Execution still rechecks each segment and `AddFolder` result. Backend results distinguish:

```text
created
no_op
not_started
partially_created
unknown
```

If nested creation partially succeeds, report exact created segments and reconciliation guidance rather than generic success.

## 13. Editable Write Gate and Compound Flow

### EG-1: Keep editability as a hard gate

Component-targeted mutations automatically check editable state during preflight. The check is read-only and needs no approval.

```text
editable       -> continue
read_only      -> include request_editability in compound scope
unknown        -> block
not_applicable -> continue
```

`create_folder` uses database/container capability, not component editability.

### EG-2: Acquire editability inside the same public call

For a read-only component, build one compound scope:

```text
request editability
-> execute primary mutation
-> verify primary mutation
```

Mode behavior:

| Mode | Editability acquisition |
|---|---|
| `default` | ask once for compound scope |
| `acceptEdits` | ask once; never auto-acquire |
| `auto` | scoped `request_editability` allow may auto-run; otherwise ask |

The dialog explicitly lists both changes.

### EG-3: Prevent scheduler interleaving

Editable acquisition and the dependent mutation must execute as one serialized backend unit or scheduler transaction. Preferred design:

- typed internal guarded write-host request;
- one ToolAPI session;
- revalidate database/target/editability;
- acquire editability if approved;
- confirm editable state;
- dispatch one closed-union mutation;
- perform mandatory readback before releasing the unit when feasible.

Do not implement two ordinary CLI calls with a scheduler gap between editable set and primary mutation.

If a generic atomic path is too large initially, implement it for `create_method` first and leave unmigrated actions explicitly blocked rather than falsely claiming atomicity.

### EG-4: Handle persistent editability state

Investigate the actual ToolAPI for a reliable release/revert operation. Do not guess.

Record:

```text
initiallyEditable
acquiredByThisOperation
finalEditableState
```

If primary mutation fails after acquisition:

- compensate only with a verified release API;
- otherwise return `partial` and state that editability may remain changed;
- preserve quarantine/reconciliation behavior for unknown outcomes.

### EG-5: Preserve standalone editability operations

Keep explicit check/set functionality. `check` is read-only. `set` is a medium-risk write using the same three modes and no-timeout approval flow.

## 14. Single-Call Mutation Coordinator

### MC-1: Create coordinator

Create:

```text
packages/ascet-extension/src/edit/guarded-mutation.ts
```

Suggested entry point:

```ts
async function runGuardedAscetMutation(input: {
  params: AscetMutationParams;
  intent: "preview" | "apply";
  permissionMode: PermissionMode;
  rules: AscetPermissionRule[];
  options: RunAscetEditOperationOptions;
  ctx: AscetEditApprovalContext;
  lifecycle: AscetWriteLifecycleEvidence;
}): Promise<AscetEditResult>;
```

State machine:

```text
received
-> validating
-> preflighting
-> evaluating_permission
-> waiting_approval (optional)
-> revalidating
-> acquiring_editability (optional)
-> executing
-> verifying
-> completed | blocked | failed | partial | rolled_back | unknown
```

### MC-2: Refactor `runAscetMutationCore`

Make `runAscetMutationCore` a thin normalize/validate/dispatch layer. Remove the public branch that requires missing versus true `executeWrite`.

Reuse existing protections instead of duplicating them:

- database identity;
- tree safety evidence;
- target-impact resolution;
- Plan Store fingerprints where appropriate;
- mutation guard store;
- `AscetMutationCoordinator` journaling;
- lifecycle evidence;
- verification classification;
- observation invalidation;
- reconciliation/quarantine.

### MC-3: Build approval material

Example dialog:

```text
ASCET create_method

Mode: Accept Edits
Risk: Medium
Target: PI_LIVE_TEST_20260812_EDIT\StateMachineUnderTest

Planned effects:
1. Request component editability
2. Create Action stateProbe in Diagram Main
3. Verify method by live readback

Shared object: no
Affected projects: none
```

Internal plan IDs and fingerprints may appear in expanded diagnostics but are not primary user content.

### MC-4: Handle cancellation and re-prompt

- no dialog for preview, no-op, preflight failure, or hard-gate failure;
- pass the AbortSignal to `confirm`;
- no fixed dialog timeout;
- cancellation before write returns `mutation.status=not_started`;
- mode changes do not alter the captured decision;
- material revalidation changes re-prompt within the same public call;
- bound the re-prompt count.

### MC-5: Headless behavior

A deterministic `allow` may execute headlessly. An `ask` decision without an approval channel returns:

```json
{
  "status": "blocked",
  "error": {
    "code": "ascet_edit_approval_required",
    "message": "This operation requires an interactive approval channel."
  },
  "mutation": { "status": "not_started" }
}
```

## 15. Approval Service

### AS-1: Remove fixed timeout everywhere

Modify and audit:

```text
packages/ascet-extension/src/edit/approval.ts
packages/ascet-extension/src/edit/approval.test.ts
packages/ascet-extension/src/tools/recover/definition.ts
packages/ascet-extension/src/edit/mutation-reconciliation.ts
```

Use:

```ts
ctx.ui.confirm(title, message, { signal })
```

Do not provide `timeout: 30_000`.

### AS-2: Separate permission decision from UI

`approval.ts` receives an already calculated `ask` decision and material summary. It does not classify risk.

Suggested result:

```ts
type AscetApprovalResult =
  | { status: "approved"; approvedAt: string }
  | { status: "rejected" }
  | { status: "cancelled" }
  | { status: "ui_unavailable" }
  | { status: "ui_failed"; message: string };
```

Remove `preflight_required` from approval semantics. Preview/apply selection occurs before approval.

### AS-3: Start execution authorization after approval

If a short execution TTL remains:

- mint it after approval and revalidation;
- do not count user reading time;
- use it only for immediate Bridge entry;
- fail closed if it expires before mutation begins.

## 16. Result Contract and Rendering

### RC-1: Normalize mutation result

The result must expose these semantic sections, whether through a new envelope or an extended `AscetToolOutcome`:

```ts
interface AscetMutationResultEnvelope {
  status: "ok" | "blocked" | "error" | "partial" | "rolled_back" | "unknown";
  permission: {
    mode: PermissionMode;
    decision: "allow" | "ask" | "deny" | "not_evaluated";
    risk?: AscetWriteRisk;
    reason?: string;
    rule?: Record<string, unknown>;
  };
  preflight: {
    status: "passed" | "failed" | "not_run";
    evidence?: Record<string, unknown>;
  };
  editability: {
    status: "editable" | "acquired" | "blocked" | "unknown" | "not_applicable";
    initiallyEditable?: boolean;
    acquiredByThisOperation?: boolean;
  };
  mutation: {
    status: "applied" | "no_op" | "not_started" | "partially_applied" | "rolled_back" | "unknown";
  };
  verification: {
    status: "passed" | "failed" | "missing" | "unknown" | "not_applicable";
  };
  error?: { code: string; message: string };
}
```

### RC-2: Correct UI status mapping

Modify:

```text
packages/ascet-extension/src/rendering.ts
packages/ascet-extension/src/tools/edit/ui.ts
```

| Semantic state | UI status |
|---|---|
| applied/no-op and verification passed | `DONE` |
| approval/editability/hard gate blocked | `BLOCKED` |
| preflight/contract/capability failure before write | `FAILED` |
| mutation happened but verification/compensation incomplete | `PARTIAL` |
| full verified rollback | `ROLLED BACK` |
| mutation outcome cannot be determined | `UNKNOWN` |
| waiting for user | `WAITING APPROVAL` |

Only render `DONE` when mutation is `applied` or `no_op` and verification is `passed` or explicitly not applicable for a read-only/no-op result. Bridge/process completion is insufficient.

### RC-3: Compact and expanded output

Compact example:

```text
Status: BLOCKED · editable_write_gate_blocked
```

Expanded output includes permission, risk, matched rule, preflight capability, editability, mutation, verification, Bridge lifecycle, and recovery actions.

Render one final card for one tool call. Do not show a completed card followed by a separate backend error card.

## 17. Backend and Contract Work

### BE-1: Add typed preflight DTOs and routes

Add C# DTOs/services for:

```text
preflight_create_method
preflight_create_folder
```

Register them on the correct read lane and update:

```text
ascetcli/src/AscetCli/Routing/OperationRegistry.cs
ascetcli/src/AscetCli/Host/*
ascetcli/src/AscetCli/Bridge/*
ascetcli/contracts/commands/*
ascetcli/contracts/cli-catalog.json
packages/ascet-extension/ascet-cli/contracts/*
```

Use existing generators/copy flows. Do not treat generated snapshots as source files.

### BE-2: Add typed atomic guarded write

Design a closed-union internal request that can:

```text
revalidate database/target
-> check/acquire editability when authorized
-> dispatch one supported mutation
-> perform mandatory readback
```

Run it on `SerialWrite`. Reuse existing operation-specific services. Do not create an arbitrary nested-command tunnel.

### BE-3: Improve mutation-started metadata

Every failure reports accurate:

```text
mutationStarted=false|true|null
```

Compound flow additionally reports:

```text
editabilityMutationStarted
editabilityAcquired
primaryMutationStarted
```

Use this evidence for not-started/partial/unknown/reconciliation classification.

### BE-4: Preserve runtime gates

Keep component-kind validation, current target resolution, `RequireComponentEditableInSession`, actual ToolAPI checks, save checks, readback, rollback, and compensation. Preflight is additive.

## 18. Staged Action Rollout

Do not migrate all writes in one patch.

### Stage 1

```text
create_folder
create_component
create_method
editability check/set
```

### Stage 2

```text
set_method_signature
set_enumerators
```

### Stage 3

```text
set_element_dependency
apply_element_spec
apply_project_formula
```

Preserve intentional plan/dry-run/transaction guarantees while removing the second public call.

### Stage 4

```text
set_method_code
set_module_code
set_state_machine_code
delete_method
delete_component
delete_folder
```

These always ask in all modes.

### Stage 5

Migrate `ascet_batch_write`:

- compute aggregate risk;
- enumerate all effects and targets;
- mixed create/update/delete is high risk;
- preserve all-target editability checks;
- block when impact cannot be fully enumerated;
- maintain per-item readback and compensation evidence.

Until an action is migrated, apply returns an explicit unsupported/migration-blocked result rather than silently using the old second-call behavior.

## 19. Audit and Observability

Record bounded structured fields:

```text
permissionMode
permissionDecision
risk
matchedRule
preflightFingerprint
approvalMaterialFingerprint
approvedAt
revalidatedAt
databaseFingerprint
targetOid
targetImpactFingerprint
editabilityInitiallyEditable
editabilityAcquired
mutationStatus
verificationStatus
rollbackStatus
```

Do not store secrets, full code bodies, or large specs. Use fingerprints and compact summaries.

Lifecycle stages:

```text
preflight
waiting_approval
revalidating
acquiring_editability
executing
readback
reconciling
```

## 20. Test Plan

### 20.1 Coding-agent tests

Cover:

- exactly three valid modes;
- exact cycle order;
- settings/CLI/session precedence;
- session resume and tree navigation;
- `Shift+Tab` default binding;
- thinking-cycle migration;
- explicit custom bindings;
- footer rendering;
- `/permission` validation;
- extension context getter;
- in-flight mode snapshot;
- RPC get/set;
- mode switching does not resolve an existing dialog.

### 20.2 Permission evaluator tests

Required cases:

```text
default + safe -> ask
default + medium -> ask
default + high -> ask
acceptEdits + safe -> allow
acceptEdits + safe + read_only -> ask
acceptEdits + medium -> ask
acceptEdits + high -> ask
auto + safe -> allow
auto + medium + scoped allow -> allow
auto + medium without allow -> ask
auto + high + allow rule -> ask
any mode + explicit deny -> deny
any mode + hard gate failure -> deny/block
no-op -> allow without dialog
```

### 20.3 Approval tests

Verify:

- `confirm` receives `signal`;
- no ASCET dialog receives a fixed timeout;
- rejection and cancellation return `mutation.status=not_started`;
- UI failure does not mutate;
- no UI plus ask returns `approval_required`;
- no UI plus deterministic allow may continue;
- execution TTL starts after approval;
- changed material fingerprint causes same-call re-prompt;
- repeated instability stops safely.

### 20.4 Single-call tests

One public `ascet_edit` execution must support:

- safe auto-apply in `acceptEdits`;
- preflight, approval, and continuation in `default`;
- one compound approval for editable acquisition plus mutation;
- capability failure without confirmation;
- no-op without confirmation;
- mandatory readback;
- one final tool-result card.

Multiple internal Bridge requests are allowed, but the model-visible tool call count is one.

### 20.5 Editable gate tests

Cover:

- initially editable;
- initially read-only;
- unknown editability;
- allowed and successful acquisition;
- rule-denied acquisition;
- user-approved acquisition;
- set returns false;
- state changes while awaiting approval;
- acquisition succeeds but primary mutation fails;
- persistent editable state reporting;
- verified compensation;
- compensation unavailable;
- same-session backend editable gate still blocks stale writes.

### 20.6 `create_method` tests

Cover:

- class/abstract;
- module/process;
- state-machine action/condition/trigger;
- component/method-kind mismatch;
- existing Diagram lacks required API;
- Diagram runtime evidence;
- exact existing method with return-existing;
- conflicting same-name method;
- missing Diagram supported path;
- missing Diagram failure/compensation;
- readback mismatch;
- mutation-started metadata.

Regression:

```text
PI_LIVE_TEST_20260812_EDIT\StateMachineUnderTest.stateProbe
Diagram Main does not support Action
```

Expected:

```text
preflight failed
mutation not started
no approval
UI FAILED, never DONE
```

### 20.7 `create_folder` tests

Cover:

- top-level create;
- nested create with no existing segments;
- nested create with partial existing path;
- all segments exist/no-op;
- same-name non-Folder conflict;
- database or child container lacks `AddFolder`;
- save failure;
- partial nested creation;
- readback mismatch;
- correct segment/count evidence.

### 20.8 Rendering tests

Verify:

- backend business error never renders `DONE`;
- successful process exit with business failure renders `FAILED`;
- approval/editability block renders `BLOCKED`;
- verified apply/no-op renders `DONE`;
- verification failure after mutation renders `PARTIAL`;
- full rollback renders `ROLLED BACK`;
- unknown mutation renders `UNKNOWN`;
- expanded output contains all semantic sections.

### 20.9 C# smoke tests

Update `ascetcli/scripts/test-ascet-csharp.ps1` and existing registered smoke executables. Do not add an unregistered standalone executable.

### 20.10 Required commands

For each modified TypeScript test file, run the specific Vitest file from the owning package and iterate until passing.

After code changes:

```text
npm run check
```

Use full output and resolve all errors, warnings, and infos. Do not run `npm test` or `npm run build` unless the user requests it.

## 21. Live ASCET Validation

This work changes Runtime, Bridge, tool contracts, permissions, and writes. Preview output is insufficient. Use a disposable fixture/database and execute serially.

### 21.1 Setup evidence

- runtime status;
- database identity;
- known fixture state;
- zero residual scheduler/CLI locks;
- a component supporting method creation;
- a Diagram known not to support `Action`;
- a suitable read-only component.

The serial automation harness is:

```powershell
$env:ASCET_PERMISSION_LIVE_VALIDATE = "1"
$env:ASCET_PERMISSION_LIVE_AUTHORIZATION = "I_AUTHORIZE_DISPOSABLE_ASCET_WRITES" # set only after explicit operator approval
$env:ASCET_PERMISSION_SMOKE_DATABASE_FINGERPRINT = "<authorized disposable database fingerprint>"
$env:ASCET_PERMISSION_SMOKE_REGRESSION_COMPONENT = "<StateMachine whose Main lacks AddAction>"
$env:ASCET_PERMISSION_SMOKE_READ_ONLY_COMPONENT = "<disposable read-only component>"
$env:ASCET_PERMISSION_SMOKE_FAILURE_COMPONENT = "<disposable read-only component with a known post-acquisition mutation failure>"
npm run smoke:ascet-extension:permission-modes
```

Before authorization, run `npm run smoke:ascet-extension:permission-discovery` to collect read-only database/tree/editability/capability evidence and candidate environment values. Optional overrides include `ASCET_PERMISSION_SMOKE_CWD`, `ASCET_PERMISSION_SMOKE_ROOT`, fixture method names/kinds, expected failure codes, approval delay, and evidence directory. The harness refuses to run without both write gates, enforces an approval delay greater than 30 seconds, executes all scenarios serially, cleans only declared disposable targets, verifies readback/locks/quarantine, and archives each request/result plus a final summary.

### 21.2 Mode scenarios

Default:

- start safe `create_folder` apply;
- leave dialog open for more than 30 seconds;
- approve and verify write/readback;
- repeat and verify no-op without approval.

Accept Edits:

- safe `create_folder` auto-runs;
- supported `create_method` on an editable target auto-runs;
- safe base action on read-only target asks for compound scope.

Auto:

- matching safe allow rule auto-runs;
- medium action without allow asks;
- high-risk action asks even with allow rule;
- scoped deny blocks before mutation.

### 21.3 Capability regression

Run `create_method` against the live regression fixture when Diagram `Main` lacks `AddAction`.

Required evidence:

- preflight failure;
- no editability acquisition;
- no approval request;
- no mutation;
- live readback proves method absence;
- UI status is `FAILED`, not `DONE`.

### 21.4 Editable acquisition

- prove initial read-only state;
- make one `create_method` apply call;
- approve compound scope once;
- prove serialized editability acquisition and primary mutation;
- prove same-session editable gate;
- prove readback;
- record final TCM/editable state;
- force primary mutation failure after acquisition and verify compensation/partial reporting.

### 21.5 Cleanup

- delete only test-created items;
- verify cleanup by live readback;
- record final runtime/database state;
- verify zero residual locks;
- verify no unresolved quarantine;
- archive request/result evidence.

## 22. Migration and Documentation

### 22.1 Public ASCET contract

Unless compatibility is requested before implementation:

- remove `executeWrite` from public schemas;
- add required `intent`;
- update prompts, Skill references, examples, tests, and catalogs together;
- return clear invalid-parameter errors for stale callers;
- do not keep a hidden legacy branch.

### 22.2 Keybinding migration

New defaults:

```text
app.permission.cycle = shift+tab
app.thinking.cycle = ctrl+shift+t
```

Explicit user bindings win. Update help, docs, and changelog.

### 22.3 Session compatibility

Older sessions without permission entries resolve from effective settings and then `default`. Historical files require no rewrite.

### 22.4 Documentation paths

Update:

```text
packages/coding-agent/docs/keybindings.md
packages/coding-agent/docs/settings.md
packages/coding-agent/docs/usage.md
packages/coding-agent/docs/rpc.md
packages/coding-agent/docs/session-format.md
packages/ascet-extension/README.md
packages/ascet-extension/skills/ascet-engineering/**
.ascet/rules/tools/pi-ascet-tools.md
```

Changelogs under `[Unreleased]`:

- coding-agent Breaking Changes: Shift+Tab reassignment;
- coding-agent Added: permission modes, command, setting, RPC;
- ASCET Breaking Changes: `executeWrite` replaced by `intent`;
- ASCET Added/Changed: single-call guarded write and mode-aware approval;
- ASCET Fixed: pre-mutation capability detection, no approval timeout, correct final status.

Do not edit released changelog sections.

## 23. Suggested Patch Sequence

### Patch 1: Core state

- CA-1 through CA-3;
- settings/session tests;
- no ASCET behavior change.

### Patch 2: Keybinding and UI

- CA-4 through CA-6;
- Shift+Tab migration;
- footer/command/tests/docs.

### Patch 3: Extension API and RPC

- CA-7 and CA-8;
- context snapshot and RPC tests.

### Patch 4: ASCET permission evaluator

- AP-1 through AP-4;
- descriptors/rules/pure tests.

### Patch 5: Approval and result correctness

- AS tasks;
- RC tasks;
- independently remove timeout and fix `DONE + error`.

### Patch 6: Preflight foundation

- PF tasks;
- common evidence and fingerprints.

### Patch 7: `create_folder` cutover

- CF tasks;
- backend contracts;
- one-call `intent` flow.

### Patch 8: `create_method` plus compound editability

- CM tasks;
- EG tasks;
- atomic backend execution;
- regression tests.

### Patch 9: Remaining safe/medium actions

- staged rollout;
- regenerate contracts/prompts.

### Patch 10: High-risk and batch actions

- mandatory ask;
- aggregate effects;
- full live validation.

Do not combine all phases into one patch.

## 24. Definition of Done

- Exactly `default`, `acceptEdits`, and `auto` exist.
- Configurable Shift+Tab cycles the modes.
- Thinking cycle has a documented replacement key.
- Footer and `/permission` show/change current session mode.
- Session resume/tree navigation restore mode.
- Extensions receive a per-call mode snapshot.
- Requested writes need one public `ascet_edit` call.
- `intent=preview` is non-mutating.
- No model-facing second-call `executeWrite` guidance remains.
- Authoritative preflight precedes permission evaluation.
- `create_method` detects unsupported existing-Diagram capability before mutation.
- `create_folder` returns exact existing/create/conflict path plans.
- Editable checks remain mandatory and non-bypassable.
- Read-only targets can use one approved compound operation.
- `acceptEdits` never silently acquires editability.
- `auto` acquires editability only through scoped allow.
- Editable acquisition and primary mutation cannot interleave.
- ASCET approval dialogs have no fixed 30-second timeout.
- No scheduler/Bridge lock is held while waiting.
- Material scope changes invalidate approval.
- High-risk operations always ask.
- Missing safety evidence blocks.
- Executed writes always use action-specific readback.
- Runtime gates remain in execution services.
- `DONE` means verified applied/no-op only.
- Partial, rolled-back, blocked, failed, and unknown states render distinctly.
- Focused TypeScript tests and C# smoke tests pass.
- `npm run check` passes with full output.
- Serial live ASCET validation proves writes, readback, cleanup, and zero residual locks.
- Documentation and `[Unreleased]` changelogs are updated.

## 25. Required Technical Investigations

These are implementation prerequisites, not product-mode decisions:

1. Identify the real ToolAPI release/revert operation, if any, for editability acquired through `ReserveItem` and `CreateEdition`.
2. Determine whether a missing Diagram's runtime type/capability can be proven without creating it.
3. Select a narrow typed backend contract for atomic editability acquisition plus mutation.
4. Confirm the built-in footer integration point without duplicating status UI.
5. Confirm the typed settings API for `ascetPermissions.rules`.
6. Confirm session-entry integration for branch/tree restoration.
7. Audit every ASCET confirmation call for hidden fixed timeouts.
8. Audit every mutation render path that can infer `DONE` from process completion.

Each investigation must produce a code-level conclusion and focused test before dependent implementation is complete.
### 25.1 Investigation conclusions and focused evidence

Implementation evidence as of August 13, 2026:

1. **Editability release/revert:** x86 reflection of `Etas.AscetNET.dll` found `ReserveItem`, `CreateEdition`, `SetEdition`, and SCM command entry points, but no verified typed release/revert/unreserve operation. Guarded writes therefore never guess a cleanup API: persistent editability acquired by the call is reported as `partially_applied`. Evidence: `ascetcli/src/AscetCli/AscetComponentEditable.cs`, `ascetcli/src/AscetCli/AscetGuardedMutation.cs`, `packages/ascet-extension/src/edit/guarded-generic-mutation.test.ts`.
2. **Missing Diagram capability:** a missing Diagram has no runtime instance on which to prove `AddAction`/`AddCondition`/`AddTrigger`. `preflight_create_method` proves `AddDiagram` and the future Diagram contract, marks the creation effect explicitly, and raises the permission risk to at least medium; the guarded backend validates the created runtime object before the primary mutation and compensates by removing the new Diagram when possible. Evidence: `ascetcli/src/AscetCli/AscetPreflightCreateMethod.cs`, `ascetcli/src/AscetCli/AscetGuardedCreateMethod.cs`, `packages/ascet-extension/src/edit/create-method-risk.test.ts`, `packages/ascet-extension/src/edit/guarded-generic-mutation.test.ts`.
3. **Atomic backend contract:** atomic acquisition plus mutation uses the closed registered operations `guarded_create_method`, `guarded_mutation`, and `guarded_batch_write`; callers cannot provide arbitrary executable commands. Evidence: `ascetcli/src/AscetCli/Routing/OperationRegistry.cs`, `ascetcli/src/AscetCli/Bridge/AscetLegacyOperationRegistry.cs`, `ascetcli/src/AscetCli/Commands/SelfTestCommand.cs`, `packages/ascet-extension/src/edit/guarded-generic-mutation.test.ts`, `packages/ascet-extension/src/batch-write-guarded.test.ts`.
4. **Footer integration:** permission mode is rendered by the existing built-in `FooterComponent`; no second status widget is registered. Evidence: `packages/coding-agent/src/modes/interactive/components/footer.ts`, `packages/coding-agent/test/footer-width.test.ts` (`renders the ... permission mode`).
5. **Typed settings access:** `ExtensionContext.getSettings()` returns a defensive effective-settings snapshot, and ASCET parses `ascetPermissions.rules` from that per-call snapshot without reading settings files directly. Evidence: `packages/coding-agent/src/core/extensions/types.ts`, `packages/coding-agent/src/core/extensions/runner.ts`, `packages/coding-agent/test/extensions-runner.test.ts` (`exposes a defensive effective-settings snapshot`), `packages/ascet-extension/src/permissions/settings.test.ts`.
6. **Session/tree restoration:** permission changes are append-only session entries; context construction at the selected tree point restores the latest reachable mode, while sessions without entries fall back to effective settings. Evidence: `packages/coding-agent/src/core/session-manager.ts`, `packages/coding-agent/src/core/agent-session.ts`, `packages/coding-agent/test/permission-mode-session-manager.test.ts`, `packages/coding-agent/test/permission-mode-agent-session.test.ts`.
7. **Confirmation timeout:** all ASCET mutation confirmations route through `requestAscetMutationApproval`, which forwards the tool `AbortSignal` and supplies no fixed timeout. Evidence: `packages/ascet-extension/src/edit/approval.ts`, `packages/ascet-extension/src/edit/approval.test.ts` (`passes the tool-run signal to the confirmation UI without a fixed timeout`), plus repository search coverage for direct `ui.confirm` calls.
8. **Fail-closed rendering:** renderers consume the normalized mutation envelope and emit `DONE` only for verified `applied` or `no_op`; process completion, missing readback, partial effects, rollback, and unknown outcomes remain non-success states. Evidence: `packages/ascet-extension/src/rendering.ts`, `packages/ascet-extension/src/rendering.test.ts`.
## 26. Final Completion Checkpoint — August 15, 2026

### 26.1 Final authoritative state

The complete implementation and validation plan is finished. The authorized live database remained:

```text
C:\Repo\F05_IPB_L2_0429
fingerprint: 71cf3289aea80d1926ff9e419192dad40c7e01621ffdbdfde6da15f93b74a33c
```

The interrupted-run residue was removed with the fingerprint-bound cleanup-only flow. Idempotent cleanup and recovery evidence is archived under:

```text
artifacts/ascet-permission-cleanup/20260815-090433
artifacts/ascet-permission-cleanup/20260815-093114
artifacts/ascet-permission-cleanup/20260815-125402
```

`20260815-093114` proves a repeated cleanup safely classified already-absent targets. Final negative safety-gate logs are under `artifacts/ascet-permission-validation/20260815-final`: an unsafe root and a wrong database fingerprint both failed before mutation.

### 26.2 Final fixtures and persistent editable state

Fresh pre-run discovery evidence:

```text
compound: artifacts/ascet-permission-discovery/fresh-compound-20260815-133909
failure:  artifacts/ascet-permission-discovery/fresh-failure-20260815-134201
```

The final compound fixture was initially read-only and supported an authoritative abstract-method preview:

```text
Customer\JLR_FMC\Package\JLR_LeanTCS\Private\TCS_CUS_GenericTCSFunctions\TCS_CUS_GenericTCSFunctions
```

The capability-regression fixture remained read-only with an existing `Main` Diagram that did not support `AddAction`:

```text
Customer\GAC\Package\AVH_AutomaticVehicleHold\Private\GAC_AVH_Autonomous_StandByControl_Activating
```

The post-acquisition failure fixture was initially read-only, had no `Main` Diagram, and passed the future-Diagram preflight:

```text
PlatformLibrary\Package\AntiLockController\Private\SMC\KeepAlive\KeepAlive_PSoll_Controller
```

No verified editability release/revert API exists. The following fixtures are therefore intentionally reported as remaining editable after guarded acquisition; all test-created methods were removed:

```text
Customer\JLR_FMC\Package\JLR_LeanTCS\Private\TCS_CUS_GenericTCSFunctions\TCS_CUS_RefSuppSuppress\TCS_CUS_RefSuppSuppress_DSCOFF
Customer\JLR_FMC\Package\JLR_LeanTCS\Private\TCS_CUS_GenericTCSFunctions\TCS_CUS_RefSuppSuppress\TCS_CUS_RefSuppSuppress_Hill
Customer\JLR_FMC\Package\JLR_LeanTCS\Private\TCS_CUS_GenericTCSFunctions\TCS_CUS_RefSuppSuppress\TCS_CUS_RefSuppSuppress
Customer\JLR_FMC\Package\JLR_LeanTCS\Private\TCS_CUS_GenericTCSFunctions\TCS_CUS_GenericTCSFunctions
PlatformLibrary\Package\AntiLockController\Private\SMC\KeepAlive\KeepAlive_PSoll_Controller
```

### 26.3 Complete serial live matrix

Final uninterrupted evidence archive:

```text
artifacts/ascet-permission-live/20260815-134337
smoke root: DEMO\__pi_permission_smoke__20260815-134337
```

The archive proves:

- setup health, exact database fingerprint, absent smoke targets, initially read-only compound/failure fixtures, and idle scheduler/CLI lock;
- Default approval remained open for `31001` ms while scheduler active/queued counts stayed zero and the CLI lock stayed unheld;
- approved Default create applied with readback, and the repeated create returned verified no-op without confirmation;
- Accept Edits safe folder/component/method writes auto-ran, while the read-only compound write asked once, acquired editability, used `guarded_create_method`, and passed readback;
- Auto scoped safe allow auto-ran, medium risk without allow asked, and high risk asked despite allow;
- exact scoped deny matched the planned mutation target and returned `deny` with `bridgeEntered=false` and `mutation=not_started`;
- the capability regression failed before approval, editability acquisition, or Bridge mutation and rendered `FAILED` rather than `DONE`;
- the post-acquisition failure used one compound approval, acquired editability, failed the primary mutation, returned `partial`, reported final editable state, and left the test method absent;
- cleanup removed all test-created methods, components, folders, and the exact smoke root;
- final database identity matched, scheduler active/queued counts were zero, the CLI lock was unheld, and unresolved quarantine was empty;
- `summary.json` records `ok: true`.

### 26.4 Final non-live validation

Full logs are under:

```text
artifacts/ascet-permission-validation/20260815-final
```

Final results:

| Validation | Result |
|---|---|
| ASCET Node test files | 81 files, 400 tests passed |
| Focused coding-agent permission tests | 6 files, 36 tests passed |
| All modified coding-agent test files | 13 files, 134 tests passed |
| ASCET C# build | 147 registered source files; 1 EXE + 1 DLL |
| ASCET C# smoke | 71 registered operations passed |
| Packaged ASCET assets | exactly 1 `AscetBridge.exe` and 1 `Etas.AscetNET.dll` |
| `npm run check` | passed with full output |
| Cleanup safety gates | unsafe root and wrong fingerprint rejected before mutation |

The `[Unreleased]` sections contain the permission-mode, guarded-write, intent migration, result-correctness, and keybinding entries. No released changelog section was modified.

### 26.5 Requirement-by-requirement completion audit

Abbreviations used below:

```text
LIVE = artifacts/ascet-permission-live/20260815-134337
VALIDATION = artifacts/ascet-permission-validation/20260815-final
```

| Requirement | Implementation evidence | Focused test evidence | Live evidence | Status | Remaining action |
|---|---|---|---|---|---|
| CA-1 | `packages/coding-agent/src/core/permission-mode.ts` | `permission-mode.test.ts` | N/A | Complete | None |
| CA-2 | settings manager, CLI args/main, settings and usage docs | permission settings/CLI tests | N/A | Complete | None |
| CA-3 | session manager and agent session permission entries | session-manager and agent-session permission tests | N/A | Complete | None |
| CA-4 | configurable app keybindings and migration | `keybindings-migration.test.ts` | N/A | Complete | None |
| CA-5 | interactive action binding and footer rendering | `footer-width.test.ts`; modified coding-agent suite | N/A | Complete | None |
| CA-6 | interactive `/permission` command | modified coding-agent suite | N/A | Complete | None |
| CA-7 | extension context types/runner per-call snapshot | `extensions-runner.test.ts` | all permission-mode calls use extension context snapshots | Complete | None |
| CA-8 | RPC types, server mode, and client get/set | `rpc-client-permission-mode.test.ts`; modified coding-agent suite | N/A | Complete | None |
| AP-1 | `src/permissions/{types,rules,evaluate,settings}.ts` | permission rule/evaluator/settings tests | `LIVE/019` through `LIVE/023` | Complete | None |
| AP-2 | edit action permission descriptors in `src/edit/contract.ts` | contract and evaluator tests | risk/decision fields in every live mutation envelope | Complete | None |
| AP-3 | deterministic action/path/fingerprint rules | rules/settings tests; scoped-deny definition regression | `LIVE/023-auto-scoped-deny.json` | Complete | None |
| AP-4 | pure mode/risk decision matrix | `evaluate.test.ts`; guarded-mutation tests | Default, Accept Edits, and Auto scenarios | Complete | None |
| AT-1 | public `intent=preview|apply` schemas and service dispatch | edit schema/definition/service tests | complete live matrix uses one public call per write | Complete | None |
| AT-2 | prompts, README, rules, and Skill references updated | routing, agent, Skill, and schema tests | N/A | Complete | None |
| PF-1 | normalized preflight types, service, and fingerprint | preflight service/fingerprint tests | normalized evidence in all live write envelopes | Complete | None |
| PF-2 | generalized direct and plan-managed authoritative preflight | service and guarded-generic tests | all live writes preflight before permission | Complete | None |
| PF-3 | approval resource release | `approval-resource-release.test.ts` | `LIVE/011-default-approval-resource-status.json` | Complete | None |
| PF-4 | post-approval revalidation and material comparison | service scope-change and guarded-mutation tests | approved writes record `revalidatedAt` and fingerprints | Complete | None |
| CM-1 | typed `preflight_create_method` backend and TS integration | create-method risk/service tests; C# smoke | `LIVE/025-capability-regression.json` | Complete | None |
| CM-2 | future-Diagram risk floor and compensation path | create-method risk and guarded-generic tests | `LIVE/027-editable-acquisition-primary-failure.json` | Complete | None |
| CM-3 | runtime capability validation remains in Bridge | C# selftest/smoke; service regression tests | capability and post-acquisition failures | Complete | None |
| CM-4 | `ifExists` and verified no-op handling | service and guarded tests | `LIVE/012-default-create-folder-no-op.json` | Complete | None |
| CF-1 | typed `preflight_create_folder` path-plan backend | service/definition tests; C# smoke | create-folder scenarios `LIVE/010`, `019`, `023` | Complete | None |
| CF-2 | exact no-op/conflict plan semantics | service tests | `LIVE/012` verified no-op | Complete | None |
| CF-3 | runtime create/save/readback checks retained | C# smoke and service verification tests | applied folder writes and cleanup readback | Complete | None |
| EG-1 | non-bypassable editability gate | editable-write-gate tests | initially read-only checks and compound scenarios | Complete | None |
| EG-2 | same-call guarded acquisition plus mutation | guarded-generic/service tests | `LIVE/017` and `LIVE/027` use `guarded_create_method` | Complete | None |
| EG-3 | single fresh backend session prevents interleaving | scheduler/service tests; C# smoke | guarded backend metadata in `LIVE/017`, `027` | Complete | None |
| EG-4 | persistent editability is classified and reported | guarded-generic and rendering tests | `LIVE/027`, `028`; persistent fixture list above | Complete | None |
| EG-5 | standalone check/set retained under unified approval | editability tests and coding-agent component-editable test | setup/final editability reads | Complete | None |
| MC-1 | `AscetMutationCoordinator` | mutation-coordinator tests | guarded live mutations | Complete | None |
| MC-2 | mutation core delegates through coordinated guarded paths | 400-test ASCET suite; service tests | complete serial matrix | Complete | None |
| MC-3 | bounded approval material and fingerprints | preflight/fingerprint tests | fingerprints and compact effects in live evidence | Complete | None |
| MC-4 | cancellation, re-prompt, and instability handling | guarded-mutation, approval, and service tests | one-call approvals and revalidation evidence | Complete | None |
| MC-5 | deterministic headless approval behavior | approval and guarded-mutation tests | scoped deny blocks without UI; capability failure opens no UI | Complete | None |
| AS-1 | approval has no fixed timeout | approval tests | Default dialog remained open `31001` ms | Complete | None |
| AS-2 | permission decision separated from UI request | evaluator and approval tests | allow/ask/deny envelopes | Complete | None |
| AS-3 | authorization begins after approval and revalidation | resource-release/service tests | zero scheduler/lock while waiting; later Bridge entry | Complete | None |
| RC-1 | normalized mutation result envelope | mutation-result, verification, and service tests | every live mutation uses normalized envelope | Complete | None |
| RC-2 | fail-closed status mapping | `rendering.test.ts` | capability regression renders `FAILED`, post-failure renders partial | Complete | None |
| RC-3 | compact and expanded semantic output | rendering tests | live renderer assertion and archived envelopes | Complete | None |
| BE-1 | typed C# preflight DTOs and registered routes | C# build/smoke; route coverage check | live preflight routes | Complete | None |
| BE-2 | closed typed guarded create/mutation/batch operations | C# selftest/smoke; guarded tests | `guarded_create_method` live evidence | Complete | None |
| BE-3 | mutation-start and Bridge lifecycle metadata | C# selftest; service telemetry tests | accurate Bridge/mutation fields in `LIVE/027` | Complete | None |
| BE-4 | runtime kind/editability/save/readback/rollback gates retained | C# smoke and ASCET suite | capability, compound, failure, and cleanup scenarios | Complete | None |
| Stage 1 | folder/component/method/editability migrated | schema/service/editability tests | Default and Accept Edits scenarios | Complete | None |
| Stage 2 | signature and enumerator writes migrated | schema/service/guarded tests | covered by non-live suite | Complete | None |
| Stage 3 | dependency, element spec, and project formula migrated | service and guarded-generic tests | Auto medium dependency scenario | Complete | None |
| Stage 4 | code and destructive writes migrated with mandatory ask | evaluator/service/rendering tests | Auto high-risk and cleanup delete scenarios | Complete | None |
| Stage 5 | aggregate guarded batch migration | batch guarded tests | non-live aggregate evidence; Section 21 matrix did not require a batch fixture | Complete | None |
| Section 19 | bounded telemetry and lifecycle fields implemented | telemetry tests | audit, lifecycle, fingerprint, and status fields archived | Complete | None |
| Section 20 | required unit/integration/render/C# validation | `VALIDATION` logs: 400 ASCET, 134 modified coding-agent, 71 C# operations | N/A | Complete | None |
| Section 21 | serial disposable live validation | live harness assertions | `LIVE/summary.json` has `ok: true` | Complete | None |
| Section 22 | migration docs, README, Skill, settings/RPC/session docs, changelogs | documentation/Skill tests and repository check | persistent editability documented | Complete | None |
| Section 23 | implementation was decomposed by core, UI/API, evaluator, preflight, guarded writes, and rollout slices | focused suites by slice | staged live scenarios | Complete | No commit requested |
| Section 24 | every Definition of Done gate is directly covered above | final validation logs | final live cleanup/lock/quarantine evidence | Complete | None |
| Section 25 | release API, missing Diagram, atomic contract, footer/settings/session, timeout, and rendering investigations concluded in Section 25.1 | focused investigation tests and C# selftest | persistent editability and failure evidence | Complete | None |

### 26.6 Final conclusion

All implementation, live-validation, cleanup, regression, packaging, and audit requirements are complete. No commit was created. The only persistent external effects are the explicitly listed editable fixture states; no test method, smoke root, scheduler job, CLI lock, or mutation quarantine remains.

