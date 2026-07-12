---
id: ascet.object.class-module-esdl
layer: object
object_types:
  - Class
  - Module
languages:
  - ESDL
---

# Class And Module ESDL

## When To Load

Load when the target is a `Class` or `Module` and the task touches ESDL declarations, methods, processes, or local textual model logic.

## Action Rules

1. Treat ESDL signatures and bodies as related but distinct structures.
2. Confirm the target method, process, or element exists before editing body text.
3. Do not create same-name overloads. ASCET ESDL method and process names must remain unique.
4. Do not patch missing declarations by casually inserting model elements into method bodies.
5. Keep variable naming and scope stable. Avoid introducing collisions during edits.
6. Prefer the smallest local ESDL change that preserves surrounding structure.
7. If the task looks like a graph or block edit rather than textual model code, stop and re-route instead of forcing an ESDL edit path.

## Escalate When

- The requested change implies signature creation or rename rather than body-only logic.
- The task requires both ESDL edits and implementation/data changes.
- The available context is only a text fragment without snapshot-level model context.

## Evidence

- `ascet-agent-coding-best-practices.md`
- `ascet-knowledge/help/ascet-agent-help-source-map.md`
