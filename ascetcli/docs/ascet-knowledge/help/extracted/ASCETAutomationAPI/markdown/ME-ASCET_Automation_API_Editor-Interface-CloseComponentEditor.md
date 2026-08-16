| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: CloseComponentEditor

##### Name

CloseComponentEditor

##### Description

Lookup for an open editor for the specified component. Close this editor by performing the windows close action. Return an error in case of: - No database open. - Item not found in database. - Editor could not be closed.

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

CloseComponentEditor("Root\Class_Block_Diagram")

##### Remarks

API-Result-Codes: 0 1001 Invalid path name. 1002 Item not found in database. 1003 Item not loadable. 1004 No database. 1005 Operation failed. 1006 Path not found in database. 1018 Invalid component path. 1047 Operation not supported in server mode.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |
