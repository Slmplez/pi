using System;
using System.IO;
using System.Text;

public sealed class AscetSetMethodCodeArguments
{
    public string ComponentPath { get; set; }
    public string MethodName { get; set; }
    public string CodeFilePath { get; set; }
    public bool VerifyReadback { get; set; }
}

public static class AscetSetMethodCode
{
    public static int Main(string[] args)
    {
        try
        {
            AscetSetMethodCodeArguments parsed = ParseArguments(args);
            string code = ReadCodeFile(parsed.CodeFilePath);

            AscetToolApiBootstrap.ConfigureAssemblyResolution();

            ComponentLocatorService locator = new ComponentLocatorService();
            MethodWriteService writer = new MethodWriteService();

            AscetItemPath itemPath = AscetItemPath.Parse(parsed.ComponentPath);
            AscetItemRef component = locator.FindItemInFolder(itemPath.ItemName, itemPath.FolderPath);
            AscetMethodWriteResult result = writer.SetMethodCode(component, parsed.MethodName, code, parsed.VerifyReadback);

            Console.Write(FormatResult(result));
            return 0;
        }
        catch (AscetReadException ex)
        {
            Console.Error.WriteLine("usage: AscetCli.exe exec set_method_code <component-path> <method-name> <code-file> [--verify-readback]");
            Console.Error.WriteLine();
            Console.Error.WriteLine(FormatException(ex));
            return 1;
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine(FormatException(ex));
            return 1;
        }
    }

    public static AscetSetMethodCodeArguments ParseArguments(string[] args)
    {
        if (args == null || args.Length < 3 || args.Length > 4)
        {
            throw new AscetReadException(
                "invalid_argument",
                "parse_arguments",
                "Expected <component-path> <method-name> <code-file> [--verify-readback].");
        }

        bool verifyReadback = false;
        if (args.Length == 4)
        {
            if (!String.Equals(args[3], "--verify-readback", StringComparison.Ordinal))
            {
                throw new AscetReadException(
                    "invalid_argument",
                    "parse_arguments",
                    "Unknown flag '" + args[3] + "'. Only '--verify-readback' is supported.");
            }

            verifyReadback = true;
        }

        if (String.IsNullOrWhiteSpace(args[1]))
        {
            throw new AscetReadException("invalid_argument", "parse_arguments", "Method name must not be empty.");
        }

        if (String.IsNullOrWhiteSpace(args[2]))
        {
            throw new AscetReadException("invalid_argument", "parse_arguments", "Code file path must not be empty.");
        }

        return new AscetSetMethodCodeArguments
        {
            ComponentPath = NormalizeComponentPath(args[0]),
            MethodName = args[1].Trim(),
            CodeFilePath = args[2].Trim(),
            VerifyReadback = verifyReadback
        };
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

    public static string ReadCodeFile(string codeFilePath)
    {
        if (String.IsNullOrWhiteSpace(codeFilePath))
        {
            throw new AscetReadException("invalid_argument", "read_code_file", "Code file path must not be empty.");
        }

        string resolvedPath = AscetArtifactPathResolver.ResolveReadableFilePath(codeFilePath);
        if (!File.Exists(resolvedPath))
        {
            throw new AscetReadException("code_file_not_found", "read_code_file", "Code file '" + codeFilePath + "' was not found." + AscetArtifactPathResolver.FormatResolvedPathSuffix(codeFilePath, resolvedPath));
        }

        string code;
        try
        {
            code = File.ReadAllText(resolvedPath);
        }
        catch (Exception ex)
        {
            throw new AscetReadException("code_file_unreadable", "read_code_file", "Code file '" + codeFilePath + "' could not be read." + AscetArtifactPathResolver.FormatResolvedPathSuffix(codeFilePath, resolvedPath), ex);
        }

        if (String.IsNullOrWhiteSpace(code))
        {
            throw new AscetReadException("invalid_code_file", "read_code_file", "Code file '" + codeFilePath + "' must not be empty.");
        }

        return code;
    }

    public static string FormatResult(AscetMethodWriteResult result)
    {
        StringBuilder builder = new StringBuilder();
        builder.Append("Component: ").Append(result.ComponentPath).AppendLine();
        builder.Append("Method: ").Append(result.MethodName).Append(" (").Append(result.MethodKind).Append(")").AppendLine();
        builder.Append("PreviousCodeLength: ").Append(result.PreviousCodeLength).AppendLine();
        builder.Append("NewCodeLength: ").Append(result.NewCodeLength).AppendLine();
        builder.Append("WriteSucceeded: ").Append(result.WriteSucceeded).AppendLine();
        builder.Append("VerifyReadbackRequested: ").Append(result.VerifyReadbackRequested).AppendLine();
        builder.Append("ReadbackVerified: ").Append(result.ReadbackVerified).AppendLine();
        return builder.ToString();
    }

    public static string FormatException(Exception ex)
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
