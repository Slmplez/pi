# Build Menu

This menu contains the following options:

Touch All (Ctrl + Shift + t)

All database components are marked as changed. Thus, a compilation of the entire project is enforced.

If you are using [external code storage](ProjectEditorEnglishUS.chm::/PE_ExternalCodeStorage.htm), all stored code files of the current database/workspace become invalid. They are deleted or overwritten during the next code generation run.

Clean All (Ctrl + Shift + c)

This option is only available if you are using a database.

All generated code stored in the database is discarded, except generated code of read-protected components. After the generated code is discarded, the database is [optimized](Optimize.md).

If you are using [external code storage](ProjectEditorEnglishUS.chm::/PE_ExternalCodeStorage.htm), all stored code files of the current database are deleted immediately.

Clean All (w/o DB optimize) (Ctrl + Shift + r)

All generated code stored in the database or workspace is discarded.

Since generated code of read-protected components is discarded, too, these components become unusable for build purposes and simulation.

If you are using [external code storage](ProjectEditorEnglishUS.chm::/PE_ExternalCodeStorage.htm), all stored code files of the current database/workspace are deleted immediately.

You can

[Force a New Build during Code Generation](ForceaNewbuild.md)

[Discarding the Generated Code](DiscardCode.md)

See also

[External Code Storage](ProjectEditorEnglishUS.chm::/PE_ExternalCodeStorage.htm)

[Optimizing a Database](Optimize.md)
