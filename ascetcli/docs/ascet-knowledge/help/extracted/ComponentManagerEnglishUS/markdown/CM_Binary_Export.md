# Binary Export

When you are using a workspace, you cannot use the binary export format for export.

The *.exp export file format is a very space-efficient binary format that can be generated and read quickly. However, generating such export files can be a memory-intensive task. If you are exporting large folders, you can distribute their contents over several files to speed up the export/import process. You can distribute the contents of large folders over several files by automatically generating one file per exported item.

Besides the components themselves, the export file also stores their paths in the exporting database and - if Read access is disabled - also the generated code. If an imported item is located in a folder existing in the target database, it is written into that folder. If an item is located in a folder in the source database that does not exist in the target database, the folder is automatically created in the target database. If necessary, several levels of folders are created. The folder hierarchy is recreated as it exists in the source database.

If duplicate paths, i.e. database items with identical name and path, but different OID, are present in the exported part of the database, only one item is exported. References to the other item are destroyed.

See also

[Export of Folders and Database/Workspace Items](ExportingFolders.md)

[Export Node](CM_Export_Node.md)
