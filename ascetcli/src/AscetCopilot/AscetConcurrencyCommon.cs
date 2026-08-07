using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Text;
using System.Web.Script.Serialization;
using de.etas.cebra.toolAPI.Ascet;

public sealed class ConcurrencyRunResult
{
    public string WorkerId { get; set; }
    public string Mode { get; set; }
    public int Iterations { get; set; }
    public int SuccessCount { get; set; }
    public int FailureCount { get; set; }
    public long ElapsedMilliseconds { get; set; }
    public string FirstError { get; set; }
}

public static class AscetConcurrencySupport
{
    private const string AscetAssemblyRelativePath = @"Ascetapidll\Etas.AscetNET.dll";
    private static bool _assemblyResolutionConfigured;
    private static string _resolvedAssemblyPath;

    private static string ResolveAssemblyPath()
    {
        if (!String.IsNullOrEmpty(_resolvedAssemblyPath))
        {
            return _resolvedAssemblyPath;
        }

        _resolvedAssemblyPath = AscetToolApiBootstrap.ResolveAssemblyPath();
        return _resolvedAssemblyPath;
    }

    public static void ConfigureAssemblyResolution()
    {
        if (_assemblyResolutionConfigured)
        {
            return;
        }

        AscetToolApiBootstrap.ConfigureAssemblyResolution();
        _assemblyResolutionConfigured = true;
    }

    public static ConcurrencyRunResult ExecuteWorker(string workerId, string mode, int iterations)
    {
        ConfigureAssemblyResolution();

        Stopwatch stopwatch = Stopwatch.StartNew();
        ConcurrencyRunResult result = new ConcurrencyRunResult
        {
            WorkerId = workerId,
            Mode = mode,
            Iterations = iterations
        };

        for (int i = 0; i < iterations; i++)
        {
            try
            {
                if (String.Equals(mode, "write", StringComparison.OrdinalIgnoreCase))
                {
                    ExecuteWriteIteration(workerId, i);
                }
                else
                {
                    ExecuteReadIteration();
                }

                result.SuccessCount++;
            }
            catch (Exception ex)
            {
                result.FailureCount++;
                if (String.IsNullOrEmpty(result.FirstError))
                {
                    result.FirstError = GetShortError(ex);
                }
            }
        }

        stopwatch.Stop();
        result.ElapsedMilliseconds = stopwatch.ElapsedMilliseconds;
        return result;
    }

    public static string SerializeResult(ConcurrencyRunResult result)
    {
        return new JavaScriptSerializer().Serialize(result);
    }

    public static ConcurrencyRunResult DeserializeResult(string json)
    {
        return new JavaScriptSerializer().Deserialize<ConcurrencyRunResult>(json);
    }

    public static string FormatAggregateSummary(IList<ConcurrencyRunResult> results, string runName)
    {
        int workerCount = results.Count;
        int totalIterations = results.Sum(r => r.Iterations);
        int successCount = results.Sum(r => r.SuccessCount);
        int failureCount = results.Sum(r => r.FailureCount);
        long totalElapsed = results.Sum(r => r.ElapsedMilliseconds);
        string firstError = results.Select(r => r.FirstError).FirstOrDefault(s => !String.IsNullOrEmpty(s)) ?? "<none>";

        StringBuilder builder = new StringBuilder();
        builder.Append("Run: ").Append(runName).AppendLine();
        builder.Append("Workers: ").Append(workerCount).AppendLine();
        builder.Append("Iterations: ").Append(totalIterations).AppendLine();
        builder.Append("Success: ").Append(successCount).AppendLine();
        builder.Append("Failure: ").Append(failureCount).AppendLine();
        builder.Append("ElapsedMs(sum): ").Append(totalElapsed).AppendLine();
        builder.Append("FirstError: ").Append(firstError).AppendLine();

        foreach (ConcurrencyRunResult result in results.OrderBy(r => r.WorkerId, StringComparer.Ordinal))
        {
            builder.Append("[")
                .Append(result.WorkerId)
                .Append("] mode=").Append(result.Mode)
                .Append(" ok=").Append(result.SuccessCount)
                .Append(" fail=").Append(result.FailureCount)
                .Append(" ms=").Append(result.ElapsedMilliseconds);

            if (!String.IsNullOrEmpty(result.FirstError))
            {
                builder.Append(" err=").Append(result.FirstError);
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

    private static void ExecuteReadIteration()
    {
        Ascet tool = null;

        try
        {
            tool = new Ascet();
            AscetDataBase database = tool.GetCurrentDataBase();
            if (database == null)
            {
                throw new InvalidOperationException("GetCurrentDataBase returned null.");
            }

            string databaseName = database.GetName();
            AscetFolder[] folders = database.GetAllAscetFolders();
            if (String.IsNullOrEmpty(databaseName))
            {
                throw new InvalidOperationException("Database name is empty.");
            }

            int folderCount = folders == null ? 0 : folders.Length;
            if (folderCount < 0)
            {
                throw new InvalidOperationException("Invalid folder count.");
            }
        }
        finally
        {
            if (tool != null)
            {
                tool.DisconnectFromTool();
            }
        }
    }

    private static void ExecuteWriteIteration(string workerId, int iteration)
    {
        Ascet tool = null;

        try
        {
            tool = new Ascet();
            AscetDataBase database = tool.GetCurrentDataBase();
            if (database == null)
            {
                throw new InvalidOperationException("GetCurrentDataBase returned null.");
            }

            string folderName = BuildTemporaryFolderName(workerId, iteration);
            AscetFolder folder = database.AddAscetFolder(folderName);
            if (folder == null)
            {
                throw new InvalidOperationException("AddAscetFolder returned null.");
            }

            string createdName = folder.GetName();
            if (!String.Equals(createdName, folderName, StringComparison.Ordinal))
            {
                throw new InvalidOperationException("Created folder name mismatch.");
            }

            database.Remove(folder, true);
        }
        finally
        {
            if (tool != null)
            {
                tool.DisconnectFromTool();
            }
        }
    }

    private static string BuildTemporaryFolderName(string workerId, int iteration)
    {
        return "CTH_" + Sanitize(workerId) + "_" + iteration.ToString("D4") + "_" + Guid.NewGuid().ToString("N").Substring(0, 8);
    }

    private static string Sanitize(string value)
    {
        StringBuilder builder = new StringBuilder(value.Length);
        foreach (char c in value)
        {
            builder.Append(Char.IsLetterOrDigit(c) ? c : '_');
        }

        return builder.ToString();
    }

    private static string GetShortError(Exception ex)
    {
        Exception current = ex;
        while (current.InnerException != null)
        {
            current = current.InnerException;
        }

        return current.GetType().Name + ": " + current.Message;
    }
}
