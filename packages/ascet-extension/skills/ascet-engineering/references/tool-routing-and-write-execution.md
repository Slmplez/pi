# Tool Routing and Write Execution

Use one canonical public Action for each surface:

- Method body → `ascet_edit.set_method_code`
- Module header or external C → `ascet_edit.set_module_code`
- StateMachine state, transition, binding, or start state → `ascet_edit.set_state_machine_code`
- Ordinary Elements → `ascet_edit.apply_element_spec`
- Complete Parameter Dependency Chain → `ascet_edit.create_dependent_chain`

Use `ascet_edit.create_method` for a new Method shell and `ascet_edit.set_method_signature` only for arguments or return metadata. Follow the active Tool schema for action parameters; do not reproduce internal Bridge operations or runtime stages here.

Use `intent=apply` for every mutation. Use `mode=check` for read-only editability inspection; runtime owns permission handling, validation, mutation, and required automatic readback.

Search, Get, and Read results are interpreted according to their selected Action Contract and do not require write verification. Mutation success requires passed automatic verification. A verified no-op is also terminal success. Stop on blocked, error, partial, rolled-back, unknown, or missing verification outcomes. Do not issue an extra read solely to prove a verified successful write again.
