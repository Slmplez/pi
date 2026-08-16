| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: SelectComponent

##### Name

SelectComponent

##### Description

Select the specified component in the component mananger. Return an error in case of: - No database open. - Item not found in database.

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

OpenComponentEditor("Root\Class_Block_Diagram")

##### Remarks

API-Result-Codes: 0 1001 Invalid path name. 1002 Item not found in database. 1003 Item not loadable. 1004 No database. 1005 Operation failed. 1006 Path not found in database. 1018 Invalid component path. 1047 Operation not supported in server mode.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |
