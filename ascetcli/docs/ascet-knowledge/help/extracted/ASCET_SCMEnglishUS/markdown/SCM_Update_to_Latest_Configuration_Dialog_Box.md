# Update to Latest Configuration Dialog Box

If no conflicts are found during update to latest configuration, only the results page of the Update to Latest Configuration dialog box opens. This page contains the following items:

Results table: Lists the result of the update operation (see also [Results](SCM_Result_Dialog_Box.md) Dialog Box). Optionally, you can right-click on an item listed here to display the [context menu for the Results dialog box](SCM_Context_Menu_for_the_Result_Dialog_Box.md).

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Reset Exchange Directory: The exchange directory serves as the local workspace to which items are moved from the Subversion repository so these items can be used in ASCET. This button enables you to select a different directory.

This option requires great care. All files and folders in the current exchange directory will be deleted by this step.

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Write to Log: Writes the revision history of the selected configurations to a log file. A separate browser is displayed via which you can specify or select this log file.

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Close: Closes this dialog box.

If conflicts are found during update to latest configuration, the "Elements with Conflicts" page of the Update to Latest Configuration dialog box opens. This page contains the following items:

Elements with Conflicts table: Any conflicts detected are listed. Items can be removed from the list shown on this page. When you click the Update button on this page, all remaining non-critical conflicting configurations and all non-conflicting configurations are loaded into ASCET.

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button_deselect_26x26.gif) Remove selected items from list: Can be used to remove conflicting configurations from the list.

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button_select_26x26.gif) Undo Remove selected items from list

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Write to Log: Writes the revision history of the selected configurations to a log file.

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Previous: Displays the previous page of this dialog box; identical to [Step 2 of 4](SCM_Update_Configuration_Dialog_Box.md#Step2of4) in the Update Configuration dialog box.

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Update: Performs the update of all non-critical conflicting configurations and all non-conflicting configurations and displays the [results page](#Results_page) of this dialog box.

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Cancel: Closes this dialog box and discards the update operation.

See also

[Update Configuration Dialog Box (Advanced Mode)](SCM_Update_Configuration_Dialog_Box.md)

[Results Dialog Box](SCM_Result_Dialog_Box.md)

[Updating Configurations to Latest Revision (Advanced Mode)](SCM_UpdateConfigurations_LatestRevision.md)

[Updating a Configuration (Advanced Mode)](SCM_Updating_a_Configuration.md)

[Activating/Deactivating the Simple Mode User Interface](SCM_Activating_Deactivating_SimpleMode.md)
