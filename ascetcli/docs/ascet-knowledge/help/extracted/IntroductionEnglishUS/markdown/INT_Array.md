# Array

An array (type symbol ![](symboltyp_array.gif)) is a one-dimensional, indexed set of elements which have the same scalar data type, e.g. continuous or logical. The position of a scalar value within an array is indicated by its associated index value, which must be a non-negative integer. The size of an array is limited to 2048. The array index takes values between 0 and size-1.

The interface of an array used as variable consists of the following methods:

- setAt(a, i): The assignment of the scalar value a to the position i in the array.

a can be any scalar type, i must be a non-negative integer.

- getAt(i): Returns the value at position i of the array.
- length(): Returns the current size of the array.

The interface of an array used as parameter consists of the methods getat(i) and length().

The interface of an array used as message depends on the message type.

| Column 1 | Column 2 | Column 3 | Column 4 |
| --- | --- | --- | --- |
|  | Send | Receive | Send & Receive |
| setAt( a, i) | + |  | + |
| getAt( i) |  | + | + |
| length() | + | + | + |

Arrays of non-scalar basic types or complex (user-defined) types are not available.

In the context of a project, you can use the [Protected Vector Indices](ProjectEditorEnglishUS.chm::/PE_Code_Generation_Options.htm) option to protect the array index against over- or underflow.

See also

[Variant Size for Arrays and Matrices](INT_VariantSize_ArraysMatrices.md)

[Variable Size for Arrays and Matrices](INT_VariableSize_ArraysMatrices.md)

[Messages](INT_messages.md)

[Arrays and Matrices (Block Diagram Editor)](BlockDiagramEditorEnglishUS.chm::/BDE_Arrays_and_Matrices.htm)

[Arrays - Description (ESDL Editor)](ESDLEditorEnglishUS.chm::/ESDL_Arrays_-_Description.htm)

[Project Editor - Code Generation Options](ProjectEditorEnglishUS.chm::/PE_Code_Generation_Options.htm)
