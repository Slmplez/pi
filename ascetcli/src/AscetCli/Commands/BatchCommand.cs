using System;
using System.Collections.Generic;
using System.Web.Script.Serialization;

public static class BatchCommand
{
    private const int ExitCodeStructuredError = 2;
    private static readonly AscetJsonProtocol Protocol = new AscetJsonProtocol();
    private static IAscetBatchReadExecutor batchReadExecutor = new AscetBatchReadExecutor();
    private static IAscetBatchWriteExecutor batchWriteExecutor = new AscetBatchWriteExecutor();

    public static int Run(string[] args)
    {
        BatchInvocation invocation;
        try
        {
            invocation = ParseInvocation(args);
        }
        catch (Exception ex)
        {
            return WriteBatchProtocolError(String.Empty, ex);
        }

        try
        {
            IList<AscetBatchRequestItemDto> requests = ParseRequests(Console.In.ReadToEnd(), invocation.Operation);
            IList<AscetBatchResultItemDto> results = ExecuteRequests(invocation.Lane, requests);
            Console.WriteLine(Protocol.Serialize(Protocol.BatchSuccess(invocation.Lane, results)));
            if (String.Equals(invocation.Lane, "write", StringComparison.OrdinalIgnoreCase) && HasFailures(results))
            {
                return ExitCodeStructuredError;
            }

            return 0;
        }
        catch (Exception ex)
        {
            return WriteBatchProtocolError(invocation.Lane, ex);
        }
    }

    internal static void SetBatchReadExecutorForTesting(IAscetBatchReadExecutor executor)
    {
        if (executor != null)
        {
            batchReadExecutor = executor;
        }
    }

    internal static void ResetBatchReadExecutorForTesting()
    {
        batchReadExecutor = new AscetBatchReadExecutor();
    }

    internal static void SetBatchWriteExecutorForTesting(IAscetBatchWriteExecutor executor)
    {
        if (executor != null)
        {
            batchWriteExecutor = executor;
        }
    }

    internal static void ResetBatchWriteExecutorForTesting()
    {
        batchWriteExecutor = new AscetBatchWriteExecutor();
    }

    private static IList<AscetBatchResultItemDto> ExecuteRequests(string lane, IList<AscetBatchRequestItemDto> requests)
    {
        if (String.Equals(lane, "read", StringComparison.OrdinalIgnoreCase))
        {
            return batchReadExecutor.Execute(requests);
        }

        if (String.Equals(lane, "write", StringComparison.OrdinalIgnoreCase))
        {
            return batchWriteExecutor.Execute(requests);
        }

        throw new AscetReadException(
            "not_implemented",
            "batch",
            "batch mode is not implemented yet for lane '" + lane + "'.");
    }

    private static BatchInvocation ParseInvocation(string[] args)
    {
        string defaultLane = "read";
        bool emitJson;
        string lane;

        string routeOperation = AscetCliEnvelope.GetToken(args, 0);
        if (String.IsNullOrWhiteSpace(routeOperation) || routeOperation.StartsWith("-", StringComparison.Ordinal))
        {
            Dictionary<string, object> parseError = AscetCliEnvelope.ParseLaneArguments(
                args,
                "batch",
                new string[] { "read", "write" },
                defaultLane,
                out lane,
                out emitJson);

            if (parseError != null)
            {
                throw ParseProtocolError(parseError);
            }

            return new BatchInvocation
            {
                Lane = lane,
                Operation = String.Empty
            };
        }

        OperationDescriptor descriptor = OperationParser.ParseBatchOperation(new string[] { routeOperation });
        Dictionary<string, object> routeError = ValidateBatchRouteArguments(AscetCliEnvelope.Slice(args, 1), descriptor);
        if (routeError != null)
        {
            throw ParseProtocolError(routeError);
        }

        return new BatchInvocation
        {
            Lane = descriptor.BatchSupport == BatchSupportShape.Write ? "write" : "read",
            Operation = descriptor.OperationId
        };
    }

    private static Dictionary<string, object> ValidateBatchRouteArguments(string[] args, OperationDescriptor descriptor)
    {
        if (args == null || args.Length == 0)
        {
            return null;
        }

        string lane = descriptor != null && descriptor.BatchSupport == BatchSupportShape.Write ? "write" : "read";
        for (int i = 0; i < args.Length; i++)
        {
            string argument = args[i] ?? String.Empty;
            if (String.Equals(argument, "--json", StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            return AscetCliEnvelope.Error(
                "invalid_arguments",
                "Unknown argument '" + argument + "' for batch mode.",
                "batch",
                lane);
        }

        return null;
    }

    private static AscetReadException ParseProtocolError(Dictionary<string, object> envelope)
    {
        Dictionary<string, object> error = envelope == null ? null : envelope["error"] as Dictionary<string, object>;
        string code = error == null ? "invalid_arguments" : (Convert.ToString(error["code"]) ?? "invalid_arguments");
        string message = error == null ? "batch mode arguments were invalid." : (Convert.ToString(error["message"]) ?? "batch mode arguments were invalid.");
        return new AscetReadException(code, "batch", message);
    }

    private static IList<AscetBatchRequestItemDto> ParseRequests(string json, string routedOperation)
    {
        if (String.IsNullOrWhiteSpace(json))
        {
            throw new AscetReadException("invalid_input", "parse_batch_input", "Input must contain a non-empty 'requests' array.");
        }

        Dictionary<string, object> root = Protocol.Deserialize<Dictionary<string, object>>(json, "parse_batch_input");
        if (root == null || !root.ContainsKey("requests"))
        {
            throw new AscetReadException("invalid_input", "parse_batch_input", "Input must contain a 'requests' array.");
        }

        object rawRequests = root["requests"];
        System.Collections.IList requestItems = rawRequests as System.Collections.IList;
        if (requestItems == null)
        {
            throw new AscetReadException("invalid_input", "parse_batch_input", "'requests' must be an array.");
        }

        if (requestItems.Count == 0)
        {
            throw new AscetReadException("invalid_input", "parse_batch_input", "'requests' must contain at least one item.");
        }

        List<AscetBatchRequestItemDto> requests = new List<AscetBatchRequestItemDto>();
        for (int i = 0; i < requestItems.Count; i++)
        {
            Dictionary<string, object> item = requestItems[i] as Dictionary<string, object>;
            if (item == null)
            {
                throw new AscetReadException("invalid_input", "parse_batch_input", "Each batch request must be an object.");
            }

            requests.Add(ParseRequestItem(item, routedOperation, i));
        }

        return requests;
    }

    private static AscetBatchRequestItemDto ParseRequestItem(IDictionary<string, object> item, string routedOperation, int itemIndex)
    {
        AscetBatchRequestItemDto request = new AscetBatchRequestItemDto();
        request.id = GetString(item, "id");
        request.operation = GetString(item, "operation");

        if (String.IsNullOrWhiteSpace(request.id))
        {
            request.id = "req-" + (itemIndex + 1).ToString();
        }

        if (!String.IsNullOrWhiteSpace(routedOperation))
        {
            if (!String.IsNullOrWhiteSpace(request.operation) &&
                !String.Equals(request.operation, routedOperation, StringComparison.OrdinalIgnoreCase))
            {
                throw new AscetReadException(
                    "invalid_input",
                    "parse_batch_input",
                    "Batch request operation '" + request.operation + "' does not match routed operation '" + routedOperation + "'.");
            }

            request.operation = routedOperation;
        }

        if (!item.ContainsKey("args") || item["args"] == null)
        {
            request.args = new Dictionary<string, object>(StringComparer.Ordinal);
            return request;
        }

        Dictionary<string, object> args = item["args"] as Dictionary<string, object>;
        if (args == null)
        {
            throw new AscetReadException("invalid_input", "parse_batch_input", "Batch request field 'args' must be an object when provided.");
        }

        request.args = CloneDictionary(args);
        return request;
    }

    private static Dictionary<string, object> CloneDictionary(IDictionary<string, object> source)
    {
        Dictionary<string, object> clone = new Dictionary<string, object>(StringComparer.Ordinal);
        if (source == null)
        {
            return clone;
        }

        foreach (KeyValuePair<string, object> entry in source)
        {
            clone[entry.Key] = entry.Value;
        }

        return clone;
    }

    private static string GetString(IDictionary<string, object> payload, string key)
    {
        if (payload == null || String.IsNullOrWhiteSpace(key) || !payload.ContainsKey(key) || payload[key] == null)
        {
            return String.Empty;
        }

        return Convert.ToString(payload[key]) ?? String.Empty;
    }

    private static int WriteBatchProtocolError(string lane, Dictionary<string, object> envelope)
    {
        Dictionary<string, object> error = envelope == null ? null : envelope["error"] as Dictionary<string, object>;
        string code = error == null ? "invalid_arguments" : (Convert.ToString(error["code"]) ?? "invalid_arguments");
        string message = error == null ? "batch mode arguments were invalid." : (Convert.ToString(error["message"]) ?? "batch mode arguments were invalid.");
        return WriteBatchProtocolError(
            lane,
            new AscetReadException(code, "batch", message));
    }

    private static int WriteBatchProtocolError(string lane, Exception ex)
    {
        Console.WriteLine(Protocol.Serialize(Protocol.BatchError(lane ?? String.Empty, ex)));
        return ExitCodeStructuredError;
    }

    private static bool HasFailures(IList<AscetBatchResultItemDto> results)
    {
        if (results == null)
        {
            return false;
        }

        for (int i = 0; i < results.Count; i++)
        {
            AscetBatchResultItemDto item = results[i];
            if (item != null && !item.ok)
            {
                return true;
            }
        }

        return false;
    }

    private sealed class BatchInvocation
    {
        public BatchInvocation()
        {
            Lane = "read";
            Operation = String.Empty;
        }

        public string Lane { get; set; }
        public string Operation { get; set; }
    }
}
