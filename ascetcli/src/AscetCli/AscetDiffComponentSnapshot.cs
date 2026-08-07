using System;
using System.Collections.Generic;
using System.IO;
using System.Text;

public sealed class AscetDiffComponentSnapshotArguments
{
    public string LeftPath { get; set; }
    public string RightPath { get; set; }
    public bool ChangesOnly { get; set; }
    public bool EmitJson { get; set; }
}

public static class AscetDiffComponentSnapshot
{
    public static int Main(string[] args)
    {
        TextWriter originalOut = Console.Out;
        StringWriter suppressedOut = null;

        try
        {
            AscetDiffComponentSnapshotArguments arguments = ParseArguments(args);
            if (arguments.EmitJson)
            {
                suppressedOut = new StringWriter();
                Console.SetOut(suppressedOut);
            }

            AscetToolApiBootstrap.ConfigureAssemblyResolution();
            ComponentLocatorService locator = new ComponentLocatorService();
            AscetItemPath leftParsed = AscetItemPath.Parse(arguments.LeftPath);
            AscetItemPath rightParsed = AscetItemPath.Parse(arguments.RightPath);
            AscetItemRef left = locator.FindItemInFolder(leftParsed.ItemName, leftParsed.FolderPath);
            AscetItemRef right = locator.FindItemInFolder(rightParsed.ItemName, rightParsed.FolderPath);

            ValidateKindMatch(left.Kind, right.Kind);

            Dictionary<string, object> diff = BuildLightweightComponentDiff(arguments, left, right);
            Dictionary<string, object> payload = BuildPayload(arguments, left.Kind, diff);
            string output = arguments.EmitJson ? AscetDatabaseExplorerCommon.Serialize(payload) : FormatTextOutput(payload);

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

    public static AscetDiffComponentSnapshotArguments ParseArguments(string[] args)
    {
        if (args == null || args.Length < 2)
        {
            throw new AscetReadException("invalid_argument", "parse_arguments", "usage: AscetCli.exe exec diff_component_snapshot <left-component-path> <right-component-path> [--changes-only] [--json]");
        }

        AscetDiffComponentSnapshotArguments result = new AscetDiffComponentSnapshotArguments();
        result.LeftPath = AscetDatabaseExplorerCommon.NormalizePath(args[0], "left_component_path");
        result.RightPath = AscetDatabaseExplorerCommon.NormalizePath(args[1], "right_component_path");
        result.ChangesOnly = false;
        result.EmitJson = false;

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

    private static IList<string> BuildChildArgs(AscetDiffComponentSnapshotArguments arguments)
    {
        List<string> childArgs = new List<string>();
        childArgs.Add(arguments.LeftPath);
        childArgs.Add(arguments.RightPath);
        childArgs.Add("--json");
        if (arguments.ChangesOnly)
        {
            childArgs.Add("--changes-only");
        }

        return childArgs;
    }

    private static Dictionary<string, object> BuildPayload(AscetDiffComponentSnapshotArguments arguments, AscetComponentKind kind, Dictionary<string, object> diff)
    {
        Dictionary<string, object> payload = new Dictionary<string, object>();
        payload["kind"] = AscetDatabaseExplorerCommon.KindToSchema(kind);
        payload["leftPath"] = arguments.LeftPath;
        payload["rightPath"] = arguments.RightPath;
        payload["changesOnly"] = arguments.ChangesOnly;
        payload["summary"] = ResolveSummary(diff);
        payload["counts"] = BuildCounts(diff);
        payload["sections"] = BuildSections(diff);
        return payload;
    }

    private static Dictionary<string, object> BuildLightweightComponentDiff(
        AscetDiffComponentSnapshotArguments arguments,
        AscetItemRef left,
        AscetItemRef right)
    {
        Dictionary<string, object> leftSnapshot = LoadLightweightSnapshot(left == null ? String.Empty : left.Path);
        Dictionary<string, object> rightSnapshot = LoadLightweightSnapshot(right == null ? String.Empty : right.Path);

        Dictionary<string, object> diff = new Dictionary<string, object>();
        diff["Summary"] = "Compared component child snapshots.";
        diff["MethodDiffs"] = BuildNameDiffs(
            AscetDatabaseExplorerCommon.GetList(leftSnapshot, "methods"),
            AscetDatabaseExplorerCommon.GetList(rightSnapshot, "methods"),
            "name",
            arguments.ChangesOnly);
        diff["ImplementationDiffs"] = BuildNameDiffs(
            AscetDatabaseExplorerCommon.GetList(leftSnapshot, "elements"),
            AscetDatabaseExplorerCommon.GetList(rightSnapshot, "elements"),
            "name",
            arguments.ChangesOnly);
        diff["ReferenceDiffs"] = new object[0];
        diff["BlockDiffs"] = BuildNameDiffs(
            AscetDatabaseExplorerCommon.GetList(leftSnapshot, "diagrams"),
            AscetDatabaseExplorerCommon.GetList(rightSnapshot, "diagrams"),
            "name",
            arguments.ChangesOnly);
        diff["StateDiffs"] = new object[0];
        diff["TransitionDiffs"] = new object[0];
        diff["LinkedDiffs"] = new object[0];
        return diff;
    }

    private static Dictionary<string, object> LoadLightweightSnapshot(string componentPath)
    {
        AscetReadComponentChildrenArguments allArguments = new AscetReadComponentChildrenArguments();
        allArguments.ComponentPath = componentPath ?? String.Empty;
        allArguments.Group = "all";
        allArguments.EmitJson = true;
        Dictionary<string, object> payload = AscetReadComponentChildren.BuildPayload(allArguments);

        Dictionary<string, object> snapshot = new Dictionary<string, object>();
        List<object> methods = new List<object>();
        List<object> elements = new List<object>();
        IList<object> items = AscetDatabaseExplorerCommon.GetList(payload, "items");
        for (int i = 0; i < items.Count; i++)
        {
            Dictionary<string, object> item = items[i] as Dictionary<string, object>;
            if (item == null)
            {
                continue;
            }

            string group = AscetDatabaseExplorerCommon.GetString(item, "group");
            if (String.Equals(group, "methods", StringComparison.Ordinal))
            {
                methods.Add(item);
            }
            else if (!String.Equals(group, "diagrams", StringComparison.Ordinal))
            {
                elements.Add(item);
            }
        }

        AscetReadComponentChildrenArguments diagramArguments = new AscetReadComponentChildrenArguments();
        diagramArguments.ComponentPath = componentPath ?? String.Empty;
        diagramArguments.Group = "diagrams";
        diagramArguments.EmitJson = true;
        Dictionary<string, object> diagramPayload = AscetReadComponentChildren.BuildPayload(diagramArguments);

        snapshot["methods"] = methods;
        snapshot["elements"] = elements;
        snapshot["diagrams"] = AscetDatabaseExplorerCommon.GetList(diagramPayload, "items");
        return snapshot;
    }

    private static IList<object> BuildNameDiffs(IList<object> leftItems, IList<object> rightItems, string key, bool changesOnly)
    {
        Dictionary<string, Dictionary<string, object>> leftByName = IndexByName(leftItems, key);
        Dictionary<string, Dictionary<string, object>> rightByName = IndexByName(rightItems, key);
        SortedSet<string> names = new SortedSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (string name in leftByName.Keys)
        {
            names.Add(name);
        }

        foreach (string name in rightByName.Keys)
        {
            names.Add(name);
        }

        List<object> diffs = new List<object>();
        foreach (string name in names)
        {
            bool inLeft = leftByName.ContainsKey(name);
            bool inRight = rightByName.ContainsKey(name);
            string changeKind = inLeft && inRight ? "Unchanged" : (inLeft ? "Removed" : "Added");
            if (changesOnly && String.Equals(changeKind, "Unchanged", StringComparison.Ordinal))
            {
                continue;
            }

            Dictionary<string, object> diff = new Dictionary<string, object>();
            diff["Name"] = name;
            diff["ChangeKind"] = changeKind;
            diffs.Add(diff);
        }

        return diffs;
    }

    private static Dictionary<string, Dictionary<string, object>> IndexByName(IList<object> items, string key)
    {
        Dictionary<string, Dictionary<string, object>> result = new Dictionary<string, Dictionary<string, object>>(StringComparer.OrdinalIgnoreCase);
        if (items == null)
        {
            return result;
        }

        for (int i = 0; i < items.Count; i++)
        {
            Dictionary<string, object> item = items[i] as Dictionary<string, object>;
            string name = AscetDatabaseExplorerCommon.GetString(item, key);
            if (String.IsNullOrWhiteSpace(name) || result.ContainsKey(name))
            {
                continue;
            }

            result[name] = item;
        }

        return result;
    }

    private static Dictionary<string, object> BuildCounts(Dictionary<string, object> diff)
    {
        Dictionary<string, object> counts = new Dictionary<string, object>();
        counts["changedSections"] = CountChangedSections(diff);
        counts["methodDiffs"] = CountList(diff, "MethodDiffs");
        counts["implementationDiffs"] = CountList(diff, "ImplementationDiffs");
        counts["referenceDiffs"] = CountList(diff, "ReferenceDiffs");
        counts["blockDiffs"] = CountList(diff, "BlockDiffs");
        counts["stateDiffs"] = CountList(diff, "StateDiffs");
        counts["transitionDiffs"] = CountList(diff, "TransitionDiffs");
        counts["linkedDiffs"] = CountList(diff, "LinkedDiffs");
        return counts;
    }

    private static List<Dictionary<string, object>> BuildSections(Dictionary<string, object> diff)
    {
        List<Dictionary<string, object>> sections = new List<Dictionary<string, object>>();
        AddSection(sections, diff, "methods", "MethodDiffs");
        AddSection(sections, diff, "implementation", "ImplementationDiffs");
        AddSection(sections, diff, "references", "ReferenceDiffs");
        AddSection(sections, diff, "blocks", "BlockDiffs");
        AddSection(sections, diff, "states", "StateDiffs");
        AddSection(sections, diff, "transitions", "TransitionDiffs");
        AddSection(sections, diff, "linked", "LinkedDiffs");
        return sections;
    }

    private static void AddSection(List<Dictionary<string, object>> sections, Dictionary<string, object> diff, string name, string diffKey)
    {
        int count = CountList(diff, diffKey);
        if (count == 0)
        {
            return;
        }

        Dictionary<string, object> section = new Dictionary<string, object>();
        section["name"] = name;
        section["count"] = count;
        section["items"] = AscetDatabaseExplorerCommon.GetList(diff, diffKey);
        sections.Add(section);
    }

    private static int CountChangedSections(Dictionary<string, object> diff)
    {
        int changed = 0;
        string[] keys = new string[] { "MethodDiffs", "ImplementationDiffs", "ReferenceDiffs", "BlockDiffs", "StateDiffs", "TransitionDiffs", "LinkedDiffs" };
        for (int i = 0; i < keys.Length; i++)
        {
            if (CountList(diff, keys[i]) > 0)
            {
                changed++;
            }
        }

        return changed;
    }

    private static int CountList(Dictionary<string, object> payload, string key)
    {
        return AscetDatabaseExplorerCommon.GetList(payload, key).Count;
    }

    private static string ResolveSummary(Dictionary<string, object> diff)
    {
        return AscetDatabaseExplorerCommon.FirstNonEmpty(
            AscetDatabaseExplorerCommon.GetString(diff, "Summary"),
            "No diff summary available.");
    }

    private static string ResolveDiffExe(AscetComponentKind kind)
    {
        switch (kind)
        {
            case AscetComponentKind.Class:
                return "AscetDiffClass.exe";
            case AscetComponentKind.Module:
                return "AscetDiffModule.exe";
            case AscetComponentKind.StateMachine:
                return "AscetDiffStateMachine.exe";
            default:
                throw new AscetReadException("unsupported_component_kind", "resolve_diff_exe", "Unsupported component kind for diff.");
        }
    }

    private static void ValidateKindMatch(AscetComponentKind leftKind, AscetComponentKind rightKind)
    {
        if (leftKind != rightKind)
        {
            throw new AscetReadException("invalid_argument", "diff_component_snapshot", "Left and right component kinds must match.");
        }
    }

    private static string FormatTextOutput(Dictionary<string, object> payload)
    {
        Dictionary<string, object> counts = payload["counts"] as Dictionary<string, object>;
        IList<object> sections = AscetDatabaseExplorerCommon.GetList(payload, "sections");
        StringBuilder builder = new StringBuilder();
        builder.Append("Kind: ").Append(AscetDatabaseExplorerCommon.GetString(payload, "kind")).AppendLine();
        builder.Append("Left: ").Append(AscetDatabaseExplorerCommon.GetString(payload, "leftPath")).AppendLine();
        builder.Append("Right: ").Append(AscetDatabaseExplorerCommon.GetString(payload, "rightPath")).AppendLine();
        builder.Append("ChangedSections: ").Append(AscetDatabaseExplorerCommon.GetCount(counts, "changedSections")).AppendLine();
        builder.Append("Sections: ").Append(sections.Count).AppendLine();
        builder.Append("Summary: ").Append(AscetDatabaseExplorerCommon.GetString(payload, "summary")).AppendLine();
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
