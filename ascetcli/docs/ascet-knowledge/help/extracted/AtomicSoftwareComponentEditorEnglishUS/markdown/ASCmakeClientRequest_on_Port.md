# Making a Client Request on a Port

If your software component uses a ClientServer interface as Rport, you must define at least one runnable entity that acts as the client. The user has to ensure that the client is triggered by an RTE event.

1. Open the SWC you want to edit.
1. Place the ClientServer interface prototype (Rport) in the drawing area.
1. In the Basic Blocks palette or toolbar, click on the ![](buttonRteInvoke.gif) RTE Invoke button to add an RTE Invoke operator.
1. Place the operator in the drawing area.
1. Connect the return value of the desired operation in the Rport to the RTE Invoke operator.
1. Edit the operator sequence call [manually](ASCEditSequence.md) or [automatically](ASCassignindividual.md).
1. To select explicit access with status information, right-click the RTE Invoke operator and select Status from the context menu.
1. Specify the status inquiry as follows:

See also

[Editing a Sequence Call in the Sequence Editor](ASCEditSequence.md)

[Automatically Assigning Individual Sequence Calls](ASCassignindividual.md)

[Specifying a ClientServer Interface Prototype](ASCspecifyClientServerInterfacePrototype.md)

[Client-Server Communication](ASCClientServerCommunication.md)

[Enabling Concurrent Invocation of a Server Runnable](ASCenableConcurrentInvocation_ServerRunnable.md)

[RTE Access Macros - Error Codes](ASCrteAccessMacros.md#ErrorCode)

[Adding and Editing a Literal](BlockDiagramEditorEnglishUS.chm::/BDE_AddLiteral.htm)
