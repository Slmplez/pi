# Changelog

## [Unreleased]

### Breaking Changes

- Renamed the published ASCET Copilot packages from the `@zeerke` scope to `@vaf-agentworks` and pinned publishing to the internal `ascet-copilot-npm` Nexus registry.

- Replaced the public dependency-chain write surfaces with `ascet_edit.create_dependent_chain`; it creates or verifies missing/existing Provider, Imported, and Local Parameters, configures one explicit binding, and requires automatic readback while the legacy backends remain internal.
- Replaced public ASCET write control `executeWrite` with `intent: "preview" | "apply"`, removed public plan/commit and `planId` inputs, and moved `apply_element_spec` create/patch/upsert/restore semantics to `elementIntent`.

### Added

- Added the `ascet-engineering` Skill with bounded scope, signal-flow, ESDL, Element, Parameter, Dependency, planning, and guarded-write References.
- Added a project release Skill and deterministic preparation script for synchronized internal Nexus publication and compatible bundled dependency refreshes.

- Added one compact `ascet_search` tool backed by the ten native ASCET Search UI modes; model-facing calls use only `mode`, `q`, and optional `limit`.
- Simplified public `ascet_get` to bounded live `tree` and exact Project `formulas`; removed Catalog, observation, and relationship actions from the Agent-facing schema.
- Added task-scoped Observation delivery with inline JSON or NDJSON plus metadata for large results.
- Added mode-aware one-call guarded writes for `default`, `acceptEdits`, and `auto`, including fingerprinted approval, same-call revalidation, atomic editability acquisition, guarded batch execution, and normalized mutation result envelopes.

### Changed

- Simplified ASCET confirmation dialogs to show only the target, planned changes, and automatic verification.
- Reduced ASCET System and Tool Prompts to Skill routing and Descriptor-generated action guidance; model-facing schemas no longer accept `verifyReadback`.

- ASCET discovery now uses native `ascet_search`, exact `ascet_get`/`ascet_read`, and Pi `find`/`grep`/`read` without a persistent database index.
- Executed `ascet_edit` mutations now always perform mandatory action-specific readback verification and return normalized permission, preflight, editability, mutation, verification, Bridge lifecycle, and recovery feedback.
- Batch writes now evaluate complete aggregate target impact, re-prompt after one material scope change, acquire all required editability in the guarded backend session, and preserve per-item results.

### Fixed

- Fixed ASCET Read Tools to preserve large and empty results as machine-readable JSON, restore implementation and StateMachine detail modes, return complete dependency chains, and distinguish unavailable Project enumeration from empty dependency results.
- Fixed TCM-backed component editability so `ascet_edit` uses `ReserveItem` followed by `CreateEdition`, and reports a failed write when the component remains read-only.
- Fixed capability and readback failures to stop before approval, removed the fixed approval timeout, and made final rendering fail closed so `DONE` means only verified applied or no-op mutations.
- Fixed scoped permission rules for create operations to match the planned mutation target instead of the existing parent safety anchor.
- Fixed runtime ASCET mutation gating so existing-Component writes, commits, batches, dependency chains, and compensating writes require a fresh same-session editable state; preflight, plan, diff, and dry-run remain available, and blocked writes return `editable_write_gate_blocked`.
- Fixed exact-target Tool Descriptor routing so bounded tree discovery is optional when a path or OID is already validated, and clarified outgoing-reference and zero-edge BDE evidence limits.
- Fixed dependency-chain guidance and Runtime validation to require same-named Provider/Imported `P_` Parameters and a Consumer Local `C_` Parameter.
- Fixed Parameter naming guidance so `C_` applies only to Consumer Local Dependent Parameters, not Local State or Internal Variables.
- Fixed public schema validation to recognize literal values nested in `anyOf`/`oneOf`, so valid actions such as `ascet_scheduler_status` recovery are not rejected as unknown.
- Fixed the startup UI update checker to read `dist-tags.latest` from the internal Nexus registry and isolate cached results by registry URL.
- Fixed aggregate package publication to exclude generated `.tgz` files and prevent recursive tarball bundling.
- Fixed release packaging and cleanup-only validation to follow the current `ascet-engineering` Skill references and accept already-removed ASCET smoke targets.

- Fixed Bosch LLM Farm slow first-token requests to use effective provider-scoped 15-minute timeouts and five agent-level retries without showing intermediate retry errors.
- Fixed `ascet_get` `component_refs` name and scope filters being ignored.
- Fixed failed or unknown ASCET write outcomes retaining stale task-scoped observations when the mutation may already have started.

- Fixed ASCET tool results leaking runtime callbacks and AbortSignals into Pi Agent transport payloads, causing structured-clone failures after completed operations.

### Removed

- Removed the `ascet-implementation` Agent instead of retaining a thin Skill wrapper.
- Removed the dormant `ascet-full-check` Skill and its ASCET checker Agent profiles.

- Removed `ascet_index`, `ascet_search`, `ascet_explore`, P0/SQLite indexing, startup warmup, index footer, and background index refresh.
- Removed `read_project_formulas`; use `ascet_get` action `formulas` instead.
- Removed the standalone `ascet_verify` model tool; `ascet_edit` verifies executed writes automatically, while independent checks use `ascet_read` or `ascet_get.formulas`.
