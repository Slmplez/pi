| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: WriteAsam2MCToPath

##### Name

WriteAsam2MCToPath

##### Description

Create an Asam2MC file for the specified component by using the specified directory. If the specified directory is not available it will be created. The generated file will get the same name as the component with the extension 'a2l'. If the component is no project the default project for the component will be used as context. Return an error in case of: - Specified dircetory is not valid. - No database open. - Item not found in database. - Invalid component specified. - Internal error occured in writing the asap file.

##### Parameters

| Name | Type | Direction | Description |
| --- | --- | --- | --- |
| componentPathName | string | Input | Hierarchical database path of the component. The database path has to be specified as absolute path and must not start with a slash. The folders have to be separated by using a backslash. |
| pathName | string | Input | Directory path for the created ASAM2MC file. |

##### Parameters

componentPathName

**Type:**string

Hierarchical database path of the component. The database path has to be specified as absolute path and must not start with a slash. The folders have to be separated by using a backslash.

pathName

**Type:**string

Directory path for the created ASAM2MC file.

##### Returns

A value of type string.

##### Example

WriteAsam2MCToPath("Root\Class", "c:\temp\asap")

##### Remarks

API-Result-Codes: 0 1001 Invalid path name. 1002 Item not found in database. 1003 Item not loadable. 1004 No database. 1005 Operation failed. 1006 Path not found in database. 1007 Invalid operation. 1011 Invalid file name. 1018 Invalid component path. 1021 A long lasting action is running. 1022 Invalid target in project.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |
