The Source Control submenu of the [SCM](SCM_ASCET-SCM_Menu.md) menu contains the following options.

- Show Source Control Settings

Lists the current settings of the selected SCM driver (read-only). The contents depend on the currently selected SCM tool interface. For instance, if you are using Subversion, this command displays the [Subversion Settings dialog box](SCM_Subversion_Settings_Dialog_Box.md).

- Remove Source Control Bindings

Deletes any SCM information from the database or workspace. This comprises source control settings (SCM tool driver data) as well as SCM information on each item (e.g. version name, comment, …). This menu command can be used e.g. to clear all SCM-specific data before sending the data to other users who do not have the current SCM add-on installed or who have no access to the used repository.

Please be aware that, after clearing all SCM information, no further SCM activities can be performed for the database/workspace (e.g. no storing of new versions). To reconnect to an SCM repository, use the menu command [Configure Source Control](SCM_Menu_withoutVersionManagement.md#Configure_Source_Control).

- Remove Source Control Bindings for Selection

Deletes any SCM information for currently selected items. This command does not remove the current SCM settings for the database/workspace. This command is useful if items contain invalid SCM data (e.g. because the item’s repository entry was deleted externally).

- Remove Configuration Data

Removes all configuration data from the database or workspace. Version information remains intact.

- Remove Configuration Data for Selection

Removes all configuration data for the currently selected items. Version information remains intact. This command is useful if items contain invalid configuration data.

- Check Source Control Compatibility

Checks whether the current database or workspace contains items that may cause problems with source control.
