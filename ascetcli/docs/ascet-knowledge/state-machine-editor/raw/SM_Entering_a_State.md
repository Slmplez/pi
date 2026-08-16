# Entering a State

1. If the state has an inactive higher-level state, steps 1–4 are executed for that state.
1. The state is activated.
1. The entry action is executed.
1. Carry out implicit entry actions as necessary:

1. If the state contains a subordinate diagram with a history, and if one of the substate was active after initialization, this substate is activated and its entry action executed.
1. If the state contains a subordinate diagram with a history, and if one of the substate was active after initialization, this substate is activated and its entry action executed. Otherwise, proceed as described in 4.a.
