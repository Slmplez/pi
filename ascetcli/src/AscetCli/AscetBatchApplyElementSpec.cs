using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
using System.Web.Script.Serialization;

public sealed class BatchElementSpecRequest
{
    public string ComponentPath { get; set; }
    public string ProjectPath { get; set; }
    public string SpecJson { get; set; }
    public string Mode { get; set; }
    public bool DeleteMissing { get; set; }
    public bool RecreateIncompatible { get; set; }
    public bool VerifyReadback { get; set; }
}

public sealed class BatchElementSpecResult
{
    public string ComponentPath { get; set; }
    public string ComponentKind { get; set; }
    public string LanguageKind { get; set; }
    public string Mode { get; set; }
    public bool Succeeded { get; set; }
    public int ElementsCreated { get; set; }
    public int ElementsUpdated { get; set; }
    public int ElementsSkipped { get; set; }
    public int ElementsRemoved { get; set; }
    public int ElementsIncompatible { get; set; }
    public bool WriteSucceeded { get; set; }
    public bool ReadbackVerified { get; set; }
    public string Error { get; set; }
}

public static class AscetBatchApplyElementSpec
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
                Console.Error.WriteLine("Usage: AscetBatchApplyElementSpec.exe < requests.json");
                return 1;
            }

            List<BatchElementSpecRequest> requests;
            try
            {
                JavaScriptSerializer serializer = new JavaScriptSerializer();
                serializer.MaxJsonLength = Int32.MaxValue;
                requests = serializer.Deserialize<List<BatchElementSpecRequest>>(json);
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
            List<BatchElementSpecResult> results = ProcessBatchRequests(requests);

            // Output results as JSON
            JavaScriptSerializer outputSerializer = new JavaScriptSerializer();
            outputSerializer.MaxJsonLength = Int32.MaxValue;
            string output = outputSerializer.Serialize(results);
            Console.WriteLine(output);

            // Return non-zero if any operation failed
            bool anyFailed = results.Exists(r => !r.Succeeded);
            return anyFailed ? 2 : 0;
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine("Fatal error in batch operation:");
            Console.Error.WriteLine(FormatException(ex));
            return 1;
        }
    }

    private static List<BatchElementSpecResult> ProcessBatchRequests(List<BatchElementSpecRequest> requests)
    {
        List<BatchElementSpecResult> results = new List<BatchElementSpecResult>();
        ComponentElementSyncService service = new ComponentElementSyncService();

        foreach (BatchElementSpecRequest req in requests)
        {
            BatchElementSpecResult result = new BatchElementSpecResult
            {
                ComponentPath = req.ComponentPath,
                Mode = req.Mode ?? "apply",
                Succeeded = false,
                WriteSucceeded = false,
                ReadbackVerified = false,
                ElementsCreated = 0,
                ElementsUpdated = 0,
                ElementsSkipped = 0,
                ElementsRemoved = 0,
                ElementsIncompatible = 0
            };

            try
            {
                // Validate request
                if (String.IsNullOrWhiteSpace(req.ComponentPath))
                {
                    throw new AscetReadException(
                        "invalid_argument",
                        "process_batch",
                        "Component path must not be empty.");
                }

                if (String.IsNullOrWhiteSpace(req.SpecJson))
                {
                    throw new AscetReadException(
                        "invalid_argument",
                        "process_batch",
                        "SpecJson must not be empty.");
                }

                // Normalize component path
                string normalizedPath = NormalizeComponentPath(req.ComponentPath);

                // Parse spec JSON
                AscetElementSpecDocument spec = AscetElementSpecDocumentParser.ParseJson(req.SpecJson);

                // Parse mode
                AscetElementApplyMode mode = NormalizeMode(req.Mode);
                if (req.DeleteMissing && mode != AscetElementApplyMode.Restore)
                {
                    mode = AscetElementApplyMode.Restore;
                }

                // Apply element spec
                AscetElementSyncResult syncResult = service.Apply(
                    new AscetItemRef { Path = normalizedPath },
                    spec,
                    new AscetElementApplyOptions
                    {
                        Mode = mode,
                        DeleteMissing = req.DeleteMissing,
                        RecreateIncompatible = req.RecreateIncompatible,
                        ProjectPath = req.ProjectPath
                    },
                    req.VerifyReadback
                );

                // Populate result
                result.ComponentKind = syncResult.ComponentKind.ToString();
                result.LanguageKind = syncResult.LanguageKind.ToString();
                result.Mode = syncResult.Mode.ToString();
                result.ElementsCreated = syncResult.CreatedElements != null ? syncResult.CreatedElements.Count : 0;
                result.ElementsUpdated = syncResult.UpdatedElements != null ? syncResult.UpdatedElements.Count : 0;
                result.ElementsSkipped = syncResult.SkippedElements != null ? syncResult.SkippedElements.Count : 0;
                result.ElementsRemoved = syncResult.RemovedElements != null ? syncResult.RemovedElements.Count : 0;
                result.ElementsIncompatible = syncResult.IncompatibleElements != null ? syncResult.IncompatibleElements.Count : 0;
                result.WriteSucceeded = syncResult.WriteSucceeded;
                result.ReadbackVerified = syncResult.ReadbackVerified;
                result.Succeeded = syncResult.WriteSucceeded;

                // Include issues as error if any
                if (syncResult.Issues != null && syncResult.Issues.Count > 0)
                {
                    result.Error = String.Join("; ", ToArray(syncResult.Issues));
                }
            }
            catch (AscetReadException ex)
            {
                result.Error = String.Format("{0}: {1}", ex.Code, ex.Message);
            }
            catch (Exception ex)
            {
                result.Error = String.Format("{0}: {1}", ex.GetType().Name, ex.Message);
            }

            results.Add(result);
        }

        return results;
    }

    private static string[] ToArray(IList<string> values)
    {
        if (values == null || values.Count == 0)
        {
            return new string[0];
        }

        string[] result = new string[values.Count];
        for (int i = 0; i < values.Count; i++)
        {
            result[i] = values[i] ?? String.Empty;
        }
        return result;
    }

    private static string NormalizeComponentPath(string componentPath)
    {
        if (String.IsNullOrWhiteSpace(componentPath))
        {
            throw new AscetReadException(
                "invalid_argument",
                "normalize_component_path",
                "Component path must not be empty.");
        }

        string normalized = componentPath.Trim().Replace('/', '\\');
        while (normalized.StartsWith("\\", StringComparison.Ordinal))
        {
            normalized = normalized.Substring(1);
        }

        if (String.IsNullOrWhiteSpace(normalized))
        {
            throw new AscetReadException(
                "invalid_argument",
                "normalize_component_path",
                "Component path must contain a component name.");
        }

        return normalized;
    }

    private static AscetElementApplyMode NormalizeMode(string mode)
    {
        string normalized = String.IsNullOrWhiteSpace(mode)
            ? String.Empty
            : mode.Trim().Replace("_", String.Empty).Replace("-", String.Empty).Replace(" ", String.Empty).ToLowerInvariant();

        switch (normalized)
        {
            case "":
            case "apply":
            case "update":
                return AscetElementApplyMode.Apply;
            case "restore":
                return AscetElementApplyMode.Restore;
            default:
                throw new AscetReadException("invalid_argument", "normalize_mode", "Unsupported mode '" + (mode ?? String.Empty) + "'.");
        }
    }

    private static string FormatException(Exception ex)
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
