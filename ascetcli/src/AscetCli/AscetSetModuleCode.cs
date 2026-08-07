using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
using System.Web.Script.Serialization;

public enum AscetSetModuleCodeOperation
{
    SetMethod = 1,
    SetHeader = 2,
    SetExternalCCode = 3
}

public sealed class AscetSetModuleCodeArguments
{
    public string ModulePath { get; set; }
    public AscetSetModuleCodeOperation Operation { get; set; }
    public string MethodName { get; set; }
    public string CodeFilePath { get; set; }
    public bool VerifyReadback { get; set; }
    public bool EmitJson { get; set; }
}

public static class AscetSetModuleCode
{
    public static int Main(string[] args)
    {
        TextWriter originalOut = Console.Out;
        StringWriter suppressedOut = null;

        try
        {
            AscetSetModuleCodeArguments parsed = ParseArguments(args);
            if (parsed.EmitJson)
            {
                suppressedOut = new StringWriter();
                Console.SetOut(suppressedOut);
            }

            string code = ReadCodeFile(parsed.CodeFilePath);
            AscetToolApiBootstrap.ConfigureAssemblyResolution();
            ComponentLocatorService locator = new ComponentLocatorService();
            ComponentWriteRouter router = new ComponentWriteRouter();
            AscetItemPath itemPath = AscetItemPath.Parse(parsed.ModulePath);
            AscetItemRef module = locator.FindItemInFolder(itemPath.ItemName, itemPath.FolderPath);
            string output;

            switch (parsed.Operation)
            {
                case AscetSetModuleCodeOperation.SetMethod:
                    AscetMethodWriteResult methodResult = router.SetMethodCode(module, parsed.MethodName, code, parsed.VerifyReadback);
                    output = parsed.EmitJson ? FormatMethodJsonOutput(parsed.Operation, methodResult) : FormatMethodTextOutput(parsed.Operation, methodResult);
                    break;
                case AscetSetModuleCodeOperation.SetHeader:
                    AscetTextCodeWriteResult headerResult = router.SetHeader(module, code, parsed.VerifyReadback);
                    output = parsed.EmitJson ? FormatTextCodeJsonOutput(parsed.Operation, headerResult) : FormatTextCodeTextOutput(parsed.Operation, headerResult);
                    break;
                case AscetSetModuleCodeOperation.SetExternalCCode:
                    AscetTextCodeWriteResult externalResult = router.SetExternalCCode(module, code, parsed.VerifyReadback);
                    output = parsed.EmitJson ? FormatTextCodeJsonOutput(parsed.Operation, externalResult) : FormatTextCodeTextOutput(parsed.Operation, externalResult);
                    break;
                default:
                    throw new AscetReadException("invalid_argument", "main", "Unsupported module write operation '" + parsed.Operation.ToString() + "'.");
            }

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

    public static AscetSetModuleCodeArguments ParseArguments(string[] args)
    {
        if (args == null || args.Length < 3)
        {
            throw new AscetReadException("invalid_argument", "parse_arguments", "usage: AscetCli.exe exec set_module_code <module-path> <set-method|set-header|set-external-c-code> <method-name?> <code-file> [--verify-readback] [--json]");
        }

        AscetSetModuleCodeOperation operation = ParseOperation(args[1]);
        AscetSetModuleCodeArguments result = new AscetSetModuleCodeArguments
        {
            ModulePath = NormalizeComponentPath(args[0]),
            Operation = operation,
            MethodName = String.Empty,
            CodeFilePath = String.Empty,
            VerifyReadback = false,
            EmitJson = false
        };

        int index = 2;
        switch (operation)
        {
            case AscetSetModuleCodeOperation.SetMethod:
                if (args.Length < 4)
                {
                    throw new AscetReadException("invalid_argument", "parse_arguments", "set-method expects <method-name> <code-file>.");
                }
                result.MethodName = NormalizeRequiredValue(args[index++], "Method name must not be empty.");
                result.CodeFilePath = NormalizeRequiredValue(args[index++], "Code file path must not be empty.");
                break;
            case AscetSetModuleCodeOperation.SetHeader:
            case AscetSetModuleCodeOperation.SetExternalCCode:
                result.CodeFilePath = NormalizeRequiredValue(args[index++], "Code file path must not be empty.");
                break;
            default:
                throw new AscetReadException("invalid_argument", "parse_arguments", "Unsupported module write operation '" + operation.ToString() + "'.");
        }

        for (int i = index; i < args.Length; i++)
        {
            string argument = args[i];
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

    public static AscetSetModuleCodeOperation ParseOperation(string value)
    {
        string normalized = NormalizeRequiredValue(value, "Operation must not be empty.").ToLowerInvariant();
        switch (normalized)
        {
            case "set-method":
                return AscetSetModuleCodeOperation.SetMethod;
            case "set-header":
                return AscetSetModuleCodeOperation.SetHeader;
            case "set-external-c-code":
                return AscetSetModuleCodeOperation.SetExternalCCode;
            default:
                throw new AscetReadException("invalid_argument", "parse_operation", "Unknown module write operation '" + value + "'.");
        }
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

        try
        {
            return File.ReadAllText(resolvedPath);
        }
        catch (Exception ex)
        {
            throw new AscetReadException("code_file_unreadable", "read_code_file", "Code file '" + codeFilePath + "' could not be read." + AscetArtifactPathResolver.FormatResolvedPathSuffix(codeFilePath, resolvedPath), ex);
        }
    }

    public static string FormatMethodTextOutput(AscetSetModuleCodeOperation operation, AscetMethodWriteResult result)
    {
        StringBuilder builder = new StringBuilder();
        builder.Append("Module: ").Append(result == null ? String.Empty : (result.ComponentPath ?? String.Empty)).AppendLine();
        builder.Append("Operation: ").Append(operation.ToString()).AppendLine();
        builder.Append("Method: ").Append(result == null ? String.Empty : (result.MethodName ?? String.Empty)).Append(" (").Append(result == null ? AscetMethodKind.Unknown.ToString() : result.MethodKind.ToString()).Append(")").AppendLine();
        builder.Append("PreviousCodeLength: ").Append(result == null ? 0 : result.PreviousCodeLength).AppendLine();
        builder.Append("NewCodeLength: ").Append(result == null ? 0 : result.NewCodeLength).AppendLine();
        builder.Append("WriteSucceeded: ").Append(result != null && result.WriteSucceeded).AppendLine();
        builder.Append("VerifyReadbackRequested: ").Append(result != null && result.VerifyReadbackRequested).AppendLine();
        builder.Append("ReadbackVerified: ").Append(result != null && result.ReadbackVerified).AppendLine();
        return builder.ToString();
    }

    public static string FormatTextCodeTextOutput(AscetSetModuleCodeOperation operation, AscetTextCodeWriteResult result)
    {
        StringBuilder builder = new StringBuilder();
        builder.Append("Module: ").Append(result == null ? String.Empty : (result.ComponentPath ?? String.Empty)).AppendLine();
        builder.Append("Operation: ").Append(operation.ToString()).AppendLine();
        builder.Append("WriteKind: ").Append(result == null ? AscetTextCodeWriteKind.Header.ToString() : result.WriteKind.ToString()).AppendLine();
        builder.Append("PreviousCodeLength: ").Append(result == null ? 0 : result.PreviousCodeLength).AppendLine();
        builder.Append("NewCodeLength: ").Append(result == null ? 0 : result.NewCodeLength).AppendLine();
        builder.Append("WriteSucceeded: ").Append(result != null && result.WriteSucceeded).AppendLine();
        builder.Append("VerifyReadbackRequested: ").Append(result != null && result.VerifyReadbackRequested).AppendLine();
        builder.Append("ReadbackVerified: ").Append(result != null && result.ReadbackVerified).AppendLine();
        return builder.ToString();
    }

    public static string FormatMethodJsonOutput(AscetSetModuleCodeOperation operation, AscetMethodWriteResult result)
    {
        JavaScriptSerializer serializer = new JavaScriptSerializer();
        Dictionary<string, object> entry = new Dictionary<string, object>();
        entry["Operation"] = operation.ToString();
        entry["ComponentPath"] = result == null ? String.Empty : (result.ComponentPath ?? String.Empty);
        entry["ComponentKind"] = result == null ? AscetComponentKind.Unknown.ToString() : result.ComponentKind.ToString();
        entry["LanguageKind"] = result == null ? AscetLanguageKind.Unknown.ToString() : result.LanguageKind.ToString();
        entry["MethodName"] = result == null ? String.Empty : (result.MethodName ?? String.Empty);
        entry["MethodKind"] = result == null ? AscetMethodKind.Unknown.ToString() : result.MethodKind.ToString();
        entry["PreviousCodeLength"] = result == null ? 0 : result.PreviousCodeLength;
        entry["NewCodeLength"] = result == null ? 0 : result.NewCodeLength;
        entry["WriteSucceeded"] = result != null && result.WriteSucceeded;
        entry["VerifyReadbackRequested"] = result != null && result.VerifyReadbackRequested;
        entry["ReadbackVerified"] = result != null && result.ReadbackVerified;
        return AscetJsonContract.Serialize(entry);
    }

    public static string FormatTextCodeJsonOutput(AscetSetModuleCodeOperation operation, AscetTextCodeWriteResult result)
    {
        JavaScriptSerializer serializer = new JavaScriptSerializer();
        Dictionary<string, object> entry = new Dictionary<string, object>();
        entry["Operation"] = operation.ToString();
        entry["ComponentPath"] = result == null ? String.Empty : (result.ComponentPath ?? String.Empty);
        entry["ComponentKind"] = result == null ? AscetComponentKind.Unknown.ToString() : result.ComponentKind.ToString();
        entry["LanguageKind"] = result == null ? AscetLanguageKind.Unknown.ToString() : result.LanguageKind.ToString();
        entry["WriteKind"] = result == null ? AscetTextCodeWriteKind.Header.ToString() : result.WriteKind.ToString();
        entry["PreviousCodeLength"] = result == null ? 0 : result.PreviousCodeLength;
        entry["NewCodeLength"] = result == null ? 0 : result.NewCodeLength;
        entry["WriteSucceeded"] = result != null && result.WriteSucceeded;
        entry["VerifyReadbackRequested"] = result != null && result.VerifyReadbackRequested;
        entry["ReadbackVerified"] = result != null && result.ReadbackVerified;
        return AscetJsonContract.Serialize(entry);
    }

    private static string NormalizeRequiredValue(string value, string message)
    {
        if (String.IsNullOrWhiteSpace(value))
        {
            throw new AscetReadException("invalid_argument", "parse_arguments", message);
        }

        return value.Trim();
    }

    public static string FormatException(Exception ex)
    {
        AscetReadException ascet = ex as AscetReadException;
        if (ascet != null)
        {
            return ascet.Code + ":" + ascet.Operation + ":" + ascet.Message;
        }

        return ex.GetType().FullName + ":" + ex.Message;
    }
}
