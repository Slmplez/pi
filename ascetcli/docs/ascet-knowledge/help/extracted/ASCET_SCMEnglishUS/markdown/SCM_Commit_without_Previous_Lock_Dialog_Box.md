# Commit without Previous Lock Dialog Box (Advanced Mode)

This dialog box is displayed when you open the [SCM menu](SCM_ASCET-SCM_Menu.md), point to [Additional Commands](SCM_ASCET-SCM_Menu.md#Additional_Commands) and select Commit New Revision without Lock.

This dialog box serves for committing ("checking in") items to which you [applied the Edit without Lock command](SCM_Editing_Items_in_Offline_Mode.md).

##### Step 1 of 2

This page lists the item(s) you selected for committing. Optionally, you can right-click on an item listed here to display the [context menu for the Update and Commit dialog boxes](SCM_Context_Menu_for_the_Update_and_Commit_Dialog_Boxes.md).

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button_deselect_26x26.gif) Remove selected items from list

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button_select_26x26.gif) Undo Remove selected items from list

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button_compare.gif) Compare selection with local status in ASCET database

In the Comment section, you can enter a comment text for the current version of each item.

In Subversion, only one comment can be defined for each transaction. If you are committing multiple items at once, the comment defined for the first item will be used for all items in the list.

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Write to Log: Writes the revision history of the selected items to a log file. A separate browser is displayed via which you can specify or select this log file.

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Finish: Exports the selected items from ASCET to the repository and writes back the refreshed SCM data to ASCET.

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Cancel: Closes this dialog box, discarding the commit operation.

##### Step 2 of 2

Lists your selection of items to be committed. See also: [Result Dialog Box](SCM_Result_Dialog_Box.md).

Optionally, yon can right-click on an item listed here to display the [context menu for the Result dialog box](SCM_Context_Menu_for_the_Result_Dialog_Box.md).

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Reset Exchange Directory: The exchange directory serves as the local workspace to which items are moved from the Subversion repository so these items can be used in ASCET. This button enables you to select a different directory.

This option requires great care. All files and folders in the current exchange directory will be deleted by this step.

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Write to Log: Writes the revision history of the selected items to a log file. A separate browser is displayed via which you can specify or select this log file.

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Close: Completes the commit operation.

See also

[Edit without Lock Dialog Box](SCM_Edit_without_Lock_Dialog_Box.md)

[Online versus Offline Mode](SCM_Online_versus_Offline_Mode.md)
