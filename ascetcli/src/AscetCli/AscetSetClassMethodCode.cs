using System.Collections.Generic;
using System;
using System.IO;
using System.Text;
using System.Web.Script.Serialization;

public sealed class AscetSetClassMethodCodeArguments
{
    public string ClassPath { get; set; }
    public string MethodName { get; set; }
    public string CodeFilePath { get; set; }
    public bool VerifyReadback { get; set; }
    public bool EmitJson { get; set; }
}

public static class AscetSetClassMethodCode
{
    public static int Main(string[] args)
    {
        TextWriter originalOut = Console.Out;
        StringWriter suppressedOut = null;

        try
        {
            AscetSetClassMethodCodeArguments parsed = ParseArguments(args);
            if (parsed.EmitJson)
            {
                suppressedOut = new StringWriter();
                Console.SetOut(suppressedOut);
            }

            string code = ReadCodeFile(parsed.CodeFilePath);
            AscetToolApiBootstrap.ConfigureAssemblyResolution();
            ClassLocatorService locator = new ClassLocatorService();
            ClassWriteService writer = new ClassWriteService();
            AscetClassRef cls = locator.GetClass(parsed.ClassPath);
            AscetMethodWriteResult result = writer.SetMethodCode(cls, parsed.MethodName, code, parsed.VerifyReadback);
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

    public static AscetSetClassMethodCodeArguments ParseArguments(string[] args)
    {
        if (args == null || args.Length < 3)
        {
            throw new AscetReadException("invalid_argument", "parse_arguments", "usage: AscetCli.exe exec set_class_method_code <class-path> <method-name> <code-file> [--verify-readback] [--json]");
        }

        AscetSetClassMethodCodeArguments result = new AscetSetClassMethodCodeArguments
        {
            ClassPath = AscetReadClassSummary.NormalizeClassPath(args[0]),
            MethodName = String.IsNullOrWhiteSpace(args[1]) ? String.Empty : args[1].Trim(),
            CodeFilePath = String.IsNullOrWhiteSpace(args[2]) ? String.Empty : args[2].Trim(),
            VerifyReadback = false,
            EmitJson = false
        };

        if (String.IsNullOrWhiteSpace(result.MethodName))
        {
            throw new AscetReadException("invalid_argument", "parse_arguments", "Method name must not be empty.");
        }

        if (String.IsNullOrWhiteSpace(result.CodeFilePath))
        {
            throw new AscetReadException("invalid_argument", "parse_arguments", "Code file path must not be empty.");
        }

        for (int i = 3; i < args.Length; i++)
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

    public static string FormatTextOutput(AscetMethodWriteResult result)
    {
        StringBuilder builder = new StringBuilder();
        builder.Append("Class: ").Append(result == null ? String.Empty : (result.ComponentPath ?? String.Empty)).AppendLine();
        builder.Append("Method: ").Append(result == null ? String.Empty : (result.MethodName ?? String.Empty)).Append(" (").Append(result == null ? AscetMethodKind.Unknown.ToString() : result.MethodKind.ToString()).Append(")").AppendLine();
        builder.Append("PreviousCodeLength: ").Append(result == null ? 0 : result.PreviousCodeLength).AppendLine();
        builder.Append("NewCodeLength: ").Append(result == null ? 0 : result.NewCodeLength).AppendLine();
        builder.Append("WriteSucceeded: ").Append(result != null && result.WriteSucceeded).AppendLine();
        builder.Append("VerifyReadbackRequested: ").Append(result != null && result.VerifyReadbackRequested).AppendLine();
        builder.Append("ReadbackVerified: ").Append(result != null && result.ReadbackVerified).AppendLine();
        return builder.ToString();
    }

    public static string FormatJsonOutput(AscetMethodWriteResult result)
    {
        JavaScriptSerializer serializer = new JavaScriptSerializer();
        return AscetJsonContract.Serialize(BuildSerializableResult(result));
    }

    private static IDictionary<string, object> BuildSerializableResult(AscetMethodWriteResult result)
    {
        System.Collections.Generic.Dictionary<string, object> entry = new System.Collections.Generic.Dictionary<string, object>();
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
        return entry;
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
