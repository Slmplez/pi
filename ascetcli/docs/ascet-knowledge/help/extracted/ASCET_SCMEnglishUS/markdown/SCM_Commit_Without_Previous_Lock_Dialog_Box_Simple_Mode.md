# Commit Without Previous Lock (Simple Mode)

This dialog box serves for committing ("checking in") items. It can be displayed via the [Commit](SCM_ASCET-SCM_Menu.md#Commit) command in the [SCM](SCM_ASCET-SCM_Menu.md) menu.

It contains the following elements:

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  | Keyboard Selection Shortcut |
|  | Configuration table: Lists the items selected for committing. Enables activation/deactivation of items with checkbox buttons. | Alt + C |
|  | Configuration Details pane: Shows the properties of an item selected in the Configuration table, such as element path, version and comments. These properties are editable for new items which are not yet under version control. |  |
|  | Apply: Applies the values in the Configuration Details to the selected items in the Configuration table. In this dialog, only the Comments fields will be edited. | Ctrl + Shift + A |
|  | More>>/<<Less: Shows/hides additional properties of an item selected in the Configuration table. | Ctrl + Shift + M |
|  | Commit Without Previous Lock: Commits the selected items to the repository. Opens a dialog box listing all changes. | none |
|  | Cancel: Closes this dialog box, discarding the commit operation. | Esc |

See also

[Edit without Lock Dialog Box](SCM_Edit_without_Lock_Dialog_Box.md)

[Online versus Offline Mode](SCM_Online_versus_Offline_Mode.md)
