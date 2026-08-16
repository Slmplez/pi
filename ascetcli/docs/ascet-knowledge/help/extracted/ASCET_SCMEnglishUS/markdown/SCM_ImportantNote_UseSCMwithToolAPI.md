# Important Note: Using ASCET-SCM with the Tool API

The ToolAPI is not aware of ASCET-SCM and does not notify ASCET-SCM about changes in the same way as the GUI of ASCET does. Therefore it is in the responsibility of the developer of a ToolAPI client application to ensure that the constraints which are introduced by ASCET-SCM are not violated.

The following methods will support the ASCET-SCM constraints:

- Component.IsVersion()
- Component.IsEdition()
- AscetSCMInterface.SetItemToSCMModified(DataBaseItem item)

Ascet tool = new Ascet();

AscetSCMInterface scm = tool.GetSCMInterface();

AscetDataBase db = tool.GetCurrentDataBase();

DataBaseItem dbItem = db.GetItemInFolder("Class_Block_Diagram", @"Root_1");

if ((dbItem != null) && (dbItem.IsComponent()))

{

Component myComponent = (Component)dbItem;

Component[] myComponents = { myComponent };

// Do never modify a versioned component

if (myComponent.IsVersion())

// Prepare SCM for the upcoming modifications by getting the lock

scm.ExecuteSCMCommand("Lock", scm.GetItemSCMData(myComponents), "");

// Is component modifiable now

if (myComponent.IsEdition())

{

// Perform the modification of the component

myComponent.SetComment(DateTime.Now.ToString());

// Inform SCM about the modification

scm.SetItemToSCMModified(myComponent);

// Force SCM to commit the modified component

scm.ExecuteSCMCommand("Commit", scm.GetItemSCMData(myComponents), "");

}

}

tool.DisconnectFromTool();

See also

[ASCET-SCM Scripting Interface](SCM_ASCET-SCM_Scripting_Interface.md)

[C# Example](SCM_CExample.md)
