# Example 10: Transition to a Hierarchy State Without History

On entry into a hierarchical level, there are two possibilities: either entry into the start state of the hierarchy state (this example). In this case, the hierarchy state has forgotten the substate it has been in when it was left. Alternatively, the last active substate is entered. In this case, the hierarchy state has a history ([Example 11: Transition to a Hierarchy State With History](SM_Example_11__Transition_to_a_Hierarchy_State_With_History.md)).

For each hierarchy state it is possible to determine whether it has a history or not. When entering a hierarchy state with history for the first time, the start state of that hierarchy state is entered.

![](state_exec4n2.gif)

In the state display, this hierarchical state machine contains the display function from [Example 3: Loop](SM_Example_3__Loop.md). display is a hierarchy state. As soon as a temperature of 3 °C is exceeded, the frost warning is to be reset. The second state on the highest hierarchy level, reset_frost_warning, is used for that purpose. Every 10 seconds, a change from display to the reset_frost_warning state can occur, where the frost warning is switched off.

After the frost warning was displayed (frost_warning = true), the distance display was selected so that the system was in the distance state. The temperature rose to 5 °C, and the transition from display to reset_frost_warning took place when the trigger event trigger_10s occurred. The system is now in the reset_frost_warning state. A trigger event trigger_100ms occurs, and the following steps are performed:

1. The system checks to see if there is a valid transition from reset_frost_warning.
1. The transition from reset_frost_warning to display has no condition, it is therefore valid at every trigger_100ms trigger event.
1. The reset_frost_warning state has no exit action. It is deactivated.
1. The transition from reset_frost_warning to display has no transition action, and the display hierarchy state is activated next.
1. The reset_count entry action of the display hierarchy state is executed and completed.
1. The temperature substate is the start state in the hierarchy. It is activated.
1. The entry action clear_display of the temperature substate is executed and completed.

With that, the evaluation of the state machine initiated by the trigger_100ms trigger event is finished.

See also

[Example 11: Transition to a Hierarchy State With History](SM_Example_11__Transition_to_a_Hierarchy_State_With_History.md)

[Example 3: Loop](SM_Example_3__Loop.md)
