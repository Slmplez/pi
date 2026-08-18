using System;
using System.Collections.Generic;
using System.Web.Script.Serialization;

public static class AscetComponentCreateFastWriteTest
{
    public static int Main()
    {
        try
        {
            TestCreateComponentUsesOneSameSessionExecution();
            TestNormalExecPathDoesNotRunSecondaryVerification();
            TestChangedExecutionPreservesCanonicalEvidence();
            TestExistingComponentPayloadSemantics();
            TestJsonPayloadIncludesCanonicalMutationEvidence();
            Console.WriteLine("AscetComponentCreateFastWriteTest passed.");
            return 0;
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine(ex.Message);
            return 1;
        }
    }

    private static void TestCreateComponentUsesOneSameSessionExecution()
    {
        string source = System.IO.File.ReadAllText(FindSourcePath());
        int start = source.IndexOf("    public AscetComponentCreateResult CreateComponent(", StringComparison.Ordinal);
        int end = source.IndexOf("    internal AscetComponentCreateResult CreateComponentInSession(", StringComparison.Ordinal);
        AssertTrue(start >= 0 && end > start, "Unable to isolate ComponentCreateService.CreateComponent source.");
        string method = source.Substring(start, end - start);

        AssertEqual(1, CountOccurrences(method, "ExecuteWithSession(\"create_component\""), "create_component must use exactly one session execution.");
        AssertFalse(method.IndexOf("ExecuteWithSession(\"verify_create_component\"", StringComparison.Ordinal) >= 0, "create_component must not open a fresh verification session.");

        int createIndex = method.IndexOf("CreateInFolder(folder, parsed.ItemName, componentKind, languageKind)", StringComparison.Ordinal);
        int saveIndex = method.IndexOf("database.Save()", StringComparison.Ordinal);
        int verifyIndex = method.IndexOf("ResolveItem(session, parsed.ItemName, parsed.FolderPath)", StringComparison.Ordinal);
        AssertTrue(createIndex >= 0, "create_component must create through the native folder API.");
        AssertTrue(saveIndex > createIndex, "create_component must save after native creation.");
        AssertTrue(verifyIndex > saveIndex, "create_component must perform exact-path verification after save in the same session.");
        AssertTrue(method.IndexOf("if (!returnExisting)", StringComparison.Ordinal) >= 0, "create_component must retain returnExisting conflict behavior.");
        AssertTrue(method.IndexOf("rollbackOnFailure && created", StringComparison.Ordinal) >= 0, "create_component must retain rollback behavior for created components.");
        AssertTrue(method.IndexOf("SaveSucceeded = saveSucceeded", StringComparison.Ordinal) >= 0, "create_component no-op session result must not report Save success without a Save attempt.");
        AssertFalse(method.IndexOf("SaveSucceeded = true", StringComparison.Ordinal) >= 0, "create_component no-op session result must not hard-code Save success.");

        string writeServiceSource = System.IO.File.ReadAllText(FindComponentWriteServiceSourcePath());
        AssertFalse(writeServiceSource.IndexOf("CreateComponentVerificationHook", StringComparison.Ordinal) >= 0, "ComponentWriteService must not retain a locator-based create_component verification hook.");
        AssertTrue(writeServiceSource.IndexOf("VerifyAfterWrite = false", StringComparison.Ordinal) >= 0, "ComponentWriteService must disable executor verification for the fast path.");
        AssertTrue(writeServiceSource.IndexOf("request.VerifyReadback,", StringComparison.Ordinal) >= 0, "ComponentWriteService must request same-session verification from ComponentCreateService.");
    }

    private static void TestNormalExecPathDoesNotRunSecondaryVerification()
    {
        CountingVerificationHook hook = new CountingVerificationHook();
        ComponentWriteService service = new ComponentWriteService(
            new FakeComponentCreateService(),
            new AscetWriteExecutor(new WriteVerificationService(hook)));
        AscetWriteExecutionResult execution = service.Execute(new CreateComponentWriteRequest
        {
            ComponentPath = "Workspace\\VerifiedComponent",
            ComponentKind = AscetComponentKind.Class,
            LanguageKind = AscetLanguageKind.ESDL,
            ReturnExisting = false,
            VerifyReadback = true,
            RollbackOnFailure = true
        });

        AssertTrue(execution.Succeeded, "same-session verified create_component execution must succeed.");
        AssertEqual(0, hook.VerifyCalls, "create_component must not invoke a secondary verification hook.");
        AssertTrue(execution.Verification.Requested, "same-session verification must remain requested in the executor result.");
        AssertTrue(execution.Verification.Attempted, "same-session verification must remain attempted in the executor result.");
        AssertTrue(execution.Verification.Succeeded, "same-session verification must remain successful in the executor result.");
        AssertTrue(GetBool(execution.Payload, "readbackVerified"), "same-session verification result must remain in the Exec payload.");
        AssertFalse(GetBool(execution.Payload, "saveSucceeded"), "existing component must not report Save success when no Save was attempted.");
        AssertFalse(GetBool(execution.Payload, "changed"), "existing component must report changed=false.");
        AssertEqual("no_op", GetString(execution.Payload, "mutationStatus"), "existing component must report mutationStatus=no_op.");
        AssertFalse(GetBool(execution.Payload, "saveAttempted"), "existing component must report saveAttempted=false.");
        AssertEqual("not_required", GetString(execution.Payload, "saveState"), "existing component must report saveState=not_required.");
        AssertTrue(GetBool(execution.Payload, "verified"), "existing component must report verified=true.");
        AssertEqual("passed", GetString(execution.Payload, "verificationStatus"), "existing component must report verificationStatus=passed.");
        AssertEqual(1, GetInt(execution.Payload, "sessionCount"), "existing component must report sessionCount=1.");
        AssertEqual(0, GetInt(execution.Payload, "saveCount"), "existing component must report saveCount=0.");
        AssertEqual(0, GetInt(execution.Payload, "nativeMutationAttemptCount"), "existing component must report nativeMutationAttemptCount=0.");
        AssertEqual("same_session_exact_path", GetString(execution.Payload, "verificationMode"), "same-session verification mode must remain in the Exec payload.");
    }

    private static void TestJsonPayloadIncludesCanonicalMutationEvidence()
    {
        AscetComponentCreateResult changed = new AscetComponentCreateResult
        {
            ComponentPath = "Workspace\\CreatedComponent",
            FolderPath = "Workspace",
            ComponentName = "CreatedComponent",
            ComponentKind = AscetComponentKind.Class,
            LanguageKind = AscetLanguageKind.ESDL,
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
            VerificationMode = "same_session_exact_path",
            SessionCount = 1,
            SaveCount = 1,
            EditableRetryCount = 0,
            NativeMutationAttemptCount = 1
        };
        AscetComponentCreateResult noOp = new AscetComponentCreateResult
        {
            ComponentPath = "Workspace\\ExistingComponent",
            FolderPath = "Workspace",
            ComponentName = "ExistingComponent",
            ComponentKind = AscetComponentKind.Class,
            LanguageKind = AscetLanguageKind.ESDL,
            AlreadyExisted = true,
            VerifyReadbackRequested = true,
            ReadbackVerified = true,
            SaveSucceeded = false,
            Changed = false,
            MutationStatus = "no_op",
            SaveAttempted = false,
            SaveState = "not_required",
            Verified = true,
            VerificationStatus = "passed",
            VerificationMode = "same_session_exact_path",
            SessionCount = 1,
            SaveCount = 0,
            EditableRetryCount = 0,
            NativeMutationAttemptCount = 0
        };

        JavaScriptSerializer serializer = new JavaScriptSerializer();
        Dictionary<string, object> changedPayload = serializer.DeserializeObject(AscetCreateComponent.FormatJsonOutput(changed)) as Dictionary<string, object>;
        Dictionary<string, object> noOpPayload = serializer.DeserializeObject(AscetCreateComponent.FormatJsonOutput(noOp)) as Dictionary<string, object>;
        AssertCanonicalPayload(changedPayload, true, "applied", true, true, "saved", 1, 1, 1, "changed");
        AssertCanonicalPayload(noOpPayload, false, "no_op", false, false, "not_required", 1, 0, 0, "no-op");
    }

    private static void AssertCanonicalPayload(Dictionary<string, object> payload, bool changed, string mutationStatus, bool saveAttempted, bool saveSucceeded, string saveState, int sessionCount, int saveCount, int nativeMutationAttemptCount, string scenario)
    {
        AssertTrue(payload != null, scenario + " JSON payload must be an object.");
        AssertEqual(changed, GetBool(payload, "changed"), scenario + " changed mismatch.");
        AssertEqual(mutationStatus, GetString(payload, "mutationStatus"), scenario + " mutationStatus mismatch.");
        AssertEqual(saveAttempted, GetBool(payload, "saveAttempted"), scenario + " saveAttempted mismatch.");
        AssertEqual(saveState, GetString(payload, "saveState"), scenario + " saveState mismatch.");
        AssertEqual(saveSucceeded, GetBool(payload, "saveSucceeded"), scenario + " saveSucceeded mismatch.");
        AssertTrue(GetBool(payload, "verified"), scenario + " verified must be true.");
        AssertEqual("passed", GetString(payload, "verificationStatus"), scenario + " verificationStatus mismatch.");
        AssertEqual("same_session_exact_path", GetString(payload, "verificationMode"), scenario + " verificationMode mismatch.");
        AssertEqual(sessionCount, GetInt(payload, "sessionCount"), scenario + " sessionCount mismatch.");
        AssertEqual(saveCount, GetInt(payload, "saveCount"), scenario + " saveCount mismatch.");
        AssertEqual(0, GetInt(payload, "editableRetryCount"), scenario + " editableRetryCount mismatch.");
        AssertEqual(nativeMutationAttemptCount, GetInt(payload, "nativeMutationAttemptCount"), scenario + " nativeMutationAttemptCount mismatch.");
    }

    private static void TestChangedExecutionPreservesCanonicalEvidence()
    {
        ComponentWriteService service = new ComponentWriteService(
            new FakeComponentCreateService(true),
            new AscetWriteExecutor());
        AscetWriteExecutionResult execution = service.Execute(new CreateComponentWriteRequest
        {
            ComponentPath = "Workspace\\CreatedComponent",
            ComponentKind = AscetComponentKind.Class,
            LanguageKind = AscetLanguageKind.ESDL,
            ReturnExisting = false,
            VerifyReadback = true,
            RollbackOnFailure = true
        });

        AssertTrue(execution.Succeeded, "changed create_component execution must succeed.");
        AssertCanonicalPayload(execution.Payload, true, "applied", true, true, "saved", 1, 1, 1, "changed execution");
    }

    private static void TestExistingComponentPayloadSemantics()
    {
        ComponentWriteService service = new ComponentWriteService(
            new FakeComponentCreateService(),
            new AscetWriteExecutor());
        AscetWriteExecutionResult execution = service.Execute(new CreateComponentWriteRequest
        {
            ComponentPath = "Workspace\\ExistingComponent",
            ComponentKind = AscetComponentKind.Class,
            LanguageKind = AscetLanguageKind.ESDL,
            ReturnExisting = true,
            VerifyReadback = false,
            RollbackOnFailure = true
        });

        AssertTrue(execution.Succeeded, "returnExisting payload execution must succeed.");
        AssertFalse(GetBool(execution.Payload, "created"), "returnExisting payload must preserve created=false.");
        AssertTrue(GetBool(execution.Payload, "alreadyExisted"), "returnExisting payload must preserve alreadyExisted=true.");
        AssertTrue(GetBool(execution.Payload, "rollbackOnFailureRequested"), "returnExisting payload must preserve rollbackOnFailureRequested.");
        AssertFalse(GetBool(execution.Payload, "readbackVerified"), "returnExisting payload must preserve readbackVerified=false when not requested.");
        AssertFalse(GetBool(execution.Payload, "saveSucceeded"), "returnExisting payload must not report a Save success when no Save was attempted.");
        AssertEqual("same_session_exact_path", GetString(execution.Payload, "verificationMode"), "returnExisting payload must report same-session verification mode.");
    }

    private static string FindSourcePath()
    {
        string explicitRoot = Environment.GetEnvironmentVariable("ASCET_TEST_SOURCE_ROOT");
        if (!String.IsNullOrWhiteSpace(explicitRoot))
        {
            string explicitCandidate = System.IO.Path.Combine(explicitRoot, "ascetcli", "src", "AscetCopilot", "AscetComponentCreate.cs");
            if (System.IO.File.Exists(explicitCandidate))
            {
                return explicitCandidate;
            }
        }

        string[] roots = new string[] { AppDomain.CurrentDomain.BaseDirectory, System.IO.Directory.GetCurrentDirectory() };
        for (int rootIndex = 0; rootIndex < roots.Length; rootIndex++)
        {
            System.IO.DirectoryInfo directory = new System.IO.DirectoryInfo(roots[rootIndex]);
            while (directory != null)
            {
                string candidate = System.IO.Path.Combine(directory.FullName, "src", "AscetCopilot", "AscetComponentCreate.cs");
                if (System.IO.File.Exists(candidate))
                {
                    return candidate;
                }

                candidate = System.IO.Path.Combine(directory.FullName, "ascetcli", "src", "AscetCopilot", "AscetComponentCreate.cs");
                if (System.IO.File.Exists(candidate))
                {
                    return candidate;
                }

                directory = directory.Parent;
            }
        }

        throw new Exception("Unable to locate src\\AscetCopilot\\AscetComponentCreate.cs.");
    }

    private static string FindComponentWriteServiceSourcePath()
    {
        string explicitRoot = Environment.GetEnvironmentVariable("ASCET_TEST_SOURCE_ROOT");
        if (!String.IsNullOrWhiteSpace(explicitRoot))
        {
            string explicitCandidate = System.IO.Path.Combine(explicitRoot, "ascetcli", "src", "AscetCopilot", "Services", "Write", "ComponentWriteService.cs");
            if (System.IO.File.Exists(explicitCandidate))
            {
                return explicitCandidate;
            }
        }

        string[] roots = new string[] { AppDomain.CurrentDomain.BaseDirectory, System.IO.Directory.GetCurrentDirectory() };
        for (int rootIndex = 0; rootIndex < roots.Length; rootIndex++)
        {
            System.IO.DirectoryInfo directory = new System.IO.DirectoryInfo(roots[rootIndex]);
            while (directory != null)
            {
                string candidate = System.IO.Path.Combine(directory.FullName, "src", "AscetCopilot", "Services", "Write", "ComponentWriteService.cs");
                if (System.IO.File.Exists(candidate))
                {
                    return candidate;
                }

                candidate = System.IO.Path.Combine(directory.FullName, "ascetcli", "src", "AscetCopilot", "Services", "Write", "ComponentWriteService.cs");
                if (System.IO.File.Exists(candidate))
                {
                    return candidate;
                }

                directory = directory.Parent;
            }
        }

        throw new Exception("Unable to locate src\\AscetCopilot\\Services\\Write\\ComponentWriteService.cs.");
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

    private static int GetInt(IDictionary<string, object> payload, string key)
    {
        object value;
        return payload != null && payload.TryGetValue(key, out value) && value != null ? Convert.ToInt32(value) : 0;
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

    private static void AssertEqual(bool expected, bool actual, string message)
    {
        if (expected != actual)
        {
            throw new Exception(message + " Expected " + expected + " but got " + actual + ".");
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

    private sealed class CountingVerificationHook : IWriteVerificationHook
    {
        public int VerifyCalls { get; private set; }

        public WriteVerificationResult Verify(WriteVerificationRequest request)
        {
            VerifyCalls++;
            return WriteVerificationResult.CreateFailure("unexpected_verification", "create_component", "Secondary verification must not run.");
        }
    }

    private sealed class FakeComponentCreateService : IComponentCreateService
    {
        private readonly bool created;

        public FakeComponentCreateService()
            : this(false)
        {
        }

        public FakeComponentCreateService(bool created)
        {
            this.created = created;
        }

        public AscetComponentCreateResult CreateComponent(string componentPath, AscetComponentKind componentKind, AscetLanguageKind languageKind, bool verifyReadback, bool rollbackOnFailure, bool returnExisting)
        {
            return new AscetComponentCreateResult
            {
                ComponentPath = componentPath,
                FolderPath = "Workspace",
                ComponentName = created ? "CreatedComponent" : "ExistingComponent",
                ComponentKind = componentKind,
                LanguageKind = languageKind,
                Created = created,
                AlreadyExisted = !created,
                VerifyReadbackRequested = verifyReadback,
                RollbackOnFailureRequested = rollbackOnFailure,
                ReadbackVerified = verifyReadback,
                SaveSucceeded = created,
                Changed = created,
                MutationStatus = created ? "applied" : "no_op",
                SaveAttempted = created,
                SaveState = created ? "saved" : "not_required",
                Verified = true,
                VerificationStatus = "passed",
                VerificationMode = "same_session_exact_path",
                SessionCount = 1,
                SaveCount = created ? 1 : 0,
                EditableRetryCount = 0,
                NativeMutationAttemptCount = created ? 1 : 0,
                Summary = created ? "Component created." : "Component already exists."
            };
        }
    }
}
