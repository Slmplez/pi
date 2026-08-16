| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: TouchRecursive

##### Name

TouchRecursive

##### Description

Perform the touch recursive command on for the specified component. If the component is no project the default project for the component will be used as context. Return an error in case of: - No database open. - Item not found in database. - Invalid component specified. - Target settings are not consistent. - Internal error occured in touch recursive.

##### Parameters

| Name | Type | Direction | Description |
| --- | --- | --- | --- |
| componentPathName | string | Input | Hierarchical database path of the component. The database path has to be specified as absolute path and must not start with a slash. The folders have to be separated by using a backslash. |

##### Parameters

componentPathName

**Type:**string

Hierarchical database path of the component. The database path has to be specified as absolute path and must not start with a slash. The folders have to be separated by using a backslash.

##### Returns

A value of type string.

##### Example

TouchRecursive("Root\Project")

##### Remarks

API-Result-Codes: 0 1001 Invalid path name. 1002 Item not found in database. 1003 Item not loadable. 1004 No database. 1005 Operation failed. 1006 Path not found in database. 1007 Invalid operation. 1018 Invalid component path. 1021 A long lasting action is running. 1022 Invalid target in project.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |
