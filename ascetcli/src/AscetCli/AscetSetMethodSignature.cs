using System;
using System.Collections.Generic;
using System.IO;
using System.Text;

public sealed class AscetSetMethodSignatureArguments
{
    public string ComponentPath { get; set; }
    public string MethodName { get; set; }
    public string ReturnType { get; set; }
    public AscetMethodReturnExistsBehavior IfReturnExists { get; set; }
    public string SignatureJsonPath { get; set; }
    public AscetMethodSignatureSpec SignatureSpec { get; set; }
    public bool VerifyReadback { get; set; }
    public bool EmitJson { get; set; }
}

public static class AscetSetMethodSignature
{
    public static int Main(string[] args)
    {
        TextWriter originalOut = Console.Out;
        StringWriter suppressedOut = null;

        try
        {
            AscetSetMethodSignatureArguments parsed = ParseArguments(args);
            if (parsed.EmitJson)
            {
                suppressedOut = new StringWriter();
                Console.SetOut(suppressedOut);
            }

            AscetToolApiBootstrap.ConfigureAssemblyResolution();
            MethodSignatureService service = new MethodSignatureService();
            AscetMethodSignatureResult result = service.ApplySignature(
                parsed.ComponentPath,
                parsed.MethodName,
                parsed.SignatureSpec,
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

    public static AscetSetMethodSignatureArguments ParseArguments(string[] args)
    {
        if (args == null || args.Length < 2)
        {
            throw new AscetReadException("invalid_argument", "parse_arguments", GetUsage());
        }

        AscetSetMethodSignatureArguments result = new AscetSetMethodSignatureArguments
        {
            ComponentPath = AscetReadMethodCode.NormalizeComponentPath(args[0]),
            MethodName = AscetReadMethodCode.NormalizeMethodName(args[1]),
            ReturnType = String.Empty,
            IfReturnExists = AscetMethodReturnExistsBehavior.Fail,
            SignatureJsonPath = String.Empty,
            SignatureSpec = new AscetMethodSignatureSpec(),
            VerifyReadback = false,
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

            if (String.Equals(argument, "--verify-readback", StringComparison.OrdinalIgnoreCase))
            {
                result.VerifyReadback = true;
                continue;
            }

            if (String.Equals(argument, "--return-type", StringComparison.OrdinalIgnoreCase))
            {
                if (i + 1 >= args.Length)
                {
                    throw new AscetReadException("invalid_argument", "parse_arguments", "Missing value after --return-type.");
                }

                result.ReturnType = MethodSignatureService.NormalizeReturnType(args[++i]);
                continue;
            }

            if (String.Equals(argument, "--signature-json", StringComparison.OrdinalIgnoreCase))
            {
                if (i + 1 >= args.Length)
                {
                    throw new AscetReadException("invalid_argument", "parse_arguments", "Missing value after --signature-json.");
                }

                result.SignatureJsonPath = NormalizeSignatureJsonPath(args[++i]);
                continue;
            }

            if (String.Equals(argument, "--if-return-exists", StringComparison.OrdinalIgnoreCase))
            {
                if (i + 1 >= args.Length)
                {
                    throw new AscetReadException("invalid_argument", "parse_arguments", "Missing value after --if-return-exists.");
                }

                result.IfReturnExists = MethodSignatureService.ParseIfReturnExists(args[++i]);
                continue;
            }

            throw new AscetReadException("invalid_argument", "parse_arguments", "Unknown argument '" + argument + "'.");
        }

        if (!String.IsNullOrWhiteSpace(result.SignatureJsonPath))
        {
            result.SignatureSpec = LoadSignatureSpecFromJsonFile(result.SignatureJsonPath);
        }

        if (!String.IsNullOrWhiteSpace(result.ReturnType))
        {
            result.SignatureSpec.ReturnType = result.ReturnType;
        }

        if (!String.IsNullOrWhiteSpace(result.ReturnType) || HasReturnPolicyOverride(args))
        {
            result.SignatureSpec.IfReturnExists = result.IfReturnExists;
        }

        if (String.IsNullOrWhiteSpace(result.SignatureSpec.ReturnType) &&
            (result.SignatureSpec.Arguments == null || result.SignatureSpec.Arguments.Count == 0))
        {
            throw new AscetReadException("invalid_argument", "parse_arguments", "--return-type or --signature-json with returnType/arguments is required.");
        }

        return result;
    }

    public static string FormatTextOutput(AscetMethodSignatureResult result)
    {
        StringBuilder builder = new StringBuilder();
        builder.Append("Component: ").Append(result == null ? String.Empty : (result.ComponentPath ?? String.Empty)).AppendLine();
        builder.Append("Method: ").Append(result == null ? String.Empty : (result.MethodName ?? String.Empty)).Append(" (").Append(result == null ? AscetMethodKind.Unknown.ToString() : result.MethodKind.ToString()).Append(")").AppendLine();
        builder.Append("ReturnType: ").Append(result == null ? String.Empty : (result.ReturnType ?? String.Empty)).AppendLine();
        builder.Append("ReturnCreated: ").Append(result != null && result.ReturnCreated).AppendLine();
        builder.Append("ReturnReplaced: ").Append(result != null && result.ReturnReplaced).AppendLine();
        builder.Append("ReturnAlreadyExisted: ").Append(result != null && result.ReturnAlreadyExisted).AppendLine();
        builder.Append("VerifyReadbackRequested: ").Append(result != null && result.VerifyReadbackRequested).AppendLine();
        builder.Append("ReadbackVerified: ").Append(result != null && result.ReadbackVerified).AppendLine();
        builder.Append("ReturnElementName: ").Append(result == null ? String.Empty : (result.ReturnElementName ?? String.Empty)).AppendLine();
        builder.Append("ReturnElementModelType: ").Append(result == null ? String.Empty : (result.ReturnElementModelType ?? String.Empty)).AppendLine();
        builder.Append("Arguments: ").Append(result == null || result.Arguments == null ? 0 : result.Arguments.Count).AppendLine();
        if (result != null && result.Arguments != null)
        {
            for (int i = 0; i < result.Arguments.Count; i++)
            {
                AscetMethodArgumentResult argument = result.Arguments[i];
                if (argument == null)
                {
                    continue;
                }

                builder.Append("- ")
                    .Append(argument.Name ?? String.Empty)
                    .Append("::")
                    .Append(argument.Type ?? String.Empty)
                    .Append(" ReadbackVerified=")
                    .Append(argument.ReadbackVerified)
                    .AppendLine();
            }
        }
        builder.Append("TargetKey: ").Append(result == null ? String.Empty : (result.TargetKey ?? String.Empty)).AppendLine();
        builder.Append("Summary: ").Append(result == null ? String.Empty : (result.Summary ?? String.Empty)).AppendLine();
        return builder.ToString();
    }

    public static string FormatJsonOutput(AscetMethodSignatureResult result)
    {
        return AscetJsonContract.Serialize(MethodSignatureService.BuildPayload(result));
    }

    private static string GetUsage()
    {
        return "usage: AscetCli.exe exec set_method_signature <component-path> <method-name> [--return-type <cont|sdisc|udisc|log> [--if-return-exists <fail|keep|replace>]] [--signature-json <file>] [--verify-readback] [--json]";
    }

    private static string NormalizeSignatureJsonPath(string path)
    {
        if (String.IsNullOrWhiteSpace(path))
        {
            throw new AscetReadException("invalid_argument", "parse_arguments", "Signature JSON path must not be empty.");
        }

        return path.Trim();
    }

    private static bool HasReturnPolicyOverride(string[] args)
    {
        if (args == null)
        {
            return false;
        }

        for (int i = 0; i < args.Length; i++)
        {
            if (String.Equals(args[i], "--if-return-exists", StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }
        }

        return false;
    }

    private static AscetMethodSignatureSpec LoadSignatureSpecFromJsonFile(string path)
    {
        if (!File.Exists(path))
        {
            throw new AscetReadException("signature_json_not_found", "set_method_signature", "Signature JSON file '" + path + "' was not found.");
        }

        Dictionary<string, object> payload = AscetJsonContract.DeserializeObject(File.ReadAllText(path));
        return MethodSignatureService.ParseSignatureSpec(payload);
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
