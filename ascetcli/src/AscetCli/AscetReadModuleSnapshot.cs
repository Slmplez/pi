using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
using System.Web.Script.Serialization;

public sealed class AscetReadModuleSnapshotArguments
{
    public string ModulePath { get; set; }
    public bool EmitJson { get; set; }
}

public static class AscetReadModuleSnapshot
{
    public static int Main(string[] args)
    {
        TextWriter originalOut = Console.Out;
        StringWriter suppressedOut = null;

        try
        {
            AscetReadModuleSnapshotArguments arguments = ParseArguments(args);
            if (arguments.EmitJson)
            {
                suppressedOut = new StringWriter();
                Console.SetOut(suppressedOut);
            }

            AscetToolApiBootstrap.ConfigureAssemblyResolution();
            ModuleLocatorService locator = new ModuleLocatorService();
            ModuleSnapshotService service = new ModuleSnapshotService();
            AscetModuleRef module = locator.GetModule(arguments.ModulePath);
            AscetModuleSnapshot snapshot = service.GetSnapshot(module);
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

    public static AscetReadModuleSnapshotArguments ParseArguments(string[] args)
    {
        if (args == null || args.Length < 1)
        {
            throw new AscetReadException("invalid_argument", "parse_arguments", "usage: AscetCli.exe exec read_module_snapshot <module-path> [--json]");
        }

        AscetReadModuleSnapshotArguments result = new AscetReadModuleSnapshotArguments
        {
            ModulePath = NormalizeModulePath(args[0]),
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

    public static string NormalizeModulePath(string modulePath)
    {
        return AscetReadModuleSummary.NormalizeModulePath(modulePath);
    }

    public static string FormatTextOutput(AscetModuleSnapshot snapshot)
    {
        if (snapshot == null)
        {
            throw new AscetReadException("invalid_argument", "format_text_output", "Module snapshot must not be null.");
        }

        AscetModuleRef module = snapshot.ModuleRef ?? new AscetModuleRef();
        AscetModuleCapabilities capabilities = snapshot.Capabilities ?? new AscetModuleCapabilities();
        StringBuilder builder = new StringBuilder();
        builder.Append("Module: ").Append(module.Path ?? String.Empty).Append(" [").Append(module.LanguageKind.ToString()).Append("]").AppendLine();
        builder.Append("PrimaryAnalysis: ").Append(capabilities.PrimaryAnalysis.ToString()).AppendLine();
        builder.Append("Elements: ").Append(snapshot.Elements == null ? 0 : snapshot.Elements.Count).AppendLine();
        builder.Append("Methods: ").Append(snapshot.Methods == null ? 0 : snapshot.Methods.Count).AppendLine();
        builder.Append("MethodAnalyses: ").Append(snapshot.MethodAnalyses == null ? 0 : snapshot.MethodAnalyses.Count).AppendLine();
        builder.Append("Diagrams: ").Append(snapshot.Diagrams == null ? 0 : snapshot.Diagrams.Count).AppendLine();
        builder.Append("PrimaryBlockGraph: ");
        if (snapshot.PrimaryBlockGraph != null)
        {
            builder.Append(snapshot.PrimaryBlockGraph.DiagramName ?? String.Empty)
                .Append(" Connections=")
                .Append(snapshot.PrimaryBlockGraph.Connections == null ? 0 : snapshot.PrimaryBlockGraph.Connections.Count);
        }
        builder.AppendLine();
        builder.Append("Implementation: ").Append(snapshot.Implementation == null ? String.Empty : (snapshot.Implementation.ResolvedImplementationName ?? String.Empty)).AppendLine();
        builder.Append("References: ").Append(snapshot.References == null || snapshot.References.References == null ? 0 : snapshot.References.References.Count).AppendLine();
        builder.Append("Summary: ").Append(snapshot.SummaryText ?? String.Empty).AppendLine();
        return builder.ToString();
    }

    public static string FormatJsonOutput(AscetModuleSnapshot snapshot)
    {
        if (snapshot == null)
        {
            throw new AscetReadException("invalid_argument", "format_json_output", "Module snapshot must not be null.");
        }

        JavaScriptSerializer serializer = new JavaScriptSerializer();
        return AscetJsonContract.Serialize(BuildSerializableSnapshot(snapshot));
    }

    private static IDictionary<string, object> BuildSerializableSnapshot(AscetModuleSnapshot snapshot)
    {
        Dictionary<string, object> result = new Dictionary<string, object>();
        result["ModuleRef"] = BuildSerializableModule(snapshot.ModuleRef);
        result["Summary"] = BuildSerializableSummary(snapshot.Summary);
        result["Capabilities"] = BuildSerializableCapabilities(snapshot.Capabilities);
        result["Elements"] = BuildSerializableElements(snapshot.Elements);
        result["Methods"] = BuildSerializableMethods(snapshot.Methods);
        result["MethodAnalyses"] = BuildSerializableMethodAnalyses(snapshot.MethodAnalyses);
        result["TextCode"] = BuildSerializableTextCode(snapshot.TextCode);
        result["Diagrams"] = BuildSerializableDiagrams(snapshot.Diagrams);
        result["PrimaryBlockGraph"] = BuildSerializableBlockGraph(snapshot.PrimaryBlockGraph);
        result["Implementation"] = BuildSerializableImplementation(snapshot.Implementation);
        result["References"] = BuildSerializableReferences(snapshot.References);
        result["SummaryText"] = snapshot.SummaryText ?? String.Empty;
        return result;
    }

    private static IDictionary<string, object> BuildSerializableModule(AscetModuleRef module)
    {
        Dictionary<string, object> result = new Dictionary<string, object>();
        result["Name"] = module == null ? String.Empty : (module.Name ?? String.Empty);
        result["Path"] = module == null ? String.Empty : (module.Path ?? String.Empty);
        result["LanguageKind"] = module == null ? AscetLanguageKind.Unknown.ToString() : module.LanguageKind.ToString();
        return result;
    }

    private static IDictionary<string, object> BuildSerializableSummary(AscetModuleSummary summary)
    {
        if (summary == null)
        {
            return null;
        }

        Dictionary<string, object> result = new Dictionary<string, object>();
        result["ModuleRef"] = BuildSerializableModule(summary.ModuleRef);
        result["Capabilities"] = BuildSerializableCapabilities(summary.Capabilities);
        result["ElementCount"] = summary.ElementCount;
        result["MethodCount"] = summary.MethodCount;
        result["DiagramCount"] = summary.DiagramCount;
        result["SummaryText"] = summary.SummaryText ?? String.Empty;
        return result;
    }

    private static IDictionary<string, object> BuildSerializableCapabilities(AscetModuleCapabilities capabilities)
    {
        Dictionary<string, object> result = new Dictionary<string, object>();
        result["PrimaryAnalysis"] = capabilities == null ? AscetModulePrimaryAnalysisKind.Unknown.ToString() : capabilities.PrimaryAnalysis.ToString();
        result["SupportsMethodCode"] = capabilities != null && capabilities.SupportsMethodCode;
        result["SupportsBlockDiagram"] = capabilities != null && capabilities.SupportsBlockDiagram;
        result["SupportsTextCode"] = capabilities != null && capabilities.SupportsTextCode;
        result["SupportsImplementation"] = capabilities != null && capabilities.SupportsImplementation;
        result["SupportsReferenceGraph"] = capabilities != null && capabilities.SupportsReferenceGraph;
        result["SupportsMethodWrite"] = capabilities != null && capabilities.SupportsMethodWrite;
        return result;
    }

    private static IList<IDictionary<string, object>> BuildSerializableElements(IList<AscetModuleElementRef> elements)
    {
        List<IDictionary<string, object>> result = new List<IDictionary<string, object>>();
        if (elements == null)
        {
            return result;
        }

        for (int i = 0; i < elements.Count; i++)
        {
            AscetModuleElementRef element = elements[i];
            Dictionary<string, object> entry = new Dictionary<string, object>();
            entry["ElementName"] = element == null ? String.Empty : (element.ElementName ?? String.Empty);
            entry["ElementKind"] = element == null ? String.Empty : (element.ElementKind ?? String.Empty);
            entry["DisplayType"] = element == null ? String.Empty : (element.DisplayType ?? String.Empty);
            entry["DisplayScope"] = element == null ? String.Empty : (element.DisplayScope ?? String.Empty);
            entry["DisplayKind"] = element == null ? String.Empty : (element.DisplayKind ?? String.Empty);
            entry["IsPrimitive"] = element != null && element.IsPrimitive;
            entry["ReferencedComponentPath"] = element == null ? String.Empty : (element.ReferencedComponentPath ?? String.Empty);
            entry["HasImplementationView"] = element != null && element.HasImplementationView;
            entry["IsReferencedModelElement"] = element != null && element.IsReferencedModelElement;
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

    private static IList<IDictionary<string, object>> BuildSerializableMethodAnalyses(IList<AscetModuleMethodAnalysisRef> analyses)
    {
        List<IDictionary<string, object>> result = new List<IDictionary<string, object>>();
        if (analyses == null)
        {
            return result;
        }

        for (int i = 0; i < analyses.Count; i++)
        {
            AscetModuleMethodAnalysisRef analysis = analyses[i];
            Dictionary<string, object> entry = new Dictionary<string, object>();
            entry["Method"] = BuildSerializableMethod(analysis == null ? null : analysis.Method);
            entry["CodeAnalysis"] = BuildSerializableCodeAnalysis(analysis == null ? null : analysis.CodeAnalysis);
            result.Add(entry);
        }

        return result;
    }

    private static IDictionary<string, object> BuildSerializableMethod(AscetMethodCode method)
    {
        Dictionary<string, object> entry = new Dictionary<string, object>();
        entry["ComponentPath"] = method == null ? String.Empty : (method.ComponentPath ?? String.Empty);
        entry["ComponentKind"] = method == null ? String.Empty : method.ComponentKind.ToString();
        entry["LanguageKind"] = method == null ? String.Empty : method.LanguageKind.ToString();
        entry["MethodName"] = method == null ? String.Empty : (method.MethodName ?? String.Empty);
        entry["MethodKind"] = method == null ? String.Empty : method.MethodKind.ToString();
        entry["Code"] = method == null ? String.Empty : (method.Code ?? String.Empty);
        return entry;
    }

    private static IDictionary<string, object> BuildSerializableCodeAnalysis(AscetCodeAnalysisRef analysis)
    {
        Dictionary<string, object> entry = new Dictionary<string, object>();
        entry["ParseSucceeded"] = analysis != null && analysis.ParseSucceeded;
        entry["Reads"] = analysis == null ? new List<string>() : (analysis.Reads ?? new List<string>());
        entry["Writes"] = analysis == null ? new List<string>() : (analysis.Writes ?? new List<string>());
        entry["Calls"] = analysis == null ? new List<string>() : (analysis.Calls ?? new List<string>());
        entry["ReferencedComponents"] = analysis == null ? new List<string>() : (analysis.ReferencedComponents ?? new List<string>());
        entry["Diagnostics"] = analysis == null ? new List<string>() : (analysis.Diagnostics ?? new List<string>());
        return entry;
    }

    private static IDictionary<string, object> BuildSerializableTextCode(AscetTextCode textCode)
    {
        if (textCode == null)
        {
            return null;
        }

        Dictionary<string, object> result = new Dictionary<string, object>();
        result["ComponentPath"] = textCode.ComponentPath ?? String.Empty;
        result["ComponentKind"] = textCode.ComponentKind.ToString();
        result["LanguageKind"] = textCode.LanguageKind.ToString();
        result["HeaderCode"] = textCode.HeaderCode ?? String.Empty;
        result["ExternalCCode"] = textCode.ExternalCCode ?? String.Empty;
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

    private static IDictionary<string, object> BuildSerializableBlockGraph(AscetBlockDiagramGraph graph)
    {
        if (graph == null)
        {
            return null;
        }

        JavaScriptSerializer serializer = new JavaScriptSerializer();
        return AscetJsonContract.DeserializeObject(AscetReadBlockDiagram.FormatJsonOutput(graph));
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
