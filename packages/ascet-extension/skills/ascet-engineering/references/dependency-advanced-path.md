# Dependency Advanced Path

Resolve the exact Provider Component, Consumer Component, Imported Parameter, Local Dependent Parameter, mapping targets, and variants before writing. Provider Exported and Consumer Imported Parameters must use the same `P_<Name>`; the Consumer Local Dependent Parameter uses `C_<Name>`. Do not apply `C_` to an ordinary Local State/Internal Variable that is not part of this dependency chain.

Read the current chain with `ascet_read.read_dependent_chain`, then preview or apply it with `ascet_edit.set_dependent_chain`. If Provider is omitted, Runtime uses native Element Search and exact Element validation. Provide explicit binding metadata when the existing chain is incomplete.

The action uses validate-or-update semantics for existing Elements:

- missing Provider, Imported, or Local Element: reject without mutation
- exact existing state: no-op and return `no_change`
- different existing Element, formula, mapping, or variant state: reject before mutation
- successful mutation: mandatory readback of all stages
- failure after mutation: reverse compensating rollback with readback

Treat `write_rejected`, `write_verification_failed`, and `database_changed` as stop conditions. Do not retry until the exact live state is read.
