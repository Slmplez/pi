| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: WriteToolOptions

##### Name

WriteToolOptions

##### Description

Write the specified option file in xml style which contains the values of the ASCET options. Return an error in case of: - file name is not valid. - writing xml options failed.

##### Parameters

| Name | Type | Direction | Description |
| --- | --- | --- | --- |
| filePathName | string | Input | Specify the xml file which will be created with the option values of ASCET. |

##### Parameters

filePathName

**Type:**string

Specify the xml file which will be created with the option values of ASCET.

##### Returns

A value of type string.

##### Example

WriteToolOptions("c:\temp\asd_options.xml")

##### Remarks

API-Result-Codes: 0 1005 Operation failed. 1011 Invalid file name.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |
