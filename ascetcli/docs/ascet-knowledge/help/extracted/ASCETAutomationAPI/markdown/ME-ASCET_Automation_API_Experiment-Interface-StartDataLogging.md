| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: StartDataLogging

##### Name

StartDataLogging

##### Description

Start a present data logger in an experiment. To ensure that no data will be lost it is important to first start the data logger and than start the experiment. Return an error in case of: - No experiment open. - Data Generator not present. - Data Logger is already started.

##### Returns

A value of type string.

##### Example

StartDataLogging()

##### Remarks

API-Result-Codes: 0 1005 Operation failed. 1009 No open experiment found. 1012 No open data logger found.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |
