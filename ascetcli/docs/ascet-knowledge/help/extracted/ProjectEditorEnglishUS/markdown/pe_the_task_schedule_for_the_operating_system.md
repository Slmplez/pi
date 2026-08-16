# The Task Schedule for the Operating System

An essential part of an embedded control system is the underlying real-time operating system that controls the execution of the various algorithms and computations. In ASCET, the specification of the task schedule is supported by a special editor, where all relevant data for the operating system scheduling can be specified.

The specification of the task schedule is based on the automotive real-time operating system ERCOSEK. To serve the large number of parallel requests to the embedded control system, e.g. camshaft interrupts or sampling at a fixed rate, a priority-based cooperative and preemptive scheduling is the core of the operating system. This scheduling controls the execution of tasks in a multitasking environment. A task is defined as a list of processes to be executed in a given order. A process is any portion of a control algorithm which has to be executed at a given rate or as a reaction to an external interrupt.

Since a control system contains a number of algorithms, the number of processes can be very large. At the same time, many of these processes have a similar dynamic behavior. The collection of processes with the same dynamic behavior into tasks therefore reduces the administrative overhead of the operating system and structures the dynamic behavior of the application. Processes with the same dynamic behavior are therefore collected into one task.

The definition of a real-time task schedule consists of:

- Scheduling
- Tasks
- Processes
- Application modes

See also

[Scheduling](PE_Scheduling_.md)

[Tasks](PE_tasks.md)

[Processes](PE_processes.md)

[Application Modes](PE_applicationmodes.md)
