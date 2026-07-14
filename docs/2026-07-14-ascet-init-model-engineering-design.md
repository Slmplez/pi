# PI ASCET `/ascet-init` Model Engineering Design

Status: proposed
Date: 2026-07-14
Scope: `PI/packages/ascet-extension`

## 1. Problem

`/ascet-init` currently creates or reuses `.ascet/rules`, loads two manifest
entrypoints, builds a large onboarding prompt, and sends it to the agent. That
is useful, but it treats an ASCET database too much like a generic repository.

ASCET work is model-based engineering, closer to Simulink than normal source
code editing. The first safe question is not "where is the code?" The first
safe question is "where is the assembly entry point, how do signals flow, where
are interface adapters, and which parameters are only local hints?"

The command should therefore guide the agent to understand an ASCET project in
this order:

1. assembly entry point
2. signal and interface adaptation path
3. parameter and implementation-data hints
4. representative implementation details

## 2. Goals

- Make `/ascet-init` follow `/init` style: clarify, explore, propose, then
  update a small context section.
- Prefer ASCET engineering structure detection before asking for scope.
- Detect the common layout where an engineering unit has a `components` folder
  containing a Project anchor plus `XPASS` and `ASW2ASW` modules.
- Treat parent-level parameter areas as useful hints, not as a complete
  parameter inventory.
- Keep the workflow bounded and sampled. Never default to a full database scan.
- Keep ASCET rules command-scoped. Do not make `.ascet/rules` part of generic
  session context loading.
- Ensure generated prompts use PI canonical tools such as `ascet_explore`,
  `ascet_search`, and `ascet_read`, not legacy `Ascet*Tool` names.

## 3. Non-Goals

- Do not make the extension command directly execute the whole ASCET survey.
  The command should still send a structured prompt to the agent.
- Do not write or mutate ASCET database objects during init.
- Do not generate a semantic index or exhaustive inventory.
- Do not add `/ascet init` space-command compatibility in this change.
- Do not put vendor documentation or long ASCET references into `AGENTS.md` or
  `agent.md`.
- Do not load all manifest `always_load` files until they are PI-tool-name safe.

## 4. Reference Model: `/init`

The builtin `/init` command is the right UX pattern:

- It creates or updates a project guidance file.
- It asks when information is not safely inferable.
- It writes only high-value context, not obvious or exhaustive details.
- It proposes before writing.
- It keeps long reference material out of the always-loaded file.

`/ascet-init` should copy those principles, but specialize them for ASCET model
engineering. It should not ask about generic skills, hooks, or personal
instruction files.

## 5. Command Shape

Supported forms:

```text
/ascet-init
/ascet-init database
/ascet-init folder <path>
/ascet-init project <name-or-path>
```

Explicit command arguments always win. No-argument mode starts with ASCET
engineering layout detection, not immediate scope selection.

Invalid arguments should fail early with a usage notification and should not
scaffold project rules or send a prompt.

## 6. Runtime Workflow

The command-level flow is deterministic:

```text
executeAscetInitCommand(args, ctx, pi)
  parse args
  if invalid:
    notify usage and return
  ensure .ascet/rules scaffold
  load PI-safe init rule bundle
  build phased prompt
  send immediately if idle, otherwise queue as follow-up
```

The agent-level flow inside the generated prompt is:

```text
Phase 1: Resolve requested scope
  - explicit args: use them
  - no args: detect engineering layout first

Phase 2: Detect ASCET engineering layout
  - list root folders
  - find candidate <domain>/components folders
  - inspect each candidate only enough to find:
      Project anchor
      XPASS
      ASW2ASW
  - check parent folder for parameter or implementation-data hints

Phase 3: Decide confidence
  - strong: components + Project + XPASS + ASW2ASW
  - medium: components + Project + one of XPASS/ASW2ASW
  - none: no useful components engineering layout

Phase 4: Fallback clarification
  - strong: continue without asking
  - medium: ask the user to confirm the detected scope
  - none: ask scope: database, folder <path>, or project <name-or-path>

Phase 5: Runtime preflight
  - use ascet_status first
  - use ascet_scheduler_status when health, queue, lock, or degraded behavior is unclear

Phase 6: Bounded model survey
  - inspect Project assembly first
  - inspect XPASS and ASW2ASW next
  - sample parent-level parameter area
  - read representative implementation only when needed

Phase 7: Proposal before write
  - show the file to update
  - show the detected scope
  - show the overview sections to be changed

Phase 8: Section-only markdown update
  - update only ## ASCET Workspace Overview
  - preserve all other content
```

## 7. Engineering Layout Detection

The prompt should encode this heuristic:

```text
Look for <domain>/components.
Inside components, look for:
  - an ASCET Project object or project-like assembly anchor
  - XPASS
  - ASW2ASW
In the parent <domain> folder, look for parameter, calibration, or
implementation-data hints. These hints are not a complete parameter inventory.
```

Confidence levels:

| Confidence | Criteria | Behavior |
| --- | --- | --- |
| strong | `components` plus Project plus `XPASS` plus `ASW2ASW` | Use detected engineering unit as scope |
| medium | `components` plus Project plus one of `XPASS` or `ASW2ASW` | Ask user to confirm detected scope |
| none | No useful engineering layout | Ask user for database/folder/project scope |

## 8. ASCET Tool Order

For no-argument init, the prompt should prefer this canonical PI tool order:

```text
1. ascet_explore action=list_components folderPath="" kind="folder"
2. ascet_explore action=list_components folderPath="<candidate>/components" kind="all"
3. ascet_search action=resolve_component for Project, XPASS, ASW2ASW
4. ascet_explore action=inspect_target for Project
5. ascet_explore action=inspect_target for XPASS and ASW2ASW
6. ascet_explore or ascet_search for parent-level parameter hints
7. ascet_read only for a few representative surfaces:
   - read_implementation
   - read_block_diagram
   - read_state_machine_flow
```

The survey budgets remain small:

- candidate `components` folders <= 4
- items per candidate folder <= 8
- representative targets <= 4
- deep reads <= 2

## 9. Output Section

`/ascet-init` should create or update only this section:

```md
## ASCET Workspace Overview

### Engineering layout
### Assembly entry points
### Signal and interface path
### Parameter and data semantics
### Scheduling and execution notes
### Recommended navigation path
### Known limitations
```

The section should answer:

- Which engineering unit was analyzed?
- Which `components` folder, Project anchor, `XPASS`, and `ASW2ASW` were found?
- Which parent-level parameter area was sampled?
- Which conclusions are sampled or heuristic?
- Where should a future agent start for assembly, signal flow, parameters,
  scheduling, and implementation behavior?

## 10. Rule Loading

The current template manifest is v2 and already contains `default_entrypoints`,
`always_load`, task rules, object rules, and docs metadata. However, several
rules still mention legacy `Ascet*Tool` names. Loading all `always_load` rules
now would reintroduce those old names into `/ascet-init` prompts.

The design therefore uses a PI-safe init bundle:

1. Always load `default_entrypoints`.
2. Add a dedicated `init_bundle` list to the manifest, or compute an equivalent
   allowlist in code.
3. Only include rule files whose tool names are PI canonical.
4. Normalize or update legacy rule files before including them in the init
   bundle.

This keeps progressive disclosure useful without polluting the init prompt with
wrong tool names.

## 11. Error Handling

- Invalid args: notify usage and return before scaffold.
- Missing template manifest: throw the current explicit template error.
- Existing project manifest: reuse it and do not overwrite.
- Manifest path escape: reject as today.
- Missing init bundle entry: throw a specific error naming the missing id.
- Runtime unhealthy during agent execution: agent reports the status and stops
  before pretending to have surveyed the database.

## 12. Tests

Unit tests should cover:

- scope parser valid cases
- scope parser invalid cases
- invalid args do not scaffold or send a prompt
- no-arg prompt starts with engineering layout detection
- no-arg prompt asks scope only after detection failure
- prompt mentions `components`, Project, `XPASS`, `ASW2ASW`, and parent-level
  parameter hints
- prompt states parent-level parameters are not a complete inventory
- prompt uses only PI canonical `ascet_*` tool names
- init rule bundle loads only PI-safe files
- path escape checks still work
- idle and busy delivery behavior still works

Manual verification should run:

```powershell
npm --workspace @earendil-works/pi-coding-agent test -- test/ascet-init-command.test.ts
npx biome check packages/ascet-extension/src/ascet-init.ts packages/ascet-extension/src/ascet-init-scope.ts packages/ascet-extension/src/ascet-project-rules.ts packages/coding-agent/test/ascet-init-command.test.ts
npx tsc --noEmit --module NodeNext --moduleResolution NodeNext --target ES2022 --types node --allowImportingTsExtensions --skipLibCheck packages/ascet-extension/src/ascet-init.ts packages/ascet-extension/src/ascet-init-scope.ts packages/ascet-extension/src/ascet-project-rules.ts
```

## 13. Acceptance Criteria

- `/ascet-init` with no args does not default to whole-database scanning.
- `/ascet-init` with no args first instructs the agent to detect the ASCET
  engineering layout.
- Strong layout detection uses `components` plus Project plus `XPASS` plus
  `ASW2ASW` as the onboarding scope.
- Missing layout falls back to Ask Scope.
- The generated overview prioritizes assembly, signal/interface path,
  parameter semantics, scheduling, and navigation path.
- The prompt and loaded rules use PI canonical `ascet_*` tools only.
- Existing `.ascet/rules/manifest.yaml` is not overwritten.
- Only `## ASCET Workspace Overview` is created or updated.
