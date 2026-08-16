using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Reflection;
using de.etas.cebra.toolAPI.Ascet;

public sealed class AscetPreflightCreateFolderResult
{
    public string FolderPath { get; set; }
    public string DatabasePath { get; set; }
    public List<string> Existing { get; set; }
    public List<string> WillCreate { get; set; }
    public List<Dictionary<string, object>> Conflicts { get; set; }
    public List<string> ParentContainerRuntimeTypes { get; set; }
    public string CapabilityStatus { get; set; }
    public List<string> CapabilityMethods { get; set; }
    public bool SaveAvailable { get; set; }
    public bool ReadbackAvailable { get; set; }
    public bool NoOp { get; set; }
}

public sealed class AscetPreflightCreateFolderService : AscetReadDomainServiceBase
{
    private static readonly string[] AddFolderMethodNames =
        new string[] { "AddAscetSubFolder", "AddSubFolder", "AddAscetFolder", "AddFolder", "CreateFolder" };

    public AscetPreflightCreateFolderResult Preflight(string folderPath)
    {
        string normalizedPath = NormalizeFolderPath(folderPath);
        return ExecuteWithSession("preflight_create_folder", delegate(AscetSession session)
        {
            AscetDataBase database = session.GetCurrentDatabaseHandle();
            if (database == null)
            {
                throw new AscetReadException("database_not_open", "preflight_create_folder", "No ASCET database is open.");
            }

            AscetDatabaseRef databaseRef = AscetDatabaseIdentityResolver.Resolve(database, session.GetToolHandle());
            AscetPreflightCreateFolderResult result = new AscetPreflightCreateFolderResult();
            result.FolderPath = normalizedPath;
            result.DatabasePath = databaseRef == null ? String.Empty : (databaseRef.CanonicalPath ?? databaseRef.Path ?? String.Empty);
            result.Existing = new List<string>();
            result.WillCreate = new List<string>();
            result.Conflicts = new List<Dictionary<string, object>>();
            result.ParentContainerRuntimeTypes = new List<string>();
            result.CapabilityMethods = new List<string>();
            result.SaveAvailable = HasSave(database);
            result.ReadbackAvailable = true;

            string[] segments = normalizedPath.Split(new char[] { '\\' }, StringSplitOptions.RemoveEmptyEntries);
            object currentContainer = database;
            IList currentFolders = ToList(database.GetAllAscetFolders());
            string currentPath = String.Empty;
            bool missingAncestor = false;

            for (int i = 0; i < segments.Length; i++)
            {
                currentPath = String.IsNullOrEmpty(currentPath) ? segments[i] : currentPath + "\\" + segments[i];
                result.ParentContainerRuntimeTypes.Add(GetRuntimeTypeName(currentContainer, missingAncestor));

                if (!missingAncestor)
                {
                    AscetFolder existingFolder = FindFolder(currentFolders, segments[i]);
                    if (existingFolder != null)
                    {
                        result.Existing.Add(currentPath);
                        currentContainer = existingFolder;
                        currentFolders = ReadChildFolders(existingFolder);
                        continue;
                    }

                    Dictionary<string, object> conflict = FindNamedConflict(currentContainer, segments[i]);
                    if (conflict != null)
                    {
                        conflict["path"] = currentPath;
                        result.Conflicts.Add(conflict);
                        continue;
                    }
                }

                missingAncestor = true;
                result.WillCreate.Add(currentPath);
                Type capabilityType = currentContainer == null ? typeof(AscetFolder) : currentContainer.GetType();
                MethodInfo capability = FindAddFolderMethod(capabilityType);
                if (capability == null && capabilityType != typeof(AscetFolder))
                {
                    capability = FindAddFolderMethod(typeof(AscetFolder));
                }
                result.CapabilityMethods.Add(capability == null ? String.Empty : capability.DeclaringType.FullName + "." + capability.Name + "(String)");
                currentContainer = null;
                currentFolders = new ArrayList();
            }

            bool capabilitiesComplete = true;
            for (int i = 0; i < result.CapabilityMethods.Count; i++)
            {
                if (String.IsNullOrWhiteSpace(result.CapabilityMethods[i])) capabilitiesComplete = false;
            }
            result.CapabilityStatus = result.Conflicts.Count > 0 || !capabilitiesComplete || !result.SaveAvailable || !result.ReadbackAvailable
                ? "unsupported"
                : "supported";
            result.NoOp = result.WillCreate.Count == 0 && result.Conflicts.Count == 0;
            return result;
        });
    }

    private static MethodInfo FindAddFolderMethod(Type type)
    {
        if (type == null) return null;
        for (int i = 0; i < AddFolderMethodNames.Length; i++)
        {
            MethodInfo method = type.GetMethod(AddFolderMethodNames[i], BindingFlags.Instance | BindingFlags.Public);
            if (method == null) continue;
            ParameterInfo[] parameters = method.GetParameters();
            if (parameters.Length == 1 && parameters[0].ParameterType == typeof(string)) return method;
        }
        return null;
    }

    private static bool HasSave(AscetDataBase database)
    {
        MethodInfo save = database == null ? null : database.GetType().GetMethod("Save", BindingFlags.Instance | BindingFlags.Public);
        return save != null && save.GetParameters().Length == 0;
    }

    private static string GetRuntimeTypeName(object container, bool missingAncestor)
    {
        if (container != null) return container.GetType().FullName ?? container.GetType().Name;
        return missingAncestor ? (typeof(AscetFolder).FullName ?? typeof(AscetFolder).Name) : String.Empty;
    }

    private static IList ReadChildFolders(AscetFolder folder)
    {
        if (folder == null) return new ArrayList();
        string[] methods = new string[] { "GetAllAscetSubFolders", "GetAllSubFolders", "GetAllAscetFolders", "GetAllFolders", "GetSubFolders" };
        for (int i = 0; i < methods.Length; i++)
        {
            MethodInfo method = folder.GetType().GetMethod(methods[i], BindingFlags.Instance | BindingFlags.Public);
            if (method == null || method.GetParameters().Length != 0) continue;
            object value = method.Invoke(folder, null);
            Array array = value as Array;
            if (array != null) return ToList(array);
        }
        return new ArrayList();
    }

    private static AscetFolder FindFolder(IList folders, string name)
    {
        if (folders == null) return null;
        for (int i = 0; i < folders.Count; i++)
        {
            AscetFolder folder = folders[i] as AscetFolder;
            if (folder != null && String.Equals(folder.GetName(), name, StringComparison.Ordinal)) return folder;
        }
        return null;
    }

    private static Dictionary<string, object> FindNamedConflict(object container, string name)
    {
        if (container == null) return null;
        string[] methods = new string[] {
            "GetAllAscetComponents", "GetAllComponents", "GetAllAscetProjects", "GetAllProjects",
            "GetAllAscetItems", "GetAllItems", "GetAllObjects"
        };
        for (int i = 0; i < methods.Length; i++)
        {
            MethodInfo method = container.GetType().GetMethod(methods[i], BindingFlags.Instance | BindingFlags.Public);
            if (method == null || method.GetParameters().Length != 0) continue;
            Array values = method.Invoke(container, null) as Array;
            if (values == null) continue;
            for (int j = 0; j < values.Length; j++)
            {
                object value = values.GetValue(j);
                if (value == null || value is AscetFolder) continue;
                string observedName = ReadName(value);
                if (!String.Equals(observedName, name, StringComparison.Ordinal)) continue;
                Dictionary<string, object> conflict = new Dictionary<string, object>();
                conflict["name"] = observedName;
                conflict["observedKind"] = value.GetType().Name;
                conflict["runtimeType"] = value.GetType().FullName ?? value.GetType().Name;
                return conflict;
            }
        }
        return null;
    }

    private static string ReadName(object value)
    {
        MethodInfo method = value.GetType().GetMethod("GetName", BindingFlags.Instance | BindingFlags.Public);
        if (method == null || method.GetParameters().Length != 0) return String.Empty;
        return Convert.ToString(method.Invoke(value, null)) ?? String.Empty;
    }

    private static IList ToList(Array values)
    {
        ArrayList result = new ArrayList();
        if (values == null) return result;
        for (int i = 0; i < values.Length; i++)
        {
            object value = values.GetValue(i);
            if (value != null) result.Add(value);
        }
        return result;
    }

    private static string NormalizeFolderPath(string folderPath)
    {
        string normalized = (folderPath ?? String.Empty).Trim().Replace('/', '\\');
        while (normalized.StartsWith("\\", StringComparison.Ordinal)) normalized = normalized.Substring(1);
        while (normalized.EndsWith("\\", StringComparison.Ordinal)) normalized = normalized.Substring(0, normalized.Length - 1);
        if (String.IsNullOrWhiteSpace(normalized))
        {
            throw new AscetReadException("invalid_argument", "preflight_create_folder", "Folder path must not be empty.");
        }
        return normalized;
    }
}

public static class AscetPreflightCreateFolder
{
    public static int Main(string[] args)
    {
        TextWriter originalOut = Console.Out;
        StringWriter suppressedOut = null;
        try
        {
            if (args == null || args.Length < 1)
            {
                throw new AscetReadException("invalid_argument", "preflight_create_folder", "usage: AscetCli.exe exec preflight_create_folder <folder-path> [--json]");
            }
            bool emitJson = false;
            for (int i = 1; i < args.Length; i++)
            {
                if (String.Equals(args[i], "--json", StringComparison.OrdinalIgnoreCase)) emitJson = true;
                else throw new AscetReadException("invalid_argument", "preflight_create_folder", "Unknown argument '" + args[i] + "'.");
            }
            if (emitJson)
            {
                suppressedOut = new StringWriter();
                Console.SetOut(suppressedOut);
            }
            AscetToolApiBootstrap.ConfigureAssemblyResolution();
            AscetPreflightCreateFolderResult result = new AscetPreflightCreateFolderService().Preflight(args[0]);
            Dictionary<string, object> payload = new Dictionary<string, object>();
            payload["folderPath"] = result.FolderPath;
            payload["databasePath"] = result.DatabasePath;
            payload["existing"] = result.Existing;
            payload["willCreate"] = result.WillCreate;
            payload["conflicts"] = result.Conflicts;
            payload["parentContainerRuntimeTypes"] = result.ParentContainerRuntimeTypes;
            Dictionary<string, object> capability = new Dictionary<string, object>();
            capability["status"] = result.CapabilityStatus;
            capability["methods"] = result.CapabilityMethods;
            capability["saveAvailable"] = result.SaveAvailable;
            capability["readbackAvailable"] = result.ReadbackAvailable;
            payload["capability"] = capability;
            payload["noOp"] = result.NoOp;
            string output = emitJson ? AscetJsonContract.Serialize(payload) : "Folder: " + result.FolderPath + Environment.NewLine;
            Console.SetOut(originalOut);
            Console.Write(output);
            return 0;
        }
        catch (Exception ex)
        {
            Console.SetOut(originalOut);
            AscetReadException ascet = ex as AscetReadException;
            Console.Error.WriteLine(ascet == null ? ex.GetType().FullName + ":" + ex.Message : ascet.Code + ":" + ascet.Operation + ":" + ascet.Message);
            return 1;
        }
        finally
        {
            Console.SetOut(originalOut);
            if (suppressedOut != null) suppressedOut.Dispose();
        }
    }
}
