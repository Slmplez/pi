using System;
using System.Collections.Generic;

public static class AscetOperationRegistrySmoke
{
    public static int Main()
    {
        try
        {
            TestNativeReadResolution();
            TestNativeWriteResolution();
            TestProxyReadResolution();
            TestProxyWriteResolution();
            TestExpandedProxyCoverage();
            TestSearchFamilyResolution();
            TestUnsupportedOperationError();
            TestHostRestrictions();
            TestBatchSupportParsing();
            TestExecutionProfiles();
            TestDescriptorInvariants();
            TestDeterministicEnumeration();

            Console.WriteLine("AscetOperationRegistrySmoke passed.");
            return 0;
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine(ex.Message);
            return 1;
        }
    }

    private static void TestNativeReadResolution()
    {
        OperationDescriptor descriptor = OperationParser.ParseExecOperation(new string[] { "list_folders" });
        AssertTrue(descriptor != null, "list_folders should resolve.");
        AssertEqual("list_folders", descriptor.OperationId, "list_folders should preserve operation id.");
        AssertEqual("pooled_read", descriptor.LaneId, "list_folders should carry pooled_read metadata.");
        AssertTrue(descriptor.HostEligible, "list_folders should be host eligible.");
        AssertTrue(descriptor.SupportsBatch, "list_folders should support batch reads.");
        AssertEqual("batch_read", descriptor.BatchSupportId, "list_folders should advertise batch_read.");
    }

    private static void TestNativeWriteResolution()
    {
        OperationDescriptor descriptor = OperationRegistry.ResolveOrThrow("set_method_code");
        AssertTrue(descriptor != null, "set_method_code should resolve.");
        AssertEqual("serial_write", descriptor.LaneId, "set_method_code should carry serial_write metadata.");
        AssertTrue(descriptor.HostEligible, "set_method_code should be host eligible.");
        AssertTrue(descriptor.SupportsBatch, "set_method_code should support batch writes.");
        AssertEqual("batch_write", descriptor.BatchSupportId, "set_method_code should advertise batch_write.");

        string proxyExecutable;
        AssertTrue(!OperationRegistry.TryResolveLegacyProxyExecutable("set_method_code", out proxyExecutable), "set_method_code should stay native, not proxied.");
    }

    private static void TestProxyReadResolution()
    {
        OperationDescriptor descriptor = OperationRegistry.ResolveOrThrow("resolve_component");
        AssertTrue(descriptor != null, "resolve_component should resolve.");
        AssertEqual("pooled_read", descriptor.LaneId, "resolve_component should move onto the pooled_read lane when host-backed.");
        AssertTrue(descriptor.HostEligible, "resolve_component should be host eligible once host-backed.");
        AssertTrue(!descriptor.SupportsBatch, "resolve_component should not support batch execution.");

        string proxyExecutable;
        AssertTrue(!OperationRegistry.TryResolveLegacyProxyExecutable("resolve_component", out proxyExecutable), "resolve_component should now be a native single-exe handler.");
    }

    private static void TestProxyWriteResolution()
    {
        OperationDescriptor descriptor = OperationRegistry.ResolveOrThrow("create_method");
        AssertTrue(descriptor != null, "create_method should resolve.");
        AssertEqual("serial_write", descriptor.LaneId, "create_method should use the serial_write lane.");
        AssertTrue(descriptor.HostEligible, "create_method should be host eligible.");
        AssertTrue(descriptor.SupportsBatch, "create_method should advertise batch write support.");
        AssertEqual("batch_write", descriptor.BatchSupportId, "create_method should advertise batch_write.");

        string proxyExecutable;
        AssertTrue(OperationRegistry.TryResolveLegacyProxyExecutable("create_method", out proxyExecutable), "create_method should expose a proxy executable.");
        AssertEqual("AscetCreateMethod.exe", proxyExecutable, "create_method should proxy to AscetCreateMethod.exe.");
    }

    private static void TestExpandedProxyCoverage()
    {
        AssertProxyOperation("read_method_code", "pooled_read", true, false, String.Empty);
        AssertProxyOperation("read_method_signature", "pooled_read", true, false, String.Empty);
        AssertProxyOperation("read_implementation", "pooled_read", true, false, "AscetReadImplementation.exe");
        AssertProxyOperation("read_component_children", "pooled_read", true, false, String.Empty);
        AssertProxyOperation("list_diagrams", "pooled_read", true, false, String.Empty);
        AssertProxyOperation("read_block_diagram", "legacy_read", false, false, "AscetReadBlockDiagram.exe");
        AssertProxyOperation("read_state_machine_flow", "legacy_read", false, false, "AscetReadStateMachineFlow.exe");
        AssertProxyOperation("read_component_refs", "legacy_read", false, false, "AscetReadComponentRefs.exe");
        AssertProxyOperation("read_element_refs", "legacy_read", false, false, "AscetReadElementRefs.exe");
        AssertProxyOperation("find_elements", "legacy_read", false, false, "AscetFindElements.exe");
        AssertProxyOperation("read_dependent_chain", "legacy_read", false, false, String.Empty);
        AssertUnsupportedRegistryOperation("read_import_export_match", "read_import_export_match should not be registered.");
        AssertUnsupportedRegistryOperation("read_import_export_matches", "read_import_export_matches should not be registered.");
        AssertUnsupportedRegistryOperation("plan_element_dependency", "plan_element_dependency should not be registered.");
        AssertProxyOperation("read_text_code", "legacy_read", false, false, "AscetReadTextCode.exe");
        AssertProxyOperation("create_folder", "serial_write", false, true, "AscetCreateFolder.exe");
        AssertProxyOperation("delete_component", "serial_write", false, true, "AscetDeleteComponent.exe");
        AssertProxyOperation("delete_method", "serial_write", false, true, "AscetDeleteMethod.exe");
        AssertProxyOperation("set_class_method_code", "serial_write", true, false, "AscetSetClassMethodCode.exe");
        AssertProxyOperation("set_method_signature", "serial_write", true, false, "AscetSetMethodSignature.exe");
        AssertProxyOperation("set_element_dependency", "serial_write", false, false, String.Empty);
        AssertProxyOperation("set_module_code", "serial_write", false, false, "AscetSetModuleCode.exe");
        AssertProxyOperation("set_state_machine_code", "serial_write", false, false, "AscetSetStateMachineCode.exe");
        AssertProxyOperation("read_project_formulas", "legacy_read", false, false, String.Empty);
        AssertProxyOperation("apply_project_formula", "serial_write", false, true, "AscetApplyProjectFormula.exe");
        AssertProxyOperation("show_occurrences", "legacy_read", false, false, "AscetShowOccurrences.exe");
    }

    private static void TestSearchFamilyResolution()
    {
        AssertProxyOperation("search_components", "pooled_read", true, false, "AscetSearchComponents.exe");
        AssertProxyOperation("search_elements", "pooled_read", true, false, "AscetSearchElements.exe");
        AssertProxyOperation("search_occurrences", "legacy_read", false, false, "AscetSearchOccurrences.exe");

        AssertTrue(
            OperationParser.ParseHostOperation(new string[] { "search_components" }) != null,
            "search_components should parse as a host-backed pooled read operation.");
        AssertTrue(
            OperationParser.ParseHostOperation(new string[] { "search_elements" }) != null,
            "search_elements should parse as a host-backed pooled read operation so component-scoped exact searches reuse the bound database session.");
        AssertUnsupportedHostOperation(
            "search_occurrences",
            "search_occurrences should not parse as a host-backed operation in the first search implementation.");
    }

    private static void TestUnsupportedOperationError()
    {
        AscetJsonProtocol protocol = new AscetJsonProtocol();

        try
        {
            OperationParser.ParseExecOperation(new string[] { "bogus_operation" });
            throw new Exception("unsupported operation should throw.");
        }
        catch (Exception ex)
        {
            string json = protocol.Serialize(protocol.ExecError("bogus_operation", ex));
            Dictionary<string, object> payload = protocol.Deserialize<Dictionary<string, object>>(json);
            Dictionary<string, object> error = GetDictionary(payload, "error");

            AssertTrue(error != null, "unsupported operation should serialize an error envelope.");
            AssertEqual("unsupported_operation", GetString(error, "code"), "unsupported operation should map to unsupported_operation.");
            AssertEqual("parse_exec_operation", GetString(error, "operation"), "unsupported exec operation should preserve parser context.");
        }
    }

    private static void TestHostRestrictions()
    {
        AssertTrue(
            OperationParser.ParseHostOperation(new string[] { "create_component" }) != null,
            "create_component should parse as a host-backed operation.");
        AssertTrue(
            OperationParser.ParseHostOperation(new string[] { "create_method" }) != null,
            "create_method should parse as a host-backed operation.");
        AssertTrue(
            OperationParser.ParseHostOperation(new string[] { "set_method_code" }) != null,
            "set_method_code should parse as a host-backed operation.");
        AssertTrue(
            OperationParser.ParseHostOperation(new string[] { "set_class_method_code" }) != null,
            "set_class_method_code should parse as a host-backed operation.");
        AssertTrue(
            OperationParser.ParseHostOperation(new string[] { "set_method_signature" }) != null,
            "set_method_signature should parse as a host-backed serial write operation.");

        AssertTrue(
            OperationParser.ParseHostOperation(new string[] { "resolve_component" }) != null,
            "resolve_component should parse as a host-backed operation.");
        AssertTrue(
            OperationParser.ParseHostOperation(new string[] { "read_method_code" }) != null,
            "read_method_code should parse as a host-backed operation.");
        AssertTrue(
            OperationParser.ParseHostOperation(new string[] { "read_method_signature" }) != null,
            "read_method_signature should parse as a host-backed operation.");
        AssertTrue(
            OperationParser.ParseHostOperation(new string[] { "read_implementation" }) != null,
            "read_implementation should parse as a host-backed operation.");
        AssertUnsupportedHostOperation(
            "read_block_diagram",
            "read_block_diagram should not parse as a host-backed operation because block diagram ToolAPI reads can destabilize the long-lived ASCET read host.");
        AssertUnsupportedHostOperation(
            "read_state_machine_flow",
            "read_state_machine_flow should not parse as a host-backed operation because it can destabilize the long-lived ASCET read host.");
        AssertUnsupportedHostOperation(
            "read_dependent_chain",
            "read_dependent_chain should stay one-shot because it exports and scans XML.");
        AssertTrue(
            OperationParser.ParseHostOperation(new string[] { "read_component_children" }) != null,
            "read_component_children should parse as a host-backed operation.");
        AssertTrue(
            OperationParser.ParseHostOperation(new string[] { "list_diagrams" }) != null,
            "list_diagrams should parse as a host-backed operation.");
    }

    private static void TestBatchSupportParsing()
    {
        OperationDescriptor writeDescriptor = OperationParser.ParseBatchOperation(new string[] { "create_method" });
        AssertTrue(writeDescriptor != null, "create_method should parse as a batch-capable write operation.");
        AssertEqual("batch_write", writeDescriptor.BatchSupportId, "create_method batch parser should preserve batch_write.");

        OperationDescriptor deleteComponentDescriptor = OperationParser.ParseBatchOperation(new string[] { "delete_component" });
        AssertTrue(deleteComponentDescriptor != null, "delete_component should parse as a batch-capable write operation.");
        AssertEqual("batch_write", deleteComponentDescriptor.BatchSupportId, "delete_component batch parser should preserve batch_write.");

        OperationDescriptor deleteMethodDescriptor = OperationParser.ParseBatchOperation(new string[] { "delete_method" });
        AssertTrue(deleteMethodDescriptor != null, "delete_method should parse as a batch-capable write operation.");
        AssertEqual("batch_write", deleteMethodDescriptor.BatchSupportId, "delete_method batch parser should preserve batch_write.");

        OperationDescriptor readDescriptor = OperationParser.ParseBatchOperation(new string[] { "list_methods" });
        AssertTrue(readDescriptor != null, "list_methods should parse as a batch-capable read operation.");
        AssertEqual("batch_read", readDescriptor.BatchSupportId, "list_methods batch parser should preserve batch_read.");

        AssertUnsupportedParserOperation(
            delegate() { OperationParser.ParseBatchOperation(new string[] { "resolve_component" }); },
            "parse_batch_operation");
    }

    private static void TestExecutionProfiles()
    {
        OperationDescriptor pooledRead = OperationRegistry.ResolveOrThrow("list_folders");
        AssertEqual("stable", pooledRead.ExecutionProfile.HostSafety, "list_folders should advertise a stable host safety profile.");
        AssertEqual("prefer_host", pooledRead.ExecutionProfile.HostPolicy, "list_folders should prefer host execution.");
        AssertEqual("read", pooledRead.ExecutionProfile.TimeoutClass, "list_folders should use read timeout class.");

        OperationDescriptor fragileRead = OperationRegistry.ResolveOrThrow("read_block_diagram");
        AssertEqual("fragile", fragileRead.ExecutionProfile.HostSafety, "read_block_diagram should advertise fragile host safety.");
        AssertEqual("force_one_shot", fragileRead.ExecutionProfile.HostPolicy, "read_block_diagram should force one-shot execution.");
        AssertEqual("expensive_read", fragileRead.ExecutionProfile.TimeoutClass, "read_block_diagram should use expensive read timeout class.");
        AssertTrue(!fragileRead.HostEligible, "fragile read_block_diagram should not be host eligible.");

        OperationDescriptor search = OperationRegistry.ResolveOrThrow("find_elements");
        AssertEqual("expensive_scan", search.ExecutionProfile.HostSafety, "find_elements should advertise expensive scan host safety.");
        AssertEqual("force_one_shot", search.ExecutionProfile.HostPolicy, "find_elements should force one-shot execution.");
        AssertEqual("scan", search.ExecutionProfile.TimeoutClass, "find_elements should use scan timeout class.");
        AssertTrue(search.ExecutionProfile.PageBudget.HasValue, "find_elements should expose a page budget.");
        AssertTrue(!search.HostEligible, "find_elements should not be host eligible.");

        OperationDescriptor dependentChain = OperationRegistry.ResolveOrThrow("read_dependent_chain");
        AssertEqual("expensive_scan", dependentChain.ExecutionProfile.HostSafety, "read_dependent_chain should advertise expensive scan host safety.");
        AssertEqual("force_one_shot", dependentChain.ExecutionProfile.HostPolicy, "read_dependent_chain should force one-shot execution.");
        AssertEqual("scan", dependentChain.ExecutionProfile.TimeoutClass, "read_dependent_chain should use scan timeout class.");
        AssertTrue(dependentChain.ExecutionProfile.PageBudget.HasValue, "read_dependent_chain should expose a page budget.");
        AssertTrue(!dependentChain.HostEligible, "read_dependent_chain should not be host eligible.");

        OperationDescriptor write = OperationRegistry.ResolveOrThrow("set_method_code");
        AssertEqual("write", write.ExecutionProfile.HostSafety, "set_method_code should advertise write host safety.");
        AssertEqual("prefer_host", write.ExecutionProfile.HostPolicy, "set_method_code should preserve write host routing.");
        AssertEqual("write", write.ExecutionProfile.TimeoutClass, "set_method_code should use write timeout class.");
    }

    private static void TestDescriptorInvariants()
    {
        OperationDescriptor serialWriteHost = new OperationDescriptor(
            "serial_write_host",
            ExecutionLane.SerialWrite,
            true,
            BatchSupportShape.None);
        AssertTrue(serialWriteHost.HostEligible, "serial_write should allow host eligible descriptors.");

        AssertInvalidDescriptor(
            delegate() { new OperationDescriptor("bad_diagnostic_batch", ExecutionLane.Diagnostic, false, BatchSupportShape.Read); },
            "diagnostic should reject batch_read descriptors.");
    }

    private static void TestDeterministicEnumeration()
    {
        IList<OperationDescriptor> descriptors = OperationRegistry.GetAll();
        AssertTrue(descriptors != null && descriptors.Count > 10, "GetAll should return a populated descriptor list.");

        string previous = String.Empty;
        for (int i = 0; i < descriptors.Count; i++)
        {
            OperationDescriptor descriptor = descriptors[i];
            AssertTrue(descriptor != null, "GetAll should not include null descriptors.");
            if (i > 0)
            {
                AssertTrue(StringComparer.Ordinal.Compare(previous, descriptor.OperationId) <= 0, "GetAll should be sorted by operation id.");
            }

            previous = descriptor.OperationId;
        }

        AssertEqual("apply_element_spec", descriptors[0].OperationId, "GetAll should sort apply_element_spec first.");
        AssertContains(descriptors, "resolve_component", "GetAll should include resolve_component.");
        AssertContains(descriptors, "create_method", "GetAll should include create_method.");
        AssertContains(descriptors, "set_method_signature", "GetAll should include set_method_signature.");
        AssertContains(descriptors, "read_method_code", "GetAll should include read_method_code.");
        AssertContains(descriptors, "read_method_signature", "GetAll should include read_method_signature.");
    }

    private static void AssertContains(IList<OperationDescriptor> descriptors, string operationId, string message)
    {
        if (descriptors == null)
        {
            throw new Exception(message);
        }

        for (int i = 0; i < descriptors.Count; i++)
        {
            OperationDescriptor descriptor = descriptors[i];
            if (descriptor != null && String.Equals(descriptor.OperationId, operationId, StringComparison.Ordinal))
            {
                return;
            }
        }

        throw new Exception(message);
    }

    private static void AssertProxyOperation(string operationId, string expectedLaneId, bool expectedHostEligible, bool expectedSupportsBatch, string expectedProxyExecutable)
    {
        OperationDescriptor descriptor = OperationRegistry.ResolveOrThrow(operationId);
        AssertTrue(descriptor != null, operationId + " should resolve.");
        AssertEqual(expectedLaneId, descriptor.LaneId, operationId + " should preserve its execution lane.");
        AssertTrue(descriptor.HostEligible == expectedHostEligible, operationId + " should preserve host eligibility.");
        AssertTrue(descriptor.SupportsBatch == expectedSupportsBatch, operationId + " should preserve batch support.");

        string proxyExecutable;
        bool hasProxyExecutable = OperationRegistry.TryResolveLegacyProxyExecutable(operationId, out proxyExecutable);
        if (String.IsNullOrWhiteSpace(expectedProxyExecutable))
        {
            AssertTrue(!hasProxyExecutable, operationId + " should not require a legacy proxy executable.");
            return;
        }

        AssertTrue(hasProxyExecutable, operationId + " should expose a proxy executable.");
        AssertEqual(expectedProxyExecutable, proxyExecutable, operationId + " should preserve its proxy executable.");
    }

    private static void AssertUnsupportedHostOperation(string operationId, string message)
    {
        try
        {
            OperationParser.ParseHostOperation(new string[] { operationId });
            throw new Exception(message);
        }
        catch (AscetReadException ex)
        {
            AssertEqual("unsupported_operation", ex.Code, message);
        }
    }

    private static void AssertUnsupportedRegistryOperation(string operationId, string message)
    {
        try
        {
            OperationRegistry.ResolveOrThrow(operationId);
            throw new Exception(message);
        }
        catch (AscetReadException ex)
        {
            AssertEqual("unsupported_operation", ex.Code, message);
        }
    }

    private static void AssertUnsupportedParserOperation(Action action, string expectedOperation)
    {
        AscetJsonProtocol protocol = new AscetJsonProtocol();

        try
        {
            action();
            throw new Exception("unsupported operation should throw.");
        }
        catch (Exception ex)
        {
            string json = protocol.Serialize(protocol.ExecError("unsupported", ex));
            Dictionary<string, object> payload = protocol.Deserialize<Dictionary<string, object>>(json);
            Dictionary<string, object> error = GetDictionary(payload, "error");

            AssertTrue(error != null, "unsupported operation should serialize an error envelope.");
            AssertEqual("unsupported_operation", GetString(error, "code"), "unsupported operation should map to unsupported_operation.");
            AssertEqual(expectedOperation, GetString(error, "operation"), "unsupported operation should preserve parser context.");
        }
    }

    private static void AssertInvalidDescriptor(Action action, string message)
    {
        try
        {
            action();
            throw new Exception(message);
        }
        catch (ArgumentException)
        {
        }
    }

    private static Dictionary<string, object> GetDictionary(Dictionary<string, object> payload, string key)
    {
        if (payload == null || String.IsNullOrWhiteSpace(key) || !payload.ContainsKey(key))
        {
            return null;
        }

        return payload[key] as Dictionary<string, object>;
    }

    private static string GetString(Dictionary<string, object> payload, string key)
    {
        if (payload == null || String.IsNullOrWhiteSpace(key) || !payload.ContainsKey(key) || payload[key] == null)
        {
            return String.Empty;
        }

        return Convert.ToString(payload[key]) ?? String.Empty;
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
}
