# Operator Implementation

In old ASCET versions (i.e. V4.2 or older), operators in block diagrams could be implemented, too.

Since ASCET V5.0, the implementation options Limit to maximum bit length and Zero not included (available til ASCET V6.3) replace operator implementations. In addition, implementation casts can be used to insert requantizations in concatenated arithmetic operations without creating additional storage space requirements. Therefore, no new operator implementations can be created. Existing operator implementations in older projects can be viewed, replaced by implementation casts (see [Automatic Conversion of Operator Implementations](automatic_conversion_op_impl.md)) or removed, but not edited.

If an implementation is specified, the operator is marked in the graphic by a small line in the top left-hand corner (![](3b0126%20copy.gif)).

Use the procedure described in [Searching for Operator Implementations](search_op_impl.md) to easily detect operator implementations.

The [AMD export format](ComponentManagerEnglishUS.chm::/CM_AMD_Export.htm) does not include operator implementations. If you want to export a block diagram with operator implementations, or to convert your database into a workspace, you should replace the operator implementations with implementation casts prior to the export.

See also

[Automatic Conversion of Operator Implementations](automatic_conversion_op_impl.md)

[Searching for Operator Implementations](search_op_impl.md)

[Removing Operator Implementations](rename_individual_op_impl.md)

[Viewing an Operator Implementation](view_op_impl.md)

[Component Manager - AMD Export](ComponentManagerEnglishUS.chm::/CM_AMD_Export.htm)

[Component Manager - ASCET Workspace](ComponentManagerEnglishUS.chm::/CM_ASCETWorkspace.htm)
