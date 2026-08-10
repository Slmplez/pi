# Parameter Naming and Dependency

New Provider Exported Parameters use `P_<Name>`. Consumer Imported Parameters use the exact same `P_<Name>`. Consumer Local Parameters use `C_<Name>`. Do not rename existing legacy Parameters automatically.

A dependent chain is `C_...` → Imported `P_...` → same-named Exported `P_...` → Provider Component. Use explicit dependency formals and mappings. The value/source, type, unit, range, initial, calibration/constant role, implementation, variant policy, and ESDL/BDE usage point must be explicit in the implementation plan.
