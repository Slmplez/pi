# ASCET Import/Export And Dependency Tools Task Plan

Date: 2026-07-11

## Goal

为 ASCET Extension 增加一组新的 ASCET 工具能力：

- 读取 imported element 与 exported element 的匹配关系。
- 批量读取两个组件之间的 import/export 对应关系。
- 规划 element dependency 变更候选。
- 通过受控写入修改 element dependency。

所有能力必须继续走现有 ASCET tools 工具族：模型侧只暴露 canonical tools，不新增独立细粒度工具；PI 侧所有真实 CLI 调用必须经过 `runAscetCliJson`、`ascet-scheduler`、`ascet.toolapi.global`、CLI lock 和 operation-health。

## Scope

### Add To `ascet_read`

```ts
{
  action: "read_import_export_match";
  importerComponentPath: string;
  exporterComponentPath: string;
  elementName: string;
}

{
  action: "read_import_export_matches";
  importerComponentPath: string;
  exporterComponentPath: string;
}

{
  action: "plan_element_dependency";
  targetPath: string;
  elementName?: string;
  targetKind?: "auto" | "component" | "folder" | "project";
}
```

### Add To `ascet_write`

```ts
{
  action: "set_element_dependency";
  targetPath: string;
  elementName: string;
  dependency: "dependent" | "independent";
  targetKind?: "auto" | "component" | "folder";
  match?: "exact" | "all";
  dryRun?: boolean;
  backupDir?: string;
  verifyReadback?: boolean;
  intent: "preview" | "apply";
}
```

## Source And Target Paths

Source reference:

- `E:\Rep\AscetCopolit\docs\agent-tools-source\README.md`
- `E:\Rep\AscetCopolit\src\AscetCopolit\AscetImportExportMatchRead.cs`
- `E:\Rep\AscetCopolit\src\AscetCli\AscetReadImportExportMatch.cs`
- `E:\Rep\AscetCopolit\src\AscetCli\AscetReadImportExportMatches.cs`
- `E:\Rep\AscetCopolit\src\AscetCli\AscetElementDependencyXml.cs`
- `E:\Rep\AscetCopolit\src\AscetCli\AscetPlanElementDependency.cs`
- `E:\Rep\AscetCopolit\src\AscetCli\AscetSetElementDependency.cs`

Target implementation:

- Backend root: `E:\Rep\AscetAgent\src\ascetcli`
- PI extension root: `E:\Rep\AscetAgent\PI\packages\ascet-extension`

## Architecture Rules

- 不在 PI 注册 `AscetReadImportExportMatch.exe`、`AscetPlanElementDependency.exe`、`AscetSetElementDependency.exe` 这类独立工具。
- 不从 PI 直接调用独立 exe。
- 后端能力先进入 unified CLI：`AscetCli.exe exec <operation> ... --json`。
- PI wrapper 只能调用 `runAscetCliJson`。
- `runAscetCliJson` 必须提交到 `ascet-scheduler`。
- 所有 ToolAPI 调用必须共享 `ascet.toolapi.global` 串行资源。
- 写操作必须保留 preflight 和 UI confirmation。
- `set_element_dependency` 的真实写入默认 `verifyReadback=true`。
- `targetKind="folder"` 的写入必须显式传 `match="all"`。
- 第一版新 backend operation 先走 one-shot / legacy lane，不提前声明 host eligible。

## Required Return Structures

### Unified Read Envelope

```json
{
  "ok": true,
  "result": {},
  "meta": {
    "mode": "exec",
    "operation": "read_import_export_match"
  }
}
```

Error:

```json
{
  "ok": false,
  "result": null,
  "error": {
    "code": "element_not_found",
    "message": "Element 'speed' was not found in component 'DEMO\\Class_ESDL_1'.",
    "operation": "read_import_export_match"
  },
  "meta": {
    "mode": "exec",
    "operation": "read_import_export_match"
  }
}
```

### `read_import_export_match.result`

```json
{
  "importer": "DEMO\\Class_ESDL_1",
  "exporter": "DEMO\\Class_ESDL_2",
  "element": "speed",
  "import": {
    "scope": "imported",
    "type": "ScalarElement",
    "imported": true
  },
  "match": {
    "exists": true,
    "name": "speed",
    "scope": "exported",
    "type": "ScalarElement",
    "owner": "DEMO\\Class_ESDL_2"
  },
  "summary": "imported speed matched exported speed"
}
```

### `read_import_export_matches.result`

```json
{
  "importer": "DEMO\\Class_ESDL_1",
  "exporter": "DEMO\\Class_ESDL_2",
  "count": 2,
  "matches": [
    {
      "element": "speed",
      "import": {
        "scope": "imported",
        "imported": true
      },
      "match": {
        "exists": true,
        "name": "speed"
      }
    }
  ],
  "summary": "2 imported elements inspected"
}
```

### `plan_element_dependency.result`

```json
{
  "target": "DEMO\\DiscreteRiccatiSolver",
  "kind": "component",
  "element": "B01",
  "count": 1,
  "matches": [
    {
      "component": "DEMO\\DiscreteRiccatiSolver",
      "element": "B01",
      "kind": "parameter",
      "scope": "local",
      "schema": "scalar-parameter-dependent-flag",
      "dependency": "independent",
      "supported": true
    }
  ],
  "issues": [],
  "summary": "1 dependency candidate found"
}
```

### `set_element_dependency.result`

```json
{
  "operationName": "set_element_dependency",
  "sequenceNumber": 1,
  "writeSucceeded": true,
  "summary": "set B01 dependency to dependent",
  "payload": {
    "target": "DEMO\\DiscreteRiccatiSolver",
    "kind": "component",
    "element": "B01",
    "requested": "dependent",
    "write": {
      "dryRun": false,
      "succeeded": true,
      "changed": 1
    },
    "dependency": {
      "before": "independent",
      "after": "dependent"
    },
    "backup": "E:\\Rep\\AscetCopolit\\output\\ascet-xml\\backup-DEMO_DiscreteRiccatiSolver-...",
    "plan": {
      "count": 1,
      "matches": []
    }
  },
  "verification": {
    "requested": true,
    "attempted": true,
    "succeeded": true,
    "summary": "dependency_readback_matches",
    "details": {
      "after": "dependent"
    }
  }
}
```

### PI Details Shape

```ts
{
  tool: "ascet_read" | "ascet_write",
  action: "read_import_export_match" |
    "read_import_export_matches" |
    "plan_element_dependency" |
    "set_element_dependency",
  command: {
    logicalCommandId: "AscetReadImportExportMatch" |
      "AscetReadImportExportMatches" |
      "AscetPlanElementDependency" |
      "AscetSetElementDependency",
    backendCommandId: "AscetReadImportExportMatch" |
      "AscetReadImportExportMatches" |
      "AscetPlanElementDependency" |
      "AscetSetElementDependency",
    operation: "read_import_export_match" |
      "read_import_export_matches" |
      "plan_element_dependency" |
      "set_element_dependency"
  },
  diagnostics: {
    request: AscetCliRequest,
    exitCode: number | null,
    timedOut: boolean,
    stderr: string
  },
  outcome?: AscetToolOutcome
}
```

## Task List

### Phase 1 - Backend Read Capability

- [x] Write failing C# output tests for `read_import_export_match`.
- [x] Write failing C# output tests for `read_import_export_matches`.
- [x] Migrate/import read service from `AscetCopolit`.
- [x] Add `AscetCli.exe exec read_import_export_match ... --json`.
- [x] Add `AscetCli.exe exec read_import_export_matches ... --json`.
- [x] Ensure successful read responses use `ok/result/meta`.
- [x] Ensure read errors use `ok=false/result=null/error/meta`.
- [x] Run `.\src\ascetcli\scripts\test-ascet-csharp.ps1`.

### Phase 2 - Backend Dependency Plan/Write

- [x] Write failing C# output tests for `plan_element_dependency`.
- [x] Write failing C# output tests for `set_element_dependency`.
- [x] Migrate XML dependency helper from `AscetCopolit`.
- [x] Add target resolver for component/folder/project planning.
- [x] Add `AscetCli.exe exec plan_element_dependency ... --json`.
- [x] Add `AscetCli.exe exec set_element_dependency ... --json`.
- [x] Keep `project` target read-only for planning; do not support project writes.
- [x] Ensure `dryRun=true` never imports patched XML.
- [x] Ensure real writes create backup artifacts.
- [x] Ensure real writes support readback verification.
- [x] Run `.\src\ascetcli\scripts\test-ascet-csharp.ps1`.

### Phase 3 - Operation Registry And Contracts

- [x] Register `read_import_export_match` in `OperationRegistry`.
- [x] Register `read_import_export_matches` in `OperationRegistry`.
- [x] Register `plan_element_dependency` in `OperationRegistry`.
- [x] Register `set_element_dependency` in `OperationRegistry`.
- [x] Mark read operations as conservative one-shot read lane.
- [x] Mark `set_element_dependency` as serial write lane.
- [x] Generate ASCET contracts.
- [x] Verify `contracts\cli-catalog.json` contains all four operation ids.
- [x] Verify read/write family contracts include the new commands.

### Phase 4 - Backend Build And PI Asset Refresh

- [x] Update C# build script source list if required.
- [x] Run `.\src\ascetcli\scripts\build-ascet-csharp.ps1 -BuildMode core`.
- [x] Verify rebuilt `AscetCli.exe capabilities --json`.
- [x] Run from PI: `npm --workspace @ascet/pi-extension run copy-assets`.
- [x] Verify PI bundled `ascet-cli\contracts\cli-catalog.json` contains all new operations.
- [x] Verify PI bundled `ascet-cli\bin\AscetCli.exe` is updated.

### Phase 5 - PI Read Wrappers

- [x] Add wrapper tests in `E:\Rep\AscetAgent\PI\packages\coding-agent\test\ascet-extension-readonly-tools.test.ts`.
- [x] Create `E:\Rep\AscetAgent\PI\packages\ascet-extension\src\read-import-export-match.ts`.
- [x] Create `E:\Rep\AscetAgent\PI\packages\ascet-extension\src\plan-element-dependency.ts`.
- [x] Build args for `exec read_import_export_match ... --json`.
- [x] Build args for `exec read_import_export_matches ... --json`.
- [x] Build args for `exec plan_element_dependency ... --json`.
- [x] Call `runAscetCliJson` with `toolName="ascet_read"`.
- [x] Call `runAscetCliJson` with read `jobKind`.
- [x] Run targeted read wrapper tests.

### Phase 6 - PI Write Wrapper And Guardrails

- [x] Add wrapper tests in `E:\Rep\AscetAgent\PI\packages\coding-agent\test\ascet-extension-write-tools.test.ts`.
- [x] Create `E:\Rep\AscetAgent\PI\packages\ascet-extension\src\set-element-dependency.ts`.
- [x] Build args for `exec set_element_dependency ... --json`.
- [x] Use existing write preflight/confirmation helper.
- [x] Default `verifyReadback=true` for approved real writes.
- [x] Support `dryRun`, `backupDir`, `targetKind`, and `match`.
- [x] Reject folder writes unless `match="all"`.
- [x] Call `runAscetCliJson` with `toolName="ascet_write"`.
- [x] Call `runAscetCliJson` with write `jobKind`.
- [x] Run targeted write wrapper tests.

### Phase 7 - Canonical Tool Integration

- [x] Add new read actions to `tools/read/schema.ts`.
- [x] Add read dispatch cases in `tools/read/definition.ts`.
- [x] Add read formatter cases.
- [x] Update read prompt guidance.
- [x] Add `set_element_dependency` to `tools/write.ts`.
- [x] Add write dispatch case.
- [x] Update write prompt guidance.
- [x] Add route manifest entries for all four operations.
- [x] Run `ascet-extension-status`, read, and write targeted tests.

### Phase 8 - Scheduler Verification

- [x] Verify wrappers pass scheduler metadata through `runAscetCliJson`.
- [x] Verify read actions use `jobKind="read"`.
- [x] Verify write action uses `jobKind="write"`.
- [x] Add or extend scheduler assertions if current tests do not lock `ascet.toolapi.global`.
- [x] Run targeted scheduler/status tests.

### Phase 9 - Documentation

- [x] Update `E:\Rep\AscetAgent\PI\packages\ascet-extension\README.md`.
- [x] Document all four new canonical actions.
- [x] Document scheduler rule: all ToolAPI-backed calls go through `ascet-scheduler`.
- [x] Document write safety: preflight, UI confirmation, folder `match="all"`, readback.
- [x] Document example payloads for read and write in this task plan.

### Phase 10 - Live Verification

- [x] Open or connect to an ASCET database containing a known demo component.
- [x] Run direct backend `plan_element_dependency` smoke.
- [x] Run PI `ascet_read.read_import_export_match` smoke.
- [x] Run PI `ascet_read.read_import_export_matches` smoke.
- [x] Run PI `ascet_read.plan_element_dependency` smoke.
- [x] Run PI `ascet_write.set_element_dependency` with `dryRun=true`.
- [x] Run real guarded write smoke on disposable target `DEMO\__pi_write_smoke__\PiSmoke`.
- [x] Verify no stale `AscetCli*`, `AscetSet*`, or `AscetRead*` process remains.

## Verification Commands

Backend:

```powershell
cd E:\Rep\AscetAgent
.\src\ascetcli\scripts\build-ascet-csharp.ps1 -BuildMode core
.\src\ascetcli\scripts\test-ascet-csharp.ps1
& "E:\Rep\AscetAgent\src\ascetcli\output\ascet-csharp\bin\AscetCli.exe" capabilities --json
```

PI:

```powershell
cd E:\Rep\AscetAgent\PI
npm --workspace @ascet/pi-extension run copy-assets
npm --workspace @earendil-works/pi-coding-agent test -- test/ascet-extension-status.test.ts test/ascet-extension-scheduler.test.ts test/ascet-extension-readonly-tools.test.ts test/ascet-extension-write-tools.test.ts
npx biome check packages/ascet-extension/src/read-import-export-match.ts packages/ascet-extension/src/plan-element-dependency.ts packages/ascet-extension/src/set-element-dependency.ts packages/ascet-extension/src/tools/read/definition.ts packages/ascet-extension/src/tools/read/schema.ts packages/ascet-extension/src/tools/write.ts
```

Live smoke:

```powershell
cd E:\Rep\AscetAgent\PI
npm run smoke:ascet-extension
$env:ASCET_WRITE_SMOKE = "1"
npm run smoke:ascet-extension:write
```

Optional direct backend dependency smoke:

```powershell
& "E:\Rep\AscetAgent\src\ascetcli\output\ascet-csharp\bin\AscetCli.exe" exec plan_element_dependency "DEMO\DiscreteRiccatiSolver" "B01" --target-kind component --json
```

## Current Status

Completed:

- `ascet_read` schema/dispatch/prompt support for:
  - `read_import_export_match`
  - `read_import_export_matches`
  - `plan_element_dependency`
- `ascet_write` schema/dispatch/prompt support for:
  - `set_element_dependency`
- Backend C# services, exec handlers, operation registry entries, build script entries, generated contracts, and bundled PI assets are in place.
- PI wrappers route through `runAscetCliJson`.
- Write wrapper keeps preflight and approval path.
- Folder write guardrail requires `match="all"`.
- Scheduler tests prove dependency plan/write calls acquire the PI CLI lock and enter `ascet.toolapi.global`.
- Live smoke covers all four new actions, scheduler recover, lock release, and operation health.
- Disposable write smoke passed on `DEMO\__pi_write_smoke__\PiSmoke`.
- Targeted backend and PI tests pass:

```text
C# focused smoke: passed
4 PI test files passed
61 PI tests passed
```

Known full-suite notes:

- `npm test` was executed for the PI monorepo and failed on existing/non-ASCET environment issues: missing Git Bash for bash-tool tests, Windows path expectation drift, external provider 401 fixture attempts, and `packages/tuiengine` bun glob/type setup.
- `npx tsgo --noEmit --pretty false` was executed and still reports existing monorepo type debt. Filtered output for the new dependency/scheduler files is clean after adding scheduler option typings.

## Acceptance Criteria

- [x] `AscetCli.exe capabilities --json` advertises all four operations.
- [x] Generated contracts include all four command JSON files.
- [x] PI bundled catalog includes all four operation ids.
- [x] `ascet_read` exposes the three new actions only through the canonical tool.
- [x] `ascet_write` exposes `set_element_dependency` only through the canonical tool.
- [x] PI details include `tool`, `action`, `command`, `diagnostics`, and write `outcome`.
- [x] All live calls go through `ascet-scheduler`.
- [x] Write calls require preflight/confirmation unless explicitly approved.
- [x] Folder writes require `match="all"`.
- [x] Dependency writes default to `verifyReadback=true` for approved real writes.
- [x] Backend tests pass.
- [x] PI targeted tests pass.
- [x] Read-only live smoke passes.
- [x] Dependency dry-run live smoke passes.
- [x] Scheduler recover live smoke passes.
- [x] Disposable write live smoke passes.
