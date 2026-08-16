# Example 5: No transition

The state machine is the same as in [Example 4](SM_Example_4_If_Then_Else_Construction.md). The state machine is in the waiting state. A trigger event trigger_10ms occurs, the selection select is set to 5 by mistake. The following steps are executed:

1. The system checks to see if there is a valid transition or a valid segment from waiting.

The transition segment from waiting to the left-hand junction is valid.

1. The transition segments leading away from the junction are examined in the order of their priority.

As select was set to 5, none of the conditions are fulfilled, all the segments are invalid.

1. There is no valid transition from waiting. The system remains in the state waiting. As the state has no static action, nothing happens.

With that, the evaluation of the state machine initiated by this trigger event is finished.

See also

[Example 4: If…Then…Else Construction](SM_Example_4_If_Then_Else_Construction.md)
