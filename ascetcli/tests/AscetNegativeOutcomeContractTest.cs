using System;

public static class AscetNegativeOutcomeContractTest
{
    public static int Main()
    {
        try
        {
            TestPreMutationFailureClassification();
            TestUnknownFailureClassification();
            TestLegacyStderrCodeParsing();
            Console.WriteLine("AscetNegativeOutcomeContractTest passed.");
            return 0;
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine(ex.Message);
            return 1;
        }
    }

    private static void TestPreMutationFailureClassification()
    {
        string[] codes = new[]
        {
            "invalid_arguments",
            "target_not_found",
            "component_not_found",
            "folder_not_found",
            "method_not_found",
            "element_not_found",
            "element_conflict",
            "formula_conflict",
            "editable_write_gate_blocked",
            "mutation_snapshot_incomplete",
            "apply_requires_recreate",
            "restore_requires_recreate"
        };

        for (int i = 0; i < codes.Length; i++)
        {
            AssertTrue(
                AscetCliEnvelope.ResolveFailureMutationStarted(true, codes[i]) == false,
                "Expected pre-mutation code to report mutationStarted=false: " + codes[i]);
        }

        AssertTrue(
            AscetCliEnvelope.ResolveFailureMutationStarted(false, "read_failed") == false,
            "Non-mutating failures must report mutationStarted=false.");
    }

    private static void TestUnknownFailureClassification()
    {
        string[] codes = new[]
        {
            "write_failed",
            "create_component_failed",
            "method_readback_mismatch",
            "element_transaction_verification_failed",
            "element_transaction_rollback_failed",
            "component_not_editable"
        };

        for (int i = 0; i < codes.Length; i++)
        {
            AssertTrue(
                AscetCliEnvelope.ResolveFailureMutationStarted(true, codes[i]).HasValue == false,
                "Expected uncertain code to preserve mutationStarted=null: " + codes[i]);
        }
    }

    private static void TestLegacyStderrCodeParsing()
    {
        LegacyOperationFailureDetails failure = InProcessLegacyOperationAdapter.ParseFailureDetails(
            String.Empty,
            "target_not_found:resolve_target:Target '\\Missing' was not found.",
            2);

        AssertEqual("target_not_found", failure.Code, "Legacy stderr code must be preserved.");
        AssertEqual("resolve_target", failure.Operation, "Legacy stderr operation must be parsed.");
        AssertEqual("Target '\\Missing' was not found.", failure.Message, "Legacy stderr message must be parsed.");

        LegacyOperationFailureDetails structured = InProcessLegacyOperationAdapter.ParseFailureDetails(
            "{\"ok\":false,\"error\":{\"code\":\"component_not_found\",\"message\":\"Component missing.\"}}",
            "legacy_operation_failed:legacy:ignored",
            2);
        AssertEqual("component_not_found", structured.Code, "Structured stdout code must take precedence.");
        AssertEqual("Component missing.", structured.Message, "Structured stdout message must take precedence.");
    }

    private static void AssertTrue(bool condition, string message)
    {
        if (condition == false)
        {
            throw new Exception(message);
        }
    }

    private static void AssertEqual(string expected, string actual, string message)
    {
        if (String.Equals(expected ?? String.Empty, actual ?? String.Empty, StringComparison.Ordinal) == false)
        {
            throw new Exception(message + " Expected '" + expected + "' but got '" + actual + "'.");
        }
    }
}