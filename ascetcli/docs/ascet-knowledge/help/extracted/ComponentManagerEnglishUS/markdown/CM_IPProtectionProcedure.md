# IP Protection Procedure

The procedure to create and exchange IP protected components contains the following steps.

1. Both partners must deactivate [external code storage](ProjectEditorEnglishUS.chm::/PE_ExternalCodeStorage.htm).
1. Before transferring an IP protected model to a development partner, a [rebuild](ProjectEditorEnglishUS.chm::/generateexecutable.htm) has to be executed with full access rights for the modules and classes which are to be exchanged.
1. After that, the [access rights](DatabaseAccess.md), except Execute, for these components can be [disabled](ChangeAccess.md).
1. [Export](SingleExport.md) the protected components in the [*.exp](CM_Binary_Export.md) format.
1. Old versions of the components in the partner's database must be deleted.
1. The protected model can now be [imported](CM_ImportBinaryFiles.md) in the partner's database with the same project.
1. The project can be [rebuilt](ProjectEditorEnglishUS.chm::/generateexecutable.htm).

Rebuilding the project can only work when both partners use the same ASCET version (see [Preconditions for IP Protection](CM_PreconditionsIPProtection.md)).

See also

[IP Protection](CM_IntellectualPropertyProtection.md)

[Preconditions for IP Protection](CM_PreconditionsIPProtection.md)

[ASAM-MCD-2MC Generation for Protected Components](CM_ASAM2MCGenerationProtectedComponents.md)

[Access Rights](DatabaseAccess.md)

[Changing the Access Rights to a Folder or Item](ChangeAccess.md)

[Exporting a Folder or Database/Workspace Item](SingleExport.md)

[Binary Export](CM_Binary_Export.md)

[Importing from Binary Export Files](CM_ImportBinaryFiles.md)

[Project Editor - External Code Storage](ProjectEditorEnglishUS.chm::/PE_ExternalCodeStorage.htm)

[Project Editor - Building/Rebuilding Executable Code](projecteditorenglishus.chm::/generateexecutable.htm)
