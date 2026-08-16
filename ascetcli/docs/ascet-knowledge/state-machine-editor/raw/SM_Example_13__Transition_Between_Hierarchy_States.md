# Example 13: Transition Between Hierarchy States

This state machine acts as a data generator. When enable is set to true, a signal is produced, either a ramp (state ramp, mode = 1) or a sine (state sinus, mode = 2).

![](state_exec3bneu.gif)

The down substate in the sinus hierarchy state is active. The signal mode is set to 1, enable remains true. A trigger event occurs, and the following steps are performed:

1. The system checks to see if there is a valid transition. Since the transitions from the sinus hierarchy state have higher priorities than those from down, they are evaluated first.
1. The transition from sinus to nothing has the highest priority. It is invalid, though, because the condition [enable == false] is not fulfilled.
1. The transition from sinus to ramp is evaluated next. The condition [(enable ==true) && (mode == 1)] is true, the transition takes place.

The transition from the down substate to the up substate has the lowest priority and is not evaluated.

1. The down substate has no exit action, it is deactivated immediately.
1. The exit action stop_sinus of the sinus hierarchy state is executed and completed.
1. The sinus hierarchy state is deactivated.
1. The transition from sinus to ramp has no transition action, therefore the ramp hierarchy state is activated next.
1. The entry action start_ramp of ramp is executed and completed.
1. The calc substate is the start state within the hierarchy. It is activated.
1. The entry action value = PMn, output = value, of calc is executed and completed.

With that, the evaluation of the state machine initiated by this trigger event is finished.
