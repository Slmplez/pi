---
id: ascet.object.module-bde
layer: object
object_types:
  - Module
languages:
  - BDE
---

# Module BDE

## When To Load

Load when the target is a `Module` and the task concerns block diagrams, graph structure, wiring, or non-textual model layout that should not be treated as free-form code.

## Action Rules

1. Treat `BDE` as structured model state, not as ordinary editable source text.
2. Read `snapshot` before assuming any graph-local change is safe.
3. Use `ascet_read` `read_block_diagram` for block-level analysis. Its default result is a semantic graph for signal flow, dependencies, node relations, operations, and rule checks.
4. Confirm the intended edit is representable through a structure-aware write path before attempting any change.
5. Keep topology stable unless the task explicitly requests a structural change.
6. Avoid translating a graph edit into an ad hoc textual patch just because a text surface is easier to reach.

## Escalate When

- You only have a textual fragment and no block or snapshot context.
- The requested change would alter connectivity, ports, or execution structure.
- The available tooling cannot prove a structure-aware write path.

## Evidence

- `ascet-agent-coding-best-practices.md`
- `ascet-knowledge/help/ascet-agent-help-task-map.md`
