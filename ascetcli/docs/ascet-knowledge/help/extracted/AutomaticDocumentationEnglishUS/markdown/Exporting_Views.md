# Exporting Views

To export views proceed as follows:

1. In the [Views](AD_Views_Window.md) window, select one or more views.
1. Click on Export.

The Export File window opens. It shows all XML files in the ASCET export directory.

1. Enter path and name (with extension *.xml) of the export file.
1. Click on Save.

The selected views are written to the file.

An export file for views has a very simple structure. The name of a view is stored in the <View> element, the settings in the tabs of the ASCET Document Contents window are stored in the <Documentation>, <BDE Settings>, and <ElementDefaults> elements. Each setting in a tab corresponds to an attribute of the respective element. In addition, the <BasicBlockDefaults> element defines the visibility for graphical comments.

Only the <View> element containing the name of the view is mandatory, the other elements and attributes are optional. Missing attributes are set to true during import.

When you export several views, separate <View> elements are created for each exported view.

See also

[Example: View Export File](AD_ExampleViewExportFile.md)

[Views Window](AD_Views_Window.md)

[Block Diagram Editor - Adding and Editing a Comment](BlockDiagramEditorEnglishUS.chm::/Addcomment.htm)
