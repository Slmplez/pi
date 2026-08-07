using System;
using System.Collections.Generic;
using System.IO;
using System.Text;

public sealed class AscetReadModuleClosureArguments
{
    public string ModulePath { get; set; }
    public int MaxDepth { get; set; }
    public bool EmitJson { get; set; }
}

public static class AscetReadModuleClosure
{
    private const int DefaultMaxDepth = 10;

    public static int Main(string[] args)
    {
        TextWriter originalOut = Console.Out;
        StringWriter suppressedOut = null;

        try
        {
            AscetReadModuleClosureArguments arguments = ParseArguments(args);
            if (arguments.EmitJson)
            {
                suppressedOut = new StringWriter();
                Console.SetOut(suppressedOut);
            }

            AscetToolApiBootstrap.ConfigureAssemblyResolution();
            ModuleLocatorService locator = new ModuleLocatorService();
            AscetModuleClosureService service = new AscetModuleClosureService();
            AscetModuleRef module = locator.GetModule(arguments.ModulePath);
            AscetModuleClosure closure = service.GetClosure(module, arguments.MaxDepth);
            string output = arguments.EmitJson ? FormatJsonOutput(closure) : FormatTextOutput(closure);

            Console.SetOut(originalOut);
            Console.Write(output);
            return 0;
        }
        catch (Exception ex)
        {
            Console.SetOut(originalOut);
            Console.Error.WriteLine(FormatException(ex));
            return 1;
        }
        finally
        {
            Console.SetOut(originalOut);
            if (suppressedOut != null)
            {
                suppressedOut.Dispose();
            }
        }
    }

    public static AscetReadModuleClosureArguments ParseArguments(string[] args)
    {
        if (args == null || args.Length < 1)
        {
            throw new AscetReadException("invalid_argument", "parse_arguments", "usage: AscetCli.exe exec read_module_closure <module-path> [--max-depth <n>] [--json]");
        }

        if (args[0] != null && args[0].StartsWith("--", StringComparison.Ordinal))
        {
            throw new AscetReadException("invalid_argument", "parse_arguments", "usage: AscetCli.exe exec read_module_closure <module-path> [--max-depth <n>] [--json]");
        }

        AscetReadModuleClosureArguments result = new AscetReadModuleClosureArguments
        {
            ModulePath = AscetReadModuleSummary.NormalizeModulePath(args[0]),
            MaxDepth = DefaultMaxDepth,
            EmitJson = false
        };

        for (int i = 1; i < args.Length; i++)
        {
            if (String.Equals(args[i], "--json", StringComparison.OrdinalIgnoreCase))
            {
                result.EmitJson = true;
                continue;
            }

            if (String.Equals(args[i], "--max-depth", StringComparison.OrdinalIgnoreCase))
            {
                i++;
                if (i >= args.Length)
                {
                    throw new AscetReadException("invalid_argument", "parse_arguments", "Argument '--max-depth' requires an integer value.");
                }

                int maxDepth;
                if (!Int32.TryParse(args[i], out maxDepth) || maxDepth < 0)
                {
                    throw new AscetReadException("invalid_argument", "parse_arguments", "Argument '--max-depth' requires a non-negative integer value.");
                }

                result.MaxDepth = maxDepth;
                continue;
            }

            throw new AscetReadException("invalid_argument", "parse_arguments", "Unknown argument '" + args[i] + "'.");
        }

        return result;
    }

    public static string FormatTextOutput(AscetModuleClosure closure)
    {
        if (closure == null)
        {
            throw new AscetReadException("invalid_argument", "format_text_output", "Module closure must not be null.");
        }

        AscetModuleClosureRootRef root = closure.Root ?? new AscetModuleClosureRootRef();
        AscetModuleClosureTraversalRef traversal = closure.Traversal ?? new AscetModuleClosureTraversalRef();
        IList<AscetModuleClosureComponentRef> components = closure.Components ?? new List<AscetModuleClosureComponentRef>();
        IList<AscetModuleClosureEdgeRef> edges = closure.Edges ?? new List<AscetModuleClosureEdgeRef>();

        StringBuilder builder = new StringBuilder();
        builder.Append("Module: ").Append(root.ComponentPath ?? String.Empty).Append(" [").Append(root.LanguageKind.ToString()).Append("]").AppendLine();
        builder.Append("RootKind: ").Append(root.ComponentKind.ToString()).AppendLine();
        builder.Append("MaxDepth: ").Append(traversal.MaxDepth.ToString()).AppendLine();
        builder.Append("VisitedComponents: ").Append(traversal.VisitedComponentCount.ToString()).AppendLine();
        builder.Append("VisitedEdges: ").Append(traversal.VisitedEdgeCount.ToString()).AppendLine();
        builder.Append("Components: ").Append(components.Count.ToString()).AppendLine();
        builder.Append("Edges: ").Append(edges.Count.ToString()).AppendLine();
        builder.Append("Summary: ").Append(closure.Summary ?? String.Empty).AppendLine();
        return builder.ToString();
    }

    public static string FormatJsonOutput(AscetModuleClosure closure)
    {
        if (closure == null)
        {
            throw new AscetReadException("invalid_argument", "format_json_output", "Module closure must not be null.");
        }

        return AscetJsonContract.Serialize(BuildSerializableClosure(closure));
    }

    private static IDictionary<string, object> BuildSerializableClosure(AscetModuleClosure closure)
    {
        Dictionary<string, object> result = new Dictionary<string, object>();
        result["Root"] = BuildSerializableRoot(closure.Root);
        result["Traversal"] = BuildSerializableTraversal(closure.Traversal);
        result["Components"] = BuildSerializableComponents(closure.Components);
        result["Edges"] = BuildSerializableEdges(closure.Edges);
        result["Summary"] = closure.Summary ?? String.Empty;
        return result;
    }

    private static IDictionary<string, object> BuildSerializableRoot(AscetModuleClosureRootRef root)
    {
        Dictionary<string, object> result = new Dictionary<string, object>();
        result["ComponentPath"] = root == null ? String.Empty : (root.ComponentPath ?? String.Empty);
        result["ComponentKind"] = root == null ? AscetComponentKind.Unknown.ToString() : root.ComponentKind.ToString();
        result["LanguageKind"] = root == null ? AscetLanguageKind.Unknown.ToString() : root.LanguageKind.ToString();
        return result;
    }

    private static IDictionary<string, object> BuildSerializableTraversal(AscetModuleClosureTraversalRef traversal)
    {
        Dictionary<string, object> result = new Dictionary<string, object>();
        result["MaxDepth"] = traversal == null ? 0 : traversal.MaxDepth;
        result["VisitedComponentCount"] = traversal == null ? 0 : traversal.VisitedComponentCount;
        result["VisitedEdgeCount"] = traversal == null ? 0 : traversal.VisitedEdgeCount;
        return result;
    }

    private static IList<IDictionary<string, object>> BuildSerializableComponents(IList<AscetModuleClosureComponentRef> components)
    {
        List<IDictionary<string, object>> result = new List<IDictionary<string, object>>();
        if (components == null)
        {
            return result;
        }

        for (int i = 0; i < components.Count; i++)
        {
            AscetModuleClosureComponentRef component = components[i];
            Dictionary<string, object> entry = new Dictionary<string, object>();
            entry["ComponentPath"] = component == null ? String.Empty : (component.ComponentPath ?? String.Empty);
            entry["ComponentKind"] = component == null ? AscetComponentKind.Unknown.ToString() : component.ComponentKind.ToString();
            entry["LanguageKind"] = component == null ? AscetLanguageKind.Unknown.ToString() : component.LanguageKind.ToString();
            entry["Methods"] = BuildSerializableMethods(component == null ? null : component.Methods);
            entry["Diagrams"] = BuildSerializableDiagrams(component == null ? null : component.Diagrams);
            entry["BlockGraphs"] = BuildSerializableBlockGraphs(component == null ? null : component.BlockGraphs);
            entry["Implementation"] = BuildSerializableImplementation(component == null ? null : component.Implementation);
            entry["References"] = BuildSerializableReferences(component == null ? null : component.References);
            entry["Summary"] = component == null ? String.Empty : (component.Summary ?? String.Empty);
            result.Add(entry);
        }

        return result;
    }

    private static IList<IDictionary<string, object>> BuildSerializableMethods(IList<AscetMethodCode> methods)
    {
        List<IDictionary<string, object>> result = new List<IDictionary<string, object>>();
        if (methods == null)
        {
            return result;
        }

        for (int i = 0; i < methods.Count; i++)
        {
            AscetMethodCode method = methods[i];
            Dictionary<string, object> entry = new Dictionary<string, object>();
            entry["ComponentPath"] = method == null ? String.Empty : (method.ComponentPath ?? String.Empty);
            entry["ComponentKind"] = method == null ? String.Empty : method.ComponentKind.ToString();
            entry["LanguageKind"] = method == null ? String.Empty : method.LanguageKind.ToString();
            entry["MethodName"] = method == null ? String.Empty : (method.MethodName ?? String.Empty);
            entry["MethodKind"] = method == null ? String.Empty : method.MethodKind.ToString();
            entry["Code"] = method == null ? String.Empty : (method.Code ?? String.Empty);
            result.Add(entry);
        }

        return result;
    }

    private static IList<IDictionary<string, object>> BuildSerializableDiagrams(IList<AscetDiagramRef> diagrams)
    {
        List<IDictionary<string, object>> result = new List<IDictionary<string, object>>();
        if (diagrams == null)
        {
            return result;
        }

        for (int i = 0; i < diagrams.Count; i++)
        {
            AscetDiagramRef diagram = diagrams[i];
            Dictionary<string, object> entry = new Dictionary<string, object>();
            entry["Name"] = diagram == null ? String.Empty : (diagram.Name ?? String.Empty);
            entry["OwningComponentPath"] = diagram == null ? String.Empty : (diagram.OwningComponentPath ?? String.Empty);
            entry["DiagramKind"] = diagram == null ? String.Empty : diagram.DiagramKind.ToString();
            result.Add(entry);
        }

        return result;
    }

    private static IList<IDictionary<string, object>> BuildSerializableBlockGraphs(IList<AscetBlockDiagramGraph> blockGraphs)
    {
        List<IDictionary<string, object>> result = new List<IDictionary<string, object>>();
        if (blockGraphs == null)
        {
            return result;
        }

        for (int i = 0; i < blockGraphs.Count; i++)
        {
            AscetBlockDiagramGraph blockGraph = blockGraphs[i];
            result.Add(BuildSerializableBlockGraph(blockGraph));
        }

        return result;
    }

    private static IDictionary<string, object> BuildSerializableBlockGraph(AscetBlockDiagramGraph graph)
    {
        if (graph == null)
        {
            return null;
        }

        return AscetJsonContract.DeserializeObject(AscetReadBlockDiagram.FormatJsonOutput(graph));
    }

    private static IDictionary<string, object> BuildSerializableImplementation(AscetImplementationSnapshot implementation)
    {
        if (implementation == null)
        {
            return null;
        }

        return AscetJsonContract.DeserializeObject(AscetReadImplementation.FormatJsonOutput(implementation));
    }

    private static IDictionary<string, object> BuildSerializableReferences(AscetReferenceGraphSummary references)
    {
        if (references == null)
        {
            return null;
        }

        return AscetJsonContract.DeserializeObject(AscetReadReferences.FormatJsonOutput(references));
    }

    private static IList<IDictionary<string, object>> BuildSerializableEdges(IList<AscetModuleClosureEdgeRef> edges)
    {
        List<IDictionary<string, object>> result = new List<IDictionary<string, object>>();
        if (edges == null)
        {
            return result;
        }

        for (int i = 0; i < edges.Count; i++)
        {
            AscetModuleClosureEdgeRef edge = edges[i];
            Dictionary<string, object> entry = new Dictionary<string, object>();
            entry["FromComponentPath"] = edge == null ? String.Empty : (edge.FromComponentPath ?? String.Empty);
            entry["ToComponentPath"] = edge == null ? String.Empty : (edge.ToComponentPath ?? String.Empty);
            entry["EdgeKind"] = edge == null ? AscetModuleClosureEdgeKind.Unknown.ToString() : edge.EdgeKind.ToString();
            entry["SourceElementName"] = edge == null ? String.Empty : (edge.SourceElementName ?? String.Empty);
            entry["SourceElementKind"] = edge == null ? String.Empty : (edge.SourceElementKind ?? String.Empty);
            entry["ChildImplementationName"] = edge == null ? String.Empty : (edge.ChildImplementationName ?? String.Empty);
            entry["Depth"] = edge == null ? 0 : edge.Depth;
            result.Add(entry);
        }

        return result;
    }

    private static string FormatException(Exception ex)
    {
        StringBuilder builder = new StringBuilder();
        int depth = 0;
        while (ex != null)
        {
            builder.Append("Exception[").Append(depth).Append("]: ").Append(ex.GetType().FullName).AppendLine();
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
