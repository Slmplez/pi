# Basics - SenderReceiver and NVData Interfaces

Sender-receiver communication involves the transmission and reception of signals consisting of atomic data elements sent by one AUTOSAR software component (SWC) and received by one or more SWC.

An SWC type can have multiple sender-receiver ports. Each sender-receiver port can contain multiple data elements each of which can be sent and received independently. Data elements within the interface can be simple (integer, float, ...) or complex (array, record) types.

In ASCET, the SenderReceiver Interface component is used to specify sender-receiver communication. Such a component can contain scalar variables, enumerations, arrays, matrices, and records. In addition, SenderReceiver interface components can be used to specify mode-switch interfaces; see also [Modes and Mode Groups](SREmodesModeGroups.md).

In AUTOSAR R3.1.5 or lower, a SenderReceiver interface component can contain both data elements and mode groups (although this practice is not recommended); in AUTOSAR R4.0, a SenderReceiver interface must contain either data elements or one mode group.

The SenderReceiver interface editor is used to specify the content of SenderReceiver interfaces.

NVData Interface components work the same way as SenderReceiver interfaces, with two exceptions: the elements of an NVData interface are always placed in the non-volatile memory of the ECU, and NVData interfaces cannot contain mode groups.

The NVData interface editor is used to specify the content of NVData interfaces.

You can

[Create an AUTOSAR Interface](SREcreateSenderReceiverInterface.md)

[Set up a SenderReceiver or NVData Interface](SREsetupSenderReceiverInterface.md)

[Implement SenderReceiver or NVData Interface Elements](SRE_ImplementSRInterfaceElements.md)

See also

[Specifying a SenderReceiver or NVData Interface Prototype](AtomicSoftwareComponentEditorEnglishUS.chm::/ASCspecifySRIprototype.htm)

[Sending to a Port](AtomicSoftwareComponentEditorEnglishUS.chm::/ASCsendToPort.htm)

[Receiving from a Port](AtomicSoftwareComponentEditorEnglishUS.chm::/ASCreceiveFromPort.htm)

[Sender-Receiver Communication](AtomicSoftwareComponentEditorEnglishUS.chm::/ASCsenderReceiverCommunication.htm)

[Modes and Mode Groups](SREmodesModeGroups.md)

[Ports and Interfaces](AtomicSoftwareComponentEditorEnglishUS.chm::/ASCportsInterfaces.htm)

[Records - Overview](RecordsEnglishUS.chm::/RC_overview.htm)
