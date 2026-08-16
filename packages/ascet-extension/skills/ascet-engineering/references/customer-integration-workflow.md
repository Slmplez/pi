# Customer Integration Workflow

For customer-specific behavior, begin at the exact active Customer Product Project. Read only the Formula, assembly, Module instance, customer interface, wrapper, Package join point, mapping, and target definition needed to identify the modification layer.

Resolve a Project Module instance to its canonical definition before changing ESDL, BDE, Elements, Parameters, or StateMachine behavior. Prefer the customer layer when it satisfies the requirement without changing a shared definition.

Use `ascet_get.formulas` only with an exact Project path. Place customer-only Parameters and mappings in the verified Customer or Project owner layer. Confirm Variant, dependency direction, public-interface impact, shared consumers, and excluded shared objects when they can alter the change.
