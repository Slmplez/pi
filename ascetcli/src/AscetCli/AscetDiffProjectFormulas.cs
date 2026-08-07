using System;
using System.Collections.Generic;
using System.IO;
using System.Text;

public sealed class AscetDiffProjectFormulasArguments
{
    public string LeftProjectPath { get; set; }
    public string RightProjectPath { get; set; }
    public bool EmitJson { get; set; }
    public bool ChangesOnly { get; set; }
}

public static class AscetDiffProjectFormulas
{
    public static int Main(string[] args)
    {
        TextWriter originalOut = Console.Out;
        StringWriter suppressedOut = null;

        try
        {
            AscetDiffProjectFormulasArguments arguments = ParseArguments(args);
            if (arguments.EmitJson)
            {
                suppressedOut = new StringWriter();
                Console.SetOut(suppressedOut);
            }

            AscetToolApiBootstrap.ConfigureAssemblyResolution();
            ProjectFormulaDiffService service = new ProjectFormulaDiffService();
            AscetProjectFormulaDiffResult diff = service.Diff(arguments.LeftProjectPath, arguments.RightProjectPath);
            string output = arguments.EmitJson ? FormatJsonOutput(diff, arguments.ChangesOnly) : FormatTextOutput(diff, arguments.ChangesOnly);

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

    public static AscetDiffProjectFormulasArguments ParseArguments(string[] args)
    {
        if (args == null || args.Length < 2)
        {
            throw new AscetReadException("invalid_argument", "parse_arguments", "usage: AscetCli.exe exec diff_project_formulas <left-project-path> <right-project-path> [--json] [--changes-only]");
        }

        AscetDiffProjectFormulasArguments result = new AscetDiffProjectFormulasArguments
        {
            LeftProjectPath = NormalizeProjectPath(args[0]),
            RightProjectPath = NormalizeProjectPath(args[1]),
            EmitJson = false,
            ChangesOnly = false
        };

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

    public static string FormatTextOutput(AscetProjectFormulaDiffResult diff, bool changesOnly)
    {
        if (diff == null)
        {
            throw new AscetReadException("invalid_argument", "format_text_output", "Project formula diff result must not be null.");
        }

        AscetProjectFormulaDiffResult view = BuildView(diff, changesOnly);
        StringBuilder builder = new StringBuilder();
        builder.Append("LeftProject: ").Append(view.LeftProjectPath ?? String.Empty).AppendLine();
        builder.Append("RightProject: ").Append(view.RightProjectPath ?? String.Empty).AppendLine();
        if (!changesOnly || HasFormulaRefs(view.AddedFormulas))
        {
            builder.Append("AddedFormulas: ").Append(view.AddedFormulas == null ? 0 : view.AddedFormulas.Count).AppendLine();
            AppendFormulaRefs(builder, view.AddedFormulas, "AddedFormula");
        }

        if (!changesOnly || HasFormulaRefs(view.RemovedFormulas))
        {
            builder.Append("RemovedFormulas: ").Append(view.RemovedFormulas == null ? 0 : view.RemovedFormulas.Count).AppendLine();
            AppendFormulaRefs(builder, view.RemovedFormulas, "RemovedFormula");
        }

        if (!changesOnly || HasModified(view.ModifiedFormulas))
        {
            builder.Append("ModifiedFormulas: ").Append(view.ModifiedFormulas == null ? 0 : view.ModifiedFormulas.Count).AppendLine();
            AppendModifiedFormulas(builder, view.ModifiedFormulas);
        }

        builder.Append("Summary: ").Append(view.Summary ?? String.Empty).AppendLine();
        return builder.ToString();
    }

    public static string FormatJsonOutput(AscetProjectFormulaDiffResult diff, bool changesOnly)
    {
        if (diff == null)
        {
            throw new AscetReadException("invalid_argument", "format_json_output", "Project formula diff result must not be null.");
        }

        AscetProjectFormulaDiffResult view = BuildView(diff, changesOnly);
        Dictionary<string, object> payload = new Dictionary<string, object>();
        payload["LeftProjectPath"] = view.LeftProjectPath ?? String.Empty;
        payload["RightProjectPath"] = view.RightProjectPath ?? String.Empty;
        if (!changesOnly || HasFormulaRefs(view.AddedFormulas))
        {
            payload["AddedFormulas"] = BuildFormulaEntries(view.AddedFormulas);
        }

        if (!changesOnly || HasFormulaRefs(view.RemovedFormulas))
        {
            payload["RemovedFormulas"] = BuildFormulaEntries(view.RemovedFormulas);
        }

        if (!changesOnly || HasModified(view.ModifiedFormulas))
        {
            payload["ModifiedFormulas"] = BuildModifiedEntries(view.ModifiedFormulas);
        }

        payload["Summary"] = view.Summary ?? String.Empty;
        return AscetJsonContract.Serialize(payload);
    }

    private static AscetProjectFormulaDiffResult BuildView(AscetProjectFormulaDiffResult diff, bool changesOnly)
    {
        return new AscetProjectFormulaDiffResult
        {
            LeftProjectPath = diff.LeftProjectPath ?? String.Empty,
            RightProjectPath = diff.RightProjectPath ?? String.Empty,
            AddedFormulas = CopyFormulaRefs(diff.AddedFormulas),
            RemovedFormulas = CopyFormulaRefs(diff.RemovedFormulas),
            ModifiedFormulas = CopyModified(diff.ModifiedFormulas),
            Summary = diff.Summary ?? String.Empty
        };
    }

    private static bool HasFormulaRefs(IList<AscetProjectFormulaRef> values)
    {
        return values != null && values.Count > 0;
    }

    private static bool HasModified(IList<AscetProjectFormulaModifiedDiff> values)
    {
        return values != null && values.Count > 0;
    }

    private static IList<AscetProjectFormulaRef> CopyFormulaRefs(IList<AscetProjectFormulaRef> values)
    {
        List<AscetProjectFormulaRef> result = new List<AscetProjectFormulaRef>();
        if (values == null)
        {
            return result;
        }

        for (int i = 0; i < values.Count; i++)
        {
            AscetProjectFormulaRef entry = values[i];
            result.Add(new AscetProjectFormulaRef
            {
                Name = entry == null ? String.Empty : (entry.Name ?? String.Empty),
                Type = entry == null ? String.Empty : (entry.Type ?? String.Empty),
                Unit = entry == null ? String.Empty : (entry.Unit ?? String.Empty),
                Comment = entry == null ? String.Empty : (entry.Comment ?? String.Empty),
                Contents = entry == null ? String.Empty : (entry.Contents ?? String.Empty),
                Parameters = CopyParameters(entry == null ? null : entry.Parameters)
            });
        }

        return result;
    }

    private static IList<AscetProjectFormulaModifiedDiff> CopyModified(IList<AscetProjectFormulaModifiedDiff> values)
    {
        List<AscetProjectFormulaModifiedDiff> result = new List<AscetProjectFormulaModifiedDiff>();
        if (values == null)
        {
            return result;
        }

        for (int i = 0; i < values.Count; i++)
        {
            AscetProjectFormulaModifiedDiff entry = values[i];
            result.Add(new AscetProjectFormulaModifiedDiff
            {
                Name = entry == null ? String.Empty : (entry.Name ?? String.Empty),
                ChangeKind = entry == null ? String.Empty : (entry.ChangeKind ?? String.Empty),
                LeftType = entry == null ? String.Empty : (entry.LeftType ?? String.Empty),
                RightType = entry == null ? String.Empty : (entry.RightType ?? String.Empty),
                LeftUnit = entry == null ? String.Empty : (entry.LeftUnit ?? String.Empty),
                RightUnit = entry == null ? String.Empty : (entry.RightUnit ?? String.Empty),
                LeftComment = entry == null ? String.Empty : (entry.LeftComment ?? String.Empty),
                RightComment = entry == null ? String.Empty : (entry.RightComment ?? String.Empty),
                LeftParameters = CopyParameters(entry == null ? null : entry.LeftParameters),
                RightParameters = CopyParameters(entry == null ? null : entry.RightParameters),
                FieldChanges = CopyStrings(entry == null ? null : entry.FieldChanges),
                LeftContents = entry == null ? String.Empty : (entry.LeftContents ?? String.Empty),
                RightContents = entry == null ? String.Empty : (entry.RightContents ?? String.Empty)
            });
        }

        return result;
    }

    private static IList<double> CopyParameters(IList<double> values)
    {
        List<double> result = new List<double>();
        if (values == null)
        {
            return result;
        }

        for (int i = 0; i < values.Count; i++)
        {
            result.Add(values[i]);
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

    private static IList<Dictionary<string, object>> BuildFormulaEntries(IList<AscetProjectFormulaRef> values)
    {
        List<Dictionary<string, object>> result = new List<Dictionary<string, object>>();
        if (values == null)
        {
            return result;
        }

        for (int i = 0; i < values.Count; i++)
        {
            AscetProjectFormulaRef entry = values[i];
            Dictionary<string, object> item = new Dictionary<string, object>();
            item["Name"] = entry == null ? String.Empty : (entry.Name ?? String.Empty);
            item["Type"] = entry == null ? String.Empty : (entry.Type ?? String.Empty);
            item["Unit"] = entry == null ? String.Empty : (entry.Unit ?? String.Empty);
            item["Comment"] = entry == null ? String.Empty : (entry.Comment ?? String.Empty);
            item["Contents"] = entry == null ? String.Empty : (entry.Contents ?? String.Empty);
            item["Parameters"] = CopyParameters(entry == null ? null : entry.Parameters);
            result.Add(item);
        }

        return result;
    }

    private static IList<Dictionary<string, object>> BuildModifiedEntries(IList<AscetProjectFormulaModifiedDiff> values)
    {
        List<Dictionary<string, object>> result = new List<Dictionary<string, object>>();
        if (values == null)
        {
            return result;
        }

        for (int i = 0; i < values.Count; i++)
        {
            AscetProjectFormulaModifiedDiff entry = values[i];
            Dictionary<string, object> item = new Dictionary<string, object>();
            item["Name"] = entry == null ? String.Empty : (entry.Name ?? String.Empty);
            item["ChangeKind"] = entry == null ? String.Empty : (entry.ChangeKind ?? String.Empty);
            item["LeftType"] = entry == null ? String.Empty : (entry.LeftType ?? String.Empty);
            item["RightType"] = entry == null ? String.Empty : (entry.RightType ?? String.Empty);
            item["LeftUnit"] = entry == null ? String.Empty : (entry.LeftUnit ?? String.Empty);
            item["RightUnit"] = entry == null ? String.Empty : (entry.RightUnit ?? String.Empty);
            item["LeftComment"] = entry == null ? String.Empty : (entry.LeftComment ?? String.Empty);
            item["RightComment"] = entry == null ? String.Empty : (entry.RightComment ?? String.Empty);
            item["LeftParameters"] = CopyParameters(entry == null ? null : entry.LeftParameters);
            item["RightParameters"] = CopyParameters(entry == null ? null : entry.RightParameters);
            item["FieldChanges"] = CopyStrings(entry == null ? null : entry.FieldChanges);
            item["LeftContents"] = entry == null ? String.Empty : (entry.LeftContents ?? String.Empty);
            item["RightContents"] = entry == null ? String.Empty : (entry.RightContents ?? String.Empty);
            result.Add(item);
        }

        return result;
    }

    private static void AppendFormulaRefs(StringBuilder builder, IList<AscetProjectFormulaRef> values, string label)
    {
        if (builder == null || values == null)
        {
            return;
        }

        for (int i = 0; i < values.Count; i++)
        {
            AscetProjectFormulaRef entry = values[i];
            if (entry == null)
            {
                continue;
            }

            builder.Append(label).Append(": ").Append(entry.Name ?? String.Empty)
                .Append(" [").Append(entry.Type ?? String.Empty).Append("]")
                .AppendLine();
        }
    }

    private static void AppendModifiedFormulas(StringBuilder builder, IList<AscetProjectFormulaModifiedDiff> values)
    {
        if (builder == null || values == null)
        {
            return;
        }

        for (int i = 0; i < values.Count; i++)
        {
            AscetProjectFormulaModifiedDiff entry = values[i];
            if (entry == null)
            {
                continue;
            }

            builder.Append("ModifiedFormula: ").Append(entry.Name ?? String.Empty)
                .Append(" Fields=").Append(Join(entry.FieldChanges))
                .AppendLine();
        }
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
