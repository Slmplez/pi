# Parameter Naming and Dependency

New Provider Exported Parameters use `P_<Name>`. Consumer Imported Parameters use the exact same `P_<Name>`. Consumer Local Dependent Parameters use `C_<Name>`. Do not rename existing legacy Parameters automatically.

`C_` identifies the Consumer Local Dependent Parameter role in a Parameter dependency chain. Apply it only after live evidence confirms an explicit dependency chain; locality alone is insufficient. It is not a generic prefix for local Elements. For a Local State or Internal Variable, inspect the existing Component naming convention and choose a semantic state name, such as `AVH_DoubleBrakePressCount`, `AVH_DoubleBrakeWindow`, `AVH_DoubleBrakePrev`, or `AVH_DoubleBrakeReq`; do not infer `C_` from locality alone.

A dependent chain is Local Dependent `C_...` -> Imported `P_...` -> same-named Exported `P_...` -> Provider Component. The value/source, type, unit, range, initial, calibration/constant role, implementation, dependency formals, typed mappings, variant policy, and ESDL/BDE usage point must be explicit.

After exact-target discovery, read the current chain with `ascet_read.read_dependent_chain`, then use `ascet_edit.set_dependent_chain` for existing Provider, Imported, and Local Parameters.
