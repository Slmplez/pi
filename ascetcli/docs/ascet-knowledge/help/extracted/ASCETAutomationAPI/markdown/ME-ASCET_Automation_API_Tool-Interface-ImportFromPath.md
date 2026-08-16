| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: ImportFromPath

##### Name

ImportFromPath

##### Description

Import all available components stored in the specified file system directory. The current setting of the import options "Keep Hierarchy" and "Remap OIDs" are ignored by this function. The default values "Keep Hierarchy = true" and "Remap OIDs = false" are used instead. Return an error in case of: - No database open. - path name is not valid. - no item imported. - import problems detected. - import action failed.

##### Parameters

| Name | Type | Direction | Description |
| --- | --- | --- | --- |
| pathName | string | Input | Specify the file system directory for the amd files. |

##### Parameters

pathName

**Type:**string

Specify the file system directory for the amd files.

##### Returns

A value of type string.

##### Example

ImportFromPath("c:\temp\instances\")

##### Remarks

API-Result-Codes: -1002 Problem detected during import. 0 1001 Invalid path name. 1004 No database. 1005 Operation failed. 1021 A long lasting action is running. 1037 No item imported. 1038 Unfixable problem detected during import.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |
