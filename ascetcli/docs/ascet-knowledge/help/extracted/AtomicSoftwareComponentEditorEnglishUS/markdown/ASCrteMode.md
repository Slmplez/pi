# RTE_Mode

RTE_Mode implements explicit data write access on a data element prototype of an Rport of a SenderReceiver interface.

AUTOSAR provides a mode concept:

1. Entry into or exit from a mode can trigger the execution of a runnable entity.
1. Runnable entities can be generally disabled for certain modes, i.e. the defined trigger events for the runnable entity do not cause its execution if the RTE is in the respective mode (see [Setting Up an Event](ASCsetUpEvent.md)).

Precondition for using this mechanisms is the presence of an Rport of a SenderReceiver interface containing a mode group (see [Modes and Mode Groups](SenderReceiverEditorEnglishUS.chm::/SREmodesModeGroups.htm)). The current mode of the RTE can be explicitly queried by a software component by reading this mode group.

The main use case of mode groups in software components is the specification of ModeSwitch events (see [Enabling/Disabling Modes](ASCenableDisableModes.md)).

![](images/RTEmacros_Mode.gif)

See also

[Modes and Mode Groups](SenderReceiverEditorEnglishUS.chm::/SREmodesModeGroups.htm)

[Setting Up an Event](ASCsetUpEvent.md)
