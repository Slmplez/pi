using System;
using System.Collections.Generic;
using System.IO;
using System.Text;

public sealed class AscetListFoldersArguments
{
    public string RootPath { get; set; }
    public int Depth { get; set; }
    public bool EmitJson { get; set; }
}

public static class AscetListFolders
{
    public static int Main(string[] args)
    {
        TextWriter originalOut = Console.Out;
        StringWriter suppressedOut = null;

        try
        {
            AscetListFoldersArguments arguments = ParseArguments(args);
            if (arguments.EmitJson)
            {
                suppressedOut = new StringWriter();
                Console.SetOut(suppressedOut);
            }

            AscetToolApiBootstrap.ConfigureAssemblyResolution();
            FolderReadService service = new FolderReadService();
            FolderReadResponse response = service.ReadCurrentDatabase(ToRequest(arguments));
            string output = arguments.EmitJson
                ? AscetDatabaseExplorerCommon.Serialize(response.Payload)
                : FormatTextOutput(arguments, response.Payload);

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

    public static AscetListFoldersArguments ParseArguments(string[] args)
    {
        FolderReadService service = new FolderReadService();
        FolderReadRequest request = service.ParseExecArguments(args);

        AscetListFoldersArguments result = new AscetListFoldersArguments
        {
            RootPath = request.RootPath ?? String.Empty,
            Depth = request.Depth,
            EmitJson = HasJsonFlag(args)
        };

        return result;
    }

    public static string FormatTextOutput(AscetListFoldersArguments arguments, FolderTreeNode tree)
    {
        StringBuilder builder = new StringBuilder();
        builder.Append("Root: ").Append(arguments == null ? String.Empty : (arguments.RootPath ?? String.Empty)).AppendLine();
        builder.Append("Depth: ").Append(arguments == null ? 0 : arguments.Depth).AppendLine();
        builder.Append("Folders: ").Append(CountFolders(tree)).AppendLine();
        AppendNodeLines(builder, tree, 0, String.IsNullOrWhiteSpace(arguments == null ? String.Empty : arguments.RootPath));
        return builder.ToString();
    }

    public static string FormatTextOutput(AscetListFoldersArguments arguments, IDictionary<string, object> payload)
    {
        StringBuilder builder = new StringBuilder();
        builder.Append("Root: ").Append(arguments == null ? String.Empty : (arguments.RootPath ?? String.Empty)).AppendLine();
        builder.Append("Depth: ").Append(arguments == null ? 0 : arguments.Depth).AppendLine();
        Dictionary<string, object> counts = payload == null || !payload.ContainsKey("counts")
            ? null
            : payload["counts"] as Dictionary<string, object>;
        builder.Append("Folders: ").Append(GetInt(counts, "folders")).AppendLine();
        AppendPayloadFolderLines(builder, payload == null || !payload.ContainsKey("folders") ? null : payload["folders"], 0);
        return builder.ToString();
    }

    public static string FormatJsonOutput(AscetListFoldersArguments arguments, FolderTreeNode tree)
    {
        Dictionary<string, object> counts = new Dictionary<string, object>();
        counts["folders"] = CountFolders(tree);

        Dictionary<string, object> payload = new Dictionary<string, object>();
        payload["rootPath"] = arguments == null ? String.Empty : (arguments.RootPath ?? String.Empty);
        payload["depth"] = arguments == null ? 0 : arguments.Depth;
        payload["counts"] = counts;
        payload["folders"] = SerializeChildren(String.IsNullOrWhiteSpace(arguments == null ? String.Empty : arguments.RootPath) ? (tree == null ? null : tree.Children) : new List<FolderTreeNode> { tree });
        return AscetJsonContract.Serialize(payload);
    }

    private static List<Dictionary<string, object>> SerializeChildren(IList<FolderTreeNode> nodes)
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

            Dictionary<string, object> entry = new Dictionary<string, object>();
            string path = node.Path ?? String.Empty;
            string displayName = FirstNonEmpty(node.DisplayName, node.Name, GetLeafName(path));
            string parentPath = FirstNonEmpty(node.ParentPath, GetParentPath(path));
            string ownerKind = FirstNonEmpty(node.OwnerKind, GetFolderOwnerKind(path));
            entry["name"] = node.Name ?? String.Empty;
            entry["displayName"] = displayName;
            entry["path"] = path;
            entry["kind"] = "folder";
            entry["parentPath"] = parentPath;
            entry["ownerKind"] = ownerKind;
            entry["targetKind"] = "container";
            entry["objectKind"] = "folder";
            entry["availableGroups"] = node.AvailableGroups ?? new string[] { "folders", "projects", "components" };
            entry["counts"] = node.Counts ?? CreateFolderCounts(node.Children == null ? 0 : node.Children.Count);
            entry["children"] = SerializeChildren(node.Children);
            result.Add(entry);
        }

        return result;
    }

    private static void AppendNodeLines(StringBuilder builder, FolderTreeNode node, int indent, bool skipSelf)
    {
        if (builder == null || node == null)
        {
            return;
        }

        if (!skipSelf)
        {
            builder.Append(new string(' ', indent * 2)).Append("- ").Append(node.Path ?? String.Empty).AppendLine();
        }

        if (node.Children == null)
        {
            return;
        }

        for (int i = 0; i < node.Children.Count; i++)
        {
            AppendNodeLines(builder, node.Children[i], skipSelf ? indent : indent + 1, false);
        }
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

    private static string FormatException(Exception ex)
    {
        AscetReadException ascet = ex as AscetReadException;
        if (ascet != null)
        {
            return ascet.Code + ":" + ascet.Operation + ":" + ascet.Message;
        }

        return ex.GetType().FullName + ":" + ex.Message;
    }

    private static FolderReadRequest ToRequest(AscetListFoldersArguments arguments)
    {
        FolderReadRequest request = new FolderReadRequest();
        if (arguments == null)
        {
            return request;
        }

        request.RootPath = arguments.RootPath ?? String.Empty;
        request.Depth = arguments.Depth;
        return request;
    }

    private static bool HasJsonFlag(string[] args)
    {
        if (args == null)
        {
            return false;
        }

        for (int i = 0; i < args.Length; i++)
        {
            if (String.Equals(args[i], "--json", StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }
        }

        return false;
    }

    private static int GetInt(IDictionary<string, object> payload, string key)
    {
        if (payload == null || String.IsNullOrWhiteSpace(key) || !payload.ContainsKey(key) || payload[key] == null)
        {
            return 0;
        }

        try
        {
            return Convert.ToInt32(payload[key]);
        }
        catch
        {
            return 0;
        }
    }

    private static void AppendPayloadFolderLines(StringBuilder builder, object foldersValue, int indent)
    {
        if (builder == null)
        {
            return;
        }

        IEnumerable<object> folders = foldersValue as IEnumerable<object>;
        if (folders == null)
        {
            return;
        }

        foreach (object folderValue in folders)
        {
            Dictionary<string, object> folder = folderValue as Dictionary<string, object>;
            if (folder == null)
            {
                continue;
            }

            string path = folder.ContainsKey("path") && folder["path"] != null ? Convert.ToString(folder["path"]) : String.Empty;
            builder.Append(new string(' ', indent * 2)).Append("- ").Append(path ?? String.Empty).AppendLine();
            AppendPayloadFolderLines(builder, folder.ContainsKey("children") ? folder["children"] : null, indent + 1);
        }
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

    public sealed class FolderTreeNode
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
