# Dependency Advanced Path

Use this path only for a complete Provider Exported Parameter, Consumer Imported Parameter, Consumer Local Dependent Parameter, and Formula/Formal/Variant binding.

Name Provider Exported and Consumer Imported Parameters with the same `P_<Name>`. Name the Consumer Local Dependent Parameter `C_<Name>`. Do not use `C_` for unrelated Local State or Internal Variables.

Provide exact Components and complete Element and binding definitions to `ascet_edit.create_dependent_chain`. If Provider component path is omitted, runtime may perform unique exact Provider resolution; never choose the first Search candidate manually. Use `ascet_read.read_dependent_chain` only when current chain state affects design, conflict analysis, completion, or diagnosis.

Create-or-reuse behavior is mandatory:

- Missing Element: create it.
- Exact Element: reuse it.
- Metadata conflict: reject without overwrite.
- Binding conflict: reject without overwrite.
- Successful apply: require automatic full readback.

The Provider, Imported, and Local Elements in a complete chain must not also be managed by `ascet_edit.apply_element_spec` in the same change. Stop rather than guess Formula, Formal, mapping, DataVariant, type, unit, range, value, or implementation metadata.

Use `references/implementation-type-and-memory-layout.md` for Provider and Local implementation decisions. These roles use `implementation.mode=explicit|ascetDefault`; they do not accept public `impl.type`.
