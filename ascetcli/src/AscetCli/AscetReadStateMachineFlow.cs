using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
using System.Web.Script.Serialization;

public sealed class AscetReadStateMachineFlowArguments
{
    public string ComponentPath { get; set; }
    public int TraceDepth { get; set; }
    public string DetailLevel { get; set; }
    public bool EmitJson { get; set; }
}

public static class AscetReadStateMachineFlow
{
    public static int Main(string[] args)
    {
        TextWriter originalOut = Console.Out;
        StringWriter suppressedOut = null;

        try
        {
            AscetReadStateMachineFlowArguments arguments = ParseArguments(args);
            if (arguments.EmitJson)
            {
                suppressedOut = new StringWriter();
                Console.SetOut(suppressedOut);
            }

            AscetToolApiBootstrap.ConfigureAssemblyResolution();
            ComponentLocatorService locator = new ComponentLocatorService();
            StateMachineFlowAnalysisService service = new StateMachineFlowAnalysisService();
            AscetItemPath parsed = AscetItemPath.Parse(arguments.ComponentPath);
            AscetItemRef component = locator.FindItemInFolder(parsed.ItemName, parsed.FolderPath);
            AscetStateMachineFlowSummary summary = service.GetFlowSummary(component, arguments.TraceDepth);
            string output = arguments.EmitJson ? FormatJsonOutput(summary, arguments.DetailLevel, arguments.TraceDepth) : FormatTextOutput(summary);

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

    public static AscetReadStateMachineFlowArguments ParseArguments(string[] args)
    {
        if (args == null || args.Length < 1)
        {
            throw new AscetReadException("invalid_argument", "parse_arguments", "usage: AscetCli.exe exec read_state_machine_flow <component-path> [--trace-depth <n>] [--detail-level summary|topology|full] [--json]");
        }

        AscetReadStateMachineFlowArguments result = new AscetReadStateMachineFlowArguments
        {
            ComponentPath = NormalizeComponentPath(args[0]),
            TraceDepth = 1,
            DetailLevel = "full",
            EmitJson = false
        };

        for (int i = 1; i < args.Length; i++)
        {
            string argument = args[i];
            if (String.Equals(argument, "--json", StringComparison.OrdinalIgnoreCase))
            {
                result.EmitJson = true;
                continue;
            }

            if (String.Equals(argument, "--trace-depth", StringComparison.OrdinalIgnoreCase))
            {
                if (i + 1 >= args.Length)
                {
                    throw new AscetReadException("invalid_argument", "parse_arguments", "Missing value after --trace-depth.");
                }

                int depth;
                if (!Int32.TryParse(args[++i], out depth) || depth < 0)
                {
                    throw new AscetReadException("invalid_argument", "parse_arguments", "Trace depth must be a non-negative integer.");
                }

                result.TraceDepth = depth;
                continue;
            }

            if (String.Equals(argument, "--detail-level", StringComparison.OrdinalIgnoreCase))
            {
                if (i + 1 >= args.Length)
                {
                    throw new AscetReadException("invalid_argument", "parse_arguments", "Missing value after --detail-level.");
                }

                string detailLevel = (args[++i] ?? String.Empty).Trim().ToLowerInvariant();
                if (!String.Equals(detailLevel, "summary", StringComparison.Ordinal)
                    && !String.Equals(detailLevel, "topology", StringComparison.Ordinal)
                    && !String.Equals(detailLevel, "full", StringComparison.Ordinal))
                {
                    throw new AscetReadException("invalid_argument", "parse_arguments", "Detail level must be summary, topology or full.");
                }

                result.DetailLevel = detailLevel;
                continue;
            }

            throw new AscetReadException("invalid_argument", "parse_arguments", "Unknown argument '" + argument + "'.");
        }

        return result;
    }

    public static string FormatTextOutput(AscetStateMachineFlowSummary summary)
    {
        if (summary == null)
        {
            throw new AscetReadException("invalid_argument", "format_text_output", "Flow summary must not be null.");
        }

        StringBuilder builder = new StringBuilder();
        builder.Append("Component: ").Append(summary.ComponentPath ?? String.Empty).AppendLine();
        builder.Append("Language: ").Append(summary.LanguageKind.ToString()).AppendLine();
        builder.Append("Diagram: ").Append(summary.DiagramName ?? String.Empty).AppendLine();
        builder.Append("StateFlows: ").Append(summary.StateFlows == null ? 0 : summary.StateFlows.Count).AppendLine();
        AppendStateFlows(builder, summary.StateFlows);
        builder.Append("TransitionFlows: ").Append(summary.TransitionFlows == null ? 0 : summary.TransitionFlows.Count).AppendLine();
        AppendTransitionFlows(builder, summary.TransitionFlows);
        builder.Append("DependencyChains: ").Append(summary.DependencyChains == null ? 0 : summary.DependencyChains.Count).AppendLine();
        AppendDependencyLines(builder, summary.DependencyChains, 2);
        builder.Append("ReferenceTrace:").AppendLine();
        AppendReferenceTrace(builder, summary.ReferenceTrace, 2);
        builder.Append("Summary: ").Append(summary.Summary ?? String.Empty).AppendLine();
        return builder.ToString();
    }

    public static string FormatJsonOutput(AscetStateMachineFlowSummary summary)
    {
        return FormatJsonOutput(summary, "full");
    }

    public static string FormatJsonOutput(AscetStateMachineFlowSummary summary, string detailLevel)
    {
        return FormatJsonOutput(summary, detailLevel, null);
    }

    public static string FormatJsonOutput(AscetStateMachineFlowSummary summary, string detailLevel, int? traceDepth)
    {
        if (summary == null)
        {
            throw new AscetReadException("invalid_argument", "format_json_output", "Flow summary must not be null.");
        }

        JavaScriptSerializer serializer = new JavaScriptSerializer();
        return AscetJsonContract.Serialize(BuildSerializableSummary(summary, detailLevel, traceDepth));
    }

    private static void AppendStateFlows(StringBuilder builder, IList<AscetStateFlowRef> flows)
    {
        if (builder == null || flows == null)
        {
            return;
        }

        for (int i = 0; i < flows.Count; i++)
        {
            AscetStateFlowRef flow = flows[i];
            if (flow == null)
            {
                continue;
            }

            builder.Append("  StateFlow: ").Append(flow.StateName ?? String.Empty).Append(" Start=").Append(flow.IsStartState).AppendLine();
            AppendBindings(builder, flow.Bindings, 4);
            AppendDependencyLines(builder, flow.Dependencies, 4);
        }
    }

    private static void AppendTransitionFlows(StringBuilder builder, IList<AscetTransitionFlowRef> flows)
    {
        if (builder == null || flows == null)
        {
            return;
        }

        for (int i = 0; i < flows.Count; i++)
        {
            AscetTransitionFlowRef flow = flows[i];
            if (flow == null)
            {
                continue;
            }

            builder.Append("  TransitionFlow: ")
                .Append(flow.TransitionName ?? String.Empty)
                .Append(" Source=")
                .Append(flow.SourceState ?? String.Empty)
                .Append(" Target=")
                .Append(flow.TargetState ?? String.Empty)
                .Append(" Priority=")
                .Append(flow.Priority)
                .AppendLine();
            AppendBinding(builder, flow.Trigger, 4);
            AppendBinding(builder, flow.Guard, 4);
            AppendBinding(builder, flow.Action, 4);
            AppendDependencyLines(builder, flow.Dependencies, 4);
        }
    }

    private static void AppendBindings(StringBuilder builder, IList<AscetFlowBindingRef> bindings, int indent)
    {
        if (bindings == null)
        {
            return;
        }

        for (int i = 0; i < bindings.Count; i++)
        {
            AppendBinding(builder, bindings[i], indent);
        }
    }

    private static void AppendBinding(StringBuilder builder, AscetFlowBindingRef binding, int indent)
    {
        if (builder == null || binding == null)
        {
            return;
        }

        string prefix = new string(' ', indent);
        builder.Append(prefix)
            .Append("Binding[")
            .Append(binding.Role ?? String.Empty)
            .Append("]: Source=")
            .Append(binding.SourceType ?? String.Empty)
            .Append(" Name=")
            .Append(binding.MethodName ?? String.Empty)
            .Append(" Kind=")
            .Append(binding.MethodKind.ToString())
            .AppendLine();
        AppendCode(builder, binding.Code, indent + 2);
        AppendCodeAnalysis(builder, binding.CodeAnalysis, indent + 2);
        AppendRelatedReferences(builder, binding.RelatedReferences, indent + 2);
    }

    private static void AppendCode(StringBuilder builder, string code, int indent)
    {
        string prefix = new string(' ', indent);
        builder.Append(prefix).Append("Code:").AppendLine();
        string[] lines = (code ?? String.Empty).Replace("\r\n", "\n").Replace('\r', '\n').Split('\n');
        if (lines.Length == 0)
        {
            builder.Append(prefix).Append("  ").AppendLine();
            return;
        }

        for (int i = 0; i < lines.Length; i++)
        {
            builder.Append(prefix).Append("  ").Append(lines[i] ?? String.Empty).AppendLine();
        }
    }

    private static void AppendCodeAnalysis(StringBuilder builder, AscetCodeAnalysisRef analysis, int indent)
    {
        if (builder == null || analysis == null)
        {
            return;
        }

        string prefix = new string(' ', indent);
        builder.Append(prefix).Append("Reads: ").Append(String.Join(", ", AscetAdvancedAnalysisUtilities.DistinctStrings(analysis.Reads).ToArray())).AppendLine();
        builder.Append(prefix).Append("Writes: ").Append(String.Join(", ", AscetAdvancedAnalysisUtilities.DistinctStrings(analysis.Writes).ToArray())).AppendLine();
        builder.Append(prefix).Append("Calls: ").Append(String.Join(", ", AscetAdvancedAnalysisUtilities.DistinctStrings(analysis.Calls).ToArray())).AppendLine();
        builder.Append(prefix).Append("References: ").Append(String.Join(", ", AscetAdvancedAnalysisUtilities.DistinctStrings(analysis.ReferencedComponents).ToArray())).AppendLine();
        if (analysis.Diagnostics != null && analysis.Diagnostics.Count > 0)
        {
            builder.Append(prefix).Append("Diagnostics: ").Append(String.Join(" | ", AscetAdvancedAnalysisUtilities.DistinctStrings(analysis.Diagnostics).ToArray())).AppendLine();
        }
    }

    private static void AppendRelatedReferences(StringBuilder builder, IList<AscetReferenceEdgeRef> references, int indent)
    {
        if (builder == null || references == null)
        {
            return;
        }

        string prefix = new string(' ', indent);
        for (int i = 0; i < references.Count; i++)
        {
            AscetReferenceEdgeRef edge = references[i];
            if (edge == null)
            {
                continue;
            }

            builder.Append(prefix)
                .Append("DependsOn: ")
                .Append(edge.SourceElementName ?? String.Empty)
                .Append(" -> ")
                .Append(edge.TargetComponentPath ?? String.Empty)
                .AppendLine();
        }
    }

    private static void AppendDependencyLines(StringBuilder builder, IList<AscetDependencyChainRef> dependencies, int indent)
    {
        if (builder == null || dependencies == null)
        {
            return;
        }

        string prefix = new string(' ', indent);
        for (int i = 0; i < dependencies.Count; i++)
        {
            AscetDependencyChainRef dependency = dependencies[i];
            if (dependency == null)
            {
                continue;
            }

            builder.Append(prefix)
                .Append("Chain: ")
                .Append(dependency.Scope ?? String.Empty)
                .Append("/")
                .Append(dependency.OwnerName ?? String.Empty)
                .Append("/")
                .Append(dependency.Role ?? String.Empty)
                .Append("/")
                .Append(dependency.BindingName ?? String.Empty)
                .Append(" -> ")
                .Append(dependency.ReferenceElementName ?? String.Empty)
                .Append(" -> ")
                .Append(dependency.TargetComponentPath ?? String.Empty)
                .AppendLine();
        }
    }

    private static void AppendReferenceTrace(StringBuilder builder, IList<AscetReferenceTraceNodeRef> nodes, int indent)
    {
        if (builder == null || nodes == null)
        {
            return;
        }

        string prefix = new string(' ', indent);
        for (int i = 0; i < nodes.Count; i++)
        {
            AscetReferenceTraceNodeRef node = nodes[i];
            if (node == null)
            {
                continue;
            }

            if (String.IsNullOrWhiteSpace(node.ViaElementName))
            {
                builder.Append(prefix)
                    .Append(node.ComponentPath ?? String.Empty)
                    .Append(" [")
                    .Append(node.ComponentKind.ToString())
                    .Append("/")
                    .Append(node.LanguageKind.ToString())
                    .Append("]")
                    .AppendLine();
            }
            else
            {
                builder.Append(prefix)
                    .Append(node.ViaElementName ?? String.Empty)
                    .Append(" => ")
                    .Append(node.ComponentPath ?? String.Empty)
                    .Append(" [")
                    .Append(node.ComponentKind.ToString())
                    .Append("/")
                    .Append(node.LanguageKind.ToString())
                    .Append("]")
                    .AppendLine();
            }

            AppendReferenceTrace(builder, node.Children, indent + 2);
        }
    }

    private static IDictionary<string, object> BuildSerializableSummary(AscetStateMachineFlowSummary summary, string detailLevel, int? traceDepth)
    {
        if (String.Equals((detailLevel ?? String.Empty).Trim(), "summary", StringComparison.OrdinalIgnoreCase))
        {
            return BuildSerializableCompactSummary(summary);
        }

        if (String.Equals((detailLevel ?? String.Empty).Trim(), "topology", StringComparison.OrdinalIgnoreCase))
        {
            return BuildSerializableTopology(summary, traceDepth);
        }

        Dictionary<string, object> result = new Dictionary<string, object>();
        result["ComponentPath"] = summary.ComponentPath ?? String.Empty;
        result["LanguageKind"] = summary.LanguageKind.ToString();
        result["DiagramName"] = summary.DiagramName ?? String.Empty;
        result["StateFlows"] = BuildSerializableStateFlows(summary.StateFlows);
        result["TransitionFlows"] = BuildSerializableTransitionFlows(summary.TransitionFlows);
        result["DependencyChains"] = BuildSerializableDependencyChains(summary.DependencyChains);
        result["ReferenceTrace"] = BuildSerializableReferenceTrace(summary.ReferenceTrace);
        result["Summary"] = summary.Summary ?? String.Empty;
        if (traceDepth.HasValue)
        {
            result["TraceDepth"] = traceDepth.Value;
        }
        return result;
    }

    private static IDictionary<string, object> BuildSerializableTopology(AscetStateMachineFlowSummary summary, int? traceDepth)
    {
        Dictionary<string, object> result = new Dictionary<string, object>();
        result["ComponentPath"] = summary.ComponentPath ?? String.Empty;
        result["LanguageKind"] = summary.LanguageKind.ToString();
        result["DiagramName"] = summary.DiagramName ?? String.Empty;
        result["DetailLevel"] = "topology";
        if (traceDepth.HasValue)
        {
            result["TraceDepth"] = traceDepth.Value;
        }
        result["Counts"] = BuildSerializableCompactCounts(summary);
        result["States"] = BuildSerializableTopologyStates(summary.StateFlows);
        result["Transitions"] = BuildSerializableTopologyTransitions(summary.TransitionFlows);
        result["Summary"] = summary.Summary ?? String.Empty;
        return result;
    }

    private static IDictionary<string, object> BuildSerializableCompactSummary(AscetStateMachineFlowSummary summary)
    {
        Dictionary<string, object> result = new Dictionary<string, object>();
        result["ComponentPath"] = summary.ComponentPath ?? String.Empty;
        result["LanguageKind"] = summary.LanguageKind.ToString();
        result["DiagramName"] = summary.DiagramName ?? String.Empty;
        result["DetailLevel"] = "summary";
        result["Counts"] = BuildSerializableCompactCounts(summary);
        result["StateNames"] = BuildStateNames(summary.StateFlows);
        result["TransitionNames"] = BuildTransitionNames(summary.TransitionFlows);
        result["Summary"] = summary.Summary ?? String.Empty;
        return result;
    }

    private static IDictionary<string, object> BuildSerializableCompactCounts(AscetStateMachineFlowSummary summary)
    {
        Dictionary<string, object> result = new Dictionary<string, object>();
        result["StateFlows"] = summary.StateFlows == null ? 0 : summary.StateFlows.Count;
        result["TransitionFlows"] = summary.TransitionFlows == null ? 0 : summary.TransitionFlows.Count;
        result["DependencyChains"] = summary.DependencyChains == null ? 0 : summary.DependencyChains.Count;
        result["ReferenceTraceRoots"] = summary.ReferenceTrace == null ? 0 : summary.ReferenceTrace.Count;
        return result;
    }

    private static IList<string> BuildStateNames(IList<AscetStateFlowRef> flows)
    {
        List<string> result = new List<string>();
        if (flows == null)
        {
            return result;
        }

        for (int i = 0; i < flows.Count; i++)
        {
            string name = flows[i] == null ? String.Empty : (flows[i].StateName ?? String.Empty);
            if (!String.IsNullOrWhiteSpace(name) && !result.Contains(name))
            {
                result.Add(name);
            }
        }

        return result;
    }

    private static IList<string> BuildTransitionNames(IList<AscetTransitionFlowRef> flows)
    {
        List<string> result = new List<string>();
        if (flows == null)
        {
            return result;
        }

        for (int i = 0; i < flows.Count; i++)
        {
            string name = flows[i] == null ? String.Empty : (flows[i].TransitionName ?? String.Empty);
            if (!String.IsNullOrWhiteSpace(name) && !result.Contains(name))
            {
                result.Add(name);
            }
        }

        return result;
    }

    private static IList<IDictionary<string, object>> BuildSerializableTopologyStates(IList<AscetStateFlowRef> flows)
    {
        List<IDictionary<string, object>> result = new List<IDictionary<string, object>>();
        if (flows == null)
        {
            return result;
        }

        for (int i = 0; i < flows.Count; i++)
        {
            AscetStateFlowRef flow = flows[i];
            Dictionary<string, object> entry = new Dictionary<string, object>();
            entry["StateName"] = flow == null ? String.Empty : (flow.StateName ?? String.Empty);
            entry["IsStartState"] = flow != null && flow.IsStartState;
            result.Add(entry);
        }

        return result;
    }

    private static IList<IDictionary<string, object>> BuildSerializableTopologyTransitions(IList<AscetTransitionFlowRef> flows)
    {
        List<IDictionary<string, object>> result = new List<IDictionary<string, object>>();
        if (flows == null)
        {
            return result;
        }

        for (int i = 0; i < flows.Count; i++)
        {
            AscetTransitionFlowRef flow = flows[i];
            Dictionary<string, object> entry = new Dictionary<string, object>();
            entry["TransitionName"] = flow == null ? String.Empty : (flow.TransitionName ?? String.Empty);
            entry["SourceState"] = flow == null ? String.Empty : (flow.SourceState ?? String.Empty);
            entry["TargetState"] = flow == null ? String.Empty : (flow.TargetState ?? String.Empty);
            entry["Priority"] = flow == null ? 0 : flow.Priority;
            result.Add(entry);
        }

        return result;
    }
    private static IList<IDictionary<string, object>> BuildSerializableStateFlows(IList<AscetStateFlowRef> flows)
    {
        List<IDictionary<string, object>> result = new List<IDictionary<string, object>>();
        if (flows == null)
        {
            return result;
        }

        for (int i = 0; i < flows.Count; i++)
        {
            AscetStateFlowRef flow = flows[i];
            Dictionary<string, object> entry = new Dictionary<string, object>();
            entry["StateName"] = flow == null ? String.Empty : (flow.StateName ?? String.Empty);
            entry["IsStartState"] = flow != null && flow.IsStartState;
            entry["Bindings"] = BuildSerializableBindings(flow == null ? null : flow.Bindings);
            entry["Dependencies"] = BuildSerializableDependencyChains(flow == null ? null : flow.Dependencies);
            result.Add(entry);
        }

        return result;
    }

    private static IList<IDictionary<string, object>> BuildSerializableTransitionFlows(IList<AscetTransitionFlowRef> flows)
    {
        List<IDictionary<string, object>> result = new List<IDictionary<string, object>>();
        if (flows == null)
        {
            return result;
        }

        for (int i = 0; i < flows.Count; i++)
        {
            AscetTransitionFlowRef flow = flows[i];
            Dictionary<string, object> entry = new Dictionary<string, object>();
            entry["TransitionName"] = flow == null ? String.Empty : (flow.TransitionName ?? String.Empty);
            entry["SourceState"] = flow == null ? String.Empty : (flow.SourceState ?? String.Empty);
            entry["TargetState"] = flow == null ? String.Empty : (flow.TargetState ?? String.Empty);
            entry["Priority"] = flow == null ? 0 : flow.Priority;
            entry["Trigger"] = BuildSerializableBinding(flow == null ? null : flow.Trigger);
            entry["Guard"] = BuildSerializableBinding(flow == null ? null : flow.Guard);
            entry["Action"] = BuildSerializableBinding(flow == null ? null : flow.Action);
            entry["Dependencies"] = BuildSerializableDependencyChains(flow == null ? null : flow.Dependencies);
            result.Add(entry);
        }

        return result;
    }

    private static IList<IDictionary<string, object>> BuildSerializableBindings(IList<AscetFlowBindingRef> bindings)
    {
        List<IDictionary<string, object>> result = new List<IDictionary<string, object>>();
        if (bindings == null)
        {
            return result;
        }

        for (int i = 0; i < bindings.Count; i++)
        {
            result.Add(BuildSerializableBinding(bindings[i]));
        }

        return result;
    }

    private static IDictionary<string, object> BuildSerializableBinding(AscetFlowBindingRef binding)
    {
        Dictionary<string, object> result = new Dictionary<string, object>();
        result["Role"] = binding == null ? String.Empty : (binding.Role ?? String.Empty);
        result["SourceType"] = binding == null ? String.Empty : (binding.SourceType ?? String.Empty);
        result["MethodName"] = binding == null ? String.Empty : (binding.MethodName ?? String.Empty);
        result["MethodKind"] = binding == null ? String.Empty : binding.MethodKind.ToString();
        result["Code"] = binding == null ? String.Empty : (binding.Code ?? String.Empty);
        result["CodeAnalysis"] = BuildSerializableCodeAnalysis(binding == null ? null : binding.CodeAnalysis);
        result["RelatedReferences"] = BuildSerializableReferences(binding == null ? null : binding.RelatedReferences);
        return result;
    }

    private static IDictionary<string, object> BuildSerializableCodeAnalysis(AscetCodeAnalysisRef analysis)
    {
        if (analysis == null)
        {
            return null;
        }

        Dictionary<string, object> result = new Dictionary<string, object>();
        result["ParseSucceeded"] = analysis.ParseSucceeded;
        result["Reads"] = AscetAdvancedAnalysisUtilities.DistinctStrings(analysis.Reads);
        result["Writes"] = AscetAdvancedAnalysisUtilities.DistinctStrings(analysis.Writes);
        result["Calls"] = AscetAdvancedAnalysisUtilities.DistinctStrings(analysis.Calls);
        result["ReferencedComponents"] = AscetAdvancedAnalysisUtilities.DistinctStrings(analysis.ReferencedComponents);
        result["Diagnostics"] = AscetAdvancedAnalysisUtilities.DistinctStrings(analysis.Diagnostics);
        return result;
    }

    private static IList<IDictionary<string, object>> BuildSerializableReferences(IList<AscetReferenceEdgeRef> references)
    {
        List<IDictionary<string, object>> result = new List<IDictionary<string, object>>();
        if (references == null)
        {
            return result;
        }

        for (int i = 0; i < references.Count; i++)
        {
            AscetReferenceEdgeRef edge = references[i];
            Dictionary<string, object> entry = new Dictionary<string, object>();
            entry["SourceElementName"] = edge == null ? String.Empty : (edge.SourceElementName ?? String.Empty);
            entry["TargetComponentPath"] = edge == null ? String.Empty : (edge.TargetComponentPath ?? String.Empty);
            entry["TargetComponentKind"] = edge == null ? String.Empty : edge.TargetComponentKind.ToString();
            entry["TargetLanguageKind"] = edge == null ? String.Empty : edge.TargetLanguageKind.ToString();
            entry["IsResolved"] = edge != null && edge.IsResolved;
            result.Add(entry);
        }

        return result;
    }

    private static IList<IDictionary<string, object>> BuildSerializableDependencyChains(IList<AscetDependencyChainRef> dependencies)
    {
        List<IDictionary<string, object>> result = new List<IDictionary<string, object>>();
        if (dependencies == null)
        {
            return result;
        }

        for (int i = 0; i < dependencies.Count; i++)
        {
            AscetDependencyChainRef dependency = dependencies[i];
            Dictionary<string, object> entry = new Dictionary<string, object>();
            entry["Scope"] = dependency == null ? String.Empty : (dependency.Scope ?? String.Empty);
            entry["OwnerName"] = dependency == null ? String.Empty : (dependency.OwnerName ?? String.Empty);
            entry["Role"] = dependency == null ? String.Empty : (dependency.Role ?? String.Empty);
            entry["BindingName"] = dependency == null ? String.Empty : (dependency.BindingName ?? String.Empty);
            entry["ReferenceElementName"] = dependency == null ? String.Empty : (dependency.ReferenceElementName ?? String.Empty);
            entry["TargetComponentPath"] = dependency == null ? String.Empty : (dependency.TargetComponentPath ?? String.Empty);
            result.Add(entry);
        }

        return result;
    }

    private static IList<IDictionary<string, object>> BuildSerializableReferenceTrace(IList<AscetReferenceTraceNodeRef> nodes)
    {
        List<IDictionary<string, object>> result = new List<IDictionary<string, object>>();
        if (nodes == null)
        {
            return result;
        }

        for (int i = 0; i < nodes.Count; i++)
        {
            AscetReferenceTraceNodeRef node = nodes[i];
            Dictionary<string, object> entry = new Dictionary<string, object>();
            entry["ComponentPath"] = node == null ? String.Empty : (node.ComponentPath ?? String.Empty);
            entry["ComponentKind"] = node == null ? String.Empty : node.ComponentKind.ToString();
            entry["LanguageKind"] = node == null ? String.Empty : node.LanguageKind.ToString();
            entry["ViaElementName"] = node == null ? String.Empty : (node.ViaElementName ?? String.Empty);
            entry["Children"] = BuildSerializableReferenceTrace(node == null ? null : node.Children);
            result.Add(entry);
        }

        return result;
    }

    private static string NormalizeJsonOutput(string json)
    {
        return AscetJsonContract.Normalize(json);
    }

    private static string NormalizeComponentPath(string componentPath)
    {
        if (String.IsNullOrWhiteSpace(componentPath))
        {
            throw new AscetReadException("invalid_argument", "normalize_component_path", "Component path must not be empty.");
        }

        string normalized = componentPath.Trim().Replace('/', '\\');
        while (normalized.StartsWith("\\", StringComparison.Ordinal))
        {
            normalized = normalized.Substring(1);
        }

        if (String.IsNullOrWhiteSpace(normalized))
        {
            throw new AscetReadException("invalid_argument", "normalize_component_path", "Component path must contain a component name.");
        }

        return normalized;
    }

    private static string FormatException(Exception ex)
    {
        AscetReadException ascet = ex as AscetReadException;
        if (ascet != null)
        {
            return ascet.Code + " [" + ascet.Operation + "]: " + ascet.Message;
        }

        return ex.GetType().FullName + ": " + ex.Message;
    }
}
