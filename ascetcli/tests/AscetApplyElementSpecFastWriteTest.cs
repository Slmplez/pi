using System;
using System.Collections.Generic;
using System.IO;

public static class AscetApplyElementSpecFastWriteTest
{
    public static int Main()
    {
        int assertions = 0;
        try
        {
            TestAppliedCanonicalPayload(ref assertions);
            TestNoOpCanonicalPayload(ref assertions);
            TestServicePublishesCanonicalPayload(ref assertions);
            TestSaveStateUsesSaveOutcome(ref assertions);
            Console.WriteLine(AscetJsonContract.Serialize(new Dictionary<string, object>
            {
                { "passed", true },
                { "runtimeProtocolAssertions", assertions },
                { "metrics", new Dictionary<string, object>
                    {
                        { "canonicalPayloads", 2 },
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
        AscetElementSyncResult result = new AscetElementSyncResult
        {
            ComponentPath = "PI_ASCET_LIVE\\Fixture\\Class_Core",
            Mode = AscetElementApplyMode.Apply,
            WriteSucceeded = true,
            VerifyReadbackRequested = true,
            ReadbackVerified = true,
            Changed = true,
            MutationStatus = "applied",
            SaveAttempted = true,
            SaveSucceeded = true,
            SaveState = "saved",
            Verified = true,
            VerificationStatus = "passed",
            VerificationMode = "same_session_target_resolve",
            SessionCount = 1,
            SaveCount = 1,
            EditableRetryCount = 0,
            NativeMutationAttemptCount = 1
        };

        AssertCanonicalPayload(AscetApplyElementSpec.FormatJsonOutput(result), true, ref assertions);
    }

    private static void TestNoOpCanonicalPayload(ref int assertions)
    {
        AscetElementSyncResult result = new AscetElementSyncResult
        {
            ComponentPath = "PI_ASCET_LIVE\\Fixture\\Class_Core",
            Mode = AscetElementApplyMode.Apply,
            WriteSucceeded = true,
            VerifyReadbackRequested = true,
            ReadbackVerified = true,
            Changed = false,
            MutationStatus = "no_op",
            SaveAttempted = false,
            SaveSucceeded = false,
            SaveState = "not_required",
            Verified = true,
            VerificationStatus = "passed",
            VerificationMode = "same_session_target_resolve",
            SessionCount = 1,
            SaveCount = 0,
            EditableRetryCount = 0,
            NativeMutationAttemptCount = 0
        };

        AssertCanonicalPayload(AscetApplyElementSpec.FormatJsonOutput(result), false, ref assertions);
    }

    private static void TestServicePublishesCanonicalPayload(ref int assertions)
    {
        AscetElementSyncResult expected = new AscetElementSyncResult
        {
            ComponentPath = "PI_ASCET_LIVE\\Fixture\\Class_Core",
            Mode = AscetElementApplyMode.Apply,
            WriteSucceeded = true,
            VerifyReadbackRequested = false,
            ReadbackVerified = false,
            Changed = true,
            MutationStatus = "applied",
            SaveAttempted = true,
            SaveSucceeded = true,
            SaveState = "saved",
            Verified = true,
            VerificationStatus = "passed",
            VerificationMode = "same_session_target_resolve",
            SessionCount = 1,
            SaveCount = 1,
            EditableRetryCount = 0,
            NativeMutationAttemptCount = 1
        };

        ElementSpecWriteService service = new ElementSpecWriteService(
            new StubElementSyncService(expected),
            new AscetWriteExecutor());
        AscetWriteExecutionResult execution = service.Execute(new ApplyElementSpecWriteRequest
        {
            ComponentPath = expected.ComponentPath,
            Spec = new AscetElementSpecDocument { Elements = new List<AscetElementSpec>() },
            Mode = AscetElementApplyMode.Apply,
            VerifyReadback = false
        });

        AssertTrue(execution != null && execution.Payload != null, "write service must return a payload.", ref assertions);
        AssertEqual(true, GetBool(execution.Payload, "changed", ref assertions), "service.changed", ref assertions);
        AssertEqual("applied", GetString(execution.Payload, "mutationStatus", ref assertions), "service.mutationStatus", ref assertions);
        AssertEqual(true, GetBool(execution.Payload, "saveSucceeded", ref assertions), "service.saveSucceeded", ref assertions);
        AssertEqual(1, GetInt(execution.Payload, "sessionCount", ref assertions), "service.sessionCount", ref assertions);
        AssertEqual(1, GetInt(execution.Payload, "nativeMutationAttemptCount", ref assertions), "service.nativeMutationAttemptCount", ref assertions);
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

    private static void TestSaveStateUsesSaveOutcome(ref int assertions)
    {
        string root = Environment.GetEnvironmentVariable("ASCET_REPO_ROOT");
        if (String.IsNullOrWhiteSpace(root)) root = Directory.GetCurrentDirectory();
        string source = File.ReadAllText(Path.Combine(root, "ascetcli", "src", "AscetCopilot", "AscetElementSync.cs"));
        AssertTrue(source.IndexOf("SaveState = saveSucceeded ? \"saved\" : (saveAttempted ? \"failed\" : \"not_required\")", StringComparison.Ordinal) >= 0, "apply_element_spec SaveState must distinguish failed Save from not-required Save.", ref assertions);
    }
    private sealed class StubElementSyncService : IComponentElementSyncService
    {
        private readonly AscetElementSyncResult result;

        public StubElementSyncService(AscetElementSyncResult result)
        {
            this.result = result;
        }

        public AscetElementCatalogReadResult ReadCatalog(AscetItemRef component)
        {
            throw new NotSupportedException();
        }

        public AscetElementCatalogReadResult ReadCatalogInSession(AscetSession session, AscetItemRef component)
        {
            throw new NotSupportedException();
        }

        public AscetElementSpecDiffResult Diff(AscetItemRef component, AscetElementSpecDocument spec)
        {
            return new AscetElementSpecDiffResult();
        }

        public AscetElementSpecDiffResult DiffInSession(AscetSession session, AscetItemRef component, AscetElementSpecDocument spec)
        {
            return new AscetElementSpecDiffResult();
        }

        public AscetElementSyncResult Apply(AscetItemRef component, AscetElementSpecDocument spec, bool verifyReadback)
        {
            return result;
        }

        public AscetElementSyncResult Apply(AscetItemRef component, AscetElementSpecDocument spec, AscetElementApplyOptions options, bool verifyReadback)
        {
            return result;
        }

        public AscetElementSyncResult ApplyInSession(AscetSession session, AscetItemRef component, AscetElementSpecDocument spec, AscetElementApplyOptions options, bool verifyReadback, bool saveDatabase)
        {
            return result;
        }

        public bool RemoveElementInSession(AscetSession session, AscetItemRef component, string elementName, bool verifyReadback, bool saveDatabase)
        {
            return true;
        }
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