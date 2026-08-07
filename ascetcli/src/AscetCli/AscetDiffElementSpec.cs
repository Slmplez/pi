using System;
using System.Collections.Generic;
using System.IO;
using System.Text;

public sealed class AscetDiffElementSpecArguments
{
    public string ComponentPath { get; set; }
    public string SpecFilePath { get; set; }
    public bool EmitJson { get; set; }
    public bool ChangesOnly { get; set; }
}

public static class AscetDiffElementSpec
{
    public static int Main(string[] args)
    {
        TextWriter originalOut = Console.Out;
        StringWriter suppressedOut = null;

        try
        {
            AscetDiffElementSpecArguments parsed = ParseArguments(args);
            if (parsed.EmitJson)
            {
                suppressedOut = new StringWriter();
                Console.SetOut(suppressedOut);
            }

            string json = ReadSpecFile(parsed.SpecFilePath);
            AscetElementSpecDocument spec = AscetElementSpecDocumentParser.ParseJson(json);
            AscetToolApiBootstrap.ConfigureAssemblyResolution();
            ComponentElementSyncService service = new ComponentElementSyncService();
            AscetElementSpecDiffResult diff = service.Diff(new AscetItemRef { Path = parsed.ComponentPath }, spec);
            string output = parsed.EmitJson ? FormatJsonOutput(diff, parsed.ChangesOnly) : FormatTextOutput(diff, parsed.ChangesOnly);

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

    public static AscetDiffElementSpecArguments ParseArguments(string[] args)
    {
        if (args == null || args.Length < 2)
        {
            throw new AscetReadException("invalid_argument", "parse_arguments", "usage: AscetCli.exe exec diff_element_spec <component-path> <spec-file> [--json] [--changes-only]");
        }

        AscetDiffElementSpecArguments result = new AscetDiffElementSpecArguments
        {
            ComponentPath = NormalizeComponentPath(args[0]),
            SpecFilePath = String.IsNullOrWhiteSpace(args[1]) ? String.Empty : ResolveSpecFilePath(args[1]),
            EmitJson = false,
            ChangesOnly = false
        };

        if (String.IsNullOrWhiteSpace(result.SpecFilePath))
        {
            throw new AscetReadException("invalid_argument", "parse_arguments", "Spec file path must not be empty.");
        }

        for (int i = 2; i < args.Length; i++)
        {
            string argument = args[i];
            if (String.Equals(argument, "--json", StringComparison.OrdinalIgnoreCase))
            {
                result.EmitJson = true;
                continue;
            }

            if (String.Equals(argument, "--changes-only", StringComparison.OrdinalIgnoreCase))
            {
                result.ChangesOnly = true;
                continue;
            }

            throw new AscetReadException("invalid_argument", "parse_arguments", "Unknown argument '" + argument + "'.");
        }

        return result;
    }

    public static string ResolveSpecFilePath(string specFilePath)
    {
        if (String.IsNullOrWhiteSpace(specFilePath))
        {
            throw new AscetReadException("invalid_argument", "read_spec_file", "Spec file path must not be empty.");
        }

        try
        {
            string trimmed = specFilePath.Trim();
            return Path.IsPathRooted(trimmed) ? trimmed : Path.GetFullPath(trimmed);
        }
        catch (Exception ex)
        {
            throw new AscetReadException("invalid_argument", "read_spec_file", "Spec file path '" + specFilePath + "' is invalid: " + ex.Message);
        }
    }

    public static string ReadSpecFile(string specFilePath)
    {
        string resolvedPath = ResolveSpecFilePath(specFilePath);
        if (!File.Exists(resolvedPath))
        {
            throw new AscetReadException("spec_file_not_found", "read_spec_file", "Spec file '" + resolvedPath + "' was not found.");
        }

        return File.ReadAllText(resolvedPath);
    }

    public static string FormatTextOutput(AscetElementSpecDiffResult diff, bool changesOnly)
    {
        if (diff == null)
        {
            throw new AscetReadException("invalid_argument", "format_text_output", "Element diff result must not be null.");
        }

        AscetElementSpecDiffResult view = BuildView(diff, changesOnly);
        StringBuilder builder = new StringBuilder();
        builder.Append("Component: ").Append(view.ComponentPath ?? String.Empty).AppendLine();
        AppendCatalogEntries(builder, "AddedElement", view.AddedElements);
        AppendCatalogEntries(builder, "RemovedElement", view.RemovedElements);
        AppendModifiedEntries(builder, view.ModifiedElements);
        AppendIncompatibleEntries(builder, view.IncompatibleElements);
        AppendCatalogEntries(builder, "SkippedElement", view.SkippedElements);
        builder.Append("Summary: ").Append(view.Summary ?? String.Empty).AppendLine();
        return builder.ToString();
    }

    public static string FormatJsonOutput(AscetElementSpecDiffResult diff, bool changesOnly)
    {
        if (diff == null)
        {
            throw new AscetReadException("invalid_argument", "format_json_output", "Element diff result must not be null.");
        }

        AscetElementSpecDiffResult view = BuildView(diff, changesOnly);
        Dictionary<string, object> payload = new Dictionary<string, object>();
        payload["ComponentPath"] = view.ComponentPath ?? String.Empty;
        payload["AddedElements"] = BuildCatalogEntries(view.AddedElements);
        payload["RemovedElements"] = BuildCatalogEntries(view.RemovedElements);
        payload["ModifiedElements"] = BuildModifiedEntries(view.ModifiedElements);
        payload["IncompatibleElements"] = BuildIncompatibleEntries(view.IncompatibleElements);
        payload["SkippedElements"] = BuildCatalogEntries(view.SkippedElements);
        payload["Summary"] = view.Summary ?? String.Empty;
        return AscetJsonContract.Serialize(payload);
    }

    private static AscetElementSpecDiffResult BuildView(AscetElementSpecDiffResult diff, bool changesOnly)
    {
        return new AscetElementSpecDiffResult
        {
            ComponentPath = diff.ComponentPath ?? String.Empty,
            AddedElements = CopyCatalogEntries(diff.AddedElements),
            RemovedElements = CopyCatalogEntries(diff.RemovedElements),
            ModifiedElements = CopyModifiedEntries(diff.ModifiedElements),
            IncompatibleElements = CopyIncompatibleEntries(diff.IncompatibleElements),
            SkippedElements = changesOnly ? new List<AscetElementCatalogEntry>() : CopyCatalogEntries(diff.SkippedElements),
            Summary = diff.Summary ?? String.Empty
        };
    }

    private static IList<AscetElementCatalogEntry> CopyCatalogEntries(IList<AscetElementCatalogEntry> values)
    {
        List<AscetElementCatalogEntry> result = new List<AscetElementCatalogEntry>();
        if (values == null)
        {
            return result;
        }

        for (int i = 0; i < values.Count; i++)
        {
            AscetElementCatalogEntry entry = values[i];
            result.Add(new AscetElementCatalogEntry
            {
                Name = entry == null ? String.Empty : (entry.Name ?? String.Empty),
                Kind = entry == null ? String.Empty : (entry.Kind ?? String.Empty),
                Signature = entry == null ? String.Empty : (entry.Signature ?? String.Empty)
            });
        }

        return result;
    }

    private static IList<AscetElementModifiedDiff> CopyModifiedEntries(IList<AscetElementModifiedDiff> values)
    {
        List<AscetElementModifiedDiff> result = new List<AscetElementModifiedDiff>();
        if (values == null)
        {
            return result;
        }

        for (int i = 0; i < values.Count; i++)
        {
            AscetElementModifiedDiff entry = values[i];
            result.Add(new AscetElementModifiedDiff
            {
                Name = entry == null ? String.Empty : (entry.Name ?? String.Empty),
                Kind = entry == null ? String.Empty : (entry.Kind ?? String.Empty),
                ChangeKind = entry == null ? String.Empty : (entry.ChangeKind ?? String.Empty),
                FieldChanges = CopyStrings(entry == null ? null : entry.FieldChanges),
                LeftSignature = entry == null ? String.Empty : (entry.LeftSignature ?? String.Empty),
                RightSignature = entry == null ? String.Empty : (entry.RightSignature ?? String.Empty)
            });
        }

        return result;
    }

    private static IList<AscetElementIncompatibleDiff> CopyIncompatibleEntries(IList<AscetElementIncompatibleDiff> values)
    {
        List<AscetElementIncompatibleDiff> result = new List<AscetElementIncompatibleDiff>();
        if (values == null)
        {
            return result;
        }

        for (int i = 0; i < values.Count; i++)
        {
            AscetElementIncompatibleDiff entry = values[i];
            result.Add(new AscetElementIncompatibleDiff
            {
                Name = entry == null ? String.Empty : (entry.Name ?? String.Empty),
                Kind = entry == null ? String.Empty : (entry.Kind ?? String.Empty),
                ChangeKind = entry == null ? String.Empty : (entry.ChangeKind ?? String.Empty),
                FieldChanges = CopyStrings(entry == null ? null : entry.FieldChanges),
                FieldDiffs = CopyFieldDiffs(entry == null ? null : entry.FieldDiffs),
                Reason = entry == null ? String.Empty : (entry.Reason ?? String.Empty),
                RequiresRecreate = entry != null && entry.RequiresRecreate,
                LeftSignature = entry == null ? String.Empty : (entry.LeftSignature ?? String.Empty),
                RightSignature = entry == null ? String.Empty : (entry.RightSignature ?? String.Empty)
            });
        }

        return result;
    }

    private static IList<AscetElementFieldDiff> CopyFieldDiffs(IList<AscetElementFieldDiff> values)
    {
        List<AscetElementFieldDiff> result = new List<AscetElementFieldDiff>();
        if (values == null)
        {
            return result;
        }

        for (int i = 0; i < values.Count; i++)
        {
            AscetElementFieldDiff entry = values[i];
            result.Add(new AscetElementFieldDiff
            {
                Field = entry == null ? String.Empty : (entry.Field ?? String.Empty),
                Left = entry == null ? String.Empty : (entry.Left ?? String.Empty),
                Right = entry == null ? String.Empty : (entry.Right ?? String.Empty),
                Reason = entry == null ? String.Empty : (entry.Reason ?? String.Empty)
            });
        }

        return result;
    }

    private static IList<string> CopyStrings(IList<string> values)
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

    private static void AppendCatalogEntries(StringBuilder builder, string label, IList<AscetElementCatalogEntry> values)
    {
        if (builder == null || values == null)
        {
            return;
        }

        for (int i = 0; i < values.Count; i++)
        {
            AscetElementCatalogEntry entry = values[i];
            if (entry == null)
            {
                continue;
            }

            builder.Append(label).Append(": ").Append(entry.Name ?? String.Empty)
                .Append(" [").Append(entry.Kind ?? String.Empty).Append("]")
                .AppendLine();
        }
    }

    private static void AppendModifiedEntries(StringBuilder builder, IList<AscetElementModifiedDiff> values)
    {
        if (builder == null || values == null)
        {
            return;
        }

        for (int i = 0; i < values.Count; i++)
        {
            AscetElementModifiedDiff entry = values[i];
            if (entry == null)
            {
                continue;
            }

            builder.Append("ModifiedElement: ").Append(entry.Name ?? String.Empty)
                .Append(" Fields=").Append(Join(entry.FieldChanges))
                .AppendLine();
        }
    }

    private static void AppendIncompatibleEntries(StringBuilder builder, IList<AscetElementIncompatibleDiff> values)
    {
        if (builder == null || values == null)
        {
            return;
        }

        for (int i = 0; i < values.Count; i++)
        {
            AscetElementIncompatibleDiff entry = values[i];
            if (entry == null)
            {
                continue;
            }

            builder.Append("IncompatibleElement: ").Append(entry.Name ?? String.Empty)
                .Append(" Reason=").Append(entry.Reason ?? String.Empty)
                .Append(" RequiresRecreate=").Append(entry.RequiresRecreate)
                .AppendLine();
        }
    }

    private static List<Dictionary<string, object>> BuildCatalogEntries(IList<AscetElementCatalogEntry> values)
    {
        List<Dictionary<string, object>> result = new List<Dictionary<string, object>>();
        if (values == null)
        {
            return result;
        }

        for (int i = 0; i < values.Count; i++)
        {
            AscetElementCatalogEntry entry = values[i];
            Dictionary<string, object> payload = new Dictionary<string, object>();
            payload["Name"] = entry == null ? String.Empty : (entry.Name ?? String.Empty);
            payload["Kind"] = entry == null ? String.Empty : (entry.Kind ?? String.Empty);
            payload["Signature"] = entry == null ? String.Empty : (entry.Signature ?? String.Empty);
            result.Add(payload);
        }

        return result;
    }

    private static List<Dictionary<string, object>> BuildModifiedEntries(IList<AscetElementModifiedDiff> values)
    {
        List<Dictionary<string, object>> result = new List<Dictionary<string, object>>();
        if (values == null)
        {
            return result;
        }

        for (int i = 0; i < values.Count; i++)
        {
            AscetElementModifiedDiff entry = values[i];
            Dictionary<string, object> payload = new Dictionary<string, object>();
            payload["Name"] = entry == null ? String.Empty : (entry.Name ?? String.Empty);
            payload["Kind"] = entry == null ? String.Empty : (entry.Kind ?? String.Empty);
            payload["ChangeKind"] = entry == null ? String.Empty : (entry.ChangeKind ?? String.Empty);
            payload["FieldChanges"] = CopyStrings(entry == null ? null : entry.FieldChanges);
            payload["LeftSignature"] = entry == null ? String.Empty : (entry.LeftSignature ?? String.Empty);
            payload["RightSignature"] = entry == null ? String.Empty : (entry.RightSignature ?? String.Empty);
            result.Add(payload);
        }

        return result;
    }

    private static List<Dictionary<string, object>> BuildIncompatibleEntries(IList<AscetElementIncompatibleDiff> values)
    {
        List<Dictionary<string, object>> result = new List<Dictionary<string, object>>();
        if (values == null)
        {
            return result;
        }

        for (int i = 0; i < values.Count; i++)
        {
            AscetElementIncompatibleDiff entry = values[i];
            Dictionary<string, object> payload = new Dictionary<string, object>();
            payload["Name"] = entry == null ? String.Empty : (entry.Name ?? String.Empty);
            payload["Kind"] = entry == null ? String.Empty : (entry.Kind ?? String.Empty);
            payload["ChangeKind"] = entry == null ? String.Empty : (entry.ChangeKind ?? String.Empty);
            payload["FieldChanges"] = CopyStrings(entry == null ? null : entry.FieldChanges);
            payload["FieldDiffs"] = BuildFieldDiffEntries(entry == null ? null : entry.FieldDiffs);
            payload["Reason"] = entry == null ? String.Empty : (entry.Reason ?? String.Empty);
            payload["RequiresRecreate"] = entry != null && entry.RequiresRecreate;
            payload["LeftSignature"] = entry == null ? String.Empty : (entry.LeftSignature ?? String.Empty);
            payload["RightSignature"] = entry == null ? String.Empty : (entry.RightSignature ?? String.Empty);
            result.Add(payload);
        }

        return result;
    }

    private static List<Dictionary<string, object>> BuildFieldDiffEntries(IList<AscetElementFieldDiff> values)
    {
        List<Dictionary<string, object>> result = new List<Dictionary<string, object>>();
        if (values == null)
        {
            return result;
        }

        for (int i = 0; i < values.Count; i++)
        {
            AscetElementFieldDiff entry = values[i];
            Dictionary<string, object> payload = new Dictionary<string, object>();
            payload["field"] = entry == null ? String.Empty : (entry.Field ?? String.Empty);
            payload["left"] = entry == null ? String.Empty : (entry.Left ?? String.Empty);
            payload["right"] = entry == null ? String.Empty : (entry.Right ?? String.Empty);
            payload["reason"] = entry == null ? String.Empty : (entry.Reason ?? String.Empty);
            result.Add(payload);
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
