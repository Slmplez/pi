# Junctions

A junction is a graphic object which considerably improves the legibility of state diagram and aids the generation of efficient code. Junctions form additional possibilities for representing the required system behavior.

Junctions are not states, they represent branching points in the state diagram. Nodes interrupt a transition (see [Transitions](SM_transitions.md)) and split it into segments. One segment connects the source state with the junction, one or more segments connect the interrupting junctions (if required), and the last segment connects the last junction with the destination state. Thus, junctions aid the representation of different transitions by splitting these into individual segments. At the same time, they allow reuse of transition segments.

Note the following when using junctions:

- Transitions from a starting state to several destination states are clearly represented.

| Column 1 | Column 2 |
| --- | --- |
| (A) | (B) |

You can achieve the same functionality modelled with a junction in Part A of the diagram by direct transitions from the start state source_state to the destination states (Part B of the diagram). However, using the junction brings a runtime benefit, as the transition segment between the start state and the junction is evaluated first. If this is already invalid, no transition can take place and you need not consider the segments leading away from the junction.

- Also, transitions from several starting states to a destination state are clearly represented.

| Column 1 | Column 2 |
| --- | --- |
| (A) | (B) |

Again, both ways of writing have the same meaning. You can (and should) assign an action shared by all three transitions to the segment leading away from the junction.

- If none of the transition segments leading away from the junction are valid, then no transition occurs and the system remains in the starting state.

- Transition segments from a junction into a state can contain actions.

![](state_junction_3c.gif)

It is not possible to assign an action to a transition segment ending in a junction. The complex semantics of such transition actions results in inefficient coding.

- Each segment of a transition can have a condition.

![](state_junction_2.gif)

- Transitions from one junction to another (cascading junctions) are allowed, all kinds of loops are forbidden.

| Column 1 |
| --- |
|  |
|  |

- Only one segment of a transition has a trigger. Usually, a trigger is assigned either to the segments leading towards the first junction of a transition, or to the segments leading away from the last junction, but not to all segments.

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  | or |  |

The assignment of triggers to more than one segment of the same transition is not deactivated. However, in such a case, ASCET outputs an error message if different triggers are assigned to the segments. You are therefore responsible for the assignment of triggers.

- If none of the segments leading to a possible destination state is valid, no transition occurs. The state remains in the source state.

See also

[Transitions](SM_transitions.md)

[Creating Junctions](creating_junctions.md)

[Creating a Transition](create_transition.md)
