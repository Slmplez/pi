| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: OpenExperimentConfiguration

##### Name

OpenExperimentConfiguration

##### Description

Open the specified experiment configuration into the open experiment. If an experiment for another component is already open this experiment will be closed. If the default configuration should be used you can either use the string 'Default' or pass an empty string. Return an error in case of: - No experiment open. - Experiment configuration not available.

##### Parameters

| Name | Type | Direction | Description |
| --- | --- | --- | --- |
| experimentConfigurationName | string | Input | Name of the experiment configuration. |

##### Parameters

experimentConfigurationName

**Type:**string

Name of the experiment configuration.

##### Returns

A value of type string.

##### Example

OpenExperimentConfiguration("DataLogger")

##### Remarks

API-Result-Codes: 0 1009 No open experiment found. 1010 Experiment environment not available.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |
