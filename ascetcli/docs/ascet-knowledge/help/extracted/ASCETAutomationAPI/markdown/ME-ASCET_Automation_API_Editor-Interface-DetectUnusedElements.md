| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: DetectUnusedElements

##### Name

DetectUnusedElements

##### Description

Perform the "Show unused elements" Component-local analysis. As context for the analysis the specified implementation and data set is used as well as the specified project. If an empty string is passed for the impl argument the default implementation set is used. If an empty string is passed for the data argument the default data set is used. If an empty string is passed for the project argument the default project of the component is used. Return an error in case of: - No valid component specified.

##### Parameters

| Name | Type | Direction | Description |
| --- | --- | --- | --- |
| componentPathName | string | Input | Hierarchical database path of the component. |
| implementationName | string | Input | Name of the implementation set. |
| dataName | string | Input | Name of the data set. |
| projectPathName | string | Input | Hierarchical database path of the component. |

##### Parameters

componentPathName

**Type:**string

Hierarchical database path of the component.

implementationName

**Type:**string

Name of the implementation set.

dataName

**Type:**string

Name of the data set.

projectPathName

**Type:**string

Hierarchical database path of the component.

##### Returns

A value of type string.

##### Example

DetectUnusedElements("Root\Project", "", "", "")

##### Remarks

API-Result-Codes: 1001 Invalid path name. 1002 Item not found in database. 1003 Item not loadable. 1004 No database. 1006 Path not found in database. 1014 Invalid argument. 1018 Invalid component path.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |
