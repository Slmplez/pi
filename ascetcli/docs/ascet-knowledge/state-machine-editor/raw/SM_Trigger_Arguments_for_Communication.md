# Trigger Arguments for External Communication

You can use trigger arguments for external communication. Stack variables which do not burden the static RAM are created for the arguments of a C function. The dynamic RAM area is burdened temporarily.

You should always keep the following points in mind:

- Triggers are public methods. Their arguments can be described outside of the state machines. In the Layout Editor, the trigger arguments are represented by black argument connections.
- You can use classes (except CT blocks) as complex trigger arguments. However, a state machine with complex trigger argument cannot be stimulated in an experiment.

If a trigger argument is to be used in an action or condition specified as a block diagram, an argument of the same type and the same name as the trigger argument must be added to each corresponding method.

![](za_triggerarg_1.gif)

The arguments are depicted according to their name and their type. If, in the trigger and the action/condition, there are arguments with the same names but with different types, a warning is issued. If the argument is only defined in an action or a condition but not in the opening trigger, an error message is output.

The rules for using trigger arguments are described here: [Rules for Trigger Arguments](SM_Rules_for_Trigger_Arguments.md)
