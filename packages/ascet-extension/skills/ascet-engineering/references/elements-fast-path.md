# Elements Fast Path

Use `ascet_search.search` only when the Element identity is fuzzy. Resolve one exact Component and Element, then use `ascet_read.read_element` when current metadata affects the engineering decision.

Create or patch an ordinary Element with `ascet_edit.apply_element_spec`. For an existing Element, send only requested fields and preserve unread fields. Group multiple ordinary Elements for one Component in one action when supported. Choose one evidence-backed range source and never invent business values, defaults, units, ranges, calibration, or implementation metadata.

A new calibratable or tunable value requested for use by a consumer/business Class is not an ordinary Element request. Do not satisfy it with a local Parameter set to `calibration=true`; route the complete Provider Exported -> Consumer Imported -> Consumer Local Dependent chain to `ascet_edit.create_dependent_chain`. Use this ordinary path only for an explicitly requested standalone local Parameter or exact existing architecture evidence proving that pattern. Unrelated fixed local constants and existing endpoint-only patches remain ordinary-element work.

For a new ordinary Element, define its owner, role, kind, model type, scope, unit, range, data/default source, implementation, calibration or constant role, and ESDL/BDE usage point. Stop if required information is unknown.

Use `references/implementation-type-and-memory-layout.md` whenever value type, memory location, Formula, implementation range, or limit assignments are read or changed. Use `impl.valueType` for ordinary Elements; `impl.type` is invalid.

## Formula context

- `ident` is ASCET's built-in identity formula and does not require `projectPath`; use it directly without searching for or creating a Project.
- Any non-ident `impl.formula` requires one explicit `projectPath`. Never infer a Project from `componentPath`, Folder layout, or a sibling item named `Project`.
- Do not create a Project merely to satisfy `ident` validation. For custom formula: identify one exact existing Project and pass `projectPath` explicitly. If no unique Project context exists, stop rather than guess.
- Public `ascet_edit` reports `ascet_edit_project_context_required` for missing custom-formula context; direct Bridge calls report `project_context_required`. Both are distinct from `invalid_formula_reference`, which means a valid explicit Project lacks the requested formula.
