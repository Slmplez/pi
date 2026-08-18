using System;
using System.Collections.Generic;
using System.IO;
using System.Text;

public sealed class AscetApplyElementSpecArguments
{
    public string ComponentPath { get; set; }
    public string ProjectPath { get; set; }
    public string SpecFilePath { get; set; }
    public AscetElementApplyMode Mode { get; set; }
    public bool DeleteMissing { get; set; }
    public bool RecreateIncompatible { get; set; }
    public bool VerifyReadback { get; set; }
    public bool EmitJson { get; set; }
}

public static class AscetApplyElementSpec
{
    public static int Main(string[] args)
    {
        TextWriter originalOut = Console.Out;
        StringWriter suppressedOut = null;

        try
        {
            AscetApplyElementSpecArguments parsed = ParseArguments(args);
            if (parsed.EmitJson)
            {
                suppressedOut = new StringWriter();
                Console.SetOut(suppressedOut);
            }

            string json = ReadSpecFile(parsed.SpecFilePath);
            AscetElementSpecDocument spec = AscetElementSpecDocumentParser.ParseJson(json);
            AscetToolApiBootstrap.ConfigureAssemblyResolution();
            ComponentElementSyncService service = new ComponentElementSyncService();
            AscetElementSyncResult result = service.Apply(
                new AscetItemRef { Path = parsed.ComponentPath },
                spec,
                new AscetElementApplyOptions
                {
                    Mode = parsed.Mode,
                    DeleteMissing = parsed.DeleteMissing,
                    RecreateIncompatible = parsed.RecreateIncompatible,
                    ProjectPath = parsed.ProjectPath
                },
                parsed.VerifyReadback);
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

    public static AscetApplyElementSpecArguments ParseArguments(string[] args)
    {
        if (args == null || args.Length < 2)
        {
            throw new AscetReadException("invalid_argument", "parse_arguments", "usage: AscetCli.exe exec apply_element_spec <component-path> <spec-file> [--project-path <project-path>] [--mode restore] [--delete-missing] [--recreate-incompatible] [--verify-readback] [--json]");
        }

        AscetApplyElementSpecArguments result = new AscetApplyElementSpecArguments
        {
            ComponentPath = NormalizeComponentPath(args[0]),
            ProjectPath = String.Empty,
            SpecFilePath = String.IsNullOrWhiteSpace(args[1]) ? String.Empty : args[1].Trim(),
            Mode = AscetElementApplyMode.Apply,
            DeleteMissing = false,
            RecreateIncompatible = false,
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
                continue;
            }

            if (String.Equals(argument, "--delete-missing", StringComparison.OrdinalIgnoreCase))
            {
                result.DeleteMissing = true;
                continue;
            }

            if (String.Equals(argument, "--project-path", StringComparison.OrdinalIgnoreCase) ||
                String.Equals(argument, "--project", StringComparison.OrdinalIgnoreCase))
            {
                if (i + 1 >= args.Length)
                {
                    throw new AscetReadException("invalid_argument", "parse_arguments", "Missing project path after " + argument + ".");
                }

                result.ProjectPath = NormalizeProjectPath(args[++i]);
                continue;
            }

            if (String.Equals(argument, "--recreate-incompatible", StringComparison.OrdinalIgnoreCase))
            {
                result.RecreateIncompatible = true;
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

        if (result.DeleteMissing && result.Mode != AscetElementApplyMode.Restore)
        {
            result.Mode = AscetElementApplyMode.Restore;
        }

        return result;
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

    public static string FormatTextOutput(AscetElementSyncResult result)
    {
        if (result == null)
        {
            throw new AscetReadException("invalid_argument", "format_text_output", "Element sync result must not be null.");
        }

        StringBuilder builder = new StringBuilder();
        builder.Append("Component: ").Append(result.ComponentPath ?? String.Empty).AppendLine();
        builder.Append("ComponentKind: ").Append(result.ComponentKind.ToString()).AppendLine();
        builder.Append("LanguageKind: ").Append(result.LanguageKind.ToString()).AppendLine();
        builder.Append("Mode: ").Append(result.Mode.ToString()).AppendLine();
        builder.Append("DeleteMissingRequested: ").Append(result.DeleteMissingRequested).AppendLine();
        builder.Append("RecreateIncompatibleRequested: ").Append(result.RecreateIncompatibleRequested).AppendLine();
        builder.Append("Summary: ").Append(FormatSummaryText(result.Summary)).AppendLine();
        builder.Append("CreatedElements: ").Append(Join(result.CreatedElements)).AppendLine();
        builder.Append("UpdatedElements: ").Append(Join(result.UpdatedElements)).AppendLine();
        builder.Append("SkippedElements: ").Append(Join(result.SkippedElements)).AppendLine();
        builder.Append("RemovedElements: ").Append(Join(result.RemovedElements)).AppendLine();
        builder.Append("IncompatibleElements: ").Append(Join(result.IncompatibleElements)).AppendLine();
        builder.Append("Issues: ").Append(Join(result.Issues)).AppendLine();
        builder.Append("WriteSucceeded: ").Append(result.WriteSucceeded).AppendLine();
        builder.Append("VerifyReadbackRequested: ").Append(result.VerifyReadbackRequested).AppendLine();
        builder.Append("ReadbackVerified: ").Append(result.ReadbackVerified).AppendLine();
        return builder.ToString();
    }

    public static string FormatJsonOutput(AscetElementSyncResult result)
    {
        return AscetJsonContract.Serialize(BuildSerializableResult(result));
    }

    private static IDictionary<string, object> BuildSerializableResult(AscetElementSyncResult result)
    {
        Dictionary<string, object> entry = new Dictionary<string, object>();
        entry["ComponentPath"] = result == null ? String.Empty : (result.ComponentPath ?? String.Empty);
        entry["ComponentKind"] = result == null ? AscetComponentKind.Unknown.ToString() : result.ComponentKind.ToString();
        entry["LanguageKind"] = result == null ? AscetLanguageKind.Unknown.ToString() : result.LanguageKind.ToString();
        entry["Mode"] = result == null ? AscetElementApplyMode.Apply.ToString() : result.Mode.ToString();
        entry["DeleteMissingRequested"] = result != null && result.DeleteMissingRequested;
        entry["RecreateIncompatibleRequested"] = result != null && result.RecreateIncompatibleRequested;
        entry["ElementResults"] = result == null ? new List<object>() : ToElementResults(result.ElementResults);
        entry["Summary"] = result == null ? BuildSummary(null) : BuildSummary(result.Summary);
        entry["CreatedElements"] = result == null ? new List<string>() : ToList(result.CreatedElements);
        entry["UpdatedElements"] = result == null ? new List<string>() : ToList(result.UpdatedElements);
        entry["SkippedElements"] = result == null ? new List<string>() : ToList(result.SkippedElements);
        entry["RemovedElements"] = result == null ? new List<string>() : ToList(result.RemovedElements);
        entry["IncompatibleElements"] = result == null ? new List<string>() : ToList(result.IncompatibleElements);
        entry["Issues"] = result == null ? new List<string>() : ToList(result.Issues);
        entry["WriteSucceeded"] = result != null && result.WriteSucceeded;
        entry["VerifyReadbackRequested"] = result != null && result.VerifyReadbackRequested;
        entry["ReadbackVerified"] = result != null && result.ReadbackVerified;
        entry["changed"] = result != null && result.Changed;
        entry["mutationStatus"] = result == null ? String.Empty : (result.MutationStatus ?? String.Empty);
        entry["saveAttempted"] = result != null && result.SaveAttempted;
        entry["saveSucceeded"] = result != null && result.SaveSucceeded;
        entry["saveState"] = result == null ? String.Empty : (result.SaveState ?? String.Empty);
        entry["verified"] = result != null && result.Verified;
        entry["verificationStatus"] = result == null ? String.Empty : (result.VerificationStatus ?? String.Empty);
        entry["verificationMode"] = result == null ? String.Empty : (result.VerificationMode ?? String.Empty);
        entry["sessionCount"] = result == null ? 0 : result.SessionCount;
        entry["saveCount"] = result == null ? 0 : result.SaveCount;
        entry["editableRetryCount"] = result == null ? 0 : result.EditableRetryCount;
        entry["nativeMutationAttemptCount"] = result == null ? 0 : result.NativeMutationAttemptCount;
        return entry;
    }

    private static List<object> ToElementResults(IList<AscetElementSyncItemResult> values)
    {
        List<object> result = new List<object>();
        if (values == null)
        {
            return result;
        }

        for (int i = 0; i < values.Count; i++)
        {
            AscetElementSyncItemResult item = values[i];
            Dictionary<string, object> entry = new Dictionary<string, object>();
            entry["name"] = item == null ? String.Empty : (item.Name ?? String.Empty);
            entry["kind"] = item == null ? String.Empty : (item.Kind ?? String.Empty);
            entry["status"] = item == null ? String.Empty : (item.Status ?? String.Empty);
            entry["changedFields"] = item == null ? new List<string>() : ToList(item.ChangedFields);
            entry["readbackVerified"] = item != null && item.ReadbackVerified;
            if (item != null && !String.IsNullOrWhiteSpace(item.ErrorCode))
            {
                entry["errorCode"] = item.ErrorCode;
            }
            if (item != null && !String.IsNullOrWhiteSpace(item.Message))
            {
                entry["message"] = item.Message;
            }
            result.Add(entry);
        }

        return result;
    }

    private static Dictionary<string, object> BuildSummary(AscetElementSyncSummary summary)
    {
        Dictionary<string, object> result = new Dictionary<string, object>();
        result["created"] = summary == null ? 0 : summary.Created;
        result["updated"] = summary == null ? 0 : summary.Updated;
        result["skipped"] = summary == null ? 0 : summary.Skipped;
        result["failed"] = summary == null ? 0 : summary.Failed;
        result["removed"] = summary == null ? 0 : summary.Removed;
        result["incompatible"] = summary == null ? 0 : summary.Incompatible;
        return result;
    }

    private static string FormatSummaryText(AscetElementSyncSummary summary)
    {
        if (summary == null)
        {
            return "created=0 updated=0 skipped=0 failed=0 removed=0 incompatible=0";
        }

        return "created=" + summary.Created.ToString() +
            " updated=" + summary.Updated.ToString() +
            " skipped=" + summary.Skipped.ToString() +
            " failed=" + summary.Failed.ToString() +
            " removed=" + summary.Removed.ToString() +
            " incompatible=" + summary.Incompatible.ToString();
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

    private static string NormalizeProjectPath(string projectPath)
    {
        string normalized = String.IsNullOrWhiteSpace(projectPath)
            ? String.Empty
            : projectPath.Trim().Replace('/', '\\');
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
            throw new AscetReadException("invalid_argument", "normalize_project_path", "Project path must not be empty.");
        }

        return normalized;
    }

    private static AscetElementApplyMode NormalizeMode(string mode)
    {
        string normalized = String.IsNullOrWhiteSpace(mode)
            ? String.Empty
            : mode.Trim().Replace("_", String.Empty).Replace("-", String.Empty).Replace(" ", String.Empty).ToLowerInvariant();

        switch (normalized)
        {
            case "":
            case "apply":
            case "update":
                return AscetElementApplyMode.Apply;
            case "restore":
                return AscetElementApplyMode.Restore;
            default:
                throw new AscetReadException("invalid_argument", "normalize_mode", "Unsupported mode '" + (mode ?? String.Empty) + "'.");
        }
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
