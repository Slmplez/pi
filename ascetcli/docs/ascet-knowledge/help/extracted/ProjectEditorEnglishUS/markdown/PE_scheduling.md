# Defining the Scheduling (ERCOSEK + Generic OS)

This instruction is valid for the PC target and ES113x rapid prototyping targets.

- In the Scheduling combo box, assign one of three possible scheduling modes to the task.

This option is not available for init and interrupt tasks.

The following modes are available:

| Column 1 | Column 2 |
| --- | --- |
| cooperative | If you select cooperative , the task will interrupt a running task of lower priority only after the currently running process is finished. |
| preemptive | If you select preemptive , the task will interrupt a running task with lower priority immediately. The currently running process is interrupted and will be resumed after the interrupting task is finished. |

Since, in ERCOSEK, all preemptive tasks have a higher priority than cooperative tasks, the effective interrupt behavior is as follows:

1. Cooperative tasks never interrupt preemtive tasks.
1. Cooperative tasks interrupt each other after the currently running process is finished (or even the task if the task to be interrupted has only one process assigned).
1. Preemptive tasks always interrupt immediately.

Details on the scheduling modes are given in [Scheduling](PE_Scheduling_.md).

See also

[Selecting the Task Type](triggermode.md)

[Assigning a Priority](PE_priority.md)

[Defining the Scheduling (RTA-OSEK + Generic OSEK)](PE_Scheduling_RTAOSEK_GenericOSEK.md)

[Selecting a Trigger (ISR Source)](PE_trigger.md)

[Setting Period, Delay, and Max. Number of Activations](others.md)

[Setting the Autostart Option](setautostart.md)

[Setting Deadline and Minimum Period Options](setdeadline.md)

[Setting Up Hook Routines](HookRoutine.md)
