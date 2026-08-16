| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: SetDataLoggerFile

##### Name

SetDataLoggerFile

##### Description

Preset the name and location of the measure file in the data logger. This file name will be used when the data logger will be stopped for the next time. Return an error in case of: - Invalid file name. - No data logger open.

##### Parameters

| Name | Type | Direction | Description |
| --- | --- | --- | --- |
| filePathName | string | Input | File name for the target log file. |

##### Parameters

filePathName

**Type:**string

File name for the target log file.

##### Returns

A value of type string.

##### Example

SetDataLoggerFile("d:\ETASData\ASCET6.0\test.dat")

##### Remarks

API-Result-Codes: 0 1011 Invalid file name. 1012 No open data logger found.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |
