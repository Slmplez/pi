using System;
using System.Collections.Generic;

public static class AscetEditableWriteGateOutputTest
{
    public static int Main()
    {
        try
        {
            TestEditableStateTruthTable();
            TestDependencyGateTargetsOnlyMutations();
            TestBatchFastPathSkipsBatchGate();
            TestFailureMutationMetadata();
            Console.WriteLine("AscetEditableWriteGateOutputTest passed.");
            return 0;
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine(ex.Message);
            return 1;
        }
    }

    private static void TestEditableStateTruthTable()
    {
        AssertTrue(AscetReadDomainServiceBase.IsEditableComponentState(false, false), "unversioned local component should be editable");
        AssertTrue(AscetReadDomainServiceBase.IsEditableComponentState(false, true), "edition should be editable");
        AssertTrue(AscetReadDomainServiceBase.IsEditableComponentState(true, true), "edition state should take precedence");
        AssertTrue(!AscetReadDomainServiceBase.IsEditableComponentState(true, false), "version without edition should be blocked");
    }
    private static void TestDependencyGateTargetsOnlyMutations()
    {
        AscetElementDependencyPlanMatch independent = new AscetElementDependencyPlanMatch
        {
            BeforeDependency = "independent",
            FormulaCode = String.Empty
        };
        AscetSetElementDependencyArguments noChange = new AscetSetElementDependencyArguments
        {
            RequestedDependency = "independent"
        };
        AssertTrue(
            !AscetSetElementDependencyService.RequiresDependencyWrite(independent, noChange),
            "already-independent component without restoration must not require an editable gate");

        AscetSetElementDependencyArguments dependencyChange = new AscetSetElementDependencyArguments
        {
            RequestedDependency = "dependent"
        };
        AssertTrue(
            AscetSetElementDependencyService.RequiresDependencyWrite(independent, dependencyChange),
            "dependency state change must require an editable gate");

        AscetElementDependencyPlanMatch dependent = new AscetElementDependencyPlanMatch
        {
            BeforeDependency = "dependent",
            FormulaCode = "P_Input"
        };
        AscetSetElementDependencyArguments mappingWrite = new AscetSetElementDependencyArguments
        {
            RequestedDependency = "dependent",
            DependencyFormula = "P_Input",
            DependencyMappings = new Dictionary<string, string> { { "P_Input", "P_Input" } }
        };
        AssertTrue(
            AscetSetElementDependencyService.RequiresDependencyWrite(dependent, mappingWrite),
            "formula mapping write without live mapping state must require an editable gate");

        List<AscetElementDependencyDataVariantState> matchingMappings = new List<AscetElementDependencyDataVariantState>
        {
            new AscetElementDependencyDataVariantState
            {
                VariantName = "default",
                HasDependency = true,
                Mappings = new List<AscetElementDependencyDataVariantMapping>
                {
                    new AscetElementDependencyDataVariantMapping
                    {
                        FormalName = "P_Input",
                        ValueName = "P_Input",
                        ValueKind = "parameter"
                    }
                }
            }
        };
        AssertTrue(
            !AscetSetElementDependencyService.RequiresDependencyWrite(dependent, mappingWrite, false, matchingMappings),
            "matching formula mappings must not require an editable gate or repeat the write");
        matchingMappings[0].Mappings[0].ValueName = "P_Other";
        AssertTrue(
            AscetSetElementDependencyService.RequiresDependencyWrite(dependent, mappingWrite, false, matchingMappings),
            "different formula mappings must require an editable gate");

        AscetSetElementDependencyArguments restorationWrite = new AscetSetElementDependencyArguments
        {
            RequestedDependency = "independent",
            RestorationPolicy = "ascetDefault"
        };
        AssertTrue(
            AscetSetElementDependencyService.RequiresDependencyWrite(independent, restorationWrite),
            "data restoration must require an editable gate");
    }
    private static void TestBatchFastPathSkipsBatchGate()
    {
        CountingComponentWriteService componentWriter = new CountingComponentWriteService();
        BlockingBatchEditableWriteGate gate = new BlockingBatchEditableWriteGate();
        AscetBatchWriteExecutor executor = new AscetBatchWriteExecutor(
            componentWriter,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            gate);

        List<AscetBatchRequestItemDto> requests = new List<AscetBatchRequestItemDto>
        {
            new AscetBatchRequestItemDto
            {
                id = "create-first",
                operation = "create_component",
                args = new Dictionary<string, object>
                {
                    { "componentPath", "Demo\\CreatedFirst" },
                    { "kind", "class" }
                }
            },
            new AscetBatchRequestItemDto
            {
                id = "blocked-second",
                operation = "set_method_code",
                args = new Dictionary<string, object>
                {
                    { "componentPath", "Demo\\ReadOnly" },
                    { "methodName", "Main" },
                    { "code", "return;" }
                }
            }
        };

        IList<AscetBatchResultItemDto> results = executor.Execute(requests);

        AssertEqual(2, results.Count, "batch fast path should execute each item without a batch preflight gate.");
        AssertEqual(0, gate.Calls, "batch fast path must not open a batch editability session.");
        AssertEqual(1, componentWriter.ExecuteCalls, "batch fast path should dispatch the first write directly.");
    }

    private static void TestFailureMutationMetadata()
    {
        AssertTrue(
            AscetCliEnvelope.ResolveFailureMutationStarted(true, "editable_write_gate_blocked") == false,
            "editable gate must report mutationStarted=false");
        AssertTrue(
            AscetCliEnvelope.ResolveFailureMutationStarted(true, "write_failed") == null,
            "ordinary write failure must preserve unknown mutation state");
        AssertTrue(
            AscetCliEnvelope.ResolveFailureMutationStarted(false, "read_failed") == false,
            "non-mutating failure must report mutationStarted=false");
    }

    private sealed class BlockingBatchEditableWriteGate : IAscetBatchEditableWriteGate
    {
        public int Calls { get; private set; }
        public int LastRequestCount { get; private set; }

        public void RequireEditable(IList<AscetBatchRequestItemDto> requests)
        {
            Calls += 1;
            LastRequestCount = requests == null ? -1 : requests.Count;
            throw new AscetReadException(
                "editable_write_gate_blocked",
                "ascet_batch_write",
                "Component 'Demo\\ReadOnly' is not editable.");
        }
    }

    private sealed class CountingComponentWriteService : IExecComponentWriteService
    {
        public int ExecuteCalls { get; private set; }

        public CreateComponentWriteRequest ParseExecArguments(string[] args)
        {
            return new CreateComponentWriteRequest();
        }

        public AscetWriteExecutionResult Execute(CreateComponentWriteRequest request)
        {
            ExecuteCalls += 1;
                        return new AscetWriteExecutionResult
            {
                Succeeded = true,
                WriteSucceeded = true,
                Verification = new WriteVerificationResult { Succeeded = true }
            };
        }
    }

    private static void AssertTrue(bool condition, string message)
    {
        if (!condition) throw new Exception(message);
    }

    private static void AssertEqual(string expected, string actual, string message)
    {
        if (!String.Equals(expected, actual, StringComparison.Ordinal))
            throw new Exception(message + " expected '" + expected + "' but got '" + actual + "'.");
    }

    private static void AssertEqual(int expected, int actual, string message)
    {
        if (expected != actual)
            throw new Exception(message + " expected '" + expected + "' but got '" + actual + "'.");
    }
}
