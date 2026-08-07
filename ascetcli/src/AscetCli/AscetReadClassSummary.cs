using System;
using System.Collections.Generic;
using System.IO;
using System.Web.Script.Serialization;

public sealed class AscetReadClassSummaryArguments
{
    public string ClassPath { get; set; }
    public bool EmitJson { get; set; }
}

public static class AscetReadClassSummary
{
    public static int Main(string[] args)
    {
        TextWriter originalOut = Console.Out;
        StringWriter suppressedOut = null;

        try
        {
            AscetReadClassSummaryArguments arguments = ParseArguments(args);
            if (arguments.EmitJson)
            {
                suppressedOut = new StringWriter();
                Console.SetOut(suppressedOut);
            }

            AscetToolApiBootstrap.ConfigureAssemblyResolution();
            ClassLocatorService locator = new ClassLocatorService();
            ClassSummaryService service = new ClassSummaryService();
            AscetClassRef cls = locator.GetClass(arguments.ClassPath);
            AscetClassSummary summary = service.GetSummary(cls);
            string output = arguments.EmitJson ? FormatJsonOutput(summary) : FormatTextOutput(summary);

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

    public static AscetReadClassSummaryArguments ParseArguments(string[] args)
    {
        if (args == null || args.Length < 1)
        {
            throw new AscetReadException("invalid_argument", "parse_arguments", "usage: AscetCli.exe exec read_class_summary <class-path> [--json]");
        }

        AscetReadClassSummaryArguments result = new AscetReadClassSummaryArguments
        {
            ClassPath = NormalizeClassPath(args[0]),
            EmitJson = false
        };

        for (int i = 1; i < args.Length; i++)
        {
            if (String.Equals(args[i], "--json", StringComparison.OrdinalIgnoreCase))
            {
                result.EmitJson = true;
                continue;
            }

            throw new AscetReadException("invalid_argument", "parse_arguments", "Unknown argument '" + args[i] + "'.");
        }

        return result;
    }

    public static string NormalizeClassPath(string classPath)
    {
        if (String.IsNullOrWhiteSpace(classPath))
        {
            throw new AscetReadException("invalid_argument", "normalize_class_path", "Class path must not be empty.");
        }

        string normalized = classPath.Trim().Replace('/', '\\');
        while (normalized.StartsWith("\\", StringComparison.Ordinal))
        {
            normalized = normalized.Substring(1);
        }

        if (String.IsNullOrWhiteSpace(normalized))
        {
            throw new AscetReadException("invalid_argument", "normalize_class_path", "Class path must contain a class name.");
        }

        return normalized;
    }

    public static string FormatTextOutput(AscetClassSummary summary)
    {
        if (summary == null)
        {
            throw new AscetReadException("invalid_argument", "format_text_output", "Class summary must not be null.");
        }

        AscetClassRef cls = summary.ClassRef ?? new AscetClassRef();
        AscetClassCapabilities capabilities = summary.Capabilities ?? new AscetClassCapabilities();
        return "Class: " + (cls.Path ?? String.Empty) + " [" + cls.LanguageKind.ToString() + "]" + Environment.NewLine
            + "PrimaryAnalysis: " + capabilities.PrimaryAnalysis.ToString() + Environment.NewLine
            + "ElementCount: " + summary.ElementCount.ToString() + Environment.NewLine
            + "MethodCount: " + summary.MethodCount.ToString() + Environment.NewLine
            + "DiagramCount: " + summary.DiagramCount.ToString() + Environment.NewLine
            + "SupportsMethodCode: " + capabilities.SupportsMethodCode.ToString() + Environment.NewLine
            + "SupportsBlockDiagram: " + capabilities.SupportsBlockDiagram.ToString() + Environment.NewLine
            + "SupportsTextCode: " + capabilities.SupportsTextCode.ToString() + Environment.NewLine
            + "SupportsImplementation: " + capabilities.SupportsImplementation.ToString() + Environment.NewLine
            + "SupportsReferenceGraph: " + capabilities.SupportsReferenceGraph.ToString() + Environment.NewLine
            + "SupportsMethodWrite: " + capabilities.SupportsMethodWrite.ToString() + Environment.NewLine
            + "Summary: " + (summary.SummaryText ?? String.Empty) + Environment.NewLine;
    }

    public static string FormatJsonOutput(AscetClassSummary summary)
    {
        if (summary == null)
        {
            throw new AscetReadException("invalid_argument", "format_json_output", "Class summary must not be null.");
        }

        JavaScriptSerializer serializer = new JavaScriptSerializer();
        return AscetJsonContract.Serialize(BuildSerializableSummary(summary));
    }

    private static IDictionary<string, object> BuildSerializableSummary(AscetClassSummary summary)
    {
        Dictionary<string, object> result = new Dictionary<string, object>();
        result["ClassRef"] = BuildSerializableClass(summary.ClassRef);
        result["Capabilities"] = BuildSerializableCapabilities(summary.Capabilities);
        result["ElementCount"] = summary.ElementCount;
        result["MethodCount"] = summary.MethodCount;
        result["DiagramCount"] = summary.DiagramCount;
        result["SummaryText"] = summary.SummaryText ?? String.Empty;
        return result;
    }

    private static IDictionary<string, object> BuildSerializableClass(AscetClassRef cls)
    {
        Dictionary<string, object> result = new Dictionary<string, object>();
        result["Name"] = cls == null ? String.Empty : (cls.Name ?? String.Empty);
        result["Path"] = cls == null ? String.Empty : (cls.Path ?? String.Empty);
        result["LanguageKind"] = cls == null ? AscetLanguageKind.Unknown.ToString() : cls.LanguageKind.ToString();
        return result;
    }

    private static IDictionary<string, object> BuildSerializableCapabilities(AscetClassCapabilities capabilities)
    {
        Dictionary<string, object> result = new Dictionary<string, object>();
        result["PrimaryAnalysis"] = capabilities == null ? AscetClassPrimaryAnalysisKind.Unknown.ToString() : capabilities.PrimaryAnalysis.ToString();
        result["SupportsMethodCode"] = capabilities != null && capabilities.SupportsMethodCode;
        result["SupportsBlockDiagram"] = capabilities != null && capabilities.SupportsBlockDiagram;
        result["SupportsTextCode"] = capabilities != null && capabilities.SupportsTextCode;
        result["SupportsImplementation"] = capabilities != null && capabilities.SupportsImplementation;
        result["SupportsReferenceGraph"] = capabilities != null && capabilities.SupportsReferenceGraph;
        result["SupportsMethodWrite"] = capabilities != null && capabilities.SupportsMethodWrite;
        return result;
    }

    private static string NormalizeJsonOutput(string json)
    {
        return AscetJsonContract.Normalize(json);
    }

    private static string FormatException(Exception ex)
    {
        System.Text.StringBuilder builder = new System.Text.StringBuilder();
        int depth = 0;
        while (ex != null)
        {
            builder.Append("Exception[").Append(depth).Append("]: ").Append(ex.GetType().FullName).AppendLine();
            builder.Append("Message: ").Append(ex.Message).AppendLine();
            if (!String.IsNullOrEmpty(ex.StackTrace))
            {
                builder.AppendLine("StackTrace:");
                builder.AppendLine(ex.StackTrace);
            }

            builder.AppendLine();
            ex = ex.InnerException;
            depth++;
        }

        return builder.ToString();
    }
}
