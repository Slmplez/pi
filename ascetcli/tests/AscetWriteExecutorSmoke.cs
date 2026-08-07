using System;
using System.Collections.Generic;
using System.Threading;

public static class AscetWriteExecutorSmoke
{
    public static int Main()
    {
        try
        {
            TestSerialWriteExecutionOrder();
            TestVerificationHookInvocation();
            TestVerificationFailureInfluencesResult();
            TestVerificationPartialErrorNormalization();
            TestStructuredWriteErrorPropagation();

            Console.WriteLine("AscetWriteExecutorSmoke passed.");
            return 0;
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine(ex.Message);
            return 1;
        }
    }

    private static void TestSerialWriteExecutionOrder()
    {
        AscetWriteExecutor executor = new AscetWriteExecutor(new WriteVerificationService());
        List<string> events = new List<string>();
        object sync = new object();
        ManualResetEventSlim firstStarted = new ManualResetEventSlim(false);
        ManualResetEventSlim releaseFirst = new ManualResetEventSlim(false);
        ManualResetEventSlim secondStarted = new ManualResetEventSlim(false);
        AscetWriteExecutionResult firstResult = null;
        AscetWriteExecutionResult secondResult = null;

        Thread firstThread = new Thread(delegate()
        {
            firstResult = executor.Execute(new AscetWriteRequest
            {
                OperationName = "first_write",
                ExecuteWrite = delegate(AscetWriteContext context)
                {
                    lock (sync)
                    {
                        events.Add("first:start");
                    }

                    firstStarted.Set();
                    if (!releaseFirst.Wait(2000))
                    {
                        throw new Exception("Timed out waiting to release the first write.");
                    }

                    lock (sync)
                    {
                        events.Add("first:end");
                    }

                    AscetWriteActionResult result = new AscetWriteActionResult();
                    result.Summary = "first";
                    result.Payload["name"] = "first";
                    return result;
                }
            });
        });

        Thread secondThread = new Thread(delegate()
        {
            secondResult = executor.Execute(new AscetWriteRequest
            {
                OperationName = "second_write",
                ExecuteWrite = delegate(AscetWriteContext context)
                {
                    lock (sync)
                    {
                        events.Add("second:start");
                    }

                    secondStarted.Set();

                    lock (sync)
                    {
                        events.Add("second:end");
                    }

                    AscetWriteActionResult result = new AscetWriteActionResult();
                    result.Summary = "second";
                    result.Payload["name"] = "second";
                    return result;
                }
            });
        });

        firstThread.Start();
        AssertTrue(firstStarted.Wait(1000), "First write should start.");

        secondThread.Start();
        AssertTrue(!secondStarted.Wait(200), "Second write should not start before the first write completes.");

        releaseFirst.Set();

        firstThread.Join();
        secondThread.Join();

        AssertTrue(secondStarted.IsSet, "Second write should start after the first write completes.");
        AssertEqual(4, events.Count, "Serial execution should capture a deterministic event count.");
        AssertEqual("first:start", events[0], "First write should start first.");
        AssertEqual("first:end", events[1], "First write should finish before the second starts.");
        AssertEqual("second:start", events[2], "Second write should start after the first finishes.");
        AssertEqual("second:end", events[3], "Second write should finish last.");
        AssertEqual(1L, firstResult.SequenceNumber, "First write should receive sequence number 1.");
        AssertEqual(2L, secondResult.SequenceNumber, "Second write should receive sequence number 2.");
        AssertTrue(firstResult.Succeeded, "First write should succeed.");
        AssertTrue(secondResult.Succeeded, "Second write should succeed.");
    }

    private static void TestVerificationHookInvocation()
    {
        RecordingVerificationHook hook = new RecordingVerificationHook();
        AscetWriteExecutor executor = new AscetWriteExecutor(new WriteVerificationService(hook));

        AscetWriteExecutionResult result = executor.Execute(new AscetWriteRequest
        {
            OperationName = "verify_success",
            VerifyAfterWrite = true,
            ExecuteWrite = delegate(AscetWriteContext context)
            {
                AscetWriteActionResult writeResult = new AscetWriteActionResult();
                writeResult.Summary = "write-complete";
                writeResult.Payload["componentPath"] = "Demo\\Component";
                return writeResult;
            }
        });

        AssertTrue(result.Succeeded, "Verification success should keep the write successful.");
        AssertTrue(result.Verification != null, "Verification details should be captured.");
        AssertTrue(result.Verification.Requested, "Verification should be marked requested.");
        AssertTrue(result.Verification.Attempted, "Verification hook should be invoked.");
        AssertTrue(result.Verification.Succeeded, "Verification hook should report success.");
        AssertEqual(1, hook.InvocationCount, "Verification hook should be called once.");
        AssertEqual("verify:Demo\\Component", result.Verification.Summary, "Verification summary should come from the hook.");
    }

    private static void TestVerificationFailureInfluencesResult()
    {
        AscetWriteExecutor executor = new AscetWriteExecutor(
            new WriteVerificationService(
                new DelegateVerificationHook(delegate(WriteVerificationRequest request)
                {
                    return WriteVerificationResult.CreateFailure(
                        "verification_failed",
                        request == null ? String.Empty : request.OperationName,
                        "Readback mismatch detected.");
                })));

        AscetWriteExecutionResult result = executor.Execute(new AscetWriteRequest
        {
            OperationName = "verify_failure",
            VerifyAfterWrite = true,
            ExecuteWrite = delegate(AscetWriteContext context)
            {
                AscetWriteActionResult writeResult = new AscetWriteActionResult();
                writeResult.Summary = "write-complete";
                return writeResult;
            }
        });

        AssertTrue(!result.Succeeded, "Verification failure should fail the overall result.");
        AssertTrue(result.WriteSucceeded, "Write should still be marked successful before verification fails.");
        AssertTrue(result.Verification != null && result.Verification.Attempted, "Verification should be attempted.");
        AssertTrue(result.Verification != null && !result.Verification.Succeeded, "Verification should be marked failed.");
        AssertTrue(result.Error != null, "Verification failure should surface a structured error.");
        AssertEqual("verification_failed", result.Error.Code, "Verification error code should be preserved.");
        AssertEqual("verify", result.Error.Stage, "Verification failures should be tagged with the verify stage.");
        AssertEqual("Readback mismatch detected.", result.Error.Message, "Verification error message should be preserved.");
    }

    private static void TestStructuredWriteErrorPropagation()
    {
        AscetWriteExecutor executor = new AscetWriteExecutor(new WriteVerificationService());

        AscetWriteExecutionResult result = executor.Execute(new AscetWriteRequest
        {
            OperationName = "explode",
            ExecuteWrite = delegate(AscetWriteContext context)
            {
                throw new InvalidOperationException("boom");
            }
        });

        AssertTrue(!result.Succeeded, "Write exceptions should fail the result.");
        AssertTrue(!result.WriteSucceeded, "Write exceptions should report write failure.");
        AssertTrue(result.Error != null, "Write exceptions should surface a structured error.");
        AssertEqual("write_failed", result.Error.Code, "Write exceptions should map to write_failed.");
        AssertEqual("explode", result.Error.Operation, "Structured errors should preserve the operation name.");
        AssertEqual("write", result.Error.Stage, "Write exceptions should be tagged with the write stage.");
        AssertEqual("System.InvalidOperationException", result.Error.ExceptionType, "Exception type should be preserved.");
        AssertTrue(result.Error.Message.IndexOf("boom", StringComparison.Ordinal) >= 0, "Exception message should be preserved.");
    }

    private static void TestVerificationPartialErrorNormalization()
    {
        AscetWriteExecutor executor = new AscetWriteExecutor(
            new WriteVerificationService(
                new DelegateVerificationHook(delegate(WriteVerificationRequest request)
                {
                    WriteVerificationResult verificationResult = new WriteVerificationResult();
                    verificationResult.Requested = true;
                    verificationResult.Attempted = true;
                    verificationResult.Succeeded = false;
                    verificationResult.Summary = "summary-fallback";
                    verificationResult.Error = new AscetWriteError();
                    return verificationResult;
                })));

        AscetWriteExecutionResult result = executor.Execute(new AscetWriteRequest
        {
            OperationName = "partial_error",
            VerifyAfterWrite = true,
            ExecuteWrite = delegate(AscetWriteContext context)
            {
                AscetWriteActionResult writeResult = new AscetWriteActionResult();
                writeResult.Summary = "write-complete";
                return writeResult;
            }
        });

        AssertTrue(!result.Succeeded, "Partial verification errors should still fail the write result.");
        AssertTrue(result.Error != null, "Partial verification errors should surface a structured error.");
        AssertEqual("verification_failed", result.Error.Code, "Partial verification errors should default code.");
        AssertEqual("partial_error", result.Error.Operation, "Partial verification errors should default operation.");
        AssertEqual("verify", result.Error.Stage, "Partial verification errors should default stage.");
        AssertEqual("summary-fallback", result.Error.Message, "Partial verification errors should default message from summary.");
    }

    private static void AssertTrue(bool condition, string message)
    {
        if (!condition)
        {
            throw new Exception(message);
        }
    }

    private static void AssertEqual(string expected, string actual, string message)
    {
        if (!String.Equals(expected ?? String.Empty, actual ?? String.Empty, StringComparison.Ordinal))
        {
            throw new Exception(message + " Expected '" + expected + "' but got '" + actual + "'.");
        }
    }

    private static void AssertEqual(int expected, int actual, string message)
    {
        if (expected != actual)
        {
            throw new Exception(message + " Expected '" + expected + "' but got '" + actual + "'.");
        }
    }

    private static void AssertEqual(long expected, long actual, string message)
    {
        if (expected != actual)
        {
            throw new Exception(message + " Expected '" + expected + "' but got '" + actual + "'.");
        }
    }

    private sealed class RecordingVerificationHook : IWriteVerificationHook
    {
        public int InvocationCount { get; private set; }

        public WriteVerificationResult Verify(WriteVerificationRequest request)
        {
            InvocationCount++;
            string componentPath = String.Empty;
            if (request != null && request.WriteResult != null && request.WriteResult.Payload.ContainsKey("componentPath"))
            {
                componentPath = Convert.ToString(request.WriteResult.Payload["componentPath"]) ?? String.Empty;
            }

            return WriteVerificationResult.CreateSuccess("verify:" + componentPath);
        }
    }

    private sealed class DelegateVerificationHook : IWriteVerificationHook
    {
        private readonly Func<WriteVerificationRequest, WriteVerificationResult> callback;

        public DelegateVerificationHook(Func<WriteVerificationRequest, WriteVerificationResult> callback)
        {
            this.callback = callback;
        }

        public WriteVerificationResult Verify(WriteVerificationRequest request)
        {
            return callback == null ? WriteVerificationResult.CreateSuccess("ok") : callback(request);
        }
    }
}
