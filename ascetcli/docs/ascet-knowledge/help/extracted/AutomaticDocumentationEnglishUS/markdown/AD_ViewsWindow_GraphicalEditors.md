# Views Window (Graphical Editors)

The Views window available in graphical editors is used to edit the views for elements in all kinds of block diagrams and AUTOSAR SWC. It is opened via the View context menu option of a selected diagram element.

The Views window contains the following elements:

- view combo box

This combo box contains the possible display modes for the selected element in the view named view.

| Column 1 | Column 2 |
| --- | --- |
| As line | The element is replaced by one or more lines from the middle to the pins. |
| Invisible | The element disappears from the graphic display and can no longer be selected in the drawing area. It is, however, still visible in the Outline tab. |
| Contour | Only the contours of the element and possibly the names of the pins are shown. Sequence calls, name, symbol etc. disappear. |
| Hide Contents | The screen display is the same as Normal , but the component or hierarchy can no longer be opened from the drawing area. The content of a hierarchy thus marked is left out of the documentation, the content of a component is included in the documentation. |
| Normal | Default setting, all available elements (symbols, names, sequence calls etc.) are displayed. |
| Use Global Settings (*) | Uses the global setting for this element group; see Making Global Settings for Element Groups . |

- <view name> combo boxes

Combo boxes for other views. Their number and names depend on the views available in the database/workspace.

- Apply to all graphical objects of the same type option

If activated, the settings apply to all block diagram elements of the same type as the selected one.

- Apply to all occurrences of this element option

If activated, the settings apply to all occurrences of the selected element in the given block diagram.

- Change Global Settings

Opens the [Views Window](AD_Views_Window.md) where you can [edit the global settings](Global_Settings_Elem_Grps.md) for the element group.

![](BUTTON.GIF) OK

Closes the window and accepts the settings.

![](BUTTON.GIF) Cancel

Closes the window without accepting the settings.

See also

[Views](AD_views.md)

[Editing the View of a Diagram Item](AD_EditView_of_DiagramItem.md)

[Making Global Settings for Element Groups](Global_Settings_Elem_Grps.md)

[Views Window](AD_Views_Window.md)
