# Assigning Actions to a State

Each state can have an entry action, a static action and an exit action. All these are optional.

To assign actions to a state, proceed as follows:

1. Do one of the following:
1. On the Entry tab of the State Editor window, select an entry action from the combo box.
1. On the Static and Exit tabs, select the static and exit actions.
1. Click OK.

The names of the actions are displayed in the state symbol.

If you have assigned actions or conditions with arguments, a test is carried out when you leave the state or transition editor to see if all the relevant triggers have the corresponding arguments with identical names and types. If this is not the case, an error message appears in the ASCET monitor window.

- Generate the trigger elements specified in the error message as described in [Adding a Trigger Argument](adding_triggerargument.md).

If you have generated a trigger argument, and it is not used in any action or condition, this has no effect on the function of the state machine. On code generation, a warning is only displayed in the ASCET Errors/Warnings window.

Once you have assigned actions or conditions from an ActionCondition diagram, the Edit button on the various tabs becomes active. You can use it to edit the action/condition assigned on the respective tab.

See also

[Adding a Trigger Argument](adding_triggerargument.md)
