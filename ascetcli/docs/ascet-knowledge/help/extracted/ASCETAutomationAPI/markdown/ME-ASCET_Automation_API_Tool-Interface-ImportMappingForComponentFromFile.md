| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: ImportMappingForComponentFromFile

##### Name

ImportMappingForComponentFromFile

##### Description

Import the mappings for the specified component from a XML or CSV file. The input file format will be derived from the file extension of the specified file name. Return an error in case of: - No database open. - Item not found in database. - Invalid component specified. - Invalid file name. - export action failed.

##### Parameters

| Name | Type | Direction | Description |
| --- | --- | --- | --- |
| componentPathName | string | Input | Hierarchical database path of the component. The database path has to be specified as absolute path and must not start with a slash. The folders have to be separated by using a backslash. |
| filePathName | string | Input | Source file for the import. Use *.xml or *.csv as file extension. |

##### Parameters

componentPathName

**Type:**string

Hierarchical database path of the component. The database path has to be specified as absolute path and must not start with a slash. The folders have to be separated by using a backslash.

filePathName

**Type:**string

Source file for the import. Use *.xml or *.csv as file extension.

##### Returns

A value of type string.

##### Example

ImportMappingForComponentFromFile("Instances\mySWC", "D:\EtasData\ASCET6.3\Export\mapEHooks.csv")

##### Remarks

API-Result-Codes: 0 1001 Invalid path name. 1002 Item not found in database. 1003 Item not loadable. 1004 No database. 1005 Operation failed. 1006 Path not found in database. 1011 Invalid file name. 1014 Invalid argument. 1018 Invalid component path.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |
