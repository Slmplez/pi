# Defining the Scheduling in the OS Editor

This instruction is obsolete for projects that contain AUTOSAR software components. The OS tab is present when you create the project, and add the SWC, but the tab content is ignored and the tab disappears when you close the project editor.

Several actions are required to define the scheduling in the OS editor. Proceed as follows:

1. Make the operating system settings

1. for [RTA-OSEK or Generic OSEK](PE_OS_Settings_RTAOSEK_OSEK.md).
1. for [ERCOSEK or Generic OS](setoperating.md).

1. [Create](createtask.md) and [set up](PE_Setting_Up_a_Task.md) the necessary tasks.
1. [Assign processes to the tasks](assignprocess.md).
1. [Assign application modes to the tasks](assignapplication.md).

If necessary, you can [shift](shiftprocess.md) or [deassign](deassignprocess.md) processes in tasks, you can check which [processes](seetask.md) or [application modes](PE_check_applicationmode.md) are assigned to tasks and vice versa ([Checking the Origin](seeorigin.md) and [Checking which Application Mode is Assigned to a Task](PE_check_applicationmode.md)). You can even [open the parent component of a process](opentaskspane.md).
