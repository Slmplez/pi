using System;
using System.Collections.Generic;

public static class AscetBridgeOperationRegistry
{
    private static readonly Dictionary<string, OperationDescriptor> Descriptors = BuildDescriptors();

    public static bool TryResolve(string operationId, out OperationDescriptor descriptor)
    {
        descriptor = null;
        if (String.IsNullOrWhiteSpace(operationId))
        {
            return false;
        }
        return Descriptors.TryGetValue(operationId.Trim(), out descriptor);
    }

    public static OperationDescriptor ResolveOrThrow(string operationId)
    {
        OperationDescriptor descriptor;
        if (TryResolve(operationId, out descriptor))
        {
            return descriptor;
        }
        throw new AscetReadException(
            "unsupported_operation",
            "bridge_exec",
            "Operation '" + (operationId ?? String.Empty) + "' is not registered in AscetBridge.");
    }

    public static IList<OperationDescriptor> GetAll()
    {
        List<OperationDescriptor> result = new List<OperationDescriptor>(Descriptors.Values);
        result.Sort(delegate(OperationDescriptor left, OperationDescriptor right)
        {
            return StringComparer.Ordinal.Compare(left.OperationId, right.OperationId);
        });
        return result;
    }

    public static string[] GetOperationIds()
    {
        IList<OperationDescriptor> descriptors = GetAll();
        string[] result = new string[descriptors.Count];
        for (int i = 0; i < descriptors.Count; i++)
        {
            result[i] = descriptors[i].OperationId;
        }
        return result;
    }

    public static IList<Dictionary<string, object>> GetRouteCatalog()
    {
        List<Dictionary<string, object>> routes = new List<Dictionary<string, object>>();
        IList<OperationDescriptor> descriptors = GetAll();
        for (int i = 0; i < descriptors.Count; i++)
        {
            OperationDescriptor descriptor = descriptors[i];
            Dictionary<string, object> route = new Dictionary<string, object>();
            route["commandId"] = String.Empty;
            route["subcommand"] = "exec";
            route["operationId"] = descriptor.OperationId;
            route["routeVisibility"] = descriptor.RouteVisibilityId;
            route["sessionPolicy"] = descriptor.SessionPolicyId;
            route["transportPolicy"] = descriptor.TransportPolicyId;
            route["mutatesDatabase"] = descriptor.MutatesDatabase;
            route["retryPolicy"] = descriptor.RetryPolicyId;
            route["handlerKind"] = descriptor.HandlerKindId;
            route["batchSupport"] = descriptor.BatchSupportId;
            route["executionProfile"] = descriptor.ExecutionProfile.ToDictionary();
            routes.Add(route);
        }
        return routes;
    }

    private static Dictionary<string, OperationDescriptor> BuildDescriptors()
    {
        Dictionary<string, OperationDescriptor> result =
            new Dictionary<string, OperationDescriptor>(StringComparer.OrdinalIgnoreCase);
        IList<OperationDescriptor> source = OperationRegistry.GetAll();
        for (int i = 0; i < source.Count; i++)
        {
            OperationDescriptor descriptor = source[i];
            if (descriptor.SessionPolicy == SessionPolicy.NoSession)
            {
                continue;
            }

            string operationId = descriptor.OperationId;
            AscetOperationHandler handler;
            if (descriptor.HandlerKind == OperationHandlerKind.LegacyOneShotAdapter)
            {
                LegacyOperationEntryPoint entryPoint;
                if (!AscetLegacyOperationRegistry.TryResolve(operationId, out entryPoint))
                {
                    throw new InvalidOperationException("Legacy operation '" + operationId + "' has no in-process entry point.");
                }
                LegacyOperationEntryPoint capturedEntryPoint = entryPoint;
                handler = delegate(string[] args)
                {
                    return InProcessLegacyOperationAdapter.Run(operationId, capturedEntryPoint, args);
                };
            }
            else
            {
                handler = delegate(string[] args)
                {
                    return ExecCommand.Run(Prepend(operationId, args));
                };
            }

            OperationDescriptor bound = descriptor.WithHandler(handler);
            if (result.ContainsKey(bound.OperationId))
            {
                throw new InvalidOperationException("Duplicate Bridge operation id '" + bound.OperationId + "'.");
            }
            result[bound.OperationId] = bound;
        }
        return result;
    }

    private static string[] Prepend(string operationId, string[] args)
    {
        int length = args == null ? 0 : args.Length;
        string[] result = new string[length + 1];
        result[0] = operationId;
        if (length > 0)
        {
            Array.Copy(args, 0, result, 1, length);
        }
        return result;
    }
}