# Managing ASCET Folders

In ASCET, folders cannot be managed as separate SCM entries. If you select a folder and start an operation, it will be executed on each item within the folder and subfolders. If a configuration is to be stored for items that do not reference each other, use a "container" item. Add all relevant items to that container and then store a configuration for the container item by selecting it and then selecting Add and Commit New Configuration from the [Configuration Management](SCM_ASCET-SCM_Menu.md#Configuration_Management) submenu of the [SCM](SCM_ASCET-SCM_Menu.md) menu.

You are recommended to use Add and Commit New Configuration for an individual configuration but not for a folder. If you apply this command at a folder level, each item within this folder will receive its own configuration.

See also

[Handling Configurations](SCM_Handling_Configurations.md)
