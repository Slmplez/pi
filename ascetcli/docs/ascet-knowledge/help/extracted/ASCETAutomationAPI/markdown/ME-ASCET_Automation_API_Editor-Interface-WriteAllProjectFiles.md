| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: WriteAllProjectFiles

##### Name

WriteAllProjectFiles

##### Description

Write the project files for the specified component. Return an error in case of: - No database open. (Error: 1004) - Item not found in database. (Error: 1018, 1002) - Specified component is not a project. (Error: 1014) - Target path for project files missing. (Error: 1001)

##### Parameters

| Name | Type | Direction | Description |
| --- | --- | --- | --- |
| componentPathName | string | Input | Hierarchical database path of the project. The database path has to be specified as absolute path and must not start with a slash. The folders have to be separated by using a backslash. |

##### Parameters

componentPathName

**Type:**string

Hierarchical database path of the project. The database path has to be specified as absolute path and must not start with a slash. The folders have to be separated by using a backslash.

##### Returns

A value of type string.

##### Example

WriteAllProjectFiles("Root\TEST_COD01_CE_B_CHARTABLE2Dp")

##### Remarks

API-Result-Codes: 0 1001 Invalid path name. 1002 Item not found in database. 1003 Item not loadable. 1004 No database. 1006 Path not found in database. 1014 Invalid argument. 1018 Invalid component path.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |
