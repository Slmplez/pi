| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: WriteAsam2MCToFile

##### Name

WriteAsam2MCToFile

##### Description

Create an Asam2MC file for the specified component by using the specified file name. If the component is no project the default project for the component will be used as context. If the file path name does not include an absolut dircetory location the current working directory will be used. Return an error in case of: - Specified path is not valid. - No database open. - Item not found in database. - Invalid component specified. - Internal error occured in writing the asap file.

##### Parameters

| Name | Type | Direction | Description |
| --- | --- | --- | --- |
| componentPathName | string | Input | Hierarchical database path of the component. The database path has to be specified as absolute path and must not start with a slash. The folders have to be separated by using a backslash. |
| filePathName | string | Input | File name for the created ASAM2MC file. |

##### Parameters

componentPathName

**Type:**string

Hierarchical database path of the component. The database path has to be specified as absolute path and must not start with a slash. The folders have to be separated by using a backslash.

filePathName

**Type:**string

File name for the created ASAM2MC file.

##### Returns

A value of type string.

##### Example

WriteAsam2MCToFile("Root\Class", "c:\temp\asap\test.a2l")

##### Remarks

API-Result-Codes: 0 1001 Invalid path name. 1002 Item not found in database. 1003 Item not loadable. 1004 No database. 1005 Operation failed. 1006 Path not found in database. 1007 Invalid operation. 1011 Invalid file name. 1018 Invalid component path. 1021 A long lasting action is running. 1022 Invalid target in project.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |
