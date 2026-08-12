# Database Root Discovery

Bind stored Tree, Catalog, Project closure, or export evidence to the exact live database identity that produced it. A changed `database.name` invalidates prior database artifacts even when `database.path` is unchanged. Report a `database.name`/`database.path` inconsistency and do not mix evidence across the identities.

Start from the user path, feature semantics, or known scope. Use bounded `ascet_get.tree`; expand Package, Project, and Component only as needed. Exact Project, Class, Module, Method, or OID requests do not require a complete live database scan. Use a complete stored Tree/Catalog for explicit database-wide candidate discovery when available.

Known Customer, Package, Library, CNMS, and Platform roots are heuristics only. Preserve exact paths, including similarly named roots. Use object kinds, Project topology, OIDs, references, and interface semantics when common roots are absent.

`component_refs` and `dbitem_refs` are outgoing references, not reverse-reference APIs. Use stored Tree/Catalog/Project closure plus Pi `find`/`grep`/`read` to discover candidate Projects. A grep hit is only a candidate; validate identity and ownership with an exact live read.

Check `coverage` and `truncated`; a partial miss cannot prove absence. Do not choose the first same-name result or trigger a new unbounded live scan for ordinary target work.
