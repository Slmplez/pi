using System;
using System.Collections.Generic;
using System.IO;
using de.etas.cebra.toolAPI.Ascet;
using de.etas.cebra.toolAPI.Common;

internal sealed class AscetReadHostDispatcher
{
    private static readonly object ConsoleSuppressionGate = new object();
    private static readonly TextWriter SuppressedConsoleOut = TextWriter.Synchronized(TextWriter.Null);
    private readonly FolderReadService _folderReadService;
    private readonly MethodReadService _methodReadService;
    private readonly SummaryReadService _summaryReadService;
    private readonly BlockDiagramReadService _blockDiagramReadService;
    private readonly AscetGetService _getService;
    private readonly AscetReadHostCapabilityService _capabilityService;

    public AscetReadHostDispatcher()
        : this(
            new FolderReadService(),
            new MethodReadService(),
            new SummaryReadService(),
            new BlockDiagramReadService(),
            new AscetGetService(),
            new AscetReadHostCapabilityService())
    {
    }

    internal AscetReadHostDispatcher(
        FolderReadService folderReadService,
        MethodReadService methodReadService,
        SummaryReadService summaryReadService,
        BlockDiagramReadService blockDiagramReadService,
        AscetGetService getService,
        AscetReadHostCapabilityService capabilityService)
    {
        _folderReadService = folderReadService ?? new FolderReadService();
        _methodReadService = methodReadService ?? new MethodReadService();
        _summaryReadService = summaryReadService ?? new SummaryReadService();
        _blockDiagramReadService = blockDiagramReadService ?? new BlockDiagramReadService();
        _getService = getService ?? new AscetGetService();
        _capabilityService = capabilityService ?? new AscetReadHostCapabilityService();
    }

    public Dictionary<string, object> Dispatch(string commandId, Dictionary<string, object> payload, AscetReadHostDispatchContext context)
    {
        if (context == null)
        {
            throw new AscetReadException("invalid_argument", "dispatch_request", "Read-host dispatch context is required.");
        }

        string operationId;
        if (!_capabilityService.TryResolveOperationId(commandId, out operationId))
        {
            throw new AscetReadException(
                "unsupported_command",
                "dispatch_request",
                "AscetReadHost does not support command '" + (commandId ?? String.Empty) + "' yet.");
        }

        if (String.Equals(operationId, "capabilities", StringComparison.Ordinal))
        {
            return DispatchCapabilities(context);
        }

        if (String.Equals(operationId, "list_folders", StringComparison.Ordinal))
        {
            return DispatchListFolders(payload, context);
        }

        if (operationId.StartsWith("get_", StringComparison.Ordinal))
        {
            return DispatchGet(operationId, payload, context);
        }

        if (String.Equals(operationId, "list_diagrams", StringComparison.Ordinal))
        {
            return DispatchListDiagrams(payload, context);
        }

        if (String.Equals(operationId, "list_methods", StringComparison.Ordinal))
        {
            return DispatchListMethods(payload, context);
        }

        if (String.Equals(operationId, "read_method_code", StringComparison.Ordinal))
        {
            return DispatchReadMethodCode(payload, context);
        }

        if (String.Equals(operationId, "read_method_signature", StringComparison.Ordinal))
        {
            return DispatchReadMethodSignature(payload, context);
        }

        if (String.Equals(operationId, "read_implementation", StringComparison.Ordinal))
        {
            return DispatchReadImplementation(payload, context);
        }

        if (String.Equals(operationId, "read_block_diagram", StringComparison.Ordinal))
        {
            return DispatchReadBlockDiagram(payload, context);
        }

        if (String.Equals(operationId, "read_state_machine_flow", StringComparison.Ordinal))
        {
            return DispatchReadStateMachineFlow(payload, context);
        }

        if (String.Equals(operationId, "read_component_children", StringComparison.Ordinal))
        {
            return DispatchReadComponentChildren(payload, context);
        }

        if (String.Equals(operationId, "read_component_summary", StringComparison.Ordinal))
        {
            return DispatchReadComponentSummary(payload, context);
        }

        throw new AscetReadException(
            "unsupported_command",
            "dispatch_request",
            "AscetReadHost does not support command '" + (commandId ?? String.Empty) + "' yet.");
    }

    private Dictionary<string, object> DispatchCapabilities(AscetReadHostDispatchContext context)
    {
        Dictionary<string, object> result = _capabilityService.BuildPayload();
        result["database"] = BuildDatabasePayload(context.DatabaseRef);
        result["host"] = BuildHostPayload(context, AscetReadHostCapabilityService.CapabilityCommandId);
        return result;
    }

    private Dictionary<string, object> DispatchGet(string operationId, Dictionary<string, object> payload, AscetReadHostDispatchContext context)
    {
        Dictionary<string, object> result = _getService.Execute(operationId, payload, context.DatabaseHandle, context.DatabaseRef);
        result["host"] = BuildHostPayload(context, _capabilityService.ToHostCommandId(operationId));
        return result;
    }

    private Dictionary<string, object> DispatchListFolders(Dictionary<string, object> payload, AscetReadHostDispatchContext context)
    {
        FolderReadRequest request = _folderReadService.ParsePayload(payload);
        FolderReadResponse response = _folderReadService.ReadBoundDatabase(request, context.DatabaseHandle, context.DatabaseRef);

        Dictionary<string, object> result = response.Payload;
        result["database"] = BuildDatabasePayload(response.DatabaseRef ?? context.DatabaseRef);
        result["host"] = BuildHostPayload(context, "AscetListFolders");
        return result;
    }

    private Dictionary<string, object> DispatchListDiagrams(Dictionary<string, object> payload, AscetReadHostDispatchContext context)
    {
        string componentPath = AscetDatabaseExplorerCommon.NormalizePath(GetString(payload, "componentPath"), "component_path");
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
        List<Dictionary<string, object>> items = BuildDiagramItems(diagramRefs, defaultDiagramName);

        Dictionary<string, object> result = new Dictionary<string, object>();
        result["componentPath"] = component.Path ?? componentPath;
        result["componentKind"] = AscetDatabaseExplorerCommon.KindToSchema(component.Kind);
        if (!String.IsNullOrWhiteSpace(defaultDiagramName))
        {
            result["defaultDiagramName"] = defaultDiagramName;
        }

        result["items"] = items;
        result["database"] = BuildDatabasePayload(context.DatabaseRef);
        result["host"] = BuildHostPayload(context, "AscetListDiagrams");
        return result;
    }

    private Dictionary<string, object> DispatchListMethods(Dictionary<string, object> payload, AscetReadHostDispatchContext context)
    {
        MethodReadRequest request = _methodReadService.ParsePayload(payload);
        MethodReadResponse response = _methodReadService.ReadBoundDatabase(request, context.DatabaseHandle, context.DatabaseRef);

        Dictionary<string, object> result = response.Payload;
        result["database"] = BuildDatabasePayload(response.DatabaseRef ?? context.DatabaseRef);
        result["host"] = BuildHostPayload(context, "AscetListMethods");
        return result;
    }

    private Dictionary<string, object> DispatchReadMethodCode(Dictionary<string, object> payload, AscetReadHostDispatchContext context)
    {
        string componentPath = AscetReadMethodCode.NormalizeComponentPath(GetString(payload, "componentPath"));
        string methodName = AscetReadMethodCode.NormalizeMethodName(GetString(payload, "methodName"));
        AscetMethodCode methodCode = ExecuteSuppressingConsoleOut(delegate()
        {
            return AscetReadMethodCode.ReadMethodCode(componentPath, methodName);
        });

        Dictionary<string, object> result = AscetReadMethodCode.BuildPayload(methodCode);
        result["database"] = BuildDatabasePayload(context.DatabaseRef);
        result["host"] = BuildHostPayload(context, "AscetReadMethodCode");
        return result;
    }

    private Dictionary<string, object> DispatchReadMethodSignature(Dictionary<string, object> payload, AscetReadHostDispatchContext context)
    {
        string componentPath = AscetReadMethodCode.NormalizeComponentPath(GetString(payload, "componentPath"));
        string methodName = AscetReadMethodCode.NormalizeMethodName(GetString(payload, "methodName"));
        AscetMethodSignatureSnapshot signature = ExecuteSuppressingConsoleOut(delegate()
        {
            return AscetReadMethodSignature.ReadMethodSignature(componentPath, methodName);
        });

        Dictionary<string, object> result = AscetReadMethodSignature.BuildPayload(signature);
        result["database"] = BuildDatabasePayload(context.DatabaseRef);
        result["host"] = BuildHostPayload(context, "AscetReadMethodSignature");
        return result;
    }

    private Dictionary<string, object> DispatchReadImplementation(Dictionary<string, object> payload, AscetReadHostDispatchContext context)
    {
        AscetReadImplementationArguments request = ParseReadImplementationPayload(payload);
        string implementationJson = ExecuteSuppressingConsoleOut(delegate()
        {
            AscetToolApiBootstrap.ConfigureAssemblyResolution();

            ComponentLocatorService locator = new ComponentLocatorService();
            ImplementationReadService implementations = new ImplementationReadService();

            AscetItemPath parsed = AscetItemPath.Parse(request.ComponentPath);
            AscetItemRef component = locator.FindItemInFolder(parsed.ItemName, parsed.FolderPath);

            if (request.ListOnly)
            {
                AscetImplementationCatalog catalog = implementations.ListImplementations(component);
                return AscetReadImplementation.FormatListJsonOutput(catalog);
            }

            AscetImplementationSnapshot snapshot = implementations.ReadImplementation(
                component,
                request.Mode,
                request.ImplementationName);
            return AscetReadImplementation.FormatJsonOutput(snapshot);
        });

        Dictionary<string, object> result = AscetJsonContract.DeserializeObject(implementationJson);
        result["database"] = BuildDatabasePayload(context.DatabaseRef);
        result["host"] = BuildHostPayload(context, "AscetReadImplementation");
        return result;
    }

    private Dictionary<string, object> DispatchReadBlockDiagram(Dictionary<string, object> payload, AscetReadHostDispatchContext context)
    {
        string componentPath = AscetReadBlockDiagram.NormalizeComponentPath(GetString(payload, "componentPath"));
        string diagramName = AscetReadBlockDiagram.NormalizeDiagramName(GetString(payload, "diagramName"));

        Dictionary<string, object> result = ExecuteSuppressingConsoleOut(delegate()
        {
            ComponentLocatorService locator = new ComponentLocatorService();
            AscetItemPath parsed = AscetItemPath.Parse(componentPath);
            AscetItemRef component = locator.FindItemInFolder(parsed.ItemName, parsed.FolderPath);
            if (component != null && !AscetReadBlockDiagram.IsReadableBlockDiagramComponentKind(component.Kind))
            {
                throw new AscetReadException(
                    "unsupported_component_kind_for_block_diagram",
                    "read_block_diagram",
                    "Component '" + componentPath + "' must be a module or class to read a block diagram.");
            }

            if (component == null)
            {
                throw new AscetReadException(
                    "component_not_found",
                    "read_block_diagram",
                    "Component '" + componentPath + "' was not found.");
            }

            AscetBlockDiagramGraph graph = _blockDiagramReadService.GetBlockDiagramGraph(component, diagramName);
            return AscetJsonContract.DeserializeObject(AscetReadBlockDiagram.FormatJsonOutput(graph));
        });

        result["database"] = BuildDatabasePayload(context.DatabaseRef);
        result["host"] = BuildHostPayload(context, "AscetReadBlockDiagram");
        return result;
    }

    private Dictionary<string, object> DispatchReadStateMachineFlow(Dictionary<string, object> payload, AscetReadHostDispatchContext context)
    {
        string componentPath = MethodReadService.NormalizeComponentPath(GetString(payload, "componentPath"));
        int traceDepth = ParsePayloadNonNegativeInt(payload, "traceDepth", 1);

        Dictionary<string, object> result = ExecuteSuppressingConsoleOut(delegate()
        {
            return AscetDatabaseExplorerCommon.DeserializeChildJsonObject(
                AscetDatabaseExplorerCommon.RunSiblingCliExecOrExe(
                    "read_state_machine_flow",
                    "AscetReadStateMachineFlow.exe",
                    new List<string> { componentPath, "--trace-depth", traceDepth.ToString(), "--json" }));
        });

        result["database"] = BuildDatabasePayload(context.DatabaseRef);
        result["host"] = BuildHostPayload(context, "AscetReadStateMachineFlow");
        return result;
    }

    private Dictionary<string, object> DispatchReadComponentChildren(Dictionary<string, object> payload, AscetReadHostDispatchContext context)
    {
        string componentPath = AscetDatabaseExplorerCommon.NormalizePath(GetString(payload, "componentPath"), "component_path");
        string group = NormalizeChildGroup(GetString(payload, "group"));

        Dictionary<string, object> result = String.Equals(group, "diagrams", StringComparison.Ordinal)
            ? BuildReadComponentChildrenPayload(componentPath, group, BuildDiagramSnapshot(DispatchListDiagrams(payload, context)))
            : BuildReadComponentChildrenPayload(componentPath, group, BuildLightweightChildSnapshot(componentPath, group, context));
        result["database"] = BuildDatabasePayload(context.DatabaseRef);
        result["host"] = BuildHostPayload(context, "AscetReadComponentChildren");
        return result;
    }

    private Dictionary<string, object> BuildLightweightChildSnapshot(string componentPath, string group, AscetReadHostDispatchContext context)
    {
        Dictionary<string, object> snapshot = new Dictionary<string, object>();
        if (String.Equals(group, "all", StringComparison.Ordinal)
            || String.Equals(group, "methods", StringComparison.Ordinal))
        {
            Dictionary<string, object> methodPayload = DispatchListMethods(
                new Dictionary<string, object> { { "componentPath", componentPath } },
                context);
            snapshot["Methods"] = BuildMethodSnapshotItems(methodPayload);
        }

        if (String.Equals(group, "all", StringComparison.Ordinal)
            || String.Equals(group, "elements", StringComparison.Ordinal)
            || String.Equals(group, "components", StringComparison.Ordinal)
            || String.Equals(group, "arrays", StringComparison.Ordinal)
            || String.Equals(group, "parameters", StringComparison.Ordinal)
            || String.Equals(group, "variables", StringComparison.Ordinal))
        {
            Dictionary<string, object> implementationPayload = DispatchReadImplementation(
                new Dictionary<string, object> { { "componentPath", componentPath } },
                context);
            Dictionary<string, object> implementation = new Dictionary<string, object>();
            implementation["Elements"] = AscetDatabaseExplorerCommon.GetList(implementationPayload, "Elements");
            snapshot["Implementation"] = implementation;
        }

        return snapshot;
    }

    private static Dictionary<string, object> BuildDiagramSnapshot(Dictionary<string, object> diagramsPayload)
    {
        Dictionary<string, object> snapshot = new Dictionary<string, object>();
        List<object> diagrams = new List<object>();
        IList<object> rawDiagrams = AscetDatabaseExplorerCommon.GetList(diagramsPayload, "items");
        for (int i = 0; i < rawDiagrams.Count; i++)
        {
            Dictionary<string, object> diagram = rawDiagrams[i] as Dictionary<string, object>;
            if (diagram == null)
            {
                continue;
            }

            Dictionary<string, object> item = new Dictionary<string, object>();
            item["name"] = AscetDatabaseExplorerCommon.GetString(diagram, "name");
            item["kind"] = AscetDatabaseExplorerCommon.GetString(diagram, "kind");
            diagrams.Add(item);
        }

        snapshot["Diagrams"] = diagrams;
        return snapshot;
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

    private Dictionary<string, object> DispatchReadComponentSummary(Dictionary<string, object> payload, AscetReadHostDispatchContext context)
    {
        SummaryReadRequest request = _summaryReadService.ParsePayload(payload);
        SummaryReadResponse response = _summaryReadService.ReadBoundDatabase(request, context.DatabaseHandle, context.DatabaseRef);

        Dictionary<string, object> result = response.Payload;
        result["database"] = BuildDatabasePayload(response.DatabaseRef ?? context.DatabaseRef);
        result["host"] = BuildHostPayload(context, _capabilityService.ToHostCommandId("read_component_summary"));
        return result;
    }

    private static List<Dictionary<string, object>> BuildDiagramItems(IList<AscetDiagramRef> diagramRefs, string defaultDiagramName)
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

    private static int ParsePayloadNonNegativeInt(IDictionary<string, object> payload, string key, int defaultValue)
    {
        if (payload == null || String.IsNullOrWhiteSpace(key) || !payload.ContainsKey(key) || payload[key] == null)
        {
            return defaultValue;
        }

        int parsed;
        if (!Int32.TryParse(Convert.ToString(payload[key]) ?? String.Empty, out parsed) || parsed < 0)
        {
            throw new AscetReadException("invalid_argument", key, key + " must be a non-negative integer.");
        }

        return parsed;
    }

    private static string NormalizeChildGroup(string value)
    {
        string normalized = (value ?? String.Empty).Trim().ToLowerInvariant();
        if (String.IsNullOrWhiteSpace(normalized))
        {
            return "all";
        }

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

    private static AscetReadImplementationArguments ParseReadImplementationPayload(IDictionary<string, object> payload)
    {
        string componentPath = AscetReadImplementation.NormalizeComponentPath(GetString(payload, "componentPath"));
        bool listOnly = GetBool(payload, "list");
        bool useDefault = GetBool(payload, "default");
        bool useClassImpl = GetBool(payload, "classImpl") || GetBool(payload, "class-impl");
        string implementationName = AscetReadImplementation.NormalizeImplementationNameAllowEmpty(
            FirstNonEmpty(GetString(payload, "impl"), GetString(payload, "implementationName")));

        AscetReadImplementationArguments result = new AscetReadImplementationArguments();
        result.ComponentPath = componentPath;
        result.EmitJson = true;
        result.ListOnly = listOnly;
        result.Mode = AscetImplementationReadMode.Default;
        result.ImplementationName = String.Empty;

        if (listOnly && (useDefault || useClassImpl || !String.IsNullOrWhiteSpace(implementationName)))
        {
            throw new AscetReadException("invalid_argument", "parse_payload", "--list can not be combined with implementation selection flags.");
        }

        if (useDefault)
        {
            result.Mode = AscetImplementationReadMode.Default;
        }
        else if (useClassImpl)
        {
            result.Mode = AscetImplementationReadMode.Class;
        }
        else if (!String.IsNullOrWhiteSpace(implementationName))
        {
            result.Mode = AscetImplementationReadMode.Named;
            result.ImplementationName = implementationName;
        }

        return result;
    }

    private static Dictionary<string, object> BuildReadComponentChildrenPayload(string componentPath, string group, Dictionary<string, object> snapshot)
    {
        Dictionary<string, object> payload = new Dictionary<string, object>();
        payload["componentPath"] = componentPath;
        payload["selectedGroup"] = group;
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

            if (group != "all" && group != "methods")
            {
                continue;
            }

            Dictionary<string, object> item = AscetDatabaseExplorerCommon.NewChildItem(
                "methods",
                AscetDatabaseExplorerCommon.GetString(method, "MethodName"),
                AscetDatabaseExplorerCommon.GetString(method, "MethodKind"));
            item["path"] = componentPath + "::" + AscetDatabaseExplorerCommon.GetString(method, "MethodName");
            item["displayName"] = AscetDatabaseExplorerCommon.GetString(method, "MethodName");
            item["parentPath"] = componentPath;
            item["ownerKind"] = "component";
            item["isImplementationElement"] = false;
            items.Add(item);
        }

        Dictionary<string, object> implementation = snapshot == null || !snapshot.ContainsKey("Implementation")
            ? null
            : snapshot["Implementation"] as Dictionary<string, object>;
        object implementationElements = implementation != null && implementation.ContainsKey("Elements")
            ? implementation["Elements"]
            : null;
        IList<Dictionary<string, object>> elementItems = AscetDatabaseExplorerCommon.FlattenImplementationElements(implementationElements);
        for (int i = 0; i < elementItems.Count; i++)
        {
            Dictionary<string, object> element = elementItems[i];
            string elementGroup = AscetDatabaseExplorerCommon.GuessElementGroup(element);
            if (group != "all" && group != "elements" && group != elementGroup)
            {
                continue;
            }

            string schemaGroup = group == "elements" ? "elements" : elementGroup;
            Dictionary<string, object> item = AscetDatabaseExplorerCommon.NewChildItem(
                schemaGroup,
                AscetDatabaseExplorerCommon.GetString(element, "ElementName"),
                AscetDatabaseExplorerCommon.FirstNonEmpty(
                    AscetDatabaseExplorerCommon.GetString(element, "DisplayKind"),
                    AscetDatabaseExplorerCommon.GetString(element, "ElementKind")));
            item["path"] = componentPath + "::" + AscetDatabaseExplorerCommon.GetString(element, "ElementName");
            item["displayName"] = AscetDatabaseExplorerCommon.GetString(element, "ElementName");
            item["parentPath"] = componentPath;
            item["ownerKind"] = "component";
            item["displayType"] = AscetDatabaseExplorerCommon.GetString(element, "DisplayType");
            item["displayScope"] = AscetDatabaseExplorerCommon.GetString(element, "DisplayScope");
            item["referencedComponentPath"] = AscetDatabaseExplorerCommon.GetString(element, "ReferencedComponentPath");
            item["isImplementationElement"] = true;
            item["elementGroup"] = elementGroup;
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

            if (group != "all" && group != "diagrams")
            {
                continue;
            }

            string diagramName = FirstNonEmpty(
                AscetDatabaseExplorerCommon.GetString(diagram, "Name"),
                AscetDatabaseExplorerCommon.GetString(diagram, "name"));
            if (String.IsNullOrWhiteSpace(diagramName))
            {
                continue;
            }

            string diagramKind = FirstNonEmpty(
                AscetDatabaseExplorerCommon.GetString(diagram, "DiagramKind"),
                AscetDatabaseExplorerCommon.GetString(diagram, "kind"));
            Dictionary<string, object> item = AscetDatabaseExplorerCommon.NewChildItem(
                "diagrams",
                diagramName,
                diagramKind);
            item["path"] = componentPath + "::" + diagramName;
            item["displayName"] = diagramName;
            item["parentPath"] = componentPath;
            item["ownerKind"] = "component";
            item["isImplementationElement"] = false;
            item["supportsReadBlockDiagram"] = String.Equals(diagramKind, "BlockDiagram", StringComparison.OrdinalIgnoreCase);
            items.Add(item);
        }

        Dictionary<string, object> counts = new Dictionary<string, object>();
        counts["items"] = items.Count;
        counts["methods"] = CountItemsByGroup(items, "methods");
        counts["elements"] = CountImplementationElements(items);
        counts["components"] = CountItemsByGroup(items, "components");
        counts["arrays"] = CountItemsByGroup(items, "arrays");
        counts["parameters"] = CountItemsByGroup(items, "parameters");
        counts["variables"] = CountItemsByGroup(items, "variables");
        counts["diagrams"] = CountItemsByGroup(items, "diagrams");
        payload["counts"] = counts;
        payload["items"] = items;
        return payload;
    }

    private static int CountItemsByGroup(IList<Dictionary<string, object>> items, string expectedGroup)
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
                Boolean.TryParse(Convert.ToString(item["isImplementationElement"]) ?? String.Empty, out isImplementationElement);
            }

            if (isImplementationElement)
            {
                count++;
            }
        }

        return count;
    }

    private static string GetString(IDictionary<string, object> payload, string key)
    {
        if (payload == null || String.IsNullOrWhiteSpace(key) || !payload.ContainsKey(key) || payload[key] == null)
        {
            return String.Empty;
        }

        return Convert.ToString(payload[key]) ?? String.Empty;
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
        return Boolean.TryParse(Convert.ToString(value) ?? String.Empty, out parsed) && parsed;
    }

    private static string FirstNonEmpty(params string[] values)
    {
        if (values == null)
        {
            return String.Empty;
        }

        for (int i = 0; i < values.Length; i++)
        {
            string value = values[i];
            if (!String.IsNullOrWhiteSpace(value))
            {
                return value;
            }
        }

        return String.Empty;
    }

    private static T ExecuteSuppressingConsoleOut<T>(Func<T> action)
    {
        if (action == null)
        {
            throw new ArgumentNullException("action");
        }

        lock (ConsoleSuppressionGate)
        {
            TextWriter originalOut = Console.Out;
            try
            {
                Console.SetOut(SuppressedConsoleOut);
                return action();
            }
            finally
            {
                Console.SetOut(originalOut);
            }
        }
    }

    private static Dictionary<string, object> BuildDatabasePayload(AscetDatabaseRef databaseRef)
    {
        Dictionary<string, object> database = new Dictionary<string, object>();
        database["name"] = databaseRef == null ? String.Empty : (databaseRef.Name ?? String.Empty);
        database["path"] = databaseRef == null ? String.Empty : (databaseRef.Path ?? String.Empty);
        return database;
    }

    private Dictionary<string, object> BuildHostPayload(AscetReadHostDispatchContext context, string commandId)
    {
        Dictionary<string, object> host = _capabilityService.BuildPayload();
        host["commandId"] = commandId ?? String.Empty;
        host["requestCount"] = context.RequestCount;
        host["startedUtc"] = context.StartedUtc.ToString("o");
        host["sessionGeneration"] = context.SessionGeneration;
        host["databaseBindingGeneration"] = context.DatabaseBindingGeneration;
        return host;
    }
}

internal sealed class AscetReadHostDispatchContext
{
    public AscetReadHostDispatchContext()
    {
        StartedUtc = DateTime.UtcNow;
        RequestCount = 0;
        SessionGeneration = 0;
        DatabaseBindingGeneration = 0;
        DatabaseHandle = null;
        DatabaseRef = null;
    }

    public DateTime StartedUtc { get; set; }
    public int RequestCount { get; set; }
    public int SessionGeneration { get; set; }
    public int DatabaseBindingGeneration { get; set; }
    public AscetDataBase DatabaseHandle { get; set; }
    public AscetDatabaseRef DatabaseRef { get; set; }
}
