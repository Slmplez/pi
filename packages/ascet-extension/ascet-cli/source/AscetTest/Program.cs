using System;
using System.Collections.Generic;
using System.IO;
using System.Text;

public static class AscetTestProgram
{
    [STAThread]
    public static int Main(string[] args)
    {
        Console.InputEncoding = Encoding.UTF8;
        Console.OutputEncoding = new UTF8Encoding(false);

        AscetTestCommandLine commandLine = null;
        try
        {
            commandLine = AscetTestCommandLine.Parse(args);
            Dictionary<string, object> request = AscetTestContracts.ReadRequest(
                commandLine.RequestPath,
                commandLine.ExecuteLive);
            Dictionary<string, object> response = AscetTestActionDispatcher.Dispatch(commandLine, request);
            WriteResponse(commandLine.OutputPath, response);
            Console.WriteLine(AscetTestContracts.Serialize(response));
            return AscetTestEnvelope.GetExitCode(response);
        }
        catch (AscetTestCliException ex)
        {
            Dictionary<string, object> response = AscetTestEnvelope.Failure(
                commandLine == null ? String.Empty : commandLine.Action,
                ex.Code,
                ex.Message);
            TryWriteResponse(commandLine == null ? FindOptionValue(args, "--out") : commandLine.OutputPath, response);
            Console.WriteLine(AscetTestContracts.Serialize(response));
            return 2;
        }
        catch (Exception ex)
        {
            Dictionary<string, object> response = AscetTestEnvelope.Failure(
                commandLine == null ? String.Empty : commandLine.Action,
                "unhandled_exception",
                ex.Message);
            TryWriteResponse(commandLine == null ? FindOptionValue(args, "--out") : commandLine.OutputPath, response);
            Console.WriteLine(AscetTestContracts.Serialize(response));
            return 1;
        }
    }

    private static void WriteResponse(string path, Dictionary<string, object> response)
    {
        if (String.IsNullOrWhiteSpace(path))
        {
            throw new AscetTestCliException("invalid_arguments", "--out is required.");
        }

        AscetTestContracts.WriteJson(path, response);
    }

    private static void TryWriteResponse(string path, Dictionary<string, object> response)
    {
        if (String.IsNullOrWhiteSpace(path))
        {
            return;
        }

        try
        {
            AscetTestContracts.WriteJson(path, response);
        }
        catch (IOException)
        {
            // The original protocol error is already emitted to stdout.
        }
    }

    private static string FindOptionValue(string[] args, string option)
    {
        if (args == null || String.IsNullOrWhiteSpace(option))
        {
            return String.Empty;
        }

        for (int index = 0; index + 1 < args.Length; index++)
        {
            if (String.Equals(args[index], option, StringComparison.OrdinalIgnoreCase))
            {
                return args[index + 1] ?? String.Empty;
            }
        }

        return String.Empty;
    }
}
