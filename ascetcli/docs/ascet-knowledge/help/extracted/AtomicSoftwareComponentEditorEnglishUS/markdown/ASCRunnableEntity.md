# Runnable Entities and Events

A runnable entity, or runnable, is a piece of code in a software component that is triggered by the runtime environment or RTE (see the ASCET AUTOSAR User's Guide or the publications at [http://www.autosar.org](http://www.autosar.org) for details) at runtime. It corresponds largely to the processes known in ASCET.

A software component comprises one or more runnable entities, and each runnable entity must have a unique handle so that the RTE can access it at runtime. Runnable entities can be triggered by events of various types. ASCET supports the following events:

- TIMING-EVENT – these events activate a runnable entity periodically. The timing event allows you to execute a runnable entity to poll an Rport to check if data has been received, periodically call a server (i.e. be a client), periodically send data on a Pport or simply to execute some internal software component functionality. Runnable entities that are activated in response to a timing event are said to be time-triggered.
- MODE-SWITCH-EVENT - these events activate a runnable entity on either entry to, or exit from a mode.
- OPERATION-INVOKED-EVENT – these events activate a runnable entity to handle a server call for an operation on a Pport characterized by a ClientServer interface.

AUTOSAR runnable entities can be sorted in several categories. ASCET supports runnable entities of category 1.

The name given to a runnable entity at its creation in ASCET denotes the name of the runnable entity in the XML namespace, but it does not tell the RTE what the associated function body you will provide in your code is called. This information is provided in the Symbol field of the runnable's implementation editor. The value entered there must be a valid C identifier; it is the C function name used by the generated C code.

In order to be executed, runnable entities must be assigned to the tasks of an AUTOSAR operating system. However, this is not part of ASCET.

ASCET allows the configuration of interrunnable variables that provide a way for the runnable entities of a software component to communicate with each other. These interrunnable variables can be measured during an experiment.

See also

[Creating a Runnable](ASCcreateRunnable.md)

[Specifying Events](ASCSpecifyingEvents.md)

[Modes and Mode Groups](SenderReceiverEditorEnglishUS.chm::/SREmodesModeGroups.htm)

[Interrunnable Variables](ASC_InterrunnableVariables.md)
