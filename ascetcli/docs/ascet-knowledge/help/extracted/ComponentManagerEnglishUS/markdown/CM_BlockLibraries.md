# Block Libraries

Classes and modules can be used to encapsulate frequently used functionality. To provide easy access to those components, ASCET offers the possibility to create block libraries, i.e., collections of components, which are available via palettes in the specification editors.

Block libraries can contain classes (including state machines, Boolean and conditional tables and CT blocks), modules, records, software components, and AUTOSAR interfaces. Within a block library, the library items can be sorted into categories. Components can be added to a block library via the context menu in the 1 Database or 1 Workspace field of the component manager or in a special block library editor. The latter provides all functionality required to manage block libraries.

Frequently used components can be added to the block library automatically. When a component is added as instance variable to another component for the fifth time, a dialog window opens that asks whether this and other frequently used components shall be added to the block library, and whether ASCET shall remember the decision.

A block library is stored as an XML file that contains links to the components. Beyond that, a block library contains no functionality.

A block library is not coupled to a particular database or workspace. You can create several block libraries, but only one can be loaded at a time. A default block library, which is loaded when ASCET is started, can be selected in the Modeling node of the ASCET options window.

Each block library item can have the additional information Load Path, which specifies the path to an export file (*.exp, *.amd, *.axl) containing the respective component. When the block library item is accessed in a database not containing the component, the export file specified in Load Path is offered for import (see [Importing Folders and Items](ImportFolders.md)).

You can

[Add Items to the Block Library](CM_AddItems_BlockLibrary.md)

[Set a Load Path](CM_Set_LoadPath.md)

[Manage Block Library Items](CM_ManageBlockLibraryItems.md)

[Create and Manage Categories](CM_CreateManageCategories.md)

[Manage Block Libraries](CM_Manage_BlockLibraries.md)

See also

[User Interface of the Block Library Editor](CM_UI_BlockLibraryEditor.md)

[Modeling Options](CM_Modeling_Node.md)

[Importing Folders and Items](ImportFolders.md)
