using System;
using System.Collections.Generic;
using de.etas.cebra.toolAPI.Ascet;

public sealed class FindElementsReadRequest
{
    public FindElementsReadRequest()
    {
        Query = String.Empty;
        ScopePath = String.Empty;
        Kind = AscetComponentKind.Unknown;
        ElementGroup = "all";
        Limit = 20;
        EmitJson = false;
    }

    public string Query { get; set; }
    public string ScopePath { get; set; }
    public AscetComponentKind Kind { get; set; }
    public string ElementGroup { get; set; }
    public int Limit { get; set; }
    public bool EmitJson { get; set; }
}

public sealed class FindElementsReadResponse
{
    public FindElementsReadResponse()
    {
        Payload = new Dictionary<string, object>(StringComparer.Ordinal);
        Matches = new List<Dictionary<string, object>>();
        DatabaseRef = null;
    }

    public Dictionary<string, object> Payload { get; set; }
    public IList<Dictionary<string, object>> Matches { get; set; }
    public AscetDatabaseRef DatabaseRef { get; set; }
}

public sealed class FindElementsReadService
{
    private readonly ComponentReadService _componentReadService;
    private readonly MethodReadService _methodReadService;
    private readonly IImplementationReadService _implementationReadService;

    public FindElementsReadService()
        : this(new ComponentReadService(), new MethodReadService(), new ImplementationReadService())
    {
    }

    internal FindElementsReadService(
        ComponentReadService componentReadService,
        MethodReadService methodReadService,
        IImplementationReadService implementationReadService)
    {
        _componentReadService = componentReadService ?? new ComponentReadService();
        _methodReadService = methodReadService ?? new MethodReadService();
        _implementationReadService = implementationReadService ?? new ImplementationReadService();
    }

    public FindElementsReadRequest ParseExecArguments(string[] args)
    {
        if (args == null || args.Length < 1)
        {
            throw new AscetReadException("invalid_argument", "parse_arguments", GetUsage());
        }

        FindElementsReadRequest request = new FindElementsReadRequest();
        request.Query = AscetDatabaseExplorerCommon.NormalizeQuery(args[0]);

        for (int i = 1; i < args.Length; i++)
        {
            string argument = args[i] ?? String.Empty;
            if (String.Equals(argument, "--json", StringComparison.OrdinalIgnoreCase))
            {
                request.EmitJson = true;
                continue;
            }

            if (String.Equals(argument, "--scope", StringComparison.OrdinalIgnoreCase))
            {
                if (i + 1 >= args.Length)
                {
                    throw new AscetReadException("invalid_argument", "parse_arguments", "Missing value after --scope.");
                }

                request.ScopePath = NormalizeOptionalFolderPath(args[++i]);
                continue;
            }

            if (String.Equals(argument, "--kind", StringComparison.OrdinalIgnoreCase))
            {
                if (i + 1 >= args.Length)
                {
                    throw new AscetReadException("invalid_argument", "parse_arguments", "Missing value after --kind.");
                }

                request.Kind = AscetDatabaseExplorerCommon.ParseKind(args[++i]);
                continue;
            }

            if (String.Equals(argument, "--group", StringComparison.OrdinalIgnoreCase))
            {
                if (i + 1 >= args.Length)
                {
                    throw new AscetReadException("invalid_argument", "parse_arguments", "Missing value after --group.");
                }

                request.ElementGroup = NormalizeGroup(args[++i]);
                continue;
            }

            if (String.Equals(argument, "--limit", StringComparison.OrdinalIgnoreCase))
            {
                if (i + 1 >= args.Length)
                {
                    throw new AscetReadException("invalid_argument", "parse_arguments", "Missing value after --limit.");
                }

                request.Limit = AscetDatabaseExplorerCommon.ParsePositiveInt(args[++i], "limit", 20);
                continue;
            }

            throw new AscetReadException("invalid_argument", "parse_arguments", "Unknown argument '" + argument + "'.");
        }

        return request;
    }

    public FindElementsReadRequest ParsePayload(IDictionary<string, object> payload)
    {
        if (payload == null)
        {
            throw new AscetReadException("invalid_argument", "parse_payload", "Field 'query' is required.");
        }

        FindElementsReadRequest request = new FindElementsReadRequest();
        request.Query = AscetDatabaseExplorerCommon.NormalizeQuery(GetString(payload, "query"));
        request.ScopePath = NormalizeOptionalFolderPath(FirstNonEmpty(GetString(payload, "scopePath"), GetString(payload, "scope")));
        request.Kind = ParsePayloadKind(payload, "kind");
        request.ElementGroup = NormalizeGroupAllowEmpty(GetString(payload, "group"));
        request.Limit = ParsePayloadLimit(payload, "limit", 20);
        request.EmitJson = true;
        return request;
    }

    public FindElementsReadResponse ReadCurrentDatabase(FindElementsReadRequest request)
    {
        AscetSession session = null;

        try
        {
            session = new AscetSessionFactory().OpenCurrentDatabaseSession() as AscetSession;
            if (session == null)
            {
                throw new AscetReadException("tool_connect_failed", "find_elements", "Failed to open ASCET session.");
            }

            AscetDataBase database = session.GetCurrentDatabaseHandle();
            if (database == null)
            {
                throw new AscetReadException("database_not_open", "find_elements", "GetCurrentDataBase returned null. Open a database in ASCET first.");
            }

            AscetDatabaseRef databaseRef = AscetDatabaseIdentityResolver.Resolve(database, session.GetToolHandle());

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

    public FindElementsReadResponse ReadBoundDatabase(FindElementsReadRequest request, AscetDataBase databaseHandle, AscetDatabaseRef databaseRef)
    {
        if (databaseHandle == null)
        {
            throw new AscetReadException("database_not_open", "find_elements", "No ASCET database is open.");
        }

        FindElementsReadRequest normalizedRequest = request ?? new FindElementsReadRequest();
        ComponentReadRequest componentRequest = new ComponentReadRequest();
        componentRequest.FolderPath = normalizedRequest.ScopePath ?? String.Empty;
        componentRequest.Kind = normalizedRequest.Kind;
        componentRequest.Query = String.Empty;
        componentRequest.Limit = 0;
        componentRequest.Recursive = true;

        ComponentReadResponse components = _componentReadService.ReadBoundDatabase(componentRequest, databaseHandle, databaseRef);
        List<Dictionary<string, object>> matches = FindMatches(normalizedRequest, components == null ? null : components.Items, databaseHandle);

        FindElementsReadResponse response = new FindElementsReadResponse();
        response.DatabaseRef = CloneDatabaseRef(databaseRef);
        response.Matches = matches;
        response.Payload = BuildPayload(normalizedRequest, matches);
        return response;
    }

    public List<Dictionary<string, object>> FindMatches(FindElementsReadRequest request, IList<AscetItemRef> components, AscetDataBase databaseHandle)
    {
        List<Dictionary<string, object>> matches = new List<Dictionary<string, object>>();
        FindElementsReadRequest normalizedRequest = request ?? new FindElementsReadRequest();
        string normalizedQuery = (normalizedRequest.Query ?? String.Empty).Trim().ToLowerInvariant();

        if (components == null)
        {
            return matches;
        }

        for (int i = 0; i < components.Count; i++)
        {
            AscetItemRef component = components[i];
            if (component == null || String.IsNullOrWhiteSpace(component.Path))
            {
                continue;
            }

            if (!ShouldSearchComponentSnapshot(component))
            {
                continue;
            }

            try
            {
                AddMethodMatches(matches, component, normalizedRequest.ElementGroup, normalizedQuery, normalizedRequest.Limit, databaseHandle);
                AddImplementationMatches(matches, component, normalizedRequest.ElementGroup, normalizedQuery, normalizedRequest.Limit, databaseHandle);
            }
            catch (Exception ex)
            {
                if (!ShouldIgnoreSnapshotFailure(ex))
                {
                    throw;
                }
            }

            if (normalizedRequest.Limit > 0 && matches.Count >= normalizedRequest.Limit)
            {
                break;
            }
        }

        return DeduplicateMatches(matches, normalizedRequest.Limit);
    }

    public static string NormalizeGroup(string value)
    {
        string normalized = (value ?? String.Empty).Trim().ToLowerInvariant();
        switch (normalized)
        {
            case "all":
            case "methods":
            case "components":
            case "arrays":
            case "parameters":
            case "variables":
                return normalized;
            default:
                throw new AscetReadException("invalid_argument", "group", "Unsupported group '" + value + "'.");
        }
    }

    public static bool ShouldSearchComponentSnapshot(AscetItemRef component)
    {
        if (component == null)
        {
            return false;
        }

        if (component.Kind == AscetComponentKind.Unknown ||
            component.Kind == AscetComponentKind.Project ||
            component.Kind == AscetComponentKind.Folder)
        {
            return false;
        }

        return true;
    }

    public static bool ShouldIgnoreSnapshotFailure(Exception ex)
    {
        AscetReadException ascetEx = ex as AscetReadException;
        if (ascetEx == null)
        {
            return false;
        }

        if (String.Equals(ascetEx.Code, "target_is_folder", StringComparison.Ordinal) ||
            String.Equals(ascetEx.Code, "unsupported_component_kind", StringComparison.Ordinal) ||
            String.Equals(ascetEx.Code, "implementation_not_found", StringComparison.Ordinal))
        {
            return true;
        }

        if ((String.Equals(ascetEx.Code, "child_command_failed", StringComparison.Ordinal) ||
                String.Equals(ascetEx.Code, "legacy_proxy_failed", StringComparison.Ordinal)) &&
            ascetEx.Message != null &&
            ascetEx.Message.IndexOf("target_is_folder", StringComparison.OrdinalIgnoreCase) >= 0)
        {
            return true;
        }

        return false;
    }

    public static List<Dictionary<string, object>> DeduplicateMatches(IList<Dictionary<string, object>> matches)
    {
        return DeduplicateMatches(matches, 0);
    }

    public static List<Dictionary<string, object>> DeduplicateMatches(IList<Dictionary<string, object>> matches, int limit)
    {
        List<Dictionary<string, object>> result = new List<Dictionary<string, object>>();
        Dictionary<string, bool> seen = new Dictionary<string, bool>(StringComparer.Ordinal);
        if (matches == null)
        {
            return result;
        }

        for (int i = 0; i < matches.Count; i++)
        {
            Dictionary<string, object> match = matches[i];
            if (match == null)
            {
                continue;
            }

            string key = AscetDatabaseExplorerCommon.GetString(match, "group")
                + "\n" + AscetDatabaseExplorerCommon.GetString(match, "componentPath")
                + "\n" + AscetDatabaseExplorerCommon.GetString(match, "elementName")
                + "\n" + AscetDatabaseExplorerCommon.GetString(match, "elementKind")
                + "\n" + AscetDatabaseExplorerCommon.GetString(match, "path");
            if (seen.ContainsKey(key))
            {
                continue;
            }

            seen[key] = true;
            result.Add(match);
            if (limit > 0 && result.Count >= limit)
            {
                break;
            }
        }

        return result;
    }

    public static Dictionary<string, object> BuildPayload(FindElementsReadRequest request, IList<Dictionary<string, object>> matches)
    {
        FindElementsReadRequest normalizedRequest = request ?? new FindElementsReadRequest();
        Dictionary<string, object> payload = new Dictionary<string, object>();
        payload["query"] = normalizedRequest.Query ?? String.Empty;
        payload["scopePath"] = normalizedRequest.ScopePath ?? String.Empty;

        Dictionary<string, object> filters = new Dictionary<string, object>();
        filters["kind"] = AscetDatabaseExplorerCommon.KindToSchema(normalizedRequest.Kind);
        filters["group"] = normalizedRequest.ElementGroup ?? String.Empty;
        filters["limit"] = normalizedRequest.Limit;
        payload["filters"] = filters;

        Dictionary<string, object> counts = new Dictionary<string, object>();
        counts["matches"] = matches == null ? 0 : matches.Count;
        counts["methods"] = CountGroup(matches, "methods");
        counts["components"] = CountGroup(matches, "components");
        counts["arrays"] = CountGroup(matches, "arrays");
        counts["parameters"] = CountGroup(matches, "parameters");
        counts["variables"] = CountGroup(matches, "variables");
        payload["counts"] = counts;
        payload["matches"] = matches ?? new List<Dictionary<string, object>>();
        return payload;
    }

    private void AddMethodMatches(
        IList<Dictionary<string, object>> matches,
        AscetItemRef component,
        string group,
        string normalizedQuery,
        int limit,
        AscetDataBase databaseHandle)
    {
        if (group != "all" && group != "methods")
        {
            return;
        }

        MethodReadRequest request = new MethodReadRequest();
        request.ComponentPath = component.Path ?? String.Empty;
        MethodReadResponse response = _methodReadService.ReadBoundDatabase(request, databaseHandle, null);
        IList<AscetMethodRef> methods = response == null ? null : response.Methods;
        if (methods == null)
        {
            return;
        }

        for (int i = 0; i < methods.Count; i++)
        {
            AscetMethodRef method = methods[i];
            if (method == null)
            {
                continue;
            }

            string methodName = method.Name ?? String.Empty;
            string haystack = ((component.Path ?? String.Empty) + "\n" + methodName).ToLowerInvariant();
            if (haystack.IndexOf(normalizedQuery, StringComparison.Ordinal) < 0)
            {
                continue;
            }

            Dictionary<string, object> match = new Dictionary<string, object>();
            match["group"] = "methods";
            match["componentPath"] = component.Path ?? String.Empty;
            match["componentKind"] = AscetDatabaseExplorerCommon.KindToSchema(component.Kind);
            match["componentLanguageKind"] = component.LanguageKind.ToString();
            match["elementName"] = methodName;
            match["elementKind"] = method.MethodKind.ToString();
            match["displayType"] = String.Empty;
            match["displayScope"] = String.Empty;
            match["referencedComponentPath"] = String.Empty;
            match["path"] = (component.Path ?? String.Empty) + "::" + methodName;
            matches.Add(match);

            if (limit > 0 && matches.Count >= limit)
            {
                return;
            }
        }
    }

    private void AddImplementationMatches(
        IList<Dictionary<string, object>> matches,
        AscetItemRef component,
        string group,
        string normalizedQuery,
        int limit,
        AscetDataBase databaseHandle)
    {
        if (group == "methods")
        {
            return;
        }

        AscetImplementationSnapshot snapshot = _implementationReadService.ReadBoundDatabase(
            component,
            AscetImplementationReadMode.Default,
            String.Empty,
            databaseHandle);
        string json = AscetReadImplementation.FormatJsonOutput(snapshot);
        Dictionary<string, object> implementation = AscetJsonContract.DeserializeObject(json);
        IList<Dictionary<string, object>> elements = AscetDatabaseExplorerCommon.FlattenImplementationElements(
            implementation == null ? null : implementation["Elements"]);

        for (int i = 0; i < elements.Count; i++)
        {
            Dictionary<string, object> element = elements[i];
            if (element == null)
            {
                continue;
            }

            string guessedGroup = AscetDatabaseExplorerCommon.GuessElementGroup(element);
            if (group != "all" && group != guessedGroup)
            {
                continue;
            }

            string elementName = AscetDatabaseExplorerCommon.GetString(element, "ElementName");
            string displayType = AscetDatabaseExplorerCommon.GetString(element, "DisplayType");
            string displayScope = AscetDatabaseExplorerCommon.GetString(element, "DisplayScope");
            string referencedComponentPath = AscetDatabaseExplorerCommon.GetString(element, "ReferencedComponentPath");
            string haystack = ((component.Path ?? String.Empty) + "\n" + elementName + "\n" + displayType + "\n" + displayScope + "\n" + referencedComponentPath).ToLowerInvariant();
            if (haystack.IndexOf(normalizedQuery, StringComparison.Ordinal) < 0)
            {
                continue;
            }

            Dictionary<string, object> match = new Dictionary<string, object>();
            match["group"] = guessedGroup;
            match["componentPath"] = component.Path ?? String.Empty;
            match["componentKind"] = AscetDatabaseExplorerCommon.KindToSchema(component.Kind);
            match["componentLanguageKind"] = component.LanguageKind.ToString();
            match["elementName"] = elementName;
            match["elementKind"] = AscetDatabaseExplorerCommon.FirstNonEmpty(
                AscetDatabaseExplorerCommon.GetString(element, "DisplayKind"),
                AscetDatabaseExplorerCommon.GetString(element, "ElementKind"));
            match["displayType"] = displayType;
            match["displayScope"] = displayScope;
            match["referencedComponentPath"] = referencedComponentPath;
            match["path"] = (component.Path ?? String.Empty) + "::" + elementName;
            matches.Add(match);

            if (limit > 0 && matches.Count >= limit)
            {
                return;
            }
        }
    }

    private static string NormalizeOptionalFolderPath(string folderPath)
    {
        if (String.IsNullOrWhiteSpace(folderPath))
        {
            return String.Empty;
        }

        return AscetDatabaseExplorerCommon.NormalizeFolderPath(folderPath);
    }

    private static string NormalizeGroupAllowEmpty(string value)
    {
        if (String.IsNullOrWhiteSpace(value))
        {
            return "all";
        }

        return NormalizeGroup(value);
    }

    private static AscetComponentKind ParsePayloadKind(IDictionary<string, object> payload, string key)
    {
        string raw = GetString(payload, key);
        if (String.IsNullOrWhiteSpace(raw))
        {
            return AscetComponentKind.Unknown;
        }

        return AscetDatabaseExplorerCommon.ParseKind(raw);
    }

    private static int ParsePayloadLimit(IDictionary<string, object> payload, string key, int defaultValue)
    {
        if (payload == null || !payload.ContainsKey(key) || payload[key] == null)
        {
            return defaultValue;
        }

        return AscetDatabaseExplorerCommon.ParsePositiveInt(Convert.ToString(payload[key]), key, defaultValue);
    }

    private static int CountGroup(IList<Dictionary<string, object>> matches, string expectedGroup)
    {
        if (matches == null)
        {
            return 0;
        }

        int count = 0;
        for (int i = 0; i < matches.Count; i++)
        {
            Dictionary<string, object> match = matches[i];
            if (match == null)
            {
                continue;
            }

            if (String.Equals(AscetDatabaseExplorerCommon.GetString(match, "group"), expectedGroup, StringComparison.Ordinal))
            {
                count++;
            }
        }

        return count;
    }

    private static string FirstNonEmpty(params string[] values)
    {
        return AscetDatabaseExplorerCommon.FirstNonEmpty(values);
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
        clone.CanonicalPath = databaseRef.CanonicalPath;
        clone.IdentityStatus = databaseRef.IdentityStatus;
        clone.IdentityIssues = databaseRef.IdentityIssues == null ? null : new List<string>(databaseRef.IdentityIssues);
        return clone;
    }

    private static string GetUsage()
    {
        return "usage: AscetCli.exe exec find_elements <query> [--scope <folder-path>] [--kind <class|module|statemachine>] [--group <methods|components|arrays|parameters|variables|all>] [--limit <n>] [--json]";
    }
}
