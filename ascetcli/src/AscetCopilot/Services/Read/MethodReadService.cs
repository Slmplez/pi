using System;
using System.Collections.Generic;
using de.etas.cebra.toolAPI.Ascet;
using de.etas.cebra.toolAPI.Common;
using AscetAction = de.etas.cebra.toolAPI.Ascet.Action;

public sealed class MethodReadRequest
{
    public MethodReadRequest()
    {
        ComponentPath = String.Empty;
    }

    public string ComponentPath { get; set; }
}

public sealed class MethodReadResponse
{
    public MethodReadResponse()
    {
        Payload = new Dictionary<string, object>(StringComparer.Ordinal);
        Component = null;
        Methods = new List<AscetMethodRef>();
        DatabaseRef = null;
    }

    public Dictionary<string, object> Payload { get; set; }
    public AscetItemRef Component { get; set; }
    public IList<AscetMethodRef> Methods { get; set; }
    public AscetDatabaseRef DatabaseRef { get; set; }
}

public sealed class MethodReadService
{
    private readonly ComponentClassifier _classifier;

    public MethodReadService()
        : this(new ComponentClassifier())
    {
    }

    internal MethodReadService(ComponentClassifier classifier)
    {
        _classifier = classifier ?? new ComponentClassifier();
    }

    public MethodReadRequest ParseExecArguments(string[] args)
    {
        if (args == null || args.Length < 1)
        {
            throw new AscetReadException("invalid_argument", "parse_arguments", GetUsage());
        }

        MethodReadRequest request = new MethodReadRequest();
        request.ComponentPath = NormalizeComponentPath(args[0]);

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

    public MethodReadRequest ParsePayload(IDictionary<string, object> payload)
    {
        if (payload == null)
        {
            throw new AscetReadException("invalid_argument", "parse_payload", "Field 'componentPath' is required.");
        }

        MethodReadRequest request = new MethodReadRequest();
        request.ComponentPath = NormalizeComponentPath(GetString(payload, "componentPath"));
        return request;
    }

    public MethodReadResponse ReadCurrentDatabase(MethodReadRequest request)
    {
        AscetSession session = null;

        try
        {
            session = new AscetSessionFactory().OpenCurrentDatabaseSession() as AscetSession;
            if (session == null)
            {
                throw new AscetReadException("tool_connect_failed", "list_methods", "Failed to open ASCET session.");
            }

            AscetDataBase database = session.GetCurrentDatabaseHandle();
            if (database == null)
            {
                throw new AscetReadException("database_not_open", "list_methods", "GetCurrentDataBase returned null. Open a database in ASCET first.");
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

    public MethodReadResponse ReadBoundDatabase(MethodReadRequest request, AscetDataBase databaseHandle, AscetDatabaseRef databaseRef)
    {
        if (databaseHandle == null)
        {
            throw new AscetReadException("database_not_open", "list_methods", "No ASCET database is open.");
        }

        MethodReadRequest normalizedRequest = request ?? new MethodReadRequest();
        string componentPath = NormalizeComponentPath(normalizedRequest.ComponentPath);
        AscetItemRef component = ResolveComponent(databaseHandle, componentPath);
        IList<AscetMethodRef> methods = ListMethods(component, databaseHandle);

        MethodReadResponse response = new MethodReadResponse();
        response.DatabaseRef = CloneDatabaseRef(databaseRef);
        response.Component = component;
        response.Methods = methods;
        response.Payload = BuildPayload(component, methods);
        return response;
    }

    public Dictionary<string, object> BuildPayload(AscetItemRef component, IList<AscetMethodRef> methods)
    {
        List<Dictionary<string, object>> entries = new List<Dictionary<string, object>>();
        if (methods != null)
        {
            for (int i = 0; i < methods.Count; i++)
            {
                AscetMethodRef method = methods[i];
                if (method == null)
                {
                    continue;
                }

                Dictionary<string, object> entry = new Dictionary<string, object>();
                entry["name"] = method.Name ?? String.Empty;
                entry["methodKind"] = method.MethodKind.ToString();
                entry["owningComponentPath"] = method.OwningComponentPath ?? String.Empty;
                entries.Add(entry);
            }
        }

        Dictionary<string, object> counts = new Dictionary<string, object>();
        counts["methods"] = entries.Count;

        Dictionary<string, object> payload = new Dictionary<string, object>();
        payload["componentPath"] = component == null ? String.Empty : (component.Path ?? String.Empty);
        payload["componentKind"] = component == null ? AscetComponentKind.Unknown.ToString() : component.Kind.ToString();
        payload["languageKind"] = component == null ? AscetLanguageKind.Unknown.ToString() : component.LanguageKind.ToString();
        payload["counts"] = counts;
        payload["methods"] = entries;
        return payload;
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

    private IList<AscetMethodRef> ListMethods(AscetItemRef component, AscetDataBase database)
    {
        List<AscetMethodRef> methods = new List<AscetMethodRef>();
        Dictionary<string, bool> seen = new Dictionary<string, bool>(StringComparer.Ordinal);
        CodeComponent codeComponent = ResolveCodeComponent(database, component);
        AscetDiagram[] diagrams = codeComponent.GetAllDiagrams();
        if (diagrams == null)
        {
            return methods;
        }

        for (int i = 0; i < diagrams.Length; i++)
        {
            AscetDiagram diagram = diagrams[i];
            if (diagram == null)
            {
                continue;
            }

            AddMethodsFromDiagram(component.Path, diagram, methods, seen);
        }

        return methods;
    }

    private AscetItemRef ResolveComponent(AscetDataBase database, string componentPath)
    {
        AscetItemPath parsed = AscetItemPath.Parse(componentPath);
        DataBaseItem item = database.GetItemInFolder(parsed.ItemName, parsed.FolderPath ?? String.Empty);
        if (item == null)
        {
            throw new AscetReadException(
                "component_not_found",
                "resolve_component",
                "Item '" + parsed.ItemName + "' was not found in folder '" + (parsed.FolderPath ?? String.Empty) + "'.");
        }

        return _classifier.ToItemRef(item);
    }

    private CodeComponent ResolveCodeComponent(AscetDataBase database, AscetItemRef component)
    {
        if (component == null)
        {
            throw new AscetReadException("invalid_argument", "resolve_code_component", "Component reference must not be null.");
        }

        AscetItemPath parsed = AscetItemPath.Parse(component.Path);
        DataBaseItem item = database.GetItemInFolder(parsed.ItemName, parsed.FolderPath ?? String.Empty);
        CodeComponent codeComponent = item as CodeComponent;
        if (codeComponent == null)
        {
            if (item is AscetFolder)
            {
                throw new AscetReadException(
                    "target_is_folder",
                    "resolve_code_component",
                    "Target path '" + component.Path + "' resolves to a folder, not a code component.");
            }

            throw new AscetReadException(
                "unsupported_component_kind",
                "resolve_code_component",
                "Item '" + component.Path + "' is not a code component.");
        }

        return codeComponent;
    }

    private void AddMethodsFromDiagram(string componentPath, AscetDiagram diagram, IList<AscetMethodRef> methods, IDictionary<string, bool> seen)
    {
        if (diagram.IsDiscreteMethodDiagram())
        {
            DiscreteMethodDiagram discreteDiagram = diagram as DiscreteMethodDiagram;
            if (discreteDiagram == null)
            {
                throw new AscetReadException("unsupported_diagram_kind", "list_methods", "Failed to cast discrete method diagram '" + diagram.GetName() + "'.");
            }

            AddMethods(componentPath, discreteDiagram.GetAllMethods(), methods, seen);
            return;
        }

        if (diagram.IsContinuousMethodDiagram())
        {
            ContinuousMethodDiagram continuousDiagram = diagram as ContinuousMethodDiagram;
            if (continuousDiagram == null)
            {
                throw new AscetReadException("unsupported_diagram_kind", "list_methods", "Failed to cast continuous method diagram '" + diagram.GetName() + "'.");
            }

            AddMethods(componentPath, continuousDiagram.GetAllMethods(), methods, seen);
            return;
        }

        if (diagram.IsProcessDiagram())
        {
            ProcessDiagram processDiagram = diagram as ProcessDiagram;
            if (processDiagram == null)
            {
                throw new AscetReadException("unsupported_diagram_kind", "list_methods", "Failed to cast process diagram '" + diagram.GetName() + "'.");
            }

            AddMethods(componentPath, processDiagram.GetAllMethods(), methods, seen);
            AddMethods(componentPath, processDiagram.GetAllProcesses(), methods, seen);
            return;
        }

        if (diagram.IsActionConditionDiagram())
        {
            ActionConditionDiagram actionConditionDiagram = diagram as ActionConditionDiagram;
            if (actionConditionDiagram == null)
            {
                throw new AscetReadException("unsupported_diagram_kind", "list_methods", "Failed to cast action-condition diagram '" + diagram.GetName() + "'.");
            }

            AddMethods(componentPath, actionConditionDiagram.GetAllActions(), methods, seen);
            AddMethods(componentPath, actionConditionDiagram.GetAllConditions(), methods, seen);
            return;
        }

        if (diagram.IsStateMachineDiagram())
        {
            StateMachineDiagram stateMachineDiagram = diagram as StateMachineDiagram;
            if (stateMachineDiagram == null)
            {
                throw new AscetReadException("unsupported_diagram_kind", "list_methods", "Failed to cast state-machine diagram '" + diagram.GetName() + "'.");
            }

            AddMethods(componentPath, stateMachineDiagram.GetAllTriggers(), methods, seen);
        }
    }

    private void AddMethods(string componentPath, AbstractMethod[] methods, IList<AscetMethodRef> result, IDictionary<string, bool> seen)
    {
        if (methods == null)
        {
            return;
        }

        for (int i = 0; i < methods.Length; i++)
        {
            AddMethod(componentPath, methods[i], result, seen);
        }
    }

    private void AddMethods(string componentPath, DiscreteMethod[] methods, IList<AscetMethodRef> result, IDictionary<string, bool> seen)
    {
        if (methods == null)
        {
            return;
        }

        for (int i = 0; i < methods.Length; i++)
        {
            AddMethod(componentPath, methods[i], result, seen);
        }
    }

    private void AddMethods(string componentPath, ContinuousMethod[] methods, IList<AscetMethodRef> result, IDictionary<string, bool> seen)
    {
        if (methods == null)
        {
            return;
        }

        for (int i = 0; i < methods.Length; i++)
        {
            AddMethod(componentPath, methods[i], result, seen);
        }
    }

    private void AddMethods(string componentPath, Process[] methods, IList<AscetMethodRef> result, IDictionary<string, bool> seen)
    {
        if (methods == null)
        {
            return;
        }

        for (int i = 0; i < methods.Length; i++)
        {
            AddMethod(componentPath, methods[i], result, seen);
        }
    }

    private void AddMethods(string componentPath, AscetAction[] methods, IList<AscetMethodRef> result, IDictionary<string, bool> seen)
    {
        if (methods == null)
        {
            return;
        }

        for (int i = 0; i < methods.Length; i++)
        {
            AddMethod(componentPath, methods[i], result, seen);
        }
    }

    private void AddMethods(string componentPath, Condition[] methods, IList<AscetMethodRef> result, IDictionary<string, bool> seen)
    {
        if (methods == null)
        {
            return;
        }

        for (int i = 0; i < methods.Length; i++)
        {
            AddMethod(componentPath, methods[i], result, seen);
        }
    }

    private void AddMethods(string componentPath, Trigger[] methods, IList<AscetMethodRef> result, IDictionary<string, bool> seen)
    {
        if (methods == null)
        {
            return;
        }

        for (int i = 0; i < methods.Length; i++)
        {
            AddMethod(componentPath, methods[i], result, seen);
        }
    }

    private void AddMethod(string componentPath, AbstractMethod method, IList<AscetMethodRef> result, IDictionary<string, bool> seen)
    {
        if (method == null)
        {
            return;
        }

        AscetMethodRef methodRef = new AscetMethodRef();
        methodRef.Name = method.GetName();
        methodRef.MethodKind = GetMethodKind(method);
        methodRef.OwningComponentPath = componentPath;

        string key = AscetReadDomainUtilities.BuildMethodKey(methodRef.Name, methodRef.MethodKind, methodRef.OwningComponentPath);
        if (seen.ContainsKey(key))
        {
            return;
        }

        seen[key] = true;
        result.Add(methodRef);
    }

    private static AscetMethodKind GetMethodKind(AbstractMethod method)
    {
        if (method == null)
        {
            return AscetMethodKind.Unknown;
        }

        if (method is Process)
        {
            return AscetMethodKind.Process;
        }

        if (method is AscetAction)
        {
            return AscetMethodKind.Action;
        }

        if (method is Condition)
        {
            return AscetMethodKind.Condition;
        }

        if (method is Trigger)
        {
            return AscetMethodKind.Trigger;
        }

        return AscetMethodKind.AbstractMethod;
    }

    private static string GetString(IDictionary<string, object> payload, string key)
    {
        if (payload == null || String.IsNullOrWhiteSpace(key) || !payload.ContainsKey(key) || payload[key] == null)
        {
            return String.Empty;
        }

        return Convert.ToString(payload[key]) ?? String.Empty;
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
            return "usage: AscetCli.exe exec list_methods <component-path> [--json]";
    }
}
