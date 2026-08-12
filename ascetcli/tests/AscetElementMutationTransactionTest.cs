using System;
using System.Collections.Generic;

public static class AscetElementMutationTransactionTest
{
    public static int Main()
    {
        TestFourthFailureRollsBackFirstThreeInReverseOrder();
        TestRollbackFailureReturnsUnknownStatus();
        TestIncompleteSnapshotPreventsMutation();
        TestBatchFailureAfterMutationRollsBack();
        TestBatchRollbackFailureIsUnknown();
        TestBatchFailureBeforeMutationDoesNotRollback();
        TestScopedFailureInjectionRollsBackBatch();
        TestFailureInjectionRejectsNonFixtureTarget();
        TestInjectedRollbackFailureReturnsUnknown();
        Console.WriteLine("AscetElementMutationTransactionTest passed.");
        return 0;
    }

    private static void TestFourthFailureRollsBackFirstThreeInReverseOrder()
    {
        List<string> events = new List<string>();
        List<AscetElementMutationStage> stages = new List<AscetElementMutationStage>();
        for (int i = 1; i <= 4; i++)
        {
            int stage = i;
            stages.Add(new AscetElementMutationStage
            {
                ElementName = "E" + stage,
                Operation = "create",
                Apply = delegate
                {
                    events.Add("apply:" + stage);
                    if (stage == 4) throw new InvalidOperationException("injected failure");
                },
                Rollback = delegate { events.Add("rollback:" + stage); }
            });
        }
        AscetElementMutationTransactionResult result = new AscetElementMutationTransaction().Execute(
            new AscetElementMutationTransactionRequest
            {
                SnapshotComplete = true,
                Stages = stages,
                VerifyApplied = delegate { return true; },
                VerifyRestored = delegate { return true; }
            });
        Equal("rolled_back", result.Status, "transaction status");
        Equal("apply:1,apply:2,apply:3,apply:4,rollback:3,rollback:2,rollback:1", String.Join(",", events.ToArray()), "reverse rollback order");
        Equal(3, result.AppliedStages.Count, "applied stage count");
    }

    private static void TestRollbackFailureReturnsUnknownStatus()
    {
        AscetElementMutationTransactionResult result = new AscetElementMutationTransaction().Execute(
            new AscetElementMutationTransactionRequest
            {
                SnapshotComplete = true,
                Stages = new List<AscetElementMutationStage>
                {
                    new AscetElementMutationStage
                    {
                        ElementName = "E1",
                        Operation = "create",
                        Apply = delegate { },
                        Rollback = delegate { throw new InvalidOperationException("rollback failed"); }
                    },
                    new AscetElementMutationStage
                    {
                        ElementName = "E2",
                        Operation = "create",
                        Apply = delegate { throw new InvalidOperationException("apply failed"); },
                        Rollback = delegate { }
                    }
                },
                VerifyApplied = delegate { return true; },
                VerifyRestored = delegate { return false; }
            });
        Equal("rollback_failed", result.Status, "rollback failure status");
        Equal(2, result.RollbackErrors.Count, "rollback action and verification failures");
    }

    private static void TestIncompleteSnapshotPreventsMutation()
    {
        bool applied = false;
        try
        {
            new AscetElementMutationTransaction().Execute(new AscetElementMutationTransactionRequest
            {
                SnapshotComplete = false,
                Stages = new List<AscetElementMutationStage>
                {
                    new AscetElementMutationStage { ElementName = "E", Operation = "update", Apply = delegate { applied = true; }, Rollback = delegate { } }
                }
            });
        }
        catch (AscetReadException error)
        {
            Equal("mutation_snapshot_incomplete", error.Code, "snapshot error code");
            Equal(false, applied, "mutation must not start");
            return;
        }
        throw new InvalidOperationException("Expected mutation_snapshot_incomplete.");
    }

    private static void TestBatchFailureAfterMutationRollsBack()
    {
        List<string> events = new List<string>();
        try
        {
            new AscetElementMutationTransaction().ExecuteBatch(new AscetElementMutationBatchRequest<string>
            {
                SnapshotComplete = true,
                Apply = delegate(Action mutationStarting, Action mutationStageApplied)
                {
                    mutationStarting();
                    events.Add("apply:partial");
                    throw new InvalidOperationException("injected apply failure");
                },
                Rollback = delegate { events.Add("rollback"); },
                VerifyRestored = delegate
                {
                    events.Add("verify:restored");
                    return true;
                }
            });
        }
        catch (AscetReadException error)
        {
            Equal("element_transaction_rolled_back", error.Code, "batch rollback status");
            Equal("apply:partial,rollback,verify:restored", String.Join(",", events.ToArray()), "batch rollback order");
            return;
        }
        throw new InvalidOperationException("Expected element_transaction_rolled_back.");
    }

    private static void TestBatchRollbackFailureIsUnknown()
    {
        try
        {
            new AscetElementMutationTransaction().ExecuteBatch(new AscetElementMutationBatchRequest<string>
            {
                SnapshotComplete = true,
                Apply = delegate(Action mutationStarting, Action mutationStageApplied)
                {
                    mutationStarting();
                    throw new InvalidOperationException("injected apply failure");
                },
                Rollback = delegate { throw new InvalidOperationException("injected rollback failure"); },
                VerifyRestored = delegate { return false; }
            });
        }
        catch (AscetReadException error)
        {
            Equal("element_transaction_rollback_failed", error.Code, "batch rollback failure status");
            return;
        }
        throw new InvalidOperationException("Expected element_transaction_rollback_failed.");
    }

    private static void TestBatchFailureBeforeMutationDoesNotRollback()
    {
        bool rollbackCalled = false;
        try
        {
            new AscetElementMutationTransaction().ExecuteBatch(new AscetElementMutationBatchRequest<string>
            {
                SnapshotComplete = true,
                Apply = delegate(Action mutationStarting, Action mutationStageApplied)
                {
                    throw new AscetReadException("preflight_failed", "apply_element_spec", "failure before mutation");
                },
                Rollback = delegate { rollbackCalled = true; },
                VerifyRestored = delegate { return true; }
            });
        }
        catch (AscetReadException error)
        {
            Equal("preflight_failed", error.Code, "pre-mutation failure code");
            Equal(false, rollbackCalled, "pre-mutation failure must not rollback");
            return;
        }
        throw new InvalidOperationException("Expected preflight_failed.");
    }

    private static void TestScopedFailureInjectionRollsBackBatch()
    {
        WithFailureInjection("Sandbox\\Run", "1", false, delegate
        {
            List<string> events = new List<string>();
            try
            {
                new AscetElementMutationTransaction().ExecuteBatch(new AscetElementMutationBatchRequest<string>
                {
                    SnapshotComplete = true,
                    TargetPath = "Sandbox\\Run\\Component",
                    Apply = delegate(Action mutationStarting, Action mutationStageApplied)
                    {
                        mutationStarting();
                        events.Add("apply:1");
                        mutationStageApplied();
                        return "unexpected";
                    },
                    Rollback = delegate { events.Add("rollback"); },
                    VerifyRestored = delegate { return true; }
                });
            }
            catch (AscetReadException error)
            {
                Equal("element_transaction_rolled_back", error.Code, "injected batch rollback status");
                Equal("apply:1,rollback", String.Join(",", events.ToArray()), "injected batch rollback events");
                return;
            }
            throw new InvalidOperationException("Expected injected batch failure.");
        });
    }

    private static void TestFailureInjectionRejectsNonFixtureTarget()
    {
        WithFailureInjection("Sandbox\\Run", "1", false, delegate
        {
            bool applied = false;
            try
            {
                new AscetElementMutationTransaction().Execute(new AscetElementMutationTransactionRequest
                {
                    SnapshotComplete = true,
                    TargetPath = "Shared\\Component",
                    Stages = new List<AscetElementMutationStage>
                    {
                        new AscetElementMutationStage { ElementName = "E", Operation = "create", Apply = delegate { applied = true; }, Rollback = delegate { } }
                    }
                });
            }
            catch (AscetReadException error)
            {
                Equal("failure_injection_scope_invalid", error.Code, "fixture scope error");
                Equal(false, applied, "out-of-fixture mutation must not start");
                return;
            }
            throw new InvalidOperationException("Expected failure_injection_scope_invalid.");
        });
    }

    private static void TestInjectedRollbackFailureReturnsUnknown()
    {
        WithFailureInjection("Sandbox\\Run", "1", true, delegate
        {
            bool rollbackCalled = false;
            AscetElementMutationTransactionResult result = new AscetElementMutationTransaction().Execute(
                new AscetElementMutationTransactionRequest
                {
                    SnapshotComplete = true,
                    TargetPath = "Sandbox\\Run\\Component",
                    Stages = new List<AscetElementMutationStage>
                    {
                        new AscetElementMutationStage { ElementName = "E", Operation = "create", Apply = delegate { }, Rollback = delegate { rollbackCalled = true; } }
                    },
                    VerifyRestored = delegate { return false; }
                });
            Equal("rollback_failed", result.Status, "injected rollback failure status");
            Equal(false, rollbackCalled, "rollback delegate must not run after injected rollback failure");
        });
    }

    private static void WithFailureInjection(string fixtureRoot, string failAfterStage, bool failDuringRollback, Action action)
    {
        string[] names = new string[]
        {
            "PI_ASCET_ENABLE_LIVE_FAILURE_INJECTION",
            "PI_ASCET_RUN_ID",
            "PI_ASCET_FIXTURE_ROOT",
            "PI_ASCET_WRITE_CLASS",
            "ASCET_ELEMENT_TX_FAIL_AFTER_STAGE",
            "ASCET_ELEMENT_TX_FAIL_DURING_ROLLBACK"
        };
        string[] previous = new string[names.Length];
        for (int i = 0; i < names.Length; i++) previous[i] = Environment.GetEnvironmentVariable(names[i]);
        try
        {
            Environment.SetEnvironmentVariable("PI_ASCET_ENABLE_LIVE_FAILURE_INJECTION", "1");
            Environment.SetEnvironmentVariable("PI_ASCET_RUN_ID", "TEST_RUN");
            Environment.SetEnvironmentVariable("PI_ASCET_FIXTURE_ROOT", fixtureRoot);
            Environment.SetEnvironmentVariable("PI_ASCET_WRITE_CLASS", "isolated_fixture");
            Environment.SetEnvironmentVariable("ASCET_ELEMENT_TX_FAIL_AFTER_STAGE", failAfterStage);
            Environment.SetEnvironmentVariable("ASCET_ELEMENT_TX_FAIL_DURING_ROLLBACK", failDuringRollback ? "1" : "0");
            action();
        }
        finally
        {
            for (int i = 0; i < names.Length; i++) Environment.SetEnvironmentVariable(names[i], previous[i]);
        }
    }
    private static void Equal(object expected, object actual, string message)
    {
        if (!Object.Equals(expected, actual)) throw new InvalidOperationException(message + ": expected=" + expected + ", actual=" + actual);
    }
}