using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
using System.Web.Script.Serialization;

public sealed class AscetReadStateMachineArguments
{
    public string ComponentPath { get; set; }
    public bool EmitJson { get; set; }
}

public static class AscetReadStateMachine
{
    public static int Main(string[] args)
    {
        TextWriter originalOut = Console.Out;
        StringWriter suppressedOut = null;

        try
        {
            AscetReadStateMachineArguments arguments = ParseArguments(args);
            if (arguments.EmitJson)
            {
                suppressedOut = new StringWriter();
                Console.SetOut(suppressedOut);
            }

            AscetToolApiBootstrap.ConfigureAssemblyResolution();

            ComponentLocatorService locator = new ComponentLocatorService();
            StateMachineAnalysisService service = new StateMachineAnalysisService();

            AscetItemPath parsed = AscetItemPath.Parse(arguments.ComponentPath);
            AscetItemRef component = locator.FindItemInFolder(parsed.ItemName, parsed.FolderPath);
            AscetStateMachineSemanticSummary summary = service.GetSemanticSummary(component);
            string output = arguments.EmitJson ? FormatJsonOutput(summary) : FormatTextOutput(summary);

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

    public static AscetReadStateMachineArguments ParseArguments(string[] args)
    {
        if (args == null || args.Length < 1)
        {
            throw new AscetReadException(
                "invalid_argument",
                "parse_arguments",
                "usage: AscetCli.exe exec read_state_machine <component-path> [--json]");
        }

        AscetReadStateMachineArguments result = new AscetReadStateMachineArguments
        {
            ComponentPath = NormalizeComponentPath(args[0]),
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

            throw new AscetReadException("invalid_argument", "parse_arguments", "Unknown argument '" + argument + "'.");
        }

        return result;
    }

    public static string NormalizeComponentPath(string componentPath)
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

    public static string FormatTextOutput(AscetStateMachineSemanticSummary summary)
    {
        if (summary == null)
        {
            throw new AscetReadException("invalid_argument", "format_text_output", "State-machine summary must not be null.");
        }

        StringBuilder builder = new StringBuilder();
        builder.Append("Component: ").Append(summary.ComponentPath ?? String.Empty).AppendLine();
        builder.Append("Diagram: ").Append(summary.DiagramName ?? String.Empty).AppendLine();

        IList<AscetStateSemanticRef> states = summary.States ?? new List<AscetStateSemanticRef>();
        builder.Append("States: ").Append(states.Count).AppendLine();
        for (int i = 0; i < states.Count; i++)
        {
            AscetStateSemanticRef state = states[i];
            if (state == null)
            {
                continue;
            }

            builder.Append("  State: ")
                .Append(state.Name ?? String.Empty)
                .Append(" [")
                .Append(state.Kind.ToString())
                .Append("] Start=")
                .Append(state.IsStartState)
                .AppendLine();

            AppendBindings(builder, state.Bindings);
        }

        IList<AscetTransitionSemanticRef> transitions = summary.Transitions ?? new List<AscetTransitionSemanticRef>();
        builder.Append("Transitions: ").Append(transitions.Count).AppendLine();
        for (int i = 0; i < transitions.Count; i++)
        {
            AscetTransitionSemanticRef transition = transitions[i];
            if (transition == null)
            {
                continue;
            }

            builder.Append("  Transition: ")
                .Append(transition.Name ?? String.Empty)
                .Append(" Source=")
                .Append(transition.SourceName ?? String.Empty)
                .Append(" Target=")
                .Append(transition.TargetName ?? String.Empty)
                .Append(" Priority=")
                .Append(transition.Priority)
                .AppendLine();

            AppendBindings(builder, transition.Bindings);
        }

        IList<AscetMethodCode> methods = summary.Methods ?? new List<AscetMethodCode>();
        builder.Append("Methods: ").Append(methods.Count).AppendLine();
        for (int i = 0; i < methods.Count; i++)
        {
            AscetMethodCode method = methods[i];
            if (method == null)
            {
                continue;
            }

            builder.Append("  Method: ")
                .Append(method.MethodName ?? String.Empty)
                .Append(" [")
                .Append(method.MethodKind.ToString())
                .Append("]")
                .AppendLine();
            AppendCodeBlock(builder, method.Code, 4);
        }

        builder.Append("SemanticSummary:").AppendLine();
        AppendCodeBlock(builder, summary.SemanticSummary, 2);
        return builder.ToString();
    }

    public static string FormatJsonOutput(AscetStateMachineSemanticSummary summary)
    {
        if (summary == null)
        {
            throw new AscetReadException("invalid_argument", "format_json_output", "State-machine summary must not be null.");
        }

        JavaScriptSerializer serializer = new JavaScriptSerializer();
        return AscetJsonContract.Serialize(BuildSerializableSummary(summary));
    }

    private static void AppendBindings(StringBuilder builder, IList<AscetStateMachineMethodBindingRef> bindings)
    {
        if (builder == null || bindings == null)
        {
            return;
        }

        for (int i = 0; i < bindings.Count; i++)
        {
            AscetStateMachineMethodBindingRef binding = bindings[i];
            if (binding == null)
            {
                continue;
            }

            builder.Append("    Binding[")
                .Append(binding.Role ?? String.Empty)
                .Append("]: Source=")
                .Append(binding.SourceType ?? String.Empty)
                .Append(" Name=")
                .Append(binding.MethodName ?? String.Empty)
                .Append(" Kind=")
                .Append(binding.MethodKind.ToString())
                .AppendLine();
            AppendCodeBlock(builder, binding.Code, 6);
        }
    }

    private static void AppendCodeBlock(StringBuilder builder, string code, int spaces)
    {
        if (builder == null)
        {
            return;
        }

        string indent = new string(' ', spaces);
        builder.Append(indent).Append("Code:").AppendLine();
        string value = code ?? String.Empty;
        string[] lines = value.Replace("\r\n", "\n").Replace('\r', '\n').Split('\n');
        if (lines.Length == 0)
        {
            builder.Append(indent).Append("  ").AppendLine();
            return;
        }

        for (int i = 0; i < lines.Length; i++)
        {
            builder.Append(indent).Append("  ").Append(lines[i] ?? String.Empty).AppendLine();
        }
    }

    private static IDictionary<string, object> BuildSerializableSummary(AscetStateMachineSemanticSummary summary)
    {
        Dictionary<string, object> result = new Dictionary<string, object>();
        result["ComponentPath"] = summary.ComponentPath ?? String.Empty;
        result["DiagramName"] = summary.DiagramName ?? String.Empty;
        result["States"] = BuildSerializableStates(summary.States);
        result["Transitions"] = BuildSerializableTransitions(summary.Transitions);
        result["Methods"] = BuildSerializableMethods(summary.Methods);
        result["SemanticSummary"] = summary.SemanticSummary ?? String.Empty;
        return result;
    }

    private static IList<IDictionary<string, object>> BuildSerializableStates(IList<AscetStateSemanticRef> states)
    {
        List<IDictionary<string, object>> result = new List<IDictionary<string, object>>();
        if (states == null)
        {
            return result;
        }

        for (int i = 0; i < states.Count; i++)
        {
            AscetStateSemanticRef state = states[i];
            Dictionary<string, object> entry = new Dictionary<string, object>();
            entry["Name"] = state == null ? String.Empty : (state.Name ?? String.Empty);
            entry["Kind"] = state == null ? String.Empty : state.Kind.ToString();
            entry["IsStartState"] = state != null && state.IsStartState;
            entry["Bindings"] = BuildSerializableBindings(state == null ? null : state.Bindings);
            result.Add(entry);
        }

        return result;
    }

    private static IList<IDictionary<string, object>> BuildSerializableTransitions(IList<AscetTransitionSemanticRef> transitions)
    {
        List<IDictionary<string, object>> result = new List<IDictionary<string, object>>();
        if (transitions == null)
        {
            return result;
        }

        for (int i = 0; i < transitions.Count; i++)
        {
            AscetTransitionSemanticRef transition = transitions[i];
            Dictionary<string, object> entry = new Dictionary<string, object>();
            entry["Name"] = transition == null ? String.Empty : (transition.Name ?? String.Empty);
            entry["SourceName"] = transition == null ? String.Empty : (transition.SourceName ?? String.Empty);
            entry["TargetName"] = transition == null ? String.Empty : (transition.TargetName ?? String.Empty);
            entry["Priority"] = transition == null ? 0 : transition.Priority;
            entry["Bindings"] = BuildSerializableBindings(transition == null ? null : transition.Bindings);
            result.Add(entry);
        }

        return result;
    }

    private static IList<IDictionary<string, object>> BuildSerializableBindings(IList<AscetStateMachineMethodBindingRef> bindings)
    {
        List<IDictionary<string, object>> result = new List<IDictionary<string, object>>();
        if (bindings == null)
        {
            return result;
        }

        for (int i = 0; i < bindings.Count; i++)
        {
            AscetStateMachineMethodBindingRef binding = bindings[i];
            Dictionary<string, object> entry = new Dictionary<string, object>();
            entry["Role"] = binding == null ? String.Empty : (binding.Role ?? String.Empty);
            entry["SourceType"] = binding == null ? String.Empty : (binding.SourceType ?? String.Empty);
            entry["MethodName"] = binding == null ? String.Empty : (binding.MethodName ?? String.Empty);
            entry["MethodKind"] = binding == null ? String.Empty : binding.MethodKind.ToString();
            entry["Code"] = binding == null ? String.Empty : (binding.Code ?? String.Empty);
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
