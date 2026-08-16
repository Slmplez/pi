# Checkout Dialog Box

This dialog box serves for [checking out items from the repository](SCM_Checking_out_Items.md) so these can be edited in ASCET. It can be displayed via the [Checkout](SCM_ASCET-SCM_Menu.md#Checkout) command in the [SCM](SCM_ASCET-SCM_Menu.md) menu.

##### Step 1 of 4

Search Criteria field: You can enter search criteria to filter (i.e. narrow down) your selection. ASCET-SCM stores items in files with the extension ".zip". Optionally, you can use the "*" (asterisk) wildcard at the beginning or at the end of ASCET version or configuration names.

Repository Content pane: Provides a tree view of the items found in the repository.

Selected Elements pane: Lists the items you selected by ASCET item name (*.zip) and path.

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) >>: Copies the selected item from the Repository Content pane to the Selected Elements pane.

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) <<: Removes the selected item from the Selected Elements pane.

##### Step 2 of 4

Provides a more detailed overview of the items you selected in Step 1 of 4. Items can be deleted from the list shown on this page.

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Checkout: Displays the Step 3 of 4 page (conflicts detected, checkout not yet performed) or Step 4 of 4 page (no conflicts detected, checkout performed) of this dialog box.

##### Step 3 of 4 (optional)

Collects the item data from the ASCET database or workspace. Any conflicts detected are listed in the Elements with Conflicts table (see also [Conflicts Found Dialog Box](SCM_Conflicts_Found_Dialog_Box.md)). Items can be deleted from the list shown on this page. When you click the Checkout button on this page, all remaining non-critical conflicting items and all non-conflicting items are loaded into ASCET.

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Checkout: Performs the checkout (if possible) and displays the Step 4 of 4 page of this dialog box.

##### Step 4 of 4 (optional)

Lists your final selection of items to be checked out. See also: [Result Dialog Box](SCM_Result_Dialog_Box.md).

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

[Checking out](SCM_Checking_out.md)

[Checking out Items (Advanced Mode)](SCM_Checking_out_Items.md)

[Activating/Deactivating the Simple Mode User Interface](SCM_Activating_Deactivating_SimpleMode.md)
