using System;
using System.Collections.Generic;
using System.Reflection;

public sealed class WriteVerificationRequest
{
    public WriteVerificationRequest()
    {
        OperationName = String.Empty;
        SequenceNumber = 0;
        Metadata = new Dictionary<string, object>(StringComparer.Ordinal);
        WriteResult = new AscetWriteActionResult();
    }

    public string OperationName { get; set; }
    public long SequenceNumber { get; set; }
    public Dictionary<string, object> Metadata { get; set; }
    public AscetWriteActionResult WriteResult { get; set; }
}

public sealed class WriteVerificationResult
{
    public WriteVerificationResult()
    {
        Requested = false;
        Attempted = false;
        Succeeded = true;
        Summary = String.Empty;
        Details = new Dictionary<string, object>(StringComparer.Ordinal);
        Error = null;
    }

    public bool Requested { get; set; }
    public bool Attempted { get; set; }
    public bool Succeeded { get; set; }
    public string Summary { get; set; }
    public Dictionary<string, object> Details { get; set; }
    public AscetWriteError Error { get; set; }

    public static WriteVerificationResult CreateSuccess(string summary)
    {
        return new WriteVerificationResult
        {
            Requested = true,
            Attempted = true,
            Succeeded = true,
            Summary = summary ?? String.Empty
        };
    }

    public static WriteVerificationResult CreateFailure(string code, string operation, string message)
    {
        return new WriteVerificationResult
        {
            Requested = true,
            Attempted = true,
            Succeeded = false,
            Summary = String.Empty,
            Error = new AscetWriteError
            {
                Code = String.IsNullOrWhiteSpace(code) ? "verification_failed" : code.Trim(),
                Operation = operation ?? String.Empty,
                Stage = "verify",
                Message = message ?? String.Empty,
                ExceptionType = String.Empty
            }
        };
    }
}

public interface IWriteVerificationHook
{
    WriteVerificationResult Verify(WriteVerificationRequest request);
}

public sealed class WriteVerificationService
{
    private readonly IWriteVerificationHook hook;

    public WriteVerificationService()
        : this(null)
    {
    }

    public WriteVerificationService(IWriteVerificationHook hook)
    {
        this.hook = hook;
    }

    public WriteVerificationResult Verify(bool verifyAfterWrite, WriteVerificationRequest request)
    {
        if (!verifyAfterWrite)
        {
            return new WriteVerificationResult
            {
                Requested = false,
                Attempted = false,
                Succeeded = true,
                Summary = "verification_not_requested"
            };
        }

        if (hook == null)
        {
            return WriteVerificationResult.CreateFailure(
                "verification_unavailable",
                request == null ? String.Empty : request.OperationName,
                "No write verification hook is configured.");
        }

        try
        {
            WriteVerificationResult result = hook.Verify(request);
            if (result == null)
            {
                return WriteVerificationResult.CreateFailure(
                    "verification_failed",
                    request == null ? String.Empty : request.OperationName,
                    "Write verification hook returned no result.");
            }

            result.Requested = true;
            if (result.Succeeded && result.Error != null)
            {
                result.Error = null;
            }

            if (!result.Succeeded)
            {
                if (result.Error == null)
                {
                    result.Error = new AscetWriteError
                    {
                        Code = "verification_failed",
                        Operation = request == null ? String.Empty : request.OperationName,
                        Stage = "verify",
                        Message = String.IsNullOrWhiteSpace(result.Summary) ? "Verification failed." : result.Summary,
                        ExceptionType = String.Empty
                    };
                }
                else
                {
                    if (String.IsNullOrWhiteSpace(result.Error.Code))
                    {
                        result.Error.Code = "verification_failed";
                    }

                    result.Error.Stage = "verify";
                    if (String.IsNullOrWhiteSpace(result.Error.Operation))
                    {
                        result.Error.Operation = request == null ? String.Empty : request.OperationName;
                    }

                    if (String.IsNullOrWhiteSpace(result.Error.Message))
                    {
                        result.Error.Message = String.IsNullOrWhiteSpace(result.Summary) ? "Verification failed." : result.Summary;
                    }
                }
            }

            return result;
        }
        catch (Exception ex)
        {
            return new WriteVerificationResult
            {
                Requested = true,
                Attempted = true,
                Succeeded = false,
                Summary = String.Empty,
                Error = CreateStructuredError("verification_failed", request == null ? String.Empty : request.OperationName, "verify", ex)
            };
        }
    }

    internal static AscetWriteError CreateStructuredError(string fallbackCode, string fallbackOperation, string stage, Exception ex)
    {
        AscetWriteError error = new AscetWriteError();
        error.Code = GetStringProperty(ex, "Code", fallbackCode);
        error.Operation = GetStringProperty(ex, "Operation", fallbackOperation);
        error.Stage = stage ?? String.Empty;
        error.Message = ex == null ? String.Empty : (ex.Message ?? String.Empty);
        error.ExceptionType = ex == null ? String.Empty : (ex.GetType().FullName ?? String.Empty);
        error.Details = new Dictionary<string, object>(StringComparer.Ordinal);

        if (ex != null && ex.InnerException != null)
        {
            error.Details["innerExceptionType"] = ex.InnerException.GetType().FullName ?? String.Empty;
            error.Details["innerExceptionMessage"] = ex.InnerException.Message ?? String.Empty;
        }

        return error;
    }

    private static string GetStringProperty(Exception ex, string propertyName, string fallback)
    {
        if (ex != null && !String.IsNullOrWhiteSpace(propertyName))
        {
            PropertyInfo property = ex.GetType().GetProperty(propertyName, BindingFlags.Instance | BindingFlags.Public);
            if (property != null && property.CanRead)
            {
                object value = property.GetValue(ex, null);
                string text = value as string;
                if (!String.IsNullOrWhiteSpace(text))
                {
                    return text;
                }
            }
        }

        return fallback ?? String.Empty;
    }
}
