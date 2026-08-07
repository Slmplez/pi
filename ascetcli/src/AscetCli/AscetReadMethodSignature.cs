using System;
using System.Collections.Generic;
using System.IO;
using System.Text;

public sealed class AscetReadMethodSignatureArguments
{
    public string ComponentPath { get; set; }
    public string MethodName { get; set; }
    public bool EmitJson { get; set; }
}

public static class AscetReadMethodSignature
{
    public static int Main(string[] args)
    {
        TextWriter originalOut = Console.Out;
        StringWriter suppressedOut = null;

        try
        {
            AscetReadMethodSignatureArguments arguments = ParseArguments(args);
            if (arguments.EmitJson)
            {
                suppressedOut = new StringWriter();
                Console.SetOut(suppressedOut);
            }

            AscetMethodSignatureSnapshot signature = ReadMethodSignature(arguments.ComponentPath, arguments.MethodName);
            string output = arguments.EmitJson ? FormatJsonOutput(signature) : FormatTextOutput(signature);

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

    public static AscetReadMethodSignatureArguments ParseArguments(string[] args)
    {
        if (args == null || args.Length < 2)
        {
            throw new AscetReadException("invalid_argument", "parse_arguments", "usage: AscetCli.exe exec read_method_signature <component-path> <method-name> [--json]");
        }

        AscetReadMethodSignatureArguments result = new AscetReadMethodSignatureArguments
        {
            ComponentPath = AscetReadMethodCode.NormalizeComponentPath(args[0]),
            MethodName = AscetReadMethodCode.NormalizeMethodName(args[1]),
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

            throw new AscetReadException("invalid_argument", "parse_arguments", "Unknown argument '" + argument + "'.");
        }

        return result;
    }

    public static string FormatTextOutput(AscetMethodSignatureSnapshot signature)
    {
        StringBuilder builder = new StringBuilder();
        builder.Append("Component: ").Append(signature == null ? String.Empty : (signature.ComponentPath ?? String.Empty)).AppendLine();
        builder.Append("ComponentKind: ").Append(signature == null ? AscetComponentKind.Unknown.ToString() : signature.ComponentKind.ToString()).AppendLine();
        builder.Append("LanguageKind: ").Append(signature == null ? AscetLanguageKind.Unknown.ToString() : signature.LanguageKind.ToString()).AppendLine();
        builder.Append("Method: ").Append(signature == null ? String.Empty : (signature.MethodName ?? String.Empty)).Append(" (")
            .Append(signature == null ? AscetMethodKind.Unknown.ToString() : signature.MethodKind.ToString()).Append(")").AppendLine();
        builder.Append("SupportsPrimitiveSignature: ").Append(signature != null && signature.SupportsPrimitiveSignature).AppendLine();
        if (signature != null && !String.IsNullOrWhiteSpace(signature.UnsupportedReason))
        {
            builder.Append("UnsupportedReason: ").Append(signature.UnsupportedReason).AppendLine();
        }

        AscetMethodSignatureElementSnapshot returnElement = signature == null ? null : signature.Return;
        builder.Append("Return: ");
        if (returnElement == null || !returnElement.Exists)
        {
            builder.Append("<none>").AppendLine();
        }
        else
        {
            builder.Append(returnElement.ModelType ?? String.Empty)
                .Append(" (")
                .Append(returnElement.ElementName ?? String.Empty)
                .Append(")")
                .AppendLine();
        }

        IList<AscetMethodSignatureElementSnapshot> arguments = signature == null ? null : signature.Arguments;
        builder.Append("Arguments: ").Append(arguments == null ? 0 : arguments.Count).AppendLine();
        if (arguments != null)
        {
            for (int i = 0; i < arguments.Count; i++)
            {
                AscetMethodSignatureElementSnapshot argument = arguments[i];
                if (argument == null)
                {
                    continue;
                }

                builder.Append("- ")
                    .Append(argument.Name ?? String.Empty)
                    .Append("::")
                    .Append(argument.ModelType ?? String.Empty)
                    .Append(" (")
                    .Append(argument.ElementName ?? String.Empty)
                    .Append(")")
                    .AppendLine();
            }
        }

        builder.Append("TargetKey: ").Append(signature == null ? String.Empty : (signature.TargetKey ?? String.Empty)).AppendLine();
        builder.Append("Summary: ").Append(signature == null ? String.Empty : (signature.Summary ?? String.Empty)).AppendLine();
        return builder.ToString();
    }

    public static string FormatJsonOutput(AscetMethodSignatureSnapshot signature)
    {
        return AscetJsonContract.Serialize(BuildPayload(signature));
    }

    public static Dictionary<string, object> BuildPayload(AscetMethodSignatureSnapshot signature)
    {
        return MethodSignatureService.BuildReadPayload(signature);
    }

    public static AscetMethodSignatureSnapshot ReadMethodSignature(string componentPath, string methodName)
    {
        AscetToolApiBootstrap.ConfigureAssemblyResolution();
        MethodSignatureService service = new MethodSignatureService();
        return service.ReadSignature(componentPath, methodName);
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
