using System;
using System.Collections.Generic;

public sealed class AscetIncomingReferenceEdgeRef
{
    public string SourceComponentPath { get; set; }
    public AscetComponentKind SourceComponentKind { get; set; }
    public AscetLanguageKind SourceLanguageKind { get; set; }
    public string SourceElementName { get; set; }
    public string SourceElementKind { get; set; }
    public string SourceDisplayScope { get; set; }
    public string SourceDisplayKind { get; set; }
    public string TargetComponentPath { get; set; }
}

public sealed class AscetIncomingReferenceSummary
{
    public string ComponentPath { get; set; }
    public string ScopePath { get; set; }
    public int ScannedComponentCount { get; set; }
    public IList<AscetIncomingReferenceEdgeRef> IncomingEdges { get; set; }
    public IList<AscetItemRef> SourceComponents { get; set; }
    public string Summary { get; set; }
}

public interface IReverseReferenceReadService
{
    AscetIncomingReferenceSummary GetIncomingReferences(string componentPath, string scopePath, AscetComponentKind componentKind, int limit);
}

public sealed class ReverseReferenceReadService : IReverseReferenceReadService
{
    private readonly IComponentLocatorService locatorService;
    private readonly IReferenceReadService referenceReadService;

    public ReverseReferenceReadService()
        : this(new ComponentLocatorService(), new ReferenceReadService())
    {
    }

    public ReverseReferenceReadService(IComponentLocatorService locatorService, IReferenceReadService referenceReadService)
    {
        if (locatorService == null)
        {
            throw new ArgumentNullException("locatorService");
        }

        if (referenceReadService == null)
        {
            throw new ArgumentNullException("referenceReadService");
        }

        this.locatorService = locatorService;
        this.referenceReadService = referenceReadService;
    }

    public AscetIncomingReferenceSummary GetIncomingReferences(string componentPath, string scopePath, AscetComponentKind componentKind, int limit)
    {
        if (String.IsNullOrWhiteSpace(componentPath))
        {
            throw new AscetReadException("invalid_argument", "get_incoming_references", "Component path must not be empty.");
        }

        string normalizedTargetPath = NormalizePath(componentPath);
        string normalizedScopePath = NormalizeOptionalScopePath(scopePath);
        IList<AscetItemRef> candidates = locatorService.ListItemsInFolder(normalizedScopePath, true);
        List<AscetIncomingReferenceEdgeRef> incomingEdges = new List<AscetIncomingReferenceEdgeRef>();
        List<AscetItemRef> sourceComponents = new List<AscetItemRef>();
        Dictionary<string, bool> seenSources = new Dictionary<string, bool>(StringComparer.Ordinal);
        int scannedCount = 0;

        if (candidates != null)
        {
            for (int i = 0; i < candidates.Count; i++)
            {
                AscetItemRef candidate = candidates[i];
                if (candidate == null || String.IsNullOrWhiteSpace(candidate.Path))
                {
                    continue;
                }

                if (componentKind != AscetComponentKind.Unknown && candidate.Kind != componentKind)
                {
                    continue;
                }

                if (String.Equals(candidate.Path, normalizedTargetPath, StringComparison.Ordinal))
                {
                    continue;
                }

                scannedCount++;
                AscetReferenceGraphSummary referenceGraph = TryGetReferenceGraph(candidate);
                if (referenceGraph == null || referenceGraph.References == null)
                {
                    continue;
                }

                for (int j = 0; j < referenceGraph.References.Count; j++)
                {
                    AscetReferenceEdgeRef edge = referenceGraph.References[j];
                    if (edge == null || !edge.IsResolved || !String.Equals(edge.TargetComponentPath ?? String.Empty, normalizedTargetPath, StringComparison.Ordinal))
                    {
                        continue;
                    }

                    incomingEdges.Add(new AscetIncomingReferenceEdgeRef
                    {
                        SourceComponentPath = candidate.Path ?? String.Empty,
                        SourceComponentKind = candidate.Kind,
                        SourceLanguageKind = candidate.LanguageKind,
                        SourceElementName = edge.SourceElementName ?? String.Empty,
                        SourceElementKind = edge.SourceElementKind ?? String.Empty,
                        SourceDisplayScope = edge.SourceDisplayScope ?? String.Empty,
                        SourceDisplayKind = edge.SourceDisplayKind ?? String.Empty,
                        TargetComponentPath = normalizedTargetPath
                    });

                    if (!seenSources.ContainsKey(candidate.Path))
                    {
                        seenSources[candidate.Path] = true;
                        sourceComponents.Add(new AscetItemRef
                        {
                            Name = candidate.Name ?? String.Empty,
                            Path = candidate.Path ?? String.Empty,
                            Kind = candidate.Kind,
                            LanguageKind = candidate.LanguageKind
                        });
                    }

                    if (limit > 0 && incomingEdges.Count >= limit)
                    {
                        return new AscetIncomingReferenceSummary
                        {
                            ComponentPath = normalizedTargetPath,
                            ScopePath = normalizedScopePath,
                            ScannedComponentCount = scannedCount,
                            IncomingEdges = incomingEdges,
                            SourceComponents = sourceComponents,
                            Summary = BuildSummary(sourceComponents.Count, incomingEdges.Count, true)
                        };
                    }
                }
            }
        }

        return new AscetIncomingReferenceSummary
        {
            ComponentPath = normalizedTargetPath,
            ScopePath = normalizedScopePath,
            ScannedComponentCount = scannedCount,
            IncomingEdges = incomingEdges,
            SourceComponents = sourceComponents,
            Summary = BuildSummary(sourceComponents.Count, incomingEdges.Count, false)
        };
    }

    private AscetReferenceGraphSummary TryGetReferenceGraph(AscetItemRef component)
    {
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

    private string NormalizePath(string value)
    {
        string normalized = (value ?? String.Empty).Trim().Replace('/', '\\');
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

    private string NormalizeOptionalScopePath(string value)
    {
        if (String.IsNullOrWhiteSpace(value))
        {
            return String.Empty;
        }

        return NormalizePath(value);
    }

    private string BuildSummary(int sourceCount, int edgeCount, bool limited)
    {
        string summary = sourceCount.ToString() + " source component" + (sourceCount == 1 ? String.Empty : "s")
            + " referencing the target through " + edgeCount.ToString() + " incoming edge" + (edgeCount == 1 ? String.Empty : "s") + ".";
        if (limited)
        {
            return summary + " Result truncated by limit.";
        }

        return summary;
    }
}
