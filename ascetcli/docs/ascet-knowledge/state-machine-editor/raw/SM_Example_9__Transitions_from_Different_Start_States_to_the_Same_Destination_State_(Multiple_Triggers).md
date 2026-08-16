# Example 9: Transitions from Different Start States to the Same Destination State (Multiple Triggers)

The state machine is the same as in [Example 8: Transitions from a Start State to Different Destination States (Multiple Triggers)](SM_Example_8__Transitions_from_a_Start_State_to_Different_Destination_States_%28Multiple_Triggers).md). The system is in the state soda_on (or in one of the substates of the hierarchy).

![](state_exec_junc5.gif)

A trigger event trigger_soda occurs, the machine is switched off (switch_off is true). The following steps are executed:

1. The system checks to see if there is a valid transition or a segment from soda_on available.
1. The transition segment from soda_on to the junctions is valid, as the condition [switch_off] is fulfilled. As the trigger event trigger_soda has occurred, the segment from the junction in the state beverage_off is also valid, the transition can occur.
1. The necessary steps in the hierarchy state are executed.
1. The exit action shut_down of the state soda_on is executed.
1. The transition from soda_on to beverage_off has no transition action. Therefore, the state beverage_off is activated next.
1. The entry action reset of beverage_off is executed and completed.

With that, the evaluation of the state machine initiated by this trigger event is finished.

See also

[Example 8: Transitions from a Start State to Different Destination States (Multiple Triggers)](SM_Example_8__Transitions_from_a_Start_State_to_Different_Destination_States_%28Multiple_Triggers).md)
