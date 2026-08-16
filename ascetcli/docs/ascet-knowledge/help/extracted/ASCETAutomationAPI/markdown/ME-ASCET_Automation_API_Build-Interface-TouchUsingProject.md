| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: TouchUsingProject

##### Name

TouchUsingProject

##### Description

Perform the touch flat command for a special component instance in the specified component. If the context component is no project the default project of this component will be used as context. The component instance has to be specified by its hierarchical element path name. Using the reserved name 'self' as hierarchical element path will perform the action for the specified component itself. Return an error in case of: - No database open. - Item not found in database. - Invalid component specified. - Target settings are not consistent. - Invalid element path name specified. - Internal error occured in touch flat.

##### Parameters

| Name | Type | Direction | Description |
| --- | --- | --- | --- |
| elementPathName | string | Input | Hierarchical element path inside of the component. The element path has to be specified as absolute path and must not start with a slash. The element path has to be separated by using a backslash. |
| componentPathName | string | Input | Hierarchical database path of the component. The database path has to be specified as absolute path and must not start with a slash. The folders have to be separated by using a backslash. |

##### Parameters

elementPathName

**Type:**string

Hierarchical element path inside of the component. The element path has to be specified as absolute path and must not start with a slash. The element path has to be separated by using a backslash.

componentPathName

**Type:**string

Hierarchical database path of the component. The database path has to be specified as absolute path and must not start with a slash. The folders have to be separated by using a backslash.

##### Returns

A value of type string.

##### Example

TouchUsingProject("module", "Root\Project")

##### Remarks

API-Result-Codes: 0 1001 Invalid path name. 1002 Item not found in database. 1003 Item not loadable. 1004 No database. 1005 Operation failed. 1006 Path not found in database. 1007 Invalid operation. 1017 Invalid element path. 1018 Invalid component path. 1021 A long lasting action is running. 1022 Invalid target in project.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |
