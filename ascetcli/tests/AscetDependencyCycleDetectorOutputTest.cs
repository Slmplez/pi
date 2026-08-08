using System;
using System.Collections.Generic;

class AscetDependencyCycleDetectorOutputTest
{
    static int Main()
    {
        ExpectSelfCycle();
        ExpectDirectCycle();
        ExpectIndirectCycleAcrossExistingAndProposedEdges();
        ExpectConstantsAreIgnored();
        ExpectAcyclicGraph();
        ExpectMissingParameterIdentityIsRejected();
        return 0;
    }

    private static void ExpectSelfCycle()
    {
        AscetDependencyNode a = Parameter("A");
        AscetDependencyCycleDetectionResult result = new AscetDependencyCycleDetector().Detect(
            new AscetDependencyCycleDetectionInput
            {
                ProposedEdges = new List<AscetDependencyEdge>
                {
                    Edge(a, a)
                }
            });

        Expect(result.HasCycle, "self dependency cycle was not detected");
        ExpectEqual("A -> A", result.CyclePath, "self dependency cycle path");
        ExpectEqual(2, result.CycleNodes.Count, "self dependency cycle node count");
        ExpectEqual(1, result.CycleEdges.Count, "self dependency cycle edge count");
    }
    private static void ExpectDirectCycle()
    {
        AscetDependencyNode a = Parameter("A");
        AscetDependencyNode b = Parameter("B");
        AscetDependencyCycleDetectionResult result = new AscetDependencyCycleDetector().Detect(
            new AscetDependencyCycleDetectionInput
            {
                ExistingAdjacency = new List<AscetDependencyElementAdjacency>
                {
                    Adjacency(a, b)
                },
                ProposedEdges = new List<AscetDependencyEdge>
                {
                    Edge(b, a)
                }
            });

        Expect(result.HasCycle, "direct cycle was not detected");
        ExpectEqual("A -> B -> A", result.CyclePath, "direct cycle path");
        ExpectEqual(3, result.CycleNodes.Count, "direct cycle node count");
        ExpectEqual(2, result.CycleEdges.Count, "direct cycle edge count");
    }

    private static void ExpectIndirectCycleAcrossExistingAndProposedEdges()
    {
        AscetDependencyNode a = Parameter("Component/A", "A");
        AscetDependencyNode b = Parameter("Component/B", "B");
        AscetDependencyNode c = Parameter("Component/C", "C");
        AscetDependencyCycleDetectionResult result = new AscetDependencyCycleDetector().Detect(
            new AscetDependencyCycleDetectionInput
            {
                ExistingAdjacency = new List<AscetDependencyElementAdjacency>
                {
                    Adjacency(a, b),
                    Adjacency(b, c)
                },
                ProposedEdges = new List<AscetDependencyEdge>
                {
                    Edge(c, a)
                }
            });

        Expect(result.HasCycle, "indirect cycle was not detected");
        ExpectEqual("Component/A::A -> Component/B::B -> Component/C::C -> Component/A::A", result.CyclePath, "indirect cycle path");
        ExpectEqual("Component/A", result.CycleNodes[0].ElementId, "indirect cycle first node");
        ExpectEqual("Component/C", result.CycleNodes[2].ElementId, "indirect cycle last distinct node");
    }

    private static void ExpectConstantsAreIgnored()
    {
        AscetDependencyNode parameter = Parameter("P");
        AscetDependencyNode constant = new AscetDependencyNode
        {
            ElementId = "K",
            Name = "K",
            Kind = AscetDependencyNodeKind.Constant
        };
        AscetDependencyNode systemConstant = new AscetDependencyNode
        {
            ElementId = "SK",
            Name = "SK",
            Kind = AscetDependencyNodeKind.SystemConstant
        };

        AscetDependencyCycleDetectionResult result = new AscetDependencyCycleDetector().Detect(
            new AscetDependencyCycleDetectionInput
            {
                ExistingAdjacency = new List<AscetDependencyElementAdjacency>
                {
                    Adjacency(parameter, constant),
                    Adjacency(systemConstant, parameter)
                },
                ProposedEdges = new List<AscetDependencyEdge>
                {
                    Edge(constant, parameter),
                    Edge(parameter, systemConstant)
                }
            });

        Expect(!result.HasCycle, "Constant/System Constant nodes must not create a cycle");
        ExpectEqual(String.Empty, result.CyclePath, "ignored-node cycle path");
        ExpectEqual(0, result.CycleNodes.Count, "ignored-node cycle nodes");
    }

    private static void ExpectAcyclicGraph()
    {
        AscetDependencyNode a = Parameter("A");
        AscetDependencyNode b = Parameter("B");
        AscetDependencyNode c = Parameter("C");
        AscetDependencyCycleDetectionResult result = new AscetDependencyCycleDetector().Detect(
            new List<AscetDependencyElementAdjacency>
            {
                Adjacency(a, b),
                Adjacency(b, c)
            },
            new List<AscetDependencyEdge>());

        Expect(!result.HasCycle, "acyclic graph was reported as cyclic");
        ExpectEqual(String.Empty, result.CyclePath, "acyclic cycle path");
    }

    private static void ExpectMissingParameterIdentityIsRejected()
    {
        try
        {
            new AscetDependencyCycleDetector().Detect(
                new AscetDependencyCycleDetectionInput
                {
                    ProposedEdges = new List<AscetDependencyEdge>
                    {
                        Edge(
                            new AscetDependencyNode { Kind = AscetDependencyNodeKind.Parameter },
                            Parameter("B"))
                    }
                });
            throw new Exception("Parameter without ElementId or Name should be rejected.");
        }
        catch (ArgumentException ex)
        {
            Expect(ex.Message.IndexOf("ElementId or Name", StringComparison.Ordinal) >= 0, "missing identity error was not readable");
        }
    }

    private static AscetDependencyElementAdjacency Adjacency(
        AscetDependencyNode element,
        params AscetDependencyNode[] mappedNodes)
    {
        return new AscetDependencyElementAdjacency
        {
            Element = element,
            MappedNodes = new List<AscetDependencyNode>(mappedNodes)
        };
    }

    private static AscetDependencyEdge Edge(AscetDependencyNode source, AscetDependencyNode target)
    {
        return new AscetDependencyEdge
        {
            Source = source,
            Target = target
        };
    }

    private static AscetDependencyNode Parameter(string name)
    {
        return Parameter(name, name);
    }

    private static AscetDependencyNode Parameter(string elementId, string name)
    {
        return new AscetDependencyNode
        {
            ElementId = elementId,
            Name = name,
            Kind = AscetDependencyNodeKind.Parameter
        };
    }

    private static void Expect(bool condition, string message)
    {
        if (!condition)
        {
            throw new Exception(message);
        }
    }

    private static void ExpectEqual<T>(T expected, T actual, string label)
    {
        if (!Object.Equals(expected, actual))
        {
            throw new Exception(label + ": expected '" + expected + "', got '" + actual + "'.");
        }
    }
}
