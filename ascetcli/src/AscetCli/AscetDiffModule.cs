using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
using System.Web.Script.Serialization;

public sealed class AscetDiffModuleArguments
{
    public string LeftModulePath { get; set; }
    public string RightModulePath { get; set; }
    public bool EmitJson { get; set; }
    public bool ChangesOnly { get; set; }
}

public static class AscetDiffModule
{
    public static int Main(string[] args)
    {
        TextWriter originalOut = Console.Out;
        StringWriter suppressedOut = null;

        try
        {
            AscetDiffModuleArguments arguments = ParseArguments(args);
            if (arguments.EmitJson)
            {
                suppressedOut = new StringWriter();
                Console.SetOut(suppressedOut);
            }

            AscetToolApiBootstrap.ConfigureAssemblyResolution();
            ModuleLocatorService locator = new ModuleLocatorService();
            ModuleDiffService service = new ModuleDiffService();
            AscetModuleRef left = locator.GetModule(arguments.LeftModulePath);
            AscetModuleRef right = locator.GetModule(arguments.RightModulePath);
            AscetModuleDiffSummary summary = service.GetDiff(left, right);
            string output = arguments.EmitJson ? FormatJsonOutput(summary, arguments.ChangesOnly) : FormatTextOutput(summary, arguments.ChangesOnly);

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

    public static AscetDiffModuleArguments ParseArguments(string[] args)
    {
        if (args == null || args.Length < 2)
        {
            throw new AscetReadException("invalid_argument", "parse_arguments", "usage: AscetCli.exe exec diff_module <left-module-path> <right-module-path> [--json] [--changes-only]");
        }

        AscetDiffModuleArguments result = new AscetDiffModuleArguments
        {
            LeftModulePath = AscetReadModuleSummary.NormalizeModulePath(args[0]),
            RightModulePath = AscetReadModuleSummary.NormalizeModulePath(args[1]),
            EmitJson = false,
            ChangesOnly = false
        };

        for (int i = 2; i < args.Length; i++)
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

    public static string FormatTextOutput(AscetModuleDiffSummary summary)
    {
        return FormatTextOutput(summary, false);
    }

    public static string FormatTextOutput(AscetModuleDiffSummary summary, bool changesOnly)
    {
        if (summary == null)
        {
            throw new AscetReadException("invalid_argument", "format_text_output", "Module diff summary must not be null.");
        }

        AscetModuleDiffSummary view = BuildView(summary, changesOnly);
        StringBuilder builder = new StringBuilder();
        builder.Append("Left: ").Append(view.LeftModulePath ?? String.Empty).AppendLine();
        builder.Append("Right: ").Append(view.RightModulePath ?? String.Empty).AppendLine();
        builder.Append("MethodDiffs: ").Append(view.MethodDiffs == null ? 0 : view.MethodDiffs.Count).AppendLine();
        builder.Append("ImplementationDiffs: ").Append(view.ImplementationDiffs == null ? 0 : view.ImplementationDiffs.Count).AppendLine();
        builder.Append("ReferenceDiffs: ").Append(view.ReferenceDiffs == null ? 0 : view.ReferenceDiffs.Count).AppendLine();
        builder.Append("BlockDiffs: ").Append(view.BlockDiffs == null ? 0 : view.BlockDiffs.Count).AppendLine();
        AppendMethodDiffs(builder, view.MethodDiffs);
        AppendImplementationDiffs(builder, view.ImplementationDiffs);
        AppendNamedDiffs(builder, view.BlockDiffs, "BlockDiff");
        builder.Append("Summary: ").Append(view.Summary ?? String.Empty).AppendLine();
        return builder.ToString();
    }

    public static string FormatJsonOutput(AscetModuleDiffSummary summary)
    {
        return FormatJsonOutput(summary, false);
    }

    public static string FormatJsonOutput(AscetModuleDiffSummary summary, bool changesOnly)
    {
        if (summary == null)
        {
            throw new AscetReadException("invalid_argument", "format_json_output", "Module diff summary must not be null.");
        }

        AscetModuleDiffSummary view = BuildView(summary, changesOnly);
        JavaScriptSerializer serializer = new JavaScriptSerializer();
        return AscetJsonContract.Serialize(BuildSerializableSummary(view));
    }

    private static AscetModuleDiffSummary BuildView(AscetModuleDiffSummary summary, bool changesOnly)
    {
        return new AscetModuleDiffSummary
        {
            LeftModulePath = summary.LeftModulePath ?? String.Empty,
            RightModulePath = summary.RightModulePath ?? String.Empty,
            MethodDiffs = FilterMethodDiffs(summary.MethodDiffs, changesOnly),
            ImplementationDiffs = FilterImplementationDiffs(summary.ImplementationDiffs, changesOnly),
            ReferenceDiffs = FilterNamedDiffs(summary.ReferenceDiffs, changesOnly),
            BlockDiffs = FilterNamedDiffs(summary.BlockDiffs, changesOnly),
            Summary = summary.Summary ?? String.Empty
        };
    }

    private static IList<AscetNamedDiffRef> FilterNamedDiffs(IList<AscetNamedDiffRef> diffs, bool changesOnly)
    {
        List<AscetNamedDiffRef> result = new List<AscetNamedDiffRef>();
        if (diffs == null)
        {
            return result;
        }

        for (int i = 0; i < diffs.Count; i++)
        {
            AscetNamedDiffRef diff = diffs[i];
            if (diff == null)
            {
                continue;
            }

            if (changesOnly && diff.ChangeKind == AscetDiffChangeKind.Unchanged)
            {
                continue;
            }

            result.Add(diff);
        }

        return result;
    }

    private static IList<AscetMethodCodeDiffRef> FilterMethodDiffs(IList<AscetMethodCodeDiffRef> diffs, bool changesOnly)
    {
        List<AscetMethodCodeDiffRef> result = new List<AscetMethodCodeDiffRef>();
        if (diffs == null)
        {
            return result;
        }

        for (int i = 0; i < diffs.Count; i++)
        {
            AscetMethodCodeDiffRef diff = diffs[i];
            if (diff == null)
            {
                continue;
            }

            if (changesOnly && diff.ChangeKind == AscetDiffChangeKind.Unchanged)
            {
                continue;
            }

            result.Add(diff);
        }

        return result;
    }

    private static IList<AscetImplementationElementDiffRef> FilterImplementationDiffs(IList<AscetImplementationElementDiffRef> diffs, bool changesOnly)
    {
        List<AscetImplementationElementDiffRef> result = new List<AscetImplementationElementDiffRef>();
        if (diffs == null)
        {
            return result;
        }

        for (int i = 0; i < diffs.Count; i++)
        {
            AscetImplementationElementDiffRef diff = diffs[i];
            if (diff == null)
            {
                continue;
            }

            if (changesOnly && diff.ChangeKind == AscetDiffChangeKind.Unchanged)
            {
                continue;
            }

            result.Add(diff);
        }

        return result;
    }

    private static void AppendNamedDiffs(StringBuilder builder, IList<AscetNamedDiffRef> diffs, string label)
    {
        if (builder == null || diffs == null)
        {
            return;
        }

        for (int i = 0; i < diffs.Count; i++)
        {
            AscetNamedDiffRef diff = diffs[i];
            if (diff == null)
            {
                continue;
            }

            builder.Append(label).Append(": ").Append(diff.Name ?? String.Empty).Append(" [").Append(diff.ChangeKind.ToString()).Append("]").AppendLine();
        }
    }

    private static void AppendMethodDiffs(StringBuilder builder, IList<AscetMethodCodeDiffRef> diffs)
    {
        if (builder == null || diffs == null)
        {
            return;
        }

        for (int i = 0; i < diffs.Count; i++)
        {
            AscetMethodCodeDiffRef diff = diffs[i];
            if (diff == null)
            {
                continue;
            }

            builder.Append("MethodDiff: ").Append(diff.Name ?? String.Empty).Append(" [").Append(diff.MethodKind.ToString()).Append("/").Append(diff.ChangeKind.ToString()).Append("]").AppendLine();
        }
    }

    private static void AppendImplementationDiffs(StringBuilder builder, IList<AscetImplementationElementDiffRef> diffs)
    {
        if (builder == null || diffs == null)
        {
            return;
        }

        for (int i = 0; i < diffs.Count; i++)
        {
            AscetImplementationElementDiffRef diff = diffs[i];
            if (diff == null)
            {
                continue;
            }

            builder.Append("ImplementationDiff: ").Append(diff.ElementPath ?? String.Empty).Append(" [").Append(diff.ChangeKind.ToString()).Append("]").AppendLine();
        }
    }

    private static IDictionary<string, object> BuildSerializableSummary(AscetModuleDiffSummary summary)
    {
        Dictionary<string, object> result = new Dictionary<string, object>();
        result["LeftModulePath"] = summary.LeftModulePath ?? String.Empty;
        result["RightModulePath"] = summary.RightModulePath ?? String.Empty;
        result["MethodDiffs"] = BuildSerializableMethodDiffs(summary.MethodDiffs);
        result["ImplementationDiffs"] = BuildSerializableImplementationDiffs(summary.ImplementationDiffs);
        result["ReferenceDiffs"] = BuildSerializableNamedDiffs(summary.ReferenceDiffs);
        result["BlockDiffs"] = BuildSerializableNamedDiffs(summary.BlockDiffs);
        result["Summary"] = summary.Summary ?? String.Empty;
        return result;
    }

    private static IList<IDictionary<string, object>> BuildSerializableNamedDiffs(IList<AscetNamedDiffRef> diffs)
    {
        List<IDictionary<string, object>> result = new List<IDictionary<string, object>>();
        if (diffs == null)
        {
            return result;
        }

        for (int i = 0; i < diffs.Count; i++)
        {
            AscetNamedDiffRef diff = diffs[i];
            Dictionary<string, object> entry = new Dictionary<string, object>();
            entry["Name"] = diff == null ? String.Empty : (diff.Name ?? String.Empty);
            entry["ChangeKind"] = diff == null ? AscetDiffChangeKind.Unknown.ToString() : diff.ChangeKind.ToString();
            entry["LeftValue"] = diff == null ? String.Empty : (diff.LeftValue ?? String.Empty);
            entry["RightValue"] = diff == null ? String.Empty : (diff.RightValue ?? String.Empty);
            result.Add(entry);
        }

        return result;
    }

    private static IList<IDictionary<string, object>> BuildSerializableMethodDiffs(IList<AscetMethodCodeDiffRef> diffs)
    {
        List<IDictionary<string, object>> result = new List<IDictionary<string, object>>();
        if (diffs == null)
        {
            return result;
        }

        for (int i = 0; i < diffs.Count; i++)
        {
            AscetMethodCodeDiffRef diff = diffs[i];
            Dictionary<string, object> entry = new Dictionary<string, object>();
            entry["Name"] = diff == null ? String.Empty : (diff.Name ?? String.Empty);
            entry["MethodKind"] = diff == null ? AscetMethodKind.Unknown.ToString() : diff.MethodKind.ToString();
            entry["ChangeKind"] = diff == null ? AscetDiffChangeKind.Unknown.ToString() : diff.ChangeKind.ToString();
            entry["LeftCode"] = diff == null ? String.Empty : (diff.LeftCode ?? String.Empty);
            entry["RightCode"] = diff == null ? String.Empty : (diff.RightCode ?? String.Empty);
            result.Add(entry);
        }

        return result;
    }

    private static IList<IDictionary<string, object>> BuildSerializableImplementationDiffs(IList<AscetImplementationElementDiffRef> diffs)
    {
        List<IDictionary<string, object>> result = new List<IDictionary<string, object>>();
        if (diffs == null)
        {
            return result;
        }

        for (int i = 0; i < diffs.Count; i++)
        {
            AscetImplementationElementDiffRef diff = diffs[i];
            Dictionary<string, object> entry = new Dictionary<string, object>();
            entry["ElementPath"] = diff == null ? String.Empty : (diff.ElementPath ?? String.Empty);
            entry["ChangeKind"] = diff == null ? AscetDiffChangeKind.Unknown.ToString() : diff.ChangeKind.ToString();
            entry["LeftSignature"] = diff == null ? String.Empty : (diff.LeftSignature ?? String.Empty);
            entry["RightSignature"] = diff == null ? String.Empty : (diff.RightSignature ?? String.Empty);
            result.Add(entry);
        }

        return result;
    }

    private static string NormalizeJsonOutput(string json)
    {
        return AscetJsonContract.Normalize(json);
    }

    private static string FormatException(Exception ex)
    {
        StringBuilder builder = new StringBuilder();
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
