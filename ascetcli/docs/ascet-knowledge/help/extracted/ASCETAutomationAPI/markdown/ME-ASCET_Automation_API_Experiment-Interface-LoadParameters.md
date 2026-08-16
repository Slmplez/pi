| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: LoadParameters

##### Name

LoadParameters

##### Description

Read in the specified DCM style parameter file into the experiment. All entries of the parameter file will be read. Parameters as well as none volatile variables. The popup of the log file after read will be suppressed. Return an error in case of: - Experiment no open. - file path name is no valid. - Internal problem while reading.

##### Parameters

| Name | Type | Direction | Description |
| --- | --- | --- | --- |
| filePathName | string | Input | File name for the DCM file to load. |

##### Parameters

filePathName

**Type:**string

File name for the DCM file to load.

##### Returns

A value of type string.

##### Example

LoadParameters("c:\etas\ascet6.0\dcm\test.dcm")

##### Remarks

API-Result-Codes: 0 1005 Operation failed. 1009 No open experiment found. 1011 Invalid file name.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |
