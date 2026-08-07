using System;
using System.Collections.Generic;
using System.Text;

public static class AscetReadComponentCode
{
    public static int Main(string[] args)
    {
        try
        {
            if (args == null || args.Length != 1)
            {
                Console.Error.WriteLine("usage: AscetCli.exe exec read_component_code <component-path>");
                return 1;
            }

            string componentPath = NormalizeComponentPath(args[0]);
            AscetToolApiBootstrap.ConfigureAssemblyResolution();

            ComponentLocatorService locator = new ComponentLocatorService();
            DiagramCatalogService diagrams = new DiagramCatalogService();
            MethodCatalogService methods = new MethodCatalogService();
            TextCodeService textCode = new TextCodeService();

            AscetItemPath parsed = AscetItemPath.Parse(componentPath);
            AscetItemRef component = locator.FindItemInFolder(parsed.ItemName, parsed.FolderPath);

            Console.Write(FormatComponentSummary(component, diagrams.ListDiagrams(component), methods.ListMethods(component)));

            IList<AscetMethodCode> codes = methods.GetAllMethodCodes(component);
            for (int i = 0; i < codes.Count; i++)
            {
                Console.Write(FormatMethodCode(codes[i]));
            }

            if (component.LanguageKind == AscetLanguageKind.C)
            {
                Console.Write(FormatTextCode(textCode.GetTextCode(component)));
            }

            return 0;
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine(FormatException(ex));
            return 1;
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

    public static string FormatComponentSummary(AscetItemRef component, IList<AscetDiagramRef> diagrams, IList<AscetMethodRef> methods)
    {
        StringBuilder builder = new StringBuilder();
        builder.Append("Component: ").Append(component.Path).AppendLine();
        builder.Append("Kind: ").Append(component.Kind).AppendLine();
        builder.Append("Language: ").Append(component.LanguageKind).AppendLine();
        builder.Append("Diagrams: ").Append(diagrams.Count).AppendLine();

        for (int i = 0; i < diagrams.Count; i++)
        {
            builder.Append("  - ").Append(diagrams[i].DiagramKind).Append(": ").Append(diagrams[i].Name).AppendLine();
        }

        builder.Append("Methods: ").Append(methods.Count).AppendLine();
        for (int i = 0; i < methods.Count; i++)
        {
            builder.Append("  - ").Append(methods[i].MethodKind).Append(": ").Append(methods[i].Name).AppendLine();
        }

        builder.AppendLine();
        return builder.ToString();
    }

    public static string FormatMethodCode(AscetMethodCode code)
    {
        StringBuilder builder = new StringBuilder();
        builder.Append("=== Method: ").Append(code.MethodName).Append(" (").Append(code.MethodKind).Append(") ===").AppendLine();
        builder.AppendLine(code.Code ?? String.Empty);
        if (!String.IsNullOrEmpty(code.Code) && !code.Code.EndsWith(Environment.NewLine, StringComparison.Ordinal))
        {
            builder.AppendLine();
        }

        builder.AppendLine();
        return builder.ToString();
    }

    public static string FormatTextCode(AscetTextCode code)
    {
        StringBuilder builder = new StringBuilder();

        if (!String.IsNullOrEmpty(code.HeaderCode))
        {
            builder.AppendLine("=== Header Code ===");
            builder.AppendLine(code.HeaderCode);
            if (!code.HeaderCode.EndsWith(Environment.NewLine, StringComparison.Ordinal))
            {
                builder.AppendLine();
            }

            builder.AppendLine();
        }

        if (!String.IsNullOrEmpty(code.ExternalCCode))
        {
            builder.AppendLine("=== External C Code ===");
            builder.AppendLine(code.ExternalCCode);
            if (!code.ExternalCCode.EndsWith(Environment.NewLine, StringComparison.Ordinal))
            {
                builder.AppendLine();
            }

            builder.AppendLine();
        }

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
