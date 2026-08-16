# Rte_IWrite

Rte_IWrite implements implicit data write access on a data element prototype of an Pport of a SenderReceiver or NVData interface.

Implicit data write access of a runnable entity means that all Rte_IWrite calls in the runnable entity modify the content of a dedicated buffer for the respective data element for the respective runnable entity. At the end of the runnable entity, the RTE copies the value of this buffer to the 'master message'. If Rte_IWrite is called more than once during the runnable entity, only the values of the last call are copied to the 'master message'.

In the software component editor, implicit write access can be specified as follows:

![](images/RTEmacros_IWrite_a.gif)

![](images/RTEmacros_IWrite_b.gif)

See also

[Rte_IWriteRef](ASCrteIWriteRef.md)

[Sending to a Port](ASCsendToPort.md)
