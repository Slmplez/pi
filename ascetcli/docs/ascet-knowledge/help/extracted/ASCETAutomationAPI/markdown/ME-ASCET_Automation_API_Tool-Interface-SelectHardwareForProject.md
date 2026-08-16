| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: SelectHardwareForProject

##### Name

SelectHardwareForProject

##### Description

Assign a available system to the specified project. If a component is specified instead of a project the assignment will be performed with its default project. In case that more than one system is available which matches to the project the desired system must be selected by specifying its serial number. If there is only one system availbale which matches to the project any empty string could be passed as serial number. Return an error in case of: - No valid component or project specified. - Hardware not found.

##### Parameters

| Name | Type | Direction | Description |
| --- | --- | --- | --- |
| serialNumber | string | Input | Serial number for the hardware which has to be used for the project. |
| projectPathName | string | Input | Hierarchical database path of the project. |

##### Parameters

serialNumber

**Type:**string

Serial number for the hardware which has to be used for the project.

projectPathName

**Type:**string

Hierarchical database path of the project.

##### Returns

A value of type string.

##### Example

SelectHardwareForProject("100017", "OfflineRP\Project_ES1135_hoch")

##### Remarks

API-Result-Codes: -1000 No system available. 0 1001 Invalid path name. 1002 Item not found in database. 1003 Item not loadable. 1004 No database. 1006 Path not found in database. 1007 Invalid operation. 1013 Operation is not available. 1015 Hardware not found. 1018 Invalid component path. 1021 A long lasting action is running.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |
