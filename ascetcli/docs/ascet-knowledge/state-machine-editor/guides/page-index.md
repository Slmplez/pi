# State Machine Editor Page Index

This is the complete page list for the editor knowledge set.

- [State Machines - Overview](../raw/SM_overview.md)
  Context: `State Machine Editor > State Machines - Overview`
  Note: A state machine is a special type of classes, an event-driven system where the focus is not on computations but on control flow. Therefore the main level of description of a state machine, the state diagram, does not describe how data, but how control is passed. To model control flow, a state machine consists of a finite number of states, and transitions between these. Besides, at least one trigger must be included to control the state machine. At each trigger call, one step of the state machine is executed.
- [States](../raw/SM_states.md)
  Context: `State Machine Editor > Basics > Definitions > States`
  Note: A state describes one mode of an event-driven system. The activity or inactivity of the states change dynamically, based on trigger events and conditions.
- [Transitions](../raw/SM_transitions.md)
  Context: `State Machine Editor > Basics > Definitions > Transitions`
  Note: A transition is a graphic object connecting two states. One end of the transition is attached to the source state where the transition begins. The other is connected to the destination state where the transition ends.
- [Transitions Between Base States](../raw/SM_Transitions_between_base_states.md)
  Context: `State Machine Editor > Basics > Definitions > Transitions > Transitions Between Base States`
  Note: The transition from state A to B is valid if A is active, the trigger event trigger occurs, and the condition [switch_on] is true.
- [Transitions from and to Hierarchy States](../raw/SM_Transitions_from_and_to_hierarchy_states.md)
  Context: `State Machine Editor > Basics > Definitions > Transitions > Transitions from and to Hierarchy States`
  Note: The transition from C to the hierarchy state (see Hierarchy) D_hierarchy is valid if C is active, the trigger event trigger occurs, and the condition [switch_on] is true. It is an explicit transition to the hierarchy state.
- [Transitions between Substates of different Hierarchies](../raw/SM_Transitions_between_substates_of_different_hierarchies.md)
  Context: `State Machine Editor > Basics > Definitions > Transitions > Transitions between Substates of different Hierarchies`
  Note: The transition from the substate E2 in the hierarchy state E_hierarchy in the substate F1 in the hierarchy state F_hierarchy is valid if E2 is active and the trigger event trigger occurs. The transition defines an explicit exit from substate E2 and an implicit exit from the hierarchy state E_hierarchy. It also implicitly defines an entry into F_hierarchy and an entry into F1.
- [Loops](../raw/SM_Loops.md)
  Context: `State Machine Editor > Basics > Definitions > Transitions > Loops`
  Note: A loop is a transition from a state to itself. The transition in the above figure is valid if either of the substates of G_hierarchy is active, the trigger event trigger occurs and the condition [reset_state] is true. The system leaves the active substate, it leaves the G_hierarchy state, executes the transition action, re-enters G_hierarchy, and finally enters the substate G1.
- [Transitions with Junctions](../raw/SM_Transitions_with_junction.md)
  Context: `State Machine Editor > Basics > Definitions > Transitions > Transitions with Junctions`
  Note: All types of transitions can contain junctions (see Junctions). Here, just one of the many possible examples is shown.
- [Junctions](../raw/sm_junctions.md)
  Context: `State Machine Editor > Basics > Definitions > Junctions`
  Note: A junction is a graphic object which considerably improves the legibility of state diagram and aids the generation of efficient code. Junctions form additional possibilities for representing the required system behavior.
- [Triggers](../raw/SM_triggers.md)
  Context: `State Machine Editor > Basics > Definitions > Triggers`
  Note: Triggers activate the execution of the state machines. Each trigger call causes the execution of one state machine step. They are public methods of the state machine; you must define each trigger that affects the state diagram. A trigger can have arguments for communication with other ASCET components.
- [Hierarchy](../raw/SM_hierarchy.md)
  Context: `State Machine Editor > Basics > Definitions > Hierarchy`
  Note: State machines often have a large number of states. The hierarchy allows the organization of complex systems by defining higher or lower-level object structures. A hierarchical design usually reduces the number of transitions and produces structured and readable diagrams.
- [Start State](../raw/SM_start_state.md)
  Context: `State Machine Editor > Basics > Definitions > Start State`
  Note: The start state specifies which state is to be activated when there are several possibilities on the same hierarchy level. Thus, the start state of the entire state machine, or that of a hierarchy level is determined.
- [History](../raw/SM_History.md)
  Context: `State Machine Editor > Basics > Definitions > History`
  Note: The history option provides the means to determine the destination substate of a transition to a hierarchy state based on past activities. If a hierarchy state has a history, the transition ends in the substate that was most recently active.
- [Conditions](../raw/SM_conditions.md)
  Context: `State Machine Editor > Basics > Definitions > Conditions`
  Note: A condition is a Boolean expression specifying that a transition occurs, given that the expression is true. Each transition and segment of a transition can have a condition.
- [Actions](../raw/SM_actions.md)
  Context: `State Machine Editor > Basics > Definitions > Actions`
  Note: Actions take place as part of the state machine execution. An action can be executed either as part of a transition from one state to another, or based on the activity status of a state.
- [Data](../raw/SM_data.md)
  Context: `State Machine Editor > Basics > Definitions > Data`
  Note: Data objects are used to store and process numerical values in the state diagram. The following types are available:
- [State Variables](../raw/SM_StateVariables.md)
  Context: `State Machine Editor > Basics > Definitions > State Variables`
  Note: Code generation for a state machine generates several state variables:
- [Example: Actions](../raw/SM_Example__Actions.md)
  Context: `State Machine Editor > Basics > Definitions > Examples > Example: Actions`
  Note: [image]
- [Example: Condition](../raw/SM_Example__Condition.md)
  Context: `State Machine Editor > Basics > Definitions > Examples > Example: Condition`
  Note: [image]
- [Example: Hierarchy State](../raw/SM_Example__Hierarchy_State.md)
  Context: `State Machine Editor > Basics > Definitions > Examples > Example: Hierarchy State`
  Note: The state diagram shown here has a hierarchy state that contains two substates. (Some transitions are left out for clarity.)
- [Example: History](../raw/SM_Example__History.md)
  Context: `State Machine Editor > Basics > Definitions > Examples > Example: History`
  Note: [image]
- [Example: Start State](../raw/SM_Example__Start_State.md)
  Context: `State Machine Editor > Basics > Definitions > Examples > Example: Start State`
  Note: The state neutral is the start state of the entire state diagram shown below, first is the start state of the hierarchy state engaged.
- [Conditions and Actions](../raw/specifying_conditions.md)
  Context: `State Machine Editor > Basics > Conditions and Actions`
  Note: Every state can have an entry, a static and an exit action, every transition can have a trigger, a condition and a transition action attached to it. Conditions and actions are similar to methods, and they are specified the same way as the methods of classes.
- [Actions/Conditions in Separate Diagrams](../raw/SM_conditions_actions.md)
  Context: `State Machine Editor > Basics > Conditions and Actions > Actions/Conditions in Separate Diagrams`
  Note: You can specify actions and conditions as block diagrams or ESDL code in separate ActionCondition diagrams. A state machine can contain any number of these ActionCondition diagrams, an individual diagram contains either block diagrams or ESDL code.
- [Using Conditions and Actions](../raw/using_conditions_actions.md)
  Context: `State Machine Editor > Basics > Conditions and Actions > Using Conditions and Actions`
  Note: You must explicitly assign actions and conditions from an ActionCondition diagram to the transitions or states in which they are used.
- [Conditions and Actions in the State Diagram](../raw/conditions_actions_state.md)
  Context: `State Machine Editor > Basics > Conditions and Actions > Conditions and Actions in the State Diagram`
  Note: It is possible to type the ESDL code for a condition or action in the state diagram, directly into the state editor or transition editor. In this case it is not necessary to create a specification in a separate diagram, the Edit button is inactive.
- [Communication with Other Components](../raw/communications_components.md)
  Context: `State Machine Editor > Basics > Conditions and Actions > Communication with Other Components`
  Note: A state machine can communicate with other ASCET components. For this, there are several options: inputs and outputs, trigger arguments and public methods (see also State Machines as Classes).
- [Hierarchy States](../raw/SM_hierarchystates.md)
  Context: `State Machine Editor > Basics > Hierarchy States`
  Note: State diagrams can be hierarchical (see Hierarchy), i.e. a state can contain a different state diagram. When the state machine enters a hierarchy state, it starts with the start state of the subdiagram contained in the hierarchy state. If, however, the hierarchy has a history (see History), the substate activated upon a transition to the hierarchy state is the one the subdiagram was in when the hierarchy state was last left.
- [Semantics of State Machines](../raw/SM_Semantics_of_State_Machines.md)
  Context: `State Machine Editor > Basics > Semantics of State Machines`
  Note: A state machine consists of a finite number of states. Each state represents a state a system can be in, for instance whether a door is locked, open, or closed. Under certain circumstances the state of the system changes. These state changes are modelled by transitions between the different states. For each possible transition to take place, a condition has to be fulfilled.
- [Semantics: Simple State Machines](../raw/sm_semanticssimplestatemachines.md)
  Context: `State Machine Editor > Basics > Semantics of State Machines > Semantics: Simple State Machines`
  Note: The semantics of simple state machines is explained with the following examples.
- [Example 1: Transition Between States](../raw/SM_Example_1__Transition_Between_States.md)
  Context: `State Machine Editor > Basics > Semantics of State Machines > Semantics: Simple State Machines > Example 1: Transition Between States`
  Note: This simple state machine models a light switch. At the beginning, the lamp is off, the state dark is active. The trigger event trigger occurs and initiates the evaluation of the state machine. The light switch is pressed, so that the condition switch_on is true.
- [Example 2: Transitions from One State](../raw/SM_Example_2__Transitions_from_One_State.md)
  Context: `State Machine Editor > Basics > Semantics of State Machines > Semantics: Simple State Machines > Example 2: Transitions from One State`
  Note: This state machine models a display. Outside temperature, speed, average speed and distance covered can be displayed as required. There is also a key to toggle the display. If the outside temperature falls below 1°C, a change to the temperature display occurs, and a frost warning is shown.
- [Example 3: Loop](../raw/SM_Example_3__Loop.md)
  Context: `State Machine Editor > Basics > Semantics of State Machines > Semantics: Simple State Machines > Example 3: Loop`
  Note: The state machine is the same as in Example 2. However, the entry action clear_display was added to the states. The state machine is in the temperature state. Otherwise, the starting state is the same as in the previous example. A trigger event trigger_100ms occurs and the switch is not pressed.
- [Semantics: Junctions in State Machines](../raw/SM_Junctions_in_State_Machines.md)
  Context: `State Machine Editor > Basics > Semantics of State Machines > Semantics: Junctions in State Machines`
  Note: Junctions (see Junctions) aid the legibility of state diagrams. The functionality of all the examples can also be described using direct transitions between the states.
- [Example 4: If…Then…Else Construction](../raw/SM_Example_4_If_Then_Else_Construction.md)
  Context: `State Machine Editor > Basics > Semantics of State Machines > Semantics: Junctions in State Machines > Example 4: If…Then…Else Construction`
  Note: This state machine models a simple drinks machine which offers four different drinks. The state machine is in the waiting state. A trigger event trigger_10ms occurs: someone wants Cola.
- [Example 5: No transition](../raw/SM_Example_5__No_transition.md)
  Context: `State Machine Editor > Basics > Semantics of State Machines > Semantics: Junctions in State Machines > Example 5: No transition`
  Note: The state machine is the same as in Example 4. The state machine is in the waiting state. A trigger event trigger_10ms occurs, the selection select is set to 5 by mistake. The following steps are executed:
- [Example 6: Loop construction](../raw/SM_Example_6__Loop_construction.md)
  Context: `State Machine Editor > Basics > Semantics of State Machines > Semantics: Junctions in State Machines > Example 6: Loop construction`
  Note: The state machine is the same as in Example 4: If…Then…Else Construction. The addition is a transition segment away from the junction back to the state waiting and the entry action in waiting.
- [Example 7: Transitions from Multiple Start States to a Destination State (One Trigger)](../raw/SM_Example_7__Transitions_from_Multiple_Start_States_to_a_Destination_State_%28One_Trigger%29.md)
  Context: `State Machine Editor > Basics > Semantics of State Machines > Semantics: Junctions in State Machines > Example 7: Transitions from Multiple Start States to a Destination State (One Trigger)`
  Note: The state machine is the same as in Example 6: Loop construction. The state Cola is active, the glass has been filled and the logical variable glass_full set to true.
- [Example 8: Transitions from a Start State to Different Destination States (Multiple Triggers)](../raw/SM_Example_8__Transitions_from_a_Start_State_to_Different_Destination_States_%28Multiple_Triggers%29.md)
  Context: `State Machine Editor > Basics > Semantics of State Machines > Semantics: Junctions in State Machines > Example 8: Transitions from a Start State to Different Destination States (Multiple Triggers)`
  Note: This state machine describes a drinks machine which offers different types of sodas or beers. The actual choice takes place in the hierarchy states soda_on and beer_on, it is irrelevant for the example. Hierarchical State Machines describes the semantics of hierarchical state machines.
- [Example 9: Transitions from Different Start States to the Same Destination State (Multiple Triggers)](../raw/SM_Example_9__Transitions_from_Different_Start_States_to_the_Same_Destination_State_%28Multiple_Triggers%29.md)
  Context: `State Machine Editor > Basics > Semantics of State Machines > Semantics: Junctions in State Machines > Example 9: Transitions from Different Start States to the Same Destination State (Multiple Triggers)`
  Note: The state machine is the same as in Example 8: Transitions from a Start State to Different Destination States (Multiple Triggers).md). The system is in the state soda_on (or in one of the substates of the hierarchy).
- [Semantics: Hierarchical State Machines](../raw/SM_Hierarchical_State.md)
  Context: `State Machine Editor > Basics > Semantics of State Machines > Semantics: Hierarchical State Machines`
  Note: Upon activation of the state machine, the conditions of the transitions are checked. The hierarchical order determines the priority. The highest hierarchical level has the highest priority, i.e. the conditions on transitions on upper hierarchy levels are checked first. When a hierarchy state is left, the current substates are left as well. The innermost substate is left first, the outermost hierarchy state is left last. When entering a hierarchy state, the order in which the entry actions are executed is from the outermost hierarchy state to the innermost (base) state, i.e. the outermost state is entered first, and the innermost is entered last. If no transition takes place, the static actions are executed in an outward sequence, i.e. the static action of the innermost substate is executed first, and the static action of the outermost hierarchy state is executed last.
- [Example 10: Transition to a Hierarchy State Without History](../raw/SM_Example_10__Transition_to_a_Hierarchy_State_Without_History.md)
  Context: `State Machine Editor > Basics > Semantics of State Machines > Semantics: Hierarchical State Machines > Example 10: Transition to a Hierarchy State Without History`
  Note: On entry into a hierarchical level, there are two possibilities: either entry into the start state of the hierarchy state (this example). In this case, the hierarchy state has forgotten the substate it has been in when it was left. Alternatively, the last active substate is entered. In this case, the hierarchy state has a history (Example 11: Transition to a Hierarchy State With History).
- [Example 11: Transition to a Hierarchy State With History](../raw/SM_Example_11__Transition_to_a_Hierarchy_State_With_History.md)
  Context: `State Machine Editor > Basics > Semantics of State Machines > Semantics: Hierarchical State Machines > Example 11: Transition to a Hierarchy State With History`
  Note: The state machine is the same as in Example 10: Transition to a Hierarchy State Without History. Now it has a history. The starting state is the same as in the previous example.
- [Example 12: Transition Within a Hierarchy State](../raw/SM_Example_12__Transition_Within_a_Hierarchy_State.md)
  Context: `State Machine Editor > Basics > Semantics of State Machines > Semantics: Hierarchical State Machines > Example 12: Transition Within a Hierarchy State`
  Note: If a transition takes place inside a hierarchy state, the state machine remains in that hierarchy state. Therefore, the static action of the hierarchy state is executed, as well as the static actions of all hierarchy states that contain the state in question. They are executed after all exit actions, and before the transition action, from the innermost hierarchy state to the outermost one.
- [Example 13: Transition Between Hierarchy States](../raw/SM_Example_13__Transition_Between_Hierarchy_States.md)
  Context: `State Machine Editor > Basics > Semantics of State Machines > Semantics: Hierarchical State Machines > Example 13: Transition Between Hierarchy States`
  Note: This state machine acts as a data generator. When enable is set to true, a signal is produced, either a ramp (state ramp, mode = 1) or a sine (state sinus, mode = 2).
- [Example 14: Loop](../raw/SM_Example_14__Loop.md)
  Context: `State Machine Editor > Basics > Semantics of State Machines > Semantics: Hierarchical State Machines > Example 14: Loop`
  Note: The source and destination states of a transition can be identical. Such loops are frequently used to specify the reset function of a hierarchy state.
- [Example 15: Transition Between Substates of Different Hierarchies](../raw/SM_Example_15__Transition_Between_Substates_of_Different_Hierarchies.md)
  Context: `State Machine Editor > Basics > Semantics of State Machines > Semantics: Hierarchical State Machines > Example 15: Transition Between Substates of Different Hierarchies`
  Note: Transitions can lead directly from the substate of one hierarchy state to the substate of another hierarchy state.
- [Example 16: Transition From a Substate to a Hierarchy State](../raw/SM_Example_16__Transition_From_a_Substate_to_a_Hierarchy_State.md)
  Context: `State Machine Editor > Basics > Semantics of State Machines > Semantics: Hierarchical State Machines > Example 16: Transition From a Substate to a Hierarchy State`
  Note: If the transition from a substate does not lead to another substate, but to the hierarchy state, the procedure is almost the same. The substate is left, the hierarchy state is left, too, and immediately re-entered. Depending on whether the hierarchy state has a history, either the most recently activated substate or the start state of the hierarchy is entered. This is another way to realize, for example, the frost warning.
- [Example 17: No Transition](../raw/SM_Example_17__No_Transition.md)
  Context: `State Machine Editor > Basics > Semantics of State Machines > Semantics: Hierarchical State Machines > Example 17: No Transition`
  Note: The state machine is the same as in Example 16: Transition From a Substate to a Hierarchy State. The state machine is in the temperature state. The temperature is unchanged. A trigger event trigger_100ms occurs, the switch is not pressed (key_pressed is false). The following steps are executed:
- [Initialization of the State Diagram](../raw/SM_Initialization_of_the_State_Diagram.md)
  Context: `State Machine Editor > Basics > Semantics of State Machines > Semantics: Summary > Initialization of the State Diagram`
  Note: The start state of the system is activated. If the start state is a hierarchy state, the start state within the hierarchy is also activated. No entry action is executed.
- [Entering a State](../raw/SM_Entering_a_State.md)
  Context: `State Machine Editor > Basics > Semantics of State Machines > Semantics: Summary > Entering a State`
- [Executing a (Basis) State](../raw/SM_ExecuteBasisState.md)
  Context: `State Machine Editor > Basics > Semantics of State Machines > Semantics: Summary > Executing a (Basis) State`
- [Leaving a State](../raw/SM_Leaving_a_State.md)
  Context: `State Machine Editor > Basics > Semantics of State Machines > Semantics: Summary > Leaving a State`
- [Executing a Transition](../raw/SM_Executing_a_Transition.md)
  Context: `State Machine Editor > Basics > Semantics of State Machines > Semantics: Summary > Executing a Transition`
  Note: The transitions are evaluated in the order of their priority. Transitions from a hierarchy state always have a higher priority than transitions from the substates of this hierarchy state.
- [Experimenting with State Machines](../raw/SM_experiment_with_state_machines.md)
  Context: `State Machine Editor > Basics > Experimenting with State Machines`
  Note: You can experiment with a state machine in the same way as with any other component. To start the offline experimentation environment for a state machine, perform the same steps as outlined in Analyzing Components.
- [State Machines as Classes](../raw/SM_State_Machines_as_Classes.md)
  Context: `State Machine Editor > Basics > State Machines as Classes`
  Note: A state machine is a class with special description means. The trigger, condition and actions are modelled as special methods:
- [Trigger Arguments for External Communication](../raw/SM_Trigger_Arguments_for_Communication.md)
  Context: `State Machine Editor > Basics > State Machines as Classes > Trigger Arguments for External Communication`
  Note: You can use trigger arguments for external communication. Stack variables which do not burden the static RAM are created for the arguments of a C function. The dynamic RAM area is burdened temporarily.
- [Rules for Trigger Arguments](../raw/SM_Rules_for_Trigger_Arguments.md)
  Context: `State Machine Editor > Basics > State Machines as Classes > Rules for Trigger Arguments`
  Note: The following rules for the use of trigger arguments in actions and conditions.
- [Public Methods](../raw/SM_public_methods.md)
  Context: `State Machine Editor > Basics > Public Methods`
  Note: You have the option of specifying public methods in a separate diagram. You can open these methods from within the state machine as well as from other components.
- [Optimizing the State Machine](../raw/SM_Optimizing_the_State_Machine.md)
  Context: `State Machine Editor > Basics > Optimizing the State Machine > Optimizing the State Machine`
  Note: Usually, there are several ways to specify the same functionality or to adjust the code generation/build process settings.
- [Optimized for Response Time](../raw/SM_Optimized_for_Response_Time.md)
  Context: `State Machine Editor > Basics > Optimizing the State Machine > Optimized for Response Time`
  Note: If response time is the most important criterion, take advantage of the hierarchical structure and the transition priorities. Speed-critical actions are best built into the highest possible hierarchical level to produce efficient code and the quickest possible reaction.
- [Optimized for Run Time](../raw/SM_Optimized_for_Run_Time.md)
  Context: `State Machine Editor > Basics > Optimizing the State Machine > Optimized for Run Time`
  Note: If the total runtime is the most important criterion, you can use several optimization possibilities, individually or in combination, to generate efficient code.
- [Actions or Conditions](../raw/SM_Actions_or_Conditions.md)
  Context: `State Machine Editor > Basics > Optimizing the State Machine > Optimized for Run Time > Actions or Conditions`
  Note: If actions or conditions are specified with partly or totally the same functionality, this can be done either runtime-optimized or size-optimized. Runtime-optimized means that the code for each action and condition is inserted on the spot during code generation. No additional function call is required. The disadvantage is the repeatedly generated code and thus increased memory requirement.
- [Junctions](../raw/SM_Junctions_1.md)
  Context: `State Machine Editor > Basics > Optimizing the State Machine > Optimized for Run Time > Junctions`
  Note: If several transitions with partially identical conditions lead away from a state, the use of junctions can bring runtime savings. Identical sections of the conditions are assigned to the transition segment from the start state in the first junction. If these are not fulfilled, the other segments are not evaluated.
- [Optimized for Code Size](../raw/SM_Optimized_for_Code_Size.md)
  Context: `State Machine Editor > Basics > Optimizing the State Machine > Optimized for Code Size`
  Note: Optimizing the code size contains the following options:
- [Actions or Conditions](../raw/SM_Actions_or_Conditions1.md)
  Context: `State Machine Editor > Basics > Optimizing the State Machine > Optimized for Code Size > Actions or Conditions`
  Note: Actions/Conditions
- [Static Actions of Hierarchy States](../raw/Static_actions_of_hierarchy_states_1.md)
  Context: `State Machine Editor > Basics > Optimizing the State Machine > Optimized for Code Size > Static Actions of Hierarchy States`
  Note: For static actions in hierarchy states, an additional optimization option exists.
- [Example 1: Code Generation](../raw/SM_Example_1_CodeGeneration.md)
  Context: `State Machine Editor > Basics > Optimizing the State Machine > Optimized for Code Size > Example 1: Code Generation`
  Note: In the first example, the transition from the inner state Start to OuterEnd has a higher priority than the transition from Start to InnerState1. This means that code can be generated both with activated and deactivated Optimize Static Actions (Restricted Modeling) option.
- [Example 2: Error Generation](../raw/SM_Example_2_Static_action_of_Hierarchy_States.md)
  Context: `State Machine Editor > Basics > Optimizing the State Machine > Optimized for Code Size > Example 2: Error Generation`
  Note: In the second example, the transition from State to OuterEnd has a lower priority. With activated Optimize Static Actions (Restricted Modeling) option, code cannot be generated.
- [Hierarchical Code Generation](../raw/SM_Hierarchical_Code_Generation.md)
  Context: `State Machine Editor > Basics > Optimizing the State Machine > Optimized for Code Size > Hierarchical Code Generation`
  Note: Two possibilities exist to generate code for a hierarchical state machine:
- [Hierarchical Code Generation - Example](../raw/SM_Hierarchical_Code_Generation_Exapmle_1.md)
  Context: `State Machine Editor > Basics > Optimizing the State Machine > Optimized for Code Size > Hierarchical Code Generation - Example`
  Note: An example illustrates the difference in the generated code.
- [Triggers and Trigger Arguments](../raw/SM_Triggers_and_trigger_arguments.md)
  Context: `State Machine Editor > Basics > Optimizing the State Machine > Optimized for Code Size > Triggers and Trigger Arguments`
  Note: If trigger arguments are used for communication with other ASCET components, instead of inputs and outputs, the static RAM requirements are reduced. You can find more information on this in State Machines as Classes.
- [Creating a State Machine](../raw/SM_creating_new.md)
  Context: `State Machine Editor > Instructions > Creating a State Machine`
  Note: To create a new state machine, proceed as follows:
- [Specifying a Reinitialization Method for State Variables](../raw/sm_specifyresetmethod_statevariables.md)
  Context: `State Machine Editor > Instructions > Specifying a Reinitialization Method for State Variables`
  Note: To specify a reinitialization method for the state variables, proceed as follows.
- [Filtering the Tree Pane](../raw/sm_filtering_the_component_pane.md)
  Context: `State Machine Editor > Instructions > Filtering the Tree Pane`
  Note: The Outline and Navigation tabs can be filtered. To do so, proceed as follows.
- [Searching/Deleting Unused Elements](../raw/sm_unusedelements.md)
  Context: `State Machine Editor > Instructions > Searching/Deleting Unused Elements`
  Note: To search or delete unused elements (scalar, composite, complex) in the state machine, proceed as follows:
- [Searching/Deleting Unused Methods/Triggers](../raw/za_searchdel_unused_methodstriggers.md)
  Context: `State Machine Editor > Instructions > Searching/Deleting Unused Methods/Triggers`
  Note: = Block Diagram or ESDL
- [Viewing all Occurrences of an Element](../raw/sm_showoccurrences.md)
  Context: `State Machine Editor > Instructions > Viewing all Occurrences of an Element`
  Note: To view all occurrences of an element or included component, proceed as follows:
- [Example: Show Occurrences](../raw/ZA_Example_ShowOccurrence.md)
  Context: `State Machine Editor > Instructions > Viewing all Occurrences of an Element > Example: Show Occurrences`
  Note: The output yellow is selected in the Outline tab; Show Occurrences is selected from the context menu.
- [Laying Out the States for the Diagram](../raw/layout_states.md)
  Context: `State Machine Editor > Instructions > Drawing the State Diagram > Laying Out the States for the Diagram`
  Note: To lay out the states for the diagram, proceed as follows:
- [Defining the Starting State](../raw/SM_Define_StartState.md)
  Context: `State Machine Editor > Instructions > Drawing the State Diagram > Defining the Starting State`
  Note: Each state machine must have a start state. The state machine is in start state when the class is initially activated.
- [Editing a State](../raw/editing_state.md)
  Context: `State Machine Editor > Instructions > Drawing the State Diagram > Editing a State`
  Note: To edit a state, proceed as follows:
- [Renaming States](../raw/renaming_state.md)
  Context: `State Machine Editor > Instructions > Drawing the State Diagram > Renaming States`
  Note: By default, the first state is named state, the next is state_1, etc. You can change the names if you like, only keep in mind that each name has to be unique and ANSI C compliant.
- [Representing States in Color](../raw/SM_representing_colors.md)
  Context: `State Machine Editor > Instructions > Drawing the State Diagram > Representing States in Color`
  Note: As standard, each newly added state appears in white. You can change the color as follows:
- [Copying a State Layout](../raw/copy_statelayout.md)
  Context: `State Machine Editor > Instructions > Drawing the State Diagram > Copying a State Layout`
  Note: To copy the layout of a state, i.e. its size and color, to another state, proceed as follows:
- [Creating Junctions](../raw/creating_junctions.md)
  Context: `State Machine Editor > Instructions > Drawing the State Diagram > Creating Junctions`
  Note: Besides the states, you can use the Junction diagram (see Junctions).
- [Editing Junctions](../raw/editing_junctions.md)
  Context: `State Machine Editor > Instructions > Drawing the State Diagram > Editing Junctions`
  Note: In contrast to states, you cannot assign actions to a junction. You can only move it and change the size and color.
- [Creating a Transition](../raw/create_transition.md)
  Context: `State Machine Editor > Instructions > Drawing the State Diagram > Creating a Transition`
  Note: To create a transition, proceed as follows:
- [Changing the Path of a Transition](../raw/change_path_transition.md)
  Context: `State Machine Editor > Instructions > Drawing the State Diagram > Changing the Path of a Transition`
  Note: To change the path of a transition, proceed as follows:
- [Changing the Appearance of a Transition](../raw/change_appearance_transition.md)
  Context: `State Machine Editor > Instructions > Drawing the State Diagram > Changing the Appearance of a Transition`
  Note: To change the appearance of a transition, proceed as follows:
- [Inserting a Trigger](../raw/SM_insert_trigger.md)
  Context: `State Machine Editor > Instructions > Drawing the State Diagram > Inserting a Trigger`
  Note: One trigger is created with a new state machine by default. You can add more triggers, but keep in mind that the use of several triggers in one state machine leads to extended program code (see Optimized for Code Size).
- [Adding a Closed Hierarchy State](../raw/SM_ClosedHierarchy.md)
  Context: `State Machine Editor > Instructions > Hierarchy States > Adding a Closed Hierarchy State`
  Note: To add a closed hierarchy state, proceed as follows:
- [Moving Between Hierarchy Levels](../raw/SM_Move_between_hierarchies.md)
  Context: `State Machine Editor > Instructions > Hierarchy States > Moving Between Hierarchy Levels`
  Note: To move between hierarchy levels, proceed as follows:
- [Setting up a Hierarchy State with a History](../raw/SetupHierarchy.md)
  Context: `State Machine Editor > Instructions > Hierarchy States > Setting up a Hierarchy State with a History`
  Note: To set up a hierarchy state with a history, proceed as follows:
- [Adding a Pin to a Hierarchy State](../raw/addpin.md)
  Context: `State Machine Editor > Instructions > Hierarchy States > Adding a Pin to a Hierarchy State`
  Note: To add a pin to a hierarchy state, proceed as follows:
- [Resolving a Hierarchy State](../raw/ResolveHirearchy.md)
  Context: `State Machine Editor > Instructions > Hierarchy States > Resolving a Hierarchy State`
  Note: To resolve a hierarchy state, proceed as follows:
- [Adding an Open Hierarchy State](../raw/addopenhierarchy.md)
  Context: `State Machine Editor > Instructions > Hierarchy States > Adding an Open Hierarchy State`
  Note: To add an open hierarchy state, proceed as follows:
- [Activating/Deactivating Hierarchical Code Generation](../raw/SM_To_Activate_Deactivate_Hierarchical_Code_Generation.md)
  Context: `State Machine Editor > Instructions > Hierarchy States > Activating/Deactivating Hierarchical Code Generation`
  Note: In that case, the settings of individual state machines are irrelevant.
- [Editing Actions/Conditions in Separate Diagrams](../raw/SM_ActionsConditions_SeparateDiagrams.md)
  Context: `State Machine Editor > Instructions > Specifying Conditions and Actions > Editing Actions/Conditions in Separate Diagrams`
  Note: You have to perform the following steps to specify an action or condition in a separate diagram.
- [Creating a BDE Diagram for Actions/Conditions](../raw/SM_blockDiagram.md)
  Context: `State Machine Editor > Instructions > Specifying Conditions and Actions > Editing Actions/Conditions in Separate Diagrams > Creating a BDE Diagram for Actions/Conditions`
  Note: To generate a block diagram for actions/conditions, proceed as follows:
- [Creating an ESDL Diagram for Actions/Conditions](../raw/SM_Create_ESDL_Diagram_for_ActionsConditions.md)
  Context: `State Machine Editor > Instructions > Specifying Conditions and Actions > Editing Actions/Conditions in Separate Diagrams > Creating an ESDL Diagram for Actions/Conditions`
  Note: To generate an ESDL diagram for actions/conditions, proceed as follows:
- [Adding an Action or Condition](../raw/SM_add_condition.md)
  Context: `State Machine Editor > Instructions > Specifying Conditions and Actions > Editing Actions/Conditions in Separate Diagrams > Adding an Action or Condition`
  Note: To add a condition, proceed as follows:
- [Opening a Diagram for Actions/Conditions](../raw/SM_opening_diagram.md)
  Context: `State Machine Editor > Instructions > Specifying Conditions and Actions > Editing Actions/Conditions in Separate Diagrams > Opening a Diagram for Actions/Conditions`
  Note: To open a diagram for actions/conditions, proceed as follows:
- [Activating/Deactivating Optimization of Static Actions](../raw/To_Activate_Deactivate_Optimization_of_Static_Actions.md)
  Context: `State Machine Editor > Instructions > Specifying Conditions and Actions > Editing Actions/Conditions in Separate Diagrams > Activating/Deactivating Optimization of Static Actions`
  Note: If you activate the optimization, modeling is restricted as follows: If a substate of the state machine contains a direct transition out of its parent state, this transition must have the highest priority of all transitions from that substate.
- [Activating/Deactivating Auto-Inlining](../raw/SM_To_Activate_Deactivate_Auto-Inlining.md)
  Context: `State Machine Editor > Instructions > Specifying Conditions and Actions > Editing Actions/Conditions in Separate Diagrams > Activating/Deactivating Auto-Inlining`
  Note: In that case, the settings of individual state machines are irrelevant.
- [Assigning Triggers, Priorities, Conditions and Actions to a Transition](../raw/SM_AssignTriggers.md)
  Context: `State Machine Editor > Instructions > Specifying Conditions and Actions > Using Conditions and Actions > Assigning Triggers, Priorities, Conditions and Actions to a Transition`
  Note: Every transition has to have a trigger and a priority, but the condition and the transition action are optional.
- [Assigning Actions to a State](../raw/SM_AssignActions.md)
  Context: `State Machine Editor > Instructions > Specifying Conditions and Actions > Using Conditions and Actions > Assigning Actions to a State`
  Note: Each state can have an entry action, a static action and an exit action. All these are optional.
- [Editing Actions/Conditions](../raw/SM_edit_actions_conditions.md)
  Context: `State Machine Editor > Instructions > Specifying Conditions and Actions > Using Conditions and Actions > Editing Actions/Conditions`
  Note: To edit actions/conditions, proceed as follows:
- [Actions/Conditions in the State Diagram](../raw/SM_ActionsConditions_StateDiagram.md)
  Context: `State Machine Editor > Instructions > Specifying Conditions and Actions > Actions/Conditions in the State Diagram`
  Note: You have to perform the following steps to specify an action or condition in the state diagram.
- [Specifying Actions in the State Editor](../raw/specifying_actions.md)
  Context: `State Machine Editor > Instructions > Specifying Conditions and Actions > Actions/Conditions in the State Diagram > Specifying Actions in the State Editor`
  Note: To specify actions in the state editor, proceed as follows:
- [Cutting, Copying and Pasting ESDL Code](../raw/cut_copyand%20paste.md)
  Context: `State Machine Editor > Instructions > Specifying Conditions and Actions > Actions/Conditions in the State Diagram > Cutting, Copying and Pasting ESDL Code`
- [Specifying Conditions and Transition Actions in the Transition Editor](../raw/specifying_conditions_transition.md)
  Context: `State Machine Editor > Instructions > Specifying Conditions and Actions > Actions/Conditions in the State Diagram > Specifying Conditions and Transition Actions in the Transition Editor`
  Note: The transition editor, which is used to specify conditions and transition actions, has the same functionalities as the state editor.
- [Automatic Insertion of Comment Lines](../raw/automatic_insertion.md)
  Context: `State Machine Editor > Instructions > Specifying Conditions and Actions > Actions/Conditions in the State Diagram > Automatic Insertion of Comment Lines`
  Note: You can also add the comment lines automatically at a later time.
- [Activating/Deactivating Outlining of Actions/Conditions](../raw/SM_activate_deactivate_outlining_of_actions_conditions_.md)
  Context: `State Machine Editor > Instructions > Specifying Conditions and Actions > Actions/Conditions in the State Diagram > Activating/Deactivating Outlining of Actions/Conditions`
  Note: In that case, the settings of individual state machines are irrelevant.
- [Adding Inputs and Outputs to the State Machine](../raw/adding_inputs.md)
  Context: `State Machine Editor > Instructions > Specifying Conditions and Actions > Communication with Other Components > Adding Inputs and Outputs to the State Machine`
  Note: To add inputs and outputs to the state machine, proceed as follows:
- [Adding a Trigger Argument](../raw/adding_triggerargument.md)
  Context: `State Machine Editor > Instructions > Specifying Conditions and Actions > Communication with Other Components > Adding a Trigger Argument`
  Note: To add a trigger argument, proceed as follows:
- [Adding Arguments to Conditions/Actions](../raw/adding_arguments.md)
  Context: `State Machine Editor > Instructions > Specifying Conditions and Actions > Communication with Other Components > Adding Arguments to Conditions/Actions`
  Note: If you want to use a trigger argument in an action or condition specified in an ActionCondition diagram, you must generate an argument of the same name and the same type in the action or condition.
- [Creating a Public Diagram](../raw/SM_create_public_diagram.md)
  Context: `State Machine Editor > Instructions > Public Methods > Creating a Public Diagram`
  Note: To create a public diagram, proceed as follows:
- [Adding a Public Method](../raw/add_public_method.md)
  Context: `State Machine Editor > Instructions > Public Methods > Adding a Public Method`
  Note: To add a public method, proceed as follows:
- [Using a Public Method for External Communication](../raw/using_pm_external.md)
  Context: `State Machine Editor > Instructions > Public Methods > Using a Public Method for External Communication`
  Note: The methods are specified as described in The Block Diagram Editor. Some examples are listed in the following, but the list is by no means complete.
- [Using Public Methods in Actions and Conditions](../raw/use_pm_actions.md)
  Context: `State Machine Editor > Instructions > Public Methods > Using Public Methods in Actions and Conditions`
  Note: In the combo box on the action tabs in the state editor, public methods are available. In the combo box on the action tabs in the transition editor, public methods without return value are available. A public method with a return value is available in the combo box on the Condition tab in the transition editor.
- [Analyzing a Diagram](../raw/analyze_diagram.md)
  Context: `State Machine Editor > Instructions > Experimenting with State Machines > Analyzing a Diagram`
  Note: You can analyze the state diagram or one of the other diagrams of the state machine.
- [Using the State Machine Animation Feature](../raw/using-statemachine.md)
  Context: `State Machine Editor > Instructions > Experimenting with State Machines > Using the State Machine Animation Feature`
  Note: To use the state machine animation feature, proceed as follows:
- [Changing the Animation Color](../raw/animation_color.md)
  Context: `State Machine Editor > Instructions > Experimenting with State Machines > Changing the Animation Color`
  Note: If you want to change the animation color, proceed as follows:
- [Displaying Information about States or Transitions](../raw/SM_display_info.md)
  Context: `State Machine Editor > Instructions > Experimenting with State Machines > Displaying Information about States or Transitions`
  Note: You can look at individual states or transitions while the experiment is running.
- [Resetting the State Machine](../raw/SM_resetting.md)
  Context: `State Machine Editor > Instructions > Experimenting with State Machines > Resetting the State Machine`
  Note: To reset the state machine, proceed as follows:
- [State Machine Editor - Window Elements](../raw/SM_description_of_window_elements.md)
  Context: `State Machine Editor > Reference to User Interface > State Machine Editor - Window Elements`
  Note: The state machine editor window contains the following window elements:
- [Menus](../raw/SM_menubar.md)
  Context: `State Machine Editor > Reference to User Interface > Menus`
  Note: This menu bar contains the following menus:
- [File Menu](../raw/SM_File_Menu.md)
  Context: `State Machine Editor > Reference to User Interface > Menus > File Menu`
  Note: This menu contains the following functions:
- [Edit Menu](../raw/SM_Edit_Menu.md)
  Context: `State Machine Editor > Reference to User Interface > Menus > Edit Menu`
  Note: This menu contains the following functions:
- [View Menu](../raw/SM_View_Menu.md)
  Context: `State Machine Editor > Reference to User Interface > Menus > View Menu`
  Note: This menu contains the following functions:
- [Insert Menu](../raw/SM_Insert_Menu.md)
  Context: `State Machine Editor > Reference to User Interface > Menus > Insert Menu`
  Note: This menu contains the following functions:
- [Build Menu](../raw/SM_Build_Menu.md)
  Context: `State Machine Editor > Reference to User Interface > Menus > Build Menu`
  Note: This menu contains the following functions:
- [Extras Menu](../raw/SM_Extras_Menu.md)
  Context: `State Machine Editor > Reference to User Interface > Menus > Extras Menu`
  Note: This menu bar contains the following menus:
- [Tools Menu](../raw/SM_Tools_Menu.md)
  Context: `State Machine Editor > Reference to User Interface > Menus > Tools Menu`
  Note: This menu contains the following functions:
- [Window Menu](../raw/SM_Window_Menu.md)
  Context: `State Machine Editor > Reference to User Interface > Menus > Window Menu`
  Note: This menu contains the following functions:
- [Help Menu](../raw/SM_Help_Menu.md)
  Context: `State Machine Editor > Reference to User Interface > Menus > Help Menu`
  Note: This menu contains the following functions:
- [Toolbars](../raw/SM_Toolbar.md)
  Context: `State Machine Editor > Reference to User Interface > Toolbars`
  Note: The following toolbars are available in the State Machine Editor:
- [Toolbar General](../raw/SM_Toolbar_General.md)
  Context: `State Machine Editor > Reference to User Interface > Toolbars > Toolbar General`
  Note: The toolbar General contains following icons:
- [Toolbar Elements](../raw/SM_Toolbar_Elements.md)
  Context: `State Machine Editor > Reference to User Interface > Toolbars > Toolbar Elements`
  Note: The toolbar Elements contains following icons:
- [Toolbar Basic Blocks](../raw/SM_Toolbar_Basic_Blocks.md)
  Context: `State Machine Editor > Reference to User Interface > Toolbars > Toolbar Basic Blocks`
  Note: The toolbar Basic Blocks contains following icons:
- [Tree Pane](../raw/SM_TreePane.md)
  Context: `State Machine Editor > Reference to User Interface > Tree Pane`
  Note: The Tree pane contains following three tabs and filter functions:
- [Context Menu for Components and Elements](../raw/sm_contextmenu_componentelement.md)
  Context: `State Machine Editor > Reference to User Interface > Tree Pane > Context Menu for Components and Elements`
  Note: In the Outline tab, the context menu of an included component or element contains a subset of the following functions:
- [Context Menu for Diagrams and Methods](../raw/sm_contextmenu_diagrammethod.md)
  Context: `State Machine Editor > Reference to User Interface > Tree Pane > Context Menu for Diagrams and Methods`
  Note: In the Outline tab, the context menu of a diagram or method (i.e. action, condition, trigger, public method) contains a subset of the following functions:
- [Palettes](../raw/SM_Palettes.md)
  Context: `State Machine Editor > Reference to User Interface > Palettes`
  Note: The following palettes are available in the state machine editor:
- [Elements Palette](../raw/SM_Elements_Palette.md)
  Context: `State Machine Editor > Reference to User Interface > Palettes > Elements Palette`
  Note: The Elements palette contains following functions:
- [Basic Blocks Palette](../raw/SM_Basic_Blocks.md)
  Context: `State Machine Editor > Reference to User Interface > Palettes > Basic Blocks Palette`
  Note: The Basic Blocks palette contains following functions:
- [Specification View](../raw/SM_Specification_View.md)
  Context: `State Machine Editor > Reference to User Interface > Views > Specification View`
  Note: The Specification View contains the drawing area. In this area the state machine can be specified. It is selected via the Specification tab at the right-hand side of the editor window.
- [Context Menu Specification View](../raw/SM_ContextMenu_SpecificationView.md)
  Context: `State Machine Editor > Reference to User Interface > Views > Context Menu Specification View`
  Note: The context menu of the Specification view contains the following functions:
- [Search Results View](../raw/SM_SearchResultsView.md)
  Context: `State Machine Editor > Reference to User Interface > Views > Search Results View`
  Note: A component contains a dependent parameter DepPar_sqrt, which is mapped to the parameter Ki in dataset Data, and to the parameter testPar in dataset Data_1. The active dataset is Data.
- [Browse View](../raw/SM_browse_view.md)
  Context: `State Machine Editor > Reference to User Interface > Views > Browse View`
  Note: The Browse view contains the following tabs. Each tab offers a context menu.
- [Context Menus Browse View and Search Results View](../raw/sm_contextmenubrowseview.md)
  Context: `State Machine Editor > Reference to User Interface > Views > Context Menus Browse View and Search Results View`
  Note: The context menus of the Browse view and the Search Results view contain a subset of the following functions:
- [State Editor](../raw/SM_State_Editor_Window.md)
  Context: `State Machine Editor > Reference to User Interface > State Editor`
  Note: The State Editor window contains the following elements:
- [Edit Menu (State + Transition Editor)](../raw/SM_EditMenuStateTransitionEditor.md)
  Context: `State Machine Editor > Reference to User Interface > State Editor > Edit Menu (State + Transition Editor)`
  Note: This menu is available if you are entering ESDL code in the condition tab or one of the action tabs. It contains the following options:
- [<Action> Tab](../raw/SM_Action_Tab.md)
  Context: `State Machine Editor > Reference to User Interface > State Editor > <Action> Tab`
  Note: The tabs for entry, static and exit actions consist of the same elements.
- [Transition Editor](../raw/SM_Transition_Editor_Window.md)
  Context: `State Machine Editor > Reference to User Interface > Transition Editor`
  Note: The Transition Editor window contains the following elements:
- [Edit Menu (State + Transition Editor)](../raw/SM_EditMenuStateTransitionEditor.md)
  Context: `State Machine Editor > Reference to User Interface > Transition Editor > Edit Menu (State + Transition Editor)`
  Note: This menu is available if you are entering ESDL code in the condition tab or one of the action tabs. It contains the following options:
- [Condition Tab](../raw/SM_Condition_Tab.md)
  Context: `State Machine Editor > Reference to User Interface > Transition Editor > Condition Tab`
  Note: The Condition tab contains the following elements:
- [Action Tab](../raw/SM_ActionTrans_Tab.md)
  Context: `State Machine Editor > Reference to User Interface > Transition Editor > Action Tab`
  Note: The Action tab in the Transition Editor window contains the following elements:
