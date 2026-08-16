# Appearance Options for ASCET-SCM

The ASCET Options window is opened with the ![](ms-its:ASCET_SCMEnglishUS.chm::/images/button_ASCEToptions.gif) Options button in the component manager or the component editors.

The Integration\ASCET-SCM\Appearance node in the ASCET Options window provides the following options for ASCET-SCM:

##### Use Simple Mode UIs

Enables the Simple Mode user interface for dialogs. If this checkbox is not checked, dialogs will show full functionality.

##### Show Overlay Icons

This option shows or hides SCM-specific icons that visualize the current SCM status. For instance, a red exclamation mark (![](ms-its:ASCET_SCMEnglishUS.chm::/images/image24b.gif)) icon can be shown for locally changed items that are currently under version control in Subversion.

##### Allow Modification of Selection

Displays an extra screen that allows modifications of the selection before an SCM command is executed. For instance, in the Subversion interface, this is used with the commands [Update to Latest Revision](SCM_ASCET-SCM_Menu.md#Update_to_Latest_Revision) and [Get Lock](SCM_ASCET-SCM_Menu.md#Get_Lock).

##### Show Edition Comment Dialog when Creating Editions

Displays a selection dialog when the status of items is changed to "Edition". This enables the user to enter a comment for the edition (if supported by the SCM tool interface)

##### Show Component History in Selection Dialog

Enables the display of the component history in the selection dialog.

##### Warn when Using Local Editions

Displays a warning when you use local editions.

##### Warn of Conflicts

Displays a warning if the local database or workspace is about to be overwritten by your SCM operations.

##### Use Sub Menu for Component Editor Context Menus

Displays an ASCET-SCM menu list in a separate Source Control submenu. If this checkbox is not checked, all SCM menu commands are listed directly.

##### Use Sub Menu for Component Manager Context Menu

Displays an ASCET-SCM menu list in a separate Source Control submenu. If this checkbox is not checked, all SCM menu commands are listed directly.

##### Show Toolbar in Component Manager

Displays the ASCET-SCM toolbar within the Component Manager

##### Show List of Items Changed by SCM Operation

Displays a list of items after an SCM operation in a dialog similar to the import result list.

You can open ASCET editors directly from this dialog. For instance, you can simply click on a list entry to show the item within the ASCET database/workspace structure, etc.

##### Show Result Dialog

Displays the [Result Dialog Box](SCM_Result_Dialog_Box.md) which list of items after each SCM operation with details about the operation results. Depending on your selection for this option, this list is shown always, only in case of errors or never.

##### Display External Repository ID

Displays the IDs of External Repositories when used.

##### Show Truncated External Repository ID

Truncates the IDs of External Repositories.

See also

[Setting up Subversion for Use with ASCET-SCM](SCM_Setting_up_Subversion_for_Use_with_ASCET-SCM.md)
