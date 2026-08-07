using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Text;
using System.Web.Script.Serialization;

public static class AscetReadBlockDiagram
{
    public static int Main(string[] args)
    {
        TextWriter originalOut = Console.Out;
        StringWriter suppressedOut = null;

        try
        {
            if (args == null || args.Length < 2 || args.Length > 3)
            {
                Console.Error.WriteLine("usage: AscetCli.exe exec read_block_diagram <component-path> <diagram-name> [--json]");
                return 1;
            }

            string componentPath = NormalizeComponentPath(args[0]);
            string diagramName = NormalizeDiagramName(args[1]);
            bool emitJson = IsJsonRequested(args);

            if (emitJson)
            {
                suppressedOut = new StringWriter();
                Console.SetOut(suppressedOut);
            }

            AscetToolApiBootstrap.ConfigureAssemblyResolution();

            ComponentLocatorService locator = new ComponentLocatorService();
            BlockDiagramReadService blockDiagrams = new BlockDiagramReadService();

            AscetItemPath parsed = AscetItemPath.Parse(componentPath);
            AscetItemRef component = locator.FindItemInFolder(parsed.ItemName, parsed.FolderPath);
            if (component == null)
            {
                if (FolderExists(locator, componentPath))
                {
                    throw new AscetReadException(
                        "target_is_folder",
                        "read_block_diagram",
                        "Target path '" + componentPath + "' resolves to a folder, not a module component.");
                }

                throw new AscetReadException("component_not_found", "read_block_diagram", "Component '" + componentPath + "' was not found.");
            }

            if (component.Kind == AscetComponentKind.Unknown && FolderExists(locator, componentPath))
            {
                throw new AscetReadException(
                    "target_is_folder",
                    "read_block_diagram",
                    "Target path '" + componentPath + "' resolves to a folder, not a module component.");
            }

            if (!IsReadableBlockDiagramComponentKind(component.Kind))
            {
                throw new AscetReadException(
                    "unsupported_component_kind_for_block_diagram",
                    "read_block_diagram",
                    "Component '" + componentPath + "' must be a module or class to read a block diagram.");
            }

            AscetBlockDiagramGraph graph = blockDiagrams.GetBlockDiagramGraph(component, diagramName);

            Console.SetOut(originalOut);
            Console.Write(emitJson ? FormatJsonOutput(graph) : FormatTextOutput(graph));
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

    public static bool IsJsonRequested(string[] args)
    {
        if (args == null || args.Length < 3)
        {
            return false;
        }

        for (int i = 2; i < args.Length; i++)
        {
            if (String.Equals(args[i], "--json", StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }
        }

        return false;
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

    public static string NormalizeDiagramName(string diagramName)
    {
        if (String.IsNullOrWhiteSpace(diagramName))
        {
            throw new AscetReadException("invalid_argument", "normalize_diagram_name", "Diagram name must not be empty.");
        }

        return diagramName.Trim();
    }

    public static bool IsReadableBlockDiagramComponentKind(AscetComponentKind kind)
    {
        return kind == AscetComponentKind.Module || kind == AscetComponentKind.Class;
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

    public static string FormatTextOutput(AscetBlockDiagramGraph graph)
    {
        if (graph == null)
        {
            throw new AscetReadException("invalid_argument", "format_text_output", "Block diagram graph must not be null.");
        }

        StringBuilder builder = new StringBuilder();
        builder.Append("Component: ").Append(graph.ComponentPath ?? String.Empty).AppendLine();
        builder.Append("Diagram: ").Append(graph.DiagramName ?? String.Empty).AppendLine();

        AppendElements(builder, graph.Elements);
        AppendPins(builder, graph.Pins);
        AppendSequenceCalls(builder, graph.SequenceCalls);
        AppendHierarchyInternalPins(builder, graph.HierarchyInternalPins);
        AppendConnections(builder, graph.Connections);

        return builder.ToString();
    }

    public static string FormatJsonOutput(AscetBlockDiagramGraph graph)
    {
        if (graph == null)
        {
            throw new AscetReadException("invalid_argument", "format_json_output", "Block diagram graph must not be null.");
        }

        return AscetJsonContract.Serialize(BuildSemanticGraph(graph));
    }

    public static string FormatRawJsonOutput(AscetBlockDiagramGraph graph)
    {
        if (graph == null)
        {
            throw new AscetReadException("invalid_argument", "format_raw_json_output", "Block diagram graph must not be null.");
        }

        return AscetJsonContract.Serialize(BuildSerializableGraph(graph));
    }

    private static IDictionary<string, object> BuildSemanticGraph(AscetBlockDiagramGraph graph)
    {
        Dictionary<string, object> result = new Dictionary<string, object>();
        IList<AscetBlockElementRef> elements = graph.Elements ?? new List<AscetBlockElementRef>();
        IList<AscetBlockConnectionRef> connections = graph.Connections ?? new List<AscetBlockConnectionRef>();
        IList<AscetSequenceCallRef> sequenceCalls = graph.SequenceCalls ?? new List<AscetSequenceCallRef>();
        Dictionary<string, AscetBlockElementRef> elementsById = BuildElementsById(elements);
        Dictionary<string, AscetSequenceCallRef> sequenceCallsById = BuildSequenceCallsById(sequenceCalls);
        Dictionary<string, Dictionary<string, object>> nodeMap = new Dictionary<string, Dictionary<string, object>>(StringComparer.Ordinal);
        List<IDictionary<string, object>> state = new List<IDictionary<string, object>>();
        List<IDictionary<string, object>> dataEdges = new List<IDictionary<string, object>>();
        List<IDictionary<string, object>> controlEdges = new List<IDictionary<string, object>>();
        List<IDictionary<string, object>> diagnostics = new List<IDictionary<string, object>>();
        bool hasLimitPair = HasLimitOperatorPair(connections);

        for (int i = 0; i < elements.Count; i++)
        {
            AscetBlockElementRef element = elements[i];
            if (element == null)
            {
                continue;
            }

            Dictionary<string, object> node = EnsureSemanticNode(nodeMap, element);
            if (String.Equals(GetString(node, "kind"), "state", StringComparison.Ordinal))
            {
                AddUniqueObjectById(state, node);
            }
        }

        for (int i = 0; i < connections.Count; i++)
        {
            AscetBlockConnectionRef connection = connections[i];
            if (connection == null)
            {
                continue;
            }

            string semanticKind = GetSemanticKind(connection);
            if (String.Equals(semanticKind, "data", StringComparison.Ordinal))
            {
                dataEdges.Add(BuildSemanticEdge(connection, "data", GetValueKind(connection), GetDataEdgeRole(connection, hasLimitPair), elementsById));
                EnsureEndpointNode(nodeMap, connection.Source, elementsById);
                EnsureEndpointNode(nodeMap, connection.Target, elementsById);
                continue;
            }

            if (String.Equals(semanticKind, "control", StringComparison.Ordinal))
            {
                controlEdges.Add(BuildSemanticEdge(connection, "control", String.Empty, "sequence", elementsById));
                EnsureEndpointNode(nodeMap, connection.Source, elementsById);
                EnsureEndpointNode(nodeMap, connection.Target, elementsById);
                continue;
            }

            diagnostics.Add(BuildDiagnostic("unclassified_connection_type", "Connection type could not be classified semantically.", connection));
        }

        result["componentPath"] = graph.ComponentPath ?? String.Empty;
        result["componentKind"] = FormatComponentKind(graph.ComponentKind);
        result["diagramName"] = graph.DiagramName ?? String.Empty;
        result["nodes"] = BuildNodeList(nodeMap);
        result["dataEdges"] = dataEdges;
        result["controlEdges"] = controlEdges;
        result["state"] = state;
        result["operations"] = BuildOperations(sequenceCalls, connections, sequenceCallsById, elementsById);
        result["diagnostics"] = diagnostics;
        result["evidence"] = BuildGraphEvidence(graph, dataEdges, controlEdges, diagnostics);
        return result;
    }

    private static Dictionary<string, AscetBlockElementRef> BuildElementsById(IList<AscetBlockElementRef> elements)
    {
        Dictionary<string, AscetBlockElementRef> result = new Dictionary<string, AscetBlockElementRef>(StringComparer.Ordinal);
        if (elements == null)
        {
            return result;
        }

        for (int i = 0; i < elements.Count; i++)
        {
            AscetBlockElementRef element = elements[i];
            if (element != null && !String.IsNullOrEmpty(element.Id) && !result.ContainsKey(element.Id))
            {
                result[element.Id] = element;
            }
        }

        return result;
    }

    private static Dictionary<string, AscetSequenceCallRef> BuildSequenceCallsById(IList<AscetSequenceCallRef> sequenceCalls)
    {
        Dictionary<string, AscetSequenceCallRef> result = new Dictionary<string, AscetSequenceCallRef>(StringComparer.Ordinal);
        if (sequenceCalls == null)
        {
            return result;
        }

        for (int i = 0; i < sequenceCalls.Count; i++)
        {
            AscetSequenceCallRef sequenceCall = sequenceCalls[i];
            if (sequenceCall != null && !String.IsNullOrEmpty(sequenceCall.Id) && !result.ContainsKey(sequenceCall.Id))
            {
                result[sequenceCall.Id] = sequenceCall;
            }
        }

        return result;
    }

    private static List<IDictionary<string, object>> BuildNodeList(Dictionary<string, Dictionary<string, object>> nodeMap)
    {
        List<IDictionary<string, object>> result = new List<IDictionary<string, object>>();
        if (nodeMap == null)
        {
            return result;
        }

        foreach (KeyValuePair<string, Dictionary<string, object>> entry in nodeMap)
        {
            result.Add(entry.Value);
        }

        return result;
    }

    private static Dictionary<string, object> EnsureEndpointNode(
        Dictionary<string, Dictionary<string, object>> nodeMap,
        AscetBlockPinRef pin,
        IDictionary<string, AscetBlockElementRef> elementsById)
    {
        if (pin == null)
        {
            return null;
        }

        AscetBlockElementRef element = null;
        if (elementsById != null && !String.IsNullOrEmpty(pin.ElementId) && elementsById.ContainsKey(pin.ElementId))
        {
            element = elementsById[pin.ElementId];
        }

        if (element != null)
        {
            return EnsureSemanticNode(nodeMap, element);
        }

        AscetBlockElementRef fallback = new AscetBlockElementRef
        {
            Id = pin.ElementId ?? String.Empty,
            Name = pin.ElementName ?? String.Empty,
            ElementKind = AscetBlockElementKind.Unknown
        };
        return EnsureSemanticNode(nodeMap, fallback);
    }

    private static Dictionary<string, object> EnsureSemanticNode(
        Dictionary<string, Dictionary<string, object>> nodeMap,
        AscetBlockElementRef element)
    {
        if (element == null)
        {
            return null;
        }

        string id = BuildSemanticNodeId(element);
        Dictionary<string, object> node;
        if (nodeMap.TryGetValue(id, out node))
        {
            Dictionary<string, object> evidence = GetDictionaryFromObject(node, "evidence");
            AddUniqueString(GetStringListFromObject(evidence, "elementIds"), element.Id ?? String.Empty);
            return node;
        }

        string kind = ClassifySemanticNode(element);
        Dictionary<string, object> nodeEvidence = new Dictionary<string, object>();
        List<string> elementIds = new List<string>();
        AddUniqueString(elementIds, element.Id ?? String.Empty);
        nodeEvidence["elementIds"] = elementIds;

        node = new Dictionary<string, object>();
        node["id"] = id;
        node["name"] = DisplaySemanticName(element.Name);
        node["sourceName"] = element.Name ?? String.Empty;
        node["kind"] = kind;
        node["elementKind"] = element.ElementKind.ToString();
        node["evidence"] = nodeEvidence;
        nodeMap[id] = node;
        return node;
    }

    private static string BuildSemanticNodeId(AscetBlockElementRef element)
    {
        if (element == null)
        {
            return "unknown";
        }

        string name = element.Name ?? String.Empty;
        string kind = ClassifySemanticNode(element);
        if (String.Equals(kind, "operator", StringComparison.Ordinal)
            || String.Equals(kind, "control", StringComparison.Ordinal)
            || String.Equals(kind, "literal", StringComparison.Ordinal)
            || String.Equals(kind, "hierarchy", StringComparison.Ordinal)
            || String.Equals(kind, "hierarchy_pin", StringComparison.Ordinal)
            || String.IsNullOrEmpty(name))
        {
            return kind + ":" + (String.IsNullOrEmpty(element.Id) ? name : element.Id);
        }

        return kind + ":" + name;
    }

    private static string GetNodeIdForPin(AscetBlockPinRef pin, IDictionary<string, AscetBlockElementRef> elementsById)
    {
        if (pin == null)
        {
            return "unknown";
        }

        AscetBlockElementRef element = null;
        if (elementsById != null && !String.IsNullOrEmpty(pin.ElementId) && elementsById.ContainsKey(pin.ElementId))
        {
            element = elementsById[pin.ElementId];
        }

        if (element == null)
        {
            element = new AscetBlockElementRef
            {
                Id = pin.ElementId ?? String.Empty,
                Name = pin.ElementName ?? String.Empty,
                ElementKind = AscetBlockElementKind.Unknown
            };
        }

        return BuildSemanticNodeId(element);
    }

    private static string ClassifySemanticNode(AscetBlockElementRef element)
    {
        if (element == null)
        {
            return "unknown";
        }

        string name = element.Name ?? String.Empty;
        if (IsReturnName(name))
        {
            return "return";
        }

        if (name.IndexOf("/", StringComparison.Ordinal) >= 0)
        {
            return "argument";
        }

        if (element.ElementKind == AscetBlockElementKind.FunctionalElement)
        {
            return "state";
        }

        if (element.ElementKind == AscetBlockElementKind.Operator)
        {
            return "operator";
        }

        if (element.ElementKind == AscetBlockElementKind.ControlElement)
        {
            return "control";
        }

        if (element.ElementKind == AscetBlockElementKind.Literal)
        {
            return "literal";
        }

        if (element.ElementKind == AscetBlockElementKind.Hierarchy)
        {
            return "hierarchy";
        }

        if (element.ElementKind == AscetBlockElementKind.HierarchyPin)
        {
            return "hierarchy_pin";
        }

        return "unknown";
    }

    private static string DisplaySemanticName(string name)
    {
        if (String.IsNullOrEmpty(name))
        {
            return String.Empty;
        }

        int separatorIndex = name.LastIndexOf('/');
        if (separatorIndex >= 0 && separatorIndex + 1 < name.Length)
        {
            return name.Substring(separatorIndex + 1);
        }

        return name;
    }

    private static string GetSemanticKind(AscetBlockConnectionRef connection)
    {
        if (connection == null)
        {
            return "unknown";
        }

        if (connection.ConnectionTypeRaw == 1 || connection.ConnectionTypeRaw == 2 || connection.ConnectionTypeRaw == 6)
        {
            return "data";
        }

        if (connection.ConnectionTypeRaw == 256 || connection.ConnectionType == AscetBlockConnectionSemantic.Sequence)
        {
            return "control";
        }

        return "unknown";
    }

    private static string GetValueKind(AscetBlockConnectionRef connection)
    {
        if (connection == null)
        {
            return String.Empty;
        }

        if (connection.ConnectionTypeRaw == 1)
        {
            return "logical";
        }

        if (connection.ConnectionTypeRaw == 2 || connection.ConnectionTypeRaw == 6)
        {
            return "numeric";
        }

        return String.Empty;
    }

    private static string GetDataEdgeRole(AscetBlockConnectionRef connection, bool hasLimitPair)
    {
        if (connection == null)
        {
            return "unknown_data_path";
        }

        if (connection.ConnectionTypeRaw == 1)
        {
            return "logical_data_path";
        }

        if (connection.ConnectionTypeRaw == 6 && hasLimitPair && EndpointReferencesLimitOperator(connection))
        {
            return "limit_data_path";
        }

        return "numeric_data_path";
    }

    private static bool HasLimitOperatorPair(IList<AscetBlockConnectionRef> connections)
    {
        if (connections == null)
        {
            return false;
        }

        for (int i = 0; i < connections.Count; i++)
        {
            AscetBlockConnectionRef connection = connections[i];
            if (connection == null || connection.ConnectionTypeRaw != 6)
            {
                continue;
            }

            if (ConnectsMinAndMax(connection))
            {
                return true;
            }
        }

        return false;
    }

    private static bool ConnectsMinAndMax(AscetBlockConnectionRef connection)
    {
        string sourceName = connection == null || connection.Source == null ? String.Empty : connection.Source.ElementName;
        string targetName = connection == null || connection.Target == null ? String.Empty : connection.Target.ElementName;
        return (IsLimitMin(sourceName) && IsLimitMax(targetName)) || (IsLimitMax(sourceName) && IsLimitMin(targetName));
    }

    private static bool EndpointReferencesLimitOperator(AscetBlockConnectionRef connection)
    {
        string sourceName = connection == null || connection.Source == null ? String.Empty : connection.Source.ElementName;
        string targetName = connection == null || connection.Target == null ? String.Empty : connection.Target.ElementName;
        return IsLimitMin(sourceName) || IsLimitMax(sourceName) || IsLimitMin(targetName) || IsLimitMax(targetName);
    }

    private static bool IsLimitMin(string name)
    {
        return String.Equals(name ?? String.Empty, "min", StringComparison.OrdinalIgnoreCase);
    }

    private static bool IsLimitMax(string name)
    {
        return String.Equals(name ?? String.Empty, "max", StringComparison.OrdinalIgnoreCase);
    }

    private static IDictionary<string, object> BuildSemanticEdge(
        AscetBlockConnectionRef connection,
        string semanticKind,
        string valueKind,
        string role,
        IDictionary<string, AscetBlockElementRef> elementsById)
    {
        Dictionary<string, object> edge = new Dictionary<string, object>();
        edge["id"] = connection == null ? String.Empty : (connection.Id ?? String.Empty);
        edge["from"] = GetNodeIdForPin(connection == null ? null : connection.Source, elementsById);
        edge["to"] = GetNodeIdForPin(connection == null ? null : connection.Target, elementsById);
        edge["semanticKind"] = semanticKind ?? String.Empty;
        edge["valueKind"] = valueKind ?? String.Empty;
        edge["role"] = role ?? String.Empty;
        edge["evidence"] = BuildEdgeEvidence(connection);
        return edge;
    }

    private static IDictionary<string, object> BuildEdgeEvidence(AscetBlockConnectionRef connection)
    {
        Dictionary<string, object> evidence = new Dictionary<string, object>();
        evidence["connectionId"] = connection == null ? String.Empty : (connection.Id ?? String.Empty);
        evidence["diagramName"] = connection == null ? String.Empty : (connection.DiagramName ?? String.Empty);
        evidence["rawType"] = connection == null ? 0 : connection.ConnectionTypeRaw;
        evidence["rawTypeName"] = GetRawTypeName(connection == null ? 0 : connection.ConnectionTypeRaw);
        evidence["sourceElementName"] = connection == null || connection.Source == null ? String.Empty : (connection.Source.ElementName ?? String.Empty);
        evidence["sourcePin"] = BuildPinLabel(connection == null ? null : connection.Source);
        evidence["targetElementName"] = connection == null || connection.Target == null ? String.Empty : (connection.Target.ElementName ?? String.Empty);
        evidence["targetPin"] = BuildPinLabel(connection == null ? null : connection.Target);
        evidence["sourceSequenceCallId"] = connection == null || connection.Source == null ? String.Empty : (connection.Source.SequenceCallId ?? String.Empty);
        evidence["targetSequenceCallId"] = connection == null || connection.Target == null ? String.Empty : (connection.Target.SequenceCallId ?? String.Empty);
        return evidence;
    }

    private static string GetRawTypeName(int rawType)
    {
        switch (rawType)
        {
            case 1:
                return "LogicalData";
            case 2:
                return "NumericData";
            case 6:
                return "NumericDataWithInternalFlag";
            case 256:
                return "Sequence";
            default:
                return "Unknown";
        }
    }

    private static string BuildPinLabel(AscetBlockPinRef pin)
    {
        if (pin == null)
        {
            return String.Empty;
        }

        return (pin.ElementName ?? String.Empty) + "." + (pin.PinName ?? String.Empty);
    }

    private static IDictionary<string, object> BuildDiagnostic(string code, string message, AscetBlockConnectionRef connection)
    {
        Dictionary<string, object> diagnostic = new Dictionary<string, object>();
        diagnostic["code"] = code ?? String.Empty;
        diagnostic["message"] = message ?? String.Empty;
        diagnostic["connectionId"] = connection == null ? String.Empty : (connection.Id ?? String.Empty);
        diagnostic["rawType"] = connection == null ? 0 : connection.ConnectionTypeRaw;
        return diagnostic;
    }

    private static IDictionary<string, object> BuildGraphEvidence(
        AscetBlockDiagramGraph graph,
        IList<IDictionary<string, object>> dataEdges,
        IList<IDictionary<string, object>> controlEdges,
        IList<IDictionary<string, object>> diagnostics)
    {
        Dictionary<string, object> evidence = new Dictionary<string, object>();
        Dictionary<string, object> counts = new Dictionary<string, object>();
        counts["elements"] = graph == null || graph.Elements == null ? 0 : graph.Elements.Count;
        counts["pins"] = graph == null || graph.Pins == null ? 0 : graph.Pins.Count;
        counts["sequenceCalls"] = graph == null || graph.SequenceCalls == null ? 0 : graph.SequenceCalls.Count;
        counts["connections"] = graph == null || graph.Connections == null ? 0 : graph.Connections.Count;
        counts["dataEdges"] = dataEdges == null ? 0 : dataEdges.Count;
        counts["controlEdges"] = controlEdges == null ? 0 : controlEdges.Count;
        counts["diagnostics"] = diagnostics == null ? 0 : diagnostics.Count;
        evidence["counts"] = counts;
        evidence["rawConnectionTypes"] = BuildRawConnectionTypeCounts(graph == null ? null : graph.Connections);
        return evidence;
    }

    private static IList<IDictionary<string, object>> BuildRawConnectionTypeCounts(IList<AscetBlockConnectionRef> connections)
    {
        Dictionary<int, int> counts = new Dictionary<int, int>();
        if (connections != null)
        {
            for (int i = 0; i < connections.Count; i++)
            {
                AscetBlockConnectionRef connection = connections[i];
                if (connection == null)
                {
                    continue;
                }

                if (!counts.ContainsKey(connection.ConnectionTypeRaw))
                {
                    counts[connection.ConnectionTypeRaw] = 0;
                }

                counts[connection.ConnectionTypeRaw] = counts[connection.ConnectionTypeRaw] + 1;
            }
        }

        List<IDictionary<string, object>> result = new List<IDictionary<string, object>>();
        foreach (KeyValuePair<int, int> entry in counts)
        {
            Dictionary<string, object> row = new Dictionary<string, object>();
            row["rawType"] = entry.Key;
            row["rawTypeName"] = GetRawTypeName(entry.Key);
            row["count"] = entry.Value;
            result.Add(row);
        }

        return result;
    }

    private static IList<IDictionary<string, object>> BuildOperations(
        IList<AscetSequenceCallRef> sequenceCalls,
        IList<AscetBlockConnectionRef> connections,
        IDictionary<string, AscetSequenceCallRef> sequenceCallsById,
        IDictionary<string, AscetBlockElementRef> elementsById)
    {
        Dictionary<string, Dictionary<string, object>> operationMap = new Dictionary<string, Dictionary<string, object>>(StringComparer.Ordinal);
        Dictionary<string, string> sequenceCallOperations = BuildSequenceCallOperationMap(sequenceCalls, connections);
        if (sequenceCalls != null)
        {
            for (int i = 0; i < sequenceCalls.Count; i++)
            {
                AscetSequenceCallRef sequenceCall = sequenceCalls[i];
                if (sequenceCall == null)
                {
                    continue;
                }

                string operationName = ResolveSequenceCallOperation(sequenceCall.Id, sequenceCallsById, sequenceCallOperations);
                if (String.IsNullOrEmpty(operationName))
                {
                    continue;
                }

                Dictionary<string, object> operation = EnsureOperation(operationMap, operationName);
                AddUniqueString(GetStringListFromObject(operation, "sequenceCalls"), sequenceCall.Id ?? String.Empty);
                AddUniqueString(GetStringListFromObject(operation, "sequenceNumbers"), sequenceCall.SequenceNumber.ToString());
            }
        }

        if (connections != null)
        {
            for (int i = 0; i < connections.Count; i++)
            {
                AscetBlockConnectionRef connection = connections[i];
                if (connection == null || !String.Equals(GetSemanticKind(connection), "data", StringComparison.Ordinal))
                {
                    continue;
                }

                string sequenceCallId = connection.Target == null ? String.Empty : (connection.Target.SequenceCallId ?? String.Empty);
                string operationName = ResolveSequenceCallOperation(sequenceCallId, sequenceCallsById, sequenceCallOperations);
                if (String.IsNullOrEmpty(operationName))
                {
                    continue;
                }

                Dictionary<string, object> operation = EnsureOperation(operationMap, operationName);
                IList<string> sourceReads = TraceSourceSignals(connection.Source, connections, elementsById);
                string sourceName = NormalizeSemanticSignalName(connection.Source == null ? String.Empty : connection.Source.ElementName);
                string targetName = NormalizeSemanticSignalName(connection.Target == null ? String.Empty : connection.Target.ElementName);
                string targetPin = BuildPinLabel(connection.Target);

                if (sourceReads.Count == 0 && !IsOperatorName(sourceName) && !String.IsNullOrEmpty(sourceName))
                {
                    sourceReads.Add(sourceName);
                }

                if (targetPin.IndexOf("Cond/Cond", StringComparison.Ordinal) >= 0)
                {
                    AddSourceReads(operation, "reads", sourceReads);
                    AddSourceReads(operation, "guards", sourceReads);
                }
                else if (IsReturnName(connection.Target == null ? String.Empty : connection.Target.ElementName))
                {
                    AddSourceReads(operation, "reads", sourceReads);
                    AddUniqueString(GetStringListFromObject(operation, "returns"), targetName);
                }
                else if (targetPin.IndexOf("set/aValue", StringComparison.Ordinal) >= 0)
                {
                    AddSourceReads(operation, "reads", sourceReads);
                    AddUniqueString(GetStringListFromObject(operation, "writes"), targetName);
                }
            }
        }

        List<IDictionary<string, object>> result = new List<IDictionary<string, object>>();
        foreach (KeyValuePair<string, Dictionary<string, object>> entry in operationMap)
        {
            string effect = BuildOperationEffect(entry.Value);
            if (!String.IsNullOrEmpty(effect))
            {
                entry.Value["effect"] = effect;
            }

            result.Add(entry.Value);
        }

        return result;
    }

    private static Dictionary<string, string> BuildSequenceCallOperationMap(
        IList<AscetSequenceCallRef> sequenceCalls,
        IList<AscetBlockConnectionRef> connections)
    {
        Dictionary<string, string> result = new Dictionary<string, string>(StringComparer.Ordinal);
        Dictionary<string, string> operationByOwnerElement = new Dictionary<string, string>(StringComparer.Ordinal);

        if (sequenceCalls != null)
        {
            for (int i = 0; i < sequenceCalls.Count; i++)
            {
                AscetSequenceCallRef sequenceCall = sequenceCalls[i];
                if (sequenceCall == null || String.IsNullOrEmpty(sequenceCall.SequenceActivatorName))
                {
                    continue;
                }

                if (!String.IsNullOrEmpty(sequenceCall.Id) && !result.ContainsKey(sequenceCall.Id))
                {
                    result[sequenceCall.Id] = sequenceCall.SequenceActivatorName;
                }

                if (!String.IsNullOrEmpty(sequenceCall.OwnerElementId) && !operationByOwnerElement.ContainsKey(sequenceCall.OwnerElementId))
                {
                    operationByOwnerElement[sequenceCall.OwnerElementId] = sequenceCall.SequenceActivatorName;
                }
            }
        }

        if (connections == null || sequenceCalls == null)
        {
            return result;
        }

        for (int i = 0; i < connections.Count; i++)
        {
            AscetBlockConnectionRef connection = connections[i];
            if (connection == null || !String.Equals(GetSemanticKind(connection), "control", StringComparison.Ordinal))
            {
                continue;
            }

            string sourceElementId = connection.Source == null ? String.Empty : (connection.Source.ElementId ?? String.Empty);
            string targetElementId = connection.Target == null ? String.Empty : (connection.Target.ElementId ?? String.Empty);
            if (String.IsNullOrEmpty(sourceElementId) || String.IsNullOrEmpty(targetElementId) || !operationByOwnerElement.ContainsKey(sourceElementId))
            {
                continue;
            }

            string operationName = operationByOwnerElement[sourceElementId];
            for (int j = 0; j < sequenceCalls.Count; j++)
            {
                AscetSequenceCallRef sequenceCall = sequenceCalls[j];
                if (sequenceCall == null || String.IsNullOrEmpty(sequenceCall.Id))
                {
                    continue;
                }

                if (String.Equals(sequenceCall.OwnerElementId ?? String.Empty, targetElementId, StringComparison.Ordinal)
                    && !result.ContainsKey(sequenceCall.Id))
                {
                    result[sequenceCall.Id] = operationName;
                }
            }
        }

        return result;
    }

    private static string ResolveSequenceCallOperation(
        string sequenceCallId,
        IDictionary<string, AscetSequenceCallRef> sequenceCallsById,
        IDictionary<string, string> sequenceCallOperations)
    {
        if (String.IsNullOrEmpty(sequenceCallId))
        {
            return String.Empty;
        }

        if (sequenceCallOperations != null && sequenceCallOperations.ContainsKey(sequenceCallId))
        {
            return sequenceCallOperations[sequenceCallId] ?? String.Empty;
        }

        if (sequenceCallsById != null && sequenceCallsById.ContainsKey(sequenceCallId))
        {
            AscetSequenceCallRef sequenceCall = sequenceCallsById[sequenceCallId];
            return sequenceCall == null ? String.Empty : (sequenceCall.SequenceActivatorName ?? String.Empty);
        }

        return String.Empty;
    }

    private static IList<string> TraceSourceSignals(
        AscetBlockPinRef sourcePin,
        IList<AscetBlockConnectionRef> connections,
        IDictionary<string, AscetBlockElementRef> elementsById)
    {
        List<string> result = new List<string>();
        if (sourcePin == null)
        {
            return result;
        }

        TraceElementSources(sourcePin.ElementId ?? String.Empty, sourcePin.ElementName ?? String.Empty, connections, elementsById, result, new List<string>(), 0);
        return result;
    }

    private static void TraceElementSources(
        string elementId,
        string elementName,
        IList<AscetBlockConnectionRef> connections,
        IDictionary<string, AscetBlockElementRef> elementsById,
        IList<string> result,
        IList<string> visitedElementIds,
        int depth)
    {
        if (depth > 32)
        {
            return;
        }

        AscetBlockElementRef element = null;
        if (elementsById != null && !String.IsNullOrEmpty(elementId) && elementsById.ContainsKey(elementId))
        {
            element = elementsById[elementId];
        }

        string resolvedName = element == null ? (elementName ?? String.Empty) : (element.Name ?? String.Empty);
        string semanticName = NormalizeSemanticSignalName(resolvedName);
        string elementKind = element == null ? "unknown" : ClassifySemanticNode(element);
        bool shouldTraceInputs = String.Equals(elementKind, "operator", StringComparison.Ordinal)
            || String.Equals(elementKind, "control", StringComparison.Ordinal)
            || String.Equals(elementKind, "literal", StringComparison.Ordinal)
            || IsOperatorName(semanticName);

        if (!shouldTraceInputs)
        {
            if (!IsReturnName(resolvedName) && !String.IsNullOrEmpty(semanticName))
            {
                AddUniqueString(result, semanticName);
            }

            return;
        }

        if (!String.IsNullOrEmpty(elementId))
        {
            for (int i = 0; i < visitedElementIds.Count; i++)
            {
                if (String.Equals(visitedElementIds[i], elementId, StringComparison.Ordinal))
                {
                    return;
                }
            }

            visitedElementIds.Add(elementId);
        }

        bool foundInput = false;
        if (connections != null && !String.IsNullOrEmpty(elementId))
        {
            for (int i = 0; i < connections.Count; i++)
            {
                AscetBlockConnectionRef connection = connections[i];
                if (connection == null || !String.Equals(GetSemanticKind(connection), "data", StringComparison.Ordinal))
                {
                    continue;
                }

                string targetElementId = connection.Target == null ? String.Empty : (connection.Target.ElementId ?? String.Empty);
                if (!String.Equals(targetElementId, elementId, StringComparison.Ordinal))
                {
                    continue;
                }

                foundInput = true;
                TraceElementSources(
                    connection.Source == null ? String.Empty : (connection.Source.ElementId ?? String.Empty),
                    connection.Source == null ? String.Empty : (connection.Source.ElementName ?? String.Empty),
                    connections,
                    elementsById,
                    result,
                    visitedElementIds,
                    depth + 1);
            }
        }

        if (!foundInput && !IsOperatorName(semanticName) && !String.IsNullOrEmpty(semanticName))
        {
            AddUniqueString(result, semanticName);
        }
    }

    private static void AddSourceReads(IDictionary<string, object> operation, string key, IList<string> sourceReads)
    {
        IList<string> values = GetStringListFromObject(operation, key);
        if (sourceReads == null)
        {
            return;
        }

        for (int i = 0; i < sourceReads.Count; i++)
        {
            AddUniqueString(values, sourceReads[i]);
        }
    }

    private static Dictionary<string, object> EnsureOperation(Dictionary<string, Dictionary<string, object>> operationMap, string methodName)
    {
        Dictionary<string, object> operation;
        if (operationMap.TryGetValue(methodName, out operation))
        {
            return operation;
        }

        operation = new Dictionary<string, object>();
        operation["method"] = methodName ?? String.Empty;
        operation["sequenceCalls"] = new List<string>();
        operation["sequenceNumbers"] = new List<string>();
        operation["reads"] = new List<string>();
        operation["writes"] = new List<string>();
        operation["returns"] = new List<string>();
        operation["guards"] = new List<string>();
        operationMap[methodName] = operation;
        return operation;
    }

    private static string BuildOperationEffect(IDictionary<string, object> operation)
    {
        string method = GetString(operation, "method");
        IList<string> reads = GetStringListFromObject(operation, "reads");
        IList<string> writes = GetStringListFromObject(operation, "writes");
        if (!String.Equals(method, "compute", StringComparison.Ordinal)
            || writes == null
            || writes.Count != 1
            || !ListContains(reads, writes[0])
            || !ListContains(reads, "value")
            || !ListContains(reads, "mn")
            || !ListContains(reads, "mx"))
        {
            return String.Empty;
        }

        return writes[0] + " = max(min(" + writes[0] + " + value, mx), mn)";
    }

    private static string NormalizeSemanticSignalName(string elementName)
    {
        if (String.IsNullOrEmpty(elementName))
        {
            return String.Empty;
        }

        return DisplaySemanticName(elementName);
    }

    private static bool IsOperatorName(string name)
    {
        if (String.IsNullOrEmpty(name))
        {
            return false;
        }

        return String.Equals(name, "+", StringComparison.Ordinal)
            || String.Equals(name, "-", StringComparison.Ordinal)
            || String.Equals(name, "*", StringComparison.Ordinal)
            || String.Equals(name, "/", StringComparison.Ordinal)
            || String.Equals(name, "min", StringComparison.OrdinalIgnoreCase)
            || String.Equals(name, "max", StringComparison.OrdinalIgnoreCase)
            || String.Equals(name, "MUX", StringComparison.OrdinalIgnoreCase)
            || String.Equals(name, "IfThen", StringComparison.OrdinalIgnoreCase)
            || String.Equals(name, "IfThenElse", StringComparison.OrdinalIgnoreCase);
    }

    private static bool IsReturnName(string name)
    {
        return (name ?? String.Empty).IndexOf("/return", StringComparison.OrdinalIgnoreCase) >= 0;
    }

    private static void AddUniqueObjectById(IList<IDictionary<string, object>> values, IDictionary<string, object> candidate)
    {
        if (values == null || candidate == null)
        {
            return;
        }

        string id = GetString(candidate, "id");
        for (int i = 0; i < values.Count; i++)
        {
            if (String.Equals(GetString(values[i], "id"), id, StringComparison.Ordinal))
            {
                return;
            }
        }

        values.Add(candidate);
    }

    private static void AddUniqueString(IList<string> values, string value)
    {
        if (values == null || String.IsNullOrEmpty(value))
        {
            return;
        }

        for (int i = 0; i < values.Count; i++)
        {
            if (String.Equals(values[i], value, StringComparison.Ordinal))
            {
                return;
            }
        }

        values.Add(value);
    }

    private static bool ListContains(IList<string> values, string expected)
    {
        if (values == null)
        {
            return false;
        }

        for (int i = 0; i < values.Count; i++)
        {
            if (String.Equals(values[i], expected, StringComparison.Ordinal))
            {
                return true;
            }
        }

        return false;
    }

    private static Dictionary<string, object> GetDictionaryFromObject(IDictionary<string, object> payload, string key)
    {
        if (payload == null || !payload.ContainsKey(key) || payload[key] == null)
        {
            return null;
        }

        return payload[key] as Dictionary<string, object>;
    }

    private static IList<string> GetStringListFromObject(IDictionary<string, object> payload, string key)
    {
        if (payload == null || !payload.ContainsKey(key))
        {
            return new List<string>();
        }

        IList<string> typed = payload[key] as IList<string>;
        if (typed != null)
        {
            return typed;
        }

        List<string> created = new List<string>();
        payload[key] = created;
        return created;
    }

    private static string GetString(IDictionary<string, object> payload, string key)
    {
        if (payload == null || !payload.ContainsKey(key) || payload[key] == null)
        {
            return String.Empty;
        }

        return payload[key].ToString();
    }

    private static string FormatComponentKind(AscetComponentKind kind)
    {
        switch (kind)
        {
            case AscetComponentKind.Class:
                return "class";
            case AscetComponentKind.Module:
                return "module";
            case AscetComponentKind.StateMachine:
                return "statemachine";
            case AscetComponentKind.Project:
                return "project";
            case AscetComponentKind.Folder:
                return "folder";
            default:
                return "unknown";
        }
    }

    private static IDictionary<string, object> BuildSerializableGraph(AscetBlockDiagramGraph graph)
    {
        Dictionary<string, object> result = new Dictionary<string, object>();
        result["ComponentPath"] = graph.ComponentPath ?? String.Empty;
        result["ComponentKind"] = FormatComponentKind(graph.ComponentKind);
        result["DiagramName"] = graph.DiagramName ?? String.Empty;
        result["Elements"] = BuildSerializableElements(graph.Elements);
        result["Pins"] = BuildSerializablePins(graph.Pins);
        result["SequenceCalls"] = BuildSerializableSequenceCalls(graph.SequenceCalls);
        result["HierarchyInternalPins"] = BuildSerializableHierarchyPins(graph.HierarchyInternalPins);
        result["Connections"] = BuildSerializableConnections(graph.Connections);
        return result;
    }

    private static IList<IDictionary<string, object>> BuildSerializableElements(IList<AscetBlockElementRef> elements)
    {
        List<IDictionary<string, object>> result = new List<IDictionary<string, object>>();
        if (elements == null)
        {
            return result;
        }

        for (int i = 0; i < elements.Count; i++)
        {
            AscetBlockElementRef element = elements[i];
            Dictionary<string, object> entry = new Dictionary<string, object>();
            entry["Id"] = element == null ? String.Empty : (element.Id ?? String.Empty);
            entry["Name"] = element == null ? String.Empty : (element.Name ?? String.Empty);
            entry["ElementKind"] = element == null ? AscetBlockElementKind.Unknown.ToString() : element.ElementKind.ToString();
            result.Add(entry);
        }

        return result;
    }

    private static IList<IDictionary<string, object>> BuildSerializablePins(IList<AscetBlockPinRef> pins)
    {
        List<IDictionary<string, object>> result = new List<IDictionary<string, object>>();
        if (pins == null)
        {
            return result;
        }

        for (int i = 0; i < pins.Count; i++)
        {
            AscetBlockPinRef pin = pins[i];
            Dictionary<string, object> entry = new Dictionary<string, object>();
            entry["ElementId"] = pin == null ? String.Empty : (pin.ElementId ?? String.Empty);
            entry["ElementName"] = pin == null ? String.Empty : (pin.ElementName ?? String.Empty);
            entry["PinName"] = pin == null ? String.Empty : (pin.PinName ?? String.Empty);
            entry["Direction"] = pin == null ? AscetBlockPinDirection.Unknown.ToString() : pin.Direction.ToString();
            entry["HasSequenceCall"] = pin != null && pin.HasSequenceCall;
            entry["SequenceCallId"] = pin == null ? String.Empty : (pin.SequenceCallId ?? String.Empty);
            result.Add(entry);
        }

        return result;
    }

    private static IList<IDictionary<string, object>> BuildSerializableSequenceCalls(IList<AscetSequenceCallRef> sequenceCalls)
    {
        List<IDictionary<string, object>> result = new List<IDictionary<string, object>>();
        if (sequenceCalls == null)
        {
            return result;
        }

        for (int i = 0; i < sequenceCalls.Count; i++)
        {
            AscetSequenceCallRef sequenceCall = sequenceCalls[i];
            Dictionary<string, object> entry = new Dictionary<string, object>();
            entry["Id"] = sequenceCall == null ? String.Empty : (sequenceCall.Id ?? String.Empty);
            entry["DisplayName"] = sequenceCall == null ? String.Empty : (sequenceCall.DisplayName ?? String.Empty);
            entry["SequenceNumber"] = sequenceCall == null ? 0 : sequenceCall.SequenceNumber;
            entry["OwnerElementId"] = sequenceCall == null ? String.Empty : (sequenceCall.OwnerElementId ?? String.Empty);
            entry["OwnerElementName"] = sequenceCall == null ? String.Empty : (sequenceCall.OwnerElementName ?? String.Empty);
            entry["OwnerPinName"] = sequenceCall == null ? String.Empty : (sequenceCall.OwnerPinName ?? String.Empty);
            entry["ConnectionPinName"] = sequenceCall == null ? String.Empty : (sequenceCall.ConnectionPinName ?? String.Empty);
            entry["SequenceActivatorName"] = sequenceCall == null ? String.Empty : (sequenceCall.SequenceActivatorName ?? String.Empty);
            entry["Position"] = BuildSerializablePoint(sequenceCall == null ? null : sequenceCall.Position);
            result.Add(entry);
        }

        return result;
    }

    private static IList<IDictionary<string, object>> BuildSerializableHierarchyPins(IList<AscetBlockHierarchyPinRef> hierarchyPins)
    {
        List<IDictionary<string, object>> result = new List<IDictionary<string, object>>();
        if (hierarchyPins == null)
        {
            return result;
        }

        for (int i = 0; i < hierarchyPins.Count; i++)
        {
            AscetBlockHierarchyPinRef hierarchyPin = hierarchyPins[i];
            Dictionary<string, object> entry = new Dictionary<string, object>();
            entry["HierarchyElementId"] = hierarchyPin == null ? String.Empty : (hierarchyPin.HierarchyElementId ?? String.Empty);
            entry["HierarchyElementName"] = hierarchyPin == null ? String.Empty : (hierarchyPin.HierarchyElementName ?? String.Empty);
            entry["PinName"] = hierarchyPin == null ? String.Empty : (hierarchyPin.PinName ?? String.Empty);
            entry["Direction"] = hierarchyPin == null ? AscetBlockPinDirection.Unknown.ToString() : hierarchyPin.Direction.ToString();
            result.Add(entry);
        }

        return result;
    }

    private static IList<IDictionary<string, object>> BuildSerializableConnections(IList<AscetBlockConnectionRef> connections)
    {
        List<IDictionary<string, object>> result = new List<IDictionary<string, object>>();
        if (connections == null)
        {
            return result;
        }

        for (int i = 0; i < connections.Count; i++)
        {
            AscetBlockConnectionRef connection = connections[i];
            Dictionary<string, object> entry = new Dictionary<string, object>();
            entry["Id"] = connection == null ? String.Empty : (connection.Id ?? String.Empty);
            entry["DiagramName"] = connection == null ? String.Empty : (connection.DiagramName ?? String.Empty);
            entry["ConnectionTypeRaw"] = connection == null ? 0 : connection.ConnectionTypeRaw;
            entry["ConnectionType"] = connection == null ? AscetBlockConnectionSemantic.Unknown.ToString() : connection.ConnectionType.ToString();
            entry["Source"] = BuildSerializablePin(connection == null ? null : connection.Source);
            entry["Target"] = BuildSerializablePin(connection == null ? null : connection.Target);
            entry["SegmentPoints"] = BuildSerializablePoints(connection == null ? null : connection.SegmentPoints);
            result.Add(entry);
        }

        return result;
    }

    private static IDictionary<string, object> BuildSerializablePin(AscetBlockPinRef pin)
    {
        Dictionary<string, object> entry = new Dictionary<string, object>();
        entry["ElementId"] = pin == null ? String.Empty : (pin.ElementId ?? String.Empty);
        entry["ElementName"] = pin == null ? String.Empty : (pin.ElementName ?? String.Empty);
        entry["PinName"] = pin == null ? String.Empty : (pin.PinName ?? String.Empty);
        entry["Direction"] = pin == null ? AscetBlockPinDirection.Unknown.ToString() : pin.Direction.ToString();
        entry["HasSequenceCall"] = pin != null && pin.HasSequenceCall;
        entry["SequenceCallId"] = pin == null ? String.Empty : (pin.SequenceCallId ?? String.Empty);
        return entry;
    }

    private static IDictionary<string, object> BuildSerializablePoint(AscetBlockPointRef point)
    {
        Dictionary<string, object> entry = new Dictionary<string, object>();
        entry["X"] = point == null ? 0 : point.X;
        entry["Y"] = point == null ? 0 : point.Y;
        return entry;
    }

    private static IList<IDictionary<string, object>> BuildSerializablePoints(IList<AscetBlockPointRef> points)
    {
        List<IDictionary<string, object>> result = new List<IDictionary<string, object>>();
        if (points == null)
        {
            return result;
        }

        for (int i = 0; i < points.Count; i++)
        {
            result.Add(BuildSerializablePoint(points[i]));
        }

        return result;
    }

    private static void AppendElements(StringBuilder builder, IList<AscetBlockElementRef> elements)
    {
        builder.Append("Elements: ").Append(elements == null ? 0 : elements.Count).AppendLine();

        if (elements != null)
        {
            for (int i = 0; i < elements.Count; i++)
            {
                builder.Append("  - ")
                    .Append(elements[i].ElementKind)
                    .Append(": ")
                    .Append(FormatElement(elements[i]))
                    .AppendLine();
            }
        }

        builder.AppendLine();
    }

    private static void AppendPins(StringBuilder builder, IList<AscetBlockPinRef> pins)
    {
        builder.Append("Pins: ").Append(pins == null ? 0 : pins.Count).AppendLine();

        if (pins != null)
        {
            for (int i = 0; i < pins.Count; i++)
            {
                builder.Append("  - ")
                    .Append(FormatEndpoint(pins[i]))
                    .Append(" (")
                    .Append(pins[i].Direction)
                    .Append(")");

                if (pins[i].HasSequenceCall && !String.IsNullOrEmpty(pins[i].SequenceCallId))
                {
                    builder.Append(" [sequence=").Append(pins[i].SequenceCallId).Append("]");
                }

                builder.AppendLine();
            }
        }

        builder.AppendLine();
    }

    private static void AppendSequenceCalls(StringBuilder builder, IList<AscetSequenceCallRef> sequenceCalls)
    {
        builder.Append("SequenceCalls: ").Append(sequenceCalls == null ? 0 : sequenceCalls.Count).AppendLine();

        if (sequenceCalls != null)
        {
            for (int i = 0; i < sequenceCalls.Count; i++)
            {
                AscetSequenceCallRef sequenceCall = sequenceCalls[i];
                builder.Append("  - ")
                    .Append(sequenceCall.DisplayName ?? String.Empty)
                    .Append(" @ ")
                    .Append(FormatOwnerPin(sequenceCall))
                    .Append(" [id=")
                    .Append(sequenceCall.Id ?? String.Empty)
                    .Append(" connectionPin=")
                    .Append(sequenceCall.ConnectionPinName ?? String.Empty)
                    .Append(" position=")
                    .Append(FormatPoint(sequenceCall.Position))
                    .AppendLine("]");
            }
        }

        builder.AppendLine();
    }

    private static void AppendHierarchyInternalPins(StringBuilder builder, IList<AscetBlockHierarchyPinRef> hierarchyPins)
    {
        builder.Append("HierarchyInternalPins: ").Append(hierarchyPins == null ? 0 : hierarchyPins.Count).AppendLine();

        if (hierarchyPins != null)
        {
            for (int i = 0; i < hierarchyPins.Count; i++)
            {
                AscetBlockHierarchyPinRef hierarchyPin = hierarchyPins[i];
                builder.Append("  - ")
                    .Append(FormatHierarchyPin(hierarchyPin))
                    .Append(" (")
                    .Append(hierarchyPin.Direction)
                    .AppendLine(")");
            }
        }

        builder.AppendLine();
    }

    private static void AppendConnections(StringBuilder builder, IList<AscetBlockConnectionRef> connections)
    {
        builder.Append("Connections: ").Append(connections == null ? 0 : connections.Count).AppendLine();

        if (connections != null)
        {
            for (int i = 0; i < connections.Count; i++)
            {
                builder.Append("  - ")
                    .Append(FormatEndpoint(connections[i].Source))
                    .Append(" -> ")
                    .Append(FormatEndpoint(connections[i].Target))
                    .Append(" [type=")
                    .Append(connections[i].ConnectionType)
                    .Append(" raw=")
                    .Append(connections[i].ConnectionTypeRaw)
                    .Append("] [")
                    .Append(FormatPoints(connections[i].SegmentPoints))
                    .AppendLine("]");
            }
        }
    }

    private static string FormatElement(AscetBlockElementRef element)
    {
        if (element == null)
        {
            return "<unknown>";
        }

        return FormatElementName(element.Name, element.Id);
    }

    public static string FormatEndpoint(AscetBlockPinRef pin)
    {
        if (pin == null)
        {
            return "<unknown>";
        }

        return FormatElementName(pin.ElementName, pin.ElementId) + "/" + (pin.PinName ?? String.Empty);
    }

    private static string FormatOwnerPin(AscetSequenceCallRef sequenceCall)
    {
        if (sequenceCall == null)
        {
            return "<unknown>";
        }

        return FormatElementName(sequenceCall.OwnerElementName, sequenceCall.OwnerElementId) + "/" + (sequenceCall.OwnerPinName ?? String.Empty);
    }

    private static string FormatHierarchyPin(AscetBlockHierarchyPinRef hierarchyPin)
    {
        if (hierarchyPin == null)
        {
            return "<unknown>";
        }

        return FormatElementName(hierarchyPin.HierarchyElementName, hierarchyPin.HierarchyElementId) + "/" + (hierarchyPin.PinName ?? String.Empty);
    }

    private static string FormatElementName(string name, string id)
    {
        string safeName = name ?? String.Empty;
        string safeId = id ?? String.Empty;
        if (String.IsNullOrEmpty(safeId))
        {
            return safeName;
        }

        return safeName + "[#" + safeId + "]";
    }

    private static string FormatPoint(AscetBlockPointRef point)
    {
        if (point == null)
        {
            return "(?,?)";
        }

        return "(" + point.X.ToString() + "," + point.Y.ToString() + ")";
    }

    private static string FormatPoints(IList<AscetBlockPointRef> points)
    {
        if (points == null || points.Count == 0)
        {
            return "no-points";
        }

        StringBuilder builder = new StringBuilder();
        for (int i = 0; i < points.Count; i++)
        {
            if (i > 0)
            {
                builder.Append(" -> ");
            }

            builder.Append(FormatPoint(points[i]));
        }

        return builder.ToString();
    }

    public static string FormatException(Exception ex)
    {
        AscetReadException ascet = ex as AscetReadException;
        if (ascet != null)
        {
            return ascet.Code + ":" + ascet.Operation + ":" + ascet.Message;
        }

        return ex.GetType().FullName + ":" + ex.Message;
    }
}
