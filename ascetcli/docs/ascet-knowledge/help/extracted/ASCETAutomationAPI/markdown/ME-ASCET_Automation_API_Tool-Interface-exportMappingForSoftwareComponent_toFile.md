| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: exportMappingForSoftwareComponent_toFile

##### Name

exportMappingForSoftwareComponent_toFile

##### Description

Export the mappings for the specified component into a XML or CSV file. The output file format will be derived from the file extension of the specified file name. Return an error in case of: - No database open. - Item not found in database. - Invalid component specified. - Invalid file name. - export action failed.

##### Parameters

| Name | Type | Direction | Description |
| --- | --- | --- | --- |
| exportMappingForSoftwareComponent | string | Input |  |
| toFile | string | Input |  |

##### Parameters

exportMappingForSoftwareComponent

**Type:**string

toFile

**Type:**string

##### Returns

A value of type string.

##### Example

ExportMappingForSoftwareComponentToFile("Instances\mySWC", "D:\EtasData\ASCET6.3\Export\mapEHooks.csv")

##### Remarks

API-Result-Codes: 0 1001 Invalid path name. 1002 Item not found in database. 1003 Item not loadable. 1004 No database. 1005 Operation failed. 1006 Path not found in database. 1014 Invalid argument. 1018 Invalid component path.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |
