# Matrix

A matrix (type symbol ![](symboltyp_matrix.gif)) is a two-dimensional, indexed set of elements which have the same scalar data type. The type of index is the same as that of an array, i.e. a non-negative integer. The size for each dimension is limited to 63, i.e. the indices take values between 0 and 62.

The interface of an array used as variable consists of the following methods:

- setAt(a, i, j): The assignment of the scalar value a to the position (i,j) in the matrix.

a can be any scalar type, i and j must be non-negative integers.

- getAt(i, j): Returns the value at position (i,j) of the matrix.
- xLength(): Returns the current X size of the matrix.
- yLength(): Returns the current Y size of the matrix.

The interface of a matrix used as parameter consists of the methods getat(i, j), xLength() and yLength().

The interface of a matrix used as message depends on the message type.

<table style="x-cell-content-align: Top;
				margin-top: 3px;
				border-left-style: Outset;
				border-top-style: Outset;
				border-right-style: Outset;
				border-bottom-style: Outset;
				border-left-width: 1px;
				border-right-width: 1px;
				border-top-width: 1px;
				border-bottom-width: 1px;" x-use-null-cells="">
<col/>
<col/>
<col/>
<col/>
<tr class="hcp1" valign="top">
<td class="hcp2" colspan="1" rowspan="2">
<p class="tableheadeng"> </p></td>
<td class="hcp2" colspan="3" rowspan="1">
<p align="center" class="tableheadeng" style="text-align: center;">Message type</p></td>
</tr>
<tr class="hcp1" valign="top">
<td class="hcp2">
<p class="tablehead">Send</p></td>
<td class="hcp2">
<p class="tablehead">Receive</p></td>
<td class="hcp2">
<p class="tablehead">Send &amp; Receive</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2">
<p class="tablehead"><span class="gui">setAt(</span><span class="gui">a, </span><span class="gui">i, </span><span class="gui">j)</span></p></td>
<td class="hcp2">
<p class="tabledefaultcenter">+</p></td>
<td class="hcp2">
<p class="tabledefaultcenter"> </p></td>
<td class="hcp2">
<p class="tabledefaultcenter">+</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2">
<p class="tablehead"><span class="gui">getAt(</span><span class="gui">i, </span><span class="gui">j)</span></p></td>
<td class="hcp2">
<p class="tabledefaultcenter"> </p></td>
<td class="hcp2">
<p class="tabledefaultcenter">+</p></td>
<td class="hcp2">
<p class="tabledefaultcenter">+</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2" colspan="1" rowspan="1">
<p class="tablehead"><span class="gui">xLength()</span></p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefaultcenter">+</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefaultcenter">+</p></td>
<td class="hcp2" colspan="1" rowspan="1">
<p class="tabledefaultcenter">+</p></td></tr>
<tr class="hcp1" valign="top">
<td class="hcp2">
<p class="tablehead"><span class="gui">y</span><span class="gui">Length()</span></p></td>
<td class="hcp2">
<p class="tabledefaultcenter">+</p></td>
<td class="hcp2">
<p class="tabledefaultcenter">+</p></td>
<td class="hcp2">
<p class="tabledefaultcenter">+</p></td></tr>
</table>

Matrices of non-scalar basic types or user-defined types are not available.

In the context of a project, you can use the [Protected Vector Indices](ProjectEditorEnglishUS.chm::/PE_Code_Generation_Options.htm) option to protect the matrix indices against over- or underflow.

See also

[Variant Size for Arrays and Matrices](INT_VariantSize_ArraysMatrices.md)

[Variable Size for Arrays and Matrices](INT_VariableSize_ArraysMatrices.md)

[Messages](INT_messages.md)

[Arrays and Matrices (Block Diagram Editor)](BlockDiagramEditorEnglishUS.chm::/BDE_Arrays_and_Matrices.htm)

[Matrices - Description (ESDL Editor)](esdleditorenglishus.chm::/esdl_matrices_-_description.htm)

[Project Editor - Code Generation Options](ProjectEditorEnglishUS.chm::/PE_Code_Generation_Options.htm)
