# Rte_Call

Rte_Call initiates client-server communication, selectively with synchronous or asynchronous semantics.

In the software component editor, a client request can be specified as follows:

![](RTEmacros_Call.gif)

With the default settings, the return value of Rte_Call is assigned to a temporary variable.

You can also select Status. In that case, the return value is assigned to a special runnable-local variable named _ASCET_RteStatus. This variable must be assigned to a model variable, see [Making a Client Request on a Port - Explicit with Status](ASCmakeClientRequest_on_Port.md#ExplicitStatus).

See also

[Making a Client Request on a Port](ASCmakeClientRequest_on_Port.md)
