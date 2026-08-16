# Locking and Unlocking

By default, all items controlled in Subversion are write-protected within ASCET. If you want to edit an item, you need to lock it to ensure that it is exclusively reserved for you, implying that no other users can edit this item at the same time. In Subversion, the [Get Lock](SCM_ASCET-SCM_Menu.md#Get_Lock) command in the [SCM menu](SCM_ASCET-SCM_Menu.md) enables you to switch selected items to the locked state.

- You can unlock an item (i.e. release the item for use by others) by means of the Release Lock command in the [Additional Commands](SCM_ASCET-SCM_Menu.md#Additional_Commands) submenu.
- For configurations, use the Get Lock for Configuration and Release Lock for Configuration commands in the [Configuration Management](SCM_ASCET-SCM_Menu.md#Configuration_Management) submenu, respectively.
- Once you have unlocked an item or configuration, it can be locked by other users and your local modifications may be thus be undone. That's why ASCET-SCM will issue a warning message when you unlock locally modified items or configurations. To preserve your modifications under version control, select Commit or Commit Configuration.
- Note that items are automatically taken out of the "locked" state when you select Commit.

See also

[Checking out Items](SCM_Checking_out_Items.md)

[Locking an Item](SCM_Locking_an_Item.md)

[Committing an Item](SCM_Committing_an_Item.md)
