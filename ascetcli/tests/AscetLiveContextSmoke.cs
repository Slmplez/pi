using System;
using System.Collections.Generic;
using System.Threading;

public static class AscetLiveContextSmoke
{
    public static int Main()
    {
        try
        {
            AscetToolApiBootstrap.ConfigureAssemblyResolution();
            RunDeterministicSemantics();
            RunRefreshPolicyBoundaries();
            RunOptionalLiveProbe();
            Console.WriteLine("AscetLiveContextSmoke passed.");
            return 0;
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine(ex.Message);
            return 1;
        }
    }

    private static void RunDeterministicSemantics()
    {
        Console.WriteLine("STEP deterministic_semantics");

        FakeLiveSessionAdapter firstAdapter = new FakeLiveSessionAdapter(
            "session-1",
            "tool-1",
            "db-1",
            CreateDatabaseRef("Tutorial", @"d:\fake\Tutorial"),
            true);
        firstAdapter.EnqueueCapture(
            "session-1",
            "tool-1",
            "db-1",
            CreateDatabaseRef("Tutorial", @"d:\fake\Tutorial"));
        firstAdapter.EnqueueCapture(
            "session-1",
            "tool-1",
            "db-1",
            CreateDatabaseRef("Tutorial", @"d:\fake\Tutorial"));
        firstAdapter.EnqueueCapture(
            "session-1",
            "tool-1",
            "db-2",
            CreateDatabaseRef("Tutorial-Rebound", @"d:\fake\Tutorial-Rebound"));

        FakeLiveSessionAdapter secondAdapter = new FakeLiveSessionAdapter(
            "session-2",
            "tool-2",
            "db-3",
            CreateDatabaseRef("Tutorial-Refreshed", @"d:\fake\Tutorial-Refreshed"),
            false);

        Queue<IAscetLiveSessionAdapter> openerQueue = new Queue<IAscetLiveSessionAdapter>();
        openerQueue.Enqueue(firstAdapter);
        openerQueue.Enqueue(secondAdapter);

        AscetLiveContext context = new AscetLiveContextFactory().Create(
            new AscetSessionRefreshPolicy(),
            delegate(string operation)
            {
                if (openerQueue.Count == 0)
                {
                    throw new Exception("No fake adapter available for operation " + operation + ".");
                }

                return openerQueue.Dequeue();
            });

        try
        {
            AscetLiveContextSnapshot initialSnapshot = context.GetSnapshot();
            AssertEqual(1, initialSnapshot.SessionGeneration, "Initial snapshot should start at SessionGeneration=1.");
            AssertEqual(1, initialSnapshot.DatabaseBindingGeneration, "Initial snapshot should start at DatabaseBindingGeneration=1.");
            AssertTrue(initialSnapshot.HasSessionHandle, "Initial snapshot should report a session handle.");
            AssertTrue(initialSnapshot.HasToolHandle, "Initial snapshot should report a tool handle.");
            AssertTrue(initialSnapshot.HasDatabaseHandle, "Initial snapshot should report a database handle.");
            AssertEqual("Tutorial", initialSnapshot.DatabaseRef.Name, "Initial snapshot should expose the database name.");
            AssertTrue(context.IsSnapshotCurrent(initialSnapshot), "Initial snapshot should be current.");

            bool changedWithoutMutation = context.EnsureCurrentDatabaseBinding();
            AssertTrue(!changedWithoutMutation, "EnsureCurrentDatabaseBinding should stay stable when binding does not change.");
            AssertTrue(context.IsSnapshotCurrent(initialSnapshot), "Initial snapshot should remain current after stable ensure.");

            bool rebound = context.RebindCurrentDatabaseBinding();
            AssertTrue(rebound, "Explicit rebind should report a binding change.");

            AscetLiveContextSnapshot reboundSnapshot = context.GetSnapshot();
            AssertEqual(1, reboundSnapshot.SessionGeneration, "Rebind should preserve SessionGeneration.");
            AssertEqual(2, reboundSnapshot.DatabaseBindingGeneration, "Rebind should advance DatabaseBindingGeneration.");
            AssertTrue(reboundSnapshot.HasSessionHandle, "Rebind should keep reporting a session handle.");
            AssertTrue(reboundSnapshot.HasDatabaseHandle, "Rebind should keep reporting a database handle.");
            AssertEqual("Tutorial-Rebound", reboundSnapshot.DatabaseRef.Name, "Rebind should expose the rebound database name.");
            AssertTrue(!context.IsSnapshotCurrent(initialSnapshot), "Initial snapshot should become stale after rebind.");
            AssertTrue(context.IsSnapshotCurrent(reboundSnapshot), "Rebound snapshot should be current.");

            context.RefreshSession("deterministic_refresh");
            AscetLiveContextSnapshot refreshedSnapshot = context.GetSnapshot();
            AssertEqual(2, refreshedSnapshot.SessionGeneration, "Refresh should advance SessionGeneration.");
            AssertEqual(3, refreshedSnapshot.DatabaseBindingGeneration, "Refresh should also advance DatabaseBindingGeneration.");
            AssertTrue(refreshedSnapshot.HasSessionHandle, "Refresh should still report a session handle.");
            AssertEqual("Tutorial-Refreshed", refreshedSnapshot.DatabaseRef.Name, "Refresh should swap to the replacement database binding.");
            AssertTrue(!context.IsSnapshotCurrent(reboundSnapshot), "Rebound snapshot should become stale after refresh.");
            AssertTrue(context.IsSnapshotCurrent(refreshedSnapshot), "Refreshed snapshot should be current.");
            AssertTrue(
                !String.IsNullOrWhiteSpace(context.LastDiagnosticMessage),
                "Dispose diagnostics should be captured when the replaced session teardown fails.");

            context.Dispose();
            AssertTrue(!context.IsSnapshotCurrent(refreshedSnapshot), "Disposed context should invalidate prior snapshots.");
            AssertThrowsObjectDisposed(
                delegate()
                {
                    context.GetSnapshot();
                },
                "GetSnapshot should fail predictably after dispose.");
            AssertThrowsObjectDisposed(
                delegate()
                {
                    context.RefreshSession("after_dispose");
                },
                "RefreshSession should fail predictably after dispose.");
            context.Dispose();
        }
        finally
        {
            context.Dispose();
        }

        FakeLiveSessionAdapter stableAdapter = new FakeLiveSessionAdapter(
            "stable-session",
            "stable-tool",
            "stable-db",
            CreateDatabaseRef("Stable", @"d:\fake\Stable"),
            false);
        FailingLiveSessionAdapter failingRefreshAdapter = new FailingLiveSessionAdapter(
            new AscetReadException("database_binding_invalid", "refresh_failure", "Simulated refresh failure."));

        Queue<IAscetLiveSessionAdapter> failingRefreshQueue = new Queue<IAscetLiveSessionAdapter>();
        failingRefreshQueue.Enqueue(stableAdapter);
        failingRefreshQueue.Enqueue(failingRefreshAdapter);

        AscetLiveContext failureContext = new AscetLiveContextFactory().Create(
            new AscetSessionRefreshPolicy(),
            delegate(string operation)
            {
                if (failingRefreshQueue.Count == 0)
                {
                    throw new Exception("No fake adapter available for failure-path operation " + operation + ".");
                }

                return failingRefreshQueue.Dequeue();
            });

        try
        {
            AscetLiveContextSnapshot beforeFailedRefresh = failureContext.GetSnapshot();

            try
            {
                failureContext.RefreshSession("refresh_should_fail");
                throw new Exception("RefreshSession should surface replacement-session open failures.");
            }
            catch (AscetReadException ex)
            {
                AssertEqual("database_binding_invalid", ex.Code, "Failed refresh should preserve the original exception code.");
            }

            AssertTrue(failureContext.IsSnapshotCurrent(beforeFailedRefresh), "Failed refresh should leave the old snapshot current.");
            AscetLiveContextSnapshot afterFailedRefresh = failureContext.GetSnapshot();
            AssertEqual(beforeFailedRefresh.SessionGeneration, afterFailedRefresh.SessionGeneration, "Failed refresh should not advance SessionGeneration.");
            AssertEqual(beforeFailedRefresh.DatabaseBindingGeneration, afterFailedRefresh.DatabaseBindingGeneration, "Failed refresh should not advance DatabaseBindingGeneration.");
        }
        finally
        {
            failureContext.Dispose();
        }
    }

    private static void RunRefreshPolicyBoundaries()
    {
        Console.WriteLine("STEP refresh_policy_boundaries");

        AscetSessionRefreshPolicy policy = new AscetSessionRefreshPolicy();
        AssertTrue(
            !policy.ShouldRefreshSession(new AscetReadException("database_not_open", "policy_database_not_open", "Database is not open.")),
            "database_not_open should not trigger refresh by default.");
        AssertTrue(
            !policy.ShouldRefreshSession(new InvalidOperationException("unexpected_failure")),
            "Unexpected non-ASCET failures should not trigger refresh by default.");

        AssertNoRefreshOnFailure(
            "database_not_open",
            new AscetReadException("database_not_open", "ensure_database_not_open", "Database is not open."),
            delegate(Exception ex)
            {
                AscetReadException ascet = ex as AscetReadException;
                AssertTrue(ascet != null, "database_not_open case should surface an AscetReadException.");
                AssertEqual("database_not_open", ascet.Code, "database_not_open case should preserve the original error code.");
            });

        AssertNoRefreshOnFailure(
            "unexpected_failure",
            new InvalidOperationException("unexpected_failure"),
            delegate(Exception ex)
            {
                InvalidOperationException invalid = ex as InvalidOperationException;
                AssertTrue(invalid != null, "Unexpected-failure case should surface the original InvalidOperationException.");
                AssertEqual("unexpected_failure", invalid.Message, "Unexpected-failure case should preserve the original exception.");
            });
    }

    private static void AssertNoRefreshOnFailure(string scenarioName, Exception captureException, Action<Exception> assertException)
    {
        FakeLiveSessionAdapter primaryAdapter = new FakeLiveSessionAdapter(
            "policy-session-" + scenarioName,
            "policy-tool-" + scenarioName,
            "policy-db-" + scenarioName,
            CreateDatabaseRef("Tutorial", @"d:\fake\Tutorial"),
            false);
        primaryAdapter.EnqueueCapture(
            "policy-session-" + scenarioName,
            "policy-tool-" + scenarioName,
            "policy-db-" + scenarioName,
            CreateDatabaseRef("Tutorial", @"d:\fake\Tutorial"));
        primaryAdapter.EnqueueException(captureException);

        FakeLiveSessionAdapter replacementAdapter = new FakeLiveSessionAdapter(
            "replacement-session-" + scenarioName,
            "replacement-tool-" + scenarioName,
            "replacement-db-" + scenarioName,
            CreateDatabaseRef("Replacement", @"d:\fake\Replacement"),
            false);

        Queue<IAscetLiveSessionAdapter> openerQueue = new Queue<IAscetLiveSessionAdapter>();
        openerQueue.Enqueue(primaryAdapter);
        openerQueue.Enqueue(replacementAdapter);

        AscetLiveContext context = new AscetLiveContextFactory().Create(
            new AscetSessionRefreshPolicy(),
            delegate(string operation)
            {
                if (openerQueue.Count == 0)
                {
                    throw new Exception("No fake adapter available for refresh-policy scenario " + scenarioName + " (" + operation + ").");
                }

                return openerQueue.Dequeue();
            });

        try
        {
            AscetLiveContextSnapshot beforeFailure = context.GetSnapshot();

            try
            {
                context.EnsureCurrentDatabaseBinding();
                throw new Exception("Scenario '" + scenarioName + "' should have surfaced the capture failure.");
            }
            catch (Exception ex)
            {
                assertException(ex);
            }

            AscetLiveContextSnapshot afterFailure = context.GetSnapshot();
            AssertTrue(context.IsSnapshotCurrent(beforeFailure), "Scenario '" + scenarioName + "' should leave the original snapshot current.");
            AssertEqual(beforeFailure.SessionGeneration, afterFailure.SessionGeneration, "Scenario '" + scenarioName + "' should not advance SessionGeneration.");
            AssertEqual(beforeFailure.DatabaseBindingGeneration, afterFailure.DatabaseBindingGeneration, "Scenario '" + scenarioName + "' should not advance DatabaseBindingGeneration.");
            AssertEqual(1, openerQueue.Count, "Scenario '" + scenarioName + "' should not consume the replacement adapter.");
        }
        finally
        {
            context.Dispose();
        }
    }

    private static void RunOptionalLiveProbe()
    {
        Console.WriteLine("STEP optional_live_probe");

        Exception probeFailure = null;
        bool completed = RunWithTimeout(
            delegate()
            {
                RunLiveProbeCore();
            },
            10000,
            out probeFailure);

        if (!completed)
        {
            Console.WriteLine("LIVE probe skipped: timed out while probing current ASCET GUI/database state.");
            return;
        }

        if (probeFailure == null)
        {
            return;
        }

        AscetReadException readFailure = probeFailure as AscetReadException;
        if (readFailure != null && String.Equals(readFailure.Code, "database_not_open", StringComparison.Ordinal))
        {
            Console.WriteLine("LIVE probe skipped: " + readFailure.Message);
            return;
        }

        throw probeFailure;
    }

    private static void RunLiveProbeCore()
    {
        AscetLiveContext liveContext = null;
        try
        {
            liveContext = new AscetLiveContextFactory().Create(new AscetSessionRefreshPolicy());
            AscetLiveContextSnapshot snapshot = liveContext.GetSnapshot();
            AssertTrue(snapshot.HasSessionHandle, "Live probe should report a session handle.");
            AssertTrue(snapshot.HasToolHandle, "Live probe should report a tool handle.");
            AssertTrue(snapshot.HasDatabaseHandle, "Live probe should report a database handle.");
            AssertTrue(snapshot.DatabaseRef != null, "Live probe should expose a database reference.");

            bool changed = liveContext.EnsureCurrentDatabaseBinding();
            AssertTrue(!changed, "Stable live binding should not change during the probe.");
            AssertTrue(liveContext.IsSnapshotCurrent(snapshot), "Live snapshot should remain current after stable ensure.");
        }
        finally
        {
            if (liveContext != null)
            {
                liveContext.Dispose();
            }
        }
    }

    private static bool RunWithTimeout(ThreadStart action, int timeoutMs, out Exception failure)
    {
        Exception captured = null;
        Thread worker = new Thread(
            delegate()
            {
                try
                {
                    action();
                }
                catch (Exception ex)
                {
                    captured = ex;
                }
            });
        worker.IsBackground = true;
        worker.Start();

        bool completed = worker.Join(timeoutMs);
        failure = captured;
        return completed;
    }

    private static AscetDatabaseRef CreateDatabaseRef(string name, string path)
    {
        AscetDatabaseRef reference = new AscetDatabaseRef();
        reference.Name = name;
        reference.Path = path;
        return reference;
    }

    private static void AssertThrowsObjectDisposed(Action action, string message)
    {
        try
        {
            action();
            throw new Exception(message);
        }
        catch (ObjectDisposedException)
        {
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
        if (!String.Equals(expected, actual, StringComparison.Ordinal))
        {
            throw new Exception(message + " Expected '" + expected + "' but got '" + actual + "'.");
        }
    }

    private static void AssertTrue(bool condition, string message)
    {
        if (!condition)
        {
            throw new Exception(message);
        }
    }

    private sealed class FakeLiveSessionAdapter : IAscetLiveSessionAdapter
    {
        private readonly Queue<object> _captureQueue;
        private readonly object _fallbackSessionHandle;
        private readonly object _fallbackToolHandle;
        private readonly object _fallbackDatabaseHandle;
        private readonly AscetDatabaseRef _fallbackDatabaseRef;
        private readonly bool _throwOnDispose;
        private bool _disposed;

        public FakeLiveSessionAdapter(
            object sessionHandle,
            object toolHandle,
            object databaseHandle,
            AscetDatabaseRef databaseRef,
            bool throwOnDispose)
        {
            _captureQueue = new Queue<object>();
            _fallbackSessionHandle = sessionHandle;
            _fallbackToolHandle = toolHandle;
            _fallbackDatabaseHandle = databaseHandle;
            _fallbackDatabaseRef = databaseRef;
            _throwOnDispose = throwOnDispose;
        }

        public void EnqueueCapture(object sessionHandle, object toolHandle, object databaseHandle, AscetDatabaseRef databaseRef)
        {
            _captureQueue.Enqueue(new AscetLiveBindingSnapshot(sessionHandle, toolHandle, databaseHandle, databaseRef));
        }

        public void EnqueueException(Exception ex)
        {
            _captureQueue.Enqueue(ex);
        }

        public AscetLiveBindingSnapshot CaptureBinding(string operation)
        {
            if (_disposed)
            {
                throw new ObjectDisposedException("FakeLiveSessionAdapter");
            }

            if (_captureQueue.Count > 0)
            {
                object queued = _captureQueue.Dequeue();
                Exception queuedException = queued as Exception;
                if (queuedException != null)
                {
                    throw queuedException;
                }

                return (AscetLiveBindingSnapshot)queued;
            }

            return new AscetLiveBindingSnapshot(_fallbackSessionHandle, _fallbackToolHandle, _fallbackDatabaseHandle, _fallbackDatabaseRef);
        }

        public void Dispose()
        {
            _disposed = true;
            if (_throwOnDispose)
            {
                throw new InvalidOperationException("fake_dispose_failure");
            }
        }
    }

    private sealed class FailingLiveSessionAdapter : IAscetLiveSessionAdapter
    {
        private readonly Exception _captureException;

        public FailingLiveSessionAdapter(Exception captureException)
        {
            _captureException = captureException;
        }

        public AscetLiveBindingSnapshot CaptureBinding(string operation)
        {
            throw _captureException;
        }

        public void Dispose()
        {
        }
    }
}
