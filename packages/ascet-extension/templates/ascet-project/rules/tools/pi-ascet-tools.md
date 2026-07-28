# PI ASCET Tool Map

Use canonical PI ASCET tools only.

- Runtime/status: `ascet_status`, `ascet_scheduler_status`
- Exploration: `ascet_explore`
- Search/resolve: `ascet_search`
- Read evidence: `ascet_read`
- Diff: `ascet_diff`
- Write: `ascet_edit`, `ascet_batch_write`
- Editable state: `ascet_edit`
- Verify: `ascet_verify`

Do not use legacy CamelCase ASCET Copilot tool identifiers. Use only the canonical PI `ascet_*` tools listed above.

For BDE or block diagram reads, use `ascet_read` with action `read_block_diagram`.
`read_block_diagram` returns the agent-facing semantic graph by default.
