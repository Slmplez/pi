# SCM Menu (without Version Management)

ASCET-SCM adds the SCM menu to the menu bar in the ASCET component manager.

- Before you connect the current database or workspace to an SCM tool, the SCM menu contains the commands described in this topic.
- Once you have [connected to an SCM tool](SCM_Setting_up_an_ASCET-Subversion_Connection.md), this menu contains the commands required for source control. The content of this menu depends on the software version control product (e.g. [Subversion](SCM_Version_Handling_based_on_Subversion.md)) you are using, on the mode (i.e. [online or offline](SCM_Online_versus_Offline_Mode.md)) and on the access method through which you display the menu.

See [SCM Menu (with Version Management)](SCM_ASCET-SCM_Menu.md) for a description of the SCM menu when the database/workspace is connected to Subversion.

##### Check Source Control Compatibility

Checks whether the current database or workspace contains items that may cause problems with source control.

##### Remove Source Control Bindings

Deletes any SCM information from the database or workspace. This comprises source control settings (SCM tool driver data) as well as SCM information on each item (e.g. version name, comment, …). This menu command can be used e.g. to clear all SCM-specific data before sending the data to other users who do not have the current SCM add-on installed or who have no access to the used repository.

Please be aware that, after clearing all SCM information, no further SCM activities can be performed for the database/workspace (e.g. no storing of new versions). To reconnect to an SCM repository, use the menu command [Configure Source Control](#Configure_Source_Control).

##### Remove Source Control Bindings for Selection

Deletes any SCM information for currently selected items. This command does not remove the current SCM settings for the database/workspace. This command is useful if items contain invalid SCM data (e.g. because the item’s repository entry was deleted externally).

##### Configure Source Control

Displays the [Driver Selection dialog box](SCM_Driver_Selection_Dialog_Box.md) via which you can select the driver for the SCM tool you want to use.

See also

[SCM Menu (with Version Management)](SCM_ASCET-SCM_Menu.md)

[Setting up an ASCET-Subversion Connection](SCM_Setting_up_an_ASCET-Subversion_Connection.md)

[Version Handling based on Subversion](SCM_Version_Handling_based_on_Subversion.md)

[Repository](SCM_Repository.md)

[Online versus Offline Mode](SCM_Online_versus_Offline_Mode.md)
