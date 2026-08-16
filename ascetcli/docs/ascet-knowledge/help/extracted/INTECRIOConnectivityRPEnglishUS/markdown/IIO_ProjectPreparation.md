# Project Preparation

First of all you create the ASCET project as usual. You have all possibilities available to you which are possible in ASCET. But note the following points:

- By default, messages that are only read in ASCET (i.e. receive messages without relevant send messages) are the signal sinks in INTECRIO. Messages that are only written to (i.e. send messages without the relevant receive message) are the signal sources in INTECRIO. Messages that are both read and written in ASCET are excluded from integration.

If required, you can make the latter appear as signal sources in INTECRIO, see [Project Transfer to INTECRIO - Messages](IIO_ProjectTransfer_to_INTECRIO.md#messages).

- When your project contains unresolved messages (imported messages without corresponding export), the code generation for INTECRIO displays an error message.

You can either resolve the messages automatically or cancel the code generation and manually resolve the messages.

- It is possible to use global variables and parameters, but this is explicitly not recommended.
- Enumerations and formulas in your project must have different names. If the project contains an enumeration and a formula with identical names, the code generation for INTECRIO displays an error message.
- You have to select the target Prototyping, ES1130, ES1135, ES910 or RTPRO-PC in the build options of the project. INTECRIO is preselected in the Experiment Target combo box with any of these targets. INTECRIO code generated with this target can be used with each experimental target supported by INTECRIO.

The target Prototyping is strongly recommended for transfer to INTECRIO.

- After selecting the Prototyping target, the following setup options are deactivated in the OS editor:
- Preemp. Levels and Coop. Levels fields (all tasks)
- Enable Monitoring option, pre-/post hooks combo box (all tasks)
- ISR Source and Min. Period fields (interrupt tasks)
- Max. Number of Activations field (alarm/software tasks)
- Autostart option (alarm/software tasks)

In some cases, the number of preemptive levels is set to 0. In that case, you can use the Copy From Target function in the Operating System menu to copy the operating system settings (e.g., from an ES113x) to the Prototyping target. The deactivated settings are copied and the Preemp. Levels field is made available. You can now enter a suitable value, i.e. a number ≥ 8.

- See [ASCET and SCOOP-IX](IIO_ASCET_SCOOPIX.md) for information on how some ASCET settings appear in the SCOOP-IX file generated for use with INTECRIO.

Once you have completely specified the project, you invoke the transfer of the project to INTECRIO as the first step in code generation.

See also

[Project Transfer to INTECRIO](IIO_ProjectTransfer_to_INTECRIO.md)

[Preparing the Project](IIO_PrepareProject.md)

[ASCET and SCOOP-IX](IIO_ASCET_SCOOPIX.md)
