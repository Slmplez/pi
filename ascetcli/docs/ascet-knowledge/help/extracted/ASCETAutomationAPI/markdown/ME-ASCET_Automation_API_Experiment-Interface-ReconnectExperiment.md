| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: ReconnectExperiment

##### Name

ReconnectExperiment

##### Description

The reconnect command will provide the possibility to experiment with an already running model on a target. The behavior is quiet similar to the open experiment command. The main difference is the circumstance that the model code will not be downloaded. In case of mismatch between the current target code and the selected project an error will be reported. If the component is no project the method will not use the default project to open the experiment. If the component has to be opened within a project this must be done explicitly. If an experiment for the component is already open this experiment will be reused. If an experiment for another component is already open this experiment will be closed. The specified experiment configuration will be read for the experiment. If the default configuration should be used you can either use the string 'Default' or pass an empty string. The experiment will be opened as child window of the component manager. If necessary the build will automatically started before opening the experiment. Return an error in case of: - No database open. - Item not found in database. - Invalid component specified. - Component already opened in another editor. - No suitable experimetn for reconnect found for current project settings. - Hardware not defined. - Experiment configuration not available. - Error in build occured.

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

ReconnectExperiment("OfflinePC\Project", "Oszi")

##### Remarks

API-Result-Codes: -1000 No system available. 0 1001 Invalid path name. 1002 Item not found in database. 1003 Item not loadable. 1004 No database. 1005 Operation failed. 1006 Path not found in database. 1007 Invalid operation. 1009 No open experiment found. 1010 Experiment environment not available. 1013 Operation is not available. 1015 Hardware not found. 1016 Hardware not defined. 1018 Invalid component path. 1020 Another editor is already open. 1023 Data logging is running. 1036 No matching experiment type found.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |
