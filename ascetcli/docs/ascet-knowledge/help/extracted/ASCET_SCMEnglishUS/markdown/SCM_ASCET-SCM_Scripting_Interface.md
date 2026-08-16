# ASCET-SCM Scripting Interface

In addition to the commands provided via the [ASCET-SCM Menu](SCM_ASCET-SCM_Menu.md), ASCET-SCM provides a scripting interface. Each ASCET-SCM command that can be executed automatically (i.e. without user input) is available as an ASCET API method.

- As the first step, your script always has to use the GetSCMInterface() method to retrieve an SCM-API object.
- Following the successful completion of this step, the script can call one of the methods described below.

For details on how to use the ASCET API, refer to the ASCET API documentation.

##### String ExecuteSCMCommand(string command, string data, string options);

This is the key function of the scripting interface. To call an SCM method via the ASCET API, use the above syntax, where the <command> parameter expects the following strings, depending on the operation to be executed.

| Column 1 | Column 2 |
| --- | --- |
| Menu Command (SVN Driver) | Corresponding API Method for SVN Driver |
| Checkout | Checkout (Note: If the data parameter is not defined, all items found in the repository will be checked out!) |
| Update | Update |
| Update to Latest Version | UpdateToLatest |
| Add and Commit | Add |
| Commit | Commit |
| Show Log | ShowLog |
| Check for Modifications | CheckForUpdates |
| Delete (in Additional Commands submenu) | Delete |

The <data> parameter expects a defined XML structure containing all information of the items to be handled. This structure can be collected by means of the ASCET API method GetItemSCMData.

The options parameter is not used at present.

##### String GetItemSCMData(DataBaseItem[] itemList)

Gets a list of ASCET component objects and returns an XML string containing the SCM data (which can then be used for other methods such as [ExecuteSCMCommand](#ExecuteSCMCommand).

##### String GetLastError()

Returns an error description if the most recent operation encountered an error.

##### String GetSourceControlBindingInformation()

Returns an XML string describing the setting of the current database or workspace. This XML string can be used to feed InitializeSourceControl() in order to configure an new database using ASCET-SCM.

##### String InitializeSourceControl(String bindingInformation)

Initiates the process of configuring a new database in ASCET-SCM by assigning version control information to the database or workspace.

##### String RemoveSourceControl()

Removes the version control information from the database and from all components contained in this database or workspace.

See also

[Important Note: Using ASCET-SCM with the Tool API](SCM_ImportantNote_UseSCMwithToolAPI.md)

[C# Example](SCM_CExample.md)
