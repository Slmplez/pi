The Configuration Management submenu of the [SCM](SCM_ASCET-SCM_Menu.md) menu or the Source Control context menu contains the following options.

- Checkout Configuration

Shown as part of the SCM menu in [online](SCM_Online_versus_Offline_Mode.md) mode only.

Displays the [Checkout Configuration Dialog Box](SCM_Checkout_Configuration_Dialog_Box.md) which enables you to check out configurations from the repository so that these can be edited in ASCET.

- Update Configuration

Displays the [Update Configuration Dialog Box](SCM_Update_Configuration_Dialog_Box.md) which enables you select a configuration to be updated.

- Update to Latest Configuration

Retrieves the most recent data for the selected configuration from the Subversion repository and applies these to the configuration.

- Get Lock for Configuration

"Locks" (reserves) the selected configuration exclusively for you in the repository. While in the locked state, the configuration can be edited only by you; other users cannot access this configuration at the same time. Other users who try to access a configuration locked by someone else will see a padlock in the configuration's icon in the browser tree. See also: [Locking and Unlocking](SCM_Locking_and_Unlocking.md).

- Release Lock for Configuration

Unlocks the (currently locked) configuration.

- Commit Configuration

Displays the [Commit Configuration Dialog Box](SCM_Commit_Configuration_Dialog_Box.md) which enables you to commit the selected configuration to the Subversion repository.

- Add and Commit New Configuration

Displays the [Add and Commit Configuration Dialog Box](SCM_Add_and_Commit_Configuration_Dialog_Box.md) which enables you to save the current configuration in the repository.

You are recommended to use Add and Commit New Configuration for an individual configuration, but not for a folder. If you apply this command at a folder level, each item within this folder will receive its own configuration.

- Show Configuration Log

Displays the Configuration Log Dialog Box which enables you to write the revision history of the selected configuration to a log file and/or to update this configuration.

- Show Configuration Properties

Displays the [Details of <Item Name> Dialog Box](SCM_Version_Details_Dialog_Box.md).

- Compare Configuration

Displays the [Compare Configuration Dialog Box](SCM_Compare_Configuration_Dialog_Box.md) which enables you to compare (i.e. identify differences between) two versions of the selected configuration.

- Verify Configuration

Displays the [Compare Configuration for Verification Dialog Box](SCM_VerifyConfiguration_DialogBox.md) which checks the local status of the currently selected configuration against its status in the repository.
