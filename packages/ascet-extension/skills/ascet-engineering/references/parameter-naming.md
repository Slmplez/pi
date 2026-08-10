# Parameter Naming and Dependency

New Provider Exported Parameters use `P_<Name>`. Consumer Imported Parameters use the exact same `P_<Name>`. Consumer Local Parameters use `C_<Name>`. Do not rename existing legacy Parameters automatically.

A dependent chain is `C_...` -> Imported `P_...` -> same-named Exported `P_...` -> Provider Component. The value/source, type, unit, range, initial, calibration/constant role, implementation, dependency formals, typed mappings, variant policy, and ESDL/BDE usage point must be explicit.

After exact-target discovery, create the complete chain with one `configure_parameter_dependency_chain` call. Use `ascet_edit.set_element_dependency` only when the local Element already exists and only its dependency state must change.
