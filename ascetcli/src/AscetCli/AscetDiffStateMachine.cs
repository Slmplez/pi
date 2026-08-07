using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
using System.Web.Script.Serialization;

public sealed class AscetDiffStateMachineArguments
{
    public string LeftComponentPath { get; set; }
    public string RightComponentPath { get; set; }
    public bool EmitJson { get; set; }
    public bool ChangesOnly { get; set; }
}

public static class AscetDiffStateMachine
{
    public static int Main(string[] args)
    {
        TextWriter originalOut = Console.Out;
        StringWriter suppressedOut = null;

        try
        {
            AscetDiffStateMachineArguments arguments = ParseArguments(args);
            if (arguments.EmitJson)
            {
                suppressedOut = new StringWriter();
                Console.SetOut(suppressedOut);
            }

            AscetToolApiBootstrap.ConfigureAssemblyResolution();
            ComponentLocatorService locator = new ComponentLocatorService();
            StateMachineDiffService service = new StateMachineDiffService();
            AscetItemPath leftPath = AscetItemPath.Parse(arguments.LeftComponentPath);
            AscetItemPath rightPath = AscetItemPath.Parse(arguments.RightComponentPath);
            AscetItemRef left = locator.FindItemInFolder(leftPath.ItemName, leftPath.FolderPath);
            AscetItemRef right = locator.FindItemInFolder(rightPath.ItemName, rightPath.FolderPath);
            AscetStateMachineDiffSummary summary = service.GetDiff(left, right);
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

    public static AscetDiffStateMachineArguments ParseArguments(string[] args)
    {
        if (args == null || args.Length < 2)
        {
            throw new AscetReadException("invalid_argument", "parse_arguments", "usage: AscetCli.exe exec diff_state_machine <left-component-path> <right-component-path> [--json] [--changes-only]");
        }

        AscetDiffStateMachineArguments result = new AscetDiffStateMachineArguments
        {
            LeftComponentPath = NormalizeComponentPath(args[0]),
            RightComponentPath = NormalizeComponentPath(args[1]),
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

    public static string FormatTextOutput(AscetStateMachineDiffSummary summary)
    {
        return FormatTextOutput(summary, false);
    }

    public static string FormatTextOutput(AscetStateMachineDiffSummary summary, bool changesOnly)
    {
        if (summary == null)
        {
            throw new AscetReadException("invalid_argument", "format_text_output", "State-machine diff summary must not be null.");
        }

        AscetStateMachineDiffSummary view = BuildView(summary, changesOnly);
        StringBuilder builder = new StringBuilder();
        builder.Append("Left: ").Append(view.LeftComponentPath ?? String.Empty).AppendLine();
        builder.Append("Right: ").Append(view.RightComponentPath ?? String.Empty).AppendLine();
        builder.Append("StateDiffs: ").Append(view.StateDiffs == null ? 0 : view.StateDiffs.Count).AppendLine();
        builder.Append("TransitionDiffs: ").Append(view.TransitionDiffs == null ? 0 : view.TransitionDiffs.Count).AppendLine();
        builder.Append("MethodDiffs: ").Append(view.MethodDiffs == null ? 0 : view.MethodDiffs.Count).AppendLine();
        builder.Append("ImplementationDiffs: ").Append(view.ImplementationDiffs == null ? 0 : view.ImplementationDiffs.Count).AppendLine();
        builder.Append("ReferenceDiffs: ").Append(view.ReferenceDiffs == null ? 0 : view.ReferenceDiffs.Count).AppendLine();
        builder.Append("LinkedDiffs: ").Append(view.LinkedDiffs == null ? 0 : view.LinkedDiffs.Count).AppendLine();
        AppendNamedDiffs(builder, view.StateDiffs, "StateDiff");
        AppendTransitionDiffs(builder, view.TransitionDiffs);
        AppendMethodDiffs(builder, view.MethodDiffs);
        AppendImplementationDiffs(builder, view.ImplementationDiffs);
        AppendLinkedDiffs(builder, view.LinkedDiffs);
        builder.Append("Summary: ").Append(view.Summary ?? String.Empty).AppendLine();
        return builder.ToString();
    }

    public static string FormatJsonOutput(AscetStateMachineDiffSummary summary)
    {
        return FormatJsonOutput(summary, false);
    }

    public static string FormatJsonOutput(AscetStateMachineDiffSummary summary, bool changesOnly)
    {
        if (summary == null)
        {
            throw new AscetReadException("invalid_argument", "format_json_output", "State-machine diff summary must not be null.");
        }

        AscetStateMachineDiffSummary view = BuildView(summary, changesOnly);
        JavaScriptSerializer serializer = new JavaScriptSerializer();
        return AscetJsonContract.Serialize(BuildSerializableSummary(view));
    }

    private static AscetStateMachineDiffSummary BuildView(AscetStateMachineDiffSummary summary, bool changesOnly)
    {
        return new AscetStateMachineDiffSummary
        {
            LeftComponentPath = summary.LeftComponentPath ?? String.Empty,
            RightComponentPath = summary.RightComponentPath ?? String.Empty,
            StateDiffs = FilterNamedDiffs(summary.StateDiffs, changesOnly),
            TransitionDiffs = FilterTransitionDiffs(summary.TransitionDiffs, changesOnly),
            MethodDiffs = FilterMethodDiffs(summary.MethodDiffs, changesOnly),
            ImplementationDiffs = FilterImplementationDiffs(summary.ImplementationDiffs, changesOnly),
            ReferenceDiffs = FilterNamedDiffs(summary.ReferenceDiffs, changesOnly),
            LinkedDiffs = summary.LinkedDiffs ?? new List<AscetBehaviorImplementationLinkDiffRef>(),
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

    private static IList<AscetTransitionDiffRef> FilterTransitionDiffs(IList<AscetTransitionDiffRef> diffs, bool changesOnly)
    {
        List<AscetTransitionDiffRef> result = new List<AscetTransitionDiffRef>();
        if (diffs == null)
        {
            return result;
        }

        for (int i = 0; i < diffs.Count; i++)
        {
            AscetTransitionDiffRef diff = diffs[i];
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

    private static void AppendTransitionDiffs(StringBuilder builder, IList<AscetTransitionDiffRef> diffs)
    {
        if (builder == null || diffs == null)
        {
            return;
        }

        for (int i = 0; i < diffs.Count; i++)
        {
            AscetTransitionDiffRef diff = diffs[i];
            if (diff == null)
            {
                continue;
            }

            builder.Append("TransitionDiff: ").Append(diff.Key ?? String.Empty).Append(" [").Append(diff.ChangeKind.ToString()).Append("]").AppendLine();
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

    private static void AppendLinkedDiffs(StringBuilder builder, IList<AscetBehaviorImplementationLinkDiffRef> diffs)
    {
        if (builder == null || diffs == null)
        {
            return;
        }

        for (int i = 0; i < diffs.Count; i++)
        {
            AscetBehaviorImplementationLinkDiffRef diff = diffs[i];
            if (diff == null)
            {
                continue;
            }

            builder.Append("LinkedDiff: ").Append(diff.ElementPath ?? String.Empty).Append(" -> ").Append(diff.RelatedBehavior ?? String.Empty).AppendLine();
        }
    }

    private static IDictionary<string, object> BuildSerializableSummary(AscetStateMachineDiffSummary summary)
    {
        Dictionary<string, object> result = new Dictionary<string, object>();
        result["LeftComponentPath"] = summary.LeftComponentPath ?? String.Empty;
        result["RightComponentPath"] = summary.RightComponentPath ?? String.Empty;
        result["StateDiffs"] = BuildSerializableNamedDiffs(summary.StateDiffs);
        result["TransitionDiffs"] = BuildSerializableTransitionDiffs(summary.TransitionDiffs);
        result["MethodDiffs"] = BuildSerializableMethodDiffs(summary.MethodDiffs);
        result["ImplementationDiffs"] = BuildSerializableImplementationDiffs(summary.ImplementationDiffs);
        result["ReferenceDiffs"] = BuildSerializableNamedDiffs(summary.ReferenceDiffs);
        result["LinkedDiffs"] = BuildSerializableLinkedDiffs(summary.LinkedDiffs);
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
            entry["ChangeKind"] = diff == null ? String.Empty : diff.ChangeKind.ToString();
            entry["LeftValue"] = diff == null ? String.Empty : (diff.LeftValue ?? String.Empty);
            entry["RightValue"] = diff == null ? String.Empty : (diff.RightValue ?? String.Empty);
            result.Add(entry);
        }

        return result;
    }

    private static IList<IDictionary<string, object>> BuildSerializableTransitionDiffs(IList<AscetTransitionDiffRef> diffs)
    {
        List<IDictionary<string, object>> result = new List<IDictionary<string, object>>();
        if (diffs == null)
        {
            return result;
        }

        for (int i = 0; i < diffs.Count; i++)
        {
            AscetTransitionDiffRef diff = diffs[i];
            Dictionary<string, object> entry = new Dictionary<string, object>();
            entry["Key"] = diff == null ? String.Empty : (diff.Key ?? String.Empty);
            entry["ChangeKind"] = diff == null ? String.Empty : diff.ChangeKind.ToString();
            entry["LeftTrigger"] = diff == null ? String.Empty : (diff.LeftTrigger ?? String.Empty);
            entry["RightTrigger"] = diff == null ? String.Empty : (diff.RightTrigger ?? String.Empty);
            entry["LeftGuard"] = diff == null ? String.Empty : (diff.LeftGuard ?? String.Empty);
            entry["RightGuard"] = diff == null ? String.Empty : (diff.RightGuard ?? String.Empty);
            entry["LeftAction"] = diff == null ? String.Empty : (diff.LeftAction ?? String.Empty);
            entry["RightAction"] = diff == null ? String.Empty : (diff.RightAction ?? String.Empty);
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
            entry["MethodKind"] = diff == null ? String.Empty : diff.MethodKind.ToString();
            entry["ChangeKind"] = diff == null ? String.Empty : diff.ChangeKind.ToString();
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
            entry["ChangeKind"] = diff == null ? String.Empty : diff.ChangeKind.ToString();
            entry["LeftSignature"] = diff == null ? String.Empty : (diff.LeftSignature ?? String.Empty);
            entry["RightSignature"] = diff == null ? String.Empty : (diff.RightSignature ?? String.Empty);
            result.Add(entry);
        }

        return result;
    }

    private static IList<IDictionary<string, object>> BuildSerializableLinkedDiffs(IList<AscetBehaviorImplementationLinkDiffRef> diffs)
    {
        List<IDictionary<string, object>> result = new List<IDictionary<string, object>>();
        if (diffs == null)
        {
            return result;
        }

        for (int i = 0; i < diffs.Count; i++)
        {
            AscetBehaviorImplementationLinkDiffRef diff = diffs[i];
            Dictionary<string, object> entry = new Dictionary<string, object>();
            entry["ElementPath"] = diff == null ? String.Empty : (diff.ElementPath ?? String.Empty);
            entry["RelatedBehavior"] = diff == null ? String.Empty : (diff.RelatedBehavior ?? String.Empty);
            entry["Note"] = diff == null ? String.Empty : (diff.Note ?? String.Empty);
            result.Add(entry);
        }

        return result;
    }

    private static string NormalizeComponentPath(string componentPath)
    {
        if (String.IsNullOrWhiteSpace(componentPath))
        {
            throw new AscetReadException("invalid_argument", "normalize_component_path", "Component path must not be empty.");
        }

        string normalized = componentPath.Trim().Replace('/', '\\');
        while (normalized.StartsWith("\\", StringComparison.Ordinal))
        {
            normalized = normalized.Substring(1);
        }

        if (String.IsNullOrWhiteSpace(normalized))
        {
            throw new AscetReadException("invalid_argument", "normalize_component_path", "Component path must contain a component name.");
        }

        return normalized;
    }

    private static string NormalizeJsonOutput(string json)
    {
        return AscetJsonContract.Normalize(json);
    }

    private static string FormatException(Exception ex)
    {
        AscetReadException ascet = ex as AscetReadException;
        if (ascet != null)
        {
            return ascet.Code + " [" + ascet.Operation + "]: " + ascet.Message;
        }

        return ex.GetType().FullName + ": " + ex.Message;
    }
}
