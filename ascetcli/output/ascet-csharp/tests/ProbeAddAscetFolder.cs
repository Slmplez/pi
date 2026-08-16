using System;
using de.etas.cebra.toolAPI.Ascet;

public static class ProbeAddAscetFolder
{
    public static int Main()
    {
        try
        {
            AscetToolApiBootstrap.ConfigureAssemblyResolution();
            using (AscetSession session = new AscetSessionFactory().OpenCurrentDatabaseSession() as AscetSession)
            {
                var db = session.GetCurrentDatabaseHandle();
                string path = "__CodexProbe__\\L1\\L2";
                AscetFolder folder = db.AddAscetFolder(path);
                Console.WriteLine(folder == null ? "NULL" : (folder.GetNameWithPath() ?? "NO_PATH"));
                return 0;
            }
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
