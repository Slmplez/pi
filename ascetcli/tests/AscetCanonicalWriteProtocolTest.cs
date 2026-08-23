using System;
using System.Collections.Generic;
using System.Reflection;

public static class AscetCanonicalWriteProtocolTest
{
    public static int Main()
    {
        try
        {
            AscetWriteExecutionResult execution = CreateSuccessfulExecution();
            Dictionary<string, object> direct = InvokeStaticResultBuilder(typeof(ExecCommand), "BuildWriteResultPayload", execution);
            Dictionary<string, object> batch = InvokeStaticResultBuilder(typeof(AscetBatchWriteExecutor), "BuildWriteResultPayload", execution);
            Dictionary<string, object> host = InvokeHostResultBuilder(CreateActionPayload());

            AssertCanonicalSuccess(direct, "direct CLI");
            AssertCanonicalSuccess(batch, "batch item");
            AssertCanonicalSuccess(host, "write Host");
            AssertSameCanonicalValues(direct, batch, "direct CLI", "batch item");
            AssertSameCanonicalValues(direct, host, "direct CLI", "write Host");

            Dictionary<string, object> failureEvidence = CreateActionPayload();
            failureEvidence["mutationStatus"] = "partial_failure";
            failureEvidence["nativeScmOperationCount"] = 2;
            failureEvidence["recovery"] = new Dictionary<string, object>(StringComparer.Ordinal)
            {
                { "required", true },
                { "actions", new string[] { "Inspect the retained SCM reservation before retrying." } }
            };
            AscetWriteExecutionResult failedExecution = new AscetWriteExecutionResult
            {
                OperationName = "component_editable_set",
                Succeeded = false,
                WriteSucceeded = true,
                Payload = failureEvidence,
                Error = new AscetWriteError
                {
                    Code = "partial_failure",
                    Message = "CreateEdition failed after ReserveItem returned.",
                    Operation = "component_editable_set",
                    Stage = "mutation"
                }
            };
            Dictionary<string, object> directFailureEnvelope = InvokeStaticResultBuilder(
                typeof(ExecCommand),
                "BuildWriteErrorEnvelope",
                "component_editable_set",
                failedExecution);
            Dictionary<string, object> directFailure = GetDictionary(directFailureEnvelope, "result");
            AssertCanonicalFailure(directFailure, "direct CLI failure");

            Console.WriteLine("AscetCanonicalWriteProtocolTest passed.");
            return 0;
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine(ex.Message);
            return 1;
        }
    }

    private static AscetWriteExecutionResult CreateSuccessfulExecution()
    {
        return new AscetWriteExecutionResult
        {
            OperationName = "set_method_code",
            SequenceNumber = 7,
            Succeeded = true,
            WriteSucceeded = true,
            Summary = "updated",
            Payload = CreateActionPayload(),
            Verification = new WriteVerificationResult
            {
                Requested = true,
                Attempted = true,
                Succeeded = true,
                Summary = "verified"
            }
        };
    }

    private static Dictionary<string, object> CreateActionPayload()
    {
        return new Dictionary<string, object>(StringComparer.Ordinal)
        {
            { "changed", true },
            { "mutationStatus", "applied" },
            { "saveAttempted", true },
            { "saveSucceeded", true },
            { "saveState", "saved" },
            { "verified", true },
            { "verificationStatus", "passed" },
            { "verificationMode", "same_session_target_resolvable" },
            { "sessionCount", 1 },
            { "saveCount", 1 },
            { "editableRetryCount", 0 },
            { "nativeMutationAttemptCount", 1 },
            { "writeSucceeded", true },
            { "verifyReadbackRequested", true },
            { "readbackVerified", true }
        };
    }

    private static Dictionary<string, object> InvokeStaticResultBuilder(Type owner, string methodName, params object[] arguments)
    {
        MethodInfo method = owner.GetMethod(methodName, BindingFlags.NonPublic | BindingFlags.Static);
        if (method == null)
        {
            throw new Exception(owner.Name + "." + methodName + " was not found.");
        }
        return method.Invoke(null, arguments) as Dictionary<string, object>;
    }

    private static Dictionary<string, object> InvokeHostResultBuilder(Dictionary<string, object> actionPayload)
    {
        AscetWriteHostDispatcher dispatcher = new AscetWriteHostDispatcher();
        MethodInfo method = typeof(AscetWriteHostDispatcher).GetMethod(
            "BuildWriteResultPayload",
            BindingFlags.NonPublic | BindingFlags.Instance);
        if (method == null)
        {
            throw new Exception("AscetWriteHostDispatcher.BuildWriteResultPayload was not found.");
        }
        AscetWriteHostDispatchContext context = new AscetWriteHostDispatchContext
        {
            DatabaseRef = new AscetDatabaseRef
            {
                Name = "DB",
                Path = "C:\\DB",
                CanonicalPath = "C:\\DB",
                IdentityStatus = "consistent",
                IdentityIssues = new List<string>()
            },
            RequestCount = 1,
            SessionGeneration = 1,
            DatabaseBindingGeneration = 1
        };
        return method.Invoke(dispatcher, new object[] { "set_method_code", actionPayload, context }) as Dictionary<string, object>;
    }

    private static void AssertCanonicalSuccess(Dictionary<string, object> result, string path)
    {
        AssertTrue(result != null, path + " must return a result object.");
        AssertEqual("succeeded", GetString(result, "outcome"), path + " outcome");
        AssertEqual("applied", GetString(result, "mutationStatus"), path + " mutationStatus");
        AssertEqual("saved", GetString(result, "saveState"), path + " saveState");
        AssertEqual("passed", GetString(result, "verificationStatus"), path + " verificationStatus");
        AssertTrue(GetBool(result, "changed"), path + " changed");
        AssertTrue(GetBool(result, "saveAttempted"), path + " saveAttempted");
        AssertTrue(GetBool(result, "saveSucceeded"), path + " saveSucceeded");
        AssertTrue(GetBool(result, "verified"), path + " verified");
        AssertTrue(!result.ContainsKey("payload"), path + " must not expose result.payload.");
    }

    private static void AssertCanonicalFailure(Dictionary<string, object> result, string path)
    {
        AssertTrue(result != null, path + " must retain a result object.");
        AssertEqual("failed", GetString(result, "outcome"), path + " outcome");
        AssertEqual("partial_failure", GetString(result, "mutationStatus"), path + " mutationStatus");
        Dictionary<string, object> recovery = GetDictionary(result, "recovery");
        AssertTrue(recovery != null && GetBool(recovery, "required"), path + " recovery.required");
        AssertTrue(!result.ContainsKey("payload"), path + " must not expose result.payload.");
    }

    private static void AssertSameCanonicalValues(
        Dictionary<string, object> left,
        Dictionary<string, object> right,
        string leftName,
        string rightName)
    {
        string[] keys = new string[]
        {
            "outcome",
            "changed",
            "mutationStatus",
            "saveAttempted",
            "saveSucceeded",
            "saveState",
            "verified",
            "verificationStatus",
            "verificationMode",
            "sessionCount",
            "saveCount",
            "editableRetryCount",
            "nativeMutationAttemptCount"
        };
        for (int i = 0; i < keys.Length; i++)
        {
            string key = keys[i];
            AssertEqual(Convert.ToString(left[key]), Convert.ToString(right[key]), leftName + "/" + rightName + " " + key);
        }
    }

    private static Dictionary<string, object> GetDictionary(IDictionary<string, object> value, string key)
    {
        object nested;
        return value != null && value.TryGetValue(key, out nested) ? nested as Dictionary<string, object> : null;
    }

    private static string GetString(IDictionary<string, object> value, string key)
    {
        object item;
        return value != null && value.TryGetValue(key, out item) && item != null ? Convert.ToString(item) : String.Empty;
    }

    private static bool GetBool(IDictionary<string, object> value, string key)
    {
        object item;
        return value != null && value.TryGetValue(key, out item) && item is bool && (bool)item;
    }

    private static void AssertTrue(bool condition, string message)
    {
        if (!condition)
        {
            throw new Exception(message);
        }
    }

    private static void AssertEqual(string expected, string actual, string message)
    {
        if (!String.Equals(expected ?? String.Empty, actual ?? String.Empty, StringComparison.Ordinal))
        {
            throw new Exception(message + " expected '" + expected + "' but got '" + actual + "'.");
        }
    }
}
