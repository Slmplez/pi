using System;

class AscetReadDomainQuickCheck
{
    static int Main()
    {
        return Run();
    }

    public static int Run()
    {
        try
        {
            AscetToolApiBootstrap.ConfigureAssemblyResolution();

            AscetSessionFactory sessionFactory = new AscetSessionFactory();
            ComponentLocatorService locator = new ComponentLocatorService();

            using (AscetSession session = (AscetSession)sessionFactory.OpenCurrentDatabaseSession())
            {
                AscetDatabaseRef database = session.GetCurrentDatabase();
                Console.WriteLine("Database: " + database.Name);
                Console.WriteLine("DatabasePath: " + database.Path);
                Console.WriteLine("TopFolders: " + locator.ListTopFolders().Count);
            }

            return 0;
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine(ex.GetType().FullName);
            Console.Error.WriteLine(ex.Message);
            if (ex.InnerException != null)
            {
                Console.Error.WriteLine(ex.InnerException.GetType().FullName);
                Console.Error.WriteLine(ex.InnerException.Message);
            }

            return 1;
        }
    }
}
