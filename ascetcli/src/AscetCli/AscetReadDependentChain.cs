using System;
using System.IO;
using System.Text;

public sealed class AscetReadDependentChainArguments
{
    public string ComponentPath { get; set; }
    public string DependentElementName { get; set; }
    public string ExporterComponentPath { get; set; }
    public string ProviderScopePath { get; set; }
    public int MaxCandidates { get; set; }
    public string DebugDirectory { get; set; }
    public bool KeepTemp { get; set; }
    public bool EmitJson { get; set; }
}

public static class AscetReadDependentChain
{
    public static int Main(string[] args)
    {
        TextWriter originalOut = Console.Out;
        StringWriter suppressedOut = null;

        try
        {
            AscetReadDependentChainArguments parsed = ParseArguments(args);
            if (parsed.EmitJson)
            {
                suppressedOut = new StringWriter();
                Console.SetOut(suppressedOut);
            }

            AscetToolApiBootstrap.ConfigureAssemblyResolution();
            AscetDependentChainReadService service = new AscetDependentChainReadService();
            AscetDependentChainReadResult result = service.Read(new AscetDependentChainReadRequest
            {
                ComponentPath = parsed.ComponentPath,
                DependentElementName = parsed.DependentElementName,
                ExporterComponentPath = parsed.ExporterComponentPath,
                ProviderScopePath = parsed.ProviderScopePath,
                MaxCandidates = parsed.MaxCandidates,
                DebugDirectory = parsed.DebugDirectory,
                KeepTemp = parsed.KeepTemp
            });

            string output = parsed.EmitJson
                ? AscetDependentChainOutput.FormatJsonOutput(result)
                : AscetDependentChainOutput.FormatTextOutput(result);

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

    public static AscetReadDependentChainArguments ParseArguments(string[] args)
    {
        if (args == null || args.Length < 2)
        {
            throw new AscetReadException("invalid_argument", "parse_arguments", "usage: AscetReadDependentChain.exe <component> <dependent-element> [--exporter <exporter-component>] [--provider-scope <scope-path>] [--max-candidates <n>] [--json] [--keep-temp] [--debug-dir <dir>]");
        }

        AscetReadDependentChainArguments result = new AscetReadDependentChainArguments
        {
            ComponentPath = NormalizeComponentPath(args[0]),
            DependentElementName = NormalizeElementName(args[1]),
            ExporterComponentPath = String.Empty,
            ProviderScopePath = String.Empty,
            MaxCandidates = 200,
            DebugDirectory = String.Empty,
            KeepTemp = false,
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

            if (String.Equals(argument, "--keep-temp", StringComparison.OrdinalIgnoreCase))
            {
                result.KeepTemp = true;
                continue;
            }

            if (String.Equals(argument, "--exporter", StringComparison.OrdinalIgnoreCase))
            {
                if (i + 1 >= args.Length)
                {
                    throw new AscetReadException("invalid_argument", "parse_arguments", "Missing value after --exporter.");
                }

                result.ExporterComponentPath = NormalizeComponentPath(args[++i]);
                continue;
            }

            if (String.Equals(argument, "--provider-scope", StringComparison.OrdinalIgnoreCase))
            {
                if (i + 1 >= args.Length)
                {
                    throw new AscetReadException("invalid_argument", "parse_arguments", "Missing value after --provider-scope.");
                }

                result.ProviderScopePath = NormalizeOptionalPath(args[++i]);
                continue;
            }

            if (String.Equals(argument, "--max-candidates", StringComparison.OrdinalIgnoreCase))
            {
                if (i + 1 >= args.Length)
                {
                    throw new AscetReadException("invalid_argument", "parse_arguments", "Missing value after --max-candidates.");
                }

                result.MaxCandidates = NormalizeMaxCandidates(args[++i]);
                continue;
            }

            if (String.Equals(argument, "--debug-dir", StringComparison.OrdinalIgnoreCase))
            {
                if (i + 1 >= args.Length)
                {
                    throw new AscetReadException("invalid_argument", "parse_arguments", "Missing value after --debug-dir.");
                }

                result.DebugDirectory = args[++i] == null ? String.Empty : args[i].Trim();
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

    public static string NormalizeOptionalPath(string path)
    {
        if (String.IsNullOrWhiteSpace(path))
        {
            throw new AscetReadException("invalid_argument", "normalize_path", "Path must not be empty.");
        }

        string normalized = path.Trim().Replace('/', '\\');
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
            throw new AscetReadException("invalid_argument", "normalize_path", "Path must contain a name.");
        }

        return normalized;
    }

    public static int NormalizeMaxCandidates(string value)
    {
        int parsed;
        if (!Int32.TryParse(value, out parsed) || parsed < 1)
        {
            throw new AscetReadException("invalid_argument", "max_candidates", "Max candidates must be a positive integer.");
        }

        return parsed;
    }

    public static string NormalizeElementName(string elementName)
    {
        if (String.IsNullOrWhiteSpace(elementName))
        {
            throw new AscetReadException("invalid_argument", "normalize_element_name", "Dependent element name must not be empty.");
        }

        return elementName.Trim();
    }

    public static string FormatException(Exception ex)
    {
        StringBuilder builder = new StringBuilder();
        int depth = 0;
        while (ex != null)
        {
            AscetReadException ascet = ex as AscetReadException;
            builder.Append("Exception[").Append(depth).Append("]: ").Append(ex.GetType().FullName).AppendLine();
            if (ascet != null)
            {
                builder.Append("Code: ").Append(ascet.Code ?? String.Empty).AppendLine();
                builder.Append("Operation: ").Append(ascet.Operation ?? String.Empty).AppendLine();
            }
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
