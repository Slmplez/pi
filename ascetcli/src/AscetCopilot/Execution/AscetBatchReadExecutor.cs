using System;
using System.Collections.Generic;
using System.IO;

public interface IAscetBatchReadExecutor
{
    IList<AscetBatchResultItemDto> Execute(IList<AscetBatchRequestItemDto> requests);
}

public sealed class AscetBatchReadExecutor : IAscetBatchReadExecutor
{
    private static readonly object ConsoleSuppressionGate = new object();
    private static readonly TextWriter SuppressedConsoleOut = TextWriter.Synchronized(TextWriter.Null);
    private readonly FolderReadService _folderReader;
    private readonly MethodReadService _methodReader;
    private readonly SummaryReadService _summaryReader;

    public AscetBatchReadExecutor()
        : this(
            new FolderReadService(),
            new MethodReadService(),
            new SummaryReadService())
    {
    }

    internal AscetBatchReadExecutor(
        FolderReadService folderReader,
        MethodReadService methodReader,
        SummaryReadService summaryReader)
    {
        _folderReader = folderReader ?? new FolderReadService();
        _methodReader = methodReader ?? new MethodReadService();
        _summaryReader = summaryReader ?? new SummaryReadService();
    }

    public IList<AscetBatchResultItemDto> Execute(IList<AscetBatchRequestItemDto> requests)
    {
        if (requests == null)
        {
            throw new AscetReadException("invalid_input", "parse_batch_input", "Input must contain a non-empty 'requests' array.");
        }

        AscetToolApiBootstrap.ConfigureAssemblyResolution();

        List<AscetBatchResultItemDto> results = new List<AscetBatchResultItemDto>();
        for (int i = 0; i < requests.Count; i++)
        {
            results.Add(ExecuteItem(requests[i]));
        }

        return results;
    }

    private AscetBatchResultItemDto ExecuteItem(AscetBatchRequestItemDto request)
    {
        AscetBatchRequestItemDto normalizedRequest = request ?? new AscetBatchRequestItemDto();
        string operationId = NormalizeOperationId(normalizedRequest.operation);
        AscetBatchResultItemDto result = new AscetBatchResultItemDto();
        result.id = normalizedRequest.id ?? String.Empty;

        try
        {
            if (String.IsNullOrWhiteSpace(operationId))
            {
                throw new AscetReadException("invalid_arguments", "parse_batch_operation", "Batch request operation is required.");
            }

            OperationParser.ParseBatchOperation(new string[] { operationId });

            Dictionary<string, object> payload = ExecuteOperation(operationId, normalizedRequest.args);
            result.ok = true;
            result.result = payload;
            result.error = null;
            return result;
        }
        catch (Exception ex)
        {
            result.ok = false;
            result.result = null;
            result.error = AscetErrorMapper.FromException(ex, operationId);
            return result;
        }
    }

    private Dictionary<string, object> ExecuteOperation(string operationId, IDictionary<string, object> args)
    {
        IDictionary<string, object> payload = args ?? new Dictionary<string, object>(StringComparer.Ordinal);

        switch (operationId)
        {
            case "list_folders":
                return ExecuteSuppressingConsoleOut(delegate()
                {
                    FolderReadRequest request = _folderReader.ParsePayload(payload);
                    return _folderReader.ReadCurrentDatabase(request).Payload;
                });
            case "list_methods":
                return ExecuteSuppressingConsoleOut(delegate()
                {
                    MethodReadRequest request = _methodReader.ParsePayload(payload);
                    return _methodReader.ReadCurrentDatabase(request).Payload;
                });
            case "read_component_summary":
                return ExecuteSuppressingConsoleOut(delegate()
                {
                    SummaryReadRequest request = _summaryReader.ParsePayload(payload);
                    return _summaryReader.ReadCurrentDatabase(request).Payload;
                });
            default:
                throw new AscetReadException(
                    "unsupported_operation",
                    "parse_batch_operation",
                    "Operation '" + operationId + "' is not supported by the batch read executor.");
        }
    }

    private static string NormalizeOperationId(string operationId)
    {
        return String.IsNullOrWhiteSpace(operationId)
            ? String.Empty
            : operationId.Trim().ToLowerInvariant();
    }

    private static T ExecuteSuppressingConsoleOut<T>(Func<T> action)
    {
        if (action == null)
        {
            throw new ArgumentNullException("action");
        }

        lock (ConsoleSuppressionGate)
        {
            TextWriter originalOut = Console.Out;
            try
            {
                Console.SetOut(SuppressedConsoleOut);
                return action();
            }
            finally
            {
                Console.SetOut(originalOut);
            }
        }
    }
}
