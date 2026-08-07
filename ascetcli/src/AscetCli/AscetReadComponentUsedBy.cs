using System;
using System.Collections.Generic;
using System.IO;
using System.Text;

public sealed class AscetReadComponentUsedByArguments
{
    public string ComponentPath { get; set; }
    public string ScopePath { get; set; }
    public AscetComponentKind Kind { get; set; }
    public int Limit { get; set; }
    public bool EmitJson { get; set; }
}

public static class AscetReadComponentUsedBy
{
    public static int Main(string[] args)
    {
        TextWriter originalOut = Console.Out;
        StringWriter suppressedOut = null;

        try
        {
            AscetReadComponentUsedByArguments arguments = ParseArguments(args);
            if (arguments.EmitJson)
            {
                suppressedOut = new StringWriter();
                Console.SetOut(suppressedOut);
            }

            AscetToolApiBootstrap.ConfigureAssemblyResolution();
            ValidateTargetComponentExists(arguments.ComponentPath);
            ReverseReferenceReadService service = new ReverseReferenceReadService();
            AscetIncomingReferenceSummary summary = service.GetIncomingReferences(
                arguments.ComponentPath,
                arguments.ScopePath,
                arguments.Kind,
                arguments.Limit);

            string output = arguments.EmitJson ? FormatJsonOutput(arguments, summary) : FormatTextOutput(arguments, summary);

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

    public static AscetReadComponentUsedByArguments ParseArguments(string[] args)
    {
        if (args == null || args.Length < 1)
        {
            throw new AscetReadException("invalid_argument", "parse_arguments", "usage: AscetCli.exe exec read_component_used_by <component-path> [--scope <folder-path>] [--kind <class|module|statemachine>] [--limit <n>] [--json]");
        }

        AscetReadComponentUsedByArguments result = new AscetReadComponentUsedByArguments
        {
            ComponentPath = NormalizePath(args[0], "component_path"),
            ScopePath = String.Empty,
            Kind = AscetComponentKind.Unknown,
            Limit = 0,
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

            if (String.Equals(argument, "--scope", StringComparison.OrdinalIgnoreCase))
            {
                result.ScopePath = NormalizeRequiredOptionPath(
                    ReadRequiredOptionValue(args, ref i, "--scope"),
                    "scope_path");
                continue;
            }

            if (String.Equals(argument, "--kind", StringComparison.OrdinalIgnoreCase))
            {
                if (i + 1 >= args.Length)
                {
                    throw new AscetReadException("invalid_argument", "parse_arguments", "Missing value after --kind.");
                }

                result.Kind = AscetDatabaseExplorerCommon.ParseKind(args[++i]);
                continue;
            }

            if (String.Equals(argument, "--limit", StringComparison.OrdinalIgnoreCase))
            {
                if (i + 1 >= args.Length)
                {
                    throw new AscetReadException("invalid_argument", "parse_arguments", "Missing value after --limit.");
                }

                result.Limit = AscetDatabaseExplorerCommon.ParsePositiveInt(args[++i], "limit", 0);
                continue;
            }

            throw new AscetReadException("invalid_argument", "parse_arguments", "Unknown argument '" + argument + "'.");
        }

        return result;
    }

    private static void ValidateTargetComponentExists(string componentPath)
    {
        AscetItemPath parsed = AscetItemPath.Parse(componentPath);
        ComponentLocatorService locator = new ComponentLocatorService();
        AscetItemRef item = locator.FindItemInFolder(parsed.ItemName, parsed.FolderPath);
        if (item == null)
        {
            throw new AscetReadException(
                "component_not_found",
                "validate_target_component",
                "Component path '" + componentPath + "' could not be resolved exactly.");
        }
    }

    public static string FormatTextOutput(AscetReadComponentUsedByArguments arguments, AscetIncomingReferenceSummary summary)
    {
        StringBuilder builder = new StringBuilder();
        builder.Append("Component: ").Append(summary == null ? String.Empty : (summary.ComponentPath ?? String.Empty)).AppendLine();
        builder.Append("Scope: ").Append(summary == null ? String.Empty : (summary.ScopePath ?? String.Empty)).AppendLine();
        builder.Append("ScannedComponents: ").Append(summary == null ? 0 : summary.ScannedComponentCount).AppendLine();
        builder.Append("SourceComponents: ").Append(summary == null || summary.SourceComponents == null ? 0 : summary.SourceComponents.Count).AppendLine();
        builder.Append("IncomingEdges: ").Append(summary == null || summary.IncomingEdges == null ? 0 : summary.IncomingEdges.Count).AppendLine();
        builder.Append("Summary: ").Append(summary == null ? String.Empty : (summary.Summary ?? String.Empty)).AppendLine();

        if (summary != null && summary.IncomingEdges != null)
        {
            for (int i = 0; i < summary.IncomingEdges.Count; i++)
            {
                AscetIncomingReferenceEdgeRef edge = summary.IncomingEdges[i];
                if (edge == null)
                {
                    continue;
                }

                builder.Append("- ")
                    .Append(edge.SourceComponentPath ?? String.Empty)
                    .Append(" :: ")
                    .Append(edge.SourceElementName ?? String.Empty)
                    .Append(" [")
                    .Append(edge.SourceElementKind ?? String.Empty)
                    .Append("]")
                    .AppendLine();
            }
        }

        return builder.ToString();
    }

    public static string FormatJsonOutput(AscetReadComponentUsedByArguments arguments, AscetIncomingReferenceSummary summary)
    {
        List<Dictionary<string, object>> incomingEdges = new List<Dictionary<string, object>>();
        if (summary != null && summary.IncomingEdges != null)
        {
            for (int i = 0; i < summary.IncomingEdges.Count; i++)
            {
                AscetIncomingReferenceEdgeRef edge = summary.IncomingEdges[i];
                if (edge == null)
                {
                    continue;
                }

                Dictionary<string, object> payload = new Dictionary<string, object>();
                payload["sourceComponentPath"] = edge.SourceComponentPath ?? String.Empty;
                payload["sourceComponentKind"] = AscetDatabaseExplorerCommon.KindToSchema(edge.SourceComponentKind);
                payload["sourceLanguageKind"] = edge.SourceLanguageKind.ToString();
                payload["sourceElementName"] = edge.SourceElementName ?? String.Empty;
                payload["sourceElementKind"] = edge.SourceElementKind ?? String.Empty;
                payload["sourceDisplayScope"] = edge.SourceDisplayScope ?? String.Empty;
                payload["sourceDisplayKind"] = edge.SourceDisplayKind ?? String.Empty;
                payload["targetComponentPath"] = edge.TargetComponentPath ?? String.Empty;
                incomingEdges.Add(payload);
            }
        }

        List<Dictionary<string, object>> sourceComponents = new List<Dictionary<string, object>>();
        if (summary != null && summary.SourceComponents != null)
        {
            for (int i = 0; i < summary.SourceComponents.Count; i++)
            {
                AscetItemRef item = summary.SourceComponents[i];
                if (item != null)
                {
                    sourceComponents.Add(AscetDatabaseExplorerCommon.BuildSerializableItem(item));
                }
            }
        }

        Dictionary<string, object> filters = new Dictionary<string, object>();
        filters["kind"] = arguments == null ? "unknown" : AscetDatabaseExplorerCommon.KindToFilterSchema(arguments.Kind);
        filters["limit"] = arguments == null ? 0 : arguments.Limit;

        Dictionary<string, object> counts = new Dictionary<string, object>();
        counts["scannedComponents"] = summary == null ? 0 : summary.ScannedComponentCount;
        counts["sourceComponents"] = sourceComponents.Count;
        counts["incomingEdges"] = incomingEdges.Count;

        Dictionary<string, object> payloadRoot = new Dictionary<string, object>();
        payloadRoot["componentPath"] = summary == null ? String.Empty : (summary.ComponentPath ?? String.Empty);
        payloadRoot["scopePath"] = summary == null ? String.Empty : (summary.ScopePath ?? String.Empty);
        payloadRoot["filters"] = filters;
        payloadRoot["counts"] = counts;
        payloadRoot["incomingEdges"] = incomingEdges;
        payloadRoot["sourceComponents"] = sourceComponents;
        payloadRoot["summary"] = summary == null ? String.Empty : (summary.Summary ?? String.Empty);
        return AscetJsonContract.Serialize(payloadRoot);
    }

    private static string NormalizePath(string value, string operation)
    {
        if (String.IsNullOrWhiteSpace(value))
        {
            throw new AscetReadException("invalid_argument", operation, operation + " must not be empty.");
        }

        string normalized = value.Trim().Replace('/', '\\');
        while (normalized.StartsWith("\\", StringComparison.Ordinal))
        {
            normalized = normalized.Substring(1);
        }

        while (normalized.EndsWith("\\", StringComparison.Ordinal))
        {
            normalized = normalized.Substring(0, normalized.Length - 1);
        }

        if (String.IsNullOrWhiteSpace(normalized))
        {
            throw new AscetReadException("invalid_argument", operation, operation + " must not be empty.");
        }

        return normalized;
    }

    private static string NormalizeOptionalScopePath(string value)
    {
        if (String.IsNullOrWhiteSpace(value))
        {
            return String.Empty;
        }

        return NormalizePath(value, "scope_path");
    }

    private static string NormalizeRequiredOptionPath(string value, string operation)
    {
        if (String.IsNullOrWhiteSpace(value))
        {
            throw new AscetReadException("invalid_argument", operation, operation + " must not be empty.");
        }

        return NormalizePath(value, operation);
    }

    private static string ReadRequiredOptionValue(string[] args, ref int index, string optionName)
    {
        if (index + 1 >= args.Length || IsOptionToken(args[index + 1]))
        {
            throw new AscetReadException("invalid_argument", "parse_arguments", "Missing value after " + optionName + ".");
        }

        index++;
        return args[index];
    }

    private static bool IsOptionToken(string value)
    {
        return !String.IsNullOrWhiteSpace(value) && value.StartsWith("--", StringComparison.Ordinal);
    }

    private static string FormatException(Exception ex)
    {
        AscetReadException ascet = ex as AscetReadException;
        if (ascet != null)
        {
            return ascet.Code + ":" + ascet.Operation + ":" + ascet.Message;
        }

        return ex.GetType().FullName + ":" + ex.Message;
    }
}
