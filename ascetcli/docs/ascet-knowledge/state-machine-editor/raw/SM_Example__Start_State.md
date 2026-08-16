# Example: Start State

The state neutral is the start state of the entire state diagram shown below, first is the start state of the hierarchy state engaged.

![](images/state_hier1.gif)

With that, the state neutral becomes active when the state machine is first activated. If you had not defined a start state, it would be unclear whether neutral or engaged should be activated. When a transition from neutral to engaged occurs, the substate first is activated inside the hierarchy state.
