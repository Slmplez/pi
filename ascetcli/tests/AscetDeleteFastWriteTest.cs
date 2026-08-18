using System;
using System.Collections.Generic;
using System.IO;

public static class AscetDeleteFastWriteTest
{
    private static int runtimeProtocolAssertions;

    public static int Main()
    {
        try
        {
            TestDeleteComponentFastPath();
            TestDeleteMethodFastPath();
            TestDeleteFolderFastPath();
            TestDeleteComponentJsonProtocol();
            TestDeleteMethodJsonProtocol();
            TestDeleteFolderJsonProtocol();
            Dictionary<string, object> report = new Dictionary<string, object>
            {
                { "passed", true },
                { "runtimeProtocolAssertions", runtimeProtocolAssertions },
                { "metrics", new Dictionary<string, object>
                    {
                        { "operations", 3 },
                        { "canonicalCases", 6 }
                    }
                }
            };
            Console.WriteLine(AscetJsonContract.Serialize(report));
            return 0;
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine(ex.Message);
            return 1;
        }
    }

    private static void TestDeleteComponentFastPath()
    {
        string source = ReadSource("src\\AscetCopilot\\AscetComponentDelete.cs");
        int start = source.IndexOf("    public AscetComponentDeleteResult DeleteComponent(", StringComparison.Ordinal);
        int end = source.IndexOf("    private AscetFolder ResolveFolder(", start);
        AssertTrue(start >= 0 && end > start, "Unable to isolate delete_component service source.");
        string method = source.Substring(start, end - start);

        AssertEqual(1, CountOccurrences(method, "ExecuteWithSession(\"delete_component\""), "delete_component must use exactly one session execution.");
        AssertFalse(method.IndexOf("verify_delete_component", StringComparison.Ordinal) >= 0, "delete_component must not open a second verification session.");
        AssertTrue(method.IndexOf("ResolveItem(session, parsed.ItemName, parsed.FolderPath)", StringComparison.Ordinal) >= 0, "delete_component must resolve the exact target in-session.");
        AssertTrue(method.IndexOf("folder.RemoveComponent(component)", StringComparison.Ordinal) >= 0, "delete_component must use the native component removal API.");
        AssertTrue(method.IndexOf("database.Save()", StringComparison.Ordinal) >= 0, "delete_component must save after native deletion.");
        AssertTrue(method.LastIndexOf("VerifyComponentAbsence(session", StringComparison.Ordinal) > method.IndexOf("database.Save()", StringComparison.Ordinal), "delete_component must verify absence after save in the same session.");
        AssertTrue(method.IndexOf("if (!ignoreMissing)", StringComparison.Ordinal) >= 0, "delete_component must retain ignore-missing behavior.");
        AssertTrue(source.IndexOf("SaveSucceeded", StringComparison.Ordinal) >= 0, "delete_component must expose saveSucceeded state.");
        AssertTrue(source.IndexOf("same_session_exact_absence", StringComparison.Ordinal) >= 0, "delete_component must report same-session absence verification.");
        AssertNoExternalVerificationHook(source, "delete_component");
        AssertPayloadContract("AscetDeleteComponent.cs", "delete_component");
    }

    private static void TestDeleteMethodFastPath()
    {
        string source = ReadSource("src\\AscetCopilot\\AscetMethodDelete.cs");
        int start = source.IndexOf("    public AscetMethodDeleteResult DeleteMethod(", StringComparison.Ordinal);
        int end = source.IndexOf("    private MethodHandleWithDiagram FindMethod(", start);
        AssertTrue(start >= 0 && end > start, "Unable to isolate delete_method service source.");
        string method = source.Substring(start, end - start);

        AssertEqual(1, CountOccurrences(method, "ExecuteWithSession(\"delete_method\""), "delete_method must use exactly one session execution.");
        AssertFalse(method.IndexOf("GetMethod(componentPath, methodName)", StringComparison.Ordinal) >= 0, "delete_method must not perform an external readback call.");
        AssertTrue(method.IndexOf("RemoveMethodFromDiagram(found, componentPath, methodName)", StringComparison.Ordinal) >= 0, "delete_method must use the native diagram removal API.");
        AssertTrue(method.IndexOf("database.Save()", StringComparison.Ordinal) >= 0, "delete_method must save after native deletion.");
        AssertTrue(method.IndexOf("DataBaseItem readbackItem = ResolveItemByPath(session, componentPath)", StringComparison.Ordinal) > method.IndexOf("database.Save()", StringComparison.Ordinal), "delete_method must resolve the component for absence verification after save.");
        AssertTrue(method.IndexOf("FindMethod(session, readbackComponent, methodName) == null", StringComparison.Ordinal) >= 0, "delete_method must verify exact method absence in-session.");
        AssertTrue(method.IndexOf("if (!ignoreMissing)", StringComparison.Ordinal) >= 0, "delete_method must retain ignore-missing behavior.");
        AssertTrue(source.IndexOf("SaveSucceeded", StringComparison.Ordinal) >= 0, "delete_method must expose saveSucceeded state.");
        AssertTrue(source.IndexOf("same_session_exact_absence", StringComparison.Ordinal) >= 0, "delete_method must report same-session absence verification.");
        AssertNoExternalVerificationHook(source, "delete_method");
        AssertPayloadContract("AscetDeleteMethod.cs", "delete_method");
    }

    private static void TestDeleteFolderFastPath()
    {
        string source = ReadSource("src\\AscetCopilot\\AscetFolderDelete.cs");
        int start = source.IndexOf("    public AscetFolderDeleteResult DeleteFolder(", StringComparison.Ordinal);
        int end = source.IndexOf("    private bool RemoveFolder(", start);
        AssertTrue(start >= 0 && end > start, "Unable to isolate delete_folder service source.");
        string method = source.Substring(start, end - start);

        AssertEqual(1, CountOccurrences(method, "ExecuteWithSession(\"delete_folder\""), "delete_folder must use exactly one session execution.");
        AssertFalse(source.IndexOf("verify_delete_folder", StringComparison.Ordinal) >= 0, "delete_folder must not open a second verification session.");
        AssertFalse(source.IndexOf("CollectComponentPaths", StringComparison.Ordinal) >= 0, "delete_folder must not collect a subtree-wide component impact list.");
        AssertFalse(source.IndexOf("RequireComponentsEditableInSession", StringComparison.Ordinal) >= 0, "delete_folder must not run subtree-wide editability analysis.");
        AssertTrue(method.IndexOf("ResolveFolder(database, normalizedPath)", StringComparison.Ordinal) >= 0, "delete_folder must resolve the exact folder in-session.");
        AssertTrue(method.IndexOf("RemoveFolder(database, folder, normalizedPath)", StringComparison.Ordinal) >= 0, "delete_folder must use the native folder removal API.");
        AssertTrue(method.IndexOf("database.Save()", StringComparison.Ordinal) >= 0, "delete_folder must save after native deletion.");
        AssertTrue(method.LastIndexOf("VerifyFolderAbsence(database, normalizedPath", StringComparison.Ordinal) > method.IndexOf("database.Save()", StringComparison.Ordinal), "delete_folder must verify absence after save in the same session.");
        AssertTrue(method.IndexOf("if (!ignoreMissing)", StringComparison.Ordinal) >= 0, "delete_folder must retain ignore-missing behavior.");
        AssertTrue(source.IndexOf("SaveSucceeded", StringComparison.Ordinal) >= 0, "delete_folder must expose saveSucceeded state.");
        AssertTrue(source.IndexOf("same_session_exact_absence", StringComparison.Ordinal) >= 0, "delete_folder must report same-session absence verification.");
        AssertNoExternalVerificationHook(source, "delete_folder");
        AssertPayloadContract("AscetDeleteFolder.cs", "delete_folder");
    }

    private static void TestDeleteComponentJsonProtocol()
    {
        AscetComponentDeleteResult applied = new AscetComponentDeleteResult
        {
            ComponentPath = "Folder\\Component",
            FolderPath = "Folder",
            ComponentName = "Component",
            Deleted = true,
            AlreadyMissing = false,
            VerifyReadbackRequested = true,
            ReadbackVerified = true,
            SaveSucceeded = true,
            VerificationMode = "same_session_exact_absence",
            Summary = "Deleted component."
        };
        AscetComponentDeleteResult missing = new AscetComponentDeleteResult
        {
            ComponentPath = "Folder\\Missing",
            FolderPath = "Folder",
            ComponentName = "Missing",
            Deleted = false,
            AlreadyMissing = true,
            VerifyReadbackRequested = true,
            ReadbackVerified = true,
            SaveSucceeded = true,
            VerificationMode = "same_session_exact_absence",
            Summary = "Component is already missing."
        };

        AssertCanonicalPayload(AscetDeleteComponent.FormatJsonOutput(applied), "delete_component applied", true);
        AssertCanonicalPayload(AscetDeleteComponent.FormatJsonOutput(missing), "delete_component missing", false);
    }

    private static void TestDeleteMethodJsonProtocol()
    {
        AscetMethodDeleteResult applied = new AscetMethodDeleteResult
        {
            ComponentPath = "Folder\\Component",
            MethodName = "Method",
            MethodKind = AscetMethodKind.Unknown,
            DiagramName = "Class",
            Deleted = true,
            AlreadyMissing = false,
            VerifyReadbackRequested = true,
            ReadbackVerified = true,
            SaveSucceeded = true,
            VerificationMode = "same_session_exact_absence",
            Summary = "Deleted method."
        };
        AscetMethodDeleteResult missing = new AscetMethodDeleteResult
        {
            ComponentPath = "Folder\\Component",
            MethodName = "Missing",
            MethodKind = AscetMethodKind.Unknown,
            Deleted = false,
            AlreadyMissing = true,
            VerifyReadbackRequested = true,
            ReadbackVerified = true,
            SaveSucceeded = true,
            VerificationMode = "same_session_exact_absence",
            Summary = "Method is already missing."
        };

        AssertCanonicalPayload(AscetDeleteMethod.FormatJsonOutput(applied), "delete_method applied", true);
        AssertCanonicalPayload(AscetDeleteMethod.FormatJsonOutput(missing), "delete_method missing", false);
    }

    private static void TestDeleteFolderJsonProtocol()
    {
        AscetFolderDeleteResult applied = new AscetFolderDeleteResult
        {
            FolderPath = "Folder",
            Deleted = true,
            AlreadyMissing = false,
            VerifyReadbackRequested = true,
            ReadbackVerified = true,
            SaveSucceeded = true,
            VerificationMode = "same_session_exact_absence",
            Summary = "Deleted folder."
        };
        AscetFolderDeleteResult missing = new AscetFolderDeleteResult
        {
            FolderPath = "Missing",
            Deleted = false,
            AlreadyMissing = true,
            VerifyReadbackRequested = true,
            ReadbackVerified = true,
            SaveSucceeded = true,
            VerificationMode = "same_session_exact_absence",
            Summary = "Folder is already missing."
        };

        AssertCanonicalPayload(AscetDeleteFolder.FormatJsonOutput(applied), "delete_folder applied", true);
        AssertCanonicalPayload(AscetDeleteFolder.FormatJsonOutput(missing), "delete_folder missing", false);
    }

    private static void AssertCanonicalPayload(string json, string operation, bool changed)
    {
        Dictionary<string, object> payload = AscetJsonContract.DeserializeObject(json);
        bool expectedNoOp = !changed;
        AssertTrue(payload != null, operation + " must serialize one JSON object.");
        AssertEqual(changed, GetBool(payload, "changed", operation), operation + " changed mismatch.");
        AssertEqual(changed ? "applied" : "no_op", GetString(payload, "mutationStatus", operation), operation + " mutationStatus mismatch.");
        AssertEqual(changed, GetBool(payload, "saveAttempted", operation), operation + " saveAttempted mismatch.");
        AssertEqual(changed, GetBool(payload, "saveSucceeded", operation), operation + " saveSucceeded mismatch.");
        AssertEqual(changed ? "saved" : "not_required", GetString(payload, "saveState", operation), operation + " saveState mismatch.");
        AssertTrue(GetBool(payload, "verified", operation), operation + " verified must be true.");
        AssertEqual("passed", GetString(payload, "verificationStatus", operation), operation + " verificationStatus mismatch.");
        AssertTrue(GetString(payload, "verificationMode", operation).Length > 0, operation + " verificationMode must be present.");
        AssertEqual(1, GetInt(payload, "sessionCount", operation), operation + " sessionCount mismatch.");
        AssertEqual(changed ? 1 : 0, GetInt(payload, "saveCount", operation), operation + " saveCount mismatch.");
        AssertEqual(0, GetInt(payload, "editableRetryCount", operation), operation + " editableRetryCount mismatch.");
        AssertEqual(changed ? 1 : 0, GetInt(payload, "nativeMutationAttemptCount", operation), operation + " nativeMutationAttemptCount mismatch.");
        AssertEqual(expectedNoOp, GetBool(payload, "alreadyMissing", operation), operation + " alreadyMissing mismatch.");
    }

    private static bool GetBool(Dictionary<string, object> payload, string key, string operation)
    {
        object value;
        AssertTrue(payload.TryGetValue(key, out value) && value is bool, operation + " is missing boolean '" + key + "'.");
        return (bool)value;
    }

    private static int GetInt(Dictionary<string, object> payload, string key, string operation)
    {
        object value;
        AssertTrue(payload.TryGetValue(key, out value) && value is int, operation + " is missing integer '" + key + "'.");
        return (int)value;
    }

    private static string GetString(Dictionary<string, object> payload, string key, string operation)
    {
        object value;
        AssertTrue(payload.TryGetValue(key, out value) && value is string, operation + " is missing string '" + key + "'.");
        return (string)value;
    }
    private static void AssertNoExternalVerificationHook(string source, string operation)
    {
        AssertFalse(source.IndexOf("WriteVerificationService", StringComparison.Ordinal) >= 0, operation + " must not use an external verification service.");
        AssertFalse(source.IndexOf("IWriteVerificationHook", StringComparison.Ordinal) >= 0, operation + " must not use an external verification hook.");
    }

    private static void AssertPayloadContract(string cliFileName, string operation)
    {
        string source = ReadSource("src\\AscetCli\\" + cliFileName);
        AssertTrue(source.IndexOf("payload[\"readbackVerified\"]", StringComparison.Ordinal) >= 0, operation + " payload must retain readbackVerified.");
        AssertTrue(source.IndexOf("payload[\"alreadyMissing\"]", StringComparison.Ordinal) >= 0, operation + " payload must retain alreadyMissing.");
        AssertTrue(source.IndexOf("payload[\"saveSucceeded\"]", StringComparison.Ordinal) >= 0, operation + " payload must report saveSucceeded.");
        AssertTrue(source.IndexOf("payload[\"verificationMode\"]", StringComparison.Ordinal) >= 0, operation + " payload must report verificationMode.");
        AssertTrue(source.IndexOf("payload[\"changed\"]", StringComparison.Ordinal) >= 0, operation + " payload must report changed.");
        AssertTrue(source.IndexOf("payload[\"mutationStatus\"]", StringComparison.Ordinal) >= 0, operation + " payload must report mutationStatus.");
        AssertTrue(source.IndexOf("payload[\"saveAttempted\"]", StringComparison.Ordinal) >= 0, operation + " payload must report saveAttempted.");
        AssertTrue(source.IndexOf("payload[\"saveState\"]", StringComparison.Ordinal) >= 0, operation + " payload must report saveState.");
        AssertTrue(source.IndexOf("payload[\"verified\"]", StringComparison.Ordinal) >= 0, operation + " payload must report verified.");
        AssertTrue(source.IndexOf("payload[\"verificationStatus\"]", StringComparison.Ordinal) >= 0, operation + " payload must report verificationStatus.");
        AssertTrue(source.IndexOf("payload[\"sessionCount\"]", StringComparison.Ordinal) >= 0, operation + " payload must report sessionCount.");
        AssertTrue(source.IndexOf("payload[\"saveCount\"]", StringComparison.Ordinal) >= 0, operation + " payload must report saveCount.");
        AssertTrue(source.IndexOf("payload[\"editableRetryCount\"]", StringComparison.Ordinal) >= 0, operation + " payload must report editableRetryCount.");
        AssertTrue(source.IndexOf("payload[\"nativeMutationAttemptCount\"]", StringComparison.Ordinal) >= 0, operation + " payload must report nativeMutationAttemptCount.");
    }

    private static string ReadSource(string relativePath)
    {
        string repositoryRoot = Environment.GetEnvironmentVariable("ASCET_REPOSITORY_ROOT");
        string[] roots = String.IsNullOrWhiteSpace(repositoryRoot)
            ? new string[] { AppDomain.CurrentDomain.BaseDirectory, Directory.GetCurrentDirectory() }
            : new string[] { repositoryRoot, AppDomain.CurrentDomain.BaseDirectory, Directory.GetCurrentDirectory() };

        for (int rootIndex = 0; rootIndex < roots.Length; rootIndex++)
        {
            DirectoryInfo directory = new DirectoryInfo(roots[rootIndex]);
            while (directory != null)
            {
                string candidate = Path.Combine(directory.FullName, "ascetcli", relativePath);
                if (File.Exists(candidate))
                {
                    return File.ReadAllText(candidate);
                }

                candidate = Path.Combine(directory.FullName, relativePath);
                if (File.Exists(candidate))
                {
                    return File.ReadAllText(candidate);
                }

                directory = directory.Parent;
            }
        }

        throw new Exception("Unable to locate source file '" + relativePath + "'.");
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

    private static void AssertTrue(bool condition, string message)
    {
        runtimeProtocolAssertions++;
        if (!condition)
        {
            throw new Exception(message);
        }
    }

    private static void AssertFalse(bool condition, string message)
    {
        runtimeProtocolAssertions++;
        if (condition)
        {
            throw new Exception(message);
        }
    }

    private static void AssertEqual(int expected, int actual, string message)
    {
        runtimeProtocolAssertions++;
        if (expected != actual)
        {
            throw new Exception(message + " Expected " + expected + " but got " + actual + ".");
        }
    }

    private static void AssertEqual(bool expected, bool actual, string message)
    {
        runtimeProtocolAssertions++;
        if (expected != actual)
        {
            throw new Exception(message + " Expected " + expected + " but got " + actual + ".");
        }
    }

    private static void AssertEqual(string expected, string actual, string message)
    {
        runtimeProtocolAssertions++;
        if (!String.Equals(expected, actual, StringComparison.Ordinal))
        {
            throw new Exception(message + " Expected '" + expected + "' but got '" + actual + "'.");
        }
    }
}
