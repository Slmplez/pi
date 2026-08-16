# Commit Configuration Dialog Box (Advanced Mode)

This dialog box is displayed when you open the [SCM menu](SCM_ASCET-SCM_Menu.md), point to [Configuration Management](SCM_ASCET-SCM_Menu.md#Configuration_Management) and select Commit Configuration.

This dialog box serves for committing ("checking in") configurations.

The exact sequence of steps (including the display of pages) depends on whether or not items are involved that are not yet under version control and whether or not there are locked items that have been modified. Consequently, the sequence of pages may vary.

##### Step 1 of 3

This page lists the configurations(s) you selected for committing. Optionally, you can right-click on an item listed here to display the [Context Menu for the Update and Commit Dialog Boxes](SCM_Context_Menu_for_the_Update_and_Commit_Dialog_Boxes.md).

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button_compare.gif) Compare selection with local status in ASCET database: If a compare tool is installed and its installation path is specified via the Custom Diff Tool settings in the ASCET-SCM [Tool Options](SCM_Tool_Options_for_ASCET-SCM.md#Custom_Diff_Tool), you can use this button to compare a selected configuration to the local status of the items in ASCET.

In the Comment section, you can enter a comment text for the current version of each item.

In Subversion, only one comment can be defined for each transaction. If you are committing multiple items at once, the comment defined for the first item will be used for all items in the list.

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Write to Log: Writes the revision history of the selected items to a log file. A separate browser is displayed via which you can specify or select this log file.

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Commit: Exports the selected configuration from ASCET to the repository and writes back the refreshed SCM data to ASCET.

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Cancel: Closes this dialog box, discarding the commit operation.

##### Step 2 of 3

Lists the details of the configurations to be committed. Optionally, yon can right-click on an item listed here to display its context menu.

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Commit: Commits the configuration elements included in the selected configurations and displays the next page of this dialog box.

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Cancel: Closes this dialog box, discarding the commit operation.

##### Step 3 of 3

Lists the result of the previous step. See also: [Result Dialog Box](SCM_Result_Dialog_Box.md).

Optionally, yon can right-click on an item listed here to display the [Context Menu for the Result Dialog Box](SCM_Context_Menu_for_the_Result_Dialog_Box.md).

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Reset Exchange Directory: The exchange directory serves as the local workspace to which items are moved from the Subversion repository so these items can be used in ASCET. This button enables you to select a different directory.

This option requires great care. All files and folders in the current exchange directory will be deleted by this step.

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Write to Log: Writes the revision history of the selected items to a log file. A separate browser is displayed via which you can specify or select this log file.

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Close: Closes the Commit Configuration dialog box.

See also

[Activating/Deactivating the Simple Mode User Interface](SCM_Activating_Deactivating_SimpleMode.md)
