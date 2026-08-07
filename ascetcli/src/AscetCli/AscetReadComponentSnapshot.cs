using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
using System.Web.Script.Serialization;

public sealed class AscetReadComponentSnapshotArguments
{
    public string ComponentPath { get; set; }
    public int TraceDepth { get; set; }
    public bool EmitJson { get; set; }
}

public static class AscetReadComponentSnapshot
{
    public static int Main(string[] args)
    {
        TextWriter originalOut = Console.Out;
        StringWriter suppressedOut = null;

        try
        {
            AscetReadComponentSnapshotArguments arguments = ParseArguments(args);
            if (arguments.EmitJson)
            {
                suppressedOut = new StringWriter();
                Console.SetOut(suppressedOut);
            }

            AscetToolApiBootstrap.ConfigureAssemblyResolution();
            ComponentLocatorService locator = new ComponentLocatorService();
            ComponentSnapshotService service = new ComponentSnapshotService();
            AscetItemPath parsed = AscetItemPath.Parse(arguments.ComponentPath);
            AscetItemRef component = locator.FindItemInFolder(parsed.ItemName, parsed.FolderPath);
            AscetComponentSnapshot snapshot = service.GetSnapshot(component, arguments.TraceDepth);
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

    public static AscetReadComponentSnapshotArguments ParseArguments(string[] args)
    {
        if (args == null || args.Length < 1)
        {
            throw new AscetReadException("invalid_argument", "parse_arguments", "usage: AscetCli.exe exec read_component_snapshot <component-path> [--trace-depth <n>] [--json]");
        }

        AscetReadComponentSnapshotArguments result = new AscetReadComponentSnapshotArguments
        {
            ComponentPath = NormalizeComponentPath(args[0]),
            TraceDepth = 1,
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

            throw new AscetReadException("invalid_argument", "parse_arguments", "Unknown argument '" + argument + "'.");
        }

        return result;
    }

    public static string FormatTextOutput(AscetComponentSnapshot snapshot)
    {
        if (snapshot == null)
        {
            throw new AscetReadException("invalid_argument", "format_text_output", "Snapshot must not be null.");
        }

        AscetItemRef component = snapshot.Component ?? new AscetItemRef();
        StringBuilder builder = new StringBuilder();
        builder.Append("Component: ")
            .Append(component.Path ?? String.Empty)
            .Append(" [")
            .Append(component.Kind.ToString())
            .Append("/")
            .Append(component.LanguageKind.ToString())
            .Append("]")
            .AppendLine();
        builder.Append("Diagrams: ").Append(snapshot.Diagrams == null ? 0 : snapshot.Diagrams.Count).AppendLine();
        builder.Append("Methods: ").Append(snapshot.Methods == null ? 0 : snapshot.Methods.Count).AppendLine();
        builder.Append("Implementation: ").Append(snapshot.Implementation == null ? String.Empty : (snapshot.Implementation.ResolvedImplementationName ?? String.Empty)).AppendLine();
        builder.Append("References: ").Append(snapshot.References == null || snapshot.References.References == null ? 0 : snapshot.References.References.Count).AppendLine();
        builder.Append("ReferenceTrace: ").Append(AscetAdvancedAnalysisUtilities.CountReferenceTraceNodes(snapshot.ReferenceTrace)).AppendLine();
        builder.Append("StateMachineSummary: ").Append(snapshot.StateMachineSummary == null ? String.Empty : (snapshot.StateMachineSummary.SemanticSummary ?? String.Empty)).AppendLine();
        builder.Append("StateMachineFlow: ").Append(snapshot.StateMachineFlow == null ? String.Empty : (snapshot.StateMachineFlow.Summary ?? String.Empty)).AppendLine();
        builder.Append("Summary: ").Append(snapshot.Summary ?? String.Empty).AppendLine();
        return builder.ToString();
    }

    public static string FormatJsonOutput(AscetComponentSnapshot snapshot)
    {
        if (snapshot == null)
        {
            throw new AscetReadException("invalid_argument", "format_json_output", "Snapshot must not be null.");
        }

        JavaScriptSerializer serializer = new JavaScriptSerializer();
        return AscetJsonContract.Serialize(BuildSerializableSnapshot(snapshot));
    }

    private static IDictionary<string, object> BuildSerializableSnapshot(AscetComponentSnapshot snapshot)
    {
        Dictionary<string, object> result = new Dictionary<string, object>();
        AscetItemRef component = snapshot.Component;
        string componentKind = component == null ? String.Empty : component.Kind.ToString();
        result["componentPath"] = component == null ? String.Empty : (component.Path ?? String.Empty);
        result["kind"] = componentKind;
        result["componentKind"] = componentKind;
        result["languageKind"] = component == null ? String.Empty : component.LanguageKind.ToString();
        result["counts"] = BuildSerializableCounts(snapshot);
        result["Component"] = BuildSerializableItem(snapshot.Component);
        result["Diagrams"] = BuildSerializableDiagrams(snapshot.Diagrams);
        result["Methods"] = BuildSerializableMethods(snapshot.Methods);
        result["TextCode"] = BuildSerializableTextCode(snapshot.TextCode);
        result["Implementation"] = BuildSerializableImplementation(snapshot.Implementation);
        result["References"] = BuildSerializableReferences(snapshot.References);
        result["ReferenceTrace"] = BuildSerializableReferenceTrace(snapshot.ReferenceTrace);
        result["StateMachineSummary"] = BuildSerializableStateMachineSummary(snapshot.StateMachineSummary);
        result["StateMachineFlow"] = BuildSerializableStateMachineFlow(snapshot.StateMachineFlow);
        result["Summary"] = snapshot.Summary ?? String.Empty;
        return result;
    }

    private static IDictionary<string, object> BuildSerializableCounts(AscetComponentSnapshot snapshot)
    {
        Dictionary<string, object> result = new Dictionary<string, object>();
        result["diagrams"] = snapshot.Diagrams == null ? 0 : snapshot.Diagrams.Count;
        result["methods"] = snapshot.Methods == null ? 0 : snapshot.Methods.Count;
        int implementationElements = snapshot.Implementation == null || snapshot.Implementation.Elements == null
            ? 0
            : snapshot.Implementation.Elements.Count;
        result["elements"] = implementationElements;
        result["implementationElements"] = implementationElements;
        result["references"] = snapshot.References == null || snapshot.References.References == null ? 0 : snapshot.References.References.Count;
        return result;
    }

    private static IDictionary<string, object> BuildSerializableItem(AscetItemRef item)
    {
        Dictionary<string, object> result = new Dictionary<string, object>();
        result["Name"] = item == null ? String.Empty : (item.Name ?? String.Empty);
        result["Path"] = item == null ? String.Empty : (item.Path ?? String.Empty);
        result["Kind"] = item == null ? String.Empty : item.Kind.ToString();
        result["LanguageKind"] = item == null ? String.Empty : item.LanguageKind.ToString();
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

    private static IDictionary<string, object> BuildSerializableTextCode(AscetTextCode textCode)
    {
        Dictionary<string, object> result = new Dictionary<string, object>();
        result["ComponentPath"] = textCode == null ? String.Empty : (textCode.ComponentPath ?? String.Empty);
        result["ComponentKind"] = textCode == null ? String.Empty : textCode.ComponentKind.ToString();
        result["LanguageKind"] = textCode == null ? String.Empty : textCode.LanguageKind.ToString();
        result["HeaderCode"] = textCode == null ? String.Empty : (textCode.HeaderCode ?? String.Empty);
        result["ExternalCCode"] = textCode == null ? String.Empty : (textCode.ExternalCCode ?? String.Empty);
        return result;
    }

    private static IDictionary<string, object> BuildSerializableImplementation(AscetImplementationSnapshot implementation)
    {
        if (implementation == null)
        {
            return null;
        }

        JavaScriptSerializer serializer = new JavaScriptSerializer();
        return AscetJsonContract.DeserializeObject(AscetReadImplementation.FormatJsonOutput(implementation));
    }

    private static IDictionary<string, object> BuildSerializableReferences(AscetReferenceGraphSummary references)
    {
        if (references == null)
        {
            return null;
        }

        JavaScriptSerializer serializer = new JavaScriptSerializer();
        return AscetJsonContract.DeserializeObject(AscetReadReferences.FormatJsonOutput(references));
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

    private static IDictionary<string, object> BuildSerializableStateMachineSummary(AscetStateMachineSemanticSummary summary)
    {
        if (summary == null)
        {
            return null;
        }

        JavaScriptSerializer serializer = new JavaScriptSerializer();
        return AscetJsonContract.DeserializeObject(AscetReadStateMachine.FormatJsonOutput(summary));
    }

    private static IDictionary<string, object> BuildSerializableStateMachineFlow(AscetStateMachineFlowSummary summary)
    {
        if (summary == null)
        {
            return null;
        }

        JavaScriptSerializer serializer = new JavaScriptSerializer();
        return AscetJsonContract.DeserializeObject(AscetReadStateMachineFlow.FormatJsonOutput(summary));
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
