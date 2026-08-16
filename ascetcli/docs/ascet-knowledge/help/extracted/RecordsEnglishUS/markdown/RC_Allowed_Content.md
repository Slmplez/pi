# Allowed Record Content

A record can contain the following elements:

- scalar variables (cont, limitInt, wrapInt, sdisc, udisc, log)
- enumerations

- other records

Nested records (i.e. record A contains record B, which contains record C, etc.) are allowed. Loops (record A contains record B, which contains record A) are forbidden; using them leads to a code generation error (EMake10).

- arrays
- matrices

If a record containing a matrix is included in a SenderReceiver or NVData interface, or used as an interrunnable variable, the code generation produces an error (MMdl651).

The following restrictions apply to the content of a record:

- Records cannot contain characteristic lines/maps or components.
- Records cannot contain references.
- Set ports for scalar record elements (cont, imitInt, wrapInt, sdisc, udisc, log, enumeration) are always enabled.
- Set ports for non-scalar record elements (record, array, matrix) are always disabled.
- Get ports are enabled for all record elements.

You can edit the properties, data, and implementations of elements in a record, however, the available options are limited.

See also

[Specifying a Record](RC_Specifying_a_Record.md)

[Including a Component via the Block Library](rceIncludeComponent_via_BlockLibrary.md)
