using System;
using System.Collections;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;

public static class AscetTestInspectionService
{
    private sealed class OperationSpec
    {
        public string Key;
        public string Operation;
        public List<string> Arguments;
    }

    public static Dictionary<string, object> Execute(Dictionary<string, object> request)
    {
        string runId = AscetTestContracts.GetString(request, "runId");
        string componentPath = NormalizePath(AscetTestContracts.GetString(request, "componentPath"));
        List<AscetTestValidationIssue> validationErrors = new List<AscetTestValidationIssue>();
        if (String.IsNullOrWhiteSpace(runId)) AddError(validationErrors, "runId", "required", "runId is required.");
        if (String.IsNullOrWhiteSpace(componentPath) || componentPath.StartsWith("/", StringComparison.Ordinal) || componentPath.Contains("../"))
        {
            AddError(validationErrors, "componentPath", "unsafe_path", "componentPath must be a relative ASCET path without '..'.");
        }
        if (validationErrors.Count > 0)
        {
            return AscetTestEnvelope.Blocked("inspect", runId, new Dictionary<string, object>
            {
                { "schemaVersion", "ascet-test-inspection/v1" },
                { "componentPath", componentPath },
                { "ready", false }
            }, "inspection_incomplete", "inspect request validation failed.", validationErrors, new List<AscetTestValidationIssue>());
        }

        int traceDepth = AscetTestContracts.GetInteger(request, "traceDepth", 2);
        if (traceDepth < 0) traceDepth = 2;
        List<OperationSpec> plan = BuildPlan(componentPath, traceDepth, AscetTestContracts.GetString(request, "objectKind"));
        Dictionary<string, object> fixture = AscetTestContracts.GetDictionary(request, "cliResults");
        Dictionary<string, object> operationResults = new Dictionary<string, object>();
        bool liveExecutionStarted = fixture == null;
        for (int index = 0; index < plan.Count; index++)
        {
            OperationSpec spec = plan[index];
            operationResults[spec.Key] = fixture != null
                ? (fixture.ContainsKey(spec.Key) ? fixture[spec.Key] : FailureOperation("fixture_missing", "Offline cliResults fixture is missing " + spec.Key + "."))
                : RunCliOperation(request, spec);
        }

        List<string> methodNames = ExtractMethodNames(operationResults["read_component_children:methods"]);
        IList requestedMethods = AscetTestContracts.GetValue(request, "methodNames") as IList;
        if (requestedMethods != null && requestedMethods.Count > 0)
        {
            methodNames = new List<string>();
            for (int index = 0; index < requestedMethods.Count; index++)
            {
                string name = Convert.ToString(requestedMethods[index]);
                if (!String.IsNullOrWhiteSpace(name) && !methodNames.Contains(name)) methodNames.Add(name.Trim());
            }
            methodNames.Sort(StringComparer.Ordinal);
        }

        bool includeMethodCode = !request.ContainsKey("includeMethodCode") || AscetTestContracts.GetBoolean(request, "includeMethodCode", true);
        for (int index = 0; index < methodNames.Count; index++)
        {
            string methodName = methodNames[index];
            OperationSpec signature = new OperationSpec
            {
                Key = "read_method_signature:" + methodName,
                Operation = "read_method_signature",
                Arguments = new List<string> { "exec", "read_method_signature", componentPath, methodName, "--json" }
            };
            operationResults[signature.Key] = fixture != null
                ? (fixture.ContainsKey(signature.Key) ? fixture[signature.Key] : FailureOperation("fixture_missing", "Offline cliResults fixture is missing " + signature.Key + "."))
                : RunCliOperation(request, signature);
            if (includeMethodCode)
            {
                OperationSpec code = new OperationSpec
                {
                    Key = "read_method_code:" + methodName,
                    Operation = "read_method_code",
                    Arguments = new List<string> { "exec", "read_method_code", componentPath, methodName, "--json" }
                };
                operationResults[code.Key] = fixture != null
                    ? (fixture.ContainsKey(code.Key) ? fixture[code.Key] : FailureOperation("fixture_missing", "Offline cliResults fixture is missing " + code.Key + "."))
                    : RunCliOperation(request, code);
            }
        }

        Dictionary<string, object> inspection = BuildInspection(request, componentPath, operationResults, liveExecutionStarted);
        string inspectionPath = AscetTestArtifactWriter.WriteJson(request, runId, "inspection.json", inspection);
        Dictionary<string, object> data = new Dictionary<string, object>
        {
            { "schemaVersion", "ascet-test-inspection/v1" },
            { "ready", GetBoolean(inspection, "complete") },
            { "runId", runId },
            { "componentPath", componentPath },
            { "inspection", inspection },
            { "artifactPath", inspectionPath },
            { "operationCount", operationResults.Count },
            { "liveExecutionStarted", liveExecutionStarted }
        };

        List<AscetTestValidationIssue> warnings = IssuesFromStrings(GetStringList(inspection, "warnings"), "inspection_warning");
        List<AscetTestValidationIssue> errors = IssuesFromStrings(GetStringList(inspection, "errors"), "inspection_incomplete");
        if (errors.Count > 0)
        {
            string code = liveExecutionStarted ? "inspection_incomplete" : "inspection_incomplete";
            return AscetTestEnvelope.Blocked(
                "inspect",
                runId,
                data,
                code,
                "ASCET inspection did not produce a complete readback.",
                errors,
                warnings,
                new Dictionary<string, object>
                {
                    { "liveExecutionStarted", liveExecutionStarted },
                    { "schedulerUsed", false },
                    { "schedulerRequired", true },
                    { "serialOperations", true }
                });
        }
        return AscetTestEnvelope.Success(
            "inspect",
            runId,
            "inspected",
            data,
            warnings,
            new Dictionary<string, object>
            {
                { "liveExecutionStarted", liveExecutionStarted },
                { "schedulerRequired", true },
                { "schedulerUsedByExe", false },
                { "serialOperations", true }
            });
    }

    private static List<OperationSpec> BuildPlan(string componentPath, int traceDepth, string objectKind)
    {
        List<OperationSpec> plan = new List<OperationSpec>
        {
            Spec("read_component_summary", "read_component_summary", componentPath),
            Spec("read_component_snapshot", "read_component_snapshot", componentPath, "--trace-depth", traceDepth.ToString()),
            Spec("read_component_children:methods", "read_component_children", componentPath, "--group", "methods"),
            Spec("read_component_children:elements", "read_component_children", componentPath, "--group", "elements"),
            Spec("read_component_children:components", "read_component_children", componentPath, "--group", "components"),
            Spec("read_component_refs", "read_component_refs", componentPath, "--direction", "out", "--depth", traceDepth.ToString()),
            Spec("read_implementation", "read_implementation", componentPath, "--default", "--detail-level", "full")
        };
        if (String.Equals(objectKind, "statemachine", StringComparison.OrdinalIgnoreCase))
        {
            plan.Add(Spec("read_state_machine_flow", "read_state_machine_flow", componentPath, "--trace-depth", traceDepth.ToString(), "--detail-level", "full"));
        }
        return plan;
    }

    private static OperationSpec Spec(string key, string operation, string componentPath, params string[] options)
    {
        List<string> arguments = new List<string> { "exec", operation, componentPath };
        if (options != null) arguments.AddRange(options);
        arguments.Add("--json");
        return new OperationSpec { Key = key, Operation = operation, Arguments = arguments };
    }

    private static object RunCliOperation(Dictionary<string, object> request, OperationSpec spec)
    {
        string cliPath = AscetTestContracts.GetString(request, "cliPath");
        if (String.IsNullOrWhiteSpace(cliPath)) cliPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "AscetCli.exe");
        cliPath = AscetTestContracts.ResolvePath(cliPath, Directory.GetCurrentDirectory());
        if (!File.Exists(cliPath))
        {
            return FailureOperation("cli_missing", "ASCET CLI not found: " + cliPath);
        }

        string workingDirectory = AscetTestContracts.GetString(request, "cliWorkingDirectory");
        if (String.IsNullOrWhiteSpace(workingDirectory)) workingDirectory = Directory.GetCurrentDirectory();
        if (String.IsNullOrWhiteSpace(workingDirectory)) workingDirectory = Directory.GetCurrentDirectory();
        workingDirectory = AscetTestContracts.ResolvePath(workingDirectory, Directory.GetCurrentDirectory());
        int timeoutMs = AscetTestContracts.GetInteger(request, "timeoutMs", 60000);
        if (timeoutMs < 1000) timeoutMs = 1000;

        ProcessStartInfo startInfo = new ProcessStartInfo
        {
            FileName = cliPath,
            Arguments = JoinArguments(spec.Arguments),
            WorkingDirectory = workingDirectory,
            UseShellExecute = false,
            CreateNoWindow = true,
            RedirectStandardOutput = true,
            RedirectStandardError = true
        };
        using (Process process = new Process { StartInfo = startInfo })
        {
            try
            {
                if (!process.Start()) return FailureOperation("cli_start_failed", "Could not start ASCET CLI.");
                string stdout = process.StandardOutput.ReadToEnd();
                string stderr = process.StandardError.ReadToEnd();
                if (!process.WaitForExit(timeoutMs))
                {
                    try { process.Kill(); } catch { }
                    return FailureOperation("cli_timeout", "ASCET CLI timed out during " + spec.Operation + ".");
                }
                Dictionary<string, object> parsed = null;
                try { parsed = AscetTestContracts.Deserialize(stdout) as Dictionary<string, object>; }
                catch (Exception ex) { return FailureOperation("cli_invalid_json", ex.Message); }
                if (parsed == null) return FailureOperation("cli_invalid_json", "ASCET CLI produced a non-object response.");
                if (process.ExitCode != 0 || (parsed.ContainsKey("ok") && !GetBoolean(parsed, "ok")))
                {
                    if (!parsed.ContainsKey("error")) parsed["error"] = new Dictionary<string, object> { { "code", "cli_failed" }, { "message", stderr.Trim() } };
                }
                return parsed;
            }
            catch (Exception ex)
            {
                return FailureOperation("cli_start_failed", ex.Message);
            }
        }
    }

    private static Dictionary<string, object> BuildInspection(Dictionary<string, object> request, string componentPath, Dictionary<string, object> operations, bool liveExecutionStarted)
    {
        Dictionary<string, object> summary = ToDictionary(UnwrapResult(GetOperation(operations, "read_component_summary"))) ?? new Dictionary<string, object>();
        Dictionary<string, object> snapshot = ToDictionary(UnwrapResult(GetOperation(operations, "read_component_snapshot"))) ?? new Dictionary<string, object>();
        object methodsPayload = UnwrapResult(GetOperation(operations, "read_component_children:methods"));
        object elementsPayload = UnwrapResult(GetOperation(operations, "read_component_children:elements"));
        object componentsPayload = UnwrapResult(GetOperation(operations, "read_component_children:components"));
        object refsPayload = UnwrapResult(GetOperation(operations, "read_component_refs"));
        string objectKind = ExtractObjectKind(summary, snapshot, AscetTestContracts.GetString(request, "objectKind"));

        List<string> errors = new List<string>();
        List<string> warnings = new List<string>();
        foreach (KeyValuePair<string, object> entry in operations)
        {
            if (!OperationOk(entry.Value)) errors.Add(entry.Key + ": " + (OperationError(entry.Value) ?? "operation failed"));
        }
        RequireOperation(operations, "read_component_summary", errors);
        RequireOperation(operations, "read_component_children:methods", errors);
        RequireOperation(operations, "read_component_children:elements", errors);
        RequireOperation(operations, "read_component_refs", errors);

        List<Dictionary<string, object>> methods = ExtractMethods(methodsPayload, operations);
        Dictionary<string, object> interfaces = ExtractInterfaces(elementsPayload);
        List<Dictionary<string, object>> dependencies = ExtractDependencies(refsPayload, componentsPayload);
        if (methods.Count == 0) warnings.Add("No methods were returned by the methods child read.");
        if (GetItems(interfaces, "inputs").Count == 0 && GetItems(interfaces, "outputs").Count == 0) warnings.Add("No input/output interface ports were returned.");
        if (dependencies.Count == 0) warnings.Add("No outgoing dependencies were returned.");

        List<Dictionary<string, object>> operationPayload = new List<Dictionary<string, object>>();
        foreach (KeyValuePair<string, object> entry in operations)
        {
            Dictionary<string, object> operation = new Dictionary<string, object>
            {
                { "operation", entry.Key },
                { "ok", OperationOk(entry.Value) }
            };
            if (OperationOk(entry.Value)) operation["result"] = UnwrapResult(entry.Value);
            else operation["error"] = ToDictionary(AscetTestContracts.GetValue(ToDictionary(entry.Value), "error"));
            operationPayload.Add(operation);
        }

        Dictionary<string, object> raw = new Dictionary<string, object>
        {
            { "summary", summary },
            { "snapshot", snapshot },
            { "methods", methodsPayload },
            { "elements", elementsPayload },
            { "components", componentsPayload },
            { "references", refsPayload }
        };
        Dictionary<string, object> inspection = new Dictionary<string, object>
        {
            { "schemaVersion", "ascet-inspection/v1" },
            { "componentPath", componentPath },
            { "objectKind", objectKind },
            { "complete", errors.Count == 0 },
            { "summary", summary },
            { "methods", methods },
            { "interfaces", interfaces },
            { "dependencies", dependencies },
            { "operations", operationPayload },
            { "warnings", warnings },
            { "errors", errors },
            { "cycles", ExtractCycles(summary, snapshot) },
            { "raw", raw },
            { "liveExecutionStarted", liveExecutionStarted }
        };
        inspection["sourceHash"] = AscetTestContracts.ComputeSha256(AscetTestContracts.Serialize(inspection));
        return inspection;
    }

    private static List<Dictionary<string, object>> ExtractMethods(object payload, Dictionary<string, object> operations)
    {
        Dictionary<string, Dictionary<string, object>> byName = new Dictionary<string, Dictionary<string, object>>(StringComparer.Ordinal);
        foreach (object item in GetItems(payload, "methods", "items", "children"))
        {
            Dictionary<string, object> record = ToDictionary(item);
            string name = record == null ? Convert.ToString(item) : FirstString(record, "name", "methodName");
            if (String.IsNullOrWhiteSpace(name)) continue;
            if (!byName.ContainsKey(name)) byName[name] = new Dictionary<string, object> { { "name", name } };
            if (record != null) byName[name]["metadata"] = record;
        }
        foreach (KeyValuePair<string, object> entry in operations)
        {
            if (!entry.Key.StartsWith("read_method_signature:", StringComparison.Ordinal) && !entry.Key.StartsWith("read_method_code:", StringComparison.Ordinal)) continue;
            string name = entry.Key.Substring(entry.Key.IndexOf(':') + 1);
            if (!byName.ContainsKey(name)) byName[name] = new Dictionary<string, object> { { "name", name } };
            object value = UnwrapResult(entry.Value);
            if (entry.Key.StartsWith("read_method_signature:", StringComparison.Ordinal)) byName[name]["signature"] = value;
            else
            {
                Dictionary<string, object> code = ToDictionary(value);
                byName[name]["code"] = code == null ? Convert.ToString(value) : FirstString(code, "code", "text", "body");
                if (code != null) byName[name]["language"] = FirstString(code, "language");
            }
        }
        List<Dictionary<string, object>> result = new List<Dictionary<string, object>>(byName.Values);
        result.Sort(delegate(Dictionary<string, object> left, Dictionary<string, object> right) { return StringComparer.Ordinal.Compare(AscetTestContracts.GetString(left, "name"), AscetTestContracts.GetString(right, "name")); });
        return result;
    }

    private static List<string> ExtractMethodNames(object payload)
    {
        List<string> names = new List<string>();
        foreach (object item in GetItems(UnwrapResult(payload), "methods", "items", "children"))
        {
            Dictionary<string, object> record = ToDictionary(item);
            string name = record == null ? Convert.ToString(item) : FirstString(record, "name", "methodName");
            if (!String.IsNullOrWhiteSpace(name) && !names.Contains(name)) names.Add(name.Trim());
        }
        names.Sort(StringComparer.Ordinal);
        return names;
    }

    private static Dictionary<string, object> ExtractInterfaces(object payload)
    {
        List<object> inputs = new List<object>();
        List<object> outputs = new List<object>();
        List<object> parameters = new List<object>();
        List<object> variables = new List<object>();
        foreach (object item in GetItems(payload, "elements", "items", "ports", "variables"))
        {
            Dictionary<string, object> port = ToPort(item);
            if (port == null) continue;
            string direction = AscetTestContracts.GetString(port, "direction");
            string kind = AscetTestContracts.GetString(port, "kind");
            if (direction == "input") inputs.Add(port);
            else if (direction == "output") outputs.Add(port);
            if (kind == "parameter") parameters.Add(port);
            if (kind == "variable") variables.Add(port);
        }
        return new Dictionary<string, object> { { "inputs", inputs }, { "outputs", outputs }, { "parameters", parameters }, { "variables", variables } };
    }

    private static Dictionary<string, object> ToPort(object value)
    {
        Dictionary<string, object> record = ToDictionary(value);
        if (record == null && value is string) return new Dictionary<string, object> { { "name", value }, { "direction", "unknown" } };
        if (record == null) return null;
        string name = FirstString(record, "name", "elementName", "portName");
        if (String.IsNullOrWhiteSpace(name)) return null;
        string directionValue = FirstString(record, "direction", "portDirection");
        directionValue = (directionValue ?? "unknown").ToLowerInvariant();
        string direction = directionValue.Contains("in") && directionValue.Contains("out") ? "inout" : directionValue.Contains("in") ? "input" : directionValue.Contains("out") ? "output" : "unknown";
        Dictionary<string, object> metadata = ToDictionary(GetValue(record, "metadata")) ?? new Dictionary<string, object>();
        foreach (KeyValuePair<string, object> entry in record)
        {
            if (!metadata.ContainsKey(entry.Key) && !String.Equals(entry.Key, "metadata", StringComparison.Ordinal)) metadata[entry.Key] = entry.Value;
        }
        string kind = FirstString(metadata, "kind", "elementKind");
        Dictionary<string, object> port = new Dictionary<string, object>
        {
            { "name", name },
            { "direction", direction },
            { "type", FirstString(record, "type", "dataType") },
            { "unit", FirstString(record, "unit") },
            { "metadata", metadata },
            { "kind", kind ?? String.Empty }
        };
        object min = GetValue(record, "min") ?? GetValue(record, "minimum");
        object max = GetValue(record, "max") ?? GetValue(record, "maximum");
        object step = GetValue(record, "step");
        if (min != null) port["min"] = min;
        if (max != null) port["max"] = max;
        if (step != null) port["step"] = step;
        return port;
    }

    private static List<Dictionary<string, object>> ExtractDependencies(object refsPayload, object componentsPayload)
    {
        List<Dictionary<string, object>> result = new List<Dictionary<string, object>>();
        HashSet<string> seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (object item in GetItems(refsPayload, "references", "refs", "items", "matches")) AddDependency(result, seen, item);
        foreach (object item in GetItems(componentsPayload, "components", "items", "children")) AddDependency(result, seen, item);
        return result;
    }

    private static void AddDependency(List<Dictionary<string, object>> result, HashSet<string> seen, object item)
    {
        Dictionary<string, object> record = ToDictionary(item);
        string path = record == null ? Convert.ToString(item) : FirstString(record, "path", "componentPath", "targetPath");
        if (String.IsNullOrWhiteSpace(path)) return;
        string relation = record == null ? String.Empty : FirstString(record, "relation");
        string key = path + "|" + relation;
        if (!seen.Add(key)) return;
        result.Add(new Dictionary<string, object>
        {
            { "path", path },
            { "kind", record == null ? String.Empty : FirstString(record, "kind", "objectKind") },
            { "relation", relation },
            { "metadata", record }
        });
    }

    private static Dictionary<string, object> ExtractCycles(Dictionary<string, object> summary, Dictionary<string, object> snapshot)
    {
        foreach (Dictionary<string, object> source in new[] { summary, snapshot })
        {
            Dictionary<string, object> cycles = ToDictionary(GetValue(source, "cycles")) ?? ToDictionary(GetValue(source, "periods")) ?? ToDictionary(GetValue(source, "tasks"));
            if (cycles != null) return cycles;
        }
        return null;
    }

    private static string ExtractObjectKind(Dictionary<string, object> summary, Dictionary<string, object> snapshot, string requested)
    {
        foreach (Dictionary<string, object> source in new[] { summary, snapshot })
        {
            string kind = FirstString(source, "objectKind", "componentKind", "kind");
            if (kind == "class" || kind == "module" || kind == "statemachine") return kind;
        }
        return String.IsNullOrWhiteSpace(requested) ? "unknown" : requested.ToLowerInvariant();
    }

    private static object GetOperation(Dictionary<string, object> operations, string key)
    {
        object value;
        return operations.TryGetValue(key, out value) ? value : null;
    }

    private static object UnwrapResult(object value)
    {
        Dictionary<string, object> record = ToDictionary(value);
        if (record == null) return value;
        object ok;
        if (record.TryGetValue("ok", out ok) && ok is bool && !(bool)ok) return null;
        object result;
        if (record.TryGetValue("result", out result)) return result;
        if (record.TryGetValue("data", out result)) return result;
        return record;
    }

    private static bool OperationOk(object value)
    {
        if (value == null) return false;
        Dictionary<string, object> record = ToDictionary(value);
        if (record == null) return true;
        object ok;
        if (record.TryGetValue("ok", out ok) && ok is bool) return (bool)ok;
        return true;
    }

    private static string OperationError(object value)
    {
        Dictionary<string, object> record = ToDictionary(value);
        Dictionary<string, object> error = record == null ? null : ToDictionary(GetValue(record, "error"));
        return FirstString(error, "message") ?? (record == null ? null : FirstString(record, "message", "stderr"));
    }

    private static void RequireOperation(Dictionary<string, object> operations, string key, List<string> errors)
    {
        if (!operations.ContainsKey(key)) errors.Add(key + ": operation missing");
    }

    private static List<object> GetItems(object value, params string[] keys)
    {
        Dictionary<string, object> record = ToDictionary(value);
        if (record == null)
        {
            IList rawValue = value as IList;
            if (rawValue == null) return new List<object>();
            List<object> copiedValue = new List<object>();
            for (int valueIndex = 0; valueIndex < rawValue.Count; valueIndex++) copiedValue.Add(rawValue[valueIndex]);
            return copiedValue;
        }
        for (int index = 0; index < keys.Length; index++)
        {
            object candidate = GetValue(record, keys[index]);
            IList rawList = candidate as IList;
            if (rawList != null)
            {
                List<object> copied = new List<object>();
                for (int itemIndex = 0; itemIndex < rawList.Count; itemIndex++) copied.Add(rawList[itemIndex]);
                return copied;
            }
        }
        return new List<object>();
    }

    private static Dictionary<string, object> ToDictionary(object value)
    {
        return value as Dictionary<string, object>;
    }

    private static object GetValue(Dictionary<string, object> source, string key)
    {
        object value;
        return source != null && source.TryGetValue(key, out value) ? value : null;
    }

    private static string FirstString(Dictionary<string, object> source, params string[] keys)
    {
        if (source == null) return null;
        for (int index = 0; index < keys.Length; index++)
        {
            string value = AscetTestContracts.GetString(source, keys[index]);
            if (!String.IsNullOrWhiteSpace(value)) return value.Trim();
        }
        return null;
    }

    private static string NormalizePath(string value)
    {
        return (value ?? String.Empty).Trim().Replace('\\', '/');
    }

    private static string JoinArguments(IList<string> arguments)
    {
        List<string> quoted = new List<string>();
        for (int index = 0; index < arguments.Count; index++)
        {
            string value = arguments[index] ?? String.Empty;
            quoted.Add("\"" + value.Replace("\"", "\\\"") + "\"");
        }
        return String.Join(" ", quoted.ToArray());
    }

    private static Dictionary<string, object> FailureOperation(string code, string message)
    {
        return new Dictionary<string, object>
        {
            { "ok", false },
            { "error", new Dictionary<string, object> { { "code", code }, { "message", message } } }
        };
    }

    private static bool GetBoolean(Dictionary<string, object> source, string key)
    {
        return AscetTestContracts.GetBoolean(source, key, false);
    }

    private static List<string> GetStringList(Dictionary<string, object> source, string key)
    {
        List<string> result = new List<string>();
        object value = GetValue(source, key);
        IList list = value as IList;
        if (list == null) return result;
        for (int index = 0; index < list.Count; index++)
        {
            string item = Convert.ToString(list[index]);
            if (!String.IsNullOrWhiteSpace(item)) result.Add(item);
        }
        return result;
    }

    private static List<AscetTestValidationIssue> IssuesFromStrings(List<string> values, string code)
    {
        List<AscetTestValidationIssue> issues = new List<AscetTestValidationIssue>();
        for (int index = 0; index < values.Count; index++) issues.Add(new AscetTestValidationIssue { Path = "inspection", Code = code, Message = values[index] });
        return issues;
    }

    private static void AddError(List<AscetTestValidationIssue> errors, string path, string code, string message)
    {
        errors.Add(new AscetTestValidationIssue { Path = path, Code = code, Message = message });
    }
}
