using System;
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
    public bool SaveSucceeded { get; set; }
    public string VerificationMode { get; set; }
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
        bool saveSucceeded = true;
        bool readbackVerified = !verifyReadback;

        ExecuteWithSession("delete_folder", delegate(AscetSession session)
        {
            AscetDataBase database = session.GetCurrentDatabaseHandle();
            AscetFolder folder;
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
                    readbackVerified = true;
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
                readbackVerified = true;
                return true;
            }

            bool removed = RemoveFolder(database, folder, normalizedPath);
            if (!removed)
            {
                throw new AscetReadException("delete_folder_failed", "delete_folder", "ASCET returned false while deleting folder '" + normalizedPath + "'.");
            }

            deleted = true;
            saveSucceeded = database.Save();
            if (!saveSucceeded)
            {
                throw new AscetReadException("delete_folder_failed", "delete_folder", "Failed to save current database after deleting folder '" + normalizedPath + "'.");
            }

            if (verifyReadback)
            {
                VerifyFolderAbsence(database, normalizedPath);
                readbackVerified = true;
            }

            return true;
        });

        return new AscetFolderDeleteResult
        {
            FolderPath = normalizedPath,
            Deleted = deleted,
            AlreadyMissing = alreadyMissing,
            VerifyReadbackRequested = verifyReadback,
            ReadbackVerified = readbackVerified,
            SaveSucceeded = saveSucceeded,
            VerificationMode = "same_session_exact_absence",
            Summary = BuildSummary(normalizedPath, deleted, alreadyMissing)
        };
    }

    private void VerifyFolderAbsence(AscetDataBase database, string folderPath)
    {
        try
        {
            ResolveFolder(database, folderPath);
        }
        catch (AscetReadException ex)
        {
            if (String.Equals(ex.Code, "folder_not_found", StringComparison.Ordinal))
            {
                return;
            }

            throw;
        }

        throw new AscetReadException("readback_mismatch", "delete_folder", "Readback verification failed for folder '" + folderPath + "'.");
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
