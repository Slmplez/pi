| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: ReadPhysicalScalarValue

##### Name

ReadPhysicalScalarValue

##### Description

Return the current physical value of the specified scalar element. Return an error in case of: - No experiment open. - Specified element not found. - Element is no measure or calibartion element. - Cannot read from target.

##### Parameters

| Name | Type | Direction | Description |
| --- | --- | --- | --- |
| labelName | string | Input | Hierarchical model path for the element. The path has to be specified as absolute path and must not start with a slash. The path must start with the top node (project) and ends at the element. Global elements must not be specified by a hierarchical path. Use their unique name instead. The hierarchies have to be separated by using a backslash. |

##### Parameters

labelName

**Type:**string

Hierarchical model path for the element. The path has to be specified as absolute path and must not start with a slash. The path must start with the top node (project) and ends at the element. Global elements must not be specified by a hierarchical path. Use their unique name instead. The hierarchies have to be separated by using a backslash.

##### Returns

A value of type string.

##### Example

ReadPhysicalScalarValue("Project\farben")

##### Remarks

API-Result-Codes: 0 1002 Label not found. 1007 Invalid operation. 1009 No open experiment found. 1014 Invalid argument. 1025 Cannot read from target.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |
