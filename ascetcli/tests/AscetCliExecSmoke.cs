using System;
using System.Collections;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Text;
using System.Threading;
using System.Web.Script.Serialization;

public static class AscetCliExecSmoke
{
    private static readonly JavaScriptSerializer Serializer = new JavaScriptSerializer();
    private const int ProcessTimeoutMs = 30000;
    private const int StreamJoinTimeoutMs = 5000;

    public static int Main()
    {
        try
        {
            string exePath = GetCliPath();
            AssertTrue(File.Exists(exePath), "AscetCli.exe should exist in the ascet-csharp bin output.");

            TestDefaultOutputLayout();
            TestCapabilities(exePath);
            TestInvalidSubcommand(exePath);
            TestInvalidExecArguments(exePath);
            TestProxyExecInvalidArguments(exePath);
            TestLegacyProxyErrorCodeNormalization();
            TestListDiagramsAcceptsDiagramKindArgument();
            TestSearchOccurrencesTargetComponentAndElement(exePath);
            TestSearchOccurrencesTargetCodeUnsupported(exePath);
            TestInvalidBatchLane(exePath);
            TestInvalidHostLane(exePath);
            TestMalformedLaneSyntax(exePath);
            TestSelfTestQuick(exePath);
            TestBenchmarkPlaceholder(exePath);
            TestExecListFolders(exePath);
            TestExecListComponents(exePath);
            TestExecListMethods(exePath);
            TestExecListDiagrams(exePath);
            TestExecReadMethodCode(exePath);
            TestExecReadComponentSummary(exePath);

            Console.WriteLine("AscetCliExecSmoke passed.");
            return 0;
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine(ex.Message);
            return 1;
        }
    }

    private static void TestDefaultOutputLayout()
    {
        string binDir = GetBinDirectory();

        AssertFileExists(Path.Combine(binDir, "AscetCli.exe"), "AscetCli.exe should exist in the default ascet-csharp bin output.");
        AssertFileExists(Path.Combine(binDir, "AscetReadHost.exe"), "AscetReadHost.exe should exist in the default ascet-csharp bin output.");
        AssertFileExists(Path.Combine(binDir, "AscetReadDomainQuickCheck.exe"), "AscetReadDomainQuickCheck.exe should exist in the default ascet-csharp bin output.");
        AssertFileExists(Path.Combine(binDir, "AscetReadDomainDeepCheck.exe"), "AscetReadDomainDeepCheck.exe should exist in the default ascet-csharp bin output.");
        AssertFileExists(Path.Combine(binDir, "AscetReadDomainSmoke.exe"), "AscetReadDomainSmoke.exe should exist in the default ascet-csharp bin output.");
        AssertFileExists(Path.Combine(binDir, "AscetReadOnlyExample.exe"), "AscetReadOnlyExample.exe should exist in the default ascet-csharp bin output.");
        AssertFileExists(Path.Combine(binDir, "AscetWorker.exe"), "AscetWorker.exe should exist in the default ascet-csharp bin output.");
        AssertFileExists(Path.Combine(binDir, "AscetOrchestrator.exe"), "AscetOrchestrator.exe should exist in the default ascet-csharp bin output.");
        AssertFileExists(Path.Combine(binDir, "AscetThreadHarness.exe"), "AscetThreadHarness.exe should exist in the default ascet-csharp bin output.");

    }

    private static void TestExecListFolders(string exePath)
    {
        ProcessJsonResult probe = RunJsonAllowingFailure(exePath, "exec", "list_folders", "--depth", "0", "--json");
        Dictionary<string, object> response = probe.Payload;
        Dictionary<string, object> error = GetDictionary(response, "error");
        if (!GetBool(response, "ok"))
        {
            if (probe.ExitCode == 2 && IsEnvironmentSkipCode(GetString(error, "code")))
            {
                Console.WriteLine("LIVE exec probe skipped: ASCET live environment is unavailable.");
                return;
            }

            throw new Exception("exec list_folders should succeed when ASCET has an open database.");
        }

        AssertEqual(0, probe.ExitCode, "exec list_folders should exit cleanly on success.");
        AssertTrue(GetBool(response, "ok"), "exec list_folders should succeed.");

        Dictionary<string, object> result = GetDictionary(response, "result");
        AssertTrue(result != null, "exec list_folders should include a result object.");
        AssertCommonListFoldersPayload(result, String.Empty, 0);

        Dictionary<string, object> meta = GetDictionary(response, "meta");
        AssertTrue(meta != null, "exec response should include meta.");
        AssertEqual("exec", GetString(meta, "mode"), "exec response meta.mode should be exec.");
    }

    private static void TestCapabilities(string exePath)
    {
        Dictionary<string, object> response = RunJson(exePath, 0, "capabilities", "--json");
        AssertTrue(GetBool(response, "ok"), "capabilities should succeed.");

        Dictionary<string, object> result = GetDictionary(response, "result");
        AssertTrue(result != null, "capabilities should include result.");
        AssertContains(GetList(result, "modes"), "exec", "capabilities should list exec mode.");
        AssertContains(GetList(result, "modes"), "batch", "capabilities should list batch mode.");
        AssertContains(GetList(result, "modes"), "capabilities", "capabilities should list capabilities mode.");
        AssertContains(GetList(result, "modes"), "selftest", "capabilities should list selftest mode.");
        AssertContains(GetList(result, "modes"), "benchmark", "capabilities should list benchmark mode.");
        AssertContains(GetList(result, "operations"), "list_folders", "capabilities should list the shared list_folders operation.");
        AssertContains(GetList(result, "operations"), "list_components", "capabilities should list the shared list_components operation.");
        AssertContains(GetList(result, "operations"), "list_methods", "capabilities should list the shared list_methods operation.");
        AssertContains(GetList(result, "operations"), "read_component_summary", "capabilities should list the shared read_component_summary operation.");
        AssertContains(GetList(result, "operations"), "read_method_code", "capabilities should list the shared read_method_code operation.");
        AssertContains(GetList(result, "operations"), "read_method_signature", "capabilities should list the shared read_method_signature operation.");
        AssertContains(GetList(result, "operations"), "resolve_component", "capabilities should list the resolve_component operation.");
        AssertContains(GetList(result, "operations"), "read_component_children", "capabilities should list the read_component_children operation.");
        AssertContains(GetList(result, "operations"), "read_component_refs", "capabilities should list the proxied read_component_refs operation.");
        AssertContains(GetList(result, "operations"), "read_element_refs", "capabilities should list the proxied read_element_refs operation.");
        AssertContains(GetList(result, "operations"), "find_elements", "capabilities should list the proxied find_elements operation.");
        AssertContains(GetList(result, "operations"), "read_text_code", "capabilities should list the proxied read_text_code operation.");
        AssertContains(GetList(result, "operations"), "create_method", "capabilities should list the proxied create_method operation.");
        AssertContains(GetList(result, "operations"), "create_folder", "capabilities should list the proxied create_folder operation.");
        AssertContains(GetList(result, "operations"), "delete_component", "capabilities should list the proxied delete_component operation.");
        AssertContains(GetList(result, "operations"), "delete_method", "capabilities should list the proxied delete_method operation.");
        AssertContains(GetList(result, "operations"), "create_component", "capabilities should list the shared create_component operation.");
        AssertContains(GetList(result, "operations"), "set_class_method_code", "capabilities should list the proxied set_class_method_code operation.");
        AssertContains(GetList(result, "operations"), "set_method_signature", "capabilities should list the proxied set_method_signature operation.");
        AssertContains(GetList(result, "operations"), "set_method_code", "capabilities should list the shared set_method_code operation.");
        AssertContains(GetList(result, "operations"), "set_module_code", "capabilities should list the proxied set_module_code operation.");
        AssertContains(GetList(result, "operations"), "set_state_machine_code", "capabilities should list the proxied set_state_machine_code operation.");
        AssertContains(GetList(result, "operations"), "apply_element_spec", "capabilities should list the shared apply_element_spec operation.");
        AssertContains(GetList(result, "operations"), "read_project_formulas", "capabilities should list the read_project_formulas operation.");
        AssertContains(GetList(result, "operations"), "read_dependent_chain", "capabilities should list the read_dependent_chain operation.");
        AssertNotContains(GetList(result, "operations"), "read_import_export_match", "capabilities should not expose the removed read_import_export_match operation.");
        AssertNotContains(GetList(result, "operations"), "read_import_export_matches", "capabilities should not expose the removed read_import_export_matches operation.");
        AssertNotContains(GetList(result, "operations"), "plan_element_dependency", "capabilities should not expose the removed plan_element_dependency operation.");
        AssertContains(GetList(result, "operations"), "apply_project_formula", "capabilities should list the proxied apply_project_formula operation.");
        AssertContains(GetList(result, "operations"), "show_occurrences", "capabilities should list the proxied show_occurrences operation.");
        AssertContains(GetList(result, "batchLanes"), "read", "capabilities should advertise the implemented batch read lane.");
        AssertContains(GetList(result, "batchLanes"), "write", "capabilities should advertise the implemented batch write lane.");
        AssertContains(GetList(result, "selftestProfiles"), "quick", "capabilities should advertise the quick selftest profile.");
        AssertContains(GetList(result, "selftestProfiles"), "deep", "capabilities should advertise the deep selftest profile.");
        AssertContains(GetList(result, "selftestProfiles"), "smoke", "capabilities should advertise the smoke selftest profile.");
        AssertTrue(!GetBool(result, "benchmarkImplemented"), "capabilities should report benchmark as not implemented.");
        AssertContains(GetList(result, "hostOperations"), "list_methods", "capabilities should list the shared list_methods host operation.");
        AssertContains(GetList(result, "hostOperations"), "read_component_summary", "capabilities should list the shared read_component_summary host operation.");
        AssertContains(GetList(result, "hostOperations"), "read_method_signature", "capabilities should list the shared read_method_signature host operation.");
        AssertNotContains(GetList(result, "hostOperations"), "find_elements", "capabilities should keep scan operations out of host operations.");
        AssertNotContains(GetList(result, "hostOperations"), "read_block_diagram", "capabilities should keep fragile reads out of host operations.");
        AssertOperationProfile(
            result,
            "list_folders",
            "stable",
            "prefer_host",
            "read",
            -1,
            true);
        AssertOperationProfile(
            result,
            "find_elements",
            "expensive_scan",
            "force_one_shot",
            "scan",
            200,
            false);
        AssertOperationProfile(
            result,
            "read_dependent_chain",
            "expensive_scan",
            "force_one_shot",
            "scan",
            200,
            false);
        AssertOperationProfile(
            result,
            "read_block_diagram",
            "fragile",
            "force_one_shot",
            "expensive_read",
            -1,
            false);
        AssertOperationProfile(
            result,
            "set_method_code",
            "write",
            "prefer_host",
            "write",
            -1,
            true);
        AssertOperationProfile(
            result,
            "set_method_signature",
            "write",
            "prefer_host",
            "write",
            -1,
            true);

        Dictionary<string, object> host = GetDictionary(result, "host");
        AssertTrue(host != null, "capabilities should include host capability metadata.");
        AssertEqual(1, GetInt(host, "protocolVersion", -1), "host capabilities should expose protocolVersion=1.");
        AssertEqual("read", GetString(host, "lane"), "host capabilities should expose the read lane.");
        AssertEqual("AscetGetCapabilities", GetString(host, "capabilityCommandId"), "host capabilities should advertise the capability command.");
        AssertContains(GetList(host, "pooledReadCommands"), "AscetReadComponentSummary", "host capabilities should advertise the pooled AscetReadComponentSummary command.");
        AssertContains(GetList(host, "supportedCommands"), "AscetReadComponentSummary", "host capabilities should advertise AscetReadComponentSummary.");
        AssertContains(GetList(host, "supportedCommands"), "AscetGetCapabilities", "host capabilities should advertise AscetGetCapabilities.");
        AssertContains(GetList(host, "supportedOperations"), "read_component_summary", "host capabilities should advertise read_component_summary.");
        Dictionary<string, object> commandMap = GetDictionary(host, "commandMap");
        AssertTrue(commandMap != null, "host capabilities should include a command map.");
        AssertEqual("AscetReadComponentSummary", GetString(commandMap, "read_component_summary"), "host capabilities should map read_component_summary to AscetReadComponentSummary.");
    }

    private static void AssertOperationProfile(
        Dictionary<string, object> capabilities,
        string operation,
        string expectedHostSafety,
        string expectedHostPolicy,
        string expectedTimeoutClass,
        int expectedPageBudget,
        bool expectedHostEligible)
    {
        Dictionary<string, object> catalogItem = FindOperationCatalogItem(capabilities, operation);
        AssertTrue(catalogItem != null, "operationCatalog should include " + operation + ".");
        AssertEqual(operation, GetString(catalogItem, "operation"), operation + " catalog item should preserve operation id.");
        AssertTrue(GetBool(catalogItem, "hostEligible") == expectedHostEligible, operation + " catalog item should preserve host eligibility.");

        Dictionary<string, object> profile = GetDictionary(catalogItem, "executionProfile");
        AssertTrue(profile != null, operation + " catalog item should include executionProfile.");
        AssertEqual(expectedHostSafety, GetString(profile, "hostSafety"), operation + " should expose hostSafety.");
        AssertEqual(expectedHostPolicy, GetString(profile, "hostPolicy"), operation + " should expose hostPolicy.");
        AssertEqual(expectedTimeoutClass, GetString(profile, "timeoutClass"), operation + " should expose timeoutClass.");
        if (expectedPageBudget > 0)
        {
            AssertEqual(expectedPageBudget, GetInt(profile, "pageBudget", -1), operation + " should expose pageBudget.");
        }
    }

    private static Dictionary<string, object> FindOperationCatalogItem(Dictionary<string, object> capabilities, string operation)
    {
        IList catalog = GetList(capabilities, "operationCatalog");
        for (int i = 0; i < catalog.Count; i++)
        {
            Dictionary<string, object> item = catalog[i] as Dictionary<string, object>;
            if (item != null && String.Equals(GetString(item, "operation"), operation, StringComparison.Ordinal))
            {
                return item;
            }
        }

        return null;
    }

    private static void TestExecListComponents(string exePath)
    {
        ProcessJsonResult foldersProbe = RunJsonAllowingFailure(exePath, "exec", "list_folders", "--depth", "0", "--json");
        Dictionary<string, object> foldersResponse = foldersProbe.Payload;
        Dictionary<string, object> foldersError = GetDictionary(foldersResponse, "error");
        if (!GetBool(foldersResponse, "ok"))
        {
            if (foldersProbe.ExitCode == 2 && IsEnvironmentSkipCode(GetString(foldersError, "code")))
            {
                Console.WriteLine("LIVE exec list_components probe skipped: ASCET live environment is unavailable.");
                return;
            }

            throw new Exception("exec list_components preflight should succeed when ASCET has an open database.");
        }

        string folderPath = FindFirstFolderPath(GetDictionary(foldersResponse, "result"));
        if (String.IsNullOrWhiteSpace(folderPath))
        {
            Console.WriteLine("LIVE exec list_components probe skipped: no folder scope was available.");
            return;
        }

        ProcessJsonResult probe = RunJsonAllowingFailure(exePath, "exec", "list_components", folderPath, "--limit", "1", "--json");
        Dictionary<string, object> response = probe.Payload;
        AssertEqual(0, probe.ExitCode, "exec list_components should exit cleanly on success.");
        AssertTrue(GetBool(response, "ok"), "exec list_components should succeed.");

        Dictionary<string, object> result = GetDictionary(response, "result");
        AssertTrue(result != null, "exec list_components should include a result object.");
        AssertCommonListComponentsPayload(result, folderPath, 1, false);

        Dictionary<string, object> meta = GetDictionary(response, "meta");
        AssertTrue(meta != null, "exec list_components response should include meta.");
        AssertEqual("exec", GetString(meta, "mode"), "exec list_components response meta.mode should be exec.");
        AssertEqual("list_components", GetString(meta, "operation"), "exec list_components response meta.operation should be list_components.");
    }

    private static void TestExecListMethods(string exePath)
    {
        string componentPath = FindMethodCapableComponentPath(exePath);
        if (String.IsNullOrWhiteSpace(componentPath))
        {
            Console.WriteLine("LIVE exec list_methods probe skipped: no method-capable component scope was available.");
            return;
        }

        ProcessJsonResult probe = RunJsonAllowingFailure(exePath, "exec", "list_methods", componentPath, "--json");
        Dictionary<string, object> response = probe.Payload;
        AssertEqual(0, probe.ExitCode, "exec list_methods should exit cleanly on success.");
        AssertTrue(GetBool(response, "ok"), "exec list_methods should succeed.");

        Dictionary<string, object> result = GetDictionary(response, "result");
        AssertTrue(result != null, "exec list_methods should include a result object.");
        AssertCommonListMethodsPayload(result, componentPath);

        Dictionary<string, object> meta = GetDictionary(response, "meta");
        AssertTrue(meta != null, "exec list_methods response should include meta.");
        AssertEqual("exec", GetString(meta, "mode"), "exec list_methods response meta.mode should be exec.");
        AssertEqual("list_methods", GetString(meta, "operation"), "exec list_methods response meta.operation should be list_methods.");
    }

    private static void TestExecListDiagrams(string exePath)
    {
        string componentPath = FindDiagramCapableComponentPath(exePath);
        if (String.IsNullOrWhiteSpace(componentPath))
        {
            Console.WriteLine("LIVE exec list_diagrams probe skipped: no diagram-capable component scope was available.");
            return;
        }

        ProcessJsonResult probe = RunJsonAllowingFailure(exePath, "exec", "list_diagrams", componentPath, "--json");
        Dictionary<string, object> response = probe.Payload;
        AssertEqual(0, probe.ExitCode, "exec list_diagrams should exit cleanly on success.");
        AssertTrue(GetBool(response, "ok"), "exec list_diagrams should succeed.");

        Dictionary<string, object> result = GetDictionary(response, "result");
        AssertTrue(result != null, "exec list_diagrams should include a result object.");
        AssertEqual(componentPath, GetString(result, "componentPath"), "list_diagrams payload should preserve componentPath.");
        AssertTrue(!String.IsNullOrWhiteSpace(GetString(result, "componentKind")), "list_diagrams payload should include componentKind.");
        AssertTrue(GetList(result, "items") != null, "list_diagrams payload should expose items.");

        Dictionary<string, object> meta = GetDictionary(response, "meta");
        AssertTrue(meta != null, "exec list_diagrams response should include meta.");
        AssertEqual("exec", GetString(meta, "mode"), "exec list_diagrams response meta.mode should be exec.");
        AssertEqual("list_diagrams", GetString(meta, "operation"), "exec list_diagrams response meta.operation should be list_diagrams.");
    }

    private static void TestExecReadMethodCode(string exePath)
    {
        MethodProbeTarget target = FindReadableMethodTarget(exePath);
        if (target == null || String.IsNullOrWhiteSpace(target.ComponentPath) || String.IsNullOrWhiteSpace(target.MethodName))
        {
            Console.WriteLine("LIVE exec read_method_code probe skipped: no readable method target was available.");
            return;
        }

        ProcessJsonResult probe = RunJsonAllowingFailure(exePath, "exec", "read_method_code", target.ComponentPath, target.MethodName, "--json");
        Dictionary<string, object> response = probe.Payload;
        AssertEqual(0, probe.ExitCode, "exec read_method_code should exit cleanly on success.");
        AssertTrue(GetBool(response, "ok"), "exec read_method_code should succeed.");

        Dictionary<string, object> result = GetDictionary(response, "result");
        AssertTrue(result != null, "exec read_method_code should include a result object.");
        AssertCommonReadMethodCodePayload(result, target.ComponentPath, target.MethodName);

        Dictionary<string, object> meta = GetDictionary(response, "meta");
        AssertTrue(meta != null, "exec read_method_code response should include meta.");
        AssertEqual("exec", GetString(meta, "mode"), "exec read_method_code response meta.mode should be exec.");
        AssertEqual("read_method_code", GetString(meta, "operation"), "exec read_method_code response meta.operation should be read_method_code.");
    }

    private static void TestExecReadComponentSummary(string exePath)
    {
        string componentPath = FindSummarizableComponentPath(exePath);
        if (String.IsNullOrWhiteSpace(componentPath))
        {
            Console.WriteLine("LIVE exec read_component_summary probe skipped: no summarizable component scope was available.");
            return;
        }

        ProcessJsonResult probe = RunJsonAllowingFailure(exePath, "exec", "read_component_summary", componentPath, "--json");
        Dictionary<string, object> response = probe.Payload;
        AssertEqual(0, probe.ExitCode, "exec read_component_summary should exit cleanly on success.");
        AssertTrue(GetBool(response, "ok"), "exec read_component_summary should succeed.");

        Dictionary<string, object> result = GetDictionary(response, "result");
        AssertTrue(result != null, "exec read_component_summary should include a result object.");
        AssertCommonComponentSummaryPayload(result, componentPath);

        Dictionary<string, object> meta = GetDictionary(response, "meta");
        AssertTrue(meta != null, "exec read_component_summary response should include meta.");
        AssertEqual("exec", GetString(meta, "mode"), "exec read_component_summary response meta.mode should be exec.");
        AssertEqual("read_component_summary", GetString(meta, "operation"), "exec read_component_summary response meta.operation should be read_component_summary.");
    }

    private static void TestInvalidBatchLane(string exePath)
    {
        Dictionary<string, object> response = RunJson(exePath, 2, "batch", "--lane", "bogus", "--json");
        AssertTrue(!GetBool(response, "ok"), "batch should reject an unsupported lane.");

        Dictionary<string, object> error = GetDictionary(response, "error");
        AssertTrue(error != null, "invalid batch lane should include an error object.");
        AssertEqual("invalid_arguments", GetString(error, "code"), "invalid batch lane should report invalid_arguments.");
    }

    private static void TestInvalidHostLane(string exePath)
    {
        Dictionary<string, object> response = RunJson(exePath, 2, "host", "--lane", "bogus", "--json");
        AssertTrue(!GetBool(response, "ok"), "host should reject an unsupported lane.");

        Dictionary<string, object> error = GetDictionary(response, "error");
        AssertTrue(error != null, "invalid host lane should include an error object.");
        AssertEqual("invalid_arguments", GetString(error, "code"), "invalid host lane should report invalid_arguments.");
    }

    private static void TestInvalidSubcommand(string exePath)
    {
        Dictionary<string, object> response = RunJson(exePath, 2, "bogus");
        AssertTrue(!GetBool(response, "ok"), "invalid subcommand should fail.");

        Dictionary<string, object> error = GetDictionary(response, "error");
        AssertTrue(error != null, "invalid subcommand should include an error object.");
        AssertEqual("invalid_arguments", GetString(error, "code"), "invalid subcommand should report invalid_arguments.");
    }

    private static void TestInvalidExecArguments(string exePath)
    {
        Dictionary<string, object> response = RunJson(exePath, 2, "exec", "list_folders", "--depth", "-1", "--json");
        AssertTrue(!GetBool(response, "ok"), "invalid exec arguments should fail.");

        Dictionary<string, object> error = GetDictionary(response, "error");
        AssertTrue(error != null, "invalid exec arguments should include an error object.");
        AssertEqual("invalid_arguments", GetString(error, "code"), "invalid exec arguments should report invalid_arguments.");
    }

    private static void TestProxyExecInvalidArguments(string exePath)
    {
        AssertProxyExecInvalidArguments(exePath, "resolve_component", "invalid_argument", "PID", "--kind", "bogus", "--json");
        AssertProxyExecInvalidArguments(exePath, "read_component_children", "invalid_argument");
        AssertProxyExecInvalidArguments(exePath, "list_diagrams", "invalid_argument");
        AssertProxyExecInvalidArguments(exePath, "read_block_diagram", "invalid_argument");
        AssertProxyExecInvalidArguments(exePath, "read_component_refs", "invalid_argument");
        AssertProxyExecInvalidArguments(exePath, "read_element_refs", "invalid_argument");
        AssertProxyExecInvalidArguments(exePath, "find_elements", "invalid_argument");
        AssertProxyExecInvalidArguments(exePath, "read_text_code", "invalid_argument");
        AssertProxyExecInvalidArguments(exePath, "create_folder", "invalid_argument");
        AssertProxyExecInvalidArguments(exePath, "create_method", "invalid_argument");
        AssertProxyExecInvalidArguments(exePath, "set_method_signature", "invalid_argument");
        AssertProxyExecInvalidArguments(exePath, "delete_component", "invalid_argument");
        AssertProxyExecInvalidArguments(exePath, "delete_method", "invalid_argument");
        AssertProxyExecInvalidArguments(exePath, "set_class_method_code", "invalid_argument");
        AssertProxyExecInvalidArguments(exePath, "set_module_code", "invalid_argument");
        AssertProxyExecInvalidArguments(exePath, "set_state_machine_code", "invalid_argument");
        AssertProxyExecInvalidArguments(exePath, "read_project_formulas", "invalid_argument");
        AssertProxyExecInvalidArguments(exePath, "apply_project_formula", "invalid_argument");
        AssertProxyExecInvalidArguments(exePath, "show_occurrences", "invalid_argument");
    }

    private static void TestSearchOccurrencesTargetCodeUnsupported(string exePath)
    {
        Dictionary<string, object> response = RunJson(exePath, 2, "exec", "search_occurrences", "torqueReq", "--target", "code", "--json");
        AssertTrue(!GetBool(response, "ok"), "search_occurrences target=code should fail structurally until code occurrence search is implemented.");

        Dictionary<string, object> error = GetDictionary(response, "error");
        AssertTrue(error != null, "search_occurrences target=code should include an error object.");
        AssertEqual("unsupported_target", GetString(error, "code"), "search_occurrences target=code should return unsupported_target.");
    }

    private static void TestSearchOccurrencesTargetComponentAndElement(string exePath)
    {
        AssertSearchOccurrencesTargetParses(exePath, "component");
        AssertSearchOccurrencesTargetParses(exePath, "element");
    }

    private static void AssertSearchOccurrencesTargetParses(string exePath, string target)
    {
        ProcessJsonResult probe = RunJsonAllowingFailure(
            exePath,
            "exec",
            "search_occurrences",
            "torqueReq",
            "--target",
            target,
            "--scope",
            "__ASCET_SMOKE_NO_SUCH_SCOPE__",
            "--limit",
            "1",
            "--json");
        Dictionary<string, object> response = probe.Payload;

        if (GetBool(response, "ok"))
        {
            Dictionary<string, object> result = GetDictionary(response, "result");
            AssertTrue(result != null, "search_occurrences target=" + target + " should include a result object on success.");
            AssertEqual(target, GetString(result, "target"), "search_occurrences should preserve target=" + target + " in result payload.");
            AssertTrue(result.ContainsKey("occurrences"), "search_occurrences target=" + target + " should expose occurrences.");
            AssertTrue(result.ContainsKey("counts"), "search_occurrences target=" + target + " should expose counts.");
            AssertTrue(result.ContainsKey("nextCursor"), "search_occurrences target=" + target + " should expose nextCursor.");
            AssertTrue(result.ContainsKey("searchComplete"), "search_occurrences target=" + target + " should expose searchComplete.");
            AssertTrue(result.ContainsKey("truncated"), "search_occurrences target=" + target + " should expose truncated.");
            return;
        }

        Dictionary<string, object> error = GetDictionary(response, "error");
        AssertTrue(error != null, "search_occurrences target=" + target + " should fail with a structured error when ASCET environment or scope is unavailable.");
        string actualCode = GetString(error, "code");
        AssertTrue(
            String.Equals("database_not_open", actualCode, StringComparison.Ordinal)
                || String.Equals("tool_connect_failed", actualCode, StringComparison.Ordinal)
                || String.Equals("folder_not_found", actualCode, StringComparison.Ordinal)
                || String.Equals("component_not_found", actualCode, StringComparison.Ordinal),
            "search_occurrences target=" + target + " should parse target and reach execution, but got '" + actualCode + "'.");
    }

    private static void AssertProxyExecInvalidArguments(string exePath, string operation, string expectedCode, params string[] invalidArgs)
    {
        List<string> args = new List<string>();
        args.Add("exec");
        args.Add(operation);
        if (invalidArgs != null)
        {
            for (int i = 0; i < invalidArgs.Length; i++)
            {
                args.Add(invalidArgs[i]);
            }
        }

        Dictionary<string, object> response = RunJson(exePath, 2, args.ToArray());
        AssertTrue(!GetBool(response, "ok"), "proxy exec should fail structurally when required args are missing for operation '" + operation + "'.");

        Dictionary<string, object> error = GetDictionary(response, "error");
        AssertTrue(error != null, "proxy exec invalid arguments should include an error object for operation '" + operation + "'.");
        string actualCode = GetString(error, "code");
        AssertTrue(!String.Equals("not_implemented", actualCode, StringComparison.Ordinal), "proxy exec should no longer report not_implemented for registered proxy operation '" + operation + "'.");
        AssertTrue(!String.Equals("tool_not_found", actualCode, StringComparison.Ordinal), "proxy exec should execute the sibling proxy target when it is present for operation '" + operation + "'.");
        AssertTrue(
            String.Equals(expectedCode, actualCode, StringComparison.Ordinal)
                || IsProxyTransitionErrorCode(actualCode),
            "proxy exec should surface a structured validation or environment code for operation '" + operation + "', but got '" + actualCode + "'.");
    }

    private static bool IsProxyTransitionErrorCode(string code)
    {
        string normalized = code ?? String.Empty;
        return String.Equals("invalid_argument", normalized, StringComparison.Ordinal)
            || String.Equals("invalid_arguments", normalized, StringComparison.Ordinal)
            || String.Equals("tool_connect_failed", normalized, StringComparison.Ordinal)
            || String.Equals("database_not_open", normalized, StringComparison.Ordinal)
            || String.Equals("component_not_found", normalized, StringComparison.Ordinal)
            || String.Equals("folder_not_found", normalized, StringComparison.Ordinal)
            || String.Equals("project_not_found", normalized, StringComparison.Ordinal)
            || String.Equals("child_command_failed", normalized, StringComparison.Ordinal);
    }

    private static void TestLegacyProxyErrorCodeNormalization()
    {
        AssertEqual(
            "component_not_found",
            ExecCommand.NormalizeProxyErrorCodeForTesting(
                "legacy_proxy_failed",
                "Legacy proxy 'AscetReadComponentChildren.exe' failed for operation 'read_component_children': component_not_found:[read]:Component 'NoSuchComponent' was not found."),
            "legacy proxy wrappers should expose component_not_found instead of legacy_proxy_failed.");

        AssertEqual(
            "component_not_found",
            ExecCommand.NormalizeProxyErrorCodeForTesting(
                "legacy_proxy_failed",
                "Legacy proxy 'AscetReadImplementation.exe' failed for operation 'read_implementation': Component 'NoSuchComponent' was not found."),
            "legacy proxy wrappers should infer component_not_found from not-found messages.");

        AssertEqual(
            "unsupported_component_kind",
            ExecCommand.NormalizeProxyErrorCodeForTesting(
                "legacy_proxy_failed",
                "Legacy proxy 'AscetReadStateMachineFlow.exe' failed for operation 'read_state_machine_flow': Item 'DEMO\\PID' is not a state machine."),
            "legacy proxy wrappers should expose unsupported_component_kind for non-state-machine flow reads.");

        AssertEqual(
            "unsupported_component_kind",
            ExecCommand.NormalizeProxyErrorCodeForTesting(
                "legacy_proxy_failed",
                "Legacy proxy 'AscetReadStateMachineFlow.exe' failed for operation 'read_state_machine_flow': unsupported_component_kind [resolve_state_machine_diagram]: Item 'DEMO\\PID' is not classified as a state machine."),
            "legacy proxy wrappers should preserve structured unsupported_component_kind markers.");

        AssertEqual(
            "method_not_found",
            ExecCommand.NormalizeProxyErrorCodeForTesting(
                "component_not_found",
                "Method 'nonexistent' was not found in component 'DEMO\\PID'."),
            "legacy proxy wrappers should expose method_not_found for missing named methods.");

        AssertEqual(
            "Item 'DEMO\\PID' is not an ASCET project.",
            ExecCommand.NormalizeProxyErrorMessageForTesting(
                "Item 'DEMO\\PID' is not an ASCET project.\r\nStackTrace:\r\n   at Internal.Frame()"),
            "legacy proxy wrappers should remove stack traces from model-facing messages.");

        AssertEqual(
            "unsupported_component_kind",
            ExecCommand.NormalizeProxyErrorCodeForTesting(
                "Exception[0]",
                "Legacy proxy 'AscetDiffProjectFormulas.exe' failed for operation 'diff_project_formulas': System.InvalidOperationException: Item 'DEMO\\PID' is not an ASCET project."),
            "legacy proxy wrappers should expose unsupported_component_kind for non-project formula diffs.");

        AssertEqual(
            "unsupported_component_kind",
            ExecCommand.NormalizeProxyErrorCodeForTesting(
                "Exception[0]",
                "Legacy proxy 'AscetDiffStateMachineDomain.exe' failed for operation 'diff_state_machine_domain': Item 'DEMO\\PID' is not a state machine."),
            "legacy proxy wrappers should expose unsupported_component_kind for non-state-machine domain diffs.");
    }

    private static void TestListDiagramsAcceptsDiagramKindArgument()
    {
        try
        {
            ExecCommand.ParseListDiagramsArgumentsForTesting(new string[] { "DEMO\\PID", "--diagram-kind", "block", "--json" });
        }
        catch (AscetReadException ex)
        {
            throw new Exception("exec list_diagrams should parse --diagram-kind before live ToolAPI execution. " + ex.Message);
        }

        try
        {
            ExecCommand.ParseListDiagramsArgumentsForTesting(new string[] { "DEMO\\PID", "--diagram-kind", "bogus" });
            throw new Exception("exec list_diagrams should reject unsupported diagramKind values before live ToolAPI execution.");
        }
        catch (AscetReadException ex)
        {
            AssertEqual("invalid_argument", ex.Code, "unsupported diagramKind should be invalid_argument.");
        }
    }

    private static void TestMalformedLaneSyntax(string exePath)
    {
        Dictionary<string, object> response = RunJson(exePath, 2, "host", "read", "--json");
        AssertTrue(!GetBool(response, "ok"), "malformed host lane syntax should fail.");

        Dictionary<string, object> error = GetDictionary(response, "error");
        AssertTrue(error != null, "malformed host lane syntax should include an error object.");
        AssertEqual("invalid_arguments", GetString(error, "code"), "malformed lane syntax should report invalid_arguments.");
    }

    private static void TestSelfTestQuick(string exePath)
    {
        ProcessJsonResult probe = RunJsonAllowingFailure(exePath, "selftest", "quick", "--json");
        Dictionary<string, object> response = probe.Payload;

        if (GetBool(response, "ok"))
        {
            Dictionary<string, object> result = GetDictionary(response, "result");
            AssertTrue(result != null, "selftest quick should include a result object.");
            AssertEqual("quick", GetString(result, "profile"), "selftest quick should report the requested profile.");
            AssertEqual("AscetReadDomainQuickCheck.exe", GetString(result, "command"), "selftest quick should report the delegated executable.");
            AssertTrue(result.ContainsKey("passed"), "selftest quick should expose pass/fail state.");
            AssertTrue(result.ContainsKey("exitCode"), "selftest quick should expose the delegated exit code.");
            AssertTrue(result.ContainsKey("stdout"), "selftest quick should expose delegated stdout.");
            AssertTrue(result.ContainsKey("stderr"), "selftest quick should expose delegated stderr.");

            Dictionary<string, object> meta = GetDictionary(response, "meta");
            AssertTrue(meta != null, "selftest quick response should include meta.");
            AssertEqual("selftest", GetString(meta, "mode"), "selftest quick response meta.mode should be selftest.");
            AssertEqual("quick", GetString(meta, "operation"), "selftest quick response meta.operation should be quick.");
            return;
        }

        Dictionary<string, object> error = GetDictionary(response, "error");
        AssertTrue(error != null, "failed selftest quick should include an error object.");
        AssertTrue(
            String.Equals("environment_unavailable", GetString(error, "code"), StringComparison.Ordinal)
            || String.Equals("selftest_failed", GetString(error, "code"), StringComparison.Ordinal)
            || String.Equals("selftest_timeout", GetString(error, "code"), StringComparison.Ordinal),
            "selftest quick failure should be structured.");
        AssertEqual(2, probe.ExitCode, "failed selftest quick should return structured-error exit code 2.");
    }

    private static void TestBenchmarkPlaceholder(string exePath)
    {
        Dictionary<string, object> response = RunJson(exePath, 2, "benchmark", "--json");
        AssertTrue(!GetBool(response, "ok"), "benchmark placeholder should fail structurally.");

        Dictionary<string, object> error = GetDictionary(response, "error");
        AssertTrue(error != null, "benchmark placeholder should include an error object.");
        AssertEqual("not_implemented", GetString(error, "code"), "benchmark placeholder should report not_implemented.");
    }

    private static Dictionary<string, object> RunJson(string exePath, int expectedExitCode, params string[] args)
    {
        ProcessJsonResult result = RunJsonAllowingFailure(exePath, args);
        AssertEqual(expectedExitCode, result.ExitCode, "AscetCli.exe returned an unexpected exit code." + Environment.NewLine + result.Stderr);
        return result.Payload;
    }

    private static ProcessJsonResult RunJsonAllowingFailure(string exePath, params string[] args)
    {
        string joinedArguments = JoinArguments(args);
        string workingDirectory = Path.GetDirectoryName(exePath);
        Exception directFailure = null;

        try
        {
        ProcessJsonResult direct = RunJsonProcess(
            exePath,
                joinedArguments,
                workingDirectory);
        if (!String.IsNullOrWhiteSpace(direct.Stdout))
        {
            direct.Payload = Serializer.Deserialize<Dictionary<string, object>>(direct.Stdout);
            return direct;
        }
        }
        catch (Exception ex)
        {
            directFailure = ex;
        }

        string fallbackArguments =
            "-NoProfile -NonInteractive -ExecutionPolicy Bypass -Command " +
            QuoteArgument("& " + QuotePowerShellLiteral(exePath) + " " + joinedArguments);

        ProcessJsonResult fallback;
        try
        {
            fallback = RunJsonProcess(
                "powershell.exe",
                fallbackArguments,
                workingDirectory);
        }
        catch (Exception ex)
        {
            if (directFailure != null)
            {
                throw new Exception(
                    "AscetCli.exe failed both direct and PowerShell fallback execution. Args: " +
                    joinedArguments +
                    Environment.NewLine +
                    "Direct failure: " + directFailure.Message +
                    Environment.NewLine +
                    "Fallback failure: " + ex.Message,
                    ex);
            }

            throw;
        }

        AssertTrue(
            !String.IsNullOrWhiteSpace(fallback.Stdout),
            "AscetCli.exe should emit JSON. Args: " +
            joinedArguments +
            Environment.NewLine +
            fallback.Stderr +
            (directFailure == null ? String.Empty : Environment.NewLine + "Direct failure: " + directFailure.Message));
        fallback.Payload = Serializer.Deserialize<Dictionary<string, object>>(fallback.Stdout);
        return fallback;
    }

    private static ProcessJsonResult RunJsonProcess(string fileName, string arguments, string workingDirectory)
    {
        ProcessStartInfo startInfo = new ProcessStartInfo
        {
            FileName = fileName,
            Arguments = arguments,
            UseShellExecute = false,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            CreateNoWindow = true,
            WorkingDirectory = workingDirectory
        };

        using (Process process = new Process())
        {
            process.StartInfo = startInfo;
            AssertTrue(process.Start(), "Failed to start process '" + fileName + "'.");

            StringBuilder stdoutBuilder = new StringBuilder();
            StringBuilder stderrBuilder = new StringBuilder();
            Exception stdoutError = null;
            Exception stderrError = null;

            Thread stdoutThread = new Thread(delegate()
            {
                try
                {
                    stdoutBuilder.Append(process.StandardOutput.ReadToEnd());
                }
                catch (Exception ex)
                {
                    stdoutError = ex;
                }
            });
            stdoutThread.IsBackground = true;

            Thread stderrThread = new Thread(delegate()
            {
                try
                {
                    stderrBuilder.Append(process.StandardError.ReadToEnd());
                }
                catch (Exception ex)
                {
                    stderrError = ex;
                }
            });
            stderrThread.IsBackground = true;

            stdoutThread.Start();
            stderrThread.Start();

            if (!process.WaitForExit(ProcessTimeoutMs))
            {
                TryKillProcessTree(process);
                process.WaitForExit(StreamJoinTimeoutMs);
                stdoutThread.Join(StreamJoinTimeoutMs);
                stderrThread.Join(StreamJoinTimeoutMs);

                throw new TimeoutException(
                    "AscetCli.exe should exit promptly. Timed out after " +
                    ProcessTimeoutMs +
                    " ms. Command: " +
                    fileName +
                    " " +
                    arguments);
            }

            AssertTrue(stdoutThread.Join(StreamJoinTimeoutMs), "Timed out draining stdout for '" + fileName + "'.");
            AssertTrue(stderrThread.Join(StreamJoinTimeoutMs), "Timed out draining stderr for '" + fileName + "'.");
            if (stdoutError != null)
            {
                throw new Exception("Failed to read stdout for '" + fileName + "'.", stdoutError);
            }

            if (stderrError != null)
            {
                throw new Exception("Failed to read stderr for '" + fileName + "'.", stderrError);
            }

            ProcessJsonResult result = new ProcessJsonResult();
            result.ExitCode = process.ExitCode;
            result.Stdout = stdoutBuilder.ToString();
            result.Stderr = stderrBuilder.ToString();
            return result;
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
            ProcessStartInfo killStartInfo = new ProcessStartInfo
            {
                FileName = "taskkill.exe",
                Arguments = "/PID " + process.Id.ToString() + " /T /F",
                UseShellExecute = false,
                CreateNoWindow = true
            };

            using (Process killer = new Process())
            {
                killer.StartInfo = killStartInfo;
                if (killer.Start())
                {
                    killer.WaitForExit(StreamJoinTimeoutMs);
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
                    process.WaitForExit(StreamJoinTimeoutMs);
                }
            }
            catch
            {
            }
        }
    }

    private static string JoinArguments(string[] args)
    {
        if (args == null || args.Length == 0)
        {
            return String.Empty;
        }

        string[] quoted = new string[args.Length];
        for (int i = 0; i < args.Length; i++)
        {
            quoted[i] = QuoteArgument(args[i]);
        }

        return String.Join(" ", quoted);
    }

    private static string GetCliPath()
    {
        return Path.Combine(GetBinDirectory(), "AscetCli.exe");
    }

    private static string GetBinDirectory()
    {
        return FindPathUpwards("output", "ascet-csharp", "bin");
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

    private static string GetString(Dictionary<string, object> payload, string key)
    {
        if (payload == null || String.IsNullOrWhiteSpace(key) || !payload.ContainsKey(key) || payload[key] == null)
        {
            return String.Empty;
        }

        return Convert.ToString(payload[key]) ?? String.Empty;
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

    private static void AssertCommonListFoldersPayload(Dictionary<string, object> result, string expectedRootPath, int expectedDepth)
    {
        AssertEqual(expectedRootPath, GetString(result, "rootPath"), "list_folders payload should preserve rootPath.");
        AssertEqual(expectedDepth, GetInt(result, "depth", -1), "list_folders payload should preserve parsed depth.");

        Dictionary<string, object> counts = GetDictionary(result, "counts");
        AssertTrue(counts != null, "list_folders payload should include counts.");
        AssertTrue(GetInt(counts, "folders", -1) >= 0, "list_folders counts.folders should be present.");
        AssertEqual(0, GetInt(counts, "projects", -1), "list_folders counts.projects should be present.");
        AssertEqual(0, GetInt(counts, "components", -1), "list_folders counts.components should be present.");

        IList folders = GetList(result, "folders");
        AssertEqual(GetInt(counts, "folders", -1), folders.Count, "top-level folder count should match counts.folders for depth=0.");

        if (folders.Count > 0)
        {
            Dictionary<string, object> folder = folders[0] as Dictionary<string, object>;
            AssertTrue(folder != null, "folder entry should be an object.");
            AssertTrue(!String.IsNullOrWhiteSpace(GetString(folder, "displayName")), "folder entry should expose displayName.");
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

    private static void AssertCommonReadMethodCodePayload(Dictionary<string, object> result, string expectedComponentPath, string expectedMethodName)
    {
        AssertEqual(expectedComponentPath, GetString(result, "componentPath"), "read_method_code payload should preserve componentPath.");
        AssertEqual(expectedMethodName, GetString(result, "methodName"), "read_method_code payload should preserve methodName.");
        AssertTrue(!String.IsNullOrWhiteSpace(GetString(result, "componentKind")), "read_method_code payload should include componentKind.");
        AssertTrue(!String.IsNullOrWhiteSpace(GetString(result, "languageKind")), "read_method_code payload should include languageKind.");
        AssertTrue(!String.IsNullOrWhiteSpace(GetString(result, "methodKind")), "read_method_code payload should include methodKind.");
        AssertTrue(result.ContainsKey("code"), "read_method_code payload should include code.");
    }

    private static string FindFirstFolderPath(Dictionary<string, object> payload)
    {
        IList folders = GetList(payload, "folders");
        for (int i = 0; i < folders.Count; i++)
        {
            Dictionary<string, object> folder = folders[i] as Dictionary<string, object>;
            string path = GetString(folder, "path");
            if (!String.IsNullOrWhiteSpace(path))
            {
                return path;
            }
        }

        return String.Empty;
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

    private static string FindMethodCapableComponentPath(string exePath)
    {
        ProcessJsonResult foldersProbe = RunJsonAllowingFailure(exePath, "exec", "list_folders", "--depth", "0", "--json");
        Dictionary<string, object> foldersResponse = foldersProbe.Payload;
        Dictionary<string, object> foldersError = GetDictionary(foldersResponse, "error");
        if (!GetBool(foldersResponse, "ok"))
        {
            if (foldersProbe.ExitCode == 2 && IsEnvironmentSkipCode(GetString(foldersError, "code")))
            {
                Console.WriteLine("LIVE exec list_methods probe skipped: ASCET live environment is unavailable.");
                return String.Empty;
            }

            throw new Exception("exec list_methods preflight should succeed when ASCET has an open database.");
        }

        IList folders = GetList(GetDictionary(foldersResponse, "result"), "folders");
        string preferredDemoFolderPath = FindFolderPathByName(folders, "DEMO");
        if (!String.IsNullOrWhiteSpace(preferredDemoFolderPath))
        {
            string demoComponentPath = FindMethodCapableComponentPathInFolder(exePath, preferredDemoFolderPath);
            if (!String.IsNullOrWhiteSpace(demoComponentPath))
            {
                return demoComponentPath;
            }
        }

        return FindMethodCapableComponentPathInFolders(exePath, folders);
    }

    private static string FindSummarizableComponentPath(string exePath)
    {
        ProcessJsonResult foldersProbe = RunJsonAllowingFailure(exePath, "exec", "list_folders", "--depth", "0", "--json");
        Dictionary<string, object> foldersResponse = foldersProbe.Payload;
        Dictionary<string, object> foldersError = GetDictionary(foldersResponse, "error");
        if (!GetBool(foldersResponse, "ok"))
        {
            if (foldersProbe.ExitCode == 2 && IsEnvironmentSkipCode(GetString(foldersError, "code")))
            {
                Console.WriteLine("LIVE exec read_component_summary probe skipped: ASCET live environment is unavailable.");
                return String.Empty;
            }

            throw new Exception("exec read_component_summary preflight should succeed when ASCET has an open database.");
        }

        IList folders = GetList(GetDictionary(foldersResponse, "result"), "folders");
        string preferredDemoFolderPath = FindFolderPathByName(folders, "DEMO");
        if (!String.IsNullOrWhiteSpace(preferredDemoFolderPath))
        {
            string demoComponentPath = FindFirstComponentPathInFolder(exePath, preferredDemoFolderPath);
            if (!String.IsNullOrWhiteSpace(demoComponentPath))
            {
                return demoComponentPath;
            }
        }

        return FindFirstComponentPathInFolders(exePath, folders);
    }

    private static string FindDiagramCapableComponentPath(string exePath)
    {
        ProcessJsonResult foldersProbe = RunJsonAllowingFailure(exePath, "exec", "list_folders", "--depth", "0", "--json");
        Dictionary<string, object> foldersResponse = foldersProbe.Payload;
        Dictionary<string, object> foldersError = GetDictionary(foldersResponse, "error");
        if (!GetBool(foldersResponse, "ok"))
        {
            if (foldersProbe.ExitCode == 2 && IsEnvironmentSkipCode(GetString(foldersError, "code")))
            {
                Console.WriteLine("LIVE exec list_diagrams probe skipped: ASCET live environment is unavailable.");
                return String.Empty;
            }

            throw new Exception("exec list_diagrams preflight should succeed when ASCET has an open database.");
        }

        IList folders = GetList(GetDictionary(foldersResponse, "result"), "folders");
        string preferredDemoFolderPath = FindFolderPathByName(folders, "DEMO");
        if (!String.IsNullOrWhiteSpace(preferredDemoFolderPath))
        {
            string demoComponentPath = FindDiagramCapableComponentPathInFolder(exePath, preferredDemoFolderPath);
            if (!String.IsNullOrWhiteSpace(demoComponentPath))
            {
                return demoComponentPath;
            }
        }

        return FindDiagramCapableComponentPathInFolders(exePath, folders);
    }

    private static string FindMethodCapableComponentPathInFolders(string exePath, IList folders)
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
                string componentPath = FindMethodCapableComponentPathInFolder(exePath, folderPath);
                if (!String.IsNullOrWhiteSpace(componentPath))
                {
                    return componentPath;
                }
            }

            string nestedComponentPath = FindMethodCapableComponentPathInFolders(exePath, GetList(folder, "children"));
            if (!String.IsNullOrWhiteSpace(nestedComponentPath))
            {
                return nestedComponentPath;
            }
        }

        return String.Empty;
    }

    private static string FindFirstComponentPathInFolders(string exePath, IList folders)
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
                string componentPath = FindFirstComponentPathInFolder(exePath, folderPath);
                if (!String.IsNullOrWhiteSpace(componentPath))
                {
                    return componentPath;
                }
            }

            string nestedComponentPath = FindFirstComponentPathInFolders(exePath, GetList(folder, "children"));
            if (!String.IsNullOrWhiteSpace(nestedComponentPath))
            {
                return nestedComponentPath;
            }
        }

        return String.Empty;
    }

    private static string FindDiagramCapableComponentPathInFolders(string exePath, IList folders)
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
                string componentPath = FindDiagramCapableComponentPathInFolder(exePath, folderPath);
                if (!String.IsNullOrWhiteSpace(componentPath))
                {
                    return componentPath;
                }
            }

            string nestedComponentPath = FindDiagramCapableComponentPathInFolders(exePath, GetList(folder, "children"));
            if (!String.IsNullOrWhiteSpace(nestedComponentPath))
            {
                return nestedComponentPath;
            }
        }

        return String.Empty;
    }

    private static string FindMethodCapableComponentPathInFolder(string exePath, string folderPath)
    {
        ProcessJsonResult componentsProbe = RunJsonAllowingFailure(exePath, "exec", "list_components", folderPath, "--recursive", "--limit", "20", "--json");
        Dictionary<string, object> componentsResponse = componentsProbe.Payload;
        if (!GetBool(componentsResponse, "ok"))
        {
            return String.Empty;
        }

        IList items = GetList(GetDictionary(componentsResponse, "result"), "items");
        for (int i = 0; i < items.Count; i++)
        {
            Dictionary<string, object> item = items[i] as Dictionary<string, object>;
            string componentPath = GetString(item, "path");
            if (String.IsNullOrWhiteSpace(componentPath))
            {
                continue;
            }

            ProcessJsonResult probe = RunJsonAllowingFailure(exePath, "exec", "list_methods", componentPath, "--json");
            if (GetBool(probe.Payload, "ok"))
            {
                return componentPath;
            }
        }

        return String.Empty;
    }

    private static string FindDiagramCapableComponentPathInFolder(string exePath, string folderPath)
    {
        ProcessJsonResult componentsProbe = RunJsonAllowingFailure(exePath, "exec", "list_components", folderPath, "--recursive", "--limit", "20", "--json");
        Dictionary<string, object> componentsResponse = componentsProbe.Payload;
        if (!GetBool(componentsResponse, "ok"))
        {
            return String.Empty;
        }

        IList items = GetList(GetDictionary(componentsResponse, "result"), "items");
        for (int i = 0; i < items.Count; i++)
        {
            Dictionary<string, object> item = items[i] as Dictionary<string, object>;
            string componentPath = GetString(item, "path");
            if (String.IsNullOrWhiteSpace(componentPath))
            {
                continue;
            }

            ProcessJsonResult probe = RunJsonAllowingFailure(exePath, "exec", "list_diagrams", componentPath, "--json");
            if (GetBool(probe.Payload, "ok"))
            {
                return componentPath;
            }
        }

        return String.Empty;
    }

    private static string FindFolderPathByName(IList folders, string expectedName)
    {
        if (folders == null || String.IsNullOrWhiteSpace(expectedName))
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

            string displayName = GetString(folder, "displayName");
            string path = GetString(folder, "path");
            if (String.Equals(displayName, expectedName, StringComparison.OrdinalIgnoreCase) ||
                String.Equals(path, expectedName, StringComparison.OrdinalIgnoreCase))
            {
                return path;
            }
        }

        return String.Empty;
    }

    private static MethodProbeTarget FindReadableMethodTarget(string exePath)
    {
        string componentPath = FindMethodCapableComponentPath(exePath);
        if (String.IsNullOrWhiteSpace(componentPath))
        {
            return null;
        }

        ProcessJsonResult probe = RunJsonAllowingFailure(exePath, "exec", "list_methods", componentPath, "--json");
        Dictionary<string, object> response = probe.Payload;
        if (!GetBool(response, "ok"))
        {
            return null;
        }

        IList methods = GetList(GetDictionary(response, "result"), "methods");
        for (int i = 0; i < methods.Count; i++)
        {
            Dictionary<string, object> method = methods[i] as Dictionary<string, object>;
            string methodName = GetString(method, "name");
            if (!String.IsNullOrWhiteSpace(methodName))
            {
                MethodProbeTarget target = new MethodProbeTarget();
                target.ComponentPath = componentPath;
                target.MethodName = methodName;
                return target;
            }
        }

        return null;
    }

    private static string FindFirstComponentPathInFolder(string exePath, string folderPath)
    {
        ProcessJsonResult componentsProbe = RunJsonAllowingFailure(exePath, "exec", "list_components", folderPath, "--recursive", "--limit", "20", "--json");
        Dictionary<string, object> componentsResponse = componentsProbe.Payload;
        if (!GetBool(componentsResponse, "ok"))
        {
            return String.Empty;
        }

        return FindFirstComponentPath(GetDictionary(componentsResponse, "result"));
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

    private static void AssertEqual(bool expected, bool actual, string message)
    {
        if (expected != actual)
        {
            throw new Exception(message + " Expected '" + expected + "' but got '" + actual + "'.");
        }
    }

    private static void AssertFileExists(string path, string message)
    {
        AssertTrue(File.Exists(path), message);
    }

    private static void AssertFileMissing(string path, string message)
    {
        AssertTrue(!File.Exists(path), message);
    }

    private static string QuoteArgument(string value)
    {
        string argument = value ?? String.Empty;
        if (argument.IndexOfAny(new char[] { ' ', '\t', '"' }) < 0)
        {
            return argument;
        }

        return "\"" + argument.Replace("\\", "\\\\").Replace("\"", "\\\"") + "\"";
    }

    private static string QuotePowerShellLiteral(string value)
    {
        return "'" + (value ?? String.Empty).Replace("'", "''") + "'";
    }

    private static bool IsEnvironmentSkipCode(string code)
    {
        string normalized = code ?? String.Empty;
        return String.Equals(normalized, "database_not_open", StringComparison.Ordinal)
            || String.Equals(normalized, "tool_connect_failed", StringComparison.Ordinal);
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
            if (File.Exists(fullPath) || Directory.Exists(fullPath))
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

    private sealed class ProcessJsonResult
    {
        public int ExitCode { get; set; }
        public string Stdout { get; set; }
        public string Stderr { get; set; }
        public Dictionary<string, object> Payload { get; set; }
    }

    private sealed class MethodProbeTarget
    {
        public string ComponentPath { get; set; }
        public string MethodName { get; set; }
    }
}
