# Using Public Methods in Actions and Conditions

In the combo box on the action tabs in the state editor, public methods are available. In the combo box on the action tabs in the transition editor, public methods without return value are available. A public method with a return value is available in the combo box on the Condition tab in the transition editor.

To use public methods in actions and conditions, proceed as follows:

1. Assign the public method to an action.
1. Assign the public method to a condition.

If you specify actions or conditions in ESDL, you can call the public methods of the state machine exactly like the methods of imported classes. The class name is either replaced by this or self, or left out completely.

Both ways to specify the calling of the public method count obtain the same results.

See also

[Assigning Actions to a State](SM_AssignActions.md)

[Assigning Triggers, Priorities, Conditions and Actions to a Transition](SM_AssignTriggers.md)
