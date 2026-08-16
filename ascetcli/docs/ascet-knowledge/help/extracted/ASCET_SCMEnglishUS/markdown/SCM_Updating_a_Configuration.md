# Updating Configurations

Proceed as follows to update configurations to a selected revision number:

1. In the ASCET component manager, select the configurations you want to update.
1. Open the [SCM menu](SCM_ASCET-SCM_Menu.md), then point to [Configuration Management](SCM_ASCET-SCM_Menu.md#Configuration_Management) and select Update Configuration.
1. To select a revision for a single configuration, [![Closed](ms-its:ASCET_SCMEnglishUS.chm::/SkinSupport/DropDownClosed.gif)do the following](javascript:void(0);).In the Update Configuration dialog box, right-click a configuration and select Change Revision from the context menu.The Select Revision of Configuration dialog box opens. It lists all configuration revisions available in the repository.Select the revision number you want to be loaded during update and click Ok.
1. To select a revision for multiple configurations, [![Closed](ms-its:ASCET_SCMEnglishUS.chm::/SkinSupport/DropDownClosed.gif)do the following](javascript:void(0);).In the Update dialog box, select the desired configurations.Right-click the selection and select Change Revision from the context menu.The Revision for multiple selected items dialog box opens.Enter a revision number and click Ok.This revision is set for all selected items. If the selected revision does not exist for an item, the previously selected revision number is restored.
1. Click Next.
1. Select a revision for a single item or multiple items as described in steps 3 and 4.
1. Click Update to start the procedure.
1. Close the Update Configuration dialog box.

If you select a folder, the Update Configuration command does not search for configurations in the same folder that exist in the repository but not yet in the ASCET database/workspace. To retrieve "new" configurations, use the [Checkout Configuration](SCM_Checking_out_a_Configuration.md) command.

See also

[Updating](SCM_Updating.md)

[Update Configuration Dialog Box (Advanced Mode)](SCM_Update_Configuration_Dialog_Box.md)

[Checking out a Configuration (Advanced Mode)](SCM_Checking_out_a_Configuration.md)

[Activating/Deactivating the Simple Mode User Interface](SCM_Activating_Deactivating_SimpleMode.md)
