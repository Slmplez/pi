# Rules for Trigger Arguments

The following rules for the use of trigger arguments in actions and conditions.

- All trigger arguments which are to be used in the entry action of a state must be defined in the action and in every trigger belonging to the transition leading into the state, as it will be started by these triggers.
- All trigger arguments which are to be used in the exit action of a state must be defined in the action and in every trigger belonging to the transition leading out of the state, as it will be started by these triggers.
- All trigger arguments which are to be used in the static action of a state must be defined in the action and in each trigger of the state machine. Each trigger event which does not cause a transition from the active state, starts the execution of its static action.
- You must define all trigger arguments which are to be used in the condition or transition action of a transition, in the action/condition and in the triggers belonging to the transition, as it will be started by this trigger.

If one of these rules is violated, an error message is issued.

See also

[Communication with Other Components](communications_components.md)

[Adding a Trigger Argument](adding_triggerargument.md)

[Adding Arguments to Conditions/Actions](adding_arguments.md)
