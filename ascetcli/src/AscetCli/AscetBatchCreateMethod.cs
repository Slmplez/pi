using System;
using System.Collections.Generic;
using System.IO;
using System.Web.Script.Serialization;

public sealed class BatchCreateMethodRequest
{
    public string ComponentPath { get; set; }
    public string MethodName { get; set; }
    public string MethodKind { get; set; }
    public string Diagram { get; set; }
    public bool ReturnExisting { get; set; }
    public bool VerifyReadback { get; set; }
}

public sealed class BatchCreateMethodResult
{
    public string ComponentPath { get; set; }
    public string MethodName { get; set; }
    public string MethodKind { get; set; }
    public string Diagram { get; set; }
    public bool Created { get; set; }
    public bool AlreadyExisted { get; set; }
    public string TargetKey { get; set; }
    public bool ReadbackVerified { get; set; }
    public string Error { get; set; }
}

public static class AscetBatchCreateMethod
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
                Console.Error.WriteLine("Usage: AscetBatchCreateMethod.exe < requests.json");
                return 1;
            }

            List<BatchCreateMethodRequest> requests;
            try
            {
                JavaScriptSerializer serializer = new JavaScriptSerializer();
                requests = serializer.Deserialize<List<BatchCreateMethodRequest>>(json);
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
            List<BatchCreateMethodResult> results = ProcessBatchRequests(requests);

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

    private static List<BatchCreateMethodResult> ProcessBatchRequests(List<BatchCreateMethodRequest> requests)
    {
        List<BatchCreateMethodResult> results = new List<BatchCreateMethodResult>();
        MethodCreateService service = new MethodCreateService();

        foreach (BatchCreateMethodRequest req in requests)
        {
            BatchCreateMethodResult result = new BatchCreateMethodResult
            {
                ComponentPath = req.ComponentPath,
                MethodName = req.MethodName,
                Created = false,
                AlreadyExisted = false,
                ReadbackVerified = false
            };

            try
            {
                // Parse method kind
                AscetMethodKind methodKind = ParseMethodKind(req.MethodKind);

                // Normalize paths
                string normalizedComponentPath = NormalizeComponentPath(req.ComponentPath);
                string normalizedMethodName = NormalizeMethodName(req.MethodName);
                string diagramName = String.IsNullOrWhiteSpace(req.Diagram) ? "Main" : req.Diagram.Trim();

                // Create method
                AscetMethodCreateResult createResult = service.CreateMethod(
                    normalizedComponentPath,
                    normalizedMethodName,
                    methodKind,
                    diagramName,
                    req.VerifyReadback,
                    false, // rollbackOnFailure
                    req.ReturnExisting);

                // Map result
                result.ComponentPath = createResult.ComponentPath;
                result.MethodName = createResult.MethodName;
                result.MethodKind = createResult.MethodKind.ToString();
                result.Diagram = createResult.DiagramName;
                result.Created = createResult.Created;
                result.AlreadyExisted = createResult.AlreadyExisted;
                result.TargetKey = createResult.TargetKey;
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

    private static AscetMethodKind ParseMethodKind(string value)
    {
        if (String.IsNullOrWhiteSpace(value))
        {
            throw new AscetReadException("invalid_argument", "method_kind", "Method kind must not be empty.");
        }

        string normalized = value.Trim().ToLowerInvariant();
        switch (normalized)
        {
            case "abstract":
                return AscetMethodKind.AbstractMethod;
            case "process":
                return AscetMethodKind.Process;
            case "action":
                return AscetMethodKind.Action;
            case "condition":
                return AscetMethodKind.Condition;
            case "trigger":
                return AscetMethodKind.Trigger;
            default:
                throw new AscetReadException("invalid_argument", "method_kind", "Unsupported method kind '" + value + "'. Expected abstract, process, action, condition, or trigger.");
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

    private static string NormalizeMethodName(string methodName)
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
            return String.Format("{0}:{1}:{2}", ascet.Code, ascet.Operation, ascet.Message);
        }

        return String.Format("{0}:{1}", ex.GetType().FullName, ex.Message);
    }
}
