# CNMS/CUST Routing and Ownership

Use CNMS/CUST structure only when it helps locate the effective implementation or select the correct modification layer. Do not infer migration, freshness, or feature coverage from a root name.

Track `databaseRole`, `ownerLayer`, and exactly one `integrationScope` or `featureScope` only when relevant. Database role changes search priority; requirement intent and canonical definition ownership determine scope.

Customer-specific behavior starts from the active Customer Product Project, its Formula/assembly, interface, wrapper, and Project Module instance. Shared behavior starts from bounded generic Package, China Package, or CNMS candidates, followed by representative active Project impact. If both remain plausible after exact reads, stop and ask.

Treat `Project::Module` as assembly context and resolve the canonical definition when ownership matters. Preserve exact paths, including similarly spelled roots; never normalize them before identity validation. Do not require a complete database scan for an exact Project, Class, Module, Method, path, or OID request.
