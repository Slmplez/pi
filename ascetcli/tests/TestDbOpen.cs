using System;
using de.etas.cebra.toolAPI.Ascet;

class TestDbOpen
{
    static int Main(string[] args)
    {
        try
        {
            Console.WriteLine("Creating Ascet object...");
            Ascet tool = new Ascet();

            string dbPath = @"d:\ETASData\ASCET6.4\Database\Tutorial";
            Console.WriteLine("Attempting to open database: " + dbPath);

            AscetDataBase database = tool.OpenDataBase(dbPath);

            if (database == null)
            {
                Console.WriteLine("ERROR: OpenDataBase returned null");
                return 1;
            }

            Console.WriteLine("SUCCESS: Database opened");
            Console.WriteLine("Database name: " + database.GetName());

            Console.WriteLine("Closing database...");
            tool.DisconnectFromTool();
            Console.WriteLine("Done");

            return 0;
        }
        catch (Exception ex)
        {
            Console.WriteLine("EXCEPTION: " + ex.Message);
            Console.WriteLine("Stack trace: " + ex.StackTrace);
            return 1;
        }
    }
}
