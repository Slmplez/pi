# Hierarchical State Machines

Upon activation of the state machine, the conditions of the transitions are checked. The hierarchical order determines the priority. The highest hierarchical level has the highest priority, i.e. the conditions on transitions on upper hierarchy levels are checked first. When a hierarchy state is left, the current substates are left as well. The innermost substate is left first, the outermost hierarchy state is left last. When entering a hierarchy state, the order in which the entry actions are executed is from the outermost hierarchy state to the innermost (base) state, i.e. the outermost state is entered first, and the innermost is entered last. If no transition takes place, the static actions are executed in an outward sequence, i.e. the static action of the innermost substate is executed first, and the static action of the outermost hierarchy state is executed last.

The examples in this chapter assume no optimization of static actions in hierarchy states. If this optimization is activated, the semantics change, (see [Optimized for Code Size](file:/Koretd104854/Projects/BST2/QMS/TW_SS/Cresilla/ETAS/ASCET_V_5_2_Final%20_Data/State%20Machine%20Editor/SM_Actions_or_Conditions1.htm))

See also

[Optimized for Code Size](SM_Optimized_for_Code_Size.md)

[Example 10: Transition to a Hierarchy State Without History](SM_Example_10__Transition_to_a_Hierarchy_State_Without_History.md)

[Example 11: Transition to a Hierarchy State With History](SM_Example_11__Transition_to_a_Hierarchy_State_With_History.md)

[Example 12: Transition Within a Hierarchy State](SM_Example_12__Transition_Within_a_Hierarchy_State.md)

[Example 13: Transition Between Hierarchy States](SM_Example_13__Transition_Between_Hierarchy_States.md)

[Example 14: Loop](SM_Example_14__Loop.md)

[Example 15: Transition Between Substates of Different Hierarchies](SM_Example_15__Transition_Between_Substates_of_Different_Hierarchies.md)

[Example 16: Transition From a Substate to a Hierarchy State](SM_Example_16__Transition_From_a_Substate_to_a_Hierarchy_State.md)

[Example 17: No Transition](SM_Example_17__No_Transition.md)
