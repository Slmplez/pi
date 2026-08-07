using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
using System.Web.Script.Serialization;

public sealed class AscetReadStateMachineSnapshotArguments
{
    public string StateMachinePath { get; set; }
    public bool EmitJson { get; set; }
}

public static class AscetReadStateMachineSnapshot
{
    public static int Main(string[] args)
    {
        TextWriter originalOut = Console.Out;
        StringWriter suppressedOut = null;

        try
        {
            AscetReadStateMachineSnapshotArguments arguments = ParseArguments(args);
            if (arguments.EmitJson)
            {
                suppressedOut = new StringWriter();
                Console.SetOut(suppressedOut);
            }

            AscetToolApiBootstrap.ConfigureAssemblyResolution();
            StateMachineLocatorService locator = new StateMachineLocatorService();
            StateMachineSnapshotService service = new StateMachineSnapshotService();
            AscetStateMachineRef stateMachine = locator.GetStateMachine(arguments.StateMachinePath);
            AscetStateMachineSnapshot snapshot = service.GetSnapshot(stateMachine);
            string output = arguments.EmitJson ? FormatJsonOutput(snapshot) : FormatTextOutput(snapshot);

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

    public static AscetReadStateMachineSnapshotArguments ParseArguments(string[] args)
    {
        if (args == null || args.Length < 1)
        {
            throw new AscetReadException("invalid_argument", "parse_arguments", "usage: AscetCli.exe exec read_state_machine_snapshot <state-machine-path> [--json]");
        }

        AscetReadStateMachineSnapshotArguments result = new AscetReadStateMachineSnapshotArguments
        {
            StateMachinePath = AscetReadStateMachineSummary.NormalizeStateMachinePath(args[0]),
            EmitJson = false
        };

        for (int i = 1; i < args.Length; i++)
        {
            if (String.Equals(args[i], "--json", StringComparison.OrdinalIgnoreCase))
            {
                result.EmitJson = true;
                continue;
            }

            throw new AscetReadException("invalid_argument", "parse_arguments", "Unknown argument '" + args[i] + "'.");
        }

        return result;
    }

    public static string FormatTextOutput(AscetStateMachineSnapshot snapshot)
    {
        if (snapshot == null)
        {
            throw new AscetReadException("invalid_argument", "format_text_output", "StateMachine snapshot must not be null.");
        }

        AscetStateMachineRef stateMachine = snapshot.StateMachineRef ?? new AscetStateMachineRef();
        AscetStateMachineCapabilities capabilities = snapshot.Capabilities ?? new AscetStateMachineCapabilities();
        StringBuilder builder = new StringBuilder();
        builder.Append("StateMachine: ").Append(stateMachine.Path ?? String.Empty).Append(" [").Append(stateMachine.LanguageKind.ToString()).Append("]").AppendLine();
        builder.Append("PrimaryAnalysis: ").Append(capabilities.PrimaryAnalysis.ToString()).AppendLine();
        builder.Append("States: ").Append(snapshot.States == null ? 0 : snapshot.States.Count).AppendLine();
        builder.Append("Transitions: ").Append(snapshot.Transitions == null ? 0 : snapshot.Transitions.Count).AppendLine();
        builder.Append("Methods: ").Append(snapshot.Methods == null ? 0 : snapshot.Methods.Count).AppendLine();
        builder.Append("Diagrams: ").Append(snapshot.Diagrams == null ? 0 : snapshot.Diagrams.Count).AppendLine();
        builder.Append("SemanticSummary: ").Append(snapshot.SemanticSummary == null ? String.Empty : (snapshot.SemanticSummary.SemanticSummary ?? String.Empty)).AppendLine();
        builder.Append("FlowSummary: ").Append(snapshot.FlowSummary == null ? String.Empty : (snapshot.FlowSummary.Summary ?? String.Empty)).AppendLine();
        builder.Append("Implementation: ").Append(snapshot.Implementation == null ? String.Empty : (snapshot.Implementation.ResolvedImplementationName ?? String.Empty)).AppendLine();
        builder.Append("References: ").Append(snapshot.References == null || snapshot.References.References == null ? 0 : snapshot.References.References.Count).AppendLine();
        builder.Append("Summary: ").Append(snapshot.SummaryText ?? String.Empty).AppendLine();
        return builder.ToString();
    }

    public static string FormatJsonOutput(AscetStateMachineSnapshot snapshot)
    {
        if (snapshot == null)
        {
            throw new AscetReadException("invalid_argument", "format_json_output", "StateMachine snapshot must not be null.");
        }

        JavaScriptSerializer serializer = new JavaScriptSerializer();
        return AscetJsonContract.Serialize(BuildSerializableSnapshot(snapshot));
    }

    private static IDictionary<string, object> BuildSerializableSnapshot(AscetStateMachineSnapshot snapshot)
    {
        Dictionary<string, object> result = new Dictionary<string, object>();
        result["StateMachineRef"] = BuildSerializableStateMachine(snapshot.StateMachineRef);
        result["Summary"] = snapshot.Summary == null ? null : DeserializeJsonObject(AscetReadStateMachineSummary.FormatJsonOutput(snapshot.Summary));
        result["Capabilities"] = BuildSerializableCapabilities(snapshot.Capabilities);
        result["States"] = BuildSerializableStates(snapshot.States);
        result["Transitions"] = BuildSerializableTransitions(snapshot.Transitions);
        result["Methods"] = BuildSerializableMethods(snapshot.Methods);
        result["Diagrams"] = BuildSerializableDiagrams(snapshot.Diagrams);
        result["SemanticSummary"] = snapshot.SemanticSummary == null ? null : DeserializeJsonObject(AscetReadStateMachine.FormatJsonOutput(snapshot.SemanticSummary));
        result["FlowSummary"] = snapshot.FlowSummary == null ? null : DeserializeJsonObject(AscetReadStateMachineFlow.FormatJsonOutput(snapshot.FlowSummary));
        result["Implementation"] = snapshot.Implementation == null ? null : DeserializeJsonObject(AscetReadImplementation.FormatJsonOutput(snapshot.Implementation));
        result["References"] = snapshot.References == null ? null : DeserializeJsonObject(AscetReadReferences.FormatJsonOutput(snapshot.References));
        result["SummaryText"] = snapshot.SummaryText ?? String.Empty;
        return result;
    }

    private static IDictionary<string, object> BuildSerializableStateMachine(AscetStateMachineRef stateMachine)
    {
        Dictionary<string, object> result = new Dictionary<string, object>();
        result["Name"] = stateMachine == null ? String.Empty : (stateMachine.Name ?? String.Empty);
        result["Path"] = stateMachine == null ? String.Empty : (stateMachine.Path ?? String.Empty);
        result["LanguageKind"] = stateMachine == null ? AscetLanguageKind.Unknown.ToString() : stateMachine.LanguageKind.ToString();
        return result;
    }

    private static IDictionary<string, object> BuildSerializableCapabilities(AscetStateMachineCapabilities capabilities)
    {
        Dictionary<string, object> result = new Dictionary<string, object>();
        result["PrimaryAnalysis"] = capabilities == null ? AscetStateMachinePrimaryAnalysisKind.Unknown.ToString() : capabilities.PrimaryAnalysis.ToString();
        result["SupportsMethodCode"] = capabilities != null && capabilities.SupportsMethodCode;
        result["SupportsSemanticSummary"] = capabilities != null && capabilities.SupportsSemanticSummary;
        result["SupportsFlowSummary"] = capabilities != null && capabilities.SupportsFlowSummary;
        result["SupportsImplementation"] = capabilities != null && capabilities.SupportsImplementation;
        result["SupportsReferenceGraph"] = capabilities != null && capabilities.SupportsReferenceGraph;
        result["SupportsMethodWrite"] = capabilities != null && capabilities.SupportsMethodWrite;
        result["SupportsBehaviorWrite"] = capabilities != null && capabilities.SupportsBehaviorWrite;
        result["SupportsStartStateWrite"] = capabilities != null && capabilities.SupportsStartStateWrite;
        return result;
    }

    private static IList<IDictionary<string, object>> BuildSerializableStates(IList<AscetStateRef> states)
    {
        List<IDictionary<string, object>> result = new List<IDictionary<string, object>>();
        if (states == null)
        {
            return result;
        }

        for (int i = 0; i < states.Count; i++)
        {
            AscetStateRef state = states[i];
            Dictionary<string, object> entry = new Dictionary<string, object>();
            entry["Name"] = state == null ? String.Empty : (state.Name ?? String.Empty);
            entry["Kind"] = state == null ? AscetStateKind.Unknown.ToString() : state.Kind.ToString();
            result.Add(entry);
        }

        return result;
    }

    private static IList<IDictionary<string, object>> BuildSerializableTransitions(IList<AscetTransitionRef> transitions)
    {
        List<IDictionary<string, object>> result = new List<IDictionary<string, object>>();
        if (transitions == null)
        {
            return result;
        }

        for (int i = 0; i < transitions.Count; i++)
        {
            AscetTransitionRef transition = transitions[i];
            Dictionary<string, object> entry = new Dictionary<string, object>();
            entry["Name"] = transition == null ? String.Empty : (transition.Name ?? String.Empty);
            entry["SourceName"] = transition == null ? String.Empty : (transition.SourceName ?? String.Empty);
            entry["TargetName"] = transition == null ? String.Empty : (transition.TargetName ?? String.Empty);
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

    private static IDictionary<string, object> DeserializeJsonObject(string json)
    {
        JavaScriptSerializer serializer = new JavaScriptSerializer();
        return AscetJsonContract.DeserializeObject(json);
    }

    private static string NormalizeJsonOutput(string json)
    {
        return AscetJsonContract.Normalize(json);
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
