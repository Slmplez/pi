# Write Execution

Freeze target, scope, changes, mappings, and variants before writing. Ordinary `ascet_edit` mutations use one `intent=apply` call that snapshots the current permission mode, performs authoritative non-mutating preflight before any prompt, revalidates approved scope, optionally acquires editability inside the guarded Bridge session, writes, and performs mandatory readback. Editability acquired by the operation may persist and is reported in the result; do not claim automatic release or reversion.

For a dependency chain, call `ascet_read.read_dependent_chain` first and `ascet_edit.set_dependent_chain` second. Runtime reuses existing guarded approval, editability, mutation, and readback infrastructure.

`committed` and `no_change` are successful terminal results. Existing conflicts must return zero mutation. `rolled_back` means the attempted write failed but the original state was readback-verified. Stop on `rollback_failed` or `unknown_outcome`; do not blindly retry.
