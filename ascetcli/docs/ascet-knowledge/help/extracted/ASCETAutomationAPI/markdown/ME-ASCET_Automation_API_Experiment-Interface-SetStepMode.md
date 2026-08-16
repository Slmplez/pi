| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: SetStepMode

##### Name

SetStepMode

##### Description

Set the break condition for the step mode in the offline experiment. ASCET provides three different types for the break condition. Specifying a number of steps will trigger this amount of events when stepping in the experiment. The number of steps must be at least 1. Specifying a duration will run the experiment until the experiment time will reach this duration when started by the step command. The duration must be greater than 0.0. Specifying a condition depending on a model element will run the experiment until the condition evaluates to true. The name of the model element must be available in the model. The condition must be out of the set of available conditions. The level must be a valid float value. Return an error in case of: - No experiment open. - Experiment is not in offline mode. - Invalid argument specified. - Step number not greater than zero. - Duration not greater than 0.0. - Condition element not avaliable in model. - Condition operator not available. - Condition level not a valid float number.

##### Parameters

| Name | Type | Direction | Description |
| --- | --- | --- | --- |
| mode | string | Input |  |
| condition | string | Input |  |

##### Parameters

mode

**Type:**string

condition

**Type:**string

##### Returns

A value of type string.

##### Example

SetStepMode("Steps", "123") SetStepMode("Seconds", "1.2") SetStepMode("Condition", "cont >= 1.2")

##### Remarks

API-Result-Codes: 0 1007 Invalid operation. 1009 No open experiment found. 1014 Invalid argument.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |
