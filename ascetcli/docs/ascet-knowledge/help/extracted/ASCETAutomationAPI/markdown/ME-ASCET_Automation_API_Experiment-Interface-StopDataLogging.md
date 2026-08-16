| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: StopDataLogging

##### Name

StopDataLogging

##### Description

Stop a running data logger in an experiment. To ensure that no data will be lost it is important to stop the data logger after stopping the experiment. Return an error in case of: - No experiment open. - Data Generator not present. - Data Logger is not started.

##### Returns

A value of type string.

##### Example

StopDataLogging()

##### Remarks

API-Result-Codes: 0 1005 Operation failed. 1009 No open experiment found. 1012 No open data logger found.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |
