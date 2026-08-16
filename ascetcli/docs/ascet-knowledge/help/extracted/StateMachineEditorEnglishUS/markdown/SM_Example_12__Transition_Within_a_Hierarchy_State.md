# Example 12: Transition Within a Hierarchy State

If a transition takes place inside a hierarchy state, the state machine remains in that hierarchy state. Therefore, the static action of the hierarchy state is executed, as well as the static actions of all hierarchy states that contain the state in question. They are executed after all exit actions, and before the transition action, from the innermost hierarchy state to the outermost one.

![](state_exec5n.gif)

The state machine is the same as in [Example 11: Transition to a Hierarchy State With History](SM_Example_11__Transition_to_a_Hierarchy_State_With_History.md). The state machine is in the speed state. The temperature is still 5 °C, the frost warning is switched off (frost_warning is false). A trigger event trigger_100ms occurs, the switch is pressed (key_pressed is true). The following steps are executed:

1. The system checks to see if there is a valid transition.
1. The transition from the display hierarchy state to reset_frost_warning is initiated by another trigger (trigger_10s); it is of no importance here.
1. The transition from speed to the distance substate is evaluated. The condition [key_pressed] is fulfilled, the transition is valid.
1. The speed state has no exit action. It is deactivated.
1. The display hierarchy state is not left. Therefore, its static action count is executed and completed.
1. The transition from speed to distance has no transition action, and the distance substate is activated.
1. The entry action clear_display of the distance substate is executed and completed.

With that, the evaluation of the state machine initiated by the trigger_100ms trigger event is finished.

See also

[Example 11: Transition to a Hierarchy State With History](SM_Example_11__Transition_to_a_Hierarchy_State_With_History.md)
