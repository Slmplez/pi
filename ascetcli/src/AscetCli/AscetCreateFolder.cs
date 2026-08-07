using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Reflection;
using System.Text;
using de.etas.cebra.toolAPI.Ascet;

public sealed class AscetCreateFolderArguments
{
    public string FolderPath { get; set; }
    public bool VerifyReadback { get; set; }
    public bool EmitJson { get; set; }
}

public sealed class AscetCreateFolderResult
{
    public string FolderPath { get; set; }
    public bool Created { get; set; }
    public int CreatedCount { get; set; }
    public int ExistingCount { get; set; }
    public bool VerifyReadbackRequested { get; set; }
    public bool ReadbackVerified { get; set; }
    public string Summary { get; set; }
}

public interface IFolderCreateService
{
    AscetCreateFolderResult CreateFolder(string folderPath, bool verifyReadback);
}

public sealed class FolderCreateService : AscetReadDomainServiceBase, IFolderCreateService
{
    public AscetCreateFolderResult CreateFolder(string folderPath, bool verifyReadback)
    {
        string normalizedPath = NormalizeFolderPath(folderPath);
        int createdCount = 0;
        int existingCount = 0;

        ExecuteWithSession("create_folder", delegate(AscetSession session)
        {
            AscetDataBase database = session.GetCurrentDatabaseHandle();
            EnsureFolderPath(database, normalizedPath, ref createdCount, ref existingCount);
            if (createdCount > 0 && !database.Save())
            {
                throw new AscetReadException("create_folder_failed", "create_folder", "Failed to save current database after creating folder '" + normalizedPath + "'.");
            }
            return true;
        });

        bool readbackVerified = !verifyReadback;
        string readbackPath = ExecuteWithSession("verify_create_folder", delegate(AscetSession session)
        {
            AscetFolder folder = ResolveFolder(session.GetCurrentDatabaseHandle(), normalizedPath);
            return folder == null ? String.Empty : (folder.GetNameWithPath() ?? String.Empty);
        });
        if (!String.IsNullOrWhiteSpace(readbackPath))
        {
            readbackPath = NormalizeFolderPath(readbackPath);
        }

        if (verifyReadback)
        {
            readbackVerified = String.Equals(readbackPath, normalizedPath, StringComparison.Ordinal);
            if (!readbackVerified)
            {
                throw new AscetReadException("readback_mismatch", "create_folder", "Readback verification failed for folder '" + normalizedPath + "'.");
            }
        }

        return new AscetCreateFolderResult
        {
            FolderPath = String.IsNullOrWhiteSpace(readbackPath) ? normalizedPath : readbackPath,
            Created = createdCount > 0,
            CreatedCount = createdCount,
            ExistingCount = existingCount,
            VerifyReadbackRequested = verifyReadback,
            ReadbackVerified = readbackVerified,
            Summary = BuildSummary(normalizedPath, createdCount, existingCount)
        };
    }

    private void EnsureFolderPath(AscetDataBase database, string folderPath, ref int createdCount, ref int existingCount)
    {
        string[] segments = folderPath.Split(new char[] { '\\' }, StringSplitOptions.RemoveEmptyEntries);
        if (segments.Length == 0)
        {
            throw new AscetReadException("invalid_argument", "create_folder", "Folder path must contain at least one segment.");
        }

        AscetFolder current = null;
        object currentContainer = database;
        IList currentLevel = GetTopFolders(database);

        for (int i = 0; i < segments.Length; i++)
        {
            AscetFolder nextFolder = FindFolderByName(currentLevel, segments[i]);
            if (nextFolder == null)
            {
                nextFolder = AddFolder(currentContainer, segments[i]);
                if (nextFolder == null)
                {
                    throw new AscetReadException("create_folder_failed", "create_folder", "ASCET returned null while creating folder '" + segments[i] + "'.");
                }

                createdCount++;
            }
            else
            {
                existingCount++;
            }

            current = nextFolder;
            currentContainer = current;
            currentLevel = GetChildFolders(current);
        }
    }

    private AscetFolder ResolveFolder(AscetDataBase database, string folderPath)
    {
        IList topFolders = GetTopFolders(database);
        if (topFolders == null || topFolders.Count == 0)
        {
            throw new AscetReadException("folder_not_found", "resolve_folder", "Folder '" + folderPath + "' was not found.");
        }

        string[] segments = folderPath.Split(new char[] { '\\' }, StringSplitOptions.RemoveEmptyEntries);
        AscetFolder current = null;
        IList currentLevel = topFolders;

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

    private IList GetTopFolders(AscetDataBase database)
    {
        Array topFolders = database == null ? null : database.GetAllAscetFolders();
        return ArrayToList(topFolders);
    }

    private IList GetChildFolders(AscetFolder folder)
    {
        if (folder == null)
        {
            return new ArrayList();
        }

        foreach (string methodName in new string[] { "GetAllAscetSubFolders", "GetAllSubFolders", "GetAllAscetFolders", "GetAllFolders", "GetSubFolders" })
        {
            MethodInfo method = folder.GetType().GetMethod(methodName, BindingFlags.Instance | BindingFlags.Public);
            if (method == null)
            {
                continue;
            }

            object value = method.Invoke(folder, null);
            IList result = ArrayToList(value as Array);
            if (result.Count > 0 || value is Array)
            {
                return result;
            }
        }

        return new ArrayList();
    }

    private IList ArrayToList(Array values)
    {
        ArrayList result = new ArrayList();
        if (values == null)
        {
            return result;
        }

        for (int i = 0; i < values.Length; i++)
        {
            object value = values.GetValue(i);
            if (value != null)
            {
                result.Add(value);
            }
        }

        return result;
    }

    private AscetFolder FindFolderByName(IList folders, string expectedName)
    {
        if (folders == null || String.IsNullOrWhiteSpace(expectedName))
        {
            return null;
        }

        for (int i = 0; i < folders.Count; i++)
        {
            AscetFolder folder = folders[i] as AscetFolder;
            if (folder != null && String.Equals(folder.GetName(), expectedName, StringComparison.Ordinal))
            {
                return folder;
            }
        }

        return null;
    }

    private AscetFolder AddFolder(object target, string folderName)
    {
        if (target == null)
        {
            return null;
        }

        foreach (string methodName in new string[] { "AddAscetSubFolder", "AddSubFolder", "AddAscetFolder", "AddFolder", "CreateFolder" })
        {
            MethodInfo method = target.GetType().GetMethod(methodName, BindingFlags.Instance | BindingFlags.Public);
            if (method == null)
            {
                continue;
            }

            ParameterInfo[] parameters = method.GetParameters();
            if (parameters.Length != 1 || parameters[0].ParameterType != typeof(string))
            {
                continue;
            }

            object created = method.Invoke(target, new object[] { folderName });
            AscetFolder folder = created as AscetFolder;
            if (folder != null)
            {
                return folder;
            }

            if (created != null)
            {
                AscetFolder resolved = ResolveCreatedFolder(target, folderName);
                if (resolved != null)
                {
                    return resolved;
                }
            }
        }

        throw new AscetReadException("unsupported_operation", "create_folder", "ASCET folder creation API was not found on the target container.");
    }

    private AscetFolder ResolveCreatedFolder(object target, string folderName)
    {
        if (target == null || String.IsNullOrWhiteSpace(folderName))
        {
            return null;
        }

        foreach (string methodName in new string[] { "GetAscetSubFolder", "GetSubFolder", "GetAscetFolder", "GetFolder" })
        {
            MethodInfo method = target.GetType().GetMethod(methodName, BindingFlags.Instance | BindingFlags.Public);
            if (method == null)
            {
                continue;
            }

            ParameterInfo[] parameters = method.GetParameters();
            if (parameters.Length != 1 || parameters[0].ParameterType != typeof(string))
            {
                continue;
            }

            object resolved = method.Invoke(target, new object[] { folderName });
            AscetFolder folder = resolved as AscetFolder;
            if (folder != null)
            {
                return folder;
            }
        }

        return null;
    }

    private string NormalizeFolderPath(string folderPath)
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

        if (String.IsNullOrWhiteSpace(normalized))
        {
            throw new AscetReadException("invalid_argument", "create_folder", "Folder path must not be empty.");
        }

        return normalized;
    }

    private string BuildSummary(string folderPath, int createdCount, int existingCount)
    {
        if (createdCount <= 0)
        {
            return "Folder path '" + folderPath + "' already exists.";
        }

        return "Created folder path '" + folderPath + "' (" + createdCount.ToString() + " created, " + existingCount.ToString() + " existing).";
    }
}

public static class AscetCreateFolder
{
    public static int Main(string[] args)
    {
        TextWriter originalOut = Console.Out;
        StringWriter suppressedOut = null;

        try
        {
            AscetCreateFolderArguments parsed = ParseArguments(args);
            if (parsed.EmitJson)
            {
                suppressedOut = new StringWriter();
                Console.SetOut(suppressedOut);
            }

            AscetToolApiBootstrap.ConfigureAssemblyResolution();
            FolderCreateService service = new FolderCreateService();
            AscetCreateFolderResult result = service.CreateFolder(parsed.FolderPath, parsed.VerifyReadback);

            string output = parsed.EmitJson ? FormatJsonOutput(result) : FormatTextOutput(result);
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

    public static AscetCreateFolderArguments ParseArguments(string[] args)
    {
        if (args == null || args.Length < 1)
        {
            throw new AscetReadException("invalid_argument", "parse_arguments", "usage: AscetCli.exe exec create_folder <folder-path> [--verify-readback] [--json]");
        }

        AscetCreateFolderArguments result = new AscetCreateFolderArguments
        {
            FolderPath = NormalizeFolderPath(args[0]),
            VerifyReadback = false,
            EmitJson = false
        };

        for (int i = 1; i < args.Length; i++)
        {
            string argument = args[i];
            if (String.Equals(argument, "--verify-readback", StringComparison.OrdinalIgnoreCase))
            {
                result.VerifyReadback = true;
                continue;
            }

            if (String.Equals(argument, "--json", StringComparison.OrdinalIgnoreCase))
            {
                result.EmitJson = true;
                continue;
            }

            throw new AscetReadException("invalid_argument", "parse_arguments", "Unknown argument '" + argument + "'.");
        }

        return result;
    }

    public static string FormatTextOutput(AscetCreateFolderResult result)
    {
        StringBuilder builder = new StringBuilder();
        builder.Append("Folder: ").Append(result == null ? String.Empty : (result.FolderPath ?? String.Empty)).AppendLine();
        builder.Append("Created: ").Append(result != null && result.Created).AppendLine();
        builder.Append("CreatedCount: ").Append(result == null ? 0 : result.CreatedCount).AppendLine();
        builder.Append("ExistingCount: ").Append(result == null ? 0 : result.ExistingCount).AppendLine();
        builder.Append("VerifyReadbackRequested: ").Append(result != null && result.VerifyReadbackRequested).AppendLine();
        builder.Append("ReadbackVerified: ").Append(result != null && result.ReadbackVerified).AppendLine();
        builder.Append("Summary: ").Append(result == null ? String.Empty : (result.Summary ?? String.Empty)).AppendLine();
        return builder.ToString();
    }

    public static string FormatJsonOutput(AscetCreateFolderResult result)
    {
        Dictionary<string, object> payload = new Dictionary<string, object>();
        payload["folderPath"] = result == null ? String.Empty : (result.FolderPath ?? String.Empty);
        payload["created"] = result != null && result.Created;
        payload["createdCount"] = result == null ? 0 : result.CreatedCount;
        payload["existingCount"] = result == null ? 0 : result.ExistingCount;
        payload["verifyReadbackRequested"] = result != null && result.VerifyReadbackRequested;
        payload["readbackVerified"] = result != null && result.ReadbackVerified;
        payload["summary"] = result == null ? String.Empty : (result.Summary ?? String.Empty);
        return AscetJsonContract.Serialize(payload);
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

        if (String.IsNullOrWhiteSpace(normalized))
        {
            throw new AscetReadException("invalid_argument", "normalize_folder_path", "Folder path must not be empty.");
        }

        return normalized;
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
