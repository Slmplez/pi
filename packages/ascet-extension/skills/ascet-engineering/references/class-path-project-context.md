# Class Path and Project Context

Treat an exact Class path or OID as a locator. Read Component summary, surface, owner role, and outgoing references. Use complete stored Tree/Catalog/Project artifacts to find candidate Projects, then validate Project → wrapper → Package → Class in the live database.

Class roles: Customer wrapper/Class usually imply `integrationScope`; Core Package Class usually implies `featureScope`; a customer-only request on a shared Class routes back to the wrapper. Freeze scope only after context and signal flow are understood.
