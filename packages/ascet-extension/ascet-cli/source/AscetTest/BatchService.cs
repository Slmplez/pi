using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;

public static class AscetTestBatchService
{
    public static Dictionary<string, object> Execute(Dictionary<string, object> request)
    {
        string runId = AscetTestContracts.GetString(request, "runId");
        IList rawItems = AscetTestContracts.GetValue(request, "items") as IList;
        List<AscetTestValidationIssue> errors = new List<AscetTestValidationIssue>();
        if (!String.Equals(AscetTestContracts.GetString(request, "schemaVersion"), "ascet-test-batch/v1", StringComparison.OrdinalIgnoreCase))
            errors.Add(Issue("schemaVersion", "batch_schema_invalid", "Batch schemaVersion must be ascet-test-batch/v1."));
        if (rawItems == null || rawItems.Count == 0)
            errors.Add(Issue("items", "batch_items_missing", "At least one manifest-only pipeline item is required."));
        if (errors.Count > 0)
            return AscetTestEnvelope.Blocked("batch", runId, new Dictionary<string, object>(), errors[0].Code, errors[0].Message, errors, new List<AscetTestValidationIssue>(), Diagnostics(AscetTestContracts.GetBoolean(request, "serialLive", false)));

        List<object> itemResults = new List<object>();
        bool serialLive = AscetTestContracts.GetBoolean(request, "serialLive", false);
        HashSet<string> runDirectories = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        int passed = 0;
        int failed = 0;
        string firstFailureCode = String.Empty;
        string firstFailureMessage = String.Empty;
        for (int index = 0; index < rawItems.Count; index++)
        {
            Dictionary<string, object> item = rawItems[index] as Dictionary<string, object>;
            if (item == null)
            {
                failed++;
                itemResults.Add(FailedItem(index.ToString(), "batch_item_invalid", "Batch item must be an object."));
                SetFirstFailure(ref firstFailureCode, ref firstFailureMessage, "batch_item_invalid", "Batch item must be an object.");
                continue;
            }
            string itemId = FirstNonEmpty(AscetTestContracts.GetString(item, "id"), index.ToString());
            string requestPath = AscetTestContracts.GetString(item, "requestPath");
            Dictionary<string, object> child;
            try
            {
                if (!String.IsNullOrWhiteSpace(requestPath)) child = AscetTestContracts.ReadObject(AscetTestContracts.ResolvePath(requestPath, Directory.GetCurrentDirectory()), "batchItemRequest");
                else child = AscetTestContracts.GetDictionary(item, "request");
            }
            catch (Exception ex)
            {
                failed++;
                itemResults.Add(FailedItem(itemId, "batch_item_request_invalid", ex.Message));
                SetFirstFailure(ref firstFailureCode, ref firstFailureMessage, "batch_item_request_invalid", ex.Message);
                continue;
            }
            if (child == null)
            {
                failed++;
                itemResults.Add(FailedItem(itemId, "batch_item_request_missing", "Batch item requestPath or request is required."));
                SetFirstFailure(ref firstFailureCode, ref firstFailureMessage, "batch_item_request_missing", "Batch item requestPath or request is required.");
                continue;
            }
            string childRunId = FirstNonEmpty(AscetTestContracts.GetString(item, "runId"), AscetTestContracts.GetString(child, "runId"), itemId);
            string childRunDirectory = FirstNonEmpty(AscetTestContracts.GetString(item, "runDirectory"), AscetTestContracts.GetString(child, "runDirectory"));
            child["runId"] = childRunId;
            child["batchRunId"] = runId ?? String.Empty;
            if (!String.IsNullOrWhiteSpace(childRunDirectory)) child["runDirectory"] = childRunDirectory;
            IList itemStages = AscetTestContracts.GetValue(item, "stages") as IList;
            if (itemStages != null && itemStages.Count > 0) child["pipelineStages"] = itemStages;
            if (!serialLive) child["executeLive"] = false;
            string resolvedRunDirectory;
            try { resolvedRunDirectory = AscetTestArtifactWriter.ResolveRunDirectory(child, childRunId); }
            catch (Exception ex)
            {
                failed++;
                itemResults.Add(FailedItem(itemId, "batch_run_directory_invalid", ex.Message));
                SetFirstFailure(ref firstFailureCode, ref firstFailureMessage, "batch_run_directory_invalid", ex.Message);
                continue;
            }
            if (!runDirectories.Add(resolvedRunDirectory))
            {
                failed++;
                itemResults.Add(FailedItem(itemId, "batch_run_directory_duplicate", "Batch items must use distinct runDirectory values."));
                SetFirstFailure(ref firstFailureCode, ref firstFailureMessage, "batch_run_directory_duplicate", "Batch items must use distinct runDirectory values.");
                continue;
            }

            Dictionary<string, object> response = AscetTestPipelineService.Execute(child);
            bool ok = AscetTestContracts.GetBoolean(response, "ok", false) && String.Equals(AscetTestContracts.GetString(response, "status"), "passed", StringComparison.OrdinalIgnoreCase);
            if (ok) passed++; else failed++;
            Dictionary<string, object> responseData = AscetTestContracts.GetDictionary(response, "data");
            string reportPath = responseData == null ? String.Empty : AscetTestContracts.GetString(responseData, "reportPath");
            Dictionary<string, object> error = AscetTestContracts.GetDictionary(response, "error");
            string code = error == null ? String.Empty : AscetTestContracts.GetString(error, "code");
            string message = error == null ? String.Empty : AscetTestContracts.GetString(error, "message");
            if (!ok) SetFirstFailure(ref firstFailureCode, ref firstFailureMessage, String.IsNullOrWhiteSpace(code) ? "batch_item_failed" : code, String.IsNullOrWhiteSpace(message) ? "Batch item pipeline failed." : message);
            itemResults.Add(new Dictionary<string, object>
            {
                { "id", itemId },
                { "runId", childRunId },
                { "runDirectory", resolvedRunDirectory },
                { "status", ok ? "passed" : "failed" },
                { "ok", ok },
                { "reportPath", reportPath },
                { "response", response }
            });
        }

        bool allPassed = failed == 0;
        Dictionary<string, object> data = new Dictionary<string, object>
        {
            { "schemaVersion", "ascet-test-batch/v1" },
            { "runId", runId ?? String.Empty },
            { "status", allPassed ? "passed" : "failed" },
            { "total", rawItems.Count },
            { "passed", passed },
            { "failed", failed },
            { "serialLive", serialLive },
            { "items", itemResults }
        };
        if (!allPassed) data["firstFailure"] = new Dictionary<string, object> { { "code", firstFailureCode }, { "message", firstFailureMessage } };
        string resultPath = TryWriteResult(request, runId, data);
        data["batchResultPath"] = resultPath;
        if (!String.IsNullOrWhiteSpace(resultPath)) TryWriteResult(request, runId, data);
        if (allPassed) return AscetTestEnvelope.Success("batch", runId, "passed", data, new List<AscetTestValidationIssue>(), Diagnostics(serialLive));
        return AscetTestEnvelope.Blocked("batch", runId, data, firstFailureCode, firstFailureMessage, new List<AscetTestValidationIssue> { Issue("items", firstFailureCode, firstFailureMessage) }, new List<AscetTestValidationIssue>(), Diagnostics(serialLive));
    }

    private static Dictionary<string, object> FailedItem(string id, string code, string message)
    {
        return new Dictionary<string, object> { { "id", id }, { "status", "failed" }, { "ok", false }, { "failureCode", code }, { "message", message } };
    }
    private static void SetFirstFailure(ref string code, ref string message, string nextCode, string nextMessage)
    {
        if (String.IsNullOrWhiteSpace(code)) { code = nextCode; message = nextMessage; }
    }
    private static string TryWriteResult(Dictionary<string, object> request, string runId, Dictionary<string, object> data)
    {
        try { return AscetTestArtifactWriter.WriteJson(request, runId, "batch-result.json", data); }
        catch { return String.Empty; }
    }
    private static string FirstNonEmpty(params string[] values)
    {
        for (int index = 0; index < values.Length; index++) if (!String.IsNullOrWhiteSpace(values[index])) return values[index];
        return String.Empty;
    }
    private static Dictionary<string, object> Diagnostics(bool serialLive)
    {
        return new Dictionary<string, object> { { "liveExecutionStarted", serialLive }, { "liveWritePerformed", false }, { "serialStages", true }, { "manifestOnly", !serialLive } };
    }
    private static AscetTestValidationIssue Issue(string path, string code, string message) { return new AscetTestValidationIssue { Path = path, Code = code, Message = message }; }
}
