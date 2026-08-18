using System;
using System.Collections.Generic;
using System.IO;
using System.Web.Script.Serialization;

public static class AscetMethodCreateFastWriteTest
{
    public static int Main()
    {
        try
        {
            TestCreateMethodUsesSameSessionFastPath();
            TestCreateMethodPayloadIncludesFastWriteFields();
            TestCreateMethodNoOpPayloadIncludesCanonicalFields();
            TestBatchExecutorCarriesSameSessionVerification();
            Console.WriteLine("AscetMethodCreateFastWriteTest passed.");
            return 0;
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine(ex.Message);
            return 1;
        }
    }

    private static void TestCreateMethodUsesSameSessionFastPath()
    {
        string source = File.ReadAllText(FindSourcePath("AscetMethodCreate.cs"));
        AssertEqual(1, CountOccurrences(source, "ExecuteWithSession(\"create_method\""), "create_method must use one unbound session execution.");
        AssertEqual(1, CountOccurrences(source, "ExecuteWithBoundSession(\"create_method\""), "create_method must use one bound session execution.");
        AssertFalse(source.IndexOf("verify_create_method", StringComparison.Ordinal) >= 0, "create_method must not use a separate verification operation.");
        AssertFalse(source.IndexOf("GetMethod(componentPath, methodName)", StringComparison.Ordinal) >= 0, "create_method must not use the external GetMethod readback path.");
        AssertFalse(source.IndexOf("WriteVerificationService", StringComparison.Ordinal) >= 0, "create_method must not construct an external verification service.");
        AssertFalse(source.IndexOf("IWriteVerificationHook", StringComparison.Ordinal) >= 0, "create_method must not use an external verification hook.");

        int outerCreateIndex = source.IndexOf("CreateMethodOnDiagram(diagram", StringComparison.Ordinal);
        int outerSaveIndex = source.IndexOf("database.Save()", outerCreateIndex, StringComparison.Ordinal);
        int outerVerifyIndex = source.IndexOf("VerifyMethodInSession(session,", outerSaveIndex, StringComparison.Ordinal);
        AssertTrue(outerCreateIndex >= 0, "unbound create_method native mutation is missing.");
        AssertTrue(outerSaveIndex > outerCreateIndex, "unbound create_method must save after native creation.");
        AssertTrue(outerVerifyIndex > outerSaveIndex, "unbound create_method must verify after save in the same session.");

        int boundCreateIndex = source.LastIndexOf("CreateMethodOnDiagram(diagram", StringComparison.Ordinal);
        int boundSaveIndex = source.IndexOf("currentSession.GetCurrentDatabaseHandle()", boundCreateIndex, StringComparison.Ordinal);
        int boundVerifyIndex = source.IndexOf("VerifyMethodInSession(currentSession,", boundSaveIndex, StringComparison.Ordinal);
        AssertTrue(boundCreateIndex >= 0, "bound create_method native mutation is missing.");
        AssertTrue(boundSaveIndex > boundCreateIndex, "bound create_method must save after native creation.");
        AssertTrue(boundVerifyIndex > boundSaveIndex, "bound create_method must verify after save in the same session.");
        AssertTrue(source.IndexOf("SaveSucceeded", StringComparison.Ordinal) >= 0, "create_method result must expose SaveSucceeded.");
        AssertTrue(source.IndexOf("VerificationMode = \"same_session_exact_path\"", StringComparison.Ordinal) >= 0, "create_method result must report same-session verification.");
    }

    private static void TestCreateMethodPayloadIncludesFastWriteFields()
    {
        AscetMethodCreateResult result = new AscetMethodCreateResult
        {
            ComponentPath = "Workspace\\Controller",
            MethodName = "Init",
            MethodKind = AscetMethodKind.Process,
            DiagramName = "Main",
            Created = true,
            VerifyReadbackRequested = true,
            ReadbackVerified = true,
            SaveSucceeded = true,
            Changed = true,
            MutationStatus = "applied",
            SaveAttempted = true,
            SaveState = "saved",
            Verified = true,
            VerificationStatus = "passed",
            SessionCount = 1,
            SaveCount = 1,
            NativeMutationAttemptCount = 1,
            VerificationMode = "same_session_exact_path",
            Summary = "Created process Init."
        };

        JavaScriptSerializer serializer = new JavaScriptSerializer();
        Dictionary<string, object> payload = serializer.DeserializeObject(AscetCreateMethod.FormatJsonOutput(result)) as Dictionary<string, object>;
        AssertTrue(payload != null, "create_method JSON payload must be an object.");
        AssertTrue(GetBool(payload, "saveSucceeded"), "create_method JSON payload must report saveSucceeded.");
        AssertEqual("same_session_exact_path", GetString(payload, "verificationMode"), "create_method JSON payload must report verificationMode.");

        AssertTrue(File.ReadAllText(FindSourcePath("Execution\\AscetBatchWriteExecutor.cs")).IndexOf("payload[\"SaveSucceeded\"]", StringComparison.Ordinal) >= 0, "batch create_method payload must preserve SaveSucceeded.");
        AssertTrue(File.ReadAllText(FindSourcePath("Host\\AscetWriteHostDispatcher.cs")).IndexOf("payload[\"saveSucceeded\"]", StringComparison.Ordinal) >= 0, "write-host create_method payload must preserve saveSucceeded.");
    }

    private static void TestCreateMethodNoOpPayloadIncludesCanonicalFields()
    {
        AscetMethodCreateResult result = new AscetMethodCreateResult
        {
            ComponentPath = "Workspace\\Controller",
            MethodName = "Init",
            MethodKind = AscetMethodKind.Process,
            DiagramName = "Main",
            AlreadyExisted = true,
            Changed = false,
            MutationStatus = "no_op",
            SaveAttempted = false,
            SaveSucceeded = false,
            SaveState = "not_required",
            VerifyReadbackRequested = true,
            ReadbackVerified = true,
            Verified = true,
            VerificationStatus = "passed",
            VerificationMode = "same_session_exact_path",
            SessionCount = 1,
            SaveCount = 0,
            EditableRetryCount = 0,
            NativeMutationAttemptCount = 0
        };

        JavaScriptSerializer serializer = new JavaScriptSerializer();
        Dictionary<string, object> payload = serializer.DeserializeObject(AscetCreateMethod.FormatJsonOutput(result)) as Dictionary<string, object>;
        AssertTrue(payload != null, "create_method no-op JSON payload must be an object.");
        AssertFalse(GetBool(payload, "changed"), "create_method no-op must report changed=false.");
        AssertEqual("no_op", GetString(payload, "mutationStatus"), "create_method no-op must report mutationStatus=no_op.");
        AssertFalse(GetBool(payload, "saveAttempted"), "create_method no-op must not report a save attempt.");
        AssertFalse(GetBool(payload, "saveSucceeded"), "create_method no-op must not report saveSucceeded=true.");
        AssertEqual("not_required", GetString(payload, "saveState"), "create_method no-op must report saveState=not_required.");
        AssertTrue(GetBool(payload, "verified"), "create_method no-op must report verified=true after readback.");
        AssertEqual("passed", GetString(payload, "verificationStatus"), "create_method no-op must report verificationStatus=passed.");
        AssertEqual(1, Convert.ToInt32(payload["sessionCount"]), "create_method no-op must report one session.");
        AssertEqual(0, Convert.ToInt32(payload["saveCount"]), "create_method no-op must report zero saves.");
        AssertEqual(0, Convert.ToInt32(payload["nativeMutationAttemptCount"]), "create_method no-op must report zero native mutation attempts.");
    }

    private static void TestBatchExecutorCarriesSameSessionVerification()
    {
        string source = File.ReadAllText(FindSourcePath("Execution\\AscetBatchWriteExecutor.cs"));
        int executeIndex = source.IndexOf("private AscetWriteExecutionResult ExecuteCreateMethod", StringComparison.Ordinal);
        int verificationIndex = source.IndexOf("Verification = BuildVerificationResult(", executeIndex, StringComparison.Ordinal);
        int readbackIndex = source.IndexOf("result != null && result.ReadbackVerified", verificationIndex, StringComparison.Ordinal);
        AssertTrue(executeIndex >= 0, "batch create_method executor path is missing.");
        AssertTrue(verificationIndex > executeIndex, "batch create_method must populate the existing Verification result.");
        AssertTrue(readbackIndex > verificationIndex, "batch create_method Verification must use same-session ReadbackVerified.");
    }

    private static string FindSourcePath(string fileName)
    {
        string configuredRoot = Environment.GetEnvironmentVariable("ASCET_REPO_ROOT");
        string[] roots = String.IsNullOrWhiteSpace(configuredRoot)
            ? new[] { AppDomain.CurrentDomain.BaseDirectory, Directory.GetCurrentDirectory() }
            : new[] { configuredRoot, AppDomain.CurrentDomain.BaseDirectory, Directory.GetCurrentDirectory() };
        for (int rootIndex = 0; rootIndex < roots.Length; rootIndex++)
        {
            DirectoryInfo directory = new DirectoryInfo(roots[rootIndex]);
            while (directory != null)
            {
                string candidate = Path.Combine(directory.FullName, "src", "AscetCopilot", fileName);
                if (File.Exists(candidate))
                {
                    return candidate;
                }

                candidate = Path.Combine(directory.FullName, "ascetcli", "src", "AscetCopilot", fileName);
                if (File.Exists(candidate))
                {
                    return candidate;
                }

                candidate = Path.Combine(directory.FullName, "src", "AscetCli", fileName);
                if (File.Exists(candidate))
                {
                    return candidate;
                }

                candidate = Path.Combine(directory.FullName, "ascetcli", "src", "AscetCli", fileName);
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

    private static bool GetBool(IDictionary<string, object> payload, string key)
    {
        object value;
        return payload != null && payload.TryGetValue(key, out value) && value is bool && (bool)value;
    }

    private static string GetString(IDictionary<string, object> payload, string key)
    {
        object value;
        if (payload == null || !payload.TryGetValue(key, out value) || value == null)
        {
            return String.Empty;
        }

        return Convert.ToString(value) ?? String.Empty;
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

    private static void AssertEqual(string expected, string actual, string message)
    {
        if (!String.Equals(expected ?? String.Empty, actual ?? String.Empty, StringComparison.Ordinal))
        {
            throw new Exception(message + " Expected '" + expected + "' but got '" + actual + "'.");
        }
    }
}
