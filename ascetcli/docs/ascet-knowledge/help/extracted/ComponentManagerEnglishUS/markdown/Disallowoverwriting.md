# Disallowing Overwriting of Items

It is possible to protect items in a database/workspace from being overwritten during import. Proceed as follows:

1. In the Component Manager, select the items and folders you want to protect.
1. In the Edit menu, select Disallow Import.
1. In the [Import](CM_Import_Node.md) node of the Options window, deactivate the Ignore 'Disallow Import' option.

The selected items and folders are protected from being overwritten on import. Protected items are marked with <Disallow Import> in the 1 Database or 1 Workspace list.

1. If a folder has been set to disallow import, this simply means that the folder itself cannot be overwritten by an imported folder.

If the Ignore 'Disallow Import' import option is activated, existing items are overwritten during import even if Disallow Import is set.

See also

[Import Options](CM_Import_Node.md)

[Importing Folders and Database/Workspace Items](ImportFolders.md)

[I](CM_Importing_from_AMD_AXL_Files.md)mporting from AMD/AXL Files

[Importing from Binary Export Files](CM_ImportBinaryFiles.md)

[Importing from ARXML or A2L Files](CM_Import_ARXML_or_A2L_Files.md)
