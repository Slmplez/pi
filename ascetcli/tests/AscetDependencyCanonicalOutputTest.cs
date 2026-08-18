using System;
using System.Collections.Generic;

class AscetDependencyCanonicalOutputTest
{
    static int Main()
    {
        try
        {
            TestSetElementDependencyNoOp();
            TestSetElementDependencyChangedSaveEvidenceBlocked();
            TestSetElementDependencyFailure();
            TestDependencyChainNoOp();
            TestDependencyChainChangedSaveEvidenceBlocked();
            TestDependencyChainFailure();
            Console.WriteLine("{\"passed\":true,\"runtimeProtocolAssertions\":30,\"metrics\":{\"operations\":2,\"scenarios\":6,\"saveEvidenceBlocked\":2}}");
            return 0;
        }
        catch (Exception error)
        {
            Console.Error.WriteLine(error.Message);
            return 1;
        }
    }

    private static void TestSetElementDependencyNoOp()
    {
        AscetSetElementDependencyResult result = new AscetSetElementDependencyResult
        {
            TargetPath = "F\\Consumer",
            TargetKind = "component",
            ElementName = "C_Threshold",
            RequestedDependency = "independent",
            WriteSucceeded = true,
            ReadbackVerified = true,
            MatchesChanged = 0,
            Changed = false,
            MutationStatus = "no_op",
            SaveAttempted = false,
            SaveSucceeded = false,
            SaveState = "not_required",
            Verified = true,
            VerificationStatus = "passed",
            VerificationMode = "same_session_dependency_endpoint",
            SessionCount = 1,
            SaveCount = 0,
            EditableRetryCount = 0,
            NativeMutationAttemptCount = 0,
            CanonicalEvidenceStatus = "complete"
        };

        string json = AscetSetElementDependency.FormatJsonOutput(result);
        AssertContains(json, "\"changed\":false", "set dependency no-op changed");
        AssertContains(json, "\"mutationStatus\":\"no_op\"", "set dependency no-op status");
        AssertContains(json, "\"saveAttempted\":false", "set dependency no-op save attempted");
        AssertContains(json, "\"saveState\":\"not_required\"", "set dependency no-op save state");
        AssertContains(json, "\"verificationMode\":\"same_session_dependency_endpoint\"", "set dependency no-op verification mode");
        AssertContains(json, "\"sessionCount\":1", "set dependency no-op session count");
        AssertContains(json, "\"saveCount\":0", "set dependency no-op save count");
        AssertContains(json, "\"nativeMutationAttemptCount\":0", "set dependency no-op mutation count");
    }

    private static void TestSetElementDependencyChangedSaveEvidenceBlocked()
    {
        AscetSetElementDependencyResult result = new AscetSetElementDependencyResult
        {
            TargetPath = "F\\Consumer",
            TargetKind = "component",
            ElementName = "C_Threshold",
            RequestedDependency = "dependent",
            WriteSucceeded = false,
            ReadbackVerified = true,
            MatchesChanged = 1,
            Changed = true,
            MutationStatus = "applied",
            SaveAttempted = false,
            SaveSucceeded = false,
            SaveState = "unknown",
            Verified = true,
            VerificationStatus = "passed",
            VerificationMode = "same_session_dependency_endpoint",
            SessionCount = 1,
            SaveCount = 0,
            EditableRetryCount = 0,
            NativeMutationAttemptCount = 1,
            CanonicalEvidenceStatus = "blocked",
            CanonicalEvidenceIssue = "ImportXMLFromFile save semantics are not proven; explicit database.Save was not observed."
        };

        string json = AscetSetElementDependency.FormatJsonOutput(result);
        AssertContains(json, "\"changed\":true", "set dependency changed");
        AssertContains(json, "\"mutationStatus\":\"applied\"", "set dependency applied status");
        AssertContains(json, "\"saveState\":\"unknown\"", "set dependency unknown save state");
        AssertContains(json, "\"canonicalEvidenceStatus\":\"blocked\"", "set dependency blocked evidence");
        AssertContains(json, "ImportXMLFromFile save semantics are not proven", "set dependency evidence issue");
        AssertContains(json, "\"write\":{\"dryRun\":false,\"succeeded\":false", "set dependency must not claim write success");
    }

    private static void TestSetElementDependencyFailure()
    {
        string json = AscetSetElementDependency.FormatJsonFailure(new AscetReadException(
            "tool_api_error",
            "set_element_dependency",
            "ImportXMLFromFile failed."));
        AssertContains(json, "\"changed\":false", "set dependency failure changed");
        AssertContains(json, "\"mutationStatus\":\"failed\"", "set dependency failure status");
        AssertContains(json, "\"saveState\":\"unknown\"", "set dependency failure save state");
        AssertContains(json, "\"verified\":false", "set dependency failure verified");
        AssertContains(json, "\"canonicalEvidenceStatus\":\"blocked\"", "set dependency failure evidence");
        AssertContains(json, "\"sessionCount\":null", "set dependency failure session count");
    }

    private static void TestDependencyChainNoOp()
    {
        Dictionary<string, object> result = AscetParameterDependencyChainExecuteService.Success(
            "no_change",
            "chain-no-op",
            false,
            false,
            new List<Dictionary<string, object>>());

        AssertEqual(false, result["changed"], "chain no-op changed");
        AssertEqual("no_op", result["mutationStatus"], "chain no-op status");
        AssertEqual(false, result["saveAttempted"], "chain no-op save attempted");
        AssertEqual("not_required", result["saveState"], "chain no-op save state");
        AssertEqual(true, result["verified"], "chain no-op verified");
        AssertEqual(1, result["sessionCount"], "chain no-op session count");
        AssertEqual(0, result["saveCount"], "chain no-op save count");
        AssertEqual("complete", result["canonicalEvidenceStatus"], "chain no-op evidence");
    }

    private static void TestDependencyChainChangedSaveEvidenceBlocked()
    {
        Dictionary<string, object> result = AscetParameterDependencyChainExecuteService.Success(
            "committed",
            "chain-changed",
            true,
            true,
            new List<Dictionary<string, object>>());

        AssertEqual("outcome_unknown", result["status"], "chain changed status");
        AssertEqual(true, result["changed"], "chain changed changed");
        AssertEqual("applied", result["mutationStatus"], "chain changed status field");
        AssertEqual("unknown", result["saveState"], "chain changed save state");
        AssertTrue(result["saveAttempted"] == null, "chain changed save attempted must be unknown");
        AssertTrue(result["saveCount"] == null, "chain changed save count must be unknown");
        AssertEqual("blocked", result["canonicalEvidenceStatus"], "chain changed evidence");
        AssertContains(Convert.ToString(result["canonicalEvidenceIssue"]), "Save counters are not exposed", "chain changed evidence issue");
    }

    private static void TestDependencyChainFailure()
    {
        Dictionary<string, object> result = AscetParameterDependencyChainExecuteService.FailureBeforeMutation(
            "chain-failed",
            new AscetReadException(
                "editable_write_gate_blocked",
                "configure_parameter_dependency_chain_execute",
                "Component 'F\\Consumer' is not editable."),
            new List<Dictionary<string, object>>());

        AssertEqual("blocked", result["status"], "chain failed status");
        AssertEqual(false, result["changed"], "chain failed changed");
        AssertEqual("failed", result["mutationStatus"], "chain failed mutation status");
        AssertEqual("not_attempted", result["saveState"], "chain failed save state");
        AssertEqual(false, result["verified"], "chain failed verified");
        AssertEqual("failed", result["verificationStatus"], "chain failed verification status");
        AssertEqual("blocked", result["canonicalEvidenceStatus"], "chain failed evidence");
    }

    private static void AssertContains(string value, string expected, string message)
    {
        if (String.IsNullOrEmpty(value) || value.IndexOf(expected, StringComparison.Ordinal) < 0)
            throw new Exception(message + ": missing '" + expected + "'. Actual: " + value);
    }

    private static void AssertEqual(object expected, object actual, string message)
    {
        if (!Object.Equals(expected, actual))
            throw new Exception(message + ": expected '" + Convert.ToString(expected) + "' but got '" + Convert.ToString(actual) + "'.");
    }

    private static void AssertTrue(bool condition, string message)
    {
        if (!condition) throw new Exception(message);
    }
}