using System;
using System.Collections.Generic;
using System.IO;

public static class AscetSetEnumeratorsFastWriteTest
{
    public static int Main()
    {
        try
        {
            TestFastWriteSourceContract();
            TestReadbackComparesEnumeratorContents();
            TestPayloadCarriesSaveAndVerification();
            TestCanonicalFieldsAreResultBacked();
            TestCanonicalPayloadChangedAndNoOp();
            Console.WriteLine("AscetSetEnumeratorsFastWriteTest passed.");
            return 0;
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine(ex.Message);
            return 1;
        }
    }

    private static void TestFastWriteSourceContract()
    {
        string source = File.ReadAllText(FindSourcePath("AscetSetEnumerators.cs"));
        AssertEqual(1, CountOccurrences(source, "ExecuteWithSession(\"set_enumerators\""), "set_enumerators must use one session entry point.");
        AssertFalse(source.IndexOf("verify_set_enumerators", StringComparison.Ordinal) >= 0, "set_enumerators must not open a separate verification session.");
        AssertFalse(source.IndexOf("SequenceEquals", StringComparison.Ordinal) >= 0, "set_enumerators must not perform full ordered-field readback.");

        int mutationIndex = source.IndexOf("enumeration.SetEnumerators", StringComparison.Ordinal);
        int saveIndex = source.IndexOf("database.Save()", mutationIndex, StringComparison.Ordinal);
        int verifyIndex = source.IndexOf("ResolveEnumeration(session, normalizedPath)", saveIndex, StringComparison.Ordinal);
        AssertTrue(mutationIndex >= 0, "set_enumerators native mutation is missing.");
        AssertTrue(saveIndex > mutationIndex, "set_enumerators must save after native mutation.");
        AssertTrue(verifyIndex > saveIndex, "set_enumerators target resolve must occur after save in the same session.");
        AssertContains(source, "SaveSucceeded = sessionResult != null && sessionResult.SaveSucceeded", "set_enumerators result must carry saveSucceeded.");
        AssertContains(source, "VerificationMode = \"same_session_target_resolve\"", "set_enumerators result must identify same-session verification.");
        AssertContains(source, "Changed = sessionResult != null && sessionResult.Changed", "set_enumerators changed must come from the C# session result.");
        AssertContains(source, "MutationStatus = sessionResult == null ? String.Empty : sessionResult.MutationStatus", "set_enumerators mutationStatus must come from the C# session result.");
        AssertContains(source, "SaveAttempted = sessionResult != null && sessionResult.SaveAttempted", "set_enumerators saveAttempted must come from the C# session result.");
        AssertContains(source, "SaveState = sessionResult == null ? String.Empty : sessionResult.SaveState", "set_enumerators saveState must come from the C# session result.");
        AssertContains(source, "Verified = sessionResult != null && sessionResult.Verified", "set_enumerators verified must come from the C# session result.");
        AssertContains(source, "VerificationStatus = sessionResult == null ? String.Empty : sessionResult.VerificationStatus", "set_enumerators verificationStatus must come from the C# session result.");
        AssertContains(source, "SessionCount = sessionResult == null ? 0 : sessionResult.SessionCount", "set_enumerators sessionCount must come from the C# session result.");
        AssertContains(source, "SaveCount = sessionResult == null ? 0 : sessionResult.SaveCount", "set_enumerators saveCount must come from the C# session result.");
        AssertContains(source, "NativeMutationAttemptCount = sessionResult == null ? 0 : sessionResult.NativeMutationAttemptCount", "set_enumerators native mutation count must come from the C# session result.");
    }

    private static void TestReadbackComparesEnumeratorContents()
    {
        string source = File.ReadAllText(FindSourcePath("AscetSetEnumerators.cs"));
        AssertFalse(source.IndexOf("bool verified = !verifyReadback || targetResolved", StringComparison.Ordinal) >= 0, "target resolution alone must not satisfy verification.");
        AssertContains(source, "List<string> actualEnumerators = ReadEnumerators(resolvedEnumeration);", "same-session readback must read resolved enumeration values.");
        AssertContains(source, "bool contentMatches = EnumeratorsMatch(actualEnumerators, normalizedEnumerators);", "same-session readback must compare enumerator names and order.");
        AssertContains(source, "bool verified = !verifyReadback || (targetResolved && contentMatches);", "verification must require target resolution and matching enumerator contents.");
        AssertContains(source, "readbackVerified = !verifyReadback || (sessionResult != null && sessionResult.Verified)", "public readbackVerified must use content verification result.");
    }
    private static void TestPayloadCarriesSaveAndVerification()
    {
        string source = File.ReadAllText(FindSourcePath("AscetSetEnumerators.cs"));
        AssertContains(source, "payload[\"saveSucceeded\"] = result != null && result.SaveSucceeded", "set_enumerators JSON payload must expose saveSucceeded.");
        AssertContains(source, "payload[\"verificationMode\"] = result == null ? String.Empty : (result.VerificationMode ?? String.Empty)", "set_enumerators JSON payload must expose verificationMode.");
        AssertContains(source, "builder.Append(\"SaveSucceeded: \")", "set_enumerators text output must expose saveSucceeded.");
        AssertContains(source, "builder.Append(\"VerificationMode: \")", "set_enumerators text output must expose verificationMode.");
    }

    private static void TestCanonicalFieldsAreResultBacked()
    {
        string source = File.ReadAllText(FindSourcePath("AscetSetEnumerators.cs"));
        AssertContains(source, "public bool Changed { get; set; }", "result must expose changed.");
        AssertContains(source, "public string MutationStatus { get; set; }", "result must expose mutationStatus.");
        AssertContains(source, "public bool SaveAttempted { get; set; }", "result must expose saveAttempted.");
        AssertContains(source, "public string SaveState { get; set; }", "result must expose saveState.");
        AssertContains(source, "public bool Verified { get; set; }", "result must expose verified.");
        AssertContains(source, "public string VerificationStatus { get; set; }", "result must expose verificationStatus.");
        AssertContains(source, "public int SessionCount { get; set; }", "result must expose sessionCount.");
        AssertContains(source, "public int SaveCount { get; set; }", "result must expose saveCount.");
        AssertContains(source, "public int EditableRetryCount { get; set; }", "result must expose editableRetryCount.");
        AssertContains(source, "public int NativeMutationAttemptCount { get; set; }", "result must expose nativeMutationAttemptCount.");
        AssertContains(source, "payload[\"changed\"] = result != null && result.Changed", "JSON changed must be read from the C# result.");
        AssertContains(source, "payload[\"saveCount\"] = result == null ? 0 : result.SaveCount", "JSON saveCount must be read from the C# result.");
        AssertContains(source, "payload[\"nativeMutationAttemptCount\"] = result == null ? 0 : result.NativeMutationAttemptCount", "JSON native mutation count must be read from the C# result.");
    }

    private static void TestCanonicalPayloadChangedAndNoOp()
    {
        AscetEnumeratorWriteResult changed = new AscetEnumeratorWriteResult
        {
            ComponentPath = "Fixture\\Enumeration",
            NewEnumerators = new List<string> { "OFF", "ON" },
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
        AssertCanonicalPayload(AscetSetEnumerators.FormatJsonOutput(changed), true);

        AscetEnumeratorWriteResult noOp = new AscetEnumeratorWriteResult
        {
            ComponentPath = "Fixture\\Enumeration",
            NewEnumerators = new List<string> { "OFF", "ON" },
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
        AssertCanonicalPayload(AscetSetEnumerators.FormatJsonOutput(noOp), false);
    }

    private static void AssertCanonicalPayload(string json, bool changed)
    {
        Dictionary<string, object> payload = AscetJsonContract.DeserializeObject(json);
        AssertTrue(payload != null, "canonical result must serialize to one JSON object.");
        AssertEqual(changed, GetBool(payload, "changed"), "changed");
        AssertEqual(changed ? "applied" : "no_op", GetString(payload, "mutationStatus"), "mutationStatus");
        AssertEqual(changed, GetBool(payload, "saveAttempted"), "saveAttempted");
        AssertEqual(changed, GetBool(payload, "saveSucceeded"), "saveSucceeded");
        AssertEqual(changed ? "saved" : "not_required", GetString(payload, "saveState"), "saveState");
        AssertEqual(true, GetBool(payload, "verified"), "verified");
        AssertEqual("passed", GetString(payload, "verificationStatus"), "verificationStatus");
        AssertEqual(1, GetInt(payload, "sessionCount"), "sessionCount");
        AssertEqual(changed ? 1 : 0, GetInt(payload, "saveCount"), "saveCount");
        AssertEqual(0, GetInt(payload, "editableRetryCount"), "editableRetryCount");
        AssertEqual(changed ? 1 : 0, GetInt(payload, "nativeMutationAttemptCount"), "nativeMutationAttemptCount");
    }

    private static string FindSourcePath(string fileName)
    {
        string configuredRoot = Environment.GetEnvironmentVariable("ASCET_REPO_ROOT");
        string[] roots = String.IsNullOrWhiteSpace(configuredRoot)
            ? new[] { AppDomain.CurrentDomain.BaseDirectory, Directory.GetCurrentDirectory() }
            : new[] { AppDomain.CurrentDomain.BaseDirectory, Directory.GetCurrentDirectory(), configuredRoot };
        for (int i = 0; i < roots.Length; i++)
        {
            DirectoryInfo directory = new DirectoryInfo(roots[i]);
            while (directory != null)
            {
                string candidate = Path.Combine(directory.FullName, "ascetcli", "src", "AscetCli", fileName);
                if (File.Exists(candidate))
                {
                    return candidate;
                }
                directory = directory.Parent;
            }
        }
        throw new Exception("Unable to locate source file '" + fileName + "'.");
    }

    private static int CountOccurrences(string text, string value)
    {
        int count = 0;
        int index = 0;
        while (!String.IsNullOrEmpty(text) && !String.IsNullOrEmpty(value))
        {
            index = text.IndexOf(value, index, StringComparison.Ordinal);
            if (index < 0)
            {
                return count;
            }
            count++;
            index += value.Length;
        }
        return count;
    }

    private static void AssertContains(string text, string expected, string message)
    {
        if ((text ?? String.Empty).IndexOf(expected, StringComparison.Ordinal) < 0)
        {
            throw new Exception(message + " Output: " + text);
        }
    }

    private static bool GetBool(Dictionary<string, object> payload, string key)
    {
        object value;
        AssertTrue(payload.TryGetValue(key, out value) && value is bool, "missing boolean '" + key + "'.");
        return (bool)value;
    }

    private static int GetInt(Dictionary<string, object> payload, string key)
    {
        object value;
        AssertTrue(payload.TryGetValue(key, out value) && value is int, "missing integer '" + key + "'.");
        return (int)value;
    }

    private static string GetString(Dictionary<string, object> payload, string key)
    {
        object value;
        AssertTrue(payload.TryGetValue(key, out value) && value is string, "missing string '" + key + "'.");
        return (string)value;
    }

    private static void AssertTrue(bool condition, string message)
    {
        if (!condition)
        {
            throw new Exception(message);
        }
    }

    private static void AssertFalse(bool condition, string message)
    {
        if (condition)
        {
            throw new Exception(message);
        }
    }

    private static void AssertEqual(int expected, int actual, string message)
    {
        if (expected != actual)
        {
            throw new Exception(message + " Expected " + expected + " but got " + actual + ".");
        }
    }

    private static void AssertEqual(bool expected, bool actual, string message)
    {
        if (expected != actual)
        {
            throw new Exception(message + " Expected " + expected + " but got " + actual + ".");
        }
    }

    private static void AssertEqual(string expected, string actual, string message)
    {
        if (!String.Equals(expected, actual, StringComparison.Ordinal))
        {
            throw new Exception(message + " Expected '" + expected + "' but got '" + actual + "'.");
        }
    }
}
