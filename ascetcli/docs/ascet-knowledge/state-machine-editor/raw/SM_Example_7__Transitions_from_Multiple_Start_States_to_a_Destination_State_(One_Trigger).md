# Example 7: Transitions from Multiple Start States to a Destination State (One Trigger)

The state machine is the same as in [Example 6: Loop construction](SM_Example_6__Loop_construction.md). The state Cola is active, the glass has been filled and the logical variable glass_full set to true.

![](state_exec_junc3.gif)

A trigger event trigger_10ms occurs, and the following steps are performed:

1. The system checks to see if there is a valid transition or a valid segment from Cola available.

The transition segment from Cola to the right-hand junction is valid.

1. The transition segment from the junction to the state waiting has the condition [glass_full]. As glass_full was set to true, this segment is also valid and the transition can take place.
1. The Cola state has no exit action. It is deactivated.
1. The transition has no transition action and therefore the state waiting is activated next.
1. The entry action select=0; from waiting is executed and completed.

With that, the evaluation of the state machine initiated by this trigger event is finished.

See also

[Example 6: Loop construction](SM_Example_6__Loop_construction.md)
