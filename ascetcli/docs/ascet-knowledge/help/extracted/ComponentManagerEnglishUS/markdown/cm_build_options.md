# Build Options

In the Build node, you set options which influence code generation in ASCET.

##### Write Project Files on Build

Determines whether project files are written to the hard disk during code generation.

##### Keep files in Code Generation Directory

Specifies whether the content of the code generation directory ([Code Generation Path](CM_PathsNode_Build.md) option) is to be retained or deleted when exiting ASCET.

##### Use Arithmetic Service

Activates/deactivates the use of arithmetic services for new projects.

##### Use first available Service set

Assigns the first set of arithmetic services in the file services.ini to new projects.

##### Configure Code Generation Messages

Opens the CodeGen Message Configuration window where you can configure code generation messages on a global level.

##### Activate external code storage

Specifies whether generated code is stored in the database (deactivated, default) or in encrypted files on disk (activated). See also [External Code Storage](ProjectEditorEnglishUS.chm::/PE_ExternalCodeStorage.htm) and references therein.

For workspaces, this option is always activated. This option does not affect the code generation directory selected in [Code Generation Path](CM_PathsNode_Build.md#CodeGenerationPath).

##### External Help URL

A path or URL for external help file(s) you want to connect to the code generation messages. See also [Using External Help Files](CM_UseExternalHelpFiles.md).

##### Warning threshold for power of two literals

If the project option [Use power of 2 approximations of literals](ProjectEditorEnglishUS.chm::/fixedpoint.htm#UsePower_of_2_approx) is active, the code generator generates a warning WIle18 if the relative error of the approximation is above the given threshold value.

Further build options are compiled in subnodes:

- [Data Type Names Options](CM_Options_DataTypeNames.md)
- [Interpolation Routine Node](CM_InterpolationRoutineNode.md)
- [Paths Options](CM_PathsNode_Build.md)

See also

[Arithmetic Services - Overview](ArithmeticServicesEnglishUS.chm::/AS_Overview.htm)

[Project Editor - External Code Storage](ProjectEditorEnglishUS.chm::/PE_ExternalCodeStorage.htm)

[Using External Help Files](CM_UseExternalHelpFiles.md)
