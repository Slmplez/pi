# Checking out

By checking out an item or configuration from the Subversion repository via the [Checkout](SCM_ASCET-SCM_Menu.md#Checkout) or Checkout Configuration (in the [Configuration Management](SCM_ASCET-SCM_Menu.md#Configuration_Management) submenu) command, you make it available for use (including editing) in your current ASCET session.

If you want to edit an item, be sure to lock it first by selecting [Get Lock](SCM_ASCET-SCM_Menu.md#Get_Lock) from the [SCM](SCM_ASCET-SCM_Menu.md) menu.

##### Checking out in ASCET-SCM versus Checking out in TortoiseSVN

The ASCET-SCM menu command [Checkout](SCM_ASCET-SCM_Menu.md#Checkout) is NOT the same as the Checkout command in TortoiseSVN. The reason for the difference between ASCET-SCM and TortoiseSVN commands is that, in ASCET, all activities are based on items (ASCET components – not including folders), whereas in TortoiseSVN they are based on folders.

The Checkout command in ASCET-SCM does not automatically read a complete repository to a new folder, but shows the complete repository content in the Checkout Dialog Box. Via this dialog box, you can conveniently select the items you want to import to ASCET. By selecting the root folder in this dialog box, you can select all items in the repository with a single click.

See also

[Repository](SCM_Repository.md)

[Locking and Unlocking](SCM_Locking_and_Unlocking.md)

[Committing](SCM_Committing.md)

[Checking out Items](SCM_Checking_out_Items.md)

[Checking out a Configuration](SCM_Checking_out_a_Configuration.md)
