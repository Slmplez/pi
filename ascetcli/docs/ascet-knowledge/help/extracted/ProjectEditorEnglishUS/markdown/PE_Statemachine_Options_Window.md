# Statemachine Node

The Statemachine node contains the following options:

##### Outline Generated Methods (may be changed locally)

If identical code is required for different transitions out of the same hierarchy state, a separate method is created (Outlining) for this code under certain conditions. This method is called wherever required.

If you do not want to create separate methods and method calls, deactivate the option. In that case, the action code is inserted directly wherever required.

##### Auto-inline private methods (smaller code-size - may be changed locally)

If small private functions (or functions with a low number of callers) are inlined, both code size and runtime are saved.

If the option is activated, the code generator recognizes such functions automatically and directs the compiler to inline them.

##### Hierarchical Code-Generation (may be changed locally)

Code for state machines can be generated either flat (one switch statement with a case expression for each state) or hierarchical (nested switch statements according to the state hierarchy). Flat code generation (deactivated) optimizes for runtime, hierarchical code generation (activated) optimizes for code size.

##### Optimize Static Actions (Restricted Modeling):

When the option is deactivated (default), code for the static action of a hierarchy state is generated separately for each transition that does not leave the hierarchy state.

When the option is activated, the static action of a hierarchy state is generated only once for each substate. Thus, the code size is reduced.

Optimization with this option changes the order for the execution of actions and evaluation of conditions—and thus possibly the state machine behavior. In addition, this optimization is not possible for some models. A more detailed description is given in [Optimizing the State Machine](StateMachineEditorEnglishUS.chm::/SM_Optimizing_the_State_Machine.htm).

##### Generate well-formed switch

If the option is activated, state machine code is generated that complies with the MISRA [Motor Industry Software Reliability Association] rules 14.7, 15.2, and 15.3.

##### Initialize history variable with zero

If the option is activated, the history variables of hierarchy states in the project are initialized with 0 instead of the respective start state.

This causes an additional assignment in the code and may violate the MISRA rule 15.3.

See also

[State Machines - Optimizing the State Machine](StateMachineEditorEnglishUS.chm::/SM_Optimizing_the_State_Machine.htm)
