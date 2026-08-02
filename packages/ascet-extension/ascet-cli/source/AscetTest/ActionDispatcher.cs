using System;
using System.Collections.Generic;

public static class AscetTestActionDispatcher
{
    public static Dictionary<string, object> Dispatch(
        AscetTestCommandLine commandLine,
        Dictionary<string, object> request)
    {
        if (commandLine == null)
        {
            throw new AscetTestCliException("invalid_arguments", "Command line is required.");
        }

        if (String.Equals(commandLine.Action, "prepare", StringComparison.OrdinalIgnoreCase))
        {
            return AscetTestPrepareService.Execute(request);
        }
        if (String.Equals(commandLine.Action, "inspect", StringComparison.OrdinalIgnoreCase))
        {
            return AscetTestInspectionService.Execute(request);
        }
        if (String.Equals(commandLine.Action, "generate-esdl", StringComparison.OrdinalIgnoreCase))
        {
            return AscetTestEsdlDraftService.Execute(request);
        }
        if (String.Equals(commandLine.Action, "plan", StringComparison.OrdinalIgnoreCase))
        {
            return AscetTestElementSpecService.ExecutePlan(request);
        }
        if (String.Equals(commandLine.Action, "apply", StringComparison.OrdinalIgnoreCase))
        {
            return AscetTestApplyService.Execute(request);
        }
        if (String.Equals(commandLine.Action, "export", StringComparison.OrdinalIgnoreCase))
        {
            return AscetTestApplyService.ExecuteExport(request);
        }
        if (String.Equals(commandLine.Action, "generate-cases", StringComparison.OrdinalIgnoreCase))
        {
            return AscetTestCaseGenerationService.Execute(request);
        }
        if (String.Equals(commandLine.Action, "build", StringComparison.OrdinalIgnoreCase))
        {
            return AscetTestBuildService.Execute(request);
        }
        if (String.Equals(commandLine.Action, "run", StringComparison.OrdinalIgnoreCase))
        {
            return AscetTestRunService.Execute(request);
        }
        if (String.Equals(commandLine.Action, "verify", StringComparison.OrdinalIgnoreCase))
        {
            return AscetTestVerdictService.Execute(request);
        }
        if (String.Equals(commandLine.Action, "pipeline", StringComparison.OrdinalIgnoreCase))
        {
            return AscetTestPipelineService.Execute(request);
        }
        if (String.Equals(commandLine.Action, "batch", StringComparison.OrdinalIgnoreCase))
        {
            return AscetTestBatchService.Execute(request);
        }

        string runId = AscetTestContracts.GetString(request, "runId");
        if (String.IsNullOrWhiteSpace(runId))
        {
            runId = "internal-skeleton";
        }

        Dictionary<string, object> data = new Dictionary<string, object>();
        data["implementationState"] = "skeleton";
        data["actionAccepted"] = true;
        data["runId"] = runId;
        data["next"] = "Implement the action service before using this action for live ASCET or test execution.";

        return AscetTestEnvelope.NotImplemented(
            commandLine.Action,
            runId,
            data,
            "action_not_implemented");
    }
}

public static class AscetTestEnvelope
{
    public static Dictionary<string, object> Success(
        string action,
        string runId,
        Dictionary<string, object> data,
        IList<AscetTestValidationIssue> warnings,
        Dictionary<string, object> diagnostics)
    {
        return Success(action, runId, "preflight", data, warnings, diagnostics);
    }

    public static Dictionary<string, object> Success(
        string action,
        string runId,
        string status,
        Dictionary<string, object> data,
        IList<AscetTestValidationIssue> warnings,
        Dictionary<string, object> diagnostics)
    {
        Dictionary<string, object> envelope = Base(action, runId, true, status);
        envelope["data"] = data;
        envelope["warnings"] = IssuesToPayload(warnings);
        envelope["diagnostics"] = diagnostics ?? new Dictionary<string, object>();
        return envelope;
    }

    public static Dictionary<string, object> Blocked(
        string action,
        string runId,
        Dictionary<string, object> data,
        string code,
        string message,
        IList<AscetTestValidationIssue> errors,
        IList<AscetTestValidationIssue> warnings)
    {
        return Blocked(action, runId, data, code, message, errors, warnings, null);
    }

    public static Dictionary<string, object> Blocked(
        string action,
        string runId,
        Dictionary<string, object> data,
        string code,
        string message,
        IList<AscetTestValidationIssue> errors,
        IList<AscetTestValidationIssue> warnings,
        Dictionary<string, object> diagnostics)
    {
        Dictionary<string, object> envelope = Base(action, runId, false, "blocked");
        envelope["data"] = data;
        envelope["error"] = new Dictionary<string, object>
        {
            { "code", code ?? "prepare_blocked" },
            { "message", message ?? String.Empty },
            { "issues", IssuesToPayload(errors) }
        };
        envelope["warnings"] = IssuesToPayload(warnings);
        Dictionary<string, object> effectiveDiagnostics = diagnostics ?? new Dictionary<string, object>();
        if (!effectiveDiagnostics.ContainsKey("dispatcher")) effectiveDiagnostics["dispatcher"] = "AscetTestActionDispatcher";
        if (!effectiveDiagnostics.ContainsKey("liveExecutionStarted")) effectiveDiagnostics["liveExecutionStarted"] = false;
        if (!effectiveDiagnostics.ContainsKey("schedulerUsed")) effectiveDiagnostics["schedulerUsed"] = false;
        envelope["diagnostics"] = effectiveDiagnostics;
        return envelope;
    }

    public static Dictionary<string, object> NotImplemented(
        string action,
        string runId,
        Dictionary<string, object> data,
        string code)
    {
        Dictionary<string, object> error = new Dictionary<string, object>();
        error["code"] = code ?? "action_not_implemented";
        error["message"] = "Action '" + (action ?? String.Empty) + "' is recognized but its service is not implemented yet.";

        Dictionary<string, object> envelope = Base(action, runId, false, "not_implemented");
        envelope["data"] = data;
        envelope["error"] = error;
        envelope["diagnostics"] = new Dictionary<string, object>
        {
            { "dispatcher", "AscetTestActionDispatcher" },
            { "liveExecutionStarted", false },
            { "schedulerRequired", IsLiveAction(action) }
        };
        return envelope;
    }

    public static int GetExitCode(Dictionary<string, object> envelope)
    {
        object ok;
        if (envelope != null && envelope.TryGetValue("ok", out ok) && ok is bool && (bool)ok)
        {
            return 0;
        }
        return 2;
    }

    private static List<Dictionary<string, object>> IssuesToPayload(IList<AscetTestValidationIssue> issues)
    {
        List<Dictionary<string, object>> payload = new List<Dictionary<string, object>>();
        if (issues == null) return payload;
        for (int index = 0; index < issues.Count; index++)
        {
            payload.Add(issues[index].ToDictionary());
        }
        return payload;
    }

    public static Dictionary<string, object> Failure(string action, string code, string message)
    {
        Dictionary<string, object> envelope = Base(action, String.Empty, false, "error");
        envelope["error"] = new Dictionary<string, object>
        {
            { "code", code ?? "ascet_test_error" },
            { "message", message ?? String.Empty }
        };
        return envelope;
    }

    private static Dictionary<string, object> Base(string action, string runId, bool ok, string status)
    {
        return new Dictionary<string, object>
        {
            { "schemaVersion", "ascet-test-envelope/v1" },
            { "ok", ok },
            { "action", action ?? String.Empty },
            { "status", status ?? String.Empty },
            { "runId", runId ?? String.Empty }
        };
    }

    private static bool IsLiveAction(string action)
    {
        return String.Equals(action, "inspect", StringComparison.OrdinalIgnoreCase) ||
               String.Equals(action, "apply", StringComparison.OrdinalIgnoreCase) ||
               String.Equals(action, "export", StringComparison.OrdinalIgnoreCase) ||
               String.Equals(action, "pipeline", StringComparison.OrdinalIgnoreCase);
    }
}
