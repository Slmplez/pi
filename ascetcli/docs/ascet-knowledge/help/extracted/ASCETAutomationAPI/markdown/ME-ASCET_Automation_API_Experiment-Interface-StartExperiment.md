| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: StartExperiment

##### Name

StartExperiment

##### Description

Start an experiment which is opened in offline mode. If a data logger is present start the data logger at first. Return an error in case of: - No experiment open. - Experiment is not in offline mode. - Experiment could not be started. - Data Generator not activated. - Channels with unmapped signal available. - No signals defined for channels with signalled mode.

##### Returns

A value of type string.

##### Example

StartExperiment()

##### Remarks

API-Result-Codes: 0 1005 Operation failed. 1007 Invalid operation. 1009 No open experiment found. 1032 Event Generator has no event to activate your code.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |
