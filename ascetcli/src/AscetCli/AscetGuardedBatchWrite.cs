using System;
using System.Collections;
using System.Collections.Generic;
using System.Globalization;
using System.IO;

public sealed class AscetGuardedBatchWriteResult
{
    public bool Success { get; set; }
    public bool EditabilityMutationStarted { get; set; }
    public bool EditabilityAcquired { get; set; }
    public bool? PrimaryMutationStarted { get; set; }
    public string MutationStatus { get; set; }
    public string VerificationStatus { get; set; }
    public IList<AscetGuardedMutationTargetResult> Targets { get; set; }
    public IList<AscetBatchResultItemDto> Results { get; set; }
    public Dictionary<string, object> Error { get; set; }
}

public sealed class AscetGuardedBatchWriteService : AscetReadDomainServiceBase
{
    public AscetGuardedBatchWriteResult Execute(
        IList<AscetBatchRequestItemDto> requests,
        IList<string> editableTargets,
        bool acquireEditability)
    {
        if (requests == null || requests.Count == 0)
        {
            throw new AscetReadException("invalid_argument", "guarded_batch_write", "requests must contain at least one batch item.");
        }
        if (editableTargets == null || editableTargets.Count == 0)
        {
            throw new AscetReadException("invalid_argument", "guarded_batch_write", "editableTargets must contain at least one component path.");
        }
        for (int i = 0; i < requests.Count; i++)
        {
            AscetBatchRequestItemDto request = requests[i];
            object verify;
            if (request == null || request.args == null || !request.args.TryGetValue("verifyReadback", out verify) || !(verify is bool) || !(bool)verify)
            {
                throw new AscetReadException(
                    "mandatory_readback_missing",
                    "guarded_batch_write",
                    "Every guarded batch request must set verifyReadback=true.");
            }
        }

        AscetGuardedBatchWriteResult result = new AscetGuardedBatchWriteResult
        {
            Success = false,
            PrimaryMutationStarted = false,
            MutationStatus = "not_started",
            VerificationStatus = "not_applicable",
            Targets = new List<AscetGuardedMutationTargetResult>(),
            Results = new List<AscetBatchResultItemDto>(),
            Error = null
        };

        return ExecuteWithSession("guarded_batch_write", delegate(AscetSession session)
        {
            AscetEditableService editableService = new AscetEditableService();
            HashSet<string> seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            for (int i = 0; i < editableTargets.Count; i++)
            {
                string targetPath = AscetDatabaseExplorerCommon.NormalizePath(editableTargets[i], "editable_target");
                if (!seen.Add(targetPath))
                {
                    continue;
                }
                AscetComponentEditableResult initial = editableService.CheckEditableInSession(session, targetPath);
                result.Targets.Add(new AscetGuardedMutationTargetResult
                {
                    Path = targetPath,
                    InitiallyEditable = initial != null && initial.Editable,
                    FinalEditable = initial != null && initial.Editable
                });
            }

            for (int i = 0; i < result.Targets.Count; i++)
            {
                AscetGuardedMutationTargetResult target = result.Targets[i];
                if (target.InitiallyEditable)
                {
                    continue;
                }
                if (!acquireEditability)
                {
                    result.Error = Error(
                        "editable_write_gate_blocked",
                        "Component '" + target.Path + "' is read-only and editability acquisition was not authorized.");
                    return result;
                }
                result.EditabilityMutationStarted = true;
                target.EditabilityMutationStarted = true;
                AscetComponentEditableResult acquired = editableService.SetEditableInSession(session, target.Path);
                target.EditabilityAcquired = acquired != null && acquired.Editable;
                target.FinalEditable = target.EditabilityAcquired;
                result.EditabilityAcquired = result.EditabilityAcquired || target.EditabilityAcquired;
                if (!target.EditabilityAcquired)
                {
                    result.Error = Error(
                        "component_not_editable",
                        "Component '" + target.Path + "' remained read-only after the authorized SCM operation.");
                    return result;
                }
            }

            try
            {
                using (AscetBoundSessionContext.Bind(session))
                {
                    result.PrimaryMutationStarted = null;
                    result.Results = new AscetBatchWriteExecutor().Execute(requests);
                }
                result.PrimaryMutationStarted = true;
                int successes = 0;
                for (int i = 0; i < result.Results.Count; i++)
                {
                    if (result.Results[i] != null && result.Results[i].ok)
                    {
                        successes++;
                    }
                }
                result.Success = successes == result.Results.Count;
                result.MutationStatus = result.Success ? "applied" : successes > 0 ? "partially_applied" : "not_started";
                result.VerificationStatus = result.Success ? "passed" : successes > 0 ? "failed" : "not_applicable";
                if (!result.Success)
                {
                    result.Error = Error(
                        "guarded_batch_partial",
                        successes.ToString(CultureInfo.InvariantCulture) + " of " + result.Results.Count.ToString(CultureInfo.InvariantCulture) + " guarded batch items succeeded.");
                }
            }
            catch (Exception ex)
            {
                result.PrimaryMutationStarted = null;
                result.Success = false;
                result.MutationStatus = result.EditabilityAcquired ? "partially_applied" : "unknown";
                result.VerificationStatus = "unknown";
                AscetReadException ascet = ex as AscetReadException;
                result.Error = Error(
                    ascet == null || String.IsNullOrWhiteSpace(ascet.Code) ? "guarded_batch_write_failed" : ascet.Code,
                    ex.Message);
            }
            finally
            {
                for (int i = 0; i < result.Targets.Count; i++)
                {
                    AscetGuardedMutationTargetResult target = result.Targets[i];
                    try
                    {
                        AscetComponentEditableResult finalState = editableService.CheckEditableInSession(session, target.Path);
                        target.FinalEditable = finalState != null && finalState.Editable;
                    }
                    catch
                    {
                    }
                }
            }
            return result;
        });
    }

    private static Dictionary<string, object> Error(string code, string message)
    {
        Dictionary<string, object> error = new Dictionary<string, object>();
        error["code"] = code ?? String.Empty;
        error["message"] = message ?? String.Empty;
        return error;
    }
}

public static class AscetGuardedBatchWrite
{
    public static int Main(string[] args)
    {
        TextWriter originalOut = Console.Out;
        StringWriter suppressedOut = null;
        try
        {
            string requestFile = ParseRequestFile(args);
            Dictionary<string, object> request = AscetJsonContract.DeserializeObject(File.ReadAllText(requestFile));
            IList<AscetBatchRequestItemDto> requests = ParseRequests(request);
            IList<string> editableTargets = GetStringList(request, "editableTargets");
            bool acquireEditability = GetBoolean(request, "acquireEditability");

            suppressedOut = new StringWriter();
            Console.SetOut(suppressedOut);
            AscetToolApiBootstrap.ConfigureAssemblyResolution();
            AscetGuardedBatchWriteResult result = new AscetGuardedBatchWriteService().Execute(
                requests,
                editableTargets,
                acquireEditability);
            Console.SetOut(originalOut);
            Console.Write(AscetJsonContract.Serialize(BuildPayload(result)));
            return 0;
        }
        catch (Exception ex)
        {
            Console.SetOut(originalOut);
            AscetReadException ascet = ex as AscetReadException;
            Console.Error.WriteLine(ascet == null ? ex.GetType().FullName + ":" + ex.Message : ascet.Code + ":" + ascet.Operation + ":" + ascet.Message);
            return 1;
        }
        finally
        {
            Console.SetOut(originalOut);
            if (suppressedOut != null)
            {
                suppressedOut.Dispose();
            }
        }
    }

    private static string ParseRequestFile(string[] args)
    {
        if (args == null)
        {
            throw new AscetReadException("invalid_argument", "guarded_batch_write", "--request-file is required.");
        }
        for (int i = 0; i < args.Length; i++)
        {
            if (String.Equals(args[i], "--json", StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }
            if (String.Equals(args[i], "--request-file", StringComparison.OrdinalIgnoreCase) && i + 1 < args.Length)
            {
                string path = Path.GetFullPath(args[++i]);
                if (!File.Exists(path))
                {
                    throw new AscetReadException("request_file_not_found", "guarded_batch_write", "Request file was not found: " + path);
                }
                return path;
            }
            throw new AscetReadException("invalid_argument", "guarded_batch_write", "Unknown argument '" + args[i] + "'.");
        }
        throw new AscetReadException("invalid_argument", "guarded_batch_write", "--request-file is required.");
    }

    private static IList<AscetBatchRequestItemDto> ParseRequests(IDictionary<string, object> request)
    {
        List<AscetBatchRequestItemDto> requests = new List<AscetBatchRequestItemDto>();
        IEnumerable sequence = request != null && request.ContainsKey("requests") ? request["requests"] as IEnumerable : null;
        if (sequence == null || request["requests"] is string)
        {
            throw new AscetReadException("invalid_argument", "guarded_batch_write", "requests must be an array.");
        }
        foreach (object value in sequence)
        {
            Dictionary<string, object> item = value as Dictionary<string, object>;
            if (item == null)
            {
                throw new AscetReadException("invalid_argument", "guarded_batch_write", "Each request must be an object.");
            }
            Dictionary<string, object> itemArgs = item.ContainsKey("args") ? item["args"] as Dictionary<string, object> : null;
            if (itemArgs == null)
            {
                throw new AscetReadException("invalid_argument", "guarded_batch_write", "Each request must contain an args object.");
            }
            requests.Add(new AscetBatchRequestItemDto
            {
                id = GetString(item, "id"),
                operation = GetString(item, "operation"),
                args = new Dictionary<string, object>(itemArgs, StringComparer.Ordinal)
            });
        }
        return requests;
    }

    private static Dictionary<string, object> BuildPayload(AscetGuardedBatchWriteResult result)
    {
        Dictionary<string, object> payload = new Dictionary<string, object>();
        payload["success"] = result != null && result.Success;
        payload["editabilityMutationStarted"] = result != null && result.EditabilityMutationStarted;
        payload["editabilityAcquired"] = result != null && result.EditabilityAcquired;
        payload["primaryMutationStarted"] = result == null ? null : (object)result.PrimaryMutationStarted;
        payload["mutationStatus"] = result == null ? "unknown" : (result.MutationStatus ?? "unknown");
        payload["verificationStatus"] = result == null ? "unknown" : (result.VerificationStatus ?? "unknown");
        payload["targets"] = BuildTargets(result == null ? null : result.Targets);
        payload["results"] = result == null ? null : result.Results;
        payload["error"] = result == null ? null : result.Error;
        return payload;
    }

    private static IList<object> BuildTargets(IList<AscetGuardedMutationTargetResult> targets)
    {
        List<object> values = new List<object>();
        if (targets == null)
        {
            return values;
        }
        for (int i = 0; i < targets.Count; i++)
        {
            AscetGuardedMutationTargetResult target = targets[i];
            Dictionary<string, object> value = new Dictionary<string, object>();
            value["path"] = target == null ? String.Empty : (target.Path ?? String.Empty);
            value["initiallyEditable"] = target != null && target.InitiallyEditable;
            value["editabilityMutationStarted"] = target != null && target.EditabilityMutationStarted;
            value["editabilityAcquired"] = target != null && target.EditabilityAcquired;
            value["finalEditable"] = target != null && target.FinalEditable;
            values.Add(value);
        }
        return values;
    }

    private static string GetString(IDictionary<string, object> payload, string key)
    {
        if (payload == null || !payload.ContainsKey(key) || payload[key] == null)
        {
            return String.Empty;
        }
        return Convert.ToString(payload[key], CultureInfo.InvariantCulture) ?? String.Empty;
    }

    private static bool GetBoolean(IDictionary<string, object> payload, string key)
    {
        return payload != null && payload.ContainsKey(key) && payload[key] is bool && (bool)payload[key];
    }

    private static IList<string> GetStringList(IDictionary<string, object> payload, string key)
    {
        List<string> values = new List<string>();
        IEnumerable sequence = payload != null && payload.ContainsKey(key) ? payload[key] as IEnumerable : null;
        if (sequence == null || payload[key] is string)
        {
            throw new AscetReadException("invalid_argument", "guarded_batch_write", key + " must be an array.");
        }
        foreach (object value in sequence)
        {
            values.Add(Convert.ToString(value, CultureInfo.InvariantCulture) ?? String.Empty);
        }
        return values;
    }
}
