using System;
using System.Collections.Generic;
using System.IO;
using System.Text;

public sealed class AscetListMethodsArguments
{
    public string ComponentPath { get; set; }
    public bool EmitJson { get; set; }
}

public static class AscetListMethods
{
    public static int Main(string[] args)
    {
        TextWriter originalOut = Console.Out;
        StringWriter suppressedOut = null;
        MethodReadService service = new MethodReadService();

        try
        {
            AscetListMethodsArguments arguments = ParseArguments(args);
            if (arguments.EmitJson)
            {
                suppressedOut = new StringWriter();
                Console.SetOut(suppressedOut);
            }

            AscetToolApiBootstrap.ConfigureAssemblyResolution();
            MethodReadResponse response = service.ReadCurrentDatabase(ToRequest(arguments));

            string output = arguments.EmitJson
                ? AscetJsonContract.Serialize(response.Payload)
                : FormatTextOutput(response.Component, response.Methods);

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

    public static AscetListMethodsArguments ParseArguments(string[] args)
    {
        MethodReadService service = new MethodReadService();
        MethodReadRequest request = service.ParseExecArguments(args);
        AscetListMethodsArguments result = new AscetListMethodsArguments();
        result.ComponentPath = request.ComponentPath;
        result.EmitJson = HasJsonFlag(args);
        return result;
    }

    public static string FormatTextOutput(AscetItemRef component, IList<AscetMethodRef> methods)
    {
        StringBuilder builder = new StringBuilder();
        builder.Append("Component: ").Append(component == null ? String.Empty : (component.Path ?? String.Empty)).AppendLine();
        builder.Append("Kind: ").Append(component == null ? AscetComponentKind.Unknown.ToString() : component.Kind.ToString()).AppendLine();
        builder.Append("Language: ").Append(component == null ? AscetLanguageKind.Unknown.ToString() : component.LanguageKind.ToString()).AppendLine();
        builder.Append("Methods: ").Append(methods == null ? 0 : methods.Count).AppendLine();

        if (methods != null)
        {
            for (int i = 0; i < methods.Count; i++)
            {
                AscetMethodRef method = methods[i];
                if (method == null)
                {
                    continue;
                }

                builder.Append("- ")
                    .Append(method.Name ?? String.Empty)
                    .Append(" [")
                    .Append(method.MethodKind.ToString())
                    .Append("]")
                    .AppendLine();
            }
        }

        return builder.ToString();
    }

    public static string FormatJsonOutput(AscetItemRef component, IList<AscetMethodRef> methods)
    {
        MethodReadService service = new MethodReadService();
        return AscetJsonContract.Serialize(service.BuildPayload(component, methods));
    }

    public static string NormalizeComponentPath(string componentPath)
    {
        return MethodReadService.NormalizeComponentPath(componentPath);
    }

    private static bool HasJsonFlag(string[] args)
    {
        if (args == null)
        {
            return false;
        }

        for (int i = 0; i < args.Length; i++)
        {
            if (String.Equals(args[i], "--json", StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }
        }

        return false;
    }

    private static MethodReadRequest ToRequest(AscetListMethodsArguments arguments)
    {
        MethodReadRequest request = new MethodReadRequest();
        if (arguments != null)
        {
            request.ComponentPath = arguments.ComponentPath ?? String.Empty;
        }

        return request;
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
