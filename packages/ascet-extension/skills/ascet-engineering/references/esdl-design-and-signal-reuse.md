# ESDL Design and Signal Reuse

Describe `source → transform → consumer` only to the depth required by the change. Reuse compatible Imported or Exported Signals, Local Elements, Method outputs, Parameters, Enums, Formulas, BDE connections, and Package interfaces.

For each reused object, confirm exact identity, owner, role, type, unit, lifecycle, and usage point when those properties affect compatibility. Create a new object only when semantics, scope, type, unit, lifecycle, or ownership makes reuse incorrect, and record the reason.

With complete evidence, produce concrete ESDL or an exact patch rather than high-level pseudocode. Preserve existing style and avoid unrelated code movement. Keep unknown business behavior explicit and stop instead of inventing it.

Keep AI-generated changes in minimal contiguous regions; do not expand a marker over unrelated user-authored code.
