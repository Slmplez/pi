# Executing a (Basis) State

1. The transitions leading away from the state and transitions leading out of higher-level states are evaluated in order of their priority.
1. If a valid transition is found, it is executed. This ends the execution of the state.
1. If no valid transition from the state is available, the static action is executed.
1. If the state has higher-level states, their static actions are executed.
