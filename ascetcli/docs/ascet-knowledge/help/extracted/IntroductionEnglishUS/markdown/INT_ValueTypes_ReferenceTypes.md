# Value Types and Reference Types

ASCET knows two different kinds of types: value types (e.g., cont, sdisc, udisc, log, enum) and reference types (e.g., array, matrix, characteristic line/map, record, class). The difference is how these types are handled in assignments, method arguments and as method- or process-local variables:

- If a variable of value type is on the left-hand side of an assignment, its value is changed. If a variable of reference type is on the left-hand side of an assignment, it has to be a reference and the reference itself is changed, not the referenced value.
- Value types are passed by value, reference types are passed by reference.
- Method- or process-local elements of value types are instances of the type, while method- or process-local elements of reference types are references to an instance.

Values types are, e.g., cont, limitInt, wrapInt, sdisc, udisc, enum, log, [mode groups](SenderReceiverEditorEnglishUS.chm::/SREmodesModeGroups.htm). Reference types are, e.g., arrays, matrices, [records](RecordsEnglishUS.chm::/RC_overview.htm) and classes.

See also

[Explicit References](INT_ExplicitReferences.md)

[Modes and Mode Groups](SenderReceiverEditorEnglishUS.chm::/SREmodesModeGroups.htm)

[Records - Overview](RecordsEnglishUS.chm::/RC_overview.htm)
