# Merged CHM Content

## ASCETAutomationAPI

_Source: `markdown/Overview.md`_

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# ASCETAutomationAPI

##### Sources

| Name | Description |
| --- | --- |
| ASCET Automation API Build-Interface | This is the AaaBuildInterface service. This interface contains methods which are related to the code generation. |
| ASCET Automation API Editor-Interface | This is the AaaEditorInterface service. This interface contains methods to open and close editors within ASCET for components and elements. |
| ASCET Automation API Experiment-Interface | This is the AaaExperimentInterface service. This interface contains methods which are related to the build in experiment of ASCET. |
| ASCET Automation API Tool-Interface | This is the AaaToolInterface service. This interface contains methods which are related to the data base handling of ASCET. |

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |


---

## ASCET Automation API Build-Interface

_Source: `markdown/WS-ASCET_Automation_API_Build-Interface.md`_

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# ASCET Automation API Build-Interface Web Service

##### Description

This is the AaaBuildInterface service. This interface contains methods which are related to the code generation.

##### See Also

[Methods](markdown/ME-ASCET_Automation_API_Build-Interface.md)

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |


---

## Methods

_Source: `markdown/ME-ASCET_Automation_API_Build-Interface.md`_

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Methods: ASCET Automation API Build-Interface

##### Methods

| Name | Description |
| --- | --- |
| Build | Perform the build command on for the specified component. If the component is not a project the default project for the component will be used as context. Return an error in case of: - No database open. - Item not found in database. - Invalid component specified. - Target settings are not consistent - Internal error occured in build |
| CleanProject | Perform the clean command for the specified component. If the component is no project the default project for the component will be used as context. Internal used caches for the code generation will be reseted. The target specific make file 'clean.mk' will be executed. All files in the specified directory on the files system for code generation will be deleted. Return an error in case of: - No database open. - Item not found in database. - Invalid component specified. - Target settings are not consistent. - Internal error occured in compile. |
| CloseMessageDialog | Close the message box created with OpenMessageBox to enable control by the user interface. Example: CloseMessageDialog() |
| Compile | Perform the compile command for the specified component. If the component is no project the default project for the component will be used as context. Return an error in case of: - No database open. - Item not found in database. - Invalid component specified. - Target settings are not consistent. - Internal error occured in compile. |
| CompileUsingProject | Perform the compile command for a special component instance in the specified component. If the context component is no project the default project of this component will be used as context. The component instance has to be specified by its hierarchical element path name. Using the reserved name 'self' as hierarchical element path will perform the action for the specified component itself. Return an error in case of: - No database open. - Item not found in database. - Invalid component specified. - Target settings are not consistent. - Invalid element path name specified. - Internal error occured in compile. |
| ExportBuildResults | Not yet implemented |
| ExportGeneratedCode | Perform the export generated code command for the specified component. In case that the specified component is no project, than the default project will be used as project context for the component. Return an error in case of: - No database open. - Item not found in database. - Specified dircetory is not valid. |
| ExportGeneratedCodeRecursive | Perform the export generated code recursive command for the specified component. In case that the specified component is no project, than the default project will be used as project context for the component. The generated code for the specified component and for all referenced components will be written to the specified directory. Return an error in case of: - No database open. - Item not found in database. - Specified dircetory is not valid. |
| ExportGeneratedGenericCode | Perform the export generated code for microController targets (ECCO code) for the specified component. In case that the specified component is no project, than the default project will be used as project context for the component. The generated code for the specified component and for all referenced components will be written to the specified directory. Return an error in case of: - No database open. - Item not found in database. - Specified dircetory is not valid. |
| GenerateCode | Perform the generate code command for the specified component. If the component is no project the default project for the component will be used as context. Return an error in case of: - No database open. - Item not found in database. - Invalid component specified. - Target settings are not consistent. - Internal error occured in generate code. |
| GenerateCodeUsingProject | Perform the generate code command for a special component instance in the specified component. If the context component is no project the default project of this component will be used as context. The component instance has to be specified by its hierarchical element path name. Using the reserved name 'self' as hierarchical element path will perform the action for the specified component itself. Return an error in case of: - No database open. - Item not found in database. - Invalid component specified. - Target settings are not consistent. - Invalid element path name specified. - Internal error occured in generate code. |
| GetLastErrorNumber | Return the value of the error from the last method call. Example: GetLastErrorNumber() |
| GetLastErrorText | Return the text of the error from the last method call. Example: GetLastErrorText() |
| OpenMessageDialog | Open a message dialog on the ASCET main window to block the user interface. Titel and message text can be specified by the caller. It is not possible to open more than one message dialogs at the same time. Example: OpenMessageDialog("ASCET is blocked - please wait", "Automation running") |
| ReadProjectProperties | Set the properties for the specified project according to the settings in the specified file. If the specified component is no project the default project for the component will be used as context. Return an error in case of: - No database open. - Item not found in database. - Invalid component specified. - file name is not valid. - reading xml properties failed. |
| Rebuild | Perform the rebuild command on for the specified component. If the component is no project the default project for the component will be used as context. Return an error in case of: - No database open. - Item not found in database. - Invalid component specified. - Target settings are not consistent - Internal error occured in rebuild |
| Touch | Perform the touch flat command on for the specified component. If the component is no project the default project for the component will be used as context. Return an error in case of: - No database open. - Item not found in database. - Invalid component specified. - Target settings are not consistent. - Internal error occured in touch flat. |
| TouchRecursive | Perform the touch recursive command on for the specified component. If the component is no project the default project for the component will be used as context. Return an error in case of: - No database open. - Item not found in database. - Invalid component specified. - Target settings are not consistent. - Internal error occured in touch recursive. |
| TouchRecursiveUsingProject | Perform the touch recursive command for a special component instance in the specified component. If the context component is no project the default project of this component will be used as context. The component instance has to be specified by its hierarchical element path name. Using the reserved name 'self' as hierarchical element path will perform the action for the specified component itself. Return an error in case of: - No database open. - Item not found in database. - Invalid component specified. - Target settings are not consistent. - Invalid element path name specified. - Internal error occured in touch recursive. |
| TouchUsingProject | Perform the touch flat command for a special component instance in the specified component. If the context component is no project the default project of this component will be used as context. The component instance has to be specified by its hierarchical element path name. Using the reserved name 'self' as hierarchical element path will perform the action for the specified component itself. Return an error in case of: - No database open. - Item not found in database. - Invalid component specified. - Target settings are not consistent. - Invalid element path name specified. - Internal error occured in touch flat. |
| TransferFiles | Perform the transfer of generated code for the specified component to the specified place. Files of type .c .h .six .a2l are managed. If the component is no project the default project for the component will be used as context. Return an error in case of: - No database open. - Item not found in database. - Invalid component specified. - Invalid path specified. - Target settings are not consistent. - Internal error occured in code generation. |
| WriteAsam2MCToFile | Create an Asam2MC file for the specified component by using the specified file name. If the component is no project the default project for the component will be used as context. If the file path name does not include an absolut dircetory location the current working directory will be used. Return an error in case of: - Specified path is not valid. - No database open. - Item not found in database. - Invalid component specified. - Internal error occured in writing the asap file. |
| WriteAsam2MCToPath | Create an Asam2MC file for the specified component by using the specified directory. If the specified directory is not available it will be created. The generated file will get the same name as the component with the extension 'a2l'. If the component is no project the default project for the component will be used as context. Return an error in case of: - Specified dircetory is not valid. - No database open. - Item not found in database. - Invalid component specified. - Internal error occured in writing the asap file. |
| WriteProjectProperties | Write the specified properties file in xml style which contains the current properties of the specified project. If the specified component is no project the default project for the component will be used as context. Return an error in case of: - No database open. - Item not found in database. - Invalid component specified. - file name is not valid. - writing xml properties failed. |

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |


---

## Build

_Source: `markdown/ME-ASCET_Automation_API_Build-Interface-Build.md`_

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: Build

##### Name

Build

##### Description

Perform the build command on for the specified component. If the component is not a project the default project for the component will be used as context. Return an error in case of: - No database open. - Item not found in database. - Invalid component specified. - Target settings are not consistent - Internal error occured in build

##### Parameters

| Name | Type | Direction | Description |
| --- | --- | --- | --- |
| componentPathName | string | Input | Hierarchical database path of the component. The database path has to be specified as absolute path and must not start with a slash. The folders have to be separated by using a backslash. |

##### Parameters

componentPathName

**Type:**string

Hierarchical database path of the component. The database path has to be specified as absolute path and must not start with a slash. The folders have to be separated by using a backslash.

##### Returns

A value of type string.

##### Example

Build("Root\Project")

##### Remarks

API-Result-Codes: 0 1001 Invalid path name. 1002 Item not found in database. 1003 Item not loadable. 1004 No database. 1005 Operation failed. 1006 Path not found in database. 1007 Invalid operation. 1018 Invalid component path. 1021 A long lasting action is running. 1022 Invalid target in project.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |


---

## CleanProject

_Source: `markdown/ME-ASCET_Automation_API_Build-Interface-CleanProject.md`_

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: CleanProject

##### Name

CleanProject

##### Description

Perform the clean command for the specified component. If the component is no project the default project for the component will be used as context. Internal used caches for the code generation will be reseted. The target specific make file 'clean.mk' will be executed. All files in the specified directory on the files system for code generation will be deleted. Return an error in case of: - No database open. - Item not found in database. - Invalid component specified. - Target settings are not consistent. - Internal error occured in compile.

##### Parameters

| Name | Type | Direction | Description |
| --- | --- | --- | --- |
| componentPathName | string | Input | Hierarchical database path of the component. The database path has to be specified as absolute path and must not start with a slash. The folders have to be separated by using a backslash. |

##### Parameters

componentPathName

**Type:**string

Hierarchical database path of the component. The database path has to be specified as absolute path and must not start with a slash. The folders have to be separated by using a backslash.

##### Returns

A value of type string.

##### Example

CleanProject("Root\Project")

##### Remarks

API-Result-Codes: 0 1001 Invalid path name. 1002 Item not found in database. 1003 Item not loadable. 1004 No database. 1005 Operation failed. 1006 Path not found in database. 1007 Invalid operation. 1018 Invalid component path. 1021 A long lasting action is running. 1022 Invalid target in project.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |


---

## CloseMessageDialog

_Source: `markdown/ME-ASCET_Automation_API_Build-Interface-CloseMessageDialog.md`_

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: CloseMessageDialog

##### Name

CloseMessageDialog

##### Description

Close the message box created with OpenMessageBox to enable control by the user interface. Example: CloseMessageDialog()

##### Returns

A value of type string.

##### Remarks

API-Result-Codes: 0 1005 Operation failed.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |


---

## Compile

_Source: `markdown/ME-ASCET_Automation_API_Build-Interface-Compile.md`_

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: Compile

##### Name

Compile

##### Description

Perform the compile command for the specified component. If the component is no project the default project for the component will be used as context. Return an error in case of: - No database open. - Item not found in database. - Invalid component specified. - Target settings are not consistent. - Internal error occured in compile.

##### Parameters

| Name | Type | Direction | Description |
| --- | --- | --- | --- |
| componentPathName | string | Input | Hierarchical database path of the component. The database path has to be specified as absolute path and must not start with a slash. The folders have to be separated by using a backslash. |

##### Parameters

componentPathName

**Type:**string

Hierarchical database path of the component. The database path has to be specified as absolute path and must not start with a slash. The folders have to be separated by using a backslash.

##### Returns

A value of type string.

##### Example

Compile("Root\Project")

##### Remarks

API-Result-Codes: 0 1001 Invalid path name. 1002 Item not found in database. 1003 Item not loadable. 1004 No database. 1005 Operation failed. 1006 Path not found in database. 1007 Invalid operation. 1018 Invalid component path. 1021 A long lasting action is running. 1022 Invalid target in project.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |


---

## CompileUsingProject

_Source: `markdown/ME-ASCET_Automation_API_Build-Interface-CompileUsingProject.md`_

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: CompileUsingProject

##### Name

CompileUsingProject

##### Description

Perform the compile command for a special component instance in the specified component. If the context component is no project the default project of this component will be used as context. The component instance has to be specified by its hierarchical element path name. Using the reserved name 'self' as hierarchical element path will perform the action for the specified component itself. Return an error in case of: - No database open. - Item not found in database. - Invalid component specified. - Target settings are not consistent. - Invalid element path name specified. - Internal error occured in compile.

##### Parameters

| Name | Type | Direction | Description |
| --- | --- | --- | --- |
| elementPathName | string | Input | Hierarchical element path inside of the component. The element path has to be specified as absolute path and must not start with a slash. The element path has to be separated by using a backslash. |
| componentPathName | string | Input | Hierarchical database path of the component. The database path has to be specified as absolute path and must not start with a slash. The folders have to be separated by using a backslash. |

##### Parameters

elementPathName

**Type:**string

Hierarchical element path inside of the component. The element path has to be specified as absolute path and must not start with a slash. The element path has to be separated by using a backslash.

componentPathName

**Type:**string

Hierarchical database path of the component. The database path has to be specified as absolute path and must not start with a slash. The folders have to be separated by using a backslash.

##### Returns

A value of type string.

##### Example

CompileUsingProject("module", "Root\Project")

##### Remarks

API-Result-Codes: 0 1001 Invalid path name. 1002 Item not found in database. 1003 Item not loadable. 1004 No database. 1005 Operation failed. 1006 Path not found in database. 1007 Invalid operation. 1017 Invalid element path. 1018 Invalid component path. 1021 A long lasting action is running. 1022 Invalid target in project.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |


---

## ExportBuildResults

_Source: `markdown/ME-ASCET_Automation_API_Build-Interface-ExportBuildResults.md`_

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: ExportBuildResults

##### Name

ExportBuildResults

##### Description

Not yet implemented

##### Parameters

| Name | Type | Direction | Description |
| --- | --- | --- | --- |
| componentPathName | string | Input |  |
| pathName | string | Input |  |

##### Parameters

componentPathName

**Type:**string

pathName

**Type:**string

##### Returns

A value of type string.

##### Remarks

API-Result-Codes: 0 1001 Invalid path name. 1002 Item not found in database. 1003 Item not loadable. 1004 No database. 1005 Operation failed. 1006 Path not found in database. 1007 Invalid operation. 1018 Invalid component path. 1021 A long lasting action is running. 1022 Invalid target in project.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |


---

## ExportGeneratedCode

_Source: `markdown/ME-ASCET_Automation_API_Build-Interface-ExportGeneratedCode.md`_

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: ExportGeneratedCode

##### Name

ExportGeneratedCode

##### Description

Perform the export generated code command for the specified component. In case that the specified component is no project, than the default project will be used as project context for the component. Return an error in case of: - No database open. - Item not found in database. - Specified dircetory is not valid.

##### Parameters

| Name | Type | Direction | Description |
| --- | --- | --- | --- |
| componentPathName | string | Input | Hierarchical database path of the component. The database path has to be specified as absolute path and must not start with a slash. The folders have to be separated by using a backslash. |
| pathName | string | Input | Directory path to file out the generated code. |

##### Parameters

componentPathName

**Type:**string

Hierarchical database path of the component. The database path has to be specified as absolute path and must not start with a slash. The folders have to be separated by using a backslash.

pathName

**Type:**string

Directory path to file out the generated code.

##### Returns

A value of type string.

##### Example

ExportGeneratedCode("Root\Project", "C:\temp\code")

##### Remarks

API-Result-Codes: 0 1001 Invalid path name. 1002 Item not found in database. 1003 Item not loadable. 1004 No database. 1005 Operation failed. 1006 Path not found in database. 1007 Invalid operation. 1018 Invalid component path. 1021 A long lasting action is running. 1022 Invalid target in project.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |


---

## ExportGeneratedCodeRecursive

_Source: `markdown/ME-ASCET_Automation_API_Build-Interface-ExportGeneratedCodeRecursive.md`_

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: ExportGeneratedCodeRecursive

##### Name

ExportGeneratedCodeRecursive

##### Description

Perform the export generated code recursive command for the specified component. In case that the specified component is no project, than the default project will be used as project context for the component. The generated code for the specified component and for all referenced components will be written to the specified directory. Return an error in case of: - No database open. - Item not found in database. - Specified dircetory is not valid.

##### Parameters

| Name | Type | Direction | Description |
| --- | --- | --- | --- |
| componentPathName | string | Input | Hierarchical database path of the component. The database path has to be specified as absolute path and must not start with a slash. The folders have to be separated by using a backslash. |
| pathName | string | Input | Directory path to file out the generated code. |

##### Parameters

componentPathName

**Type:**string

Hierarchical database path of the component. The database path has to be specified as absolute path and must not start with a slash. The folders have to be separated by using a backslash.

pathName

**Type:**string

Directory path to file out the generated code.

##### Returns

A value of type string.

##### Example

ExportGeneratedCodeRecursive("Root\Project", "C:\temp\code")

##### Remarks

API-Result-Codes: 0 1001 Invalid path name. 1002 Item not found in database. 1003 Item not loadable. 1004 No database. 1005 Operation failed. 1006 Path not found in database. 1007 Invalid operation. 1018 Invalid component path. 1021 A long lasting action is running. 1022 Invalid target in project.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |


---

## ExportGeneratedGenericCode

_Source: `markdown/ME-ASCET_Automation_API_Build-Interface-ExportGeneratedGenericCode.md`_

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: ExportGeneratedGenericCode

##### Name

ExportGeneratedGenericCode

##### Description

Perform the export generated code for microController targets (ECCO code) for the specified component. In case that the specified component is no project, than the default project will be used as project context for the component. The generated code for the specified component and for all referenced components will be written to the specified directory. Return an error in case of: - No database open. - Item not found in database. - Specified dircetory is not valid.

##### Parameters

| Name | Type | Direction | Description |
| --- | --- | --- | --- |
| componentPathName | string | Input | Hierarchical database path of the component. The database path has to be specified as absolute path and must not start with a slash. The folders have to be separated by using a backslash. |
| pathName | string | Input | Directory path to file out the generated code. |

##### Parameters

componentPathName

**Type:**string

Hierarchical database path of the component. The database path has to be specified as absolute path and must not start with a slash. The folders have to be separated by using a backslash.

pathName

**Type:**string

Directory path to file out the generated code.

##### Returns

A value of type string.

##### Example

ExportGeneratedGenericCode("Root\Project", "C:\temp\code")

##### Remarks

API-Result-Codes: 0 1001 Invalid path name. 1002 Item not found in database. 1003 Item not loadable. 1004 No database. 1005 Operation failed. 1006 Path not found in database. 1007 Invalid operation. 1018 Invalid component path. 1021 A long lasting action is running. 1022 Invalid target in project.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |


---

## GenerateCode

_Source: `markdown/ME-ASCET_Automation_API_Build-Interface-GenerateCode.md`_

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: GenerateCode

##### Name

GenerateCode

##### Description

Perform the generate code command for the specified component. If the component is no project the default project for the component will be used as context. Return an error in case of: - No database open. - Item not found in database. - Invalid component specified. - Target settings are not consistent. - Internal error occured in generate code.

##### Parameters

| Name | Type | Direction | Description |
| --- | --- | --- | --- |
| componentPathName | string | Input | Hierarchical database path of the component. The database path has to be specified as absolute path and must not start with a slash. The folders have to be separated by using a backslash. |

##### Parameters

componentPathName

**Type:**string

Hierarchical database path of the component. The database path has to be specified as absolute path and must not start with a slash. The folders have to be separated by using a backslash.

##### Returns

A value of type string.

##### Example

GenerateCode("Root\Project")

##### Remarks

API-Result-Codes: 0 1001 Invalid path name. 1002 Item not found in database. 1003 Item not loadable. 1004 No database. 1005 Operation failed. 1006 Path not found in database. 1007 Invalid operation. 1018 Invalid component path. 1021 A long lasting action is running. 1022 Invalid target in project.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |


---

## GenerateCodeUsingProject

_Source: `markdown/ME-ASCET_Automation_API_Build-Interface-GenerateCodeUsingProject.md`_

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: GenerateCodeUsingProject

##### Name

GenerateCodeUsingProject

##### Description

Perform the generate code command for a special component instance in the specified component. If the context component is no project the default project of this component will be used as context. The component instance has to be specified by its hierarchical element path name. Using the reserved name 'self' as hierarchical element path will perform the action for the specified component itself. Return an error in case of: - No database open. - Item not found in database. - Invalid component specified. - Target settings are not consistent. - Invalid element path name specified. - Internal error occured in generate code.

##### Parameters

| Name | Type | Direction | Description |
| --- | --- | --- | --- |
| elementPathName | string | Input | Hierarchical element path inside of the component. The element path has to be specified as absolute path and must not start with a slash. The element path has to be separated by using a backslash. |
| componentPathName | string | Input | Hierarchical database path of the component. The database path has to be specified as absolute path and must not start with a slash. The folders have to be separated by using a backslash. |

##### Parameters

elementPathName

**Type:**string

Hierarchical element path inside of the component. The element path has to be specified as absolute path and must not start with a slash. The element path has to be separated by using a backslash.

componentPathName

**Type:**string

Hierarchical database path of the component. The database path has to be specified as absolute path and must not start with a slash. The folders have to be separated by using a backslash.

##### Returns

A value of type string.

##### Example

GenerateCodeUsingProject("module", "Root\Project")

##### Remarks

API-Result-Codes: 0 1001 Invalid path name. 1002 Item not found in database. 1003 Item not loadable. 1004 No database. 1005 Operation failed. 1006 Path not found in database. 1007 Invalid operation. 1017 Invalid element path. 1018 Invalid component path. 1021 A long lasting action is running. 1022 Invalid target in project.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |


---

## GetLastErrorNumber

_Source: `markdown/ME-ASCET_Automation_API_Build-Interface-GetLastErrorNumber.md`_

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: GetLastErrorNumber

##### Name

GetLastErrorNumber

##### Description

Return the value of the error from the last method call. Example: GetLastErrorNumber()

##### Returns

A value of type string.

##### Remarks

API-Result-Codes: 0

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |


---

## GetLastErrorText

_Source: `markdown/ME-ASCET_Automation_API_Build-Interface-GetLastErrorText.md`_

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: GetLastErrorText

##### Name

GetLastErrorText

##### Description

Return the text of the error from the last method call. Example: GetLastErrorText()

##### Returns

A value of type string.

##### Remarks

API-Result-Codes: 0

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |


---

## OpenMessageDialog

_Source: `markdown/ME-ASCET_Automation_API_Build-Interface-OpenMessageDialog.md`_

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: OpenMessageDialog

##### Name

OpenMessageDialog

##### Description

Open a message dialog on the ASCET main window to block the user interface. Titel and message text can be specified by the caller. It is not possible to open more than one message dialogs at the same time. Example: OpenMessageDialog("ASCET is blocked - please wait", "Automation running")

##### Parameters

| Name | Type | Direction | Description |
| --- | --- | --- | --- |
| theMessage | string | Input |  |
| theTitel | string | Input |  |

##### Parameters

theMessage

**Type:**string

theTitel

**Type:**string

##### Returns

A value of type string.

##### Remarks

API-Result-Codes: 0 1005 Operation failed. 1027 Message box already open.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |


---

## ReadProjectProperties

_Source: `markdown/ME-ASCET_Automation_API_Build-Interface-ReadProjectProperties.md`_

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: ReadProjectProperties

##### Name

ReadProjectProperties

##### Description

Set the properties for the specified project according to the settings in the specified file. If the specified component is no project the default project for the component will be used as context. Return an error in case of: - No database open. - Item not found in database. - Invalid component specified. - file name is not valid. - reading xml properties failed.

##### Parameters

| Name | Type | Direction | Description |
| --- | --- | --- | --- |
| componentPathName | string | Input | Hierarchical database path of the component. The database path has to be specified as absolute path and must not start with a slash. The folders have to be separated by using a backslash. |
| filePathName | string | Input | Specify the xml file on the file system which contains the new properties for the project. |

##### Parameters

componentPathName

**Type:**string

Hierarchical database path of the component. The database path has to be specified as absolute path and must not start with a slash. The folders have to be separated by using a backslash.

filePathName

**Type:**string

Specify the xml file on the file system which contains the new properties for the project.

##### Returns

A value of type string.

##### Example

ReadProjectProperties("Root\Project", "c:\temp\prj_prop.xml")

##### Remarks

API-Result-Codes: 0 1001 Invalid path name. 1002 Item not found in database. 1003 Item not loadable. 1004 No database. 1005 Operation failed. 1006 Path not found in database. 1007 Invalid operation. 1011 Invalid file name. 1018 Invalid component path. 1028 File not readable. 1029 XML Parser error. 1030 Invalid XML document. 1031 Invalid option value detected.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |


---

## Rebuild

_Source: `markdown/ME-ASCET_Automation_API_Build-Interface-Rebuild.md`_

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: Rebuild

##### Name

Rebuild

##### Description

Perform the rebuild command on for the specified component. If the component is no project the default project for the component will be used as context. Return an error in case of: - No database open. - Item not found in database. - Invalid component specified. - Target settings are not consistent - Internal error occured in rebuild

##### Parameters

| Name | Type | Direction | Description |
| --- | --- | --- | --- |
| componentPathName | string | Input | Hierarchical database path of the component. The database path has to be specified as absolute path and must not start with a slash. The folders have to be separated by using a backslash. |

##### Parameters

componentPathName

**Type:**string

Hierarchical database path of the component. The database path has to be specified as absolute path and must not start with a slash. The folders have to be separated by using a backslash.

##### Returns

A value of type string.

##### Example

Rebuild("Root\Project")

##### Remarks

API-Result-Codes: 0 1001 Invalid path name. 1002 Item not found in database. 1003 Item not loadable. 1004 No database. 1005 Operation failed. 1006 Path not found in database. 1007 Invalid operation. 1018 Invalid component path. 1021 A long lasting action is running. 1022 Invalid target in project.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |


---

## Touch

_Source: `markdown/ME-ASCET_Automation_API_Build-Interface-Touch.md`_

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: Touch

##### Name

Touch

##### Description

Perform the touch flat command on for the specified component. If the component is no project the default project for the component will be used as context. Return an error in case of: - No database open. - Item not found in database. - Invalid component specified. - Target settings are not consistent. - Internal error occured in touch flat.

##### Parameters

| Name | Type | Direction | Description |
| --- | --- | --- | --- |
| componentPathName | string | Input | Hierarchical database path of the component. The database path has to be specified as absolute path and must not start with a slash. The folders have to be separated by using a backslash. |

##### Parameters

componentPathName

**Type:**string

Hierarchical database path of the component. The database path has to be specified as absolute path and must not start with a slash. The folders have to be separated by using a backslash.

##### Returns

A value of type string.

##### Example

Touch("Root\Project")

##### Remarks

API-Result-Codes: 0 1001 Invalid path name. 1002 Item not found in database. 1003 Item not loadable. 1004 No database. 1005 Operation failed. 1006 Path not found in database. 1007 Invalid operation. 1018 Invalid component path. 1021 A long lasting action is running. 1022 Invalid target in project.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |


---

## TouchRecursive

_Source: `markdown/ME-ASCET_Automation_API_Build-Interface-TouchRecursive.md`_

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: TouchRecursive

##### Name

TouchRecursive

##### Description

Perform the touch recursive command on for the specified component. If the component is no project the default project for the component will be used as context. Return an error in case of: - No database open. - Item not found in database. - Invalid component specified. - Target settings are not consistent. - Internal error occured in touch recursive.

##### Parameters

| Name | Type | Direction | Description |
| --- | --- | --- | --- |
| componentPathName | string | Input | Hierarchical database path of the component. The database path has to be specified as absolute path and must not start with a slash. The folders have to be separated by using a backslash. |

##### Parameters

componentPathName

**Type:**string

Hierarchical database path of the component. The database path has to be specified as absolute path and must not start with a slash. The folders have to be separated by using a backslash.

##### Returns

A value of type string.

##### Example

TouchRecursive("Root\Project")

##### Remarks

API-Result-Codes: 0 1001 Invalid path name. 1002 Item not found in database. 1003 Item not loadable. 1004 No database. 1005 Operation failed. 1006 Path not found in database. 1007 Invalid operation. 1018 Invalid component path. 1021 A long lasting action is running. 1022 Invalid target in project.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |


---

## TouchRecursiveUsingProject

_Source: `markdown/ME-ASCET_Automation_API_Build-Interface-TouchRecursiveUsingProject.md`_

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: TouchRecursiveUsingProject

##### Name

TouchRecursiveUsingProject

##### Description

Perform the touch recursive command for a special component instance in the specified component. If the context component is no project the default project of this component will be used as context. The component instance has to be specified by its hierarchical element path name. Using the reserved name 'self' as hierarchical element path will perform the action for the specified component itself. Return an error in case of: - No database open. - Item not found in database. - Invalid component specified. - Target settings are not consistent. - Invalid element path name specified. - Internal error occured in touch recursive.

##### Parameters

| Name | Type | Direction | Description |
| --- | --- | --- | --- |
| elementPathName | string | Input | Hierarchical element path inside of the component. The element path has to be specified as absolute path and must not start with a slash. The element path has to be separated by using a backslash. |
| componentPathName | string | Input | Hierarchical database path of the component. The database path has to be specified as absolute path and must not start with a slash. The folders have to be separated by using a backslash. |

##### Parameters

elementPathName

**Type:**string

Hierarchical element path inside of the component. The element path has to be specified as absolute path and must not start with a slash. The element path has to be separated by using a backslash.

componentPathName

**Type:**string

Hierarchical database path of the component. The database path has to be specified as absolute path and must not start with a slash. The folders have to be separated by using a backslash.

##### Returns

A value of type string.

##### Example

TouchRecursiveUsingProject("module", "Root\Project")

##### Remarks

API-Result-Codes: 0 1001 Invalid path name. 1002 Item not found in database. 1003 Item not loadable. 1004 No database. 1005 Operation failed. 1006 Path not found in database. 1007 Invalid operation. 1017 Invalid element path. 1018 Invalid component path. 1021 A long lasting action is running. 1022 Invalid target in project.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |


---

## TouchUsingProject

_Source: `markdown/ME-ASCET_Automation_API_Build-Interface-TouchUsingProject.md`_

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: TouchUsingProject

##### Name

TouchUsingProject

##### Description

Perform the touch flat command for a special component instance in the specified component. If the context component is no project the default project of this component will be used as context. The component instance has to be specified by its hierarchical element path name. Using the reserved name 'self' as hierarchical element path will perform the action for the specified component itself. Return an error in case of: - No database open. - Item not found in database. - Invalid component specified. - Target settings are not consistent. - Invalid element path name specified. - Internal error occured in touch flat.

##### Parameters

| Name | Type | Direction | Description |
| --- | --- | --- | --- |
| elementPathName | string | Input | Hierarchical element path inside of the component. The element path has to be specified as absolute path and must not start with a slash. The element path has to be separated by using a backslash. |
| componentPathName | string | Input | Hierarchical database path of the component. The database path has to be specified as absolute path and must not start with a slash. The folders have to be separated by using a backslash. |

##### Parameters

elementPathName

**Type:**string

Hierarchical element path inside of the component. The element path has to be specified as absolute path and must not start with a slash. The element path has to be separated by using a backslash.

componentPathName

**Type:**string

Hierarchical database path of the component. The database path has to be specified as absolute path and must not start with a slash. The folders have to be separated by using a backslash.

##### Returns

A value of type string.

##### Example

TouchUsingProject("module", "Root\Project")

##### Remarks

API-Result-Codes: 0 1001 Invalid path name. 1002 Item not found in database. 1003 Item not loadable. 1004 No database. 1005 Operation failed. 1006 Path not found in database. 1007 Invalid operation. 1017 Invalid element path. 1018 Invalid component path. 1021 A long lasting action is running. 1022 Invalid target in project.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |


---

## TransferFiles

_Source: `markdown/ME-ASCET_Automation_API_Build-Interface-TransferFiles.md`_

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: TransferFiles

##### Name

TransferFiles

##### Description

Perform the transfer of generated code for the specified component to the specified place. Files of type .c .h .six .a2l are managed. If the component is no project the default project for the component will be used as context. Return an error in case of: - No database open. - Item not found in database. - Invalid component specified. - Invalid path specified. - Target settings are not consistent. - Internal error occured in code generation.

##### Parameters

| Name | Type | Direction | Description |
| --- | --- | --- | --- |
| componentPathName | string | Input | Hierarchical database path of the component. The database path has to be specified as absolute path and must not start with a slash. The folders have to be separated by using a backslash. |
| filePathName | string | Input | Name of the Folder of the file system. If the parameter is empty, the default code generation path is used. The folders have to be separated by using a backslash. |

##### Parameters

componentPathName

**Type:**string

Hierarchical database path of the component. The database path has to be specified as absolute path and must not start with a slash. The folders have to be separated by using a backslash.

filePathName

**Type:**string

Name of the Folder of the file system. If the parameter is empty, the default code generation path is used. The folders have to be separated by using a backslash.

##### Returns

A value of type string.

##### Example

TransferFiles("Root\Project", "c:\temp")

##### Remarks

API-Result-Codes: 0 1001 Invalid path name. 1002 Item not found in database. 1003 Item not loadable. 1004 No database. 1005 Operation failed. 1006 Path not found in database. 1007 Invalid operation. 1018 Invalid component path. 1021 A long lasting action is running. 1022 Invalid target in project.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |


---

## WriteAsam2MCToFile

_Source: `markdown/ME-ASCET_Automation_API_Build-Interface-WriteAsam2MCToFile.md`_

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: WriteAsam2MCToFile

##### Name

WriteAsam2MCToFile

##### Description

Create an Asam2MC file for the specified component by using the specified file name. If the component is no project the default project for the component will be used as context. If the file path name does not include an absolut dircetory location the current working directory will be used. Return an error in case of: - Specified path is not valid. - No database open. - Item not found in database. - Invalid component specified. - Internal error occured in writing the asap file.

##### Parameters

| Name | Type | Direction | Description |
| --- | --- | --- | --- |
| componentPathName | string | Input | Hierarchical database path of the component. The database path has to be specified as absolute path and must not start with a slash. The folders have to be separated by using a backslash. |
| filePathName | string | Input | File name for the created ASAM2MC file. |

##### Parameters

componentPathName

**Type:**string

Hierarchical database path of the component. The database path has to be specified as absolute path and must not start with a slash. The folders have to be separated by using a backslash.

filePathName

**Type:**string

File name for the created ASAM2MC file.

##### Returns

A value of type string.

##### Example

WriteAsam2MCToFile("Root\Class", "c:\temp\asap\test.a2l")

##### Remarks

API-Result-Codes: 0 1001 Invalid path name. 1002 Item not found in database. 1003 Item not loadable. 1004 No database. 1005 Operation failed. 1006 Path not found in database. 1007 Invalid operation. 1011 Invalid file name. 1018 Invalid component path. 1021 A long lasting action is running. 1022 Invalid target in project.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |


---

## WriteAsam2MCToPath

_Source: `markdown/ME-ASCET_Automation_API_Build-Interface-WriteAsam2MCToPath.md`_

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: WriteAsam2MCToPath

##### Name

WriteAsam2MCToPath

##### Description

Create an Asam2MC file for the specified component by using the specified directory. If the specified directory is not available it will be created. The generated file will get the same name as the component with the extension 'a2l'. If the component is no project the default project for the component will be used as context. Return an error in case of: - Specified dircetory is not valid. - No database open. - Item not found in database. - Invalid component specified. - Internal error occured in writing the asap file.

##### Parameters

| Name | Type | Direction | Description |
| --- | --- | --- | --- |
| componentPathName | string | Input | Hierarchical database path of the component. The database path has to be specified as absolute path and must not start with a slash. The folders have to be separated by using a backslash. |
| pathName | string | Input | Directory path for the created ASAM2MC file. |

##### Parameters

componentPathName

**Type:**string

Hierarchical database path of the component. The database path has to be specified as absolute path and must not start with a slash. The folders have to be separated by using a backslash.

pathName

**Type:**string

Directory path for the created ASAM2MC file.

##### Returns

A value of type string.

##### Example

WriteAsam2MCToPath("Root\Class", "c:\temp\asap")

##### Remarks

API-Result-Codes: 0 1001 Invalid path name. 1002 Item not found in database. 1003 Item not loadable. 1004 No database. 1005 Operation failed. 1006 Path not found in database. 1007 Invalid operation. 1011 Invalid file name. 1018 Invalid component path. 1021 A long lasting action is running. 1022 Invalid target in project.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |


---

## WriteProjectProperties

_Source: `markdown/ME-ASCET_Automation_API_Build-Interface-WriteProjectProperties.md`_

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: WriteProjectProperties

##### Name

WriteProjectProperties

##### Description

Write the specified properties file in xml style which contains the current properties of the specified project. If the specified component is no project the default project for the component will be used as context. Return an error in case of: - No database open. - Item not found in database. - Invalid component specified. - file name is not valid. - writing xml properties failed.

##### Parameters

| Name | Type | Direction | Description |
| --- | --- | --- | --- |
| componentPathName | string | Input | Hierarchical database path of the component. The database path has to be specified as absolute path and must not start with a slash. The folders have to be separated by using a backslash. |
| filePathName | string | Input | Specify the xml file which will be created with the properties of the project. |

##### Parameters

componentPathName

**Type:**string

Hierarchical database path of the component. The database path has to be specified as absolute path and must not start with a slash. The folders have to be separated by using a backslash.

filePathName

**Type:**string

Specify the xml file which will be created with the properties of the project.

##### Returns

A value of type string.

##### Example

WriteProjectProperties("Root\Project", "c:\temp\prj_prop.xml")

##### Remarks

API-Result-Codes: 0 1001 Invalid path name. 1002 Item not found in database. 1003 Item not loadable. 1004 No database. 1005 Operation failed. 1006 Path not found in database. 1007 Invalid operation. 1011 Invalid file name. 1018 Invalid component path.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |


---

## ASCET Automation API Editor-Interface

_Source: `markdown/WS-ASCET_Automation_API_Editor-Interface.md`_

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# ASCET Automation API Editor-Interface Web Service

##### Description

This is the AaaEditorInterface service. This interface contains methods to open and close editors within ASCET for components and elements.

##### See Also

[Methods](markdown/ME-ASCET_Automation_API_Editor-Interface.md)

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |


---

## Methods

_Source: `markdown/ME-ASCET_Automation_API_Editor-Interface.md`_

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Methods: ASCET Automation API Editor-Interface

##### Methods

| Name | Description |
| --- | --- |
| AscetLink | Processes a command in ascet protocol syntax. |
| CloseComponentEditor | Lookup for an open editor for the specified component. Close this editor by performing the windows close action. Return an error in case of: - No database open. - Item not found in database. - Editor could not be closed. |
| CloseComponentEditorForElement | Lookup for an open editor a special component instance in the specified component. The component instance has to be specified by its hierarchical element path name. Using the reserved name 'self' as hierarchical element path will open the editor for the specified component itself. Using an empty string as hierarchical element path will open the editor for the specified component itself. Close this editor by performing the windows close action. Return an error in case of: - No database open. - Item not found in database. - Editor could not be closed. |
| CloseEditorForElement | Close an element editor which was previously opened by the API. The element has to be specified by its hierarchical path within the specified component. Return an error in case of: - No database open. - Item not found in database. - Invalid component specified. - Invalid element specified. - Element editor not opened by API. |
| CloseMessageDialog | Close the message box created with OpenMessageBox to enable control by the user interface. Example: CloseMessageDialog() |
| DetectUnusedElements | Perform the "Show unused elements" Component-local analysis. As context for the analysis the specified implementation and data set is used as well as the specified project. If an empty string is passed for the impl argument the default implementation set is used. If an empty string is passed for the data argument the default data set is used. If an empty string is passed for the project argument the default project of the component is used. Return an error in case of: - No valid component specified. |
| DetectUnusedElementsInProject | Perform the "Show unused elements" Project-global analysis. If a component is specified instead of a project the analysis will be performed with its default project. Return an error in case of: - No valid component or project specified. |
| GetLastErrorNumber | Return the value of the error from the last method call. Example: GetLastErrorNumber() |
| GetLastErrorText | Return the text of the error from the last method call. Example: GetLastErrorText() |
| OpenComponentEditor | Open a specification editor for the specified component. The editor will be opened as a child of the component manager. Return an error in case of: - No database open. - Item not found in database. - Editor is already open. - Editor could not be opened. |
| OpenComponentEditorForElement | Open a specification editor for a special component instance in the specified component. If the context component is no project the default project of this component will be used as context. The component instance has to be specified by its hierarchical element path name. Using the reserved name 'self' as hierarchical element path will open the editor for the specified component itself. Using an empty string as hierarchical element path will open the editor for the specified component itself. The editor will be opened as a child of the component manager. Return an error in case of: - No database open. - Item not found in database. - Editor for the resolved component is already open. - Editor could not be opened. |
| OpenDataEditorForElement | Open a data element editor for an element in the specified component. The element has to be specified by its hierarchical path within the component. A previous hidden contents view in the component manager will be reactivated. The direkt parent component of the element will be selected in the tree pane of the component manager. The notebook in the contents view will be switched to the page 'Data'. The element will be selected in the contents table list. The data editor will be opened in the context of the component manager as a child window. Return an error in case of: - No database open. - Item not found in database. - Invalid component specified. - Invalid element specified. - Component not selectable. - Component has no table list contents view. - Editor for element is already opened by API. - Editor could not be created with time. (Timeout is 5s). |
| OpenImplementationEditorForElement | Open an implementation element editor for an element in the specified component. The element has to be specified by its hierarchical path within the component. A previous hidden contents view in the component manager will be reactivated. The direkt parent component of the element will be selected in the tree pane of the component manager. The notebook in the contents view will be switched to the page 'Implementation'. The element will be selected in the contents table list. The implementation editor will be opened in the context of the component manager as a child window. Return an error in case of: - No database open. - Item not found in database. - Invalid component specified. - Invalid element specified. - Component not selectable. - Component has no table list contents view. - Editor for element is already opened by API. - Editor could not be created with time. (Timeout is 5s). |
| OpenMessageDialog | Open a message dialog on the ASCET main window to block the user interface. Titel and message text can be specified by the caller. It is not possible to open more than one message dialogs at the same time. Example: OpenMessageDialog("ASCET is blocked - please wait", "Automation running") |
| OpenPropertyEditorForElement | Open a property element editor for an element in the specified component. The element has to be specified by its hierarchical path within the component. A previous hidden contents view in the component manager will be reactivated. The direkt parent component of the element will be selected in the tree pane of the component manager. The notebook in the contents view will be switched to the page 'Elements'. The element will be selected in the contents table list. The property editor will be opened in the context of the component manager as a child window. Return an error in case of: - No database open. - Item not found in database. - Invalid component specified. - Invalid element specified. - Component not selectable. - Component has no table list contents view. - Editor for element is already opened by API. - Editor could not be created with time. (Timeout is 5s). |
| SelectComponent | Select the specified component in the component mananger. Return an error in case of: - No database open. - Item not found in database. |
| WriteAllProjectFiles | Write the project files for the specified component. Return an error in case of: - No database open. (Error: 1004) - Item not found in database. (Error: 1018, 1002) - Specified component is not a project. (Error: 1014) - Target path for project files missing. (Error: 1001) |

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |


---

## AscetLink

_Source: `markdown/ME-ASCET_Automation_API_Editor-Interface-AscetLink.md`_

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: AscetLink

##### Name

AscetLink

##### Description

Processes a command in ascet protocol syntax.

##### Parameters

| Name | Type | Direction | Description |
| --- | --- | --- | --- |
| anAscetLink | string | Input | Asd protocol string. |

##### Parameters

anAscetLink

**Type:**string

Asd protocol string.

##### Returns

A value of type string.

##### Example

AscetLink("ascet://ETAS_SystemLib/Transferfunction/Control/PIDLimited?datastorage=D:\ETASData\ASCET6.1\Database\Tutorial")

##### Remarks

API-Result-Codes: 0 1041 Error in AscetLink %1. 1047 Operation not supported in server mode.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |


---

## CloseComponentEditor

_Source: `markdown/ME-ASCET_Automation_API_Editor-Interface-CloseComponentEditor.md`_

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: CloseComponentEditor

##### Name

CloseComponentEditor

##### Description

Lookup for an open editor for the specified component. Close this editor by performing the windows close action. Return an error in case of: - No database open. - Item not found in database. - Editor could not be closed.

##### Parameters

| Name | Type | Direction | Description |
| --- | --- | --- | --- |
| componentPathName | string | Input | Hierarchical database path of the component. The database path has to be specified as absolute path and must not start with a slash. The folders have to be separated by using a backslash. |

##### Parameters

componentPathName

**Type:**string

Hierarchical database path of the component. The database path has to be specified as absolute path and must not start with a slash. The folders have to be separated by using a backslash.

##### Returns

A value of type string.

##### Example

CloseComponentEditor("Root\Class_Block_Diagram")

##### Remarks

API-Result-Codes: 0 1001 Invalid path name. 1002 Item not found in database. 1003 Item not loadable. 1004 No database. 1005 Operation failed. 1006 Path not found in database. 1018 Invalid component path. 1047 Operation not supported in server mode.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |


---

## CloseComponentEditorForElement

_Source: `markdown/ME-ASCET_Automation_API_Editor-Interface-CloseComponentEditorForElement.md`_

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: CloseComponentEditorForElement

##### Name

CloseComponentEditorForElement

##### Description

Lookup for an open editor a special component instance in the specified component. The component instance has to be specified by its hierarchical element path name. Using the reserved name 'self' as hierarchical element path will open the editor for the specified component itself. Using an empty string as hierarchical element path will open the editor for the specified component itself. Close this editor by performing the windows close action. Return an error in case of: - No database open. - Item not found in database. - Editor could not be closed.

##### Parameters

| Name | Type | Direction | Description |
| --- | --- | --- | --- |
| componentPathName | string | Input | Hierarchical database path of the component. The database path has to be specified as absolute path and must not start with a slash. The folders have to be separated by using a backslash. |
| elementPathName | string | Input | Hierarchical element path inside of the component. The element path has to be specified as absolute path and must not start with a slash. The element path has to be separated by using a backslash. |

##### Parameters

componentPathName

**Type:**string

Hierarchical database path of the component. The database path has to be specified as absolute path and must not start with a slash. The folders have to be separated by using a backslash.

elementPathName

**Type:**string

Hierarchical element path inside of the component. The element path has to be specified as absolute path and must not start with a slash. The element path has to be separated by using a backslash.

##### Returns

A value of type string.

##### Example

CloseComponentEditorForElement("Root\Project", "module")

##### Remarks

API-Result-Codes: 0 1001 Invalid path name. 1002 Item not found in database. 1003 Item not loadable. 1004 No database. 1005 Operation failed. 1006 Path not found in database. 1007 Invalid operation. 1017 Invalid element path. 1018 Invalid component path. 1047 Operation not supported in server mode.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |


---

## CloseEditorForElement

_Source: `markdown/ME-ASCET_Automation_API_Editor-Interface-CloseEditorForElement.md`_

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: CloseEditorForElement

##### Name

CloseEditorForElement

##### Description

Close an element editor which was previously opened by the API. The element has to be specified by its hierarchical path within the specified component. Return an error in case of: - No database open. - Item not found in database. - Invalid component specified. - Invalid element specified. - Element editor not opened by API.

##### Parameters

| Name | Type | Direction | Description |
| --- | --- | --- | --- |
| elementPathName | string | Input | Hierarchical element path inside of the component. The element path has to be specified as absolute path and must not start with a slash. The element path has to be separated by using a backslash. |
| componentPathName | string | Input | Hierarchical database path of the component. The database path has to be specified as absolute path and must not start with a slash. The folders have to be separated by using a backslash. |

##### Parameters

elementPathName

**Type:**string

Hierarchical element path inside of the component. The element path has to be specified as absolute path and must not start with a slash. The element path has to be separated by using a backslash.

componentPathName

**Type:**string

Hierarchical database path of the component. The database path has to be specified as absolute path and must not start with a slash. The folders have to be separated by using a backslash.

##### Returns

A value of type string.

##### Example

CloseEditorForElement("module", "Root\Project")

##### Remarks

API-Result-Codes: -1001 No open editor found for the specification 0 1001 Invalid path name. 1002 Item not found in database. 1003 Item not loadable. 1004 No database. 1005 Operation failed. 1006 Path not found in database. 1007 Invalid operation. 1017 Invalid element path. 1018 Invalid component path. 1047 Operation not supported in server mode.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |


---

## CloseMessageDialog

_Source: `markdown/ME-ASCET_Automation_API_Editor-Interface-CloseMessageDialog.md`_

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: CloseMessageDialog

##### Name

CloseMessageDialog

##### Description

Close the message box created with OpenMessageBox to enable control by the user interface. Example: CloseMessageDialog()

##### Returns

A value of type string.

##### Remarks

API-Result-Codes: 0 1005 Operation failed.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |


---

## DetectUnusedElements

_Source: `markdown/ME-ASCET_Automation_API_Editor-Interface-DetectUnusedElements.md`_

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: DetectUnusedElements

##### Name

DetectUnusedElements

##### Description

Perform the "Show unused elements" Component-local analysis. As context for the analysis the specified implementation and data set is used as well as the specified project. If an empty string is passed for the impl argument the default implementation set is used. If an empty string is passed for the data argument the default data set is used. If an empty string is passed for the project argument the default project of the component is used. Return an error in case of: - No valid component specified.

##### Parameters

| Name | Type | Direction | Description |
| --- | --- | --- | --- |
| componentPathName | string | Input | Hierarchical database path of the component. |
| implementationName | string | Input | Name of the implementation set. |
| dataName | string | Input | Name of the data set. |
| projectPathName | string | Input | Hierarchical database path of the component. |

##### Parameters

componentPathName

**Type:**string

Hierarchical database path of the component.

implementationName

**Type:**string

Name of the implementation set.

dataName

**Type:**string

Name of the data set.

projectPathName

**Type:**string

Hierarchical database path of the component.

##### Returns

A value of type string.

##### Example

DetectUnusedElements("Root\Project", "", "", "")

##### Remarks

API-Result-Codes: 1001 Invalid path name. 1002 Item not found in database. 1003 Item not loadable. 1004 No database. 1006 Path not found in database. 1014 Invalid argument. 1018 Invalid component path.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |


---

## DetectUnusedElementsInProject

_Source: `markdown/ME-ASCET_Automation_API_Editor-Interface-DetectUnusedElementsInProject.md`_

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: DetectUnusedElementsInProject

##### Name

DetectUnusedElementsInProject

##### Description

Perform the "Show unused elements" Project-global analysis. If a component is specified instead of a project the analysis will be performed with its default project. Return an error in case of: - No valid component or project specified.

##### Parameters

| Name | Type | Direction | Description |
| --- | --- | --- | --- |
| projectPathName | string | Input | Hierarchical database path of the project. |

##### Parameters

projectPathName

**Type:**string

Hierarchical database path of the project.

##### Returns

A value of type string.

##### Example

DetectUnusedElementsInProject("OfflineRP\Project_ES1135_hoch")

##### Remarks

API-Result-Codes: 1001 Invalid path name. 1002 Item not found in database. 1003 Item not loadable. 1004 No database. 1006 Path not found in database. 1014 Invalid argument. 1018 Invalid component path.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |


---

## GetLastErrorNumber

_Source: `markdown/ME-ASCET_Automation_API_Editor-Interface-GetLastErrorNumber.md`_

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: GetLastErrorNumber

##### Name

GetLastErrorNumber

##### Description

Return the value of the error from the last method call. Example: GetLastErrorNumber()

##### Returns

A value of type string.

##### Remarks

API-Result-Codes: 0

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |


---

## GetLastErrorText

_Source: `markdown/ME-ASCET_Automation_API_Editor-Interface-GetLastErrorText.md`_

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: GetLastErrorText

##### Name

GetLastErrorText

##### Description

Return the text of the error from the last method call. Example: GetLastErrorText()

##### Returns

A value of type string.

##### Remarks

API-Result-Codes: 0

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |


---

## OpenComponentEditor

_Source: `markdown/ME-ASCET_Automation_API_Editor-Interface-OpenComponentEditor.md`_

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: OpenComponentEditor

##### Name

OpenComponentEditor

##### Description

Open a specification editor for the specified component. The editor will be opened as a child of the component manager. Return an error in case of: - No database open. - Item not found in database. - Editor is already open. - Editor could not be opened.

##### Parameters

| Name | Type | Direction | Description |
| --- | --- | --- | --- |
| componentPathName | string | Input | Hierarchical database path of the component. The database path has to be specified as absolute path and must not start with a slash. The folders have to be separated by using a backslash. |

##### Parameters

componentPathName

**Type:**string

Hierarchical database path of the component. The database path has to be specified as absolute path and must not start with a slash. The folders have to be separated by using a backslash.

##### Returns

A value of type string.

##### Example

OpenComponentEditor("Root\Class_Block_Diagram")

##### Remarks

API-Result-Codes: 0 1001 Invalid path name. 1002 Item not found in database. 1003 Item not loadable. 1004 No database. 1005 Operation failed. 1006 Path not found in database. 1007 Invalid operation. 1014 Invalid argument. 1017 Invalid element path. 1018 Invalid component path. 1020 Another editor is already open. 1047 Operation not supported in server mode.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |


---

## OpenComponentEditorForElement

_Source: `markdown/ME-ASCET_Automation_API_Editor-Interface-OpenComponentEditorForElement.md`_

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: OpenComponentEditorForElement

##### Name

OpenComponentEditorForElement

##### Description

Open a specification editor for a special component instance in the specified component. If the context component is no project the default project of this component will be used as context. The component instance has to be specified by its hierarchical element path name. Using the reserved name 'self' as hierarchical element path will open the editor for the specified component itself. Using an empty string as hierarchical element path will open the editor for the specified component itself. The editor will be opened as a child of the component manager. Return an error in case of: - No database open. - Item not found in database. - Editor for the resolved component is already open. - Editor could not be opened.

##### Parameters

| Name | Type | Direction | Description |
| --- | --- | --- | --- |
| componentPathName | string | Input | Hierarchical database path of the component. The database path has to be specified as absolute path and must not start with a slash. The folders have to be separated by using a backslash. |
| elementPathName | string | Input | Hierarchical element path inside of the component. The element path has to be specified as absolute path and must not start with a slash. The element path has to be separated by using a backslash. |

##### Parameters

componentPathName

**Type:**string

Hierarchical database path of the component. The database path has to be specified as absolute path and must not start with a slash. The folders have to be separated by using a backslash.

elementPathName

**Type:**string

Hierarchical element path inside of the component. The element path has to be specified as absolute path and must not start with a slash. The element path has to be separated by using a backslash.

##### Returns

A value of type string.

##### Example

OpenComponentEditorForElement("Root\Project", "module")

##### Remarks

API-Result-Codes: 0 1001 Invalid path name. 1002 Item not found in database. 1003 Item not loadable. 1004 No database. 1005 Operation failed. 1006 Path not found in database. 1007 Invalid operation. 1014 Invalid argument. 1017 Invalid element path. 1018 Invalid component path. 1020 Another editor is already open. 1047 Operation not supported in server mode.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |


---

## OpenDataEditorForElement

_Source: `markdown/ME-ASCET_Automation_API_Editor-Interface-OpenDataEditorForElement.md`_

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: OpenDataEditorForElement

##### Name

OpenDataEditorForElement

##### Description

Open a data element editor for an element in the specified component. The element has to be specified by its hierarchical path within the component. A previous hidden contents view in the component manager will be reactivated. The direkt parent component of the element will be selected in the tree pane of the component manager. The notebook in the contents view will be switched to the page 'Data'. The element will be selected in the contents table list. The data editor will be opened in the context of the component manager as a child window. Return an error in case of: - No database open. - Item not found in database. - Invalid component specified. - Invalid element specified. - Component not selectable. - Component has no table list contents view. - Editor for element is already opened by API. - Editor could not be created with time. (Timeout is 5s).

##### Parameters

| Name | Type | Direction | Description |
| --- | --- | --- | --- |
| elementPathName | string | Input | Hierarchical element path inside of the component. The element path has to be specified as absolute path and must not start with a slash. The element path has to be separated by using a backslash. |
| componentPathName | string | Input | Hierarchical database path of the component. The database path has to be specified as absolute path and must not start with a slash. The folders have to be separated by using a backslash. |

##### Parameters

elementPathName

**Type:**string

Hierarchical element path inside of the component. The element path has to be specified as absolute path and must not start with a slash. The element path has to be separated by using a backslash.

componentPathName

**Type:**string

Hierarchical database path of the component. The database path has to be specified as absolute path and must not start with a slash. The folders have to be separated by using a backslash.

##### Returns

A value of type string.

##### Example

OpenDataEditorForElement("module", "Root\Project")

##### Remarks

API-Result-Codes: 0 1001 Invalid path name. 1002 Item not found in database. 1003 Item not loadable. 1004 No database. 1005 Operation failed. 1006 Path not found in database. 1007 Invalid operation. 1014 Invalid argument. 1017 Invalid element path. 1018 Invalid component path. 1047 Operation not supported in server mode.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |


---

## OpenImplementationEditorForElement

_Source: `markdown/ME-ASCET_Automation_API_Editor-Interface-OpenImplementationEditorForElement.md`_

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: OpenImplementationEditorForElement

##### Name

OpenImplementationEditorForElement

##### Description

Open an implementation element editor for an element in the specified component. The element has to be specified by its hierarchical path within the component. A previous hidden contents view in the component manager will be reactivated. The direkt parent component of the element will be selected in the tree pane of the component manager. The notebook in the contents view will be switched to the page 'Implementation'. The element will be selected in the contents table list. The implementation editor will be opened in the context of the component manager as a child window. Return an error in case of: - No database open. - Item not found in database. - Invalid component specified. - Invalid element specified. - Component not selectable. - Component has no table list contents view. - Editor for element is already opened by API. - Editor could not be created with time. (Timeout is 5s).

##### Parameters

| Name | Type | Direction | Description |
| --- | --- | --- | --- |
| elementPathName | string | Input | Hierarchical element path inside of the component. The element path has to be specified as absolute path and must not start with a slash. The element path has to be separated by using a backslash. |
| componentPathName | string | Input | Hierarchical database path of the component. The database path has to be specified as absolute path and must not start with a slash. The folders have to be separated by using a backslash. |

##### Parameters

elementPathName

**Type:**string

Hierarchical element path inside of the component. The element path has to be specified as absolute path and must not start with a slash. The element path has to be separated by using a backslash.

componentPathName

**Type:**string

Hierarchical database path of the component. The database path has to be specified as absolute path and must not start with a slash. The folders have to be separated by using a backslash.

##### Returns

A value of type string.

##### Example

OpenImplementationEditorForElement("module", "Root\Project")

##### Remarks

API-Result-Codes: 0 1001 Invalid path name. 1002 Item not found in database. 1003 Item not loadable. 1004 No database. 1005 Operation failed. 1006 Path not found in database. 1007 Invalid operation. 1014 Invalid argument. 1017 Invalid element path. 1018 Invalid component path. 1047 Operation not supported in server mode.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |


---

## OpenMessageDialog

_Source: `markdown/ME-ASCET_Automation_API_Editor-Interface-OpenMessageDialog.md`_

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: OpenMessageDialog

##### Name

OpenMessageDialog

##### Description

Open a message dialog on the ASCET main window to block the user interface. Titel and message text can be specified by the caller. It is not possible to open more than one message dialogs at the same time. Example: OpenMessageDialog("ASCET is blocked - please wait", "Automation running")

##### Parameters

| Name | Type | Direction | Description |
| --- | --- | --- | --- |
| theMessage | string | Input |  |
| theTitel | string | Input |  |

##### Parameters

theMessage

**Type:**string

theTitel

**Type:**string

##### Returns

A value of type string.

##### Remarks

API-Result-Codes: 0 1005 Operation failed. 1027 Message box already open.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |


---

## OpenPropertyEditorForElement

_Source: `markdown/ME-ASCET_Automation_API_Editor-Interface-OpenPropertyEditorForElement.md`_

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: OpenPropertyEditorForElement

##### Name

OpenPropertyEditorForElement

##### Description

Open a property element editor for an element in the specified component. The element has to be specified by its hierarchical path within the component. A previous hidden contents view in the component manager will be reactivated. The direkt parent component of the element will be selected in the tree pane of the component manager. The notebook in the contents view will be switched to the page 'Elements'. The element will be selected in the contents table list. The property editor will be opened in the context of the component manager as a child window. Return an error in case of: - No database open. - Item not found in database. - Invalid component specified. - Invalid element specified. - Component not selectable. - Component has no table list contents view. - Editor for element is already opened by API. - Editor could not be created with time. (Timeout is 5s).

##### Parameters

| Name | Type | Direction | Description |
| --- | --- | --- | --- |
| elementPathName | string | Input | Hierarchical element path inside of the component. The element path has to be specified as absolute path and must not start with a slash. The element path has to be separated by using a backslash. |
| componentPathName | string | Input | Hierarchical database path of the component. The database path has to be specified as absolute path and must not start with a slash. The folders have to be separated by using a backslash. |

##### Parameters

elementPathName

**Type:**string

Hierarchical element path inside of the component. The element path has to be specified as absolute path and must not start with a slash. The element path has to be separated by using a backslash.

componentPathName

**Type:**string

Hierarchical database path of the component. The database path has to be specified as absolute path and must not start with a slash. The folders have to be separated by using a backslash.

##### Returns

A value of type string.

##### Example

OpenPropertyEditorForElement("module", "Root\Project")

##### Remarks

API-Result-Codes: 0 1001 Invalid path name. 1002 Item not found in database. 1003 Item not loadable. 1004 No database. 1005 Operation failed. 1006 Path not found in database. 1007 Invalid operation. 1014 Invalid argument. 1017 Invalid element path. 1018 Invalid component path. 1047 Operation not supported in server mode.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |


---

## SelectComponent

_Source: `markdown/ME-ASCET_Automation_API_Editor-Interface-SelectComponent.md`_

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: SelectComponent

##### Name

SelectComponent

##### Description

Select the specified component in the component mananger. Return an error in case of: - No database open. - Item not found in database.

##### Parameters

| Name | Type | Direction | Description |
| --- | --- | --- | --- |
| componentPathName | string | Input | Hierarchical database path of the component. The database path has to be specified as absolute path and must not start with a slash. The folders have to be separated by using a backslash. |

##### Parameters

componentPathName

**Type:**string

Hierarchical database path of the component. The database path has to be specified as absolute path and must not start with a slash. The folders have to be separated by using a backslash.

##### Returns

A value of type string.

##### Example

OpenComponentEditor("Root\Class_Block_Diagram")

##### Remarks

API-Result-Codes: 0 1001 Invalid path name. 1002 Item not found in database. 1003 Item not loadable. 1004 No database. 1005 Operation failed. 1006 Path not found in database. 1018 Invalid component path. 1047 Operation not supported in server mode.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |


---

## WriteAllProjectFiles

_Source: `markdown/ME-ASCET_Automation_API_Editor-Interface-WriteAllProjectFiles.md`_

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: WriteAllProjectFiles

##### Name

WriteAllProjectFiles

##### Description

Write the project files for the specified component. Return an error in case of: - No database open. (Error: 1004) - Item not found in database. (Error: 1018, 1002) - Specified component is not a project. (Error: 1014) - Target path for project files missing. (Error: 1001)

##### Parameters

| Name | Type | Direction | Description |
| --- | --- | --- | --- |
| componentPathName | string | Input | Hierarchical database path of the project. The database path has to be specified as absolute path and must not start with a slash. The folders have to be separated by using a backslash. |

##### Parameters

componentPathName

**Type:**string

Hierarchical database path of the project. The database path has to be specified as absolute path and must not start with a slash. The folders have to be separated by using a backslash.

##### Returns

A value of type string.

##### Example

WriteAllProjectFiles("Root\TEST_COD01_CE_B_CHARTABLE2Dp")

##### Remarks

API-Result-Codes: 0 1001 Invalid path name. 1002 Item not found in database. 1003 Item not loadable. 1004 No database. 1006 Path not found in database. 1014 Invalid argument. 1018 Invalid component path.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |


---

## ASCET Automation API Experiment-Interface

_Source: `markdown/WS-ASCET_Automation_API_Experiment-Interface.md`_

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# ASCET Automation API Experiment-Interface Web Service

##### Description

This is the AaaExperimentInterface service. This interface contains methods which are related to the build in experiment of ASCET.

##### See Also

[Methods](markdown/ME-ASCET_Automation_API_Experiment-Interface.md)

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |


---

## Methods

_Source: `markdown/ME-ASCET_Automation_API_Experiment-Interface.md`_

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Methods: ASCET Automation API Experiment-Interface

##### Methods

| Name | Description |
| --- | --- |
| CloseExperiment | Lookup for an open experiment. An open experiment will be closed by performing the window close action. The current experiment environment will not be saved. Return an error in case of: - Data Logger is active (use stop experiment) |
| CloseMessageDialog | Close the message box created with OpenMessageBox to enable control by the user interface. Example: CloseMessageDialog() |
| GetLastErrorNumber | Return the value of the error from the last method call. Example: GetLastErrorNumber() |
| GetLastErrorText | Return the text of the error from the last method call. Example: GetLastErrorText() |
| IsExperimentOpen | Lookup for an open experiment. Return an error in case of: - No open experiment available |
| LoadParameters | Read in the specified DCM style parameter file into the experiment. All entries of the parameter file will be read. Parameters as well as none volatile variables. The popup of the log file after read will be suppressed. Return an error in case of: - Experiment no open. - file path name is no valid. - Internal problem while reading. |
| OpenExperiment | Open the experiment for the specified component. If the component has to be opened within a project this must be done explicitly. If an experiment for the component is already open this experiment will be reused. If an experiment for another component is already open this experiment will be closed. The specified experiment configuration will be read for the experiment. If the default configuration should be used you can either use the string 'Default' or pass an empty string. The experiment will be opened as child window of the component manager. If necessary the build will automatically started before opening the experiment. Return an error in case of: - No database open. - Item not found in database. - Invalid component specified. - Hardware not defined. - Experiment configuration not available. - Error in build occured. - Component is no project and the project option 'Message Usage Variant' is #NON_OPT_COPY_TASK |
| OpenExperimentConfiguration | Open the specified experiment configuration into the open experiment. If an experiment for another component is already open this experiment will be closed. If the default configuration should be used you can either use the string 'Default' or pass an empty string. Return an error in case of: - No experiment open. - Experiment configuration not available. |
| OpenMessageDialog | Open a message dialog on the ASCET main window to block the user interface. Titel and message text can be specified by the caller. It is not possible to open more than one message dialogs at the same time. Example: OpenMessageDialog("ASCET is blocked - please wait", "Automation running") |
| PauseExperiment | This feature is only available for experiments in offline mode. The current experiment will set into paused state. Return an error in case of: - No experiment open. - Experiment is not in offline mode. |
| ReadHexScalarValue | Return the current implementation based value of the specified scalar element. Return an error in case of: - No experiment open. - Specified element not found. - Element is no measure or calibartion element. - Cannot read from target. |
| ReadPhysicalScalarValue | Return the current physical value of the specified scalar element. Return an error in case of: - No experiment open. - Specified element not found. - Element is no measure or calibartion element. - Cannot read from target. |
| ReconnectExperiment | The reconnect command will provide the possibility to experiment with an already running model on a target. The behavior is quiet similar to the open experiment command. The main difference is the circumstance that the model code will not be downloaded. In case of mismatch between the current target code and the selected project an error will be reported. If the component is no project the method will not use the default project to open the experiment. If the component has to be opened within a project this must be done explicitly. If an experiment for the component is already open this experiment will be reused. If an experiment for another component is already open this experiment will be closed. The specified experiment configuration will be read for the experiment. If the default configuration should be used you can either use the string 'Default' or pass an empty string. The experiment will be opened as child window of the component manager. If necessary the build will automatically started before opening the experiment. Return an error in case of: - No database open. - Item not found in database. - Invalid component specified. - Component already opened in another editor. - No suitable experimetn for reconnect found for current project settings. - Hardware not defined. - Experiment configuration not available. - Error in build occured. |
| ReinitializeParameters | Perform the reinitialize parameters action. The same action as available in the experiment will be executed. Offline experiment must be in pause or stopped state. Operating system must be stopped in online experiment. Return an error in case of: - No experiment open. - Experiment is running. |
| ReinitializeVariables | Perform the reinitialize variables action. The same action as available in the experiment will be executed. Offline experiment must be in pause or stopped state. Operating system must be stopped in online experiment. Return an error in case of: - No experiment open. - Experiment is running. |
| SaveParameters | Write all parameters of the experiment into the specified DCM style parameter file. Parameters as well as none volatile variables will be considered. The popup of the log file after read will be suppressed. Return an error in case of: - Experiment no open. - file path name is not valid. - Internal problem while writing. |
| SetDataLoggerFile | Preset the name and location of the measure file in the data logger. This file name will be used when the data logger will be stopped for the next time. Return an error in case of: - Invalid file name. - No data logger open. |
| SetStepMode | Set the break condition for the step mode in the offline experiment. ASCET provides three different types for the break condition. Specifying a number of steps will trigger this amount of events when stepping in the experiment. The number of steps must be at least 1. Specifying a duration will run the experiment until the experiment time will reach this duration when started by the step command. The duration must be greater than 0.0. Specifying a condition depending on a model element will run the experiment until the condition evaluates to true. The name of the model element must be available in the model. The condition must be out of the set of available conditions. The level must be a valid float value. Return an error in case of: - No experiment open. - Experiment is not in offline mode. - Invalid argument specified. - Step number not greater than zero. - Duration not greater than 0.0. - Condition element not avaliable in model. - Condition operator not available. - Condition level not a valid float number. |
| StartDataLogging | Start a present data logger in an experiment. To ensure that no data will be lost it is important to first start the data logger and than start the experiment. Return an error in case of: - No experiment open. - Data Generator not present. - Data Logger is already started. |
| StartExperiment | Start an experiment which is opened in offline mode. If a data logger is present start the data logger at first. Return an error in case of: - No experiment open. - Experiment is not in offline mode. - Experiment could not be started. - Data Generator not activated. - Channels with unmapped signal available. - No signals defined for channels with signalled mode. |
| StartMeasurement | Start the measure loop in an experiment which is opened in online mode. Return an error in case of: - No experiment open. - Experiment is not in online mode. - Measure loop could not be started. |
| StartOperatingSystem | Start the target operating system for an experiment which is opened in online mode. If a data logger is present start the data logger at first. Return an error in case of: - No experiment open. - Experiment is not in online mode. - Operating System could not be started. |
| StepExperiment | Perform the step experiment action for an experiment which is opened in offline mode. If a data logger is present start the data logger at first and stop it after the step condition is reach. The method will return after the abort condition is reached. Return an error in case of: - No experiment open. - Experiment is not in offline mode. - Step mode could not be activated. - Data Generator not activated. - Channels with unmapped signal available. - No signals defined for channels with signalled mode. |
| StopDataLogging | Stop a running data logger in an experiment. To ensure that no data will be lost it is important to stop the data logger after stopping the experiment. Return an error in case of: - No experiment open. - Data Generator not present. - Data Logger is not started. |
| StopExperiment | Stop an experiment which is opened in offline mode. If a data logger is present stop the data logger afterwards. Return an error in case of: - No experiment open. - Experiment is not in offline mode. - Experiment could not be stopped. |
| StopMeasurement | Stop the measure loop in an experiment which is opened in online mode. Return an error in case of: - No experiment open. - Experiment is not in online mode. - Measure loop could not be stopped. |
| StopOperatingSystem | Stop the target operating system for an experiment which is opened in online mode. If a data logger is present stop the data logger afterwards. Return an error in case of: - No experiment open. - Experiment is not in online mode. - Operating System could not be stopped. |
| UpdateDependentParameters | Perform the update dependent parameters action. The same action as available in the experiment will be executed. Offline experiment must be in pause or stopped state. Operating system must be stopped in online experiment. Return an error in case of: - No experiment open. - Experiment is running. |
| WriteHexScalarValue | Set the current implementation based value for the specified scalar element. If the same element is represented within a calibration editor, this editor will be updated to the new value. Return an error in case of: - No experiment open. - Specified element not found. - Element is no calibartion element. - Cannot read from target. |
| WritePhysicalScalarValue | Set the current physical value for the specified scalar element. If the same element is represented within a calibration editor, this editor will be updated to the new value. Return an error in case of: - No experiment open. - Specified element not found. - Element is calibartion element. - Cannot read from target. |
| WriteTargetDebuggerContentsToFile | Write the current available contents of the target debugger into a file. Reading the debug contents from the target will delete it automatically in the target buffer. If the target debug window is used and an update (automatically or manually) is performed this action will delete the current buffer on the target. Return an error in case of: - No experiment opened. - file name is not valid. - Accessing target debug buffer fails. |

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |


---

## CloseExperiment

_Source: `markdown/ME-ASCET_Automation_API_Experiment-Interface-CloseExperiment.md`_

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: CloseExperiment

##### Name

CloseExperiment

##### Description

Lookup for an open experiment. An open experiment will be closed by performing the window close action. The current experiment environment will not be saved. Return an error in case of: - Data Logger is active (use stop experiment)

##### Returns

A value of type string.

##### Example

CloseExperiment()

##### Remarks

API-Result-Codes: 0 1005 Operation failed. 1023 Data logging is running.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |


---

## CloseMessageDialog

_Source: `markdown/ME-ASCET_Automation_API_Experiment-Interface-CloseMessageDialog.md`_

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: CloseMessageDialog

##### Name

CloseMessageDialog

##### Description

Close the message box created with OpenMessageBox to enable control by the user interface. Example: CloseMessageDialog()

##### Returns

A value of type string.

##### Remarks

API-Result-Codes: 0 1005 Operation failed.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |


---

## GetLastErrorNumber

_Source: `markdown/ME-ASCET_Automation_API_Experiment-Interface-GetLastErrorNumber.md`_

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: GetLastErrorNumber

##### Name

GetLastErrorNumber

##### Description

Return the value of the error from the last method call. Example: GetLastErrorNumber()

##### Returns

A value of type string.

##### Remarks

API-Result-Codes: 0

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |


---

## GetLastErrorText

_Source: `markdown/ME-ASCET_Automation_API_Experiment-Interface-GetLastErrorText.md`_

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: GetLastErrorText

##### Name

GetLastErrorText

##### Description

Return the text of the error from the last method call. Example: GetLastErrorText()

##### Returns

A value of type string.

##### Remarks

API-Result-Codes: 0

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |


---

## IsExperimentOpen

_Source: `markdown/ME-ASCET_Automation_API_Experiment-Interface-IsExperimentOpen.md`_

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: IsExperimentOpen

##### Name

IsExperimentOpen

##### Description

Lookup for an open experiment. Return an error in case of: - No open experiment available

##### Returns

A value of type string.

##### Example

IsExperimentOpen()

##### Remarks

API-Result-Codes: 0 1009 No open experiment found.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |


---

## LoadParameters

_Source: `markdown/ME-ASCET_Automation_API_Experiment-Interface-LoadParameters.md`_

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: LoadParameters

##### Name

LoadParameters

##### Description

Read in the specified DCM style parameter file into the experiment. All entries of the parameter file will be read. Parameters as well as none volatile variables. The popup of the log file after read will be suppressed. Return an error in case of: - Experiment no open. - file path name is no valid. - Internal problem while reading.

##### Parameters

| Name | Type | Direction | Description |
| --- | --- | --- | --- |
| filePathName | string | Input | File name for the DCM file to load. |

##### Parameters

filePathName

**Type:**string

File name for the DCM file to load.

##### Returns

A value of type string.

##### Example

LoadParameters("c:\etas\ascet6.0\dcm\test.dcm")

##### Remarks

API-Result-Codes: 0 1005 Operation failed. 1009 No open experiment found. 1011 Invalid file name.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |


---

## OpenExperiment

_Source: `markdown/ME-ASCET_Automation_API_Experiment-Interface-OpenExperiment.md`_

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


---

## OpenExperimentConfiguration

_Source: `markdown/ME-ASCET_Automation_API_Experiment-Interface-OpenExperimentConfiguration.md`_

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


---

## OpenMessageDialog

_Source: `markdown/ME-ASCET_Automation_API_Experiment-Interface-OpenMessageDialog.md`_

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: OpenMessageDialog

##### Name

OpenMessageDialog

##### Description

Open a message dialog on the ASCET main window to block the user interface. Titel and message text can be specified by the caller. It is not possible to open more than one message dialogs at the same time. Example: OpenMessageDialog("ASCET is blocked - please wait", "Automation running")

##### Parameters

| Name | Type | Direction | Description |
| --- | --- | --- | --- |
| theMessage | string | Input |  |
| theTitel | string | Input |  |

##### Parameters

theMessage

**Type:**string

theTitel

**Type:**string

##### Returns

A value of type string.

##### Remarks

API-Result-Codes: 0 1005 Operation failed. 1027 Message box already open.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |


---

## PauseExperiment

_Source: `markdown/ME-ASCET_Automation_API_Experiment-Interface-PauseExperiment.md`_

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: PauseExperiment

##### Name

PauseExperiment

##### Description

This feature is only available for experiments in offline mode. The current experiment will set into paused state. Return an error in case of: - No experiment open. - Experiment is not in offline mode.

##### Returns

A value of type string.

##### Example

PauseExperiment()

##### Remarks

API-Result-Codes: 0 1005 Operation failed. 1007 Invalid operation. 1009 No open experiment found. 1032 Event Generator has no event to activate your code.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |


---

## ReadHexScalarValue

_Source: `markdown/ME-ASCET_Automation_API_Experiment-Interface-ReadHexScalarValue.md`_

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: ReadHexScalarValue

##### Name

ReadHexScalarValue

##### Description

Return the current implementation based value of the specified scalar element. Return an error in case of: - No experiment open. - Specified element not found. - Element is no measure or calibartion element. - Cannot read from target.

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

ReadHexScalarValue("Project\farben")

##### Remarks

API-Result-Codes: 0 1002 Label not found. 1007 Invalid operation. 1009 No open experiment found. 1014 Invalid argument. 1025 Cannot read from target.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |


---

## ReadPhysicalScalarValue

_Source: `markdown/ME-ASCET_Automation_API_Experiment-Interface-ReadPhysicalScalarValue.md`_

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


---

## ReconnectExperiment

_Source: `markdown/ME-ASCET_Automation_API_Experiment-Interface-ReconnectExperiment.md`_

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


---

## ReinitializeParameters

_Source: `markdown/ME-ASCET_Automation_API_Experiment-Interface-ReinitializeParameters.md`_

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: ReinitializeParameters

##### Name

ReinitializeParameters

##### Description

Perform the reinitialize parameters action. The same action as available in the experiment will be executed. Offline experiment must be in pause or stopped state. Operating system must be stopped in online experiment. Return an error in case of: - No experiment open. - Experiment is running.

##### Returns

A value of type string.

##### Example

ReinitializeParameters()

##### Remarks

API-Result-Codes: 0 1005 Operation failed. 1009 No open experiment found.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |


---

## ReinitializeVariables

_Source: `markdown/ME-ASCET_Automation_API_Experiment-Interface-ReinitializeVariables.md`_

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: ReinitializeVariables

##### Name

ReinitializeVariables

##### Description

Perform the reinitialize variables action. The same action as available in the experiment will be executed. Offline experiment must be in pause or stopped state. Operating system must be stopped in online experiment. Return an error in case of: - No experiment open. - Experiment is running.

##### Returns

A value of type string.

##### Example

ReinitializeVariables()

##### Remarks

API-Result-Codes: 0 1005 Operation failed. 1009 No open experiment found.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |


---

## SaveParameters

_Source: `markdown/ME-ASCET_Automation_API_Experiment-Interface-SaveParameters.md`_

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: SaveParameters

##### Name

SaveParameters

##### Description

Write all parameters of the experiment into the specified DCM style parameter file. Parameters as well as none volatile variables will be considered. The popup of the log file after read will be suppressed. Return an error in case of: - Experiment no open. - file path name is not valid. - Internal problem while writing.

##### Parameters

| Name | Type | Direction | Description |
| --- | --- | --- | --- |
| filePathName | string | Input | File name for the DCM file to save. |

##### Parameters

filePathName

**Type:**string

File name for the DCM file to save.

##### Returns

A value of type string.

##### Example

SaveParameters("c:\etas\ascet6.0\dcm\test.dcm")

##### Remarks

API-Result-Codes: 0 1005 Operation failed. 1009 No open experiment found. 1011 Invalid file name.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |


---

## SetDataLoggerFile

_Source: `markdown/ME-ASCET_Automation_API_Experiment-Interface-SetDataLoggerFile.md`_

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: SetDataLoggerFile

##### Name

SetDataLoggerFile

##### Description

Preset the name and location of the measure file in the data logger. This file name will be used when the data logger will be stopped for the next time. Return an error in case of: - Invalid file name. - No data logger open.

##### Parameters

| Name | Type | Direction | Description |
| --- | --- | --- | --- |
| filePathName | string | Input | File name for the target log file. |

##### Parameters

filePathName

**Type:**string

File name for the target log file.

##### Returns

A value of type string.

##### Example

SetDataLoggerFile("d:\ETASData\ASCET6.0\test.dat")

##### Remarks

API-Result-Codes: 0 1011 Invalid file name. 1012 No open data logger found.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |


---

## SetStepMode

_Source: `markdown/ME-ASCET_Automation_API_Experiment-Interface-SetStepMode.md`_

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


---

## StartDataLogging

_Source: `markdown/ME-ASCET_Automation_API_Experiment-Interface-StartDataLogging.md`_

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


---

## StartExperiment

_Source: `markdown/ME-ASCET_Automation_API_Experiment-Interface-StartExperiment.md`_

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


---

## StartMeasurement

_Source: `markdown/ME-ASCET_Automation_API_Experiment-Interface-StartMeasurement.md`_

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: StartMeasurement

##### Name

StartMeasurement

##### Description

Start the measure loop in an experiment which is opened in online mode. Return an error in case of: - No experiment open. - Experiment is not in online mode. - Measure loop could not be started.

##### Returns

A value of type string.

##### Example

StartMeasurement()

##### Remarks

API-Result-Codes: 0 1005 Operation failed. 1007 Invalid operation. 1009 No open experiment found. 1039 No measure channels are existing for data aquisition.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |


---

## StartOperatingSystem

_Source: `markdown/ME-ASCET_Automation_API_Experiment-Interface-StartOperatingSystem.md`_

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: StartOperatingSystem

##### Name

StartOperatingSystem

##### Description

Start the target operating system for an experiment which is opened in online mode. If a data logger is present start the data logger at first. Return an error in case of: - No experiment open. - Experiment is not in online mode. - Operating System could not be started.

##### Returns

A value of type string.

##### Example

StartOperatingSystem()

##### Remarks

API-Result-Codes: 0 1005 Operation failed. 1007 Invalid operation. 1009 No open experiment found.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |


---

## StepExperiment

_Source: `markdown/ME-ASCET_Automation_API_Experiment-Interface-StepExperiment.md`_

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


---

## StopDataLogging

_Source: `markdown/ME-ASCET_Automation_API_Experiment-Interface-StopDataLogging.md`_

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


---

## StopExperiment

_Source: `markdown/ME-ASCET_Automation_API_Experiment-Interface-StopExperiment.md`_

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: StopExperiment

##### Name

StopExperiment

##### Description

Stop an experiment which is opened in offline mode. If a data logger is present stop the data logger afterwards. Return an error in case of: - No experiment open. - Experiment is not in offline mode. - Experiment could not be stopped.

##### Returns

A value of type string.

##### Example

StopExperiment()

##### Remarks

API-Result-Codes: 0 1005 Operation failed. 1007 Invalid operation. 1009 No open experiment found.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |


---

## StopMeasurement

_Source: `markdown/ME-ASCET_Automation_API_Experiment-Interface-StopMeasurement.md`_

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: StopMeasurement

##### Name

StopMeasurement

##### Description

Stop the measure loop in an experiment which is opened in online mode. Return an error in case of: - No experiment open. - Experiment is not in online mode. - Measure loop could not be stopped.

##### Returns

A value of type string.

##### Example

StopMeasurement()

##### Remarks

API-Result-Codes: 0 1005 Operation failed. 1007 Invalid operation. 1009 No open experiment found.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |


---

## StopOperatingSystem

_Source: `markdown/ME-ASCET_Automation_API_Experiment-Interface-StopOperatingSystem.md`_

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: StopOperatingSystem

##### Name

StopOperatingSystem

##### Description

Stop the target operating system for an experiment which is opened in online mode. If a data logger is present stop the data logger afterwards. Return an error in case of: - No experiment open. - Experiment is not in online mode. - Operating System could not be stopped.

##### Returns

A value of type string.

##### Example

StartExperiment()

##### Remarks

API-Result-Codes: 0 1005 Operation failed. 1007 Invalid operation. 1009 No open experiment found.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |


---

## UpdateDependentParameters

_Source: `markdown/ME-ASCET_Automation_API_Experiment-Interface-UpdateDependentParameters.md`_

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: UpdateDependentParameters

##### Name

UpdateDependentParameters

##### Description

Perform the update dependent parameters action. The same action as available in the experiment will be executed. Offline experiment must be in pause or stopped state. Operating system must be stopped in online experiment. Return an error in case of: - No experiment open. - Experiment is running.

##### Returns

A value of type string.

##### Example

UpdateDependentParameters()

##### Remarks

API-Result-Codes: 0 1005 Operation failed. 1009 No open experiment found.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |


---

## WriteHexScalarValue

_Source: `markdown/ME-ASCET_Automation_API_Experiment-Interface-WriteHexScalarValue.md`_

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: WriteHexScalarValue

##### Name

WriteHexScalarValue

##### Description

Set the current implementation based value for the specified scalar element. If the same element is represented within a calibration editor, this editor will be updated to the new value. Return an error in case of: - No experiment open. - Specified element not found. - Element is no calibartion element. - Cannot read from target.

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

WriteHexScalarValue("Project\farben", "2")

##### Remarks

API-Result-Codes: 0 1002 Label not found. 1007 Invalid operation. 1009 No open experiment found. 1014 Invalid argument.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |


---

## WritePhysicalScalarValue

_Source: `markdown/ME-ASCET_Automation_API_Experiment-Interface-WritePhysicalScalarValue.md`_

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


---

## WriteTargetDebuggerContentsToFile

_Source: `markdown/ME-ASCET_Automation_API_Experiment-Interface-WriteTargetDebuggerContentsToFile.md`_

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: WriteTargetDebuggerContentsToFile

##### Name

WriteTargetDebuggerContentsToFile

##### Description

Write the current available contents of the target debugger into a file. Reading the debug contents from the target will delete it automatically in the target buffer. If the target debug window is used and an update (automatically or manually) is performed this action will delete the current buffer on the target. Return an error in case of: - No experiment opened. - file name is not valid. - Accessing target debug buffer fails.

##### Parameters

| Name | Type | Direction | Description |
| --- | --- | --- | --- |
| filePathName | string | Input | File name for the target log file. |

##### Parameters

filePathName

**Type:**string

File name for the target log file.

##### Returns

A value of type string.

##### Example

WriteTargetDebuggerContentsToFile("c:\temp\targetLog.txt")

##### Remarks

API-Result-Codes: 0 1005 Operation failed. 1009 No open experiment found. 1011 Invalid file name.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |


---

## ASCET Automation API Tool-Interface

_Source: `markdown/WS-ASCET_Automation_API_Tool-Interface.md`_

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# ASCET Automation API Tool-Interface Web Service

##### Description

This is the AaaToolInterface service. This interface contains methods which are related to the data base handling of ASCET.

##### See Also

[Methods](markdown/ME-ASCET_Automation_API_Tool-Interface.md)

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |


---

## Methods

_Source: `markdown/ME-ASCET_Automation_API_Tool-Interface.md`_

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Methods: ASCET Automation API Tool-Interface

##### Methods

| Name | Description |
| --- | --- |
| About | Return a fix about string. |
| ActivateNoSaveMode | No changes in the current opened workspace will be saved. All changes get lost when closing the tool or the workspace. Return an error in case of: - No workspace is opened. |
| ApiVersion | Return the current version of the ASCET Automation API. |
| ClearMonitorContents | Clear the current monitor contents. |
| CloseCurrentDatabase | The current used database will be closed. Return an error in case of: - The database could not been closed. |
| CloseDataStorage | The current used database or workspace will be closed. Return an error in case of: - The database or workspace could not been closed. |
| CloseMessageDialog | Close the message box created with OpenMessageBox to enable control by the user interface. Example: CloseMessageDialog() |
| ConvertDatabaseToWorkspace | Convert the current opened database into a new workspace by using the Database to Workspace Conversion dialog. The new workspace will be created in the file system at the specified file path. If the path for the new workspace does not exist it will be created. If the specified file path contains an ASCET workspace file name (*.aws) an error result will be created. If the specified file path contains at least one folder an error result will be created. If the workspace already exists an error result will be created. If the specified workspace file path is not an absolute path in the file system then the current workspace path will be used as prefix for the path. If there are further *.aws files in the same directory an error result will be created. All opened windows and the current database will be closed. Return an error in case of: - The specified path is not valid (Error 1001). - No additional folder for the *.aws file is specified (Error 1001). - The workspace already exists (Error 1044). - A system reserved file name is used (Error 1001). - The target directory is not empty (Error 1001). - The new workspace could not be created (Error 1005). |
| CreateDatabase | Create a new database in the file system at the location by using the specified path. If the path for the new database does not exist it will be created. If the database already exists an error result will be created. If the current used data storage is locked an error result will be created. If the specified data base path is not an absolute path in the file system then the current data base path will be used as prefix for the path. All opened windows and the current database will be closed. Return an error in case of: - The specified path is not valid or the database could not be created in this path (Error 1001). - The database already exists (Error 1044). - The target directory is not empty (Error 1001). - The current data storage is locked (Error 1043). - The current opened data storage could not be closed (Error 1005). - The new database could not be created (Error 1005). |
| CreateWorkspace | Create a new workspace in the file system at the location by using the specified file path. If the path for the new workspace does not exist it will be created. If the specified file path does not contain an ASCET workspace file name (*.aws) an error result will be created. If the specified file path does not contain at least one folder an error result will be created. If the workspace already exists an error result will be created. If the current used data storage is locked an error result will be created. If the specified workspace file path is not an absolute path in the file system then the current workspace path will be used as prefix for the path. If there are further *.aws files in the same directory an error result will be created. All opened windows and the current database will be closed. Return an error in case of: - The specified path is not valid (Error 1001). - No additional folder for the *.aws file is specified (Error 1001). - The workspace already exists (Error 1044). - The current data storage is locked (Error 1043). - A system reserved file name is used (Error 1001). - The target directory is not empty (Error 1001). - The current opened data storage could not be closed (Error 1005). - The new database could not be created (Error 1005). |
| DatabasePath | Answer a string containing the file system location of the current used database. Return an error in case of: - No database is open. |
| DataStoragePath | Answer a string containing the file system location of the current used database or workspace. Return an error in case of: - No database or workspace is open. |
| ExportBuildMessagesAsXMLToFile | Write the build messages in XML style into a file. Return an error in case of: - The files cannot be created. (Error: 1001) |
| ExportItemToPath | Lookup for the specified component and export it to the specified path. Depending on the tool option 'Create Complete Hierarchy' the folder structure of the database will be used to arrange the component on the file system or not. Using an asterisk as parameter for the componentPathName will export the top folders. Return an error in case of: - No database open. - Item not found in database. - Invalid component specified. - path name is not valid. - export action failed. |
| ExportItemToPathWithOptions | Lookup for the specified component and export it to the specified path using the specified option set. The current option value in ASCET will be superseeded by the specified option set and restored after the operation is finished. Using an asterisk as parameter for the componentPathName will export the top folders. A valid option set could be generated by opening the ASCET tool options and exporting the options in the option path: Options\Interfaces\Exports. Return an error in case of: - No database open. - Item not found in database. - Invalid component specified. - path name is not valid. - export action failed. |
| ExportItemToZipFile | Lookup for the specified component and export it into the specified zip file. Using an asterisk as parameter for the componentPathName will export the top folders. Return an error in case of: - No database open. - Item not found in database. - Invalid component specified. - target zip file path not valid. - export action failed. |
| ExportItemToZipFileWithOptions | Lookup for the specified component and export it into the specified zip file using the specified option set. The current option value in ASCET will be superseeded by the specified option set and restored after the operation is finished. Using an asterisk as parameter for the componentPathName will export the top folders. A valid option set could be generated by opening the ASCET tool options and exporting the options in the option path: Options\Interfaces\Exports. Return an error in case of: - No database open. - Item not found in database. - Invalid component specified. - target zip file path not valid. - export action failed. |
| ExportItemWithReferencesToPath | Lookup for the specified component and its references in the database and export them to the specified path. The folder hierarchy of the database will be used to arrange the components on the file system. Using an asterisk as parameter for the componentPathName will export the top folders. Return an error in case of: - No database open. - Item not found in database. - Invalid component specified. - path name is not valid. - export action failed. |
| ExportItemWithReferencesToZipFile | Lookup for the specified component and its referenced items and export them into the specified zip file. Using an asterisk as parameter for the componentPathName will export the top folders. Return an error in case of: - No database open. - Item not found in database. - Invalid component specified. - target zip file path not valid. - export action failed. |
| ExportMappingForComponentToFile | Export the mappings for the specified component into a XML or CSV file. The output file format will be derived from the file extension of the specified file name. Return an error in case of: - No database open. - Item not found in database. - Invalid component specified. - Invalid file name. - export action failed. |
| exportMappingForSoftwareComponent_toFile | Export the mappings for the specified component into a XML or CSV file. The output file format will be derived from the file extension of the specified file name. Return an error in case of: - No database open. - Item not found in database. - Invalid component specified. - Invalid file name. - export action failed. |
| FlashTarget | The reconnect command will provide the possibility to experiment with an already running model on a target. The behavior is quiet similar to the open experiment command. The main difference is the circumstance that the model code will not be downloaded. The flash command will provide the possibility to store the executable of the model into the flash memory of a rapid prototyping hardware. If the component is no project the method will not use the default project to open the experiment. Return an error in case of: - No database open. - Item not found in database. - Invalid component specified. - Autosar project specified. - Hardware not defined. |
| GetLastErrorNumber | Return the value of the error from the last method call. Example: GetLastErrorNumber() |
| GetLastErrorText | Return the text of the error from the last method call. Example: GetLastErrorText() |
| GetProcessId | Return the operating system process id. |
| ImportFromFile | Import the component stored in the specified amd file. The current setting of the import options "Keep Hierarchy" and "Remap OIDs" are ignored by this function. The default values "Keep Hierarchy = true" and "Remap OIDs = false" are used instead. Return an error in case of: - No database open. - file name is not valid. - no item imported. - import problems detected. - import action failed. |
| ImportFromPath | Import all available components stored in the specified file system directory. The current setting of the import options "Keep Hierarchy" and "Remap OIDs" are ignored by this function. The default values "Keep Hierarchy = true" and "Remap OIDs = false" are used instead. Return an error in case of: - No database open. - path name is not valid. - no item imported. - import problems detected. - import action failed. |
| ImportFromZipFile | Import all components stored in the specified axl/zip file. The current setting of the import options "Keep Hierarchy" and "Remap OIDs" are ignored by this function. The default values "Keep Hierarchy = true" and "Remap OIDs = false" are used instead. Return an error in case of: - No database open. - file name is not valid. - no item imported. - import problems detected. - import action failed. |
| ImportMappingForComponentFromFile | Import the mappings for the specified component from a XML or CSV file. The input file format will be derived from the file extension of the specified file name. Return an error in case of: - No database open. - Item not found in database. - Invalid component specified. - Invalid file name. - export action failed. |
| importMappingForSoftwareComponent_fromFile | Import the mappings for the specified component from a XML or CSV file. The input file format will be derived from the file extension of the specified file name. Return an error in case of: - No database open. - Item not found in database. - Invalid component specified. - Invalid file name. - export action failed. |
| ImportWithReferencesFromFile | Import the component stored in the specified amd file. Additionally all references of this component to other components which are available and visible within the directory tree of the specified component will be imported. The current setting of the import options "Keep Hierarchy" and "Remap OIDs" are ignored by this function. The default values "Keep Hierarchy = true" and "Remap OIDs = false" are used instead. Return an error in case of: - No database open. - file name is not valid. - no item imported. - import problems detected. - import action failed. |
| ImportWithReferencesFromPath | Import all available components stored in the specified file system directory. Additionally all references of those components to other components which are available and visible within the directory tree of the specified path will be imported. The current setting of the import options "Keep Hierarchy" and "Remap OIDs" are ignored by this function. The default values "Keep Hierarchy = true" and "Remap OIDs = false" are used instead. Return an error in case of: - No database open. - path name is not valid. - no item imported. - import problems detected. - import action failed. |
| OpenAndConvertDatabase | Open the database specified by the file system location and convert the database if necessary. If the current database matches the specified file system location the method end immediatelly. If a conversion of the database must be performed this may take a long time. Please ensure that a backup of the database exists before calling this method. All opened windows and the current database will be closed first. Return an error in case of: - The current database could not be closed. - The database is not compatible to the current ASCET version. - The file system location is not valid. - The database could not been converted. - The conversion is aborted due to an internal problen. |
| OpenDatabase | Open the database specified by the file system location. If the current database matches to the specified file system location the method ends immediatelly. All opened windows and the current database will be closed first. Return an error in case of: - The current database could not be closed. - The database is not compatible to the current ASCET version. - The file system location is not valid. |
| OpenMessageDialog | Open a message dialog on the ASCET main window to block the user interface. Titel and message text can be specified by the caller. It is not possible to open more than one message dialogs at the same time. Example: OpenMessageDialog("ASCET is blocked - please wait", "Automation running") |
| OpenWorkspace | Open the workspace specified by the related *.aws file. If the file path name of the specified workspace matches to the current workspace the method end immediatelly. All opened windows and the current data storage will be closed first. Return an error in case of: - The current data storage could not be closed. - The file system location is not valid. |
| Ping | Simple method to check the ASCET Automation API. The method does not create an error. |
| ReadToolOptions | Set the options for ASCET according to the settings in the specified file. Return an error in case of: - file name is not valid. - reading xml options failed. |
| SearchForHardware | Return a XML style string containing the current available systems connected to the PC. If no system is found an empty string will be returned. If more than one system is found the systems are separated by a carriage return character. Example: " system system " |
| SelectHardwareForProject | Assign a available system to the specified project. If a component is specified instead of a project the assignment will be performed with its default project. In case that more than one system is available which matches to the project the desired system must be selected by specifying its serial number. If there is only one system availbale which matches to the project any empty string could be passed as serial number. Return an error in case of: - No valid component or project specified. - Hardware not found. |
| Shutdown | Closes the tool by closing the component manager. The method returns immediatelly. The tool will be closed at least 0,5 seconds later. |
| SwitchLoggingOff | Deactivate logging. |
| SwitchLoggingOn | Activate logging. |
| ToolVersion | Return the version string for the current used ASCET. |
| WriteMonitorContentsToPath | Write the current contents of the monitor into a file. The monitor contents will not be cleared afterwards. In the specified directory a file named 'logger.log' will be created with the current contents of the page 'Monitor'. The contents of the page 'Build' will be written into the same directory in a file named 'build.log'. Return an error in case of: - The files cannot be created. |
| WriteTextToMonitor | Write the specified text to the monitor window. |
| WriteToolOptions | Write the specified option file in xml style which contains the values of the ASCET options. Return an error in case of: - file name is not valid. - writing xml options failed. |

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |


---

## About

_Source: `markdown/ME-ASCET_Automation_API_Tool-Interface-About.md`_

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: About

##### Name

About

##### Description

Return a fix about string.

##### Returns

A value of type string.

##### Example

About()

##### Remarks

API-Result-Codes: NO RESULT CODES!

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |


---

## ActivateNoSaveMode

_Source: `markdown/ME-ASCET_Automation_API_Tool-Interface-ActivateNoSaveMode.md`_

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: ActivateNoSaveMode

##### Name

ActivateNoSaveMode

##### Description

No changes in the current opened workspace will be saved. All changes get lost when closing the tool or the workspace. Return an error in case of: - No workspace is opened.

##### Returns

A value of type string.

##### Example

ActivateNoSaveMode()

##### Remarks

API-Result-Codes: 0 1004 No database. 1040 No workspace.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |


---

## ApiVersion

_Source: `markdown/ME-ASCET_Automation_API_Tool-Interface-ApiVersion.md`_

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: ApiVersion

##### Name

ApiVersion

##### Description

Return the current version of the ASCET Automation API.

##### Returns

A value of type string.

##### Example

ApiVersion()

##### Remarks

API-Result-Codes: NO RESULT CODES!

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |


---

## ClearMonitorContents

_Source: `markdown/ME-ASCET_Automation_API_Tool-Interface-ClearMonitorContents.md`_

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: ClearMonitorContents

##### Name

ClearMonitorContents

##### Description

Clear the current monitor contents.

##### Returns

A value of type string.

##### Example

ClearMonitorContents()

##### Remarks

API-Result-Codes: 0

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |


---

## CloseCurrentDatabase

_Source: `markdown/ME-ASCET_Automation_API_Tool-Interface-CloseCurrentDatabase.md`_

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: CloseCurrentDatabase

##### Name

CloseCurrentDatabase

##### Description

The current used database will be closed. Return an error in case of: - The database could not been closed.

##### Returns

A value of type string.

##### Example

CloseCurrentDatabase()

##### Remarks

API-Result-Codes: 0 1005 Operation failed. 1021 A long lasting action is running.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |


---

## CloseDataStorage

_Source: `markdown/ME-ASCET_Automation_API_Tool-Interface-CloseDataStorage.md`_

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: CloseDataStorage

##### Name

CloseDataStorage

##### Description

The current used database or workspace will be closed. Return an error in case of: - The database or workspace could not been closed.

##### Returns

A value of type string.

##### Example

CloseDataStorage()

##### Remarks

API-Result-Codes: 0 1005 Operation failed. 1021 A long lasting action is running. 1023 Data logging is running.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |


---

## CloseMessageDialog

_Source: `markdown/ME-ASCET_Automation_API_Tool-Interface-CloseMessageDialog.md`_

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: CloseMessageDialog

##### Name

CloseMessageDialog

##### Description

Close the message box created with OpenMessageBox to enable control by the user interface. Example: CloseMessageDialog()

##### Returns

A value of type string.

##### Remarks

API-Result-Codes: 0 1005 Operation failed.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |


---

## ConvertDatabaseToWorkspace

_Source: `markdown/ME-ASCET_Automation_API_Tool-Interface-ConvertDatabaseToWorkspace.md`_

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: ConvertDatabaseToWorkspace

##### Name

ConvertDatabaseToWorkspace

##### Description

Convert the current opened database into a new workspace by using the Database to Workspace Conversion dialog. The new workspace will be created in the file system at the specified file path. If the path for the new workspace does not exist it will be created. If the specified file path contains an ASCET workspace file name (*.aws) an error result will be created. If the specified file path contains at least one folder an error result will be created. If the workspace already exists an error result will be created. If the specified workspace file path is not an absolute path in the file system then the current workspace path will be used as prefix for the path. If there are further *.aws files in the same directory an error result will be created. All opened windows and the current database will be closed. Return an error in case of: - The specified path is not valid (Error 1001). - No additional folder for the *.aws file is specified (Error 1001). - The workspace already exists (Error 1044). - A system reserved file name is used (Error 1001). - The target directory is not empty (Error 1001). - The new workspace could not be created (Error 1005).

##### Parameters

| Name | Type | Direction | Description |
| --- | --- | --- | --- |
| workspaceFilePath | string | Input | File path name for the new workspace file (*.aws) on the file system. |

##### Parameters

workspaceFilePath

**Type:**string

File path name for the new workspace file (*.aws) on the file system.

##### Returns

A value of type string.

##### Example

ConvertDatabaseToWorkspace("D:\ETASData\ASCET6.2\Workspaces\myWorkspace\myWorkspace.aws")

##### Remarks

API-Result-Codes: 0 1001 Invalid path name. 1004 No database. 1005 Operation failed. 1021 A long lasting action is running. 1044 Data storage already exists.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |


---

## CreateDatabase

_Source: `markdown/ME-ASCET_Automation_API_Tool-Interface-CreateDatabase.md`_

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: CreateDatabase

##### Name

CreateDatabase

##### Description

Create a new database in the file system at the location by using the specified path. If the path for the new database does not exist it will be created. If the database already exists an error result will be created. If the current used data storage is locked an error result will be created. If the specified data base path is not an absolute path in the file system then the current data base path will be used as prefix for the path. All opened windows and the current database will be closed. Return an error in case of: - The specified path is not valid or the database could not be created in this path (Error 1001). - The database already exists (Error 1044). - The target directory is not empty (Error 1001). - The current data storage is locked (Error 1043). - The current opened data storage could not be closed (Error 1005). - The new database could not be created (Error 1005).

##### Parameters

| Name | Type | Direction | Description |
| --- | --- | --- | --- |
| databasePath | string | Input | File system path for the new ASCET database. |

##### Parameters

databasePath

**Type:**string

File system path for the new ASCET database.

##### Returns

A value of type string.

##### Example

CreateDatabase("C:\databases\myDatabase")

##### Remarks

API-Result-Codes: 0 1001 Invalid path name. 1005 Operation failed. 1021 A long lasting action is running. 1023 Data logging is running. 1043 Current data storage is locked. 1044 Data storage already exists.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |


---

## CreateWorkspace

_Source: `markdown/ME-ASCET_Automation_API_Tool-Interface-CreateWorkspace.md`_

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: CreateWorkspace

##### Name

CreateWorkspace

##### Description

Create a new workspace in the file system at the location by using the specified file path. If the path for the new workspace does not exist it will be created. If the specified file path does not contain an ASCET workspace file name (*.aws) an error result will be created. If the specified file path does not contain at least one folder an error result will be created. If the workspace already exists an error result will be created. If the current used data storage is locked an error result will be created. If the specified workspace file path is not an absolute path in the file system then the current workspace path will be used as prefix for the path. If there are further *.aws files in the same directory an error result will be created. All opened windows and the current database will be closed. Return an error in case of: - The specified path is not valid (Error 1001). - No additional folder for the *.aws file is specified (Error 1001). - The workspace already exists (Error 1044). - The current data storage is locked (Error 1043). - A system reserved file name is used (Error 1001). - The target directory is not empty (Error 1001). - The current opened data storage could not be closed (Error 1005). - The new database could not be created (Error 1005).

##### Parameters

| Name | Type | Direction | Description |
| --- | --- | --- | --- |
| workspaceFilePath | string | Input | File path name for the workspace file (*.aws) on the file system. |

##### Parameters

workspaceFilePath

**Type:**string

File path name for the workspace file (*.aws) on the file system.

##### Returns

A value of type string.

##### Example

CreateWorkspace("D:\ETASData\ASCET6.2\Workspaces\myWorkspace\myWorkspace.aws")

##### Remarks

API-Result-Codes: 0 1001 Invalid path name. 1005 Operation failed. 1021 A long lasting action is running. 1023 Data logging is running. 1043 Current data storage is locked. 1044 Data storage already exists.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |


---

## DatabasePath

_Source: `markdown/ME-ASCET_Automation_API_Tool-Interface-DatabasePath.md`_

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: DatabasePath

##### Name

DatabasePath

##### Description

Answer a string containing the file system location of the current used database. Return an error in case of: - No database is open.

##### Returns

A value of type string.

##### Example

DatabasePath()

##### Remarks

API-Result-Codes: 1004 No database.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |


---

## DataStoragePath

_Source: `markdown/ME-ASCET_Automation_API_Tool-Interface-DataStoragePath.md`_

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: DataStoragePath

##### Name

DataStoragePath

##### Description

Answer a string containing the file system location of the current used database or workspace. Return an error in case of: - No database or workspace is open.

##### Returns

A value of type string.

##### Example

DataStoragePath()

##### Remarks

API-Result-Codes: 1004 No database.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |


---

## ExportBuildMessagesAsXMLToFile

_Source: `markdown/ME-ASCET_Automation_API_Tool-Interface-ExportBuildMessagesAsXMLToFile.md`_

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: ExportBuildMessagesAsXMLToFile

##### Name

ExportBuildMessagesAsXMLToFile

##### Description

Write the build messages in XML style into a file. Return an error in case of: - The files cannot be created. (Error: 1001)

##### Parameters

| Name | Type | Direction | Description |
| --- | --- | --- | --- |
| filePathName | string | Input | File path for the created xml files. |

##### Parameters

filePathName

**Type:**string

File path for the created xml files.

##### Returns

A value of type string.

##### Example

ExportBuildMessagesAsXMLToFile("c:\temp\CodegenerationGui.xml")

##### Remarks

API-Result-Codes: 0 1001 Invalid path name.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |


---

## ExportItemToPath

_Source: `markdown/ME-ASCET_Automation_API_Tool-Interface-ExportItemToPath.md`_

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: ExportItemToPath

##### Name

ExportItemToPath

##### Description

Lookup for the specified component and export it to the specified path. Depending on the tool option 'Create Complete Hierarchy' the folder structure of the database will be used to arrange the component on the file system or not. Using an asterisk as parameter for the componentPathName will export the top folders. Return an error in case of: - No database open. - Item not found in database. - Invalid component specified. - path name is not valid. - export action failed.

##### Parameters

| Name | Type | Direction | Description |
| --- | --- | --- | --- |
| componentPathName | string | Input | Hierarchical database path of the component. The database path has to be specified as absolute path and must not start with a slash. The folders have to be separated by using a backslash. |
| outputPath | string | Input | Directory path on the file system used as root directory for the export. |

##### Parameters

componentPathName

**Type:**string

Hierarchical database path of the component. The database path has to be specified as absolute path and must not start with a slash. The folders have to be separated by using a backslash.

outputPath

**Type:**string

Directory path on the file system used as root directory for the export.

##### Returns

A value of type string.

##### Example

ExportItemToPath("Instances\P1", "c:\temp\")

##### Remarks

API-Result-Codes: 0 1001 Invalid path name. 1002 Item not found in database. 1003 Item not loadable. 1004 No database. 1005 Operation failed. 1006 Path not found in database. 1018 Invalid component path. 1021 A long lasting action is running.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |


---

## ExportItemToPathWithOptions

_Source: `markdown/ME-ASCET_Automation_API_Tool-Interface-ExportItemToPathWithOptions.md`_

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: ExportItemToPathWithOptions

##### Name

ExportItemToPathWithOptions

##### Description

Lookup for the specified component and export it to the specified path using the specified option set. The current option value in ASCET will be superseeded by the specified option set and restored after the operation is finished. Using an asterisk as parameter for the componentPathName will export the top folders. A valid option set could be generated by opening the ASCET tool options and exporting the options in the option path: Options\Interfaces\Exports. Return an error in case of: - No database open. - Item not found in database. - Invalid component specified. - path name is not valid. - export action failed.

##### Parameters

| Name | Type | Direction | Description |
| --- | --- | --- | --- |
| componentPathName | string | Input | Hierarchical database path of the component. The database path has to be specified as absolute path and must not start with a slash. The folders have to be separated by using a backslash. |
| outputPath | string | Input | Directory path on the file system used as root directory for the export. |
| optionFileName | string | Input | XML based file containing the values for the export option to be used. |

##### Parameters

componentPathName

**Type:**string

Hierarchical database path of the component. The database path has to be specified as absolute path and must not start with a slash. The folders have to be separated by using a backslash.

outputPath

**Type:**string

Directory path on the file system used as root directory for the export.

optionFileName

**Type:**string

XML based file containing the values for the export option to be used.

##### Returns

A value of type string.

##### Example

ExportItemToPathWithOptions("Instances\P1", "c:\temp\", "d:\temp\myOptions.xml")

##### Remarks

API-Result-Codes: 0 1001 Invalid path name. 1002 Item not found in database. 1003 Item not loadable. 1004 No database. 1005 Operation failed. 1006 Path not found in database. 1011 Invalid file name. 1018 Invalid component path. 1021 A long lasting action is running. 1048 Temp file is not writable.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |


---

## ExportItemToZipFile

_Source: `markdown/ME-ASCET_Automation_API_Tool-Interface-ExportItemToZipFile.md`_

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: ExportItemToZipFile

##### Name

ExportItemToZipFile

##### Description

Lookup for the specified component and export it into the specified zip file. Using an asterisk as parameter for the componentPathName will export the top folders. Return an error in case of: - No database open. - Item not found in database. - Invalid component specified. - target zip file path not valid. - export action failed.

##### Parameters

| Name | Type | Direction | Description |
| --- | --- | --- | --- |
| componentPathName | string | Input | Hierarchical database path of the component. The database path has to be specified as absolute path and must not start with a slash. The folders have to be separated by using a backslash. |
| zipFilePathAndName | string | Input | Target zip file for the export. |

##### Parameters

componentPathName

**Type:**string

Hierarchical database path of the component. The database path has to be specified as absolute path and must not start with a slash. The folders have to be separated by using a backslash.

zipFilePathAndName

**Type:**string

Target zip file for the export.

##### Returns

A value of type string.

##### Example

ExportItemToZipFile("Instances\P1", "c:\temp\xml.zip")

##### Remarks

API-Result-Codes: 0 1001 Invalid path name. 1002 Item not found in database. 1003 Item not loadable. 1004 No database. 1005 Operation failed. 1006 Path not found in database. 1011 Invalid file name. 1018 Invalid component path. 1021 A long lasting action is running.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |


---

## ExportItemToZipFileWithOptions

_Source: `markdown/ME-ASCET_Automation_API_Tool-Interface-ExportItemToZipFileWithOptions.md`_

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: ExportItemToZipFileWithOptions

##### Name

ExportItemToZipFileWithOptions

##### Description

Lookup for the specified component and export it into the specified zip file using the specified option set. The current option value in ASCET will be superseeded by the specified option set and restored after the operation is finished. Using an asterisk as parameter for the componentPathName will export the top folders. A valid option set could be generated by opening the ASCET tool options and exporting the options in the option path: Options\Interfaces\Exports. Return an error in case of: - No database open. - Item not found in database. - Invalid component specified. - target zip file path not valid. - export action failed.

##### Parameters

| Name | Type | Direction | Description |
| --- | --- | --- | --- |
| componentPathName | string | Input | Hierarchical database path of the component. The database path has to be specified as absolute path and must not start with a slash. The folders have to be separated by using a backslash. |
| zipFilePathAndName | string | Input | Target zip file for the export. |
| optionFileName | string | Input | XML based file containing the values for the export option to be used. |

##### Parameters

componentPathName

**Type:**string

Hierarchical database path of the component. The database path has to be specified as absolute path and must not start with a slash. The folders have to be separated by using a backslash.

zipFilePathAndName

**Type:**string

Target zip file for the export.

optionFileName

**Type:**string

XML based file containing the values for the export option to be used.

##### Returns

A value of type string.

##### Example

ExportItemToZipFileWithOptions("Instances\P1", "c:\temp\xml.zip", "d:\temp\myOptions.xml")

##### Remarks

API-Result-Codes: 0 1001 Invalid path name. 1002 Item not found in database. 1003 Item not loadable. 1004 No database. 1005 Operation failed. 1006 Path not found in database. 1011 Invalid file name. 1018 Invalid component path. 1021 A long lasting action is running. 1048 Temp file is not writable.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |


---

## ExportItemWithReferencesToPath

_Source: `markdown/ME-ASCET_Automation_API_Tool-Interface-ExportItemWithReferencesToPath.md`_

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: ExportItemWithReferencesToPath

##### Name

ExportItemWithReferencesToPath

##### Description

Lookup for the specified component and its references in the database and export them to the specified path. The folder hierarchy of the database will be used to arrange the components on the file system. Using an asterisk as parameter for the componentPathName will export the top folders. Return an error in case of: - No database open. - Item not found in database. - Invalid component specified. - path name is not valid. - export action failed.

##### Parameters

| Name | Type | Direction | Description |
| --- | --- | --- | --- |
| componentPathName | string | Input | Hierarchical database path of the component. The database path has to be specified as absolute path and must not start with a slash. The folders have to be separated by using a backslash. |
| outputPath | string | Input | Directory path on the file system used as root directory for the export. |

##### Parameters

componentPathName

**Type:**string

Hierarchical database path of the component. The database path has to be specified as absolute path and must not start with a slash. The folders have to be separated by using a backslash.

outputPath

**Type:**string

Directory path on the file system used as root directory for the export.

##### Returns

A value of type string.

##### Example

ExportItemWithReferencesToPath("Instances\P1", "c:\temp\")

##### Remarks

API-Result-Codes: 0 1001 Invalid path name. 1002 Item not found in database. 1003 Item not loadable. 1004 No database. 1005 Operation failed. 1006 Path not found in database. 1018 Invalid component path. 1021 A long lasting action is running.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |


---

## ExportItemWithReferencesToZipFile

_Source: `markdown/ME-ASCET_Automation_API_Tool-Interface-ExportItemWithReferencesToZipFile.md`_

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: ExportItemWithReferencesToZipFile

##### Name

ExportItemWithReferencesToZipFile

##### Description

Lookup for the specified component and its referenced items and export them into the specified zip file. Using an asterisk as parameter for the componentPathName will export the top folders. Return an error in case of: - No database open. - Item not found in database. - Invalid component specified. - target zip file path not valid. - export action failed.

##### Parameters

| Name | Type | Direction | Description |
| --- | --- | --- | --- |
| componentPathName | string | Input | Hierarchical database path of the component. The database path has to be specified as absolute path and must not start with a slash. The folders have to be separated by using a backslash. |
| zipFilePathAndName | string | Input | Target zip file for the export. |

##### Parameters

componentPathName

**Type:**string

Hierarchical database path of the component. The database path has to be specified as absolute path and must not start with a slash. The folders have to be separated by using a backslash.

zipFilePathAndName

**Type:**string

Target zip file for the export.

##### Returns

A value of type string.

##### Example

ExportItemWithReferencesToZipFile("Instances\P1", "c:\temp\xml.zip")

##### Remarks

API-Result-Codes: 0 1001 Invalid path name. 1002 Item not found in database. 1003 Item not loadable. 1004 No database. 1005 Operation failed. 1006 Path not found in database. 1011 Invalid file name. 1018 Invalid component path. 1021 A long lasting action is running.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |


---

## ExportMappingForComponentToFile

_Source: `markdown/ME-ASCET_Automation_API_Tool-Interface-ExportMappingForComponentToFile.md`_

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: ExportMappingForComponentToFile

##### Name

ExportMappingForComponentToFile

##### Description

Export the mappings for the specified component into a XML or CSV file. The output file format will be derived from the file extension of the specified file name. Return an error in case of: - No database open. - Item not found in database. - Invalid component specified. - Invalid file name. - export action failed.

##### Parameters

| Name | Type | Direction | Description |
| --- | --- | --- | --- |
| componentPathName | string | Input | Hierarchical database path of the component. The database path has to be specified as absolute path and must not start with a slash. The folders have to be separated by using a backslash. |
| filePathName | string | Input | Target file for the export. Use *.xml or *.csv as file extension. |

##### Parameters

componentPathName

**Type:**string

Hierarchical database path of the component. The database path has to be specified as absolute path and must not start with a slash. The folders have to be separated by using a backslash.

filePathName

**Type:**string

Target file for the export. Use *.xml or *.csv as file extension.

##### Returns

A value of type string.

##### Example

ExportMappingForComponentToFile("Instances\mySWC", "D:\EtasData\ASCET6.3\Export\mapEHooks.csv")

##### Remarks

API-Result-Codes: 0 1001 Invalid path name. 1002 Item not found in database. 1003 Item not loadable. 1004 No database. 1005 Operation failed. 1006 Path not found in database. 1011 Invalid file name. 1014 Invalid argument. 1018 Invalid component path.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |


---

## exportMappingForSoftwareComponent_toFile

_Source: `markdown/ME-ASCET_Automation_API_Tool-Interface-exportMappingForSoftwareComponent_toFile.md`_

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: exportMappingForSoftwareComponent_toFile

##### Name

exportMappingForSoftwareComponent_toFile

##### Description

Export the mappings for the specified component into a XML or CSV file. The output file format will be derived from the file extension of the specified file name. Return an error in case of: - No database open. - Item not found in database. - Invalid component specified. - Invalid file name. - export action failed.

##### Parameters

| Name | Type | Direction | Description |
| --- | --- | --- | --- |
| exportMappingForSoftwareComponent | string | Input |  |
| toFile | string | Input |  |

##### Parameters

exportMappingForSoftwareComponent

**Type:**string

toFile

**Type:**string

##### Returns

A value of type string.

##### Example

ExportMappingForSoftwareComponentToFile("Instances\mySWC", "D:\EtasData\ASCET6.3\Export\mapEHooks.csv")

##### Remarks

API-Result-Codes: 0 1001 Invalid path name. 1002 Item not found in database. 1003 Item not loadable. 1004 No database. 1005 Operation failed. 1006 Path not found in database. 1014 Invalid argument. 1018 Invalid component path.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |


---

## FlashTarget

_Source: `markdown/ME-ASCET_Automation_API_Tool-Interface-FlashTarget.md`_

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: FlashTarget

##### Name

FlashTarget

##### Description

The reconnect command will provide the possibility to experiment with an already running model on a target. The behavior is quiet similar to the open experiment command. The main difference is the circumstance that the model code will not be downloaded. The flash command will provide the possibility to store the executable of the model into the flash memory of a rapid prototyping hardware. If the component is no project the method will not use the default project to open the experiment. Return an error in case of: - No database open. - Item not found in database. - Invalid component specified. - Autosar project specified. - Hardware not defined.

##### Parameters

| Name | Type | Direction | Description |
| --- | --- | --- | --- |
| componentPathName | string | Input | Hierarchical database path of the component. The database path has to be specified as absolute path and must not start with a slash. The folders have to be separated by using a backslash. |

##### Parameters

componentPathName

**Type:**string

Hierarchical database path of the component. The database path has to be specified as absolute path and must not start with a slash. The folders have to be separated by using a backslash.

##### Returns

A value of type string.

##### Example

FlashTarget("OfflinePC\Project")

##### Remarks

API-Result-Codes: -1000 No system available. 0 1001 Invalid path name. 1002 Item not found in database. 1003 Item not loadable. 1004 No database. 1005 Operation failed. 1006 Path not found in database. 1007 Invalid operation. 1013 Operation is not available. 1015 Hardware not found. 1016 Hardware not defined. 1018 Invalid component path.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |


---

## GetLastErrorNumber

_Source: `markdown/ME-ASCET_Automation_API_Tool-Interface-GetLastErrorNumber.md`_

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: GetLastErrorNumber

##### Name

GetLastErrorNumber

##### Description

Return the value of the error from the last method call. Example: GetLastErrorNumber()

##### Returns

A value of type string.

##### Remarks

API-Result-Codes: 0

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |


---

## GetLastErrorText

_Source: `markdown/ME-ASCET_Automation_API_Tool-Interface-GetLastErrorText.md`_

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: GetLastErrorText

##### Name

GetLastErrorText

##### Description

Return the text of the error from the last method call. Example: GetLastErrorText()

##### Returns

A value of type string.

##### Remarks

API-Result-Codes: 0

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |


---

## GetProcessId

_Source: `markdown/ME-ASCET_Automation_API_Tool-Interface-GetProcessId.md`_

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: GetProcessId

##### Name

GetProcessId

##### Description

Return the operating system process id.

##### Returns

A value of type string.

##### Example

GetProcessId()

##### Remarks

API-Result-Codes: NO RESULT CODES!

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |


---

## ImportFromFile

_Source: `markdown/ME-ASCET_Automation_API_Tool-Interface-ImportFromFile.md`_

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: ImportFromFile

##### Name

ImportFromFile

##### Description

Import the component stored in the specified amd file. The current setting of the import options "Keep Hierarchy" and "Remap OIDs" are ignored by this function. The default values "Keep Hierarchy = true" and "Remap OIDs = false" are used instead. Return an error in case of: - No database open. - file name is not valid. - no item imported. - import problems detected. - import action failed.

##### Parameters

| Name | Type | Direction | Description |
| --- | --- | --- | --- |
| filePathName | string | Input | Specify the amd file on the file system which has to be imported. |

##### Parameters

filePathName

**Type:**string

Specify the amd file on the file system which has to be imported.

##### Returns

A value of type string.

##### Example

ImportFromFile("c:\temp\instances\P1.main.amd")

##### Remarks

API-Result-Codes: -1002 Problem detected during import. 0 1001 Invalid path name. 1004 No database. 1005 Operation failed. 1011 Invalid file name. 1021 A long lasting action is running. 1037 No item imported. 1038 Unfixable problem detected during import.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |


---

## ImportFromPath

_Source: `markdown/ME-ASCET_Automation_API_Tool-Interface-ImportFromPath.md`_

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: ImportFromPath

##### Name

ImportFromPath

##### Description

Import all available components stored in the specified file system directory. The current setting of the import options "Keep Hierarchy" and "Remap OIDs" are ignored by this function. The default values "Keep Hierarchy = true" and "Remap OIDs = false" are used instead. Return an error in case of: - No database open. - path name is not valid. - no item imported. - import problems detected. - import action failed.

##### Parameters

| Name | Type | Direction | Description |
| --- | --- | --- | --- |
| pathName | string | Input | Specify the file system directory for the amd files. |

##### Parameters

pathName

**Type:**string

Specify the file system directory for the amd files.

##### Returns

A value of type string.

##### Example

ImportFromPath("c:\temp\instances\")

##### Remarks

API-Result-Codes: -1002 Problem detected during import. 0 1001 Invalid path name. 1004 No database. 1005 Operation failed. 1021 A long lasting action is running. 1037 No item imported. 1038 Unfixable problem detected during import.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |


---

## ImportFromZipFile

_Source: `markdown/ME-ASCET_Automation_API_Tool-Interface-ImportFromZipFile.md`_

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: ImportFromZipFile

##### Name

ImportFromZipFile

##### Description

Import all components stored in the specified axl/zip file. The current setting of the import options "Keep Hierarchy" and "Remap OIDs" are ignored by this function. The default values "Keep Hierarchy = true" and "Remap OIDs = false" are used instead. Return an error in case of: - No database open. - file name is not valid. - no item imported. - import problems detected. - import action failed.

##### Parameters

| Name | Type | Direction | Description |
| --- | --- | --- | --- |
| zipFilePathName | string | Input | Specify the axl/zip file on the file system which has to be imported. |

##### Parameters

zipFilePathName

**Type:**string

Specify the axl/zip file on the file system which has to be imported.

##### Returns

A value of type string.

##### Example

ImportFromZipFile("c:\temp\xmlBig.zip")

##### Remarks

API-Result-Codes: -1002 Problem detected during import. 0 1001 Invalid path name. 1004 No database. 1005 Operation failed. 1011 Invalid file name. 1021 A long lasting action is running. 1037 No item imported. 1038 Unfixable problem detected during import.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |


---

## ImportMappingForComponentFromFile

_Source: `markdown/ME-ASCET_Automation_API_Tool-Interface-ImportMappingForComponentFromFile.md`_

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: ImportMappingForComponentFromFile

##### Name

ImportMappingForComponentFromFile

##### Description

Import the mappings for the specified component from a XML or CSV file. The input file format will be derived from the file extension of the specified file name. Return an error in case of: - No database open. - Item not found in database. - Invalid component specified. - Invalid file name. - export action failed.

##### Parameters

| Name | Type | Direction | Description |
| --- | --- | --- | --- |
| componentPathName | string | Input | Hierarchical database path of the component. The database path has to be specified as absolute path and must not start with a slash. The folders have to be separated by using a backslash. |
| filePathName | string | Input | Source file for the import. Use *.xml or *.csv as file extension. |

##### Parameters

componentPathName

**Type:**string

Hierarchical database path of the component. The database path has to be specified as absolute path and must not start with a slash. The folders have to be separated by using a backslash.

filePathName

**Type:**string

Source file for the import. Use *.xml or *.csv as file extension.

##### Returns

A value of type string.

##### Example

ImportMappingForComponentFromFile("Instances\mySWC", "D:\EtasData\ASCET6.3\Export\mapEHooks.csv")

##### Remarks

API-Result-Codes: 0 1001 Invalid path name. 1002 Item not found in database. 1003 Item not loadable. 1004 No database. 1005 Operation failed. 1006 Path not found in database. 1011 Invalid file name. 1014 Invalid argument. 1018 Invalid component path.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |


---

## importMappingForSoftwareComponent_fromFile

_Source: `markdown/ME-ASCET_Automation_API_Tool-Interface-importMappingForSoftwareComponent_fromFile.md`_

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: importMappingForSoftwareComponent_fromFile

##### Name

importMappingForSoftwareComponent_fromFile

##### Description

Import the mappings for the specified component from a XML or CSV file. The input file format will be derived from the file extension of the specified file name. Return an error in case of: - No database open. - Item not found in database. - Invalid component specified. - Invalid file name. - export action failed.

##### Parameters

| Name | Type | Direction | Description |
| --- | --- | --- | --- |
| importMappingForSoftwareComponent | string | Input |  |
| fromFile | string | Input |  |

##### Parameters

importMappingForSoftwareComponent

**Type:**string

fromFile

**Type:**string

##### Returns

A value of type string.

##### Example

ImportMappingForSoftwareComponentFromFile("Instances\mySWC", "D:\EtasData\ASCET6.3\Export\mapEHooks.csv")

##### Remarks

API-Result-Codes: 0 1001 Invalid path name. 1002 Item not found in database. 1003 Item not loadable. 1005 Operation failed. 1006 Path not found in database. 1011 Invalid file name. 1014 Invalid argument.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |


---

## ImportWithReferencesFromFile

_Source: `markdown/ME-ASCET_Automation_API_Tool-Interface-ImportWithReferencesFromFile.md`_

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: ImportWithReferencesFromFile

##### Name

ImportWithReferencesFromFile

##### Description

Import the component stored in the specified amd file. Additionally all references of this component to other components which are available and visible within the directory tree of the specified component will be imported. The current setting of the import options "Keep Hierarchy" and "Remap OIDs" are ignored by this function. The default values "Keep Hierarchy = true" and "Remap OIDs = false" are used instead. Return an error in case of: - No database open. - file name is not valid. - no item imported. - import problems detected. - import action failed.

##### Parameters

| Name | Type | Direction | Description |
| --- | --- | --- | --- |
| filePathName | string | Input | Specify the amd file on the file system which has to be imported with all its references. |

##### Parameters

filePathName

**Type:**string

Specify the amd file on the file system which has to be imported with all its references.

##### Returns

A value of type string.

##### Example

ImportWithReferencesFromFile("c:\temp\instances\P1.main.amd")

##### Remarks

API-Result-Codes: -1002 Problem detected during import. 0 1001 Invalid path name. 1004 No database. 1005 Operation failed. 1011 Invalid file name. 1021 A long lasting action is running. 1037 No item imported. 1038 Unfixable problem detected during import.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |


---

## ImportWithReferencesFromPath

_Source: `markdown/ME-ASCET_Automation_API_Tool-Interface-ImportWithReferencesFromPath.md`_

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: ImportWithReferencesFromPath

##### Name

ImportWithReferencesFromPath

##### Description

Import all available components stored in the specified file system directory. Additionally all references of those components to other components which are available and visible within the directory tree of the specified path will be imported. The current setting of the import options "Keep Hierarchy" and "Remap OIDs" are ignored by this function. The default values "Keep Hierarchy = true" and "Remap OIDs = false" are used instead. Return an error in case of: - No database open. - path name is not valid. - no item imported. - import problems detected. - import action failed.

##### Parameters

| Name | Type | Direction | Description |
| --- | --- | --- | --- |
| pathName | string | Input | Specify the file system directory for the amd files. |

##### Parameters

pathName

**Type:**string

Specify the file system directory for the amd files.

##### Returns

A value of type string.

##### Example

ImportWithReferencesFromPath("c:\temp\instances\")

##### Remarks

API-Result-Codes: -1002 Problem detected during import. 0 1001 Invalid path name. 1004 No database. 1005 Operation failed. 1021 A long lasting action is running. 1037 No item imported. 1038 Unfixable problem detected during import.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |


---

## OpenAndConvertDatabase

_Source: `markdown/ME-ASCET_Automation_API_Tool-Interface-OpenAndConvertDatabase.md`_

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: OpenAndConvertDatabase

##### Name

OpenAndConvertDatabase

##### Description

Open the database specified by the file system location and convert the database if necessary. If the current database matches the specified file system location the method end immediatelly. If a conversion of the database must be performed this may take a long time. Please ensure that a backup of the database exists before calling this method. All opened windows and the current database will be closed first. Return an error in case of: - The current database could not be closed. - The database is not compatible to the current ASCET version. - The file system location is not valid. - The database could not been converted. - The conversion is aborted due to an internal problen.

##### Parameters

| Name | Type | Direction | Description |
| --- | --- | --- | --- |
| databasePath | string | Input | File system path for the ASCET database. |

##### Parameters

databasePath

**Type:**string

File system path for the ASCET database.

##### Returns

A value of type string.

##### Example

OpenAndConvertDatabase("C:\temp\CGenOptions")

##### Remarks

API-Result-Codes: 0 1001 Invalid path name. 1004 No database. 1005 Operation failed. 1008 Incompatible database version. 1008 Incompatible database. 1021 A long lasting action is running. 1023 Data logging is running.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |


---

## OpenDatabase

_Source: `markdown/ME-ASCET_Automation_API_Tool-Interface-OpenDatabase.md`_

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: OpenDatabase

##### Name

OpenDatabase

##### Description

Open the database specified by the file system location. If the current database matches to the specified file system location the method ends immediatelly. All opened windows and the current database will be closed first. Return an error in case of: - The current database could not be closed. - The database is not compatible to the current ASCET version. - The file system location is not valid.

##### Parameters

| Name | Type | Direction | Description |
| --- | --- | --- | --- |
| databasePath | string | Input | File system path for the ASCET database. |

##### Parameters

databasePath

**Type:**string

File system path for the ASCET database.

##### Returns

A value of type string.

##### Example

OpenDatabase("C:\temp\CGenOptions")

##### Remarks

API-Result-Codes: 0 1001 Invalid path name. 1004 No database. 1005 Operation failed. 1008 Incompatible database version. 1008 Incompatible database. 1021 A long lasting action is running. 1023 Data logging is running.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |


---

## OpenMessageDialog

_Source: `markdown/ME-ASCET_Automation_API_Tool-Interface-OpenMessageDialog.md`_

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: OpenMessageDialog

##### Name

OpenMessageDialog

##### Description

Open a message dialog on the ASCET main window to block the user interface. Titel and message text can be specified by the caller. It is not possible to open more than one message dialogs at the same time. Example: OpenMessageDialog("ASCET is blocked - please wait", "Automation running")

##### Parameters

| Name | Type | Direction | Description |
| --- | --- | --- | --- |
| theMessage | string | Input |  |
| theTitel | string | Input |  |

##### Parameters

theMessage

**Type:**string

theTitel

**Type:**string

##### Returns

A value of type string.

##### Remarks

API-Result-Codes: 0 1005 Operation failed. 1027 Message box already open.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |


---

## OpenWorkspace

_Source: `markdown/ME-ASCET_Automation_API_Tool-Interface-OpenWorkspace.md`_

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: OpenWorkspace

##### Name

OpenWorkspace

##### Description

Open the workspace specified by the related *.aws file. If the file path name of the specified workspace matches to the current workspace the method end immediatelly. All opened windows and the current data storage will be closed first. Return an error in case of: - The current data storage could not be closed. - The file system location is not valid.

##### Parameters

| Name | Type | Direction | Description |
| --- | --- | --- | --- |
| workspaceFilePath | string | Input | File system path to the *.aws file of the workspace. |

##### Parameters

workspaceFilePath

**Type:**string

File system path to the *.aws file of the workspace.

##### Returns

A value of type string.

##### Example

OpenWorkspace("D:\ETASData\ASCET6.1\Workspaces\TUTORIAL\TUTORIAL.aws")

##### Remarks

API-Result-Codes: 0 1005 Operation failed. 1021 A long lasting action is running. 1023 Data logging is running. 1040 No workspace.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |


---

## Ping

_Source: `markdown/ME-ASCET_Automation_API_Tool-Interface-Ping.md`_

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: Ping

##### Name

Ping

##### Description

Simple method to check the ASCET Automation API. The method does not create an error.

##### Returns

A value of type string.

##### Example

Ping()

##### Remarks

API-Result-Codes: 0

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |


---

## ReadToolOptions

_Source: `markdown/ME-ASCET_Automation_API_Tool-Interface-ReadToolOptions.md`_

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: ReadToolOptions

##### Name

ReadToolOptions

##### Description

Set the options for ASCET according to the settings in the specified file. Return an error in case of: - file name is not valid. - reading xml options failed.

##### Parameters

| Name | Type | Direction | Description |
| --- | --- | --- | --- |
| filePathName | string | Input | Specify the xml file on the file system which contains the new option values for ASCET. |

##### Parameters

filePathName

**Type:**string

Specify the xml file on the file system which contains the new option values for ASCET.

##### Returns

A value of type string.

##### Example

ReadToolOptions("c:\temp\asd_options.xml")

##### Remarks

API-Result-Codes: 0 1005 Operation failed. 1011 Invalid file name. 1028 File not readable. 1029 XML Parser error. 1030 Invalid XML document. 1031 Invalid option value detected.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |


---

## SearchForHardware

_Source: `markdown/ME-ASCET_Automation_API_Tool-Interface-SearchForHardware.md`_

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: SearchForHardware

##### Name

SearchForHardware

##### Description

Return a XML style string containing the current available systems connected to the PC. If no system is found an empty string will be returned. If more than one system is found the systems are separated by a carriage return character. Example: "

##### system

##### system

"

##### Returns

A value of type string.

##### Example

SearchForHardware()

##### Remarks

API-Result-Codes: -1000 No system available. 1013 Operation is not available.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |


---

## SelectHardwareForProject

_Source: `markdown/ME-ASCET_Automation_API_Tool-Interface-SelectHardwareForProject.md`_

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: SelectHardwareForProject

##### Name

SelectHardwareForProject

##### Description

Assign a available system to the specified project. If a component is specified instead of a project the assignment will be performed with its default project. In case that more than one system is available which matches to the project the desired system must be selected by specifying its serial number. If there is only one system availbale which matches to the project any empty string could be passed as serial number. Return an error in case of: - No valid component or project specified. - Hardware not found.

##### Parameters

| Name | Type | Direction | Description |
| --- | --- | --- | --- |
| serialNumber | string | Input | Serial number for the hardware which has to be used for the project. |
| projectPathName | string | Input | Hierarchical database path of the project. |

##### Parameters

serialNumber

**Type:**string

Serial number for the hardware which has to be used for the project.

projectPathName

**Type:**string

Hierarchical database path of the project.

##### Returns

A value of type string.

##### Example

SelectHardwareForProject("100017", "OfflineRP\Project_ES1135_hoch")

##### Remarks

API-Result-Codes: -1000 No system available. 0 1001 Invalid path name. 1002 Item not found in database. 1003 Item not loadable. 1004 No database. 1006 Path not found in database. 1007 Invalid operation. 1013 Operation is not available. 1015 Hardware not found. 1018 Invalid component path. 1021 A long lasting action is running.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |


---

## Shutdown

_Source: `markdown/ME-ASCET_Automation_API_Tool-Interface-Shutdown.md`_

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: Shutdown

##### Name

Shutdown

##### Description

Closes the tool by closing the component manager. The method returns immediatelly. The tool will be closed at least 0,5 seconds later.

##### Returns

A value of type string.

##### Example

Shutdown()

##### Remarks

API-Result-Codes: 0 1005 Operation failed. 1021 A long lasting action is running.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |


---

## SwitchLoggingOff

_Source: `markdown/ME-ASCET_Automation_API_Tool-Interface-SwitchLoggingOff.md`_

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: SwitchLoggingOff

##### Name

SwitchLoggingOff

##### Description

Deactivate logging.

##### Returns

A value of type string.

##### Example

SwitchLoggingOff("Root\Class_Block_Diagram")

##### Remarks

API-Result-Codes: NO RESULT CODES!

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |


---

## SwitchLoggingOn

_Source: `markdown/ME-ASCET_Automation_API_Tool-Interface-SwitchLoggingOn.md`_

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: SwitchLoggingOn

##### Name

SwitchLoggingOn

##### Description

Activate logging.

##### Returns

A value of type string.

##### Example

SwitchLoggingOn()

##### Remarks

API-Result-Codes: NO RESULT CODES!

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |


---

## ToolVersion

_Source: `markdown/ME-ASCET_Automation_API_Tool-Interface-ToolVersion.md`_

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: ToolVersion

##### Name

ToolVersion

##### Description

Return the version string for the current used ASCET.

##### Returns

A value of type string.

##### Example

ToolVersion()

##### Remarks

API-Result-Codes: NO RESULT CODES!

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |


---

## WriteMonitorContentsToPath

_Source: `markdown/ME-ASCET_Automation_API_Tool-Interface-WriteMonitorContentsToPath.md`_

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: WriteMonitorContentsToPath

##### Name

WriteMonitorContentsToPath

##### Description

Write the current contents of the monitor into a file. The monitor contents will not be cleared afterwards. In the specified directory a file named 'logger.log' will be created with the current contents of the page 'Monitor'. The contents of the page 'Build' will be written into the same directory in a file named 'build.log'. Return an error in case of: - The files cannot be created.

##### Parameters

| Name | Type | Direction | Description |
| --- | --- | --- | --- |
| pathName | string | Input | Directory path for the created log files. |

##### Parameters

pathName

**Type:**string

Directory path for the created log files.

##### Returns

A value of type string.

##### Example

WriteMonitorContentsToPath("e:\temp\")

##### Remarks

API-Result-Codes: 0 1001 Invalid path name. 1005 Operation failed.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |


---

## WriteTextToMonitor

_Source: `markdown/ME-ASCET_Automation_API_Tool-Interface-WriteTextToMonitor.md`_

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: WriteTextToMonitor

##### Name

WriteTextToMonitor

##### Description

Write the specified text to the monitor window.

##### Parameters

| Name | Type | Direction | Description |
| --- | --- | --- | --- |
| aString | string | Input |  |

##### Parameters

aString

**Type:**string

##### Returns

A value of type string.

##### Example

WriteTextToMonitor("Example Text")

##### Remarks

API-Result-Codes: 0

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |


---

## WriteToolOptions

_Source: `markdown/ME-ASCET_Automation_API_Tool-Interface-WriteToolOptions.md`_

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| ASCETAutomationAPI |  |  |

# Method: WriteToolOptions

##### Name

WriteToolOptions

##### Description

Write the specified option file in xml style which contains the values of the ASCET options. Return an error in case of: - file name is not valid. - writing xml options failed.

##### Parameters

| Name | Type | Direction | Description |
| --- | --- | --- | --- |
| filePathName | string | Input | Specify the xml file which will be created with the option values of ASCET. |

##### Parameters

filePathName

**Type:**string

Specify the xml file which will be created with the option values of ASCET.

##### Returns

A value of type string.

##### Example

WriteToolOptions("c:\temp\asd_options.xml")

##### Remarks

API-Result-Codes: 0 1005 Operation failed. 1011 Invalid file name.

---

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
|  |  |  |


---

