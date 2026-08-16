| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: OpenDatabase

##### Name

OpenDatabase

##### Description

Open the database specified by the file system location. If the current database matches to the specified file system location the method ends immediatelly. All opened windows and the current database will be closed first. Return an error in case of: - The current database could not be closed. - The database is not compatible to the current ASCET version. - The file system location is not valid.

##### Parameters

| Name | Type | Direction | Description |
| --- | --- | --- | --- |
| databasePath | string | Input | File system path for the ASCET database. |

##### Parameters

databasePath

**Type:**string

File system path for the ASCET database.

##### Returns

A value of type string.

##### Example

OpenDatabase("C:\temp\CGenOptions")

##### Remarks

API-Result-Codes: 0 1001 Invalid path name. 1004 No database. 1005 Operation failed. 1008 Incompatible database version. 1008 Incompatible database. 1021 A long lasting action is running. 1023 Data logging is running.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |
