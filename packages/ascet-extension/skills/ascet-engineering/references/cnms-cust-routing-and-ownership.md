# CNMS/CUST Routing and Ownership

Use CNMS/CUST structure only to choose a fast search route, resolve the effective implementation, and select the correct modification layer. Do not infer migration work from mixed ownership.

## Routing state

Track these fields only when they are relevant:

- `databaseRole`: `cust-centric`, `cnms-centric`, `mixed`, or `unknown`.
- `ownerLayer`: `generic-platform`, `china-package`, `cnms-project`, `project-owned`, `customer-owned`, `mixed`, or `unknown`.
- modification scope: exactly one `integrationScope` or `featureScope`.

Database role sets search priority; it does not determine scope. Resolve scope from requirement intent and the canonical definition owner.

## Candidate layers

Treat roots such as `PlatformLibrary*`, `CN_Libary\Package`, `CN_Libary\CNMS_<platform>`, `Customer\<customer>`, `PlatformProjects\<platform>\Modules|Parameter`, and `PlatformProjects\...\Product\<CustProject>` as heuristics. They are not a universal schema. `CN_Libary` and `CN_Library` may coexist as separate exact paths; never normalize one into the other before identity/OID validation.

## Feature-specific routing

Start from feature semantics, signal meaning, parameter role, or an exact user target. A CNMS root does not prove that the requested feature exists there, and CNMS/CUST contexts do not establish which implementation is newer.

- Customer-specific behavior: start from the active CUST Product Project, customer interface/mapping/wrapper, and Project Module instance.
- Shared behavior: start from generic Package, China Package, or CNMS candidates, then inspect active Project impact.
- Both plausible: retain both candidates and ask only when the canonical owner and requirement intent still allow two modification layers.

Do not require a complete live database scan for an exact Project, Class, Module, Method, or OID request.

## Canonical definition

A `Project::Module` path is an assembly entry, not an ownership conclusion. Resolve it as:

```text
Project::Module
→ exact OID
→ same-OID non-Project object
→ canonical definition
→ Method/BDE/Elements/Parameters
```

Preserve the instance path, OID, canonical definition path, owner layer, and relevant Project consumers. If several same-OID contexts exist, validate the definition role with exact live evidence before writing.

When a CNMS Project uses a Project- or Customer-owned definition, report the canonical owner and shared impact when useful. Select the edit target from the requirement and definition owner; do not relocate the object.

## Implementation result

After routing, continue with Project/signal/ESDL analysis. Before preflight, identify the exact Method/BDE and provide concrete ESDL code or an exact patch when evidence is complete. Include every changed Element's owner, role, type, unit, range source, initial/default source, calibration/constant decision, implementation metadata, and usage point.
