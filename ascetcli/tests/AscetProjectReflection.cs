using System;
using System.Reflection;
using de.etas.cebra.toolAPI.Ascet;
using de.etas.cebra.toolAPI.Common;

public static class AscetProjectReflection
{
    public static int Main()
    {
        Ascet tool = new Ascet();
        try
        {
            AscetDataBase database = tool.GetCurrentDataBase();
            AscetProject project = database.GetItemInFolder("IPBCustGeneral_ECU_CSW_BB88010", "CN_Libary\\CNMS_IPB20\\IPBCustGeneral") as AscetProject;
            ComplexModelElement module = project.GetModule("CM_SCM");
            object represented = module == null ? null : module.GetRepresentedClass();
            Console.WriteLine("module=" + (module == null ? "null" : module.GetName()));
            Console.WriteLine("represented=" + (represented == null ? "null" : represented.GetType().FullName));
            foreach (MethodInfo method in represented.GetType().GetMethods(BindingFlags.Instance | BindingFlags.Public))
            {
                if (method.Name.StartsWith("Get", StringComparison.Ordinal)) Console.WriteLine(method.Name + " -> " + method.ReturnType.FullName);
            }
            return 0;
        }
        finally { tool.DisconnectFromTool(); }
    }
}