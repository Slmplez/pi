using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Reflection;
using System.Security.Cryptography;
using System.Text;
using System.Threading;
using System.Web.Script.Serialization;

public sealed class AscetWorkerJobSpec
{
    public string JobID { get; set; }
    public string WorkerID { get; set; }
    public string JobType { get; set; }
    public string SessionID { get; set; }
    public string RefID { get; set; }
    public Dictionary<string, object> Request { get; set; }
    public List<AscetWorkerApplyOperationSpec> Operations { get; set; }
}

public sealed class AscetWorkerApplyOperationSpec
{
    public string OperationID { get; set; }
    public string OperationType { get; set; }
    public string TargetPath { get; set; }
    public string InputJSON { get; set; }
}

public sealed class AscetWorkerJobResult
{
    public bool Success { get; set; }
    public string Error { get; set; }
    public AscetWorkerSnapshotResult Snapshot { get; set; }
    public List<AscetWorkerOperationResult> Operations { get; set; }
    public Dictionary<string, object> Probe { get; set; }
    public Dictionary<string, object> Meta { get; set; }
}

public sealed class AscetWorkerSnapshotResult
{
    public string ComponentPath { get; set; }
    public string ComponentKind { get; set; }
    public int TraceDepth { get; set; }
    public string Fingerprint { get; set; }
    public string Summary { get; set; }
    public string SnapshotJSON { get; set; }
}

public sealed class AscetWorkerOperationResult
{
    public string OperationID { get; set; }
    public bool Success { get; set; }
    public string StdoutJSON { get; set; }
    public string StderrText { get; set; }
}

public sealed class AscetProcessResult
{
    public int ExitCode { get; set; }
    public string Stdout { get; set; }
    public string Stderr { get; set; }
}

class AscetWorker
{
    static readonly JavaScriptSerializer Serializer = new JavaScriptSerializer();

    static int Main(string[] args)
    {
        if (args != null && args.Length >= 2 && String.Equals(args[0], "run-job", StringComparison.OrdinalIgnoreCase))
        {
            return RunJobMode(args[1]);
        }

        return RunLegacyMode(args);
    }

    private static int RunLegacyMode(string[] args)
    {
        try
        {
            string workerId = GetArgument(args, 0, "worker-1");
            string mode = GetArgument(args, 1, "read");
            int iterations = Int32.Parse(GetArgument(args, 2, "10"));

            ConcurrencyRunResult result = AscetConcurrencySupport.ExecuteWorker(workerId, mode, iterations);
            Console.WriteLine(AscetConcurrencySupport.SerializeResult(result));
            return result.FailureCount > 0 ? 2 : 0;
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine(AscetConcurrencySupport.FormatException(ex));
            return 1;
        }
    }

    private static int RunJobMode(string jobFilePath)
    {
        int exitCode = 1;
        string stdout = String.Empty;
        string stderr = String.Empty;

        Thread thread = new Thread(delegate()
        {
            try
            {
                if (String.IsNullOrWhiteSpace(jobFilePath) || !File.Exists(jobFilePath))
                {
                    throw new InvalidOperationException("Worker job file was not found: " + jobFilePath);
                }

                string payload = File.ReadAllText(jobFilePath);
                AscetWorkerJobSpec spec = ParseJobSpec(payload);
                AscetWorkerJobResult result = ExecuteJob(spec);
                stdout = SerializeJobResult(result);
                exitCode = result.Success ? 0 : 2;
            }
            catch (Exception ex)
            {
                stderr = FormatException(ex);
                exitCode = 1;
            }
        });

        thread.IsBackground = false;
        thread.SetApartmentState(ApartmentState.STA);
        thread.Start();
        thread.Join();

        if (!String.IsNullOrEmpty(stdout))
        {
            Console.Write(stdout);
        }
        if (!String.IsNullOrEmpty(stderr))
        {
            Console.Error.Write(stderr);
        }
        return exitCode;
    }

    private static AscetWorkerJobResult ExecuteJob(AscetWorkerJobSpec spec)
    {
        if (spec == null)
        {
            throw new InvalidOperationException("Worker job spec must not be null.");
        }

        AscetWorkerJobResult result = new AscetWorkerJobResult
        {
            Success = true,
            Operations = new List<AscetWorkerOperationResult>(),
            Meta = new Dictionary<string, object>()
        };

        switch ((spec.JobType ?? String.Empty).Trim().ToLowerInvariant())
        {
            case "snapshot_read":
                result.Snapshot = ExecuteSnapshotRead(spec);
                result.Meta["workerId"] = spec.WorkerID ?? String.Empty;
                return result;
            case "apply_batch":
                bool applySuccess;
                result.Operations = ExecuteApplyBatch(spec, out applySuccess);
                result.Success = applySuccess;
                if (!applySuccess)
                {
                    result.Error = "One or more apply operations failed.";
                }
                result.Meta["workerId"] = spec.WorkerID ?? String.Empty;
                return result;
            case "health_probe":
            case "verify_batch":
                result.Probe = new Dictionary<string, object>
                {
                    { "ok", true },
                    { "workerId", spec.WorkerID ?? String.Empty }
                };
                return result;
            default:
                result.Success = false;
                result.Error = "Unsupported worker job type '" + (spec.JobType ?? String.Empty) + "'.";
                return result;
        }
    }

    private static AscetWorkerSnapshotResult ExecuteSnapshotRead(AscetWorkerJobSpec spec)
    {
        string componentPath = GetString(spec.Request, "component_path");
        string componentKind = GetString(spec.Request, "component_kind");
        int traceDepth = GetInt(spec.Request, "trace_depth", 0);
        AscetProcessResult process = ExecuteCliExecOrFallback(
            "read_component_snapshot",
            "AscetReadComponentSnapshot.exe",
            new string[] { componentPath, "--trace-depth", traceDepth.ToString(), "--json" });

        if (process.ExitCode != 0)
        {
            throw new InvalidOperationException(FirstNonEmpty(process.Stderr, FirstNonEmpty(process.Stdout, "Snapshot read failed.")));
        }

        string snapshotJson = (process.Stdout ?? String.Empty).Trim();
        return new AscetWorkerSnapshotResult
        {
            ComponentPath = componentPath,
            ComponentKind = FirstNonEmpty(componentKind, "class"),
            TraceDepth = traceDepth,
            Fingerprint = ComputeSha256(snapshotJson),
            Summary = ExtractSnapshotSummary(snapshotJson),
            SnapshotJSON = snapshotJson
        };
    }

    private static List<AscetWorkerOperationResult> ExecuteApplyBatch(AscetWorkerJobSpec spec, out bool success)
    {
        List<AscetWorkerOperationResult> results = new List<AscetWorkerOperationResult>();
        success = true;

        if (spec.Operations == null)
        {
            return results;
        }

        bool failed = false;
        for (int i = 0; i < spec.Operations.Count; i++)
        {
            AscetWorkerApplyOperationSpec operation = spec.Operations[i];
            if (failed)
            {
                results.Add(new AscetWorkerOperationResult
                {
                    OperationID = operation == null ? String.Empty : (operation.OperationID ?? String.Empty),
                    Success = false,
                    StderrText = "Skipped because a prior operation failed."
                });
                continue;
            }

            AscetWorkerOperationResult result = ExecuteApplyOperation(operation);
            results.Add(result);
            if (!result.Success)
            {
                success = false;
                failed = true;
            }
        }

        return results;
    }

    private static AscetWorkerOperationResult ExecuteApplyOperation(AscetWorkerApplyOperationSpec operation)
    {
        Dictionary<string, object> input = ParseJsonObject(operation == null ? null : operation.InputJSON);
        string operationType = operation == null ? String.Empty : (operation.OperationType ?? String.Empty);
        string componentPath = GetString(input, "component_path");
        string code = GetString(input, "code");
        string specJson = GetString(input, "spec_json");
        string signatureJson = GetString(input, "signature_json");
        string tempFile = null;

        try
        {
            switch (operationType)
            {
                case "ascet.set_method_code":
                    tempFile = WriteTempCodeFile(code);
                    return ExecuteCliExecOperationProcess(operation, "set_method_code", "AscetSetMethodCode.exe", new string[]
                    {
                        componentPath,
                        GetString(input, "method_name"),
                        tempFile,
                        "--verify-readback"
                    }, false);

                case "ascet.set_module_code":
                    tempFile = WriteTempCodeFile(code);
                    string moduleOperation = FirstNonEmpty(GetString(input, "operation"), "set-header");
                    if (String.Equals(moduleOperation, "set-method", StringComparison.OrdinalIgnoreCase))
                    {
                        return ExecuteCliExecOperationProcess(operation, "set_module_code", "AscetSetModuleCode.exe", new string[]
                        {
                            componentPath,
                            moduleOperation,
                            GetString(input, "method_name"),
                            tempFile,
                            "--verify-readback",
                            "--json"
                        }, true);
                    }
                    return ExecuteCliExecOperationProcess(operation, "set_module_code", "AscetSetModuleCode.exe", new string[]
                    {
                        componentPath,
                        moduleOperation,
                        tempFile,
                        "--verify-readback",
                        "--json"
                    }, true);

                case "ascet.set_state_machine_code":
                    tempFile = WriteTempCodeFile(code);
                    string stateMachineOperation = FirstNonEmpty(GetString(input, "operation"), "set-method");
                    if (!String.Equals(stateMachineOperation, "set-method", StringComparison.OrdinalIgnoreCase))
                    {
                        return new AscetWorkerOperationResult
                        {
                            OperationID = operation == null ? String.Empty : (operation.OperationID ?? String.Empty),
                            Success = false,
                            StderrText = "Phase 1 worker currently supports only state-machine set-method operations."
                        };
                    }
                    return ExecuteCliExecOperationProcess(operation, "set_state_machine_code", "AscetSetStateMachineCode.exe", new string[]
                    {
                        componentPath,
                        stateMachineOperation,
                        GetString(input, "method_name"),
                        tempFile,
                        "--verify-readback",
                        "--json"
                    }, true);

                case "ascet.apply_element_spec":
                    tempFile = WriteTempCodeFile(specJson);
                    return ExecuteCliExecOperationProcess(operation, "apply_element_spec", "AscetApplyElementSpec.exe", new string[]
                    {
                        componentPath,
                        tempFile,
                        "--verify-readback",
                        "--json"
                    }, true);

                case "ascet.set_method_signature":
                    tempFile = WriteTempCodeFile(signatureJson);
                    return ExecuteCliExecOperationProcess(operation, "set_method_signature", "AscetSetMethodSignature.exe", new string[]
                    {
                        componentPath,
                        GetString(input, "method_name"),
                        "--signature-json",
                        tempFile,
                        "--verify-readback",
                        "--json"
                    }, true);

                default:
                    return new AscetWorkerOperationResult
                    {
                        OperationID = operation == null ? String.Empty : (operation.OperationID ?? String.Empty),
                        Success = false,
                        StderrText = "Unsupported apply operation '" + operationType + "'."
                    };
            }
        }
        finally
        {
            if (!String.IsNullOrEmpty(tempFile) && File.Exists(tempFile))
            {
                try
                {
                    File.Delete(tempFile);
                }
                catch
                {
                }
            }
        }
    }

    private static AscetWorkerOperationResult ExecuteOperationProcess(AscetWorkerApplyOperationSpec operation, string executableName, string[] arguments, bool preserveJsonOutput)
    {
        AscetProcessResult process = ExecuteSibling(executableName, arguments);
        return new AscetWorkerOperationResult
        {
            OperationID = operation == null ? String.Empty : (operation.OperationID ?? String.Empty),
            Success = process.ExitCode == 0,
            StdoutJSON = NormalizeProcessOutput(process.Stdout, preserveJsonOutput),
            StderrText = (process.Stderr ?? String.Empty).Trim()
        };
    }

    private static AscetWorkerOperationResult ExecuteCliExecOperationProcess(AscetWorkerApplyOperationSpec operation, string operationId, string fallbackExecutableName, string[] arguments, bool preserveJsonOutput)
    {
        AscetProcessResult process = ExecuteCliExecOrFallback(operationId, fallbackExecutableName, arguments);
        return new AscetWorkerOperationResult
        {
            OperationID = operation == null ? String.Empty : (operation.OperationID ?? String.Empty),
            Success = process.ExitCode == 0,
            StdoutJSON = NormalizeProcessOutput(process.Stdout, preserveJsonOutput),
            StderrText = (process.Stderr ?? String.Empty).Trim()
        };
    }

    private static AscetProcessResult ExecuteSibling(string executableName, string[] arguments)
    {
        string baseDirectory = AppDomain.CurrentDomain.BaseDirectory;
        string executablePath = Path.Combine(baseDirectory, executableName);
        if (!File.Exists(executablePath))
        {
            throw new FileNotFoundException("Worker dependency executable was not found.", executablePath);
        }

        ProcessStartInfo startInfo = new ProcessStartInfo();
        startInfo.FileName = executablePath;
        startInfo.WorkingDirectory = baseDirectory;
        startInfo.UseShellExecute = false;
        startInfo.CreateNoWindow = true;
        startInfo.RedirectStandardOutput = true;
        startInfo.RedirectStandardError = true;
        if (arguments != null)
        {
            for (int i = 0; i < arguments.Length; i++)
            {
                startInfo.Arguments += (i == 0 ? String.Empty : " ") + QuoteArgument(arguments[i]);
            }
        }

        using (Process process = new Process())
        {
            process.StartInfo = startInfo;
            process.Start();
            string stdout = process.StandardOutput.ReadToEnd();
            string stderr = process.StandardError.ReadToEnd();
            process.WaitForExit();
            return new AscetProcessResult
            {
                ExitCode = process.ExitCode,
                Stdout = stdout,
                Stderr = stderr
            };
        }
    }

    private static AscetProcessResult ExecuteCliExecOrFallback(string operationId, string fallbackExecutableName, string[] arguments)
    {
        string baseDirectory = AppDomain.CurrentDomain.BaseDirectory;
        string cliPath = Path.Combine(baseDirectory, "AscetCli.exe");
        if (File.Exists(cliPath))
        {
            List<string> cliArguments = new List<string>();
            cliArguments.Add("exec");
            cliArguments.Add(operationId ?? String.Empty);
            if (arguments != null)
            {
                for (int i = 0; i < arguments.Length; i++)
                {
                    cliArguments.Add(arguments[i] ?? String.Empty);
                }
            }

            return ExecuteSibling("AscetCli.exe", cliArguments.ToArray());
        }

        return ExecuteSibling(fallbackExecutableName, arguments);
    }

    private static string QuoteArgument(string value)
    {
        if (value == null)
        {
            return "\"\"";
        }

        return "\"" + value.Replace("\"", "\\\"") + "\"";
    }

    private static string WriteTempCodeFile(string code)
    {
        string path = Path.Combine(Path.GetTempPath(), "ascet-worker-" + Guid.NewGuid().ToString("N") + ".txt");
        File.WriteAllText(path, code ?? String.Empty, Encoding.UTF8);
        return path;
    }

    private static string NormalizeProcessOutput(string stdout, bool preserveJsonOutput)
    {
        string trimmed = (stdout ?? String.Empty).Trim();
        if (trimmed.Length == 0)
        {
            return "{}";
        }
        if (preserveJsonOutput && trimmed.StartsWith("{", StringComparison.Ordinal))
        {
            return trimmed;
        }
        return Serializer.Serialize(new Dictionary<string, object>
        {
            { "raw_output", trimmed }
        });
    }

    private static string ExtractSnapshotSummary(string snapshotJson)
    {
        Dictionary<string, object> payload = ParseJsonObject(snapshotJson);
        return GetString(payload, "Summary");
    }

    private static string ComputeSha256(string value)
    {
        using (SHA256 sha = SHA256.Create())
        {
            byte[] bytes = Encoding.UTF8.GetBytes(value ?? String.Empty);
            byte[] hash = sha.ComputeHash(bytes);
            StringBuilder builder = new StringBuilder(hash.Length * 2);
            for (int i = 0; i < hash.Length; i++)
            {
                builder.Append(hash[i].ToString("x2"));
            }
            return builder.ToString();
        }
    }

    private static Dictionary<string, object> ParseJsonObject(string payload)
    {
        if (String.IsNullOrWhiteSpace(payload))
        {
            return new Dictionary<string, object>();
        }

        object raw = Serializer.DeserializeObject(payload);
        Dictionary<string, object> result = raw as Dictionary<string, object>;
        return result ?? new Dictionary<string, object>();
    }

    private static string GetString(Dictionary<string, object> payload, string key)
    {
        if (payload == null || String.IsNullOrEmpty(key) || !payload.ContainsKey(key) || payload[key] == null)
        {
            return String.Empty;
        }

        return Convert.ToString(payload[key]) ?? String.Empty;
    }

    private static int GetInt(Dictionary<string, object> payload, string key, int fallback)
    {
        if (payload == null || String.IsNullOrEmpty(key) || !payload.ContainsKey(key) || payload[key] == null)
        {
            return fallback;
        }

        try
        {
            return Convert.ToInt32(payload[key]);
        }
        catch
        {
            return fallback;
        }
    }

    private static string FirstNonEmpty(string primary, string fallback)
    {
        return String.IsNullOrWhiteSpace(primary) ? fallback : primary;
    }

    private static string GetArgument(string[] args, int index, string fallback)
    {
        return args != null && args.Length > index ? args[index] : fallback;
    }

    private static AscetWorkerJobSpec ParseJobSpec(string payload)
    {
        Dictionary<string, object> root = ParseJsonObject(payload);
        AscetWorkerJobSpec spec = new AscetWorkerJobSpec();
        spec.JobID = GetString(root, "job_id");
        spec.WorkerID = GetString(root, "worker_id");
        spec.JobType = GetString(root, "job_type");
        spec.SessionID = GetString(root, "session_id");
        spec.RefID = GetString(root, "ref_id");
        spec.Request = GetObjectDictionary(root, "request");
        spec.Operations = ParseOperations(GetObjectArray(root, "operations"));
        return spec;
    }

    private static List<AscetWorkerApplyOperationSpec> ParseOperations(object[] rawOperations)
    {
        List<AscetWorkerApplyOperationSpec> operations = new List<AscetWorkerApplyOperationSpec>();
        if (rawOperations == null)
        {
            return operations;
        }

        for (int i = 0; i < rawOperations.Length; i++)
        {
            Dictionary<string, object> item = rawOperations[i] as Dictionary<string, object>;
            if (item == null)
            {
                continue;
            }

            operations.Add(new AscetWorkerApplyOperationSpec
            {
                OperationID = GetString(item, "operation_id"),
                OperationType = GetString(item, "operation_type"),
                TargetPath = GetString(item, "target_path"),
                InputJSON = GetString(item, "input_json")
            });
        }

        return operations;
    }

    private static string SerializeJobResult(AscetWorkerJobResult result)
    {
        Dictionary<string, object> payload = new Dictionary<string, object>();
        payload["success"] = result != null && result.Success;
        payload["error"] = result == null ? String.Empty : (result.Error ?? String.Empty);
        payload["snapshot"] = result != null && result.Snapshot != null ? SerializeSnapshot(result.Snapshot) : null;
        payload["operations"] = SerializeOperations(result == null ? null : result.Operations);
        payload["probe"] = result == null ? null : result.Probe;
        payload["meta"] = result == null ? null : result.Meta;
        return Serializer.Serialize(payload);
    }

    private static Dictionary<string, object> SerializeSnapshot(AscetWorkerSnapshotResult snapshot)
    {
        Dictionary<string, object> payload = new Dictionary<string, object>();
        payload["component_path"] = snapshot.ComponentPath ?? String.Empty;
        payload["component_kind"] = snapshot.ComponentKind ?? String.Empty;
        payload["trace_depth"] = snapshot.TraceDepth;
        payload["fingerprint"] = snapshot.Fingerprint ?? String.Empty;
        payload["summary"] = snapshot.Summary ?? String.Empty;
        payload["snapshot_json"] = snapshot.SnapshotJSON ?? String.Empty;
        return payload;
    }

    private static List<Dictionary<string, object>> SerializeOperations(List<AscetWorkerOperationResult> operations)
    {
        List<Dictionary<string, object>> payload = new List<Dictionary<string, object>>();
        if (operations == null)
        {
            return payload;
        }

        for (int i = 0; i < operations.Count; i++)
        {
            AscetWorkerOperationResult operation = operations[i];
            Dictionary<string, object> item = new Dictionary<string, object>();
            item["operation_id"] = operation == null ? String.Empty : (operation.OperationID ?? String.Empty);
            item["success"] = operation != null && operation.Success;
            item["stdout_json"] = operation == null ? String.Empty : (operation.StdoutJSON ?? String.Empty);
            item["stderr_text"] = operation == null ? String.Empty : (operation.StderrText ?? String.Empty);
            payload.Add(item);
        }

        return payload;
    }

    private static Dictionary<string, object> GetObjectDictionary(Dictionary<string, object> payload, string key)
    {
        if (payload == null || String.IsNullOrEmpty(key) || !payload.ContainsKey(key) || payload[key] == null)
        {
            return new Dictionary<string, object>();
        }

        Dictionary<string, object> result = payload[key] as Dictionary<string, object>;
        return result ?? new Dictionary<string, object>();
    }

    private static object[] GetObjectArray(Dictionary<string, object> payload, string key)
    {
        if (payload == null || String.IsNullOrEmpty(key) || !payload.ContainsKey(key) || payload[key] == null)
        {
            return null;
        }

        return payload[key] as object[];
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
