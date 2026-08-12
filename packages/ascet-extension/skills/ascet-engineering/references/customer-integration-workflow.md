# Customer Integration Workflow

For customer-specific behavior, begin at the active Customer Product Project. Trace Formula, assembly, Module instances, customer interfaces, wrapper, Package join point, and target Class. Prefer the customer layer when it satisfies the requirement without changing a shared definition.

Treat `Project::Module` as assembly context. Resolve its exact OID to the canonical Module/Class definition before reading or editing ESDL, BDE, Elements, or Parameters. Inspect project-owned `Modules` and `Parameter` branches when present; customer integration is not restricted to a `Customer\<name>` root.

Place customer-specific Parameters and mappings in the verified Customer/Project owner layer. Confirm Variant, dependency direction, public-interface impact, shared OID consumers, and excluded shared objects before preflight.
