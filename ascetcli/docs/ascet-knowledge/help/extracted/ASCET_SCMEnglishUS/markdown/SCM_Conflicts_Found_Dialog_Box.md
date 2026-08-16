# Conflicts Found Dialog Box (Advanced Mode)

This dialog lists any conflict found during [![Closed](ms-its:ASCET_SCMEnglishUS.chm::/SkinSupport/DropDownClosed.gif)various ASCET-SCM operations](javascript:void(0);), together with details about the nature of the conflict. For instance, a conflict may be reported via this dialog box if a different version of the same item(s) is already contained in ASCET.

| Column 1 | Column 2 |
| --- | --- |
| SCM operation | See also |
| Get Lock | Locking an Item |
| Release Lock | Unlocking an Item |
| Update | Updating Items |
| Update to Latest | Updating Items to Latest Revision |
| Update and Lock | Updating Items to Latest Revision and Locking an Item |
| Commit | Committing an Item |
| Checkout | Checking out Items |
| Edit without Lock | Editing Items in Offline Mode |
| Commit New Revision Without Lock |  |
| Get Lock for Configuration | Locking a Configuration |
| Release Lock for Configuration | Unlocking a Configuration |
| Update Configuration | Updating Configurations |
| Update to Latest Configuration | Updating Configurations to Latest Revision |
| Commit Configuration | Committing a Configuration |
| Checkout Configuration | Checking out a Configuration |

Critical conflicts are always shown. Conflicts that cause existing items to be overwritten in the ASCET database/workspace are only shown if the [Warn of Conflicts](SCM_Appearance_Options_for_ASCET-SCM.md#Warn_of_Conflicts) option is activated.

The Conflicts Found dialog box contains the following elements:

##### Elements with Conflicts list

Lists all ASCET elements that cause a conflict during the ASCET-SCM operation. You can right-click on the list to open the [![Closed](ms-its:ASCET_SCMEnglishUS.chm::/SkinSupport/DropDownClosed.gif)context menu for the Conflicts Found dialog box](javascript:void(0);).

- Show Details

Displays the [Details of <Item Name> Dialog Box](SCM_Version_Details_Dialog_Box.md) for the selected item.

- Delete Selection

Excludes the selected item from the operation.

- Reactivate Selection

Re-includes a removed item into the operation.

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button_deselect_26x26.gif) Remove selected items from list

Excludes the selected item from the operation.

![](ms-its:ASCET_SCMEnglishUS.chm::/images/button_select_26x26.gif) Undo Remove selected items from list

Re-includes a removed item into the operation.

##### ![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Write to Log:

Writes the revision history of the selected items to a log file. A separate browser is displayed via which you can specify or select this log file.

##### ![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Previous

Returns to the previous display page (and thus to the previous step) in the operation.

##### ![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Next

Displays the next page of this dialog box.

##### ![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) <action>

This button continues the operation.

The name of this button depends on the operation you are performing. One possible name is, e.g., Checkout.

##### ![](ms-its:ASCET_SCMEnglishUS.chm::/images/button.bmp) Cancel

Closes the dialog box and discards the operation.

See also

[Conflicts](SCM_Conflicts.md)
