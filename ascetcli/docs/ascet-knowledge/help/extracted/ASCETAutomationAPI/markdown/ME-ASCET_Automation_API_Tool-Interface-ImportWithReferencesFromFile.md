| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: ImportWithReferencesFromFile

##### Name

ImportWithReferencesFromFile

##### Description

Import the component stored in the specified amd file. Additionally all references of this component to other components which are available and visible within the directory tree of the specified component will be imported. The current setting of the import options "Keep Hierarchy" and "Remap OIDs" are ignored by this function. The default values "Keep Hierarchy = true" and "Remap OIDs = false" are used instead. Return an error in case of: - No database open. - file name is not valid. - no item imported. - import problems detected. - import action failed.

##### Parameters

| Name | Type | Direction | Description |
| --- | --- | --- | --- |
| filePathName | string | Input | Specify the amd file on the file system which has to be imported with all its references. |

##### Parameters

filePathName

**Type:**string

Specify the amd file on the file system which has to be imported with all its references.

##### Returns

A value of type string.

##### Example

ImportWithReferencesFromFile("c:\temp\instances\P1.main.amd")

##### Remarks

API-Result-Codes: -1002 Problem detected during import. 0 1001 Invalid path name. 1004 No database. 1005 Operation failed. 1011 Invalid file name. 1021 A long lasting action is running. 1037 No item imported. 1038 Unfixable problem detected during import.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |
