using System;
using System.Collections;
using System.Collections.Generic;
using System.Reflection;
using de.etas.cebra.toolAPI.Ascet;
using de.etas.cebra.toolAPI.Common;

public sealed class SummaryReadRequest
{
    public SummaryReadRequest()
    {
        ComponentPath = String.Empty;
    }

    public string ComponentPath { get; set; }
}

public sealed class SummaryReadResponse
{
    public SummaryReadResponse()
    {
        Payload = new Dictionary<string, object>(StringComparer.Ordinal);
        Component = null;
        DatabaseRef = null;
    }

    public Dictionary<string, object> Payload { get; set; }
    public AscetItemRef Component { get; set; }
    public AscetDatabaseRef DatabaseRef { get; set; }
}

public sealed class SummaryReadService
{
    private readonly ComponentClassifier _classifier;
    private readonly MethodReadService _methodReadService;

    public SummaryReadService()
        : this(new ComponentClassifier(), new MethodReadService())
    {
    }

    internal SummaryReadService(ComponentClassifier classifier, MethodReadService methodReadService)
    {
        _classifier = classifier ?? new ComponentClassifier();
        _methodReadService = methodReadService ?? new MethodReadService();
    }

    public SummaryReadRequest ParseExecArguments(string[] args)
    {
        if (args == null || args.Length < 1)
        {
            throw new AscetReadException("invalid_argument", "parse_arguments", GetUsage());
        }

        SummaryReadRequest request = new SummaryReadRequest();
        request.ComponentPath = MethodReadService.NormalizeComponentPath(args[0]);

        for (int i = 1; i < args.Length; i++)
        {
            string argument = args[i] ?? String.Empty;
            if (String.Equals(argument, "--json", StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            throw new AscetReadException("invalid_argument", "parse_arguments", "Unknown argument '" + argument + "'.");
        }

        return request;
    }

    public SummaryReadRequest ParsePayload(IDictionary<string, object> payload)
    {
        if (payload == null)
        {
            throw new AscetReadException("invalid_argument", "parse_payload", "Field 'componentPath' is required.");
        }

        SummaryReadRequest request = new SummaryReadRequest();
        request.ComponentPath = MethodReadService.NormalizeComponentPath(GetString(payload, "componentPath"));
        return request;
    }

    public SummaryReadResponse ReadCurrentDatabase(SummaryReadRequest request)
    {
        AscetSession session = null;

        try
        {
            session = new AscetSessionFactory().OpenCurrentDatabaseSession() as AscetSession;
            if (session == null)
            {
                throw new AscetReadException("tool_connect_failed", "read_component_summary", "Failed to open ASCET session.");
            }

            AscetDataBase database = session.GetCurrentDatabaseHandle();
            if (database == null)
            {
                throw new AscetReadException("database_not_open", "read_component_summary", "GetCurrentDataBase returned null. Open a database in ASCET first.");
            }

            AscetDatabaseRef databaseRef = new AscetDatabaseRef();
            databaseRef.Name = database.GetName();

            Ascet tool = session.GetToolHandle();
            if (tool != null)
            {
                databaseRef.Path = tool.GetDataBasePath();
            }

            return ReadBoundDatabase(request, database, databaseRef);
        }
        finally
        {
            if (session != null)
            {
                session.Dispose();
            }
        }
    }

    public SummaryReadResponse ReadBoundDatabase(SummaryReadRequest request, AscetDataBase databaseHandle, AscetDatabaseRef databaseRef)
    {
        if (databaseHandle == null)
        {
            throw new AscetReadException("database_not_open", "read_component_summary", "No ASCET database is open.");
        }

        SummaryReadRequest normalizedRequest = request ?? new SummaryReadRequest();
        string componentPath = MethodReadService.NormalizeComponentPath(normalizedRequest.ComponentPath);
        DataBaseItem item = ResolveItem(databaseHandle, componentPath);
        AscetItemRef component = _classifier.ToItemRef(item);
        if (component == null)
        {
            throw new AscetReadException("component_not_found", "resolve_component_summary", "Component '" + componentPath + "' was not found.");
        }

        Dictionary<string, object> payload = BuildPayload(component, item, databaseHandle);

        SummaryReadResponse response = new SummaryReadResponse();
        response.Component = component;
        response.DatabaseRef = CloneDatabaseRef(databaseRef);
        response.Payload = payload;
        return response;
    }

    public string FormatTextOutput(Dictionary<string, object> payload)
    {
        Dictionary<string, object> counts = payload == null ? null : payload["counts"] as Dictionary<string, object>;
        Dictionary<string, object> implementation = payload == null ? null : payload["implementation"] as Dictionary<string, object>;

        System.Text.StringBuilder builder = new System.Text.StringBuilder();
        builder.Append("Component: ").Append(GetString(payload, "componentPath")).AppendLine();
        builder.Append("Kind: ").Append(GetString(payload, "kind")).AppendLine();
        builder.Append("Language: ").Append(GetString(payload, "languageKind")).AppendLine();
        builder.Append("Diagrams: ").Append(AscetDatabaseExplorerCommon.GetCount(counts, "diagrams")).AppendLine();
        builder.Append("Methods: ").Append(AscetDatabaseExplorerCommon.GetCount(counts, "methods")).AppendLine();
        builder.Append("ImplementationElements: ").Append(AscetDatabaseExplorerCommon.GetCount(counts, "implementationElements")).AppendLine();
        builder.Append("References: ").Append(AscetDatabaseExplorerCommon.GetCount(counts, "references")).AppendLine();
        if (counts != null && counts.ContainsKey("formulas"))
        {
            builder.Append("Formulas: ").Append(AscetDatabaseExplorerCommon.GetCount(counts, "formulas")).AppendLine();
        }
        builder.Append("ImplementationName: ").Append(GetString(implementation, "resolvedName")).AppendLine();
        builder.Append("Summary: ").Append(GetString(payload, "summary")).AppendLine();
        return builder.ToString();
    }

    private Dictionary<string, object> BuildPayload(AscetItemRef component, DataBaseItem item, AscetDataBase database)
    {
        string normalizedKind = component == null ? "unknown" : AscetDatabaseExplorerCommon.KindToSchema(component.Kind);
        if (String.Equals(normalizedKind, "project", StringComparison.Ordinal))
        {
            return BuildProjectSummaryPayload(component, item);
        }

        if (UsesSnapshotSummary(normalizedKind))
        {
            return BuildSnapshotSummaryPayload(component, item, database);
        }

        return BuildLightSummaryPayload(component);
    }

    private Dictionary<string, object> BuildSnapshotSummaryPayload(AscetItemRef component, DataBaseItem item, AscetDataBase database)
    {
        int diagramCount = CountDiagrams(item);
        int methodCount = CountMethods(component, database);
        SummaryImplementationInfo implementation = TryReadImplementation(item);
        int referenceCount = CountReferences(item);

        Dictionary<string, object> counts = NewBaseCounts();
        counts["diagrams"] = diagramCount;
        counts["methods"] = methodCount;
        counts["implementationElements"] = implementation == null ? 0 : implementation.ElementCount;
        counts["references"] = referenceCount;

        Dictionary<string, object> payload = new Dictionary<string, object>();
        payload["componentPath"] = component == null ? String.Empty : (component.Path ?? String.Empty);
        payload["kind"] = component == null ? "unknown" : AscetDatabaseExplorerCommon.KindToSchema(component.Kind);
        payload["languageKind"] = component == null ? AscetLanguageKind.Unknown.ToString() : component.LanguageKind.ToString();
        payload["counts"] = counts;
        payload["implementation"] = BuildImplementationSummary(implementation);
        payload["displayName"] = component == null ? String.Empty : (component.Name ?? String.Empty);
        payload["parentPath"] = GetParentPath(component == null ? String.Empty : component.Path);
        payload["ownerKind"] = GetOwnerKind(component == null ? String.Empty : component.Path);
        payload["summary"] = BuildSnapshotSummaryText(component, diagramCount, referenceCount);
        return payload;
    }

    private Dictionary<string, object> BuildProjectSummaryPayload(AscetItemRef component, DataBaseItem item)
    {
        AscetProject project = item as AscetProject;
        Formula[] formulas = project == null ? null : project.GetAllFormulas();
        List<string> formulaNames = new List<string>();
        if (formulas != null)
        {
            for (int i = 0; i < formulas.Length; i++)
            {
                Formula formula = formulas[i];
                string name = formula == null ? String.Empty : (formula.GetName() ?? String.Empty);
                if (!String.IsNullOrWhiteSpace(name))
                {
                    formulaNames.Add(name);
                }
            }
        }

        formulaNames.Sort(StringComparer.Ordinal);

        Dictionary<string, object> counts = NewBaseCounts();
        counts["formulas"] = formulaNames.Count;

        Dictionary<string, object> details = new Dictionary<string, object>();
        details["formulaNames"] = formulaNames;

        Dictionary<string, object> payload = new Dictionary<string, object>();
        payload["componentPath"] = component == null ? String.Empty : (component.Path ?? String.Empty);
        payload["kind"] = "project";
        payload["languageKind"] = component == null ? AscetLanguageKind.Unknown.ToString() : component.LanguageKind.ToString();
        payload["counts"] = counts;
        payload["implementation"] = BuildImplementationSummary(null);
        payload["details"] = details;
        payload["displayName"] = component == null ? String.Empty : (component.Name ?? String.Empty);
        payload["parentPath"] = GetParentPath(component == null ? String.Empty : component.Path);
        payload["ownerKind"] = GetOwnerKind(component == null ? String.Empty : component.Path);
        payload["summary"] = "Project " + GetDisplayName(component) + " has " + formulaNames.Count.ToString() + " project formula" + (formulaNames.Count == 1 ? String.Empty : "s");
        return payload;
    }

    private Dictionary<string, object> BuildLightSummaryPayload(AscetItemRef component)
    {
        string kind = component == null ? "unknown" : AscetDatabaseExplorerCommon.KindToSchema(component.Kind);
        string languageKind = component == null ? AscetLanguageKind.Unknown.ToString() : component.LanguageKind.ToString();

        Dictionary<string, object> details = new Dictionary<string, object>();
        details["surface"] = languageKind;

        Dictionary<string, object> payload = new Dictionary<string, object>();
        payload["componentPath"] = component == null ? String.Empty : (component.Path ?? String.Empty);
        payload["kind"] = kind;
        payload["languageKind"] = languageKind;
        payload["counts"] = NewBaseCounts();
        payload["implementation"] = BuildImplementationSummary(null);
        payload["details"] = details;
        payload["displayName"] = component == null ? String.Empty : (component.Name ?? String.Empty);
        payload["parentPath"] = GetParentPath(component == null ? String.Empty : component.Path);
        payload["ownerKind"] = GetOwnerKind(component == null ? String.Empty : component.Path);
        payload["summary"] = BuildLightSummaryText(kind, component == null ? String.Empty : component.Path, languageKind);
        return payload;
    }

    private DataBaseItem ResolveItem(AscetDataBase database, string componentPath)
    {
        AscetItemPath parsed = AscetItemPath.Parse(componentPath);
        DataBaseItem item = database.GetItemInFolder(parsed.ItemName, parsed.FolderPath ?? String.Empty);
        if (item == null)
        {
            throw new AscetReadException(
                "component_not_found",
                "resolve_component_summary",
                "Item '" + parsed.ItemName + "' was not found in folder '" + (parsed.FolderPath ?? String.Empty) + "'.");
        }

        return item;
    }

    private int CountDiagrams(DataBaseItem item)
    {
        CodeComponent codeComponent = item as CodeComponent;
        if (codeComponent == null)
        {
            return 0;
        }

        AscetDiagram[] diagrams = codeComponent.GetAllDiagrams();
        if (diagrams == null)
        {
            return 0;
        }

        int count = 0;
        for (int i = 0; i < diagrams.Length; i++)
        {
            if (diagrams[i] != null)
            {
                count++;
            }
        }

        return count;
    }

    private int CountMethods(AscetItemRef component, AscetDataBase database)
    {
        if (component == null || database == null)
        {
            return 0;
        }

        MethodReadRequest request = new MethodReadRequest();
        request.ComponentPath = component.Path ?? String.Empty;
        MethodReadResponse response = _methodReadService.ReadBoundDatabase(request, database, null);
        return response == null || response.Methods == null ? 0 : response.Methods.Count;
    }

    private int CountReferences(DataBaseItem item)
    {
        CodeComponent codeComponent = item as CodeComponent;
        if (codeComponent == null)
        {
            return 0;
        }

        Array referencedElements = codeComponent.GetAllReferencedModelElements() as Array;
        if (referencedElements == null)
        {
            return 0;
        }

        int count = 0;
        for (int i = 0; i < referencedElements.Length; i++)
        {
            if (referencedElements.GetValue(i) != null)
            {
                count++;
            }
        }

        return count;
    }

    private SummaryImplementationInfo TryReadImplementation(DataBaseItem item)
    {
        object implementationHost = ResolveImplementationHost(item);
        if (implementationHost == null)
        {
            return null;
        }

        ImplConfiguration implementation = TryGetImplementation(implementationHost, "GetDefaultImplementation");
        if (implementation == null)
        {
            return null;
        }

        Array modelElements = ResolveModelElements(implementationHost);
        return new SummaryImplementationInfo
        {
            ResolvedName = SafeGetString(implementation, "GetName"),
            MemoryLocation = SafeGetString(implementation, "GetMemoryLocation"),
            ElementCount = CountImplementationElements(implementation, modelElements, new HashSet<string>(StringComparer.Ordinal))
        };
    }

    private object ResolveImplementationHost(DataBaseItem item)
    {
        if (item == null)
        {
            return null;
        }

        if (HasImplementationCapability(item))
        {
            return item;
        }

        CodeComponent codeComponent = item as CodeComponent;
        if (codeComponent != null && HasImplementationCapability(codeComponent))
        {
            return codeComponent;
        }

        return null;
    }

    private bool HasImplementationCapability(object target)
    {
        if (target == null)
        {
            return false;
        }

        if (TryGetImplementation(target, "GetDefaultImplementation") != null)
        {
            return true;
        }

        if (TryGetImplementation(target, "GetClassImplementation") != null)
        {
            return true;
        }

        ImplConfiguration[] implementations = TryGetImplementations(target);
        return implementations != null && implementations.Length > 0;
    }

    private ImplConfiguration TryGetImplementation(object target, string methodName)
    {
        object value = InvokeOptional(target, methodName);
        return value as ImplConfiguration;
    }

    private ImplConfiguration[] TryGetImplementations(object target)
    {
        object value = InvokeOptional(target, "GetAllImplementations");
        if (value == null)
        {
            return null;
        }

        ImplConfiguration[] typed = value as ImplConfiguration[];
        if (typed != null)
        {
            return typed;
        }

        Array array = value as Array;
        if (array == null)
        {
            return null;
        }

        List<ImplConfiguration> result = new List<ImplConfiguration>();
        for (int i = 0; i < array.Length; i++)
        {
            ImplConfiguration entry = array.GetValue(i) as ImplConfiguration;
            if (entry != null)
            {
                result.Add(entry);
            }
        }

        return result.ToArray();
    }

    private Array ResolveModelElements(object implementationHost)
    {
        return InvokeOptional(implementationHost, "GetAllModelElements") as Array;
    }

    private int CountImplementationElements(ImplConfiguration implementation, Array modelElements, ISet<string> recursionGuard)
    {
        if (implementation == null || modelElements == null)
        {
            return 0;
        }

        int count = 0;
        for (int i = 0; i < modelElements.Length; i++)
        {
            object modelElement = modelElements.GetValue(i);
            if (modelElement == null)
            {
                continue;
            }

            count++;

            ComplexModelElement complexElement = modelElement as ComplexModelElement;
            if (complexElement == null)
            {
                continue;
            }

            ImplConfiguration childImplementation = implementation.Get(complexElement);
            object representedComponent = InvokeOptional(complexElement, "GetRepresentedClass");
            if (childImplementation == null || representedComponent == null)
            {
                continue;
            }

            Array childModelElements = InvokeOptional(representedComponent, "GetAllModelElements") as Array;
            if (childModelElements == null)
            {
                continue;
            }

            string recursionKey = BuildRecursionKey(
                GetRepresentedComponentPath(representedComponent),
                SafeGetString(childImplementation, "GetName"),
                SafeGetString(complexElement, "GetName"));

            if (String.IsNullOrWhiteSpace(recursionKey))
            {
                continue;
            }

            if (recursionGuard != null && recursionGuard.Contains(recursionKey))
            {
                continue;
            }

            bool removeAfterVisit = false;
            if (recursionGuard != null)
            {
                recursionGuard.Add(recursionKey);
                removeAfterVisit = true;
            }

            try
            {
                count += CountImplementationElements(childImplementation, childModelElements, recursionGuard);
            }
            finally
            {
                if (removeAfterVisit)
                {
                    recursionGuard.Remove(recursionKey);
                }
            }
        }

        return count;
    }

    private string GetRepresentedComponentPath(object representedComponent)
    {
        string path = SafeGetString(representedComponent, "GetNameWithPath");
        if (!String.IsNullOrWhiteSpace(path))
        {
            return path;
        }

        return SafeGetString(representedComponent, "GetName");
    }

    private string BuildRecursionKey(string representedComponentPath, string childImplementationName, string fallbackName)
    {
        string componentKey = String.IsNullOrWhiteSpace(representedComponentPath) ? fallbackName : representedComponentPath;
        string implementationKey = childImplementationName ?? String.Empty;
        if (String.IsNullOrWhiteSpace(componentKey) && String.IsNullOrWhiteSpace(implementationKey))
        {
            return String.Empty;
        }

        return componentKey + "::" + implementationKey;
    }

    private Dictionary<string, object> BuildImplementationSummary(SummaryImplementationInfo implementation)
    {
        Dictionary<string, object> payload = new Dictionary<string, object>();
        payload["resolvedName"] = implementation == null ? String.Empty : (implementation.ResolvedName ?? String.Empty);
        payload["memoryLocation"] = implementation == null ? String.Empty : (implementation.MemoryLocation ?? String.Empty);
        return payload;
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

    private static string BuildSnapshotSummaryText(AscetItemRef component, int diagramCount, int referenceCount)
    {
        string displayKind = component == null ? "Component" : component.Kind.ToString();
        string name = GetDisplayName(component);
        return displayKind
            + " "
            + name
            + " has "
            + referenceCount.ToString()
            + " reference"
            + (referenceCount == 1 ? String.Empty : "s")
            + " and "
            + diagramCount.ToString()
            + " diagram"
            + (diagramCount == 1 ? String.Empty : "s");
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

    private static string GetDisplayName(AscetItemRef component)
    {
        return component == null ? String.Empty : AscetDatabaseExplorerCommon.FirstNonEmpty(component.Name, GetItemName(component.Path ?? String.Empty));
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

    private static string GetOwnerKind(string path)
    {
        return String.IsNullOrWhiteSpace(GetParentPath(path)) ? "workspace" : "folder";
    }

    private static string GetString(IDictionary<string, object> payload, string key)
    {
        if (payload == null || String.IsNullOrWhiteSpace(key) || !payload.ContainsKey(key) || payload[key] == null)
        {
            return String.Empty;
        }

        return Convert.ToString(payload[key]) ?? String.Empty;
    }

    private static object InvokeOptional(object target, string methodName)
    {
        if (target == null || String.IsNullOrWhiteSpace(methodName))
        {
            return null;
        }

        MethodInfo method = target.GetType().GetMethod(methodName, BindingFlags.Instance | BindingFlags.Public);
        if (method == null)
        {
            return null;
        }

        return method.Invoke(target, null);
    }

    private static string SafeGetString(object target, string methodName)
    {
        try
        {
            object value = InvokeOptional(target, methodName);
            return value == null ? String.Empty : value.ToString();
        }
        catch
        {
            return String.Empty;
        }
    }

    private static AscetDatabaseRef CloneDatabaseRef(AscetDatabaseRef databaseRef)
    {
        if (databaseRef == null)
        {
            return null;
        }

        AscetDatabaseRef clone = new AscetDatabaseRef();
        clone.Name = databaseRef.Name;
        clone.Path = databaseRef.Path;
        return clone;
    }

    private static string GetUsage()
    {
            return "usage: AscetCli.exe exec read_component_summary <component-path> [--json]";
    }

    private sealed class SummaryImplementationInfo
    {
        public string ResolvedName { get; set; }
        public string MemoryLocation { get; set; }
        public int ElementCount { get; set; }
    }
}
