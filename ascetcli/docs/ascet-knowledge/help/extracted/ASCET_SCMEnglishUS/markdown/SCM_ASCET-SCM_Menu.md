# SCM Menu (with Version Management)

ASCET-SCM adds the SCM menu to the menu bar in the ASCET component manager.

- Before you connect the current database or workspace to an SCM tool, the SCM menu contains the commands described in [SCM Menu (without Version Management)](SCM_Menu_withoutVersionManagement.md).
- Once you have [connected to an SCM tool](SCM_Setting_up_an_ASCET-Subversion_Connection.md), this menu contains the commands required for source control. The content of this menu depends on the software version control product (e.g. [Subversion](SCM_Version_Handling_based_on_Subversion.md)) you are using, on the mode (i.e. [online or offline](SCM_Online_versus_Offline_Mode.md)) and on the access method through which you display the menu.

This topic describes the content of the SCM menu when the database/workspace is connected to Subversion, both in [online](#SCMmenuOnline) and [offline](#SCMmenuOffline) mode.

## Online Mode

Most commands of the SCM menu are available as Source Control context menu in the 1 Database or 1 Workspace list of the Component Manager, in the Outline tab of the component editors, and in the drawing area of block diagrams. Some of the commands included in the SCM menu are also available via [toolbar icons](SCM_Toolbar_Icons.md).

According to whether the Simple Mode user interface is [activated or deactivated](SCM_Activating_Deactivating_SimpleMode.md), dialog boxes will be shown in Simple Mode or Advanced Mode.

##### [Source Control](javascript:void(0);)

##### [Show](javascript:void(0);)

##### Checkout

Displays the Checkout dialog box in [Simple Mode](SCM_Checkout_Dialog_Box_Simple_Mode.md) *or* [Advanced Mode](SCM_Checkout_Dialog_Box.md) which enables you to check out items from the repository so that these can be edited in ASCET. See also: [Checking out](SCM_Checking_out.md).

##### Update

Displays the Update dialog box in [Simple Mode](SCM_Update_Dialog_Box_Simple_Mode.md) *or* [Advanced Mode](SCM_Update_Dialog_Box.md) from which you can select items to be refreshed by applying current data related to these items from the Subversion repository. See also: [Updating](SCM_Updating.md).

Note: If a folder is selected, this command does not search for items in the same folder that exist in the repository but not yet in the ASCET database/workspace. To retrieve "new" items, use the [Checkout](#Checkout) command.

##### Update to Latest Revision

Retrieves the most recent data for the selected items from the Subversion repository. The Update to Latest Revision dialog box in [Simple Mode](SCM_Update_to_Latest_Dialog_Box_Simple_Mode.md) *or* [Advanced Mode](SCM_Update_to_Latest_DialogBox.md) prompts you to complete this procedure.

##### Get Lock

"Locks" (reserves) the selected items exclusively for you in the repository. While in the locked state, items can be edited only by you; other users cannot access these items at the same time. Other users who try to access an item locked by someone else will see a padlock in the item's icon in the browser tree. See also: [Locking and Unlocking](SCM_Locking_and_Unlocking.md).

##### Commit

Stores the current status of the selected items (including your edits) as a new version in the Subversion repository. See also: [Committing](SCM_Committing.md).

##### Add and Commit

Adds the currently selected items to version control and stores their current status (including your edits) as a new version in the Subversion repository. The Add and Commit dialog box prompts you to complete this procedure.

##### Check for Modifications

Compares all selected items that are under version control to their current status in the [repository](SCM_Repository.md). If the local status is out of date, the overlay icons change accordingly. If any items were locked by another user in the meantime (or unlocked) the status is set to "locked by other user" (or back to "revision"). The items checked for modifications are listed in a separate dialog box.

##### Show Log

Reads the Subversion history of the selected items in ASCET, retrieves the current history status of these items from the Subversion [repository](SCM_Repository.md), and displays the result in the [Show Log](SCM_Show_Log_Dialog_Box.md) dialog box.

##### Properties

Displays the [Version Details Dialog Box](SCM_Version_Details_Dialog_Box.md)for the selected item.

##### [Configuration Management](javascript:void(0);)

##### [Additional Commands](javascript:void(0);)

##### [Including References](javascript:void(0);)

## Offline Mode

In offline mode, the SCM menu contains

##### [Source Control](javascript:void(0);)

##### [Show](javascript:void(0);)

##### Connect to Repository

Shown in [offline](SCM_Online_versus_Offline_Mode.md) mode only. Switches to online mode by connecting the Subversion driver to the repository URL. Note that you can disconnect from the Subversion repository by selecting [Disconnect from Repository](SCM_AdditionalCommandsSubmenu.md#Disconnect_from_Repository) from the Show submenu. See also [Online versus Offline Mode](SCM_Online_versus_Offline_Mode.md).

##### Show Log

Shows the Subversion history that was read the last time a [Checkout](#Checkout), [Update](#Update) or [Update To Latest Revision](#Update_to_Latest_Revision) operation was executed on the selected item. Displays the result in the [Show Log](SCM_Show_Log_Dialog_Box.md) dialog box.

##### Properties

Displays the [Version Details dialog box](SCM_Version_Details_Dialog_Box.md) for the selected item. That dialog box shows the properties that were read the last time a [Checkout](#Checkout), [Update](#Update) or [Update To Latest Revision](#Update_to_Latest_Revision) operation was executed on the selected item.

See also

[SCM Menu (without Version Management)](SCM_Menu_withoutVersionManagement.md)

[Toolb[ar Icons](SCM_Menu_withoutVersionManagement.md)](SCM_Toolbar_Icons.md)

[Version Handling based on Subversion](SCM_Version_Handling_based_on_Subversion.md)

[Repository](SCM_Repository.md)
