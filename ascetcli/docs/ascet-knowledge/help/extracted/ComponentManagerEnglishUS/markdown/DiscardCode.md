# Discarding the Generated Code

You can remove all the code generated during experiments from the database or workspace both to reduce the size of the database/workspace and to regenerate your code.

To discard the generated code, proceed as follows:

1. In the Component Manager, open the Build menu and select Clean All.
1. In the Component Manager, open the Build menu and select Clean All (w/o DB optimize).
1. Confirm by clicking Yes.

The generated code is removed from the database or workspace, according to the command you selected. If you selected Clean All, the database is [optimized](Optimize.md) afterwards.

If you are using [external code storage](ProjectEditorEnglishUS.chm::/PE_ExternalCodeStorage.htm), all stored code files of the current database/workspace, including generated code of IP protected components, are deleted immediately.

See also

[Force a New Build during Code Generation](ForceaNewbuild.md)

[IP Protection](CM_IntellectualPropertyProtection.md)

[Optimizing a Database](Optimize.md)

[External Code Storage](ProjectEditorEnglishUS.chm::/PE_ExternalCodeStorage.htm)
