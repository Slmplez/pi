# ESDL Literals and Configuration Values

Do not scatter unnamed literals that affect business behavior, calibration, safety, diagnostics, customer differences, or shared interfaces. Prefer a named Element, Parameter, Enum, or Local Constant when the value is configured, reused, or hard to understand.

Local `0`, `1`, `-1`, indices, counters, masks, Enum literals, unit conversions, protocol constants, type-driven saturation bounds, and clear one-use local values may remain literals. Do not expand a local literal into a needless P_/C_ chain.
