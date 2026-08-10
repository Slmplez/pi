# Dependency Advanced Path

Resolve consumer, imported element, provider, exported element, kind, scope, name, and OID before writing. Imported and Exported Parameters must be same-named; Constant and System Constant targets do not require an Exported provider.

Use explicit `formals`, `mappings`, and `variantPolicy`. Never infer mappings from formula text or fuzzy names. Select affected variants explicitly. When changing dependent to independent, provide a restoration source per variant. `set_element_dependency` changes an existing element only; create elements first with `apply_element_spec`.
