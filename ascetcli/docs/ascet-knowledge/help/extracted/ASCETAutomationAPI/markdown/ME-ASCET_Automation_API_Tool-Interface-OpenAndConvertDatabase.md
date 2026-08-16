| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: OpenAndConvertDatabase

##### Name

OpenAndConvertDatabase

##### Description

Open the database specified by the file system location and convert the database if necessary. If the current database matches the specified file system location the method end immediatelly. If a conversion of the database must be performed this may take a long time. Please ensure that a backup of the database exists before calling this method. All opened windows and the current database will be closed first. Return an error in case of: - The current database could not be closed. - The database is not compatible to the current ASCET version. - The file system location is not valid. - The database could not been converted. - The conversion is aborted due to an internal problen.

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

OpenAndConvertDatabase("C:\temp\CGenOptions")

##### Remarks

API-Result-Codes: 0 1001 Invalid path name. 1004 No database. 1005 Operation failed. 1008 Incompatible database version. 1008 Incompatible database. 1021 A long lasting action is running. 1023 Data logging is running.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |
