# Basics - ClientServer Interfaces

Client-server communication involves a component invoking a defined “server” function in another component which may or may not return a reply.

In ASCET, the ClientServer Interface component is used to specify client-server communication. These components are inserted into software components as ClientServer interface prototypes that can be used either as Pport or as Rport.

Each ClientServer interface component can contain one or more operations, each of which can be invoked separately. Several implementations can be specified for a ClientServer interface component; each implementation corresponds to one ClientServer interface in AUTOSAR.

The interface editor for ClientServer interfaces, or ClientServer interface editor is used to specify the content of ClientServer interfaces.

You can

[Create an AUTOSAR Interface](SREcreateSenderReceiverInterface.md)

[Set up a ClientServer Interface](SRE_SetUp_ClientServerInterface.md)

[Edit Operations](SRE_EditOperation.md)

[Implement Operation Arguments](SRE_ImplementOperationArguments.md)

See also

[Client-Server Communication](AtomicSoftwareComponentEditorEnglishUS.chm::/ASCClientServerCommunication.htm)

[Specifying a ClientServer Interface Prototype](AtomicSoftwareComponentEditorEnglishUS.chm::/ASCspecifyClientServerInterfacePrototype.htm)

[Enabling Concurrent Invocation of a Server Runnable](AtomicSoftwareComponentEditorEnglishUS.chm::/ASCenableConcurrentInvocation_ServerRunnable.htm)

[Making a Client Request on a Port](AtomicSoftwareComponentEditorEnglishUS.chm::/ASCmakeClientRequest_on_Port.htm)

[Implementations of Components / Projects](../../implementation-editor/raw/IEd_impl_comp_proj_s.md)
