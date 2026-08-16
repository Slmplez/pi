# Operating System Settings (ERCOSEK + Generic OS)

This instruction is valid for the PC target and rapid prototyping targets.

To set up the operating system, proceed as follows:

1. Click on the OS tab in the project editor to open the operating system editor.

1. In the Preemp. Levels and Coop. Levels fields, set the number of co-operative and pre-emptive levels for the project.

The number available depends on the implementation of the real-time operating system on the current target. If the target is a PC, for instance, there are no pre-emptive levels available, because pre-emptive multitasking is not possible in the PC implementation of the operating system.

See also

[Copying Operating System Settings](copyos.md)
