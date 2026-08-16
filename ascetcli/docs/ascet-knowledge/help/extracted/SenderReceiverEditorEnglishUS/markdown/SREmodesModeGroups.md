# Modes and Mode Groups

AUTOSAR modes can be used to execute code when the RTE is started, e.g. to initialise internal data structures etc. Similarly, when a system is shut down your software component may need to store data, log operational details etc. A runnable entity can be activated on either entry or exit from a mode using a Mode Switch Event.

Modes are declared within a mode declaration group. In ASCET, the Mode Group component represents mode declaration groups. Each mode group component defines one or more modes. The first mode of a mode group component is marked as the group's initial mode.

In ASCET, modes are communicated over a SenderReceiver interface. In combination with AUTOSAR R3.1.5 or lower, each SenderReceiver interface can specify zero or more mode declaration group prototypes, i.e. instances of different mode group components, that define the AUTOSAR modes communicated via the interface. In combination with AUTOSAR R4.0, each SenderReceiver interface can specify zero or one mode declaration prototype.

A mode group component can be used (referenced) by multiple SenderReceiver interfaces and therefore inherently used by multiple software components.

See also

[Creating a Mode Group](SREcreateModeGroup.md)

[Editing a Mode Group](SREeditModeGroup.md)

[Sender-Receiver Communication](AtomicSoftwareComponentEditorEnglishUS.chm::/ASCsenderReceiverCommunication.htm)

[Runnable Entities and Events](AtomicSoftwareComponentEditorEnglishUS.chm::/ASCRunnableEntity.htm)
