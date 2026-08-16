| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: CreateDatabase

##### Name

CreateDatabase

##### Description

Create a new database in the file system at the location by using the specified path. If the path for the new database does not exist it will be created. If the database already exists an error result will be created. If the current used data storage is locked an error result will be created. If the specified data base path is not an absolute path in the file system then the current data base path will be used as prefix for the path. All opened windows and the current database will be closed. Return an error in case of: - The specified path is not valid or the database could not be created in this path (Error 1001). - The database already exists (Error 1044). - The target directory is not empty (Error 1001). - The current data storage is locked (Error 1043). - The current opened data storage could not be closed (Error 1005). - The new database could not be created (Error 1005).

##### Parameters

| Name | Type | Direction | Description |
| --- | --- | --- | --- |
| databasePath | string | Input | File system path for the new ASCET database. |

##### Parameters

databasePath

**Type:**string

File system path for the new ASCET database.

##### Returns

A value of type string.

##### Example

CreateDatabase("C:\databases\myDatabase")

##### Remarks

API-Result-Codes: 0 1001 Invalid path name. 1005 Operation failed. 1021 A long lasting action is running. 1023 Data logging is running. 1043 Current data storage is locked. 1044 Data storage already exists.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |
