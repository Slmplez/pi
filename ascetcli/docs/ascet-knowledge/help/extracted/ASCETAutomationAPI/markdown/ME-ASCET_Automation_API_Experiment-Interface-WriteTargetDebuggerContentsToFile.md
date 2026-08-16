| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: WriteTargetDebuggerContentsToFile

##### Name

WriteTargetDebuggerContentsToFile

##### Description

Write the current available contents of the target debugger into a file. Reading the debug contents from the target will delete it automatically in the target buffer. If the target debug window is used and an update (automatically or manually) is performed this action will delete the current buffer on the target. Return an error in case of: - No experiment opened. - file name is not valid. - Accessing target debug buffer fails.

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

WriteTargetDebuggerContentsToFile("c:\temp\targetLog.txt")

##### Remarks

API-Result-Codes: 0 1005 Operation failed. 1009 No open experiment found. 1011 Invalid file name.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |
