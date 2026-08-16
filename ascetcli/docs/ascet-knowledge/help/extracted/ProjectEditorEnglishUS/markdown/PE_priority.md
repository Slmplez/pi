# Assigning a Priority

If more than one task is scheduled for execution, their activation is determined by their priority.

If, for example, several alarm tasks have been scheduled for simultaneous triggering, the task with the highest priority is triggered first. Tasks are interrupted if a task with a higher priority than the currently running task is activated. The general priority scheme is presented in [Tasks](PE_tasks.md).

- Assign a priority to the task by entering a figure into the Priority field.

ERCOSEK/Generic OS: Preemptive tasks and cooperative tasks have separate priority regions.

RTA-OSEK/Generic OSEK: FULL and NON tasks share a common priority region. Cooperative tasks have their own priority region.

This option is not available for init tasks.

See also

[Selecting the Task Type](triggermode.md)

[Defining the Scheduling (RTA-OSEK + Generic OSEK)](PE_Scheduling_RTAOSEK_GenericOSEK.md)

[Defining the Scheduling (ERCOSEK + Generic OS)](PE_scheduling.md)

[Selecting a Trigger (ISR Source)](PE_trigger.md)

[Setting Period, Delay, and Max. Number of Activations](others.md)

[Setting the Autostart Option](setautostart.md)

[Setting Deadline and Minimum Period Options](setdeadline.md)

[Setting Up Hook Routines](HookRoutine.md)
