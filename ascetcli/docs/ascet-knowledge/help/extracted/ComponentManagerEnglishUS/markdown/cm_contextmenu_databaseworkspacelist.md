# Context Menu - Database/Workspace List

The context menu in the 1 Database / 1 Workspace list contains the following options for the [root node](#rootNode), for [folders](#folder) and [database/workspace items](#databaseItem):

## Root Node

Insert

Export

Exports the database/workspace into one or more export files (see [Exporting a Folder or Database/Workspace Item](SingleExport.md)).

## Folder

Insert with submenus

Same as the [Insert](CM_InsertMenu.md) menu.

Cut (Ctrl + x)

Not available for top-level folders.

Cuts the selected folder from the database/workspace.

Copy (Ctrl + c)

Copies the selected item to the clipboard.

Paste (Ctrl + v)

Pastes an item from the clipboard to the selected folder.

Delete (Del)

Be careful when using Delete; it cannot be undone.

Finally deletes the folder and all items in the folder.

Rename (F2)

Renames the selected item.

Select all (Ctrl + a)

Selects all items in the 1 Database / 1 Workspace list.

Export (Ctrl + e)

This function is only available when ASCET-MD is installed.

Exports selected items or entire folders from the 1 Database or 1 Workspace list into one or more export files.

Find code (Ctrl + f)

Searches a string in C code or ESDL components.

Find/Replace code (Ctrl + h)

Replaces a string in C code or ESDL components.

Search (Ctrl + q)

Searches the database/workspace from various points of view (see [Browsing the Database or Workspace](Browsing.md)).

Add to Block Library

Adds the current item to the Block Library.

Disallow Import (Ctrl + Shift + d)

Disallows overwriting of items during import (see [Disallowing Overwriting of Items](Disallowoverwriting.md)).

Access Rights (Ctrl + Shift + a)

Not available for workspaces.

Changes the access rights of the selected folder (see [Access Rights](DatabaseAccess.md)).

Flexible Class Layout

Activates/deactivates flexible layout.

| Column 1 | Column 2 |
| --- | --- |
| Activate | for all components in the selected folder |
| Activate recursive | for all components in the selected folder and all its subfolders |
| Deactivate | for all components in the selected folder |
| Deactivate recursive | for all components in the selected folder and all its subfolders |

New Integer Types

Not available for folders.

Password (Ctrl + Shift + p)

Not available for workspaces.

Activates and deactivates password protection for the selected folders.

Create ASCET Link

Creates an [ASCET link](IntroductionEnglishUS.chm::/INT_ASCETLinks.htm) for the selected folder.

## Database/Workspace Item

Open Component (Return)

Not available for containers, enumerations, mode groups, ASAM-MCD 2MC projects.

Opens a component in an appropriate editor.

Insert with submenus

Same as the [Insert](CM_InsertMenu.md) menu.

Cut (Ctrl + x)

Cuts the selected item from the database/workspace.

Copy (Ctrl + c)

Copies the selected item to the clipboard.

Paste (Ctrl + v)

Pastes an item from the clipboard to the selected folder.

Delete (Del)

Be careful when using Delete; it cannot be undone.

Finally deletes the folder and all items in the folder.

Rename (F2)

Renames the selected item.

Select all (Ctrl + a)

Selects all items in the folder.

Export (Ctrl + e)

This function is only available when ASCET-MD is installed.

Exports selected items from the 1 Database or 1 Workspace list into one or more export files.

Find code (Ctrl + f)

Searches a string in C code or ESDL components.

Find/Replace code (Ctrl + h)

Replaces a string in C code or ESDL components.

Search (Ctrl + q)

Searches the database/workspace from various points of view (see [Browsing the Database or Workspace](Browsing.md)).

Notes

Edits the notes for an item.

Layout

Edits a component layout.

Show References (Ctrl + r)

Displays the references to a component.

Replace References (Ctrl + Shift + r)

Replace the references to an item.

Become Another Item

Replacement of an item.

Reproduce as

Copies the structure of a component.

| Column 1 | Column 2 |
| --- | --- |
| Block Diagram | The item is reproduced as block diagram. |
| C Code | The item is reproduced in C code. |
| ESDL | The item is reproduced in ESDL code. |
| Record | The item is reproduced as record. Only available for classes, Boolean tables, and conditional tables. |
| Sender Receiver Interface | The item is reproduced as SenderReceiver interface. Not available for CT blocks. |
| NVData Interface | The item is reproduced as NVData interface. Not available for CT blocks. |

Add to Block Library

Adds the current item to the Block Library.

Disallow Import (Ctrl + Shift + d)

Disallows overwriting of items during import (see [Disallowing Overwriting of Items](Disallowoverwriting.md)).

Access Rights (Ctrl + Shift + a)

Not available for workspaces.

Changes the access rights of the selected item (see [Access Rights](DatabaseAccess.md)).

Flexible Class Layout

Activates/deactivates flexible layout.

| Column 1 | Column 2 |
| --- | --- |
| Activate | for the selected component |
| Activate recursive | for the selected component and all its referenced components |
| Deactivate | for the selected component |
| Deactivate recursive | for the selected component and all its referenced components |

New Integer Types

Converts existing elements of sdisc and udisc type to the new integer types [limitInt](IntroductionEnglishUS.chm::/INT_ScalarTypes_LimitedInteger.htm) and [wrapInt](IntroductionEnglishUS.chm::/INT_ScalarTypes_WrapAroundInteger.htm) (see [Converting Old Integer Types to New Integer Types](CM_Convert_OldIntTypes_NewIntTypes.md)).

| Column 1 | Column 2 |
| --- | --- |
| Convert Selection | Converts elements in the selected component. Only available for non-project components. |
| Convert Recursive | Converts elements in the selected project and the components directly or indirectly referenced by the selected project. Only available for project. |

Create ASCET Link

Creates an [ASCET link](IntroductionEnglishUS.chm::/INT_ASCETLinks.htm) that highlights the selected item in the 1 Database / 1 Workspace list.
