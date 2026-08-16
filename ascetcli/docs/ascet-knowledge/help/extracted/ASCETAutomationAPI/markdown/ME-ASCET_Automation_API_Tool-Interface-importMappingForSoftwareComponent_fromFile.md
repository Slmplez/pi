| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: importMappingForSoftwareComponent_fromFile

##### Name

importMappingForSoftwareComponent_fromFile

##### Description

Import the mappings for the specified component from a XML or CSV file. The input file format will be derived from the file extension of the specified file name. Return an error in case of: - No database open. - Item not found in database. - Invalid component specified. - Invalid file name. - export action failed.

##### Parameters

| Name | Type | Direction | Description |
| --- | --- | --- | --- |
| importMappingForSoftwareComponent | string | Input |  |
| fromFile | string | Input |  |

##### Parameters

importMappingForSoftwareComponent

**Type:**string

fromFile

**Type:**string

##### Returns

A value of type string.

##### Example

ImportMappingForSoftwareComponentFromFile("Instances\mySWC", "D:\EtasData\ASCET6.3\Export\mapEHooks.csv")

##### Remarks

API-Result-Codes: 0 1001 Invalid path name. 1002 Item not found in database. 1003 Item not loadable. 1005 Operation failed. 1006 Path not found in database. 1011 Invalid file name. 1014 Invalid argument.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |
