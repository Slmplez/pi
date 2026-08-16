# Example 15: Transition Between Substates of Different Hierarchies

Transitions can lead directly from the substate of one hierarchy state to the substate of another hierarchy state.

![](state_exec6bneu.gif)

This state machine is the same as the one in [Example 13: Transition Between Hierarchy States](SM_Example_13__Transition_Between_Hierarchy_States.md), only the transition from the up substate in sinus to the substate calc in ramp was added.

The up substate in the sinus hierarchy state is active. The value value is lower than the maximum PMx. A trigger event occurs. mode remains 2, and enable remains true, but the fast-switch is pressed (fast_switch = true). The following steps are executed:

1. The system checks to see if there is a valid transition.
1. The transitions from sinus to nothing and from sinus to ramp are evaluated first. They are both invalid because the associated conditions are not fulfilled.
1. The transition from substate up to substate down is evaluated next. It is invalid, too, because the condition [value >= PMx] is not fulfilled.
1. The transition from up to the calc substate has the lowest priority and is evaluated last. The condition [fast_switch] is true, the transition takes place.
1. The up substate has no exit action, it is deactivated immediately.
1. The exit action stop_sinus of the sinus hierarchy state is executed and completed.
1. The sinus hierarchy state is deactivated.
1. The transition action (/mode = 1, fast_switch = false) is executed and completed.
1. The ramp hierarchy state is activated.
1. The entry action of ramp is executed and completed.
1. The calc substate is activated.
1. The entry action of calc is executed and completed.

With that, the evaluation of the state machine initiated by this trigger event is finished.

See also

[Example 13: Transition Between Hierarchy States](SM_Example_13__Transition_Between_Hierarchy_States.md)
