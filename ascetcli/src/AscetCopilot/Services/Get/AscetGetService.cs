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
    public string ScopeKind { get; set; }
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
        ScopeKind = String.Empty;
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
    public bool RootCollectionStarted { get; set; }
    public bool RootCollectionAvailable { get; set; }
    public bool RootCollectionCompleted { get; set; }
    public bool RootCollectionEmpty { get; set; }
    public bool ProjectCollectionCompleted { get; set; }
    public bool FolderCollectionCompleted { get; set; }
    public bool ComponentCollectionCompleted { get; set; }
    public bool EnumerationCollectionCompleted { get; set; }
    public int MissingOidCount { get; set; }
    public int MissingPathCount { get; set; }
    public IList<string> CollectionErrors { get; private set; }

    public AscetGetTraversalState()
    {
        FoldersVisited = 0;
        ComponentsScanned = 0;
        Truncated = false;
        RootCollectionStarted = false;
        RootCollectionAvailable = false;
        RootCollectionCompleted = false;
        RootCollectionEmpty = false;
        ProjectCollectionCompleted = false;
        FolderCollectionCompleted = false;
        ComponentCollectionCompleted = false;
        EnumerationCollectionCompleted = false;
        MissingOidCount = 0;
        MissingPathCount = 0;
        CollectionErrors = new List<string>();
    }

    public void RecordCollectionError(string error)
    {
        if (String.IsNullOrWhiteSpace(error) || CollectionErrors.Contains(error)) return;
        CollectionErrors.Add(error);
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
            case "get_database_identity": items = new List<Dictionary<string, object>>(); break;
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

        AnalyzeIdentityEvidence(items, state);
        Dictionary<string, object> coverage = BuildCoverage(operation, request, state, databaseRef, items);

        Dictionary<string, object> result = new Dictionary<string, object>();
        result["items"] = items;
        result["coverage"] = coverage;
        result["truncated"] = state.Truncated;
        result["source"] = "live";
        result["database"] = BuildDatabasePayload(databaseRef);
        return result;
    }

    internal static Dictionary<string, object> BuildCoverage(
        string operation,
        AscetGetRequest request,
        AscetGetTraversalState state,
        AscetDatabaseRef databaseRef,
        IList<Dictionary<string, object>> items)
    {
        bool databaseIdentityOperation = String.Equals(operation, "get_database_identity", StringComparison.Ordinal);
        bool databaseScope = databaseIdentityOperation || String.Equals(request.ScopeKind, "database", StringComparison.Ordinal);
        bool databaseIdentityAvailable = databaseRef != null && !String.IsNullOrWhiteSpace(databaseRef.Path);
        bool rootFailure = !databaseIdentityOperation && databaseScope &&
            (!state.RootCollectionStarted || !state.RootCollectionAvailable || state.RootCollectionEmpty);
        bool collectorFailure = state.CollectionErrors.Count > 0;
        bool identityFailure = state.MissingOidCount > 0 || state.MissingPathCount > 0;
        bool mandatoryCollectorsCompleted = state.ProjectCollectionCompleted &&
            state.FolderCollectionCompleted &&
            state.ComponentCollectionCompleted &&
            state.EnumerationCollectionCompleted;
        bool failed = !databaseIdentityAvailable || rootFailure;
        bool partial = !failed && (state.Truncated || collectorFailure || identityFailure ||
            (databaseScope && !databaseIdentityOperation &&
                (!state.RootCollectionCompleted || !mandatoryCollectorsCompleted)));

        Dictionary<string, object> coverage = new Dictionary<string, object>();
        coverage["status"] = failed ? "failed" : (partial ? "partial" : "complete_for_scope");
        coverage["scopeKind"] = databaseScope ? "database" : InferScopeKind(request);
        coverage["scopeId"] = BuildScopeId(request, databaseRef);
        coverage["completeness"] = databaseScope
            ? (failed ? "failed" : (partial ? "partial" : "complete"))
            : "bounded";
        coverage["truncated"] = state.Truncated;
        coverage["foldersVisited"] = state.FoldersVisited;
        coverage["componentsScanned"] = state.ComponentsScanned;
        coverage["identityKinds"] = CollectIdentityKinds(items);
        coverage["collectorStarted"] = databaseIdentityOperation || state.RootCollectionStarted;
        coverage["collectorCompleted"] = !failed && !partial;
        coverage["rootCollectionAvailable"] = databaseIdentityOperation || state.RootCollectionAvailable;
        coverage["projectCollectionAvailable"] = !failed && state.ProjectCollectionCompleted;
        coverage["missingOidCount"] = state.MissingOidCount;
        coverage["missingPathCount"] = state.MissingPathCount;
        if (state.CollectionErrors.Count > 0) coverage["collectorErrors"] = state.CollectionErrors;
        if (databaseScope) coverage["collectors"] = BuildDatabaseCollectorPayload(items, state, databaseIdentityAvailable);
        return coverage;
    }

    private static Dictionary<string, object> BuildDatabaseCollectorPayload(
        IList<Dictionary<string, object>> items,
        AscetGetTraversalState state,
        bool databaseIdentityAvailable)
    {
        Dictionary<string, object> collectors = new Dictionary<string, object>();
        collectors["database"] = BuildCollectorPayload(true, databaseIdentityAvailable, databaseIdentityAvailable ? 1 : 0);
        collectors["projects"] = BuildCollectorPayload(
            state.RootCollectionStarted,
            state.ProjectCollectionCompleted,
            CountKind(items, "project"));
        collectors["folders"] = BuildCollectorPayload(
            state.RootCollectionStarted,
            state.FolderCollectionCompleted,
            CountKind(items, "folder"));
        collectors["components"] = BuildCollectorPayload(
            state.RootCollectionStarted,
            state.ComponentCollectionCompleted,
            CountKinds(items, new string[] { "class", "module", "statemachine" }));
        collectors["enumerations"] = BuildCollectorPayload(
            state.RootCollectionStarted,
            state.EnumerationCollectionCompleted,
            CountKind(items, "enumeration"));
        return collectors;
    }

    private static Dictionary<string, object> BuildCollectorPayload(bool started, bool completed, int itemCount)
    {
        Dictionary<string, object> collector = new Dictionary<string, object>();
        collector["started"] = started;
        collector["completed"] = completed;
        collector["itemCount"] = itemCount;
        return collector;
    }

    private static int CountKind(IList<Dictionary<string, object>> items, string kind)
    {
        return CountKinds(items, new string[] { kind });
    }

    private static int CountKinds(IList<Dictionary<string, object>> items, IList<string> kinds)
    {
        int count = 0;
        for (int i = 0; items != null && i < items.Count; i++)
        {
            object value;
            string kind = items[i] != null && items[i].TryGetValue("kind", out value) ? value as string : String.Empty;
            if (!String.IsNullOrWhiteSpace(kind) && kinds.Contains(kind)) count++;
        }
        return count;
    }

    private static void AnalyzeIdentityEvidence(IList<Dictionary<string, object>> items, AscetGetTraversalState state)
    {
        state.MissingOidCount = 0;
        state.MissingPathCount = 0;
        for (int i = 0; items != null && i < items.Count; i++)
        {
            object oid;
            object path;
            if (items[i] == null || !items[i].TryGetValue("oid", out oid) || String.IsNullOrWhiteSpace(oid as string))
            {
                state.MissingOidCount++;
            }
            if (items[i] == null || !items[i].TryGetValue("path", out path) || String.IsNullOrWhiteSpace(path as string))
            {
                state.MissingPathCount++;
            }
        }
    }

    private static string InferScopeKind(AscetGetRequest request)
    {
        if (!String.IsNullOrWhiteSpace(request.Oid) || !String.IsNullOrWhiteSpace(request.Path)) return "item";
        if (!String.IsNullOrWhiteSpace(request.TargetPathPrefix)) return "folder";
        return "database";
    }

    private static string BuildScopeId(AscetGetRequest request, AscetDatabaseRef databaseRef)
    {
        if (String.Equals(request.ScopeKind, "database", StringComparison.Ordinal))
        {
            string identity = databaseRef == null ? String.Empty : FirstNonEmpty(databaseRef.Path, databaseRef.Name);
            return "database:" + identity;
        }
        if (!String.IsNullOrWhiteSpace(request.Oid)) return "oid:" + request.Oid;
        if (!String.IsNullOrWhiteSpace(request.Path)) return "path:" + request.Path;
        return "path:" + request.TargetPathPrefix;
    }

    private static IList<string> CollectIdentityKinds(IList<Dictionary<string, object>> items)
    {
        HashSet<string> kinds = new HashSet<string>(StringComparer.Ordinal);
        if (items != null)
        {
            for (int i = 0; i < items.Count; i++)
            {
                object value;
                if (items[i] != null && items[i].TryGetValue("kind", out value))
                {
                    string kind = value as string;
                    if (!String.IsNullOrWhiteSpace(kind)) kinds.Add(kind);
                }
            }
        }
        List<string> result = new List<string>(kinds);
        result.Sort(StringComparer.Ordinal);
        return result;
    }

    internal static AscetGetRequest ParseRequest(IDictionary<string, object> payload, string operation)
    {
        AscetGetRequest request = new AscetGetRequest();
        request.Oid = GetString(payload, "oid");
        request.Path = NormalizePath(GetString(payload, "path"));
        request.TargetPathPrefix = NormalizePath(GetString(payload, "targetPathPrefix"));
        request.ScopeKind = GetString(payload, "scope");
        if (!String.IsNullOrWhiteSpace(request.ScopeKind) &&
            !String.Equals(operation, "get_tree", StringComparison.Ordinal))
        {
            throw new AscetReadException("invalid_scope", operation, "scope is only supported by get_tree.");
        }
        if (!String.IsNullOrWhiteSpace(request.ScopeKind) &&
            !String.Equals(request.ScopeKind, "database", StringComparison.Ordinal))
        {
            throw new AscetReadException("invalid_scope", operation, "Unsupported tree scope. Only scope=database is supported.");
        }
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
        if (String.Equals(operation, "get_database_identity", StringComparison.Ordinal))
        {
            if (payload != null && payload.Count > 0)
            {
                throw new AscetReadException("invalid_argument", operation, "get_database_identity does not accept request fields.");
            }
            request.ScopeKind = "database";
        }
        if (String.Equals(operation, "get_tree", StringComparison.Ordinal) &&
            String.Equals(request.ScopeKind, "database", StringComparison.Ordinal) &&
            (!String.IsNullOrWhiteSpace(request.Oid) ||
             !String.IsNullOrWhiteSpace(request.Path) ||
             !String.IsNullOrWhiteSpace(request.TargetPathPrefix) ||
             (payload != null && payload.ContainsKey("depth")) ||
             (payload != null && payload.ContainsKey("maxFolders")) ||
             (payload != null && payload.ContainsKey("maxComponents"))))
        {
            throw new AscetReadException("invalid_scope", operation, "Database Tree scope cannot be combined with a bounded target or traversal budget.");
        }
        return request;
    }

    private static List<Dictionary<string, object>> GetTree(AscetDataBase database, AscetGetRequest request, AscetGetTraversalState state)
    {
        List<Dictionary<string, object>> items = new List<Dictionary<string, object>>();
        bool databaseScope = String.Equals(request.ScopeKind, "database", StringComparison.Ordinal);
        if (databaseScope)
        {
            request.Depth = Int32.MaxValue;
            request.MaxFolders = 0;
            request.MaxComponents = 0;
        }

        string requestedPath = FirstNonEmpty(request.TargetPathPrefix, request.Path);
        if (String.IsNullOrWhiteSpace(request.Oid) && String.IsNullOrWhiteSpace(requestedPath))
        {
            AscetFolder[] topFolders = null;
            if (databaseScope) state.RootCollectionStarted = true;
            try
            {
                topFolders = database.GetAllAscetFolders();
            }
            catch (Exception ex)
            {
                if (!databaseScope) throw;
                state.RecordCollectionError("root_collection_error:" + ex.GetType().Name);
                return items;
            }
            if (topFolders == null)
            {
                if (databaseScope) state.RecordCollectionError("root_collection_unavailable");
                return items;
            }
            if (databaseScope)
            {
                state.RootCollectionAvailable = true;
                state.RootCollectionEmpty = topFolders.Length == 0;
                if (state.RootCollectionEmpty) state.RecordCollectionError("root_collection_empty");
            }
            for (int i = 0; i < topFolders.Length; i++)
            {
                AscetFolder folder = topFolders[i];
                if (folder != null && !ReachedFolderBudget(request, state))
                {
                    AppendTreeFolder(folder, folder.GetName() ?? String.Empty, request.Depth, request, state, items, databaseScope);
                }
            }
            if (databaseScope)
            {
                bool traversalCompleted = !state.Truncated && state.CollectionErrors.Count == 0;
                state.RootCollectionCompleted = traversalCompleted;
                state.ProjectCollectionCompleted = traversalCompleted;
                state.FolderCollectionCompleted = traversalCompleted;
                state.ComponentCollectionCompleted = traversalCompleted;
                state.EnumerationCollectionCompleted = traversalCompleted;
            }
            return items;
        }

        if (String.IsNullOrWhiteSpace(request.Oid) && !String.IsNullOrWhiteSpace(request.TargetPathPrefix))
        {
            AscetFolder targetFolder = ResolveFolder(database, requestedPath);
            AppendTreeFolder(targetFolder, requestedPath, request.Depth, request, state, items, true);
            return items;
        }

        AscetResolvedTarget resolvedTarget = ResolveTreeTarget(request, new ToolApiAscetTargetResolutionBackend(database));
        DataBaseItem targetItem = resolvedTarget.NativeItem as DataBaseItem;
        if (targetItem == null)
        {
            throw new AscetReadException("unsupported_target_kind", "get_tree", "Resolved target is not an ASCET database item.");
        }
        string targetPath = FirstNonEmpty(resolvedTarget.RequestedPath, resolvedTarget.CanonicalPath, SafeGetName(targetItem));
        AscetFolder folderTarget = targetItem as AscetFolder;
        if (folderTarget != null)
        {
            AppendTreeFolder(folderTarget, targetPath, request.Depth, request, state, items, true);
            return items;
        }

        AppendTreeItemChildren(targetItem, targetPath, request.Depth, request, state, items, true);
        return items;
    }

    private static void AppendTreeFolder(AscetFolder folder, string folderPath, int remainingDepth, AscetGetRequest request, AscetGetTraversalState state, IList<Dictionary<string, object>> items, bool includeFolder)
    {
        if (folder == null || ReachedFolderBudget(request, state)) return;
        state.FoldersVisited++;
        if (includeFolder) items.Add(BuildTreeItem(folder, folderPath));
        if (remainingDepth <= 0 || state.Truncated) return;

        Array directItems = GetFolderItems(folder);
        if (directItems == null && String.Equals(request.ScopeKind, "database", StringComparison.Ordinal))
        {
            state.RecordCollectionError("folder_items_unavailable:" + folderPath);
        }
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

        bool childFolderCollectionAvailable;
        IList<AscetFolder> childFolders = GetChildFolders(folder, out childFolderCollectionAvailable);
        if (!childFolderCollectionAvailable && String.Equals(request.ScopeKind, "database", StringComparison.Ordinal))
        {
            state.RecordCollectionError("child_folders_unavailable:" + folderPath);
        }
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
        if (children == null)
        {
            if (String.Equals(request.ScopeKind, "database", StringComparison.Ordinal))
            {
                state.RecordCollectionError("item_children_unavailable:" + parentPath);
            }
            return;
        }
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

    internal static AscetResolvedTarget ResolveTreeTarget(AscetGetRequest request, IAscetTargetResolutionBackend backend)
    {
        if (request == null)
        {
            throw new AscetReadException("invalid_target", "get_tree", "Target request must not be null.");
        }
        try
        {
            return new AscetTargetResolver(backend).Resolve(new AscetTargetRequest
            {
                Path = request.Path,
                Oid = request.Oid
            });
        }
        catch (AscetReadException ex)
        {
            throw new AscetReadException(ex.Code, "get_tree", ex.Message, ex);
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

    internal static AscetFolder ResolveFolder(AscetDataBase database, string folderPath)
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
        bool collectionAvailable;
        return GetChildFolders(folder, out collectionAvailable);
    }

    private static IList<AscetFolder> GetChildFolders(AscetFolder folder, out bool collectionAvailable)
    {
        List<AscetFolder> result = new List<AscetFolder>();
        collectionAvailable = false;
        if (folder == null) return result;
        foreach (string methodName in new string[] { "GetAllAscetFolders", "GetAllFolders", "GetAllSubFolders", "GetSubFolders" })
        {
            Array folders = InvokeOptional(folder, methodName) as Array;
            if (folders == null) continue;
            collectionAvailable = true;
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
        return InvokeOptionalArray(folder, new string[] { "GetAllDataBaseItems", "GetAllItems", "GetAllComponents" });
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

    private static Array InvokeOptionalArray(object target, string[] methodNames)
    {
        if (methodNames == null) return null;
        for (int i = 0; i < methodNames.Length; i++)
        {
            Array value = InvokeOptional(target, methodNames[i]) as Array;
            if (value != null) return value;
        }
        return null;
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

public sealed class DatabaseCatalogIdentity
{
    public string Path { get; set; }
    public string Oid { get; set; }

    public DatabaseCatalogIdentity()
    {
        Path = String.Empty;
        Oid = String.Empty;
    }
}

public sealed class DatabaseCatalogLiveRequest
{
    public bool ScanParameterClasses { get; set; }
    public bool ScanParameterEnumerationUsage { get; set; }
    public bool ScanMessages { get; set; }
    public bool ScanMessageEnumerationUsage { get; set; }
    public int MessageDepth { get; set; }
    public IList<DatabaseCatalogIdentity> Projects { get; set; }
    public IList<DatabaseCatalogIdentity> Modules { get; set; }
    public IList<DatabaseCatalogIdentity> ClassCandidates { get; set; }

    public DatabaseCatalogLiveRequest()
    {
        Projects = new List<DatabaseCatalogIdentity>();
        Modules = new List<DatabaseCatalogIdentity>();
        ClassCandidates = new List<DatabaseCatalogIdentity>();
    }
}

public static class DatabaseCatalogContract
{
    public static IList<DatabaseCatalogIdentity> DeduplicateIdentities(IEnumerable<DatabaseCatalogIdentity> identities)
    {
        Dictionary<string, DatabaseCatalogIdentity> unique = new Dictionary<string, DatabaseCatalogIdentity>(StringComparer.OrdinalIgnoreCase);
        if (identities != null)
        {
            foreach (DatabaseCatalogIdentity identity in identities)
            {
                if (identity == null) continue;
                string oid = (identity.Oid ?? String.Empty).Trim();
                string path = NormalizePath(identity.Path);
                if (String.IsNullOrWhiteSpace(oid) && String.IsNullOrWhiteSpace(path)) continue;
                string key = !String.IsNullOrWhiteSpace(oid) ? "oid:" + oid : "path:" + path;
                DatabaseCatalogIdentity existing;
                if (!unique.TryGetValue(key, out existing) || IsAliasPath(existing.Path) && !IsAliasPath(path))
                {
                    unique[key] = new DatabaseCatalogIdentity { Oid = oid, Path = path };
                }
            }
        }
        List<DatabaseCatalogIdentity> result = new List<DatabaseCatalogIdentity>(unique.Values);
        result.Sort(delegate(DatabaseCatalogIdentity left, DatabaseCatalogIdentity right)
        {
            return StringComparer.OrdinalIgnoreCase.Compare(left == null ? String.Empty : left.Path, right == null ? String.Empty : right.Path);
        });
        return result;
    }

    public static string NormalizeMessageKind(bool isSend, bool isReceive, bool isSendReceive)
    {
        if (isSendReceive) return "send_receive_message";
        if (isReceive) return "receive_message";
        if (isSend) return "send_message";
        return String.Empty;
    }

    public static string BuildFallbackMessageId(string moduleOid, string elementName, string messageKind)
    {
        string input = (moduleOid ?? String.Empty) + "\0" + (elementName ?? String.Empty) + "\0" + (messageKind ?? String.Empty);
        using (System.Security.Cryptography.SHA256 sha = System.Security.Cryptography.SHA256.Create())
        {
            byte[] digest = sha.ComputeHash(System.Text.Encoding.UTF8.GetBytes(input));
            return BitConverter.ToString(digest).Replace("-", String.Empty).ToLowerInvariant();
        }
    }

    public static bool IsVerifiedParameterClass(int methodCount, int directParameterCount, int directCalibrationCount, int canonicalParameterCount, int verifiedChildCount)
    {
        return methodCount == 0 &&
            (directParameterCount > 0 || directCalibrationCount > 0 || canonicalParameterCount > 0 || verifiedChildCount > 0);
    }

    public static string EdgeKey(params string[] values)
    {
        return String.Join("\0", values ?? new string[0]);
    }

    private static bool IsAliasPath(string path)
    {
        return !String.IsNullOrWhiteSpace(path) && path.IndexOf("::", StringComparison.Ordinal) >= 0;
    }

    private static string NormalizePath(string value)
    {
        string normalized = (value ?? String.Empty).Trim().Replace('/', '\\');
        while (normalized.StartsWith("\\", StringComparison.Ordinal)) normalized = normalized.Substring(1);
        while (normalized.EndsWith("\\", StringComparison.Ordinal)) normalized = normalized.Substring(0, normalized.Length - 1);
        return normalized;
    }
}

public sealed class DatabaseCatalogService
{
    public Dictionary<string, object> Execute(IDictionary<string, object> payload, AscetDataBase database, AscetDatabaseRef databaseRef)
    {
        const string operation = "get_database_catalog";
        if (database == null)
        {
            throw new AscetReadException("database_not_open", operation, "No ASCET database is open.");
        }

        DatabaseCatalogLiveRequest request = ParseRequest(payload);
        List<Dictionary<string, object>> projectComplexEdges = new List<Dictionary<string, object>>();
        List<Dictionary<string, object>> parameterClasses = new List<Dictionary<string, object>>();
        List<Dictionary<string, object>> parameterClassEdges = new List<Dictionary<string, object>>();
        List<Dictionary<string, object>> parameterEnumEdges = new List<Dictionary<string, object>>();
        List<Dictionary<string, object>> messages = new List<Dictionary<string, object>>();
        List<Dictionary<string, object>> moduleMessageEdges = new List<Dictionary<string, object>>();
        List<Dictionary<string, object>> messageEnumEdges = new List<Dictionary<string, object>>();
        List<Dictionary<string, object>> warnings = new List<Dictionary<string, object>>();
        List<Dictionary<string, object>> failures = new List<Dictionary<string, object>>();
        List<Dictionary<string, object>> parameterClassDiagnostics = new List<Dictionary<string, object>>();
        Dictionary<string, object> counts = new Dictionary<string, object>(StringComparer.Ordinal);
        Dictionary<string, object> timings = new Dictionary<string, object>(StringComparer.Ordinal);
        System.Diagnostics.Stopwatch totalTimer = System.Diagnostics.Stopwatch.StartNew();

        if (request.MessageDepth > 0)
        {
            warnings.Add(BuildDiagnostic("message_depth_not_implemented", "message", String.Empty, String.Empty, "messageDepth > 0 is reserved; this Catalog scan used direct Module Elements only."));
        }

        ParameterScanState parameterState = new ParameterScanState();
        if (request.ScanParameterClasses)
        {
            System.Diagnostics.Stopwatch projectTimer = System.Diagnostics.Stopwatch.StartNew();
            ScanProjects(database, request, parameterState, projectComplexEdges, failures, counts);
            projectTimer.Stop();
            timings["projectScanMs"] = projectTimer.ElapsedMilliseconds;

            System.Diagnostics.Stopwatch closureTimer = System.Diagnostics.Stopwatch.StartNew();
            ScanParameterClosure(database, request, parameterState, parameterClasses, parameterClassEdges, parameterEnumEdges, parameterClassDiagnostics, failures, counts, timings);
            closureTimer.Stop();
            timings["parameterClosureMs"] = closureTimer.ElapsedMilliseconds;
        }
        else
        {
            timings["projectScanMs"] = 0L;
            timings["parameterProjectClosureScanMs"] = 0L;
            timings["parameterOrphanScanMs"] = 0L;
            timings["parameterClassificationMs"] = 0L;
            timings["parameterClosureMs"] = 0L;
        }

        if (request.ScanMessages)
        {
            System.Diagnostics.Stopwatch moduleTimer = System.Diagnostics.Stopwatch.StartNew();
            ScanMessages(database, request, messages, moduleMessageEdges, messageEnumEdges, failures, counts);
            moduleTimer.Stop();
            timings["moduleScanMs"] = moduleTimer.ElapsedMilliseconds;
        }
        else
        {
            timings["moduleScanMs"] = 0L;
        }

        totalTimer.Stop();
        timings["totalServiceMs"] = totalTimer.ElapsedMilliseconds;
        counts["projectComplexEdgeCount"] = projectComplexEdges.Count;
        counts["parameterClassCount"] = parameterClasses.Count;
        counts["parameterClassEdgeCount"] = parameterClassEdges.Count;
        counts["parameterEnumEdgeCount"] = parameterEnumEdges.Count;
        counts["messageCount"] = messages.Count;
        counts["moduleMessageEdgeCount"] = moduleMessageEdges.Count;
        counts["messageEnumEdgeCount"] = messageEnumEdges.Count;

        Dictionary<string, object> coverage = new Dictionary<string, object>(StringComparer.Ordinal);
        coverage["status"] = failures.Count == 0 ? "complete_for_scope" : "partial";
        coverage["failureCount"] = failures.Count;

        Dictionary<string, object> result = new Dictionary<string, object>(StringComparer.Ordinal);
        result["parameterClasses"] = parameterClasses;
        result["messages"] = messages;
        result["projectComplexEdges"] = projectComplexEdges;
        result["parameterClassEdges"] = parameterClassEdges;
        result["parameterEnumEdges"] = parameterEnumEdges;
        result["moduleMessageEdges"] = moduleMessageEdges;
        result["messageEnumEdges"] = messageEnumEdges;
        result["coverage"] = coverage;
        result["counts"] = counts;
        result["timings"] = timings;
        result["warnings"] = warnings;
        result["failures"] = failures;
        Dictionary<string, object> diagnostics = new Dictionary<string, object>(StringComparer.Ordinal);
        diagnostics["parameterClasses"] = parameterClassDiagnostics;
        result["diagnostics"] = diagnostics;
        result["database"] = BuildDatabasePayload(databaseRef);
        return result;
    }

    internal static DatabaseCatalogLiveRequest ParseRequest(IDictionary<string, object> payload)
    {
        DatabaseCatalogLiveRequest request = new DatabaseCatalogLiveRequest();
        request.ScanParameterClasses = GetBoolean(payload, "scanParameterClasses");
        request.ScanParameterEnumerationUsage = GetBoolean(payload, "scanParameterEnumerationUsage");
        request.ScanMessages = GetBoolean(payload, "scanMessages");
        request.ScanMessageEnumerationUsage = GetBoolean(payload, "scanMessageEnumerationUsage");
        request.MessageDepth = GetNonNegativeInt(payload, "messageDepth");
        request.Projects = DatabaseCatalogContract.DeduplicateIdentities(ReadIdentities(payload, "projects"));
        request.Modules = DatabaseCatalogContract.DeduplicateIdentities(ReadIdentities(payload, "modules"));
        request.ClassCandidates = DatabaseCatalogContract.DeduplicateIdentities(ReadIdentities(payload, "classCandidates"));
        if (request.ScanParameterClasses && request.Projects.Count == 0)
        {
            throw new AscetReadException("invalid_argument", "get_database_catalog", "Parameter Class scan requires at least one Project identity.");
        }
        if (request.ScanMessages && request.Modules.Count == 0)
        {
            throw new AscetReadException("invalid_argument", "get_database_catalog", "Message scan requires at least one Module identity.");
        }
        return request;
    }

    private static void ScanProjects(AscetDataBase database, DatabaseCatalogLiveRequest request, ParameterScanState state, IList<Dictionary<string, object>> projectComplexEdges, IList<Dictionary<string, object>> failures, IDictionary<string, object> counts)
    {
        int successCount = 0;
        for (int i = 0; i < request.Projects.Count; i++)
        {
            DatabaseCatalogIdentity identity = request.Projects[i];
            try
            {
                DataBaseItem item = ResolveItem(database, identity);
                AscetProject project = item as AscetProject;
                if (project == null)
                {
                    throw new AscetReadException("unsupported_project_kind", "get_database_catalog", "Item '" + identity.Path + "' is not an ASCET Project.");
                }
                string projectPath = FirstNonEmpty(SafeGetString(project, "GetNameWithPath"), identity.Path);
                string projectOid = FirstNonEmpty(GetObjectOid(project), identity.Oid);
                Array elements = project.GetAllModelElements() as Array;
                if (elements != null)
                {
                    for (int elementIndex = 0; elementIndex < elements.Length; elementIndex++)
                    {
                        ComplexModelElement complex = elements.GetValue(elementIndex) as ComplexModelElement;
                        if (complex == null) continue;
                        CodeComponent represented = InvokeOptional(complex, "GetRepresentedClass") as CodeComponent;
                        if (represented == null) continue;
                        string representedKind = GetItemKind(represented);
                        string representedPath = SafeGetString(represented, "GetNameWithPath");
                        string representedOid = GetObjectOid(represented);
                        Dictionary<string, object> edge = new Dictionary<string, object>(StringComparer.Ordinal);
                        edge["relationKind"] = "project_complex";
                        edge["projectPath"] = projectPath;
                        edge["projectOid"] = projectOid;
                        edge["elementName"] = SafeGetString(complex, "GetName");
                        edge["scope"] = GetElementScope(complex);
                        edge["representedPath"] = representedPath;
                        edge["representedOid"] = representedOid;
                        edge["representedKind"] = representedKind;
                        projectComplexEdges.Add(edge);
                        if (String.Equals(representedKind, "class", StringComparison.Ordinal))
                        {
                            ClassNode node = EnsureClassNode(state, represented, representedPath, representedOid, false);
                            node.IsProjectRoot = true;
                            node.ProjectPaths.Add(projectPath);
                        }
                    }
                }
                successCount++;
            }
            catch (Exception ex)
            {
                failures.Add(BuildFailure("project", identity, ex));
            }
        }
        counts["projectInputCount"] = request.Projects.Count;
        counts["projectSuccessCount"] = successCount;
        counts["projectFailureCount"] = request.Projects.Count - successCount;
    }

    private static void ScanParameterClosure(AscetDataBase database, DatabaseCatalogLiveRequest request, ParameterScanState state, IList<Dictionary<string, object>> parameterClasses, IList<Dictionary<string, object>> parameterClassEdges, IList<Dictionary<string, object>> parameterEnumEdges, IList<Dictionary<string, object>> parameterClassDiagnostics, IList<Dictionary<string, object>> failures, IDictionary<string, object> counts, IDictionary<string, object> timings)
    {
        System.Diagnostics.Stopwatch projectClosureTimer = System.Diagnostics.Stopwatch.StartNew();
        DrainClassQueue(state, request.ScanParameterEnumerationUsage, failures);
        projectClosureTimer.Stop();
        timings["parameterProjectClosureScanMs"] = projectClosureTimer.ElapsedMilliseconds;

        System.Diagnostics.Stopwatch orphanTimer = System.Diagnostics.Stopwatch.StartNew();
        int orphanCandidateCount = 0;
        for (int i = 0; i < request.ClassCandidates.Count; i++)
        {
            DatabaseCatalogIdentity candidate = request.ClassCandidates[i];
            string candidateKey = IdentityKey(candidate.Oid, candidate.Path);
            if (state.Nodes.ContainsKey(candidateKey)) continue;
            orphanCandidateCount++;
            try
            {
                CodeComponent component = ResolveItem(database, candidate) as CodeComponent;
                if (component == null || !String.Equals(GetItemKind(component), "class", StringComparison.Ordinal)) continue;
                ClassNode node = EnsureClassNode(state, component, FirstNonEmpty(SafeGetString(component, "GetNameWithPath"), candidate.Path), FirstNonEmpty(GetObjectOid(component), candidate.Oid), true);
                node.IsOrphanCandidate = true;
            }
            catch (Exception ex)
            {
                failures.Add(BuildFailure("orphan_class", candidate, ex));
            }
        }
        DrainClassQueue(state, request.ScanParameterEnumerationUsage, failures);
        orphanTimer.Stop();
        timings["parameterOrphanScanMs"] = orphanTimer.ElapsedMilliseconds;

        System.Diagnostics.Stopwatch classificationTimer = System.Diagnostics.Stopwatch.StartNew();
        HashSet<string> verified = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        bool changed;
        do
        {
            changed = false;
            foreach (KeyValuePair<string, ClassNode> entry in state.Nodes)
            {
                ClassNode node = entry.Value;
                if (node == null || !node.ScanSucceeded || verified.Contains(entry.Key)) continue;
                int verifiedChildCount = 0;
                for (int childIndex = 0; childIndex < node.ChildKeys.Count; childIndex++)
                {
                    if (verified.Contains(node.ChildKeys[childIndex])) verifiedChildCount++;
                }
                if (DatabaseCatalogContract.IsVerifiedParameterClass(node.MethodCount, node.DirectParameterCount, node.DirectCalibrationCount, node.CanonicalParameterCount, verifiedChildCount))
                {
                    verified.Add(entry.Key);
                    changed = true;
                }
            }
        }
        while (changed);

        List<ClassNode> orderedNodes = new List<ClassNode>(state.Nodes.Values);
        orderedNodes.Sort(delegate(ClassNode left, ClassNode right)
        {
            return StringComparer.OrdinalIgnoreCase.Compare(left == null ? String.Empty : left.Path, right == null ? String.Empty : right.Path);
        });
        int orphanVerifiedCount = 0;
        int rejectedNoEvidenceCount = 0;
        int rejectedHasMethodsCount = 0;
        HashSet<string> classEdgeKeys = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        HashSet<string> enumEdgeKeys = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        for (int i = 0; i < orderedNodes.Count; i++)
        {
            ClassNode node = orderedNodes[i];
            if (node == null) continue;
            bool isVerified = verified.Contains(node.Key);
            int verifiedChildCount = 0;
            for (int childIndex = 0; childIndex < node.ChildKeys.Count; childIndex++)
            {
                if (verified.Contains(node.ChildKeys[childIndex])) verifiedChildCount++;
            }
            if (!isVerified)
            {
                if (node.ScanSucceeded && node.MethodCount > 0) rejectedHasMethodsCount++;
                else if (node.ScanSucceeded) rejectedNoEvidenceCount++;
                if (node.ScanSucceeded)
                {
                    Dictionary<string, object> diagnostic = new Dictionary<string, object>(StringComparer.Ordinal);
                    diagnostic["path"] = node.Path;
                    diagnostic["oid"] = node.Oid;
                    diagnostic["methodCount"] = node.MethodCount;
                    diagnostic["directParameterCount"] = node.DirectParameterCount;
                    diagnostic["directCalibrationCount"] = node.DirectCalibrationCount;
                    diagnostic["canonicalParameterCount"] = node.CanonicalParameterCount;
                    diagnostic["childParameterClassCount"] = verifiedChildCount;
                    diagnostic["projectRoot"] = node.IsProjectRoot;
                    diagnostic["orphanCandidate"] = node.IsOrphanCandidate;
                    diagnostic["classification"] = node.MethodCount > 0 ? "rejected_has_methods" : "rejected_no_parameter_evidence";
                    parameterClassDiagnostics.Add(diagnostic);
                }
                continue;
            }
            for (int childIndex = 0; childIndex < node.ChildKeys.Count; childIndex++)
            {
                string childKey = node.ChildKeys[childIndex];
                if (!verified.Contains(childKey)) continue;
                ClassNode child;
                if (!state.Nodes.TryGetValue(childKey, out child) || child == null) continue;
                string edgeKey = DatabaseCatalogContract.EdgeKey(node.Oid, child.Oid, child.Path);
                if (!classEdgeKeys.Add(edgeKey)) continue;
                Dictionary<string, object> edge = new Dictionary<string, object>(StringComparer.Ordinal);
                edge["relationKind"] = "parameter_class_child";
                edge["sourceClassPath"] = node.Path;
                edge["sourceClassOid"] = node.Oid;
                edge["targetClassPath"] = child.Path;
                edge["targetClassOid"] = child.Oid;
                parameterClassEdges.Add(edge);
            }

            string classification = node.IsProjectRoot ? "verified_project_parameter_class" : (node.IsOrphanCandidate ? "orphan_parameter_class" : "verified_child_parameter_class");
            if (node.IsOrphanCandidate) orphanVerifiedCount++;
            List<string> evidence = new List<string>();
            if (node.IsProjectRoot) evidence.Add("project-complex-class-root");
            if (node.IsOrphanCandidate) evidence.Add("orphan-structural-candidate");
            evidence.Add("methods=0");
            if (node.DirectParameterCount > 0) evidence.Add("IsParameter=true");
            if (node.DirectCalibrationCount > 0) evidence.Add("IsCalibration=true");
            if (node.CanonicalParameterCount > 0) evidence.Add("CanonicalKind=parameter");
            if (verifiedChildCount > 0) evidence.Add("child-parameter-class");

            Dictionary<string, object> record = new Dictionary<string, object>(StringComparer.Ordinal);
            record["path"] = node.Path;
            record["oid"] = node.Oid;
            record["methodCount"] = node.MethodCount;
            record["directParameterCount"] = node.DirectParameterCount;
            record["directCalibrationCount"] = node.DirectCalibrationCount;
            record["canonicalParameterCount"] = node.CanonicalParameterCount;
            record["childParameterClassCount"] = verifiedChildCount;
            record["classification"] = classification;
            record["projects"] = new List<string>(node.ProjectPaths);
            record["evidence"] = evidence;
            parameterClasses.Add(record);

            if (request.ScanParameterEnumerationUsage)
            {
                for (int enumIndex = 0; enumIndex < node.EnumEdges.Count; enumIndex++)
                {
                    Dictionary<string, object> enumEdge = node.EnumEdges[enumIndex];
                    string enumerationOid = GetDictionaryString(enumEdge, "enumerationOid");
                    string enumerationPath = GetDictionaryString(enumEdge, "enumerationPath");
                    string elementName = GetDictionaryString(enumEdge, "elementName");
                    string enumKey = DatabaseCatalogContract.EdgeKey(node.Oid, elementName, enumerationOid, enumerationPath);
                    if (enumEdgeKeys.Add(enumKey)) parameterEnumEdges.Add(enumEdge);
                }
            }
        }

        counts["parameterClassScannedCount"] = state.Nodes.Count;
        counts["parameterClassVerifiedCount"] = verified.Count;
        counts["parameterClassRejectedNoEvidenceCount"] = rejectedNoEvidenceCount;
        counts["parameterClassRejectedHasMethodsCount"] = rejectedHasMethodsCount;
        counts["orphanCandidateCount"] = orphanCandidateCount;
        counts["orphanVerifiedCount"] = orphanVerifiedCount;
        classificationTimer.Stop();
        timings["parameterClassificationMs"] = classificationTimer.ElapsedMilliseconds;
    }

    private static void DrainClassQueue(ParameterScanState state, bool scanEnumerationUsage, IList<Dictionary<string, object>> failures)
    {
        while (state.Pending.Count > 0)
        {
            ClassNode node = state.Pending.Dequeue();
            if (node == null || node.ScanAttempted) continue;
            node.ScanAttempted = true;
            try
            {
                ScanClassNode(state, node, scanEnumerationUsage);
                node.ScanSucceeded = true;
            }
            catch (Exception ex)
            {
                failures.Add(BuildFailure("parameter_class", new DatabaseCatalogIdentity { Path = node.Path, Oid = node.Oid }, ex));
            }
        }
    }

    private static void ScanClassNode(ParameterScanState state, ClassNode node, bool scanEnumerationUsage)
    {
        node.MethodCount = CountMethods(node.Component);
        Array elements = node.Component.GetAllModelElements() as Array;
        if (elements == null) return;
        HashSet<string> childKeys = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        for (int i = 0; i < elements.Length; i++)
        {
            object element = elements.GetValue(i);
            if (element == null) continue;
            ComplexModelElement complex = element as ComplexModelElement;
            if (complex != null)
            {
                CodeComponent represented = InvokeOptional(complex, "GetRepresentedClass") as CodeComponent;
                if (represented == null || !String.Equals(GetItemKind(represented), "class", StringComparison.Ordinal)) continue;
                ClassNode child = EnsureClassNode(state, represented, SafeGetString(represented, "GetNameWithPath"), GetObjectOid(represented), false);
                if (childKeys.Add(child.Key)) node.ChildKeys.Add(child.Key);
                continue;
            }

            bool isParameter = InvokeBoolean(element, "IsParameter");
            bool isCalibration = InvokeBoolean(element, "IsCalibration");
            if (isParameter)
            {
                node.DirectParameterCount++;
                node.CanonicalParameterCount++;
            }
            if (isCalibration) node.DirectCalibrationCount++;
            if (!scanEnumerationUsage) continue;
            AscetEnumeration enumeration = InvokeOptional(element, "GetEnumerator") as AscetEnumeration;
            if (enumeration == null) continue;
            Dictionary<string, object> edge = new Dictionary<string, object>(StringComparer.Ordinal);
            edge["relationKind"] = "parameter_class_enumeration";
            edge["parameterClassPath"] = node.Path;
            edge["parameterClassOid"] = node.Oid;
            edge["elementName"] = SafeGetString(element, "GetName");
            edge["scope"] = GetElementScope(element);
            edge["enumerationPath"] = SafeGetString(enumeration, "GetNameWithPath");
            edge["enumerationOid"] = GetObjectOid(enumeration);
            node.EnumEdges.Add(edge);
        }
    }

    private static void ScanMessages(AscetDataBase database, DatabaseCatalogLiveRequest request, IList<Dictionary<string, object>> messages, IList<Dictionary<string, object>> moduleMessageEdges, IList<Dictionary<string, object>> messageEnumEdges, IList<Dictionary<string, object>> failures, IDictionary<string, object> counts)
    {
        int moduleSuccessCount = 0;
        int sendCount = 0;
        int receiveCount = 0;
        int sendReceiveCount = 0;
        for (int i = 0; i < request.Modules.Count; i++)
        {
            DatabaseCatalogIdentity identity = request.Modules[i];
            try
            {
                CodeComponent module = ResolveItem(database, identity) as CodeComponent;
                if (module == null || !String.Equals(GetItemKind(module), "module", StringComparison.Ordinal))
                {
                    throw new AscetReadException("unsupported_component_kind", "get_database_catalog", "Item '" + identity.Path + "' is not an ASCET Module.");
                }
                string modulePath = FirstNonEmpty(SafeGetString(module, "GetNameWithPath"), identity.Path);
                string moduleOid = FirstNonEmpty(GetObjectOid(module), identity.Oid);
                Array elements = module.GetAllModelElements() as Array;
                HashSet<string> messageIds = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
                if (elements != null)
                {
                    for (int elementIndex = 0; elementIndex < elements.Length; elementIndex++)
                    {
                        object element = elements.GetValue(elementIndex);
                        if (element == null) continue;
                        string messageKind = DatabaseCatalogContract.NormalizeMessageKind(InvokeBoolean(element, "IsSendMessage"), InvokeBoolean(element, "IsReceiveMessage"), InvokeBoolean(element, "IsSendReceiveMessage"));
                        if (String.IsNullOrWhiteSpace(messageKind)) continue;
                        string elementName = SafeGetString(element, "GetName");
                        string messageId = GetObjectOid(element);
                        if (String.IsNullOrWhiteSpace(messageId))
                        {
                            messageId = DatabaseCatalogContract.BuildFallbackMessageId(moduleOid, elementName, messageKind);
                        }
                        if (!messageIds.Add(messageId)) continue;
                        if (String.Equals(messageKind, "send_message", StringComparison.Ordinal)) sendCount++;
                        else if (String.Equals(messageKind, "receive_message", StringComparison.Ordinal)) receiveCount++;
                        else if (String.Equals(messageKind, "send_receive_message", StringComparison.Ordinal)) sendReceiveCount++;

                        AscetEnumeration enumeration = InvokeOptional(element, "GetEnumerator") as AscetEnumeration;
                        string enumerationPath = enumeration == null ? String.Empty : SafeGetString(enumeration, "GetNameWithPath");
                        string enumerationOid = enumeration == null ? String.Empty : GetObjectOid(enumeration);
                        Dictionary<string, object> record = new Dictionary<string, object>(StringComparer.Ordinal);
                        record["path"] = modulePath + "::" + elementName;
                        record["messageId"] = messageId;
                        record["name"] = elementName;
                        record["modulePath"] = modulePath;
                        record["moduleOid"] = moduleOid;
                        record["scope"] = GetElementScope(element);
                        record["messageKind"] = messageKind;
                        record["modelType"] = SafeGetString(element, "GetModelType");
                        record["unit"] = SafeGetString(element, "GetUnit");
                        record["enumerationPath"] = enumerationPath;
                        record["enumerationOid"] = enumerationOid;
                        messages.Add(record);

                        Dictionary<string, object> moduleEdge = new Dictionary<string, object>(StringComparer.Ordinal);
                        moduleEdge["relationKind"] = "module_message";
                        moduleEdge["modulePath"] = modulePath;
                        moduleEdge["moduleOid"] = moduleOid;
                        moduleEdge["messageId"] = messageId;
                        moduleEdge["messageName"] = elementName;
                        moduleMessageEdges.Add(moduleEdge);

                        if (request.ScanMessageEnumerationUsage && enumeration != null)
                        {
                            Dictionary<string, object> enumEdge = new Dictionary<string, object>(StringComparer.Ordinal);
                            enumEdge["relationKind"] = "message_enumeration";
                            enumEdge["modulePath"] = modulePath;
                            enumEdge["moduleOid"] = moduleOid;
                            enumEdge["messageId"] = messageId;
                            enumEdge["messageName"] = elementName;
                            enumEdge["messageKind"] = messageKind;
                            enumEdge["enumerationPath"] = enumerationPath;
                            enumEdge["enumerationOid"] = enumerationOid;
                            messageEnumEdges.Add(enumEdge);
                        }
                    }
                }
                moduleSuccessCount++;
            }
            catch (Exception ex)
            {
                failures.Add(BuildFailure("module", identity, ex));
            }
        }
        counts["moduleInputCount"] = request.Modules.Count;
        counts["moduleSuccessCount"] = moduleSuccessCount;
        counts["moduleFailureCount"] = request.Modules.Count - moduleSuccessCount;
        counts["sendMessageCount"] = sendCount;
        counts["receiveMessageCount"] = receiveCount;
        counts["sendReceiveMessageCount"] = sendReceiveCount;
    }

    private static ClassNode EnsureClassNode(ParameterScanState state, CodeComponent component, string path, string oid, bool orphanCandidate)
    {
        string normalizedPath = FirstNonEmpty(path, SafeGetString(component, "GetNameWithPath"));
        string normalizedOid = FirstNonEmpty(oid, GetObjectOid(component));
        string key = IdentityKey(normalizedOid, normalizedPath);
        ClassNode node;
        if (!state.Nodes.TryGetValue(key, out node))
        {
            node = new ClassNode();
            node.Key = key;
            node.Path = normalizedPath;
            node.Oid = normalizedOid;
            node.Component = component;
            state.Nodes[key] = node;
            state.Pending.Enqueue(node);
        }
        if (orphanCandidate) node.IsOrphanCandidate = true;
        return node;
    }

    private static int CountMethods(CodeComponent component)
    {
        if (component == null) return 0;
        AscetDiagram[] diagrams = component.GetAllDiagrams();
        if (diagrams == null) return 0;
        HashSet<string> methods = new HashSet<string>(StringComparer.Ordinal);
        string[] methodNames = new string[] { "GetAllMethods", "GetAllProcesses", "GetAllActions", "GetAllConditions", "GetAllTriggers" };
        for (int diagramIndex = 0; diagramIndex < diagrams.Length; diagramIndex++)
        {
            AscetDiagram diagram = diagrams[diagramIndex];
            if (diagram == null) continue;
            for (int methodIndex = 0; methodIndex < methodNames.Length; methodIndex++)
            {
                Array values = InvokeOptional(diagram, methodNames[methodIndex]) as Array;
                if (values == null) continue;
                for (int valueIndex = 0; valueIndex < values.Length; valueIndex++)
                {
                    object value = values.GetValue(valueIndex);
                    if (value == null) continue;
                    string key = value.GetType().FullName + "\0" + SafeGetString(value, "GetName");
                    methods.Add(key);
                }
            }
        }
        return methods.Count;
    }

    private static DataBaseItem ResolveItem(AscetDataBase database, DatabaseCatalogIdentity identity)
    {
        if (database == null || identity == null) return null;
        if (!String.IsNullOrWhiteSpace(identity.Oid))
        {
            MethodInfo method = database.GetType().GetMethod("GetItemForOID", new Type[] { typeof(string) });
            DataBaseItem byOid = method == null ? null : method.Invoke(database, new object[] { identity.Oid }) as DataBaseItem;
            if (byOid != null) return byOid;
        }
        string path = (identity.Path ?? String.Empty).Trim().Replace('/', '\\');
        int separator = path.LastIndexOf('\\');
        string folderPath = separator < 0 ? String.Empty : path.Substring(0, separator);
        string itemName = separator < 0 ? path : path.Substring(separator + 1);
        DataBaseItem byPath = database.GetItemInFolder(itemName, folderPath);
        if (byPath == null)
        {
            throw new AscetReadException("target_not_found", "get_database_catalog", "No ASCET database item was found for '" + path + "'.");
        }
        return byPath;
    }

    private static string IdentityKey(string oid, string path)
    {
        if (!String.IsNullOrWhiteSpace(oid)) return "oid:" + oid.Trim();
        return "path:" + ((path ?? String.Empty).Trim().Replace('/', '\\'));
    }

    private static string GetItemKind(object item)
    {
        if (item is AscetFolder) return "folder";
        if (item is AscetProject) return "project";
        string typeName = item == null ? String.Empty : item.GetType().Name.ToLowerInvariant();
        if (typeName.IndexOf("module", StringComparison.Ordinal) >= 0) return "module";
        if (typeName.IndexOf("class", StringComparison.Ordinal) >= 0) return "class";
        if (typeName.IndexOf("enumeration", StringComparison.Ordinal) >= 0) return "enumeration";
        return typeName;
    }

    private static string GetElementScope(object element)
    {
        if (InvokeBoolean(element, "IsImported")) return "imported";
        if (InvokeBoolean(element, "IsExported")) return "exported";
        string scope = SafeGetString(element, "GetScope").Trim().ToLowerInvariant();
        return String.IsNullOrWhiteSpace(scope) ? "local" : scope;
    }

    private static string GetObjectOid(object target)
    {
        string[] methodNames = new string[] { "GetOID", "GetOid", "GetObjectOID", "GetObjectId" };
        for (int i = 0; i < methodNames.Length; i++)
        {
            string oid = SafeGetString(target, methodNames[i]);
            if (!String.IsNullOrWhiteSpace(oid)) return oid;
        }
        return String.Empty;
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

    private static string SafeGetString(object target, string methodName)
    {
        try
        {
            return Convert.ToString(InvokeOptional(target, methodName)) ?? String.Empty;
        }
        catch
        {
            return String.Empty;
        }
    }

    private static Dictionary<string, object> BuildFailure(string scope, DatabaseCatalogIdentity identity, Exception ex)
    {
        AscetReadException readError = ex as AscetReadException;
        Dictionary<string, object> failure = BuildDiagnostic(
            readError == null ? "catalog_object_scan_failed" : (readError.Code ?? "catalog_object_scan_failed"),
            scope,
            identity == null ? String.Empty : identity.Path,
            identity == null ? String.Empty : identity.Oid,
            ex == null ? String.Empty : (ex.Message ?? String.Empty));
        failure["exceptionType"] = ex == null ? String.Empty : ex.GetType().FullName;
        return failure;
    }

    private static Dictionary<string, object> BuildDiagnostic(string code, string scope, string path, string oid, string message)
    {
        Dictionary<string, object> diagnostic = new Dictionary<string, object>(StringComparer.Ordinal);
        diagnostic["code"] = code ?? String.Empty;
        diagnostic["scope"] = scope ?? String.Empty;
        diagnostic["path"] = path ?? String.Empty;
        diagnostic["oid"] = oid ?? String.Empty;
        diagnostic["message"] = message ?? String.Empty;
        return diagnostic;
    }

    private static Dictionary<string, object> BuildDatabasePayload(AscetDatabaseRef databaseRef)
    {
        Dictionary<string, object> result = new Dictionary<string, object>(StringComparer.Ordinal);
        result["name"] = databaseRef == null ? String.Empty : (databaseRef.Name ?? String.Empty);
        result["path"] = databaseRef == null ? String.Empty : (databaseRef.Path ?? String.Empty);
        return result;
    }

    private static IList<DatabaseCatalogIdentity> ReadIdentities(IDictionary<string, object> payload, string key)
    {
        List<DatabaseCatalogIdentity> result = new List<DatabaseCatalogIdentity>();
        if (payload == null || !payload.ContainsKey(key) || payload[key] == null) return result;
        IEnumerable values = payload[key] as IEnumerable;
        if (values == null || payload[key] is string) return result;
        foreach (object value in values)
        {
            IDictionary<string, object> entry = value as IDictionary<string, object>;
            if (entry == null) continue;
            result.Add(new DatabaseCatalogIdentity { Path = GetString(entry, "path"), Oid = GetString(entry, "oid") });
        }
        return result;
    }

    private static bool GetBoolean(IDictionary<string, object> payload, string key)
    {
        if (payload == null || !payload.ContainsKey(key) || payload[key] == null) return false;
        if (payload[key] is bool) return (bool)payload[key];
        bool value;
        return Boolean.TryParse(Convert.ToString(payload[key]), out value) && value;
    }

    private static int GetNonNegativeInt(IDictionary<string, object> payload, string key)
    {
        if (payload == null || !payload.ContainsKey(key) || payload[key] == null) return 0;
        int value;
        if (!Int32.TryParse(Convert.ToString(payload[key]), out value) || value < 0)
        {
            throw new AscetReadException("invalid_argument", "get_database_catalog", "Field '" + key + "' must be a non-negative integer.");
        }
        return value;
    }

    private static string GetString(IDictionary<string, object> payload, string key)
    {
        if (payload == null || !payload.ContainsKey(key) || payload[key] == null) return String.Empty;
        return Convert.ToString(payload[key]) ?? String.Empty;
    }

    private static string GetDictionaryString(IDictionary<string, object> payload, string key)
    {
        return GetString(payload, key);
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

    private sealed class ParameterScanState
    {
        public Dictionary<string, ClassNode> Nodes { get; private set; }
        public Queue<ClassNode> Pending { get; private set; }

        public ParameterScanState()
        {
            Nodes = new Dictionary<string, ClassNode>(StringComparer.OrdinalIgnoreCase);
            Pending = new Queue<ClassNode>();
        }
    }

    private sealed class ClassNode
    {
        public string Key { get; set; }
        public string Path { get; set; }
        public string Oid { get; set; }
        public CodeComponent Component { get; set; }
        public bool IsProjectRoot { get; set; }
        public bool IsOrphanCandidate { get; set; }
        public bool ScanAttempted { get; set; }
        public bool ScanSucceeded { get; set; }
        public int MethodCount { get; set; }
        public int DirectParameterCount { get; set; }
        public int DirectCalibrationCount { get; set; }
        public int CanonicalParameterCount { get; set; }
        public List<string> ChildKeys { get; private set; }
        public HashSet<string> ProjectPaths { get; private set; }
        public List<Dictionary<string, object>> EnumEdges { get; private set; }

        public ClassNode()
        {
            Key = String.Empty;
            Path = String.Empty;
            Oid = String.Empty;
            ChildKeys = new List<string>();
            ProjectPaths = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            EnumEdges = new List<Dictionary<string, object>>();
            MethodCount = -1;
        }
    }
}
