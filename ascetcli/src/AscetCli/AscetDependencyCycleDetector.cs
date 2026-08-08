using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Text;

/// <summary>
/// The node kinds understood by <see cref="AscetDependencyCycleDetector"/>.
/// Only Parameter nodes participate in cycle detection. Constant and
/// SystemConstant nodes are accepted as input and ignored as non-graph nodes.
/// </summary>
public enum AscetDependencyNodeKind
{
    Parameter,
    Constant,
    SystemConstant
}

/// <summary>
/// Identifies an ASCET element or a mapped dependency value.
/// ElementId should be a stable component/element identity when available;
/// Name is used as the fallback identity and is also used for readable output.
/// </summary>
public sealed class AscetDependencyNode
{
    public string ElementId { get; set; }

    public string Name { get; set; }

    public AscetDependencyNodeKind Kind { get; set; }
}

/// <summary>
/// Represents one element and the values to which its dependency mappings point.
/// The edge direction is Element -&gt; MappedNode.
/// </summary>
public sealed class AscetDependencyElementAdjacency
{
    public AscetDependencyNode Element { get; set; }

    public IList<AscetDependencyNode> MappedNodes { get; set; }

    public AscetDependencyElementAdjacency()
    {
        MappedNodes = new List<AscetDependencyNode>();
    }
}

/// <summary>
/// Represents a proposed dependency edge. The edge is added to the existing
/// adjacency graph for the duration of detection; no ASCET state is inspected
/// or modified by this helper.
/// </summary>
public sealed class AscetDependencyEdge
{
    public AscetDependencyNode Source { get; set; }

    public AscetDependencyNode Target { get; set; }
}

/// <summary>
/// Input for cycle detection. ExistingAdjacency expresses current element to
/// mapped dependency relationships; ProposedEdges expresses the changes that
/// are about to be applied.
/// </summary>
public sealed class AscetDependencyCycleDetectionInput
{
    public IList<AscetDependencyElementAdjacency> ExistingAdjacency { get; set; }

    public IList<AscetDependencyEdge> ProposedEdges { get; set; }

    public AscetDependencyCycleDetectionInput()
    {
        ExistingAdjacency = new List<AscetDependencyElementAdjacency>();
        ProposedEdges = new List<AscetDependencyEdge>();
    }
}

/// <summary>
/// Result of a cycle check. When HasCycle is true, CycleNodes is a closed path:
/// the first node is repeated as the last node. CyclePath renders the same path
/// for diagnostics, for example "Component/A -&gt; Component/B -&gt; Component/A".
/// </summary>
public sealed class AscetDependencyCycleDetectionResult
{
    internal AscetDependencyCycleDetectionResult(
        bool hasCycle,
        IList<AscetDependencyNode> cycleNodes,
        IList<AscetDependencyEdge> cycleEdges,
        string cyclePath)
    {
        HasCycle = hasCycle;
        CycleNodes = new ReadOnlyCollection<AscetDependencyNode>(cycleNodes);
        CycleEdges = new ReadOnlyCollection<AscetDependencyEdge>(cycleEdges);
        CyclePath = cyclePath;
    }

    public bool HasCycle { get; private set; }

    public IList<AscetDependencyNode> CycleNodes { get; private set; }

    public IList<AscetDependencyEdge> CycleEdges { get; private set; }

    public string CyclePath { get; private set; }
}

/// <summary>
/// Non-live cycle detector for ASCET Parameter dependency graphs.
/// </summary>
public sealed class AscetDependencyCycleDetector
{
    private sealed class GraphNode
    {
        public string Key;
        public AscetDependencyNode Value;
        public List<string> Neighbors;

        public GraphNode(string key, AscetDependencyNode value)
        {
            Key = key;
            Value = value;
            Neighbors = new List<string>();
        }
    }

    /// <summary>
    /// Combines existing adjacency and proposed edges, then returns the first
    /// deterministic directed cycle found. Constant and SystemConstant nodes,
    /// including edges incident to them, are ignored.
    /// </summary>
    public AscetDependencyCycleDetectionResult Detect(AscetDependencyCycleDetectionInput input)
    {
        if (input == null)
        {
            throw new ArgumentNullException("input");
        }

        Dictionary<string, GraphNode> graph = new Dictionary<string, GraphNode>(StringComparer.Ordinal);

        if (input.ExistingAdjacency != null)
        {
            for (int i = 0; i < input.ExistingAdjacency.Count; i++)
            {
                AscetDependencyElementAdjacency adjacency = input.ExistingAdjacency[i];
                if (adjacency == null)
                {
                    throw new ArgumentException("ExistingAdjacency contains a null entry.", "input");
                }

                string sourceKey;
                if (!TryGetParameterKey(adjacency.Element, out sourceKey))
                {
                    continue;
                }

                EnsureNode(graph, sourceKey, adjacency.Element);
                if (adjacency.MappedNodes == null)
                {
                    continue;
                }

                for (int j = 0; j < adjacency.MappedNodes.Count; j++)
                {
                    AddParameterEdge(graph, adjacency.Element, adjacency.MappedNodes[j]);
                }
            }
        }

        if (input.ProposedEdges != null)
        {
            for (int i = 0; i < input.ProposedEdges.Count; i++)
            {
                AscetDependencyEdge edge = input.ProposedEdges[i];
                if (edge == null)
                {
                    throw new ArgumentException("ProposedEdges contains a null entry.", "input");
                }

                AddParameterEdge(graph, edge.Source, edge.Target);
            }
        }

        List<string> keys = new List<string>(graph.Keys);
        keys.Sort(StringComparer.Ordinal);
        for (int i = 0; i < keys.Count; i++)
        {
            graph[keys[i]].Neighbors.Sort(StringComparer.Ordinal);
        }

        Dictionary<string, int> states = new Dictionary<string, int>(StringComparer.Ordinal);
        List<string> stack = new List<string>();
        Dictionary<string, int> stackIndexes = new Dictionary<string, int>(StringComparer.Ordinal);

        for (int i = 0; i < keys.Count; i++)
        {
            string cycleStart;
            List<string> cycleKeys = new List<string>();
            if (Visit(keys[i], graph, states, stack, stackIndexes, out cycleStart, cycleKeys))
            {
                return BuildCycleResult(cycleKeys, graph);
            }
        }

        return new AscetDependencyCycleDetectionResult(
            false,
            new List<AscetDependencyNode>(),
            new List<AscetDependencyEdge>(),
            String.Empty);
    }

    /// <summary>
    /// Convenience overload for callers that already have the two graph parts.
    /// </summary>
    public AscetDependencyCycleDetectionResult Detect(
        IList<AscetDependencyElementAdjacency> existingAdjacency,
        IList<AscetDependencyEdge> proposedEdges)
    {
        return Detect(new AscetDependencyCycleDetectionInput
        {
            ExistingAdjacency = existingAdjacency,
            ProposedEdges = proposedEdges
        });
    }

    private static void AddParameterEdge(
        Dictionary<string, GraphNode> graph,
        AscetDependencyNode source,
        AscetDependencyNode target)
    {
        string sourceKey;
        string targetKey;
        bool sourceIsParameter = TryGetParameterKey(source, out sourceKey);
        bool targetIsParameter = TryGetParameterKey(target, out targetKey);

        if (!sourceIsParameter || !targetIsParameter)
        {
            return;
        }

        GraphNode sourceNode = EnsureNode(graph, sourceKey, source);
        EnsureNode(graph, targetKey, target);
        if (!sourceNode.Neighbors.Contains(targetKey))
        {
            sourceNode.Neighbors.Add(targetKey);
        }
    }

    private static GraphNode EnsureNode(
        Dictionary<string, GraphNode> graph,
        string key,
        AscetDependencyNode value)
    {
        GraphNode node;
        if (!graph.TryGetValue(key, out node))
        {
            node = new GraphNode(key, CloneNode(value));
            graph.Add(key, node);
        }

        return node;
    }

    private static bool TryGetParameterKey(AscetDependencyNode node, out string key)
    {
        key = null;
        if (node == null || node.Kind != AscetDependencyNodeKind.Parameter)
        {
            return false;
        }

        key = FirstNonBlank(node.ElementId, node.Name);
        if (key == null)
        {
            throw new ArgumentException("A Parameter node must provide ElementId or Name.", "input");
        }

        return true;
    }

    private static string FirstNonBlank(string first, string second)
    {
        if (!String.IsNullOrWhiteSpace(first))
        {
            return first.Trim();
        }

        if (!String.IsNullOrWhiteSpace(second))
        {
            return second.Trim();
        }

        return null;
    }

    private static bool Visit(
        string key,
        Dictionary<string, GraphNode> graph,
        Dictionary<string, int> states,
        List<string> stack,
        Dictionary<string, int> stackIndexes,
        out string cycleStart,
        List<string> cycleKeys)
    {
        int state;
        if (states.TryGetValue(key, out state))
        {
            if (state == 1)
            {
                cycleStart = key;
                int startIndex = stackIndexes[key];
                for (int i = startIndex; i < stack.Count; i++)
                {
                    cycleKeys.Add(stack[i]);
                }
                cycleKeys.Add(key);
                return true;
            }

            cycleStart = null;
            return false;
        }

        states[key] = 1;
        stackIndexes[key] = stack.Count;
        stack.Add(key);

        List<string> neighbors = graph[key].Neighbors;
        for (int i = 0; i < neighbors.Count; i++)
        {
            if (Visit(neighbors[i], graph, states, stack, stackIndexes, out cycleStart, cycleKeys))
            {
                return true;
            }
        }

        stack.RemoveAt(stack.Count - 1);
        stackIndexes.Remove(key);
        states[key] = 2;
        cycleStart = null;
        return false;
    }

    private static AscetDependencyCycleDetectionResult BuildCycleResult(
        IList<string> cycleKeys,
        Dictionary<string, GraphNode> graph)
    {
        List<AscetDependencyNode> cycleNodes = new List<AscetDependencyNode>();
        List<AscetDependencyEdge> cycleEdges = new List<AscetDependencyEdge>();
        StringBuilder path = new StringBuilder();

        for (int i = 0; i < cycleKeys.Count; i++)
        {
            GraphNode node = graph[cycleKeys[i]];
            cycleNodes.Add(CloneNode(node.Value));
            if (i > 0)
            {
                path.Append(" -> ");
            }
            path.Append(GetDisplayLabel(node.Value, node.Key));

            if (i > 0)
            {
                GraphNode previous = graph[cycleKeys[i - 1]];
                cycleEdges.Add(new AscetDependencyEdge
                {
                    Source = CloneNode(previous.Value),
                    Target = CloneNode(node.Value)
                });
            }
        }

        return new AscetDependencyCycleDetectionResult(true, cycleNodes, cycleEdges, path.ToString());
    }

    private static AscetDependencyNode CloneNode(AscetDependencyNode node)
    {
        if (node == null)
        {
            return null;
        }

        return new AscetDependencyNode
        {
            ElementId = node.ElementId,
            Name = node.Name,
            Kind = node.Kind
        };
    }

    private static string GetDisplayLabel(AscetDependencyNode node, string fallback)
    {
        string elementId = node == null ? null : FirstNonBlank(node.ElementId, null);
        string name = node == null ? null : FirstNonBlank(node.Name, null);

        if (elementId != null && name != null && !String.Equals(elementId, name, StringComparison.Ordinal))
        {
            return elementId + "::" + name;
        }

        if (elementId != null)
        {
            return elementId;
        }

        if (name != null)
        {
            return name;
        }

        return fallback;
    }
}
