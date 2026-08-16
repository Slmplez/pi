| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: ImportFromZipFile

##### Name

ImportFromZipFile

##### Description

Import all components stored in the specified axl/zip file. The current setting of the import options "Keep Hierarchy" and "Remap OIDs" are ignored by this function. The default values "Keep Hierarchy = true" and "Remap OIDs = false" are used instead. Return an error in case of: - No database open. - file name is not valid. - no item imported. - import problems detected. - import action failed.

##### Parameters

| Name | Type | Direction | Description |
| --- | --- | --- | --- |
| zipFilePathName | string | Input | Specify the axl/zip file on the file system which has to be imported. |

##### Parameters

zipFilePathName

**Type:**string

Specify the axl/zip file on the file system which has to be imported.

##### Returns

A value of type string.

##### Example

ImportFromZipFile("c:\temp\xmlBig.zip")

##### Remarks

API-Result-Codes: -1002 Problem detected during import. 0 1001 Invalid path name. 1004 No database. 1005 Operation failed. 1011 Invalid file name. 1021 A long lasting action is running. 1037 No item imported. 1038 Unfixable problem detected during import.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |
