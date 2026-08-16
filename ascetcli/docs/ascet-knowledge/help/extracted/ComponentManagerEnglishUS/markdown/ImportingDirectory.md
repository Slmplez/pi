# Import of a Directory Content

When you are using a workspace, you cannot use the binary export format for import.

The mechanism to import all export files in a given directory fundamentally differs from the mechanism to import from one file. Existing folders and entries are automatically overwritten, unless they are protected (see [Disallowing Overwriting of Items](Disallowoverwriting.md)).

This mechanism should not be used for directories that contain export files of more than one type. In addition, it should not be used for directories that contain AMD or AXL files, even if that is the only export file type in the directory. It is highly likely that objects get overwritten when importing a complete directory with mixed contents or with AMD/AXL files which may result in several unexpected problems. Instead, use the procedure described in [Importing from AMD/AXL Files](CM_Importing_from_AMD_AXL_Files.md).

This import function should only be used to exchange large numbers of database items between databases. It is highly recommended that only experienced users use this mechanism.

See also

[Importing a Directory Content](DirectoryContent.md)

[Importing Folders and Database/Workspace Items](ImportFolders.md)

[I](CM_Importing_from_AMD_AXL_Files.md)mporting from AMD/AXL Files

[Importing from Binary Export Files](CM_ImportBinaryFiles.md)

[Importing from ARXML or A2L Files](CM_Import_ARXML_or_A2L_Files.md)

[Using the AUTOSAR to ASCET Converter](CM_Use_A2AConverter.md)

[Disallowing Overwriting of Items](Disallowoverwriting.md)
