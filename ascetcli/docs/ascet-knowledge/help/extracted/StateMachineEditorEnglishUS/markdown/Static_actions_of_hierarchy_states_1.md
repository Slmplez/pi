# Static Actions of Hierarchy States

For static actions in hierarchy states, an additional optimization option exists.

By default, code for the static action of a hierarchy state is generated for each transition that does not lead out of the hierarchy, as well as once for each substate of the hierarchy. In large hierarchies, this can result in a noticeable part of the entire code.

If you activate the Optimize Static Actions (Restricted Modeling) code optimization option in the project that contains the state machine, code for the static action of a hierarchy state is generated only once for each substate. Thus, code size can be reduced.

A disadvantage of this optimization is that it does not work for some models. If a state machine contains a substate with a direct transition out of its hierarchy state, this transition must have the highest priority of all transitions from that substate. Otherwise, code generation aborts with the following error message:

ERROR(YSm72): higher priority transitions do not exit hierarchy state <state name>, but this transition does.

The changes in code generation change the state machine semantics as follows:

- The static action of the hierarchy state is executed before the conditions of the transitions from the substate are evaluated.
- If no transition occurs, the static action of the hierarchy state is executed before the static action of the substate.
- If a transition occurs, the static action of the hierarchy state is executed before the exit action of the substate.

The changes can alter the behavior of the state machine. If you activate the option for an existing state machine, check its behavior carefully.

Two examples illustrate the effect of this optimization. In both examples, the state machine consists of the base state OuterEnd and the hierarchy state HState with the substates Start and InnerState1. Two transitions leave Start, one of them (Start to OuterEnd) also leaves the hierarchy state HState.

[Example 1: Code Generation](SM_Example_1_CodeGeneration.md)

[Example 2: Error Generation](SM_Example_2_Static_action_of_Hierarchy_States.md)
