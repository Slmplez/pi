| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: OpenWorkspace

##### Name

OpenWorkspace

##### Description

Open the workspace specified by the related *.aws file. If the file path name of the specified workspace matches to the current workspace the method end immediatelly. All opened windows and the current data storage will be closed first. Return an error in case of: - The current data storage could not be closed. - The file system location is not valid.

##### Parameters

| Name | Type | Direction | Description |
| --- | --- | --- | --- |
| workspaceFilePath | string | Input | File system path to the *.aws file of the workspace. |

##### Parameters

workspaceFilePath

**Type:**string

File system path to the *.aws file of the workspace.

##### Returns

A value of type string.

##### Example

OpenWorkspace("D:\ETASData\ASCET6.1\Workspaces\TUTORIAL\TUTORIAL.aws")

##### Remarks

API-Result-Codes: 0 1005 Operation failed. 1021 A long lasting action is running. 1023 Data logging is running. 1040 No workspace.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |
