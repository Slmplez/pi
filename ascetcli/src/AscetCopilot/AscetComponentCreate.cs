using System;
using System.Collections.Generic;
using System.Reflection;
using de.etas.cebra.toolAPI.Ascet;
using de.etas.cebra.toolAPI.Common;

public sealed class AscetComponentCreateResult
{
    public string ComponentPath { get; set; }
    public string FolderPath { get; set; }
    public string ComponentName { get; set; }
    public AscetComponentKind ComponentKind { get; set; }
    public AscetLanguageKind LanguageKind { get; set; }
    public bool Created { get; set; }
    public bool AlreadyExisted { get; set; }
    public bool VerifyReadbackRequested { get; set; }
    public bool RollbackOnFailureRequested { get; set; }
    public bool ReadbackVerified { get; set; }
    public string Summary { get; set; }
}

public interface IComponentCreateService
{
    AscetComponentCreateResult CreateComponent(string componentPath, AscetComponentKind componentKind, AscetLanguageKind languageKind, bool verifyReadback, bool rollbackOnFailure, bool returnExisting);
}

public static class AscetComponentScaffoldMetadata
{
    public static Dictionary<string, object> BuildExpectedDefaultScaffold(AscetComponentCreateResult result)
    {
        Dictionary<string, object> payload = new Dictionary<string, object>();
        payload["verified"] = false;
        payload["generatedItems"] = BuildGeneratedItems(result);
        payload["defaultEntryMethod"] = GetDefaultEntryMethod(result);
        return payload;
    }

    private static List<Dictionary<string, object>> BuildGeneratedItems(AscetComponentCreateResult result)
    {
        List<Dictionary<string, object>> items = new List<Dictionary<string, object>>();
        if (!ShouldExposeExpectedScaffold(result))
        {
            return items;
        }

        if (result.ComponentKind == AscetComponentKind.Class && result.LanguageKind == AscetLanguageKind.ESDL)
        {
            items.Add(BuildItem("method", "calc"));
            return items;
        }

        if (result.ComponentKind == AscetComponentKind.Module && result.LanguageKind == AscetLanguageKind.ESDL)
        {
            items.Add(BuildItem("method", "process"));
            return items;
        }

        if (result.ComponentKind == AscetComponentKind.StateMachine)
        {
            items.Add(BuildItem("method", "trigger"));
            items.Add(BuildItem("variable", "sm"));
            return items;
        }

        return items;
    }

    private static string GetDefaultEntryMethod(AscetComponentCreateResult result)
    {
        if (!ShouldExposeExpectedScaffold(result))
        {
            return String.Empty;
        }

        if (result.ComponentKind == AscetComponentKind.Class && result.LanguageKind == AscetLanguageKind.ESDL)
        {
            return "calc";
        }

        if (result.ComponentKind == AscetComponentKind.Module && result.LanguageKind == AscetLanguageKind.ESDL)
        {
            return "process";
        }

        if (result.ComponentKind == AscetComponentKind.StateMachine)
        {
            return "trigger";
        }

        return String.Empty;
    }

    private static bool ShouldExposeExpectedScaffold(AscetComponentCreateResult result)
    {
        return result != null && result.Created && !result.AlreadyExisted;
    }

    private static Dictionary<string, object> BuildItem(string kind, string name)
    {
        Dictionary<string, object> item = new Dictionary<string, object>();
        item["kind"] = kind ?? String.Empty;
        item["name"] = name ?? String.Empty;
        return item;
    }
}

public sealed class ComponentCreateService : AscetReadDomainServiceBase, IComponentCreateService
{
    public AscetComponentCreateResult CreateComponent(string componentPath, AscetComponentKind componentKind, AscetLanguageKind languageKind, bool verifyReadback, bool rollbackOnFailure, bool returnExisting)
    {
        if (String.IsNullOrWhiteSpace(componentPath))
        {
            throw new AscetReadException("invalid_argument", "create_component", "Component path must not be empty.");
        }

        AscetItemPath parsed = AscetItemPath.Parse(componentPath);
        if (String.IsNullOrWhiteSpace(parsed.FolderPath))
        {
            throw new AscetReadException("invalid_argument", "create_component", "Component path must include a folder path.");
        }

        ValidateComponentRequest(componentKind, languageKind);

        bool created = false;
        bool alreadyExisted = false;

        try
        {
            ExecuteWithSession("create_component", delegate(AscetSession session)
            {
                AscetDataBase database = session.GetCurrentDatabaseHandle();
                AscetFolder folder = ResolveFolder(database, parsed.FolderPath);
                DataBaseItem existing = database.GetItemInFolder(parsed.ItemName, parsed.FolderPath);
                if (existing != null)
                {
                    alreadyExisted = true;
                    if (!returnExisting)
                    {
                        throw new AscetReadException("component_already_exists", "create_component", "Component '" + componentPath + "' already exists.");
                    }

                    return true;
                }

                CreateInFolder(folder, parsed.ItemName, componentKind, languageKind);
                created = true;

                if (String.Equals(Environment.GetEnvironmentVariable("ASCET_FAIL_AFTER_CREATE_COMPONENT"), "1", StringComparison.Ordinal))
                {
                    throw new AscetReadException("forced_failure", "create_component", "Forced failure after component creation for rollback verification.");
                }

                return true;
            });

            bool readbackVerified = false;
            AscetItemRef resolved = null;
            if (verifyReadback)
            {
                resolved = ExecuteWithSession("verify_create_component", delegate(AscetSession session)
                {
                    DataBaseItem item = ResolveItem(session, parsed.ItemName, parsed.FolderPath);
                    return Classifier.ToItemRef(item);
                });

                readbackVerified = resolved != null &&
                    String.Equals(resolved.Path ?? String.Empty, componentPath, StringComparison.Ordinal) &&
                    resolved.Kind == componentKind &&
                    ((componentKind != AscetComponentKind.Class && componentKind != AscetComponentKind.Module) || resolved.LanguageKind == languageKind);
                if (!readbackVerified)
                {
                    throw new AscetReadException("readback_mismatch", "create_component", "Readback verification failed for component '" + componentPath + "'.");
                }
            }

            return new AscetComponentCreateResult
            {
                ComponentPath = resolved == null ? componentPath : (resolved.Path ?? componentPath),
                FolderPath = parsed.FolderPath,
                ComponentName = parsed.ItemName,
                ComponentKind = componentKind,
                LanguageKind = (componentKind == AscetComponentKind.StateMachine || componentKind == AscetComponentKind.Enumeration) && resolved != null ? resolved.LanguageKind : languageKind,
                Created = created,
                AlreadyExisted = alreadyExisted,
                VerifyReadbackRequested = verifyReadback,
                RollbackOnFailureRequested = rollbackOnFailure,
                ReadbackVerified = readbackVerified,
                Summary = BuildSummary(componentPath, componentKind, languageKind, created, alreadyExisted)
            };
        }
        catch
        {
            if (rollbackOnFailure && created)
            {
                try
                {
                    ComponentDeleteService deleteService = new ComponentDeleteService();
                    deleteService.DeleteComponent(componentPath, false, true);
                }
                catch
                {
                }
            }

            throw;
        }
    }

    internal AscetComponentCreateResult CreateComponentInSession(AscetSession session, string componentPath, AscetComponentKind componentKind, AscetLanguageKind languageKind, bool verifyReadback, bool rollbackOnFailure, bool returnExisting)
    {
        if (session == null)
        {
            throw new ArgumentNullException("session");
        }

        if (String.IsNullOrWhiteSpace(componentPath))
        {
            throw new AscetReadException("invalid_argument", "create_component", "Component path must not be empty.");
        }

        AscetItemPath parsed = AscetItemPath.Parse(componentPath);
        if (String.IsNullOrWhiteSpace(parsed.FolderPath))
        {
            throw new AscetReadException("invalid_argument", "create_component", "Component path must include a folder path.");
        }

        ValidateComponentRequest(componentKind, languageKind);

        bool created = false;
        bool alreadyExisted = false;

        try
        {
            ExecuteWithBoundSession("create_component", session, delegate(AscetSession currentSession)
            {
                AscetDataBase database = currentSession.GetCurrentDatabaseHandle();
                AscetFolder folder = ResolveFolder(database, parsed.FolderPath);
                DataBaseItem existing = database.GetItemInFolder(parsed.ItemName, parsed.FolderPath);
                if (existing != null)
                {
                    alreadyExisted = true;
                    if (!returnExisting)
                    {
                        throw new AscetReadException("component_already_exists", "create_component", "Component '" + componentPath + "' already exists.");
                    }

                    return true;
                }

                CreateInFolder(folder, parsed.ItemName, componentKind, languageKind);
                created = true;

                if (String.Equals(Environment.GetEnvironmentVariable("ASCET_FAIL_AFTER_CREATE_COMPONENT"), "1", StringComparison.Ordinal))
                {
                    throw new AscetReadException("forced_failure", "create_component", "Forced failure after component creation for rollback verification.");
                }

                return true;
            });

            bool readbackVerified = false;
            AscetItemRef resolved = null;
            if (verifyReadback && !created)
            {
                resolved = ReadComponentInSession(session, componentPath);

                readbackVerified = resolved != null &&
                    String.Equals(resolved.Path ?? String.Empty, componentPath, StringComparison.Ordinal) &&
                    resolved.Kind == componentKind &&
                    ((componentKind != AscetComponentKind.Class && componentKind != AscetComponentKind.Module) || resolved.LanguageKind == languageKind);
                if (!readbackVerified)
                {
                    throw new AscetReadException("readback_mismatch", "create_component", "Readback verification failed for component '" + componentPath + "'.");
                }
            }

            return new AscetComponentCreateResult
            {
                ComponentPath = resolved == null ? componentPath : (resolved.Path ?? componentPath),
                FolderPath = parsed.FolderPath,
                ComponentName = parsed.ItemName,
                ComponentKind = componentKind,
                LanguageKind = (componentKind == AscetComponentKind.StateMachine || componentKind == AscetComponentKind.Enumeration) && resolved != null ? resolved.LanguageKind : languageKind,
                Created = created,
                AlreadyExisted = alreadyExisted,
                VerifyReadbackRequested = verifyReadback,
                RollbackOnFailureRequested = rollbackOnFailure,
                ReadbackVerified = readbackVerified,
                Summary = BuildSummary(componentPath, componentKind, languageKind, created, alreadyExisted)
            };
        }
        catch
        {
            if (rollbackOnFailure && created)
            {
                try
                {
                    ComponentDeleteService deleteService = new ComponentDeleteService();
                    deleteService.DeleteComponent(componentPath, false, true);
                }
                catch
                {
                }
            }

            throw;
        }
    }

    internal AscetItemRef ReadComponentInSession(AscetSession session, string componentPath)
    {
        if (session == null)
        {
            throw new ArgumentNullException("session");
        }

        if (String.IsNullOrWhiteSpace(componentPath))
        {
            throw new AscetReadException("invalid_argument", "verify_create_component", "Component path must not be empty.");
        }

        AscetItemPath parsed = AscetItemPath.Parse(componentPath);
        return ExecuteWithBoundSession("verify_create_component", session, delegate(AscetSession currentSession)
        {
            DataBaseItem item = ResolveItem(currentSession, parsed.ItemName, parsed.FolderPath);
            return Classifier.ToItemRef(item);
        });
    }

    private void ValidateComponentRequest(AscetComponentKind componentKind, AscetLanguageKind languageKind)
    {
        switch (componentKind)
        {
            case AscetComponentKind.Class:
            case AscetComponentKind.Module:
                if (languageKind != AscetLanguageKind.ESDL && languageKind != AscetLanguageKind.BDE && languageKind != AscetLanguageKind.C)
                {
                    throw new AscetReadException("invalid_argument", "create_component", "Class/Module creation requires language ESDL, BDE, or C.");
                }
                break;
            case AscetComponentKind.StateMachine:
            case AscetComponentKind.Enumeration:
                break;
            default:
                throw new AscetReadException("invalid_argument", "create_component", "Unsupported component kind for creation.");
        }
    }

    private void CreateInFolder(AscetFolder folder, string componentName, AscetComponentKind componentKind, AscetLanguageKind languageKind)
    {
        if (folder == null)
        {
            throw new AscetReadException("folder_not_found", "create_component", "Target folder was not found.");
        }

        if (String.IsNullOrWhiteSpace(componentName))
        {
            throw new AscetReadException("invalid_argument", "create_component", "Component name must not be empty.");
        }

        object created;
        switch (componentKind)
        {
            case AscetComponentKind.Class:
                created = folder.AddClass(componentName, languageKind.ToString());
                break;
            case AscetComponentKind.Module:
                created = folder.AddModule(componentName, languageKind.ToString());
                break;
            case AscetComponentKind.StateMachine:
                created = folder.AddStateMachine(componentName);
                break;
            case AscetComponentKind.Enumeration:
                created = folder.AddEnumeration(componentName);
                break;
            default:
                throw new AscetReadException("invalid_argument", "create_component", "Unsupported component kind for creation.");
        }

        if (created == null)
        {
            throw new AscetReadException("create_component_failed", "create_component", "ASCET returned null while creating component '" + componentName + "'.");
        }
    }

    private AscetFolder ResolveFolder(AscetDataBase database, string folderPath)
    {
        if (database == null)
        {
            throw new AscetReadException("invalid_argument", "resolve_folder", "Database must not be null.");
        }

        string normalizedPath = NormalizeFolderPath(folderPath);
        AscetFolder[] topFolders = database.GetAllAscetFolders();
        if (topFolders == null)
        {
            throw new AscetReadException("folder_not_found", "resolve_folder", "Folder '" + normalizedPath + "' was not found.");
        }

        string[] segments = normalizedPath.Split(new char[] { '\\' }, StringSplitOptions.RemoveEmptyEntries);
        AscetFolder current = null;
        AscetFolder[] currentLevel = topFolders;

        for (int i = 0; i < segments.Length; i++)
        {
            current = FindFolderByName(currentLevel, segments[i]);
            if (current == null)
            {
                throw new AscetReadException("folder_not_found", "resolve_folder", "Folder '" + normalizedPath + "' was not found.");
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

        if (String.IsNullOrWhiteSpace(normalized))
        {
            throw new AscetReadException("invalid_argument", "resolve_folder", "Folder path must not be empty.");
        }

        return normalized;
    }

    private string BuildSummary(string componentPath, AscetComponentKind componentKind, AscetLanguageKind languageKind, bool created, bool alreadyExisted)
    {
        if (alreadyExisted)
        {
            return "Component '" + componentPath + "' already exists.";
        }

        if (componentKind == AscetComponentKind.StateMachine)
        {
            return (created ? "Created " : "Resolved ") + "state machine " + componentPath + ".";
        }

        if (componentKind == AscetComponentKind.Enumeration)
        {
            return (created ? "Created " : "Resolved ") + "enumeration " + componentPath + ".";
        }

        return (created ? "Created " : "Resolved ")
            + languageKind.ToString()
            + " "
            + componentKind.ToString().ToLowerInvariant()
            + " "
            + componentPath
            + ".";
    }
}
