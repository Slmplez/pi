# Example 17: No Transition

The state machine is the same as in [Example 16: Transition From a Substate to a Hierarchy State](SM_Example_16__Transition_From_a_Substate_to_a_Hierarchy_State.md). The state machine is in the temperature state. The temperature is unchanged. A trigger event trigger_100ms occurs, the switch is not pressed (key_pressed is false). The following steps are executed:

1. The system checks to see if there is a valid transition.
1. Another trigger initiates the transition from display to reset_frost_warning, it is of no importance here.
1. The transition from temperature to speed is invalid because the switch was not pressed.
1. The transition from temperature to display is invalid because frost_warning = true and thus the condition is false.

There are no other possible transitions available.

1. The static action show_temperature in the temperature substate is executed and completed.
1. The static action count in the hierarchy state display is executed and completed.

With that, the evaluation of the state machine initiated by the trigger_100ms trigger event is finished.

See also

[Example 16: Transition From a Substate to a Hierarchy State](SM_Example_16__Transition_From_a_Substate_to_a_Hierarchy_State.md)
