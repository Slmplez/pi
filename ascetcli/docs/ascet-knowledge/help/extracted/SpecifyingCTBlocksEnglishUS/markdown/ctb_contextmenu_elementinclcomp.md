# Context Menu - Elements and Included Components

Right-clicking the graphical occurrence of an element or an included component in the block diagram opens a context menu with a selection of the entries listed below.

This description does not apply to operators, hierarchies, and connections.

Views

Opens the [Views](AutomaticDocumentationEnglishUS.chm::/AD_ViewsWindow_GraphicalEditors.htm) dialog window. All available views are listed, and the visibility of the diagram element in each view can be [edited](AutomaticDocumentationEnglishUS.chm::/AD_EditView_of_DiagramItem.htm).

Create ASCET Link

Creates an ASCET link (see [ASCET Links](IntroductionEnglishUS.chm::/INT_ASCETLinks.htm)) that opens the component and highlights the selected element in the drawing area.

Ports

Only available for included components.

Opens a submenu to change the way the component ports are displayed in the selected graphical occurrence.

| Column 1 | Column 2 |
| --- | --- |
| Methods | Opens a window to show/hide ports (see Show/Hide Ports of an Included Component ). |
| Unconnected Ports | Always activated; read-only. |
| Get/Set | Adds/removes Get and Set ports to/from the selected graphical occurrence. |

Layout

Only available for included components.

Opens a submenu to change the appearance of the selected diagram element.

| Column 1 | Column 2 |
| --- | --- |
| Attributes | Edits the layout settings. |
| Enable flexible layout | Shows if flexible layout has been activated in the component manager or not. Can be used to determine whether the layout of this component can be altered whenever the component is included in a block diagram or project. |
| Select Icon | Adds an icon from the database/workspace to the layout. |
| Remove Icon | Not available. |
| Use Default Attributes | Restores the default layout defined in the layout editor of the component. |
| Set Attributes as Default | Uses the current layout of the selected graphical occurrence as new default layout for the component. |

Fill Color

Not available for included components.

Sets the fill color of the element.

Get/Set Ports

Only available for composite elements.

Adds Get and Set ports to the diagram element.

Extended Interface

Only available for characteristic lines/maps.

Extends the interface of the characteristic line/map.

Show Sequence Calls

Irrelevant in the block diagram editor for CT locks.

Temporary Variable

Temporary variables are deprecated; they will be removed in a future ASCET version. Only available for arrays, characteristic lines/maps and complex elements.

Adds a [temporary variable](IntroductionEnglishUS.chm::/INT_temporary_variables.htm) to each element or component output.

Remove Occurrence (Del)

Removes the selected diagram elements from the diagram (but not from the edited component).

Browse Connected Elements

Browses the elements connected to the diagram item. The results are shown in the [Search Results view](CTB_SearchResultsView.md).

Open Component

Only available for included components.

Opens the specification editor for a selected included component.

Properties (Ctrl + Shift + p)

Edits the properties of the selected element.

Data (Ctrl + Shift + d)

Opens the data editor for the selected element.

Show Path

Shows the path of an element or included component.

Show Occurrences (Ctrl + Shift + o)

Shows all graphical occurrences of the item.
