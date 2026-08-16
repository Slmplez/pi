# Executing a Transition

The transitions are evaluated in the order of their priority. Transitions from a hierarchy state always have a higher priority than transitions from the substates of this hierarchy state.

1. A transition or transition segment is tested.
1. If the transition/segment is invalid, the transition/segment with the next-lowest priority is tested.
1. If the transition/segment is valid, the next step depends on where the transition/segment ends.

In a state:

1. No additional transitions or transition segments are tested. In the case of a transition segment from a junction, the segment is pulled in to the junction in question to obtain a complete transition.
1. The substates of the start state are left (see [Leaving a State](SM_Leaving_a_State.md)).
1. The start state is left.
1. The transition action is executed.
1. The system enters the destination state (see [Entering a State](SM_Entering_a_State.md))

In a junction:

The transition segments leading away from the junction are evaluated as described in steps 1 – 3.

1. If all the transition segments leading away from a junction are invalid, the system returns to the start state from which the junction was reached. As the segment in the junctions does not belong to any valid transition, steps 1 – 4 are executed for the transition/segment with the next-lowest priority.
1. If all of the transitions/segments leading away from a state are valid, then no transition occurs and the system remains in the state.

See also

[Leaving a State](SM_Leaving_a_State.md)

[Entering a State](SM_Entering_a_State.md)
