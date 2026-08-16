# Specifying the Implementation for a Logical Element

To specify an implementation for a logical element, proceed as follows:

1. Open the implementation editor, e.g. as described in [Opening the Implementation Editor for an Element (A)](IEd_open_impl_editor.md).

All fields in the Value tab, except Type, Memory Location of Instance, and Memory Segment, are disabled because they are irrelevant for the implementation of logical elements.

1. In the Type combo box, select the implementation data type.

The following types are available: bit, bool, sint8, sint16, sint32, uint8, uint16 and uint32. If available, [customized data type names](ComponentManagerEnglishUS.chm::/CM_CustomizeDataTypeNames.htm) are displayed in the combo box.

The logical element is represented by a variable of the selected data type.

1. In the Memory Location of Instance combo box, select the memory area where the element is located.

The available selection depends on the current target. This setting is only relevant for experiments on microcontroller targets and is ignored in all other cases.

1. In the Additional Info tab, enter information for your code generator.

This information is only evaluated where applicable. The exact nature of the information you can enter here depends on your target and code generator.

See also

[Opening the Implementation Editor for an Element (A)](IEd_open_impl_editor.md)

[Opening the Implementation Editor for an Element (B)](IEd_open_impleditor_for_element.md)

[Opening the Implementation Editor for an Element (C)](IEd_open_compo_project.md)
