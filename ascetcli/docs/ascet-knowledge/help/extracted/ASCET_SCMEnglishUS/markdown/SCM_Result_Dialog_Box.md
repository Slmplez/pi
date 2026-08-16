# Results Dialog Box

Lists the results of [![Closed](ms-its:ASCET_SCMEnglishUS.chm::/SkinSupport/DropDownClosed.gif)various ASCET-SCM operations](javascript:void(0);). Depending on the current setting of the [Show Result Dialog](SCM_Appearance_Options_for_ASCET-SCM.md#Show_Result_Dialog) option, this dialog box is shown

| Column 1 | Column 2 |
| --- | --- |
| SCM operation | See also |
| Add and Commit | Adding and Committing an Item |
| Get Lock | Locking an Item |
| Release Lock | Unlocking an Item |
| Update | Updating Items |
| Update to Latest | Updating Items to Latest Revision |
| Update and Lock | Updating Items to Latest Revision and Locking an Item |
| Commit | Committing an Item |
| Checkout | Checking out Items |
| Edit without Lock | Editing Items in Offline Mode |
| Commit New Revision Without Lock |  |
| Delete | Deleting an Item from the Repository |
| Add and Commit New Configuration | Creating a Configuration |
| Get Lock for Configuration | Locking a Configuration |
| Release Lock for Configuration | Unlocking a Configuration |
| Update Configuration | Updating Configurations |
| Update to Latest Configuration | Updating Configurations to Latest Revision |
| Commit Configuration | Committing a Configuration |
| Checkout Configuration | Checking out a Configuration |

- always (i.e. after each ASCET-SCM operation),
- only in case of errors (i.e. if any items fail to load properly), or
- never.

The Results dialog box contains the following elements:

##### Results list

Lists the result of an ASCET-SCM operation. You can right-click on the list to filter this list via the [context menu for the Results dialog box](SCM_Context_Menu_for_the_Result_Dialog_Box.md).

##### ![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Reset Exchange Directory:

The exchange directory serves as the local workspace to which items are moved from the Subversion repository so these items can be used in ASCET. This button enables you to select a different directory.

This option requires great care. All files and folders in the current exchange directory will be deleted by this step.

##### ![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Write to Log

Writes the revision history of the selected items to a log file. A separate browser is displayed via which you can specify or select this log file.

##### ![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Close

Closes the Results dialog box.

See also

[Update Dialog Box](SCM_Update_Dialog_Box.md)

[Update to Latest Dialog Box](SCM_Update_to_Latest_DialogBox.md)

[Update Configuration Dialog Box](SCM_Update_Configuration_Dialog_Box.md)

[Update to Latest Configuration Dialog Box](SCM_Update_to_Latest_Configuration_Dialog_Box.md)
