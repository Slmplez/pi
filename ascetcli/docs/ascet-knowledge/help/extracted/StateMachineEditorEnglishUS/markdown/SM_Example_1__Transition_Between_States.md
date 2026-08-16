# Example 1: Transition Between States

This simple state machine models a light switch. At the beginning, the lamp is off, the state dark is active. The trigger event trigger occurs and initiates the evaluation of the state machine. The light switch is pressed, so that the condition switch_on is true.

![](state_exec1b.gif)

The following steps are executed:

1. The state diagram checks to see if there is a valid transition.
1. The dark state is active so that only the transition from dark to bright has to be evaluated. The condition [switch_on] is fulfilled, the transition is valid.
1. The dark state has no exit action that could be executed. It is deactivated.
1. The transition action is executed, the counter switch_count is increased by 1.
1. The bright state is activated.
1. The lamp_on entry action is executed and completed. The lamp is switched on.

With that, the evaluation of the state machine initiated by this trigger event is finished.

Every state can have transitions to more than one other state. To make the behavior of the state machine deterministic, each transition has to be assigned a priority. The priority determines the order in which the conditions belonging to the transitions are checked. Once a condition evaluates to true, the associated transition takes place, and all other conditions belonging to transitions with lower priorities are not tested. If no condition evaluates to true, the state remains unchanged and the static action is executed.
