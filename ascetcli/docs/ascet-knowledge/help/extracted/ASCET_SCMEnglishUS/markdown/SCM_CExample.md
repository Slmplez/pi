# C# Example

using de.etas.cebra.toolAPI.Ascet;

namespace APITest

{

class Program

{

static void Main()

{

Ascet tool = new Ascet();

AscetDataBase myDataBase = tool.OpenDataBase("newDatabase");

AscetFolder myFolder = myDataBase.GetAscetFolder("newFolder");

if (myFolder != null)

{

myDataBase.Remove(myFolder, true);

}

myFolder = myDataBase.AddAscetFolder("newFolder");

AscetModule myModule = myFolder.AddModule("newModule", "BDE");

tool.DisconnectFromTool();

}

}

}

See also

[ASCET-SCM Scripting Interface](SCM_ASCET-SCM_Scripting_Interface.md)

[Important Note: Using ASCET-SCM with the Tool API](SCM_ImportantNote_UseSCMwithToolAPI.md)
