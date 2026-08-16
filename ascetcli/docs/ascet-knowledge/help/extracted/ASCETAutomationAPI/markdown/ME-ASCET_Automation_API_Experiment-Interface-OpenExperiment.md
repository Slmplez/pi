| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: OpenExperiment

##### Name

OpenExperiment

##### Description

Open the experiment for the specified component. If the component has to be opened within a project this must be done explicitly. If an experiment for the component is already open this experiment will be reused. If an experiment for another component is already open this experiment will be closed. The specified experiment configuration will be read for the experiment. If the default configuration should be used you can either use the string 'Default' or pass an empty string. The experiment will be opened as child window of the component manager. If necessary the build will automatically started before opening the experiment. Return an error in case of: - No database open. - Item not found in database. - Invalid component specified. - Hardware not defined. - Experiment configuration not available. - Error in build occured. - Component is no project and the project option 'Message Usage Variant' is #NON_OPT_COPY_TASK

##### Parameters

| Name | Type | Direction | Description |
| --- | --- | --- | --- |
| componentPathName | string | Input | Hierarchical database path of the component. The database path has to be specified as absolute path and must not start with a slash. The folders have to be separated by using a backslash. |
| experimentConfigurationName | string | Input | Name of the experiment configuration. |

##### Parameters

componentPathName

**Type:**string

Hierarchical database path of the component. The database path has to be specified as absolute path and must not start with a slash. The folders have to be separated by using a backslash.

experimentConfigurationName

**Type:**string

Name of the experiment configuration.

##### Returns

A value of type string.

##### Example

OpenExperiment("OfflinePC\Project", "Oszi")

##### Remarks

API-Result-Codes: -1000 No system available. 0 1001 Invalid path name. 1002 Item not found in database. 1003 Item not loadable. 1004 No database. 1005 Operation failed. 1006 Path not found in database. 1007 Invalid operation. 1009 No open experiment found. 1010 Experiment environment not available. 1013 Operation is not available. 1015 Hardware not found. 1016 Hardware not defined. 1018 Invalid component path. 1020 Another editor is already open. 1023 Data logging is running. 1045 Invalid project option.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |
