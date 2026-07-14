# ASCET Init Workflow

Use `/ascet-init` for ASCET model-engineering onboarding. The goal is a concise future-agent navigation summary, not a full database index.

## First Principle

ASCET is model-based engineering. Understand assembly, signal flow, interfaces, scheduling, data semantics, and generated-code impact before reading or changing detailed implementation.

## Scope Flow

1. If the user supplied `database`, `folder <path>`, or `project <name-or-path>`, use that explicit scope.
2. If no explicit scope was supplied, Detect ASCET engineering layout before asking scope.
3. Ask Scope only if layout detection fails or is too weak to trust.

## Engineering Layout Detection

Look for a common engineering unit:

```text
<domain>/components
  <Project anchor>
  XPASS
  ASW2ASW
```

Treat the Project anchor as the assembly entry point. Treat `XPASS` and `ASW2ASW` as high-priority signal/interface adaptation anchors.

Also inspect the parent `<domain>` folder for parameter, calibration, or implementation-data hints. parent-level parameter areas are useful hints but not a complete parameter inventory.

Confidence:

- strong: `components` plus Project anchor plus `XPASS` plus `ASW2ASW`
- medium: `components` plus Project anchor plus one of `XPASS` or `ASW2ASW`
- none: no useful `components` engineering layout

For strong confidence, use the detected engineering unit as the onboarding scope. For medium confidence, ask the user to confirm. For none, ask the user to choose database, folder, or project scope.

Required output section:

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

Mark sampled or heuristic conclusions explicitly. Do not create an exhaustive inventory. Do not dump raw JSON payloads.
