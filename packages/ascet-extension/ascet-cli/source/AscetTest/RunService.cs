using System;
using System.Collections;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Text;
using System.Threading.Tasks;
using System.Xml;

public static class AscetTestRunService
{
    private const int DefaultTimeoutMs = 30000;
    private const int MaxTimeoutMs = 600000;

    public static Dictionary<string, object> Execute(Dictionary<string, object> request)
    {
        string runId = AscetTestContracts.GetString(request, "runId");
        List<AscetTestValidationIssue> errors = new List<AscetTestValidationIssue>();
        List<AscetTestValidationIssue> warnings = new List<AscetTestValidationIssue>();
        Dictionary<string, object> data = new Dictionary<string, object>
        {
            { "schemaVersion", "ascet-test-run/v1" },
            { "runId", runId ?? String.Empty },
            { "status", "blocked" },
            { "liveWritePerformed", false }
        };

        string runDirectory = String.Empty;
        try
        {
            runDirectory = AscetTestArtifactWriter.ResolveRunDirectory(request, runId);
            data["runDirectory"] = runDirectory;
        }
        catch (Exception ex)
        {
            errors.Add(Issue("runDirectory", "unsafe_path", ex.Message));
        }

        Dictionary<string, object> buildResult = LoadBuildResult(request, runDirectory, errors, data);
        Dictionary<string, object> runOptions = AscetTestContracts.GetDictionary(request, "run");
        int timeoutMs = AscetTestContracts.GetInteger(runOptions, "timeoutMs", DefaultTimeoutMs);
        if (timeoutMs <= 0 || timeoutMs > MaxTimeoutMs)
            errors.Add(Issue("run.timeoutMs", "invalid_timeout", "run.timeoutMs must be between 1 and 600000 milliseconds."));

        string binaryPath = ResolveBinaryPath(buildResult, runDirectory);
        if (String.IsNullOrWhiteSpace(binaryPath) || !File.Exists(binaryPath))
            errors.Add(Issue("binary", "binary_missing", "A built GoogleTest executable is required before run."));
        else if (!IsWithin(binaryPath, runDirectory))
            errors.Add(Issue("binary", "unsafe_path", "The test binary must be inside the run directory."));

        List<string> runtimePaths = ReadStringList(runOptions, "runtimePath");
        for (int index = 0; index < runtimePaths.Count; index++)
        {
            runtimePaths[index] = AscetTestContracts.ResolvePath(runtimePaths[index], Directory.GetCurrentDirectory());
            if (!Directory.Exists(runtimePaths[index]))
                errors.Add(Issue("run.runtimePath", "runtime_path_missing", "Runtime path was not found: " + runtimePaths[index]));
        }

        string googleTestDirectory = Path.Combine(runDirectory, "google-test");
        string xmlPath = Path.Combine(googleTestDirectory, "test-results.xml");
        if (!IsWithin(xmlPath, runDirectory)) errors.Add(Issue("run.xmlPath", "unsafe_path", "GoogleTest XML path escaped the run directory."));

        if (errors.Count > 0)
        {
            data["status"] = "blocked";
            data["runResultPath"] = TryWriteRunResult(request, runId, data);
            return AscetTestEnvelope.Blocked(
                "run",
                runId,
                data,
                FirstIssueCode(errors, "run_preflight_failed"),
                "Run preflight failed.",
                errors,
                warnings,
                Diagnostics(false));
        }

        Directory.CreateDirectory(googleTestDirectory);
        string stdoutPath = Path.Combine(runDirectory, "stdout.log");
        string stderrPath = Path.Combine(runDirectory, "stderr.log");
        List<string> arguments = ReadStringList(runOptions, "args");
        if (!ContainsArgument(arguments, "--gtest_color")) arguments.Add("--gtest_color=no");
        arguments.Add("--gtest_output=xml:" + xmlPath);

        ProcessRunResult processResult = RunProcess(binaryPath, arguments, googleTestDirectory, runtimePaths, timeoutMs);
        AscetTestContracts.WriteText(stdoutPath, processResult.Stdout);
        AscetTestContracts.WriteText(stderrPath, processResult.Stderr);

        XmlSummary xml = ParseGoogleTestXml(xmlPath);
        string status = DetermineStatus(processResult, xml);
        Dictionary<string, object> result = new Dictionary<string, object>
        {
            { "schemaVersion", "ascet-test-run/v1" },
            { "runId", runId ?? String.Empty },
            { "status", status },
            { "binary", binaryPath },
            { "command", Quote(binaryPath) + " " + JoinArguments(arguments) },
            { "exitCode", processResult.ExitCode },
            { "startedAt", processResult.StartedAt },
            { "finishedAt", processResult.FinishedAt },
            { "durationMs", processResult.DurationMs },
            { "stdoutPath", stdoutPath },
            { "stderrPath", stderrPath },
            { "gtestXmlPath", xmlPath },
            { "xmlValid", xml.Valid },
            { "testsRun", xml.TestsRun },
            { "failures", xml.Failures },
            { "errors", xml.Errors },
            { "disabled", xml.Disabled },
            { "timedOut", processResult.TimedOut },
            { "started", processResult.Started }
        };
        string runResultPath = TryWriteRunResult(request, runId, result);
        result["runResultPath"] = runResultPath;
        data["status"] = status;
        data["runResult"] = result;
        data["runResultPath"] = runResultPath;
        data["binary"] = binaryPath;
        data["gtestXmlPath"] = xmlPath;

        if (String.Equals(status, "passed", StringComparison.OrdinalIgnoreCase))
        {
            return AscetTestEnvelope.Success(
                "run",
                runId,
                "executed",
                data,
                warnings,
                Diagnostics(false));
        }

        string code = status == "timeout" ? "runtime_timeout" : status == "crashed" ? "runtime_crashed" : "runtime_failed";
        return AscetTestEnvelope.Blocked(
            "run",
            runId,
            data,
            code,
            "GoogleTest runtime did not pass.",
            new List<AscetTestValidationIssue> { Issue("run", code, "GoogleTest runtime status: " + status) },
            warnings,
            Diagnostics(false));
    }

    private static Dictionary<string, object> LoadBuildResult(
        Dictionary<string, object> request,
        string runDirectory,
        IList<AscetTestValidationIssue> errors,
        Dictionary<string, object> data)
    {
        string requested = AscetTestContracts.GetString(request, "buildResultPath");
        string path = String.IsNullOrWhiteSpace(requested)
            ? Path.Combine(runDirectory ?? String.Empty, "build-result.json")
            : AscetTestContracts.ResolvePath(requested, Directory.GetCurrentDirectory());
        data["buildResultPath"] = path;
        if (String.IsNullOrWhiteSpace(path) || !File.Exists(path))
        {
            errors.Add(Issue("buildResultPath", "build_not_ready", "Build result was not found: " + path));
            return null;
        }

        try
        {
            Dictionary<string, object> result = AscetTestContracts.ReadObject(path, "build-result");
            if (!AscetTestContracts.GetBoolean(result, "ready", false))
                errors.Add(Issue("buildResult.ready", "build_not_ready", "Build result is not ready."));
            return result;
        }
        catch (Exception ex)
        {
            errors.Add(Issue("buildResultPath", "build_result_invalid", ex.Message));
            return null;
        }
    }

    private static string ResolveBinaryPath(Dictionary<string, object> buildResult, string runDirectory)
    {
        if (buildResult == null) return String.Empty;
        string binary = AscetTestContracts.GetString(buildResult, "binary");
        Dictionary<string, object> artifacts = AscetTestContracts.GetDictionary(buildResult, "artifacts");
        if (String.IsNullOrWhiteSpace(binary) && artifacts != null) binary = AscetTestContracts.GetString(artifacts, "binary");
        return String.IsNullOrWhiteSpace(binary) ? String.Empty : AscetTestContracts.ResolvePath(binary, runDirectory);
    }

    private static ProcessRunResult RunProcess(string executable, List<string> arguments, string workingDirectory, List<string> runtimePaths, int timeoutMs)
    {
        ProcessRunResult result = new ProcessRunResult
        {
            StartedAt = DateTime.UtcNow.ToString("o"),
            ExitCode = -1,
            Stdout = String.Empty,
            Stderr = String.Empty
        };
        ProcessStartInfo startInfo = new ProcessStartInfo
        {
            FileName = executable,
            Arguments = JoinArguments(arguments),
            WorkingDirectory = workingDirectory,
            UseShellExecute = false,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            CreateNoWindow = true
        };
        string currentPath = Environment.GetEnvironmentVariable("PATH") ?? String.Empty;
        List<string> pathParts = new List<string>();
        for (int index = 0; index < runtimePaths.Count; index++) pathParts.Add(runtimePaths[index]);
        if (!String.IsNullOrWhiteSpace(currentPath)) pathParts.Add(currentPath);
        startInfo.EnvironmentVariables["PATH"] = String.Join(Path.PathSeparator.ToString(), pathParts.ToArray());

        Stopwatch stopwatch = Stopwatch.StartNew();
        try
        {
            using (Process process = new Process { StartInfo = startInfo })
            {
                if (!process.Start())
                {
                    result.Stderr = "Process.Start returned false.";
                    return FinishProcessResult(result, stopwatch);
                }
                result.Started = true;
                Task<string> stdoutTask = process.StandardOutput.ReadToEndAsync();
                Task<string> stderrTask = process.StandardError.ReadToEndAsync();
                if (!process.WaitForExit(timeoutMs))
                {
                    result.TimedOut = true;
                    try { process.Kill(); } catch (Exception ex) { result.Stderr = ex.Message; }
                    process.WaitForExit();
                }
                Task.WaitAll(stdoutTask, stderrTask);
                result.Stdout = stdoutTask.Result ?? String.Empty;
                if (!String.IsNullOrWhiteSpace(result.Stderr)) result.Stderr += Environment.NewLine;
                result.Stderr += stderrTask.Result ?? String.Empty;
                if (!result.TimedOut) result.ExitCode = process.ExitCode;
            }
        }
        catch (Exception ex)
        {
            result.Stderr = ex.Message;
        }
        return FinishProcessResult(result, stopwatch);
    }

    private static ProcessRunResult FinishProcessResult(ProcessRunResult result, Stopwatch stopwatch)
    {
        stopwatch.Stop();
        result.DurationMs = stopwatch.ElapsedMilliseconds;
        result.FinishedAt = DateTime.UtcNow.ToString("o");
        return result;
    }

    private static XmlSummary ParseGoogleTestXml(string path)
    {
        XmlSummary summary = new XmlSummary();
        if (!File.Exists(path)) return summary;
        try
        {
            XmlDocument document = new XmlDocument();
            document.Load(path);
            XmlElement root = document.DocumentElement;
            if (root == null || !String.Equals(root.Name, "testsuites", StringComparison.OrdinalIgnoreCase)) return summary;
            summary.Valid = true;
            summary.TestsRun = ReadAttribute(root, "tests", -1);
            summary.Failures = ReadAttribute(root, "failures", 0);
            summary.Errors = ReadAttribute(root, "errors", 0);
            summary.Disabled = ReadAttribute(root, "disabled", 0);
            if (summary.TestsRun < 0) summary.TestsRun = document.SelectNodes("//testcase").Count;
        }
        catch
        {
            summary.Valid = false;
        }
        return summary;
    }

    private static int ReadAttribute(XmlElement element, string name, int fallback)
    {
        string value = element.GetAttribute(name);
        int result;
        return Int32.TryParse(value, out result) ? result : fallback;
    }

    private static string DetermineStatus(ProcessRunResult process, XmlSummary xml)
    {
        if (process.TimedOut) return "timeout";
        if (!process.Started || !xml.Valid) return "crashed";
        if (process.ExitCode != 0 || xml.TestsRun <= 0 || xml.Failures > 0 || xml.Errors > 0) return "failed";
        return "passed";
    }

    private static List<string> ReadStringList(Dictionary<string, object> source, string key)
    {
        List<string> result = new List<string>();
        object raw = AscetTestContracts.GetValue(source, key);
        IList values = raw as IList;
        if (values == null) return result;
        for (int index = 0; index < values.Count; index++)
        {
            string value = Convert.ToString(values[index]);
            if (!String.IsNullOrWhiteSpace(value)) result.Add(value);
        }
        return result;
    }

    private static bool ContainsArgument(List<string> arguments, string prefix)
    {
        for (int index = 0; index < arguments.Count; index++)
            if ((arguments[index] ?? String.Empty).StartsWith(prefix, StringComparison.OrdinalIgnoreCase)) return true;
        return false;
    }

    private static bool IsWithin(string path, string root)
    {
        if (String.IsNullOrWhiteSpace(path) || String.IsNullOrWhiteSpace(root)) return false;
        string fullPath = Path.GetFullPath(path).TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar);
        string fullRoot = Path.GetFullPath(root).TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar) + Path.DirectorySeparatorChar;
        return fullPath.StartsWith(fullRoot, StringComparison.OrdinalIgnoreCase);
    }

    private static string TryWriteRunResult(Dictionary<string, object> request, string runId, Dictionary<string, object> result)
    {
        try { return AscetTestArtifactWriter.WriteJson(request, runId, "run-result.json", result); }
        catch { return String.Empty; }
    }

    private static Dictionary<string, object> Diagnostics(bool liveExecutionStarted)
    {
        return new Dictionary<string, object>
        {
            { "liveExecutionStarted", liveExecutionStarted },
            { "liveWritePerformed", false },
            { "schedulerRequired", false },
            { "runtimeTool", "GoogleTest" }
        };
    }

    private static List<string> EmptyList() { return new List<string>(); }
    private static AscetTestValidationIssue Issue(string path, string code, string message) { return new AscetTestValidationIssue { Path = path, Code = code, Message = message }; }
    private static string FirstIssueCode(IList<AscetTestValidationIssue> issues, string fallback) { return issues == null || issues.Count == 0 || String.IsNullOrWhiteSpace(issues[0].Code) ? fallback : issues[0].Code; }

    private static string JoinArguments(List<string> arguments)
    {
        StringBuilder builder = new StringBuilder();
        for (int index = 0; index < arguments.Count; index++)
        {
            if (index > 0) builder.Append(' ');
            builder.Append(Quote(arguments[index]));
        }
        return builder.ToString();
    }

    private static string Quote(string value)
    {
        string text = value ?? String.Empty;
        if (text.Length == 0) return "\"\"";
        if (text.IndexOfAny(new[] { ' ', '\t', '"' }) < 0) return text;
        return "\"" + text.Replace("\"", "\\\"") + "\"";
    }

    private sealed class ProcessRunResult
    {
        public bool Started;
        public bool TimedOut;
        public int ExitCode;
        public string Stdout;
        public string Stderr;
        public long DurationMs;
        public string StartedAt;
        public string FinishedAt;
    }

    private sealed class XmlSummary
    {
        public bool Valid;
        public int TestsRun;
        public int Failures;
        public int Errors;
        public int Disabled;
        public XmlSummary() { TestsRun = 0; Failures = 0; Errors = 0; Disabled = 0; }
    }
}
