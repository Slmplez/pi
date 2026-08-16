# Rte_IRead

Rte_IRead implements implicit data read access on a data element prototype of an Rport of a SenderReceiver or NVData interface.

Implicit data read access of a runnable entity means that at the beginning of the runnable entity the RTE copies the value of the 'master data element' to a dedicated buffer for that runnable. The content of the buffer will remain unchanged until termination of the runnable. All Rte_IRead calls in the runnable entity return the content of this buffer.

In the software component editor, implicit read access can be specified as follows:

![](images/RTEmacros_IRead_a.gif)

![](images/RTEmacros_IRead_b.gif)

See also

[Receiving from a Port](ASCreceiveFromPort.md)
