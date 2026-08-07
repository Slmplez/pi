using System;
using System.Collections.Generic;
using System.IO;
using System.Text;

public sealed class AscetReadElementDependencyArguments
{
    public string TargetPath { get; set; }
    public string ElementName { get; set; }
    public string TargetKind { get; set; }
    public bool EmitJson { get; set; }
}

public static class AscetReadElementDependency
{
    public static int Main(string[] args)
    {
        TextWriter originalOut = Console.Out;
        StringWriter suppressedOut = null;

        try
        {
            AscetReadElementDependencyArguments parsed = ParseArguments(args);
            if (parsed.EmitJson)
            {
                suppressedOut = new StringWriter();
                Console.SetOut(suppressedOut);
            }

            AscetToolApiBootstrap.ConfigureAssemblyResolution();
            AscetElementDependencyPlanResult result = Read(parsed);
            string output = parsed.EmitJson ? FormatJsonOutput(result) : FormatTextOutput(result);

            Console.SetOut(originalOut);
            Console.Write(output);
            return 0;
        }
        catch (Exception ex)
        {
            Console.SetOut(originalOut);
            Console.Error.WriteLine(AscetElementDependencyPlanSupport.FormatException(ex));
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

    public static AscetReadElementDependencyArguments ParseArguments(string[] args)
    {
        if (args == null || args.Length < 2)
        {
            throw new AscetReadException("invalid_argument", "parse_arguments", "usage: AscetReadElementDependency.exe <target-path> <element-name> [--target-kind auto|component|project|folder] [--json]");
        }

        AscetReadElementDependencyArguments result = new AscetReadElementDependencyArguments
        {
            TargetPath = AscetElementDependencyPlanSupport.NormalizePath(args[0]),
            ElementName = AscetElementDependencyPlanSupport.NormalizeElementName(args[1]),
            TargetKind = "auto",
            EmitJson = false
        };

        for (int i = 2; i < args.Length; i++)
        {
            string argument = args[i];
            if (String.Equals(argument, "--json", StringComparison.OrdinalIgnoreCase))
            {
                result.EmitJson = true;
                continue;
            }

            if (String.Equals(argument, "--target-kind", StringComparison.OrdinalIgnoreCase))
            {
                if (i + 1 >= args.Length)
                {
                    throw new AscetReadException("invalid_argument", "parse_arguments", "Missing value after --target-kind.");
                }

                result.TargetKind = AscetElementDependencyPlanSupport.NormalizeTargetKind(args[++i]);
                continue;
            }

            throw new AscetReadException("invalid_argument", "parse_arguments", "Unknown argument '" + argument + "'.");
        }

        return result;
    }

    public static AscetElementDependencyPlanResult Read(AscetReadElementDependencyArguments arguments)
    {
        if (arguments == null)
        {
            throw new AscetReadException("invalid_argument", "read_element_dependency", "Arguments must not be null.");
        }

        AscetElementDependencyPlanService service = new AscetElementDependencyPlanService();
        return service.Plan(new AscetElementDependencyPlanArguments
        {
            TargetPath = arguments.TargetPath,
            ElementName = arguments.ElementName,
            TargetKind = arguments.TargetKind,
            EmitJson = arguments.EmitJson
        });
    }

    public static string FormatTextOutput(AscetElementDependencyPlanResult result)
    {
        if (result == null)
        {
            throw new AscetReadException("invalid_argument", "format_read_dependency_text", "Read dependency result must not be null.");
        }

        StringBuilder builder = new StringBuilder();
        builder.Append("Target: ").Append(result.TargetPath ?? String.Empty).AppendLine();
        builder.Append("TargetKind: ").Append(result.TargetKind ?? String.Empty).AppendLine();
        builder.Append("Element: ").Append(result.ElementName ?? String.Empty).AppendLine();

        IList<AscetElementDependencyPlanMatch> matches = result.Matches ?? new List<AscetElementDependencyPlanMatch>();
        builder.Append("Matches: ").Append(matches.Count).AppendLine();
        for (int i = 0; i < matches.Count; i++)
        {
            AscetElementDependencyPlanMatch match = matches[i];
            if (match == null)
            {
                continue;
            }

            builder.Append("  - Component: ").Append(match.ComponentPath ?? String.Empty).AppendLine();
            builder.Append("    Element: ").Append(match.ElementName ?? String.Empty).AppendLine();
            builder.Append("    Dependency: ").Append(match.BeforeDependency ?? String.Empty).AppendLine();
            builder.Append("    Formula: ").Append(match.FormulaCode ?? String.Empty).AppendLine();
            builder.Append("    Supported: ").Append(match.Supported).AppendLine();
            if (!String.IsNullOrWhiteSpace(match.UnsupportedReason))
            {
                builder.Append("    Reason: ").Append(match.UnsupportedReason).AppendLine();
            }
        }

        IList<string> issues = result.Issues ?? new List<string>();
        if (issues.Count > 0)
        {
            builder.Append("Issues: ").Append(issues.Count).AppendLine();
            for (int i = 0; i < issues.Count; i++)
            {
                builder.Append("  - ").Append(issues[i] ?? String.Empty).AppendLine();
            }
        }

        return builder.ToString();
    }

    public static string FormatJsonOutput(AscetElementDependencyPlanResult result)
    {
        Dictionary<string, object> payload = new Dictionary<string, object>();
        payload["target"] = result == null ? String.Empty : (result.TargetPath ?? String.Empty);
        payload["kind"] = result == null ? String.Empty : (result.TargetKind ?? String.Empty);
        payload["element"] = result == null ? String.Empty : (result.ElementName ?? String.Empty);

        List<Dictionary<string, object>> matches = new List<Dictionary<string, object>>();
        IList<AscetElementDependencyPlanMatch> values = result == null ? null : result.Matches;
        if (values != null)
        {
            for (int i = 0; i < values.Count; i++)
            {
                AscetElementDependencyPlanMatch current = values[i];
                if (current == null)
                {
                    continue;
                }

                matches.Add(AscetElementDependencyPlanSupport.BuildMatchPayload(current));
            }
        }

        payload["count"] = matches.Count;
        payload["matches"] = matches;
        payload["issues"] = result == null || result.Issues == null ? new List<string>() : result.Issues;
        return AscetJsonContract.Serialize(payload);
    }
}
