| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: ExportItemToPath

##### Name

ExportItemToPath

##### Description

Lookup for the specified component and export it to the specified path. Depending on the tool option 'Create Complete Hierarchy' the folder structure of the database will be used to arrange the component on the file system or not. Using an asterisk as parameter for the componentPathName will export the top folders. Return an error in case of: - No database open. - Item not found in database. - Invalid component specified. - path name is not valid. - export action failed.

##### Parameters

| Name | Type | Direction | Description |
| --- | --- | --- | --- |
| componentPathName | string | Input | Hierarchical database path of the component. The database path has to be specified as absolute path and must not start with a slash. The folders have to be separated by using a backslash. |
| outputPath | string | Input | Directory path on the file system used as root directory for the export. |

##### Parameters

componentPathName

**Type:**string

Hierarchical database path of the component. The database path has to be specified as absolute path and must not start with a slash. The folders have to be separated by using a backslash.

outputPath

**Type:**string

Directory path on the file system used as root directory for the export.

##### Returns

A value of type string.

##### Example

ExportItemToPath("Instances\P1", "c:\temp\")

##### Remarks

API-Result-Codes: 0 1001 Invalid path name. 1002 Item not found in database. 1003 Item not loadable. 1004 No database. 1005 Operation failed. 1006 Path not found in database. 1018 Invalid component path. 1021 A long lasting action is running.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |
