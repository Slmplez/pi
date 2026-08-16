The Show submenu of the [SCM](SCM_ASCET-SCM_Menu.md) menu contains the following options.

- Items under Source Control

Opens the [Items under Source Control dialog box](SCM_Items_under_Source_Control_Dialog_Box.md) which lists all items that are currently under version control.

- Items Not under Source Control

Opens a list which contains all items that are not yet under version control (or that do not contain any SCM information in the current database/workspace). Apart from that, the functionality of this option is similar to Items under Source Control described above.

- Locally Modified Items

Lists only those items of a selection, or within a selected folder, that are under version control and differ from the version stored in the current repository, i.e. the item contents have changed after the item had been loaded from the SCM repository.

- Invalid Items

Opens a list which contains all items that are in the "invalid" state. This state is set by ASCET or the SCM connection if the item content does not correspond to the revision stated behind the item name. An item can become invalid state e.g. by being overwritten through a "local" import (the standard ASCET import menu instead of SCM menu operations like SVN [Update](SCM_ASCET-SCM_Menu.md#Update)).

- Items Modified in Repository

Opens a list of items that are not in the most recent version state. The status modified in repository is set by the SCM interface after a previous version of the item has been loaded by means of the [Update](SCM_ASCET-SCM_Menu.md#Update) command or after [Check for Modifications](SCM_ASCET-SCM_Menu.md#Check%20for%20Modifications) detects a more recent version (probably stored by another user) in the repository.

- Items Referencing Missing Components:

Opens a list of items that reference components not present in the current database/workspace. .

Single-clicking an item in the list returned by the Show submenu options moves the ASCET database/workspace item selection to the corresponding item. Double-clicking on an item opens the corresponding item editor.
