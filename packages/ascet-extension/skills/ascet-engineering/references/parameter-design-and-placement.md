# Parameter Design and Placement

Use role-based names for new dependency Parameters:

- Provider Exported Parameter: `P_<Name>`.
- Consumer Imported Parameter: the same `P_<Name>`.
- Consumer Local Dependent Parameter: `C_<Name>`.

`C_` identifies the local dependent role in a complete Parameter Dependency Chain. It is not a generic prefix for Local State or Internal Variables. Preserve existing legacy names unless the request explicitly includes a rename.

Place customer-only Providers in the verified Customer or Project owner layer, China-shared functional data in a verified China Package or CNMS owner, and generic cross-region data in the corresponding shared Package owner. Place calibratable data in a verified Calibration Provider and fixed functional constants in a verified Constant Provider only when live ownership evidence supports the choice.

Require exact path or OID, business value and source, type, unit, range, data/default, calibration or constant role, implementation compatibility, Formula/Formal mapping, Variant policy, and ESDL/BDE usage point as applicable. A Project assembly path does not prove Provider ownership. Stop instead of creating, relocating, or selecting a Provider from weak naming evidence.

Provider placement supplies the complete definition for `ascet_edit.create_dependent_chain`; it does not require a separate ordinary Element write.
