# Setting Up Hook Routines

This instruction does not apply to ASCET-SE targets.

You can specify the generation of hook routines for debugging purposes for each task.

To set up hook routines for a task, proceed as follows:

1. Make sure that the Enable Monitoring option is activated.
1. From the pre/post hooks combo box, select one of the following options.

| Column 1 | Column 2 |
| --- | --- |
| none | no debug functions |
| monitoring | Complete debug functions, i.e. the monitoring variables for the task (see The Monitoring Option ) are generated during the next code generation. You can show them in the measure windows or write them to the data logger. |

Depending on the settings, suitable data structures are created during code generation, and the appropriate ERCOSEK libraries are included. For this purpose, ASCET generates the make variable E_HOOKS. The following table shows the correlations between the settings in the OS editor and the E_HOOKS variable:

| Column 1 | Column 2 | Column 3 | Column 4 |
| --- | --- | --- | --- |
| Enable Monitoring | Pre/post hooks | Generated value for E_HOOKS | dT available in the Code |
| yes | monitoring for at least one task | MONITORING | yes, additional debug information |
| no | monitoring for at least one task | DTONLY | yes |
| any | none for all tasks | DTONLY | no |

For simulations with experimental targets, only the monitoring option is important. It controls the generation of monitoring variables (see [The Monitoring Option](monitoringoption.md)).

See also

[The Monitoring Option](monitoringoption.md)

- [Selecting the Task Type](triggermode.md)
- [Assigning a Priority](PE_priority.md)
- [Defining the Scheduling (RTA-OSEK + Generic OSEK)](PE_Scheduling_RTAOSEK_GenericOSEK.md)
- [Defining the Scheduling (ERCOSEK + Generic OS)](PE_scheduling.md)
- [Selecting a Trigger (ISR Source)](PE_trigger.md)
- [Setting Period, Delay, and Max. Number of Activations](others.md)
- [Setting the Autostart Option](setautostart.md)
- [Setting Deadline and Minimum Period Options](setdeadline.md)
- (item)
