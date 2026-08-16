# Sending to a Port

If your software component uses a SenderReceiver or NVData interface as Pport, at least one runnable entity must send data over the interface. Use one of the following possibilities to specify sending data:

- [Implicit](#Implicit)
- [Implicit with RTE Access operator](#Implicit_RTEAccess)
- [Explicit](#Explicit)

##### Implicit:

1. Open the SWC you want to edit.
1. Place the SenderReceiver/NVData interface prototype in the drawing area.
1. Connect a suitable output (of, e.g., an operation or a variable) directly to the SenderReceiver or NVData interface prototype.
1. Edit the Pport sequence call [manually](ASCEditSequence.md) or [automatically](ASCassignindividual.md).

##### Implicit with RTE Access operator:

1. Open the SWC you want to edit.
1. Place the SenderReceiver/NVData interface prototype in the drawing area.
1. In the Basic Blocks palette or toolbar, click on the ![](buttonRteAccess.gif) RTE Access button to add an RTE Access operator.
1. Place the operator in the drawing area.
1. Right-click the RTE Access operator, open the Access context menu and select Implicit.
1. Connect the right side of the operator to the SenderReceiver/NVData interface prototype and the left side to an appropriate diagram element.
1. Edit the Pport sequence call [manually](ASCEditSequence.md) or [automatically](ASCassignindividual.md).

##### Explicit:

1. Open the SWC you want to edit.
1. Place the SenderReceiver/NVData interface prototype in the drawing area.
1. In the Basic Blocks palette or toolbar, click on the ![](buttonRteAccess.gif) RTE Access button to add an RTE Access operator.
1. Place the operator in the drawing area.
1. Connect the right side of the operator to the SenderReceiver/NVData interface prototype and the left side to an appropriate diagram element.
1. Edit the Pport sequence call [manually](ASCEditSequence.md) or [automatically](ASCassignindividual.md).
1. To select explicit access with status information, right-click the RTE Access operator, open the Access context menu and select Explicit with Status.
1. Specify the status inquiry as follows:

See also

[Sender-Receiver Communication](ASCsenderReceiverCommunication.md)

[Editing a Sequence Call in the Sequence Editor](ASCEditSequence.md)

[Automatically Assigning Individual Sequence Calls](ASCassignindividual.md)

[Specifying a SenderReceiver or NVData Interface Prototype](ASCspecifySRIprototype.md)

[RTE Access Macros - Error Codes](ASCrteAccessMacros.md#ErrorCode)

[Adding and Editing a Literal](BlockDiagramEditorEnglishUS.chm::/BDE_AddLiteral.htm)
