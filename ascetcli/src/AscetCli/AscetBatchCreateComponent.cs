using System;
using System.Collections.Generic;
using System.IO;
using System.Web.Script.Serialization;

public sealed class BatchCreateComponentRequest
{
    public string ComponentPath { get; set; }
    public string Kind { get; set; }
    public string Language { get; set; }
    public bool ReturnExisting { get; set; }
    public bool VerifyReadback { get; set; }
}

public sealed class BatchCreateComponentResult
{
    public string ComponentPath { get; set; }
    public string FolderPath { get; set; }
    public string ComponentName { get; set; }
    public string Kind { get; set; }
    public string Language { get; set; }
    public bool Created { get; set; }
    public bool AlreadyExisted { get; set; }
    public bool ReadbackVerified { get; set; }
    public string Error { get; set; }
}

public static class AscetBatchCreateComponent
{
    public static int Main(string[] args)
    {
        try
        {
            // Read JSON array from stdin
            string json = Console.In.ReadToEnd();

            if (String.IsNullOrWhiteSpace(json))
            {
                Console.Error.WriteLine("Error: No input provided. Expected JSON array via stdin.");
                Console.Error.WriteLine("Usage: AscetBatchCreateComponent.exe < requests.json");
                return 1;
            }

            List<BatchCreateComponentRequest> requests;
            try
            {
                JavaScriptSerializer serializer = new JavaScriptSerializer();
                requests = serializer.Deserialize<List<BatchCreateComponentRequest>>(json);
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine("Error: Failed to parse JSON input.");
                Console.Error.WriteLine(ex.Message);
                return 1;
            }

            if (requests == null || requests.Count == 0)
            {
                Console.Error.WriteLine("Error: Empty request array.");
                return 1;
            }

            AscetToolApiBootstrap.ConfigureAssemblyResolution();

            // Process all requests in a single ToolAPI session
            List<BatchCreateComponentResult> results = ProcessBatchRequests(requests);

            // Output results as JSON
            JavaScriptSerializer outputSerializer = new JavaScriptSerializer();
            string output = outputSerializer.Serialize(results);
            Console.WriteLine(output);

            // Return non-zero if any operation failed
            bool anyFailed = results.Exists(r => !r.Created && !r.AlreadyExisted);
            return anyFailed ? 2 : 0;
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine("Fatal error in batch operation:");
            Console.Error.WriteLine(FormatException(ex));
            return 1;
        }
    }

    private static List<BatchCreateComponentResult> ProcessBatchRequests(List<BatchCreateComponentRequest> requests)
    {
        List<BatchCreateComponentResult> results = new List<BatchCreateComponentResult>();
        ComponentCreateService service = new ComponentCreateService();

        foreach (BatchCreateComponentRequest req in requests)
        {
            BatchCreateComponentResult result = new BatchCreateComponentResult
            {
                ComponentPath = req.ComponentPath,
                Created = false,
                AlreadyExisted = false,
                ReadbackVerified = false
            };

            try
            {
                // Parse kind and language
                AscetComponentKind kind = ParseKind(req.Kind);
                AscetLanguageKind language = ParseLanguage(req.Language);

                // Normalize component path
                string normalizedPath = NormalizeComponentPath(req.ComponentPath);

                // Create component
                AscetComponentCreateResult createResult = service.CreateComponent(
                    normalizedPath,
                    kind,
                    language,
                    req.VerifyReadback,
                    false, // rollbackOnFailure
                    req.ReturnExisting);

                // Map result
                result.ComponentPath = createResult.ComponentPath;
                result.FolderPath = createResult.FolderPath;
                result.ComponentName = createResult.ComponentName;
                result.Kind = AscetDatabaseExplorerCommon.KindToSchema(createResult.ComponentKind);
                result.Language = createResult.LanguageKind.ToString();
                result.Created = createResult.Created;
                result.AlreadyExisted = createResult.AlreadyExisted;
                result.ReadbackVerified = createResult.ReadbackVerified;
            }
            catch (AscetReadException ex)
            {
                result.Error = String.Format("{0}:{1}:{2}", ex.Code, ex.Operation, ex.Message);
            }
            catch (Exception ex)
            {
                result.Error = String.Format("{0}:{1}", ex.GetType().Name, ex.Message);
            }

            results.Add(result);
        }

        return results;
    }

    private static AscetComponentKind ParseKind(string value)
    {
        if (String.IsNullOrWhiteSpace(value))
        {
            throw new AscetReadException("invalid_argument", "kind", "Kind must not be empty.");
        }

        string normalized = value.Trim().ToLowerInvariant();
        switch (normalized)
        {
            case "class":
                return AscetComponentKind.Class;
            case "module":
                return AscetComponentKind.Module;
            case "statemachine":
                return AscetComponentKind.StateMachine;
            default:
                throw new AscetReadException("invalid_argument", "kind", "Unsupported kind '" + value + "'. Expected class, module, or statemachine.");
        }
    }

    private static AscetLanguageKind ParseLanguage(string value)
    {
        if (String.IsNullOrWhiteSpace(value))
        {
            // StateMachine doesn't require language
            return AscetLanguageKind.Unknown;
        }

        string normalized = value.Trim().ToUpperInvariant();
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

    private static string NormalizeComponentPath(string componentPath)
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

    private static string FormatException(Exception ex)
    {
        AscetReadException ascet = ex as AscetReadException;
        if (ascet != null)
        {
            return String.Format("{0}:{1}:{2}", ascet.Code, ascet.Operation, ascet.Message);
        }

        return String.Format("{0}:{1}", ex.GetType().FullName, ex.Message);
    }
}
