# Force a New Build during Code Generation

During code generation, a make operation is performed, i.e. the code is generated and compiled for new or changed items only. Sometimes you may want to make sure that a build operation is performed, i.e. code is newly generated and compiled, for all items.

To force a new build during code generation, proceed as follows:

- In the Build menu, select Touch All.

All components in the database or workspace are marked as changed (although no actual changes occurred). Thus you ensure that next time, new code is generated and compiled.

If you are using [external code storage](ProjectEditorEnglishUS.chm::/PE_ExternalCodeStorage.htm), all stored code files of the current database/workspace become invalid. They are deleted or overwritten during the next code generation run.

Forcing a new build can be very time-consuming if you are working on a large database or workspace.

See also

[Discarding the Generated Code](DiscardCode.md)
