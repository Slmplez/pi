# Rte_Read

Rte_Read implements explicit data read access on a data element prototype of an Rport of a SenderReceiver or NVData interface. The return value of Rte_Read represents the status of the operation, whereas the value of the read element is assigned to a variable passed as argument with direction out to Rte_Read.

Explicit data read access of a runnable entity means that the current value of the data element is read from the RTE. Subsequent explicit read access operations within the same runnable entity may result in different values of the data element.

In the software component editor, explicit read access can be specified as follows:

![](images/RTEmacros_Read.gif)

With Explicit access, the return value of Rte_Read is assigned to a temporary variable.

You can also select Explicit with Status. In that case, the return value is assigned to a special runnable-local variable named _ASCET_RteStatus. This variable must be assigned to a model variable, see [Receiving from a Port - Explicit with Status](ASCreceiveFromPort.md#ExplicitStatus).

Rte_Read is non-blocking even if no data is present to be read. If no data is present, the return value from the call is RTE_E_NO_DATA.

See also

[Receiving from a Port](ASCreceiveFromPort.md)
