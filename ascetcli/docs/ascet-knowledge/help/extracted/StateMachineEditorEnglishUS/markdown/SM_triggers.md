# Triggers

Triggers activate the execution of the state machines. Each trigger call causes the execution of one state machine step. They are public methods of the state machine; you must define each trigger that affects the state diagram. A trigger can have arguments for communication with other ASCET components.

A state machine can have one or more triggers. Each transition is assigned to one of the triggers of the state machine. Each trigger can be started independently. The state machine is activated whenever a trigger is started: all transitions from the current state are checked in the order of their priority, and a transition is executed if necessary.

See also

[Inserting a Trigger](SM_insert_trigger.md)

[Assigning Triggers, Priorities, Conditions and Actions to a Transition](SM_AssignTriggers.md)
