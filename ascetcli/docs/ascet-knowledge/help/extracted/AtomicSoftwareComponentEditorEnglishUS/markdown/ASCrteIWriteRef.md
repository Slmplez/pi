# Rte_IWriteRef

Rte_IWriteRef implements implicit data write access, too (see [RTE_IWrite](ASCrteIWrite.md)). In contrast to Rte_IWrite, which copies the value of its IN parameter to the RTE buffer of the respective Pport, Rte_IWriteRef returns a pointer to the respective data element in the RTE buffer of the Pport, which allows to manipulate the buffer directly.

In the software component editor, Rte_IWriteRef can be specified as follows:

![](images/RTEmacros_IWriteRef.gif)

SRI_record is a SenderReceiver interface that contains a record; one of the record elements is accessed.

See also

[Rte_IWrite](ASCrteIWrite.md)

[Sending to a Port](ASCsendToPort.md)
