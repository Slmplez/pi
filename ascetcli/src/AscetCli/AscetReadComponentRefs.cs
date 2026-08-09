using System;
using System.Collections.Generic;
using System.IO;
using System.Text;

public sealed class AscetReadComponentRefsArguments
{
    public string ComponentPath { get; set; }
    public string Direction { get; set; }
    public int Depth { get; set; }
    public bool EmitJson { get; set; }
}

public static class AscetReadComponentRefs
{
    public static int Main(string[] args)
    {
        TextWriter originalOut = Console.Out;
        StringWriter suppressedOut = null;

        try
        {
            AscetReadComponentRefsArguments arguments = ParseArguments(args);
            if (arguments.EmitJson)
            {
                suppressedOut = new StringWriter();
                Console.SetOut(suppressedOut);
            }

            Dictionary<string, object> refs = LoadReferences(arguments.ComponentPath);
            string incomingScopePath = GetContainingFolderPath(arguments.ComponentPath);
            Dictionary<string, object> incomingRefs = ShouldIncludeIncoming(arguments)
                ? ReadIncomingRefs(arguments.ComponentPath, incomingScopePath)
                : null;

            Dictionary<string, object> payload = BuildPayload(arguments, refs, incomingRefs, incomingScopePath);

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

    public static AscetReadComponentRefsArguments ParseArguments(string[] args)
    {
        if (args == null || args.Length < 1)
        {
            throw new AscetReadException("invalid_argument", "parse_arguments", "usage: AscetBridge.exe exec read_component_refs <component-path> [--direction <out|both>] [--depth <n>] [--json]");
        }

        AscetReadComponentRefsArguments result = new AscetReadComponentRefsArguments();
        result.ComponentPath = AscetDatabaseExplorerCommon.NormalizePath(args[0], "component_path");
        result.Direction = "out";
        result.Depth = 1;
        result.EmitJson = false;

        for (int i = 1; i < args.Length; i++)
        {
            string argument = args[i];
            if (String.Equals(argument, "--json", StringComparison.OrdinalIgnoreCase))
            {
                result.EmitJson = true;
                continue;
            }

            if (String.Equals(argument, "--direction", StringComparison.OrdinalIgnoreCase))
            {
                if (i + 1 >= args.Length)
                {
                    throw new AscetReadException("invalid_argument", "parse_arguments", "Missing value after --direction.");
                }

                result.Direction = NormalizeDirection(args[++i]);
                continue;
            }

            if (String.Equals(argument, "--depth", StringComparison.OrdinalIgnoreCase))
            {
                if (i + 1 >= args.Length)
                {
                    throw new AscetReadException("invalid_argument", "parse_arguments", "Missing value after --depth.");
                }

                result.Depth = AscetDatabaseExplorerCommon.ParsePositiveInt(args[++i], "depth", 1);
                continue;
            }

            throw new AscetReadException("invalid_argument", "parse_arguments", "Unknown argument '" + argument + "'.");
        }

        return result;
    }

    private static Dictionary<string, object> BuildPayload(
        AscetReadComponentRefsArguments arguments,
        Dictionary<string, object> refs,
        Dictionary<string, object> incomingRefs,
        string incomingScopePath)
    {
        List<Dictionary<string, object>> outgoingEdges = BuildEdges(refs);
        List<Dictionary<string, object>> incomingEdges = BuildIncomingEdges(arguments, incomingRefs);
        List<Dictionary<string, object>> edges = new List<Dictionary<string, object>>();

        AddEdges(edges, outgoingEdges);
        if (ShouldIncludeIncoming(arguments))
        {
            AddEdges(edges, incomingEdges);
        }

        Dictionary<string, object> payload = new Dictionary<string, object>();
        payload["componentPath"] = arguments.ComponentPath;
        payload["direction"] = arguments.Direction;
        payload["depth"] = arguments.Depth;
        payload["incomingScopePath"] = incomingScopePath ?? String.Empty;
        payload["edges"] = edges;
        payload["outgoingEdges"] = outgoingEdges;
        payload["incomingEdges"] = incomingEdges;
        payload["trace"] = new List<Dictionary<string, object>>();
        payload["counts"] = BuildCounts(payload, refs, incomingRefs);
        payload["summary"] = BuildSummary(arguments, refs, incomingEdges, incomingScopePath);
        return payload;
    }

    private static string NormalizeDirection(string value)
    {
        string normalized = (value ?? String.Empty).Trim().ToLowerInvariant();
        switch (normalized)
        {
            case "out":
            case "both":
                return normalized;
            case "in":
                throw new AscetReadException("unsupported_direction", "direction", "Incoming-only references are not supported by the current ASCET read domain.");
            default:
                throw new AscetReadException("invalid_argument", "direction", "Unsupported direction '" + value + "'. Expected out or both.");
        }
    }

    private static List<Dictionary<string, object>> BuildEdges(Dictionary<string, object> refs)
    {
        List<Dictionary<string, object>> edges = new List<Dictionary<string, object>>();
        IList<object> rawReferences = AscetDatabaseExplorerCommon.GetList(refs, "References");
        for (int i = 0; i < rawReferences.Count; i++)
        {
            Dictionary<string, object> reference = rawReferences[i] as Dictionary<string, object>;
            if (reference == null)
            {
                continue;
            }

            Dictionary<string, object> edge = new Dictionary<string, object>();
            edge["direction"] = "out";
            edge["sourceName"] = AscetDatabaseExplorerCommon.GetString(reference, "SourceElementName");
            edge["sourceKind"] = AscetDatabaseExplorerCommon.GetString(reference, "SourceElementKind");
            edge["sourceScope"] = AscetDatabaseExplorerCommon.GetString(reference, "SourceDisplayScope");
            edge["sourceDisplayKind"] = AscetDatabaseExplorerCommon.GetString(reference, "SourceDisplayKind");
            edge["resolved"] = AscetDatabaseExplorerCommon.GetString(reference, "IsResolved");
            edge["targetName"] = AscetDatabaseExplorerCommon.GetString(reference, "TargetComponentName");
            edge["targetPath"] = AscetDatabaseExplorerCommon.GetString(reference, "TargetComponentPath");
            edge["targetKind"] = AscetDatabaseExplorerCommon.GetString(reference, "TargetComponentKind");
            edge["targetLanguageKind"] = AscetDatabaseExplorerCommon.GetString(reference, "TargetLanguageKind");
            edges.Add(edge);
        }

        return edges;
    }

    private static List<Dictionary<string, object>> BuildIncomingEdges(
        AscetReadComponentRefsArguments arguments,
        Dictionary<string, object> incomingRefs)
    {
        List<Dictionary<string, object>> edges = new List<Dictionary<string, object>>();
        if (!ShouldIncludeIncoming(arguments))
        {
            return edges;
        }

        string targetPath = arguments == null ? String.Empty : arguments.ComponentPath;
        string targetName = GetComponentName(targetPath);
        string targetKind = String.Empty;
        string targetLanguageKind = String.Empty;

        IList<object> rawIncomingEdges = AscetDatabaseExplorerCommon.GetList(incomingRefs, "incomingEdges");
        for (int i = 0; i < rawIncomingEdges.Count; i++)
        {
            Dictionary<string, object> reference = rawIncomingEdges[i] as Dictionary<string, object>;
            if (reference == null)
            {
                continue;
            }

            Dictionary<string, object> edge = new Dictionary<string, object>();
            edge["direction"] = "in";
            edge["sourceComponentPath"] = AscetDatabaseExplorerCommon.GetString(reference, "sourceComponentPath");
            edge["sourceComponentKind"] = AscetDatabaseExplorerCommon.GetString(reference, "sourceComponentKind");
            edge["sourceLanguageKind"] = AscetDatabaseExplorerCommon.GetString(reference, "sourceLanguageKind");
            edge["sourceName"] = AscetDatabaseExplorerCommon.GetString(reference, "sourceElementName");
            edge["sourceKind"] = AscetDatabaseExplorerCommon.GetString(reference, "sourceElementKind");
            edge["sourceScope"] = AscetDatabaseExplorerCommon.GetString(reference, "sourceDisplayScope");
            edge["sourceDisplayKind"] = AscetDatabaseExplorerCommon.GetString(reference, "sourceDisplayKind");
            edge["resolved"] = Boolean.TrueString;
            edge["targetName"] = targetName;
            edge["targetPath"] = targetPath;
            edge["targetKind"] = targetKind;
            edge["targetLanguageKind"] = targetLanguageKind;
            edges.Add(edge);
        }

        return edges;
    }

    private static Dictionary<string, object> BuildCounts(
        Dictionary<string, object> payload,
        Dictionary<string, object> refs,
        Dictionary<string, object> incomingRefs)
    {
        Dictionary<string, object> counts = new Dictionary<string, object>();
        counts["edges"] = AscetDatabaseExplorerCommon.GetList(payload, "edges").Count;
        counts["outgoingEdges"] = AscetDatabaseExplorerCommon.GetList(payload, "outgoingEdges").Count;
        counts["incomingEdges"] = AscetDatabaseExplorerCommon.GetList(payload, "incomingEdges").Count;
        counts["targets"] = AscetDatabaseExplorerCommon.GetList(refs, "TargetComponents").Count;
        counts["sourceComponents"] = AscetDatabaseExplorerCommon.GetList(incomingRefs, "sourceComponents").Count;
        counts["traceRoots"] = AscetDatabaseExplorerCommon.GetList(payload, "trace").Count;
        return counts;
    }

    private static string FormatTextOutput(Dictionary<string, object> payload)
    {
        Dictionary<string, object> counts = payload["counts"] as Dictionary<string, object>;
        StringBuilder builder = new StringBuilder();
        builder.Append("Component: ").Append(AscetDatabaseExplorerCommon.GetString(payload, "componentPath")).AppendLine();
        builder.Append("Direction: ").Append(AscetDatabaseExplorerCommon.GetString(payload, "direction")).AppendLine();
        builder.Append("Depth: ").Append(AscetDatabaseExplorerCommon.GetString(payload, "depth")).AppendLine();
        builder.Append("Edges: ").Append(AscetDatabaseExplorerCommon.GetCount(counts, "edges")).AppendLine();
        builder.Append("OutgoingEdges: ").Append(AscetDatabaseExplorerCommon.GetCount(counts, "outgoingEdges")).AppendLine();
        if (String.Equals(AscetDatabaseExplorerCommon.GetString(payload, "direction"), "both", StringComparison.Ordinal))
        {
            builder.Append("IncomingEdges: ").Append(AscetDatabaseExplorerCommon.GetCount(counts, "incomingEdges")).AppendLine();
            builder.Append("IncomingScope: ").Append(AscetDatabaseExplorerCommon.GetString(payload, "incomingScopePath")).AppendLine();
            builder.Append("SourceComponents: ").Append(AscetDatabaseExplorerCommon.GetCount(counts, "sourceComponents")).AppendLine();
        }
        builder.Append("Targets: ").Append(AscetDatabaseExplorerCommon.GetCount(counts, "targets")).AppendLine();
        builder.Append("TraceRoots: ").Append(AscetDatabaseExplorerCommon.GetCount(counts, "traceRoots")).AppendLine();
        builder.Append("Summary: ").Append(AscetDatabaseExplorerCommon.GetString(payload, "summary")).AppendLine();
        return builder.ToString();
    }

    private static bool ShouldIncludeIncoming(AscetReadComponentRefsArguments arguments)
    {
        return arguments != null
            && String.Equals(arguments.Direction, "both", StringComparison.OrdinalIgnoreCase);
    }

    private static Dictionary<string, object> ReadIncomingRefs(string componentPath, string scopePath)
    {
        if (String.IsNullOrWhiteSpace(scopePath))
        {
            return new Dictionary<string, object>();
        }

        return InProcessLegacyOperationAdapter.InvokeJsonObject(
            "read_component_used_by",
            AscetReadComponentUsedBy.Main,
            new string[] { componentPath, "--scope", scopePath, "--json" });
    }

    private static Dictionary<string, object> LoadReferences(string componentPath)
    {
        AscetItemRef component = ResolveComponent(componentPath);
        AscetImplementationSnapshot snapshot = new ImplementationReadService().ReadImplementation(
            component,
            AscetImplementationReadMode.Default,
            String.Empty);

        Dictionary<string, object> payload = new Dictionary<string, object>();
        payload["ComponentPath"] = component.Path ?? String.Empty;
        payload["ComponentKind"] = component.Kind.ToString();
        payload["LanguageKind"] = component.LanguageKind.ToString();
        payload["References"] = BuildReferencesFromImplementation(snapshot);
        payload["TargetComponents"] = new List<Dictionary<string, object>>();
        payload["Summary"] = "Outgoing component references were derived from implementation element bindings.";
        return payload;
    }

    private static IList<Dictionary<string, object>> BuildReferencesFromImplementation(AscetImplementationSnapshot snapshot)
    {
        List<Dictionary<string, object>> references = new List<Dictionary<string, object>>();
        AddImplementationReferences(references, snapshot == null ? null : snapshot.Elements);
        return references;
    }

    private static void AddImplementationReferences(
        IList<Dictionary<string, object>> references,
        IList<AscetElementImplementationRef> elements)
    {
        if (references == null || elements == null)
        {
            return;
        }

        for (int i = 0; i < elements.Count; i++)
        {
            AscetElementImplementationRef element = elements[i];
            if (element == null)
            {
                continue;
            }

            if (!String.IsNullOrWhiteSpace(element.ReferencedComponentPath))
            {
                Dictionary<string, object> reference = new Dictionary<string, object>();
                reference["SourceElementName"] = element.ElementName ?? String.Empty;
                reference["SourceElementKind"] = element.ElementKind ?? String.Empty;
                reference["SourceDisplayScope"] = element.DisplayScope ?? String.Empty;
                reference["SourceDisplayKind"] = element.DisplayKind ?? String.Empty;
                reference["IsResolved"] = true;
                reference["TargetComponentName"] = GetComponentName(element.ReferencedComponentPath);
                reference["TargetComponentPath"] = element.ReferencedComponentPath ?? String.Empty;
                reference["TargetComponentKind"] = AscetComponentKind.Unknown.ToString();
                reference["TargetLanguageKind"] = AscetLanguageKind.Unknown.ToString();
                references.Add(reference);
            }

            AddImplementationReferences(references, element.ChildElements);
        }
    }

    private static AscetItemRef ResolveComponent(string componentPath)
    {
        ComponentLocatorService locator = new ComponentLocatorService();
        AscetItemPath parsed = AscetItemPath.Parse(componentPath);
        AscetItemRef component = locator.FindItemInFolder(parsed.ItemName, parsed.FolderPath);
        if (component == null)
        {
            throw new AscetReadException("component_not_found", "read_component_refs", "Component '" + componentPath + "' was not found.");
        }

        return component;
    }

    private static Dictionary<string, object> ToStringObjectDictionary(IDictionary<string, object> source)
    {
        Dictionary<string, object> result = new Dictionary<string, object>();
        if (source == null)
        {
            return result;
        }

        foreach (KeyValuePair<string, object> pair in source)
        {
            result[pair.Key] = pair.Value;
        }

        return result;
    }

    private static string GetContainingFolderPath(string componentPath)
    {
        string normalized = AscetDatabaseExplorerCommon.NormalizePath(componentPath, "component_path");
        int separatorIndex = normalized.LastIndexOf('\\');
        if (separatorIndex <= 0)
        {
            return String.Empty;
        }

        return normalized.Substring(0, separatorIndex);
    }

    private static string GetComponentName(string componentPath)
    {
        if (String.IsNullOrWhiteSpace(componentPath))
        {
            return String.Empty;
        }

        int separatorIndex = componentPath.LastIndexOf('\\');
        if (separatorIndex < 0 || separatorIndex == componentPath.Length - 1)
        {
            return componentPath;
        }

        return componentPath.Substring(separatorIndex + 1);
    }

    private static void AddEdges(ICollection<Dictionary<string, object>> target, IList<Dictionary<string, object>> source)
    {
        if (target == null || source == null)
        {
            return;
        }

        for (int i = 0; i < source.Count; i++)
        {
            if (source[i] != null)
            {
                target.Add(source[i]);
            }
        }
    }

    private static string BuildSummary(
        AscetReadComponentRefsArguments arguments,
        Dictionary<string, object> refs,
        IList<Dictionary<string, object>> incomingEdges,
        string incomingScopePath)
    {
        string summary = AscetDatabaseExplorerCommon.FirstNonEmpty(
            AscetDatabaseExplorerCommon.GetString(refs, "Summary"),
            "Reference summary unavailable.");
        if (!ShouldIncludeIncoming(arguments))
        {
            return summary;
        }

        if (String.IsNullOrWhiteSpace(incomingScopePath))
        {
            return summary + " Incoming reference lookup could not infer a containing folder scope.";
        }

        return summary
            + " Incoming references within scope '"
            + incomingScopePath
            + "': "
            + (incomingEdges == null ? 0 : incomingEdges.Count).ToString()
            + ".";
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
