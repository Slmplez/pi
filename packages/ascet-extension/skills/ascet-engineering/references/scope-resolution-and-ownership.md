# Scope Resolution and Ownership

Use `integrationScope` for Customer Project adaptation, Variant, Formula, assembly, customer mapping, scheduling, wrappers, customer-owned ESDL/Elements, and customer-only parameters. Analyze Customer Project → assembly/Formula → customer interface/wrapper → Package join point.

Use `featureScope` for generic or China-shared Package algorithms, public interfaces, StateMachines, shared Parameters, and cross-customer defects. Analyze Package/CNMS candidate → Module/Class/Method/BDE/Provider → representative active Project impact.

Keep database role, owner layer, freshness evidence, and modification scope separate. A CUST Project may assemble a shared definition, and a CNMS Project may assemble a Project- or Customer-owned definition. Resolve `Project::Module` through its exact OID to the canonical definition before selecting the edit layer.

An exact Class path or OID is a locator, not a scope conclusion. Determine owner role, requirement intent, affected layer, excluded objects, and editability from live evidence. Keep both candidates and ask the user when scope is ambiguous.
