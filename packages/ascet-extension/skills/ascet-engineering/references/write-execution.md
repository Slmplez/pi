# Write Execution

Freeze target, scope, changes, mappings, variants, and approval before preflight. Preflight must not write. Execute only the same approved payload with `executeWrite=true`; do not broaden scope or regenerate a plan during execution.

Runtime automatically performs action-specific verification/readback. A successful executed `ascet_edit` result completes the write. On failure or unknown outcome, report the failure, do not claim completion, and do not blindly retry. Read again only when the next engineering step needs fresh state, failure diagnosis requires it, or the user explicitly requests it.
