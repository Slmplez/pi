using System;
using System.IO;
using System.Reflection;
using de.etas.cebra.toolAPI.Ascet;

public static class InspectAscetFolderApi
{
    public static int Main()
    {
        try
        {
            AscetToolApiBootstrap.ConfigureAssemblyResolution();
            using (AscetSession session = new AscetSessionFactory().OpenCurrentDatabaseSession() as AscetSession)
            {
                var db = session.GetCurrentDatabaseHandle();
                Console.WriteLine("DATABASE METHODS:");
                foreach (var m in db.GetType().GetMethods(BindingFlags.Instance | BindingFlags.Public))
                {
                    if (m.Name.IndexOf("Folder", StringComparison.OrdinalIgnoreCase) >= 0)
                    {
                        Console.WriteLine(m.Name + " :: " + m.GetParameters().Length);
                    }
                }

                var tops = db.GetAllAscetFolders();
                Console.WriteLine("TOP COUNT: " + (tops == null ? -1 : tops.Length));
                if (tops != null && tops.Length > 0 && tops[0] != null)
                {
                    var folder = tops[0];
                    Console.WriteLine("FOLDER TYPE: " + folder.GetType().FullName);
                    Console.WriteLine("FOLDER METHODS:");
                    foreach (var m in folder.GetType().GetMethods(BindingFlags.Instance | BindingFlags.Public))
                    {
                        if (m.Name.IndexOf("Folder", StringComparison.OrdinalIgnoreCase) >= 0 || m.Name.IndexOf("Add", StringComparison.OrdinalIgnoreCase) >= 0 || m.Name.IndexOf("Create", StringComparison.OrdinalIgnoreCase) >= 0)
                        {
                            Console.WriteLine(m.Name + " :: " + m.GetParameters().Length);
                        }
                    }
                }
            }
            return 0;
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine(ex.GetType().FullName + ":" + ex.Message);
            if (ex.InnerException != null)
            {
                Console.Error.WriteLine("INNER:" + ex.InnerException.GetType().FullName + ":" + ex.InnerException.Message);
            }
            return 1;
        }
    }
}
