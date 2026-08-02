using System;
using System.Collections;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;

// Controlled live bridge.  Every ASCET call is executed synchronously and the
// request must carry an explicit approval, disposable-target marker and a
// matching baseline.  Without all three the service returns before starting a
// process, so a dry-run cannot accidentally mutate the database.
public static class AscetTestApplyService
{
    public static Dictionary<string, object> Execute(Dictionary<string, object> request)
    {
        string runId = AscetTestContracts.GetString(request, "runId");
        Dictionary<string, object> plan = ResolvePlan(request);
        List<AscetTestValidationIssue> issues = ValidateGate(request, plan);
        Dictionary<string, object> data = new Dictionary<string, object>
        {
            { "schemaVersion", "ascet-test-esdl-apply/v1" },
            { "runId", runId },
            { "componentPath", AscetTestContracts.GetString(request, "componentPath") },
            { "applyPlan", plan },
            { "liveWritePerformed", false },
            { "readbackVerified", false },
            { "serial", true }
        };
        if (issues.Count > 0)
        {
            data["status"] = "blocked";
            return AscetTestEnvelope.Blocked("apply", runId, data, FirstCode(issues, "apply_blocked"), "Controlled ASCET apply was rejected before live execution.", issues, new List<AscetTestValidationIssue>(), Diagnostics(false));
        }

        string componentPath = NormalizePath(AscetTestContracts.GetString(request, "componentPath"));
        string cliPath = ResolveCliPath(request, "apply_element_spec");
        if (!File.Exists(cliPath))
        {
            AscetTestValidationIssue issue = Issue("cliPath", "cli_missing", "ASCET CLI was not found: " + cliPath);
            return AscetTestEnvelope.Blocked("apply", runId, data, issue.Code, issue.Message, new List<AscetTestValidationIssue> { issue }, new List<AscetTestValidationIssue>(), Diagnostics(true));
        }

        string ledgerPath = String.Empty;
        List<Dictionary<string, object>> ledger = new List<Dictionary<string, object>>();
        List<Dictionary<string, object>> methodResults = new List<Dictionary<string, object>>();
        Dictionary<string, object> spec = ResolveSpec(request);
        string specPath = AscetTestContracts.GetString(request, "elementSpecPath");
        if (String.IsNullOrWhiteSpace(specPath) && spec != null)
        {
            specPath = AscetTestArtifactWriter.WriteJson(request, runId, "element-spec-live.json", spec);
        }
        if (String.IsNullOrWhiteSpace(specPath) || !File.Exists(AscetTestContracts.ResolvePath(specPath, Directory.GetCurrentDirectory())))
        {
            AscetTestValidationIssue issue = Issue("elementSpecPath", "element_spec_missing", "Live apply requires an element-spec file.");
            return AscetTestEnvelope.Blocked("apply", runId, data, issue.Code, issue.Message, new List<AscetTestValidationIssue> { issue }, new List<AscetTestValidationIssue>(), Diagnostics(true));
        }

        string applyArgs = BuildApplyArguments(request, componentPath, AscetTestContracts.ResolvePath(specPath, Directory.GetCurrentDirectory()), cliPath);
        Dictionary<string, object> applyResult = RunCli(cliPath, applyArgs, request, "apply_element_spec");
        ledger.Add(Ledger("apply_element_spec", applyResult));
        ledgerPath = WriteLedger(request, runId, ledger);
        bool writeSucceeded = ResultSucceeded(applyResult);
        bool readbackVerified = GetBooleanAny(applyResult, "ReadbackVerified", "readbackVerified");
        data["liveWritePerformed"] = writeSucceeded;
        data["readbackVerified"] = readbackVerified;
        data["applyResult"] = applyResult;
        data["ledgerPath"] = ledgerPath;
        string readbackPath = WriteReadbackArtifact(request, runId, plan, applyResult);
        data["readbackPath"] = readbackPath;
        if (!writeSucceeded || !readbackVerified)
        {
            string code = !writeSucceeded ? ResultErrorCode(applyResult, "apply_failed") : "readback_not_verified";
            string message = !writeSucceeded ? ResultErrorMessage(applyResult, "ASCET element-spec apply failed.") : "ASCET element-spec apply did not prove readback verification.";
            return AscetTestEnvelope.Blocked("apply", runId, data, code, message, new List<AscetTestValidationIssue> { Issue("apply_element_spec", code, message) }, new List<AscetTestValidationIssue>(), Diagnostics(true));
        }

        IList rawMethods = AscetTestContracts.GetValue(request, "methodDrafts") as IList;
        if (rawMethods != null)
        {
            for (int index = 0; index < rawMethods.Count; index++)
            {
                Dictionary<string, object> method = rawMethods[index] as Dictionary<string, object>;
                if (method == null) continue;
                string name = AscetTestContracts.GetString(method, "methodName");
                string code = AscetTestContracts.GetString(method, "code");
                if (String.IsNullOrWhiteSpace(name) || String.IsNullOrWhiteSpace(code)) continue;
                string codePath = AscetTestArtifactWriter.WriteText(request, runId, "method-" + SafeName(name) + ".esdl", code);
                Dictionary<string, object> methodResult = RunCli(cliPath, BuildMethodArguments(request, componentPath, name, codePath, cliPath), request, "set_method_code");
                ledger.Add(Ledger("set_method_code:" + name, methodResult));
                methodResults.Add(new Dictionary<string, object> { { "methodName", name }, { "codePath", codePath }, { "result", methodResult } });
                ledgerPath = WriteLedger(request, runId, ledger);
                data["ledgerPath"] = ledgerPath;
                if (!ResultSucceeded(methodResult) || !GetBooleanAny(methodResult, "ReadbackVerified", "readbackVerified"))
                {
                    data["methodResult"] = methodResult;
                    string codeValue = ResultErrorCode(methodResult, "method_write_failed");
                    return AscetTestEnvelope.Blocked("apply", runId, data, codeValue, ResultErrorMessage(methodResult, "ASCET method write did not prove readback verification."), new List<AscetTestValidationIssue> { Issue("methodDrafts[" + index.ToString() + "]", codeValue, "Method write failed or readback was not verified.") }, new List<AscetTestValidationIssue>(), Diagnostics(true));
                }
            }
        }

        string applyResultPath = WriteApplyResultArtifact(request, runId, componentPath, plan, specPath, applyResult, methodResults, ledgerPath, readbackPath);
        data["methodResults"] = methodResults;
        data["applyResultPath"] = applyResultPath;
        data["status"] = "applied";
        return AscetTestEnvelope.Success("apply", runId, "applied", data, new List<AscetTestValidationIssue>(), Diagnostics(true, true));
    }

    public static Dictionary<string, object> ExecuteExport(Dictionary<string, object> request)
    {
        string runId = AscetTestContracts.GetString(request, "runId");
        List<AscetTestValidationIssue> issues = ValidateExportGate(request);
        Dictionary<string, object> data = new Dictionary<string, object>
        {
            { "schemaVersion", "ascet-test-live-export/v1" },
            { "runId", runId },
            { "componentPath", AscetTestContracts.GetString(request, "componentPath") },
            { "liveWritePerformed", false },
            { "serial", true }
        };
        if (issues.Count > 0) return AscetTestEnvelope.Blocked("export", runId, data, FirstCode(issues, "export_blocked"), "Controlled ASCET export was rejected before live execution.", issues, new List<AscetTestValidationIssue>(), Diagnostics(true));
        string cliPath = ResolveCliPath(request, "export_generated_code");
        if (!File.Exists(cliPath))
        {
            AscetTestValidationIssue issue = Issue("cliPath", "cli_missing", "ASCET CLI was not found: " + cliPath);
            return AscetTestEnvelope.Blocked("export", runId, data, issue.Code, issue.Message, new List<AscetTestValidationIssue> { issue }, new List<AscetTestValidationIssue>(), Diagnostics(true));
        }
        string output = AscetTestContracts.GetString(request, "exportDirectory");
        if (String.IsNullOrWhiteSpace(output)) output = AscetTestArtifactWriter.ResolveRunDirectory(request, runId) + Path.DirectorySeparatorChar + "live-export";
        output = AscetTestContracts.ResolvePath(output, Directory.GetCurrentDirectory());
        Directory.CreateDirectory(output);
        string args = BuildExportArguments(request, NormalizePath(AscetTestContracts.GetString(request, "componentPath")), output, cliPath);
        Dictionary<string, object> result = RunCli(cliPath, args, request, "export_generated_code");
        data["exportResult"] = result;
        data["exportDirectory"] = output;
        string exportPath = AscetTestArtifactWriter.WriteJson(request, runId, "live-export.json", result);
        data["exportResultPath"] = exportPath;
        Dictionary<string, object> manifest = AscetTestContracts.GetDictionary(result, "generatedCodeManifest");
        if (manifest != null)
        {
            string manifestPath = AscetTestArtifactWriter.WriteJson(request, runId, "export-manifest.json", manifest);
            data["exportManifest"] = manifest;
            data["exportManifestPath"] = manifestPath;
            data["liveExportPath"] = exportPath;
        }
        if (!ResultSucceeded(result))
        {
            string code = ResultErrorCode(result, "export_failed");
            return AscetTestEnvelope.Blocked("export", runId, data, code, ResultErrorMessage(result, "ASCET generated-code export failed."), new List<AscetTestValidationIssue> { Issue("export_generated_code", code, "ASCET generated-code export failed.") }, new List<AscetTestValidationIssue>(), Diagnostics(true));
        }
        data["status"] = "exported";
        return AscetTestEnvelope.Success("export", runId, "exported", data, new List<AscetTestValidationIssue>(), Diagnostics(true));
    }

    private static List<AscetTestValidationIssue> ValidateGate(Dictionary<string, object> request, Dictionary<string, object> plan)
    {
        List<AscetTestValidationIssue> issues = new List<AscetTestValidationIssue>();
        if (!AscetTestContracts.GetBoolean(request, "executeLive", false)) issues.Add(Issue("executeLive", "live_approval_required", "Live apply requires executeLive=true."));
        string revision = AscetTestContracts.GetString(request, "approvedRevisionId");
        Dictionary<string, object> approval = AscetTestContracts.GetDictionary(request, "approval");
        if (String.IsNullOrWhiteSpace(revision) || approval == null || !AscetTestContracts.GetBoolean(approval, "approved", false) || !String.Equals(revision, AscetTestContracts.GetString(approval, "revisionId"), StringComparison.Ordinal))
            issues.Add(Issue("approval", "approval_missing", "Live apply requires approval.approved=true and a matching approvedRevisionId."));
        if (!AscetTestContracts.GetBoolean(request, "disposableTarget", false)) issues.Add(Issue("disposableTarget", "disposable_target_required", "Live apply is restricted to an explicitly disposable target."));
        string expectedBaseline = AscetTestContracts.GetString(request, "baselineFingerprint");
        string actualBaseline = AscetTestContracts.GetString(request, "currentBaselineFingerprint");
        string planBaseline = plan == null ? String.Empty : AscetTestContracts.GetString(plan, "baselineFingerprint");
        if (String.IsNullOrWhiteSpace(expectedBaseline) || String.IsNullOrWhiteSpace(actualBaseline) || !String.Equals(expectedBaseline, actualBaseline, StringComparison.OrdinalIgnoreCase) || (!String.IsNullOrWhiteSpace(planBaseline) && !String.Equals(expectedBaseline, planBaseline, StringComparison.OrdinalIgnoreCase)))
            issues.Add(Issue("baselineFingerprint", "baseline_mismatch", "Live apply requires a matching current baseline fingerprint."));
        if (plan == null || !AscetTestContracts.GetBoolean(plan, "ready", false)) issues.Add(Issue("applyPlan", "apply_plan_not_ready", "A ready esdl-apply-plan is required before live apply."));
        return issues;
    }

    private static List<AscetTestValidationIssue> ValidateExportGate(Dictionary<string, object> request)
    {
        List<AscetTestValidationIssue> issues = ValidateGateForReadOnlyExport(request);
        if (!AscetTestContracts.GetBoolean(request, "readbackVerified", false)) issues.Add(Issue("readbackVerified", "readback_required", "Export requires verified readback after the live apply."));
        return issues;
    }

    private static List<AscetTestValidationIssue> ValidateGateForReadOnlyExport(Dictionary<string, object> request)
    {
        List<AscetTestValidationIssue> issues = new List<AscetTestValidationIssue>();
        if (!AscetTestContracts.GetBoolean(request, "executeLive", false)) issues.Add(Issue("executeLive", "live_approval_required", "Live export requires executeLive=true."));
        if (!AscetTestContracts.GetBoolean(request, "disposableTarget", false)) issues.Add(Issue("disposableTarget", "disposable_target_required", "Live export requires an explicitly disposable target."));
        Dictionary<string, object> approval = AscetTestContracts.GetDictionary(request, "approval");
        string revision = AscetTestContracts.GetString(request, "approvedRevisionId");
        if (String.IsNullOrWhiteSpace(revision) || approval == null || !AscetTestContracts.GetBoolean(approval, "approved", false) || !String.Equals(revision, AscetTestContracts.GetString(approval, "revisionId"), StringComparison.Ordinal)) issues.Add(Issue("approval", "approval_missing", "Live export requires a matching approval record."));
        return issues;
    }

    private static Dictionary<string, object> ResolvePlan(Dictionary<string, object> request)
    {
        Dictionary<string, object> inline = AscetTestContracts.GetDictionary(request, "applyPlan");
        if (inline != null) return inline;
        string path = AscetTestContracts.GetString(request, "applyPlanPath");
        if (String.IsNullOrWhiteSpace(path)) return null;
        string resolved = AscetTestContracts.ResolvePath(path, Directory.GetCurrentDirectory());
        return File.Exists(resolved) ? AscetTestContracts.ReadObject(resolved, "applyPlan") : null;
    }

    private static Dictionary<string, object> ResolveSpec(Dictionary<string, object> request)
    {
        Dictionary<string, object> inline = AscetTestContracts.GetDictionary(request, "elementSpec");
        if (inline != null) return inline;
        string path = AscetTestContracts.GetString(request, "elementSpecPath");
        if (String.IsNullOrWhiteSpace(path)) return null;
        string resolved = AscetTestContracts.ResolvePath(path, Directory.GetCurrentDirectory());
        return File.Exists(resolved) ? AscetTestContracts.ReadObject(resolved, "elementSpec") : null;
    }

    private static Dictionary<string, object> RunCli(string cliPath, string arguments, Dictionary<string, object> request, string operation)
    {
        string workingDirectory = AscetTestContracts.GetString(request, "cliWorkingDirectory");
        if (String.IsNullOrWhiteSpace(workingDirectory)) workingDirectory = Directory.GetCurrentDirectory();
        ProcessStartInfo info = new ProcessStartInfo
        {
            FileName = cliPath,
            Arguments = arguments,
            WorkingDirectory = AscetTestContracts.ResolvePath(workingDirectory, Directory.GetCurrentDirectory()),
            UseShellExecute = false,
            CreateNoWindow = true,
            RedirectStandardOutput = true,
            RedirectStandardError = true
        };
        using (Process process = new Process { StartInfo = info })
        {
            try
            {
                if (!process.Start()) return Failure("cli_start_failed", "Could not start ASCET CLI for " + operation + ".");
                int timeout = AscetTestContracts.GetInteger(request, "timeoutMs", 120000);
                string stdout = process.StandardOutput.ReadToEnd();
                string stderr = process.StandardError.ReadToEnd();
                if (!process.WaitForExit(timeout)) { try { process.Kill(); } catch { } return Failure("cli_timeout", "ASCET CLI timed out during " + operation + "."); }
                Dictionary<string, object> parsed = null;
                try { parsed = AscetTestContracts.Deserialize(stdout) as Dictionary<string, object>; } catch (Exception ex) { return Failure("cli_invalid_json", ex.Message); }
                if (parsed == null) return Failure("cli_invalid_json", String.IsNullOrWhiteSpace(stderr) ? "ASCET CLI returned no JSON." : stderr.Trim());
                if (process.ExitCode != 0 && !parsed.ContainsKey("error")) parsed["error"] = new Dictionary<string, object> { { "code", "cli_failed" }, { "message", stderr.Trim() } };
                return parsed;
            }
            catch (Exception ex) { return Failure("cli_start_failed", ex.Message); }
        }
    }

    private static Dictionary<string, object> Ledger(string operation, Dictionary<string, object> result)
    {
        return new Dictionary<string, object> { { "operation", operation }, { "ok", ResultSucceeded(result) }, { "finishedAt", DateTime.UtcNow.ToString("o") }, { "result", result } };
    }

    private static string WriteLedger(Dictionary<string, object> request, string runId, List<Dictionary<string, object>> ledger)
    {
        return AscetTestArtifactWriter.WriteJson(request, runId, "apply-ledger.json", new Dictionary<string, object> { { "schemaVersion", "ascet-test-apply-ledger/v1" }, { "serial", true }, { "operations", ledger } });
    }

    private static bool ResultSucceeded(Dictionary<string, object> result)
    {
        if (result == null) return false;
        if (result.ContainsKey("ok")) return AscetTestContracts.GetBoolean(result, "ok", false);
        return GetBooleanAny(result, "WriteSucceeded", "writeSucceeded", "success", "Success");
    }

    private static string ResultErrorCode(Dictionary<string, object> result, string fallback)
    {
        Dictionary<string, object> error = result == null ? null : AscetTestContracts.GetDictionary(result, "error");
        string code = AscetTestContracts.GetString(error, "code");
        return String.IsNullOrWhiteSpace(code) ? fallback : code;
    }

    private static string ResultErrorMessage(Dictionary<string, object> result, string fallback)
    {
        Dictionary<string, object> error = result == null ? null : AscetTestContracts.GetDictionary(result, "error");
        string message = AscetTestContracts.GetString(error, "message");
        if (!String.IsNullOrWhiteSpace(message)) return message;
        string issues = AscetTestContracts.GetString(result, "Issues");
        return String.IsNullOrWhiteSpace(issues) ? fallback : issues;
    }

    private static bool GetBooleanAny(Dictionary<string, object> source, params string[] keys)
    {
        for (int index = 0; index < keys.Length; index++) if (source != null && source.ContainsKey(keys[index])) return AscetTestContracts.GetBoolean(source, keys[index], false);
        return false;
    }

    private static string ResolveCliPath(Dictionary<string, object> request, string operation)
    {
        string specificKey = String.Equals(operation, "apply_element_spec", StringComparison.OrdinalIgnoreCase)
            ? "applyCliPath"
            : (String.Equals(operation, "export_generated_code", StringComparison.OrdinalIgnoreCase) ? "exportCliPath" : "methodCliPath");
        string path = AscetTestContracts.GetString(request, specificKey);
        if (String.IsNullOrWhiteSpace(path)) path = AscetTestContracts.GetString(request, "cliPath");
        if (String.IsNullOrWhiteSpace(path))
        {
            string bin = AscetTestContracts.GetString(request, "ascetCliBin");
            if (!String.IsNullOrWhiteSpace(bin))
            {
                string executable = String.Equals(operation, "apply_element_spec", StringComparison.OrdinalIgnoreCase)
                    ? "AscetApplyElementSpec.exe"
                    : (String.Equals(operation, "export_generated_code", StringComparison.OrdinalIgnoreCase) ? "AscetExportBuildArtifacts.exe" : "AscetSetClassMethodCode.exe");
                path = Path.Combine(bin, executable);
            }
        }
        if (String.IsNullOrWhiteSpace(path)) path = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "AscetCli.exe");
        return AscetTestContracts.ResolvePath(path, Directory.GetCurrentDirectory());
    }

    private static string BuildApplyArguments(Dictionary<string, object> request, string componentPath, string specPath, string cliPath)
    {
        if (IsDirect(cliPath, "AscetApplyElementSpec.exe")) return Quote(componentPath) + " " + Quote(specPath) + " --verify-readback --json";
        return "exec apply_element_spec " + Quote(componentPath) + " " + Quote(specPath) + " --verify-readback --json";
    }

    private static string BuildExportArguments(Dictionary<string, object> request, string componentPath, string output, string cliPath)
    {
        if (IsDirect(cliPath, "AscetExportBuildArtifacts.exe")) return Quote(componentPath) + " --out " + Quote(output) + " --no-asam2mc --generated-code-recursive --json";
        return "exec export_generated_code " + Quote(componentPath) + " --out " + Quote(output) + " --generated-code-recursive --json";
    }

    private static string BuildMethodArguments(Dictionary<string, object> request, string componentPath, string name, string codePath, string cliPath)
    {
        if (IsDirect(cliPath, "AscetSetClassMethodCode.exe")) return Quote(componentPath) + " " + Quote(name) + " " + Quote(codePath) + " --verify-readback --json";
        if (IsDirect(cliPath, "AscetSetMethodCode.exe")) return Quote(componentPath) + " " + Quote(name) + " " + Quote(codePath) + " --verify-readback";
        return "exec set_method_code " + Quote(componentPath) + " " + Quote(name) + " " + Quote(codePath) + " --verify-readback --json";
    }

    private static bool IsDirect(string path, string executable)
    {
        return String.Equals(Path.GetFileName(path), executable, StringComparison.OrdinalIgnoreCase);
    }

    private static string WriteReadbackArtifact(Dictionary<string, object> request, string runId, Dictionary<string, object> plan, Dictionary<string, object> applyResult)
    {
        return AscetTestArtifactWriter.WriteJson(request, runId, "live-readback-after-esdl.json", new Dictionary<string, object>
        {
            { "schemaVersion", "ascet-test-live-readback/v1" },
            { "runId", runId },
            { "planHash", plan == null ? String.Empty : AscetTestContracts.GetString(plan, "hash") },
            { "verified", GetBooleanAny(applyResult, "ReadbackVerified", "readbackVerified") },
            { "result", applyResult }
        });
    }

    private static string WriteApplyResultArtifact(Dictionary<string, object> request, string runId, string componentPath, Dictionary<string, object> plan, string specPath, Dictionary<string, object> applyResult, List<Dictionary<string, object>> methodResults, string ledgerPath, string readbackPath)
    {
        return AscetTestArtifactWriter.WriteJson(request, runId, "esdl-apply-result.json", new Dictionary<string, object>
        {
            { "schemaVersion", "ascet-test-esdl-apply-result/v1" },
            { "runId", runId },
            { "componentPath", componentPath },
            { "planHash", plan == null ? String.Empty : AscetTestContracts.GetString(plan, "hash") },
            { "elementSpecPath", specPath },
            { "applyResult", applyResult },
            { "methodResults", methodResults },
            { "ledgerPath", ledgerPath },
            { "readbackPath", readbackPath },
            { "liveWritePerformed", ResultSucceeded(applyResult) },
            { "readbackVerified", GetBooleanAny(applyResult, "ReadbackVerified", "readbackVerified") }
        });
    }

    private static string Quote(string value) { return "\"" + (value ?? String.Empty).Replace("\"", "\\\"") + "\""; }
    private static string SafeName(string value) { return String.IsNullOrWhiteSpace(value) ? "method" : value.Replace("/", "_").Replace("\\", "_").Replace(":", "_"); }
    private static string NormalizePath(string value) { return (value ?? String.Empty).Trim().Replace('\\', '/'); }
    private static AscetTestValidationIssue Issue(string path, string code, string message) { return new AscetTestValidationIssue { Path = path, Code = code, Message = message }; }
    private static string FirstCode(List<AscetTestValidationIssue> issues, string fallback) { return issues.Count == 0 ? fallback : issues[0].Code; }
    private static Dictionary<string, object> Failure(string code, string message) { return new Dictionary<string, object> { { "ok", false }, { "error", new Dictionary<string, object> { { "code", code }, { "message", message } } } }; }
    private static Dictionary<string, object> Diagnostics(bool live, bool write = false) { return new Dictionary<string, object> { { "liveExecutionStarted", live }, { "liveWritePerformed", write }, { "schedulerRequired", live }, { "serialOperations", true } }; }
}
