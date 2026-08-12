# Class Path and Project Context

Treat an exact Class/Module path or OID as a locator. Read Component summary, surface, canonical owner role, and outgoing references. A path may identify a definition or a Project context, and the same OID may be visible through several Projects.

When Project context is required for scope or impact, use complete stored Tree/Catalog/Project artifacts to find candidate Projects, then validate Project → Module instance → same-OID canonical definition in the live database. Do not search for Project context when an exact-target read can proceed safely without it.

Customer wrapper/Class roles usually imply `integrationScope`; shared Package behavior usually implies `featureScope`; a customer-only request on a shared Class routes back to the wrapper. Freeze scope only after context and signal flow are understood.
