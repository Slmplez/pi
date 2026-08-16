# Optimized for Response Time

If response time is the most important criterion, take advantage of the hierarchical structure and the transition priorities. Speed-critical actions are best built into the highest possible hierarchical level to produce efficient code and the quickest possible reaction.

This is illustrated by an example:

![](state_opt1.gif)

If the emergency stop button is pressed (emergency_stop = true), the system should stop as fast as possible, i.e. reach the Stop state. By drawing the associated transition from the Run hierarchy state to the Stop state, the transition has the highest priority in the hierarchy and is evaluated first.

If any of the substates is active and the emergency button is pressed, the transition from Run to Stop is always evaluated and the transition occurs.

Direct transitions from each of the substates to Stop are as efficient regarding time, but they require higher maintenance effort because four transitions are specified instead of one.

A separate trigger for time-critical events (emergency_stop = true in the example) also optimizes response time. The drawback is additional program code for the separate trigger.

See also

[Optimizing the State Machine](SM_Optimizing_the_State_Machine.md)
