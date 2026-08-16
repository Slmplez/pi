| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: OpenComponentEditorForElement

##### Name

OpenComponentEditorForElement

##### Description

Open a specification editor for a special component instance in the specified component. If the context component is no project the default project of this component will be used as context. The component instance has to be specified by its hierarchical element path name. Using the reserved name 'self' as hierarchical element path will open the editor for the specified component itself. Using an empty string as hierarchical element path will open the editor for the specified component itself. The editor will be opened as a child of the component manager. Return an error in case of: - No database open. - Item not found in database. - Editor for the resolved component is already open. - Editor could not be opened.

##### Parameters

| Name | Type | Direction | Description |
| --- | --- | --- | --- |
| componentPathName | string | Input | Hierarchical database path of the component. The database path has to be specified as absolute path and must not start with a slash. The folders have to be separated by using a backslash. |
| elementPathName | string | Input | Hierarchical element path inside of the component. The element path has to be specified as absolute path and must not start with a slash. The element path has to be separated by using a backslash. |

##### Parameters

componentPathName

**Type:**string

Hierarchical database path of the component. The database path has to be specified as absolute path and must not start with a slash. The folders have to be separated by using a backslash.

elementPathName

**Type:**string

Hierarchical element path inside of the component. The element path has to be specified as absolute path and must not start with a slash. The element path has to be separated by using a backslash.

##### Returns

A value of type string.

##### Example

OpenComponentEditorForElement("Root\Project", "module")

##### Remarks

API-Result-Codes: 0 1001 Invalid path name. 1002 Item not found in database. 1003 Item not loadable. 1004 No database. 1005 Operation failed. 1006 Path not found in database. 1007 Invalid operation. 1014 Invalid argument. 1017 Invalid element path. 1018 Invalid component path. 1020 Another editor is already open. 1047 Operation not supported in server mode.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |
