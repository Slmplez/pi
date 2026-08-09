using System;
using System.Collections.Generic;

public static class OperationRegistry
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
        return ResolveOrThrow(operationId, "resolve_operation");
    }

    public static OperationDescriptor ResolveOrThrow(string operationId, string failureOperation)
    {
        if (String.IsNullOrWhiteSpace(operationId))
        {
            throw new AscetReadException(
                "invalid_arguments",
                String.IsNullOrWhiteSpace(failureOperation) ? "resolve_operation" : failureOperation,
                "An operation id is required.");
        }

        OperationDescriptor descriptor;
        if (TryResolve(operationId, out descriptor))
        {
            return descriptor;
        }

        throw new AscetReadException(
            "unsupported_operation",
            String.IsNullOrWhiteSpace(failureOperation) ? "resolve_operation" : failureOperation,
            "Operation '" + operationId + "' is not registered in the single-bridge router.");
    }

    public static IList<OperationDescriptor> GetAll()
    {
        List<OperationDescriptor> descriptors = new List<OperationDescriptor>();
        foreach (KeyValuePair<string, OperationDescriptor> entry in Descriptors)
        {
            descriptors.Add(entry.Value);
        }
        descriptors.Sort(CompareDescriptorsByOperationId);
        return descriptors;
    }

    public static string[] GetExecOperationIds()
    {
        List<string> operations = new List<string>();
        IList<OperationDescriptor> descriptors = GetAll();
        for (int i = 0; i < descriptors.Count; i++)
        {
            OperationDescriptor descriptor = descriptors[i];
            if (descriptor == null || descriptor.SessionPolicy == SessionPolicy.NoSession)
            {
                continue;
            }
            operations.Add(descriptor.OperationId);
        }
        return operations.ToArray();
    }

    public static IList<Dictionary<string, object>> GetOperationCatalog()
    {
        List<Dictionary<string, object>> catalog = new List<Dictionary<string, object>>();
        IList<OperationDescriptor> descriptors = GetAll();
        for (int i = 0; i < descriptors.Count; i++)
        {
            OperationDescriptor descriptor = descriptors[i];
            if (descriptor == null)
            {
                continue;
            }

            Dictionary<string, object> item = new Dictionary<string, object>();
            item["operation"] = descriptor.OperationId;
            item["routeVisibility"] = descriptor.RouteVisibilityId;
            item["lane"] = descriptor.LaneId;
            item["sessionPolicy"] = descriptor.SessionPolicyId;
            item["transportPolicy"] = descriptor.TransportPolicyId;
            item["mutatesDatabase"] = descriptor.MutatesDatabase;
            item["retryPolicy"] = descriptor.RetryPolicyId;
            item["handlerKind"] = descriptor.HandlerKindId;
            item["hostEligible"] = descriptor.HostEligible;
            item["supportsBatch"] = descriptor.SupportsBatch;
            item["batchSupport"] = descriptor.BatchSupportId;
            item["executionProfile"] = descriptor.ExecutionProfile.ToDictionary();
            catalog.Add(item);
        }
        return catalog;
    }

    private static Dictionary<string, OperationDescriptor> BuildDescriptors()
    {
        Dictionary<string, OperationDescriptor> descriptors =
            new Dictionary<string, OperationDescriptor>(StringComparer.OrdinalIgnoreCase);

        RegisterTyped(descriptors, "apply_element_spec", ExecutionLane.SerialWrite, false, BatchSupportShape.Write);
        RegisterLegacy(descriptors, "apply_project_formula", ExecutionLane.SerialWrite, false, BatchSupportShape.Write);
        RegisterTyped(descriptors, "capabilities", ExecutionLane.Diagnostic, false, BatchSupportShape.None);
        RegisterLegacy(descriptors, "component_editable_check", ExecutionLane.LegacyRead, false, BatchSupportShape.None);
        RegisterLegacy(descriptors, "component_editable_set", ExecutionLane.SerialWrite, false, BatchSupportShape.None);
        RegisterTyped(descriptors, "create_component", ExecutionLane.SerialWrite, true, BatchSupportShape.Write);
        RegisterLegacy(descriptors, "create_folder", ExecutionLane.SerialWrite, false, BatchSupportShape.Write);
        RegisterLegacy(descriptors, "create_method", ExecutionLane.SerialWrite, true, BatchSupportShape.Write);
        RegisterLegacy(descriptors, "delete_component", ExecutionLane.SerialWrite, false, BatchSupportShape.Write);
        RegisterLegacy(descriptors, "delete_folder", ExecutionLane.SerialWrite, false, BatchSupportShape.Write);
        RegisterLegacy(descriptors, "delete_method", ExecutionLane.SerialWrite, false, BatchSupportShape.Write);

        RegisterLegacy(descriptors, "diff_class", ExecutionLane.LegacyRead, false, BatchSupportShape.None, OperationExecutionProfile.Diff());
        RegisterLegacy(descriptors, "diff_component_snapshot", ExecutionLane.LegacyRead, false, BatchSupportShape.None, OperationExecutionProfile.Diff());
        RegisterLegacy(descriptors, "diff_element_spec", ExecutionLane.LegacyRead, false, BatchSupportShape.None, OperationExecutionProfile.Diff());
        RegisterLegacy(descriptors, "diff_method_code", ExecutionLane.LegacyRead, false, BatchSupportShape.None, OperationExecutionProfile.Diff());
        RegisterLegacy(descriptors, "diff_module", ExecutionLane.LegacyRead, false, BatchSupportShape.None, OperationExecutionProfile.Diff());
        RegisterLegacy(descriptors, "diff_project_formulas", ExecutionLane.LegacyRead, false, BatchSupportShape.None, OperationExecutionProfile.Diff());
        RegisterLegacy(descriptors, "diff_state_machine", ExecutionLane.LegacyRead, false, BatchSupportShape.None, OperationExecutionProfile.Diff());
        RegisterLegacy(descriptors, "diff_state_machine_domain", ExecutionLane.LegacyRead, false, BatchSupportShape.None, OperationExecutionProfile.Diff());

        RegisterTyped(descriptors, "list_diagrams", ExecutionLane.PooledRead, true, BatchSupportShape.None);
        RegisterTyped(descriptors, "list_folders", ExecutionLane.PooledRead, true, BatchSupportShape.Read);
        RegisterTyped(descriptors, "list_methods", ExecutionLane.PooledRead, true, BatchSupportShape.Read);
        RegisterTyped(descriptors, "get_tree", ExecutionLane.PooledRead, true, BatchSupportShape.Read);
        RegisterTyped(descriptors, "get_database_catalog", ExecutionLane.PooledRead, false, BatchSupportShape.None, OperationExecutionProfile.ExpensiveScan(200));
        RegisterTyped(descriptors, "get_elements", ExecutionLane.PooledRead, true, BatchSupportShape.Read);
        RegisterTyped(descriptors, "get_formulas", ExecutionLane.PooledRead, true, BatchSupportShape.Read);
        RegisterTyped(descriptors, "get_component_refs", ExecutionLane.PooledRead, true, BatchSupportShape.Read);
        RegisterTyped(descriptors, "get_bde_edges", ExecutionLane.PooledRead, true, BatchSupportShape.Read);
        RegisterTyped(descriptors, "get_import_binding", ExecutionLane.PooledRead, true, BatchSupportShape.Read);
        RegisterTyped(descriptors, "get_dbitem_refs", ExecutionLane.PooledRead, true, BatchSupportShape.Read);

        RegisterTyped(descriptors, "read_block_diagram", ExecutionLane.LegacyRead, false, BatchSupportShape.None, OperationExecutionProfile.FragileRead());
        RegisterTyped(descriptors, "read_block_diagram_raw", ExecutionLane.LegacyRead, false, BatchSupportShape.None, OperationExecutionProfile.FragileRead());
        RegisterLegacy(descriptors, "read_class_snapshot", ExecutionLane.LegacyRead, false, BatchSupportShape.None);
        RegisterLegacy(descriptors, "read_class_summary", ExecutionLane.LegacyRead, false, BatchSupportShape.None);
        RegisterTyped(descriptors, "read_component_children", ExecutionLane.PooledRead, true, BatchSupportShape.None);
        RegisterLegacy(descriptors, "read_component_code", ExecutionLane.LegacyRead, false, BatchSupportShape.None);
        RegisterLegacy(descriptors, "read_component_refs", ExecutionLane.LegacyRead, false, BatchSupportShape.None);
        RegisterLegacy(descriptors, "read_component_snapshot", ExecutionLane.LegacyRead, false, BatchSupportShape.None);
        RegisterTyped(descriptors, "read_component_summary", ExecutionLane.PooledRead, true, BatchSupportShape.Read);
        RegisterLegacy(descriptors, "read_component_used_by", ExecutionLane.LegacyRead, false, BatchSupportShape.None, OperationExecutionProfile.ExpensiveScan(200));
        RegisterLegacy(descriptors, "read_element_catalog", ExecutionLane.LegacyRead, false, BatchSupportShape.None);
        RegisterTyped(descriptors, "read_element_dependency", ExecutionLane.LegacyRead, false, BatchSupportShape.None, OperationExecutionProfile.ExpensiveScan(200));
        RegisterLegacy(descriptors, "read_element_refs", ExecutionLane.LegacyRead, false, BatchSupportShape.None);
        RegisterLegacy(descriptors, "read_implementation", ExecutionLane.PooledRead, true, BatchSupportShape.None);
        RegisterTyped(descriptors, "read_dependent_chain", ExecutionLane.LegacyRead, false, BatchSupportShape.None, OperationExecutionProfile.ExpensiveScan(200));
        RegisterTyped(descriptors, "read_method_code", ExecutionLane.PooledRead, true, BatchSupportShape.None);
        RegisterTyped(descriptors, "read_method_signature", ExecutionLane.PooledRead, true, BatchSupportShape.None);
        RegisterLegacy(descriptors, "read_module_closure", ExecutionLane.LegacyRead, false, BatchSupportShape.None);
        RegisterLegacy(descriptors, "read_module_snapshot", ExecutionLane.LegacyRead, false, BatchSupportShape.None);
        RegisterLegacy(descriptors, "read_module_summary", ExecutionLane.LegacyRead, false, BatchSupportShape.None);
        RegisterLegacy(descriptors, "read_references", ExecutionLane.LegacyRead, false, BatchSupportShape.None);
        RegisterLegacy(descriptors, "read_state_machine", ExecutionLane.LegacyRead, false, BatchSupportShape.None);
        RegisterLegacy(descriptors, "read_state_machine_flow", ExecutionLane.LegacyRead, false, BatchSupportShape.None, OperationExecutionProfile.FragileRead());
        RegisterLegacy(descriptors, "read_state_machine_snapshot", ExecutionLane.LegacyRead, false, BatchSupportShape.None);
        RegisterLegacy(descriptors, "read_state_machine_summary", ExecutionLane.LegacyRead, false, BatchSupportShape.None);
        RegisterTyped(descriptors, "read_code", ExecutionLane.LegacyRead, false, BatchSupportShape.None);
        RegisterLegacy(descriptors, "read_text_code", ExecutionLane.LegacyRead, false, BatchSupportShape.None);
        RegisterTyped(descriptors, "diff", ExecutionLane.LegacyRead, false, BatchSupportShape.None, OperationExecutionProfile.Diff());

        RegisterLegacy(descriptors, "set_class_method_code", ExecutionLane.SerialWrite, true, BatchSupportShape.None);
        RegisterTyped(descriptors, "set_element_dependency", ExecutionLane.SerialWrite, false, BatchSupportShape.None);
        RegisterLegacy(descriptors, "set_enumerators", ExecutionLane.SerialWrite, false, BatchSupportShape.None);
        RegisterTyped(descriptors, "set_method_signature", ExecutionLane.SerialWrite, true, BatchSupportShape.None);
        RegisterTyped(descriptors, "set_method_code", ExecutionLane.SerialWrite, true, BatchSupportShape.Write);
        RegisterLegacy(descriptors, "set_module_code", ExecutionLane.SerialWrite, false, BatchSupportShape.None);
        RegisterLegacy(descriptors, "set_state_machine_code", ExecutionLane.SerialWrite, false, BatchSupportShape.None);

        return descriptors;
    }

    private static void RegisterTyped(
        IDictionary<string, OperationDescriptor> descriptors,
        string operationId,
        ExecutionLane lane,
        bool hostEligible,
        BatchSupportShape batchSupport)
    {
        RegisterTyped(descriptors, operationId, lane, hostEligible, batchSupport, null);
    }

    private static void RegisterTyped(
        IDictionary<string, OperationDescriptor> descriptors,
        string operationId,
        ExecutionLane lane,
        bool hostEligible,
        BatchSupportShape batchSupport,
        OperationExecutionProfile executionProfile)
    {
        Register(descriptors, operationId, lane, hostEligible, batchSupport, executionProfile, OperationHandlerKind.Typed);
    }

    private static void RegisterLegacy(
        IDictionary<string, OperationDescriptor> descriptors,
        string operationId,
        ExecutionLane lane,
        bool hostEligible,
        BatchSupportShape batchSupport)
    {
        RegisterLegacy(descriptors, operationId, lane, hostEligible, batchSupport, null);
    }

    private static void RegisterLegacy(
        IDictionary<string, OperationDescriptor> descriptors,
        string operationId,
        ExecutionLane lane,
        bool hostEligible,
        BatchSupportShape batchSupport,
        OperationExecutionProfile executionProfile)
    {
        Register(descriptors, operationId, lane, hostEligible, batchSupport, executionProfile, OperationHandlerKind.LegacyOneShotAdapter);
    }

    private static void Register(
        IDictionary<string, OperationDescriptor> descriptors,
        string operationId,
        ExecutionLane lane,
        bool hostEligible,
        BatchSupportShape batchSupport,
        OperationExecutionProfile executionProfile,
        OperationHandlerKind handlerKind)
    {
        RouteVisibility visibility = ResolveVisibility(operationId, lane);
        SessionPolicy sessionPolicy = lane == ExecutionLane.Diagnostic ? SessionPolicy.NoSession : SessionPolicy.FreshSession;
        bool mutatesDatabase = lane == ExecutionLane.SerialWrite;
        OperationDescriptor descriptor = new OperationDescriptor(
            operationId,
            lane,
            hostEligible,
            batchSupport,
            executionProfile,
            visibility,
            sessionPolicy,
            TransportPolicy.OneShotOnly,
            mutatesDatabase,
            OperationRetryPolicy.Never,
            handlerKind,
            null);
        if (descriptors.ContainsKey(descriptor.OperationId))
        {
            throw new InvalidOperationException("Duplicate operation id '" + descriptor.OperationId + "'.");
        }
        descriptors[descriptor.OperationId] = descriptor;
    }

    private static RouteVisibility ResolveVisibility(string operationId, ExecutionLane lane)
    {
        if (lane == ExecutionLane.Diagnostic)
        {
            return RouteVisibility.DiagnosticOnly;
        }

        switch (operationId ?? String.Empty)
        {
            case "component_editable_check":
            case "component_editable_set":
            case "get_database_catalog":
            case "list_diagrams":
            case "list_folders":
            case "list_methods":
            case "diff":
            case "read_block_diagram_raw":
            case "read_code":
            case "read_component_children":
            case "read_component_summary":
            case "read_element_dependency":
            case "read_method_signature":
                return RouteVisibility.InternalRuntime;
            default:
                return RouteVisibility.PublicContract;
        }
    }

    private static int CompareDescriptorsByOperationId(OperationDescriptor left, OperationDescriptor right)
    {
        string leftId = left == null ? String.Empty : left.OperationId;
        string rightId = right == null ? String.Empty : right.OperationId;
        return StringComparer.Ordinal.Compare(leftId, rightId);
    }
}