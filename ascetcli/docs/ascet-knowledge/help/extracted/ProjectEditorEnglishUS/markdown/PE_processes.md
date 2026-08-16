# Processes

A task consists of a sequence of processes. Processes contain the execution code of the program. The body of a process is executed sequentially. Since tasks can be interrupted preemptively by tasks of a higher priority, processes can be interrupted in the middle of their execution. Therefore, processes must be designed so that they can be executed in parallel.

When working in a preemptive system, the main problem is data consistency. The operating system has to guarantee, that the result of the computation in a process depends on the value of the input variables alone, and not on the order of execution in the system.

To solve this problem, the ERCOSEK concept of messages is supported in processes. In the ERCOSEK operating system, messages are protected global variables. Protection is achieved by working on copies of the global variables. The system analyses whether a copy is required and establishes an optimum data consistency scheme without penalties for the run-time kernel.

See also

[Tasks](PE_tasks.md)

[Assigning a Process to a Task](assignprocess.md)

[Messages](IntroductionEnglishUS.chm::/INT_messages.htm)
