# Message Copy Semantics for Experiment Code

ASCET supports several message copy semantics for experiment code, i.e. code generated for PC or ASCET-RP targets, and production code, i.e. code generated for ASCET-SE microcontroller targets (see the ASCET-SE user's guide for more information).

In the [Experiment Code](Exp_Code_Options_Window.md) node of the Project properties window, one of three message copy semantics can be selected.

- [NON_OPT_COPY_FUNCTION](#NON_OPT_COPY_FUNCTION)
- [NON_OPT_COPY_TASK](#NON_OPT_COPY_TASK)
- [NO_COPY](#NO_COPY)

##### Restrictions

- The OSEK_COM and OSEK_COM_STACK_BUFFER semantics available for ASCET-SE targets are not supported for experiment code.
- Code generated with the Transfer option of the Build menu must use the NON_OPT_COPY_FUNCTION semantics. If another semantics is selected, the NON_OPT_COPY_FUNCTION semantics is enforced and an information is issued.

IMake2 - %1 command requires message usage variant option to be set to %2 instead of %3 --- will be set for code generation

##### NON_OPT_COPY_FUNCTION

A copy is used for each message accessed within the process or method. The message values are read at the beginning of the process/method execution, and changed values are written back to the master message upon exit of the process/method.

This semantics is not safe with respect to a method being called from other methods/processes that access the same messages.

If this semantics is selected, warnings are issued in the following cases:

- a message is written in a process/method, and read in a called method

WMdl312 - read access to message "%1" in method "%2" might not return current value in context of %3 "%4" due to option "message usage variant" set to %5

- a message is written in a called method and read in the calling method/process

WMdl313 - write access to message "%1" in method "%2" might not affect current value in context of %3 "%4" due to option "message usage variant" set to %5

##### NON_OPT_COPY_TASK

This semantics most closely resembles the NON_OPT_COPY semantics of ASCET-SE targets.

During task execution, a task-specific struct that holds a copy of each message accessed within the task. The values are read from the master messages by a special process executed at the beginning of the task, and changed values are written back to the master messages by another special process executed as the last process in the task.

If a task accesses no messages, no struct is generated because ANSI-C does not allow empty structs.

Init tasks do not use message copies, they use the master messages.

If this semantics is selected, errors are issued in the following cases:

- a process is used in more than one task

MMdl352 - process %1 must not be assigned to multiple tasks with option message usage variant set to %2

- a method is called from processes assigned to more than one task

MMdl353 - method %1 must not be called from different tasks with option message usage variant set to %2

- the OS specification does not contain any tasks

MMdl351 - operating system specification must not be empty with option message usage variant set to %1

If this semantics is selected, warnings are issued in the following cases:

- a process/method uses a message, but is not called by any task

WMdl314 - %1 access to message "%2" in function "%3", but not called from any task with option "message usage variant" set to %4

##### NO_COPY

No message copies are used, i.e. each access manipulates the master message.

If used for offline simulation, this semantics is equivalent to the OPT_COPY semantics of ASCET-SE targets, with respect to data integrity. If used for online simulation, this semantics is unsafe.

A warning is issued if this semantics is used in combination with an ASCET-RP target.

WMdl320 - disabling message copy generation might be unsafe with respect to data integrity
