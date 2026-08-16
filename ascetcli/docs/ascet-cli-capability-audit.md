# ASCET CLI Capability Audit

**Date:** 2026-04-04

**Source of truth for this audit:**
- [cli-catalog.json](/E:/Rep/AscetAgent/src/ascetcli/contracts/cli-catalog.json)
- [OperationRegistry.cs](/E:/Rep/AscetAgent/src/ascetcli/src/AscetCli/Routing/OperationRegistry.cs)
- [ExecCommand.cs](/E:/Rep/AscetAgent/src/ascetcli/src/AscetCli/Commands/ExecCommand.cs)
- [build-ascet-csharp.ps1](/E:/Rep/AscetAgent/src/ascetcli/scripts/build-ascet-csharp.ps1)
- standalone command usage strings from `src/ascetcli/src/AscetCli/*.cs`

This document is the current capability audit for the ASCET CLI surface. It is intended to be the clean replacement for older or partially stale references when deciding what Codex can safely use.

## Scope

This audit covers the public ASCET command surface declared in `cli-catalog.json`, plus the helper executables that still matter for diagnostics or internal runtime plumbing.

Current public command count: `56`

## Public Execution Model

- The public contract truth lives in [cli-catalog.json](/E:/Rep/AscetAgent/src/ascetcli/contracts/cli-catalog.json), not in `Foo.exe` naming conventions.
- `AscetCli.exe exec ...` is only used for operations that are actually registered in [OperationRegistry.cs](/E:/Rep/AscetAgent/src/ascetcli/src/AscetCli/Routing/OperationRegistry.cs) and implemented in [ExecCommand.cs](/E:/Rep/AscetAgent/src/ascetcli/src/AscetCli/Commands/ExecCommand.cs).
- `AscetCli.exe selftest ...` and `AscetCli.exe benchmark ...` are public unified subcommands.
- Every public command is now modeled as a routed `AscetCli.exe` entrypoint in the public contracts. Helper executables may still exist internally as proxy targets or diagnostics helpers, but they are no longer the public contract surface.

### Unified Public Commands Today

All public ASCET commands in `cli-catalog.json` now route through `AscetCli.exe` using `exec`, `batch`, `selftest`, or `benchmark` public subcommands.

## Capability Matrix

| Capability | Current CLI Coverage | Status |
|---|---|---|
| Browse folder tree | `AscetCli.exe exec list_folders` | Yes |
| Create folder path recursively | `AscetCli.exe exec create_folder` | Yes |
| List components in a scope | `AscetCli.exe exec list_components` | Yes |
| Resolve fuzzy component targets | `AscetCli.exe exec resolve_component` | Yes |
| Read component summary | `AscetCli.exe exec read_component_summary` | Yes |
| Read component internals | `AscetCli.exe exec read_component_children` | Yes |
| Read component snapshot | `AscetCli.exe exec read_component_snapshot` | Yes |
| Read component code broadly | `AscetCli.exe exec read_component_code` | Yes |
| Read exact method code | `AscetCli.exe exec read_method_code` | Yes |
| List methods for a component | `AscetCli.exe exec list_methods` | Yes |
| Read C header or external C code precisely | `AscetCli.exe exec read_text_code` | Yes |
| Read implementation tree | `AscetCli.exe exec read_implementation` | Yes |
| Search elements or signals globally | `AscetCli.exe exec find_elements` | Yes |
| Read element-level refs view | `AscetCli.exe exec read_element_refs` | Yes |
| Read outgoing component refs | `AscetCli.exe exec read_component_refs`, `AscetCli.exe exec read_references` | Yes |
| Read incoming or reverse component refs | `AscetCli.exe exec read_component_used_by` | Yes |
| Show mixed occurrence view | `AscetCli.exe exec show_occurrences` | Yes |
| Component-level diff | `AscetCli.exe exec diff_component_snapshot` | Yes |
| Method-level diff | `AscetCli.exe exec diff_method_code` | Yes |
| Class-specific summary or snapshot | `AscetCli.exe exec read_class_summary`, `AscetCli.exe exec read_class_snapshot` | Yes |
| Module-specific summary or snapshot | `AscetCli.exe exec read_module_summary`, `AscetCli.exe exec read_module_snapshot` | Yes |
| State-machine-specific summary or snapshot | `AscetCli.exe exec read_state_machine_summary`, `AscetCli.exe exec read_state_machine_snapshot` | Yes |
| Specialized block diagram read | `AscetCli.exe exec read_block_diagram` | Yes |
| Specialized state machine semantic read | `AscetCli.exe exec read_state_machine` | Yes |
| Specialized state machine flow read | `AscetCli.exe exec read_state_machine_flow` | Yes |
| Module closure read | `AscetCli.exe exec read_module_closure` | Yes |
| Element spec read or diff | `AscetCli.exe exec read_element_catalog`, `AscetCli.exe exec diff_element_spec` | Yes |
| Project formula read or diff | `AscetCli.exe exec read_project_formulas`, `AscetCli.exe exec diff_project_formulas` | Yes |
| Generic method write | `AscetCli.exe exec set_method_code` | Yes |
| Create component | `AscetCli.exe exec create_component` | Yes |
| Create method | `AscetCli.exe exec create_method` | Yes |
| Delete component | `AscetCli.exe exec delete_component` | Yes |
| Delete method | `AscetCli.exe exec delete_method` | Yes |
| Class method write | `AscetCli.exe exec set_class_method_code` | Yes |
| Module write | `AscetCli.exe exec set_module_code` | Yes |
| State-machine behavior write | `AscetCli.exe exec set_state_machine_code` | Yes |
| Element spec apply | `AscetCli.exe exec apply_element_spec` | Yes |
| Project formula apply | `AscetCli.exe exec apply_project_formula` | Yes |

## Recommended Agent Workflow Coverage

| Agent need | Recommended CLI |
|---|---|
| Start from database structure | `AscetCli.exe exec list_folders`, `AscetCli.exe exec list_components` |
| Resolve a target component | `AscetCli.exe exec resolve_component` |
| Understand a component quickly | `AscetCli.exe exec read_component_summary`, `AscetCli.exe exec read_component_children` |
| Understand code and implementation | `AscetCli.exe exec read_method_code`, `AscetCli.exe exec read_text_code`, `AscetCli.exe exec read_implementation` |
| Find a signal or element globally | `AscetCli.exe exec find_elements`, `AscetCli.exe exec show_occurrences` |
| Understand dependencies | `AscetCli.exe exec read_component_refs`, `AscetCli.exe exec read_component_used_by`, `AscetCli.exe exec read_element_refs` |
| Compare before or after | `AscetCli.exe exec diff_method_code`, `AscetCli.exe exec diff_component_snapshot` |
| Create and remove scaffolding safely | `AscetCli.exe exec create_folder`, `AscetCli.exe exec create_component`, `AscetCli.exe exec create_method`, `AscetCli.exe exec delete_component`, `AscetCli.exe exec delete_method` |
| Perform controlled write | `AscetCli.exe exec set_method_code`, `AscetCli.exe exec set_module_code`, `AscetCli.exe exec set_state_machine_code`, apply CLIs |

## Command Contract Tables

### Discovery And Explorer

| CLI | Purpose | Usage | Output |
|---|---|---|---|
| `AscetCli.exe exec list_folders` | List folder tree | `[--root <folder-path>] [--depth <n>] [--json]` | Text, JSON |
| `AscetCli.exe exec list_components` | List database items and folders in a folder | `<folder-path> [--kind <all|folder|class|module|statemachine>] [--language-kind <all|BDE|ESDL|C|Unknown>] [--query <text>] [--limit <n>] [--recursive] [--json]` | Text, JSON |
| `AscetCli.exe exec list_diagrams` | List diagrams for a component | `<component-path> [--json]` | Text, JSON |
| `AscetCli.exe exec resolve_component` | Resolve a fuzzy component query | `<query> [--scope <folder-path>] [--kind <class|module|statemachine>] [--limit <n>] [--json]` | Text, JSON |
| `AscetCli.exe exec read_component_summary` | Compact component summary | `<component-path> [--json]` | Text, JSON |
| `AscetCli.exe exec read_component_children` | Grouped component internals | `<component-path> [--group <all|methods|elements|components|arrays|parameters|variables|diagrams>] [--json]` | Text, JSON |
| `AscetCli.exe exec read_component_refs` | Outgoing refs and trace | `<component-path> [--direction <out|both>] [--depth <n>] [--json]` | Text, JSON |
| `AscetCli.exe exec read_component_used_by` | Reverse refs within a bounded scope | `<component-path> --scope <folder-path> [--kind <class|module|statemachine>] [--limit <n>] [--json]` | Text, JSON |
| `AscetCli.exe exec diff_component_snapshot` | Explorer-oriented component diff | `<left-component-path> <right-component-path> [--changes-only] [--json]` | Text, JSON |
| `AscetCli.exe exec find_elements` | Global element or signal search | `<query> [--scope <folder-path>] [--kind <class|module|statemachine>] [--group <methods|components|arrays|parameters|variables|all>] [--limit <n>] [--cursor <n>] [--json]` | Text, JSON |
| `AscetCli.exe exec list_methods` | List component methods | `<component-path> [--json]` | Text, JSON |
| `AscetCli.exe exec read_method_code` | Read a single method body | `<component-path> <method-name> [--json]` | Text, JSON |
| `AscetCli.exe exec diff_method_code` | Diff one method between two components | `<left-component-path> <right-component-path> <method-name> [--changes-only] [--json]` | Text, JSON |
| `AscetCli.exe exec read_text_code` | Read C header and external C code | `<component-path> [--section <header|external-c|all>] [--json]` | Text, JSON |
| `AscetCli.exe exec read_element_refs` | View refs for one element within a component | `<component-path> <element-name> [--json]` | Text, JSON |
| `AscetCli.exe exec show_occurrences` | Mixed occurrence view over component and element matches | `<query> [--scope <folder-path>] [--limit <n>] [--cursor <n>] [--json]` | Text, JSON |

### Generic Read Surfaces

| CLI | Purpose | Usage | Output |
|---|---|---|---|
| `AscetCli.exe exec read_component_snapshot` | Unified snapshot across component kinds | `<component-path> [--trace-depth <n>] [--json]` | Text, JSON |
| `AscetCli.exe exec read_component_code` | Broad component code read | `<component-path>` | Text, JSON |
| `AscetCli.exe exec read_implementation` | Read implementation data | `<component-path> [--list] [--default|--class-impl|--impl <name>] [--json]` | Text, JSON |
| `AscetCli.exe exec read_references` | Read direct component reference graph | `<component-path> [--json]` | Text, JSON |
| `AscetCli.exe exec read_block_diagram` | Read a named block diagram | `<component-path> <diagram-name> [--json]` | Text, JSON |
| `AscetCli.exe exec read_element_catalog` | Read element catalog or element spec view | `<component-path> [--json]` | Text, JSON |
| `AscetCli.exe exec read_project_formulas` | Read project formulas | `<project-path> [--json]` | Text, JSON |

### Class-Specific

| CLI | Purpose | Usage | Output |
|---|---|---|---|
| `AscetCli.exe exec read_class_summary` | Class summary | `<class-path> [--json]` | Text, JSON |
| `AscetCli.exe exec read_class_snapshot` | Class snapshot | `<class-path> [--json]` | Text, JSON |
| `AscetCli.exe exec diff_class` | Class diff | `<left-class-path> <right-class-path> [--json] [--changes-only]` | Text, JSON |
| `AscetCli.exe exec set_class_method_code` | Class method write | `<class-path> <method-name> <code-file> [--verify-readback] [--json]` | Text, JSON |

### Module-Specific

| CLI | Purpose | Usage | Output |
|---|---|---|---|
| `AscetCli.exe exec read_module_summary` | Module summary | `<module-path> [--json]` | Text, JSON |
| `AscetCli.exe exec read_module_snapshot` | Module snapshot | `<module-path> [--json]` | Text, JSON |
| `AscetCli.exe exec read_module_closure` | Module closure and dependency expansion | `<module-path> [--max-depth <n>] [--json]` | Text, JSON |
| `AscetCli.exe exec diff_module` | Module diff | `<left-module-path> <right-module-path> [--json] [--changes-only]` | Text, JSON |
| `AscetCli.exe exec set_module_code` | Module write entry | `<module-path> <set-method|set-header|set-external-c-code> <method-name?> <code-file> [--verify-readback] [--json]` | Text, JSON |

### State Machine-Specific

| CLI | Purpose | Usage | Output |
|---|---|---|---|
| `AscetCli.exe exec read_state_machine_summary` | State machine summary | `<state-machine-path> [--json]` | Text, JSON |
| `AscetCli.exe exec read_state_machine_snapshot` | State machine snapshot | `<state-machine-path> [--json]` | Text, JSON |
| `AscetCli.exe exec read_state_machine` | Lower-level state machine read | `<component-path> [--json]` | Text, JSON |
| `AscetCli.exe exec read_state_machine_flow` | State machine flow read | `<component-path> [--trace-depth <n>] [--detail-level summary|full] [--json]` | Text, JSON |
| `AscetCli.exe exec diff_state_machine` | Lower-level state machine diff | `<left-component-path> <right-component-path> [--json] [--changes-only]` | Text, JSON |
| `AscetCli.exe exec diff_state_machine_domain` | Domain-level state machine diff | `<left-state-machine-path> <right-state-machine-path> [--json] [--changes-only]` | Text, JSON |
| `AscetCli.exe exec set_state_machine_code` | State machine write entry | `<state-machine-path> <operation> <method-name?> <code-file> [--verify-readback] [--json]` | Text, JSON |

### Generic Write Surfaces

| CLI | Purpose | Usage | Output |
|---|---|---|---|
| `AscetCli.exe exec create_component` | Create a new component shell | `<component-path> --kind <class|module|statemachine> [--language <ESDL|BDE|C>] [--if-exists <fail|return-existing>] [--verify-readback] [--rollback-on-failure] [--json]` | Text, JSON |
| `AscetCli.exe exec create_folder` | Create a folder path and any missing parent folders | `<folder-path> [--verify-readback] [--json]` | Text, JSON |
| `AscetCli.exe exec create_method` | Create a new method in an existing component | `<component-path> <method-name> --method-kind <abstract|process|action|condition|trigger> [--diagram <name>] [--if-exists <fail|return-existing>] [--verify-readback] [--rollback-on-failure] [--json]` | Text, JSON |
| `AscetCli.exe exec delete_component` | Delete an existing component | `<component-path> [--if-missing <fail|ignore>] [--verify-readback] [--json]` | Text, JSON |
| `AscetCli.exe exec delete_method` | Delete an existing method | `<component-path> <method-name> [--if-missing <fail|ignore>] [--verify-readback] [--json]` | Text, JSON |
| `AscetCli.exe exec set_method_code` | Generic method write | `<component-path> <method-name> <code-file> [--verify-readback]` | Text, JSON |
| `AscetCli.exe exec apply_element_spec` | Apply element spec | `<component-path> <spec-file> [--project-path <project-path>] [--mode restore] [--delete-missing] [--recreate-incompatible] [--verify-readback] [--json]` | Text, JSON |
| `AscetCli.exe exec diff_element_spec` | Diff element spec against live component | `<component-path> <spec-file> [--json] [--changes-only]` | Text, JSON |
| `AscetCli.exe exec apply_project_formula` | Apply project formula spec | `<project-path> <spec-file> [--mode restore] [--delete-missing] [--verify-readback] [--json]` | Text, JSON |
| `AscetCli.exe exec diff_project_formulas` | Diff project formula spec | `<left-project-path> <right-project-path> [--json] [--changes-only]` | Text, JSON |

### Rollback Semantics

| CLI | Rollback-related behavior |
|---|---|
| `AscetCli.exe exec create_component` | Supports `--rollback-on-failure`; if the component shell is created and a later step in the same command fails, the implementation attempts to delete the just-created component automatically |
| `AscetCli.exe exec create_method` | Supports `--rollback-on-failure`; if the method is created and a later step in the same command fails, the implementation attempts to delete the just-created method automatically |
| `AscetCli.exe exec delete_component` | Serves as the component rollback primitive for create flows |
| `AscetCli.exe exec delete_method` | Serves as the method rollback primitive for create flows |

Notes:
- The rollback path is intended only for the object created in the current command invocation.
- Creation/deletion state changes should still be inspected via existing read CLIs:
- component existence: `AscetCli.exe exec resolve_component`, `AscetCli.exe exec read_component_summary`
- method existence: `AscetCli.exe exec list_methods`, `AscetCli.exe exec read_method_code`
- Live creation, deletion, and rollback verification must remain serial-only.

### Diagnostics, Example, And Ops Helpers

| CLI | Purpose | Usage | Output |
|---|---|---|---|
| `AscetReadOnlyExample.exe` | Minimal read-only sample against current database | No args | Text only |
| `AscetReadDomainQuickCheck.exe` | Lightweight domain check | No formal usage string in source; zero-arg helper | Text only |
| `AscetReadDomainDeepCheck.exe` | Deeper domain check | No formal usage string in source; zero-arg helper | Text only |
| `AscetReadDomainSmoke.exe` | Smoke validation helper | No formal usage string in source; zero-arg helper | Text only |
| `AscetWorker.exe` | Worker helper for legacy concurrency mode and job mode | Legacy positional args or `run-job <job-file>` | Text, JSON-like payloads |
| `AscetOrchestrator.exe` | Multi-process worker orchestration helper | Positional args: `readerCount writerCount iterations` | Text |
| `AscetThreadHarness.exe` | Thread-based worker harness | Positional args: `readerCount writerCount iterations joinTimeoutMs` | Text |

## Output Mode Summary

| Output mode | Commands |
|---|---|
| Text only | `AscetReadOnlyExample.exe`, domain diagnostics, orchestration helpers |

## Internal Helpers

These executables can still exist in the build output for diagnostics, orchestration, or proxy compatibility, but they are not part of the public contract surface:

- `AscetReadOnlyExample.exe`
- `AscetReadDomainQuickCheck.exe`
- `AscetReadDomainDeepCheck.exe`
- `AscetReadDomainSmoke.exe`
- `AscetWorker.exe`
- `AscetOrchestrator.exe`
- `AscetThreadHarness.exe`
| Text and JSON | Most read/diff/apply/set explorer commands |
| Internal JSON or structured stdout for runtime/worker plumbing | `AscetWorker.exe` job mode |

## Current Observations

| Observation | Detail |
|---|---|
| Explorer coverage is now strong | Tree navigation, component discovery, signal search, refs, used-by, method inventory, method diff, text code, occurrences are all present |
| Unified public routing is now the public model | Public commands are modeled as `AscetCli.exe` routes in contracts; helper executables may still exist internally as proxy or diagnostics targets |
| Reverse dependency lookups are bounded by design | `AscetCli.exe exec read_component_used_by` requires `--scope` to prevent unbounded scans |
| Method-level workflows are now first-class | List, read, and diff method commands all exist |
| Creation and deletion are now first-class | Folder, component, and method creation/deletion CLIs now exist; component and method creation support rollback-on-failure |
| Old reference docs should not be treated as source of truth | This audit is aligned to the current build script and current CLI source files |

## Recommended Next Step

If this audit is accepted, the next maintenance step should be to:
- treat [cli-catalog.json](/E:/Rep/AscetAgent/src/ascetcli/contracts/cli-catalog.json) as the routing truth source
- keep this audit aligned with `OperationRegistry.cs` / `ExecCommand.cs` whenever a standalone public command graduates into a routed `AscetCli.exe` operation
