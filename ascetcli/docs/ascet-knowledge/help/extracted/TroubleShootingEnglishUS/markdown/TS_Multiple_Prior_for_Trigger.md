# Multiple Prio for Trigger

Multiple prio <priority_number> for trigger <trigger_name> in state <state_name>

##### Description:

The state machine contains two transitions leading from state state_name attached to the same trigger trigger_name with the same priority priority_number. This is not allowed, since the transition is not unique.

##### Solution:

Change one of the priorities, such that all priorities leading from the same state and assigned to the same trigger are different.

See also

[State Machine Editor - Assigning Triggers, Priorities, Conditions and Actions to a Transition](StateMachineEditorEnglishUS.chm::/SM_AssignTriggers.htm)
