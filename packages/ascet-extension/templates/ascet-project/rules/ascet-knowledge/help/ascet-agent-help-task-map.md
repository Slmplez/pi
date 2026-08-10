# ASCET Agent Help Task Map

## What This File Answers

Which curated help or evidence source should the agent open for a given ASCET task shape?

## When To Use

Use this after workflow and tool selection are already known, but the semantic rule or evidence source is still unclear.

## Task Map

| Task shape | Read next | Evidence anchor |
| --- | --- | --- |
| Resolve a fuzzy target | `../../tools/explore.md` (`ascet_get.tree`) | `../../../../src/ascetcli/contracts/families/get.json` |
| Read one exact surface | `../../tools/read.md` (`ascet_read`) | `../../../../src/ascetcli/contracts/families/read.json` |
| Check references or callers | `../../tools/reference.md` (`ascet_get` references) | `../../../../src/ascetcli/contracts/families/refs.json` |
| Compare two exact targets | `../../tools/diff.md` (`ascet_diff`) | `../../../../src/ascetcli/contracts/families/diff.json` |
| Apply one focused mutation | `../../tools/write.md` (`ascet_edit`) | `../../../../src/ascetcli/contracts/families/write.json` |
| Apply repeated aligned mutations | `../../tools/batch-write.md` (`ascet_batch_write` when enabled) | `../../../../src/ascetcli/contracts/families/write.json` |
| Handle post-write verification | `../../core/verification.md` | `ascet_edit` Runtime result |
| Interpret implementation or inherited field behavior | `ascet-agent-signal-implementation-field-guide.md` | `extracted/ImplementationEditorEnglishUS/Index.md` |
| Reason about ESDL constraints | `../../objects/class-module-esdl.md` | `extracted/ESDLEditorEnglishUS/Index.md` |
| Reason about state-machine triggers, actions, or conditions | `../../objects/state-machine.md` | `extracted/StateMachineEditorEnglishUS/Index.md` |

## Stop Rule

Once the needed semantic source is identified, stop here and load only that source.

## Base Evidence Entry

- `extracted/index.md`
