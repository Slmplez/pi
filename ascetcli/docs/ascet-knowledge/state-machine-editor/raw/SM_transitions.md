# Transitions

A transition is a graphic object connecting two states. One end of the transition is attached to the source state where the transition begins. The other is connected to the destination state where the transition ends.

A transition may be interrupted by one or more junctions (see [Junctions](sm_junctions.md)) and split into several segments. In this case, one segment connects the output state with the junction, the others connect the junction with other junctions (if present) and with the destination state.

A priority is assigned to each transition. The higher the number, the higher the priority. If more than one transition originate from the same state or junction, they are evaluated in the order of their priorities. Two transitions from the same state may not have the same priority.

A trigger event is necessary for a transition to occur. Optionally, the transitions can also contain a condition and an action, the transition action.

A transition label describes the circumstances under which the system moves from one state to another. The name of the trigger is the first part of the transition label, condition and action are named in the second and third part of the label.

A transition is valid when its source state is active and its condition - if specified - is true. There are several kinds of transitions; see the links below.

See also

[Junctions](sm_junctions.md)

[Triggers](SM_triggers.md)

[Transitions Between Base States](SM_Transitions_between_base_states.md)

[Transitions from and to Hierarchy States](SM_Transitions_from_and_to_hierarchy_states.md)

[Transitions between Substates of different Hierarchies](SM_Transitions_between_substates_of_different_hierarchies.md)

[Loops](SM_Loops.md)

[Transitions with Junctions](SM_Transitions_with_junction.md)
