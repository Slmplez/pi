# Elements Fast Path

Use `ascet_search.search` only when the Element identity is fuzzy. Resolve one exact Component and Element, then use `ascet_read.read_element` when current metadata affects the engineering decision.

Create or patch an ordinary Element with `ascet_edit.apply_element_spec`. For an existing Element, send only requested fields and preserve unread fields. Group multiple ordinary Elements for one Component in one action when supported. Choose one evidence-backed range source and never invent business values, defaults, units, ranges, calibration, or implementation metadata.

For a new ordinary Element, define its owner, role, kind, model type, scope, unit, range, data/default source, implementation, calibration or constant role, and ESDL/BDE usage point. Stop if required information is unknown.

Elements that form a complete Parameter Dependency Chain belong to `ascet_edit.create_dependent_chain`, not this ordinary Element path.
