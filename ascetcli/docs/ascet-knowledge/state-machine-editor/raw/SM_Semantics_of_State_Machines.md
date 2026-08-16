# Semantics of State Machines

A state machine consists of a finite number of states. Each state represents a state a system can be in, for instance whether a door is locked, open, or closed. Under certain circumstances the state of the system changes. These state changes are modelled by transitions between the different states. For each possible transition to take place, a condition has to be fulfilled.

An external event, the trigger event, activates a state machine. A trigger is a public method of the state machine. A state machine always has to be in one of its states. At the beginning, a state machine is in a special state, the start state. If a trigger event occurs, the system reacts with the execution of actions (e.g., creation of a signal, change of a variable, or transition to another state).

The entry action of a state is executed when a transition to that state occurs. The state is activated before the execution of the entry action is started.

When a state machine is called for the first time, the entry action of the start state is not executed.

The static action of a state is executed if the state is active and a trigger event occurs which does not result in a transition from the state. When a transition between two substates of the same hierarchy state occurs, the hierarchy state (which is not left) executes and completes its static action after the source state was left, but before the transition action is executed.

The exit action of a state is executed when a transition from that state occurs. The state becomes inactive after the execution of the exit action is completed.

The transition action of a transition is executed after the source state has been left and before the destination state is activated.

The semantics describe how a state diagram is interpreted and executed and in which order the actions will be executed. Knowledge of the semantics of state diagram is essential for the creation of suitable state machines and the generation of efficient code. Different implementation options result in different simulation behavior and in the executable code.

The semantics of state machines contain rules for the

- Processing of states,
- Selection of transitions,
- Processing of transitions.

The following sections describe the semantics of state machines using examples. These cover a wide range of possible implementations and combinations of the different actions.

See also

[Example 1: Transition Between States](SM_Example_1__Transition_Between_States.md)

[Example 2: Transitions from One State](SM_Example_2__Transitions_from_One_State.md)

[Example 3: Loop](SM_Example_3__Loop.md)

[Junctions in State Machines](SM_Junctions_in_State_Machines.md)

[Hierarchical State Machines](SM_Hierarchical_State.md)
