# Rte_Write

Rte_Write implements explicit data write access on a data element prototype of an Rport of a SenderReceiver or NVData interface.

Explicit data write access of a runnable entity means that the value of the data element is published immediately; (other) runnable entities can access the new value when they read the data element afterwards. Subsequent explicit write operations change the value of the data element.

In the software component editor, explicit write access can be specified as follows:

![](images/RTEmacros_Write.gif)

With Explicit access, the return value of Rte_Write is assigned to a temporary variable.

You can also select Explicit with Status. In that case, the return value is assigned to a special runnable-local variable named _ASCET_RteStatus. This variable must be assigned to a model variable, see [Sending to a Port - Explicit with Status](ASCsendToPort.md#ExplicitStatus).

See also

[Sending to a Port](ASCsendToPort.md)
