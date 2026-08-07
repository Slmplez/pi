using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
using System.Web.Script.Serialization;

public sealed class AscetReadReferencesArguments
{
    public string ComponentPath { get; set; }
    public bool EmitJson { get; set; }
}

public static class AscetReadReferences
{
    public static int Main(string[] args)
    {
        TextWriter originalOut = Console.Out;
        StringWriter suppressedOut = null;

        try
        {
            AscetReadReferencesArguments arguments = ParseArguments(args);
            if (arguments.EmitJson)
            {
                suppressedOut = new StringWriter();
                Console.SetOut(suppressedOut);
            }

            AscetToolApiBootstrap.ConfigureAssemblyResolution();

            ComponentLocatorService locator = new ComponentLocatorService();
            ReferenceReadService service = new ReferenceReadService();

            AscetItemPath parsed = AscetItemPath.Parse(arguments.ComponentPath);
            AscetItemRef component = locator.FindItemInFolder(parsed.ItemName, parsed.FolderPath);
            AscetReferenceGraphSummary summary = service.GetReferenceGraph(component);
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

    public static AscetReadReferencesArguments ParseArguments(string[] args)
    {
        if (args == null || args.Length < 1)
        {
            throw new AscetReadException(
                "invalid_argument",
                "parse_arguments",
                "usage: AscetCli.exe exec read_references <component-path> [--json]");
        }

        AscetReadReferencesArguments result = new AscetReadReferencesArguments
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

    public static string FormatTextOutput(AscetReferenceGraphSummary summary)
    {
        if (summary == null)
        {
            throw new AscetReadException("invalid_argument", "format_text_output", "Reference summary must not be null.");
        }

        StringBuilder builder = new StringBuilder();
        builder.Append("Component: ").Append(summary.ComponentPath ?? String.Empty).AppendLine();
        builder.Append("Kind: ").Append(summary.ComponentKind.ToString()).AppendLine();
        builder.Append("Language: ").Append(summary.LanguageKind.ToString()).AppendLine();

        IList<AscetReferenceEdgeRef> references = summary.References ?? new List<AscetReferenceEdgeRef>();
        builder.Append("References: ").Append(references.Count).AppendLine();
        for (int i = 0; i < references.Count; i++)
        {
            AscetReferenceEdgeRef edge = references[i];
            if (edge == null)
            {
                continue;
            }

            builder.Append("  Reference: ")
                .Append(edge.SourceElementName ?? String.Empty)
                .Append(" [")
                .Append(edge.SourceElementKind ?? String.Empty)
                .Append("] Scope=")
                .Append(edge.SourceDisplayScope ?? String.Empty)
                .Append(" Kind=")
                .Append(edge.SourceDisplayKind ?? String.Empty)
                .Append(" Resolved=")
                .Append(edge.IsResolved)
                .AppendLine();

            builder.Append("    Target: ");
            if (edge.IsResolved)
            {
                builder.Append(edge.TargetComponentPath ?? String.Empty)
                    .Append(" [")
                    .Append(edge.TargetComponentKind.ToString())
                    .Append("/")
                    .Append(edge.TargetLanguageKind.ToString())
                    .Append("]")
                    .AppendLine();
            }
            else
            {
                builder.Append("<unresolved>").AppendLine();
            }
        }

        IList<AscetItemRef> targets = summary.TargetComponents ?? new List<AscetItemRef>();
        builder.Append("TargetComponents: ").Append(targets.Count).AppendLine();
        for (int i = 0; i < targets.Count; i++)
        {
            AscetItemRef target = targets[i];
            if (target == null)
            {
                continue;
            }

            builder.Append("  - ")
                .Append(target.Path ?? String.Empty)
                .Append(" [")
                .Append(target.Kind.ToString())
                .Append("/")
                .Append(target.LanguageKind.ToString())
                .Append("]")
                .AppendLine();
        }

        builder.Append("Summary:").AppendLine();
        builder.Append(summary.Summary ?? String.Empty).AppendLine();
        return builder.ToString();
    }

    public static string FormatJsonOutput(AscetReferenceGraphSummary summary)
    {
        if (summary == null)
        {
            throw new AscetReadException("invalid_argument", "format_json_output", "Reference summary must not be null.");
        }

        JavaScriptSerializer serializer = new JavaScriptSerializer();
        return AscetJsonContract.Serialize(BuildSerializableSummary(summary));
    }

    internal static IDictionary<string, object> BuildSerializableSummary(AscetReferenceGraphSummary summary)
    {
        Dictionary<string, object> result = new Dictionary<string, object>();
        result["ComponentPath"] = summary.ComponentPath ?? String.Empty;
        result["ComponentKind"] = summary.ComponentKind.ToString();
        result["LanguageKind"] = summary.LanguageKind.ToString();
        result["References"] = BuildSerializableReferences(summary.References);
        result["TargetComponents"] = BuildSerializableTargets(summary.TargetComponents);
        result["Summary"] = summary.Summary ?? String.Empty;
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
            entry["SourceElementKind"] = edge == null ? String.Empty : (edge.SourceElementKind ?? String.Empty);
            entry["SourceDisplayScope"] = edge == null ? String.Empty : (edge.SourceDisplayScope ?? String.Empty);
            entry["SourceDisplayKind"] = edge == null ? String.Empty : (edge.SourceDisplayKind ?? String.Empty);
            entry["IsResolved"] = edge != null && edge.IsResolved;
            entry["TargetComponentName"] = edge == null ? String.Empty : (edge.TargetComponentName ?? String.Empty);
            entry["TargetComponentPath"] = edge == null ? String.Empty : (edge.TargetComponentPath ?? String.Empty);
            entry["TargetComponentKind"] = edge == null ? AscetComponentKind.Unknown.ToString() : edge.TargetComponentKind.ToString();
            entry["TargetLanguageKind"] = edge == null ? AscetLanguageKind.Unknown.ToString() : edge.TargetLanguageKind.ToString();
            result.Add(entry);
        }

        return result;
    }

    private static IList<IDictionary<string, object>> BuildSerializableTargets(IList<AscetItemRef> targets)
    {
        List<IDictionary<string, object>> result = new List<IDictionary<string, object>>();
        if (targets == null)
        {
            return result;
        }

        for (int i = 0; i < targets.Count; i++)
        {
            AscetItemRef target = targets[i];
            Dictionary<string, object> entry = new Dictionary<string, object>();
            entry["Name"] = target == null ? String.Empty : (target.Name ?? String.Empty);
            entry["Path"] = target == null ? String.Empty : (target.Path ?? String.Empty);
            entry["Kind"] = target == null ? AscetComponentKind.Unknown.ToString() : target.Kind.ToString();
            entry["LanguageKind"] = target == null ? AscetLanguageKind.Unknown.ToString() : target.LanguageKind.ToString();
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
