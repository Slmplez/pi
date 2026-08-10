# ESDL Fast Path

Use the fast path only after Project/Class context, frozen scope/layer, Method existence, signature, current ESDL, relevant Elements, Signal Flow, and `blockingUnknowns` are resolved.

Separate Method shell, signature, and body. Use `create_method` for the shell, `set_method_signature` for arguments/return, and `set_method_code` for body text. Do not fake arguments, returns, or declarations in ESDL; do not create same-name overloads. A Return Method has one explicit return value and complete return behavior.

Recommended write order: Element/Dependency → Method shell → Signature → ESDL body, each with preflight before write.
