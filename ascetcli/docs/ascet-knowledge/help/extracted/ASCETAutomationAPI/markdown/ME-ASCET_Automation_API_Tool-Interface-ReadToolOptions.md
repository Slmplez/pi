| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: ReadToolOptions

##### Name

ReadToolOptions

##### Description

Set the options for ASCET according to the settings in the specified file. Return an error in case of: - file name is not valid. - reading xml options failed.

##### Parameters

| Name | Type | Direction | Description |
| --- | --- | --- | --- |
| filePathName | string | Input | Specify the xml file on the file system which contains the new option values for ASCET. |

##### Parameters

filePathName

**Type:**string

Specify the xml file on the file system which contains the new option values for ASCET.

##### Returns

A value of type string.

##### Example

ReadToolOptions("c:\temp\asd_options.xml")

##### Remarks

API-Result-Codes: 0 1005 Operation failed. 1011 Invalid file name. 1028 File not readable. 1029 XML Parser error. 1030 Invalid XML document. 1031 Invalid option value detected.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |
