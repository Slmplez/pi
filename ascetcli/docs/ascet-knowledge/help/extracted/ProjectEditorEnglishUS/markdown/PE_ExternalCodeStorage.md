# External Code Storage

If external code storage is activated (see [Activating External Code Storage](PE_ActivateExternalCodeStorage.md)), ASCET stores all generated code (i.e. all code generated during commands invoked from the Build menu in a component editor) on the Windows file system, in encrypted files, at the location specified for external code storage (see [Setting a Path for External Code Storage](PE_SetPath_for_ExternalCodeStorage.md)). Otherwise, generated code is stored in the database.

During code generation operations with activated external code storage, code is stored on the file system only for those components that needed a regeneration of code. If, for example, ASCET generates code for only 5 out of 20 components forming a project, only the files related to those 5 components are written (or overwritten) to disk.

For operations that need access to the generated code with external tools (compilation, linking), ASCET automatically copies the necessary files from the external code storage to the CGEN directory before the external tool is invoked. Thus, nothing changes for external tools such as compiler or linker.

If a component is deleted in the ASCET component manager, the associated code in the external code storage is deleted as well.

If the generated code cannot be deleted (because, e.g., of file system locks), the external code storage file remains on disk, but is no longer connected to ASCET in any way. ASCET issues a message in the monitor window. You can delete the file manually.

See also

[Activating External Code Storage](PE_ActivateExternalCodeStorage.md)

[Setting a Path for External Code Storage](PE_SetPath_for_ExternalCodeStorage.md)

[Code Storage Node](PE_CodeStorageNode.md)
