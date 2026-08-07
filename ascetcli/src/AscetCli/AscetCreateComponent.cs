using System;
using System.Collections.Generic;
using System.IO;
using System.Text;

public sealed class AscetCreateComponentArguments
{
    public string ComponentPath { get; set; }
    public AscetComponentKind ComponentKind { get; set; }
    public AscetLanguageKind LanguageKind { get; set; }
    public bool ReturnExisting { get; set; }
    public bool VerifyReadback { get; set; }
    public bool RollbackOnFailure { get; set; }
    public bool EmitJson { get; set; }
}

public static class AscetCreateComponent
{
    public static int Main(string[] args)
    {
        TextWriter originalOut = Console.Out;
        StringWriter suppressedOut = null;

        try
        {
            AscetCreateComponentArguments parsed = ParseArguments(args);
            if (parsed.EmitJson)
            {
                suppressedOut = new StringWriter();
                Console.SetOut(suppressedOut);
            }

            AscetToolApiBootstrap.ConfigureAssemblyResolution();
            ComponentCreateService service = new ComponentCreateService();
            AscetComponentCreateResult result = service.CreateComponent(
                parsed.ComponentPath,
                parsed.ComponentKind,
                parsed.LanguageKind,
                parsed.VerifyReadback,
                parsed.RollbackOnFailure,
                parsed.ReturnExisting);

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

    public static AscetCreateComponentArguments ParseArguments(string[] args)
    {
        if (args == null || args.Length < 1)
        {
            throw new AscetReadException("invalid_argument", "parse_arguments", "usage: AscetCli.exe exec create_component <component-path> --kind <class|module|statemachine> [--language <ESDL|BDE|C>] [--if-exists <fail|return-existing>] [--verify-readback] [--rollback-on-failure] [--json]");
        }

        AscetCreateComponentArguments result = new AscetCreateComponentArguments
        {
            ComponentPath = NormalizeComponentPath(args[0]),
            ComponentKind = AscetComponentKind.Unknown,
            LanguageKind = AscetLanguageKind.Unknown,
            ReturnExisting = false,
            VerifyReadback = false,
            RollbackOnFailure = false,
            EmitJson = false
        };

        for (int i = 1; i < args.Length; i++)
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

            if (String.Equals(argument, "--rollback-on-failure", StringComparison.OrdinalIgnoreCase))
            {
                result.RollbackOnFailure = true;
                continue;
            }

            if (String.Equals(argument, "--kind", StringComparison.OrdinalIgnoreCase))
            {
                if (i + 1 >= args.Length)
                {
                    throw new AscetReadException("invalid_argument", "parse_arguments", "Missing value after --kind.");
                }

                result.ComponentKind = AscetDatabaseExplorerCommon.ParseKind(args[++i]);
                continue;
            }

            if (String.Equals(argument, "--language", StringComparison.OrdinalIgnoreCase))
            {
                if (i + 1 >= args.Length)
                {
                    throw new AscetReadException("invalid_argument", "parse_arguments", "Missing value after --language.");
                }

                result.LanguageKind = ParseLanguage(args[++i]);
                continue;
            }

            if (String.Equals(argument, "--if-exists", StringComparison.OrdinalIgnoreCase))
            {
                if (i + 1 >= args.Length)
                {
                    throw new AscetReadException("invalid_argument", "parse_arguments", "Missing value after --if-exists.");
                }

                result.ReturnExisting = ParseIfExists(args[++i]);
                continue;
            }

            throw new AscetReadException("invalid_argument", "parse_arguments", "Unknown argument '" + argument + "'.");
        }

        if (result.ComponentKind == AscetComponentKind.Unknown)
        {
            throw new AscetReadException("invalid_argument", "parse_arguments", "--kind is required.");
        }

        if (result.ComponentKind != AscetComponentKind.StateMachine && result.LanguageKind == AscetLanguageKind.Unknown)
        {
            throw new AscetReadException("invalid_argument", "parse_arguments", "--language is required for class and module creation.");
        }

        return result;
    }

    internal static bool ParseIfExists(string value)
    {
        string normalized = (value ?? String.Empty).Trim().ToLowerInvariant();
        switch (normalized)
        {
            case "fail":
                return false;
            case "return-existing":
                return true;
            default:
                throw new AscetReadException("invalid_argument", "if_exists", "Unsupported --if-exists value '" + value + "'. Expected fail or return-existing.");
        }
    }

    private static AscetLanguageKind ParseLanguage(string value)
    {
        string normalized = (value ?? String.Empty).Trim().ToUpperInvariant();
        switch (normalized)
        {
            case "ESDL":
                return AscetLanguageKind.ESDL;
            case "BDE":
                return AscetLanguageKind.BDE;
            case "C":
                return AscetLanguageKind.C;
            default:
                throw new AscetReadException("invalid_argument", "language", "Unsupported language '" + value + "'. Expected ESDL, BDE, or C.");
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

    public static string FormatTextOutput(AscetComponentCreateResult result)
    {
        StringBuilder builder = new StringBuilder();
        builder.Append("Component: ").Append(result == null ? String.Empty : (result.ComponentPath ?? String.Empty)).AppendLine();
        builder.Append("Folder: ").Append(result == null ? String.Empty : (result.FolderPath ?? String.Empty)).AppendLine();
        builder.Append("Name: ").Append(result == null ? String.Empty : (result.ComponentName ?? String.Empty)).AppendLine();
        builder.Append("Kind: ").Append(result == null ? AscetComponentKind.Unknown.ToString() : result.ComponentKind.ToString()).AppendLine();
        builder.Append("Language: ").Append(result == null ? AscetLanguageKind.Unknown.ToString() : result.LanguageKind.ToString()).AppendLine();
        builder.Append("Created: ").Append(result != null && result.Created).AppendLine();
        builder.Append("AlreadyExisted: ").Append(result != null && result.AlreadyExisted).AppendLine();
        builder.Append("VerifyReadbackRequested: ").Append(result != null && result.VerifyReadbackRequested).AppendLine();
        builder.Append("RollbackOnFailureRequested: ").Append(result != null && result.RollbackOnFailureRequested).AppendLine();
        builder.Append("ReadbackVerified: ").Append(result != null && result.ReadbackVerified).AppendLine();
        builder.Append("Summary: ").Append(result == null ? String.Empty : (result.Summary ?? String.Empty)).AppendLine();
        return builder.ToString();
    }

    public static string FormatJsonOutput(AscetComponentCreateResult result)
    {
        Dictionary<string, object> payload = new Dictionary<string, object>();
        payload["componentPath"] = result == null ? String.Empty : (result.ComponentPath ?? String.Empty);
        payload["folderPath"] = result == null ? String.Empty : (result.FolderPath ?? String.Empty);
        payload["componentName"] = result == null ? String.Empty : (result.ComponentName ?? String.Empty);
        payload["kind"] = result == null ? "unknown" : AscetDatabaseExplorerCommon.KindToSchema(result.ComponentKind);
        payload["languageKind"] = result == null ? AscetLanguageKind.Unknown.ToString() : result.LanguageKind.ToString();
        payload["created"] = result != null && result.Created;
        payload["alreadyExisted"] = result != null && result.AlreadyExisted;
        payload["verifyReadbackRequested"] = result != null && result.VerifyReadbackRequested;
        payload["rollbackOnFailureRequested"] = result != null && result.RollbackOnFailureRequested;
        payload["readbackVerified"] = result != null && result.ReadbackVerified;
        payload["summary"] = result == null ? String.Empty : (result.Summary ?? String.Empty);
        payload["expectedDefaultScaffold"] = AscetComponentScaffoldMetadata.BuildExpectedDefaultScaffold(result);
        return AscetJsonContract.Serialize(payload);
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
