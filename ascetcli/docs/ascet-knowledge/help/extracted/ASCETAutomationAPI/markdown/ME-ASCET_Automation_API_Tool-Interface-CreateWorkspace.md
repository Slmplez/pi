| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: CreateWorkspace

##### Name

CreateWorkspace

##### Description

Create a new workspace in the file system at the location by using the specified file path. If the path for the new workspace does not exist it will be created. If the specified file path does not contain an ASCET workspace file name (*.aws) an error result will be created. If the specified file path does not contain at least one folder an error result will be created. If the workspace already exists an error result will be created. If the current used data storage is locked an error result will be created. If the specified workspace file path is not an absolute path in the file system then the current workspace path will be used as prefix for the path. If there are further *.aws files in the same directory an error result will be created. All opened windows and the current database will be closed. Return an error in case of: - The specified path is not valid (Error 1001). - No additional folder for the *.aws file is specified (Error 1001). - The workspace already exists (Error 1044). - The current data storage is locked (Error 1043). - A system reserved file name is used (Error 1001). - The target directory is not empty (Error 1001). - The current opened data storage could not be closed (Error 1005). - The new database could not be created (Error 1005).

##### Parameters

| Name | Type | Direction | Description |
| --- | --- | --- | --- |
| workspaceFilePath | string | Input | File path name for the workspace file (*.aws) on the file system. |

##### Parameters

workspaceFilePath

**Type:**string

File path name for the workspace file (*.aws) on the file system.

##### Returns

A value of type string.

##### Example

CreateWorkspace("D:\ETASData\ASCET6.2\Workspaces\myWorkspace\myWorkspace.aws")

##### Remarks

API-Result-Codes: 0 1001 Invalid path name. 1005 Operation failed. 1021 A long lasting action is running. 1023 Data logging is running. 1043 Current data storage is locked. 1044 Data storage already exists.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |
