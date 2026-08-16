| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: StepExperiment

##### Name

StepExperiment

##### Description

Perform the step experiment action for an experiment which is opened in offline mode. If a data logger is present start the data logger at first and stop it after the step condition is reach. The method will return after the abort condition is reached. Return an error in case of: - No experiment open. - Experiment is not in offline mode. - Step mode could not be activated. - Data Generator not activated. - Channels with unmapped signal available. - No signals defined for channels with signalled mode.

##### Returns

A value of type string.

##### Example

StepExperiment()

##### Remarks

API-Result-Codes: 0 1005 Operation failed. 1007 Invalid operation. 1009 No open experiment found. 1032 Event Generator has no event to activate your code.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |
