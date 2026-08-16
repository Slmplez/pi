The Additional Commands submenu of the [SCM](SCM_ASCET-SCM_Menu.md) menu or the Source Control context menu contains the following options.

- Update and Lock

Combines Update to Latest… and Lock… in a single operation. The most recent revisions of the selected items are collected and imported to ASCET. After that, the corresponding entries in the Subversion repository are locked so you can edit them in ASCET. The result of this combined operation is shown in the Items Changed by SCM Update and Lock dialog box. See also: [Updating](SCM_Updating.md) and [Locking and Unlocking](SCM_Locking_and_Unlocking.md).

- Release Lock

Removes an existing lock (i.e. taking the selected item out of the "locked" state). After that, you can no longer edit the items. Any local changes are be deleted; the item is updated to its revision status in the repository. See also: [Locking and Unlocking](SCM_Locking_and_Unlocking.md).

- Edit without Lock

Makes the selected items editable without locking them in the Subversion repository. Consequently, other users are not notified when trying to edit the same item. Therefore, this command requires caution. It is mainly intended for temporary tests which will not yield a new revision or to support changes in ASCET in [offline](SCM_Online_versus_Offline_Mode.md) mode (i.e. while you do not have access to the selected Subversion repository server, e.g. during field tests). See also: [Editing Items in Offline Mode](SCM_Editing_Items_in_Offline_Mode.md).

- Commit New Revision without Lock

If you changed an item using Edit without Lock, this command enables you to store this item in the repository. See also: [Editing Items in Offline Mode](SCM_Editing_Items_in_Offline_Mode.md).

- Delete

Takes the selected item out of source control and deletes it from the current database and from the repository. Following this operation, the item will no longer be available to you and/or to other users. The [ASCET-SCM Delete Elements dialog box](SCM_ASCET-SCM_Delete_Elements_Dialog_Box.md) prompts you to confirm this deletion.

If you only want to delete the item locally, use the standard ASCET command Delete.

- Disconnect from Repository

Shown as part of the SCM menu in [online](SCM_Online_versus_Offline_Mode.md) mode only. Disconnects the Subversion driver from the repository URL. Note that you can reconnect to the Subversion repository by selecting [Connect to Repository](SCM_ASCET-SCM_Menu.md#Connect_to_Repository1). See also [Online versus Offline Mode](SCM_Online_versus_Offline_Mode.md).
