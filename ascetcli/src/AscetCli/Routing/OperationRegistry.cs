using System;
using System.Collections.Generic;

public static class OperationRegistry
{
    private static readonly Dictionary<string, string> LegacyProxyExecutables =
        new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

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
            "Operation '" + operationId + "' is not registered in the single-exe router.");
    }

    public static bool TryResolveLegacyProxyExecutable(string operationId, out string executableName)
    {
        executableName = String.Empty;
        if (String.IsNullOrWhiteSpace(operationId))
        {
            return false;
        }

        return LegacyProxyExecutables.TryGetValue(operationId.Trim(), out executableName);
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
            if (descriptor == null)
            {
                continue;
            }

            if (String.Equals(descriptor.OperationId, "capabilities", StringComparison.Ordinal))
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
            item["lane"] = descriptor.LaneId;
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

        Register(descriptors, "apply_element_spec", ExecutionLane.SerialWrite, false, BatchSupportShape.Write);
        Register(descriptors, "apply_project_formula", ExecutionLane.SerialWrite, false, BatchSupportShape.Write, "AscetApplyProjectFormula.exe");
        Register(descriptors, "capabilities", ExecutionLane.Diagnostic, false, BatchSupportShape.None);
        Register(descriptors, "create_component", ExecutionLane.SerialWrite, true, BatchSupportShape.Write);
        Register(descriptors, "create_folder", ExecutionLane.SerialWrite, false, BatchSupportShape.Write, "AscetCreateFolder.exe");
        Register(descriptors, "create_method", ExecutionLane.SerialWrite, true, BatchSupportShape.Write, "AscetCreateMethod.exe");
        Register(descriptors, "delete_component", ExecutionLane.SerialWrite, false, BatchSupportShape.Write, "AscetDeleteComponent.exe");
        Register(descriptors, "delete_folder", ExecutionLane.SerialWrite, false, BatchSupportShape.Write, "AscetDeleteFolder.exe");
        Register(descriptors, "delete_method", ExecutionLane.SerialWrite, false, BatchSupportShape.Write, "AscetDeleteMethod.exe");

        Register(descriptors, "diff_class", ExecutionLane.LegacyRead, false, BatchSupportShape.None, "AscetDiffClass.exe", OperationExecutionProfile.Diff());
        Register(descriptors, "diff_component_snapshot", ExecutionLane.LegacyRead, false, BatchSupportShape.None, "AscetDiffComponentSnapshot.exe", OperationExecutionProfile.Diff());
        Register(descriptors, "diff_element_spec", ExecutionLane.LegacyRead, false, BatchSupportShape.None, "AscetDiffElementSpec.exe", OperationExecutionProfile.Diff());
        Register(descriptors, "diff_method_code", ExecutionLane.LegacyRead, false, BatchSupportShape.None, "AscetDiffMethodCode.exe", OperationExecutionProfile.Diff());
        Register(descriptors, "diff_module", ExecutionLane.LegacyRead, false, BatchSupportShape.None, "AscetDiffModule.exe", OperationExecutionProfile.Diff());
        Register(descriptors, "diff_project_formulas", ExecutionLane.LegacyRead, false, BatchSupportShape.None, "AscetDiffProjectFormulas.exe", OperationExecutionProfile.Diff());

        Register(descriptors, "diff_state_machine", ExecutionLane.LegacyRead, false, BatchSupportShape.None, "AscetDiffStateMachine.exe", OperationExecutionProfile.Diff());
        Register(descriptors, "diff_state_machine_domain", ExecutionLane.LegacyRead, false, BatchSupportShape.None, "AscetDiffStateMachineDomain.exe", OperationExecutionProfile.Diff());

        Register(descriptors, "list_diagrams", ExecutionLane.PooledRead, true, BatchSupportShape.None);
        Register(descriptors, "list_folders", ExecutionLane.PooledRead, true, BatchSupportShape.Read);
        Register(descriptors, "list_methods", ExecutionLane.PooledRead, true, BatchSupportShape.Read);
        Register(descriptors, "get_tree", ExecutionLane.PooledRead, true, BatchSupportShape.Read);
        Register(descriptors, "get_elements", ExecutionLane.PooledRead, true, BatchSupportShape.Read);
        Register(descriptors, "get_formulas", ExecutionLane.PooledRead, true, BatchSupportShape.Read);
        Register(descriptors, "get_component_refs", ExecutionLane.PooledRead, true, BatchSupportShape.Read);
        Register(descriptors, "get_bde_edges", ExecutionLane.PooledRead, true, BatchSupportShape.Read);
        Register(descriptors, "get_import_binding", ExecutionLane.PooledRead, true, BatchSupportShape.Read);
        Register(descriptors, "get_dbitem_refs", ExecutionLane.PooledRead, true, BatchSupportShape.Read);

        Register(descriptors, "read_block_diagram", ExecutionLane.LegacyRead, false, BatchSupportShape.None, "AscetReadBlockDiagram.exe", OperationExecutionProfile.FragileRead());
        Register(descriptors, "read_class_snapshot", ExecutionLane.LegacyRead, false, BatchSupportShape.None, "AscetReadClassSnapshot.exe");
        Register(descriptors, "read_class_summary", ExecutionLane.LegacyRead, false, BatchSupportShape.None, "AscetReadClassSummary.exe");
        Register(descriptors, "read_component_children", ExecutionLane.PooledRead, true, BatchSupportShape.None);
        Register(descriptors, "read_component_code", ExecutionLane.LegacyRead, false, BatchSupportShape.None, "AscetReadComponentCode.exe");
        Register(descriptors, "read_component_refs", ExecutionLane.LegacyRead, false, BatchSupportShape.None, "AscetReadComponentRefs.exe");
        Register(descriptors, "read_component_snapshot", ExecutionLane.LegacyRead, false, BatchSupportShape.None, "AscetReadComponentSnapshot.exe");
        Register(descriptors, "read_component_summary", ExecutionLane.PooledRead, true, BatchSupportShape.Read);
        Register(descriptors, "read_component_used_by", ExecutionLane.LegacyRead, false, BatchSupportShape.None, "AscetReadComponentUsedBy.exe", OperationExecutionProfile.ExpensiveScan(200));
        Register(descriptors, "read_element_catalog", ExecutionLane.LegacyRead, false, BatchSupportShape.None, "AscetReadElementCatalog.exe");
        Register(descriptors, "read_element_dependency", ExecutionLane.LegacyRead, false, BatchSupportShape.None, String.Empty, OperationExecutionProfile.ExpensiveScan(200));
        Register(descriptors, "read_element_refs", ExecutionLane.LegacyRead, false, BatchSupportShape.None, "AscetReadElementRefs.exe");
        Register(descriptors, "read_implementation", ExecutionLane.PooledRead, true, BatchSupportShape.None, "AscetReadImplementation.exe");
        Register(descriptors, "read_dependent_chain", ExecutionLane.LegacyRead, false, BatchSupportShape.None, String.Empty, OperationExecutionProfile.ExpensiveScan(200));
        Register(descriptors, "read_method_code", ExecutionLane.PooledRead, true, BatchSupportShape.None);
        Register(descriptors, "read_method_signature", ExecutionLane.PooledRead, true, BatchSupportShape.None);
        Register(descriptors, "read_module_closure", ExecutionLane.LegacyRead, false, BatchSupportShape.None, "AscetReadModuleClosure.exe");
        Register(descriptors, "read_module_snapshot", ExecutionLane.LegacyRead, false, BatchSupportShape.None, "AscetReadModuleSnapshot.exe");
        Register(descriptors, "read_module_summary", ExecutionLane.LegacyRead, false, BatchSupportShape.None, "AscetReadModuleSummary.exe");
        Register(descriptors, "read_references", ExecutionLane.LegacyRead, false, BatchSupportShape.None, "AscetReadReferences.exe");
        Register(descriptors, "read_state_machine", ExecutionLane.LegacyRead, false, BatchSupportShape.None, "AscetReadStateMachine.exe");
        Register(descriptors, "read_state_machine_flow", ExecutionLane.LegacyRead, false, BatchSupportShape.None, "AscetReadStateMachineFlow.exe", OperationExecutionProfile.FragileRead());
        Register(descriptors, "read_state_machine_snapshot", ExecutionLane.LegacyRead, false, BatchSupportShape.None, "AscetReadStateMachineSnapshot.exe");
        Register(descriptors, "read_state_machine_summary", ExecutionLane.LegacyRead, false, BatchSupportShape.None, "AscetReadStateMachineSummary.exe");
        Register(descriptors, "read_text_code", ExecutionLane.LegacyRead, false, BatchSupportShape.None, "AscetReadTextCode.exe");


        Register(descriptors, "set_class_method_code", ExecutionLane.SerialWrite, true, BatchSupportShape.None, "AscetSetClassMethodCode.exe");
        Register(descriptors, "set_element_dependency", ExecutionLane.SerialWrite, false, BatchSupportShape.None);
        Register(descriptors, "set_method_signature", ExecutionLane.SerialWrite, true, BatchSupportShape.None, "AscetSetMethodSignature.exe");
        Register(descriptors, "set_method_code", ExecutionLane.SerialWrite, true, BatchSupportShape.Write);
        Register(descriptors, "set_module_code", ExecutionLane.SerialWrite, false, BatchSupportShape.None, "AscetSetModuleCode.exe");
        Register(descriptors, "set_state_machine_code", ExecutionLane.SerialWrite, false, BatchSupportShape.None, "AscetSetStateMachineCode.exe");


        return descriptors;
    }

    private static void Register(
        IDictionary<string, OperationDescriptor> descriptors,
        string operationId,
        ExecutionLane lane,
        bool hostEligible,
        BatchSupportShape batchSupport,
        string legacyProxyExecutableName)
    {
        Register(descriptors, operationId, lane, hostEligible, batchSupport, legacyProxyExecutableName, null);
    }

    private static void Register(
        IDictionary<string, OperationDescriptor> descriptors,
        string operationId,
        ExecutionLane lane,
        bool hostEligible,
        BatchSupportShape batchSupport,
        string legacyProxyExecutableName,
        OperationExecutionProfile executionProfile)
    {
        OperationDescriptor descriptor = new OperationDescriptor(operationId, lane, hostEligible, batchSupport, executionProfile);
        descriptors[descriptor.OperationId] = descriptor;

        if (!String.IsNullOrWhiteSpace(legacyProxyExecutableName))
        {
            LegacyProxyExecutables[descriptor.OperationId] = legacyProxyExecutableName.Trim();
        }
    }

    private static void Register(
        IDictionary<string, OperationDescriptor> descriptors,
        string operationId,
        ExecutionLane lane,
        bool hostEligible,
        BatchSupportShape batchSupport)
    {
        Register(descriptors, operationId, lane, hostEligible, batchSupport, String.Empty);
    }

    private static int CompareDescriptorsByOperationId(OperationDescriptor left, OperationDescriptor right)
    {
        string leftId = left == null ? String.Empty : left.OperationId;
        string rightId = right == null ? String.Empty : right.OperationId;
        return StringComparer.Ordinal.Compare(leftId, rightId);
    }
}
