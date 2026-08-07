using System;
using System.Collections.Generic;
using System.IO;
using System.Text;

public sealed class AscetDiffMethodCodeArguments
{
    public string LeftComponentPath { get; set; }
    public string RightComponentPath { get; set; }
    public string MethodName { get; set; }
    public bool ChangesOnly { get; set; }
    public bool EmitJson { get; set; }
}

public static class AscetDiffMethodCode
{
    public static int Main(string[] args)
    {
        TextWriter originalOut = Console.Out;
        StringWriter suppressedOut = null;

        try
        {
            AscetDiffMethodCodeArguments arguments = ParseArguments(args);
            if (arguments.EmitJson)
            {
                suppressedOut = new StringWriter();
                Console.SetOut(suppressedOut);
            }

            Dictionary<string, object> left = ReadMethodCodeChild(arguments.LeftComponentPath, arguments.MethodName);
            Dictionary<string, object> right = ReadMethodCodeChild(arguments.RightComponentPath, arguments.MethodName);

            Dictionary<string, object> payload = BuildPayload(arguments, left, right);
            if (arguments.ChangesOnly && !(bool)payload["changed"])
            {
                payload["summary"] = "No method code changes.";
            }

            string output = arguments.EmitJson ? AscetDatabaseExplorerCommon.Serialize(payload) : FormatTextOutput(payload, arguments.ChangesOnly);

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

    private static Dictionary<string, object> ReadMethodCodeChild(string componentPath, string methodName)
    {
        try
        {
            return AscetDatabaseExplorerCommon.DeserializeChildJsonObject(
                AscetDatabaseExplorerCommon.RunSiblingCliExecOrExe("read_method_code", "AscetReadMethodCode.exe", new List<string> { componentPath, methodName, "--json" }));
        }
        catch (AscetReadException ex)
        {
            if (ContainsAscetError(ex.Message, "method_not_found"))
            {
                throw new AscetReadException(
                    "method_not_found",
                    "diff_method_code",
                    "Method '" + methodName + "' was not found in component '" + componentPath + "'.");
            }

            throw;
        }
    }

    internal static bool ContainsAscetError(string text, string code)
    {
        string value = text ?? String.Empty;
        return value.IndexOf(code + ":", StringComparison.OrdinalIgnoreCase) >= 0 ||
            value.IndexOf(code + " [", StringComparison.OrdinalIgnoreCase) >= 0 ||
            value.IndexOf("\"code\":\"" + code + "\"", StringComparison.OrdinalIgnoreCase) >= 0 ||
            value.IndexOf("\"code\": \"" + code + "\"", StringComparison.OrdinalIgnoreCase) >= 0;
    }

    public static AscetDiffMethodCodeArguments ParseArguments(string[] args)
    {
        if (args == null || args.Length < 3)
        {
            throw new AscetReadException("invalid_argument", "parse_arguments", "usage: AscetCli.exe exec diff_method_code <left-component-path> <right-component-path> <method-name> [--changes-only] [--json]");
        }

        AscetDiffMethodCodeArguments result = new AscetDiffMethodCodeArguments
        {
            LeftComponentPath = AscetReadMethodCode.NormalizeComponentPath(args[0]),
            RightComponentPath = AscetReadMethodCode.NormalizeComponentPath(args[1]),
            MethodName = AscetReadMethodCode.NormalizeMethodName(args[2]),
            ChangesOnly = false,
            EmitJson = false
        };

        for (int i = 3; i < args.Length; i++)
        {
            string argument = args[i];
            if (String.Equals(argument, "--json", StringComparison.OrdinalIgnoreCase))
            {
                result.EmitJson = true;
                continue;
            }

            if (String.Equals(argument, "--changes-only", StringComparison.OrdinalIgnoreCase))
            {
                result.ChangesOnly = true;
                continue;
            }

            throw new AscetReadException("invalid_argument", "parse_arguments", "Unknown argument '" + argument + "'.");
        }

        return result;
    }

    private static Dictionary<string, object> BuildPayload(AscetDiffMethodCodeArguments arguments, Dictionary<string, object> left, Dictionary<string, object> right)
    {
        string leftCode = AscetDatabaseExplorerCommon.GetString(left, "code");
        string rightCode = AscetDatabaseExplorerCommon.GetString(right, "code");
        bool changed = !String.Equals(leftCode, rightCode, StringComparison.Ordinal);

        Dictionary<string, object> payload = new Dictionary<string, object>();
        payload["leftTargetKey"] = arguments.LeftComponentPath + "::" + arguments.MethodName;
        payload["rightTargetKey"] = arguments.RightComponentPath + "::" + arguments.MethodName;
        payload["methodName"] = arguments.MethodName;
        payload["leftComponentKind"] = NormalizeKind(AscetDatabaseExplorerCommon.GetString(left, "componentKind"));
        payload["rightComponentKind"] = NormalizeKind(AscetDatabaseExplorerCommon.GetString(right, "componentKind"));
        payload["leftLanguageKind"] = AscetDatabaseExplorerCommon.GetString(left, "languageKind");
        payload["rightLanguageKind"] = AscetDatabaseExplorerCommon.GetString(right, "languageKind");
        payload["methodKind"] = AscetDatabaseExplorerCommon.FirstNonEmpty(
            AscetDatabaseExplorerCommon.GetString(left, "methodKind"),
            AscetDatabaseExplorerCommon.GetString(right, "methodKind"));
        payload["changed"] = changed;
        payload["summary"] = changed
            ? "Method '" + arguments.MethodName + "' changed between the two components."
            : "Method '" + arguments.MethodName + "' is identical between the two components.";
        payload["leftCode"] = leftCode;
        payload["rightCode"] = rightCode;
        return payload;
    }

    private static string NormalizeKind(string rawKind)
    {
        string normalized = (rawKind ?? String.Empty).Trim();
        if (String.Equals(normalized, "Class", StringComparison.OrdinalIgnoreCase))
        {
            return "class";
        }

        if (String.Equals(normalized, "Module", StringComparison.OrdinalIgnoreCase))
        {
            return "module";
        }

        if (String.Equals(normalized, "StateMachine", StringComparison.OrdinalIgnoreCase))
        {
            return "stateMachine";
        }

        return "unknown";
    }

    private static string FormatTextOutput(Dictionary<string, object> payload, bool changesOnly)
    {
        bool changed = payload != null && payload.ContainsKey("changed") && payload["changed"] is bool && (bool)payload["changed"];
        StringBuilder builder = new StringBuilder();
        builder.Append("LeftTarget: ").Append(AscetDatabaseExplorerCommon.GetString(payload, "leftTargetKey")).AppendLine();
        builder.Append("RightTarget: ").Append(AscetDatabaseExplorerCommon.GetString(payload, "rightTargetKey")).AppendLine();
        builder.Append("Changed: ").Append(changed).AppendLine();
        builder.Append("Summary: ").Append(AscetDatabaseExplorerCommon.GetString(payload, "summary")).AppendLine();

        if (!changesOnly || changed)
        {
            builder.AppendLine("=== Left Code ===");
            builder.AppendLine(AscetDatabaseExplorerCommon.GetString(payload, "leftCode"));
            builder.AppendLine("=== Right Code ===");
            builder.AppendLine(AscetDatabaseExplorerCommon.GetString(payload, "rightCode"));
        }

        return builder.ToString();
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
