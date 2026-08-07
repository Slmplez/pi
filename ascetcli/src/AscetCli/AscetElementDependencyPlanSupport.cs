using System;
using System.Collections.Generic;
using System.IO;
using System.Reflection;
using System.Text;
using de.etas.cebra.toolAPI.Ascet;
using de.etas.cebra.toolAPI.Common;

public sealed class AscetElementDependencyPlanArguments
{
    public string TargetPath { get; set; }
    public string ElementName { get; set; }
    public string TargetKind { get; set; }
    public bool EmitJson { get; set; }
}

public sealed class AscetElementDependencyPlanMatch
{
    public string ComponentPath { get; set; }
    public string ElementName { get; set; }
    public string Kind { get; set; }
    public string Scope { get; set; }
    public string Schema { get; set; }
    public string BeforeDependency { get; set; }
    public string FormulaCode { get; set; }
    public bool IsParameter { get; set; }
    public bool IsDependent { get; set; }
    public bool Supported { get; set; }
    public string UnsupportedReason { get; set; }
}

public sealed class AscetElementDependencyPlanResult
{
    public string TargetPath { get; set; }
    public string TargetKind { get; set; }
    public string ElementName { get; set; }
    public IList<AscetElementDependencyPlanMatch> Matches { get; set; }
    public IList<string> Issues { get; set; }
}

public sealed class AscetElementDependencyPlanService : AscetReadDomainServiceBase
{
    public AscetElementDependencyPlanResult Plan(AscetElementDependencyPlanArguments arguments)
    {
        if (arguments == null)
        {
            throw new AscetReadException("invalid_argument", "element_dependency_plan_internal", "Arguments must not be null.");
        }

        if (String.IsNullOrWhiteSpace(arguments.TargetPath))
        {
            throw new AscetReadException("invalid_argument", "element_dependency_plan_internal", "Target path must not be empty.");
        }

        string targetKind = String.IsNullOrWhiteSpace(arguments.TargetKind) ? "auto" : arguments.TargetKind.Trim().ToLowerInvariant();
        return ExecuteWithSession("element_dependency_plan_internal", delegate(AscetSession session)
        {
            if (String.Equals(targetKind, "project", StringComparison.OrdinalIgnoreCase))
            {
                return PlanProject(session, arguments.TargetPath, arguments.ElementName ?? String.Empty);
            }

            if (String.Equals(targetKind, "folder", StringComparison.OrdinalIgnoreCase))
            {
                return PlanFolder(session, arguments.TargetPath, arguments.ElementName ?? String.Empty);
            }

            CodeComponent component = ResolveCodeComponent(session, arguments.TargetPath);
            return PlanComponent(component, arguments.TargetPath, arguments.ElementName ?? String.Empty);
        });
    }

    private AscetElementDependencyPlanResult PlanProject(AscetSession session, string projectPath, string elementName)
    {
        AscetProject project = ResolveProject(session, projectPath);
        bool enumerationSupported;
        IList<CodeComponent> components = GetProjectCodeComponents(project, out enumerationSupported);
        List<AscetElementDependencyPlanMatch> matches = new List<AscetElementDependencyPlanMatch>();
        List<string> issues = new List<string>();
        if (!enumerationSupported)
        {
            issues.Add("project_component_enumeration_unavailable");
        }

        for (int i = 0; i < components.Count; i++)
        {
            CodeComponent component = components[i];
            string componentPath = NormalizeExportedPath(SafeGetNameWithPath(component));
            if (String.IsNullOrWhiteSpace(componentPath))
            {
                issues.Add("component_plan_failed:<unknown>:component_path_unavailable");
                continue;
            }

            try
            {
                AscetElementDependencyPlanResult componentPlan = PlanComponent(component, componentPath, elementName);
                IList<AscetElementDependencyPlanMatch> componentMatches = componentPlan.Matches ?? new List<AscetElementDependencyPlanMatch>();
                for (int j = 0; j < componentMatches.Count; j++)
                {
                    matches.Add(componentMatches[j]);
                }
            }
            catch (AscetReadException ex)
            {
                issues.Add("component_plan_failed:" + componentPath + ":" + ex.Code);
            }
        }

        return new AscetElementDependencyPlanResult
        {
            TargetPath = projectPath,
            TargetKind = "project",
            ElementName = elementName ?? String.Empty,
            Matches = matches,
            Issues = issues
        };
    }

    private static AscetElementDependencyPlanResult PlanComponent(CodeComponent component, string componentPath, string elementName)
    {
        string directory = CreateTempDirectory("ascet-dependency-plan");
        try
        {
            if (!component.ExportXMLToFile(directory, false))
            {
                throw new AscetReadException("tool_api_error", "element_dependency_plan_internal", "ASCET ExportXMLToFile returned false for component '" + componentPath + "'.");
            }

            string main = AscetElementDependencyXml.FindMainAmd(directory);
            if (String.IsNullOrWhiteSpace(main))
            {
                throw new AscetReadException("tool_api_error", "element_dependency_plan_internal", "Exported component did not contain a *.main.amd file.");
            }

            IList<AscetElementDependencyCandidate> candidates = AscetElementDependencyXml.FindCandidates(main, elementName ?? String.Empty);
            List<AscetElementDependencyPlanMatch> matches = new List<AscetElementDependencyPlanMatch>();
            for (int i = 0; i < candidates.Count; i++)
            {
                matches.Add(ToMatch(componentPath, candidates[i]));
            }

            return new AscetElementDependencyPlanResult
            {
                TargetPath = componentPath,
                TargetKind = "component",
                ElementName = elementName ?? String.Empty,
                Matches = matches,
                Issues = new List<string>()
            };
        }
        finally
        {
            TryDeleteDirectory(directory);
        }
    }

    private AscetElementDependencyPlanResult PlanFolder(AscetSession session, string folderPath, string elementName)
    {
        AscetDataBase database = session.GetCurrentDatabaseHandle();
        AscetFolder folder = ResolveFolder(database, folderPath);
        IList<DataBaseItem> items = GetFolderItems(folder);
        List<AscetElementDependencyPlanMatch> matches = new List<AscetElementDependencyPlanMatch>();
        List<string> issues = new List<string>();

        for (int i = 0; i < items.Count; i++)
        {
            DataBaseItem item = items[i];
            CodeComponent component = item as CodeComponent;
            if (component == null)
            {
                continue;
            }

            string componentPath = NormalizeExportedPath(SafeGetNameWithPath(item));
            try
            {
                AscetElementDependencyPlanResult componentPlan = PlanComponent(component, componentPath, elementName);
                IList<AscetElementDependencyPlanMatch> componentMatches = componentPlan.Matches ?? new List<AscetElementDependencyPlanMatch>();
                for (int j = 0; j < componentMatches.Count; j++)
                {
                    matches.Add(componentMatches[j]);
                }
            }
            catch (AscetReadException ex)
            {
                issues.Add(componentPath + ":" + ex.Code);
            }
        }

        return new AscetElementDependencyPlanResult
        {
            TargetPath = folderPath,
            TargetKind = "folder",
            ElementName = elementName ?? String.Empty,
            Matches = matches,
            Issues = issues
        };
    }

    private AscetProject ResolveProject(AscetSession session, string projectPath)
    {
        DataBaseItem item = ResolveItemByPath(session, projectPath);
        AscetProject project = item as AscetProject;
        if (project == null)
        {
            throw new AscetReadException("unsupported_project_kind", "resolve_project", "Item '" + projectPath + "' is not an ASCET project.");
        }

        return project;
    }

    private static IList<CodeComponent> GetProjectCodeComponents(AscetProject project, out bool enumerationSupported)
    {
        List<CodeComponent> result = new List<CodeComponent>();
        Array items = InvokeProjectArray(project, new[]
        {
            "GetAllComponents",
            "GetAllCodeComponents",
            "GetAllDataBaseItems",
            "GetAllItems"
        });

        if (items == null)
        {
            enumerationSupported = false;
            return result;
        }

        enumerationSupported = true;
        for (int i = 0; i < items.Length; i++)
        {
            CodeComponent component = items.GetValue(i) as CodeComponent;
            if (component != null)
            {
                result.Add(component);
            }
        }

        return result;
    }

    private static Array InvokeProjectArray(AscetProject project, string[] names)
    {
        if (project == null || names == null)
        {
            return null;
        }

        for (int i = 0; i < names.Length; i++)
        {
            MethodInfo method = project.GetType().GetMethod(names[i], BindingFlags.Instance | BindingFlags.Public);
            if (method == null || method.GetParameters().Length != 0)
            {
                continue;
            }

            object value = method.Invoke(project, new object[0]);
            Array array = value as Array;
            if (array != null)
            {
                return array;
            }
        }

        return null;
    }

    private static AscetFolder ResolveFolder(AscetDataBase database, string folderPath)
    {
        if (database == null)
        {
            throw new AscetReadException("invalid_argument", "resolve_folder", "Database must not be null.");
        }

        string normalizedPath = folderPath == null ? String.Empty : folderPath.Trim().Trim('\\');
        if (String.IsNullOrWhiteSpace(normalizedPath))
        {
            throw new AscetReadException("invalid_argument", "resolve_folder", "Folder path must not be empty.");
        }

        AscetFolder[] topFolders = database.GetAllAscetFolders();
        Array currentLevel = topFolders;
        AscetFolder current = null;
        string[] segments = normalizedPath.Split(new[] { '\\' }, StringSplitOptions.RemoveEmptyEntries);
        for (int i = 0; i < segments.Length; i++)
        {
            current = FindFolderByName(currentLevel, segments[i]);
            if (current == null)
            {
                throw new AscetReadException("folder_not_found", "resolve_folder", "Folder '" + normalizedPath + "' was not found.");
            }

            currentLevel = InvokeFolderArray(current, new[] { "GetAllAscetFolders", "GetAllFolders", "GetAllSubFolders", "GetSubFolders" });
        }

        return current;
    }

    private static AscetFolder FindFolderByName(Array folders, string expectedName)
    {
        if (folders == null)
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

    private static IList<DataBaseItem> GetFolderItems(AscetFolder folder)
    {
        List<DataBaseItem> result = new List<DataBaseItem>();
        Array items = InvokeFolderArray(folder, new[] { "GetAllDataBaseItems", "GetAllItems", "GetAllComponents" });
        if (items == null)
        {
            return result;
        }

        for (int i = 0; i < items.Length; i++)
        {
            DataBaseItem item = items.GetValue(i) as DataBaseItem;
            if (item != null)
            {
                result.Add(item);
            }
        }

        return result;
    }

    private static Array InvokeFolderArray(AscetFolder folder, string[] names)
    {
        if (folder == null || names == null)
        {
            return null;
        }

        for (int i = 0; i < names.Length; i++)
        {
            MethodInfo method = folder.GetType().GetMethod(names[i], BindingFlags.Instance | BindingFlags.Public);
            if (method == null)
            {
                continue;
            }

            object value = method.Invoke(folder, new object[0]);
            Array array = value as Array;
            if (array != null)
            {
                return array;
            }
        }

        return null;
    }

    private static string SafeGetNameWithPath(DataBaseItem item)
    {
        try
        {
            return item == null ? String.Empty : (item.GetNameWithPath() ?? String.Empty);
        }
        catch
        {
            return String.Empty;
        }
    }

    private static string NormalizeExportedPath(string path)
    {
        string normalized = (path ?? String.Empty).Trim().Replace('/', '\\');
        while (normalized.StartsWith("\\", StringComparison.Ordinal))
        {
            normalized = normalized.Substring(1);
        }

        return normalized;
    }

    private static AscetElementDependencyPlanMatch ToMatch(string componentPath, AscetElementDependencyCandidate candidate)
    {
        return new AscetElementDependencyPlanMatch
        {
            ComponentPath = componentPath,
            ElementName = candidate == null ? String.Empty : (candidate.ElementName ?? String.Empty),
            Kind = candidate == null ? String.Empty : (candidate.Kind ?? String.Empty),
            Scope = candidate == null ? String.Empty : (candidate.Scope ?? String.Empty),
            Schema = candidate == null ? String.Empty : (candidate.Schema ?? String.Empty),
            BeforeDependency = candidate == null ? String.Empty : (candidate.BeforeDependency ?? String.Empty),
            FormulaCode = candidate == null ? String.Empty : (candidate.FormulaCode ?? String.Empty),
            IsParameter = candidate != null && candidate.IsParameter,
            IsDependent = candidate != null && candidate.IsDependent,
            Supported = candidate != null && candidate.Supported,
            UnsupportedReason = candidate == null ? String.Empty : (candidate.UnsupportedReason ?? String.Empty)
        };
    }

    private static string CreateTempDirectory(string prefix)
    {
        string root = Path.Combine(Path.GetTempPath(), "ascet-ed");
        Directory.CreateDirectory(root);
        string directory = Path.Combine(root, CompactTempPrefix(prefix) + "-" + Guid.NewGuid().ToString("N").Substring(0, 8));
        Directory.CreateDirectory(directory);
        return directory;
    }

    private static string CompactTempPrefix(string prefix)
    {
        if (String.Equals(prefix, "ascet-dependency-plan", StringComparison.Ordinal))
        {
            return "r";
        }

        return "x";
    }

    private static void TryDeleteDirectory(string directory)
    {
        try
        {
            if (!String.IsNullOrWhiteSpace(directory) && Directory.Exists(directory))
            {
                Directory.Delete(directory, true);
            }
        }
        catch
        {
        }
    }
}

public static class AscetElementDependencyPlanSupport
{
    public static Dictionary<string, object> BuildMatchPayload(AscetElementDependencyPlanMatch current)
    {
        Dictionary<string, object> match = new Dictionary<string, object>();
        match["component"] = current == null ? String.Empty : (current.ComponentPath ?? String.Empty);
        match["element"] = current == null ? String.Empty : (current.ElementName ?? String.Empty);
        if (current != null && !String.IsNullOrWhiteSpace(current.Kind))
        {
            match["kind"] = current.Kind;
        }
        if (current != null && !String.IsNullOrWhiteSpace(current.Scope))
        {
            match["scope"] = current.Scope;
        }
        if (current != null && !String.IsNullOrWhiteSpace(current.Schema))
        {
            match["schema"] = current.Schema;
        }
        if (current != null && !String.IsNullOrWhiteSpace(current.BeforeDependency))
        {
            match["dependency"] = current.BeforeDependency;
        }
        if (current != null && !String.IsNullOrWhiteSpace(current.FormulaCode))
        {
            match["formula"] = current.FormulaCode;
        }
        match["supported"] = current != null && current.Supported;
        if (current != null && !String.IsNullOrWhiteSpace(current.UnsupportedReason))
        {
            match["reason"] = current.UnsupportedReason;
        }
        return match;
    }

    public static string NormalizePath(string path)
    {
        if (String.IsNullOrWhiteSpace(path))
        {
            throw new AscetReadException("invalid_argument", "normalize_path", "Target path must not be empty.");
        }

        string normalized = path.Trim().Replace('/', '\\');
        while (normalized.StartsWith("\\", StringComparison.Ordinal))
        {
            normalized = normalized.Substring(1);
        }

        if (String.IsNullOrWhiteSpace(normalized))
        {
            throw new AscetReadException("invalid_argument", "normalize_path", "Target path must contain an item name.");
        }

        return normalized;
    }

    public static string NormalizeElementName(string elementName)
    {
        if (String.IsNullOrWhiteSpace(elementName))
        {
            throw new AscetReadException("invalid_argument", "normalize_element_name", "Element name must not be empty.");
        }

        return elementName.Trim();
    }

    public static string NormalizeTargetKind(string targetKind)
    {
        if (String.IsNullOrWhiteSpace(targetKind))
        {
            throw new AscetReadException("invalid_argument", "normalize_target_kind", "Target kind must not be empty.");
        }

        string normalized = targetKind.Trim().ToLowerInvariant();
        if (!String.Equals(normalized, "auto", StringComparison.Ordinal) &&
            !String.Equals(normalized, "component", StringComparison.Ordinal) &&
            !String.Equals(normalized, "project", StringComparison.Ordinal) &&
            !String.Equals(normalized, "folder", StringComparison.Ordinal))
        {
            throw new AscetReadException("invalid_argument", "normalize_target_kind", "Target kind must be auto, component, project, or folder.");
        }

        return normalized;
    }

    public static string FormatException(Exception ex)
    {
        StringBuilder builder = new StringBuilder();
        int depth = 0;
        while (ex != null)
        {
            AscetReadException ascet = ex as AscetReadException;
            builder.Append("Exception[").Append(depth).Append("]: ").Append(ex.GetType().FullName).AppendLine();
            if (ascet != null)
            {
                builder.Append("Code: ").Append(ascet.Code ?? String.Empty).AppendLine();
                builder.Append("Operation: ").Append(ascet.Operation ?? String.Empty).AppendLine();
            }
            builder.Append("Message: ").Append(ex.Message).AppendLine();
            if (!String.IsNullOrEmpty(ex.StackTrace))
            {
                builder.AppendLine("StackTrace:");
                builder.AppendLine(ex.StackTrace);
            }

            builder.AppendLine();
            ex = ex.InnerException;
            depth++;
        }

        return builder.ToString();
    }
}
