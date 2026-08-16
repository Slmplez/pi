# Mapping a Reference

Unless specified otherwise (see [Initialization of Explicit References](introductionenglishus.chm::/INT_InitExplicitReferences.htm)), explicit references must be mapped to non-reference elements to grant initialization of the reference.

Explicit references must not be mapped to arrays, matrices or records used as messages. If they are, an error (MMdl3024) is issued during code generation: Cannot use the address of a message object <name>.

Proceed as follows:

1. [Open the data editor](DEd_view_data.md) for the component that contains the reference.
1. In the data editor for the component. select the desired data set.
1. In the Locals or Globals tab, select the reference.
1. [Open the data editor for the reference.](DEd_open_data_editor.md)
1. In the data editor for explicit references, select a non-reference element from the Value combo box.
1. Click OK to close the data editor for the reference.

In the data editor of the component, the name of the mapped element appears in the Data column of the reference.

The mapping is stored with the currently selected data set of the component. If you change the data set, you must map the reference again.

As an alternative, you can open the data editor for the reference directly from the component editor, via the Data option in the Edit menu or the context menu. If you do so, the mapping belongs to the currently selected data set.

See also

[Initialization of Explicit References](introductionenglishus.chm::/INT_InitExplicitReferences.htm)

[Explicit References](IntroductionEnglishUS.chm::/INT_ExplicitReferences.htm)

[Specifying a Reference](ElementEditorEnglishUS.chm::/EEd_Specifying_a_Reference.htm)

[Viewing Data Sets](DEd_view_data.md)

[Editing Data in a Data Set (A)](DEd_open_data_editor.md)
