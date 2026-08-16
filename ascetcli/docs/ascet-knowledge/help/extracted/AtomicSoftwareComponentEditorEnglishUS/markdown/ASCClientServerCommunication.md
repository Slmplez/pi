# Client-Server Communication

Client-server communication involves a component invoking a defined “server” function in another component which may or may not return a reply.

A component type can define multiple ports categorized by client-server interfaces.

Each client-server interface can contain multiple operations, each of which can be invoked separately. An Rport of an SWC that requires an AUTOSAR client-server interface to the SWC can independently invoke any of the operations defined in the interface by making a client-server call to a Pport providing the service. A Pport that provides the client-service interface provides implementations of the operations.

Client-server communication can be n:1 (n > 0, multiple clients invoking the same server). It is not possible for a client to invoke multiple servers with a single request (i.e. 1:n communication). A client can, of course, call more than one server by making more than one request.

In ASCET, the ClientServer Interface component is used to specify client-server communication. These components are inserted into software components as ClientServer interface prototypes that can be used either as Pport or as Rport. They can be connected to appropriate diagram elements.

In ASCET, clients (Rports) can access servers (Pports) synchronously, which means that the client is blocked while the server processes the request. When the server has processed the request, the result is passed back to the client and the client continues the execution. The user has to ensure that the client is triggered by an RTE event.

See also

[Basics - ClientServer Interfaces](SenderReceiverEditorEnglishUS.chm::/SREBasicsClientServerInterfaces.htm)

[Specifying a ClientServer Interface Prototype](ASCspecifyClientServerInterfacePrototype.md)

[Enabling Concurrent Invocation of a Server Runnable](ASCenableConcurrentInvocation_ServerRunnable.md)

[Making a Client Request on a Port](ASCmakeClientRequest_on_Port.md)
