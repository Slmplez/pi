using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading;
using System.Web.Script.Serialization;
using de.etas.cebra.toolAPI.Ascet;

public sealed class AscetBackendPoolTimedResult
{
    public string BackendId { get; set; }
    public string Phase { get; set; }
    public long StartedAtMs { get; set; }
    public long EndedAtMs { get; set; }
    public long DurationMs { get; set; }
    public bool Ok { get; set; }
    public string ErrorCode { get; set; }
    public string ErrorMessage { get; set; }
}

public sealed class AscetBackendPoolVerdict
{
    public string Status { get; set; }
    public List<string> Reasons { get; set; }
}

public sealed class AscetBackendPoolReport
{
    public string GeneratedAt { get; set; }
    public string BindingMode { get; set; }
    public List<string> DatabasePaths { get; set; }
    public int BackendCount { get; set; }
    public int RepeatsPerBackend { get; set; }
    public int TimeoutMs { get; set; }
    public long SerialWallMs { get; set; }
    public long ParallelWallMs { get; set; }
    public double Speedup { get; set; }
    public List<AscetBackendPoolTimedResult> WarmupResults { get; set; }
    public List<AscetBackendPoolTimedResult> SerialResults { get; set; }
    public List<AscetBackendPoolTimedResult> ParallelResults { get; set; }
    public AscetBackendPoolVerdict Verdict { get; set; }
}

public sealed class AscetBackendPoolOptions
{
    public string ControllerExePath { get; set; }
    public int BackendCount { get; set; }
    public int Repeats { get; set; }
    public int TimeoutMs { get; set; }
    public int Depth { get; set; }
}

public sealed class AscetBackendWorkerClient : IDisposable
{
    private readonly System.Diagnostics.Process _process;
    private readonly object _gate;
    private int _nextRequestId;

    public AscetBackendWorkerClient(
        string backendId,
        string controllerExePath,
        string workingDirectory)
    {
        BackendId = backendId ?? String.Empty;
        _gate = new object();

        Directory.CreateDirectory(workingDirectory);

        ProcessStartInfo startInfo = new ProcessStartInfo();
        startInfo.FileName = controllerExePath;
        startInfo.Arguments =
            "--worker --backend-id " +
            QuoteArg(BackendId);
        startInfo.WorkingDirectory = workingDirectory;
        startInfo.UseShellExecute = false;
        startInfo.RedirectStandardInput = true;
        startInfo.RedirectStandardOutput = true;
        startInfo.RedirectStandardError = true;
        startInfo.CreateNoWindow = true;
        _process = System.Diagnostics.Process.Start(startInfo);

        if (_process == null)
        {
            throw new InvalidOperationException("Failed to start AscetBackendPoolDemo worker.");
        }
    }

    public string BackendId { get; private set; }

    public Dictionary<string, object> RunListFolders(int depth, int timeoutMs)
    {
        lock (_gate)
        {
            string requestId = BackendId + "-" + Interlocked.Increment(ref _nextRequestId).ToString();
            Dictionary<string, object> payload = new Dictionary<string, object>();
            payload["depth"] = depth;

            Dictionary<string, object> envelope = new Dictionary<string, object>();
            envelope["type"] = "request";
            envelope["id"] = requestId;
            envelope["commandId"] = "list_folders";
            envelope["payload"] = payload;

            return SendRequest(envelope, requestId, timeoutMs);
        }
    }

    public void Dispose()
    {
        try
        {
            if (!_process.HasExited)
            {
                _process.StandardInput.WriteLine("{\"type\":\"shutdown\"}");
                _process.StandardInput.Flush();
                if (!_process.WaitForExit(1000))
                {
                    _process.Kill();
                }
            }
        }
        catch
        {
        }
        finally
        {
            _process.Dispose();
        }
    }

    private Dictionary<string, object> SendRequest(Dictionary<string, object> envelope, string requestId, int timeoutMs)
    {
        if (_process.HasExited)
        {
            throw CreateHostExitedException("Ascet backend worker exited before request.");
        }

        string json = AscetBackendPoolJson.Serialize(envelope);
        _process.StandardInput.WriteLine(json);
        _process.StandardInput.Flush();

        string line = ReadLineWithTimeout(_process.StandardOutput, timeoutMs);
        if (String.IsNullOrWhiteSpace(line))
        {
            if (_process.HasExited)
            {
                throw CreateHostExitedException("Ascet backend worker exited before returning a response.");
            }

            throw new TimeoutException("Ascet backend worker did not return a response within " + timeoutMs + "ms.");
        }

        Dictionary<string, object> response = AscetBackendPoolJson.DeserializeObject(line);
        string responseId = GetString(response, "id");
        if (!String.Equals(responseId, requestId, StringComparison.Ordinal))
        {
            throw new InvalidOperationException("Protocol response id mismatch. expected=" + requestId + " actual=" + responseId);
        }

        if (!GetBool(response, "ok"))
        {
            Dictionary<string, object> error = GetDictionary(response, "error");
            string code = GetString(error, "code");
            string message = GetString(error, "message");
            throw new InvalidOperationException("Worker error " + code + ": " + message);
        }

        return GetDictionary(response, "result");
    }

    private InvalidOperationException CreateHostExitedException(string prefix)
    {
        string stderr = String.Empty;
        try
        {
            stderr = _process.StandardError.ReadToEnd();
        }
        catch
        {
        }

        return new InvalidOperationException(
            prefix +
            " exitCode=" +
            _process.ExitCode +
            " stderr=" +
            (stderr ?? String.Empty).Trim());
    }

    private static string ReadLineWithTimeout(StreamReader reader, int timeoutMs)
    {
        string result = null;
        Exception error = null;
        Thread thread = new Thread(delegate()
        {
            try
            {
                result = reader.ReadLine();
            }
            catch (Exception ex)
            {
                error = ex;
            }
        });
        thread.IsBackground = true;
        thread.Start();

        if (!thread.Join(timeoutMs))
        {
            return null;
        }

        if (error != null)
        {
            throw error;
        }

        return result;
    }

    private static string QuoteArg(string value)
    {
        return "\"" + (value ?? String.Empty).Replace("\"", "\\\"") + "\"";
    }

    private static Dictionary<string, object> GetDictionary(IDictionary<string, object> payload, string key)
    {
        if (payload == null || !payload.ContainsKey(key) || payload[key] == null)
        {
            return new Dictionary<string, object>();
        }

        Dictionary<string, object> dictionary = payload[key] as Dictionary<string, object>;
        return dictionary ?? new Dictionary<string, object>();
    }

    private static string GetString(IDictionary<string, object> payload, string key)
    {
        if (payload == null || !payload.ContainsKey(key) || payload[key] == null)
        {
            return String.Empty;
        }

        return Convert.ToString(payload[key]) ?? String.Empty;
    }

    private static bool GetBool(IDictionary<string, object> payload, string key)
    {
        if (payload == null || !payload.ContainsKey(key) || payload[key] == null)
        {
            return false;
        }

        object value = payload[key];
        if (value is bool)
        {
            return (bool)value;
        }

        bool parsed;
        return Boolean.TryParse(Convert.ToString(value), out parsed) && parsed;
    }
}

internal sealed class AscetBackendPoolWorker : IDisposable
{
    private readonly string _backendId;
    private readonly TextWriter _protocolOut;
    private Ascet _tool;
    private AscetDataBase _database;
    private string _boundDatabasePath;

    public AscetBackendPoolWorker(string backendId, TextWriter protocolOut)
    {
        _backendId = backendId;
        _protocolOut = protocolOut;
    }

    public int Run()
    {
        BindDatabase();

        string line;
        while ((line = Console.In.ReadLine()) != null)
        {
            if (String.IsNullOrWhiteSpace(line))
            {
                continue;
            }

            Dictionary<string, object> request = AscetBackendPoolJson.DeserializeObject(line);
            if (String.Equals(GetString(request, "type"), "shutdown", StringComparison.OrdinalIgnoreCase))
            {
                return 0;
            }

            string requestId = GetString(request, "id");
            try
            {
                Dictionary<string, object> result = HandleRequest(request);
                WriteResponse(requestId, true, result, null);
            }
            catch (Exception ex)
            {
                Dictionary<string, object> error = new Dictionary<string, object>();
                error["code"] = ClassifyWorkerError(ex);
                error["message"] = GetShortError(ex);
                WriteResponse(requestId, false, null, error);
            }
        }

        return 0;
    }

    public void Dispose()
    {
        if (_tool != null)
        {
            try
            {
                _tool.DisconnectFromTool();
            }
            catch
            {
            }
        }
    }

    private void BindDatabase()
    {
        AscetConcurrencySupport.ConfigureAssemblyResolution();

        _tool = new Ascet();
        _database = _tool.GetCurrentDataBase();
        _boundDatabasePath = SafeGetDatabasePath(_tool);

        if (_database == null)
        {
            throw new InvalidOperationException("GetCurrentDataBase returned null. Open the target database in ASCET before running the probe.");
        }
    }

    private Dictionary<string, object> HandleRequest(Dictionary<string, object> request)
    {
        string commandId = GetString(request, "commandId");
        if (!String.Equals(commandId, "list_folders", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Unsupported commandId '" + commandId + "'.");
        }

        Dictionary<string, object> payload = GetDictionary(request, "payload");
        int depth = GetInt(payload, "depth", 1);
        return ExecuteListFolders(depth);
    }

    private Dictionary<string, object> ExecuteListFolders(int depth)
    {
        Stopwatch stopwatch = Stopwatch.StartNew();
        string databaseName = _database.GetName();
        AscetFolder[] folders = _database.GetAllAscetFolders();
        stopwatch.Stop();

        Dictionary<string, object> result = new Dictionary<string, object>();
        result["backendId"] = _backendId;
        result["bindingMode"] = "current";
        result["databasePath"] = _boundDatabasePath ?? String.Empty;
        result["databaseName"] = databaseName ?? String.Empty;
        result["folderCount"] = folders == null ? 0 : folders.Length;
        result["requestedDepth"] = depth;
        result["elapsedMs"] = stopwatch.ElapsedMilliseconds;
        return result;
    }

    private void WriteResponse(string requestId, bool ok, Dictionary<string, object> result, Dictionary<string, object> error)
    {
        Dictionary<string, object> response = new Dictionary<string, object>();
        response["type"] = "response";
        response["id"] = requestId ?? String.Empty;
        response["ok"] = ok;
        if (ok)
        {
            response["result"] = result ?? new Dictionary<string, object>();
        }
        else
        {
            response["error"] = error ?? new Dictionary<string, object>();
        }

        _protocolOut.WriteLine(AscetBackendPoolJson.Serialize(response));
        _protocolOut.Flush();
    }

    private static string SafeGetDatabasePath(Ascet tool)
    {
        try
        {
            return tool.GetDataBasePath();
        }
        catch
        {
            return String.Empty;
        }
    }

    private static string ClassifyWorkerError(Exception ex)
    {
        if (ex is TimeoutException)
        {
            return "timeout";
        }

        return ex.GetType().Name;
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

    private static Dictionary<string, object> GetDictionary(IDictionary<string, object> payload, string key)
    {
        if (payload == null || !payload.ContainsKey(key) || payload[key] == null)
        {
            return new Dictionary<string, object>();
        }

        Dictionary<string, object> dictionary = payload[key] as Dictionary<string, object>;
        return dictionary ?? new Dictionary<string, object>();
    }

    private static string GetString(IDictionary<string, object> payload, string key)
    {
        if (payload == null || !payload.ContainsKey(key) || payload[key] == null)
        {
            return String.Empty;
        }

        return Convert.ToString(payload[key]) ?? String.Empty;
    }

    private static int GetInt(IDictionary<string, object> payload, string key, int fallback)
    {
        if (payload == null || !payload.ContainsKey(key) || payload[key] == null)
        {
            return fallback;
        }

        int parsed;
        return Int32.TryParse(Convert.ToString(payload[key]), out parsed) ? parsed : fallback;
    }

}

internal static class AscetBackendPoolJson
{
    public static string Serialize(object value)
    {
        JavaScriptSerializer serializer = new JavaScriptSerializer();
        serializer.MaxJsonLength = Int32.MaxValue;
        return serializer.Serialize(value);
    }

    public static Dictionary<string, object> DeserializeObject(string json)
    {
        JavaScriptSerializer serializer = new JavaScriptSerializer();
        serializer.MaxJsonLength = Int32.MaxValue;
        Dictionary<string, object> result = serializer.DeserializeObject(json) as Dictionary<string, object>;
        return result ?? new Dictionary<string, object>();
    }
}

public static class AscetBackendPoolDemo
{
    private const int DefaultBackendCount = 2;
    private const int DefaultRepeats = 3;
    private const int DefaultTimeoutMs = 30000;
    private const int DefaultDepth = 1;
    private const double DefaultMinSpeedup = 1.35;
    private const long DefaultMinOverlapMs = 50;

    [STAThread]
    public static int Main(string[] args)
    {
        try
        {
            if (HasFlag(args, "--worker"))
            {
                return RunWorker(args);
            }

            AscetBackendPoolOptions options = ParseOptions(args);
            string outputPath = GetStringArg(args, "--output", String.Empty);
            bool jsonOnly = HasFlag(args, "--json");

            AscetBackendPoolReport report = Run(options);
            string json = SerializeReport(report);

            if (!String.IsNullOrWhiteSpace(outputPath))
            {
                string fullPath = Path.GetFullPath(outputPath);
                string directory = Path.GetDirectoryName(fullPath);
                if (!String.IsNullOrWhiteSpace(directory))
                {
                    Directory.CreateDirectory(directory);
                }
                File.WriteAllText(fullPath, json + Environment.NewLine, new UTF8Encoding(false));
            }

            if (jsonOnly)
            {
                Console.WriteLine(json);
            }
            else
            {
                PrintSummary(report);
            }

            return String.Equals(report.Verdict.Status, "unsupported", StringComparison.Ordinal) ? 2 : 0;
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine(AscetConcurrencySupport.FormatException(ex));
            return 1;
        }
    }

    public static AscetBackendPoolReport Run(AscetBackendPoolOptions options)
    {
        List<AscetBackendWorkerClient> clients = new List<AscetBackendWorkerClient>();

        try
        {
            for (int i = 0; i < options.BackendCount; i++)
            {
                string backendId = "backend-" + (i + 1).ToString();
                string workingDirectory = Path.Combine(Path.GetTempPath(), "ascet-backend-pool-demo", "current", backendId);
                clients.Add(new AscetBackendWorkerClient(
                    backendId,
                    options.ControllerExePath,
                    workingDirectory));
            }

            List<AscetBackendPoolTimedResult> warmupResults = new List<AscetBackendPoolTimedResult>();
            foreach (AscetBackendWorkerClient client in clients)
            {
                warmupResults.Add(RunTimed(client, "warmup", options.TimeoutMs, options.Depth));
            }

            if (warmupResults.Any(r => !r.Ok))
            {
                return CreateReport(options, warmupResults, new List<AscetBackendPoolTimedResult>(), new List<AscetBackendPoolTimedResult>(), 0, 0);
            }

            List<AscetBackendWorkerClient> scheduled = CreateSerialSchedule(clients, options.Repeats);

            Stopwatch serial = Stopwatch.StartNew();
            List<AscetBackendPoolTimedResult> serialResults = new List<AscetBackendPoolTimedResult>();
            foreach (AscetBackendWorkerClient client in scheduled)
            {
                AscetBackendPoolTimedResult result = RunTimed(client, "serial", options.TimeoutMs, options.Depth);
                serialResults.Add(result);
                if (!result.Ok)
                {
                    break;
                }
            }
            serial.Stop();

            if (serialResults.Any(r => !r.Ok))
            {
                return CreateReport(options, warmupResults, serialResults, new List<AscetBackendPoolTimedResult>(), serial.ElapsedMilliseconds, 0);
            }

            Stopwatch parallel = Stopwatch.StartNew();
            List<AscetBackendPoolTimedResult> parallelResults = RunParallelWaves(clients, options.Repeats, options.TimeoutMs, options.Depth);
            parallel.Stop();

            return CreateReport(options, warmupResults, serialResults, parallelResults, serial.ElapsedMilliseconds, parallel.ElapsedMilliseconds);
        }
        finally
        {
            foreach (AscetBackendWorkerClient client in clients)
            {
                client.Dispose();
            }
        }
    }

    private static AscetBackendPoolReport CreateReport(
        AscetBackendPoolOptions options,
        List<AscetBackendPoolTimedResult> warmupResults,
        List<AscetBackendPoolTimedResult> serialResults,
        List<AscetBackendPoolTimedResult> parallelResults,
        long serialElapsedMs,
        long parallelElapsedMs)
    {
        long serialWallMs = Math.Max(1, serialElapsedMs);
        long parallelWallMs = Math.Max(1, parallelElapsedMs);
        AscetBackendPoolReport report = new AscetBackendPoolReport();
        report.GeneratedAt = DateTime.UtcNow.ToString("o");
        report.BindingMode = "current";
        report.DatabasePaths = new List<string>();
        report.BackendCount = options.BackendCount;
        report.RepeatsPerBackend = options.Repeats;
        report.TimeoutMs = options.TimeoutMs;
        report.SerialWallMs = serialWallMs;
        report.ParallelWallMs = parallelWallMs;
        report.Speedup = serialWallMs / (double)parallelWallMs;
        report.WarmupResults = warmupResults;
        report.SerialResults = serialResults;
        report.ParallelResults = parallelResults;
        report.Verdict = Classify(report, DefaultMinSpeedup, DefaultMinOverlapMs);
        return report;
    }

    public static AscetBackendPoolVerdict Classify(AscetBackendPoolReport report, double minSpeedup, long minOverlapMs)
    {
        List<AscetBackendPoolTimedResult> all = new List<AscetBackendPoolTimedResult>();
        all.AddRange(report.WarmupResults ?? new List<AscetBackendPoolTimedResult>());
        all.AddRange(report.SerialResults ?? new List<AscetBackendPoolTimedResult>());
        all.AddRange(report.ParallelResults ?? new List<AscetBackendPoolTimedResult>());

        List<AscetBackendPoolTimedResult> failures = all.Where(r => !r.Ok).ToList();
        int timeoutFailures = failures.Count(r => IsTimeoutLike(r));
        int busyFailures = failures.Count(r => ContainsIgnoreCase(r.ErrorMessage, "busy") || ContainsIgnoreCase(r.ErrorMessage, "lock"));
        int hostExitFailures = failures.Count(r => ContainsIgnoreCase(r.ErrorMessage, "backend worker exited"));
        int nullDatabaseFailures = failures.Count(r => ContainsIgnoreCase(r.ErrorMessage, "null database") || ContainsIgnoreCase(r.ErrorMessage, "returned null"));

        AscetBackendPoolVerdict verdict = new AscetBackendPoolVerdict();
        verdict.Reasons = new List<string>();

        if (timeoutFailures > 0 || busyFailures > 0 || hostExitFailures > 0 || nullDatabaseFailures > 0)
        {
            verdict.Status = "unsupported";
            verdict.Reasons.Add(
                "Observed backend binding/runtime failures: timeout=" +
                timeoutFailures +
                ", busyOrLock=" +
                busyFailures +
                ", workerExit=" +
                hostExitFailures +
                ", nullDatabase=" +
                nullDatabaseFailures +
                ".");
            return verdict;
        }

        if (failures.Count > 0)
        {
            verdict.Status = "inconclusive";
            verdict.Reasons.Add("Observed " + failures.Count + " non-timeout failures.");
            return verdict;
        }

        bool overlap = HasMeaningfulOverlap(report.ParallelResults, minOverlapMs);
        if (overlap && report.Speedup >= minSpeedup)
        {
            verdict.Status = "supported";
            verdict.Reasons.Add("Parallel run reached " + report.Speedup.ToString("0.00") + "x speedup.");
            verdict.Reasons.Add("Parallel operations overlapped by at least " + minOverlapMs + "ms across different backends.");
            return verdict;
        }

        verdict.Status = "inconclusive";
        verdict.Reasons.Add("No timeout/busy failure, but speedup=" + report.Speedup.ToString("0.00") + "x and overlap=" + overlap + ".");
        return verdict;
    }

    public static bool HasMeaningfulOverlap(IList<AscetBackendPoolTimedResult> results, long minOverlapMs)
    {
        if (results == null)
        {
            return false;
        }

        List<AscetBackendPoolTimedResult> successful = results.Where(r => r.Ok).ToList();
        for (int i = 0; i < successful.Count; i++)
        {
            for (int j = i + 1; j < successful.Count; j++)
            {
                if (String.Equals(successful[i].BackendId, successful[j].BackendId, StringComparison.Ordinal))
                {
                    continue;
                }

                long overlap = Math.Min(successful[i].EndedAtMs, successful[j].EndedAtMs) -
                    Math.Max(successful[i].StartedAtMs, successful[j].StartedAtMs);
                if (overlap >= minOverlapMs)
                {
                    return true;
                }
            }
        }

        return false;
    }

    private static int RunWorker(string[] args)
    {
        Console.InputEncoding = Encoding.UTF8;
        Console.OutputEncoding = Encoding.UTF8;

        TextWriter protocolOut = TextWriter.Synchronized(
            new StreamWriter(Console.OpenStandardOutput(), new UTF8Encoding(false)) { AutoFlush = true });

        // ASCET ToolAPI calls may write to Console.Out. Keep stdout reserved for the JSON line protocol.
        Console.SetOut(TextWriter.Null);
        AscetConcurrencySupport.ConfigureAssemblyResolution();

        string backendId = GetStringArg(args, "--backend-id", "backend");

        using (AscetBackendPoolWorker worker = new AscetBackendPoolWorker(backendId, protocolOut))
        {
            return worker.Run();
        }
    }

    private static AscetBackendPoolOptions ParseOptions(string[] args)
    {
        AscetBackendPoolOptions options = new AscetBackendPoolOptions();
        options.ControllerExePath = GetCurrentExecutablePath();
        options.BackendCount = GetIntArg(args, "--backends", DefaultBackendCount);
        options.Repeats = GetIntArg(args, "--repeats", DefaultRepeats);
        options.TimeoutMs = GetIntArg(args, "--timeout-ms", DefaultTimeoutMs);
        options.Depth = GetIntArg(args, "--depth", DefaultDepth);

        string bindingMode = GetStringArg(args, "--binding", "current");
        if (!String.Equals(bindingMode, "current", StringComparison.OrdinalIgnoreCase))
        {
            throw new ArgumentException("Only --binding current is supported. This probe intentionally stays on the database already opened in ASCET.");
        }

        if (options.BackendCount < 2)
        {
            throw new ArgumentException("--backends must be at least 2.");
        }

        return options;
    }

    private static List<AscetBackendWorkerClient> CreateSerialSchedule(IList<AscetBackendWorkerClient> clients, int repeats)
    {
        List<AscetBackendWorkerClient> scheduled = new List<AscetBackendWorkerClient>();
        foreach (AscetBackendWorkerClient client in clients)
        {
            for (int i = 0; i < repeats; i++)
            {
                scheduled.Add(client);
            }
        }

        return scheduled;
    }

    private static List<AscetBackendPoolTimedResult> RunParallelWaves(
        IList<AscetBackendWorkerClient> clients,
        int repeats,
        int timeoutMs,
        int depth)
    {
        List<AscetBackendPoolTimedResult> results = new List<AscetBackendPoolTimedResult>();
        for (int wave = 0; wave < repeats; wave++)
        {
            AscetBackendPoolTimedResult[] waveResults = new AscetBackendPoolTimedResult[clients.Count];
            Thread[] threads = new Thread[clients.Count];
            for (int i = 0; i < clients.Count; i++)
            {
                int index = i;
                threads[i] = new Thread(delegate()
                {
                    waveResults[index] = RunTimed(clients[index], "parallel", timeoutMs, depth);
                });
                threads[i].IsBackground = false;
                threads[i].Start();
            }

            for (int i = 0; i < threads.Length; i++)
            {
                threads[i].Join();
            }

            results.AddRange(waveResults);
            if (waveResults.Any(r => r != null && !r.Ok))
            {
                break;
            }
        }

        return results;
    }

    private static AscetBackendPoolTimedResult RunTimed(AscetBackendWorkerClient client, string phase, int timeoutMs, int depth)
    {
        long startedAtMs = CurrentUnixMs();
        try
        {
            client.RunListFolders(depth, timeoutMs);
            long endedAtMs = CurrentUnixMs();
            return new AscetBackendPoolTimedResult
            {
                BackendId = client.BackendId,
                Phase = phase,
                StartedAtMs = startedAtMs,
                EndedAtMs = endedAtMs,
                DurationMs = endedAtMs - startedAtMs,
                Ok = true
            };
        }
        catch (Exception ex)
        {
            long endedAtMs = CurrentUnixMs();
            return new AscetBackendPoolTimedResult
            {
                BackendId = client.BackendId,
                Phase = phase,
                StartedAtMs = startedAtMs,
                EndedAtMs = endedAtMs,
                DurationMs = endedAtMs - startedAtMs,
                Ok = false,
                ErrorCode = ClassifyErrorCode(ex),
                ErrorMessage = ex.Message
            };
        }
    }

    private static string SerializeReport(AscetBackendPoolReport report)
    {
        return AscetBackendPoolJson.Serialize(report);
    }

    private static void PrintSummary(AscetBackendPoolReport report)
    {
        Console.WriteLine("ASCET C# backend pool verdict: " + report.Verdict.Status);
        Console.WriteLine("binding=" + report.BindingMode);
        Console.WriteLine("backends=" + report.BackendCount);
        Console.WriteLine("repeatsPerBackend=" + report.RepeatsPerBackend);
        Console.WriteLine("serialWallMs=" + report.SerialWallMs);
        Console.WriteLine("parallelWallMs=" + report.ParallelWallMs);
        Console.WriteLine("speedup=" + report.Speedup.ToString("0.00") + "x");
        foreach (string reason in report.Verdict.Reasons)
        {
            Console.WriteLine("- " + reason);
        }
    }

    private static bool IsTimeoutLike(AscetBackendPoolTimedResult result)
    {
        return ContainsIgnoreCase(result.ErrorCode, "timeout") ||
            ContainsIgnoreCase(result.ErrorMessage, "timeout") ||
            ContainsIgnoreCase(result.ErrorMessage, "timed out");
    }

    private static bool ContainsIgnoreCase(string value, string needle)
    {
        return !String.IsNullOrEmpty(value) &&
            value.IndexOf(needle, StringComparison.OrdinalIgnoreCase) >= 0;
    }

    private static string ClassifyErrorCode(Exception ex)
    {
        if (ex is TimeoutException)
        {
            return "timeout";
        }

        return ex.GetType().Name;
    }

    private static long CurrentUnixMs()
    {
        return (long)(DateTime.UtcNow - new DateTime(1970, 1, 1)).TotalMilliseconds;
    }

    private static string GetCurrentExecutablePath()
    {
        string path = System.Diagnostics.Process.GetCurrentProcess().MainModule.FileName;
        if (String.IsNullOrWhiteSpace(path))
        {
            path = System.Reflection.Assembly.GetExecutingAssembly().Location;
        }

        return path;
    }

    private static int GetIntArg(string[] args, string name, int fallback)
    {
        string value = GetStringArg(args, name, String.Empty);
        if (String.IsNullOrWhiteSpace(value))
        {
            return fallback;
        }

        return Int32.Parse(value);
    }

    private static string GetStringArg(string[] args, string name, string fallback)
    {
        if (args == null)
        {
            return fallback;
        }

        for (int i = 0; i < args.Length; i++)
        {
            if (String.Equals(args[i], name, StringComparison.OrdinalIgnoreCase))
            {
                return i + 1 < args.Length ? args[i + 1] : fallback;
            }
        }

        return fallback;
    }

    private static bool HasFlag(string[] args, string name)
    {
        if (args == null)
        {
            return false;
        }

        for (int i = 0; i < args.Length; i++)
        {
            if (String.Equals(args[i], name, StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }
        }

        return false;
    }

}
