| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: WritePhysicalScalarValue

##### Name

WritePhysicalScalarValue

##### Description

Set the current physical value for the specified scalar element. If the same element is represented within a calibration editor, this editor will be updated to the new value. Return an error in case of: - No experiment open. - Specified element not found. - Element is calibartion element. - Cannot read from target.

##### Parameters

| Name | Type | Direction | Description |
| --- | --- | --- | --- |
| labelName | string | Input | Hierarchical model path for the element. The path has to be specified as absolute path and must not start with a slash. The path must start with the top node (project) and ends at the element. Global elements must not be specified by a hierarchical path. Use their unique name instead. The hierarchies have to be separated by using a backslash. |
| value | string | Input |  |

##### Parameters

labelName

**Type:**string

Hierarchical model path for the element. The path has to be specified as absolute path and must not start with a slash. The path must start with the top node (project) and ends at the element. Global elements must not be specified by a hierarchical path. Use their unique name instead. The hierarchies have to be separated by using a backslash.

value

**Type:**string

##### Returns

A value of type string.

##### Example

WritePhysicalScalarValue("Project\farben", "blau")

##### Remarks

API-Result-Codes: 0 1002 Label not found. 1007 Invalid operation. 1009 No open experiment found. 1014 Invalid argument.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |
