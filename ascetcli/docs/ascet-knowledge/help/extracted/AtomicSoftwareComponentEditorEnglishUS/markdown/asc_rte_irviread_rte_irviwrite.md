# Rte_IrvIRead and Rte_IrvIWrite

##### Rte_IrvIRead

Rte_IrvIRead implements implicit data read access on an interrunnable variable.

For scalar interrunnable variables, implicit data read access of a runnable entity means that at the beginning of the runnable entity the RTE copies the value of the 'master interrunnable variable' to a dedicated buffer for that runnable. The content of the buffer will remain unchanged until termination of the runnable. All IrvIRead calls in the runnable entity return the content of this buffer.

For complex interrunnable variables (i.e. interrunnable variables of record type), implicit data read access returns a "non-modifiable pointer" to the record from which the values of the fields can be read.

##### Rte_IrvIWrite

Rte_IrvIWrite implements implicit data write access on an interrunnable variable.

For scalar interrunnable variables, implicit data write access of a runnable entity means that all Rte_IrvIWrite calls in the runnable entity modify the content of a dedicated buffer for the respective interrunnable variable for the respective runnable entity. At the end of the runnable entity, the RTE copies the value of this buffer to the 'master interrunnable variable'. If Rte_IrvIWrite is called more than once during the runnable entity, only the values of the last call are copied to the 'master interrunnable variable'.

For complex interrunnable variables, implicit data write access means the following:

- For each runnable with write access to a complex interrunnable variable, an additional runnable-specific instance of the record type is provided.
- At the beginning of the runnable, this runnable-specific instance is filled with the current values, i.e. Rte_IrvIRead is issued and the values of all fields are transferred to the runnable-specific instance.
- All write (and additional read) accesses during the execution of the runnable access the runnable-specific instance.
- At the end of the runnable execution, the runnable-specific instance is written using the Rte_IrvIWrite macro.

This guarantees data consistency over the values of a record, since the record is written only once, prior to exiting the runnable.

In the software component editor, implicit read /write access to an interrunnable variable access is specified as follows:

![](RTEmacros_IrvImpl_a.gif) ![](RTEmacros_IrvImpl_b.gif)

See also

[Interrunnable Variables](ASC_InterrunnableVariables.md)
