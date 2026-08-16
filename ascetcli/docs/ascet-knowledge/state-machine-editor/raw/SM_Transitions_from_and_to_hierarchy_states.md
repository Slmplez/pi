# Transitions from and to Hierarchy States

The transition from C to the hierarchy state (see [Hierarchy](SM_hierarchy.md)) D_hierarchy is valid if C is active, the trigger event trigger occurs, and the condition [switch_on] is true. It is an explicit transition to the hierarchy state.

For a valid transition to a hierarchy state, you must implicitly define one substate as the destination. Here, you do this by marking the substate D1 as start state (see [Start State](SM_start_state.md)). What is executed in fact is the transition from C to D1.

The transition from D_hierarchy to C is valid if D_hierarchy is active, the trigger event trigger occurred, and the condition [switch_off] is true, regardless of which substate is active.

![](state_trans2.gif)

See also

[Hierarchy](SM_hierarchy.md)

[Start State](SM_start_state.md)
