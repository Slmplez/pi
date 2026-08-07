using System;
using System.Collections.Generic;
using System.IO;
using System.Text;

public sealed class AscetReadComponentChildrenArguments
{
    public string ComponentPath { get; set; }
    public string Group { get; set; }
    public bool EmitJson { get; set; }
}

public static class AscetReadComponentChildren
{
    public static int Main(string[] args)
    {
        TextWriter originalOut = Console.Out;
        StringWriter suppressedOut = null;

        try
        {
            AscetReadComponentChildrenArguments arguments = ParseArguments(args);
            if (arguments.EmitJson)
            {
                suppressedOut = new StringWriter();
                Console.SetOut(suppressedOut);
            }

            Dictionary<string, object> payload = BuildPayload(arguments);
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

    public static AscetReadComponentChildrenArguments ParseArguments(string[] args)
    {
        if (args == null || args.Length < 1)
        {
            throw new AscetReadException("invalid_argument", "parse_arguments", "usage: AscetCli.exe exec read_component_children <component-path> [--group <all|methods|elements|components|arrays|parameters|variables|diagrams>] [--json]");
        }

        AscetReadComponentChildrenArguments result = new AscetReadComponentChildrenArguments();
        result.ComponentPath = AscetDatabaseExplorerCommon.NormalizePath(args[0], "component_path");
        result.Group = "all";
        result.EmitJson = false;

        for (int i = 1; i < args.Length; i++)
        {
            string argument = args[i];
            if (String.Equals(argument, "--json", StringComparison.OrdinalIgnoreCase))
            {
                result.EmitJson = true;
                continue;
            }

            if (String.Equals(argument, "--group", StringComparison.OrdinalIgnoreCase))
            {
                if (i + 1 >= args.Length)
                {
                    throw new AscetReadException("invalid_argument", "parse_arguments", "Missing value after --group.");
                }

                result.Group = NormalizeGroup(args[++i]);
                continue;
            }

            throw new AscetReadException("invalid_argument", "parse_arguments", "Unknown argument '" + argument + "'.");
        }

        return result;
    }

    private static string NormalizeGroup(string value)
    {
        string normalized = (value ?? String.Empty).Trim().ToLowerInvariant();
        switch (normalized)
        {
            case "all":
            case "methods":
            case "elements":
            case "components":
            case "arrays":
            case "parameters":
            case "variables":
            case "diagrams":
                return normalized;
            default:
                throw new AscetReadException("invalid_argument", "group", "Unsupported group '" + value + "'.");
        }
    }

    public static Dictionary<string, object> BuildPayload(AscetReadComponentChildrenArguments arguments)
    {
        if (arguments == null)
        {
            throw new AscetReadException("invalid_argument", "build_payload", "Arguments must not be null.");
        }

        if (String.Equals(arguments.Group, "diagrams", StringComparison.OrdinalIgnoreCase))
        {
            return BuildDiagramOnlyPayload(arguments, LoadDiagrams(arguments.ComponentPath));
        }

        return BuildPayload(arguments, LoadLightweightChildren(arguments));
    }

    public static Dictionary<string, object> BuildPayload(AscetReadComponentChildrenArguments arguments, Dictionary<string, object> snapshot)
    {
        return BuildChildrenPayload(arguments, snapshot);
    }

    public static Dictionary<string, object> BuildChildrenPayload(AscetReadComponentChildrenArguments arguments, Dictionary<string, object> snapshot)
    {
        Dictionary<string, object> payload = new Dictionary<string, object>();
        payload["componentPath"] = arguments.ComponentPath;
        payload["selectedGroup"] = arguments.Group;
        payload["availableGroups"] = new string[] { "all", "methods", "elements", "components", "arrays", "parameters", "variables", "diagrams" };

        List<Dictionary<string, object>> items = new List<Dictionary<string, object>>();
        IList<object> methods = AscetDatabaseExplorerCommon.GetList(snapshot, "Methods");
        for (int i = 0; i < methods.Count; i++)
        {
            Dictionary<string, object> method = methods[i] as Dictionary<string, object>;
            if (method == null)
            {
                continue;
            }

            if (arguments.Group != "all" && arguments.Group != "methods")
            {
                continue;
            }

            Dictionary<string, object> item = AscetDatabaseExplorerCommon.NewChildItem(
                "methods",
                AscetDatabaseExplorerCommon.GetString(method, "MethodName"),
                AscetDatabaseExplorerCommon.GetString(method, "MethodKind"));
            item["path"] = arguments.ComponentPath + "::" + AscetDatabaseExplorerCommon.GetString(method, "MethodName");
            item["displayName"] = AscetDatabaseExplorerCommon.GetString(method, "MethodName");
            item["parentPath"] = arguments.ComponentPath;
            item["ownerKind"] = "component";
            item["isImplementationElement"] = false;
            items.Add(item);
        }

        Dictionary<string, object> implementation = snapshot != null && snapshot.ContainsKey("Implementation")
            ? snapshot["Implementation"] as Dictionary<string, object>
            : null;
        object implementationElements = implementation != null && implementation.ContainsKey("Elements")
            ? implementation["Elements"]
            : null;
        IList<Dictionary<string, object>> elementItems = AscetDatabaseExplorerCommon.FlattenImplementationElements(implementationElements);
        for (int i = 0; i < elementItems.Count; i++)
        {
            Dictionary<string, object> element = elementItems[i];
            string group = AscetDatabaseExplorerCommon.GuessElementGroup(element);
            if (arguments.Group != "all" && arguments.Group != "elements" && arguments.Group != group)
            {
                continue;
            }

            string schemaGroup = arguments.Group == "elements" ? "elements" : group;
            Dictionary<string, object> item = AscetDatabaseExplorerCommon.NewChildItem(
                schemaGroup,
                AscetDatabaseExplorerCommon.GetString(element, "ElementName"),
                AscetDatabaseExplorerCommon.FirstNonEmpty(
                AscetDatabaseExplorerCommon.GetString(element, "DisplayKind"),
                AscetDatabaseExplorerCommon.GetString(element, "ElementKind")));
            item["path"] = arguments.ComponentPath + "::" + AscetDatabaseExplorerCommon.GetString(element, "ElementName");
            item["displayName"] = AscetDatabaseExplorerCommon.GetString(element, "ElementName");
            item["parentPath"] = arguments.ComponentPath;
            item["ownerKind"] = "component";
            item["displayType"] = AscetDatabaseExplorerCommon.GetString(element, "DisplayType");
            item["displayScope"] = AscetDatabaseExplorerCommon.GetString(element, "DisplayScope");
            item["referencedComponentPath"] = AscetDatabaseExplorerCommon.GetString(element, "ReferencedComponentPath");
            item["isImplementationElement"] = true;
            item["elementGroup"] = group;
            items.Add(item);
        }

        IList<object> diagrams = AscetDatabaseExplorerCommon.GetList(snapshot, "Diagrams");
        for (int i = 0; i < diagrams.Count; i++)
        {
            Dictionary<string, object> diagram = diagrams[i] as Dictionary<string, object>;
            if (diagram == null)
            {
                continue;
            }

            if (arguments.Group != "all" && arguments.Group != "diagrams")
            {
                continue;
            }

            string diagramName = AscetDatabaseExplorerCommon.FirstNonEmpty(
                AscetDatabaseExplorerCommon.GetString(diagram, "Name"),
                AscetDatabaseExplorerCommon.GetString(diagram, "name"));
            if (String.IsNullOrWhiteSpace(diagramName))
            {
                continue;
            }

            string diagramKind = AscetDatabaseExplorerCommon.FirstNonEmpty(
                AscetDatabaseExplorerCommon.GetString(diagram, "DiagramKind"),
                AscetDatabaseExplorerCommon.GetString(diagram, "kind"));
            Dictionary<string, object> item = AscetDatabaseExplorerCommon.NewChildItem(
                "diagrams",
                diagramName,
                diagramKind);
            item["path"] = arguments.ComponentPath + "::" + diagramName;
            item["displayName"] = diagramName;
            item["parentPath"] = arguments.ComponentPath;
            item["ownerKind"] = "component";
            item["isImplementationElement"] = false;
            item["supportsReadBlockDiagram"] = String.Equals(diagramKind, "BlockDiagram", StringComparison.OrdinalIgnoreCase);
            items.Add(item);
        }

        Dictionary<string, object> counts = new Dictionary<string, object>();
        counts["items"] = items.Count;
        counts["methods"] = CountGroup(items, "methods");
        counts["elements"] = CountImplementationElements(items);
        counts["components"] = CountGroup(items, "components");
        counts["arrays"] = CountGroup(items, "arrays");
        counts["parameters"] = CountGroup(items, "parameters");
        counts["variables"] = CountGroup(items, "variables");
        counts["diagrams"] = CountGroup(items, "diagrams");
        payload["counts"] = counts;
        payload["items"] = items;
        return payload;
    }

    public static Dictionary<string, object> BuildDiagramOnlyPayload(AscetReadComponentChildrenArguments arguments, Dictionary<string, object> diagramsPayload)
    {
        Dictionary<string, object> payload = new Dictionary<string, object>();
        string componentPath = AscetDatabaseExplorerCommon.FirstNonEmpty(
            AscetDatabaseExplorerCommon.GetString(diagramsPayload, "componentPath"),
            arguments == null ? String.Empty : arguments.ComponentPath);
        payload["componentPath"] = componentPath;
        payload["selectedGroup"] = "diagrams";
        payload["availableGroups"] = new string[] { "all", "methods", "elements", "components", "arrays", "parameters", "variables", "diagrams" };

        List<Dictionary<string, object>> items = new List<Dictionary<string, object>>();
        IList<object> diagrams = AscetDatabaseExplorerCommon.GetList(diagramsPayload, "items");
        for (int i = 0; i < diagrams.Count; i++)
        {
            Dictionary<string, object> diagram = diagrams[i] as Dictionary<string, object>;
            if (diagram == null)
            {
                continue;
            }

            string diagramName = AscetDatabaseExplorerCommon.GetString(diagram, "name");
            if (String.IsNullOrWhiteSpace(diagramName))
            {
                continue;
            }

            string diagramKind = AscetDatabaseExplorerCommon.GetString(diagram, "kind");
            Dictionary<string, object> item = AscetDatabaseExplorerCommon.NewChildItem("diagrams", diagramName, diagramKind);
            item["path"] = componentPath + "::" + diagramName;
            item["displayName"] = diagramName;
            item["parentPath"] = componentPath;
            item["ownerKind"] = "component";
            item["isImplementationElement"] = false;
            item["supportsReadBlockDiagram"] = GetBool(diagram, "supportsReadBlockDiagram");
            items.Add(item);
        }

        Dictionary<string, object> counts = new Dictionary<string, object>();
        counts["items"] = items.Count;
        counts["methods"] = 0;
        counts["elements"] = 0;
        counts["components"] = 0;
        counts["arrays"] = 0;
        counts["parameters"] = 0;
        counts["variables"] = 0;
        counts["diagrams"] = items.Count;
        payload["counts"] = counts;
        payload["items"] = items;
        return payload;
    }

    private static Dictionary<string, object> LoadLightweightChildren(AscetReadComponentChildrenArguments arguments)
    {
        Dictionary<string, object> payload = new Dictionary<string, object>();
        string group = arguments == null ? "all" : (arguments.Group ?? "all");
        string componentPath = arguments == null ? String.Empty : (arguments.ComponentPath ?? String.Empty);

        if (String.Equals(group, "all", StringComparison.Ordinal)
            || String.Equals(group, "methods", StringComparison.Ordinal))
        {
            payload["Methods"] = BuildMethodSnapshotItems(LoadMethods(componentPath));
        }

        if (String.Equals(group, "all", StringComparison.Ordinal)
            || String.Equals(group, "elements", StringComparison.Ordinal)
            || String.Equals(group, "components", StringComparison.Ordinal)
            || String.Equals(group, "arrays", StringComparison.Ordinal)
            || String.Equals(group, "parameters", StringComparison.Ordinal)
            || String.Equals(group, "variables", StringComparison.Ordinal))
        {
            Dictionary<string, object> implementation = new Dictionary<string, object>();
            implementation["Elements"] = AscetDatabaseExplorerCommon.GetList(LoadImplementation(componentPath), "Elements");
            payload["Implementation"] = implementation;
        }

        return payload;
    }

    private static Dictionary<string, object> LoadDiagrams(string componentPath)
    {
        return AscetDatabaseExplorerCommon.DeserializeChildJsonObject(
            AscetDatabaseExplorerCommon.RunSiblingCliExecOrExe(
                "list_diagrams",
                "AscetListDiagrams.exe",
                new List<string> { componentPath, "--json" }));
    }

    private static Dictionary<string, object> LoadMethods(string componentPath)
    {
        MethodReadRequest request = new MethodReadRequest();
        request.ComponentPath = componentPath ?? String.Empty;
        MethodReadResponse response = new MethodReadService().ReadCurrentDatabase(request);
        return response == null ? new Dictionary<string, object>() : (response.Payload ?? new Dictionary<string, object>());
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

    private static AscetItemRef ResolveComponent(string componentPath)
    {
        ComponentLocatorService locator = new ComponentLocatorService();
        AscetItemPath parsed = AscetItemPath.Parse(componentPath);
        AscetItemRef component = locator.FindItemInFolder(parsed.ItemName, parsed.FolderPath);
        if (component == null)
        {
            throw new AscetReadException("component_not_found", "read_component_children", "Component '" + componentPath + "' was not found.");
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

    private static IList<object> BuildMethodSnapshotItems(Dictionary<string, object> methodsPayload)
    {
        List<object> methods = new List<object>();
        IList<object> rawMethods = AscetDatabaseExplorerCommon.GetList(methodsPayload, "methods");
        for (int i = 0; i < rawMethods.Count; i++)
        {
            Dictionary<string, object> method = rawMethods[i] as Dictionary<string, object>;
            if (method == null)
            {
                continue;
            }

            Dictionary<string, object> item = new Dictionary<string, object>();
            item["MethodName"] = AscetDatabaseExplorerCommon.GetString(method, "name");
            item["MethodKind"] = AscetDatabaseExplorerCommon.GetString(method, "methodKind");
            methods.Add(item);
        }

        return methods;
    }

    private static string FormatTextOutput(Dictionary<string, object> payload)
    {
        StringBuilder builder = new StringBuilder();
        builder.Append("Component: ").Append(AscetDatabaseExplorerCommon.GetString(payload, "componentPath")).AppendLine();
        builder.Append("Group: ").Append(AscetDatabaseExplorerCommon.GetString(payload, "selectedGroup")).AppendLine();

        IList<object> items = AscetDatabaseExplorerCommon.GetList(payload, "items");
        builder.Append("Count: ").Append(items.Count).AppendLine();
        for (int i = 0; i < items.Count; i++)
        {
            Dictionary<string, object> item = items[i] as Dictionary<string, object>;
            if (item == null)
            {
                continue;
            }

            builder.Append("- ")
                .Append(AscetDatabaseExplorerCommon.GetString(item, "group"))
                .Append(": ")
                .Append(AscetDatabaseExplorerCommon.GetString(item, "name"))
                .Append(" [")
                .Append(AscetDatabaseExplorerCommon.GetString(item, "kind"))
                .Append("]")
                .AppendLine();
        }

        return builder.ToString();
    }

    private static int CountGroup(IList<Dictionary<string, object>> items, string expectedGroup)
    {
        if (items == null || String.IsNullOrWhiteSpace(expectedGroup))
        {
            return 0;
        }

        int count = 0;
        for (int i = 0; i < items.Count; i++)
        {
            Dictionary<string, object> item = items[i];
            if (item == null)
            {
                continue;
            }

            if (String.Equals(AscetDatabaseExplorerCommon.GetString(item, "group"), expectedGroup, StringComparison.Ordinal))
            {
                count++;
            }
        }

        return count;
    }

    private static int CountImplementationElements(IList<Dictionary<string, object>> items)
    {
        if (items == null)
        {
            return 0;
        }

        int count = 0;
        for (int i = 0; i < items.Count; i++)
        {
            Dictionary<string, object> item = items[i];
            if (item == null || !item.ContainsKey("isImplementationElement") || item["isImplementationElement"] == null)
            {
                continue;
            }

            bool isImplementationElement = false;
            if (item["isImplementationElement"] is bool)
            {
                isImplementationElement = (bool)item["isImplementationElement"];
            }
            else
            {
                Boolean.TryParse(item["isImplementationElement"].ToString(), out isImplementationElement);
            }

            if (isImplementationElement)
            {
                count++;
            }
        }

        return count;
    }

    private static bool GetBool(IDictionary<string, object> payload, string key)
    {
        if (payload == null || String.IsNullOrWhiteSpace(key) || !payload.ContainsKey(key) || payload[key] == null)
        {
            return false;
        }

        bool value;
        return Boolean.TryParse(Convert.ToString(payload[key]), out value) && value;
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
