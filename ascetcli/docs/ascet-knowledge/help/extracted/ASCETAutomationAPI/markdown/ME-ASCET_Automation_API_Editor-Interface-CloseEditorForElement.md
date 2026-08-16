| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: CloseEditorForElement

##### Name

CloseEditorForElement

##### Description

Close an element editor which was previously opened by the API. The element has to be specified by its hierarchical path within the specified component. Return an error in case of: - No database open. - Item not found in database. - Invalid component specified. - Invalid element specified. - Element editor not opened by API.

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

CloseEditorForElement("module", "Root\Project")

##### Remarks

API-Result-Codes: -1001 No open editor found for the specification 0 1001 Invalid path name. 1002 Item not found in database. 1003 Item not loadable. 1004 No database. 1005 Operation failed. 1006 Path not found in database. 1007 Invalid operation. 1017 Invalid element path. 1018 Invalid component path. 1047 Operation not supported in server mode.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |
