# Import Options

In the Import node, you set options for importing database/workspace items. Options for automatic repair during AMD/AXL import are compiled in the [Autofixes](CM_Autofixes_Node.md) node.

##### Default Import Format

- Selects the import format that is preselected when you start an import. Available selections are:

- ASCET Export files (*.exp) - see also [Importing Folders and Database/Workspace Items](ImportFolders.md)
- ASCET compressed Model Data files (*.axl) - see also [Special Features of the AMD/AXL Import](cm_special_features_of_the_amd_import.md)
- ASCET Model Data files (*.amd)

##### Ignore 'Disallow Import'

If this option is activated, the system imports and overwrites components protected by Disallow Import (see [Disallowing Overwriting of Items](Disallowoverwriting.md)) without any additional information.

##### Discard Existing Implementation

Activates/deactivates replacement of all existing implementations with the imported implementations.

##### List Imported Components After Import

If activated, the imported items are listed in the Imported Items window.

##### EXP Format area

- Keep Folder Path of Components

Activates/deactivates the usage of the path set in the database/workspace when you import existing components.

##### AMD/AXL Format area

- Keep Hierarchy

Specifies whether the directory structure of the export files in the ASCET database is reflected during AMD import. If deactivated, imported items are stored in the ASCET folder that is selected when the import is started.

- Import Referenced Items

Activates/deactivates recursive AMD import.

- Overwrite Referenced Items

Activates/deactivates overwriting of existing referenced items.

- Use UUIDs for Identification

If no OIDs are available, UUIDs are used instead of names to identify components in the database/workspace.

- Repair M2M Statemachines

State machines created with M2M do not use correct values for the start state. If activated, this option forces the state machine to be recreated after import.

Repairing state machines after import might change the semantical behavior of the state machine. Check the state machine afterwards.

- Decryption Key

Key for file decryption during AMD/AXL import.

See also

[Setting the Import Options](ImportOptions.md)

[Autofixes Node](CM_Autofixes_Node.md)

[Disallowing Overwriting of Items](Disallowoverwriting.md)

[Importing Folders and Database/Workspace Items](ImportFolders.md)
