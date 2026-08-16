# Scheduling in the OS Editor

This topic is obsolete for projects containing AUTOSAR software components. The OS tab is present when you create the project, and add the SWC, but the tab content is ignored and the tab disappears when you close the project editor.

The scheduling of processes is the second major operation performed in the project editor. The operating system does not activate individual processes directly. Instead, processes are grouped together by activation mode into sequences called tasks. These tasks are activated by the operating system and on activation the sequence of processes assigned to the task is executed in the given order.

All the settings in the operating system editor must be specified separately for each combination of target and operating system. However, the settings can be copied between target/OS combinations.

See also

[Application Modes](PE_applicationmodes.md)

[Basic Task Settings](basictasksetting.md)

[Task Priorities](pe_task_prioritiess.md)

[Defining the Scheduling in the OS Editor](PE_Define_Scheduling_in_OS_Editor.md)

[Operating System Settings (ERCOSEK + Generic OS)](setoperating.md)

[Operating System Settings (RTA-OSEK + Generic-OSEK)](PE_OS_Settings_RTAOSEK_OSEK.md)

[Creating a Task](createtask.md)

[The Monitoring Option](monitoringoption.md)
