using System;
using System.Collections.Generic;
using System.Globalization;

internal static class AscetCanonicalWriteResult
{
    public static Dictionary<string, object> NormalizeSuccess(
        Dictionary<string, object> source,
        bool writeSucceeded,
        bool verificationRequested,
        bool verificationSucceeded)
    {
        Dictionary<string, object> payload = Clone(source);
        bool changed = ReadBoolean(payload, "changed") ?? InferChanged(payload, writeSucceeded);
        string mutationStatus = ReadString(payload, "mutationStatus");
        if (String.IsNullOrWhiteSpace(mutationStatus)) mutationStatus = changed ? "applied" : "no_op";
        bool saveAttempted = ReadBoolean(payload, "saveAttempted") ?? changed;
        bool saveSucceeded = ReadBoolean(payload, "saveSucceeded") ?? (saveAttempted && writeSucceeded);
        string saveState = ReadString(payload, "saveState");
        if (String.IsNullOrWhiteSpace(saveState))
        {
            saveState = !saveAttempted ? "not_required" : saveSucceeded ? "saved" : "failed";
        }
        bool verified = ReadBoolean(payload, "verified") ?? verificationSucceeded;
        string verificationStatus = ReadString(payload, "verificationStatus");
        if (String.IsNullOrWhiteSpace(verificationStatus))
        {
            verificationStatus = verified ? "passed" : verificationRequested ? "failed" : "missing";
        }
        string verificationMode = ReadString(payload, "verificationMode");
        if (String.IsNullOrWhiteSpace(verificationMode)) verificationMode = "same_session_target_resolvable";

        payload["outcome"] = "succeeded";
        payload["changed"] = changed;
        payload["mutationStatus"] = mutationStatus;
        payload["saveAttempted"] = saveAttempted;
        payload["saveSucceeded"] = saveSucceeded;
        payload["saveState"] = saveState;
        payload["verified"] = verified;
        payload["verificationStatus"] = verificationStatus;
        payload["verificationMode"] = verificationMode;
        payload["sessionCount"] = ReadInteger(payload, "sessionCount") ?? 1;
        payload["saveCount"] = ReadInteger(payload, "saveCount") ?? (saveAttempted && saveSucceeded ? 1 : 0);
        payload["editableRetryCount"] = ReadInteger(payload, "editableRetryCount") ?? 0;
        payload["nativeMutationAttemptCount"] = ReadInteger(payload, "nativeMutationAttemptCount") ?? (changed ? 1 : 0);
        return payload;
    }

    public static Dictionary<string, object> NormalizeFailure(
        Dictionary<string, object> source,
        bool? mutationStarted,
        string errorCode,
        string errorMessage)
    {
        Dictionary<string, object> payload = Clone(source);
        bool started = mutationStarted != false;
        string mutationStatus = ReadString(payload, "mutationStatus");
        if (String.IsNullOrWhiteSpace(mutationStatus)) mutationStatus = started ? "unknown" : "not_started";
        bool changed = ReadBoolean(payload, "changed") ?? false;
        bool saveAttempted = ReadBoolean(payload, "saveAttempted") ?? false;
        bool saveSucceeded = ReadBoolean(payload, "saveSucceeded") ?? false;
        string saveState = ReadString(payload, "saveState");
        if (String.IsNullOrWhiteSpace(saveState)) saveState = started ? "unknown" : "not_required";
        bool verified = ReadBoolean(payload, "verified") ?? false;
        string verificationStatus = ReadString(payload, "verificationStatus");
        if (String.IsNullOrWhiteSpace(verificationStatus)) verificationStatus = started ? "unknown" : "not_applicable";
        string verificationMode = ReadString(payload, "verificationMode");
        if (String.IsNullOrWhiteSpace(verificationMode)) verificationMode = started ? "same_session_target_resolvable" : "not_applicable";

        payload["outcome"] = "failed";
        payload["changed"] = changed;
        payload["mutationStatus"] = mutationStatus;
        payload["saveAttempted"] = saveAttempted;
        payload["saveSucceeded"] = saveSucceeded;
        payload["saveState"] = saveState;
        payload["verified"] = verified;
        payload["verificationStatus"] = verificationStatus;
        payload["verificationMode"] = verificationMode;
        payload["sessionCount"] = ReadInteger(payload, "sessionCount") ?? (started ? 1 : 0);
        payload["saveCount"] = ReadInteger(payload, "saveCount") ?? 0;
        payload["editableRetryCount"] = ReadInteger(payload, "editableRetryCount") ?? 0;
        payload["nativeMutationAttemptCount"] = ReadInteger(payload, "nativeMutationAttemptCount") ?? (started ? 1 : 0);
        Dictionary<string, object> error = new Dictionary<string, object>(StringComparer.Ordinal);
        error["code"] = String.IsNullOrWhiteSpace(errorCode) ? "write_failed" : errorCode;
        error["message"] = errorMessage ?? String.Empty;
        payload["error"] = error;
        if (!payload.ContainsKey("recovery"))
        {
            Dictionary<string, object> recovery = new Dictionary<string, object>(StringComparer.Ordinal);
            recovery["required"] = started;
            recovery["actions"] = started
                ? new string[] { "Re-read the exact target and reconcile the mutation outcome before retrying." }
                : new string[0];
            payload["recovery"] = recovery;
        }
        return payload;
    }

    private static bool InferChanged(IDictionary<string, object> payload, bool writeSucceeded)
    {
        bool? noOp = ReadBoolean(payload, "noOp");
        if (noOp == true) return false;
        bool? alreadyExisted = ReadBoolean(payload, "alreadyExisted");
        if (alreadyExisted == true) return false;
        bool? alreadyMissing = ReadBoolean(payload, "alreadyMissing");
        if (alreadyMissing == true) return false;
        bool? created = ReadBoolean(payload, "created");
        if (created.HasValue) return created.Value;
        bool? deleted = ReadBoolean(payload, "deleted");
        if (deleted.HasValue) return deleted.Value;
        return writeSucceeded;
    }

    private static Dictionary<string, object> Clone(Dictionary<string, object> source)
    {
        Dictionary<string, object> clone = new Dictionary<string, object>(StringComparer.Ordinal);
        if (source == null) return clone;
        foreach (KeyValuePair<string, object> entry in source) clone[entry.Key] = entry.Value;
        return clone;
    }

    private static bool? ReadBoolean(IDictionary<string, object> payload, string key)
    {
        object value;
        return TryGetValue(payload, key, out value) && value is bool ? (bool?)value : null;
    }

    private static int? ReadInteger(IDictionary<string, object> payload, string key)
    {
        object value;
        int parsed;
        if (!TryGetValue(payload, key, out value) || value == null) return null;
        return Int32.TryParse(Convert.ToString(value, CultureInfo.InvariantCulture), out parsed) ? (int?)parsed : null;
    }

    private static string ReadString(IDictionary<string, object> payload, string key)
    {
        object value;
        if (!TryGetValue(payload, key, out value) || value == null) return String.Empty;
        return Convert.ToString(value, CultureInfo.InvariantCulture) ?? String.Empty;
    }

    private static bool TryGetValue(IDictionary<string, object> payload, string key, out object value)
    {
        value = null;
        if (payload == null || String.IsNullOrWhiteSpace(key)) return false;
        if (payload.TryGetValue(key, out value)) return true;
        foreach (KeyValuePair<string, object> entry in payload)
        {
            if (String.Equals(entry.Key, key, StringComparison.OrdinalIgnoreCase))
            {
                value = entry.Value;
                return true;
            }
        }
        return false;
    }
}
