| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: TransferFiles

##### Name

TransferFiles

##### Description

Perform the transfer of generated code for the specified component to the specified place. Files of type .c .h .six .a2l are managed. If the component is no project the default project for the component will be used as context. Return an error in case of: - No database open. - Item not found in database. - Invalid component specified. - Invalid path specified. - Target settings are not consistent. - Internal error occured in code generation.

##### Parameters

| Name | Type | Direction | Description |
| --- | --- | --- | --- |
| componentPathName | string | Input | Hierarchical database path of the component. The database path has to be specified as absolute path and must not start with a slash. The folders have to be separated by using a backslash. |
| filePathName | string | Input | Name of the Folder of the file system. If the parameter is empty, the default code generation path is used. The folders have to be separated by using a backslash. |

##### Parameters

componentPathName

**Type:**string

Hierarchical database path of the component. The database path has to be specified as absolute path and must not start with a slash. The folders have to be separated by using a backslash.

filePathName

**Type:**string

Name of the Folder of the file system. If the parameter is empty, the default code generation path is used. The folders have to be separated by using a backslash.

##### Returns

A value of type string.

##### Example

TransferFiles("Root\Project", "c:\temp")

##### Remarks

API-Result-Codes: 0 1001 Invalid path name. 1002 Item not found in database. 1003 Item not loadable. 1004 No database. 1005 Operation failed. 1006 Path not found in database. 1007 Invalid operation. 1018 Invalid component path. 1021 A long lasting action is running. 1022 Invalid target in project.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |
