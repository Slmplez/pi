using System;
using System.Text;

public sealed class AscetWriteHost
{
    [STAThread]
    public static int Main(string[] args)
    {
        try
        {
            Console.InputEncoding = Encoding.UTF8;
            Console.OutputEncoding = new UTF8Encoding(false);
            using (AscetWriteHostServer server = new AscetWriteHostServer())
            {
                return server.Run();
            }
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine(FormatException(ex));
            return 1;
        }
    }

    private static string FormatException(Exception ex)
    {
        AscetReadException ascet = ex as AscetReadException;
        if (ascet != null)
        {
            return ascet.Code + ":" + ascet.Operation + ":" + ascet.Message;
        }

        return ex.GetType().FullName + ":" + ex.Message;
    }
}
