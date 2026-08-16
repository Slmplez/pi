# Actions or Conditions

Actions/Conditions

Optimizing actions or conditions for code size means that identical parts of actions/conditions are generated as separate private functions that are called at need.

This can be achieved by specifying the repeatedly used parts as methods in a separate diagram, which are then called from the actions (see figure).

![](ch447_d.gif)

As an alternative, you can enter the code directly at the state or transition and use the outlining functionality.

For both alternatives, the code is generated only once. The price to be paid are additional function calls.

In some cases (small private functions, few calls), it may be advantageous, regarding code size, to insert the code on the spot. You can activate auto-inlining (see [Optimizing the State Machine](SM_Optimizing_the_State_Machine.md)) with the Auto-inline private methods (Smaller code-size - may be changed locally) and Auto-inline private methods (Smaller code-size) options, with that, you have selected the most effective optimization of actions and conditions for code size.

See also

[Optimizing the State Machine](SM_Optimizing_the_State_Machine.md)
