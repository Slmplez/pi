using System;

class AscetReadDomainSmoke
{
    static int Main()
    {
        return Run();
    }

    public static int Run()
    {
        try
        {
            Console.WriteLine("Smoke profile uses the current ASCET database and performs the bounded deep read checks.");
            return AscetReadDomainDeepCheck.Run();
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine(ex.GetType().FullName);
            Console.Error.WriteLine(ex.Message);
            return 1;
        }
    }
}