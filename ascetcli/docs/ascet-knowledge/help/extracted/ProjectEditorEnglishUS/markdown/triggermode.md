# Selecting the Task Type

- From the Type combo box, select a trigger mode.

The following trigger modes are available:

| Column 1 | Column 2 |
| --- | --- |
| Alarm tasks | Alarm tasks are triggered once at the beginning of every period defined in the Period field. |
| Init tasks | Init tasks are triggered only once, on start-up of the application mode they are assigned to. |
| Software tasks | Software tasks are triggered by operating system commands. |
| Interrupt tasks | Interrupt tasks are triggered by hardware events. The hardware events available depend on the target. If, e.g. the target is a transputer board, an event task could be triggered by data arriving on channel 0. |

See also

[Assigning a Priority](PE_priority.md)

[Defining the Scheduling (RTA-OSEK + Generic OSEK)](PE_Scheduling_RTAOSEK_GenericOSEK.md)

[Defining the Scheduling (ERCOSEK + Generic OS)](PE_scheduling.md)

[Selecting a Trigger (ISR Source)](PE_trigger.md)

[Setting Period, Delay, and Max. Number of Activations](others.md)

[Setting the Autostart Option](setautostart.md)

[Setting Deadline and Minimum Period Options](setdeadline.md)

[Setting Up Hook Routines](HookRoutine.md)
