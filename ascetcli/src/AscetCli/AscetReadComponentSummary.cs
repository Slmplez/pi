using System;
using System.Collections.Generic;
using System.IO;
using System.Text;

public static class AscetReadComponentSummary
{
    public static int Main(string[] args)
    {
        TextWriter originalOut = Console.Out;
        StringWriter suppressedOut = null;

        try
        {
            string componentPath = ParseComponentPath(args);
            bool emitJson = HasJsonFlag(args, 1);
            if (emitJson)
            {
                suppressedOut = new StringWriter();
                Console.SetOut(suppressedOut);
            }

            Dictionary<string, object> payload = BuildSummaryPayload(componentPath);
            string output = emitJson ? AscetDatabaseExplorerCommon.Serialize(payload) : FormatTextOutput(payload);

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

    private static string ParseComponentPath(string[] args)
    {
        if (args == null || args.Length < 1)
        {
            throw new AscetReadException("invalid_argument", "parse_arguments", "usage: AscetBridge.exe exec read_component_summary <component-path> [--json]");
        }

        return AscetDatabaseExplorerCommon.NormalizePath(args[0], "component_path");
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

    private static Dictionary<string, object> BuildSummaryPayload(string componentPath)
    {
        Dictionary<string, object> identity = ResolveComponentIdentity(componentPath);
        string rawKind = AscetDatabaseExplorerCommon.GetString(identity, "kind");
        string normalizedKind = NormalizeKind(rawKind);

        if (String.Equals(normalizedKind, "project", StringComparison.OrdinalIgnoreCase))
        {
            return BuildProjectSummaryPayload(componentPath, identity);
        }

        if (UsesSnapshotSummary(normalizedKind))
        {
            Dictionary<string, object> snapshot = InProcessLegacyOperationAdapter.InvokeJsonObject(
                "read_component_snapshot",
                AscetReadComponentSnapshot.Main,
                new string[] { componentPath, "--json" });
            return BuildSnapshotSummaryPayload(snapshot, identity);
        }

        return BuildLightSummaryPayload(componentPath, identity);
    }

    private static Dictionary<string, object> BuildSnapshotSummaryPayload(
        Dictionary<string, object> snapshot,
        Dictionary<string, object> identity)
    {
        Dictionary<string, object> component = snapshot["Component"] as Dictionary<string, object>;
        Dictionary<string, object> implementation = snapshot["Implementation"] as Dictionary<string, object>;
        Dictionary<string, object> references = snapshot["References"] as Dictionary<string, object>;

        Dictionary<string, object> payload = new Dictionary<string, object>();
        payload["componentPath"] = FirstNonEmpty(
            AscetDatabaseExplorerCommon.GetString(component, "Path"),
            AscetDatabaseExplorerCommon.GetString(identity, "componentPath"));
        payload["kind"] = FirstNonEmpty(
            NormalizeKind(AscetDatabaseExplorerCommon.GetString(component, "Kind")),
            NormalizeKind(AscetDatabaseExplorerCommon.GetString(identity, "kind")));
        payload["languageKind"] = FirstNonEmpty(
            AscetDatabaseExplorerCommon.GetString(component, "LanguageKind"),
            AscetDatabaseExplorerCommon.GetString(identity, "languageKind"));
        payload["counts"] = BuildCounts(snapshot, implementation, references);
        payload["implementation"] = BuildImplementationSummary(implementation);
        payload["displayName"] = AscetDatabaseExplorerCommon.GetString(identity, "displayName");
        payload["parentPath"] = AscetDatabaseExplorerCommon.GetString(identity, "parentPath");
        payload["ownerKind"] = AscetDatabaseExplorerCommon.GetString(identity, "ownerKind");
        payload["summary"] = AscetDatabaseExplorerCommon.GetString(snapshot, "Summary");
        return payload;
    }

    private static Dictionary<string, object> BuildProjectSummaryPayload(
        string componentPath,
        Dictionary<string, object> identity)
    {
        AscetProjectFormulaCatalog catalog = new ProjectFormulaReadService().ReadCatalog(componentPath);
        IList<AscetProjectFormulaRef> formulas = catalog == null || catalog.Formulas == null
            ? new List<AscetProjectFormulaRef>()
            : catalog.Formulas;
        List<string> formulaNames = new List<string>();

        for (int i = 0; i < formulas.Count; i++)
        {
            AscetProjectFormulaRef formula = formulas[i];
            if (formula != null && !String.IsNullOrWhiteSpace(formula.Name))
            {
                formulaNames.Add(formula.Name);
            }
        }

        Dictionary<string, object> counts = NewBaseCounts();
        counts["formulas"] = formulas.Count;

        Dictionary<string, object> details = new Dictionary<string, object>();
        details["formulaNames"] = formulaNames;

        Dictionary<string, object> payload = new Dictionary<string, object>();
        payload["componentPath"] = componentPath;
        payload["kind"] = "project";
        payload["languageKind"] = FirstNonEmpty(
            AscetDatabaseExplorerCommon.GetString(identity, "languageKind"),
            "Unknown");
        payload["counts"] = counts;
        payload["implementation"] = BuildEmptyImplementationSummary();
        payload["details"] = details;
        payload["displayName"] = AscetDatabaseExplorerCommon.GetString(identity, "displayName");
        payload["parentPath"] = AscetDatabaseExplorerCommon.GetString(identity, "parentPath");
        payload["ownerKind"] = AscetDatabaseExplorerCommon.GetString(identity, "ownerKind");
        payload["summary"] = "Project " + GetItemName(componentPath) + " has " + formulas.Count + " project formula" + (formulas.Count == 1 ? String.Empty : "s");
        return payload;
    }

    private static Dictionary<string, object> BuildLightSummaryPayload(
        string componentPath,
        Dictionary<string, object> identity)
    {
        string kind = FirstNonEmpty(NormalizeKind(AscetDatabaseExplorerCommon.GetString(identity, "kind")), "unknown");
        string languageKind = FirstNonEmpty(AscetDatabaseExplorerCommon.GetString(identity, "languageKind"), "Unknown");

        Dictionary<string, object> counts = NewBaseCounts();
        Dictionary<string, object> details = new Dictionary<string, object>();
        details["surface"] = languageKind;

        Dictionary<string, object> payload = new Dictionary<string, object>();
        payload["componentPath"] = componentPath;
        payload["kind"] = kind;
        payload["languageKind"] = languageKind;
        payload["counts"] = counts;
        payload["implementation"] = BuildEmptyImplementationSummary();
        payload["details"] = details;
        payload["displayName"] = AscetDatabaseExplorerCommon.GetString(identity, "displayName");
        payload["parentPath"] = AscetDatabaseExplorerCommon.GetString(identity, "parentPath");
        payload["ownerKind"] = AscetDatabaseExplorerCommon.GetString(identity, "ownerKind");
        payload["summary"] = BuildLightSummaryText(kind, componentPath, languageKind);
        return payload;
    }

    private static string FormatTextOutput(Dictionary<string, object> payload)
    {
        StringBuilder builder = new StringBuilder();
        Dictionary<string, object> counts = payload["counts"] as Dictionary<string, object>;
        Dictionary<string, object> implementation = payload["implementation"] as Dictionary<string, object>;
        builder.Append("Component: ").Append(AscetDatabaseExplorerCommon.GetString(payload, "componentPath")).AppendLine();
        builder.Append("Kind: ").Append(AscetDatabaseExplorerCommon.GetString(payload, "kind")).AppendLine();
        builder.Append("Language: ").Append(AscetDatabaseExplorerCommon.GetString(payload, "languageKind")).AppendLine();
        builder.Append("Diagrams: ").Append(AscetDatabaseExplorerCommon.GetCount(counts, "diagrams")).AppendLine();
        builder.Append("Methods: ").Append(AscetDatabaseExplorerCommon.GetCount(counts, "methods")).AppendLine();
        builder.Append("ImplementationElements: ").Append(AscetDatabaseExplorerCommon.GetCount(counts, "implementationElements")).AppendLine();
        builder.Append("References: ").Append(AscetDatabaseExplorerCommon.GetCount(counts, "references")).AppendLine();
        if (counts != null && counts.ContainsKey("formulas"))
        {
            builder.Append("Formulas: ").Append(AscetDatabaseExplorerCommon.GetCount(counts, "formulas")).AppendLine();
        }
        builder.Append("ImplementationName: ").Append(AscetDatabaseExplorerCommon.GetString(implementation, "resolvedName")).AppendLine();
        builder.Append("Summary: ").Append(AscetDatabaseExplorerCommon.GetString(payload, "summary")).AppendLine();
        return builder.ToString();
    }

    private static Dictionary<string, object> BuildCounts(
        Dictionary<string, object> snapshot,
        Dictionary<string, object> implementation,
        Dictionary<string, object> references)
    {
        Dictionary<string, object> counts = new Dictionary<string, object>();
        counts["diagrams"] = AscetDatabaseExplorerCommon.GetList(snapshot, "Diagrams").Count;
        counts["methods"] = AscetDatabaseExplorerCommon.GetList(snapshot, "Methods").Count;
        counts["implementationElements"] = AscetDatabaseExplorerCommon.FlattenImplementationElements(
            implementation == null ? null : implementation["Elements"]).Count;
        counts["references"] = AscetDatabaseExplorerCommon.GetList(references, "References").Count;
        return counts;
    }

    private static Dictionary<string, object> BuildImplementationSummary(Dictionary<string, object> implementation)
    {
        Dictionary<string, object> payload = new Dictionary<string, object>();
        payload["resolvedName"] = AscetDatabaseExplorerCommon.GetString(implementation, "ResolvedImplementationName");
        payload["memoryLocation"] = AscetDatabaseExplorerCommon.GetString(implementation, "MemoryLocation");
        return payload;
    }

    private static Dictionary<string, object> BuildEmptyImplementationSummary()
    {
        Dictionary<string, object> payload = new Dictionary<string, object>();
        payload["resolvedName"] = String.Empty;
        payload["memoryLocation"] = String.Empty;
        return payload;
    }

    private static Dictionary<string, object> ResolveComponentIdentity(string componentPath)
    {
        AscetToolApiBootstrap.ConfigureAssemblyResolution();

        ComponentLocatorService locator = new ComponentLocatorService();
        AscetItemPath itemPath = AscetItemPath.Parse(componentPath);
        AscetItemRef item = locator.FindItemInFolder(itemPath.ItemName, itemPath.FolderPath);
        if (item == null)
        {
            throw new AscetReadException(
                "component_not_found",
                "resolve_component_identity",
                "Component path '" + componentPath + "' could not be resolved exactly.");
        }

        return BuildIdentityPayload(item, componentPath);
    }

    private static Dictionary<string, object> BuildIdentityPayload(AscetItemRef item, string componentPath)
    {
        string resolvedPath = AscetDatabaseExplorerCommon.FirstNonEmpty(item == null ? String.Empty : item.Path, componentPath);
        string parentPath = GetParentPath(resolvedPath);
        Dictionary<string, object> payload = new Dictionary<string, object>();
        payload["componentPath"] = resolvedPath;
        payload["kind"] = item == null ? "unknown" : AscetDatabaseExplorerCommon.KindToSchema(item.Kind);
        payload["languageKind"] = item == null ? AscetLanguageKind.Unknown.ToString() : item.LanguageKind.ToString();
        payload["displayName"] = item == null ? GetItemName(componentPath) : AscetDatabaseExplorerCommon.FirstNonEmpty(item.Name, GetItemName(resolvedPath));
        payload["parentPath"] = parentPath;
        payload["ownerKind"] = String.IsNullOrWhiteSpace(parentPath) ? "unknown" : "folder";
        return payload;
    }

    private static string GetParentPath(string path)
    {
        if (String.IsNullOrWhiteSpace(path))
        {
            return String.Empty;
        }

        int index = path.LastIndexOf('\\');
        if (index <= 0)
        {
            return String.Empty;
        }

        return path.Substring(0, index);
    }

    private static Dictionary<string, object> NewBaseCounts()
    {
        Dictionary<string, object> counts = new Dictionary<string, object>();
        counts["diagrams"] = 0;
        counts["methods"] = 0;
        counts["implementationElements"] = 0;
        counts["references"] = 0;
        return counts;
    }

    private static bool UsesSnapshotSummary(string normalizedKind)
    {
        return String.Equals(normalizedKind, "class", StringComparison.OrdinalIgnoreCase)
            || String.Equals(normalizedKind, "module", StringComparison.OrdinalIgnoreCase)
            || String.Equals(normalizedKind, "stateMachine", StringComparison.OrdinalIgnoreCase);
    }

    private static string BuildLightSummaryText(string normalizedKind, string componentPath, string languageKind)
    {
        string displayKind = String.IsNullOrWhiteSpace(normalizedKind) || String.Equals(normalizedKind, "unknown", StringComparison.OrdinalIgnoreCase)
            ? "Component"
            : ToDisplayKind(normalizedKind);
        string name = GetItemName(componentPath);
        if (!String.IsNullOrWhiteSpace(languageKind) && !String.Equals(languageKind, "Unknown", StringComparison.OrdinalIgnoreCase))
        {
            return displayKind + " " + name + " is available with " + languageKind + " surface";
        }

        return displayKind + " " + name + " is available";
    }

    private static string ToDisplayKind(string normalizedKind)
    {
        switch (normalizedKind)
        {
            case "continuousTimeBlock":
                return "Continuous Time Block";
            case "stateMachine":
                return "StateMachine";
            default:
                return Char.ToUpperInvariant(normalizedKind[0]) + normalizedKind.Substring(1);
        }
    }

    private static string GetItemName(string componentPath)
    {
        AscetItemPath parsed = AscetItemPath.Parse(componentPath);
        return parsed.ItemName ?? componentPath;
    }

    private static string FirstNonEmpty(params string[] values)
    {
        if (values == null)
        {
            return String.Empty;
        }

        for (int i = 0; i < values.Length; i++)
        {
            if (!String.IsNullOrWhiteSpace(values[i]))
            {
                return values[i];
            }
        }

        return String.Empty;
    }

    private static string NormalizeKind(string rawKind)
    {
        if (String.IsNullOrWhiteSpace(rawKind))
        {
            return "unknown";
        }

        string normalized = rawKind.Trim();
        try
        {
            AscetComponentKind kind = (AscetComponentKind)Enum.Parse(typeof(AscetComponentKind), normalized, true);
            return AscetDatabaseExplorerCommon.KindToSchema(kind);
        }
        catch
        {
            if (String.Equals(normalized, "stateMachine", StringComparison.OrdinalIgnoreCase))
            {
                return "stateMachine";
            }

            return normalized;
        }
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
