# ASCET Engineering Skill CNMS/CUST Routing Optimization Plan

Date: 2026-08-12
Status: analysis complete; production Skill not modified
Evidence: three live ASCET databases documented in `docs/2026-08-12-ascet-database-structure-analysis.md`

## 1. Objective

Optimize `ascet-engineering` for this primary workflow:

```text
user requirement
→ quickly locate the effective Project/Module/Class
→ resolve the canonical definition and correct modification layer
→ understand current ESDL/BDE/signal flow and Element configuration
→ design the exact ESDL/Element/Parameter change
→ present the final executable implementation plan
→ preflight and write after confirmation
```

CNMS/CUST knowledge exists only to improve routing, ownership decisions, and shared-impact safety.

## 2. Non-goals

The Skill does not provide a CUST-to-CNMS promotion workflow.

It must not automatically:

- migrate CUST objects into CNMS
- decide that a customer function should become a platform feature
- rename or relocate Modules, Classes, or Parameters for platformization
- generate a promotion-readiness assessment
- treat mixed CNMS/CUST ownership as a defect requiring cleanup

Mixed ownership is evidence for locating the real implementation and understanding change impact, not a migration task.

## 3. Preserve the existing scope model

Keep only two modification scopes:

- `integrationScope`: customer/product assembly, mappings, scheduling, wrappers, customer-specific ESDL, Elements, Parameters, and variants.
- `featureScope`: shared algorithm, Package behavior, StateMachine, interface, Provider, or cross-customer defect.

Add two orthogonal routing fields:

```text
databaseRole:
  cust-centric | cnms-centric | mixed | unknown

ownerLayer:
  generic-platform | china-package | cnms-project |
  project-owned | customer-owned | mixed | unknown
```

Add one target-resolution field:

```text
implementationRoute:
  Project instance
  → exact OID
  → canonical Module/Class definition
  → Method/BDE/Element/Parameter modification point
```

Do not add `platformizationState` to the production workflow.

## 4. Fast routing workflow

```text
1. Classify request input.
2. Bind database identity only when database evidence is required.
3. Select the shortest candidate route.
4. Resolve Project instance to canonical definition by OID.
5. Read only the surfaces required for the requested change.
6. Freeze integrationScope or featureScope and the modification layer.
7. Produce the exact final implementation plan.
8. Run Preflight and authorized writes.
```

### 4.1 Exact Project supplied

```text
Project
→ Formula/assembly/Module instances
→ target Module instance
→ exact OID
→ canonical definition
→ Method/BDE/Elements
```

Do not scan the full database first.

### 4.2 Exact Module/Class path or OID supplied

```text
exact target
→ summary/surface/current implementation
→ canonical owner role
→ candidate Project context only when scope or impact requires it
→ modification point
```

The exact path is a locator, not an automatic scope decision.

### 4.3 Fuzzy functional requirement

```text
feature/signal/parameter semantics
→ database identity
→ bounded generic Package, China Package/CNMS, and CUST candidates
→ candidate Project assembly
→ exact OID owner validation
```

Do not assume CNMS coverage and do not guess a Customer Project.

### 4.4 Customer-specific requirement

Prefer this route:

```text
active CUST Product Project
→ customer interface/mapping/wrapper
→ Module instance
→ canonical definition
→ customer-owned modification point
```

Move to shared Package/CNMS analysis only when the current behavior is actually owned there or the requirement is demonstrably shared.

### 4.5 Shared feature or defect

Prefer this route:

```text
PlatformLibrary / China Package / CNMS candidate
→ canonical definition
→ current implementation and interface
→ representative active Project impact
```

CNMS can be an assembly context while the definition remains under another owner. The same-OID definition decides where the implementation resides.

## 5. Main `SKILL.md` optimization

### 5.1 Frontmatter description

Add invocation terms:

- CNMS/CUST routing
- database/project topology
- canonical definition ownership
- ESDL/Element implementation planning

Do not mention promotion or migration.

### 5.2 Input routing rules

Add these invariants:

- CNMS availability is determined per requested feature, not from root presence.
- CNMS and CUST are routing/ownership contexts, not automatically newer/older versions.
- `Project::Module` is an assembly entry; canonical ownership comes from the same-OID definition.
- Database role classification is conditional and must not delay an exact-target task.

### 5.3 Workflow changes

Update the first four workflow steps:

1. Classify the request and choose the shortest Project/Package/exact-target route.
2. Bind database identity and validate stored evidence when database discovery is required.
3. Resolve the exact target and canonical definition by OID.
4. Read the relevant Method/BDE, ESDL, Elements, Parameters, and dependencies, then freeze scope and modification layer.

Keep all current write, editability, automatic verification, and parameter-chain rules unchanged.

### 5.4 Evidence rules

Add:

- Stored Tree/Catalog/closure evidence is valid only for the exact database identity that produced it.
- Changed `database.name` invalidates prior database artifacts even if `database.path` remains unchanged.
- A `database.name`/`database.path` inconsistency must be reported and prevents artifact mixing.
- A complete database Tree is for explicit database-wide analysis or reusable stored evidence, not a mandatory first step.

### 5.5 Line budget

Current `SKILL.md` is 88 lines and the existing test permits at most 90.

Keep the limit if possible. Free space by:

- compressing detailed Shared OID advice into one or two core lines
- leaving detailed todolist fields in the planning Reference
- leaving dependency-chain execution detail in dependency/write References

Target final size: 82–90 lines.

## 6. New Reference

Create:

```text
references/cnms-cust-routing-and-ownership.md
```

This Reference should contain only routing and owner-resolution rules.

### 6.1 Known candidate layers

Treat these as heuristics, not universal hardcoded schema:

```text
PlatformLibrary*
CN_Libary\Package
CN_Libary\CNMS_<platform>
Customer\<customer>
PlatformProjects\<platform>\Modules|Parameter
PlatformProjects\...\Product\<CustProject>
```

`CN_Libary` and `CN_Library` can coexist as independent exact paths. Never normalize one into the other before identity/OID validation.

### 6.2 Database role

CUST-centric indicators:

- Product CUST Project
- broad customer/product assembly
- project/customer-owned Modules or Parameters

CNMS-centric indicators:

- primary Projects under `CNMS_<platform>`
- reusable architecture/configuration Projects
- no final Product CUST Project

Mixed indicators:

- Product CUST and CNMS Projects coexist
- CNMS Project uses definitions from `PlatformProjects` or `Customer`

Role classification only chooses search priority. It does not decide the final modification scope.

### 6.3 Feature-specific routing

```text
requested feature
→ semantic CNMS candidate
→ semantic CUST candidate
→ actual active Project instance
→ canonical definition
```

A CNMS root does not prove feature coverage. Whole CNMS and CUST Projects are not assumed to be alternative versions.

### 6.4 Canonical owner resolution

When a Project instance is involved:

```text
Project::Module path
→ exact OID
→ same-OID non-Project definition
→ canonical owner path
→ Method/BDE/Elements/Parameters
```

If multiple same-OID paths exist, retain all candidate contexts and validate the actual definition role with exact live evidence.

### 6.5 Mixed ownership

When a CNMS Project uses a `PlatformProjects` or `Customer` definition:

- report the canonical owner
- report that the OID is shared through CNMS
- choose modification scope from the requirement and actual definition
- include affected Project context
- do not migrate the object

## 7. Existing Reference updates

### 7.1 `database-root-discovery.md`

Add:

- exact database identity binding
- stored artifact invalidation on `database.name` change
- name/path inconsistency handling
- conditional bounded role discovery
- known roots as heuristics only
- complete stored Tree versus routine bounded live discovery

Recommended rule:

```text
Use complete stored Tree/Catalog evidence for database-wide candidate discovery when available.
Do not trigger a new complete live scan for an ordinary exact-target change.
```

### 7.2 `scope-resolution-and-ownership.md`

Clarify:

- database role and owner layer do not replace scope
- scope comes from requirement intent and the canonical definition
- a CUST Project can use a shared Package definition
- a CNMS Project can use a project/customer-owned definition

### 7.3 `customer-integration-workflow.md`

Add:

```text
Product Project
→ Module instance
→ exact OID
→ canonical definition
→ ESDL/BDE/Element modification point
```

Inspect `PlatformProjects\<platform>\Modules` and `Parameter` when present. Customer-specific integration is not restricted to `Customer\<name>`.

### 7.4 `feature-package-workflow.md`

Broaden shared feature candidates to:

- generic `PlatformLibrary` Package
- China `CN_Libary\Package`
- CNMS Project/configuration

Before editing, determine whether CNMS is only the Project assembly context or also owns the actual definition.

### 7.5 `class-path-project-context.md`

Add:

- exact path may be a definition or a Project context
- same OID can appear through several Projects
- find representative Project context only when needed for scope or impact

### 7.6 `parameter-provider-placement.md`

Extend placement:

| Requirement | Provider owner |
| --- | --- |
| Customer-specific | verified Customer/Project owner |
| China shared feature | verified China Package/CNMS owner |
| Generic shared feature | Core Package provider |
| Mixed owner or unclear usage | stop and resolve owner; do not relocate automatically |

### 7.7 `project-to-esdl-signal-flow.md`

Insert canonical definition resolution before Method/BDE reading:

```text
Project Module instance
→ OID definition
→ Component references/BDE
→ source/transform/consumer
→ Method/signature/ESDL
```

### 7.8 `tool-recipes.md`

Add a short recipe:

```text
stored Tree/Catalog Project instance + OID
→ canonical definition candidate
→ exact live validation
```

Keep `component_refs` and `dbitem_refs` as outgoing-reference tools only.

## 8. `agents/openai.yaml`

The current default prompt overemphasizes `configure_parameter_dependency_chain`.

Replace it with a general implementation prompt:

```text
Use $ascet-engineering to resolve the active Project and canonical ASCET definition,
trace ESDL/BDE signal flow and Element configuration,
freeze the correct modification scope, and produce a guarded executable implementation plan.
```

## 9. Required final implementation plan

For a non-trivial implementation request, the Skill should produce this structure before Preflight.

### 9.1 Requirement and success criteria

- requested behavior
- trigger/condition
- expected outputs
- unchanged behavior

### 9.2 Scope and ownership

- database identity when relevant
- active Project
- Project Module instance
- OID
- canonical definition
- `integrationScope` or `featureScope`
- affected and excluded Projects/Components

### 9.3 Signal flow

```text
source
→ validation/conditioning
→ transform/state logic
→ consumer/output
```

List reused Signals, Elements, Parameters, Enums, Methods, and BDE connections with exact paths.

### 9.4 Exact ESDL/BDE change

When evidence is complete, include:

- exact target Method/BDE
- current relevant behavior
- concrete ESDL code or exact patch
- signature changes if required
- state initialization/reset behavior
- failure/fallback behavior

Do not provide only high-level pseudocode when exact code evidence is available.

### 9.5 Element changes

For every created or changed Element, include:

| Field | Required content |
| --- | --- |
| Name | exact proposed/existing name |
| Owner | canonical Component path |
| Role | imported/exported/local/state/argument/return/parameter |
| Existing/new | reuse, patch, or create |
| Model type | exact type |
| Unit | exact unit or evidence that none applies |
| Range | physical or implementation source |
| Initial/default | evidence-backed value/source |
| Calibration/constant | explicit decision |
| Implementation | relevant implementation metadata |
| Usage | exact ESDL/BDE usage point |

Existing Elements receive only the requested patch; unread fields are preserved.

### 9.6 Parameter/dependency changes

Only when required:

- Provider/Imported/Local Dependent roles
- P_/C_ naming where applicable
- actual value or authoritative source
- dependency formula, formals, typed mappings, and variants
- Provider/Consumer ownership

Do not create a Parameter chain for an ordinary local state or literal without semantic need.

### 9.7 Write order

Example:

```text
Element/Parameter
→ dependency
→ Method shell/signature if needed
→ ESDL body
→ Project Formula/mapping if needed
```

List exact preflight actions and expected changed objects.

### 9.8 Unknowns and risks

- `blockingUnknowns` must be empty before Preflight
- shared OID impact
- customer/shared behavior risk
- interface compatibility
- variant and initialization risk

## 10. Tests

### 10.1 `ascet-engineering-skill.test.ts`

Add positive assertions for:

- database identity artifact binding
- feature-specific CNMS/CUST routing
- `Project::Module` to same-OID definition
- canonical owner layer
- exact implementation plan with ESDL and Element changes

Add negative assertions preventing:

- CNMS always wins
- CNMS root proves feature coverage
- Project instance path is treated as the definition
- customer implementation is assumed to exist only under `Customer`
- complete live database scan is required for every task
- promotion/migration workflow appears in the production Skill

### 10.2 `package-resources.test.ts`

Add `cnms-cust-routing-and-ownership.md` to `skillReferences`.

### 10.3 Overfitting guard

Production Skill/References must not contain sample-specific identities:

- Xiaomi
- ChangAn
- sampled BB values
- sampled database names

## 11. Behavioral acceptance scenarios

### Scenario A: exact Project and feature request

Expected:

- inspect Project assembly
- find Module instance
- resolve definition by OID
- read ESDL/Elements
- output exact implementation plan

### Scenario B: fuzzy customer requirement

Expected:

- bounded CUST-first discovery
- no full database scan unless evidence requires it
- customer mapping/wrapper versus shared implementation distinguished
- final ESDL/Element solution produced

### Scenario C: feature present in both CNMS and CUST contexts

Expected:

- actual active Project and same-OID owner determine the implementation route
- no automatic CNMS-first rule
- ask only if two modification layers remain genuinely plausible

### Scenario D: CNMS Project uses Customer/Project definition

Expected:

- canonical owner reported
- shared impact reported when useful
- implementation edited only at the approved owner
- no migration proposal

### Scenario E: database switch with stale path

Expected:

- changed `database.name` invalidates prior artifacts
- stale path is reported
- new target evidence is collected

### Scenario F: ESDL and Element implementation

Expected final plan includes:

- exact Project/Module/Class/Method
- source/transform/consumer
- concrete ESDL patch
- complete changed Element metadata
- reuse decisions
- write order
- assumptions and risks

## 12. Implementation order

1. Add failing tests for routing, OID ownership, and final implementation-plan requirements.
2. Add `cnms-cust-routing-and-ownership.md`.
3. Update database, scope, customer, feature, class, signal-flow, parameter, and tool References.
4. Compress duplicated main-Skill detail and add the new core invariants.
5. Update `agents/openai.yaml`.
6. Update package resource expectations.
7. Run modified targeted tests.
8. Run `npm run check` and fix every reported issue.
9. Validate read-only routing scenarios before any write test.

## 13. Risks and controls

| Risk | Control |
| --- | --- |
| Overfitting sampled databases | no customer names, BB values, or exact sampled paths in production guidance |
| Main Skill growth | keep invariants in SKILL.md and details in one new Reference |
| Slower routing due to classification | make database role conditional; exact-target route remains shortest |
| Incorrect owner from Project path | mandatory same-OID canonical definition resolution |
| Unnecessary migration discussion | explicitly exclude promotion/platformization workflows |
| Generic high-level plans | require exact ESDL patch and Element metadata when evidence is complete |
| Breaking current write safety | do not alter preflight, editability, automatic verification, or dependency-chain behavior |
| Losing current uncommitted improvements | integrate with current shared-OID and parameter-naming changes; do not overwrite them |

## 14. Acceptance criteria

The optimization is complete when:

1. CNMS/CUST knowledge shortens feature discovery and owner resolution.
2. Exact Project/Class/OID requests do not trigger unnecessary database-wide scans.
3. Project instances are resolved to canonical definitions by OID.
4. Database role and owner layer remain separate from modification scope.
5. Mixed ownership is reported only to explain implementation location and impact.
6. The Skill selects the correct ESDL/BDE/Element/Parameter modification point.
7. The final plan contains concrete code/configuration when evidence is complete.
8. No CUST-to-CNMS promotion workflow appears in production guidance.
9. Main `SKILL.md` remains bounded and References load progressively.
10. Existing write safety and runtime verification semantics remain intact.
