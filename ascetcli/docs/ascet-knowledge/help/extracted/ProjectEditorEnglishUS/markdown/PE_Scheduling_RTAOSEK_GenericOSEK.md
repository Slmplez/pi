# Defining the Scheduling (RTA-OSEK + Generic OSEK)

This instruction is valid for a target with RTA-OSEK or GENERIC-OSEK operating system.

- In the Scheduling combo box, assign one of three possible scheduling modes to the task.

This option is not available for init and interrupt tasks.

The following modes are available:

| Column 1 | Column 2 |
| --- | --- |
| FULL | Full preemptive scheduling. A running task with mode FULL is interrupted as soon as a task with higher priority is activated. The task context is saved so that the preempted task can be continued at the location where it was interrupted. |
| NON | Non preemptive scheduling. A running task with mode NON can be interrupted only at an explicit point of rescheduling, even if a task with higher priority is activated. The lower priority task delays the start of the interrupting task up to the next point of rescheduling. Only ISRs can interrupt NON tasks at any point. |
| Cooperative | Cooperative scheduling. The lowest priority tasks share the same internal resource; they can be freely interrupted by higher priority tasks of mode FULL or NON . A higher-priority task of type COOPERATIVE can interrupt the running cooperative task only after the current process is finished. |

See also

[Selecting the Task Type](triggermode.md)

[Assigning a Priority](PE_priority.md)

[Defining the Scheduling (ERCOSEK + Generic OS)](PE_scheduling.md)

[Selecting a Trigger (ISR Source)](PE_trigger.md)

[Setting Period, Delay, and Max. Number of Activations](others.md)

[Setting the Autostart Option](setautostart.md)

[Setting Deadline and Minimum Period Options](setdeadline.md)

[Setting Up Hook Routines](HookRoutine.md)
