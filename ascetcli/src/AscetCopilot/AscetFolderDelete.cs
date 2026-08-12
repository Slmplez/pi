using System;
using System.Collections.Generic;
using System.Reflection;
using de.etas.cebra.toolAPI.Ascet;
using de.etas.cebra.toolAPI.Common;

public sealed class AscetFolderDeleteResult
{
    public string FolderPath { get; set; }
    public bool Deleted { get; set; }
    public bool AlreadyMissing { get; set; }
    public bool VerifyReadbackRequested { get; set; }
    public bool ReadbackVerified { get; set; }
    public string Summary { get; set; }
}

public interface IFolderDeleteService
{
    AscetFolderDeleteResult DeleteFolder(string folderPath, bool verifyReadback, bool ignoreMissing);
}

public sealed class FolderDeleteService : AscetReadDomainServiceBase, IFolderDeleteService
{
    public AscetFolderDeleteResult DeleteFolder(string folderPath, bool verifyReadback, bool ignoreMissing)
    {
        if (String.IsNullOrWhiteSpace(folderPath))
        {
            throw new AscetReadException("invalid_argument", "delete_folder", "Folder path must not be empty.");
        }

        string normalizedPath = NormalizeFolderPath(folderPath);
        bool deleted = false;
        bool alreadyMissing = false;

        ExecuteWithSession("delete_folder", delegate(AscetSession session)
        {
            AscetDataBase database = session.GetCurrentDatabaseHandle();
            AscetFolder folder = null;

            try
            {
                folder = ResolveFolder(database, normalizedPath);
            }
            catch (AscetReadException ex)
            {
                if (String.Equals(ex.Code, "folder_not_found", StringComparison.Ordinal))
                {
                    alreadyMissing = true;
                    if (!ignoreMissing)
                    {
                        throw new AscetReadException("folder_not_found", "delete_folder", "Folder '" + normalizedPath + "' was not found.");
                    }
                    return true;
                }
                throw;
            }

            if (folder == null)
            {
                alreadyMissing = true;
                if (!ignoreMissing)
                {
                    throw new AscetReadException("folder_not_found", "delete_folder", "Folder '" + normalizedPath + "' was not found.");
                }
                return true;
            }

            List<string> componentPaths = new List<string>();
            CollectComponentPaths(folder, componentPaths, new HashSet<string>(StringComparer.OrdinalIgnoreCase));
            RequireComponentsEditableInSession(session, componentPaths, "delete_folder");
            bool removed = RemoveFolder(database, folder, normalizedPath);
            if (!removed)
            {
                throw new AscetReadException("delete_folder_failed", "delete_folder", "ASCET returned false while deleting folder '" + normalizedPath + "'.");
            }

            if (!database.Save())
            {
                throw new AscetReadException("delete_folder_failed", "delete_folder", "Failed to save current database after deleting folder '" + normalizedPath + "'.");
            }

            deleted = true;
            return true;
        });

        bool readbackVerified = !verifyReadback;
        if (verifyReadback)
        {
            try
            {
                ExecuteWithSession("verify_delete_folder", delegate(AscetSession session)
                {
                    ResolveFolder(session.GetCurrentDatabaseHandle(), normalizedPath);
                    return true;
                });
                readbackVerified = false;
            }
            catch (AscetReadException ex)
            {
                if (String.Equals(ex.Code, "folder_not_found", StringComparison.Ordinal))
                {
                    readbackVerified = true;
                }
                else
                {
                    throw;
                }
            }

            if (!readbackVerified)
            {
                throw new AscetReadException("readback_mismatch", "delete_folder", "Readback verification failed for folder '" + normalizedPath + "'.");
            }
        }

        return new AscetFolderDeleteResult
        {
            FolderPath = normalizedPath,
            Deleted = deleted,
            AlreadyMissing = alreadyMissing,
            VerifyReadbackRequested = verifyReadback,
            ReadbackVerified = readbackVerified,
            Summary = BuildSummary(normalizedPath, deleted, alreadyMissing)
        };
    }

    private bool RemoveFolder(AscetDataBase database, AscetFolder folder, string folderPath)
    {
        string[] segments = folderPath.Split(new char[] { '\\' }, StringSplitOptions.RemoveEmptyEntries);
        if (segments.Length == 0)
        {
            throw new AscetReadException("invalid_argument", "delete_folder", "Cannot delete root folder.");
        }

        object parentContainer = database;
        if (segments.Length > 1)
        {
            string parentPath = String.Join("\\", segments, 0, segments.Length - 1);
            parentContainer = ResolveFolder(database, parentPath);
        }

        if (segments.Length == 1)
        {
            MethodInfo removeMethod = parentContainer.GetType().GetMethod("Remove", BindingFlags.Instance | BindingFlags.Public);
            if (removeMethod != null)
            {
                ParameterInfo[] parameters = removeMethod.GetParameters();
                if (parameters.Length == 2 &&
                    parameters[0].ParameterType.IsAssignableFrom(folder.GetType()) &&
                    parameters[1].ParameterType == typeof(bool))
                {
                    object result = removeMethod.Invoke(parentContainer, new object[] { folder, true });
                    if (result is bool)
                    {
                        return (bool)result;
                    }
                    return true;
                }
            }
        }

        MethodInfo method = parentContainer.GetType().GetMethod("RemoveFolder", BindingFlags.Instance | BindingFlags.Public);
        if (method != null)
        {
            ParameterInfo[] parameters = method.GetParameters();
            if (parameters.Length == 2 &&
                (parameters[0].ParameterType == typeof(AscetFolder) || parameters[0].ParameterType.IsAssignableFrom(folder.GetType())) &&
                parameters[1].ParameterType == typeof(bool))
            {
                object result = method.Invoke(parentContainer, new object[] { folder, true });
                if (result is bool)
                {
                    return (bool)result;
                }
                return true;
            }
        }

        throw new AscetReadException("unsupported_operation", "delete_folder", "ASCET folder deletion API was not found on the parent container.");
    }

    private AscetFolder ResolveFolder(AscetDataBase database, string folderPath)
    {
        AscetFolder[] topFolders = GetTopLevelFolders(database);
        if (topFolders == null || topFolders.Length == 0)
        {
            throw new AscetReadException("folder_not_found", "delete_folder", "Folder '" + folderPath + "' was not found.");
        }

        string[] segments = folderPath.Split(new char[] { '\\' }, StringSplitOptions.RemoveEmptyEntries);
        AscetFolder current = null;
        AscetFolder[] currentLevel = topFolders;

        for (int i = 0; i < segments.Length; i++)
        {
            current = FindFolderByName(currentLevel, segments[i]);
            if (current == null)
            {
                throw new AscetReadException("folder_not_found", "delete_folder", "Folder '" + folderPath + "' was not found.");
            }

            currentLevel = GetChildFolders(current);
        }

        return current;
    }

    private AscetFolder[] GetTopLevelFolders(AscetDataBase database)
    {
        if (database == null)
        {
            return new AscetFolder[0];
        }

        return database.GetAllAscetFolders() ?? new AscetFolder[0];
    }

    private AscetFolder FindFolderByName(AscetFolder[] folders, string expectedName)
    {
        if (folders == null)
        {
            return null;
        }

        for (int i = 0; i < folders.Length; i++)
        {
            AscetFolder folder = folders[i];
            if (folder != null && String.Equals(folder.GetName(), expectedName, StringComparison.Ordinal))
            {
                return folder;
            }
        }

        return null;
    }

    private AscetFolder[] GetChildFolders(AscetFolder folder)
    {
        if (folder == null)
        {
            return new AscetFolder[0];
        }

        foreach (string methodName in new string[] { "GetAllAscetFolders", "GetAllFolders", "GetAllSubFolders", "GetSubFolders" })
        {
            MethodInfo method = folder.GetType().GetMethod(methodName, BindingFlags.Instance | BindingFlags.Public);
            if (method == null)
            {
                continue;
            }

            object value = method.Invoke(folder, null);
            Array array = value as Array;
            if (array != null)
            {
                AscetFolder[] result = new AscetFolder[array.Length];
                for (int i = 0; i < array.Length; i++)
                {
                    result[i] = array.GetValue(i) as AscetFolder;
                }
                return result;
            }
        }

        return new AscetFolder[0];
    }

    private void CollectComponentPaths(AscetFolder folder, IList<string> paths, ISet<string> seen)
    {
        if (folder == null || paths == null || seen == null)
        {
            return;
        }

        foreach (string methodName in new string[] { "GetAllDataBaseItems", "GetAllItems", "GetAllComponents" })
        {
            MethodInfo method = folder.GetType().GetMethod(methodName, BindingFlags.Instance | BindingFlags.Public);
            if (method == null)
            {
                continue;
            }

            Array items = method.Invoke(folder, null) as Array;
            if (items == null)
            {
                continue;
            }

            for (int i = 0; i < items.Length; i++)
            {
                Component component = items.GetValue(i) as Component;
                string path = component == null ? String.Empty : (component.GetNameWithPath() ?? String.Empty);
                if (!String.IsNullOrWhiteSpace(path) && seen.Add(path))
                {
                    paths.Add(path);
                }
            }
            break;
        }

        AscetFolder[] children = GetChildFolders(folder);
        for (int i = 0; i < children.Length; i++)
        {
            CollectComponentPaths(children[i], paths, seen);
        }
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

        return normalized;
    }

    private string BuildSummary(string folderPath, bool deleted, bool alreadyMissing)
    {
        if (alreadyMissing)
        {
            return "Folder '" + folderPath + "' is already missing.";
        }

        return (deleted ? "Deleted " : "Resolved ") + "folder " + folderPath + ".";
    }
}
