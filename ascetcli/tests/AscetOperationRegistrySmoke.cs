using System;
using System.Collections.Generic;
using System.Reflection;

public static class AscetOperationRegistrySmoke
{
    public static int Main()
    {
        try
        {
            TestBridgeEntryPoint();
            TestRegistryCoverage();
            TestBridgeHandlers();
            TestAllDescriptorInvariants();
            TestPolicies();
            TestBatchSupport();
            TestVisibility();
            TestDeterministicEnumeration();
            TestRetiredOperationsRemainAbsent();
            Console.WriteLine("AscetOperationRegistrySmoke passed.");
            return 0;
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine(ex.Message);
            return 1;
        }
    }

    private static void TestBridgeEntryPoint()
    {
        MethodInfo main = typeof(AscetBridge).GetMethod("Main", BindingFlags.Public | BindingFlags.Static);
        AssertTrue(main != null, "AscetBridge.Main must exist.");
        AssertTrue(Attribute.IsDefined(main, typeof(STAThreadAttribute)), "AscetBridge.Main must be marked STAThread.");
    }

    private static void TestRegistryCoverage()
    {
        IList<OperationDescriptor> descriptors = OperationRegistry.GetAll();
        AssertEqual(73, descriptors.Count, "OperationRegistry descriptor count changed without updating the migration inventory.");
        AssertEqual(72, AscetBridgeOperationRegistry.GetAll().Count, "Bridge should expose every live operation and exclude no-session capabilities.");
        AssertTrue(OperationRegistry.ResolveOrThrow("capabilities").SessionPolicy == SessionPolicy.NoSession, "capabilities must remain no-session.");
    }

    private static void TestBridgeHandlers()
    {
        IList<OperationDescriptor> descriptors = AscetBridgeOperationRegistry.GetAll();
        int legacyCount = 0;
        for (int i = 0; i < descriptors.Count; i++)
        {
            OperationDescriptor descriptor = descriptors[i];
            AssertTrue(descriptor.Handler != null, descriptor.OperationId + " must have a Bridge handler.");
            AssertTrue(descriptor.SessionPolicy != SessionPolicy.NoSession, descriptor.OperationId + " must be a live Bridge operation.");
            if (descriptor.HandlerKind == OperationHandlerKind.LegacyOneShotAdapter)
            {
                legacyCount++;
                AssertTrue(descriptor.TransportPolicy == TransportPolicy.OneShotOnly, descriptor.OperationId + " legacy handler must be one-shot only.");
                LegacyOperationEntryPoint entryPoint;
                AssertTrue(AscetLegacyOperationRegistry.TryResolve(descriptor.OperationId, out entryPoint), descriptor.OperationId + " must have an explicit legacy delegate.");
            }
        }
        AssertEqual(44, legacyCount, "Legacy operation inventory changed without updating the migration audit.");
    }

    private static void TestAllDescriptorInvariants()
    {
        IList<OperationDescriptor> descriptors = OperationRegistry.GetAll();
        int publicCount = 0;
        int internalCount = 0;
        int diagnosticCount = 0;
        for (int i = 0; i < descriptors.Count; i++)
        {
            OperationDescriptor descriptor = descriptors[i];
            AssertTrue(descriptor.OperationId.IndexOf(".exe", StringComparison.OrdinalIgnoreCase) < 0, descriptor.OperationId + " must not contain executable metadata.");
            AssertTrue(descriptor.TransportPolicy == TransportPolicy.OneShotOnly, descriptor.OperationId + " must remain one-shot in Milestone A.");
            AssertTrue(descriptor.RetryPolicy == OperationRetryPolicy.Never, descriptor.OperationId + " must not retry in Milestone A.");

            if (descriptor.SessionPolicy == SessionPolicy.NoSession)
            {
                AssertTrue(descriptor.RouteVisibility == RouteVisibility.DiagnosticOnly, descriptor.OperationId + " no-session route must be diagnostic-only.");
                AssertTrue(descriptor.Lane == ExecutionLane.Diagnostic, descriptor.OperationId + " no-session route must use the diagnostic lane.");
            }
            else
            {
                AssertTrue(descriptor.SessionPolicy == SessionPolicy.FreshSession, descriptor.OperationId + " live route must use a fresh session.");
            }

            if (descriptor.MutatesDatabase)
            {
                AssertTrue(descriptor.Lane == ExecutionLane.SerialWrite, descriptor.OperationId + " mutating route must use the serial-write lane.");
                AssertTrue(descriptor.BatchSupport != BatchSupportShape.Read, descriptor.OperationId + " mutating route cannot advertise batch-read support.");
            }
            if (descriptor.Lane == ExecutionLane.SerialWrite)
            {
                AssertTrue(descriptor.MutatesDatabase, descriptor.OperationId + " serial-write route must declare mutation.");
            }
            if (descriptor.BatchSupport == BatchSupportShape.Write)
            {
                AssertTrue(descriptor.MutatesDatabase, descriptor.OperationId + " batch-write route must declare mutation.");
            }

            switch (descriptor.RouteVisibility)
            {
                case RouteVisibility.PublicContract:
                    publicCount++;
                    break;
                case RouteVisibility.InternalRuntime:
                    internalCount++;
                    break;
                case RouteVisibility.DiagnosticOnly:
                    diagnosticCount++;
                    break;
            }
        }

        AssertEqual(56, publicCount, "Public contract route inventory changed without updating contract coverage.");
        AssertEqual(16, internalCount, "Internal runtime route inventory changed without updating the migration audit.");
        AssertEqual(1, diagnosticCount, "Diagnostic route inventory changed without updating the migration audit.");
    }

    private static void TestPolicies()
    {
        OperationDescriptor write = OperationRegistry.ResolveOrThrow("set_method_code");
        AssertTrue(write.MutatesDatabase, "set_method_code must declare mutation.");
        AssertTrue(write.RetryPolicy == OperationRetryPolicy.Never, "write operations must not retry.");
        AssertTrue(write.SessionPolicy == SessionPolicy.FreshSession, "Milestone A writes must use a fresh session.");
        AssertTrue(write.HandlerKind == OperationHandlerKind.Typed, "set_method_code should use its typed handler.");

        OperationDescriptor legacyWrite = OperationRegistry.ResolveOrThrow("create_method");
        AssertTrue(legacyWrite.MutatesDatabase, "create_method must declare mutation.");
        AssertTrue(legacyWrite.HandlerKind == OperationHandlerKind.LegacyOneShotAdapter, "create_method should remain an audited one-shot adapter during migration.");

        OperationDescriptor fragileRead = OperationRegistry.ResolveOrThrow("read_block_diagram");
        AssertEqual("fragile", fragileRead.ExecutionProfile.HostSafety, "read_block_diagram should retain fragile-read metadata.");
        AssertTrue(fragileRead.HandlerKind == OperationHandlerKind.Typed, "read_block_diagram already has an in-process typed path.");

        OperationDescriptor readEnumerators = OperationRegistry.ResolveOrThrow("read_enumerators");
        AssertTrue(!readEnumerators.MutatesDatabase, "read_enumerators must remain read-only.");
        AssertTrue(readEnumerators.HandlerKind == OperationHandlerKind.LegacyOneShotAdapter, "read_enumerators must use the in-process legacy adapter.");

        OperationDescriptor enumerators = OperationRegistry.ResolveOrThrow("set_enumerators");
        AssertTrue(enumerators.MutatesDatabase, "set_enumerators must declare mutation.");
        AssertTrue(enumerators.HandlerKind == OperationHandlerKind.LegacyOneShotAdapter, "set_enumerators must use its audited in-process legacy adapter.");

        OperationDescriptor editableCheck = OperationRegistry.ResolveOrThrow("component_editable_check");
        AssertTrue(editableCheck.Lane == ExecutionLane.LegacyRead, "component_editable_check must remain a serialized one-shot read.");
        OperationDescriptor editableSet = OperationRegistry.ResolveOrThrow("component_editable_set");
        AssertTrue(editableSet.Lane == ExecutionLane.SerialWrite, "component_editable_set must remain a serialized write.");
    }

    private static void TestBatchSupport()
    {
        OperationDescriptor write = OperationParser.ParseBatchOperation(new string[] { "create_method" });
        AssertEqual("batch_write", write.BatchSupportId, "create_method must remain batch-write capable.");
        OperationDescriptor read = OperationParser.ParseBatchOperation(new string[] { "list_methods" });
        AssertEqual("batch_read", read.BatchSupportId, "list_methods must remain batch-read capable.");
        AssertUnsupportedBatch("read_method_code");
    }

    private static void TestVisibility()
    {
        AssertTrue(OperationRegistry.ResolveOrThrow("get_tree").RouteVisibility == RouteVisibility.PublicContract, "get_tree must remain public.");
        AssertTrue(OperationRegistry.ResolveOrThrow("get_database_identity").RouteVisibility == RouteVisibility.PublicContract, "get_database_identity must remain public.");
        AssertTrue(OperationRegistry.ResolveOrThrow("component_editable_check").RouteVisibility == RouteVisibility.InternalRuntime, "component_editable_check is an internal runtime route.");
        AssertTrue(OperationRegistry.ResolveOrThrow("component_editable_set").RouteVisibility == RouteVisibility.InternalRuntime, "component_editable_set is an internal runtime route.");
        AssertTrue(OperationRegistry.ResolveOrThrow("get_database_catalog").RouteVisibility == RouteVisibility.InternalRuntime, "database catalog is an internal runtime route.");
        AssertTrue(OperationRegistry.ResolveOrThrow("list_folders").RouteVisibility == RouteVisibility.InternalRuntime, "list_folders is an internal runtime route.");
        AssertTrue(OperationRegistry.ResolveOrThrow("read_code").RouteVisibility == RouteVisibility.InternalRuntime, "read_code compatibility alias must be registered as internal runtime.");
        AssertTrue(OperationRegistry.ResolveOrThrow("diff").RouteVisibility == RouteVisibility.InternalRuntime, "diff compatibility alias must be registered as internal runtime.");
        AssertTrue(OperationRegistry.ResolveOrThrow("read_block_diagram_raw").RouteVisibility == RouteVisibility.InternalRuntime, "read_block_diagram_raw compatibility alias must be registered as internal runtime.");
        AssertTrue(OperationRegistry.ResolveOrThrow("capabilities").RouteVisibility == RouteVisibility.DiagnosticOnly, "capabilities is a diagnostic control-plane route.");
    }

    private static void TestDeterministicEnumeration()
    {
        IList<OperationDescriptor> descriptors = OperationRegistry.GetAll();
        string previous = String.Empty;
        for (int i = 0; i < descriptors.Count; i++)
        {
            OperationDescriptor descriptor = descriptors[i];
            AssertTrue(descriptor != null, "Registry must not contain null descriptors.");
            if (i > 0)
            {
                AssertTrue(StringComparer.Ordinal.Compare(previous, descriptor.OperationId) < 0, "Registry operation ids must be unique and sorted.");
            }
            previous = descriptor.OperationId;
        }
    }

    private static void TestRetiredOperationsRemainAbsent()
    {
        AssertUnsupportedRegistryOperation("resolve_component");
        AssertUnsupportedRegistryOperation("find_elements");
        AssertUnsupportedRegistryOperation("search_components");
        AssertUnsupportedRegistryOperation("search_elements");
        AssertUnsupportedRegistryOperation("search_occurrences");
    }

    private static void AssertUnsupportedBatch(string operationId)
    {
        try
        {
            OperationParser.ParseBatchOperation(new string[] { operationId });
            throw new Exception(operationId + " should not support batch execution.");
        }
        catch (AscetReadException ex)
        {
            AssertEqual("unsupported_operation", ex.Code, operationId + " should fail with unsupported_operation.");
        }
    }

    private static void AssertUnsupportedRegistryOperation(string operationId)
    {
        try
        {
            OperationRegistry.ResolveOrThrow(operationId);
            throw new Exception(operationId + " should remain retired.");
        }
        catch (AscetReadException ex)
        {
            AssertEqual("unsupported_operation", ex.Code, operationId + " should remain absent.");
        }
    }

    private static void AssertTrue(bool condition, string message)
    {
        if (!condition)
        {
            throw new Exception(message);
        }
    }

    private static void AssertEqual(int expected, int actual, string message)
    {
        if (expected != actual)
        {
            throw new Exception(message + " Expected " + expected + " but got " + actual + ".");
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
