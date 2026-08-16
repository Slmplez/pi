using System;
using System.Collections;
using System.Collections.Generic;
using System.Reflection;
using de.etas.cebra.toolAPI.Ascet;

public sealed class FolderReadRequest
{
    public FolderReadRequest()
    {
        RootPath = String.Empty;
        Depth = 1;
    }

    public string RootPath { get; set; }
    public int Depth { get; set; }
}

public sealed class FolderReadResponse
{
    public FolderReadResponse()
    {
        Payload = new Dictionary<string, object>(StringComparer.Ordinal);
        DatabaseRef = null;
    }

    public Dictionary<string, object> Payload { get; set; }
    public AscetDatabaseRef DatabaseRef { get; set; }
}

public sealed class FolderReadService
{
    private readonly ComponentReadService _componentReader = new ComponentReadService();

    public FolderReadRequest ParseExecArguments(string[] args)
    {
        FolderReadRequest request = new FolderReadRequest();
        if (args == null)
        {
            return request;
        }

        for (int i = 0; i < args.Length; i++)
        {
            string argument = args[i] ?? String.Empty;
            if (String.Equals(argument, "--json", StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            if (String.Equals(argument, "--root", StringComparison.OrdinalIgnoreCase))
            {
                if (i + 1 >= args.Length)
                {
                    throw new AscetReadException("invalid_arguments", "list_folders", "list_folders requires a value after --root.");
                }

                request.RootPath = NormalizeFolderPath(args[++i]);
                continue;
            }

            if (String.Equals(argument, "--depth", StringComparison.OrdinalIgnoreCase))
            {
                if (i + 1 >= args.Length)
                {
                    throw new AscetReadException("invalid_arguments", "list_folders", "list_folders requires a value after --depth.");
                }

                int parsedDepth;
                if (!Int32.TryParse(args[++i], out parsedDepth) || parsedDepth < 0)
                {
                    throw new AscetReadException("invalid_arguments", "list_folders", "list_folders depth must be a non-negative integer.");
                }

                request.Depth = parsedDepth;
                continue;
            }

            throw new AscetReadException("invalid_arguments", "list_folders", "Unknown argument '" + argument + "' for list_folders.");
        }

        return request;
    }

    public FolderReadRequest ParsePayload(IDictionary<string, object> payload)
    {
        FolderReadRequest request = new FolderReadRequest();
        if (payload == null)
        {
            return request;
        }

        request.RootPath = NormalizeFolderPath(GetString(payload, "rootPath"));
        request.Depth = ValidateDepth(GetInt(payload, "depth", 1), "parse_payload");
        return request;
    }

    public FolderReadResponse ReadCurrentDatabase(FolderReadRequest request)
    {
        AscetSession session = null;

        try
        {
            session = new AscetSessionFactory().OpenCurrentDatabaseSession() as AscetSession;
            if (session == null)
            {
                throw new AscetReadException("tool_connect_failed", "list_folders", "Failed to open ASCET session.");
            }

            AscetDataBase database = session.GetCurrentDatabaseHandle();
            if (database == null)
            {
                throw new AscetReadException("database_not_open", "list_folders", "GetCurrentDataBase returned null. Open a database in ASCET first.");
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

    public FolderReadResponse ReadBoundDatabase(FolderReadRequest request, AscetDataBase databaseHandle, AscetDatabaseRef databaseRef)
    {
        FolderReadRequest normalizedRequest = request ?? new FolderReadRequest();
        FolderTreeNode tree = BuildTree(normalizedRequest, databaseHandle);

        FolderReadResponse response = new FolderReadResponse();
        response.DatabaseRef = CloneDatabaseRef(databaseRef);
        response.Payload = BuildPayload(normalizedRequest, tree);
        return response;
    }

    private FolderTreeNode BuildTree(FolderReadRequest request, AscetDataBase database)
    {
        if (database == null)
        {
            throw new AscetReadException("database_not_open", "list_folders", "No ASCET database is open.");
        }

        if (String.IsNullOrWhiteSpace(request == null ? null : request.RootPath))
        {
            FolderTreeNode root = new FolderTreeNode();
            root.Name = String.Empty;
            root.Path = String.Empty;
            root.Children = new List<FolderTreeNode>();

            AscetFolder[] topFolders = database.GetAllAscetFolders();
            if (topFolders != null)
            {
                for (int i = 0; i < topFolders.Length; i++)
                {
                    AscetFolder folder = topFolders[i];
                    if (folder != null)
                    {
                        root.Children.Add(BuildFolderNode(folder, request == null ? 1 : request.Depth, database));
                    }
                }
            }

            return root;
        }

        AscetFolder resolved = ResolveFolder(database, request.RootPath);
        return BuildFolderNode(resolved, request.Depth, database);
    }

    private FolderTreeNode BuildFolderNode(AscetFolder folder, int depth, AscetDataBase database)
    {
        string path = folder == null ? String.Empty : (folder.GetNameWithPath() ?? String.Empty);
        FolderTreeNode node = new FolderTreeNode();
        node.Name = folder == null ? String.Empty : (folder.GetName() ?? String.Empty);
        node.DisplayName = folder == null ? String.Empty : (folder.GetName() ?? String.Empty);
        node.Path = path;
        node.ParentPath = GetParentPath(path);
        node.OwnerKind = GetFolderOwnerKind(path);
        node.AvailableGroups = new string[] { "folders", "projects", "components" };
        node.Counts = CreateFolderCounts(0);
        node.Children = new List<FolderTreeNode>();

        if (folder == null || depth <= 0)
        {
            return node;
        }

        IList<AscetFolder> children = GetChildFolders(folder);
        for (int i = 0; i < children.Count; i++)
        {
            AscetFolder child = children[i];
            if (child != null)
            {
                node.Children.Add(BuildFolderNode(child, depth - 1, database));
            }
        }

        if (node.Children.Count == 0)
        {
            IList<FolderTreeNode> componentFolderNodes = BuildChildFolderNodesFromComponents(folder, database, depth - 1);
            for (int i = 0; i < componentFolderNodes.Count; i++)
            {
                node.Children.Add(componentFolderNodes[i]);
            }
        }

        node.Counts = CreateFolderCounts(node.Children.Count);
        return node;
    }

    private IList<FolderTreeNode> BuildChildFolderNodesFromComponents(AscetFolder folder, AscetDataBase database, int depth)
    {
        List<FolderTreeNode> result = new List<FolderTreeNode>();
        if (folder == null || database == null)
        {
            return result;
        }

        string folderPath = folder.GetNameWithPath() ?? String.Empty;
        if (String.IsNullOrWhiteSpace(folderPath))
        {
            return result;
        }

        ComponentReadRequest componentRequest = new ComponentReadRequest();
        componentRequest.FolderPath = folderPath;
        componentRequest.Kind = AscetComponentKind.Unknown;
        componentRequest.Query = String.Empty;
        componentRequest.Limit = 0;
        componentRequest.Recursive = false;

        ComponentReadResponse componentResponse = _componentReader.ReadBoundDatabase(componentRequest, database, null);
        IList<AscetItemRef> items = componentResponse == null ? null : componentResponse.Items;
        if (items == null)
        {
            return result;
        }

        Dictionary<string, bool> seen = new Dictionary<string, bool>(StringComparer.Ordinal);
        for (int i = 0; i < items.Count; i++)
        {
            AscetItemRef item = items[i];
            if (item == null || String.IsNullOrWhiteSpace(item.Path))
            {
                continue;
            }

            if (item.Kind != AscetComponentKind.Project && item.Kind != AscetComponentKind.Container)
            {
                continue;
            }

            string itemPath = NormalizeFolderPath(item.Path);
            if (!String.Equals(GetParentPath(itemPath), folderPath, StringComparison.Ordinal))
            {
                continue;
            }

            if (seen.ContainsKey(itemPath))
            {
                continue;
            }

            AscetFolder childFolder = null;
            try
            {
                childFolder = ResolveFolder(database, itemPath);
            }
            catch
            {
                childFolder = null;
            }

            if (childFolder == null)
            {
                continue;
            }

            seen[itemPath] = true;
            result.Add(BuildFolderNode(childFolder, depth, database));
        }

        return result;
    }

    private AscetFolder ResolveFolder(AscetDataBase database, string folderPath)
    {
        IList<AscetFolder> currentLevel = GetTopFolders(database);
        if (currentLevel.Count == 0)
        {
            throw new AscetReadException("folder_not_found", "resolve_folder", "Folder '" + folderPath + "' was not found.");
        }

        string[] segments = folderPath.Split(new char[] { '\\' }, StringSplitOptions.RemoveEmptyEntries);
        AscetFolder current = null;

        for (int i = 0; i < segments.Length; i++)
        {
            current = FindFolderByName(currentLevel, segments[i]);
            if (current == null)
            {
                throw new AscetReadException("folder_not_found", "resolve_folder", "Folder '" + folderPath + "' was not found.");
            }

            currentLevel = GetChildFolders(current);
        }

        return current;
    }

    private static IList<AscetFolder> GetTopFolders(AscetDataBase database)
    {
        List<AscetFolder> result = new List<AscetFolder>();
        if (database == null)
        {
            return result;
        }

        AscetFolder[] folders = database.GetAllAscetFolders();
        if (folders == null)
        {
            return result;
        }

        for (int i = 0; i < folders.Length; i++)
        {
            AscetFolder folder = folders[i];
            if (folder != null)
            {
                result.Add(folder);
            }
        }

        return result;
    }

    private static IList<AscetFolder> GetChildFolders(AscetFolder folder)
    {
        List<AscetFolder> result = new List<AscetFolder>();
        if (folder == null)
        {
            return result;
        }

        foreach (string methodName in new string[] { "GetAllAscetFolders", "GetAllFolders", "GetAllSubFolders", "GetSubFolders" })
        {
            MethodInfo method = folder.GetType().GetMethod(methodName, BindingFlags.Instance | BindingFlags.Public);
            if (method == null)
            {
                continue;
            }

            Array folders = method.Invoke(folder, null) as Array;
            if (folders == null)
            {
                continue;
            }

            for (int i = 0; i < folders.Length; i++)
            {
                AscetFolder child = folders.GetValue(i) as AscetFolder;
                if (child != null)
                {
                    result.Add(child);
                }
            }

            break;
        }

        return result;
    }

    private static AscetFolder FindFolderByName(IList<AscetFolder> folders, string name)
    {
        if (folders == null)
        {
            return null;
        }

        for (int i = 0; i < folders.Count; i++)
        {
            AscetFolder folder = folders[i];
            if (folder != null && String.Equals(folder.GetName(), name, StringComparison.Ordinal))
            {
                return folder;
            }
        }

        return null;
    }

    private static Dictionary<string, object> BuildPayload(FolderReadRequest request, FolderTreeNode tree)
    {
        Dictionary<string, object> counts = new Dictionary<string, object>();
        counts["folders"] = CountFolders(tree);
        counts["projects"] = 0;
        counts["components"] = 0;

        Dictionary<string, object> payload = new Dictionary<string, object>();
        payload["rootPath"] = request == null ? String.Empty : (request.RootPath ?? String.Empty);
        payload["depth"] = request == null ? 1 : request.Depth;
        payload["counts"] = counts;
        payload["folders"] = SerializeFolderNodes(
            String.IsNullOrWhiteSpace(request == null ? String.Empty : request.RootPath)
                ? (tree == null ? null : tree.Children)
                : new List<FolderTreeNode> { tree });
        return payload;
    }

    private static List<Dictionary<string, object>> SerializeFolderNodes(IList<FolderTreeNode> nodes)
    {
        List<Dictionary<string, object>> result = new List<Dictionary<string, object>>();
        if (nodes == null)
        {
            return result;
        }

        for (int i = 0; i < nodes.Count; i++)
        {
            FolderTreeNode node = nodes[i];
            if (node == null)
            {
                continue;
            }

            string path = node.Path ?? String.Empty;
            Dictionary<string, object> entry = new Dictionary<string, object>();
            entry["name"] = node.Name ?? String.Empty;
            entry["displayName"] = FirstNonEmpty(node.DisplayName, node.Name, GetLeafName(path));
            entry["path"] = path;
            entry["kind"] = "folder";
            entry["parentPath"] = FirstNonEmpty(node.ParentPath, GetParentPath(path));
            entry["ownerKind"] = FirstNonEmpty(node.OwnerKind, GetFolderOwnerKind(path));
            entry["targetKind"] = "container";
            entry["objectKind"] = "folder";
            entry["availableGroups"] = node.AvailableGroups ?? new string[] { "folders", "projects", "components" };
            entry["counts"] = node.Counts ?? CreateFolderCounts(node.Children == null ? 0 : node.Children.Count);
            entry["children"] = SerializeFolderNodes(node.Children);
            result.Add(entry);
        }

        return result;
    }

    private static int CountFolders(FolderTreeNode node)
    {
        if (node == null)
        {
            return 0;
        }

        int count = String.IsNullOrWhiteSpace(node.Path) ? 0 : 1;
        if (node.Children == null)
        {
            return count;
        }

        for (int i = 0; i < node.Children.Count; i++)
        {
            count += CountFolders(node.Children[i]);
        }

        return count;
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

    private static string GetFolderOwnerKind(string path)
    {
        return String.IsNullOrWhiteSpace(GetParentPath(path)) ? "workspace" : "folder";
    }

    private static string GetLeafName(string path)
    {
        if (String.IsNullOrWhiteSpace(path))
        {
            return String.Empty;
        }

        int index = path.LastIndexOf('\\');
        if (index < 0 || index == path.Length - 1)
        {
            return path;
        }

        return path.Substring(index + 1);
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

    private static Dictionary<string, object> CreateFolderCounts(int folderCount)
    {
        Dictionary<string, object> counts = new Dictionary<string, object>();
        counts["folders"] = folderCount < 0 ? 0 : folderCount;
        counts["projects"] = 0;
        counts["components"] = 0;
        return counts;
    }

    private static string NormalizeFolderPath(string folderPath)
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

    private static string GetString(IDictionary<string, object> payload, string key)
    {
        if (payload == null || String.IsNullOrWhiteSpace(key) || !payload.ContainsKey(key) || payload[key] == null)
        {
            return String.Empty;
        }

        return Convert.ToString(payload[key]) ?? String.Empty;
    }

    private static int GetInt(IDictionary<string, object> payload, string key, int defaultValue)
    {
        if (payload == null || String.IsNullOrWhiteSpace(key) || !payload.ContainsKey(key) || payload[key] == null)
        {
            return defaultValue;
        }

        try
        {
            return Convert.ToInt32(payload[key]);
        }
        catch
        {
            throw new AscetReadException("invalid_argument", "parse_payload", "Field '" + key + "' must be an integer.");
        }
    }

    private static int ValidateDepth(int depth, string operation)
    {
        if (depth < 0)
        {
            throw new AscetReadException(
                "invalid_arguments",
                String.IsNullOrWhiteSpace(operation) ? "list_folders" : operation,
                "list_folders depth must be a non-negative integer.");
        }

        return depth;
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

    private sealed class FolderTreeNode
    {
        public string Name { get; set; }
        public string DisplayName { get; set; }
        public string Path { get; set; }
        public string ParentPath { get; set; }
        public string OwnerKind { get; set; }
        public string[] AvailableGroups { get; set; }
        public Dictionary<string, object> Counts { get; set; }
        public IList<FolderTreeNode> Children { get; set; }
    }
}
