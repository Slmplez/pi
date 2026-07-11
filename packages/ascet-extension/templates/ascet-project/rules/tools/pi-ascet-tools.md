# PI ASCET Tool Map

Use canonical PI ASCET tools only.

- Runtime/status: `ascet_status`, `ascet_scheduler_status`
- Exploration: `ascet_explore`
- Search/resolve: `ascet_search`
- Read evidence: `ascet_read`
- Diff: `ascet_diff`
- Write: `ascet_write`, `ascet_batch_write`
- Verify: `ascet_verify`

Do not use old ASCET Copilot tool names such as `AscetExploreTool`, `AscetSearchTool`, or `AscetReadTool`.

For BDE or block diagram reads, use `ascet_read` with action `read_block_diagram`.
