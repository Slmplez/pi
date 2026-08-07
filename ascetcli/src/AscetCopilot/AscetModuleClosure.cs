using System;
using System.Collections.Generic;

public enum AscetModuleClosureEdgeKind
{
    Unknown = 0,
    Reference = 1,
    ImplementationChild = 2
}

public sealed class AscetModuleClosureRootRef
{
    public string ComponentPath { get; set; }
    public AscetComponentKind ComponentKind { get; set; }
    public AscetLanguageKind LanguageKind { get; set; }
}

public sealed class AscetModuleClosureTraversalRef
{
    public int MaxDepth { get; set; }
    public int VisitedComponentCount { get; set; }
    public int VisitedEdgeCount { get; set; }
}

public sealed class AscetModuleClosureComponentRef
{
    public string ComponentPath { get; set; }
    public AscetComponentKind ComponentKind { get; set; }
    public AscetLanguageKind LanguageKind { get; set; }
    public IList<AscetMethodCode> Methods { get; set; }
    public IList<AscetDiagramRef> Diagrams { get; set; }
    public IList<AscetBlockDiagramGraph> BlockGraphs { get; set; }
    public AscetImplementationSnapshot Implementation { get; set; }
    public AscetReferenceGraphSummary References { get; set; }
    public string Summary { get; set; }
}

public sealed class AscetModuleClosureEdgeRef
{
    public string FromComponentPath { get; set; }
    public string ToComponentPath { get; set; }
    public AscetModuleClosureEdgeKind EdgeKind { get; set; }
    public string SourceElementName { get; set; }
    public string SourceElementKind { get; set; }
    public string ChildImplementationName { get; set; }
    public int Depth { get; set; }
}

public sealed class AscetModuleClosure
{
    public AscetModuleClosureRootRef Root { get; set; }
    public AscetModuleClosureTraversalRef Traversal { get; set; }
    public IList<AscetModuleClosureComponentRef> Components { get; set; }
    public IList<AscetModuleClosureEdgeRef> Edges { get; set; }
    public string Summary { get; set; }
}

public interface IModuleClosureService
{
    AscetModuleClosure GetClosure(AscetModuleRef module, int maxDepth);
}

public sealed class AscetModuleClosureService : IModuleClosureService
{
    // Keep closure nodes shallow in Task 5 by reading only immediate snapshot content.
    private const int ComponentSnapshotTraceDepth = 1;

    private readonly IReferenceReadService referenceReadService;
    private readonly IImplementationReadService implementationReadService;
    private readonly IComponentLocatorService componentLocatorService;
    private readonly IComponentSnapshotService componentSnapshotService;
    private readonly IDiagramCatalogService diagramCatalogService;
    private readonly IBlockDiagramReadService blockDiagramReadService;

    public AscetModuleClosureService()
        : this(
            new ReferenceReadService(),
            new ImplementationReadService(),
            new ComponentLocatorService(),
            new ComponentSnapshotService(),
            new DiagramCatalogService(),
            new BlockDiagramReadService())
    {
    }

    public AscetModuleClosureService(IReferenceReadService referenceReadService)
        : this(referenceReadService, null, null, null, null, null)
    {
    }

    public AscetModuleClosureService(
        IReferenceReadService referenceReadService,
        IImplementationReadService implementationReadService,
        IComponentLocatorService componentLocatorService)
        : this(referenceReadService, implementationReadService, componentLocatorService, null, null, null)
    {
    }

    public AscetModuleClosureService(
        IReferenceReadService referenceReadService,
        IImplementationReadService implementationReadService,
        IComponentLocatorService componentLocatorService,
        IComponentSnapshotService componentSnapshotService)
        : this(referenceReadService, implementationReadService, componentLocatorService, componentSnapshotService, null, null)
    {
    }

    public AscetModuleClosureService(
        IReferenceReadService referenceReadService,
        IImplementationReadService implementationReadService,
        IComponentLocatorService componentLocatorService,
        IComponentSnapshotService componentSnapshotService,
        IDiagramCatalogService diagramCatalogService,
        IBlockDiagramReadService blockDiagramReadService)
    {
        this.referenceReadService = referenceReadService;
        this.implementationReadService = implementationReadService;
        this.componentLocatorService = componentLocatorService;
        this.componentSnapshotService = componentSnapshotService;
        this.diagramCatalogService = diagramCatalogService;
        this.blockDiagramReadService = blockDiagramReadService;
    }

    public AscetModuleClosure GetClosure(AscetModuleRef module, int maxDepth)
    {
        ValidateModule(module);
        if (maxDepth < 0)
        {
            throw new AscetReadException("invalid_argument", "get_module_closure", "Max depth must be greater than or equal to zero.");
        }

        List<AscetModuleClosureComponentRef> components = new List<AscetModuleClosureComponentRef>();
        List<AscetModuleClosureEdgeRef> edges = new List<AscetModuleClosureEdgeRef>();
        HashSet<string> visitedComponentPaths = new HashSet<string>(StringComparer.Ordinal);
        HashSet<string> visitedEdgeKeys = new HashSet<string>(StringComparer.Ordinal);
        Queue<AscetModuleClosureTraversalNode> pending = new Queue<AscetModuleClosureTraversalNode>();
        AscetItemRef rootComponent = CreateRootItem(module);

        TryAddVisitedComponent(visitedComponentPaths, components, CreateRootComponent(rootComponent));
        pending.Enqueue(new AscetModuleClosureTraversalNode(rootComponent, 0));

        AscetModuleClosure closure = new AscetModuleClosure
        {
            Root = new AscetModuleClosureRootRef
            {
                ComponentPath = module.Path ?? String.Empty,
                ComponentKind = AscetComponentKind.Module,
                LanguageKind = module.LanguageKind
            },
            Traversal = new AscetModuleClosureTraversalRef
            {
                MaxDepth = maxDepth,
                VisitedComponentCount = visitedComponentPaths.Count,
                VisitedEdgeCount = visitedEdgeKeys.Count
            },
            Components = components,
            Edges = edges,
            Summary = BuildSummary(module, visitedComponentPaths.Count, visitedEdgeKeys.Count, maxDepth)
        };

        if (maxDepth == 0)
        {
            return closure;
        }

        while (pending.Count > 0)
        {
            AscetModuleClosureTraversalNode current = pending.Dequeue();
            if (current == null || current.Component == null || current.Depth >= maxDepth)
            {
                continue;
            }

            ExpandReferenceEdges(current, current.Depth + 1, pending, visitedComponentPaths, visitedEdgeKeys, components, edges);
            ExpandImplementationChildEdges(current, current.Depth + 1, pending, visitedComponentPaths, visitedEdgeKeys, components, edges);
        }

        closure.Traversal.VisitedComponentCount = visitedComponentPaths.Count;
        closure.Traversal.VisitedEdgeCount = visitedEdgeKeys.Count;
        closure.Summary = BuildSummary(module, visitedComponentPaths.Count, visitedEdgeKeys.Count, maxDepth);
        return closure;
    }

    internal bool TryAddVisitedComponent(ISet<string> visitedComponentPaths, IList<AscetModuleClosureComponentRef> components, AscetModuleClosureComponentRef component)
    {
        if (visitedComponentPaths == null)
        {
            throw new ArgumentNullException("visitedComponentPaths");
        }

        if (components == null)
        {
            throw new ArgumentNullException("components");
        }

        if (component == null || String.IsNullOrWhiteSpace(component.ComponentPath))
        {
            return false;
        }

        string componentPath = component.ComponentPath ?? String.Empty;
        if (!visitedComponentPaths.Add(componentPath))
        {
            return false;
        }

        components.Add(component);
        return true;
    }

    internal bool TryAddVisitedEdge(ISet<string> visitedEdgeKeys, IList<AscetModuleClosureEdgeRef> edges, AscetModuleClosureEdgeRef edge)
    {
        if (visitedEdgeKeys == null)
        {
            throw new ArgumentNullException("visitedEdgeKeys");
        }

        if (edges == null)
        {
            throw new ArgumentNullException("edges");
        }

        if (edge == null)
        {
            return false;
        }

        string edgeKey = BuildEdgeKey(edge);
        if (!visitedEdgeKeys.Add(edgeKey))
        {
            return false;
        }

        edges.Add(edge);
        return true;
    }

    private void ValidateModule(AscetModuleRef module)
    {
        if (module == null)
        {
            throw new AscetReadException("invalid_argument", "get_module_closure", "Module must not be null.");
        }

        if (String.IsNullOrWhiteSpace(module.Path))
        {
            throw new AscetReadException("invalid_argument", "get_module_closure", "Module path must not be empty.");
        }
    }

    private AscetItemRef CreateRootItem(AscetModuleRef module)
    {
        return new AscetItemRef
        {
            Name = module == null ? String.Empty : (module.Name ?? String.Empty),
            Path = module == null ? String.Empty : (module.Path ?? String.Empty),
            Kind = AscetComponentKind.Module,
            LanguageKind = module == null ? AscetLanguageKind.Unknown : module.LanguageKind
        };
    }

    private AscetModuleClosureComponentRef CreateRootComponent(AscetItemRef component)
    {
        return CreateComponent(component, true);
    }

    private void ExpandReferenceEdges(
        AscetModuleClosureTraversalNode current,
        int nextDepth,
        Queue<AscetModuleClosureTraversalNode> pending,
        ISet<string> visitedComponentPaths,
        ISet<string> visitedEdgeKeys,
        IList<AscetModuleClosureComponentRef> components,
        IList<AscetModuleClosureEdgeRef> edges)
    {
        AscetReferenceGraphSummary referenceGraph = TryGetReferenceGraph(current.Component);
        if (referenceGraph == null || referenceGraph.References == null)
        {
            return;
        }

        for (int i = 0; i < referenceGraph.References.Count; i++)
        {
            AscetReferenceEdgeRef reference = referenceGraph.References[i];
            if (reference == null || !reference.IsResolved || String.IsNullOrWhiteSpace(reference.TargetComponentPath))
            {
                continue;
            }

            AscetModuleClosureEdgeRef edge = new AscetModuleClosureEdgeRef
            {
                FromComponentPath = current.Component.Path ?? String.Empty,
                ToComponentPath = reference.TargetComponentPath ?? String.Empty,
                EdgeKind = AscetModuleClosureEdgeKind.Reference,
                SourceElementName = reference.SourceElementName ?? String.Empty,
                SourceElementKind = reference.SourceElementKind ?? String.Empty,
                ChildImplementationName = String.Empty,
                Depth = nextDepth
            };
            TryAddVisitedEdge(visitedEdgeKeys, edges, edge);

            AscetItemRef target = new AscetItemRef
            {
                Name = reference.TargetComponentName ?? String.Empty,
                Path = reference.TargetComponentPath ?? String.Empty,
                Kind = reference.TargetComponentKind,
                LanguageKind = reference.TargetLanguageKind
            };

            if (TryAddVisitedComponent(visitedComponentPaths, components, CreateComponent(target)))
            {
                pending.Enqueue(new AscetModuleClosureTraversalNode(target, nextDepth));
            }
        }
    }

    private AscetReferenceGraphSummary TryGetReferenceGraph(AscetItemRef component)
    {
        if (referenceReadService == null || component == null || String.IsNullOrWhiteSpace(component.Path))
        {
            return null;
        }

        try
        {
            return referenceReadService.GetReferenceGraph(component);
        }
        catch (AscetReadException ex)
        {
            if (String.Equals(ex.Code, "unsupported_component_kind", StringComparison.Ordinal))
            {
                return null;
            }

            throw;
        }
    }

    private AscetModuleClosureComponentRef CreateComponent(AscetItemRef component)
    {
        return CreateComponent(component, false);
    }

    private AscetModuleClosureComponentRef CreateComponent(AscetItemRef component, bool isRoot)
    {
        AscetModuleClosureComponentRef node = new AscetModuleClosureComponentRef
        {
            ComponentPath = component == null ? String.Empty : (component.Path ?? String.Empty),
            ComponentKind = component == null ? AscetComponentKind.Unknown : component.Kind,
            LanguageKind = component == null ? AscetLanguageKind.Unknown : component.LanguageKind,
            Methods = new List<AscetMethodCode>(),
            Diagrams = new List<AscetDiagramRef>(),
            BlockGraphs = new List<AscetBlockDiagramGraph>(),
            Summary = isRoot ? BuildRootSummary(component) : BuildComponentSummary(component)
        };

        AscetComponentSnapshot snapshot = TryGetComponentSnapshot(component);
        if (snapshot == null)
        {
            return node;
        }

        IList<AscetDiagramRef> snapshotDiagrams = snapshot.Diagrams ?? new List<AscetDiagramRef>();
        node.Methods = snapshot.Methods ?? new List<AscetMethodCode>();
        node.Diagrams = snapshotDiagrams;
        node.BlockGraphs = TryGetBlockGraphs(component, snapshotDiagrams);
        node.Implementation = snapshot.Implementation;
        node.References = snapshot.References;
        if (!String.IsNullOrWhiteSpace(snapshot.Summary))
        {
            node.Summary = snapshot.Summary;
        }

        return node;
    }

    private AscetComponentSnapshot TryGetComponentSnapshot(AscetItemRef component)
    {
        if (componentSnapshotService == null || component == null || String.IsNullOrWhiteSpace(component.Path))
        {
            return null;
        }

        try
        {
            return componentSnapshotService.GetSnapshot(component, ComponentSnapshotTraceDepth);
        }
        catch (AscetReadException ex)
        {
            if (String.Equals(ex.Code, "unsupported_component_kind", StringComparison.Ordinal) ||
                String.Equals(ex.Code, "item_not_found", StringComparison.Ordinal) ||
                String.Equals(ex.Code, "invalid_argument", StringComparison.Ordinal))
            {
                return null;
            }

            throw;
        }
    }

    private IList<AscetBlockDiagramGraph> TryGetBlockGraphs(AscetItemRef component, IList<AscetDiagramRef> diagrams)
    {
        List<AscetBlockDiagramGraph> blockGraphs = new List<AscetBlockDiagramGraph>();
        if (component == null ||
            component.LanguageKind != AscetLanguageKind.BDE ||
            blockDiagramReadService == null ||
            diagrams == null)
        {
            return blockGraphs;
        }

        IList<AscetDiagramRef> sourceDiagrams = diagrams;
        if (sourceDiagrams.Count == 0)
        {
            sourceDiagrams = TryListDiagrams(component);
        }

        if (sourceDiagrams == null)
        {
            return blockGraphs;
        }

        for (int i = 0; i < sourceDiagrams.Count; i++)
        {
            AscetDiagramRef diagram = sourceDiagrams[i];
            if (diagram == null ||
                diagram.DiagramKind != AscetDiagramKind.BlockDiagram ||
                String.IsNullOrWhiteSpace(diagram.Name))
            {
                continue;
            }

            try
            {
                AscetBlockDiagramGraph graph = blockDiagramReadService.GetBlockDiagramGraph(component, diagram.Name);
                if (graph != null)
                {
                    blockGraphs.Add(graph);
                }
            }
            catch (AscetReadException ex)
            {
                if (String.Equals(ex.Code, "unsupported_component_kind", StringComparison.Ordinal) ||
                    String.Equals(ex.Code, "diagram_not_found", StringComparison.Ordinal) ||
                    String.Equals(ex.Code, "item_not_found", StringComparison.Ordinal) ||
                    String.Equals(ex.Code, "invalid_argument", StringComparison.Ordinal))
                {
                    continue;
                }

                throw;
            }
        }

        return blockGraphs;
    }

    private IList<AscetDiagramRef> TryListDiagrams(AscetItemRef component)
    {
        if (diagramCatalogService == null || component == null || String.IsNullOrWhiteSpace(component.Path))
        {
            return new List<AscetDiagramRef>();
        }

        try
        {
            return diagramCatalogService.ListDiagrams(component) ?? new List<AscetDiagramRef>();
        }
        catch (AscetReadException ex)
        {
            if (String.Equals(ex.Code, "unsupported_component_kind", StringComparison.Ordinal) ||
                String.Equals(ex.Code, "item_not_found", StringComparison.Ordinal) ||
                String.Equals(ex.Code, "invalid_argument", StringComparison.Ordinal))
            {
                return new List<AscetDiagramRef>();
            }

            throw;
        }
    }

    private string BuildRootSummary(AscetItemRef component)
    {
        return "Root module " + GetDisplayName(component);
    }

    private string BuildComponentSummary(AscetItemRef component)
    {
        if (component == null)
        {
            return String.Empty;
        }

        return "Referenced "
            + component.Kind.ToString()
            + " "
            + GetDisplayName(component);
    }

    private void ExpandImplementationChildEdges(
        AscetModuleClosureTraversalNode current,
        int nextDepth,
        Queue<AscetModuleClosureTraversalNode> pending,
        ISet<string> visitedComponentPaths,
        ISet<string> visitedEdgeKeys,
        IList<AscetModuleClosureComponentRef> components,
        IList<AscetModuleClosureEdgeRef> edges)
    {
        AscetImplementationSnapshot implementation = TryReadImplementation(current.Component);
        if (implementation == null || implementation.Elements == null)
        {
            return;
        }

        ExpandImplementationChildElements(
            current,
            nextDepth,
            implementation.Elements,
            pending,
            visitedComponentPaths,
            visitedEdgeKeys,
            components,
            edges);
    }

    private void ExpandImplementationChildElements(
        AscetModuleClosureTraversalNode current,
        int nextDepth,
        IList<AscetElementImplementationRef> elements,
        Queue<AscetModuleClosureTraversalNode> pending,
        ISet<string> visitedComponentPaths,
        ISet<string> visitedEdgeKeys,
        IList<AscetModuleClosureComponentRef> components,
        IList<AscetModuleClosureEdgeRef> edges)
    {
        if (elements == null)
        {
            return;
        }

        for (int i = 0; i < elements.Count; i++)
        {
            AscetElementImplementationRef element = elements[i];
            if (element == null)
            {
                continue;
            }

            if (!String.IsNullOrWhiteSpace(element.ReferencedComponentPath))
            {
                AscetModuleClosureEdgeRef edge = new AscetModuleClosureEdgeRef
                {
                    FromComponentPath = current.Component.Path ?? String.Empty,
                    ToComponentPath = element.ReferencedComponentPath ?? String.Empty,
                    EdgeKind = AscetModuleClosureEdgeKind.ImplementationChild,
                    SourceElementName = element.ElementName ?? String.Empty,
                    SourceElementKind = element.ElementKind ?? String.Empty,
                    ChildImplementationName = element.ChildImplementationName ?? String.Empty,
                    Depth = nextDepth
                };
                TryAddVisitedEdge(visitedEdgeKeys, edges, edge);

                AscetItemRef target = TryResolveComponentByPath(element.ReferencedComponentPath);
                if (target == null)
                {
                    target = CreateFallbackItem(element.ReferencedComponentPath);
                }

                if (TryAddVisitedComponent(visitedComponentPaths, components, CreateComponent(target)))
                {
                    pending.Enqueue(new AscetModuleClosureTraversalNode(target, nextDepth));
                }
            }
        }
    }

    private AscetImplementationSnapshot TryReadImplementation(AscetItemRef component)
    {
        if (implementationReadService == null || component == null || String.IsNullOrWhiteSpace(component.Path))
        {
            return null;
        }

        try
        {
            return implementationReadService.ReadImplementation(component, AscetImplementationReadMode.Default, String.Empty);
        }
        catch (AscetReadException ex)
        {
            if (String.Equals(ex.Code, "unsupported_component_kind", StringComparison.Ordinal) ||
                String.Equals(ex.Code, "implementation_not_found", StringComparison.Ordinal))
            {
                return null;
            }

            throw;
        }
    }

    private AscetItemRef TryResolveComponentByPath(string componentPath)
    {
        if (componentLocatorService == null || String.IsNullOrWhiteSpace(componentPath))
        {
            return null;
        }

        try
        {
            AscetItemPath parsed = AscetItemPath.Parse(componentPath);
            return componentLocatorService.FindItemInFolder(parsed.ItemName, parsed.FolderPath);
        }
        catch (AscetReadException ex)
        {
            if (String.Equals(ex.Code, "item_not_found", StringComparison.Ordinal) ||
                String.Equals(ex.Code, "invalid_argument", StringComparison.Ordinal))
            {
                return null;
            }

            throw;
        }
    }

    private AscetItemRef CreateFallbackItem(string componentPath)
    {
        string normalizedPath = componentPath ?? String.Empty;
        string displayName = normalizedPath;
        int separatorIndex = normalizedPath.LastIndexOf('\\');
        if (separatorIndex >= 0 && separatorIndex < normalizedPath.Length - 1)
        {
            displayName = normalizedPath.Substring(separatorIndex + 1);
        }

        return new AscetItemRef
        {
            Name = displayName,
            Path = normalizedPath,
            Kind = AscetComponentKind.Unknown,
            LanguageKind = AscetLanguageKind.Unknown
        };
    }

    private string BuildSummary(AscetModuleRef module, int componentCount, int edgeCount, int maxDepth)
    {
        return "Module closure for " + GetDisplayName(module) + " visited " + componentCount.ToString() + " component" + (componentCount == 1 ? String.Empty : "s") + " and " + edgeCount.ToString() + " edge" + (edgeCount == 1 ? String.Empty : "s") + " at max depth " + maxDepth.ToString();
    }

    private string GetDisplayName(AscetModuleRef module)
    {
        if (module == null)
        {
            return String.Empty;
        }

        if (!String.IsNullOrWhiteSpace(module.Name))
        {
            return module.Name;
        }

        string path = module.Path ?? String.Empty;
        int separatorIndex = path.LastIndexOf('\\');
        if (separatorIndex < 0 || separatorIndex == path.Length - 1)
        {
            return path;
        }

        return path.Substring(separatorIndex + 1);
    }

    private string GetDisplayName(AscetItemRef component)
    {
        if (component == null)
        {
            return String.Empty;
        }

        if (!String.IsNullOrWhiteSpace(component.Name))
        {
            return component.Name;
        }

        string path = component.Path ?? String.Empty;
        int separatorIndex = path.LastIndexOf('\\');
        if (separatorIndex < 0 || separatorIndex == path.Length - 1)
        {
            return path;
        }

        return path.Substring(separatorIndex + 1);
    }

    private string BuildEdgeKey(AscetModuleClosureEdgeRef edge)
    {
        return (edge.FromComponentPath ?? String.Empty)
            + "|"
            + (edge.ToComponentPath ?? String.Empty)
            + "|"
            + edge.EdgeKind.ToString()
            + "|"
            + (edge.SourceElementName ?? String.Empty)
            + "|"
            + (edge.SourceElementKind ?? String.Empty)
            + "|"
            + (edge.ChildImplementationName ?? String.Empty)
            + "|"
            + edge.Depth.ToString();
    }
}

internal sealed class AscetModuleClosureTraversalNode
{
    public AscetModuleClosureTraversalNode(AscetItemRef component, int depth)
    {
        Component = component;
        Depth = depth;
    }

    public AscetItemRef Component { get; private set; }
    public int Depth { get; private set; }
}
