# Editing an Operation Return Value

By default, each operation in a ClientServer interface is assigned a return value of type Std_ReturnType. It is possible, however, to return an application error. To do so, proceed as follows.

1. In the Component Manager, [create an enumeration](ComponentManagerEnglishUS.chm::/CreateEnumeration.htm) named, e.g., ApplicationError.
1. [Edit the first enumerator](ComponentManagerEnglishUS.chm::/rename_enumerator.htm), e.g., to a value of 2 and a label of E_NOT_OK.
1. Create and edit the other enumerators you need.
1. [Open the ClientServer interface](SREopenSRIEditor.md) that contains the operation you want to modify.
1. [Open the signature editor for the operation](SRE_EditOperation.md).
1. In the [signature editor](BlockDiagramEditorEnglishUS.chm::/bde_interface_editor.htm), go to the Return tab.
1. In the Return Type combo box, select <enumeration>.
1. In the 1 Database or 1 Workspace field, select the enumeration you created in step 1.
1. Click OK to close the Choose an enumeration type dialog window.
1. Click OK to close the signature editor.

See also

[Opening an AUTOSAR Interface Editor](SREopenSRIEditor.md)

[Editing an Operation](SRE_EditOperation.md)

[Component Manager - Creating an Enumeration](ComponentManagerEnglishUS.chm::/CreateEnumeration.htm)

[Component Manager - Editing an Enumerator](ComponentManagerEnglishUS.chm::/rename_enumerator.htm)

[Block Diagram Editor - Signature Editor](BlockDiagramEditorEnglishUS.chm::/bde_interface_editor.htm)
