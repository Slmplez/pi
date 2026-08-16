# Checkout Configuration Dialog Box

This dialog box is displayed when you open the [SCM menu](SCM_ASCET-SCM_Menu.md), point to [Configuration Management](SCM_ASCET-SCM_Menu.md#Configuration_Management) and select Checkout Configuration.

This dialog box enables you to check out configurations from the repository.

##### Step 1 of 5

Search Criteria field: You can enter search criteria to filter (i.e. narrow down) your selection. For Subversion, ASCET configurations are stored as files with the extension ".scmconfiguration.amd". Optionally, you can use the "*" (asterisk) wildcard at the beginning and at the end of ASCET configuration names.

Repository Content pane: Provides a tree view of the items found in the repository.

Selected Elements pane: Lists the items you selected from the Repository Content pane.

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) >>: Copies the selected item from the Repository Content pane to the Selected Elements pane.

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) <<: Removes the selected item from the Selected Elements pane.

##### Step 2 of 5

Provides a more detailed overview of the items you selected in Step 1 of 5.

##### Step 3 of 5

Shows all item revisions contained in the selected configurations. Items can be deleted from the list. If multiple configurations are loaded in parallel, there might be several different revisions listed for the same (referenced) item. ASCET-SCM will only import one revision of each item. Double entries are "grayed out" and will be ignored.

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Checkout: Displays the Step 4 of 5 page (conflicts detected, checkout not yet performed) or Step 5 of 5 page (no conflicts detected, checkout performed) of this dialog box.

##### Step 4 of 5 (optional)

Any conflicts detected are listed in the [Conflicts Found Dialog Box](SCM_Conflicts_Found_Dialog_Box.md). Items can be deleted from the list shown on this page. When you click the Checkout button on this page, all remaining non-critical conflicting items and all non-conflicting items are loaded into ASCET.

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Checkout: Performs the checkout (if possible) and displays the Step 5 of 5 page of this dialog box.

##### Step 5 of 5

Lists the result of the checkout operation. See also: [Result Dialog Box](SCM_Result_Dialog_Box.md).

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Reset Exchange Directory: The exchange directory serves as the local workspace to which items are moved from the Subversion repository so these items can be used in ASCET. This button enables you to select a different directory.

This option requires great care. All files and folders in the current exchange directory will be deleted by this step.

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Close: Completes the checkout operation.

##### Other Buttons

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Write to Log: Writes the revision history of the selected items to a log file. A separate browser is displayed via which you can specify or select this log file.

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Previous: Returns to the previous display page (and thus to the previous step) in the checkout operation.

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Next: Displays the next page of this dialog box.

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Cancel: Closes this dialog box, discarding the checkout operation.

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button_deselect_26x26.gif) Remove selected items from list

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button_select_26x26.gif) Undo Remove selected items from list

See also

[Checking out a Configuration (Advanced Mode)](SCM_Checking_out_a_Configuration.md)

[Checking out](SCM_Checking_out.md)

[Activating/Deactivating the Simple Mode User Interface](SCM_Activating_Deactivating_SimpleMode.md)
