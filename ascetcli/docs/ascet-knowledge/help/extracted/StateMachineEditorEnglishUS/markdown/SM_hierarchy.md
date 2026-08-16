# Hierarchy

State machines often have a large number of states. The hierarchy allows the organization of complex systems by defining higher or lower-level object structures. A hierarchical design usually reduces the number of transitions and produces structured and readable diagrams.

ASCET supports the hierarchical organization of states in the form of open and closed hierarchies. The only difference between them is the graphical representation: the subdiagram of a closed hierarchy state is created on a new drawing level, the subdiagram of an open hierarchy state is created on the same drawing level.

A state containing other states is called hierarchy state; states containing no other states are called base states. A state contained in a hierarchy state is called a substate of the hierarchy state. The system is always in a base state, and together with that base state also in its associated hierarchy states. One of the states in a hierarchy is marked as the [start state](SM_start_state.md).

When the state machine enters a hierarchy state, it starts with the start state of the subdiagram contained in the hierarchy state. If this state is hierarchical, too, it is in the start state of the hierarchical state and so on. If, however, the hierarchy has a [history](SM_History.md), the substate activated upon a transition to the hierarchy state is the one the subdiagram was in when the hierarchy state was last left.

It is possible to connect states that are not in the same hierarchy with pins on hierarchical state symbols. A connection between states via a pin is the same as if the states were connected directly.

A transition from a hierarchy state automatically includes the exit from the active substate. A transition from a substate can lead beyond the borders of hierarchy states to another substate. If a substate is active, its parent hierarchy state is active, too.

The [example](SM_Example__Hierarchy_State.md) shows a simple hierarchy state.

See also

[Example: Hierarchy State](SM_Example__Hierarchy_State.md)

[Start State](SM_start_state.md)

[History](SM_History.md)
