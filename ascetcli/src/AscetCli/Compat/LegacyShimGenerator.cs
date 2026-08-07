using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Text;

public enum LegacyShimTranslationMode
{
    None = 0,
    PromoteLeadingPositionalToOption = 1
}

public sealed class LegacyShimDefinition
{
    public string ProgramTypeName { get; set; }
    public string OutputFileName { get; set; }
    public string Subcommand { get; set; }
    public string Operation { get; set; }
    public LegacyShimTranslationMode TranslationMode { get; set; }
    public string PromotedOptionName { get; set; }
}

public static class LegacyShimGenerator
{
    public static LegacyShimDefinition[] GetShimDefinitions()
    {
        return new[]
        {
            new LegacyShimDefinition
            {
                ProgramTypeName = "AscetListFoldersLegacyShim",
                OutputFileName = "AscetListFolders.exe",
                Subcommand = "exec",
                Operation = "list_folders",
                TranslationMode = LegacyShimTranslationMode.PromoteLeadingPositionalToOption,
                PromotedOptionName = "--root"
            },
            new LegacyShimDefinition
            {
                ProgramTypeName = "AscetCreateComponentLegacyShim",
                OutputFileName = "AscetCreateComponent.exe",
                Subcommand = "exec",
                Operation = "create_component",
                TranslationMode = LegacyShimTranslationMode.None,
                PromotedOptionName = String.Empty
            }
        };
    }

    public static string GenerateSource(LegacyShimDefinition definition)
    {
        LegacyShimDefinition validated = ValidateDefinition(definition);
        string promotedOptionLiteral = "null";
        if (!String.IsNullOrWhiteSpace(validated.PromotedOptionName))
        {
            promotedOptionLiteral = "\"" + EscapeLiteral(validated.PromotedOptionName.Trim()) + "\"";
        }

        StringBuilder source = new StringBuilder();
        source.AppendLine("using System;");
        source.AppendLine();
        source.Append("public static class ").Append(validated.ProgramTypeName.Trim()).AppendLine();
        source.AppendLine("{");
        source.AppendLine("    [STAThread]");
        source.AppendLine("    public static int Main(string[] args)");
        source.AppendLine("    {");
        source.AppendLine("        return LegacyShimGenerator.Run(");
        source.AppendLine("            new LegacyShimDefinition");
        source.AppendLine("            {");
        source.Append("                ProgramTypeName = \"").Append(EscapeLiteral(validated.ProgramTypeName.Trim())).AppendLine("\",");
        source.Append("                OutputFileName = \"").Append(EscapeLiteral(validated.OutputFileName.Trim())).AppendLine("\",");
        source.Append("                Subcommand = \"").Append(EscapeLiteral(validated.Subcommand.Trim())).AppendLine("\",");
        source.Append("                Operation = \"").Append(EscapeLiteral(validated.Operation.Trim())).AppendLine("\",");
        source.Append("                TranslationMode = LegacyShimTranslationMode.").Append(validated.TranslationMode.ToString()).AppendLine(",");
        source.Append("                PromotedOptionName = ").Append(promotedOptionLiteral).AppendLine();
        source.AppendLine("            },");
        source.AppendLine("            args);");
        source.AppendLine("    }");
        source.AppendLine("}");
        return source.ToString();
    }

    public static int Run(LegacyShimDefinition definition, string[] args)
    {
        LegacyShimDefinition validated = ValidateDefinition(definition);
        string cliPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "AscetCli.exe");
        if (!File.Exists(cliPath))
        {
            Console.Error.WriteLine("AscetCli.exe was not found next to " + validated.OutputFileName + ".");
            return 1;
        }

        ProcessStartInfo startInfo = new ProcessStartInfo
        {
            FileName = cliPath,
            WorkingDirectory = Path.GetDirectoryName(cliPath),
            UseShellExecute = false,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            CreateNoWindow = true,
            Arguments = JoinArguments(BuildArgumentList(validated, args))
        };

        using (Process process = new Process())
        {
            process.StartInfo = startInfo;
            if (!process.Start())
            {
                Console.Error.WriteLine("Failed to start AscetCli.exe through " + validated.OutputFileName + ".");
                return 1;
            }

            string stdout = process.StandardOutput.ReadToEnd();
            string stderr = process.StandardError.ReadToEnd();
            if (!process.WaitForExit(30000))
            {
                TryKill(process);
                Console.Error.WriteLine("AscetCli.exe did not exit before the shim timeout.");
                return 1;
            }

            if (!String.IsNullOrEmpty(stdout))
            {
                Console.Out.Write(stdout);
            }

            if (!String.IsNullOrEmpty(stderr))
            {
                Console.Error.Write(stderr);
            }

            return process.ExitCode;
        }
    }

    private static string[] BuildArgumentList(LegacyShimDefinition definition, string[] args)
    {
        List<string> translated = new List<string>();
        translated.Add(definition.Subcommand ?? String.Empty);
        translated.Add(definition.Operation ?? String.Empty);
        AppendLegacyArguments(translated, definition, args);
        return translated.ToArray();
    }

    private static void AppendLegacyArguments(List<string> translated, LegacyShimDefinition definition, string[] args)
    {
        if (translated == null || definition == null || args == null || args.Length == 0)
        {
            return;
        }

        switch (definition.TranslationMode)
        {
            case LegacyShimTranslationMode.None:
                AppendArguments(translated, args, 0);
                return;
            case LegacyShimTranslationMode.PromoteLeadingPositionalToOption:
                AppendLeadingPositionalToOption(translated, args, definition.PromotedOptionName);
                return;
            default:
                throw new InvalidOperationException("Unsupported legacy shim translation mode '" + definition.TranslationMode.ToString() + "'.");
        }
    }

    private static void AppendLeadingPositionalToOption(List<string> translated, string[] args, string optionName)
    {
        if (translated == null || args == null || args.Length == 0)
        {
            return;
        }

        int startIndex = 0;
        string firstArgument = args[0] ?? String.Empty;
        if (!String.IsNullOrWhiteSpace(optionName) && !firstArgument.StartsWith("--", StringComparison.Ordinal))
        {
            translated.Add(optionName.Trim());
            translated.Add(firstArgument);
            startIndex = 1;
        }

        AppendArguments(translated, args, startIndex);
    }

    private static void AppendArguments(List<string> translated, string[] args, int startIndex)
    {
        if (translated == null || args == null)
        {
            return;
        }

        for (int i = startIndex; i < args.Length; i++)
        {
            translated.Add(args[i] ?? String.Empty);
        }
    }

    private static LegacyShimDefinition ValidateDefinition(LegacyShimDefinition definition)
    {
        if (definition == null)
        {
            throw new ArgumentNullException("definition");
        }

        if (String.IsNullOrWhiteSpace(definition.ProgramTypeName))
        {
            throw new ArgumentException("ProgramTypeName is required.", "definition");
        }

        if (String.IsNullOrWhiteSpace(definition.OutputFileName))
        {
            throw new ArgumentException("OutputFileName is required.", "definition");
        }

        if (String.IsNullOrWhiteSpace(definition.Subcommand))
        {
            throw new ArgumentException("Subcommand is required.", "definition");
        }

        if (String.IsNullOrWhiteSpace(definition.Operation))
        {
            throw new ArgumentException("Operation is required.", "definition");
        }

        return definition;
    }

    private static void TryKill(Process process)
    {
        if (process == null)
        {
            return;
        }

        try
        {
            process.Kill();
        }
        catch
        {
        }
    }

    private static string JoinArguments(string[] args)
    {
        if (args == null || args.Length == 0)
        {
            return String.Empty;
        }

        string[] quoted = new string[args.Length];
        for (int i = 0; i < args.Length; i++)
        {
            quoted[i] = QuoteArgument(args[i]);
        }

        return String.Join(" ", quoted);
    }

    private static string QuoteArgument(string value)
    {
        string argument = value ?? String.Empty;
        if (argument.IndexOfAny(new char[] { ' ', '\t', '"' }) < 0)
        {
            return argument;
        }

        return "\"" + argument.Replace("\\", "\\\\").Replace("\"", "\\\"") + "\"";
    }

    private static string EscapeLiteral(string value)
    {
        return (value ?? String.Empty).Replace("\\", "\\\\").Replace("\"", "\\\"");
    }
}
