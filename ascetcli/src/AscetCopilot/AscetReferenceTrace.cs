using System;
using System.Collections.Generic;

public interface IReferenceTraceService
{
    IList<AscetReferenceTraceNodeRef> TraceReferences(AscetItemRef component, int maxDepth);
}

public sealed class ReferenceTraceService : IReferenceTraceService
{
    private readonly IReferenceReadService referenceReadService;

    public ReferenceTraceService()
        : this(new ReferenceReadService())
    {
    }

    public ReferenceTraceService(IReferenceReadService referenceReadService)
    {
        if (referenceReadService == null)
        {
            throw new ArgumentNullException("referenceReadService");
        }

        this.referenceReadService = referenceReadService;
    }

    public IList<AscetReferenceTraceNodeRef> TraceReferences(AscetItemRef component, int maxDepth)
    {
        if (component == null)
        {
            throw new AscetReadException("invalid_argument", "trace_references", "Component reference must not be null.");
        }

        List<AscetReferenceTraceNodeRef> result = new List<AscetReferenceTraceNodeRef>();
        result.Add(BuildTraceNode(component, String.Empty, maxDepth < 0 ? 0 : maxDepth, new HashSet<string>(StringComparer.Ordinal)));
        return result;
    }

    private AscetReferenceTraceNodeRef BuildTraceNode(AscetItemRef component, string viaElementName, int remainingDepth, ISet<string> activePaths)
    {
        AscetReferenceTraceNodeRef node = new AscetReferenceTraceNodeRef
        {
            ComponentPath = component == null ? String.Empty : (component.Path ?? String.Empty),
            ComponentKind = component == null ? AscetComponentKind.Unknown : component.Kind,
            LanguageKind = component == null ? AscetLanguageKind.Unknown : component.LanguageKind,
            ViaElementName = viaElementName ?? String.Empty,
            Children = new List<AscetReferenceTraceNodeRef>()
        };

        if (component == null || String.IsNullOrWhiteSpace(component.Path) || remainingDepth <= 0 || activePaths == null || activePaths.Contains(component.Path))
        {
            return node;
        }

        activePaths.Add(component.Path);
        try
        {
            AscetReferenceGraphSummary referenceGraph = SafeGetReferenceGraph(component);
            if (referenceGraph == null || referenceGraph.References == null)
            {
                return node;
            }

            Dictionary<string, bool> seenChildren = new Dictionary<string, bool>(StringComparer.Ordinal);
            for (int i = 0; i < referenceGraph.References.Count; i++)
            {
                AscetReferenceEdgeRef edge = referenceGraph.References[i];
                if (edge == null || !edge.IsResolved || String.IsNullOrWhiteSpace(edge.TargetComponentPath))
                {
                    continue;
                }

                string childKey = (edge.SourceElementName ?? String.Empty) + "->" + edge.TargetComponentPath;
                if (seenChildren.ContainsKey(childKey))
                {
                    continue;
                }

                seenChildren[childKey] = true;
                node.Children.Add(BuildTraceNode(ToItemRef(edge), edge.SourceElementName ?? String.Empty, remainingDepth - 1, activePaths));
            }
        }
        finally
        {
            activePaths.Remove(component.Path);
        }

        return node;
    }

    private AscetReferenceGraphSummary SafeGetReferenceGraph(AscetItemRef component)
    {
        try
        {
            return referenceReadService.GetReferenceGraph(component);
        }
        catch
        {
            return null;
        }
    }

    private AscetItemRef ToItemRef(AscetReferenceEdgeRef edge)
    {
        string path = edge == null ? String.Empty : (edge.TargetComponentPath ?? String.Empty);
        return new AscetItemRef
        {
            Name = !String.IsNullOrWhiteSpace(edge == null ? String.Empty : edge.TargetComponentName)
                ? edge.TargetComponentName
                : AscetAdvancedAnalysisUtilities.ExtractLeafName(path),
            Path = path,
            Kind = edge == null ? AscetComponentKind.Unknown : edge.TargetComponentKind,
            LanguageKind = edge == null ? AscetLanguageKind.Unknown : edge.TargetLanguageKind
        };
    }
}
