# Tasks

A task contains a list of processes that are executed on activation of that task. The execution order of the processes is fixed. The way a task is scheduled by the scheduler of the operating system is defined by the task settings. There are four different task modes:

- Alarm tasks (![](icon_timertask.gif)) are activated periodically. The activation rate is specified in seconds.
- Interrupt tasks (![](icon_ISRtask.gif)) are activated by an external event. For each processor, different types of events are available. The appropriate event can be chosen from a list of events.
- Software tasks (![](icon_SWtask.gif)) are activated by calling an operating system routine, i.e. they are activated directly through the software.
- Init tasks (![](icon_inittask.gif)) are activated once before the start of the operation system. Init tasks contain code for the initialization of the system.

Tasks of type Init and application mode inactive are called exit tasks (![](icon_exittask.gif)).

In ASCET, each task is given a name and a unique task number. This number does not change when the task is shifted. If a task is deleted, its number is not reused for a new task. The only way to change task numbers is via the Renumber Tasks command. See also [Working on Tasks](PE_Working_on_Tasks.md).

See also

[Application Modes](PE_applicationmodes.md)

[Processes](PE_processes.md)

[Creating a Task](createtask.md)

[Working on Tasks](PE_Working_on_Tasks.md)
