# Layout of Included Components

If you add a component to your SWC (see [Including a Component as a Complex Element](ascincludecomponent.md)) and place it in the drawing area, the default layout of the added component, defined in the layout editor, is displayed. If this default layout does not suit your purposes, you can react in two different ways.

One possibility is to adapt the default layout in the [layout editor](LayoutEditorEnglishUS.chm::/LEd_Overview.htm). Changes in the layout editor do not, however, have any influence on individual graphical occurrences of the component in SWC and other block diagrams. Existing diagrams remain unchanged, you have to replace the occurrences manually to load the changed layout.

The other possibility is to adapt the layout of a specific graphical occurrence in the SWC diagram. You can enable or disable flexible layout for each included component individually, either in the component manager (see [Activating/Deactivating Flexible Layout](ComponentManagerEnglishUS.chm::/Activating_Flexible_Layout.htm)) or via the Activate flexible layout menu option in the layout editor.

Only the layout of the edited graphical occurrence is modified, neither the default layout nor the layout of other graphical occurrences of the same component in the diagram is changed automatically. This means that, if necessary, you can assign each graphical occurrence of the same component a different layout.

You can change the size of a block and move, show or hide the ports. The following must, however, be taken into consideration:

1. A graphical occurrence must at least be the size of an addition operator with two inputs.
1. The minimum size of a graphical occurrence is also limited by the number of visible ports: two ports cannot have the same position.
1. If the default layout contains an icon, it is cut off if the size of the graphical occurrence is smaller than the icon itself.

If you copy or cut out a graphical occurrence which has been edited in this way and insert it at a different location as described in [Cut, Copy and Paste a Diagram Item](asccutcopypaste.md), the inserted graphical occurrence is assigned the layout of the copied/cut out graphical occurrence.

See also

[Including a Component as a Complex Element](ascincludecomponent.md)

[Activating/Deactivating Flexible Layout](ComponentManagerEnglishUS.chm::/Activating_Flexible_Layout.htm)

[Layout Editor - Overview](LayoutEditorEnglishUS.chm::/LEd_Overview.htm)

[Cut, Copy and Paste a Diagram Item](asccutcopypaste.md)

[Editing the Size of a Graphical Occurrence](BlockDiagramEditorEnglishUS.chm::/Editsize.htm)

[Editing Ports](BlockDiagramEditorEnglishUS.chm::/Editports.htm)

[Show/Hide Ports of an Included Component](BlockDiagramEditorEnglishUS.chm::/Public_Methods.htm)

[Using Changes as a New Default Layout](BlockDiagramEditorEnglishUS.chm::/BDE_Defaultlayout.htm)

[Restoring the Default Layout](BlockDiagramEditorEnglishUS.chm::/Restoredefault.htm)
