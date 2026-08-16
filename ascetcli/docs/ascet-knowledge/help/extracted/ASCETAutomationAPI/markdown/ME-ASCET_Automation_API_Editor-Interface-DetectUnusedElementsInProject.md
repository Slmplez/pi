| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: DetectUnusedElementsInProject

##### Name

DetectUnusedElementsInProject

##### Description

Perform the "Show unused elements" Project-global analysis. If a component is specified instead of a project the analysis will be performed with its default project. Return an error in case of: - No valid component or project specified.

##### Parameters

| Name | Type | Direction | Description |
| --- | --- | --- | --- |
| projectPathName | string | Input | Hierarchical database path of the project. |

##### Parameters

projectPathName

**Type:**string

Hierarchical database path of the project.

##### Returns

A value of type string.

##### Example

DetectUnusedElementsInProject("OfflineRP\Project_ES1135_hoch")

##### Remarks

API-Result-Codes: 1001 Invalid path name. 1002 Item not found in database. 1003 Item not loadable. 1004 No database. 1006 Path not found in database. 1014 Invalid argument. 1018 Invalid component path.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |
