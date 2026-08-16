# Editing

You can edit the layout of a component without first opening the respective component editor. The public interface of a component is declared in the layout editor.

Every database/workspace item can have two types of text attached to it: comment text and notes. The comment text is entered in the 2 Comment field in the Component Manager and is stored automatically. The notes for a database/workspace item are entered in a separate editor window. When documentation is generated automatically, notes are included, but comments are not.

Depending on the activation status of the Non-Volatile attribute, variables and parameters are treated differently by the code generation. Only volatile elements are initialized automatically. Non-volatile data are not overwritten upon initialization. You can set the Non-Volatile attribute for individual elements (see [Editing Element Properties](EditDatabaseB.md)), and you can assign one setting to all variables or all parameters (see [Assigning the Volatile Attribute to All Variables](Assign.md) and [Assigning the Non-Volatile Attribute to All Parameters](non-volatile.md)).

See also

[Editing the Layout of a Component](LayoutComponent.md)

[Layout Editor - Overview](LayoutEditorEnglishUS.chm::/LEd_Overview.htm)

[Editing the Notes for a Database/Workspace Item](EditNotes.md)

[Assigning the Volatile Attribute to All Variables](Assign.md)

[Assigning the Non-Volatile Attribute to All Parameters](non-volatile.md)

[Element Configuration](ElementEditorEnglishUS.chm::/EEd_element_configuration.htm)
