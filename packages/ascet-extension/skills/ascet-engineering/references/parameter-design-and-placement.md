# Calibration Parameter Design and Placement

## Default architecture

For a new calibratable or tunable value requested for use in a consumer/business Class, treat the named or current Class as the usage location only; it is not proof of calibration ownership.

Resolve and validate one external or dedicated Calibration Parameter Class as Provider using exact ownership evidence. Do not infer Provider ownership from names, folders, or a Project assembly path. If the Provider, metadata, or binding cannot be validated, stop rather than guess.

Use this complete chain:

`Provider Exported P_<Name>` -> `Consumer Imported P_<Name>` -> `Consumer Local Dependent C_<Name>`

The Exported and Imported Parameters use the same `P_<Name>`. Bind Formula, Formal, and DataVariant explicitly, and make consumer code use `C_<Name>`. A Consumer Local Parameter with `calibration=true` is not a substitute for this chain. Route the complete definition to `ascet_edit.create_dependent_chain`, not `ascet_edit.apply_element_spec`.

The only exceptions are an explicitly requested standalone local Parameter or exact existing architecture evidence proving that design. Unrelated fixed local constants and existing endpoint-only patches remain ordinary-element work.

## Hard configuration gate

Do not create or apply a new chain until the configuration is complete and evidence-backed:

- Roles/scopes must be Provider Exported Parameter -> Consumer Imported Parameter -> Consumer Local Dependent Parameter. Provider and Imported use the exact same `P_<Name>`; Local uses `C_<Name>` unless an exact, verified legacy name is preserved. A calibratable standalone Consumer Local Parameter is forbidden.
- The Provider owns the verified calibration value/data. The Imported endpoint carries structural compatibility metadata only. The Local Dependent endpoint has no independent scalar data/default and derives its result from the dependency.
- Provider and Imported `modelType` and unit must be compatible. Local `modelType`, unit, and implementation must be compatible with the dependency result and the ESDL use site. Range, data/default, implementation, and calibration choices must come from requirements or exact live evidence; do not use `ascetDefault` for an unresolved choice.
- Check that each value/default is within the selected range, that integer `valueType` covers the complete required range and signedness, and that real precision is explicitly justified. Use `references/implementation-type-and-memory-layout.md` for the implementation type details; do not duplicate its type table here.
- Formula, Formal, Imported mapping, and DataVariant policy must be explicit and mutually consistent; never assume a universal `x` mapping. Existing compatible endpoints are preserved exactly; any material mismatch is a conflict, not an overwrite.

Missing or contradictory evidence blocks mutation. Automatic readback must confirm all three endpoints and the binding, including names, roles/scopes, types, units, range, data/default, implementation/calibration where applicable, Formula, Formal, Imported mapping, and DataVariant.

## Naming

- Provider Exported Parameter: `P_<Name>`.
- Consumer Imported Parameter: the same `P_<Name>`.
- Consumer Local Dependent Parameter: `C_<Name>`.

`C_` identifies the local dependent role in a complete Parameter Dependency Chain. It is not a generic prefix for Local State or Internal Variables. Preserve existing legacy names unless the request explicitly includes a rename.

## Placement and required evidence

Place customer-only Providers in the verified Customer or Project owner layer, China-shared functional data in a verified China Package or CNMS owner, and generic cross-region data in the corresponding shared Package owner. Place calibratable data in a verified Calibration Provider and fixed functional constants in a verified Constant Provider only when live ownership evidence supports the choice.

Before creating or reusing a chain, require exact Provider and Consumer paths or OIDs, value and source, type, unit, range, data/default, implementation compatibility, Formula/Formal/DataVariant, and ESDL/BDE usage point as applicable. Provider placement supplies the complete definition for `ascet_edit.create_dependent_chain`; do not add a separate ordinary Element write.
