using System;
using System.Collections;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Threading;
using System.Web.Script.Serialization;

public static class AscetReadHostSmoke
{
    private static readonly JavaScriptSerializer Serializer = new JavaScriptSerializer();
    private const int EnvironmentStartupTimeoutMs = 15000;
    private const int EnvironmentStartupPollIntervalMs = 250;
    private const int ProcessCleanupTimeoutMs = 5000;

    public static int Main()
    {
        Process process = null;

        try
        {
            string hostPath = GetHostPath();
            AssertTrue(File.Exists(hostPath), "AscetReadHost.exe should exist in the ascet-csharp bin output.");
            AssertHostBuildsOwnListFoldersPayload();
            AssertHostSupportsExpandedExploreCoverage();

            process = StartHost(hostPath);
            int requestCountBaseline;
            if (ShouldSkipForEnvironment(process, out requestCountBaseline))
            {
                Console.WriteLine("AscetReadHostSmoke passed (live probe skipped: no usable ASCET database session is available).");
                return 0;
            }

            TestValidListFolders(process, requestCountBaseline + 1);
            TestValidListComponents(process, requestCountBaseline + 2);
            TestCapabilities(process, requestCountBaseline + 3);
            bool methodProbeExecuted = TestValidListMethods(process);
            bool summaryProbeExecuted = TestValidReadComponentSummary(process);
            bool readMethodCodeProbeExecuted = TestValidReadMethodCode(process);
            bool readImplementationProbeExecuted = TestValidReadImplementation(process);
            bool readBlockDiagramProbeExecuted = false;
            bool readStateMachineFlowProbeExecuted = TestUnsupportedReadStateMachineFlow(process);
            bool resolveProbeExecuted = TestValidResolveComponent(process);
            bool childrenProbeExecuted = TestValidReadComponentChildren(process);
            bool diagramsProbeExecuted = TestValidListDiagrams(process);
            TestUnsupportedCommand(process);
            TestInvalidEnvelope(process);
            TestInvalidJson(process);
            TestHostRecoversAfterErrors(process, methodProbeExecuted, summaryProbeExecuted, readMethodCodeProbeExecuted, readImplementationProbeExecuted, readBlockDiagramProbeExecuted, readStateMachineFlowProbeExecuted, resolveProbeExecuted, childrenProbeExecuted, diagramsProbeExecuted);

            Dictionary<string, object> shutdown = new Dictionary<string, object>();
            shutdown["type"] = "shutdown";
            process.StandardInput.WriteLine(Serialize(shutdown));
            process.StandardInput.Flush();
            process.StandardInput.Close();

            AssertTrue(process.WaitForExit(10000), "Host should exit after shutdown.");
            if (process.ExitCode != 0)
            {
                throw new Exception("AscetReadHost exited with code " + process.ExitCode + "." + Environment.NewLine + ReadRemaining(process.StandardError));
            }

            Console.WriteLine("AscetReadHostSmoke passed.");
            return 0;
        }
        catch (Exception ex)
        {
            if (process != null && !process.HasExited)
            {
                TryKillProcessTree(process);
            }

            Console.Error.WriteLine(ex.Message);
            return 1;
        }
        finally
        {
            if (process != null)
            {
                process.Dispose();
            }
        }
    }

    private static Process StartHost(string hostPath)
    {
        ProcessStartInfo startInfo = new ProcessStartInfo
        {
            FileName = hostPath,
            UseShellExecute = false,
            RedirectStandardInput = true,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            CreateNoWindow = true,
            WorkingDirectory = Path.GetDirectoryName(hostPath)
        };

        Process process = new Process();
        process.StartInfo = startInfo;
        if (!process.Start())
        {
            throw new Exception("Failed to start AscetReadHost.exe.");
        }

        return process;
    }

    private static bool ShouldSkipForEnvironment(Process process, out int requestCountBaseline)
    {
        requestCountBaseline = 0;

        if (process == null)
        {
            return false;
        }

        DateTime deadlineUtc = DateTime.UtcNow.AddMilliseconds(EnvironmentStartupTimeoutMs);
        while (DateTime.UtcNow < deadlineUtc)
        {
            if (!process.HasExited)
            {
                Thread.Sleep(EnvironmentStartupPollIntervalMs);
                continue;
            }

            string stderr = ReadRemaining(process.StandardError);
            if (stderr.IndexOf("database_not_open", StringComparison.OrdinalIgnoreCase) >= 0
                || stderr.IndexOf("tool_connect_failed", StringComparison.OrdinalIgnoreCase) >= 0)
            {
                return true;
            }

            throw new Exception("AscetReadHost exited during startup." + Environment.NewLine + stderr);
        }

        Dictionary<string, object> request = new Dictionary<string, object>();
        request["type"] = "request";
        request["id"] = "environment-probe-1";
        request["commandId"] = "AscetListFolders";
        request["payload"] = new Dictionary<string, object>
        {
            { "depth", 0 }
        };

        Dictionary<string, object> response = SendJsonRequest(process, request);
        if (GetBool(response, "ok"))
        {
            Dictionary<string, object> result = GetDictionary(response, "result");
            Dictionary<string, object> host = GetDictionary(result, "host");
            requestCountBaseline = GetInt(host, "requestCount", 0);
            return false;
        }

        Dictionary<string, object> error = GetDictionary(response, "error");
        string code = GetString(error, "code");
        return IsEnvironmentSkipCode(code);
    }

    private static bool IsEnvironmentSkipCode(string code)
    {
        return String.Equals(code, "database_not_open", StringComparison.OrdinalIgnoreCase)
            || String.Equals(code, "tool_connect_failed", StringComparison.OrdinalIgnoreCase)
            || String.Equals(code, "tool_connect_timeout", StringComparison.OrdinalIgnoreCase);
    }

    private static void AssertHostBuildsOwnListFoldersPayload()
    {
        string sourcePath = GetHostSourcePath();
        AssertTrue(File.Exists(sourcePath), "AscetReadHost.cs should exist for source regression checks.");

        string source = File.ReadAllText(sourcePath);
        AssertTrue(
            source.IndexOf("AscetListFolders.FormatJsonOutput(", StringComparison.Ordinal) < 0,
            "AscetReadHost should build its own list-folders payload instead of round-tripping CLI formatter JSON.");
        AssertTrue(
            source.IndexOf("Dictionary<string, object> result = ExecuteSuppressingConsoleOut(delegate()", StringComparison.Ordinal) >= 0,
            "AscetReadHost should suppress Console.Out while executing request handlers so protocol JSON stays clean.");
        AssertTrue(
            source.IndexOf("Dictionary<string, object> retriedResult = ExecuteSuppressingConsoleOut(delegate()", StringComparison.Ordinal) >= 0,
            "AscetReadHost should suppress Console.Out while retrying request handlers so protocol JSON stays clean.");
    }

    private static void AssertHostSupportsExpandedExploreCoverage()
    {
        string dispatcherSourcePath = GetHostDispatcherSourcePath();
        string capabilitySourcePath = GetHostCapabilitySourcePath();
        string operationRegistryPath = GetOperationRegistrySourcePath();

        AssertTrue(File.Exists(dispatcherSourcePath), "AscetReadHostDispatcher.cs should exist for source regression checks.");
        AssertTrue(File.Exists(capabilitySourcePath), "AscetReadHostCapabilityService.cs should exist for source regression checks.");
        AssertTrue(File.Exists(operationRegistryPath), "OperationRegistry.cs should exist for source regression checks.");

        string dispatcherSource = File.ReadAllText(dispatcherSourcePath);
        string capabilitySource = File.ReadAllText(capabilitySourcePath);
        string operationRegistrySource = File.ReadAllText(operationRegistryPath);

        AssertTrue(
            dispatcherSource.IndexOf("DispatchResolveComponent", StringComparison.Ordinal) >= 0,
            "AscetReadHostDispatcher should include DispatchResolveComponent.");
        AssertTrue(
            dispatcherSource.IndexOf("DispatchReadComponentChildren", StringComparison.Ordinal) >= 0,
            "AscetReadHostDispatcher should include DispatchReadComponentChildren.");
        AssertTrue(
            dispatcherSource.IndexOf("case \"diagrams\":", StringComparison.Ordinal) >= 0,
            "AscetReadHostDispatcher should accept diagrams as a read_component_children group.");
        AssertTrue(
            dispatcherSource.IndexOf("\"variables\", \"diagrams\"", StringComparison.Ordinal) >= 0,
            "AscetReadHostDispatcher should expose diagrams in read_component_children availableGroups.");
        AssertTrue(
            dispatcherSource.IndexOf("counts[\"diagrams\"]", StringComparison.Ordinal) >= 0,
            "AscetReadHostDispatcher should include diagrams in read_component_children counts.");
        AssertTrue(
            dispatcherSource.IndexOf("DispatchReadMethodCode", StringComparison.Ordinal) >= 0,
            "AscetReadHostDispatcher should include DispatchReadMethodCode.");
        AssertTrue(
            dispatcherSource.IndexOf("DispatchReadImplementation", StringComparison.Ordinal) >= 0,
            "AscetReadHostDispatcher should include DispatchReadImplementation.");
        AssertTrue(
            dispatcherSource.IndexOf("DispatchReadBlockDiagram", StringComparison.Ordinal) >= 0,
            "AscetReadHostDispatcher may keep the legacy read_block_diagram handler code, but capabilities must not expose it.");
        AssertTrue(
            dispatcherSource.IndexOf("DispatchReadStateMachineFlow", StringComparison.Ordinal) >= 0,
            "AscetReadHostDispatcher keeps the legacy handler code available, but capabilities must not expose it.");
        AssertTrue(
            dispatcherSource.IndexOf("DispatchListDiagrams", StringComparison.Ordinal) >= 0,
            "AscetReadHostDispatcher should include DispatchListDiagrams.");
        AssertTrue(
            dispatcherSource.IndexOf("DispatchSearchElements", StringComparison.Ordinal) >= 0,
            "AscetReadHostDispatcher should include DispatchSearchElements so search_elements can reuse the bound database session.");

        AssertTrue(
            capabilitySource.IndexOf("descriptor == null || !descriptor.HostEligible", StringComparison.Ordinal) >= 0,
            "AscetReadHostCapabilityService should continue to derive supported commands from hostEligible descriptors.");

        AssertTrue(
            operationRegistrySource.IndexOf("Register(descriptors, \"read_method_code\", ExecutionLane.PooledRead, true", StringComparison.Ordinal) >= 0,
            "OperationRegistry should classify read_method_code as host-backed pooled read.");
        AssertTrue(
            operationRegistrySource.IndexOf("Register(descriptors, \"read_method_signature\", ExecutionLane.PooledRead, true", StringComparison.Ordinal) >= 0,
            "OperationRegistry should classify read_method_signature as host-backed pooled read.");
        AssertTrue(
            operationRegistrySource.IndexOf("Register(descriptors, \"read_implementation\", ExecutionLane.PooledRead, true", StringComparison.Ordinal) >= 0,
            "OperationRegistry should classify read_implementation as host-backed pooled read.");
        AssertTrue(
            operationRegistrySource.IndexOf("Register(descriptors, \"read_block_diagram\", ExecutionLane.LegacyRead, false", StringComparison.Ordinal) >= 0,
            "OperationRegistry should keep read_block_diagram off the long-lived read host.");
        AssertTrue(
            operationRegistrySource.IndexOf("Register(descriptors, \"read_state_machine_flow\", ExecutionLane.LegacyRead, false", StringComparison.Ordinal) >= 0,
            "OperationRegistry should classify read_state_machine_flow as legacy read to avoid destabilizing the long-lived read host.");
        AssertTrue(
            operationRegistrySource.IndexOf("Register(descriptors, \"resolve_component\", ExecutionLane.PooledRead, true", StringComparison.Ordinal) >= 0,
            "OperationRegistry should classify resolve_component as host-backed pooled read.");
        AssertTrue(
            operationRegistrySource.IndexOf("Register(descriptors, \"read_component_children\", ExecutionLane.PooledRead, true", StringComparison.Ordinal) >= 0,
            "OperationRegistry should classify read_component_children as host-backed pooled read.");
        AssertTrue(
            operationRegistrySource.IndexOf("Register(descriptors, \"list_diagrams\", ExecutionLane.PooledRead, true", StringComparison.Ordinal) >= 0,
            "OperationRegistry should classify list_diagrams as host-backed pooled read.");
        AssertTrue(
            operationRegistrySource.IndexOf("Register(descriptors, \"search_elements\", ExecutionLane.PooledRead, true", StringComparison.Ordinal) >= 0,
            "OperationRegistry should classify search_elements as host-backed pooled read.");
    }

    private static void TestValidListFolders(Process process, int expectedRequestCount)
    {
        Dictionary<string, object> request = new Dictionary<string, object>();
        request["type"] = "request";
        request["id"] = "smoke-1";
        request["commandId"] = "AscetListFolders";
        request["payload"] = new Dictionary<string, object>
        {
            { "depth", 0 }
        };

        Dictionary<string, object> response = SendJsonRequest(process, request);
        AssertEqual("response", GetString(response, "type"), "response.type should be 'response'.");
        AssertEqual("smoke-1", GetString(response, "id"), "response.id should round-trip the request id.");
        AssertTrue(GetBool(response, "ok"), "response.ok should be true.");

        Dictionary<string, object> result = GetDictionary(response, "result");
        AssertTrue(result != null, "response.result should be an object.");
        Dictionary<string, object> database = GetDictionary(result, "database");
        AssertTrue(database != null, "response.result should include database metadata.");
        AssertTrue(!String.IsNullOrWhiteSpace(GetString(database, "name")), "database.name should not be empty.");
        AssertTrue(!String.IsNullOrWhiteSpace(GetString(database, "path")), "database.path should not be empty.");

        AssertCommonListFoldersPayload(result, String.Empty, 0);

        Dictionary<string, object> host = GetDictionary(result, "host");
        AssertTrue(host != null, "response.result.host should be an object.");
        AssertEqual("AscetListFolders", GetString(host, "commandId"), "host.commandId should reflect the dispatched command.");
        AssertEqual(expectedRequestCount, GetInt(host, "requestCount", -1), "list_folders should report the expected requestCount.");
        AssertTrue(GetInt(host, "sessionGeneration", 0) >= 1, "host.sessionGeneration should be present and >= 1.");
        AssertEqual("AscetGetCapabilities", GetString(host, "capabilityCommandId"), "host list_folders should expose the capability command id.");
        AssertContains(GetList(host, "supportedCommands"), "AscetReadComponentSummary", "host list_folders supportedCommands should advertise AscetReadComponentSummary.");
        AssertContains(GetList(host, "supportedCommands"), "AscetReadMethodCode", "host list_folders supportedCommands should advertise AscetReadMethodCode.");
        AssertContains(GetList(host, "supportedCommands"), "AscetReadMethodSignature", "host list_folders supportedCommands should advertise AscetReadMethodSignature.");
        AssertContains(GetList(host, "supportedCommands"), "AscetReadImplementation", "host list_folders supportedCommands should advertise AscetReadImplementation.");
        AssertNotContains(GetList(host, "supportedCommands"), "AscetReadBlockDiagram", "host list_folders supportedCommands should not advertise AscetReadBlockDiagram.");
        AssertContains(GetList(host, "supportedCommands"), "AscetResolveComponent", "host list_folders supportedCommands should advertise AscetResolveComponent.");
        AssertContains(GetList(host, "supportedCommands"), "AscetReadComponentChildren", "host list_folders supportedCommands should advertise AscetReadComponentChildren.");
        AssertContains(GetList(host, "supportedCommands"), "AscetListDiagrams", "host list_folders supportedCommands should advertise AscetListDiagrams.");
        AssertContains(GetList(host, "supportedCommands"), "AscetSearchElements", "host list_folders supportedCommands should advertise AscetSearchElements.");
        AssertContains(GetList(host, "supportedCommands"), "AscetGetCapabilities", "host list_folders supportedCommands should advertise AscetGetCapabilities.");
        AssertNotContains(GetList(host, "supportedCommands"), "AscetReadStateMachineFlow", "host list_folders supportedCommands should not advertise AscetReadStateMachineFlow.");
        AssertContains(GetList(host, "supportedOperations"), "read_component_summary", "host list_folders supportedOperations should advertise read_component_summary.");
        AssertContains(GetList(host, "supportedOperations"), "read_method_code", "host list_folders supportedOperations should advertise read_method_code.");
        AssertContains(GetList(host, "supportedOperations"), "read_method_signature", "host list_folders supportedOperations should advertise read_method_signature.");
        AssertContains(GetList(host, "supportedOperations"), "read_implementation", "host list_folders supportedOperations should advertise read_implementation.");
        AssertNotContains(GetList(host, "supportedOperations"), "read_block_diagram", "host list_folders supportedOperations should not advertise read_block_diagram.");
        AssertContains(GetList(host, "supportedOperations"), "resolve_component", "host list_folders supportedOperations should advertise resolve_component.");
        AssertContains(GetList(host, "supportedOperations"), "read_component_children", "host list_folders supportedOperations should advertise read_component_children.");
        AssertContains(GetList(host, "supportedOperations"), "list_diagrams", "host list_folders supportedOperations should advertise list_diagrams.");
        AssertContains(GetList(host, "supportedOperations"), "search_elements", "host list_folders supportedOperations should advertise search_elements.");
        AssertNotContains(GetList(host, "supportedOperations"), "read_state_machine_flow", "host list_folders supportedOperations should not advertise read_state_machine_flow.");
    }

    private static void TestValidListComponents(Process process, int expectedRequestCount)
    {
        Dictionary<string, object> request = new Dictionary<string, object>();
        request["type"] = "request";
        request["id"] = "smoke-components-1";
        request["commandId"] = "AscetListComponents";
        request["payload"] = new Dictionary<string, object>
        {
            { "limit", 1 }
        };

        Dictionary<string, object> response = SendJsonRequest(process, request);
        AssertEqual("response", GetString(response, "type"), "list_components response.type should be 'response'.");
        AssertEqual("smoke-components-1", GetString(response, "id"), "list_components response.id should round-trip the request id.");
        AssertTrue(GetBool(response, "ok"), "host list_components response.ok should be true.");

        Dictionary<string, object> result = GetDictionary(response, "result");
        AssertTrue(result != null, "host list_components response.result should be an object.");
        AssertCommonListComponentsPayload(result, String.Empty, 1, false);

        Dictionary<string, object> database = GetDictionary(result, "database");
        AssertTrue(database != null, "host list_components should include database metadata.");
        AssertTrue(!String.IsNullOrWhiteSpace(GetString(database, "name")), "host list_components database.name should not be empty.");
        AssertTrue(!String.IsNullOrWhiteSpace(GetString(database, "path")), "host list_components database.path should not be empty.");

        Dictionary<string, object> host = GetDictionary(result, "host");
        AssertTrue(host != null, "host list_components should include host metadata.");
        AssertEqual("AscetListComponents", GetString(host, "commandId"), "host list_components commandId should reflect the dispatched command.");
        AssertEqual(expectedRequestCount, GetInt(host, "requestCount", -1), "list_components should report the expected requestCount.");
        AssertTrue(GetInt(host, "sessionGeneration", 0) >= 1, "host list_components sessionGeneration should be present and >= 1.");
    }

    private static void TestCapabilities(Process process, int expectedRequestCount)
    {
        Dictionary<string, object> request = new Dictionary<string, object>();
        request["type"] = "request";
        request["id"] = "smoke-capabilities-1";
        request["commandId"] = "AscetGetCapabilities";

        Dictionary<string, object> response = SendJsonRequest(process, request);
        AssertEqual("response", GetString(response, "type"), "capabilities response.type should be 'response'.");
        AssertEqual("smoke-capabilities-1", GetString(response, "id"), "capabilities response.id should round-trip the request id.");
        AssertTrue(GetBool(response, "ok"), "host capabilities response.ok should be true.");

        Dictionary<string, object> result = GetDictionary(response, "result");
        AssertTrue(result != null, "host capabilities response.result should be an object.");
        AssertEqual(1, GetInt(result, "protocolVersion", -1), "host capabilities should expose protocolVersion=1.");
        AssertEqual("read", GetString(result, "lane"), "host capabilities should expose the read lane.");
        AssertEqual("AscetGetCapabilities", GetString(result, "capabilityCommandId"), "host capabilities should advertise AscetGetCapabilities.");
        AssertContains(GetList(result, "supportedCommands"), "AscetGetCapabilities", "host capabilities should advertise AscetGetCapabilities.");
        AssertContains(GetList(result, "supportedCommands"), "AscetReadComponentSummary", "host capabilities should advertise AscetReadComponentSummary.");
        AssertContains(GetList(result, "supportedCommands"), "AscetReadMethodCode", "host capabilities should advertise AscetReadMethodCode.");
        AssertContains(GetList(result, "supportedCommands"), "AscetReadMethodSignature", "host capabilities should advertise AscetReadMethodSignature.");
        AssertContains(GetList(result, "supportedCommands"), "AscetReadImplementation", "host capabilities should advertise AscetReadImplementation.");
        AssertNotContains(GetList(result, "supportedCommands"), "AscetReadBlockDiagram", "host capabilities should not advertise AscetReadBlockDiagram.");
        AssertContains(GetList(result, "supportedCommands"), "AscetResolveComponent", "host capabilities should advertise AscetResolveComponent.");
        AssertContains(GetList(result, "supportedCommands"), "AscetReadComponentChildren", "host capabilities should advertise AscetReadComponentChildren.");
        AssertContains(GetList(result, "supportedCommands"), "AscetListDiagrams", "host capabilities should advertise AscetListDiagrams.");
        AssertContains(GetList(result, "supportedCommands"), "AscetSearchElements", "host capabilities should advertise AscetSearchElements.");
        AssertNotContains(GetList(result, "supportedCommands"), "AscetReadStateMachineFlow", "host capabilities should not advertise AscetReadStateMachineFlow.");
        AssertContains(GetList(result, "supportedOperations"), "read_component_summary", "host capabilities should advertise read_component_summary.");
        AssertContains(GetList(result, "supportedOperations"), "read_method_code", "host capabilities should advertise read_method_code.");
        AssertContains(GetList(result, "supportedOperations"), "read_method_signature", "host capabilities should advertise read_method_signature.");
        AssertContains(GetList(result, "supportedOperations"), "read_implementation", "host capabilities should advertise read_implementation.");
        AssertNotContains(GetList(result, "supportedOperations"), "read_block_diagram", "host capabilities should not advertise read_block_diagram.");
        AssertContains(GetList(result, "supportedOperations"), "resolve_component", "host capabilities should advertise resolve_component.");
        AssertContains(GetList(result, "supportedOperations"), "read_component_children", "host capabilities should advertise read_component_children.");
        AssertContains(GetList(result, "supportedOperations"), "list_diagrams", "host capabilities should advertise list_diagrams.");
        AssertContains(GetList(result, "supportedOperations"), "search_elements", "host capabilities should advertise search_elements.");
        AssertNotContains(GetList(result, "supportedOperations"), "read_state_machine_flow", "host capabilities should not advertise read_state_machine_flow.");
        AssertContains(GetList(result, "pooledReadCommands"), "AscetReadComponentSummary", "host capabilities should advertise the pooled AscetReadComponentSummary command.");
        AssertContains(GetList(result, "pooledReadCommands"), "AscetReadMethodCode", "host capabilities should advertise the pooled AscetReadMethodCode command.");
        AssertContains(GetList(result, "pooledReadCommands"), "AscetReadMethodSignature", "host capabilities should advertise the pooled AscetReadMethodSignature command.");
        AssertContains(GetList(result, "pooledReadCommands"), "AscetReadImplementation", "host capabilities should advertise the pooled AscetReadImplementation command.");
        AssertNotContains(GetList(result, "pooledReadCommands"), "AscetReadBlockDiagram", "host capabilities should not advertise the pooled AscetReadBlockDiagram command.");
        AssertContains(GetList(result, "pooledReadCommands"), "AscetResolveComponent", "host capabilities should advertise the pooled AscetResolveComponent command.");
        AssertContains(GetList(result, "pooledReadCommands"), "AscetReadComponentChildren", "host capabilities should advertise the pooled AscetReadComponentChildren command.");
        AssertContains(GetList(result, "pooledReadCommands"), "AscetListDiagrams", "host capabilities should advertise the pooled AscetListDiagrams command.");
        AssertContains(GetList(result, "pooledReadCommands"), "AscetSearchElements", "host capabilities should advertise the pooled AscetSearchElements command.");
        AssertNotContains(GetList(result, "pooledReadCommands"), "AscetReadStateMachineFlow", "host capabilities should not advertise the pooled AscetReadStateMachineFlow command.");

        Dictionary<string, object> commandMap = GetDictionary(result, "commandMap");
        AssertTrue(commandMap != null, "host capabilities should include commandMap.");
        AssertEqual("AscetReadComponentSummary", GetString(commandMap, "read_component_summary"), "host capabilities should map read_component_summary to AscetReadComponentSummary.");
        AssertEqual("AscetReadMethodCode", GetString(commandMap, "read_method_code"), "host capabilities should map read_method_code to AscetReadMethodCode.");
        AssertEqual("AscetReadMethodSignature", GetString(commandMap, "read_method_signature"), "host capabilities should map read_method_signature to AscetReadMethodSignature.");
        AssertEqual("AscetReadImplementation", GetString(commandMap, "read_implementation"), "host capabilities should map read_implementation to AscetReadImplementation.");
        AssertTrue(!commandMap.ContainsKey("read_block_diagram"), "host capabilities should not map read_block_diagram.");
        AssertEqual("AscetResolveComponent", GetString(commandMap, "resolve_component"), "host capabilities should map resolve_component to AscetResolveComponent.");
        AssertEqual("AscetReadComponentChildren", GetString(commandMap, "read_component_children"), "host capabilities should map read_component_children to AscetReadComponentChildren.");
        AssertEqual("AscetListDiagrams", GetString(commandMap, "list_diagrams"), "host capabilities should map list_diagrams to AscetListDiagrams.");
        AssertEqual("AscetSearchElements", GetString(commandMap, "search_elements"), "host capabilities should map search_elements to AscetSearchElements.");
        AssertTrue(!commandMap.ContainsKey("read_state_machine_flow"), "host capabilities should not map read_state_machine_flow.");

        Dictionary<string, object> database = GetDictionary(result, "database");
        AssertTrue(database != null, "host capabilities should include database metadata.");
        AssertTrue(!String.IsNullOrWhiteSpace(GetString(database, "name")), "host capabilities database.name should not be empty.");
        AssertTrue(!String.IsNullOrWhiteSpace(GetString(database, "path")), "host capabilities database.path should not be empty.");

        Dictionary<string, object> host = GetDictionary(result, "host");
        AssertTrue(host != null, "host capabilities should include host metadata.");
        AssertEqual("AscetGetCapabilities", GetString(host, "commandId"), "host capabilities commandId should reflect the dispatched command.");
        AssertEqual(expectedRequestCount, GetInt(host, "requestCount", -1), "capabilities should report the expected requestCount.");
        AssertTrue(GetInt(host, "sessionGeneration", 0) >= 1, "host capabilities sessionGeneration should be present and >= 1.");
    }

    private static bool TestValidListMethods(Process process)
    {
        string componentPath = FindMethodCapableComponentPath(process);
        if (String.IsNullOrWhiteSpace(componentPath))
        {
            Console.WriteLine("LIVE host list_methods probe skipped: no method-capable component scope was available.");
            return false;
        }

        Dictionary<string, object> request = new Dictionary<string, object>();
        request["type"] = "request";
        request["id"] = "smoke-methods-1";
        request["commandId"] = "AscetListMethods";
        request["payload"] = new Dictionary<string, object>
        {
            { "componentPath", componentPath }
        };

        Dictionary<string, object> response = SendJsonRequest(process, request);
        AssertEqual("response", GetString(response, "type"), "list_methods response.type should be 'response'.");
        AssertEqual("smoke-methods-1", GetString(response, "id"), "list_methods response.id should round-trip the request id.");
        AssertTrue(GetBool(response, "ok"), "host list_methods response.ok should be true.");

        Dictionary<string, object> result = GetDictionary(response, "result");
        AssertTrue(result != null, "host list_methods response.result should be an object.");
        AssertCommonListMethodsPayload(result, componentPath);

        Dictionary<string, object> database = GetDictionary(result, "database");
        AssertTrue(database != null, "host list_methods should include database metadata.");
        AssertTrue(!String.IsNullOrWhiteSpace(GetString(database, "name")), "host list_methods database.name should not be empty.");
        AssertTrue(!String.IsNullOrWhiteSpace(GetString(database, "path")), "host list_methods database.path should not be empty.");

        Dictionary<string, object> host = GetDictionary(result, "host");
        AssertTrue(host != null, "host list_methods should include host metadata.");
        AssertEqual("AscetListMethods", GetString(host, "commandId"), "host list_methods commandId should reflect the dispatched command.");
        AssertTrue(GetInt(host, "requestCount", 0) >= 3, "host list_methods requestCount should continue increasing across successful requests.");
        AssertTrue(GetInt(host, "sessionGeneration", 0) >= 1, "host list_methods sessionGeneration should be present and >= 1.");
        AssertContains(GetList(host, "supportedCommands"), "AscetListMethods", "host list_methods supportedCommands should advertise AscetListMethods.");
        return true;
    }

    private static bool TestValidReadComponentSummary(Process process)
    {
        string componentPath = FindSummarizableComponentPath(process);
        if (String.IsNullOrWhiteSpace(componentPath))
        {
            Console.WriteLine("LIVE host read_component_summary probe skipped: no summarizable component scope was available.");
            return false;
        }

        Dictionary<string, object> request = new Dictionary<string, object>();
        request["type"] = "request";
        request["id"] = "smoke-summary-1";
        request["commandId"] = "AscetReadComponentSummary";
        request["payload"] = new Dictionary<string, object>
        {
            { "componentPath", componentPath }
        };

        Dictionary<string, object> response = SendJsonRequest(process, request);
        AssertEqual("response", GetString(response, "type"), "read_component_summary response.type should be 'response'.");
        AssertEqual("smoke-summary-1", GetString(response, "id"), "read_component_summary response.id should round-trip the request id.");
        AssertTrue(GetBool(response, "ok"), "host read_component_summary response.ok should be true.");

        Dictionary<string, object> result = GetDictionary(response, "result");
        AssertTrue(result != null, "host read_component_summary response.result should be an object.");
        AssertCommonComponentSummaryPayload(result, componentPath);

        Dictionary<string, object> database = GetDictionary(result, "database");
        AssertTrue(database != null, "host read_component_summary should include database metadata.");
        AssertTrue(!String.IsNullOrWhiteSpace(GetString(database, "name")), "host read_component_summary database.name should not be empty.");
        AssertTrue(!String.IsNullOrWhiteSpace(GetString(database, "path")), "host read_component_summary database.path should not be empty.");

        Dictionary<string, object> host = GetDictionary(result, "host");
        AssertTrue(host != null, "host read_component_summary should include host metadata.");
        AssertEqual("AscetReadComponentSummary", GetString(host, "commandId"), "host read_component_summary commandId should reflect the dispatched command.");
        AssertTrue(GetInt(host, "requestCount", 0) >= 3, "host read_component_summary requestCount should continue increasing across successful requests.");
        AssertTrue(GetInt(host, "sessionGeneration", 0) >= 1, "host read_component_summary sessionGeneration should be present and >= 1.");
        AssertContains(GetList(host, "supportedCommands"), "AscetReadComponentSummary", "host read_component_summary supportedCommands should advertise AscetReadComponentSummary.");
        AssertContains(GetList(host, "supportedOperations"), "read_component_summary", "host read_component_summary supportedOperations should advertise read_component_summary.");
        return true;
    }

    private static bool TestValidReadMethodCode(Process process)
    {
        string componentPath = GetPreferredMethodCapableComponentPath(process);
        if (String.IsNullOrWhiteSpace(componentPath))
        {
            Console.WriteLine("LIVE host read_method_code probe skipped: no method-capable component scope was available.");
            return false;
        }

        string methodName = FindFirstMethodName(process, componentPath);
        if (String.IsNullOrWhiteSpace(methodName))
        {
            Console.WriteLine("LIVE host read_method_code probe skipped: no readable method was found.");
            return false;
        }

        Dictionary<string, object> request = new Dictionary<string, object>();
        request["type"] = "request";
        request["id"] = "smoke-read-method-1";
        request["commandId"] = "AscetReadMethodCode";
        request["payload"] = new Dictionary<string, object>
        {
            { "componentPath", componentPath },
            { "methodName", methodName }
        };

        Dictionary<string, object> response = SendJsonRequest(process, request);
        AssertEqual("response", GetString(response, "type"), "read_method_code response.type should be 'response'.");
        AssertEqual("smoke-read-method-1", GetString(response, "id"), "read_method_code response.id should round-trip the request id.");
        AssertTrue(GetBool(response, "ok"), "host read_method_code response.ok should be true.");

        Dictionary<string, object> result = GetDictionary(response, "result");
        AssertTrue(result != null, "host read_method_code response.result should be an object.");
        AssertEqual(componentPath, GetString(result, "componentPath"), "read_method_code payload should preserve componentPath.");
        AssertEqual(methodName, GetString(result, "methodName"), "read_method_code payload should preserve methodName.");
        AssertTrue(result.ContainsKey("code"), "read_method_code payload should expose code.");

        Dictionary<string, object> host = GetDictionary(result, "host");
        AssertTrue(host != null, "host read_method_code should include host metadata.");
        AssertEqual("AscetReadMethodCode", GetString(host, "commandId"), "host read_method_code commandId should reflect the dispatched command.");
        return true;
    }

    private static bool TestValidReadImplementation(Process process)
    {
        string componentPath = GetPreferredMethodCapableComponentPath(process);
        if (String.IsNullOrWhiteSpace(componentPath))
        {
            Console.WriteLine("LIVE host read_implementation probe skipped: no implementation-capable component scope was available.");
            return false;
        }

        Dictionary<string, object> request = new Dictionary<string, object>();
        request["type"] = "request";
        request["id"] = "smoke-read-implementation-1";
        request["commandId"] = "AscetReadImplementation";
        request["payload"] = new Dictionary<string, object>
        {
            { "componentPath", componentPath }
        };

        Dictionary<string, object> response = SendJsonRequest(process, request);
        AssertEqual("response", GetString(response, "type"), "read_implementation response.type should be 'response'.");
        AssertEqual("smoke-read-implementation-1", GetString(response, "id"), "read_implementation response.id should round-trip the request id.");
        AssertTrue(GetBool(response, "ok"), "host read_implementation response.ok should be true.");

        Dictionary<string, object> result = GetDictionary(response, "result");
        AssertTrue(result != null, "host read_implementation response.result should be an object.");
        AssertEqual(componentPath, GetString(result, "ComponentPath"), "read_implementation payload should preserve ComponentPath.");
        AssertTrue(result.ContainsKey("ResolvedImplementationName"), "read_implementation payload should expose ResolvedImplementationName.");
        AssertTrue(result.ContainsKey("Elements"), "read_implementation payload should expose Elements.");

        Dictionary<string, object> host = GetDictionary(result, "host");
        AssertTrue(host != null, "host read_implementation should include host metadata.");
        AssertEqual("AscetReadImplementation", GetString(host, "commandId"), "host read_implementation commandId should reflect the dispatched command.");
        return true;
    }

    private static bool TestValidReadBlockDiagram(Process process)
    {
        string componentPath = GetKnownModuleComponentPath(process);
        if (String.IsNullOrWhiteSpace(componentPath))
        {
            Console.WriteLine("LIVE host read_block_diagram probe skipped: no module component scope was available.");
            return false;
        }

        Dictionary<string, object> diagramsRequest = new Dictionary<string, object>();
        diagramsRequest["type"] = "request";
        diagramsRequest["id"] = "smoke-block-diagrams-1";
        diagramsRequest["commandId"] = "AscetListDiagrams";
        diagramsRequest["payload"] = new Dictionary<string, object>
        {
            { "componentPath", componentPath }
        };

        Dictionary<string, object> diagramsResponse = SendJsonRequest(process, diagramsRequest);
        if (!GetBool(diagramsResponse, "ok"))
        {
            Console.WriteLine("LIVE host read_block_diagram probe skipped: list_diagrams preflight failed.");
            return false;
        }

        Dictionary<string, object> diagramsResult = GetDictionary(diagramsResponse, "result");
        string diagramName = GetString(diagramsResult, "defaultDiagramName");
        if (String.IsNullOrWhiteSpace(diagramName))
        {
            IList items = GetList(diagramsResult, "items");
            for (int i = 0; i < items.Count; i++)
            {
                Dictionary<string, object> item = items[i] as Dictionary<string, object>;
                if (item != null && GetBool(item, "supportsReadBlockDiagram"))
                {
                    diagramName = GetString(item, "name");
                    break;
                }
            }
        }

        if (String.IsNullOrWhiteSpace(diagramName))
        {
            Console.WriteLine("LIVE host read_block_diagram probe skipped: no readable block diagram was available.");
            return false;
        }

        Dictionary<string, object> request = new Dictionary<string, object>();
        request["type"] = "request";
        request["id"] = "smoke-read-block-1";
        request["commandId"] = "AscetReadBlockDiagram";
        request["payload"] = new Dictionary<string, object>
        {
            { "componentPath", componentPath },
            { "diagramName", diagramName }
        };

        Dictionary<string, object> response = SendJsonRequest(process, request);
        AssertEqual("response", GetString(response, "type"), "read_block_diagram response.type should be 'response'.");
        AssertEqual("smoke-read-block-1", GetString(response, "id"), "read_block_diagram response.id should round-trip the request id.");
        AssertTrue(GetBool(response, "ok"), "host read_block_diagram response.ok should be true.");

        Dictionary<string, object> result = GetDictionary(response, "result");
        AssertTrue(result != null, "host read_block_diagram response.result should be an object.");
        AssertEqual(componentPath, GetString(result, "ComponentPath"), "read_block_diagram payload should preserve ComponentPath.");
        AssertEqual(diagramName, GetString(result, "DiagramName"), "read_block_diagram payload should preserve DiagramName.");
        AssertTrue(GetList(result, "Elements") != null, "read_block_diagram payload should expose Elements.");

        Dictionary<string, object> host = GetDictionary(result, "host");
        AssertTrue(host != null, "host read_block_diagram should include host metadata.");
        AssertEqual("AscetReadBlockDiagram", GetString(host, "commandId"), "host read_block_diagram commandId should reflect the dispatched command.");
        return true;
    }

    private static bool TestUnsupportedReadStateMachineFlow(Process process)
    {
        Dictionary<string, object> request = new Dictionary<string, object>();
        request["type"] = "request";
        request["id"] = "smoke-read-sm-flow-1";
        request["commandId"] = "AscetReadStateMachineFlow";
        request["payload"] = new Dictionary<string, object>
        {
            { "componentPath", "DEMO\\Light" },
            { "traceDepth", 1 }
        };

        Dictionary<string, object> response = SendJsonRequest(process, request);
        AssertEqual("response", GetString(response, "type"), "read_state_machine_flow response.type should be 'response'.");
        AssertEqual("smoke-read-sm-flow-1", GetString(response, "id"), "read_state_machine_flow response.id should round-trip the request id.");
        AssertTrue(!GetBool(response, "ok"), "read_state_machine_flow should not execute in the long-lived read host.");

        Dictionary<string, object> error = GetDictionary(response, "error");
        AssertTrue(error != null, "unsupported read_state_machine_flow should return an error payload.");
        AssertEqual("unsupported_command", GetString(error, "code"), "read_state_machine_flow should be rejected by the read host capability resolver.");
        return false;
    }

    private static bool TestValidResolveComponent(Process process)
    {
        string componentPath = FindSummarizableComponentPath(process);
        if (String.IsNullOrWhiteSpace(componentPath))
        {
            Console.WriteLine("LIVE host resolve_component probe skipped: no summarizable component scope was available.");
            return false;
        }

        string query = GetDisplayNameFromPath(componentPath);
        if (String.IsNullOrWhiteSpace(query))
        {
            Console.WriteLine("LIVE host resolve_component probe skipped: no stable query could be derived.");
            return false;
        }

        Dictionary<string, object> request = new Dictionary<string, object>();
        request["type"] = "request";
        request["id"] = "smoke-resolve-1";
        request["commandId"] = "AscetResolveComponent";
        request["payload"] = new Dictionary<string, object>
        {
            { "query", query },
            { "limit", 5 }
        };

        Dictionary<string, object> response = SendJsonRequest(process, request);
        AssertEqual("response", GetString(response, "type"), "resolve_component response.type should be 'response'.");
        AssertEqual("smoke-resolve-1", GetString(response, "id"), "resolve_component response.id should round-trip the request id.");
        AssertTrue(GetBool(response, "ok"), "host resolve_component response.ok should be true.");

        Dictionary<string, object> result = GetDictionary(response, "result");
        AssertTrue(result != null, "host resolve_component response.result should be an object.");
        AssertEqual(query, GetString(result, "query"), "resolve_component payload should preserve query.");
        AssertTrue(GetDictionary(result, "counts") != null, "resolve_component payload should include counts.");
        AssertTrue(GetList(result, "matches").Count >= 1, "resolve_component should return at least one match for the derived query.");

        Dictionary<string, object> host = GetDictionary(result, "host");
        AssertTrue(host != null, "host resolve_component should include host metadata.");
        AssertEqual("AscetResolveComponent", GetString(host, "commandId"), "host resolve_component commandId should reflect the dispatched command.");
        return true;
    }

    private static bool TestValidReadComponentChildren(Process process)
    {
        string componentPath = FindMethodCapableComponentPath(process);
        if (String.IsNullOrWhiteSpace(componentPath))
        {
            Console.WriteLine("LIVE host read_component_children probe skipped: no method-capable component scope was available.");
            return false;
        }

        Dictionary<string, object> request = new Dictionary<string, object>();
        request["type"] = "request";
        request["id"] = "smoke-children-1";
        request["commandId"] = "AscetReadComponentChildren";
        request["payload"] = new Dictionary<string, object>
        {
            { "componentPath", componentPath },
            { "group", "methods" }
        };

        Dictionary<string, object> response = SendJsonRequest(process, request);
        AssertEqual("response", GetString(response, "type"), "read_component_children response.type should be 'response'.");
        AssertEqual("smoke-children-1", GetString(response, "id"), "read_component_children response.id should round-trip the request id.");
        AssertTrue(GetBool(response, "ok"), "host read_component_children response.ok should be true. " + DescribeError(response));

        Dictionary<string, object> result = GetDictionary(response, "result");
        AssertTrue(result != null, "host read_component_children response.result should be an object.");
        AssertEqual(componentPath, GetString(result, "componentPath"), "read_component_children payload should preserve componentPath.");
        AssertEqual("methods", GetString(result, "selectedGroup"), "read_component_children payload should preserve selectedGroup.");
        AssertTrue(GetDictionary(result, "counts") != null, "read_component_children payload should include counts.");
        AssertTrue(GetList(result, "availableGroups").Count >= 1, "read_component_children payload should expose availableGroups.");
        AssertTrue(GetList(result, "items") != null, "read_component_children payload should expose items.");

        Dictionary<string, object> host = GetDictionary(result, "host");
        AssertTrue(host != null, "host read_component_children should include host metadata.");
        AssertEqual("AscetReadComponentChildren", GetString(host, "commandId"), "host read_component_children commandId should reflect the dispatched command.");
        return true;
    }

    private static bool TestValidListDiagrams(Process process)
    {
        string componentPath = GetKnownModuleComponentPath(process);
        if (String.IsNullOrWhiteSpace(componentPath))
        {
            Console.WriteLine("LIVE host list_diagrams probe skipped: no module component scope was available.");
            return false;
        }

        Dictionary<string, object> request = new Dictionary<string, object>();
        request["type"] = "request";
        request["id"] = "smoke-diagrams-1";
        request["commandId"] = "AscetListDiagrams";
        request["payload"] = new Dictionary<string, object>
        {
            { "componentPath", componentPath }
        };

        Dictionary<string, object> response = SendJsonRequest(process, request);
        AssertEqual("response", GetString(response, "type"), "list_diagrams response.type should be 'response'.");
        AssertEqual("smoke-diagrams-1", GetString(response, "id"), "list_diagrams response.id should round-trip the request id.");
        AssertTrue(GetBool(response, "ok"), "host list_diagrams response.ok should be true. " + DescribeError(response));

        Dictionary<string, object> result = GetDictionary(response, "result");
        AssertTrue(result != null, "host list_diagrams response.result should be an object.");
        AssertEqual(componentPath, GetString(result, "componentPath"), "list_diagrams payload should preserve componentPath.");
        AssertTrue(!String.IsNullOrWhiteSpace(GetString(result, "componentKind")), "list_diagrams payload should include componentKind.");
        AssertTrue(GetList(result, "items") != null, "list_diagrams payload should expose items.");

        Dictionary<string, object> host = GetDictionary(result, "host");
        AssertTrue(host != null, "host list_diagrams should include host metadata.");
        AssertEqual("AscetListDiagrams", GetString(host, "commandId"), "host list_diagrams commandId should reflect the dispatched command.");
        return true;
    }

    private static void TestUnsupportedCommand(Process process)
    {
        Dictionary<string, object> request = new Dictionary<string, object>();
        request["type"] = "request";
        request["id"] = "unsupported-1";
        request["commandId"] = "AscetCreateComponent";

        Dictionary<string, object> response = SendJsonRequest(process, request);
        AssertEqual("unsupported-1", GetString(response, "id"), "unsupported command should preserve request id.");
        AssertTrue(!GetBool(response, "ok"), "unsupported command should fail.");

        Dictionary<string, object> error = GetDictionary(response, "error");
        AssertTrue(error != null, "unsupported command should include an error object.");
        AssertEqual("unsupported_command", GetString(error, "code"), "unsupported command should report unsupported_command.");
        AssertEqual("dispatch_request", GetString(error, "operation"), "unsupported command should report dispatch_request operation.");
    }

    private static void TestInvalidEnvelope(Process process)
    {
        Dictionary<string, object> envelope = new Dictionary<string, object>();
        envelope["type"] = "bogus";
        envelope["id"] = "invalid-envelope-1";

        Dictionary<string, object> response = SendJsonRequest(process, envelope);
        AssertEqual("invalid-envelope-1", GetString(response, "id"), "invalid envelope should preserve request id when present.");
        AssertTrue(!GetBool(response, "ok"), "invalid envelope should fail.");

        Dictionary<string, object> error = GetDictionary(response, "error");
        AssertTrue(error != null, "invalid envelope should include an error object.");
        AssertEqual("invalid_envelope", GetString(error, "code"), "invalid envelope should report invalid_envelope.");
        AssertEqual("validate_envelope", GetString(error, "operation"), "invalid envelope should report validate_envelope operation.");
    }

    private static void TestInvalidJson(Process process)
    {
        Dictionary<string, object> response = SendRawLine(process, "{\"type\":");
        AssertEqual("response", GetString(response, "type"), "invalid JSON should still produce a response envelope.");
        AssertTrue(!GetBool(response, "ok"), "invalid JSON should fail.");

        Dictionary<string, object> error = GetDictionary(response, "error");
        AssertTrue(error != null, "invalid JSON should include an error object.");
        AssertEqual("invalid_json", GetString(error, "code"), "invalid JSON should report invalid_json.");
        AssertEqual("parse_request", GetString(error, "operation"), "invalid JSON should report parse_request operation.");
    }

    private static void TestHostRecoversAfterErrors(Process process, bool methodProbeExecuted, bool summaryProbeExecuted, bool readMethodCodeProbeExecuted, bool readImplementationProbeExecuted, bool readBlockDiagramProbeExecuted, bool readStateMachineFlowProbeExecuted, bool resolveProbeExecuted, bool childrenProbeExecuted, bool diagramsProbeExecuted)
    {
        Dictionary<string, object> request = new Dictionary<string, object>();
        request["type"] = "request";
        request["id"] = "smoke-2";
        request["commandId"] = "AscetListFolders";
        request["payload"] = new Dictionary<string, object>
        {
            { "depth", 0 }
        };

        Dictionary<string, object> response = SendJsonRequest(process, request);
        AssertTrue(GetBool(response, "ok"), "host should still serve valid requests after error responses.");

        Dictionary<string, object> result = GetDictionary(response, "result");
        Dictionary<string, object> host = GetDictionary(result, "host");
        AssertTrue(host != null, "follow-up valid request should include host metadata.");
        AssertTrue(
            GetInt(host, "requestCount", 0) >= GetExpectedRecoveryRequestCount(methodProbeExecuted, summaryProbeExecuted, readMethodCodeProbeExecuted, readImplementationProbeExecuted, readBlockDiagramProbeExecuted, readStateMachineFlowProbeExecuted, resolveProbeExecuted, childrenProbeExecuted, diagramsProbeExecuted),
            "follow-up valid request should report a requestCount consistent with prior successful traffic.");
        AssertTrue(GetInt(host, "sessionGeneration", 0) >= 1, "host should continue to report sessionGeneration after errors.");
    }

    private static int GetExpectedRecoveryRequestCount(bool methodProbeExecuted, bool summaryProbeExecuted, bool readMethodCodeProbeExecuted, bool readImplementationProbeExecuted, bool readBlockDiagramProbeExecuted, bool readStateMachineFlowProbeExecuted, bool resolveProbeExecuted, bool childrenProbeExecuted, bool diagramsProbeExecuted)
    {
        int count = 4;
        if (methodProbeExecuted)
        {
            count++;
        }

        if (summaryProbeExecuted)
        {
            count++;
        }

        if (readMethodCodeProbeExecuted)
        {
            count++;
        }

        if (readImplementationProbeExecuted)
        {
            count++;
        }

        if (readBlockDiagramProbeExecuted)
        {
            count++;
        }

        if (readStateMachineFlowProbeExecuted)
        {
            count++;
        }

        if (resolveProbeExecuted)
        {
            count++;
        }

        if (childrenProbeExecuted)
        {
            count++;
        }

        if (diagramsProbeExecuted)
        {
            count++;
        }

        return count;
    }

    private static string GetHostPath()
    {
        return FindPathUpwards("output", "ascet-csharp", "bin", "AscetReadHost.exe");
    }

    private static string GetHostSourcePath()
    {
        return FindPathUpwards("src", "AscetCli", "AscetReadHost.cs");
    }

    private static string GetHostDispatcherSourcePath()
    {
        return FindPathUpwards("src", "AscetCli", "Host", "AscetReadHostDispatcher.cs");
    }

    private static string GetHostCapabilitySourcePath()
    {
        return FindPathUpwards("src", "AscetCli", "Host", "AscetReadHostCapabilityService.cs");
    }

    private static string GetOperationRegistrySourcePath()
    {
        return FindPathUpwards("src", "AscetCli", "Routing", "OperationRegistry.cs");
    }

    private static Dictionary<string, object> SendJsonRequest(Process process, Dictionary<string, object> payload)
    {
        return SendRawLine(process, Serialize(payload));
    }

    private static Dictionary<string, object> SendRawLine(Process process, string line)
    {
        process.StandardInput.WriteLine(line ?? String.Empty);
        process.StandardInput.Flush();

        string responseLine;
        try
        {
            responseLine = ReadLineWithTimeout(process.StandardOutput, 10000);
        }
        catch (TimeoutException ex)
        {
            throw new TimeoutException("Timed out waiting for a JSON response line from AscetReadHost after request "
                + DescribeRequestLine(line)
                + "."
                + Environment.NewLine
                + ReadAvailableStandardError(process), ex);
        }

        AssertTrue(!String.IsNullOrWhiteSpace(responseLine), "Host should emit one JSON response line.");
        return DeserializeObject(responseLine);
    }

    private static string DescribeRequestLine(string line)
    {
        Dictionary<string, object> request = DeserializeObject(line);
        string id = GetString(request, "id");
        string commandId = GetString(request, "commandId");
        return "id='" + id + "', commandId='" + commandId + "'";
    }

    private static string DescribeError(Dictionary<string, object> response)
    {
        Dictionary<string, object> error = GetDictionary(response, "error");
        if (error == null)
        {
            return String.Empty;
        }

        return "error.code='" + GetString(error, "code") + "', error.message='" + GetString(error, "message") + "'";
    }

    private static string ReadAvailableStandardError(Process process)
    {
        try
        {
            if (process == null || process.StandardError == null)
            {
                return String.Empty;
            }

            return process.HasExited ? ReadRemaining(process.StandardError) : String.Empty;
        }
        catch
        {
            return String.Empty;
        }
    }

    private static string ReadLineWithTimeout(StreamReader reader, int timeoutMs)
    {
        string line = null;
        Exception error = null;

        Thread thread = new Thread(delegate()
        {
            try
            {
                line = reader.ReadLine();
            }
            catch (Exception ex)
            {
                error = ex;
            }
        });

        thread.IsBackground = true;
        thread.Start();

        if (!thread.Join(timeoutMs))
        {
            throw new TimeoutException("Timed out waiting for a JSON response line from AscetReadHost.");
        }

        if (error != null)
        {
            throw new Exception("Failed to read AscetReadHost stdout.", error);
        }

        return line;
    }

    private static string ReadRemaining(StreamReader reader)
    {
        try
        {
            return reader == null ? String.Empty : (reader.ReadToEnd() ?? String.Empty);
        }
        catch
        {
            return String.Empty;
        }
    }

    private static void TryKillProcessTree(Process process)
    {
        if (process == null)
        {
            return;
        }

        try
        {
            if (process.HasExited)
            {
                return;
            }
        }
        catch
        {
            return;
        }

        try
        {
            ProcessStartInfo startInfo = new ProcessStartInfo
            {
                FileName = "taskkill.exe",
                Arguments = "/PID " + process.Id.ToString() + " /T /F",
                UseShellExecute = false,
                CreateNoWindow = true
            };

            using (Process killer = new Process())
            {
                killer.StartInfo = startInfo;
                if (killer.Start())
                {
                    killer.WaitForExit(ProcessCleanupTimeoutMs);
                }
            }
        }
        catch
        {
            try
            {
                if (!process.HasExited)
                {
                    process.Kill();
                    process.WaitForExit(ProcessCleanupTimeoutMs);
                }
            }
            catch
            {
            }
        }
    }

    private static string Serialize(object value)
    {
        return Serializer.Serialize(value);
    }

    private static Dictionary<string, object> DeserializeObject(string json)
    {
        return Serializer.Deserialize<Dictionary<string, object>>(json);
    }

    private static string GetString(Dictionary<string, object> payload, string key)
    {
        if (payload == null || String.IsNullOrWhiteSpace(key) || !payload.ContainsKey(key) || payload[key] == null)
        {
            return String.Empty;
        }

        return Convert.ToString(payload[key]) ?? String.Empty;
    }

    private static bool GetBool(Dictionary<string, object> payload, string key)
    {
        if (payload == null || String.IsNullOrWhiteSpace(key) || !payload.ContainsKey(key) || payload[key] == null)
        {
            return false;
        }

        object value = payload[key];
        if (value is bool)
        {
            return (bool)value;
        }

        bool parsed;
        return Boolean.TryParse(Convert.ToString(value), out parsed) && parsed;
    }

    private static Dictionary<string, object> GetDictionary(Dictionary<string, object> payload, string key)
    {
        if (payload == null || String.IsNullOrWhiteSpace(key) || !payload.ContainsKey(key))
        {
            return null;
        }

        return payload[key] as Dictionary<string, object>;
    }

    private static IList GetList(Dictionary<string, object> payload, string key)
    {
        if (payload == null || String.IsNullOrWhiteSpace(key) || !payload.ContainsKey(key) || payload[key] == null)
        {
            return new object[0];
        }

        IList list = payload[key] as IList;
        return list ?? new object[0];
    }

    private static int GetInt(Dictionary<string, object> payload, string key, int defaultValue)
    {
        if (payload == null || String.IsNullOrWhiteSpace(key) || !payload.ContainsKey(key) || payload[key] == null)
        {
            return defaultValue;
        }

        try
        {
            return Convert.ToInt32(payload[key]);
        }
        catch
        {
            return defaultValue;
        }
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

    private static void AssertEqual(int expected, int actual, string message)
    {
        if (expected != actual)
        {
            throw new Exception(message + " Expected '" + expected + "' but got '" + actual + "'.");
        }
    }

    private static void AssertContains(IList list, string expected, string message)
    {
        if (list == null)
        {
            throw new Exception(message);
        }

        for (int i = 0; i < list.Count; i++)
        {
            if (String.Equals(Convert.ToString(list[i]) ?? String.Empty, expected ?? String.Empty, StringComparison.Ordinal))
            {
                return;
            }
        }

        throw new Exception(message);
    }

    private static void AssertNotContains(IList list, string unexpected, string message)
    {
        if (list == null)
        {
            return;
        }

        for (int i = 0; i < list.Count; i++)
        {
            if (String.Equals(Convert.ToString(list[i]) ?? String.Empty, unexpected ?? String.Empty, StringComparison.Ordinal))
            {
                throw new Exception(message);
            }
        }
    }

    private static string FindPathUpwards(params string[] relativeParts)
    {
        string cursor = AppDomain.CurrentDomain.BaseDirectory;
        while (!String.IsNullOrWhiteSpace(cursor))
        {
            string candidate = cursor;
            for (int i = 0; i < relativeParts.Length; i++)
            {
                candidate = Path.Combine(candidate, relativeParts[i]);
            }

            string fullPath = Path.GetFullPath(candidate);
            if (File.Exists(fullPath))
            {
                return fullPath;
            }

            DirectoryInfo parent = Directory.GetParent(cursor);
            if (parent == null)
            {
                break;
            }

            cursor = parent.FullName;
        }

        throw new Exception("Failed to resolve required path from base directory '" + AppDomain.CurrentDomain.BaseDirectory + "'.");
    }

    private static void AssertCommonListFoldersPayload(Dictionary<string, object> result, string expectedRootPath, int expectedDepth)
    {
        AssertEqual(expectedRootPath, GetString(result, "rootPath"), "list_folders payload should preserve rootPath.");
        AssertEqual(expectedDepth, GetInt(result, "depth", -1), "list_folders payload should preserve depth.");

        IList folders = GetList(result, "folders");
        Dictionary<string, object> counts = GetDictionary(result, "counts");
        AssertTrue(counts != null, "response.result.counts should be an object.");
        AssertEqual(GetInt(counts, "folders", -1), folders.Count, "top-level folder count should match counts.folders for depth=0.");
        AssertEqual(0, GetInt(counts, "projects", -1), "list_folders counts.projects should be present.");
        AssertEqual(0, GetInt(counts, "components", -1), "list_folders counts.components should be present.");

        if (folders.Count > 0)
        {
            Dictionary<string, object> folder = folders[0] as Dictionary<string, object>;
            AssertTrue(folder != null, "folder entry should be an object.");
            AssertTrue(GetList(folder, "availableGroups").Count >= 1, "folder entry should expose availableGroups.");
            AssertTrue(GetDictionary(folder, "counts") != null, "folder entry should include nested counts.");
            AssertTrue(GetList(folder, "children") != null, "folder entry should include children.");
        }
    }

    private static void AssertCommonListComponentsPayload(Dictionary<string, object> result, string expectedFolderPath, int expectedLimit, bool expectedRecursive)
    {
        AssertEqual(expectedFolderPath, GetString(result, "folderPath"), "list_components payload should preserve folderPath.");

        Dictionary<string, object> filters = GetDictionary(result, "filters");
        AssertTrue(filters != null, "list_components payload should include filters.");
        AssertEqual("all", GetString(filters, "kind"), "list_components filters.kind should default to all.");
        AssertEqual(String.Empty, GetString(filters, "query"), "list_components filters.query should default to empty.");
        AssertEqual(expectedLimit, GetInt(filters, "limit", -1), "list_components filters.limit should preserve the parsed limit.");
        AssertEqual(expectedRecursive, GetBool(filters, "recursive"), "list_components filters.recursive should preserve the parsed recursive flag.");

        Dictionary<string, object> counts = GetDictionary(result, "counts");
        AssertTrue(counts != null, "list_components payload should include counts.");
        AssertTrue(GetInt(counts, "items", -1) >= 0, "list_components counts.items should be present.");

        IList items = GetList(result, "items");
        AssertTrue(items.Count <= expectedLimit, "list_components should respect the requested limit.");

        if (items.Count > 0)
        {
            Dictionary<string, object> item = items[0] as Dictionary<string, object>;
            AssertTrue(item != null, "list_components item should be an object.");
            AssertTrue(!String.IsNullOrWhiteSpace(GetString(item, "displayName")), "list_components item should expose displayName.");
            AssertTrue(!String.IsNullOrWhiteSpace(GetString(item, "path")), "list_components item should expose path.");
            AssertTrue(item.ContainsKey("parentPath"), "list_components item should expose parentPath.");
            AssertTrue(item.ContainsKey("ownerKind"), "list_components item should expose ownerKind.");
            AssertTrue(item.ContainsKey("targetKind"), "list_components item should expose targetKind.");
            AssertTrue(item.ContainsKey("objectKind"), "list_components item should expose objectKind.");
        }
    }

    private static void AssertCommonListMethodsPayload(Dictionary<string, object> result, string expectedComponentPath)
    {
        AssertEqual(expectedComponentPath, GetString(result, "componentPath"), "list_methods payload should preserve componentPath.");
        AssertTrue(!String.IsNullOrWhiteSpace(GetString(result, "componentKind")), "list_methods payload should include componentKind.");
        AssertTrue(!String.IsNullOrWhiteSpace(GetString(result, "languageKind")), "list_methods payload should include languageKind.");

        Dictionary<string, object> counts = GetDictionary(result, "counts");
        AssertTrue(counts != null, "list_methods payload should include counts.");
        AssertTrue(GetInt(counts, "methods", -1) >= 0, "list_methods counts.methods should be present.");

        IList methods = GetList(result, "methods");
        AssertEqual(GetInt(counts, "methods", -1), methods.Count, "list_methods counts.methods should match the payload array size.");

        if (methods.Count > 0)
        {
            Dictionary<string, object> method = methods[0] as Dictionary<string, object>;
            AssertTrue(method != null, "list_methods item should be an object.");
            AssertTrue(!String.IsNullOrWhiteSpace(GetString(method, "name")), "list_methods item should expose name.");
            AssertTrue(!String.IsNullOrWhiteSpace(GetString(method, "methodKind")), "list_methods item should expose methodKind.");
            AssertTrue(method.ContainsKey("owningComponentPath"), "list_methods item should expose owningComponentPath.");
        }
    }

    private static void AssertCommonComponentSummaryPayload(Dictionary<string, object> result, string expectedComponentPath)
    {
        AssertEqual(expectedComponentPath, GetString(result, "componentPath"), "read_component_summary payload should preserve componentPath.");
        AssertTrue(!String.IsNullOrWhiteSpace(GetString(result, "kind")), "read_component_summary payload should include kind.");
        AssertTrue(!String.IsNullOrWhiteSpace(GetString(result, "languageKind")), "read_component_summary payload should include languageKind.");
        AssertTrue(result.ContainsKey("displayName"), "read_component_summary payload should expose displayName.");
        AssertTrue(result.ContainsKey("parentPath"), "read_component_summary payload should expose parentPath.");
        AssertTrue(result.ContainsKey("ownerKind"), "read_component_summary payload should expose ownerKind.");
        AssertTrue(!String.IsNullOrWhiteSpace(GetString(result, "summary")), "read_component_summary payload should include summary.");

        Dictionary<string, object> counts = GetDictionary(result, "counts");
        AssertTrue(counts != null, "read_component_summary payload should include counts.");
        AssertTrue(GetInt(counts, "diagrams", -1) >= 0, "read_component_summary counts.diagrams should be present.");
        AssertTrue(GetInt(counts, "methods", -1) >= 0, "read_component_summary counts.methods should be present.");
        AssertTrue(GetInt(counts, "implementationElements", -1) >= 0, "read_component_summary counts.implementationElements should be present.");
        AssertTrue(GetInt(counts, "references", -1) >= 0, "read_component_summary counts.references should be present.");

        Dictionary<string, object> implementation = GetDictionary(result, "implementation");
        AssertTrue(implementation != null, "read_component_summary payload should include implementation.");
        AssertTrue(implementation.ContainsKey("resolvedName"), "read_component_summary implementation should expose resolvedName.");
        AssertTrue(implementation.ContainsKey("memoryLocation"), "read_component_summary implementation should expose memoryLocation.");
    }

    private static void AssertEqual(bool expected, bool actual, string message)
    {
        if (expected != actual)
        {
            throw new Exception(message + " Expected '" + expected + "' but got '" + actual + "'.");
        }
    }

    private static string FindFirstComponentPath(Dictionary<string, object> payload)
    {
        IList items = GetList(payload, "items");
        for (int i = 0; i < items.Count; i++)
        {
            Dictionary<string, object> item = items[i] as Dictionary<string, object>;
            string path = GetString(item, "path");
            if (!String.IsNullOrWhiteSpace(path))
            {
                return path;
            }
        }

        return String.Empty;
    }

    private static string GetDisplayNameFromPath(string path)
    {
        if (String.IsNullOrWhiteSpace(path))
        {
            return String.Empty;
        }

        int index = path.LastIndexOf('\\');
        if (index < 0 || index + 1 >= path.Length)
        {
            return path;
        }

        return path.Substring(index + 1);
    }

    private static string FindMethodCapableComponentPath(Process process)
    {
        string preferred = GetPreferredMethodCapableComponentPath(process);
        if (!String.IsNullOrWhiteSpace(preferred))
        {
            return preferred;
        }

        Dictionary<string, object> foldersRequest = new Dictionary<string, object>();
        foldersRequest["type"] = "request";
        foldersRequest["id"] = "smoke-method-folders-1";
        foldersRequest["commandId"] = "AscetListFolders";
        foldersRequest["payload"] = new Dictionary<string, object>
        {
            { "depth", 2 }
        };

        Dictionary<string, object> foldersResponse = SendJsonRequest(process, foldersRequest);
        AssertTrue(GetBool(foldersResponse, "ok"), "host list_methods folder preflight should succeed.");
        return FindMethodCapableComponentPathInFolders(process, GetList(GetDictionary(foldersResponse, "result"), "folders"));
    }

    private static string GetPreferredMethodCapableComponentPath(Process process)
    {
        string preferred = "ASCET_Tutorial_Solutions\\Lesson8\\IdleCon";
        if (CanListMethods(process, preferred))
        {
            return preferred;
        }

        return String.Empty;
    }

    private static string GetKnownModuleComponentPath(Process process)
    {
        string preferred = "ASCET_Tutorial_Solutions\\Lesson8\\IdleCon";
        if (CanListMethods(process, preferred))
        {
            return preferred;
        }

        return String.Empty;
    }

    private static string GetKnownStateMachineComponentPath(Process process)
    {
        string preferred = "ASCET_Tutorial_Solutions\\Lesson4\\WarmUp";
        if (CanReadComponentSummary(process, preferred))
        {
            return preferred;
        }

        return String.Empty;
    }

    private static bool CanListMethods(Process process, string componentPath)
    {
        if (String.IsNullOrWhiteSpace(componentPath))
        {
            return false;
        }

        Dictionary<string, object> request = new Dictionary<string, object>();
        request["type"] = "request";
        request["id"] = "smoke-method-prefetch-1";
        request["commandId"] = "AscetListMethods";
        request["payload"] = new Dictionary<string, object>
        {
            { "componentPath", componentPath }
        };

        Dictionary<string, object> response = SendJsonRequest(process, request);
        if (!GetBool(response, "ok"))
        {
            return false;
        }

        Dictionary<string, object> result = GetDictionary(response, "result");
        return GetList(result, "methods").Count > 0;
    }

    private static bool CanReadComponentSummary(Process process, string componentPath)
    {
        if (String.IsNullOrWhiteSpace(componentPath))
        {
            return false;
        }

        Dictionary<string, object> request = new Dictionary<string, object>();
        request["type"] = "request";
        request["id"] = "smoke-summary-prefetch-1";
        request["commandId"] = "AscetReadComponentSummary";
        request["payload"] = new Dictionary<string, object>
        {
            { "componentPath", componentPath }
        };

        Dictionary<string, object> response = SendJsonRequest(process, request);
        return GetBool(response, "ok");
    }

    private static string FindFirstMethodName(Process process, string componentPath)
    {
        if (String.IsNullOrWhiteSpace(componentPath))
        {
            return String.Empty;
        }

        Dictionary<string, object> request = new Dictionary<string, object>();
        request["type"] = "request";
        request["id"] = "smoke-method-name-1";
        request["commandId"] = "AscetListMethods";
        request["payload"] = new Dictionary<string, object>
        {
            { "componentPath", componentPath }
        };

        Dictionary<string, object> response = SendJsonRequest(process, request);
        if (!GetBool(response, "ok"))
        {
            return String.Empty;
        }

        Dictionary<string, object> result = GetDictionary(response, "result");
        IList methods = GetList(result, "methods");
        for (int i = 0; i < methods.Count; i++)
        {
            Dictionary<string, object> method = methods[i] as Dictionary<string, object>;
            string name = GetString(method, "name");
            if (!String.IsNullOrWhiteSpace(name))
            {
                return name;
            }
        }

        return String.Empty;
    }

    private static string FindSummarizableComponentPath(Process process)
    {
        string preferred = GetKnownResolvableComponentPath(process);
        if (!String.IsNullOrWhiteSpace(preferred))
        {
            return preferred;
        }

        Dictionary<string, object> foldersRequest = new Dictionary<string, object>();
        foldersRequest["type"] = "request";
        foldersRequest["id"] = "smoke-summary-folders-1";
        foldersRequest["commandId"] = "AscetListFolders";
        foldersRequest["payload"] = new Dictionary<string, object>
        {
            { "depth", 2 }
        };

        Dictionary<string, object> foldersResponse = SendJsonRequest(process, foldersRequest);
        AssertTrue(GetBool(foldersResponse, "ok"), "host read_component_summary folder preflight should succeed.");
        return FindFirstComponentPathInFolders(process, GetList(GetDictionary(foldersResponse, "result"), "folders"));
    }

    private static string FindMethodCapableComponentPathInFolders(Process process, IList folders)
    {
        if (folders == null)
        {
            return String.Empty;
        }

        for (int i = 0; i < folders.Count; i++)
        {
            Dictionary<string, object> folder = folders[i] as Dictionary<string, object>;
            if (folder == null)
            {
                continue;
            }

            string folderPath = GetString(folder, "path");
            if (!String.IsNullOrWhiteSpace(folderPath))
            {
                string componentPath = FindMethodCapableComponentPathInFolder(process, folderPath);
                if (!String.IsNullOrWhiteSpace(componentPath))
                {
                    return componentPath;
                }
            }

            string nestedComponentPath = FindMethodCapableComponentPathInFolders(process, GetList(folder, "children"));
            if (!String.IsNullOrWhiteSpace(nestedComponentPath))
            {
                return nestedComponentPath;
            }
        }

        return String.Empty;
    }

    private static string FindMethodCapableComponentPathInFolder(Process process, string folderPath)
    {
        Dictionary<string, object> componentRequest = new Dictionary<string, object>();
        componentRequest["type"] = "request";
        componentRequest["id"] = "smoke-components-for-methods-" + folderPath;
        componentRequest["commandId"] = "AscetListComponents";
        componentRequest["payload"] = new Dictionary<string, object>
        {
            { "folderPath", folderPath },
            { "recursive", true },
            { "limit", 20 }
        };

        Dictionary<string, object> componentResponse = SendJsonRequest(process, componentRequest);
        AssertTrue(GetBool(componentResponse, "ok"), "host list_methods component preflight should succeed.");

        IList items = GetList(GetDictionary(componentResponse, "result"), "items");
        for (int i = 0; i < items.Count; i++)
        {
            Dictionary<string, object> item = items[i] as Dictionary<string, object>;
            string componentPath = GetString(item, "path");
            if (String.IsNullOrWhiteSpace(componentPath))
            {
                continue;
            }

            Dictionary<string, object> request = new Dictionary<string, object>();
            request["type"] = "request";
            request["id"] = "smoke-method-probe-" + i;
            request["commandId"] = "AscetListMethods";
            request["payload"] = new Dictionary<string, object>
            {
                { "componentPath", componentPath }
            };

            Dictionary<string, object> response = SendJsonRequest(process, request);
            if (GetBool(response, "ok"))
            {
                return componentPath;
            }
        }

        return String.Empty;
    }

    private static string FindFirstComponentPathInFolders(Process process, IList folders)
    {
        if (folders == null)
        {
            return String.Empty;
        }

        for (int i = 0; i < folders.Count; i++)
        {
            Dictionary<string, object> folder = folders[i] as Dictionary<string, object>;
            if (folder == null)
            {
                continue;
            }

            string folderPath = GetString(folder, "path");
            if (!String.IsNullOrWhiteSpace(folderPath))
            {
                string componentPath = FindFirstComponentPathInFolder(process, folderPath);
                if (!String.IsNullOrWhiteSpace(componentPath))
                {
                    return componentPath;
                }
            }

            string nestedComponentPath = FindFirstComponentPathInFolders(process, GetList(folder, "children"));
            if (!String.IsNullOrWhiteSpace(nestedComponentPath))
            {
                return nestedComponentPath;
            }
        }

        return String.Empty;
    }

    private static string FindFirstComponentPathInFolder(Process process, string folderPath)
    {
        Dictionary<string, object> componentRequest = new Dictionary<string, object>();
        componentRequest["type"] = "request";
        componentRequest["id"] = "smoke-summary-components-" + folderPath;
        componentRequest["commandId"] = "AscetListComponents";
        componentRequest["payload"] = new Dictionary<string, object>
        {
            { "folderPath", folderPath },
            { "recursive", true },
            { "limit", 20 }
        };

        Dictionary<string, object> componentResponse = SendJsonRequest(process, componentRequest);
        AssertTrue(GetBool(componentResponse, "ok"), "host read_component_summary component preflight should succeed.");
        return FindFirstComponentPath(GetDictionary(componentResponse, "result"));
    }

    private static string GetKnownResolvableComponentPath(Process process)
    {
        string preferred = GetKnownModuleComponentPath(process);
        if (!String.IsNullOrWhiteSpace(preferred))
        {
            return preferred;
        }

        string fallback = ResolveKnownComponentPath(process, "ASCET_Tutorial_Solutions\\Lesson8\\IdleCon");
        if (!String.IsNullOrWhiteSpace(fallback))
        {
            return fallback;
        }

        fallback = ResolveKnownComponentPath(process, "DEMO\\PID");
        if (!String.IsNullOrWhiteSpace(fallback))
        {
            return fallback;
        }

        return String.Empty;
    }

    private static string ResolveKnownComponentPath(Process process, string query)
    {
        if (String.IsNullOrWhiteSpace(query))
        {
            return String.Empty;
        }

        Dictionary<string, object> request = new Dictionary<string, object>();
        request["type"] = "request";
        request["id"] = "smoke-known-component-" + query;
        request["commandId"] = "AscetResolveComponent";
        request["payload"] = new Dictionary<string, object>
        {
            { "query", query },
            { "limit", 1 }
        };

        Dictionary<string, object> response = SendJsonRequest(process, request);
        if (!GetBool(response, "ok"))
        {
            return String.Empty;
        }

        Dictionary<string, object> result = GetDictionary(response, "result");
        Dictionary<string, object> component = GetDictionary(result, "component");
        string path = GetString(component, "path");
        return String.IsNullOrWhiteSpace(path) ? String.Empty : path;
    }

}
