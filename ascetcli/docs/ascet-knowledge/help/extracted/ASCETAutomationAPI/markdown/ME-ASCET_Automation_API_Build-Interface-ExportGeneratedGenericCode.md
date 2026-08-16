| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: ExportGeneratedGenericCode

##### Name

ExportGeneratedGenericCode

##### Description

Perform the export generated code for microController targets (ECCO code) for the specified component. In case that the specified component is no project, than the default project will be used as project context for the component. The generated code for the specified component and for all referenced components will be written to the specified directory. Return an error in case of: - No database open. - Item not found in database. - Specified dircetory is not valid.

##### Parameters

| Name | Type | Direction | Description |
| --- | --- | --- | --- |
| componentPathName | string | Input | Hierarchical database path of the component. The database path has to be specified as absolute path and must not start with a slash. The folders have to be separated by using a backslash. |
| pathName | string | Input | Directory path to file out the generated code. |

##### Parameters

componentPathName

**Type:**string

Hierarchical database path of the component. The database path has to be specified as absolute path and must not start with a slash. The folders have to be separated by using a backslash.

pathName

**Type:**string

Directory path to file out the generated code.

##### Returns

A value of type string.

##### Example

ExportGeneratedGenericCode("Root\Project", "C:\temp\code")

##### Remarks

API-Result-Codes: 0 1001 Invalid path name. 1002 Item not found in database. 1003 Item not loadable. 1004 No database. 1005 Operation failed. 1006 Path not found in database. 1007 Invalid operation. 1018 Invalid component path. 1021 A long lasting action is running. 1022 Invalid target in project.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |
