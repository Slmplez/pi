# Hierarchical Code Generation

Two possibilities exist to generate code for a hierarchical state machine:

With flat code generation, the hierarchy is flattened, i.e. a single switch statement is generated for all (basis) states and transitions.

With hierarchical code generation, several switch statements are generated, nested according to the hierarchy. To activate this kind of code generation, the following options must be activated:

1. Project settings, Statemachine node: Hierarchical Code Generation (may be changed locally)
1. Implementation editor of the state machine, Settings tab:Hierarchical code generation for State Machines

When the first option is not activated, no hierarchical code generation is done. When the first option is activated , the second option activates/deactivates hierarchical code generation for a particular state machine.

With hierarchical code generation, code for transitions from hierarchy states is generated only once, instead of once for each affected basis state with flat code generation. Thus, code size is reduced. The reduction can be considerable (up to 30%). In the experiment, hierarchical and flat code generation behave identical for identical state machines.

For hierarchy states without transitions and/or static actions, code size is not reduced, but slightly (1–2%) increased.

See also

[Hierarchical Code Generation - Example](SM_Hierarchical_Code_Generation_Exapmle_1.md)
