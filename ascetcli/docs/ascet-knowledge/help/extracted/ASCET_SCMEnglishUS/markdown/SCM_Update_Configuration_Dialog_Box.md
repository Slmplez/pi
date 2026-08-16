# Update Configuration Dialog Box

This dialog box is displayed when you open the [SCM menu](SCM_ASCET-SCM_Menu.md), point to [Configuration Management](SCM_ASCET-SCM_Menu.md#Configuration_Management) and select Update Configuration.

This dialog box serves for [updating](SCM_Updating.md) configurations.

##### Step 1 of 4

This page lists the configurations you selected for updating. Optionally, you can right-click on a configuration listed here to display the [Context Menu for Selected Items](SCM_Context_Menu_for_Selected_Items.md).

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button_deselect_26x26.gif)Remove selected items from list

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button_select_26x26.gif) Undo Remove selected items from list

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button_deselect_26x26.gif) and ![](ms-its:ASCET_SCMEnglishUS.chm::/images/button_select_26x26.gif) can be used to refine the selection.

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Write to Log: Writes the revision history of the selected configurations to a log file. A separate browser is displayed via which you can specify or select this log file.

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Next: Displays the next page of this dialog box.

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Cancel: Closes this dialog box, discarding the update operation.

##### Step 2 of 4

Lists the details of the configurations selected for update. Optionally, yon can right-click on an item listed here to display the [Context Menu for the Update and Commit Dialog Boxes](SCM_Context_Menu_for_the_Update_and_Commit_Dialog_Boxes.md).

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button_deselect_26x26.gif) Remove selected items from list

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button_select_26x26.gif) Undo Remove selected items from list

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button_compare.gif) Compare selection with local status in ASCET database

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Write to Log

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Previous: Displays the previous page of this dialog box.

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Update: Updates the selected configuration(s) and imports the updated configuration data to ASCET and displays the next page.

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Cancel

##### Step 3 of 4 (optional)

Any conflicts detected are listed. Items can be deleted from the list shown on this page. When you click the Update button on this page, all remaining non-critical conflicting items and all non-conflicting items are loaded into ASCET.

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Write to Log

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Previous

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Update: Performs the update (if possible) and displays the Step 4 of 4 page of this dialog box.

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Cancel

##### Step 4 of 4

Lists the result of the update operation. See also: [Result Dialog Box](SCM_Result_Dialog_Box.md). Optionally, you can right-click on an item listed here to display the [Context Menu for the Result Dialog Box](SCM_Context_Menu_for_the_Result_Dialog_Box.md).

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Reset Exchange Directory: The exchange directory serves as the local workspace to which items are moved from the Subversion repository so these items can be used in ASCET. This button enables you to select a different directory.

This option requires great care. All files and folders in the current exchange directory will be deleted by this step.

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Write to Log

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Close: Closes this dialog box.

See also

[Updating a Configuration (Advanced Mode)](SCM_Updating_a_Configuration.md)

[Activating/Deactivating the Simple Mode User Interface](SCM_Activating_Deactivating_SimpleMode.md)
