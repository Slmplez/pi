using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Security;

public static class AscetTestReportService
{
    public static Dictionary<string, object> Write(
        Dictionary<string, object> request,
        Dictionary<string, object> pipelineData,
        Dictionary<string, object> state,
        string status,
        string failedStage,
        string failureCode,
        string failureMessage)
    {
        string runId = AscetTestContracts.GetString(request, "runId");
        string runDirectory;
        try { runDirectory = AscetTestArtifactWriter.ResolveRunDirectory(request, runId); }
        catch { return new Dictionary<string, object>(); }

        Dictionary<string, object> evidence = AscetTestEvidenceService.Collect(request, runDirectory);
        Dictionary<string, object> build = evidence["buildResult"] as Dictionary<string, object>;
        Dictionary<string, object> run = evidence["runResult"] as Dictionary<string, object>;
        Dictionary<string, object> xml = evidence["gtestXml"] as Dictionary<string, object>;
        string verifyPath = Path.Combine(runDirectory, "verify-result.json");
        Dictionary<string, object> verify = AscetTestEvidenceService.ReadJson(verifyPath);
        bool passed = String.Equals(status, "passed", StringComparison.OrdinalIgnoreCase) &&
                      (verify == null || String.Equals(AscetTestContracts.GetString(verify, "verdict"), "passed", StringComparison.OrdinalIgnoreCase));
        if (!passed && String.IsNullOrWhiteSpace(failureCode) && verify != null)
        {
            Dictionary<string, object> verifyFailure = AscetTestContracts.GetDictionary(verify, "firstFailure");
            if (verifyFailure != null)
            {
                failureCode = AscetTestContracts.GetString(verifyFailure, "code");
                failureMessage = AscetTestContracts.GetString(verifyFailure, "message");
                failedStage = "verify";
            }
        }
        if (!passed && String.IsNullOrWhiteSpace(failureCode))
        {
            Dictionary<string, object> stageFailure = FirstFailedStage(stagesFrom(state, pipelineData));
            if (stageFailure != null)
            {
                failedStage = AscetTestContracts.GetString(stageFailure, "stage");
                failureCode = AscetTestContracts.GetString(stageFailure, "failureCode");
                if (String.IsNullOrWhiteSpace(failureCode)) failureCode = "pipeline_stage_failed";
                failureMessage = "Pipeline stage failed: " + failedStage;
            }
        }
        if (!passed && String.IsNullOrWhiteSpace(failureCode)) failureCode = "pipeline_failed";
        if (!passed && String.IsNullOrWhiteSpace(failureMessage)) failureMessage = "C/GoogleTest pipeline failed.";
        if (!passed && String.IsNullOrWhiteSpace(failedStage)) failedStage = InferStage(failureCode);

        IList stages = stagesFrom(state, pipelineData);
        Dictionary<string, object> paths = evidence["paths"] as Dictionary<string, object>;
        Dictionary<string, object> metrics = Metrics(xml, run, stages);
        string reportStatus = passed ? "passed" : IsBlockedFailure(failureCode, status) ? "blocked" : "failed";
        string verdict = passed ? "passed" : reportStatus == "blocked" ? "not_proven" : "failed";
        Dictionary<string, object> firstFailure = passed ? null : new Dictionary<string, object>
        {
            { "stage", failedStage ?? String.Empty },
            { "code", failureCode ?? String.Empty },
            { "message", failureMessage ?? String.Empty },
            { "repairTarget", RepairTarget(failedStage, failureCode) },
            { "evidencePath", FailureEvidencePath(failedStage, failureCode, paths) }
        };
        Dictionary<string, object> report = new Dictionary<string, object>
        {
            { "schemaVersion", "ascet-test-report/v1" },
            { "runId", runId ?? String.Empty },
            { "componentPath", AscetTestContracts.GetString(request, "componentPath") },
            { "status", reportStatus },
            { "verdict", verdict },
            { "levels", AscetTestContracts.GetValue(request, "levels") ?? new List<object>() },
            { "stages", stages ?? new List<object>() },
            { "metrics", metrics },
            { "firstFailure", firstFailure },
            { "evidencePaths", paths ?? new Dictionary<string, object>() },
            { "diagnostics", Diagnostics(request, build, run) }
        };
        report["hashes"] = Hashes(request, pipelineData, runDirectory);

        string reportPath = Path.Combine(runDirectory, "report.json");
        string markdownPath = Path.Combine(runDirectory, "report.md");
        string junitPath = Path.Combine(runDirectory, "junit.xml");
        AscetTestContracts.WriteJson(reportPath, report);
        AscetTestContracts.WriteText(markdownPath, RenderMarkdown(report));
        AscetTestContracts.WriteText(junitPath, RenderJunit(report, xml));
        return new Dictionary<string, object>
        {
            { "report", report },
            { "reportPath", reportPath },
            { "markdownPath", markdownPath },
            { "junitPath", junitPath }
        };
    }

    private static Dictionary<string, object> Metrics(Dictionary<string, object> xml, Dictionary<string, object> run, IList stages)
    {
        return new Dictionary<string, object>
        {
            { "testsRun", xml == null ? 0 : AscetTestContracts.GetInteger(xml, "testsRun", 0) },
            { "testsFailed", xml == null ? 0 : AscetTestContracts.GetInteger(xml, "failures", 0) + AscetTestContracts.GetInteger(xml, "errors", 0) },
            { "testsDisabled", xml == null ? 0 : AscetTestContracts.GetInteger(xml, "disabled", 0) },
            { "exitCode", run == null ? -1 : AscetTestContracts.GetInteger(run, "exitCode", -1) },
            { "stageCount", stages == null ? 0 : stages.Count },
            { "durationMs", StageDurationMs(stages) },
            { "gtestXmlValid", xml != null && AscetTestContracts.GetBoolean(xml, "valid", false) }
        };
    }

    private static Dictionary<string, object> Diagnostics(Dictionary<string, object> request, Dictionary<string, object> build, Dictionary<string, object> run)
    {
        return new Dictionary<string, object>
        {
            { "liveExecutionStarted", AscetTestContracts.GetBoolean(request, "executeLive", false) },
            { "liveWritePerformed", AscetTestContracts.GetBoolean(request, "liveWritePerformed", false) },
            { "serialOperations", true },
            { "componentKind", AscetTestContracts.GetString(request, "objectKind") },
            { "cCompilerOwnsC", build == null || AscetTestContracts.GetBoolean(AscetTestContracts.GetDictionary(build, "stages"), "cCompile", false) },
            { "googleTestRuntimeObserved", run != null }
        };
    }

    private static string RenderMarkdown(Dictionary<string, object> report)
    {
        Dictionary<string, object> metrics = AscetTestContracts.GetDictionary(report, "metrics");
        Dictionary<string, object> failure = AscetTestContracts.GetDictionary(report, "firstFailure");
        System.Text.StringBuilder text = new System.Text.StringBuilder();
        text.AppendLine("# ASCET C / GoogleTest Report");
        text.AppendLine();
        text.AppendLine("- Run: " + AscetTestContracts.GetString(report, "runId"));
        text.AppendLine("- Component: " + AscetTestContracts.GetString(report, "componentPath"));
        text.AppendLine("- Status: **" + AscetTestContracts.GetString(report, "status") + "**");
        text.AppendLine("- Verdict: **" + AscetTestContracts.GetString(report, "verdict") + "**");
        text.AppendLine("- GoogleTest tests: " + AscetTestContracts.GetInteger(metrics, "testsRun", 0) + ", failed: " + AscetTestContracts.GetInteger(metrics, "testsFailed", 0));
        if (failure != null)
        {
            text.AppendLine();
            text.AppendLine("## First failure");
            text.AppendLine();
            text.AppendLine("- Stage: " + AscetTestContracts.GetString(failure, "stage"));
            text.AppendLine("- Code: " + AscetTestContracts.GetString(failure, "code"));
            text.AppendLine("- Message: " + AscetTestContracts.GetString(failure, "message"));
            text.AppendLine("- Repair target: " + AscetTestContracts.GetString(failure, "repairTarget"));
        }
        return text.ToString();
    }

    private static string RenderJunit(Dictionary<string, object> report, Dictionary<string, object> xml)
    {
        Dictionary<string, object> metrics = AscetTestContracts.GetDictionary(report, "metrics");
        Dictionary<string, object> failure = AscetTestContracts.GetDictionary(report, "firstFailure");
        int tests = AscetTestContracts.GetInteger(metrics, "testsRun", 0);
        int failures = AscetTestContracts.GetInteger(metrics, "testsFailed", 0);
        if (failure != null && failures == 0) failures = 1;
        if (tests <= 0) tests = 1;
        System.Text.StringBuilder text = new System.Text.StringBuilder();
        text.Append("<?xml version=\"1.0\" encoding=\"utf-8\"?><testsuites name=\"AscetTest\" tests=\"");
        text.Append(tests.ToString());
        text.Append("\" failures=\"");
        text.Append(failures.ToString());
        text.Append("\" errors=\"0\"><testsuite name=\"pipeline\" tests=\"");
        text.Append(tests.ToString());
        text.Append("\" failures=\"");
        text.Append(failures.ToString());
        text.Append("\">");
        IList names = xml == null ? null : AscetTestContracts.GetValue(xml, "testNames") as IList;
        if (names != null && names.Count > 0)
        {
            for (int index = 0; index < names.Count; index++)
            {
                string name = Convert.ToString(names[index]) ?? "generated_test";
                text.Append("<testcase classname=\"pipeline\" name=\"");
                text.Append(Escape(name));
                text.Append("\">");
                if (failure != null && failures > 0) text.Append("<failure message=\"").Append(Escape(AscetTestContracts.GetString(failure, "message"))).Append("\"/>");
                text.Append("</testcase>");
            }
        }
        else
        {
            text.Append("<testcase classname=\"pipeline\" name=\"pipeline\">");
            if (failure != null) text.Append("<failure message=\"").Append(Escape(AscetTestContracts.GetString(failure, "message"))).Append("\"/>");
            text.Append("</testcase>");
        }
        text.Append("</testsuite></testsuites>");
        return text.ToString();
    }

    private static string Escape(string value) { return SecurityElement.Escape(value ?? String.Empty) ?? String.Empty; }
    private static string InferStage(string code)
    {
        if (String.IsNullOrWhiteSpace(code)) return "pipeline";
        if (code.IndexOf("compile", StringComparison.OrdinalIgnoreCase) >= 0 || code.IndexOf("source", StringComparison.OrdinalIgnoreCase) >= 0) return "build";
        if (code.IndexOf("link", StringComparison.OrdinalIgnoreCase) >= 0) return "build";
        if (code.IndexOf("runtime", StringComparison.OrdinalIgnoreCase) >= 0 || code.IndexOf("gtest", StringComparison.OrdinalIgnoreCase) >= 0) return "run";
        return "verify";
    }
    private static string RepairTarget(string stage, string code)
    {
        if (String.Equals(stage, "build", StringComparison.OrdinalIgnoreCase) && code != null && code.IndexOf("c_", StringComparison.OrdinalIgnoreCase) >= 0) return "ASCET generated C source and C compiler flags";
        if (String.Equals(stage, "build", StringComparison.OrdinalIgnoreCase) && code != null && code.IndexOf("cpp", StringComparison.OrdinalIgnoreCase) >= 0) return "GoogleTest C++ adapter/test source";
        if (String.Equals(stage, "build", StringComparison.OrdinalIgnoreCase) && code != null && code.IndexOf("link", StringComparison.OrdinalIgnoreCase) >= 0) return "C/C++ linker and 32-bit link flags";
        if (code != null && code.IndexOf("export", StringComparison.OrdinalIgnoreCase) >= 0) return "ASCET generated C export manifest";
        if (String.Equals(stage, "run", StringComparison.OrdinalIgnoreCase)) return "GoogleTest runtime, adapter, or generated C behavior";
        if (String.Equals(stage, "verify", StringComparison.OrdinalIgnoreCase)) return "Verification evidence and test contract coverage";
        return "Pipeline request and generated test artifacts";
    }
    private static string FailureEvidencePath(string stage, string code, Dictionary<string, object> paths)
    {
        if (paths == null) return String.Empty;
        if (String.Equals(stage, "build", StringComparison.OrdinalIgnoreCase)) return AscetTestContracts.GetString(paths, "buildResult");
        if (String.Equals(stage, "run", StringComparison.OrdinalIgnoreCase)) return AscetTestContracts.GetString(paths, "runResult");
        if (String.Equals(stage, "verify", StringComparison.OrdinalIgnoreCase)) return Path.Combine(AscetTestContracts.GetString(paths, "runDirectory"), "verify-result.json");
        return AscetTestContracts.GetString(paths, "runDirectory");
    }

    private static IList stagesFrom(Dictionary<string, object> state, Dictionary<string, object> pipelineData)
    {
        IList stages = state == null ? null : AscetTestContracts.GetValue(state, "stages") as IList;
        if (stages == null && pipelineData != null) stages = AscetTestContracts.GetValue(pipelineData, "stages") as IList;
        return stages;
    }

    private static Dictionary<string, object> FirstFailedStage(IList stages)
    {
        if (stages == null) return null;
        for (int index = 0; index < stages.Count; index++)
        {
            Dictionary<string, object> stage = stages[index] as Dictionary<string, object>;
            if (stage != null && String.Equals(AscetTestContracts.GetString(stage, "status"), "failed", StringComparison.OrdinalIgnoreCase)) return stage;
        }
        return null;
    }

    private static bool IsBlockedFailure(string code, string status)
    {
        if (String.Equals(status, "blocked", StringComparison.OrdinalIgnoreCase)) return true;
        if (String.IsNullOrWhiteSpace(code)) return false;
        return code.IndexOf("approval", StringComparison.OrdinalIgnoreCase) >= 0 ||
               code.IndexOf("baseline", StringComparison.OrdinalIgnoreCase) >= 0 ||
               code.IndexOf("not_proven", StringComparison.OrdinalIgnoreCase) >= 0 ||
               code.IndexOf("unsupported", StringComparison.OrdinalIgnoreCase) >= 0 ||
               code.IndexOf("readback", StringComparison.OrdinalIgnoreCase) >= 0;
    }

    private static int StageDurationMs(IList stages)
    {
        int total = 0;
        if (stages == null) return total;
        for (int index = 0; index < stages.Count; index++)
        {
            Dictionary<string, object> stage = stages[index] as Dictionary<string, object>;
            if (stage == null) continue;
            DateTime started;
            DateTime finished;
            if (DateTime.TryParse(AscetTestContracts.GetString(stage, "startedAt"), out started) && DateTime.TryParse(AscetTestContracts.GetString(stage, "finishedAt"), out finished) && finished >= started)
            {
                double ms = (finished - started).TotalMilliseconds;
                if (ms < Int32.MaxValue - total) total += (int)ms;
            }
        }
        return total;
    }

    private static Dictionary<string, object> Hashes(Dictionary<string, object> request, Dictionary<string, object> pipelineData, string runDirectory)
    {
        Dictionary<string, object> result = new Dictionary<string, object>
        {
            { "requestHash", AscetTestContracts.GetString(pipelineData, "requestHash") },
            { "inspectionHash", String.Empty },
            { "elementSpecHash", String.Empty },
            { "applyPlanHash", String.Empty },
            { "exportManifestHash", String.Empty }
        };
        string[] files = { "inspection.json", "element-spec.json", "esdl-apply-plan.json", "export-manifest.json" };
        string[] keys = { "inspectionHash", "elementSpecHash", "applyPlanHash", "exportManifestHash" };
        for (int index = 0; index < files.Length; index++)
        {
            string path = Path.Combine(runDirectory, files[index]);
            if (File.Exists(path))
            {
                try { result[keys[index]] = AscetTestContracts.ComputeSha256(File.ReadAllText(path)); } catch { }
            }
        }
        return result;
    }
}
