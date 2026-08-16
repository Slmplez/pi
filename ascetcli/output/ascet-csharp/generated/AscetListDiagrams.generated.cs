using System;
using System.Collections.Generic;
using System.IO;
using System.Text;

public static class AscetListDiagrams
{
    public static int Main(string[] args)
    {
        TextWriter originalOut = Console.Out;
        StringWriter suppressedOut = null;

        try
        {
            ListDiagramsArguments parsed = ParseArguments(args);
            if (parsed.EmitJson)
            {
                suppressedOut = new StringWriter();
                Console.SetOut(suppressedOut);
            }

            Dictionary<string, object> payload = BuildPayload(parsed.ComponentPath, parsed.DiagramKind);
            string output = parsed.EmitJson ? AscetDatabaseExplorerCommon.Serialize(payload) : FormatTextOutput(payload);

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

    private static ListDiagramsArguments ParseArguments(string[] args)
    {
        if (args == null || args.Length < 1)
        {
            throw new AscetReadException("invalid_argument", "parse_arguments", "usage: AscetListDiagrams.exe <component-path> [--diagram-kind <all|block|block_diagram|state|state_machine|sequence|unknown>] [--json]");
        }

        ListDiagramsArguments parsed = new ListDiagramsArguments();
        parsed.ComponentPath = AscetDatabaseExplorerCommon.NormalizePath(args[0], "component_path");
        parsed.DiagramKind = String.Empty;
        for (int i = 1; i < args.Length; i++)
        {
            if (String.Equals(args[i], "--json", StringComparison.OrdinalIgnoreCase))
            {
                parsed.EmitJson = true;
                continue;
            }

            if (String.Equals(args[i], "--diagram-kind", StringComparison.OrdinalIgnoreCase))
            {
                if (i + 1 >= args.Length)
                {
                    throw new AscetReadException("invalid_argument", "parse_arguments", "--diagram-kind expects a value.");
                }

                parsed.DiagramKind = NormalizeDiagramKindFilter(args[++i]);
                continue;
            }

            throw new AscetReadException("invalid_argument", "parse_arguments", "Unknown argument '" + args[i] + "'.");
        }

        return parsed;
    }

    private static bool HasJsonFlag(string[] args, int startIndex)
    {
        if (args == null)
        {
            return false;
        }

        for (int i = startIndex; i < args.Length; i++)
        {
            if (String.Equals(args[i], "--json", StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }

            throw new AscetReadException("invalid_argument", "parse_arguments", "Unknown argument '" + args[i] + "'.");
        }

        return false;
    }

    private static string NormalizeDiagramKindFilter(string value)
    {
        string normalized = (value ?? String.Empty).Trim().ToLowerInvariant().Replace("-", "_");
        switch (normalized)
        {
            case "":
            case "all":
                return String.Empty;
            case "block":
            case "block_diagram":
            case "state":
            case "state_machine":
            case "sequence":
            case "unknown":
                return normalized;
            default:
                throw new AscetReadException("invalid_argument", "parse_arguments", "Unsupported diagramKind '" + value + "'.");
        }
    }

    private static Dictionary<string, object> BuildPayload(string componentPath)
    {
        return BuildPayload(componentPath, String.Empty);
    }

    private static Dictionary<string, object> BuildPayload(string componentPath, string diagramKindFilter)
    {
        AscetToolApiBootstrap.ConfigureAssemblyResolution();

        ComponentLocatorService locator = new ComponentLocatorService();
        DiagramCatalogService diagrams = new DiagramCatalogService();
        AscetItemPath parsed = AscetItemPath.Parse(componentPath);
        AscetItemRef component = locator.FindItemInFolder(parsed.ItemName, parsed.FolderPath);
        if (component == null)
        {
            if (FolderExists(locator, componentPath))
            {
                throw new AscetReadException("target_is_folder", "list_diagrams", "Target path '" + componentPath + "' resolves to a folder, not a code component.");
            }

            throw new AscetReadException("component_not_found", "list_diagrams", "Component '" + componentPath + "' was not found.");
        }

        IList<AscetDiagramRef> diagramRefs = diagrams.ListDiagrams(component) ?? new List<AscetDiagramRef>();
        string defaultDiagramName = ChooseDefaultDiagramName(diagramRefs);
        List<Dictionary<string, object>> items = BuildItems(diagramRefs, defaultDiagramName, diagramKindFilter);

        Dictionary<string, object> payload = new Dictionary<string, object>();
        payload["componentPath"] = component.Path ?? componentPath;
        payload["componentKind"] = AscetDatabaseExplorerCommon.KindToSchema(component.Kind);
        if (!String.IsNullOrWhiteSpace(defaultDiagramName))
        {
            payload["defaultDiagramName"] = defaultDiagramName;
        }

        payload["items"] = items;
        Dictionary<string, object> filters = new Dictionary<string, object>();
        filters["diagramKind"] = String.IsNullOrWhiteSpace(diagramKindFilter) ? "all" : diagramKindFilter;
        payload["filters"] = filters;
        return payload;
    }

    private static List<Dictionary<string, object>> BuildItems(IList<AscetDiagramRef> diagramRefs, string defaultDiagramName)
    {
        return BuildItems(diagramRefs, defaultDiagramName, String.Empty);
    }

    private static List<Dictionary<string, object>> BuildItems(IList<AscetDiagramRef> diagramRefs, string defaultDiagramName, string diagramKindFilter)
    {
        List<Dictionary<string, object>> items = new List<Dictionary<string, object>>();
        if (diagramRefs == null)
        {
            return items;
        }

        for (int i = 0; i < diagramRefs.Count; i++)
        {
            AscetDiagramRef diagram = diagramRefs[i];
            string name = diagram == null ? String.Empty : (diagram.Name ?? String.Empty);
            AscetDiagramKind diagramKind = diagram == null ? AscetDiagramKind.Unknown : diagram.DiagramKind;
            if (!DiagramMatchesFilter(diagramKind, diagramKindFilter))
            {
                continue;
            }

            Dictionary<string, object> entry = new Dictionary<string, object>();
            entry["name"] = name;
            entry["kind"] = diagramKind.ToString();
            entry["visibility"] = "unknown";
            entry["isDefault"] = !String.IsNullOrWhiteSpace(defaultDiagramName) && String.Equals(name, defaultDiagramName, StringComparison.Ordinal);
            entry["supportsReadBlockDiagram"] = diagramKind == AscetDiagramKind.BlockDiagram;
            items.Add(entry);
        }

        return items;
    }

    private static bool DiagramMatchesFilter(AscetDiagramKind diagramKind, string diagramKindFilter)
    {
        if (String.IsNullOrWhiteSpace(diagramKindFilter))
        {
            return true;
        }

        string actual = diagramKind.ToString();
        if (String.Equals(diagramKindFilter, "block", StringComparison.OrdinalIgnoreCase) ||
            String.Equals(diagramKindFilter, "block_diagram", StringComparison.OrdinalIgnoreCase))
        {
            return String.Equals(actual, "BlockDiagram", StringComparison.OrdinalIgnoreCase);
        }

        if (String.Equals(diagramKindFilter, "state", StringComparison.OrdinalIgnoreCase) ||
            String.Equals(diagramKindFilter, "state_machine", StringComparison.OrdinalIgnoreCase))
        {
            return actual.IndexOf("State", StringComparison.OrdinalIgnoreCase) >= 0;
        }

        if (String.Equals(diagramKindFilter, "sequence", StringComparison.OrdinalIgnoreCase))
        {
            return actual.IndexOf("Sequence", StringComparison.OrdinalIgnoreCase) >= 0;
        }

        return String.Equals(actual, diagramKindFilter, StringComparison.OrdinalIgnoreCase);
    }

    private sealed class ListDiagramsArguments
    {
        public string ComponentPath { get; set; }
        public string DiagramKind { get; set; }
        public bool EmitJson { get; set; }
    }

    private static string ChooseDefaultDiagramName(IList<AscetDiagramRef> diagramRefs)
    {
        if (diagramRefs == null || diagramRefs.Count == 0)
        {
            return String.Empty;
        }

        for (int i = 0; i < diagramRefs.Count; i++)
        {
            AscetDiagramRef diagram = diagramRefs[i];
            if (diagram != null && diagram.DiagramKind == AscetDiagramKind.BlockDiagram && !String.IsNullOrWhiteSpace(diagram.Name))
            {
                return diagram.Name;
            }
        }

        for (int i = 0; i < diagramRefs.Count; i++)
        {
            AscetDiagramRef diagram = diagramRefs[i];
            if (diagram != null && !String.IsNullOrWhiteSpace(diagram.Name))
            {
                return diagram.Name;
            }
        }

        return String.Empty;
    }

    private static bool FolderExists(ComponentLocatorService locator, string folderPath)
    {
        try
        {
            if (locator == null || String.IsNullOrWhiteSpace(folderPath))
            {
                return false;
            }

            locator.ListItemsInFolder(folderPath, false);
            return true;
        }
        catch (AscetReadException ex)
        {
            return !String.Equals(ex.Code, "folder_not_found", StringComparison.Ordinal);
        }
        catch
        {
            return false;
        }
    }

    private static string FormatTextOutput(Dictionary<string, object> payload)
    {
        StringBuilder builder = new StringBuilder();
        builder.Append("Component: ").Append(AscetDatabaseExplorerCommon.GetString(payload, "componentPath")).AppendLine();
        builder.Append("DefaultDiagram: ").Append(AscetDatabaseExplorerCommon.GetString(payload, "defaultDiagramName")).AppendLine();

        IList<object> items = AscetDatabaseExplorerCommon.GetList(payload, "items");
        builder.Append("Diagrams: ").Append(items.Count).AppendLine();
        for (int i = 0; i < items.Count; i++)
        {
            Dictionary<string, object> item = items[i] as Dictionary<string, object>;
            builder.Append("  - ").Append(AscetDatabaseExplorerCommon.GetString(item, "kind")).Append(": ").Append(AscetDatabaseExplorerCommon.GetString(item, "name"));
            if (GetBool(item, "isDefault"))
            {
                builder.Append(" [default]");
            }

            if (GetBool(item, "supportsReadBlockDiagram"))
            {
                builder.Append(" [readable]");
            }

            builder.AppendLine();
        }

        return builder.ToString();
    }

    private static bool GetBool(IDictionary<string, object> payload, string key)
    {
        if (payload == null || String.IsNullOrWhiteSpace(key) || !payload.ContainsKey(key) || payload[key] == null)
        {
            return false;
        }

        object value = payload[key];
        if (value is bool)
        {
            return (bool)value;
        }

        bool parsed;
        if (Boolean.TryParse(value.ToString(), out parsed))
        {
            return parsed;
        }

        return false;
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
