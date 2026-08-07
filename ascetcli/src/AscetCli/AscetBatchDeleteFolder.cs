using System;
using System.Collections.Generic;
using System.IO;
using System.Web.Script.Serialization;

public sealed class BatchDeleteFolderRequest
{
    public string FolderPath { get; set; }
    public string IfMissing { get; set; }
    public bool VerifyReadback { get; set; }
}

public sealed class BatchDeleteFolderResult
{
    public string FolderPath { get; set; }
    public bool Deleted { get; set; }
    public bool AlreadyMissing { get; set; }
    public bool ReadbackVerified { get; set; }
    public string Error { get; set; }
}

public static class AscetBatchDeleteFolder
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
                Console.Error.WriteLine("Usage: AscetBatchDeleteFolder.exe < requests.json");
                return 1;
            }

            List<BatchDeleteFolderRequest> requests;
            try
            {
                JavaScriptSerializer serializer = new JavaScriptSerializer();
                requests = serializer.Deserialize<List<BatchDeleteFolderRequest>>(json);
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
            List<BatchDeleteFolderResult> results = ProcessBatchRequests(requests);

            // Output results as JSON
            JavaScriptSerializer outputSerializer = new JavaScriptSerializer();
            string output = outputSerializer.Serialize(results);
            Console.WriteLine(output);

            // Return non-zero if any operation failed
            bool anyFailed = results.Exists(r => !r.Deleted && !r.AlreadyMissing);
            return anyFailed ? 2 : 0;
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine("Fatal error in batch operation:");
            Console.Error.WriteLine(FormatException(ex));
            return 1;
        }
    }

    private static List<BatchDeleteFolderResult> ProcessBatchRequests(List<BatchDeleteFolderRequest> requests)
    {
        List<BatchDeleteFolderResult> results = new List<BatchDeleteFolderResult>();
        FolderDeleteService service = new FolderDeleteService();

        foreach (BatchDeleteFolderRequest req in requests)
        {
            BatchDeleteFolderResult result = new BatchDeleteFolderResult
            {
                FolderPath = req.FolderPath,
                Deleted = false,
                AlreadyMissing = false,
                ReadbackVerified = false
            };

            try
            {
                // Normalize folder path
                string normalizedPath = NormalizeFolderPath(req.FolderPath);

                // Parse ifMissing
                bool ignoreMissing = ParseIfMissing(req.IfMissing);

                // Delete folder
                AscetFolderDeleteResult deleteResult = service.DeleteFolder(
                    normalizedPath,
                    req.VerifyReadback,
                    ignoreMissing);

                // Map result
                result.FolderPath = deleteResult.FolderPath;
                result.Deleted = deleteResult.Deleted;
                result.AlreadyMissing = deleteResult.AlreadyMissing;
                result.ReadbackVerified = deleteResult.ReadbackVerified;
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

    private static bool ParseIfMissing(string value)
    {
        if (String.IsNullOrWhiteSpace(value))
        {
            return false;
        }

        string normalized = value.Trim().ToLowerInvariant();
        return normalized == "ignore";
    }

    private static string NormalizeFolderPath(string folderPath)
    {
        string normalized = (folderPath ?? String.Empty).Trim().Replace('/', '\\');
        while (normalized.StartsWith("\\", StringComparison.Ordinal))
        {
            normalized = normalized.Substring(1);
        }

        while (normalized.EndsWith("\\", StringComparison.Ordinal))
        {
            normalized = normalized.Substring(0, normalized.Length - 1);
        }

        if (String.IsNullOrWhiteSpace(normalized))
        {
            throw new AscetReadException("invalid_argument", "normalize_folder_path", "Folder path must not be empty.");
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
