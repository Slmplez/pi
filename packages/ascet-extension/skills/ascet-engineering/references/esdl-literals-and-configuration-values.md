# ESDL Literals and Configuration Values

Do not scatter unnamed literals that control business behavior, calibration, safety, diagnostics, customer differences, or shared interfaces. Prefer an existing compatible Element, Parameter, Enum, or Formula. Add a named object only when the value is configured, reused, externally meaningful, or otherwise unclear as a literal.

Local zero, one, negative one, indices, counters, masks, Enum literals, unit conversions, protocol constants, type-driven saturation bounds, and clear one-use local values may remain literals. Do not expand a local implementation detail into an unnecessary Parameter Dependency Chain.

Every introduced configurable value requires an evidence-backed source, owner, type, unit, range, default or data value, implementation, and usage point. Stop when any required business value is unknown.
