| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: OpenPropertyEditorForElement

##### Name

OpenPropertyEditorForElement

##### Description

Open a property element editor for an element in the specified component. The element has to be specified by its hierarchical path within the component. A previous hidden contents view in the component manager will be reactivated. The direkt parent component of the element will be selected in the tree pane of the component manager. The notebook in the contents view will be switched to the page 'Elements'. The element will be selected in the contents table list. The property editor will be opened in the context of the component manager as a child window. Return an error in case of: - No database open. - Item not found in database. - Invalid component specified. - Invalid element specified. - Component not selectable. - Component has no table list contents view. - Editor for element is already opened by API. - Editor could not be created with time. (Timeout is 5s).

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

OpenPropertyEditorForElement("module", "Root\Project")

##### Remarks

API-Result-Codes: 0 1001 Invalid path name. 1002 Item not found in database. 1003 Item not loadable. 1004 No database. 1005 Operation failed. 1006 Path not found in database. 1007 Invalid operation. 1014 Invalid argument. 1017 Invalid element path. 1018 Invalid component path. 1047 Operation not supported in server mode.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |
