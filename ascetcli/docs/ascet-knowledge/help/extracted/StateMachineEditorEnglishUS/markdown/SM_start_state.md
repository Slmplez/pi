# Start State

The start state specifies which state is to be activated when there are several possibilities on the same hierarchy level. Thus, the start state of the entire state machine, or that of a hierarchy level is determined.

A common error in the specification of state machines is the generation of several states without marking one of them as start state. In that case, there is no indication of which state becomes active by default. Therefore, on code generation, ASCET outputs an appropriate error message.

See also

[Example: Start State](SM_Example__Start_State.md)

[Defining the Starting State](SM_Define_StartState.md)
