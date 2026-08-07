using System;
using System.Collections.Generic;

public static class AscetErrorMapper
{
    public static AscetStructuredErrorDto FromException(Exception ex, string fallbackOperation)
    {
        if (ex == null)
        {
            return Create("unhandled_exception", "An unknown error occurred.", fallbackOperation, null);
        }

        AscetReadException ascet = ex as AscetReadException;
        if (ascet != null)
        {
            return Create(
                String.IsNullOrWhiteSpace(ascet.Code) ? "unhandled_exception" : ascet.Code,
                ascet.Message,
                String.IsNullOrWhiteSpace(ascet.Operation) ? fallbackOperation : ascet.Operation,
                CreateDetails(ex));
        }

        if (ex is ArgumentException)
        {
            return Create("invalid_arguments", ex.Message, fallbackOperation, CreateDetails(ex));
        }

        if (ex is NotSupportedException)
        {
            return Create("not_implemented", ex.Message, fallbackOperation, CreateDetails(ex));
        }

        if (ex is ObjectDisposedException)
        {
            return Create("object_disposed", ex.Message, fallbackOperation, CreateDetails(ex));
        }

        if (ex is InvalidOperationException)
        {
            return Create("invalid_operation", ex.Message, fallbackOperation, CreateDetails(ex));
        }

        return Create("unhandled_exception", ex.Message, fallbackOperation, CreateDetails(ex));
    }

    public static AscetStructuredErrorDto Create(string code, string message, string operation)
    {
        return Create(code, message, operation, null);
    }

    public static AscetStructuredErrorDto Create(string code, string message, string operation, Dictionary<string, object> details)
    {
        AscetStructuredErrorDto error = new AscetStructuredErrorDto();
        error.code = code ?? String.Empty;
        error.message = message ?? String.Empty;
        error.operation = operation ?? String.Empty;
        error.details = details;
        return error;
    }

    private static Dictionary<string, object> CreateDetails(Exception ex)
    {
        if (ex == null)
        {
            return null;
        }

        Dictionary<string, object> details = new Dictionary<string, object>();
        details["exceptionType"] = ex.GetType().FullName ?? ex.GetType().Name;
        if (ex.InnerException != null)
        {
            details["innerExceptionType"] = ex.InnerException.GetType().FullName ?? ex.InnerException.GetType().Name;
        }

        return details;
    }
}
