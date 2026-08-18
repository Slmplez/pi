using System;
using System.Collections.Generic;

public sealed class AscetWriteRequest
{
    public AscetWriteRequest()
    {
        OperationName = String.Empty;
        VerifyAfterWrite = false;
        Metadata = new Dictionary<string, object>(StringComparer.Ordinal);
        ExecuteWrite = null;
    }

    public string OperationName { get; set; }
    public bool VerifyAfterWrite { get; set; }
    public Dictionary<string, object> Metadata { get; set; }
    public Func<AscetWriteContext, AscetWriteActionResult> ExecuteWrite { get; set; }
}

public sealed class AscetWriteContext
{
    public AscetWriteContext()
    {
        OperationName = String.Empty;
        SequenceNumber = 0;
        Metadata = new Dictionary<string, object>(StringComparer.Ordinal);
    }

    public string OperationName { get; set; }
    public long SequenceNumber { get; set; }
    public Dictionary<string, object> Metadata { get; set; }
}

public sealed class AscetWriteActionResult
{
    public AscetWriteActionResult()
    {
        Summary = String.Empty;
        Payload = new Dictionary<string, object>(StringComparer.Ordinal);
        Verification = null;
    }

    public string Summary { get; set; }
    public Dictionary<string, object> Payload { get; set; }
    public WriteVerificationResult Verification { get; set; }
}

public sealed class AscetWriteError
{
    public AscetWriteError()
    {
        Code = String.Empty;
        Operation = String.Empty;
        Stage = String.Empty;
        Message = String.Empty;
        ExceptionType = String.Empty;
        Details = new Dictionary<string, object>(StringComparer.Ordinal);
    }

    public string Code { get; set; }
    public string Operation { get; set; }
    public string Stage { get; set; }
    public string Message { get; set; }
    public string ExceptionType { get; set; }
    public Dictionary<string, object> Details { get; set; }
}

public sealed class AscetWriteExecutionResult
{
    public AscetWriteExecutionResult()
    {
        OperationName = String.Empty;
        SequenceNumber = 0;
        Succeeded = false;
        WriteSucceeded = false;
        Summary = String.Empty;
        Payload = new Dictionary<string, object>(StringComparer.Ordinal);
        Verification = new WriteVerificationResult();
        Error = null;
    }

    public string OperationName { get; set; }
    public long SequenceNumber { get; set; }
    public bool Succeeded { get; set; }
    public bool WriteSucceeded { get; set; }
    public string Summary { get; set; }
    public Dictionary<string, object> Payload { get; set; }
    public WriteVerificationResult Verification { get; set; }
    public AscetWriteError Error { get; set; }
}

public sealed class AscetCodeWriteTransactionResult
{
    public AscetCodeWriteTransactionResult()
    {
        OperationName = String.Empty;
        PreviousValue = String.Empty;
        NewValue = String.Empty;
        MutationStatus = "not_started";
        SaveState = "not_required";
        VerificationStatus = "not_requested";
        VerificationMode = String.Empty;
        SessionCount = 1;
        SaveCount = 0;
        EditableRetryCount = 0;
        NativeMutationAttemptCount = 0;
    }

    public string OperationName { get; set; }
    public string PreviousValue { get; set; }
    public string NewValue { get; set; }
    public bool Changed { get; set; }
    public string MutationStatus { get; set; }
    public bool SaveAttempted { get; set; }
    public bool SaveSucceeded { get; set; }
    public string SaveState { get; set; }
    public bool Verified { get; set; }
    public string VerificationStatus { get; set; }
    public string VerificationMode { get; set; }
    public int SessionCount { get; set; }
    public int SaveCount { get; set; }
    public int EditableRetryCount { get; set; }
    public int NativeMutationAttemptCount { get; set; }
}

public static class AscetCodeWriteTransaction
{
    public static AscetCodeWriteTransactionResult Execute(
        string operationName,
        string previousValue,
        string requestedValue,
        bool verifyReadback,
        Func<bool> mutate,
        Func<bool> save,
        Func<string> readback)
    {
        string operation = operationName ?? String.Empty;
        string previous = previousValue ?? String.Empty;
        string requested = requestedValue ?? String.Empty;
        if (mutate == null)
        {
            throw new ArgumentNullException("mutate");
        }
        if (save == null)
        {
            throw new ArgumentNullException("save");
        }
        if (readback == null)
        {
            throw new ArgumentNullException("readback");
        }

        bool changed = !String.Equals(previous, requested, StringComparison.Ordinal);
        AscetCodeWriteTransactionResult result = new AscetCodeWriteTransactionResult
        {
            OperationName = operation,
            PreviousValue = previous,
            NewValue = requested,
            Changed = changed,
            MutationStatus = changed ? "applied" : "no_op",
            SaveAttempted = changed,
            SaveState = changed ? "unknown" : "not_required",
            NativeMutationAttemptCount = changed ? 1 : 0
        };

        if (changed)
        {
            if (!mutate())
            {
                throw new AscetReadException("set_code_failed", operation, "ASCET returned false while writing code.");
            }

            result.SaveSucceeded = save();
            if (!result.SaveSucceeded)
            {
                result.SaveState = "failed";
                throw new AscetReadException("save_failed", operation, "ASCET database Save returned false after writing code.");
            }

            result.SaveState = "saved";
            result.SaveCount = 1;
        }

        if (verifyReadback)
        {
            string actual = readback() ?? String.Empty;
            if (!String.Equals(actual, requested, StringComparison.Ordinal))
            {
                throw new AscetReadException("readback_mismatch", operation, "Same-session code readback did not match the requested value.");
            }

            result.Verified = true;
            result.VerificationStatus = "passed";
            result.VerificationMode = "same_session_exact_value";
        }
        else
        {
            result.VerificationMode = "not_requested";
        }

        return result;
    }
}
public sealed class AscetWriteExecutor
{
    private readonly object syncRoot;
    private readonly WriteVerificationService verificationService;
    private long nextSequenceNumber;

    public AscetWriteExecutor()
        : this(new WriteVerificationService())
    {
    }

    public AscetWriteExecutor(WriteVerificationService verificationService)
    {
        syncRoot = new object();
        this.verificationService = verificationService ?? new WriteVerificationService();
        nextSequenceNumber = 0;
    }

    public AscetWriteExecutionResult Execute(AscetWriteRequest request)
    {
        if (request == null)
        {
            throw new ArgumentNullException("request");
        }

        if (request.ExecuteWrite == null)
        {
            throw new ArgumentException("ExecuteWrite is required.", "request");
        }

        lock (syncRoot)
        {
            long sequenceNumber = ++nextSequenceNumber;
            string operationName = request.OperationName ?? String.Empty;
            AscetWriteContext context = new AscetWriteContext();
            context.OperationName = operationName;
            context.SequenceNumber = sequenceNumber;
            context.Metadata = CloneDictionary(request.Metadata);

            try
            {
                AscetWriteActionResult writeResult = request.ExecuteWrite(context) ?? new AscetWriteActionResult();
                WriteVerificationResult verification = writeResult.Verification ?? verificationService.Verify(
                    request.VerifyAfterWrite,
                    new WriteVerificationRequest
                    {
                        OperationName = operationName,
                        SequenceNumber = sequenceNumber,
                        Metadata = CloneDictionary(context.Metadata),
                        WriteResult = writeResult
                    });

                return BuildResult(operationName, sequenceNumber, writeResult, verification);
            }
            catch (Exception ex)
            {
                return new AscetWriteExecutionResult
                {
                    OperationName = operationName,
                    SequenceNumber = sequenceNumber,
                    Succeeded = false,
                    WriteSucceeded = false,
                    Summary = String.Empty,
                    Payload = new Dictionary<string, object>(StringComparer.Ordinal),
                    Verification = new WriteVerificationResult
                    {
                        Requested = request.VerifyAfterWrite,
                        Attempted = false,
                        Succeeded = !request.VerifyAfterWrite,
                        Summary = request.VerifyAfterWrite ? String.Empty : "verification_not_requested"
                    },
                    Error = WriteVerificationService.CreateStructuredError("write_failed", operationName, "write", ex)
                };
            }
        }
    }

    private static AscetWriteExecutionResult BuildResult(string operationName, long sequenceNumber, AscetWriteActionResult writeResult, WriteVerificationResult verification)
    {
        AscetWriteActionResult safeWriteResult = writeResult ?? new AscetWriteActionResult();
        WriteVerificationResult safeVerification = verification ?? new WriteVerificationResult();
        bool overallSuccess = safeVerification.Succeeded;

        AscetWriteExecutionResult result = new AscetWriteExecutionResult();
        result.OperationName = operationName ?? String.Empty;
        result.SequenceNumber = sequenceNumber;
        result.Succeeded = overallSuccess;
        result.WriteSucceeded = true;
        result.Summary = safeWriteResult.Summary ?? String.Empty;
        result.Payload = CloneDictionary(safeWriteResult.Payload);
        result.Verification = safeVerification;
        result.Error = safeVerification.Succeeded ? null : safeVerification.Error;
        return result;
    }

    private static Dictionary<string, object> CloneDictionary(Dictionary<string, object> source)
    {
        Dictionary<string, object> clone = new Dictionary<string, object>(StringComparer.Ordinal);
        if (source == null)
        {
            return clone;
        }

        foreach (KeyValuePair<string, object> entry in source)
        {
            if (String.IsNullOrWhiteSpace(entry.Key))
            {
                continue;
            }

            clone[entry.Key] = entry.Value;
        }

        return clone;
    }
}
