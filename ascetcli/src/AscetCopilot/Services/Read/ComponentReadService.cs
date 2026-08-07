using System;
using System.Collections;
using System.Collections.Generic;
using System.Reflection;
using de.etas.cebra.toolAPI.Ascet;
using de.etas.cebra.toolAPI.Common;

public sealed class ComponentReadRequest
{
    public ComponentReadRequest()
    {
        FolderPath = String.Empty;
        Kind = AscetComponentKind.Unknown;
        Query = String.Empty;
        LanguageKind = "all";
        Limit = 0;
        Recursive = false;
    }

    public string FolderPath { get; set; }
    public AscetComponentKind Kind { get; set; }
    public string Query { get; set; }
    public string LanguageKind { get; set; }
    public int Limit { get; set; }
    public bool Recursive { get; set; }
}

public sealed class ComponentReadResponse
{
    public ComponentReadResponse()
    {
        Payload = new Dictionary<string, object>(StringComparer.Ordinal);
        Items = new List<AscetItemRef>();
        DatabaseRef = null;
    }

    public Dictionary<string, object> Payload { get; set; }
    public IList<AscetItemRef> Items { get; set; }
    public AscetDatabaseRef DatabaseRef { get; set; }
}

public sealed class ComponentReadService
{
    private readonly ComponentClassifier _classifier;

    public ComponentReadService()
        : this(new ComponentClassifier())
    {
    }

    internal ComponentReadService(ComponentClassifier classifier)
    {
        _classifier = classifier ?? new ComponentClassifier();
    }

    public ComponentReadRequest ParseExecArguments(string[] args)
    {
        if (args == null || args.Length < 1)
        {
            throw new AscetReadException("invalid_argument", "parse_arguments", GetUsage());
        }

        ComponentReadRequest request = new ComponentReadRequest();
        request.FolderPath = NormalizeListComponentsFolderPath(args[0]);

        for (int i = 1; i < args.Length; i++)
        {
            string argument = args[i] ?? String.Empty;
            if (String.Equals(argument, "--json", StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            if (String.Equals(argument, "--recursive", StringComparison.OrdinalIgnoreCase))
            {
                request.Recursive = true;
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

            if (String.Equals(argument, "--query", StringComparison.OrdinalIgnoreCase))
            {
                if (i + 1 >= args.Length)
                {
                    throw new AscetReadException("invalid_argument", "parse_arguments", "Missing value after --query.");
                }

                request.Query = AscetDatabaseExplorerCommon.NormalizeQuery(args[++i]);
                continue;
            }

            if (String.Equals(argument, "--language-kind", StringComparison.OrdinalIgnoreCase))
            {
                if (i + 1 >= args.Length)
                {
                    throw new AscetReadException("invalid_argument", "parse_arguments", "Missing value after --language-kind.");
                }

                request.LanguageKind = NormalizeLanguageKind(args[++i]);
                continue;
            }

            if (String.Equals(argument, "--limit", StringComparison.OrdinalIgnoreCase))
            {
                if (i + 1 >= args.Length)
                {
                    throw new AscetReadException("invalid_argument", "parse_arguments", "Missing value after --limit.");
                }

                request.Limit = AscetDatabaseExplorerCommon.ParsePositiveInt(args[++i], "limit", 0);
                continue;
            }

            throw new AscetReadException("invalid_argument", "parse_arguments", "Unknown argument '" + argument + "'.");
        }

        return request;
    }

    public ComponentReadRequest ParsePayload(IDictionary<string, object> payload)
    {
        ComponentReadRequest request = new ComponentReadRequest();
        if (payload == null)
        {
            return request;
        }

        request.FolderPath = NormalizeOptionalFolderPath(GetString(payload, "folderPath"));
        request.Kind = ParsePayloadKind(payload, "kind");
        request.Query = ParsePayloadQuery(payload, "query");
        request.LanguageKind = NormalizeLanguageKind(GetString(payload, "languageKind"));
        request.Limit = ParsePayloadLimit(payload, "limit");
        request.Recursive = GetBool(payload, "recursive", false);
        return request;
    }

    public ComponentReadResponse ReadCurrentDatabase(ComponentReadRequest request)
    {
        AscetSession session = null;

        try
        {
            session = new AscetSessionFactory().OpenCurrentDatabaseSession() as AscetSession;
            if (session == null)
            {
                throw new AscetReadException("tool_connect_failed", "component_catalog_read", "Failed to open ASCET session.");
            }

            AscetDataBase database = session.GetCurrentDatabaseHandle();
            if (database == null)
            {
                throw new AscetReadException("database_not_open", "component_catalog_read", "GetCurrentDataBase returned null. Open a database in ASCET first.");
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

    public ComponentReadResponse ReadBoundDatabase(ComponentReadRequest request, AscetDataBase databaseHandle, AscetDatabaseRef databaseRef)
    {
        ComponentReadRequest normalizedRequest = request ?? new ComponentReadRequest();
        IList<AscetItemRef> filteredItems = ListFilteredItems(databaseHandle, normalizedRequest);

        ComponentReadResponse response = new ComponentReadResponse();
        response.DatabaseRef = CloneDatabaseRef(databaseRef);
        response.Items = filteredItems;
        response.Payload = BuildPayload(normalizedRequest, filteredItems);
        return response;
    }

    public Dictionary<string, object> BuildPayload(ComponentReadRequest request, IList<AscetItemRef> items)
    {
        ComponentReadRequest normalizedRequest = request ?? new ComponentReadRequest();
        List<Dictionary<string, object>> components = new List<Dictionary<string, object>>();
        if (items != null)
        {
            for (int i = 0; i < items.Count; i++)
            {
                AscetItemRef item = items[i];
                if (item != null)
                {
                    components.Add(BuildSerializableComponentItem(item));
                }
            }
        }

        Dictionary<string, object> payload = new Dictionary<string, object>();
        payload["folderPath"] = normalizedRequest.FolderPath ?? String.Empty;
        payload["filters"] = BuildFilters(normalizedRequest);
        payload["counts"] = BuildCounts(components);
        payload["items"] = components;
        return payload;
    }

    private IList<AscetItemRef> ListFilteredItems(AscetDataBase database, ComponentReadRequest request)
    {
        if (database == null)
        {
            throw new AscetReadException("database_not_open", "component_catalog_read", "No ASCET database is open.");
        }

        ComponentReadRequest normalizedRequest = request ?? new ComponentReadRequest();
        return ListItemsInFolder(database, normalizedRequest);
    }

    private IList<AscetItemRef> ListItemsInFolder(AscetDataBase database, ComponentReadRequest request)
    {
        List<AscetItemRef> result = new List<AscetItemRef>();
        Dictionary<string, bool> seen = new Dictionary<string, bool>(StringComparer.Ordinal);
        ComponentReadRequest normalizedRequest = request ?? new ComponentReadRequest();
        string folderPath = normalizedRequest.FolderPath;

        if (String.IsNullOrWhiteSpace(folderPath))
        {
            AscetFolder[] topFolders = database.GetAllAscetFolders();
            if (topFolders == null)
            {
                return result;
            }

            for (int i = 0; i < topFolders.Length; i++)
            {
                AscetFolder topFolder = topFolders[i];
                if (topFolder != null)
                {
                    AddFolderRef(topFolder, result, seen, normalizedRequest);
                    if (ShouldStopComponentCollection(result, normalizedRequest))
                    {
                        return result;
                    }

                    CollectFolderItems(topFolder, normalizedRequest.Recursive, result, seen, normalizedRequest);
                    if (ShouldStopComponentCollection(result, normalizedRequest))
                    {
                        return result;
                    }
                }
            }

            return result;
        }

        AscetFolder folder = ResolveFolder(database, folderPath);
        CollectFolderItems(folder, normalizedRequest.Recursive, result, seen, normalizedRequest);
        return result;
    }

    private void CollectFolderItems(AscetFolder folder, bool recursive, IList<AscetItemRef> result, IDictionary<string, bool> seen, ComponentReadRequest request)
    {
        if (folder == null || result == null || seen == null)
        {
            return;
        }

        Array items = InvokeFolderArray(folder, new string[] { "GetAllDataBaseItems", "GetAllItems", "GetAllComponents" });
        if (items != null)
        {
            for (int i = 0; i < items.Length; i++)
            {
                DataBaseItem item = items.GetValue(i) as DataBaseItem;
                if (item == null)
                {
                    continue;
                }

                AscetItemRef itemRef = _classifier.ToItemRef(item);
                if (itemRef == null || String.IsNullOrWhiteSpace(itemRef.Path) || seen.ContainsKey(itemRef.Path))
                {
                    continue;
                }

                seen[itemRef.Path] = true;
                AddFilteredItem(itemRef, result, request);
                if (ShouldStopComponentCollection(result, request))
                {
                    return;
                }
            }
        }

        if (ShouldStopComponentCollection(result, request))
        {
            return;
        }

        Array childFolders = InvokeFolderArray(folder, new string[] { "GetAllAscetFolders", "GetAllFolders", "GetAllSubFolders", "GetSubFolders" });
        if (childFolders == null)
        {
            return;
        }

        for (int i = 0; i < childFolders.Length; i++)
        {
            AscetFolder childFolder = childFolders.GetValue(i) as AscetFolder;
            if (childFolder != null)
            {
                AddFolderRef(childFolder, result, seen, request);
                if (ShouldStopComponentCollection(result, request))
                {
                    return;
                }

                if (recursive)
                {
                    CollectFolderItems(childFolder, true, result, seen, request);
                    if (ShouldStopComponentCollection(result, request))
                    {
                        return;
                    }
                }
            }
        }
    }

    private static void AddFolderRef(AscetFolder folder, IList<AscetItemRef> result, IDictionary<string, bool> seen, ComponentReadRequest request)
    {
        if (folder == null || result == null || seen == null)
        {
            return;
        }

        string path = folder.GetNameWithPath() ?? String.Empty;
        if (String.IsNullOrWhiteSpace(path) || seen.ContainsKey(path))
        {
            return;
        }

        seen[path] = true;
        AddFilteredItem(new AscetItemRef
        {
            Name = folder.GetName(),
            Path = path,
            Kind = AscetComponentKind.Folder,
            LanguageKind = AscetLanguageKind.Unknown
        }, result, request);
    }

    private static void AddFilteredItem(AscetItemRef item, IList<AscetItemRef> result, ComponentReadRequest request)
    {
        if (item == null || result == null)
        {
            return;
        }

        ComponentReadRequest normalizedRequest = request ?? new ComponentReadRequest();
        if (!AscetDatabaseExplorerCommon.ItemMatchesFilter(item, normalizedRequest.Kind, normalizedRequest.Query)
            || !MatchesLanguageKind(item, normalizedRequest.LanguageKind))
        {
            return;
        }

        result.Add(item);
    }

    private static bool ShouldStopComponentCollection(IList<AscetItemRef> result, ComponentReadRequest request)
    {
        if (result == null || request == null || request.Limit <= 0)
        {
            return false;
        }

        return result.Count >= request.Limit;
    }

    private static AscetFolder ResolveFolder(AscetDataBase database, string folderPath)
    {
        if (database == null)
        {
            throw new AscetReadException("invalid_argument", "resolve_folder", "Database must not be null.");
        }

        string normalizedPath = AscetDatabaseExplorerCommon.NormalizeFolderPath(folderPath);
        AscetFolder[] topFolders = database.GetAllAscetFolders();
        if (topFolders == null)
        {
            throw new AscetReadException("folder_not_found", "resolve_folder", "Folder '" + normalizedPath + "' was not found.");
        }

        string[] segments = normalizedPath.Split(new char[] { '\\' }, StringSplitOptions.RemoveEmptyEntries);
        AscetFolder current = null;
        Array currentLevel = topFolders;

        for (int i = 0; i < segments.Length; i++)
        {
            current = FindFolderByName(currentLevel, segments[i]);
            if (current == null)
            {
                throw new AscetReadException("folder_not_found", "resolve_folder", "Folder '" + normalizedPath + "' was not found.");
            }

            currentLevel = InvokeFolderArray(current, new string[] { "GetAllAscetFolders", "GetAllFolders", "GetAllSubFolders", "GetSubFolders" });
        }

        return current;
    }

    private static AscetFolder FindFolderByName(Array folders, string expectedName)
    {
        if (folders == null || String.IsNullOrWhiteSpace(expectedName))
        {
            return null;
        }

        for (int i = 0; i < folders.Length; i++)
        {
            AscetFolder folder = folders.GetValue(i) as AscetFolder;
            if (folder != null && String.Equals(folder.GetName(), expectedName, StringComparison.Ordinal))
            {
                return folder;
            }
        }

        return null;
    }

    private static Array InvokeFolderArray(object target, string[] methodNames)
    {
        if (target == null || methodNames == null)
        {
            return null;
        }

        for (int i = 0; i < methodNames.Length; i++)
        {
            string methodName = methodNames[i];
            if (String.IsNullOrWhiteSpace(methodName))
            {
                continue;
            }

            MethodInfo method = target.GetType().GetMethod(methodName, BindingFlags.Instance | BindingFlags.Public);
            if (method == null)
            {
                continue;
            }

            Array array = method.Invoke(target, null) as Array;
            if (array != null)
            {
                return array;
            }
        }

        return null;
    }

    private static string NormalizeLanguageKind(string value)
    {
        if (String.IsNullOrWhiteSpace(value) || String.Equals(value.Trim(), "all", StringComparison.OrdinalIgnoreCase))
        {
            return "all";
        }

        if (String.Equals(value.Trim(), "BDE", StringComparison.OrdinalIgnoreCase))
        {
            return "BDE";
        }

        if (String.Equals(value.Trim(), "ESDL", StringComparison.OrdinalIgnoreCase))
        {
            return "ESDL";
        }

        if (String.Equals(value.Trim(), "C", StringComparison.OrdinalIgnoreCase))
        {
            return "C";
        }

        if (String.Equals(value.Trim(), "Unknown", StringComparison.OrdinalIgnoreCase))
        {
            return "Unknown";
        }

        throw new AscetReadException("invalid_argument", "language_kind", "Unsupported languageKind '" + value + "'. Expected all, BDE, ESDL, C, or Unknown.");
    }

    private static bool MatchesLanguageKind(AscetItemRef item, string expectedLanguageKind)
    {
        string normalized = NormalizeLanguageKind(expectedLanguageKind);
        return String.Equals(normalized, "all", StringComparison.Ordinal)
            || (item != null && String.Equals(item.LanguageKind.ToString(), normalized, StringComparison.OrdinalIgnoreCase));
    }

    private static Dictionary<string, object> BuildFilters(ComponentReadRequest request)
    {
        Dictionary<string, object> filters = new Dictionary<string, object>();
        filters["kind"] = request == null ? "unknown" : AscetDatabaseExplorerCommon.KindToFilterSchema(request.Kind);
        filters["query"] = request == null ? String.Empty : (request.Query ?? String.Empty);
        filters["languageKind"] = request == null ? "all" : NormalizeLanguageKind(request.LanguageKind);
        filters["limit"] = request == null ? 0 : request.Limit;
        filters["recursive"] = request != null && request.Recursive;
        return filters;
    }

    private static Dictionary<string, object> BuildCounts(IList<Dictionary<string, object>> items)
    {
        Dictionary<string, object> counts = new Dictionary<string, object>();
        counts["items"] = items == null ? 0 : items.Count;
        counts["classes"] = CountKind(items, "class");
        counts["modules"] = CountKind(items, "module");
        counts["stateMachines"] = CountKind(items, "stateMachine");
        counts["projects"] = CountKind(items, "project");
        counts["continuousTimeBlocks"] = CountKind(items, "continuousTimeBlock");
        counts["enumerations"] = CountKind(items, "enumeration");
        counts["records"] = CountKind(items, "record");
        counts["icons"] = CountKind(items, "icon");
        counts["signals"] = CountKind(items, "signal");
        counts["containers"] = CountKind(items, "container");
        counts["folders"] = CountKind(items, "folder");
        return counts;
    }

    private static int CountKind(IList<Dictionary<string, object>> items, string expectedKind)
    {
        if (items == null)
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

            if (String.Equals(AscetDatabaseExplorerCommon.GetString(item, "kind"), expectedKind, StringComparison.Ordinal))
            {
                count++;
            }
        }

        return count;
    }

    private static Dictionary<string, object> BuildSerializableComponentItem(AscetItemRef item)
    {
        Dictionary<string, object> payload = AscetDatabaseExplorerCommon.BuildSerializableItem(item);
        string path = AscetDatabaseExplorerCommon.GetString(payload, "path");
        string schemaKind = AscetDatabaseExplorerCommon.GetString(payload, "kind");
        payload["displayName"] = AscetDatabaseExplorerCommon.FirstNonEmpty(
            AscetDatabaseExplorerCommon.GetString(payload, "name"),
            item == null ? String.Empty : (item.Name ?? String.Empty));
        string parentPath = GetParentPath(path);
        payload["parentPath"] = parentPath;
        payload["ownerKind"] = String.IsNullOrWhiteSpace(parentPath) ? "unknown" : "folder";
        payload["targetKind"] = IsContainerKind(schemaKind) ? "container" : "component";
        payload["objectKind"] = String.IsNullOrWhiteSpace(schemaKind) ? "unknown" : schemaKind;
        return payload;
    }

    private static bool IsContainerKind(string schemaKind)
    {
        return String.Equals(schemaKind, "project", StringComparison.Ordinal)
            || String.Equals(schemaKind, "folder", StringComparison.Ordinal)
            || String.Equals(schemaKind, "container", StringComparison.Ordinal);
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

    private static string NormalizeOptionalFolderPath(string folderPath)
    {
        return NormalizeListComponentsFolderPath(folderPath);
    }

    private static string NormalizeListComponentsFolderPath(string folderPath)
    {
        string normalized = (folderPath ?? String.Empty).Trim().Replace('/', '\\');
        while (normalized.StartsWith("\\", StringComparison.Ordinal))
        {
            normalized = normalized.Substring(1);
        }

        while (normalized.EndsWith("\\", StringComparison.Ordinal))
        {
            normalized = normalized.Substring(0, normalized.Length - 1);
        }

        return normalized;
    }

    private static string ParsePayloadQuery(IDictionary<string, object> payload, string key)
    {
        if (payload == null || String.IsNullOrWhiteSpace(key) || !payload.ContainsKey(key) || payload[key] == null)
        {
            return String.Empty;
        }

        string query = Convert.ToString(payload[key]) ?? String.Empty;
        if (String.IsNullOrWhiteSpace(query))
        {
            return String.Empty;
        }

        return AscetDatabaseExplorerCommon.NormalizeQuery(query);
    }

    private static int ParsePayloadLimit(IDictionary<string, object> payload, string key)
    {
        if (payload == null || String.IsNullOrWhiteSpace(key) || !payload.ContainsKey(key) || payload[key] == null)
        {
            return 0;
        }

        object rawValue = payload[key];
        int limit;
        try
        {
            limit = Convert.ToInt32(rawValue);
        }
        catch
        {
            throw new AscetReadException("invalid_argument", "parse_payload", "Field '" + key + "' must be a positive integer.");
        }

        if (limit < 1)
        {
            throw new AscetReadException("invalid_argument", "parse_payload", "Field '" + key + "' must be a positive integer.");
        }

        return limit;
    }

    private static AscetComponentKind ParsePayloadKind(IDictionary<string, object> payload, string key)
    {
        if (payload == null || String.IsNullOrWhiteSpace(key) || !payload.ContainsKey(key) || payload[key] == null)
        {
            return AscetComponentKind.Unknown;
        }

        string raw = Convert.ToString(payload[key]) ?? String.Empty;
        if (String.IsNullOrWhiteSpace(raw))
        {
            return AscetComponentKind.Unknown;
        }

        return AscetDatabaseExplorerCommon.ParseKind(raw);
    }

    private static string GetString(IDictionary<string, object> payload, string key)
    {
        if (payload == null || String.IsNullOrWhiteSpace(key) || !payload.ContainsKey(key) || payload[key] == null)
        {
            return String.Empty;
        }

        return Convert.ToString(payload[key]) ?? String.Empty;
    }

    private static bool GetBool(IDictionary<string, object> payload, string key, bool defaultValue)
    {
        if (payload == null || String.IsNullOrWhiteSpace(key) || !payload.ContainsKey(key) || payload[key] == null)
        {
            return defaultValue;
        }

        object value = payload[key];
        if (value is bool)
        {
            return (bool)value;
        }

        bool parsed;
        if (Boolean.TryParse(Convert.ToString(value), out parsed))
        {
            return parsed;
        }

        throw new AscetReadException("invalid_argument", "parse_payload", "Field '" + key + "' must be a boolean.");
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
            return "usage: AscetCli.exe exec component_catalog_read <folder-path> [--kind <all|folder|class|module|statemachine|project|continuous-time-block|enumeration|record|icon|signal|container>] [--language-kind <all|BDE|ESDL|C|Unknown>] [--query <text>] [--limit <n>] [--recursive] [--json]";
    }
}
