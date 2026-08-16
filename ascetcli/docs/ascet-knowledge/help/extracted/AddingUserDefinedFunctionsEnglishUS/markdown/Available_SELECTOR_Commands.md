# Available SELECTOR Commands

Available Commands

- executerCollapseAll

Function: collapses the element list in the 1 Database or 1 Workspace field.

Use: in the Component Manager

Syntax:

SELECTOR executerCollapseAll

- executerExpandCollapseSelectedElement

Function: expands and collapses the selected directory in the 1 Database or 1 Workspace field. (Subdirectories are collapsed but not expanded again.)

Use: in the Component Manager

Syntax:

SELECTOR executerExpandCollapseSelectedElement

- executerDeselectElements

Function: undoes the component or element selection.

Use: in the Component Manager as well as the specification editors

Syntax:

SELECTOR executerDeselectElements

- executerFileOutSelectedDiagrams

Function: writes all diagrams and hierarchies of the selected component as well as the components in it to the ASCET installation directory as image files.

This command has no effect on ESDL or C code components.

Use: in the Component Manager

Syntax:

SELECTOR executerFileOutSelectedDiagrams

- executerFileOutSelectedElementsTo

Function: writes the object IDs of the selected elements into the specified file.

Use: in the Component Manager as well as the specification editors

Syntax:

<filename> must contain the file ending, path specifications are optional.

SELECTOR executerFileOutSelectedElementsTo: <filename>

- executerSelectElementFromString

Function: selects the first visible element in the 1 Database or 1 Workspace list (Component Manager) or Elements list (specification editors) whose name starts with the search string <name>.

Elements in collapsed folders or components that correspond to the search string and all following corresponding visible elements are ignored.

Use: in the Component Manager as well as the specification editors

Syntax:

Upper and lower case are not taken into consideration in the search.

SELECTOR executerSelectElementFromString: <name>

- executerFileOutDiagrams

Function: writes all diagrams and hierarchies of the edited component to the ASCET installation directory as image files.

This command has no effect on ESDL or C code components.

Use: in the specification editors

Syntax:

SELECTOR executerFileOutDiagrams

- executerFileOutSelectedDiagramTo

Function: writes the path name of the selected diagram of the edited component into the specified file. Images of the selected diagram and the hierarchies contained in it are additionally generated for block diagrams in the ASCET installation directory.

Use: in the specification editors

Syntax:

Upper and lower case are not taken into consideration in the search.

SELECTOR executerFileOutSelectedDiagramTo: <filename>

- executerSelectDiagramFromString

Function: selects the diagram that contains the search string <name> but without loading it.

Use: in the specification editors

Syntax:

Upper and lower case are not taken into consideration in the search.

SELECTOR executerSelectDiagramFromString: <name>

- executerSelectPage

Function: Opens the specified project editor tab.

Use: in the project editor

Syntax:

The tab name has to be specified exactly.

SELECTOR executerSelectPage: <tab name>

See also

[SELECTOR](selector.md)
