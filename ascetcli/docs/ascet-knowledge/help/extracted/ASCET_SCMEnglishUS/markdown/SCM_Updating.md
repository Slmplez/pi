# Updating

If items are selected in ASCET that are already under version control in Subversion, the [Update](SCM_ASCET-SCM_Menu.md#Update) command retrieves current data for these items from the Subversion repository. This functionality enables you to load a fresh version of these items from the repository. All items currently selected are listed in the [Update Dialog Box](SCM_Update_Dialog_Box.md). To make available all entries of the SCM repository, ASCET-SCM first updates the list of existing versions.

Optionally, you can use the [Update to Latest Revision](SCM_Update_to_Latest_DialogBox.md) command to retrieve the most recent date for the selected items from the Subversion repository. All applicable items are listed in the [Update to Latest Revision Dialog Box](SCM_Update_to_Latest_DialogBox.md).

##### Updating in ASCET-SCM versus Updating in TortoiseSVN

The ASCET-SCM menu command [Update](SCM_ASCET-SCM_Menu.md#Update) is NOT the same as the Update command in TortoiseSVN. The reason for the difference between ASCET-SCM and TortoiseSVN commands is that, in ASCET, all activities are based on items (ASCET components – not including folders), whereas in TortoiseSVN they are based on folders.

The Update command in ASCET-SCM looks for existing revisions of selected ASCET items (or all locally existing items within a selected path). NO further items are searched for in the repository path if they do not yet exist yet in ASCET. To retrieve items that are not in the ASCET database or workspace, use [Checkout](SCM_ASCET-SCM_Menu.md#Checkout).

See also

[Repository](SCM_Repository.md)

[Updating Items](SCM_Updating_Items.md)

[Updating Items to Latest Revision](SCM_Update_to_LatestRevision.md)

[Updating a Configuration](SCM_Updating_a_Configuration.md)
