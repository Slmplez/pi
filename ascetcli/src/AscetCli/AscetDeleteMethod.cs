using System;
using System.Collections.Generic;
using System.IO;
using System.Text;

public sealed class AscetDeleteMethodArguments
{
    public string ComponentPath { get; set; }
    public string MethodName { get; set; }
    public bool IgnoreMissing { get; set; }
    public bool VerifyReadback { get; set; }
    public bool EmitJson { get; set; }
}

public static class AscetDeleteMethod
{
    public static int Main(string[] args)
    {
        TextWriter originalOut = Console.Out;
        StringWriter suppressedOut = null;

        try
        {
            AscetDeleteMethodArguments parsed = ParseArguments(args);
            if (parsed.EmitJson)
            {
                suppressedOut = new StringWriter();
                Console.SetOut(suppressedOut);
            }

            AscetToolApiBootstrap.ConfigureAssemblyResolution();
            MethodDeleteService service = new MethodDeleteService();
            AscetMethodDeleteResult result = service.DeleteMethod(parsed.ComponentPath, parsed.MethodName, parsed.VerifyReadback, parsed.IgnoreMissing);

            string output = parsed.EmitJson ? FormatJsonOutput(result) : FormatTextOutput(result);
            Console.SetOut(originalOut);
            Console.Write(output);
            return 0;
        }
        catch (Exception ex)
        {
            Console.SetOut(originalOut);
            Console.Error.WriteLine(FormatException(ex));
            return 1;
        }
        finally
        {
            Console.SetOut(originalOut);
            if (suppressedOut != null)
            {
                suppressedOut.Dispose();
            }
        }
    }

    public static AscetDeleteMethodArguments ParseArguments(string[] args)
    {
        if (args == null || args.Length < 2)
        {
            throw new AscetReadException("invalid_argument", "parse_arguments", "usage: AscetCli.exe exec delete_method <component-path> <method-name> [--if-missing <fail|ignore>] [--verify-readback] [--json]");
        }

        AscetDeleteMethodArguments result = new AscetDeleteMethodArguments
        {
            ComponentPath = AscetReadMethodCode.NormalizeComponentPath(args[0]),
            MethodName = AscetReadMethodCode.NormalizeMethodName(args[1]),
            IgnoreMissing = false,
            VerifyReadback = false,
            EmitJson = false
        };

        for (int i = 2; i < args.Length; i++)
        {
            string argument = args[i];
            if (String.Equals(argument, "--json", StringComparison.OrdinalIgnoreCase))
            {
                result.EmitJson = true;
                continue;
            }

            if (String.Equals(argument, "--verify-readback", StringComparison.OrdinalIgnoreCase))
            {
                result.VerifyReadback = true;
                continue;
            }

            if (String.Equals(argument, "--if-missing", StringComparison.OrdinalIgnoreCase))
            {
                if (i + 1 >= args.Length)
                {
                    throw new AscetReadException("invalid_argument", "parse_arguments", "Missing value after --if-missing.");
                }

                result.IgnoreMissing = ParseIfMissing(args[++i]);
                continue;
            }

            throw new AscetReadException("invalid_argument", "parse_arguments", "Unknown argument '" + argument + "'.");
        }

        return result;
    }

    private static bool ParseIfMissing(string value)
    {
        string normalized = (value ?? String.Empty).Trim().ToLowerInvariant();
        switch (normalized)
        {
            case "fail":
                return false;
            case "ignore":
                return true;
            default:
                throw new AscetReadException("invalid_argument", "if_missing", "Unsupported --if-missing value '" + value + "'. Expected fail or ignore.");
        }
    }

    public static string FormatTextOutput(AscetMethodDeleteResult result)
    {
        StringBuilder builder = new StringBuilder();
        builder.Append("Component: ").Append(result == null ? String.Empty : (result.ComponentPath ?? String.Empty)).AppendLine();
        builder.Append("Method: ").Append(result == null ? String.Empty : (result.MethodName ?? String.Empty)).AppendLine();
        builder.Append("MethodKind: ").Append(result == null ? AscetMethodKind.Unknown.ToString() : result.MethodKind.ToString()).AppendLine();
        builder.Append("Diagram: ").Append(result == null ? String.Empty : (result.DiagramName ?? String.Empty)).AppendLine();
        builder.Append("Deleted: ").Append(result != null && result.Deleted).AppendLine();
        builder.Append("AlreadyMissing: ").Append(result != null && result.AlreadyMissing).AppendLine();
        builder.Append("TargetKey: ").Append(result == null ? String.Empty : (result.TargetKey ?? String.Empty)).AppendLine();
        builder.Append("VerifyReadbackRequested: ").Append(result != null && result.VerifyReadbackRequested).AppendLine();
        builder.Append("ReadbackVerified: ").Append(result != null && result.ReadbackVerified).AppendLine();
        builder.Append("Summary: ").Append(result == null ? String.Empty : (result.Summary ?? String.Empty)).AppendLine();
        return builder.ToString();
    }

    public static string FormatJsonOutput(AscetMethodDeleteResult result)
    {
        Dictionary<string, object> payload = new Dictionary<string, object>();
        payload["componentPath"] = result == null ? String.Empty : (result.ComponentPath ?? String.Empty);
        payload["methodName"] = result == null ? String.Empty : (result.MethodName ?? String.Empty);
        payload["methodKind"] = result == null ? AscetMethodKind.Unknown.ToString() : result.MethodKind.ToString();
        payload["diagram"] = result == null ? String.Empty : (result.DiagramName ?? String.Empty);
        payload["deleted"] = result != null && result.Deleted;
        payload["alreadyMissing"] = result != null && result.AlreadyMissing;
        payload["targetKey"] = result == null ? String.Empty : (result.TargetKey ?? String.Empty);
        payload["verifyReadbackRequested"] = result != null && result.VerifyReadbackRequested;
        payload["readbackVerified"] = result != null && result.ReadbackVerified;
        payload["summary"] = result == null ? String.Empty : (result.Summary ?? String.Empty);
        return AscetJsonContract.Serialize(payload);
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
