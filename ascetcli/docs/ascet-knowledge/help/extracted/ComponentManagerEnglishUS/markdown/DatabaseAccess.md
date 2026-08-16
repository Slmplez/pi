# Access Rights

In a database, it is possible to adjust the access rights for each individual component, as well as those for entire folders. Access rights can be password protected, so that only users who know the password can change them. This ensures confidentiality when ASCET data is exchanged.

In a workspace, neither access rights nor password protection can be set.

If, for instance, the access rights of a particular component are set to execute only, that component can be used as a building block in other components, but it cannot be looked at, i.e. the algorithms it uses are protected from view.

The following access rights can be assigned:

Read

The database item can be looked at with the appropriate item editor. If read access is removed, the 3 Contents field shows only a note No read flag for <component name>!

Write

Items can be added to the database and deleted. Items can be edited in the appropriate editor. If write access is removed, the [item symbol](DescriptionofSymbols.md) in the 1 Database field and elsewhere is marked with a red frame (![](icon_accessrightsNowrite01.gif), ![](icon_accessrightsNowrite02.gif), etc.).

Calibration

Items can be calibrated in experiments.

Execute

Items can be experimented on. This also goes for referenced items, i.e. if a user has no execute rights to an item, they cannot use it within another item, and then experiment with that.

Code Generation

This option allows code generation even if write access is not set. If read access is set, the component can be viewed, but not modified, experimentation is possible.

The most recent changes always apply. If, for instance, access rights for a single component are changed, and then later the rights for the entire folder are changed, those changes overrule the ones made earlier to the component.

Access rights can be specified for any database item. However, only limited modifications are permitted if password protection has been activated. Password protection can be activated separately for each root folder in the database. If password protection is activated, users can modify access rights only if they know the correct password.

If password protection is active, you must enter the password for every change to the access rights. This can be quite cumbersome if you want to modify more than just a few items. Therefore, it is more efficient to specify access rights first and then activate password protection.

See also

[Changing the Access Rights of a Folder or Item](ChangeAccess.md)

[Activating Password Protection](ActivatePassword.md)

[Deactivating Password Protection](DeactivatePassword.md)

[Symbols for Database/Workspace Items](DescriptionofSymbols.md)
