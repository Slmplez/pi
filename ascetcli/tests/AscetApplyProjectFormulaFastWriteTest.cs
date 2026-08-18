using System;
using System.Collections.Generic;

public static class AscetApplyProjectFormulaFastWriteTest
{
    public static int Main()
    {
        int assertions = 0;
        try
        {
            TestAppliedCanonicalPayload(ref assertions);
            TestNoOpCanonicalPayload(ref assertions);
            TestFormulaChangeDetection(ref assertions);
            Console.WriteLine(AscetJsonContract.Serialize(new Dictionary<string, object>
            {
                { "passed", true },
                { "runtimeProtocolAssertions", assertions },
                { "metrics", new Dictionary<string, object>
                    {
                        { "canonicalPayloads", 2 },
                        { "changeDetectionCases", 4 },
                        { "liveWrite", false }
                    }
                }
            }));
            return 0;
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine(ex.Message);
            return 1;
        }
    }

    private static void TestAppliedCanonicalPayload(ref int assertions)
    {
        AscetProjectFormulaApplyResult result = new AscetProjectFormulaApplyResult
        {
            ProjectPath = "F\\Disposable",
            Mode = "apply",
            WriteSucceeded = true,
            VerifyReadbackRequested = true,
            ReadbackVerified = true,
            SaveSucceeded = true,
            VerificationMode = "same_session_target_resolve",
            Changed = true,
            MutationStatus = "applied",
            SaveAttempted = true,
            SaveState = "saved",
            Verified = true,
            VerificationStatus = "passed",
            SessionCount = 1,
            SaveCount = 1,
            EditableRetryCount = 0,
            NativeMutationAttemptCount = 1
        };

        AssertCanonicalPayload(AscetApplyProjectFormula.FormatJsonOutput(result), true, ref assertions);
    }

    private static void TestNoOpCanonicalPayload(ref int assertions)
    {
        AscetProjectFormulaApplyResult result = new AscetProjectFormulaApplyResult
        {
            ProjectPath = "F\\Disposable",
            Mode = "apply",
            WriteSucceeded = true,
            VerifyReadbackRequested = true,
            ReadbackVerified = true,
            SaveSucceeded = false,
            VerificationMode = "same_session_target_resolve",
            Changed = false,
            MutationStatus = "no_op",
            SaveAttempted = false,
            SaveState = "not_required",
            Verified = true,
            VerificationStatus = "passed",
            SessionCount = 1,
            SaveCount = 0,
            EditableRetryCount = 0,
            NativeMutationAttemptCount = 0
        };

        AssertCanonicalPayload(AscetApplyProjectFormula.FormatJsonOutput(result), false, ref assertions);
    }

    private static void TestFormulaChangeDetection(ref int assertions)
    {
        AscetProjectFormulaRef current = new AscetProjectFormulaRef
        {
            Name = "Gain",
            Type = "linear",
            Unit = "V",
            Comment = "gain",
            Parameters = new List<double> { 2.0d, 3.0d }
        };

        AscetProjectFormulaSpec same = new AscetProjectFormulaSpec
        {
            Name = "Gain",
            Type = "linear",
            HasUnit = true,
            Unit = "V",
            HasComment = true,
            Comment = "gain",
            HasParameters = true,
            Parameters = new List<double> { 2.0000005d, 3.0d }
        };
        AssertTrue(ProjectFormulaApplyService.FormulaSpecMatchesReference(current, same), "identical formula spec must be detected as a no-op.", ref assertions);

        AscetProjectFormulaSpec omittedOptionalFields = new AscetProjectFormulaSpec
        {
            Name = "Gain",
            Type = "linear",
            Parameters = new List<double>()
        };
        AssertTrue(ProjectFormulaApplyService.FormulaSpecMatchesReference(current, omittedOptionalFields), "omitted optional fields must preserve the current formula.", ref assertions);

        AscetProjectFormulaSpec changedUnit = new AscetProjectFormulaSpec
        {
            Name = "Gain",
            Type = "linear",
            HasUnit = true,
            Unit = "A"
        };
        AssertFalse(ProjectFormulaApplyService.FormulaSpecMatchesReference(current, changedUnit), "changed unit must require a mutation.", ref assertions);

        AscetProjectFormulaSpec changedParameters = new AscetProjectFormulaSpec
        {
            Name = "Gain",
            Type = "linear",
            HasParameters = true,
            Parameters = new List<double> { 2.0d, 4.0d }
        };
        AssertFalse(ProjectFormulaApplyService.FormulaSpecMatchesReference(current, changedParameters), "changed parameters must require a mutation.", ref assertions);
    }

    private static void AssertCanonicalPayload(string json, bool changed, ref int assertions)
    {
        Dictionary<string, object> payload = AscetJsonContract.DeserializeObject(json);
        AssertTrue(payload != null, "canonical result must serialize to one JSON object.", ref assertions);
        AssertEqual(changed, GetBool(payload, "changed", ref assertions), "changed", ref assertions);
        AssertEqual(changed ? "applied" : "no_op", GetString(payload, "mutationStatus", ref assertions), "mutationStatus", ref assertions);
        AssertEqual(changed, GetBool(payload, "saveAttempted", ref assertions), "saveAttempted", ref assertions);
        AssertEqual(changed, GetBool(payload, "saveSucceeded", ref assertions), "saveSucceeded", ref assertions);
        AssertEqual(changed ? "saved" : "not_required", GetString(payload, "saveState", ref assertions), "saveState", ref assertions);
        AssertTrue(GetBool(payload, "verified", ref assertions), "verified", ref assertions);
        AssertEqual("passed", GetString(payload, "verificationStatus", ref assertions), "verificationStatus", ref assertions);
        AssertTrue(GetString(payload, "verificationMode", ref assertions).Length > 0, "verificationMode", ref assertions);
        AssertEqual(1, GetInt(payload, "sessionCount", ref assertions), "sessionCount", ref assertions);
        AssertEqual(changed ? 1 : 0, GetInt(payload, "saveCount", ref assertions), "saveCount", ref assertions);
        AssertEqual(0, GetInt(payload, "editableRetryCount", ref assertions), "editableRetryCount", ref assertions);
        AssertEqual(changed ? 1 : 0, GetInt(payload, "nativeMutationAttemptCount", ref assertions), "nativeMutationAttemptCount", ref assertions);
    }

    private static bool GetBool(Dictionary<string, object> payload, string key, ref int assertions)
    {
        object value;
        AssertTrue(payload.TryGetValue(key, out value) && value is bool, "missing boolean '" + key + "'.", ref assertions);
        return (bool)value;
    }

    private static int GetInt(Dictionary<string, object> payload, string key, ref int assertions)
    {
        object value;
        AssertTrue(payload.TryGetValue(key, out value) && value is int, "missing integer '" + key + "'.", ref assertions);
        return (int)value;
    }

    private static string GetString(Dictionary<string, object> payload, string key, ref int assertions)
    {
        object value;
        AssertTrue(payload.TryGetValue(key, out value) && value is string, "missing string '" + key + "'.", ref assertions);
        return (string)value;
    }

    private static void AssertTrue(bool condition, string message, ref int assertions)
    {
        if (!condition)
        {
            throw new Exception(message);
        }
        assertions++;
    }

    private static void AssertFalse(bool condition, string message, ref int assertions)
    {
        AssertTrue(!condition, message, ref assertions);
    }

    private static void AssertEqual(bool expected, bool actual, string key, ref int assertions)
    {
        AssertTrue(expected == actual, "canonical field '" + key + "' mismatch.", ref assertions);
    }

    private static void AssertEqual(int expected, int actual, string key, ref int assertions)
    {
        AssertTrue(expected == actual, "canonical field '" + key + "' mismatch.", ref assertions);
    }

    private static void AssertEqual(string expected, string actual, string key, ref int assertions)
    {
        AssertTrue(String.Equals(expected, actual, StringComparison.Ordinal), "canonical field '" + key + "' mismatch.", ref assertions);
    }
}
