# Show/Hide Ports of an Included Component

If flexible layout is activated (see [Layout of Included Components](BDE_Layout.md)), you can modify the representation of an included component by means of the Methods option in the context menu Ports. Ports of a component can be added or removed by the method this way.

The ports of a method can only be added or removed together.

To show/hide ports of an included component, proceed as follows:

1. In the context menu of the graphical occurrence, point to Ports and select Methods.
1. Activate an unmarked entry to select it.
1. Click on Select All to select all entries.
1. Deactivate a marked entry to deselect it.
1. Click on Deselect All to deselect all entries.
1. Click on Revert to invert all current settings.
1. Click on Default to restore the setting specified in the layout editor.
1. Confirm your selection with OK.

The ports of the marked methods/processes are displayed in the graphical occurrence, those of the methods/processes not marked are removed.

If you remove a port which is connected to another element, the connecting line is removed with it.

The positions for newly added ports are determined automatically. Inputs are created on the left-hand side, outputs on the right. If you want to add ports for which the current size of the graphical occurrence has no space, the layout is enlarged automatically.

See also

[Layout of Included Components](BDE_Layout.md)

[Activating/Deactivating Flexible Layout](ComponentManagerEnglishUS.chm::/Activating_Flexible_Layout.htm)

[Using Changes as a New Default Layout](BDE_Defaultlayout.md)
