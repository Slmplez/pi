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
