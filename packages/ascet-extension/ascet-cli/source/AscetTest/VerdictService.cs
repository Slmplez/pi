using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;

public static class AscetTestVerdictService
{
    public static Dictionary<string, object> Execute(Dictionary<string, object> request)
    {
        string runId = AscetTestContracts.GetString(request, "runId");
        string runDirectory;
        try
        {
            runDirectory = AscetTestArtifactWriter.ResolveRunDirectory(request, runId);
        }
        catch (Exception ex)
        {
            return AscetTestEnvelope.Blocked(
                "verify",
                runId,
                new Dictionary<string, object> { { "verdict", "failed" }, { "status", "blocked" } },
                "unsafe_path",
                ex.Message,
                new List<AscetTestValidationIssue> { Issue("runDirectory", "unsafe_path", ex.Message) },
                new List<AscetTestValidationIssue>(),
                Diagnostics(false));
        }

        Dictionary<string, object> verification = AscetTestContracts.GetDictionary(request, "verification");
        string profile = AscetTestContracts.GetString(verification, "profile");
        if (String.IsNullOrWhiteSpace(profile)) profile = "offline";
        Dictionary<string, object> evidence = AscetTestEvidenceService.Collect(request, runDirectory);
        List<object> checks = new List<object>();
        string firstFailureCode = String.Empty;
        string firstFailureMessage = String.Empty;
        string firstFailurePath = String.Empty;

        Dictionary<string, object> build = evidence["buildResult"] as Dictionary<string, object>;
        Dictionary<string, object> run = evidence["runResult"] as Dictionary<string, object>;
        Dictionary<string, object> xml = evidence["gtestXml"] as Dictionary<string, object>;

        string requestComponentPath = AscetTestContracts.GetString(request, "componentPath");
        bool requestIdentity = !String.IsNullOrWhiteSpace(runId) && !String.IsNullOrWhiteSpace(requestComponentPath);
        AddCheck(checks, ref firstFailureCode, ref firstFailureMessage, ref firstFailurePath,
            "request_identity", requestIdentity, "request_invalid", "runId and componentPath are required.", "request");
        Dictionary<string, object> contract = AscetTestContracts.GetDictionary(request, "contract");
        bool contractIdentity = contract == null || String.Equals(AscetTestContracts.GetString(contract, "componentPath").Replace('\\', '/'), requestComponentPath.Replace('\\', '/'), StringComparison.OrdinalIgnoreCase);
        AddCheck(checks, ref firstFailureCode, ref firstFailureMessage, ref firstFailurePath,
            "contract_identity", contractIdentity, "request_invalid", "Contract componentPath does not match the request.", "contract");

        bool liveProfile = String.Equals(profile, "live", StringComparison.OrdinalIgnoreCase);
        if (liveProfile || AscetTestContracts.GetBoolean(verification, "requireEsdlReadback", false))
        {
            string readbackPath = FirstNonEmpty(
                AscetTestContracts.GetString(verification, "esdlReadbackPath"),
                AscetTestContracts.GetString(request, "esdlReadbackPath"));
            bool readbackOk = !String.IsNullOrWhiteSpace(readbackPath) && File.Exists(AscetTestContracts.ResolvePath(readbackPath, runDirectory));
            AddCheck(checks, ref firstFailureCode, ref firstFailureMessage, ref firstFailurePath,
                "esdl_readback", readbackOk, "esdl_readback_mismatch", "ESDL readback evidence is missing.", readbackPath);
        }

        if (liveProfile || AscetTestContracts.GetBoolean(verification, "requireExport", false))
        {
            string exportPath = FirstNonEmpty(
                AscetTestContracts.GetString(verification, "exportManifestPath"),
                AscetTestContracts.GetString(request, "exportManifestPath"));
            bool exportOk = !String.IsNullOrWhiteSpace(exportPath) && File.Exists(AscetTestContracts.ResolvePath(exportPath, runDirectory));
            AddCheck(checks, ref firstFailureCode, ref firstFailureMessage, ref firstFailurePath,
                "export_manifest", exportOk, "export_manifest_missing", "Export manifest evidence is missing.", exportPath);
        }

        VerifyBuild(build, request, checks, ref firstFailureCode, ref firstFailureMessage, ref firstFailurePath);
        VerifyRun(run, request, xml, checks, ref firstFailureCode, ref firstFailureMessage, ref firstFailurePath);
        if (AscetTestContracts.GetBoolean(verification, "requireCaseCoverage", false))
            VerifyCaseCoverage(request, xml, checks, ref firstFailureCode, ref firstFailureMessage, ref firstFailurePath);

        bool passed = String.IsNullOrWhiteSpace(firstFailureCode);
        Dictionary<string, object> paths = evidence["paths"] as Dictionary<string, object>;
        Dictionary<string, object> result = new Dictionary<string, object>
        {
            { "schemaVersion", "ascet-test-verify/v1" },
            { "runId", runId ?? String.Empty },
            { "profile", profile },
            { "status", passed ? "verified" : "blocked" },
            { "verdict", passed ? "passed" : "failed" },
            { "checks", checks },
            { "firstFailure", passed ? null : new Dictionary<string, object> { { "code", firstFailureCode }, { "message", firstFailureMessage }, { "path", firstFailurePath } } },
            { "failureCode", passed ? String.Empty : firstFailureCode },
            { "evidencePaths", paths ?? new Dictionary<string, object>() }
        };
        string resultPath = TryWriteResult(request, runId, result);
        result["resultPath"] = resultPath;

        Dictionary<string, object> data = new Dictionary<string, object>
        {
            { "schemaVersion", "ascet-test-verify/v1" },
            { "runId", runId ?? String.Empty },
            { "profile", profile },
            { "status", passed ? "verified" : "blocked" },
            { "verdict", passed ? "passed" : "failed" },
            { "checks", checks },
            { "verifyResult", result },
            { "verifyResultPath", resultPath },
            { "evidencePaths", paths ?? new Dictionary<string, object>() }
        };
        if (passed)
        {
            return AscetTestEnvelope.Success("verify", runId, "verified", data, new List<AscetTestValidationIssue>(), Diagnostics(false));
        }

        return AscetTestEnvelope.Blocked(
            "verify",
            runId,
            data,
            firstFailureCode,
            "Verification failed: " + firstFailureMessage,
            new List<AscetTestValidationIssue> { Issue(firstFailurePath, firstFailureCode, firstFailureMessage) },
            new List<AscetTestValidationIssue>(),
            Diagnostics(false));
    }

    private static void VerifyBuild(
        Dictionary<string, object> build,
        Dictionary<string, object> request,
        IList<object> checks,
        ref string firstCode,
        ref string firstMessage,
        ref string firstPath)
    {
        if (build == null)
        {
            AddCheck(checks, ref firstCode, ref firstMessage, ref firstPath, "build_result", false, "build_result_missing", "Build result evidence is missing.", "build-result.json");
            return;
        }

        AddCheck(checks, ref firstCode, ref firstMessage, ref firstPath, "build_ready", AscetTestContracts.GetBoolean(build, "ready", false), "build_result_missing", "Build result is not ready.", "build-result.json");
        string requestRunId = AscetTestContracts.GetString(request, "runId");
        bool buildRunIdentity = String.Equals(AscetTestContracts.GetString(build, "runId"), requestRunId, StringComparison.Ordinal);
        AddCheck(checks, ref firstCode, ref firstMessage, ref firstPath, "build_run_identity", buildRunIdentity, "request_invalid", "Build result runId does not match the request.", "build-result.json");
        string requestComponentPath = AscetTestContracts.GetString(request, "componentPath").Replace('\\', '/');
        string buildComponentPath = AscetTestContracts.GetString(build, "componentPath").Replace('\\', '/');
        AddCheck(checks, ref firstCode, ref firstMessage, ref firstPath, "build_component_identity", String.IsNullOrWhiteSpace(requestComponentPath) || String.Equals(requestComponentPath, buildComponentPath, StringComparison.OrdinalIgnoreCase), "request_invalid", "Build result componentPath does not match the request.", "build-result.json");
        Dictionary<string, object> stages = AscetTestContracts.GetDictionary(build, "stages");
        AddCheck(checks, ref firstCode, ref firstMessage, ref firstPath, "c_compile", stages != null && AscetTestContracts.GetBoolean(stages, "cCompile", false), "c_compile_failed", "C compilation did not pass.", "build-result.json");
        AddCheck(checks, ref firstCode, ref firstMessage, ref firstPath, "cpp_compile", stages != null && AscetTestContracts.GetBoolean(stages, "cppCompile", false), "cpp_compile_failed", "C++ compilation did not pass.", "build-result.json");
        AddCheck(checks, ref firstCode, ref firstMessage, ref firstPath, "link", stages != null && AscetTestContracts.GetBoolean(stages, "link", false), "link_failed", "Link did not pass.", "build-result.json");

        Dictionary<string, object> toolchain = AscetTestContracts.GetDictionary(build, "toolchain");
        string configuredC = toolchain == null ? String.Empty : AscetTestContracts.GetString(toolchain, "cCompiler");
        string configuredCpp = toolchain == null ? String.Empty : AscetTestContracts.GetString(toolchain, "cppCompiler");
        string configuredLinker = toolchain == null ? String.Empty : AscetTestContracts.GetString(toolchain, "linker");
        IList commands = AscetTestContracts.GetValue(build, "compileCommands") as IList;
        bool cSeen = false;
        bool cppSeen = false;
        bool linkSeen = false;
        bool cOwned = true;
        bool cppOwned = true;
        bool linkOwned = true;
        bool link32 = false;
        if (commands != null)
        {
            for (int index = 0; index < commands.Count; index++)
            {
                IDictionary<string, object> command = commands[index] as IDictionary<string, object>;
                if (command == null) continue;
                string language = AscetTestContracts.GetString(command, "language");
                string compiler = AscetTestContracts.GetString(command, "compiler");
                if (String.Equals(language, "c", StringComparison.OrdinalIgnoreCase))
                {
                    cSeen = true;
                    cOwned = cOwned && SameExecutable(compiler, configuredC);
                }
                else if (String.Equals(language, "cpp", StringComparison.OrdinalIgnoreCase))
                {
                    cppSeen = true;
                    cppOwned = cppOwned && SameExecutable(compiler, configuredCpp);
                }
                else if (String.Equals(language, "link", StringComparison.OrdinalIgnoreCase))
                {
                    linkSeen = true;
                    linkOwned = linkOwned && SameExecutable(compiler, configuredLinker) && SameExecutable(compiler, configuredCpp);
                    link32 = ContainsFlag(AscetTestContracts.GetValue(command, "arguments") as IList, "-m32");
                }
            }
        }
        AddCheck(checks, ref firstCode, ref firstMessage, ref firstPath, "c_compiler_ownership", cSeen && cOwned, "c_compiler_mismatch", "At least one C source was not compiled by the configured C compiler.", "compile_commands.json");
        AddCheck(checks, ref firstCode, ref firstMessage, ref firstPath, "cpp_compiler_ownership", cppSeen && cppOwned, "cpp_compiler_mismatch", "At least one C++ source was not compiled by the configured C++ compiler.", "compile_commands.json");
        AddCheck(checks, ref firstCode, ref firstMessage, ref firstPath, "linker_ownership", linkSeen && linkOwned, "cpp_compiler_mismatch", "The link was not performed by the configured C++ linker.", "compile_commands.json");
        AddCheck(checks, ref firstCode, ref firstMessage, ref firstPath, "link_architecture", linkSeen && link32, "link_architecture_mismatch", "The link command does not contain -m32.", "compile_commands.json");
    }

    private static void VerifyRun(
        Dictionary<string, object> run,
        Dictionary<string, object> request,
        Dictionary<string, object> xml,
        IList<object> checks,
        ref string firstCode,
        ref string firstMessage,
        ref string firstPath)
    {
        if (run == null)
        {
            AddCheck(checks, ref firstCode, ref firstMessage, ref firstPath, "run_result", false, "run_result_missing", "Run result evidence is missing.", "run-result.json");
            return;
        }
        bool runtimePassed = String.Equals(AscetTestContracts.GetString(run, "status"), "passed", StringComparison.OrdinalIgnoreCase) && AscetTestContracts.GetInteger(run, "exitCode", -1) == 0;
        bool runIdentity = String.Equals(AscetTestContracts.GetString(run, "runId"), AscetTestContracts.GetString(request, "runId"), StringComparison.Ordinal);
        AddCheck(checks, ref firstCode, ref firstMessage, ref firstPath, "run_identity", runIdentity, "request_invalid", "Run result runId does not match the request.", "run-result.json");
        AddCheck(checks, ref firstCode, ref firstMessage, ref firstPath, "runtime", runtimePassed, "runtime_failed", "GoogleTest runtime did not pass.", "run-result.json");
        bool xmlValid = xml != null && AscetTestContracts.GetBoolean(xml, "valid", false);
        AddCheck(checks, ref firstCode, ref firstMessage, ref firstPath, "gtest_xml", xmlValid, "gtest_xml_invalid", "GoogleTest XML is missing or invalid.", "test-results.xml");
        int tests = xml == null ? 0 : AscetTestContracts.GetInteger(xml, "testsRun", 0);
        int failures = xml == null ? 0 : AscetTestContracts.GetInteger(xml, "failures", 0);
        int errors = xml == null ? 0 : AscetTestContracts.GetInteger(xml, "errors", 0);
        int disabled = xml == null ? 0 : AscetTestContracts.GetInteger(xml, "disabled", 0);
        AddCheck(checks, ref firstCode, ref firstMessage, ref firstPath, "gtest_non_empty", tests > 0, "gtest_no_tests", "GoogleTest reported no executed tests.", "test-results.xml");
        AddCheck(checks, ref firstCode, ref firstMessage, ref firstPath, "gtest_failures", failures == 0 && errors == 0, "gtest_failed", "GoogleTest reported failures or errors.", "test-results.xml");
        AddCheck(checks, ref firstCode, ref firstMessage, ref firstPath, "gtest_disabled", disabled == 0, "gtest_failed", "GoogleTest reported disabled tests.", "test-results.xml");
    }

    private static void VerifyCaseCoverage(
        Dictionary<string, object> request,
        Dictionary<string, object> xml,
        IList<object> checks,
        ref string firstCode,
        ref string firstMessage,
        ref string firstPath)
    {
        List<string> expected = new List<string>();
        Dictionary<string, object> contract = AscetTestContracts.GetDictionary(request, "contract");
        if (contract != null)
        {
            IList suites = AscetTestContracts.GetValue(contract, "suites") as IList;
            if (suites != null)
            {
                for (int suiteIndex = 0; suiteIndex < suites.Count; suiteIndex++)
                {
                    IDictionary<string, object> suite = suites[suiteIndex] as IDictionary<string, object>;
                    if (suite == null) continue;
                    string suiteId = AscetTestContracts.GetString(suite, "id");
                    IList cases = AscetTestContracts.GetValue(suite, "cases") as IList;
                    if (cases == null) continue;
                    for (int caseIndex = 0; caseIndex < cases.Count; caseIndex++)
                    {
                        IDictionary<string, object> testCase = cases[caseIndex] as IDictionary<string, object>;
                    if (testCase != null) expected.Add(SafeTestId(suiteId) + "." + SafeTestId(AscetTestContracts.GetString(testCase, "id")));
                    }
                }
            }
        }
        IList actual = xml == null ? null : AscetTestContracts.GetValue(xml, "testNames") as IList;
        bool covered = expected.Count > 0 && actual != null;
        if (covered)
        {
            for (int index = 0; index < expected.Count; index++)
            {
                bool found = false;
                for (int actualIndex = 0; actualIndex < actual.Count; actualIndex++)
                    if (String.Equals(expected[index], Convert.ToString(actual[actualIndex]), StringComparison.Ordinal)) { found = true; break; }
                if (!found) { covered = false; break; }
            }
        }
        AddCheck(checks, ref firstCode, ref firstMessage, ref firstPath, "case_coverage", covered, "case_coverage_missing", "One or more contract cases are missing from GoogleTest XML.", "test-results.xml");
    }

    private static void AddCheck(
        IList<object> checks,
        ref string firstCode,
        ref string firstMessage,
        ref string firstPath,
        string id,
        bool passed,
        string code,
        string message,
        string path)
    {
        checks.Add(new Dictionary<string, object>
        {
            { "id", id },
            { "status", passed ? "passed" : "failed" },
            { "code", passed ? String.Empty : code },
            { "message", passed ? String.Empty : message },
            { "evidencePath", path ?? String.Empty }
        });
        if (!passed && String.IsNullOrWhiteSpace(firstCode))
        {
            firstCode = code;
            firstMessage = message;
            firstPath = path ?? String.Empty;
        }
    }

    private static bool SameExecutable(string actual, string configured)
    {
        if (String.IsNullOrWhiteSpace(actual) || String.IsNullOrWhiteSpace(configured)) return false;
        try { return String.Equals(Path.GetFullPath(actual).TrimEnd('\\', '/'), Path.GetFullPath(configured).TrimEnd('\\', '/'), StringComparison.OrdinalIgnoreCase); }
        catch { return String.Equals(actual.Replace('/', '\\'), configured.Replace('/', '\\'), StringComparison.OrdinalIgnoreCase); }
    }

    private static bool ContainsFlag(IList arguments, string expected)
    {
        if (arguments == null) return false;
        for (int index = 0; index < arguments.Count; index++)
            if (String.Equals(Convert.ToString(arguments[index]), expected, StringComparison.OrdinalIgnoreCase)) return true;
        return false;
    }

    private static string FirstNonEmpty(params string[] values)
    {
        for (int index = 0; index < values.Length; index++) if (!String.IsNullOrWhiteSpace(values[index])) return values[index];
        return String.Empty;
    }

    private static string SafeTestId(string value)
    {
        if (String.IsNullOrWhiteSpace(value)) return "generated";
        System.Text.StringBuilder builder = new System.Text.StringBuilder();
        for (int index = 0; index < value.Length; index++)
        {
            char current = value[index];
            builder.Append(Char.IsLetterOrDigit(current) || current == '_' ? current : '_');
        }
        string result = builder.ToString().Trim('_');
        if (String.IsNullOrWhiteSpace(result)) result = "generated";
        if (Char.IsDigit(result[0])) result = "T_" + result;
        return result;
    }

    private static string TryWriteResult(Dictionary<string, object> request, string runId, Dictionary<string, object> result)
    {
        try { return AscetTestArtifactWriter.WriteJson(request, runId, "verify-result.json", result); }
        catch { return String.Empty; }
    }

    private static Dictionary<string, object> Diagnostics(bool liveExecutionStarted)
    {
        return new Dictionary<string, object>
        {
            { "liveExecutionStarted", liveExecutionStarted },
            { "liveWritePerformed", false },
            { "schedulerRequired", false },
            { "evidenceOnly", true }
        };
    }

    private static AscetTestValidationIssue Issue(string path, string code, string message) { return new AscetTestValidationIssue { Path = path, Code = code, Message = message }; }
}
