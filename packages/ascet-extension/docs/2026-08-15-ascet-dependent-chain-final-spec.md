# ASCET Dependent Chain Final Development Specification

- Version: 1.0
- Date: 2026-08-15
- Status: Approved design
- Scope: `ascet_read.read_dependent_chain` and `ascet_edit.set_dependent_chain`

## 1. Goal

Expose one small read/write pair for an existing ASCET dependency chain:

```text
ascet_read.read_dependent_chain
ascet_edit.set_dependent_chain
```

Canonical chain:

```text
Consumer Local Parameter
    -> Consumer Imported Parameter
    -> Provider Exported Parameter
```

The implementation reuses native Search and existing read/write backends. It must not create a second dependency framework.

## 2. Scope boundary

Version 1 supports:

- Reading an existing Local/Imported/Exported chain.
- Resolving an omitted Provider with live native Element Search.
- Validating an explicit Provider.
- Previewing or applying a dependency change when all required Elements exist and binding metadata is existing or explicit.
- Exact post-write readback.

Version 1 does not:

- Guess Formula text, Formal names, Imported names, types, variants, or values.
- Create missing Provider, Imported, or Local Elements.
- Build a Catalog, index, cache, or background resolver.
- Automatically select the first same-named Search result.

If required Elements or binding metadata are missing, return a structured error. Existing complete-chain creation code may remain as an internal legacy backend during migration, but it is not registered as a separate Agent tool.

## 3. Public read action

Request with automatic Provider resolution:

```json
{
  "action": "read_dependent_chain",
  "componentPath": "FeatureA\\Consumer",
  "dependentElement": "C_Threshold"
}
```

Request with an explicit Provider constraint:

```json
{
  "action": "read_dependent_chain",
  "componentPath": "FeatureA\\Consumer",
  "dependentElement": "C_Threshold",
  "exporterComponentPath": "FeatureA\\Provider"
}
```

Keep the existing parameter names to minimize migration and code churn:

```ts
type ReadDependentChainParams = {
	action: "read_dependent_chain";
	componentPath: string;
	dependentElement: string;
	exporterComponentPath?: string;
};
```

Successful result:

```json
{
  "found": true,
  "chain": {
    "local": {
      "componentPath": "FeatureA\\Consumer",
      "element": "C_Threshold"
    },
    "imported": {
      "componentPath": "FeatureA\\Consumer",
      "element": "P_Threshold"
    },
    "exported": {
      "componentPath": "FeatureA\\Provider",
      "element": "P_Threshold"
    }
  }
}
```

Incomplete result:

```json
{
  "found": false,
  "error": {
    "code": "incomplete_chain",
    "message": "The existing dependency metadata is incomplete."
  }
}
```

Ambiguous result:

```json
{
  "found": false,
  "error": {
    "code": "provider_ambiguous",
    "candidates": [
      "FeatureA\\ProviderA\\P_Threshold",
      "FeatureA\\ProviderB\\P_Threshold"
    ]
  }
}
```

Do not return raw XML, Formula parsing diagnostics, candidate rejection traces, database identity, or temporary paths in Agent content.

## 4. Provider resolution

### 4.1 Exact metadata first

Read the Consumer Local Parameter and obtain the Imported Parameter name from live dependency mapping/formal metadata.

Do not parse Formula text to infer the Imported Parameter name. Existing Formula-token fallback logic must not participate in Provider selection.

### 4.2 Native Search only when needed

When `exporterComponentPath` is omitted:

```ts
await runAscetSearch(
	{ mode: "element", q: importedElementName, limit: 20 },
	options,
);
```

Search output remains live and non-persistent.

The native browse label contains a Component name and parent path, for example:

```text
P_Threshold::1D[cont->cont] - Provider (FeatureA\Parameters)
```

A small parser may convert this label into the hint:

```text
FeatureA\Parameters\Provider
```

The parsed path is only a hint. Parsing failure skips that candidate; it never creates a write target.

### 4.3 Exact validation

For each bounded candidate, call the existing exact Element reader and require:

```text
exact Element name
Parameter kind
scope=exported
compatible ASCET type
same database identity
existing exact Component path
```

Resolution rule:

```text
0 valid candidates -> provider_not_found
1 valid candidate  -> continue
2+ candidates      -> provider_ambiguous
```

Never select the first Search result.

## 5. Public write action

The Provider is a validation target. The actual mutation writes the Consumer Local-to-Imported dependency binding through the existing `set_element_dependency` backend.

Request that preserves an existing binding:

```json
{
  "action": "set_dependent_chain",
  "componentPath": "FeatureA\Consumer",
  "dependentElement": "C_Threshold",
  "exporterComponentPath": "FeatureA\Provider",
  "exportedElement": "P_Threshold",
  "intent": "preview"
}
```

Request with an explicit missing binding:

```json
{
  "action": "set_dependent_chain",
  "componentPath": "FeatureA\Consumer",
  "dependentElement": "C_Threshold",
  "exporterComponentPath": "FeatureA\Provider",
  "exportedElement": "P_Threshold",
  "binding": {
    "importedElement": "P_Threshold",
    "formula": "P_Threshold",
    "formal": "P_Threshold",
    "variantPolicy": "default"
  },
  "intent": "apply"
}
```

Schema:

```ts
type SetDependentChainParams = {
	action: "set_dependent_chain";
	componentPath: string;
	dependentElement: string;
	exporterComponentPath?: string;
	exportedElement?: string;
	binding?: {
		importedElement: string;
		formula: string;
		formal: string;
		variantPolicy: "default" | "selected" | "all";
		variants?: string[];
	};
	intent: "preview" | "apply";
};
```

Rules:

- `componentPath` and `dependentElement` identify the exact Consumer Local Parameter.
- `exporterComponentPath` is optional only when automatic Provider resolution is possible.
- `exportedElement` is optional only when the existing Imported mapping supplies the exact name.
- When `binding` is omitted, preserve the existing Formula, Formal mapping, Imported Element, and DataVariant selection.
- When existing binding metadata is incomplete, require the complete `binding` object.
- `variants` is required only for `variantPolicy="selected"` and is forbidden otherwise.
- The Imported Element must already exist and must resolve to the validated Exported Parameter.
- Provider validation is read-only; this action does not mutate or retarget the Provider Component.
- Version 1 does not create Elements or infer Formula, Formal, Imported Element, or variants.

The adapter maps an explicit binding to the existing backend:

```text
dependency=dependent
dependencyFormula=binding.formula
dependencyFormals=[binding.formal]
bindingPolicy=explicit
dependencyMappings[binding.formal]=binding.importedElement
variantPolicy=binding.variantPolicy
variants=binding.variants
```

Preview result:

```json
{
  "changed": false,
  "preview": {
    "local": "FeatureA\Consumer\C_Threshold",
    "imported": "FeatureA\Consumer\P_Threshold",
    "exported": "FeatureA\Provider\P_Threshold"
  }
}
```

Apply result:

```json
{
  "changed": true,
  "chain": {
    "local": {
      "componentPath": "FeatureA\Consumer",
      "element": "C_Threshold"
    },
    "imported": {
      "componentPath": "FeatureA\Consumer",
      "element": "P_Threshold"
    },
    "exported": {
      "componentPath": "FeatureA\Provider",
      "element": "P_Threshold"
    }
  }
}
```

If the target Local-to-Imported binding is already configured and the Provider validation succeeds, return the same chain with `changed:false` and perform no write.

## 6. Write sequence

The write action is a thin adapter over existing guarded edit infrastructure:

```text
1. read current chain
2. resolve and validate one Provider
3. build the existing set_element_dependency request
4. run existing preview/apply guard
5. read current chain again
6. compare exact expected chain
```

Reuse existing:

```text
write approval
editability gate
database identity gate
Scheduler
write telemetry
set_element_dependency backend
readback verification
```

Do not add another approval store, transaction coordinator, journal, rollback framework, or generic dependency repository.

`set_dependent_chain` must not call the public `ascet_read.execute()` or `ascet_search.execute()` methods. It calls shared functions directly.

## 7. Minimal internal structure

Use the existing modules and add only one small write adapter:

```text
src/search.ts
    runAscetSearch()

src/read-element.ts
    runAscetReadElement()

src/read-dependent-chain.ts
    resolveExportedParameter()
    runAscetReadDependentChain()

src/set-dependent-chain.ts
    runAscetSetDependentChain()
```

Do not introduce interfaces/classes for repositories, strategies, providers, pipelines, or resolvers. Plain functions and small discriminated result types are sufficient.

The C# `AscetDependentChainReadService` should stop recursively scanning all Components for Provider discovery. It remains responsible for exact chain metadata extraction and explicit Provider validation.

## 8. Scheduler and concurrency

Each native operation is submitted separately:

```text
exact Consumer read
    -> release Scheduler slot
native Element Search
    -> release Scheduler slot
exact candidate reads
    -> release Scheduler slot
preview/write/readback
```

Do not run Search while holding a scheduled ToolAPI job. This prevents self-deadlock on `ascet.toolapi.global`.

Concurrent Agent calls are accepted, but Search, reads, and writes remain serialized against one ASCET instance.

Capture database identity before discovery and verify it again before apply and after readback. Return `database_changed` when it differs.

## 9. Content and details

Agent-visible content:

```text
found
changed
preview
chain
error
```

Tool `details` only:

```text
database identity/fingerprint
Search timing and queue wait
candidate rejection reasons
CLI requests and exit codes
before/after diagnostic payloads
write telemetry
```

Do not duplicate the chain in both content and details.

## 10. Error contract

Keep the public error set small:

```text
component_not_found
dependent_element_not_found
incomplete_chain
binding_metadata_required
binding_invalid
provider_not_found
provider_ambiguous
provider_incompatible
database_changed
write_rejected
write_verification_failed
```

Low-level CLI, Scheduler, ToolAPI, and parsing diagnostics remain in `details`.

## 11. Registration and migration

Final Agent-facing tools remain:

```text
ascet_read
ascet_edit
```

Public actions:

```text
ascet_read.read_dependent_chain
ascet_edit.set_dependent_chain
```

Migration:

1. Add `set_dependent_chain` to the `ascet_edit` schema and descriptor.
2. Route it through the existing guarded edit service.
3. Update prompts and tests to use the new pair.
4. Remove `configure_parameter_dependency_chain` from canonical registration and active profiles.
5. Keep its implementation file temporarily for internal caller migration.
6. Keep `set_element_dependency` as an internal backend until the wrapper is stable.
7. Remove old public descriptors only after caller tests pass.

No backward-compatible public aliases are required.

## 12. Prompt

```text
Use read_dependent_chain after resolving the Consumer Component and Local Parameter. If the Provider is omitted, Runtime performs live native Element Search and accepts only one exact validated Exported Parameter. Read the chain before set_dependent_chain. Never choose the first same-named Search result. Do not attempt a write when binding metadata is incomplete.
```

## 13. Minimal development sequence

1. Add unit tests for native Search label-to-Component-path hints.
2. Replace recursive Provider discovery with `runAscetSearch()` plus exact Element validation.
3. Normalize `read_dependent_chain` Agent content.
4. Add the thin `set_dependent_chain` edit adapter.
5. Reuse existing preview/apply/write/readback infrastructure.
6. Migrate descriptors, prompts, profiles, and tests.
7. Run targeted tests, live read tests, safe preview tests, then `npm run check`.

## 14. Tests

### Read

- Explicit Provider success and mismatch.
- Automatic unique Provider success.
- Zero and multiple candidates.
- Malformed Search labels are ignored safely.
- Candidate name, scope, kind, type, and database validation.
- No Formula-token Provider inference.
- No recursive Component discovery.

### Write

- Preview performs no mutation.
- Apply reuses existing binding metadata.
- Apply accepts one explicit single-link binding.
- Missing or partial binding metadata fails before mutation.
- Incompatible and ambiguous Provider failures.
- Idempotent apply returns `changed:false`.
- Database change before apply is rejected.
- Exact post-write readback.
- Existing approval/editability/write guards remain active.

### Concurrency

- Concurrent submissions complete without deadlock.
- Scheduler never nests Search inside a held ToolAPI job.
- No Search window or process-handle leak.

## 15. Acceptance criteria

1. Provider discovery uses live native Element Search, not recursive database scanning.
2. Search paths are treated only as hints and validated by exact Element reads.
3. `read_dependent_chain` returns one concise chain or one structured error.
4. `set_dependent_chain` is a thin adapter over existing guarded write infrastructure.
5. Missing metadata or Elements are never guessed or automatically created.
6. The first same-named Search result is never selected automatically.
7. No new Catalog, cache, transaction framework, or generic service hierarchy is introduced.
8. Concurrent calls do not deadlock or execute native ASCET UI operations in parallel.
9. Targeted tests, live checks, and `npm run check` pass.