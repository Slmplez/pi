# Show Log / Configuration Log Dialog Box

This dialog box is displayed when you open the [SCM menu](SCM_ASCET-SCM_Menu.md) and select the [Show Log](SCM_ASCET-SCM_Menu.md#Show_Log) command or the Show Configuration Log command in the Configuration Management submenu.

These commands retrieve the current version or configuration history status of the selected items from the Subversion [repository](SCM_Repository.md).

If the Subversion driver is in "Offline" mode, this dialog box shows the history status which was read the last time a [Checkout](SCM_ASCET-SCM_Menu.md#Checkout), [Update](SCM_ASCET-SCM_Menu.md#Update) or [Update To Latest Revision](SCM_ASCET-SCM_Menu.md#Update_to_Latest_Revision) was performed on the selected item.

- For further details, you can double-click on entries listed in this dialog box.
- If a compare tool is installed and its installation path is specified via the [Custom Diff Tool](SCM_Tool_Options_for_ASCET-SCM.md#Custom_Diff_Tool) settings in the [Tool Options](SCM_Tool_Options_for_ASCET-SCM.md#Custom_Diff_Tool) dialog box for ASCET-SCM, you can compare a selected version entry in the list to the local status of the item in ASCET by clicking the ![](ms-its:ASCET_SCMEnglishUS.chm::/images/button_compare.gif) button.

##### ![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Write to Log

Writes the content of the list shown in this dialog box to the log.

##### ![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Update Data

Updates the history data listed in this dialog box as well as in the ASCET database or workspace by applying the current content of the Subversion repository.

##### ![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Close

See also

[Online versus Offline Mode](SCM_Online_versus_Offline_Mode.md)

[Handling Configurations](SCM_Handling_Configurations.md)
