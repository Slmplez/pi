# Target Scope and Ownership

Treat an exact path or OID as a locator, not an automatic ownership or scope conclusion. Preserve Project instance path, canonical definition path, OID, owner layer, and relevant consumers when those facts affect the request.

A `Project::Module` entry is assembly context. When ownership or impact matters, resolve its exact identity to the canonical non-Project definition before editing ESDL, BDE, Elements, Parameters, or StateMachine behavior. Do not perform this expansion for an exact local read when Project context cannot affect the answer.

Use `integrationScope` for Customer Project adaptation, Formula, Variant, assembly, mapping, scheduling, wrappers, customer-owned behavior, and customer-only Parameters. Use `featureScope` for shared Package algorithms, public interfaces, shared StateMachines, shared Parameters, and cross-customer defects.

Keep database role, owner layer, freshness, and modification scope separate. Resolve the edit layer from requirement intent and canonical owner. If both Customer and shared layers remain plausible and the choice changes the result, retain both candidates and ask rather than guess.

For an actual shared-OID mutation, explain non-local impact when the user may reasonably assume the change is Project-local or when consumer impact changed. Do not repeat the advisory after ownership and impact are already acknowledged.
