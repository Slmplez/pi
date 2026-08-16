# Example 2: Transitions from One State

This state machine models a display. Outside temperature, speed, average speed and distance covered can be displayed as required. There is also a key to toggle the display. If the outside temperature falls below 1°C, a change to the temperature display occurs, and a frost warning is shown.

![](state_exec2b.gif)

The state machine is in the speed state. A trigger event trigger_100ms occurs, the temperature drops from 1.5 °C to 0.5 °C. The switch is not pressed. The following steps are executed:

1. The system checks to see if there is a valid transition from speed.
1. The transition from speed to distance has the highest priority, and is evaluated first. However, the [key_pressed] condition is not fulfilled, the transition is invalid.
1. The transition from speed to temperature has the condition [t_air < 1 && !frost_warning]. At first, the temperature was above the threshold of 1 °C and no frost warning was required. Now, it has dropped to 0.5 °C. Both parts of the condition are true, the transition is valid.
1. The speed state has no exit action. It is deactivated.
1. The /frost_warning = true transition action is executed, and the frost warning appears.
1. The temperature state is activated.

Since that state has no entry action, the evaluation of the state machine initiated by this trigger event is finished.
