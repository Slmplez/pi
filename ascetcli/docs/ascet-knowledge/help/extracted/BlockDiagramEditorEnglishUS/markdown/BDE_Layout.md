# Layout of Included Components

If you add a component to your component (see [Including a Component as a Complex Element](IncludeComponent.md)) and place it in the drawing area, the default layout of the added component, defined in the layout editor, is displayed. If this default layout does not suit your purposes, you can react in two different ways.

One possibility is to adapt the default layout in the [layout editor](LayoutEditorEnglishUS.chm::/LEd_Overview.htm). Changes in the layout editor do not, however, have any influence on individual graphical occurrences of the component in block diagrams. Existing diagrams remain unchanged, you have to replace the occurrences manually to load the changed layout.

The other possibility is to adapt the layout of a specific graphical occurrence in the block diagram. You can enable or disable flexible layout for each included component individually, either in the component manager (see [Activating/Deactivating Flexible Layout](ComponentManagerEnglishUS.chm::/Activating_Flexible_Layout.htm)) or via the Activate flexible layout menu option in the layout editor.

Only the layout of the edited graphical occurrence is modified, neither the default layout nor the layout of other graphical occurrences of the same component in the diagram is changed automatically. This means that, if necessary, you can assign each graphical occurrence of the same component a different layout.

You can change the size of a block and move, show or hide the ports. The following must, however, be taken into consideration:

1. A graphical occurrence must at least be the size of an addition operator with two inputs.
1. The minimum size of a graphical occurrence is also limited by the number of visible ports: two ports cannot have the same position.
1. If the default layout contains an icon, it is cut off if the size of the graphical occurrence is smaller than the icon itself.

If you copy or cut out a graphical occurrence which has been edited in this way and insert it at a different location as described in [Copying/Moving Diagram Items in the Same Diagram](BDE_Cutcopypaste.md) and [Copying/Moving Diagram Items Between Diagrams](BDE_CopyMove_Items_betweenDiagram.md), the inserted graphical occurrence is assigned the layout of the copied/cut out graphical occurrence.

If you [edit](BDE_Editcomponent.md) an included component, add or remove existing pins (e.g., by removing an arguments or return value), and then return to the parent component, the missing pins are treated according to the Show Missing Pins and Connections option in the ASCET options window, [Block Diagram](ComponentManagerEnglishUS.chm::/cm_options_for_block_diagrams.htm) node.

See also

[Components as Complex Elements](BDE_ComplexElements.md)

[Including a Component as a Complex Element](IncludeComponent.md)

[Activating/Deactivating Flexible Layout](ComponentManagerEnglishUS.chm::/Activating_Flexible_Layout.htm)

[Layout Editor - Overview](LayoutEditorEnglishUS.chm::/LEd_Overview.htm)

[Copying/Moving Diagram Items in the Same Diagram](BDE_Cutcopypaste.md)

[Copying/Moving Diagram Items Between Diagrams](BDE_CopyMove_Items_betweenDiagram.md)

[Editing an Included Component](BDE_Editcomponent.md)

[Block Diagram Options](ComponentManagerEnglishUS.chm::/cm_options_for_block_diagrams.htm)

[Editing the Size of an Occurrence](Editsize.md)

[Editing Ports](Editports.md)

[Show/Hide Ports of an Included Component](Public_Methods.md)

[Using Changes as a New Default Layout](BDE_Defaultlayout.md)

[Restoring the Default Layout](Restoredefault.md)
