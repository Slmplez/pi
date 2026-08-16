# Communication with Other Components

A state machine can communicate with other ASCET components. For this, there are several options: inputs and outputs, trigger arguments and public methods (see also [State Machines as Classes](SM_State_Machines_as_Classes.md)).

If you want to carry out external communication using trigger arguments, a series of steps are necessary.

Firstly, you need one or more trigger arguments. The rules for the creation of trigger arguments for the various use cases are shown in [Rules for Trigger Arguments](SM_Rules_for_Trigger_Arguments.md).

The trigger argument belongs to a public method in the same diagram as the state diagram. Therefore, you can use it exactly as you would use variables or parameters, if you specify conditions or actions in the transition or state.

If you want to use the trigger argument in an action or condition specified in an ActionCondition diagram, you must generate an argument of the same name and the same type in the action or condition. The arguments in triggers and actions/conditions are mapped according to their name and their type.

See also

[State Machines as Classes](SM_State_Machines_as_Classes.md)

[Trigger Arguments for External Communication](SM_Trigger_Arguments_for_Communication.md)

[Conditions and Actions in the State Diagram](conditions_actions_state.md)

[Adding Inputs and Outputs to the State Machine](adding_inputs.md)

[Adding a Trigger Argument](adding_triggerargument.md)

[Adding Arguments to Conditions/Actions](adding_arguments.md)
