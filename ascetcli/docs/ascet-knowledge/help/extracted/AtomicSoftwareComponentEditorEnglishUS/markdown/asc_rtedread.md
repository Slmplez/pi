# Rte_DRead

For explicit read without status, AUTOSAR R4 provides another macro, Rte_DRead.

Rte_DRead implements explicit data read access on a primitive (cont, limitInt, wrapInt, sdisc, udisc, log, enum) data element prototype of an Rport of a SenderReceiver or NVData interface. The return value of Rte_DRead represents the status of the operation, whereas the value of the read element is assigned to a variable passed as argument with direction out to Rte_DRead.

In the software component editor, explicit read access can be specified as follows:

![](RTEmacros_dread.gif)

Rte_DRead is non-blocking even if no data is present to be read. If no data is present, the return value from the call is RTE_E_NO_DATA.

See also

[Receiving from a Port](ASCreceiveFromPort.md)
