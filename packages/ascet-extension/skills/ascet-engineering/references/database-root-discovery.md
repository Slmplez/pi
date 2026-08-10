# Database Root Discovery

Start from the user path, feature semantics, or known scope. Use bounded `ascet_get.tree`; expand Package, Project, and Component only as needed. `component_refs` and `dbitem_refs` are outgoing references, not reverse-reference APIs.

Use stored Tree/Catalog/Project closure plus Pi `find`/`grep`/`read` to discover candidate Projects. A grep hit is only a candidate; validate identity and ownership with an exact live read. Check `coverage` and `truncated`; a partial miss cannot prove absence. Do not run an unbounded live database scan or choose the first same-name result.
