| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: WriteMonitorContentsToPath

##### Name

WriteMonitorContentsToPath

##### Description

Write the current contents of the monitor into a file. The monitor contents will not be cleared afterwards. In the specified directory a file named 'logger.log' will be created with the current contents of the page 'Monitor'. The contents of the page 'Build' will be written into the same directory in a file named 'build.log'. Return an error in case of: - The files cannot be created.

##### Parameters

| Name | Type | Direction | Description |
| --- | --- | --- | --- |
| pathName | string | Input | Directory path for the created log files. |

##### Parameters

pathName

**Type:**string

Directory path for the created log files.

##### Returns

A value of type string.

##### Example

WriteMonitorContentsToPath("e:\temp\")

##### Remarks

API-Result-Codes: 0 1001 Invalid path name. 1005 Operation failed.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |
