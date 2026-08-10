# ESDL Design and Signal Reuse

Describe `source → transform → consumer` before designing code. Reuse compatible Imported/Exported Signals, Local Elements, Method outputs, Parameters, Enums, Formulas, BDE connections, and Package interfaces. For each reused object record exact path, owner, scope, type, unit, and usage point.

Create a new object only when semantics, scope, type, unit, lifecycle, or ownership make reuse incorrect; record the reason. With complete evidence, show concrete ESDL code or an exact patch rather than only high-level pseudocode.
