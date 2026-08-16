# Rte_IrvRead and Rte_IrvWrite

ASCET supports explicit access only for scalar interrunnable variables. Complex interrunnable variables always use implicit access.

##### Rte_IrvRead

Rte_IrvRead implements explicit data read access on an interrunnable variable.

Explicit data read access of a runnable entity means that the current value of the data element is read from the RTE. Subsequent explicit read access operations within the same runnable entity may result in different values of the data element.

##### Rte_IrvWrite

Rte_IrvWrite implements explicit data write access to an interrunnable variable.

Explicit data write access of a runnable entity means that the value of the scalar interrunnable variable is published immediately; (other) runnable entities can access the new value when they read the interrunnable variable afterwards. Subsequent explicit write operations change the value of the interrunnable variable.

In the software component editor, implicit read /write access to a scalar interrunnable variable access is specified as follows:

![](RTEmacros_IrvExpl_b.gif) ![](RTEmacros_IrvExpl_a.gif)

See also

[Interrunnable Variables](ASC_InterrunnableVariables.md)
