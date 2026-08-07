using System;
using System.Collections.Generic;
using System.IO;
using System.Text;

public sealed class AscetApplyProjectFormulaArguments
{
    public string ProjectPath { get; set; }
    public string SpecFilePath { get; set; }
    public string Mode { get; set; }
    public bool HasMode { get; set; }
    public bool DeleteMissing { get; set; }
    public bool HasDeleteMissing { get; set; }
    public bool VerifyReadback { get; set; }
    public bool EmitJson { get; set; }
}

public static class AscetApplyProjectFormula
{
    public static int Main(string[] args)
    {
        TextWriter originalOut = Console.Out;
        StringWriter suppressedOut = null;

        try
        {
            AscetApplyProjectFormulaArguments parsed = ParseArguments(args);
            if (parsed.EmitJson)
            {
                suppressedOut = new StringWriter();
                Console.SetOut(suppressedOut);
            }

            string json = ReadSpecFile(parsed.SpecFilePath);
            AscetProjectFormulaSpecDocument spec = AscetProjectFormulaSpecDocumentParser.ParseJson(json);
            spec = MergeRequestedOptions(spec, parsed);
            AscetToolApiBootstrap.ConfigureAssemblyResolution();
            ProjectFormulaApplyService service = new ProjectFormulaApplyService();
            AscetProjectFormulaApplyResult result = service.Apply(parsed.ProjectPath, spec, parsed.VerifyReadback);
            string output = parsed.EmitJson ? FormatJsonOutput(result) : FormatTextOutput(result);

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

    public static AscetApplyProjectFormulaArguments ParseArguments(string[] args)
    {
        if (args == null || args.Length < 2)
        {
            throw new AscetReadException("invalid_argument", "parse_arguments", "usage: AscetCli.exe exec apply_project_formula <project-path> <spec-file> [--mode restore] [--delete-missing] [--verify-readback] [--json]");
        }

        AscetApplyProjectFormulaArguments result = new AscetApplyProjectFormulaArguments
        {
            ProjectPath = NormalizeProjectPath(args[0]),
            SpecFilePath = String.IsNullOrWhiteSpace(args[1]) ? String.Empty : args[1].Trim(),
            Mode = String.Empty,
            HasMode = false,
            DeleteMissing = false,
            HasDeleteMissing = false,
            VerifyReadback = false,
            EmitJson = false
        };

        if (String.IsNullOrWhiteSpace(result.SpecFilePath))
        {
            throw new AscetReadException("invalid_argument", "parse_arguments", "Spec file path must not be empty.");
        }

        for (int i = 2; i < args.Length; i++)
        {
            string argument = args[i];
            if (String.Equals(argument, "--mode", StringComparison.OrdinalIgnoreCase))
            {
                if (i + 1 >= args.Length)
                {
                    throw new AscetReadException("invalid_argument", "parse_arguments", "Missing mode after --mode.");
                }

                result.Mode = NormalizeMode(args[++i]);
                result.HasMode = true;
                continue;
            }

            if (String.Equals(argument, "--delete-missing", StringComparison.OrdinalIgnoreCase))
            {
                result.DeleteMissing = true;
                result.HasDeleteMissing = true;
                continue;
            }

            if (String.Equals(argument, "--verify-readback", StringComparison.OrdinalIgnoreCase))
            {
                result.VerifyReadback = true;
                continue;
            }

            if (String.Equals(argument, "--json", StringComparison.OrdinalIgnoreCase))
            {
                result.EmitJson = true;
                continue;
            }

            throw new AscetReadException("invalid_argument", "parse_arguments", "Unknown argument '" + argument + "'.");
        }

        return result;
    }

    public static AscetProjectFormulaSpecDocument MergeRequestedOptions(AscetProjectFormulaSpecDocument spec, AscetApplyProjectFormulaArguments parsed)
    {
        if (spec == null)
        {
            throw new AscetReadException("invalid_argument", "merge_requested_options", "Project formula spec document must not be null.");
        }

        if (parsed == null)
        {
            return spec;
        }

        if (parsed.HasMode)
        {
            spec.Mode = parsed.Mode;
        }

        if (parsed.HasDeleteMissing)
        {
            spec.DeleteMissing = parsed.DeleteMissing;
            spec.HasDeleteMissing = true;
        }

        return spec;
    }

    public static string ReadSpecFile(string specFilePath)
    {
        if (String.IsNullOrWhiteSpace(specFilePath))
        {
            throw new AscetReadException("invalid_argument", "read_spec_file", "Spec file path must not be empty.");
        }

        string resolvedPath = AscetArtifactPathResolver.ResolveReadableFilePath(specFilePath);
        if (!File.Exists(resolvedPath))
        {
            throw new AscetReadException("spec_file_not_found", "read_spec_file", "Spec file '" + specFilePath + "' was not found." + AscetArtifactPathResolver.FormatResolvedPathSuffix(specFilePath, resolvedPath));
        }

        return File.ReadAllText(resolvedPath);
    }

    public static string FormatTextOutput(AscetProjectFormulaApplyResult result)
    {
        if (result == null)
        {
            throw new AscetReadException("invalid_argument", "format_text_output", "Project formula apply result must not be null.");
        }

        StringBuilder builder = new StringBuilder();
        builder.Append("Project: ").Append(result.ProjectPath ?? String.Empty).AppendLine();
        builder.Append("Mode: ").Append(result.Mode ?? String.Empty).AppendLine();
        builder.Append("DeleteMissing: ").Append(result.DeleteMissing).AppendLine();
        builder.Append("CreatedFormulas: ").Append(Join(result.CreatedFormulas)).AppendLine();
        builder.Append("UpdatedFormulas: ").Append(Join(result.UpdatedFormulas)).AppendLine();
        builder.Append("DeletedFormulas: ").Append(Join(result.DeletedFormulas)).AppendLine();
        builder.Append("Issues: ").Append(Join(result.Issues)).AppendLine();
        builder.Append("WriteSucceeded: ").Append(result.WriteSucceeded).AppendLine();
        builder.Append("VerifyReadbackRequested: ").Append(result.VerifyReadbackRequested).AppendLine();
        builder.Append("ReadbackVerified: ").Append(result.ReadbackVerified).AppendLine();
        return builder.ToString();
    }

    public static string FormatJsonOutput(AscetProjectFormulaApplyResult result)
    {
        Dictionary<string, object> payload = new Dictionary<string, object>();
        payload["ProjectPath"] = result == null ? String.Empty : (result.ProjectPath ?? String.Empty);
        payload["Mode"] = result == null ? String.Empty : (result.Mode ?? String.Empty);
        payload["DeleteMissing"] = result != null && result.DeleteMissing;
        payload["CreatedFormulas"] = ToList(result == null ? null : result.CreatedFormulas);
        payload["UpdatedFormulas"] = ToList(result == null ? null : result.UpdatedFormulas);
        payload["DeletedFormulas"] = ToList(result == null ? null : result.DeletedFormulas);
        payload["Issues"] = ToList(result == null ? null : result.Issues);
        payload["WriteSucceeded"] = result != null && result.WriteSucceeded;
        payload["VerifyReadbackRequested"] = result != null && result.VerifyReadbackRequested;
        payload["ReadbackVerified"] = result != null && result.ReadbackVerified;
        return AscetJsonContract.Serialize(payload);
    }

    private static List<string> ToList(IList<string> values)
    {
        List<string> result = new List<string>();
        if (values == null)
        {
            return result;
        }

        for (int i = 0; i < values.Count; i++)
        {
            result.Add(values[i] ?? String.Empty);
        }

        return result;
    }

    private static string Join(IList<string> values)
    {
        if (values == null || values.Count == 0)
        {
            return String.Empty;
        }

        string[] parts = new string[values.Count];
        for (int i = 0; i < values.Count; i++)
        {
            parts[i] = values[i] ?? String.Empty;
        }

        return String.Join(", ", parts);
    }

    private static string NormalizeMode(string mode)
    {
        string normalized = AscetProjectFormulaSpecDocumentParser.NormalizeMode(mode);
        if (!String.Equals(normalized, "apply", StringComparison.Ordinal) &&
            !String.Equals(normalized, "restore", StringComparison.Ordinal))
        {
            throw new AscetReadException("invalid_argument", "normalize_mode", "Unsupported mode '" + (mode ?? String.Empty) + "'.");
        }

        return normalized;
    }

    private static string NormalizeProjectPath(string projectPath)
    {
        if (String.IsNullOrWhiteSpace(projectPath))
        {
            throw new AscetReadException("invalid_argument", "normalize_project_path", "Project path must not be empty.");
        }

        string normalized = projectPath.Trim().Replace('/', '\\');
        while (normalized.StartsWith("\\", StringComparison.Ordinal))
        {
            normalized = normalized.Substring(1);
        }

        if (String.IsNullOrWhiteSpace(normalized))
        {
            throw new AscetReadException("invalid_argument", "normalize_project_path", "Project path must contain a project name.");
        }

        return normalized;
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
