# ASCET Database

An ASCET database is represented on the file system by several binary files:

- sobjects.dat, sobjects.idx - for database items
- codestorage.dat, codestorage.idx - for generated code

Some ASCET features are available only for databases: [Maintenance Routines](CM_Database_Maintenance_Routines.md) and the definition of [access rights and password protection](DatabaseAccess.md).

The size of an ASCET database is limited to 3.5 GB for each *.dat file. When one *.dat file exceeds 3 GB, warnings are issued upon the following actions:

- opening the database (see [Loading a Database](cm_loaddatabase.md))
- creating any object (folder, component, ...; see [Creating a Folder](CreateFolder.md), [Creating Components](CM_CreatingComponents.md))
- importing any object (see [Importing from AMD/AXL Files](CM_Importing_from_AMD_AXL_Files.md), [Importing from Binary Export Files](CM_ImportBinaryFiles.md), [Importing from ARXML or A2L Files](CM_Import_ARXML_or_A2L_Files.md) and [Importing a Directory Content](DirectoryContent.md))
- generating code or A2L descriptions (see, e.g., [Generating Code](ProjectEditorEnglishUS.chm::/PE_generatecode.htm) and [Generating Application Files](ProjectEditorEnglishUS.chm::/generating_files.htm))

When the database size (i.e. one of the *.dat files) exceeds 3.5 GB, ASCET disables several features:

- import
- creation of components
- code generation
- tool access via API

In addition, title bars of subwindows (e.g., 1 Database, Tree pane, ...) and palettes are red instead of blue, and editors open in read-only mode.

Exporting and deleting components, as well as using the [database maintenance routines](CM_Database_Maintenance_Routines.md), remains possible.

See also

[Managing Data, Databases and Workspaces](ManagingData.md)

[Database/Workspace Items](DatabaseItems.md)

[ASCET Workspace](CM_ASCETWorkspace.md)

[Maintenance Routines](CM_Database_Maintenance_Routines.md)

[Access Rights](DatabaseAccess.md)
