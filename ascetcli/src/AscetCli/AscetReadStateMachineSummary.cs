using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
using System.Web.Script.Serialization;

public sealed class AscetReadStateMachineSummaryArguments
{
    public string StateMachinePath { get; set; }
    public bool EmitJson { get; set; }
}

public static class AscetReadStateMachineSummary
{
    public static int Main(string[] args)
    {
        TextWriter originalOut = Console.Out;
        StringWriter suppressedOut = null;

        try
        {
            AscetReadStateMachineSummaryArguments arguments = ParseArguments(args);
            if (arguments.EmitJson)
            {
                suppressedOut = new StringWriter();
                Console.SetOut(suppressedOut);
            }

            AscetToolApiBootstrap.ConfigureAssemblyResolution();
            StateMachineLocatorService locator = new StateMachineLocatorService();
            StateMachineSummaryService service = new StateMachineSummaryService();
            AscetStateMachineRef stateMachine = locator.GetStateMachine(arguments.StateMachinePath);
            AscetStateMachineSummary summary = service.GetSummary(stateMachine);
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

    public static AscetReadStateMachineSummaryArguments ParseArguments(string[] args)
    {
        if (args == null || args.Length < 1)
        {
            throw new AscetReadException("invalid_argument", "parse_arguments", "usage: AscetCli.exe exec read_state_machine_summary <state-machine-path> [--json]");
        }

        AscetReadStateMachineSummaryArguments result = new AscetReadStateMachineSummaryArguments
        {
            StateMachinePath = NormalizeStateMachinePath(args[0]),
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

    public static string NormalizeStateMachinePath(string stateMachinePath)
    {
        if (String.IsNullOrWhiteSpace(stateMachinePath))
        {
            throw new AscetReadException("invalid_argument", "normalize_state_machine_path", "StateMachine path must not be empty.");
        }

        string normalized = stateMachinePath.Trim().Replace('/', '\\');
        while (normalized.StartsWith("\\", StringComparison.Ordinal))
        {
            normalized = normalized.Substring(1);
        }

        if (String.IsNullOrWhiteSpace(normalized))
        {
            throw new AscetReadException("invalid_argument", "normalize_state_machine_path", "StateMachine path must contain a component name.");
        }

        return normalized;
    }

    public static string FormatTextOutput(AscetStateMachineSummary summary)
    {
        if (summary == null)
        {
            throw new AscetReadException("invalid_argument", "format_text_output", "StateMachine summary must not be null.");
        }

        AscetStateMachineRef stateMachine = summary.StateMachineRef ?? new AscetStateMachineRef();
        AscetStateMachineCapabilities capabilities = summary.Capabilities ?? new AscetStateMachineCapabilities();
        return "StateMachine: " + (stateMachine.Path ?? String.Empty) + " [" + stateMachine.LanguageKind.ToString() + "]" + Environment.NewLine
            + "PrimaryAnalysis: " + capabilities.PrimaryAnalysis.ToString() + Environment.NewLine
            + "StateCount: " + summary.StateCount.ToString() + Environment.NewLine
            + "TransitionCount: " + summary.TransitionCount.ToString() + Environment.NewLine
            + "MethodCount: " + summary.MethodCount.ToString() + Environment.NewLine
            + "DiagramCount: " + summary.DiagramCount.ToString() + Environment.NewLine
            + "SupportsMethodCode: " + capabilities.SupportsMethodCode.ToString() + Environment.NewLine
            + "SupportsSemanticSummary: " + capabilities.SupportsSemanticSummary.ToString() + Environment.NewLine
            + "SupportsFlowSummary: " + capabilities.SupportsFlowSummary.ToString() + Environment.NewLine
            + "SupportsImplementation: " + capabilities.SupportsImplementation.ToString() + Environment.NewLine
            + "SupportsReferenceGraph: " + capabilities.SupportsReferenceGraph.ToString() + Environment.NewLine
            + "SupportsMethodWrite: " + capabilities.SupportsMethodWrite.ToString() + Environment.NewLine
            + "SupportsBehaviorWrite: " + capabilities.SupportsBehaviorWrite.ToString() + Environment.NewLine
            + "SupportsStartStateWrite: " + capabilities.SupportsStartStateWrite.ToString() + Environment.NewLine
            + "Summary: " + (summary.SummaryText ?? String.Empty) + Environment.NewLine;
    }

    public static string FormatJsonOutput(AscetStateMachineSummary summary)
    {
        if (summary == null)
        {
            throw new AscetReadException("invalid_argument", "format_json_output", "StateMachine summary must not be null.");
        }

        JavaScriptSerializer serializer = new JavaScriptSerializer();
        return AscetJsonContract.Serialize(BuildSerializableSummary(summary));
    }

    private static IDictionary<string, object> BuildSerializableSummary(AscetStateMachineSummary summary)
    {
        Dictionary<string, object> result = new Dictionary<string, object>();
        result["StateMachineRef"] = BuildSerializableStateMachine(summary.StateMachineRef);
        result["Capabilities"] = BuildSerializableCapabilities(summary.Capabilities);
        result["StateCount"] = summary.StateCount;
        result["TransitionCount"] = summary.TransitionCount;
        result["MethodCount"] = summary.MethodCount;
        result["DiagramCount"] = summary.DiagramCount;
        result["SummaryText"] = summary.SummaryText ?? String.Empty;
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
