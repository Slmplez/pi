using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;

public static class AscetTestPipelineService
{
    public static Dictionary<string, object> Execute(Dictionary<string, object> request)
    {
        string runId = AscetTestContracts.GetString(request, "runId");
        List<string> stages = ReadStages(request);
        List<object> stageRecords = new List<object>();
        string requestHash = RequestHash(request);
        bool resumeRequested;
        string resumeErrorCode;
        string resumeErrorMessage;
        Dictionary<string, object> previousState = LoadResumeState(request, requestHash, runId, out resumeRequested, out resumeErrorCode, out resumeErrorMessage);
        if (resumeRequested && previousState == null && !String.IsNullOrWhiteSpace(resumeErrorCode))
        {
            return AscetTestEnvelope.Blocked(
                "pipeline",
                runId,
                new Dictionary<string, object> { { "status", "blocked" }, { "requestHash", requestHash } },
                resumeErrorCode,
                resumeErrorMessage,
                new List<AscetTestValidationIssue> { Issue("resumeFrom", resumeErrorCode, resumeErrorMessage) },
                new List<AscetTestValidationIssue>(),
                Diagnostics(request));
        }
        if (previousState != null && String.Equals(AscetTestContracts.GetString(previousState, "status"), "passed", StringComparison.OrdinalIgnoreCase) && ResumeArtifactsExist(previousState))
        {
            string previousPath = AscetTestContracts.ResolvePath(AscetTestContracts.GetString(request, "resumeFrom"), Directory.GetCurrentDirectory());
            Dictionary<string, object> resumedData = new Dictionary<string, object>
            {
                { "schemaVersion", "ascet-test-pipeline/v1" },
                { "runId", runId ?? String.Empty },
                { "status", "passed" },
                { "requestHash", requestHash },
                { "stages", AscetTestContracts.GetValue(previousState, "stages") ?? new List<object>() },
                { "pipelineStatePath", previousPath }
            };
            AttachReport(request, resumedData, previousState, "passed", String.Empty, String.Empty, String.Empty);
            return AscetTestEnvelope.Success("pipeline", runId, "passed", resumedData, new List<AscetTestValidationIssue>(), Diagnostics(request));
        }
        int resumeStart = 0;
        if (previousState != null)
        {
            IList previousStages = AscetTestContracts.GetValue(previousState, "stages") as IList;
            if (previousStages != null)
            {
                while (resumeStart < previousStages.Count && String.Equals(AscetTestContracts.GetString(previousStages[resumeStart] as IDictionary<string, object>, "status"), "passed", StringComparison.OrdinalIgnoreCase))
                {
                    stageRecords.Add(previousStages[resumeStart]);
                    resumeStart++;
                }
                if (resumeStart > 0 && resumeStart < stages.Count) stages = stages.GetRange(resumeStart, stages.Count - resumeStart);
                RecoverResumeArtifacts(previousStages, resumeStart, request);
            }
        }
        Dictionary<string, object> state = new Dictionary<string, object>
        {
            { "schemaVersion", "ascet-test-pipeline/v1" },
            { "runId", runId ?? String.Empty },
            { "requestHash", requestHash },
            { "status", "running" },
            { "stages", stageRecords }
        };
        string statePath = TryWriteState(request, runId, state);
        Dictionary<string, object> data = new Dictionary<string, object>
        {
            { "schemaVersion", "ascet-test-pipeline/v1" },
            { "runId", runId ?? String.Empty },
            { "requestHash", requestHash },
            { "status", "running" },
            { "stages", stageRecords },
            { "pipelineStatePath", statePath }
        };
        string pipelineFailureCode = String.Empty;
        string pipelineFailureMessage = String.Empty;
        string pipelineFailureStage = String.Empty;

        for (int index = 0; index < stages.Count; index++)
        {
            string stage = stages[index];
            Dictionary<string, object> runningRecord = StageRecord(stage, "running", null);
            stageRecords.Add(runningRecord);
            state["status"] = "running";
            TryWriteState(request, runId, state);

            Dictionary<string, object> envelope = ExecuteStage(stage, request);
            bool ok = AscetTestContracts.GetBoolean(envelope, "ok", false);
            Dictionary<string, object> stageData = AscetTestContracts.GetDictionary(envelope, "data");
            runningRecord["status"] = ok ? "passed" : "failed";
            runningRecord["finishedAt"] = DateTime.UtcNow.ToString("o");
            runningRecord["actionStatus"] = AscetTestContracts.GetString(envelope, "status");
            runningRecord["artifactPaths"] = ArtifactPaths(stageData);
            Dictionary<string, object> error = AscetTestContracts.GetDictionary(envelope, "error");
            runningRecord["failureCode"] = error == null ? String.Empty : AscetTestContracts.GetString(error, "code");
            CarryForwardStageArtifacts(stage, stageData, request);
            if (String.Equals(stage, "build", StringComparison.OrdinalIgnoreCase) && stageData != null)
            {
                string path = AscetTestContracts.GetString(stageData, "buildResultPath");
                if (!String.IsNullOrWhiteSpace(path)) request["buildResultPath"] = path;
            }
            if (String.Equals(stage, "run", StringComparison.OrdinalIgnoreCase) && stageData != null)
            {
                string path = AscetTestContracts.GetString(stageData, "runResultPath");
                if (!String.IsNullOrWhiteSpace(path)) request["runResultPath"] = path;
            }
            state["status"] = ok ? "running" : "failed";
            TryWriteState(request, runId, state);
            if (!ok)
            {
                string code = error == null ? "pipeline_stage_failed" : AscetTestContracts.GetString(error, "code");
                if (String.IsNullOrWhiteSpace(code)) code = "pipeline_stage_failed";
                if (String.IsNullOrWhiteSpace(pipelineFailureCode))
                {
                    pipelineFailureCode = code;
                    pipelineFailureMessage = "Pipeline stage failed: " + stage;
                    pipelineFailureStage = stage;
                }
                // A failed run still produces useful runtime/XML evidence, so
                // verify is allowed to consume it. Build and all other failed
                // prerequisites stop the pipeline immediately.
                if (!String.Equals(stage, "run", StringComparison.OrdinalIgnoreCase))
                {
                    data["status"] = "failed";
                    data["failedStage"] = stage;
                    data["stages"] = stageRecords;
                    data["pipelineStatePath"] = TryWriteState(request, runId, state);
                    AttachReport(request, data, state, "failed", pipelineFailureStage, pipelineFailureCode, pipelineFailureMessage);
                    return AscetTestEnvelope.Blocked(
                        "pipeline",
                        runId,
                        data,
                        pipelineFailureCode,
                        pipelineFailureMessage,
                        new List<AscetTestValidationIssue> { Issue(stage, pipelineFailureCode, pipelineFailureMessage) },
                        new List<AscetTestValidationIssue>(),
                        Diagnostics(request));
                }
            }
        }

        if (!String.IsNullOrWhiteSpace(pipelineFailureCode))
        {
            state["status"] = "failed";
            statePath = TryWriteState(request, runId, state);
            data["status"] = "failed";
            data["failedStage"] = pipelineFailureStage;
            data["stages"] = stageRecords;
            data["pipelineStatePath"] = statePath;
            AttachReport(request, data, state, "failed", pipelineFailureStage, pipelineFailureCode, pipelineFailureMessage);
            return AscetTestEnvelope.Blocked(
                "pipeline",
                runId,
                data,
                pipelineFailureCode,
                pipelineFailureMessage,
                new List<AscetTestValidationIssue> { Issue(pipelineFailureStage, pipelineFailureCode, pipelineFailureMessage) },
                new List<AscetTestValidationIssue>(),
                Diagnostics(request));
        }

        state["status"] = "passed";
        statePath = TryWriteState(request, runId, state);
        data["status"] = "passed";
        data["stages"] = stageRecords;
        data["pipelineStatePath"] = statePath;
        AttachReport(request, data, state, "passed", String.Empty, String.Empty, String.Empty);
        return AscetTestEnvelope.Success(
            "pipeline",
            runId,
            "passed",
            data,
            new List<AscetTestValidationIssue>(),
            Diagnostics(request));
    }

    private static Dictionary<string, object> ExecuteStage(string stage, Dictionary<string, object> request)
    {
        if (String.Equals(stage, "inspect", StringComparison.OrdinalIgnoreCase)) return AscetTestInspectionService.Execute(request);
        if (String.Equals(stage, "generate-esdl", StringComparison.OrdinalIgnoreCase)) return AscetTestEsdlDraftService.Execute(request);
        if (String.Equals(stage, "plan", StringComparison.OrdinalIgnoreCase)) return AscetTestElementSpecService.ExecutePlan(request);
        if (String.Equals(stage, "generate-cases", StringComparison.OrdinalIgnoreCase)) return AscetTestCaseGenerationService.Execute(request);
        if (String.Equals(stage, "apply", StringComparison.OrdinalIgnoreCase)) return AscetTestApplyService.Execute(request);
        if (String.Equals(stage, "export", StringComparison.OrdinalIgnoreCase)) return AscetTestApplyService.ExecuteExport(request);
        if (String.Equals(stage, "build", StringComparison.OrdinalIgnoreCase)) return AscetTestBuildService.Execute(request);
        if (String.Equals(stage, "run", StringComparison.OrdinalIgnoreCase)) return AscetTestRunService.Execute(request);
        if (String.Equals(stage, "verify", StringComparison.OrdinalIgnoreCase)) return AscetTestVerdictService.Execute(request);
        return AscetTestEnvelope.Blocked(
            "pipeline",
            AscetTestContracts.GetString(request, "runId"),
            new Dictionary<string, object>(),
            "pipeline_stage_unsupported",
            "Pipeline stage is not supported: " + stage,
            new List<AscetTestValidationIssue> { Issue(stage, "pipeline_stage_unsupported", "Pipeline stage is not supported: " + stage) },
            new List<AscetTestValidationIssue>(),
            Diagnostics(request));
    }

    private static List<string> ReadStages(Dictionary<string, object> request)
    {
        List<string> result = new List<string>();
        object raw = AscetTestContracts.GetValue(request, "pipelineStages");
        if (raw == null)
        {
            Dictionary<string, object> pipeline = AscetTestContracts.GetDictionary(request, "pipeline");
            if (pipeline != null) raw = AscetTestContracts.GetValue(pipeline, "stages");
        }
        IList values = raw as IList;
        if (values != null)
        {
            for (int index = 0; index < values.Count; index++)
            {
                string stage = Convert.ToString(values[index]);
                if (!String.IsNullOrWhiteSpace(stage)) result.Add(stage.Trim());
            }
        }
        if (result.Count == 0)
        {
            result.Add("build");
            result.Add("run");
            result.Add("verify");
        }
        return result;
    }

    private static Dictionary<string, object> StageRecord(string stage, string status, Dictionary<string, object> data)
    {
        return new Dictionary<string, object>
        {
            { "stage", stage },
            { "status", status },
            { "startedAt", DateTime.UtcNow.ToString("o") },
            { "finishedAt", String.Empty },
            { "actionStatus", String.Empty },
            { "artifactPaths", ArtifactPaths(data) },
            { "failureCode", String.Empty }
        };
    }

    private static List<object> ArtifactPaths(Dictionary<string, object> data)
    {
        List<object> result = new List<object>();
        if (data == null) return result;
        string[] keys = { "artifactPath", "inspectionPath", "draftPath", "esdlPath", "elementSpecPath", "applyPlanPath", "applyResultPath", "exportResultPath", "buildResultPath", "runResultPath", "verifyResultPath", "compileCommandsPath", "gtestXmlPath", "pipelineStatePath", "reportPath", "reportMarkdownPath", "junitPath" };
        for (int index = 0; index < keys.Length; index++)
        {
            string value = AscetTestContracts.GetString(data, keys[index]);
            if (!String.IsNullOrWhiteSpace(value) && !result.Contains(value)) result.Add(value);
        }
        Dictionary<string, object> artifacts = AscetTestContracts.GetDictionary(data, "artifacts");
        if (artifacts != null)
        {
            foreach (KeyValuePair<string, object> pair in artifacts)
            {
                string value = Convert.ToString(pair.Value);
                if (!String.IsNullOrWhiteSpace(value) && !result.Contains(value)) result.Add(value);
            }
        }
        return result;
    }

    private static Dictionary<string, object> LoadResumeState(
        Dictionary<string, object> request,
        string requestHash,
        string runId,
        out bool requested,
        out string errorCode,
        out string errorMessage)
    {
        requested = false;
        errorCode = String.Empty;
        errorMessage = String.Empty;
        string resumePath = AscetTestContracts.GetString(request, "resumeFrom");
        if (String.IsNullOrWhiteSpace(resumePath)) return null;
        requested = true;
        string path = AscetTestContracts.ResolvePath(resumePath, Directory.GetCurrentDirectory());
        if (!File.Exists(path))
        {
            errorCode = "resume_state_missing";
            errorMessage = "Pipeline resume state was not found: " + path;
            return null;
        }
        try
        {
            Dictionary<string, object> state = AscetTestContracts.ReadObject(path, "pipeline-state");
            string previousHash = AscetTestContracts.GetString(state, "requestHash");
            if (String.IsNullOrWhiteSpace(previousHash) || !String.Equals(previousHash, requestHash, StringComparison.OrdinalIgnoreCase))
            {
                errorCode = "resume_stale";
                errorMessage = "Pipeline resume state does not match the current request.";
                return null;
            }
            return state;
        }
        catch (Exception ex)
        {
            errorCode = "resume_state_invalid";
            errorMessage = ex.Message;
            return null;
        }
    }

    private static bool ResumeArtifactsExist(Dictionary<string, object> state)
    {
        IList stages = AscetTestContracts.GetValue(state, "stages") as IList;
        if (stages == null || stages.Count == 0) return false;
        for (int index = 0; index < stages.Count; index++)
        {
            IDictionary<string, object> stage = stages[index] as IDictionary<string, object>;
            if (stage == null) return false;
            IList paths = AscetTestContracts.GetValue(stage, "artifactPaths") as IList;
            if (paths == null || paths.Count == 0) return false;
            bool stageHasFile = false;
            for (int pathIndex = 0; pathIndex < paths.Count; pathIndex++)
            {
                string path = Convert.ToString(paths[pathIndex]);
                if (!String.IsNullOrWhiteSpace(path) && File.Exists(AscetTestContracts.ResolvePath(path, Directory.GetCurrentDirectory()))) stageHasFile = true;
            }
            if (!stageHasFile) return false;
        }
        return true;
    }

    private static void RecoverResumeArtifacts(IList previousStages, int passedCount, Dictionary<string, object> request)
    {
        for (int index = 0; index < passedCount; index++)
        {
            IDictionary<string, object> stage = previousStages[index] as IDictionary<string, object>;
            if (stage == null) continue;
            string stageName = AscetTestContracts.GetString(stage, "stage");
            IList paths = AscetTestContracts.GetValue(stage, "artifactPaths") as IList;
            if (paths == null) continue;
            for (int pathIndex = 0; pathIndex < paths.Count; pathIndex++)
            {
                string path = Convert.ToString(paths[pathIndex]);
                if (String.IsNullOrWhiteSpace(path)) continue;
                if (String.Equals(stageName, "build", StringComparison.OrdinalIgnoreCase) && path.EndsWith("build-result.json", StringComparison.OrdinalIgnoreCase)) request["buildResultPath"] = path;
                if (String.Equals(stageName, "run", StringComparison.OrdinalIgnoreCase) && path.EndsWith("run-result.json", StringComparison.OrdinalIgnoreCase)) request["runResultPath"] = path;
            }
        }
    }

    private static string RequestHash(Dictionary<string, object> request)
    {
        string supplied = AscetTestContracts.GetString(request, "requestHash");
        if (!String.IsNullOrWhiteSpace(supplied)) return supplied;
        Dictionary<string, object> normalized = new Dictionary<string, object>();
        foreach (KeyValuePair<string, object> pair in request)
        {
            if (String.Equals(pair.Key, "resumeFrom", StringComparison.OrdinalIgnoreCase) || String.Equals(pair.Key, "requestHash", StringComparison.OrdinalIgnoreCase)) continue;
            normalized[pair.Key] = pair.Value;
        }
        return AscetTestContracts.ComputeSha256(AscetTestContracts.Serialize(normalized));
    }

    private static string TryWriteState(Dictionary<string, object> request, string runId, Dictionary<string, object> state)
    {
        try { return AscetTestArtifactWriter.WriteJson(request, runId, "pipeline-state.json", state); }
        catch { return String.Empty; }
    }

    private static void CarryForwardStageArtifacts(string stage, Dictionary<string, object> stageData, Dictionary<string, object> request)
    {
        if (stageData == null) return;
        string[] keys = { "inspectionPath", "draftPath", "esdlPath", "elementSpecPath", "applyPlanPath", "applyResultPath", "exportResultPath", "buildResultPath", "runResultPath", "verifyResultPath", "liveExportPath" };
        for (int index = 0; index < keys.Length; index++)
        {
            string value = AscetTestContracts.GetString(stageData, keys[index]);
            if (!String.IsNullOrWhiteSpace(value)) request[keys[index]] = value;
        }
        if (String.Equals(stage, "apply", StringComparison.OrdinalIgnoreCase))
        {
            request["readbackVerified"] = AscetTestContracts.GetBoolean(stageData, "readbackVerified", false);
        }
    }

    private static Dictionary<string, object> Diagnostics(Dictionary<string, object> request)
    {
        return new Dictionary<string, object>
        {
            { "liveExecutionStarted", AscetTestContracts.GetBoolean(request, "executeLive", false) },
            { "liveWritePerformed", false },
            { "schedulerRequired", AscetTestContracts.GetBoolean(request, "executeLive", false) },
            { "serialStages", true }
        };
    }

    private static void AttachReport(
        Dictionary<string, object> request,
        Dictionary<string, object> data,
        Dictionary<string, object> state,
        string status,
        string failedStage,
        string failureCode,
        string failureMessage)
    {
        try
        {
            Dictionary<string, object> report = AscetTestReportService.Write(request, data, state, status, failedStage, failureCode, failureMessage);
            if (report == null) return;
            data["report"] = AscetTestContracts.GetValue(report, "report");
            data["reportPath"] = AscetTestContracts.GetString(report, "reportPath");
            data["reportMarkdownPath"] = AscetTestContracts.GetString(report, "markdownPath");
            data["junitPath"] = AscetTestContracts.GetString(report, "junitPath");
        }
        catch (Exception ex)
        {
            data["reportError"] = ex.Message;
        }
    }

    private static AscetTestValidationIssue Issue(string path, string code, string message) { return new AscetTestValidationIssue { Path = path, Code = code, Message = message }; }
}
