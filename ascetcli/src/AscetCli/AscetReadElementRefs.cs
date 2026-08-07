using System;
using System.Collections.Generic;
using System.IO;
using System.Text;

public sealed class AscetReadElementRefsArguments
{
    public string ComponentPath { get; set; }
    public string ElementName { get; set; }
    public bool EmitJson { get; set; }
}

public static class AscetReadElementRefs
{
    public static int Main(string[] args)
    {
        TextWriter originalOut = Console.Out;
        StringWriter suppressedOut = null;

        try
        {
            AscetReadElementRefsArguments arguments = ParseArguments(args);
            if (arguments.EmitJson)
            {
                suppressedOut = new StringWriter();
                Console.SetOut(suppressedOut);
            }

            Dictionary<string, object> implementation = LoadImplementation(arguments.ComponentPath);
            Dictionary<string, object> element = FindElement(implementation, arguments);
            Dictionary<string, object> refs = element == null
                ? new Dictionary<string, object>()
                : LoadReferences(arguments.ComponentPath);

            Dictionary<string, object> payload = BuildPayload(arguments, refs, implementation);
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

    public static AscetReadElementRefsArguments ParseArguments(string[] args)
    {
        if (args == null || args.Length < 2)
        {
            throw new AscetReadException("invalid_argument", "parse_arguments", "usage: AscetCli.exe exec read_element_refs <component-path> <element-name> [--json]");
        }

        AscetReadElementRefsArguments result = new AscetReadElementRefsArguments
        {
            ComponentPath = NormalizeComponentPath(args[0]),
            ElementName = NormalizeElementName(args[1]),
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

            throw new AscetReadException("invalid_argument", "parse_arguments", "Unknown argument '" + argument + "'.");
        }

        return result;
    }

    public static string NormalizeElementName(string elementName)
    {
        if (String.IsNullOrWhiteSpace(elementName))
        {
            throw new AscetReadException("invalid_argument", "normalize_element_name", "Element name must not be empty.");
        }

        return elementName.Trim();
    }

    public static string NormalizeComponentPath(string componentPath)
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

    private static Dictionary<string, object> BuildPayload(AscetReadElementRefsArguments arguments, Dictionary<string, object> refs, Dictionary<string, object> implementation)
    {
        Dictionary<string, object> payload = new Dictionary<string, object>();
        payload["componentPath"] = arguments.ComponentPath;
        payload["elementName"] = arguments.ElementName;

        Dictionary<string, object> element = FindElement(implementation, arguments);
        payload["element"] = element ?? BuildMissingElement(arguments.ElementName);

        List<Dictionary<string, object>> outgoingRefs = new List<Dictionary<string, object>>();
        IList<object> rawRefs = AscetDatabaseExplorerCommon.GetList(refs, "References");
        for (int i = 0; i < rawRefs.Count; i++)
        {
            Dictionary<string, object> reference = rawRefs[i] as Dictionary<string, object>;
            if (reference == null)
            {
                continue;
            }

            if (!String.Equals(AscetDatabaseExplorerCommon.GetString(reference, "SourceElementName"), arguments.ElementName, StringComparison.Ordinal))
            {
                continue;
            }

            Dictionary<string, object> edge = new Dictionary<string, object>();
            edge["sourceName"] = AscetDatabaseExplorerCommon.GetString(reference, "SourceElementName");
            edge["sourceKind"] = AscetDatabaseExplorerCommon.GetString(reference, "SourceElementKind");
            edge["sourceScope"] = AscetDatabaseExplorerCommon.GetString(reference, "SourceDisplayScope");
            edge["sourceDisplayKind"] = AscetDatabaseExplorerCommon.GetString(reference, "SourceDisplayKind");
            edge["resolved"] = AscetDatabaseExplorerCommon.GetString(reference, "IsResolved");
            edge["targetName"] = AscetDatabaseExplorerCommon.GetString(reference, "TargetComponentName");
            edge["targetPath"] = AscetDatabaseExplorerCommon.GetString(reference, "TargetComponentPath");
            edge["targetKind"] = AscetDatabaseExplorerCommon.GetString(reference, "TargetComponentKind");
            edge["targetLanguageKind"] = AscetDatabaseExplorerCommon.GetString(reference, "TargetLanguageKind");
            outgoingRefs.Add(edge);
        }

        Dictionary<string, object> counts = new Dictionary<string, object>();
        counts["outgoingRefs"] = outgoingRefs.Count;
        counts["resolvedRefs"] = CountResolved(outgoingRefs);
        payload["counts"] = counts;
        payload["outgoingRefs"] = outgoingRefs;
        payload["summary"] = BuildSummary(arguments.ElementName, element != null, outgoingRefs.Count);
        return payload;
    }

    private static Dictionary<string, object> LoadImplementation(string componentPath)
    {
        AscetItemRef component = ResolveComponent(componentPath);
        AscetImplementationSnapshot snapshot = new ImplementationReadService().ReadImplementation(
            component,
            AscetImplementationReadMode.Default,
            String.Empty);
        return ToStringObjectDictionary(AscetReadImplementation.BuildSerializableSnapshot(snapshot));
    }

    private static Dictionary<string, object> LoadReferences(string componentPath)
    {
        AscetItemRef component = ResolveComponent(componentPath);
        AscetReferenceGraphSummary summary = new ReferenceReadService().GetReferenceGraph(component);
        return ToStringObjectDictionary(AscetReadReferences.BuildSerializableSummary(summary));
    }

    private static AscetItemRef ResolveComponent(string componentPath)
    {
        ComponentLocatorService locator = new ComponentLocatorService();
        AscetItemPath parsed = AscetItemPath.Parse(componentPath);
        AscetItemRef component = locator.FindItemInFolder(parsed.ItemName, parsed.FolderPath);
        if (component == null)
        {
            throw new AscetReadException("component_not_found", "read_element_refs", "Component '" + componentPath + "' was not found.");
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

    private static Dictionary<string, object> FindElement(Dictionary<string, object> implementation, AscetReadElementRefsArguments arguments)
    {
        IList<Dictionary<string, object>> elements = AscetDatabaseExplorerCommon.FlattenImplementationElements(
            implementation == null ? null : implementation["Elements"]);

        for (int i = 0; i < elements.Count; i++)
        {
            Dictionary<string, object> element = elements[i];
            if (element == null)
            {
                continue;
            }

            if (!String.Equals(AscetDatabaseExplorerCommon.GetString(element, "ElementName"), arguments.ElementName, StringComparison.Ordinal))
            {
                continue;
            }

            Dictionary<string, object> payload = new Dictionary<string, object>();
            payload["name"] = arguments.ElementName;
            payload["group"] = AscetDatabaseExplorerCommon.GuessElementGroup(element);
            payload["kind"] = AscetDatabaseExplorerCommon.FirstNonEmpty(
                AscetDatabaseExplorerCommon.GetString(element, "DisplayKind"),
                AscetDatabaseExplorerCommon.GetString(element, "ElementKind"));
            payload["displayType"] = AscetDatabaseExplorerCommon.GetString(element, "DisplayType");
            payload["displayScope"] = AscetDatabaseExplorerCommon.GetString(element, "DisplayScope");
            payload["referencedComponentPath"] = AscetDatabaseExplorerCommon.GetString(element, "ReferencedComponentPath");
            payload["path"] = arguments.ComponentPath + "::" + arguments.ElementName;
            return payload;
        }

        return null;
    }

    private static Dictionary<string, object> BuildMissingElement(string elementName)
    {
        Dictionary<string, object> payload = new Dictionary<string, object>();
        payload["name"] = elementName;
        payload["exists"] = false;
        payload["group"] = "unknown";
        payload["kind"] = "unknown";
        payload["displayType"] = String.Empty;
        payload["displayScope"] = String.Empty;
        payload["referencedComponentPath"] = String.Empty;
        payload["path"] = String.Empty;
        return payload;
    }

    private static int CountResolved(IList<Dictionary<string, object>> refs)
    {
        if (refs == null)
        {
            return 0;
        }

        int count = 0;
        for (int i = 0; i < refs.Count; i++)
        {
            Dictionary<string, object> edge = refs[i];
            if (edge != null && String.Equals(AscetDatabaseExplorerCommon.GetString(edge, "resolved"), Boolean.TrueString, StringComparison.OrdinalIgnoreCase))
            {
                count++;
            }
        }

        return count;
    }

    private static string BuildSummary(string elementName, bool exists, int outgoingRefCount)
    {
        if (!exists)
        {
            return "Element '" + elementName + "' was not found in the component implementation view.";
        }

        return "Element '" + elementName + "' has " + outgoingRefCount.ToString() + " outgoing reference" + (outgoingRefCount == 1 ? String.Empty : "s") + ".";
    }

    private static string FormatTextOutput(Dictionary<string, object> payload)
    {
        Dictionary<string, object> element = payload["element"] as Dictionary<string, object>;
        Dictionary<string, object> counts = payload["counts"] as Dictionary<string, object>;
        StringBuilder builder = new StringBuilder();
        builder.Append("Component: ").Append(AscetDatabaseExplorerCommon.GetString(payload, "componentPath")).AppendLine();
        builder.Append("Element: ").Append(AscetDatabaseExplorerCommon.GetString(payload, "elementName")).AppendLine();
        builder.Append("Group: ").Append(AscetDatabaseExplorerCommon.GetString(element, "group")).AppendLine();
        builder.Append("Kind: ").Append(AscetDatabaseExplorerCommon.GetString(element, "kind")).AppendLine();
        builder.Append("OutgoingRefs: ").Append(AscetDatabaseExplorerCommon.GetCount(counts, "outgoingRefs")).AppendLine();
        builder.Append("ResolvedRefs: ").Append(AscetDatabaseExplorerCommon.GetCount(counts, "resolvedRefs")).AppendLine();
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
