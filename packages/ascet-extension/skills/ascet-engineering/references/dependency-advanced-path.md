# Dependency Advanced Path

Use this path for a complete Provider Exported Parameter, Consumer Imported Parameter, Consumer Local Dependent Parameter, and Formula/Formal/DataVariant binding.

New calibratable or tunable values requested for use by a consumer/business Class follow this path by default. The consumer is the usage site, not the calibration owner. Resolve and validate the external or dedicated Calibration Parameter Class as Provider before defining the chain; do not infer it from naming or weak metadata, and stop if Provider or binding evidence is unresolved.

The required shape is `Provider Exported P_<Name>` -> `Consumer Imported P_<Name>` -> `Consumer Local Dependent C_<Name>`. Bind Formula, Formal, and DataVariant explicitly, and make consumer code use `C_<Name>`. A local Parameter with `calibration=true` is not an acceptable substitute.

## Hard configuration gate

Treat the chain as invalid until all configuration is explicit, compatible, and supported by exact requirements or exact live evidence:

- Confirm the consumer Class is only the usage location and resolve the evidence-backed Provider owner. The scopes are Provider Exported, Consumer Imported, and Consumer Local Dependent; do not create a calibratable standalone local shortcut.
- Provider Exported and Consumer Imported names must match exactly as `P_<Name>`; Local Dependent is `C_<Name>` unless an exact, verified legacy name is preserved. Provider and Imported `modelType` and unit must be compatible. Local `modelType`, unit, and implementation must match the dependency result and ESDL usage.
- Provider owns the calibration value/data. Imported carries structural compatibility metadata only. Local Dependent must not receive an independent scalar data/default. Range, value/data/default, implementation, and calibration decisions must be explicit; validate values/defaults against the selected range, require integer `valueType` coverage for the complete required range and signedness, and require an explicit real precision rule. `ascetDefault` must not conceal an unknown implementation decision.
- Formula, Formal, Imported mapping, and DataVariant policy must be explicit and internally consistent. For the standard single-formal identity binding, use `formula="x"`, `formal="x"`, and map `x` to the Consumer Imported Parameter; use another formal only when an exact verified contract requires it. Existing compatible endpoints are reused exactly; any material metadata or binding mismatch is a conflict and is never overwritten.

Missing or contradictory configuration blocks mutation. After apply, automatic readback must confirm all three endpoints and the binding, including exact names, roles/scopes, types, units, range, data/default, implementation/calibration where applicable, and Formula/Formal/DataVariant.
Do not use `C_` for unrelated Local State or Internal Variables. The standalone-local exception requires an explicit request or exact existing architecture evidence; unrelated local constants and endpoint-only patches stay on the ordinary Element path.

Provide exact Components, including the required Provider component path, and complete Element and binding definitions to `ascet_edit.create_dependent_chain`. Resolve an unknown Provider with `ascet_search` before the mutation and never choose the first Search candidate without exact validation. Use `ascet_read.read_dependent_chain` only when current chain state affects design, conflict analysis, completion, or diagnosis.

Create-or-reuse behavior is mandatory:

- Missing Element: create it.
- Exact Element: reuse it.
- Metadata conflict: reject without overwrite.
- Binding conflict: reject without overwrite.
- Successful apply: require automatic full readback.

The Provider, Imported, and Local Elements in a complete chain must not also be managed by `ascet_edit.apply_element_spec` in the same change. Stop rather than guess Formula, Formal, mapping, DataVariant, type, unit, range, value, or implementation metadata.

Use `references/implementation-type-and-memory-layout.md` for Provider and Local implementation decisions. These roles use `implementation.mode=explicit|ascetDefault`; they do not accept public `impl.type`.
