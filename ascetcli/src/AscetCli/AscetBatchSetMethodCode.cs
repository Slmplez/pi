using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
using System.Web.Script.Serialization;

public sealed class BatchMethodCodeRequest
{
    public string ComponentPath { get; set; }
    public string MethodName { get; set; }
    public string Code { get; set; }
    public bool VerifyReadback { get; set; }
}

public sealed class BatchMethodCodeResult
{
    public string ComponentPath { get; set; }
    public string MethodName { get; set; }
    public string ComponentKind { get; set; }
    public string MethodKind { get; set; }
    public int PreviousCodeLength { get; set; }
    public int NewCodeLength { get; set; }
    public bool WriteSucceeded { get; set; }
    public bool ReadbackVerified { get; set; }
    public string Error { get; set; }
}

public static class AscetBatchSetMethodCode
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
                Console.Error.WriteLine("Usage: AscetBatchSetMethodCode.exe < requests.json");
                return 1;
            }

            List<BatchMethodCodeRequest> requests;
            try
            {
                JavaScriptSerializer serializer = new JavaScriptSerializer();
                requests = serializer.Deserialize<List<BatchMethodCodeRequest>>(json);
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
            List<BatchMethodCodeResult> results = ProcessBatchRequests(requests);

            // Output results as JSON
            JavaScriptSerializer outputSerializer = new JavaScriptSerializer();
            string output = outputSerializer.Serialize(results);
            Console.WriteLine(output);

            // Return non-zero if any operation failed
            bool anyFailed = results.Exists(r => !r.WriteSucceeded);
            return anyFailed ? 2 : 0;
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine("Fatal error in batch operation:");
            Console.Error.WriteLine(FormatException(ex));
            return 1;
        }
    }

    private static List<BatchMethodCodeResult> ProcessBatchRequests(List<BatchMethodCodeRequest> requests)
    {
        List<BatchMethodCodeResult> results = new List<BatchMethodCodeResult>();
        ComponentLocatorService locator = new ComponentLocatorService();
        MethodWriteService writer = new MethodWriteService();

        foreach (BatchMethodCodeRequest req in requests)
        {
            BatchMethodCodeResult result = new BatchMethodCodeResult
            {
                ComponentPath = req.ComponentPath,
                MethodName = req.MethodName,
                WriteSucceeded = false,
                ReadbackVerified = false
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

                if (String.IsNullOrWhiteSpace(req.MethodName))
                {
                    throw new AscetReadException(
                        "invalid_argument",
                        "process_batch",
                        "Method name must not be empty.");
                }

                if (req.Code == null)
                {
                    throw new AscetReadException(
                        "invalid_argument",
                        "process_batch",
                        "Code must not be null.");
                }

                // Normalize component path
                string normalizedPath = NormalizeComponentPath(req.ComponentPath);

                // Parse and locate component
                AscetItemPath itemPath = AscetItemPath.Parse(normalizedPath);
                AscetItemRef component = locator.FindItemInFolder(
                    itemPath.ItemName,
                    itemPath.FolderPath
                );

                // Write method code
                AscetMethodWriteResult writeResult = writer.SetMethodCode(
                    component,
                    req.MethodName,
                    req.Code,
                    req.VerifyReadback
                );

                // Populate result
                result.ComponentKind = writeResult.ComponentKind.ToString();
                result.MethodKind = writeResult.MethodKind.ToString();
                result.PreviousCodeLength = writeResult.PreviousCodeLength;
                result.NewCodeLength = writeResult.NewCodeLength;
                result.WriteSucceeded = writeResult.WriteSucceeded;
                result.ReadbackVerified = writeResult.ReadbackVerified;
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
