| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: SaveParameters

##### Name

SaveParameters

##### Description

Write all parameters of the experiment into the specified DCM style parameter file. Parameters as well as none volatile variables will be considered. The popup of the log file after read will be suppressed. Return an error in case of: - Experiment no open. - file path name is not valid. - Internal problem while writing.

##### Parameters

| Name | Type | Direction | Description |
| --- | --- | --- | --- |
| filePathName | string | Input | File name for the DCM file to save. |

##### Parameters

filePathName

**Type:**string

File name for the DCM file to save.

##### Returns

A value of type string.

##### Example

SaveParameters("c:\etas\ascet6.0\dcm\test.dcm")

##### Remarks

API-Result-Codes: 0 1005 Operation failed. 1009 No open experiment found. 1011 Invalid file name.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |
