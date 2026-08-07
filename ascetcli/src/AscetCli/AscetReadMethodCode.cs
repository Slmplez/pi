using System;
using System.Collections.Generic;
using System.IO;
using System.Text;

public sealed class AscetReadMethodCodeArguments
{
    public string ComponentPath { get; set; }
    public string MethodName { get; set; }
    public bool EmitJson { get; set; }
}

public static class AscetReadMethodCode
{
    public static int Main(string[] args)
    {
        TextWriter originalOut = Console.Out;
        StringWriter suppressedOut = null;

        try
        {
            AscetReadMethodCodeArguments arguments = ParseArguments(args);
            if (arguments.EmitJson)
            {
                suppressedOut = new StringWriter();
                Console.SetOut(suppressedOut);
            }

            AscetMethodCode methodCode = ReadMethodCode(arguments.ComponentPath, arguments.MethodName);

            string output = arguments.EmitJson
                ? FormatJsonOutput(methodCode)
                : FormatTextOutput(methodCode);

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

    public static AscetReadMethodCodeArguments ParseArguments(string[] args)
    {
        if (args == null || args.Length < 2)
        {
            throw new AscetReadException("invalid_argument", "parse_arguments", "usage: AscetCli.exe exec read_method_code <component-path> <method-name> [--json]");
        }

        AscetReadMethodCodeArguments result = new AscetReadMethodCodeArguments
        {
            ComponentPath = NormalizeComponentPath(args[0]),
            MethodName = NormalizeMethodName(args[1]),
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

    public static string FormatTextOutput(AscetMethodCode methodCode)
    {
        StringBuilder builder = new StringBuilder();
        builder.Append("Component: ").Append(methodCode == null ? String.Empty : (methodCode.ComponentPath ?? String.Empty)).AppendLine();
        builder.Append("ComponentKind: ").Append(methodCode == null ? AscetComponentKind.Unknown.ToString() : methodCode.ComponentKind.ToString()).AppendLine();
        builder.Append("LanguageKind: ").Append(methodCode == null ? AscetLanguageKind.Unknown.ToString() : methodCode.LanguageKind.ToString()).AppendLine();
        builder.Append("Method: ").Append(methodCode == null ? String.Empty : (methodCode.MethodName ?? String.Empty)).Append(" (")
            .Append(methodCode == null ? AscetMethodKind.Unknown.ToString() : methodCode.MethodKind.ToString()).Append(")").AppendLine();
        builder.AppendLine("Code:");
        builder.Append(methodCode == null ? String.Empty : (methodCode.Code ?? String.Empty));
        if (methodCode != null && !String.IsNullOrEmpty(methodCode.Code) && !methodCode.Code.EndsWith(Environment.NewLine, StringComparison.Ordinal))
        {
            builder.AppendLine();
        }

        return builder.ToString();
    }

    public static string FormatJsonOutput(AscetMethodCode methodCode)
    {
        return AscetJsonContract.Serialize(BuildPayload(methodCode));
    }

    public static Dictionary<string, object> BuildPayload(AscetMethodCode methodCode)
    {
        Dictionary<string, object> payload = new Dictionary<string, object>();
        payload["componentPath"] = methodCode == null ? String.Empty : (methodCode.ComponentPath ?? String.Empty);
        payload["componentKind"] = methodCode == null ? AscetComponentKind.Unknown.ToString() : methodCode.ComponentKind.ToString();
        payload["languageKind"] = methodCode == null ? AscetLanguageKind.Unknown.ToString() : methodCode.LanguageKind.ToString();
        payload["methodName"] = methodCode == null ? String.Empty : (methodCode.MethodName ?? String.Empty);
        payload["methodKind"] = methodCode == null ? AscetMethodKind.Unknown.ToString() : methodCode.MethodKind.ToString();
        payload["code"] = methodCode == null ? String.Empty : (methodCode.Code ?? String.Empty);
        return payload;
    }

    public static AscetMethodCode ReadMethodCode(string componentPath, string methodName)
    {
        AscetToolApiBootstrap.ConfigureAssemblyResolution();
        ComponentLocatorService locator = new ComponentLocatorService();
        MethodCatalogService methods = new MethodCatalogService();

        AscetItemPath parsed = AscetItemPath.Parse(componentPath);
        AscetItemRef component = locator.FindItemInFolder(parsed.ItemName, parsed.FolderPath);
        return methods.GetMethodCode(component, methodName);
    }

    public static string NormalizeComponentPath(string componentPath)
    {
        return MethodReadService.NormalizeComponentPath(componentPath);
    }

    public static string NormalizeMethodName(string methodName)
    {
        if (String.IsNullOrWhiteSpace(methodName))
        {
            throw new AscetReadException("invalid_argument", "normalize_method_name", "Method name must not be empty.");
        }

        return methodName.Trim();
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
