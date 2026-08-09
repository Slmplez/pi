using System;
using System.Collections;
using System.Collections.Generic;
using System.Reflection;
using de.etas.cebra.toolAPI.Ascet;
using de.etas.cebra.toolAPI.Common;

public sealed class AscetGetRequest
{
    public string Oid { get; set; }
    public string Path { get; set; }
    public string TargetPathPrefix { get; set; }
    public string ElementName { get; set; }
    public string FormulaName { get; set; }
    public string DiagramName { get; set; }
    public string ProviderOid { get; set; }
    public string ProviderPath { get; set; }
    public string NameFilter { get; set; }
    public IList<string> Scopes { get; set; }
    public int Depth { get; set; }
    public int MaxFolders { get; set; }
    public int MaxComponents { get; set; }

    public AscetGetRequest()
    {
        Oid = String.Empty;
        Path = String.Empty;
        TargetPathPrefix = String.Empty;
        ElementName = String.Empty;
        FormulaName = String.Empty;
        DiagramName = "Main";
        ProviderOid = String.Empty;
        ProviderPath = String.Empty;
        NameFilter = String.Empty;
        Scopes = new List<string>();
        Depth = 1;
        MaxFolders = 0;
        MaxComponents = 0;
    }
}

public sealed class AscetGetTraversalState
{
    public int FoldersVisited { get; set; }
    public int ComponentsScanned { get; set; }
    public bool Truncated { get; set; }

    public AscetGetTraversalState()
    {
        FoldersVisited = 0;
        ComponentsScanned = 0;
        Truncated = false;
    }
}

public sealed class AscetGetService
{
    public Dictionary<string, object> Execute(
        string operation,
        IDictionary<string, object> payload,
        AscetDataBase database,
        AscetDatabaseRef databaseRef)
    {
        if (database == null)
        {
            throw new AscetReadException("database_not_open", operation ?? "ascet_get", "No ASCET database is open.");
        }

        AscetGetRequest request = ParseRequest(payload, operation);
        AscetGetTraversalState state = new AscetGetTraversalState();
        List<Dictionary<string, object>> items;
        switch (operation)
        {
            case "get_tree": items = GetTree(database, request, state); break;
            case "get_elements": items = GetElements(database, request, state); break;
            case "get_formulas": items = GetFormulas(database, request, state); break;
            case "get_component_refs": items = GetComponentRefs(database, request, state); break;
            case "get_bde_edges": items = GetBdeEdges(database, request, state); break;
            case "get_import_binding": items = GetImportBinding(database, request, state); break;
            case "get_dbitem_refs": items = GetDbItemRefs(database, request, state); break;
            default:
                throw new AscetReadException("unsupported_operation", operation ?? "ascet_get", "Unsupported ASCET get operation.");
        }

        Dictionary<string, object> coverage = new Dictionary<string, object>();
        coverage["status"] = state.Truncated ? "partial" : "complete_for_scope";
        coverage["foldersVisited"] = state.FoldersVisited;
        coverage["componentsScanned"] = state.ComponentsScanned;

        Dictionary<string, object> result = new Dictionary<string, object>();
        result["items"] = items;
        result["coverage"] = coverage;
        result["truncated"] = state.Truncated;
        result["source"] = "live";
        result["database"] = BuildDatabasePayload(databaseRef);
        return result;
    }

    private static AscetGetRequest ParseRequest(IDictionary<string, object> payload, string operation)
    {
        AscetGetRequest request = new AscetGetRequest();
        request.Oid = GetString(payload, "oid");
        request.Path = NormalizePath(GetString(payload, "path"));
        request.TargetPathPrefix = NormalizePath(GetString(payload, "targetPathPrefix"));
        request.ElementName = GetString(payload, "elementName");
        request.FormulaName = GetString(payload, "formulaName");
        request.DiagramName = FirstNonEmpty(GetString(payload, "diagramName"), "Main");
        request.ProviderOid = GetString(payload, "providerOid");
        request.ProviderPath = NormalizePath(GetString(payload, "providerPath"));
        request.NameFilter = FirstNonEmpty(GetString(payload, "name"), request.ElementName, request.FormulaName);
        request.Scopes = GetStringList(payload, "scopes");
        request.Depth = GetNonNegativeInt(payload, "depth", 1, operation);
        request.MaxFolders = GetNonNegativeInt(payload, "maxFolders", 0, operation);
        request.MaxComponents = GetNonNegativeInt(payload, "maxComponents", 0, operation);
        return request;
    }

    private static List<Dictionary<string, object>> GetTree(AscetDataBase database, AscetGetRequest request, AscetGetTraversalState state)
    {
        List<Dictionary<string, object>> items = new List<Dictionary<string, object>>();
        if (!String.IsNullOrWhiteSpace(request.Oid))
        {
            DataBaseItem targetItem = ResolveTargetItem(database, request, "get_tree");
            string canonicalPath = NormalizePath(SafeGetPath(targetItem));
            string targetPath = FirstNonEmpty(canonicalPath, request.Path, SafeGetName(targetItem));
            AscetFolder folderTarget = targetItem as AscetFolder;
            if (folderTarget != null)
            {
                AppendTreeFolder(folderTarget, targetPath, request.Depth, request, state, items, true);
                return items;
            }

            AppendTreeItemChildren(targetItem, targetPath, request.Depth, request, state, items, true);
            return items;
        }

        string requestedPath = FirstNonEmpty(request.TargetPathPrefix, request.Path);
        if (String.IsNullOrWhiteSpace(requestedPath))
        {
            AscetFolder[] topFolders = database.GetAllAscetFolders();
            if (topFolders == null) return items;
            for (int i = 0; i < topFolders.Length; i++)
            {
                AscetFolder folder = topFolders[i];
                if (folder != null && !ReachedFolderBudget(request, state))
                {
                    AppendTreeFolder(folder, folder.GetName() ?? String.Empty, request.Depth, request, state, items, false);
                }
            }
            return items;
        }

        if (!String.IsNullOrWhiteSpace(request.TargetPathPrefix))
        {
            AscetFolder targetFolder = ResolveFolder(database, requestedPath);
            AppendTreeFolder(targetFolder, requestedPath, request.Depth, request, state, items, true);
            return items;
        }

        DataBaseItem targetItemByPath = ResolveTargetItem(database, request, "get_tree");
        AscetFolder folderTargetByPath = targetItemByPath as AscetFolder;
        if (folderTargetByPath != null)
        {
            AppendTreeFolder(folderTargetByPath, requestedPath, request.Depth, request, state, items, true);
            return items;
        }

        AppendTreeItemChildren(targetItemByPath, requestedPath, request.Depth, request, state, items, true);
        return items;
    }

    private static void AppendTreeFolder(AscetFolder folder, string folderPath, int remainingDepth, AscetGetRequest request, AscetGetTraversalState state, IList<Dictionary<string, object>> items, bool includeFolder)
    {
        if (folder == null || ReachedFolderBudget(request, state)) return;
        state.FoldersVisited++;
        if (includeFolder) items.Add(BuildTreeItem(folder, folderPath));
        if (remainingDepth <= 0 || state.Truncated) return;

        Array directItems = GetFolderItems(folder);
        if (directItems != null)
        {
            for (int i = 0; i < directItems.Length; i++)
            {
                object raw = directItems.GetValue(i);
                AscetFolder childFolder = raw as AscetFolder;
                DataBaseItem item = raw as DataBaseItem;
                if (raw == null) continue;
                string itemPath = CombinePath(folderPath, SafeGetName(raw));
                if (childFolder != null)
                {
                    AppendTreeFolder(childFolder, itemPath, remainingDepth - 1, request, state, items, true);
                    continue;
                }
                if (item == null) continue;
                if (item is CodeComponent)
                {
                    if (ReachedComponentBudget(request, state)) continue;
                    state.ComponentsScanned++;
                }
                items.Add(BuildTreeItem(item, itemPath));
                if (item is AscetProject && remainingDepth > 1)
                {
                    AppendTreeItemChildren(item, itemPath, remainingDepth - 1, request, state, items, false);
                }
            }
        }

        IList<AscetFolder> childFolders = GetChildFolders(folder);
        for (int i = 0; i < childFolders.Count; i++)
        {
            AscetFolder child = childFolders[i];
            string childPath = CombinePath(folderPath, child == null ? String.Empty : child.GetName());
            if (child != null && !ContainsTreePath(items, childPath))
            {
                AppendTreeFolder(child, childPath, remainingDepth - 1, request, state, items, true);
            }
        }
    }

    private static void AppendTreeItemChildren(DataBaseItem parent, string parentPath, int remainingDepth, AscetGetRequest request, AscetGetTraversalState state, IList<Dictionary<string, object>> items, bool includeParent)
    {
        if (parent == null) return;
        if (includeParent) items.Add(BuildTreeItem(parent, parentPath));
        if (remainingDepth <= 0 || state.Truncated) return;

        Array children = GetDataBaseItemChildren(parent);
        if (children == null) return;
        for (int i = 0; i < children.Length; i++)
        {
            object raw = children.GetValue(i);
            if (raw == null) continue;
            CodeComponent component = InvokeOptional(raw, "GetRepresentedClass") as CodeComponent;
            if (component == null)
            {
                component = raw as CodeComponent ?? (InvokeOptional(raw, "GetOwnerForElement") as CodeComponent);
            }
            object child = component ?? raw;
            if (child is CodeComponent)
            {
                if (ReachedComponentBudget(request, state)) return;
                state.ComponentsScanned++;
            }
            string childName = parent is AscetProject ? SafeGetName(raw) : SafeGetName(child);
            string childPath = parent is AscetProject
                ? parentPath + "::" + childName
                : CombinePath(parentPath, childName);
            if (!ContainsTreePath(items, childPath))
            {
                items.Add(BuildTreeItem(child, childPath));
            }
        }
    }

    private static Array GetDataBaseItemChildren(DataBaseItem item)
    {
        foreach (string methodName in new string[] { "GetAllDataBaseItems", "GetAllCodeComponents", "GetAllComponents", "GetAllModules" })
        {
            Array children = InvokeOptional(item, methodName) as Array;
            if (children != null) return children;
        }
        return null;
    }
    private static List<Dictionary<string, object>> GetElements(AscetDataBase database, AscetGetRequest request, AscetGetTraversalState state)
    {
        List<ComponentTarget> components = ResolveComponents(database, request, state, "get_elements");
        List<Dictionary<string, object>> items = new List<Dictionary<string, object>>();
        for (int i = 0; i < components.Count; i++)
        {
            ComponentTarget component = components[i];
            Array elements = String.IsNullOrWhiteSpace(request.ElementName)
                ? component.Component.GetAllModelElements() as Array
                : ToSingleElementArray(component.Component.GetModelElement(request.ElementName));
            if (elements == null) continue;

            for (int j = 0; j < elements.Length; j++)
            {
                object element = elements.GetValue(j);
                if (element == null) continue;
                string name = SafeGetName(element);
                string scope = GetElementScope(element);
                if (!MatchesName(name, request.NameFilter) || !MatchesScope(scope, request.Scopes)) continue;

                Dictionary<string, object> item = new Dictionary<string, object>();
                item["path"] = component.Path + "::" + name;
                item["componentOid"] = GetObjectOid(component.Component);
                item["scope"] = scope;
                items.Add(item);
            }
        }
        return items;
    }

    private static List<Dictionary<string, object>> GetFormulas(AscetDataBase database, AscetGetRequest request, AscetGetTraversalState state)
    {
        DataBaseItem target = ResolveTargetItem(database, request, "get_formulas");
        AscetProject project = target as AscetProject;
        if (project == null)
        {
            throw new AscetReadException("unsupported_project_kind", "get_formulas", "The target must be an ASCET project.");
        }

        string projectPath = GetItemPath(target, request.Path);
        Formula[] formulas = project.GetAllFormulas();
        List<Dictionary<string, object>> items = new List<Dictionary<string, object>>();
        if (formulas == null) return items;

        for (int i = 0; i < formulas.Length; i++)
        {
            Formula formula = formulas[i];
            if (formula == null) continue;
            string name = formula.GetName() ?? String.Empty;
            if (!MatchesName(name, request.NameFilter)) continue;

            Dictionary<string, object> item = new Dictionary<string, object>();
            item["path"] = projectPath + "::" + name;
            item["oid"] = GetObjectOid(project);
            item["name"] = name;
            item["type"] = ProjectFormulaReadService.NormalizeFormulaType(formula);
            item["unit"] = formula.GetUnit() ?? String.Empty;
            item["comment"] = formula.GetComment() ?? String.Empty;
            item["contents"] = formula.GetContents() ?? String.Empty;
            item["parameters"] = ProjectFormulaReadService.ReadParameters(formula);
            items.Add(item);
        }
        return items;
    }

    private static List<Dictionary<string, object>> GetComponentRefs(AscetDataBase database, AscetGetRequest request, AscetGetTraversalState state)
    {
        List<ComponentTarget> components = ResolveComponents(database, request, state, "get_component_refs");
        List<Dictionary<string, object>> items = new List<Dictionary<string, object>>();
        for (int i = 0; i < components.Count; i++)
        {
            ComponentTarget component = components[i];
            Array references = component.Component.GetAllReferencedModelElements() as Array;
            if (references == null) continue;

            for (int j = 0; j < references.Length; j++)
            {
                object reference = references.GetValue(j);
                if (reference == null) continue;
                string name = SafeGetName(reference);
                string scope = GetElementScope(reference);
                if (!MatchesComponentReference(name, scope, request)) continue;
                object represented = InvokeOptional(reference, "GetRepresentedClass");
                DataBaseItem target = represented as DataBaseItem;

                Dictionary<string, object> item = new Dictionary<string, object>();
                item["sourcePath"] = component.Path;
                item["sourceOid"] = GetObjectOid(component.Component);
                item["elementPath"] = component.Path + "::" + name;
                item["scope"] = scope;
                item["targetPath"] = GetItemPath(target, SafeGetPath(represented));
                item["targetOid"] = GetObjectOid(target);
                items.Add(item);
            }
        }
        return items;
    }

    private static List<Dictionary<string, object>> GetBdeEdges(AscetDataBase database, AscetGetRequest request, AscetGetTraversalState state)
    {
        ComponentTarget target = ResolveSingleComponent(database, request, state, "get_bde_edges");
        AscetDiagram diagram = target.Component.GetDiagramWithName(request.DiagramName);
        if (diagram == null)
        {
            throw new AscetReadException("diagram_not_found", "get_bde_edges", "Diagram '" + request.DiagramName + "' was not found.");
        }
        if (!diagram.IsBlockDiagram())
        {
            throw new AscetReadException("unsupported_diagram_kind", "get_bde_edges", "The requested diagram is not a block diagram.");
        }

        BlockDiagramConnection[] connections = GetBlockDiagramConnections(diagram);
        List<Dictionary<string, object>> items = new List<Dictionary<string, object>>();
        for (int i = 0; i < connections.Length; i++)
        {
            BlockDiagramConnection connection = connections[i];
            if (connection == null) continue;
            Dictionary<string, object> item = new Dictionary<string, object>();
            item["fromPath"] = target.Path + "::" + FormatPin(connection.GetOutputPin());
            item["toPath"] = target.Path + "::" + FormatPin(connection.GetInputPin());
            items.Add(item);
        }
        return items;
    }

    private static List<Dictionary<string, object>> GetImportBinding(AscetDataBase database, AscetGetRequest request, AscetGetTraversalState state)
    {
        ComponentTarget consumer = ResolveSingleComponent(database, request, state, "get_import_binding");
        if (String.IsNullOrWhiteSpace(request.ElementName))
        {
            throw new AscetReadException("invalid_argument", "get_import_binding", "elementName is required.");
        }

        AscetModelElement importElement = consumer.Component.GetModelElement(request.ElementName);
        if (importElement == null)
        {
            throw new AscetReadException("element_not_found", "get_import_binding", "The requested import element was not found.");
        }

        AscetGetRequest providerRequest = new AscetGetRequest();
        providerRequest.Oid = request.ProviderOid;
        providerRequest.Path = request.ProviderPath;
        ComponentTarget provider = ResolveSingleComponent(database, providerRequest, state, "get_import_binding");
        bool matched = provider.Component.ExistsExportForImport(importElement);
        AscetModelElement exportElement = matched ? provider.Component.GetExportForImport(importElement) : null;

        Dictionary<string, object> item = new Dictionary<string, object>();
        item["matched"] = matched;
        item["importPath"] = consumer.Path + "::" + SafeGetName(importElement);
        item["exportPath"] = exportElement == null ? String.Empty : provider.Path + "::" + SafeGetName(exportElement);
        return new List<Dictionary<string, object>> { item };
    }

    private static List<Dictionary<string, object>> GetDbItemRefs(AscetDataBase database, AscetGetRequest request, AscetGetTraversalState state)
    {
        DataBaseItem source = ResolveTargetItem(database, request, "get_dbitem_refs");
        string sourcePath = GetItemPath(source, request.Path);
        Array references = InvokeOptional(source, "GetAllReferecedDataBaseItems") as Array;
        List<Dictionary<string, object>> items = new List<Dictionary<string, object>>();
        if (references == null) return items;

        for (int i = 0; i < references.Length; i++)
        {
            DataBaseItem target = references.GetValue(i) as DataBaseItem;
            if (target == null) continue;
            Dictionary<string, object> item = new Dictionary<string, object>();
            item["sourcePath"] = sourcePath;
            item["sourceOid"] = GetObjectOid(source);
            item["targetPath"] = GetItemPath(target, String.Empty);
            item["targetOid"] = GetObjectOid(target);
            item["kind"] = GetItemKind(target);
            items.Add(item);
        }
        return items;
    }

    private static ComponentTarget ResolveSingleComponent(AscetDataBase database, AscetGetRequest request, AscetGetTraversalState state, string operation)
    {
        List<ComponentTarget> components = ResolveComponents(database, request, state, operation);
        if (components.Count != 1)
        {
            throw new AscetReadException("invalid_target", operation, "The request must resolve to exactly one code component.");
        }
        return components[0];
    }

    private static List<ComponentTarget> ResolveComponents(AscetDataBase database, AscetGetRequest request, AscetGetTraversalState state, string operation)
    {
        List<ComponentTarget> result = new List<ComponentTarget>();
        if (!String.IsNullOrWhiteSpace(request.Oid) || !String.IsNullOrWhiteSpace(request.Path))
        {
            if (!String.IsNullOrWhiteSpace(request.Path) && request.Path.IndexOf("::", StringComparison.Ordinal) >= 0)
            {
                int separator = request.Path.LastIndexOf("::", StringComparison.Ordinal);
                string projectPath = request.Path.Substring(0, separator);
                string componentName = request.Path.Substring(separator + 2);
                DataBaseItem projectItem = ResolveItemByPath(database, projectPath, operation);
                AscetProject project = projectItem as AscetProject;
                if (project == null)
                {
                    throw new AscetReadException("unsupported_project_kind", operation, "The path before '::' must identify an ASCET project.");
                }
                object modelElement = InvokeOptional(project, "GetModule", componentName);
                CodeComponent represented = InvokeOptional(modelElement, "GetRepresentedClass") as CodeComponent;
                if (represented == null)
                {
                    throw new AscetReadException("target_not_found", operation, "No represented code component was found at '" + request.Path + "'.");
                }
                state.ComponentsScanned++;
                result.Add(new ComponentTarget(represented, request.Path));
                return result;
            }

            DataBaseItem item = ResolveTargetItem(database, request, operation);
            AscetFolder folderTarget = item as AscetFolder;
            if (folderTarget != null)
            {
                string folderPath = FirstNonEmpty(GetItemPath(item, request.Path), request.TargetPathPrefix, SafeGetName(folderTarget));
                CollectComponents(folderTarget, folderPath, request.Depth, request, state, result);
                return result;
            }

            CodeComponent component = item as CodeComponent;
            if (component == null)
            {
                throw new AscetReadException("unsupported_component_kind", operation, "The target must be a code component or folder.");
            }
            state.ComponentsScanned++;
            result.Add(new ComponentTarget(component, GetItemPath(item, request.Path)));
            return result;
        }

        if (String.IsNullOrWhiteSpace(request.TargetPathPrefix))
        {
            throw new AscetReadException("invalid_target", operation, "A component oid/path or targetPathPrefix is required.");
        }

        AscetFolder folder = ResolveFolder(database, request.TargetPathPrefix);
        CollectComponents(folder, request.TargetPathPrefix, request.Depth, request, state, result);
        return result;
    }

    private static void CollectComponents(AscetFolder folder, string folderPath, int remainingDepth, AscetGetRequest request, AscetGetTraversalState state, IList<ComponentTarget> result)
    {
        if (folder == null || ReachedFolderBudget(request, state)) return;
        state.FoldersVisited++;

        Array directItems = GetFolderItems(folder);
        if (directItems != null)
        {
            for (int i = 0; i < directItems.Length; i++)
            {
                CodeComponent component = directItems.GetValue(i) as CodeComponent;
                if (component == null) continue;
                if (ReachedComponentBudget(request, state)) return;
                state.ComponentsScanned++;
                result.Add(new ComponentTarget(component, CombinePath(folderPath, component.GetName() ?? String.Empty)));
            }
        }

        if (remainingDepth <= 0 || state.Truncated) return;
        IList<AscetFolder> children = GetChildFolders(folder);
        for (int i = 0; i < children.Count; i++)
        {
            AscetFolder child = children[i];
            if (child != null)
            {
                CollectComponents(child, CombinePath(folderPath, child.GetName() ?? String.Empty), remainingDepth - 1, request, state, result);
            }
        }
    }

    private static DataBaseItem ResolveItemByPath(AscetDataBase database, string path, string operation)
    {
        AscetItemPath parsed = AscetItemPath.Parse(path);
        DataBaseItem item = database.GetItemInFolder(parsed.ItemName, parsed.FolderPath ?? String.Empty);
        if (item == null)
        {
            throw new AscetReadException("target_not_found", operation, "No ASCET database item was found at '" + path + "'.");
        }
        return item;
    }
    private static DataBaseItem ResolveTargetItem(AscetDataBase database, AscetGetRequest request, string operation)
    {
        if (!String.IsNullOrWhiteSpace(request.Oid))
        {
            DataBaseItem byOid = ResolveItemByOid(database, request.Oid);
            if (byOid != null) return byOid;
            throw new AscetReadException("target_not_found", operation, "No ASCET database item was found for oid '" + request.Oid + "'.");
        }
        if (String.IsNullOrWhiteSpace(request.Path))
        {
            throw new AscetReadException("invalid_target", operation, "A target oid or path is required.");
        }

        return ResolveItemByPath(database, request.Path, operation);
    }

    private static DataBaseItem ResolveItemByOid(AscetDataBase database, string oid)
    {
        MethodInfo method = database.GetType().GetMethod("GetItemForOID", new Type[] { typeof(string) });
        return method == null ? null : method.Invoke(database, new object[] { oid }) as DataBaseItem;
    }

    private static AscetFolder ResolveFolder(AscetDataBase database, string folderPath)
    {
        string[] segments = NormalizePath(folderPath).Split(new char[] { '\\' }, StringSplitOptions.RemoveEmptyEntries);
        IList<AscetFolder> current = GetTopFolders(database);
        AscetFolder found = null;
        for (int i = 0; i < segments.Length; i++)
        {
            found = FindFolder(current, segments[i]);
            if (found == null)
            {
                throw new AscetReadException("folder_not_found", "resolve_folder", "Folder '" + folderPath + "' was not found.");
            }
            current = GetChildFolders(found);
        }
        return found;
    }

    private static IList<AscetFolder> GetTopFolders(AscetDataBase database)
    {
        List<AscetFolder> result = new List<AscetFolder>();
        AscetFolder[] folders = database.GetAllAscetFolders();
        if (folders == null) return result;
        for (int i = 0; i < folders.Length; i++)
        {
            if (folders[i] != null) result.Add(folders[i]);
        }
        return result;
    }

    private static IList<AscetFolder> GetChildFolders(AscetFolder folder)
    {
        List<AscetFolder> result = new List<AscetFolder>();
        if (folder == null) return result;
        foreach (string methodName in new string[] { "GetAllAscetFolders", "GetAllFolders", "GetAllSubFolders", "GetSubFolders" })
        {
            Array folders = InvokeOptional(folder, methodName) as Array;
            if (folders == null) continue;
            for (int i = 0; i < folders.Length; i++)
            {
                AscetFolder child = folders.GetValue(i) as AscetFolder;
                if (child != null) result.Add(child);
            }
            break;
        }
        return result;
    }

    private static AscetFolder FindFolder(IList<AscetFolder> folders, string name)
    {
        for (int i = 0; folders != null && i < folders.Count; i++)
        {
            AscetFolder candidate = folders[i];
            if (candidate != null && String.Equals(candidate.GetName(), name, StringComparison.Ordinal)) return candidate;
        }
        return null;
    }

    private static Array GetFolderItems(AscetFolder folder)
    {
        return InvokeOptional(folder, "GetAllDataBaseItems") as Array;
    }

    private static BlockDiagramConnection[] GetBlockDiagramConnections(AscetDiagram diagram)
    {
        if (diagram.IsDiscreteMethodDiagram())
        {
            DiscreteMethodDiagram value = diagram as DiscreteMethodDiagram;
            return value == null ? new BlockDiagramConnection[0] : (value.GetAllDiagramConnections() ?? new BlockDiagramConnection[0]);
        }
        if (diagram.IsContinuousMethodDiagram())
        {
            ContinuousMethodDiagram value = diagram as ContinuousMethodDiagram;
            return value == null ? new BlockDiagramConnection[0] : (value.GetAllDiagramConnections() ?? new BlockDiagramConnection[0]);
        }
        if (diagram.IsProcessDiagram())
        {
            ProcessDiagram value = diagram as ProcessDiagram;
            return value == null ? new BlockDiagramConnection[0] : (value.GetAllDiagramConnections() ?? new BlockDiagramConnection[0]);
        }
        if (diagram.IsActionConditionDiagram())
        {
            ActionConditionDiagram value = diagram as ActionConditionDiagram;
            return value == null ? new BlockDiagramConnection[0] : (value.GetAllDiagramConnections() ?? new BlockDiagramConnection[0]);
        }
        throw new AscetReadException("unsupported_diagram_kind", "get_bde_edges", "The requested diagram is not a supported block diagram.");
    }

    private static string FormatPin(BlockDiagramElementPin pin)
    {
        if (pin == null) return "<unknown>";
        BlockDiagramElement element = pin.GetBlockDiagramElement();
        string elementName = SafeGetName(element);
        return elementName + "/" + (pin.GetName() ?? String.Empty);
    }

    private static Dictionary<string, object> BuildTreeItem(object item, string path)
    {
        Dictionary<string, object> result = new Dictionary<string, object>();
        result["path"] = path ?? String.Empty;
        result["oid"] = GetObjectOid(item);
        result["kind"] = GetItemKind(item);
        return result;
    }

    private static Dictionary<string, object> BuildDatabasePayload(AscetDatabaseRef databaseRef)
    {
        Dictionary<string, object> result = new Dictionary<string, object>();
        result["name"] = databaseRef == null ? String.Empty : (databaseRef.Name ?? String.Empty);
        result["path"] = databaseRef == null ? String.Empty : (databaseRef.Path ?? String.Empty);
        return result;
    }

    private static bool ReachedFolderBudget(AscetGetRequest request, AscetGetTraversalState state)
    {
        if (request.MaxFolders <= 0 || state.FoldersVisited < request.MaxFolders) return false;
        state.Truncated = true;
        return true;
    }

    private static bool ReachedComponentBudget(AscetGetRequest request, AscetGetTraversalState state)
    {
        if (request.MaxComponents <= 0 || state.ComponentsScanned < request.MaxComponents) return false;
        state.Truncated = true;
        return true;
    }

    private static bool ContainsTreePath(IList<Dictionary<string, object>> items, string path)
    {
        for (int i = 0; items != null && i < items.Count; i++)
        {
            object value;
            if (items[i].TryGetValue("path", out value) && String.Equals(value as string, path, StringComparison.Ordinal)) return true;
        }
        return false;
    }

    internal static bool MatchesComponentReference(string name, string scope, AscetGetRequest request)
    {
        return request != null && MatchesName(name, request.NameFilter) && MatchesScope(scope, request.Scopes);
    }

    private static bool MatchesName(string value, string filter)
    {
        return String.IsNullOrWhiteSpace(filter) || String.Equals(value ?? String.Empty, filter, StringComparison.Ordinal);
    }

    private static bool MatchesScope(string scope, IList<string> scopes)
    {
        if (scopes == null || scopes.Count == 0) return true;
        for (int i = 0; i < scopes.Count; i++)
        {
            if (String.Equals(scope, scopes[i], StringComparison.OrdinalIgnoreCase)) return true;
        }
        return false;
    }

    private static string GetElementScope(object element)
    {
        if (InvokeBoolean(element, "IsImported")) return "imported";
        if (InvokeBoolean(element, "IsExported")) return "exported";
        return "local";
    }

    private static string GetItemKind(object item)
    {
        if (item is AscetFolder) return "folder";
        if (item is AscetProject) return "project";
        string typeName = item == null ? String.Empty : item.GetType().Name;
        string normalized = typeName.ToLowerInvariant();
        if (normalized.Contains("module")) return "module";
        if (normalized.Contains("class")) return "class";
        if (normalized.Contains("statemachine")) return "statemachine";
        if (normalized.Contains("enumeration")) return "enumeration";
        return String.IsNullOrWhiteSpace(normalized) ? "unknown" : normalized;
    }

    private static string GetItemPath(DataBaseItem item, string knownPath)
    {
        if (!String.IsNullOrWhiteSpace(knownPath)) return knownPath;
        return SafeGetPath(item);
    }

    private static string SafeGetPath(object target)
    {
        return Convert.ToString(InvokeOptional(target, "GetNameWithPath")) ?? String.Empty;
    }

    private static string SafeGetName(object target)
    {
        if (target == null) return String.Empty;
        return Convert.ToString(InvokeOptional(target, "GetName")) ?? String.Empty;
    }

    private static string GetObjectOid(object target)
    {
        foreach (string methodName in new string[] { "GetOID", "GetOid", "GetObjectOID", "GetObjectId" })
        {
            string oid = Convert.ToString(InvokeOptional(target, methodName)) ?? String.Empty;
            if (!String.IsNullOrWhiteSpace(oid)) return oid;
        }
        return String.Empty;
    }

    private static Array ToSingleElementArray(object value)
    {
        if (value == null) return null;
        Array result = Array.CreateInstance(value.GetType(), 1);
        result.SetValue(value, 0);
        return result;
    }

    private static object InvokeOptional(object target, string methodName, params object[] arguments)
    {
        if (target == null || String.IsNullOrWhiteSpace(methodName)) return null;
        object[] resolvedArguments = arguments ?? new object[0];
        MethodInfo[] methods = target.GetType().GetMethods(BindingFlags.Instance | BindingFlags.Public);
        for (int i = 0; i < methods.Length; i++)
        {
            MethodInfo method = methods[i];
            if (!String.Equals(method.Name, methodName, StringComparison.Ordinal)) continue;
            if (method.GetParameters().Length != resolvedArguments.Length) continue;
            return method.Invoke(target, resolvedArguments);
        }
        return null;
    }

    private static bool InvokeBoolean(object target, string methodName)
    {
        object value = InvokeOptional(target, methodName);
        return value is bool && (bool)value;
    }

    private static string GetString(IDictionary<string, object> payload, string key)
    {
        if (payload == null || !payload.ContainsKey(key) || payload[key] == null) return String.Empty;
        return Convert.ToString(payload[key]) ?? String.Empty;
    }

    private static IList<string> GetStringList(IDictionary<string, object> payload, string key)
    {
        List<string> result = new List<string>();
        if (payload == null || !payload.ContainsKey(key) || payload[key] == null) return result;
        IEnumerable values = payload[key] as IEnumerable;
        if (values == null || payload[key] is string) return result;
        foreach (object value in values)
        {
            string text = Convert.ToString(value) ?? String.Empty;
            if (!String.IsNullOrWhiteSpace(text)) result.Add(text.Trim().ToLowerInvariant());
        }
        return result;
    }

    private static int GetNonNegativeInt(IDictionary<string, object> payload, string key, int defaultValue, string operation)
    {
        if (payload == null || !payload.ContainsKey(key) || payload[key] == null) return defaultValue;
        int value;
        try { value = Convert.ToInt32(payload[key]); }
        catch (Exception ex)
        {
            throw new AscetReadException("invalid_argument", operation, "Field '" + key + "' must be a non-negative integer.", ex);
        }
        if (value < 0) throw new AscetReadException("invalid_argument", operation, "Field '" + key + "' must be a non-negative integer.");
        return value;
    }

    private static string NormalizePath(string value)
    {
        string normalized = (value ?? String.Empty).Trim().Replace('/', '\\');
        while (normalized.StartsWith("\\", StringComparison.Ordinal)) normalized = normalized.Substring(1);
        while (normalized.EndsWith("\\", StringComparison.Ordinal)) normalized = normalized.Substring(0, normalized.Length - 1);
        return normalized;
    }

    private static string CombinePath(string parentPath, string name)
    {
        if (String.IsNullOrWhiteSpace(parentPath)) return name ?? String.Empty;
        if (String.IsNullOrWhiteSpace(name)) return parentPath;
        return parentPath + "\\" + name;
    }

    private static string FirstNonEmpty(params string[] values)
    {
        if (values == null) return String.Empty;
        for (int i = 0; i < values.Length; i++)
        {
            if (!String.IsNullOrWhiteSpace(values[i])) return values[i];
        }
        return String.Empty;
    }

    private sealed class ComponentTarget
    {
        public ComponentTarget(CodeComponent component, string path)
        {
            Component = component;
            Path = path ?? String.Empty;
        }

        public CodeComponent Component { get; private set; }
        public string Path { get; private set; }
    }
}
