using System;
using System.Reflection;
using de.etas.cebra.toolAPI.Ascet;
using de.etas.cebra.toolAPI.Common;

public sealed class AscetComponentDeleteResult
{
    public string ComponentPath { get; set; }
    public string FolderPath { get; set; }
    public string ComponentName { get; set; }
    public bool Deleted { get; set; }
    public bool AlreadyMissing { get; set; }
    public bool VerifyReadbackRequested { get; set; }
    public bool ReadbackVerified { get; set; }
    public string Summary { get; set; }
}

public interface IComponentDeleteService
{
    AscetComponentDeleteResult DeleteComponent(string componentPath, bool verifyReadback, bool ignoreMissing);
}

public sealed class ComponentDeleteService : AscetReadDomainServiceBase, IComponentDeleteService
{
    public AscetComponentDeleteResult DeleteComponent(string componentPath, bool verifyReadback, bool ignoreMissing)
    {
        if (String.IsNullOrWhiteSpace(componentPath))
        {
            throw new AscetReadException("invalid_argument", "delete_component", "Component path must not be empty.");
        }

        AscetItemPath parsed = AscetItemPath.Parse(componentPath);
        bool deleted = false;
        bool alreadyMissing = false;

        ExecuteWithSession("delete_component", delegate(AscetSession session)
        {
            AscetDataBase database = session.GetCurrentDatabaseHandle();
            DataBaseItem item = database.GetItemInFolder(parsed.ItemName, parsed.FolderPath);
            if (item == null)
            {
                alreadyMissing = true;
                if (!ignoreMissing)
                {
                    throw new AscetReadException("component_not_found", "delete_component", "Component '" + componentPath + "' was not found.");
                }

                return true;
            }

            AscetFolder folder = ResolveFolder(database, parsed.FolderPath);
            Component component = item as Component;
            if (component == null)
            {
                throw new AscetReadException("unsupported_component_kind", "delete_component", "Item '" + componentPath + "' is not a removable ASCET component.");
            }

            RequireComponentEditableInSession(session, componentPath, "delete_component");
            bool removed = folder.RemoveComponent(component);
            if (!removed)
            {
                throw new AscetReadException("delete_component_failed", "delete_component", "ASCET returned false while deleting component '" + componentPath + "'.");
            }

            deleted = true;
            return true;
        });

        bool readbackVerified = !verifyReadback;
        if (verifyReadback)
        {
            try
            {
                ExecuteWithSession("verify_delete_component", delegate(AscetSession session)
                {
                    ResolveItem(session, parsed.ItemName, parsed.FolderPath);
                    return true;
                });
                readbackVerified = false;
            }
            catch (AscetReadException ex)
            {
                if (String.Equals(ex.Code, "component_not_found", StringComparison.Ordinal))
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
                throw new AscetReadException("readback_mismatch", "delete_component", "Readback verification failed for component '" + componentPath + "'.");
            }
        }

        return new AscetComponentDeleteResult
        {
            ComponentPath = componentPath,
            FolderPath = parsed.FolderPath,
            ComponentName = parsed.ItemName,
            Deleted = deleted,
            AlreadyMissing = alreadyMissing,
            VerifyReadbackRequested = verifyReadback,
            ReadbackVerified = readbackVerified,
            Summary = BuildSummary(componentPath, deleted, alreadyMissing)
        };
    }

    private AscetFolder ResolveFolder(AscetDataBase database, string folderPath)
    {
        string normalizedPath = NormalizeFolderPath(folderPath);
        AscetFolder[] topFolders = database.GetAllAscetFolders();
        if (topFolders == null)
        {
            throw new AscetReadException("folder_not_found", "delete_component", "Folder '" + normalizedPath + "' was not found.");
        }

        string[] segments = normalizedPath.Split(new char[] { '\\' }, StringSplitOptions.RemoveEmptyEntries);
        AscetFolder current = null;
        AscetFolder[] currentLevel = topFolders;

        for (int i = 0; i < segments.Length; i++)
        {
            current = FindFolderByName(currentLevel, segments[i]);
            if (current == null)
            {
                throw new AscetReadException("folder_not_found", "delete_component", "Folder '" + normalizedPath + "' was not found.");
            }

            currentLevel = GetChildFolders(current);
        }

        return current;
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

        MethodInfo method = folder.GetType().GetMethod("GetAllAscetFolders", BindingFlags.Instance | BindingFlags.Public)
            ?? folder.GetType().GetMethod("GetAllSubFolders", BindingFlags.Instance | BindingFlags.Public)
            ?? folder.GetType().GetMethod("GetSubFolders", BindingFlags.Instance | BindingFlags.Public)
            ?? folder.GetType().GetMethod("GetAllFolders", BindingFlags.Instance | BindingFlags.Public);
        if (method == null)
        {
            return new AscetFolder[0];
        }

        object value = method.Invoke(folder, null);
        AscetFolder[] typed = value as AscetFolder[];
        if (typed != null)
        {
            return typed;
        }

        System.Collections.IList list = value as System.Collections.IList;
        if (list == null)
        {
            return new AscetFolder[0];
        }

        AscetFolder[] result = new AscetFolder[list.Count];
        for (int i = 0; i < list.Count; i++)
        {
            result[i] = list[i] as AscetFolder;
        }

        return result;
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

    private string BuildSummary(string componentPath, bool deleted, bool alreadyMissing)
    {
        if (alreadyMissing)
        {
            return "Component '" + componentPath + "' is already missing.";
        }

        return (deleted ? "Deleted " : "Resolved ") + "component " + componentPath + ".";
    }
}
