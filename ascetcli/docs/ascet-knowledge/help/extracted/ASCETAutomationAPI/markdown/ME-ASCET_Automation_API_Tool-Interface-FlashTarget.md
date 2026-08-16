| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: FlashTarget

##### Name

FlashTarget

##### Description

The reconnect command will provide the possibility to experiment with an already running model on a target. The behavior is quiet similar to the open experiment command. The main difference is the circumstance that the model code will not be downloaded. The flash command will provide the possibility to store the executable of the model into the flash memory of a rapid prototyping hardware. If the component is no project the method will not use the default project to open the experiment. Return an error in case of: - No database open. - Item not found in database. - Invalid component specified. - Autosar project specified. - Hardware not defined.

##### Parameters

| Name | Type | Direction | Description |
| --- | --- | --- | --- |
| componentPathName | string | Input | Hierarchical database path of the component. The database path has to be specified as absolute path and must not start with a slash. The folders have to be separated by using a backslash. |

##### Parameters

componentPathName

**Type:**string

Hierarchical database path of the component. The database path has to be specified as absolute path and must not start with a slash. The folders have to be separated by using a backslash.

##### Returns

A value of type string.

##### Example

FlashTarget("OfflinePC\Project")

##### Remarks

API-Result-Codes: -1000 No system available. 0 1001 Invalid path name. 1002 Item not found in database. 1003 Item not loadable. 1004 No database. 1005 Operation failed. 1006 Path not found in database. 1007 Invalid operation. 1013 Operation is not available. 1015 Hardware not found. 1016 Hardware not defined. 1018 Invalid component path.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |
