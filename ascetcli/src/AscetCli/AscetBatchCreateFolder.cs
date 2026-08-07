using System;
using System.Collections.Generic;
using System.IO;
using System.Web.Script.Serialization;

public sealed class BatchCreateFolderRequest
{
    public string FolderPath { get; set; }
    public string IfExists { get; set; }
    public bool VerifyReadback { get; set; }
}

public sealed class BatchCreateFolderResult
{
    public string FolderPath { get; set; }
    public bool Created { get; set; }
    public int CreatedCount { get; set; }
    public int ExistingCount { get; set; }
    public bool AlreadyExisted { get; set; }
    public bool ReadbackVerified { get; set; }
    public string Error { get; set; }
}

public static class AscetBatchCreateFolder
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
                Console.Error.WriteLine("Usage: AscetBatchCreateFolder.exe < requests.json");
                return 1;
            }

            List<BatchCreateFolderRequest> requests;
            try
            {
                JavaScriptSerializer serializer = new JavaScriptSerializer();
                requests = serializer.Deserialize<List<BatchCreateFolderRequest>>(json);
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
            List<BatchCreateFolderResult> results = ProcessBatchRequests(requests);

            // Output results as JSON
            JavaScriptSerializer outputSerializer = new JavaScriptSerializer();
            string output = outputSerializer.Serialize(results);
            Console.WriteLine(output);

            // Return non-zero if any operation failed
            bool anyFailed = results.Exists(r => !String.IsNullOrEmpty(r.Error));
            return anyFailed ? 2 : 0;
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine("Fatal error in batch operation:");
            Console.Error.WriteLine(FormatException(ex));
            return 1;
        }
    }

    private static List<BatchCreateFolderResult> ProcessBatchRequests(List<BatchCreateFolderRequest> requests)
    {
        List<BatchCreateFolderResult> results = new List<BatchCreateFolderResult>();
        FolderCreateService service = new FolderCreateService();

        foreach (BatchCreateFolderRequest req in requests)
        {
            BatchCreateFolderResult result = new BatchCreateFolderResult
            {
                FolderPath = req.FolderPath,
                Created = false,
                CreatedCount = 0,
                ExistingCount = 0,
                AlreadyExisted = false,
                ReadbackVerified = false
            };

            try
            {
                // Create folder
                AscetCreateFolderResult createResult = service.CreateFolder(
                    req.FolderPath,
                    req.VerifyReadback);

                // Map result
                result.FolderPath = createResult.FolderPath;
                result.Created = createResult.Created;
                result.CreatedCount = createResult.CreatedCount;
                result.ExistingCount = createResult.ExistingCount;
                result.AlreadyExisted = createResult.CreatedCount == 0 && createResult.ExistingCount > 0;
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

    private static string FormatException(Exception ex)
    {
        if (ex == null) return String.Empty;

        System.Text.StringBuilder sb = new System.Text.StringBuilder();
        sb.AppendLine(ex.GetType().FullName + ": " + ex.Message);

        if (!String.IsNullOrEmpty(ex.StackTrace))
        {
            sb.AppendLine("Stack trace:");
            sb.AppendLine(ex.StackTrace);
        }

        if (ex.InnerException != null)
        {
            sb.AppendLine("Inner exception:");
            sb.AppendLine(FormatException(ex.InnerException));
        }

        return sb.ToString();
    }
}
