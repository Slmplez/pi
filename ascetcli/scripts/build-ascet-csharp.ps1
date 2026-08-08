# Non-live only. Do not use this script to parallelize live ASCET ToolAPI verification.
# Use scripts\\verify-ascet-module-live.ps1 for serial live smoke checks.
param(
    [string]$BuildMode = ''
)

. "$PSScriptRoot\ascet-csharp-common.ps1"

function Resolve-AscetCSharpBuildMode {
    param(
        [string]$RequestedMode,
        [string]$EnvironmentMode
    )

    $rawMode = $RequestedMode
    if ([string]::IsNullOrWhiteSpace($rawMode)) {
        $rawMode = $EnvironmentMode
    }

    if ([string]::IsNullOrWhiteSpace($rawMode)) {
        return 'core'
    }

    switch ($rawMode.Trim().ToLowerInvariant()) {
        'core' { return 'core' }
        'default' { return 'core' }
        'legacy' { return 'legacy' }
        'full' { return 'legacy' }
        'all' { return 'legacy' }
        default { throw "Unsupported ASCET C# build mode '$rawMode'. Use 'core' (default) or 'legacy'. You can also set ASCET_CSHARP_BUILD_MODE." }
    }
}

function Remove-AscetExecutableOutputs {
    param(
        [Parameter(Mandatory = $true)]
        [string]$BinDirectory
    )

    if (-not (Test-Path -LiteralPath $BinDirectory)) {
        return
    }

    Get-ChildItem -LiteralPath $BinDirectory -Filter '*.exe' -File | ForEach-Object {
        $executablePath = $_.FullName
        try {
            Remove-Item -LiteralPath $executablePath -Force -ErrorAction Stop
        }
        catch [System.UnauthorizedAccessException], [System.IO.IOException] {
            throw ((Get-AscetFileLockGuidance -Path $executablePath -Operation 'remove') + " Original error: $($_.Exception.Message)")
        }
        catch {
            throw "Failed to remove stale executable '$executablePath'. $($_.Exception.Message)"
        }
    }
}

$binDir = Get-RepoPath 'output\ascet-csharp\bin'
$generatedDir = Get-RepoPath 'output\ascet-csharp\generated'
$coreDir = Get-RepoPath 'src\AscetCopilot'
$cliDir = Get-RepoPath 'src\AscetCli'
$autotestCliDir = Get-RepoPath 'src\AutotestCli'
$coreExecutableNames = @(
    'AscetCli.exe',
    'AscetReadHost.exe',
    'AscetReadDomainQuickCheck.exe',
    'AscetReadDomainDeepCheck.exe',
    'AscetReadDomainSmoke.exe',
    'AscetReadOnlyExample.exe',
    'AscetWorker.exe',
    'AscetOrchestrator.exe',
    'AscetBackendPoolDemo.exe',
    'AscetThreadHarness.exe'
)
$compatShimNames = @(
    'AscetListFolders.exe',
    'AscetCreateComponent.exe'
)
$resolvedBuildMode = Resolve-AscetCSharpBuildMode -RequestedMode $BuildMode -EnvironmentMode $env:ASCET_CSHARP_BUILD_MODE
$buildLegacyExecutables = $resolvedBuildMode -eq 'legacy'
$buildStandaloneProxyExecutables = $true

Assert-AscetToolchain
Ensure-Directory $binDir
Ensure-Directory $generatedDir
if (-not $buildLegacyExecutables) {
    Remove-AscetExecutableOutputs -BinDirectory $binDir
}
Publish-AscetRuntimeSupport $binDir
Write-Host "ASCET C# build mode: $resolvedBuildMode"

$readDomain = Join-Path $coreDir 'AscetReadDomain.cs'
$implementationRead = Join-Path $coreDir 'AscetImplementationRead.cs'
$referenceRead = Join-Path $coreDir 'AscetReferenceRead.cs'
$reverseReferenceRead = Join-Path $coreDir 'AscetReverseReferenceRead.cs'
$stateMachineAnalysis = Join-Path $coreDir 'AscetStateMachineAnalysis.cs'
$concurrencyCommon = Join-Path $coreDir 'AscetConcurrencyCommon.cs'
$advancedDtos = Join-Path $coreDir 'AscetAdvancedDtos.cs'
$referenceTrace = Join-Path $coreDir 'AscetReferenceTrace.cs'
$flowAnalysis = Join-Path $coreDir 'AscetStateMachineFlowAnalysis.cs'
$componentSnapshot = Join-Path $coreDir 'AscetComponentSnapshot.cs'
$stateMachineDiff = Join-Path $coreDir 'AscetStateMachineDiff.cs'
$esdlAnalysis = Join-Path $coreDir 'AscetEsdlAnalysis.cs'
$classDomain = Join-Path $coreDir 'AscetClassDomain.cs'
$moduleDomain = Join-Path $coreDir 'AscetModuleDomain.cs'
$moduleClosure = Join-Path $coreDir 'AscetModuleClosure.cs'
$stateMachineDomain = Join-Path $coreDir 'AscetStateMachineDomain.cs'
$componentWriteDomain = Join-Path $coreDir 'AscetComponentWriteDomain.cs'
$componentCreateDomain = Join-Path $coreDir 'AscetComponentCreate.cs'
$componentDeleteDomain = Join-Path $coreDir 'AscetComponentDelete.cs'
$elementWriteContract = Join-Path $coreDir 'AscetElementWriteContract.Generated.cs'
$elementSync = @($elementWriteContract, (Join-Path $coreDir 'AscetElementSync.cs'))
$projectFormulaSync = Join-Path $coreDir 'AscetProjectFormulaSync.cs'
$dbExplorerCommon = Join-Path $cliDir 'AscetDatabaseExplorerCommon.cs'
$artifactPathResolver = Join-Path $cliDir 'AscetArtifactPathResolver.cs'
$singleExeCliDir = Join-Path $cliDir 'Commands'
$singleExeHostDir = Join-Path $cliDir 'Host'
$singleExeRoutingDir = Join-Path $cliDir 'Routing'
$singleExeReadServiceDir = Join-Path $coreDir 'Services\Read'
$singleExeWriteServiceDir = Join-Path $coreDir 'Services\Write'
$singleExeExecutionDir = Join-Path $coreDir 'Execution'
$singleExeProtocolDir = Join-Path $coreDir 'Protocol'
$methodCreateDomain = Join-Path $coreDir 'AscetMethodCreate.cs'
$methodSignatureDomain = Join-Path $coreDir 'AscetMethodSignature.cs'
$methodDeleteDomain = Join-Path $coreDir 'AscetMethodDelete.cs'
$folderDeleteDomain = Join-Path $coreDir 'AscetFolderDelete.cs'
$folderCreateService = Join-Path $coreDir 'AscetFolderCreate.cs'
$folderReadService = Join-Path $singleExeReadServiceDir 'FolderReadService.cs'
$componentReadService = Join-Path $singleExeReadServiceDir 'ComponentReadService.cs'
$methodReadService = Join-Path $singleExeReadServiceDir 'MethodReadService.cs'
$summaryReadService = Join-Path $singleExeReadServiceDir 'SummaryReadService.cs'
$getReadService = Join-Path $coreDir 'Services\Get\AscetGetService.cs'
$batchReadExecutor = Join-Path $singleExeExecutionDir 'AscetBatchReadExecutor.cs'
$batchWriteExecutor = Join-Path $singleExeExecutionDir 'AscetBatchWriteExecutor.cs'
$writeExecutor = Join-Path $coreDir 'Execution\AscetWriteExecutor.cs'
$writeVerificationService = Join-Path $singleExeWriteServiceDir 'WriteVerificationService.cs'
$componentWriteService = Join-Path $singleExeWriteServiceDir 'ComponentWriteService.cs'
$methodExecWriteService = Join-Path $singleExeWriteServiceDir 'MethodWriteService.cs'
$elementSpecWriteService = Join-Path $singleExeWriteServiceDir 'ElementSpecWriteService.cs'
$batchDtos = Join-Path $singleExeProtocolDir 'AscetBatchDtos.cs'
$execDtos = Join-Path $singleExeProtocolDir 'AscetExecDtos.cs'
$hostDtos = Join-Path $singleExeProtocolDir 'AscetHostDtos.cs'
$capabilityDtos = Join-Path $singleExeProtocolDir 'AscetCapabilityDtos.cs'
$jsonProtocol = Join-Path $coreDir 'Core\AscetJsonProtocol.cs'
$errorMapper = Join-Path $coreDir 'Core\AscetErrorMapper.cs'
$liveContext = Join-Path $coreDir 'Core\AscetLiveContext.cs'
$liveContextFactory = Join-Path $coreDir 'Core\AscetLiveContextFactory.cs'
$sessionRefreshPolicy = Join-Path $coreDir 'Core\AscetSessionRefreshPolicy.cs'
$writeHostContext = Join-Path $coreDir 'Core\AscetWriteHostContext.cs'
$readHostCapabilityService = Join-Path $singleExeHostDir 'AscetReadHostCapabilityService.cs'
$writeHost = Join-Path $singleExeHostDir 'AscetWriteHost.cs'
$writeHostServer = Join-Path $singleExeHostDir 'AscetWriteHostServer.cs'
$writeHostDispatcher = Join-Path $singleExeHostDir 'AscetWriteHostDispatcher.cs'
$writeHostCapabilityService = Join-Path $singleExeHostDir 'AscetWriteHostCapabilityService.cs'
$readHostDispatcher = Join-Path $singleExeHostDir 'AscetReadHostDispatcher.cs'
$listDiagramsSource = Join-Path $generatedDir 'AscetListDiagrams.generated.cs'

@'
using System;
using System.Collections.Generic;
using System.IO;
using System.Text;

public static class AscetListDiagrams
{
    public static int Main(string[] args)
    {
        TextWriter originalOut = Console.Out;
        StringWriter suppressedOut = null;

        try
        {
            ListDiagramsArguments parsed = ParseArguments(args);
            if (parsed.EmitJson)
            {
                suppressedOut = new StringWriter();
                Console.SetOut(suppressedOut);
            }

            Dictionary<string, object> payload = BuildPayload(parsed.ComponentPath, parsed.DiagramKind);
            string output = parsed.EmitJson ? AscetDatabaseExplorerCommon.Serialize(payload) : FormatTextOutput(payload);

            Console.SetOut(originalOut);
            Console.Write(output);
            return 0;
        }
        catch (Exception ex)
        {
            Console.SetOut(originalOut);
            Console.Error.WriteLine(FormatException(ex));
            return 1;
        }
        finally
        {
            Console.SetOut(originalOut);
            if (suppressedOut != null)
            {
                suppressedOut.Dispose();
            }
        }
    }

    private static ListDiagramsArguments ParseArguments(string[] args)
    {
        if (args == null || args.Length < 1)
        {
            throw new AscetReadException("invalid_argument", "parse_arguments", "usage: AscetListDiagrams.exe <component-path> [--diagram-kind <all|block|block_diagram|state|state_machine|sequence|unknown>] [--json]");
        }

        ListDiagramsArguments parsed = new ListDiagramsArguments();
        parsed.ComponentPath = AscetDatabaseExplorerCommon.NormalizePath(args[0], "component_path");
        parsed.DiagramKind = String.Empty;
        for (int i = 1; i < args.Length; i++)
        {
            if (String.Equals(args[i], "--json", StringComparison.OrdinalIgnoreCase))
            {
                parsed.EmitJson = true;
                continue;
            }

            if (String.Equals(args[i], "--diagram-kind", StringComparison.OrdinalIgnoreCase))
            {
                if (i + 1 >= args.Length)
                {
                    throw new AscetReadException("invalid_argument", "parse_arguments", "--diagram-kind expects a value.");
                }

                parsed.DiagramKind = NormalizeDiagramKindFilter(args[++i]);
                continue;
            }

            throw new AscetReadException("invalid_argument", "parse_arguments", "Unknown argument '" + args[i] + "'.");
        }

        return parsed;
    }

    private static bool HasJsonFlag(string[] args, int startIndex)
    {
        if (args == null)
        {
            return false;
        }

        for (int i = startIndex; i < args.Length; i++)
        {
            if (String.Equals(args[i], "--json", StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }

            throw new AscetReadException("invalid_argument", "parse_arguments", "Unknown argument '" + args[i] + "'.");
        }

        return false;
    }

    private static string NormalizeDiagramKindFilter(string value)
    {
        string normalized = (value ?? String.Empty).Trim().ToLowerInvariant().Replace("-", "_");
        switch (normalized)
        {
            case "":
            case "all":
                return String.Empty;
            case "block":
            case "block_diagram":
            case "state":
            case "state_machine":
            case "sequence":
            case "unknown":
                return normalized;
            default:
                throw new AscetReadException("invalid_argument", "parse_arguments", "Unsupported diagramKind '" + value + "'.");
        }
    }

    private static Dictionary<string, object> BuildPayload(string componentPath)
    {
        return BuildPayload(componentPath, String.Empty);
    }

    private static Dictionary<string, object> BuildPayload(string componentPath, string diagramKindFilter)
    {
        AscetToolApiBootstrap.ConfigureAssemblyResolution();

        ComponentLocatorService locator = new ComponentLocatorService();
        DiagramCatalogService diagrams = new DiagramCatalogService();
        AscetItemPath parsed = AscetItemPath.Parse(componentPath);
        AscetItemRef component = locator.FindItemInFolder(parsed.ItemName, parsed.FolderPath);
        if (component == null)
        {
            if (FolderExists(locator, componentPath))
            {
                throw new AscetReadException("target_is_folder", "list_diagrams", "Target path '" + componentPath + "' resolves to a folder, not a code component.");
            }

            throw new AscetReadException("component_not_found", "list_diagrams", "Component '" + componentPath + "' was not found.");
        }

        IList<AscetDiagramRef> diagramRefs = diagrams.ListDiagrams(component) ?? new List<AscetDiagramRef>();
        string defaultDiagramName = ChooseDefaultDiagramName(diagramRefs);
        List<Dictionary<string, object>> items = BuildItems(diagramRefs, defaultDiagramName, diagramKindFilter);

        Dictionary<string, object> payload = new Dictionary<string, object>();
        payload["componentPath"] = component.Path ?? componentPath;
        payload["componentKind"] = AscetDatabaseExplorerCommon.KindToSchema(component.Kind);
        if (!String.IsNullOrWhiteSpace(defaultDiagramName))
        {
            payload["defaultDiagramName"] = defaultDiagramName;
        }

        payload["items"] = items;
        Dictionary<string, object> filters = new Dictionary<string, object>();
        filters["diagramKind"] = String.IsNullOrWhiteSpace(diagramKindFilter) ? "all" : diagramKindFilter;
        payload["filters"] = filters;
        return payload;
    }

    private static List<Dictionary<string, object>> BuildItems(IList<AscetDiagramRef> diagramRefs, string defaultDiagramName)
    {
        return BuildItems(diagramRefs, defaultDiagramName, String.Empty);
    }

    private static List<Dictionary<string, object>> BuildItems(IList<AscetDiagramRef> diagramRefs, string defaultDiagramName, string diagramKindFilter)
    {
        List<Dictionary<string, object>> items = new List<Dictionary<string, object>>();
        if (diagramRefs == null)
        {
            return items;
        }

        for (int i = 0; i < diagramRefs.Count; i++)
        {
            AscetDiagramRef diagram = diagramRefs[i];
            string name = diagram == null ? String.Empty : (diagram.Name ?? String.Empty);
            AscetDiagramKind diagramKind = diagram == null ? AscetDiagramKind.Unknown : diagram.DiagramKind;
            if (!DiagramMatchesFilter(diagramKind, diagramKindFilter))
            {
                continue;
            }

            Dictionary<string, object> entry = new Dictionary<string, object>();
            entry["name"] = name;
            entry["kind"] = diagramKind.ToString();
            entry["visibility"] = "unknown";
            entry["isDefault"] = !String.IsNullOrWhiteSpace(defaultDiagramName) && String.Equals(name, defaultDiagramName, StringComparison.Ordinal);
            entry["supportsReadBlockDiagram"] = diagramKind == AscetDiagramKind.BlockDiagram;
            items.Add(entry);
        }

        return items;
    }

    private static bool DiagramMatchesFilter(AscetDiagramKind diagramKind, string diagramKindFilter)
    {
        if (String.IsNullOrWhiteSpace(diagramKindFilter))
        {
            return true;
        }

        string actual = diagramKind.ToString();
        if (String.Equals(diagramKindFilter, "block", StringComparison.OrdinalIgnoreCase) ||
            String.Equals(diagramKindFilter, "block_diagram", StringComparison.OrdinalIgnoreCase))
        {
            return String.Equals(actual, "BlockDiagram", StringComparison.OrdinalIgnoreCase);
        }

        if (String.Equals(diagramKindFilter, "state", StringComparison.OrdinalIgnoreCase) ||
            String.Equals(diagramKindFilter, "state_machine", StringComparison.OrdinalIgnoreCase))
        {
            return actual.IndexOf("State", StringComparison.OrdinalIgnoreCase) >= 0;
        }

        if (String.Equals(diagramKindFilter, "sequence", StringComparison.OrdinalIgnoreCase))
        {
            return actual.IndexOf("Sequence", StringComparison.OrdinalIgnoreCase) >= 0;
        }

        return String.Equals(actual, diagramKindFilter, StringComparison.OrdinalIgnoreCase);
    }

    private sealed class ListDiagramsArguments
    {
        public string ComponentPath { get; set; }
        public string DiagramKind { get; set; }
        public bool EmitJson { get; set; }
    }

    private static string ChooseDefaultDiagramName(IList<AscetDiagramRef> diagramRefs)
    {
        if (diagramRefs == null || diagramRefs.Count == 0)
        {
            return String.Empty;
        }

        for (int i = 0; i < diagramRefs.Count; i++)
        {
            AscetDiagramRef diagram = diagramRefs[i];
            if (diagram != null && diagram.DiagramKind == AscetDiagramKind.BlockDiagram && !String.IsNullOrWhiteSpace(diagram.Name))
            {
                return diagram.Name;
            }
        }

        for (int i = 0; i < diagramRefs.Count; i++)
        {
            AscetDiagramRef diagram = diagramRefs[i];
            if (diagram != null && !String.IsNullOrWhiteSpace(diagram.Name))
            {
                return diagram.Name;
            }
        }

        return String.Empty;
    }

    private static bool FolderExists(ComponentLocatorService locator, string folderPath)
    {
        try
        {
            if (locator == null || String.IsNullOrWhiteSpace(folderPath))
            {
                return false;
            }

            locator.ListItemsInFolder(folderPath, false);
            return true;
        }
        catch (AscetReadException ex)
        {
            return !String.Equals(ex.Code, "folder_not_found", StringComparison.Ordinal);
        }
        catch
        {
            return false;
        }
    }

    private static string FormatTextOutput(Dictionary<string, object> payload)
    {
        StringBuilder builder = new StringBuilder();
        builder.Append("Component: ").Append(AscetDatabaseExplorerCommon.GetString(payload, "componentPath")).AppendLine();
        builder.Append("DefaultDiagram: ").Append(AscetDatabaseExplorerCommon.GetString(payload, "defaultDiagramName")).AppendLine();

        IList<object> items = AscetDatabaseExplorerCommon.GetList(payload, "items");
        builder.Append("Diagrams: ").Append(items.Count).AppendLine();
        for (int i = 0; i < items.Count; i++)
        {
            Dictionary<string, object> item = items[i] as Dictionary<string, object>;
            builder.Append("  - ").Append(AscetDatabaseExplorerCommon.GetString(item, "kind")).Append(": ").Append(AscetDatabaseExplorerCommon.GetString(item, "name"));
            if (GetBool(item, "isDefault"))
            {
                builder.Append(" [default]");
            }

            if (GetBool(item, "supportsReadBlockDiagram"))
            {
                builder.Append(" [readable]");
            }

            builder.AppendLine();
        }

        return builder.ToString();
    }

    private static bool GetBool(IDictionary<string, object> payload, string key)
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
        if (Boolean.TryParse(value.ToString(), out parsed))
        {
            return parsed;
        }

        return false;
    }

    private static string FormatException(Exception ex)
    {
        AscetReadException ascet = ex as AscetReadException;
        if (ascet != null)
        {
            return ascet.Code + ":" + ascet.Operation + ":" + ascet.Message;
        }

        return ex.GetType().FullName + ":" + ex.Message;
    }
}
'@ | Set-Content -LiteralPath $listDiagramsSource -Encoding ASCII

Invoke-AscetCsc `
    -OutputPath (Join-Path $binDir 'AscetReadOnlyExample.exe') `
    -Sources @($readDomain, (Join-Path $cliDir 'AscetReadOnlyExample.cs')) `
    -References (Get-AscetReferences)

if ($buildLegacyExecutables -or $buildStandaloneProxyExecutables) {
Invoke-AscetCsc `
    -OutputPath (Join-Path $binDir 'AscetReadComponentCode.exe') `
    -Sources @($readDomain, (Join-Path $cliDir 'AscetReadComponentCode.cs')) `
    -References (Get-AscetReferences)

Invoke-AscetCsc `
    -OutputPath (Join-Path $binDir 'AscetReadBlockDiagram.exe') `
    -Sources @($readDomain, (Join-Path $cliDir 'AscetReadBlockDiagram.cs')) `
    -References (Get-AscetReferences -IncludeWebExtensions)

Invoke-AscetCsc `
    -OutputPath (Join-Path $binDir 'AscetReadStateMachine.exe') `
    -Sources @($readDomain, $stateMachineAnalysis, (Join-Path $cliDir 'AscetReadStateMachine.cs')) `
    -References (Get-AscetReferences -IncludeWebExtensions)

Invoke-AscetCsc `
    -OutputPath (Join-Path $binDir 'AscetReadStateMachineFlow.exe') `
    -Sources @($readDomain, $implementationRead, $referenceRead, $stateMachineAnalysis, $advancedDtos, $referenceTrace, $flowAnalysis, $esdlAnalysis, (Join-Path $cliDir 'AscetReadStateMachineFlow.cs')) `
    -References (Get-AscetReferences -IncludeWebExtensions)

Invoke-AscetCsc `
    -OutputPath (Join-Path $binDir 'AscetReadImplementation.exe') `
    -Sources @($readDomain, $implementationRead, (Join-Path $cliDir 'AscetReadImplementation.cs')) `
    -References (Get-AscetReferences -IncludeWebExtensions)

Invoke-AscetCsc `
    -OutputPath (Join-Path $binDir 'AscetReadReferences.exe') `
    -Sources @($readDomain, $referenceRead, (Join-Path $cliDir 'AscetReadReferences.cs')) `
    -References (Get-AscetReferences -IncludeWebExtensions)

Invoke-AscetCsc `
    -OutputPath (Join-Path $binDir 'AscetReadModuleSummary.exe') `
    -MainType 'AscetReadModuleSummary' `
    -Sources @($readDomain, $advancedDtos, $implementationRead, $referenceRead, $esdlAnalysis, $stateMachineAnalysis, $moduleDomain, (Join-Path $cliDir 'AscetReadModuleSummary.cs')) `
    -References (Get-AscetReferences -IncludeWebExtensions)

Invoke-AscetCsc `
    -OutputPath (Join-Path $binDir 'AscetReadModuleSnapshot.exe') `
    -MainType 'AscetReadModuleSnapshot' `
    -Sources @($readDomain, $advancedDtos, $implementationRead, $referenceRead, $esdlAnalysis, $stateMachineAnalysis, $moduleDomain, (Join-Path $cliDir 'AscetReadModuleSummary.cs'), (Join-Path $cliDir 'AscetReadBlockDiagram.cs'), (Join-Path $cliDir 'AscetReadImplementation.cs'), (Join-Path $cliDir 'AscetReadReferences.cs'), (Join-Path $cliDir 'AscetReadModuleSnapshot.cs')) `
    -References (Get-AscetReferences -IncludeWebExtensions)

Invoke-AscetCsc `
    -OutputPath (Join-Path $binDir 'AscetReadModuleClosure.exe') `
    -MainType 'AscetReadModuleClosure' `
    -Sources @($readDomain, $implementationRead, $referenceRead, $stateMachineAnalysis, $advancedDtos, $referenceTrace, $flowAnalysis, $componentSnapshot, $esdlAnalysis, $moduleDomain, $moduleClosure, (Join-Path $cliDir 'AscetReadModuleSummary.cs'), (Join-Path $cliDir 'AscetReadBlockDiagram.cs'), (Join-Path $cliDir 'AscetReadImplementation.cs'), (Join-Path $cliDir 'AscetReadReferences.cs'), (Join-Path $cliDir 'AscetReadModuleClosure.cs')) `
    -References (Get-AscetReferences -IncludeWebExtensions)
Invoke-AscetCsc `
    -OutputPath (Join-Path $binDir 'AscetReadClassSummary.exe') `
    -MainType 'AscetReadClassSummary' `
    -Sources @($readDomain, $advancedDtos, $implementationRead, $referenceRead, $esdlAnalysis, $stateMachineAnalysis, $classDomain, (Join-Path $cliDir 'AscetReadClassSummary.cs')) `
    -References (Get-AscetReferences -IncludeWebExtensions)

Invoke-AscetCsc `
    -OutputPath (Join-Path $binDir 'AscetReadClassSnapshot.exe') `
    -MainType 'AscetReadClassSnapshot' `
    -Sources @($readDomain, $advancedDtos, $implementationRead, $referenceRead, $esdlAnalysis, $stateMachineAnalysis, $classDomain, (Join-Path $cliDir 'AscetReadClassSummary.cs'), (Join-Path $cliDir 'AscetReadBlockDiagram.cs'), (Join-Path $cliDir 'AscetReadImplementation.cs'), (Join-Path $cliDir 'AscetReadReferences.cs'), (Join-Path $cliDir 'AscetReadClassSnapshot.cs')) `
    -References (Get-AscetReferences -IncludeWebExtensions)

Invoke-AscetCsc `
    -OutputPath (Join-Path $binDir 'AscetReadComponentSnapshot.exe') `
    -MainType 'AscetReadComponentSnapshot' `
    -Sources @($readDomain, $implementationRead, $referenceRead, $stateMachineAnalysis, $advancedDtos, $referenceTrace, $flowAnalysis, $componentSnapshot, $esdlAnalysis, (Join-Path $cliDir 'AscetReadImplementation.cs'), (Join-Path $cliDir 'AscetReadReferences.cs'), (Join-Path $cliDir 'AscetReadStateMachine.cs'), (Join-Path $cliDir 'AscetReadStateMachineFlow.cs'), (Join-Path $cliDir 'AscetReadComponentSnapshot.cs')) `
    -References (Get-AscetReferences -IncludeWebExtensions)

Invoke-AscetCsc `
    -OutputPath (Join-Path $binDir 'AscetListFolders.exe') `
    -MainType 'AscetListFolders' `
    -Sources @($readDomain, $dbExplorerCommon, $folderReadService, $componentReadService, (Join-Path $cliDir 'AscetListFolders.cs')) `
    -References (Get-AscetReferences)

Invoke-AscetCsc `
    -OutputPath (Join-Path $binDir 'AscetListDiagrams.exe') `
    -MainType 'AscetListDiagrams' `
    -Sources @($readDomain, $dbExplorerCommon, $listDiagramsSource) `
    -References (Get-AscetReferences -IncludeWebExtensions)

  Invoke-AscetCsc `
    -OutputPath (Join-Path $binDir 'AscetCreateFolder.exe') `
    -MainType 'AscetCreateFolder' `
    -Sources @($readDomain, (Join-Path $cliDir 'AscetCreateFolder.cs')) `
    -References (Get-AscetReferences)

Invoke-AscetCsc `
    -OutputPath (Join-Path $binDir 'AscetDeleteFolder.exe') `
    -MainType 'AscetDeleteFolder' `
    -Sources @($readDomain, $folderDeleteDomain, (Join-Path $cliDir 'AscetDeleteFolder.cs')) `
    -References (Get-AscetReferences)

if ($buildLegacyExecutables) {
Invoke-AscetCsc `
    -OutputPath (Join-Path $binDir 'AscetBatchDeleteFolder.exe') `
    -MainType 'AscetBatchDeleteFolder' `
    -Sources @($readDomain, $dbExplorerCommon, $folderDeleteDomain, (Join-Path $cliDir 'AscetCreateFolder.cs'), (Join-Path $cliDir 'AscetBatchDeleteFolder.cs')) `
    -References (Get-AscetReferences -IncludeWebExtensions)

Invoke-AscetCsc `
    -OutputPath (Join-Path $binDir 'AscetBatchCreateFolder.exe') `
    -MainType 'AscetBatchCreateFolder' `
    -Sources @($readDomain, (Join-Path $cliDir 'AscetCreateFolder.cs'), (Join-Path $cliDir 'AscetBatchCreateFolder.cs')) `
    -References (Get-AscetReferences -IncludeWebExtensions)
}

Invoke-AscetCsc `
    -OutputPath (Join-Path $binDir 'AscetCreateComponent.exe') `
    -MainType 'AscetCreateComponent' `
    -Sources @($readDomain, $dbExplorerCommon, $componentCreateDomain, $componentDeleteDomain, (Join-Path $cliDir 'AscetCreateComponent.cs'), (Join-Path $cliDir 'AscetDeleteComponent.cs')) `
    -References (Get-AscetReferences)

Invoke-AscetCsc `
    -OutputPath (Join-Path $binDir 'AscetDeleteComponent.exe') `
    -MainType 'AscetDeleteComponent' `
    -Sources @($readDomain, $dbExplorerCommon, $componentCreateDomain, $componentDeleteDomain, (Join-Path $cliDir 'AscetCreateComponent.cs'), (Join-Path $cliDir 'AscetDeleteComponent.cs')) `
    -References (Get-AscetReferences)

Invoke-AscetCsc `
    -OutputPath (Join-Path $binDir 'AscetCreateMethod.exe') `
    -MainType 'AscetCreateMethod' `
    -Sources @($readDomain, $methodReadService, $methodCreateDomain, $methodDeleteDomain, (Join-Path $cliDir 'AscetListMethods.cs'), (Join-Path $cliDir 'AscetReadMethodCode.cs'), (Join-Path $cliDir 'AscetCreateMethod.cs'), (Join-Path $cliDir 'AscetDeleteMethod.cs')) `
    -References (Get-AscetReferences)

Invoke-AscetCsc `
    -OutputPath (Join-Path $binDir 'AscetSetMethodSignature.exe') `
    -MainType 'AscetSetMethodSignature' `
    -Sources @($readDomain, $methodReadService, $methodSignatureDomain, (Join-Path $cliDir 'AscetListMethods.cs'), (Join-Path $cliDir 'AscetReadMethodCode.cs'), (Join-Path $cliDir 'AscetReadMethodSignature.cs'), (Join-Path $cliDir 'AscetSetMethodSignature.cs')) `
    -References (Get-AscetReferences)

Invoke-AscetCsc `
    -OutputPath (Join-Path $binDir 'AscetDeleteMethod.exe') `
    -MainType 'AscetDeleteMethod' `
    -Sources @($readDomain, $methodReadService, $methodDeleteDomain, (Join-Path $cliDir 'AscetListMethods.cs'), (Join-Path $cliDir 'AscetReadMethodCode.cs'), (Join-Path $cliDir 'AscetDeleteMethod.cs')) `
    -References (Get-AscetReferences)

Invoke-AscetCsc `
    -OutputPath (Join-Path $binDir 'AscetListMethods.exe') `
    -MainType 'AscetListMethods' `
    -Sources @($readDomain, $methodReadService, (Join-Path $cliDir 'AscetListMethods.cs')) `
    -References (Get-AscetReferences)

Invoke-AscetCsc `
    -OutputPath (Join-Path $binDir 'AscetReadMethodCode.exe') `
    -MainType 'AscetReadMethodCode' `
    -Sources @($readDomain, $methodReadService, (Join-Path $cliDir 'AscetListMethods.cs'), (Join-Path $cliDir 'AscetReadMethodCode.cs')) `
    -References (Get-AscetReferences)

Invoke-AscetCsc `
    -OutputPath (Join-Path $binDir 'AscetReadMethodSignature.exe') `
    -MainType 'AscetReadMethodSignature' `
    -Sources @($readDomain, $methodReadService, $methodSignatureDomain, (Join-Path $cliDir 'AscetListMethods.cs'), (Join-Path $cliDir 'AscetReadMethodCode.cs'), (Join-Path $cliDir 'AscetReadMethodSignature.cs')) `
    -References (Get-AscetReferences)

Invoke-AscetCsc `
    -OutputPath (Join-Path $binDir 'AscetReadTextCode.exe') `
    -MainType 'AscetReadTextCode' `
    -Sources @($readDomain, $stateMachineAnalysis, (Join-Path $cliDir 'AscetReadComponentCode.cs'), (Join-Path $cliDir 'AscetReadTextCode.cs')) `
    -References (Get-AscetReferences)

Invoke-AscetCsc `
    -OutputPath (Join-Path $binDir 'AscetDiffMethodCode.exe') `
    -MainType 'AscetDiffMethodCode' `
    -Sources @($readDomain, $dbExplorerCommon, $methodReadService, (Join-Path $cliDir 'AscetListMethods.cs'), (Join-Path $cliDir 'AscetReadMethodCode.cs'), (Join-Path $cliDir 'AscetDiffMethodCode.cs')) `
    -References (Get-AscetReferences -IncludeWebExtensions)

Invoke-AscetCsc `
    -OutputPath (Join-Path $binDir 'AscetReadElementRefs.exe') `
    -MainType 'AscetReadElementRefs' `
    -Sources @($readDomain, $implementationRead, $referenceRead, $dbExplorerCommon, (Join-Path $cliDir 'AscetReadImplementation.cs'), (Join-Path $cliDir 'AscetReadReferences.cs'), (Join-Path $cliDir 'AscetReadElementRefs.cs')) `
    -References (Get-AscetReferences -IncludeWebExtensions)

Invoke-AscetCsc `
    -OutputPath (Join-Path $binDir 'AscetReadComponentSummary.exe') `
    -MainType 'AscetReadComponentSummary' `
    -Sources @($readDomain, $dbExplorerCommon, $projectFormulaSync, (Join-Path $cliDir 'AscetReadComponentSummary.cs')) `
    -References (Get-AscetReferences -IncludeWebExtensions)

Invoke-AscetCsc `
    -OutputPath (Join-Path $binDir 'AscetReadComponentChildren.exe') `
    -MainType 'AscetReadComponentChildren' `
    -Sources @($readDomain, $implementationRead, $methodReadService, $dbExplorerCommon, (Join-Path $cliDir 'AscetReadImplementation.cs'), (Join-Path $cliDir 'AscetReadComponentChildren.cs')) `
    -References (Get-AscetReferences -IncludeWebExtensions)

Invoke-AscetCsc `
    -OutputPath (Join-Path $binDir 'AscetReadComponentRefs.exe') `
    -MainType 'AscetReadComponentRefs' `
    -Sources @($readDomain, $implementationRead, $dbExplorerCommon, (Join-Path $cliDir 'AscetReadComponentRefs.cs')) `
    -References (Get-AscetReferences -IncludeWebExtensions)

Invoke-AscetCsc `
    -OutputPath (Join-Path $binDir 'AscetReadComponentUsedBy.exe') `
    -MainType 'AscetReadComponentUsedBy' `
    -Sources @($readDomain, $referenceRead, $reverseReferenceRead, $dbExplorerCommon, (Join-Path $cliDir 'AscetReadComponentUsedBy.cs')) `
    -References (Get-AscetReferences -IncludeWebExtensions)

Invoke-AscetCsc `
    -OutputPath (Join-Path $binDir 'AscetDiffComponentSnapshot.exe') `
    -MainType 'AscetDiffComponentSnapshot' `
    -Sources @($readDomain, $dbExplorerCommon, (Join-Path $coreDir 'AscetImplementationRead.cs'), (Join-Path $coreDir 'Services\Read\MethodReadService.cs'), (Join-Path $cliDir 'AscetReadImplementation.cs'), (Join-Path $cliDir 'AscetReadComponentChildren.cs'), (Join-Path $cliDir 'AscetDiffComponentSnapshot.cs')) `
    -References (Get-AscetReferences -IncludeWebExtensions)

Invoke-AscetCsc `
    -OutputPath (Join-Path $binDir 'AscetDiffModule.exe') `
    -MainType 'AscetDiffModule' `
    -Sources @($readDomain, $advancedDtos, $implementationRead, $referenceRead, $esdlAnalysis, $stateMachineAnalysis, $moduleDomain, (Join-Path $cliDir 'AscetReadModuleSummary.cs'), (Join-Path $cliDir 'AscetDiffModule.cs')) `
    -References (Get-AscetReferences -IncludeWebExtensions)
Invoke-AscetCsc `
    -OutputPath (Join-Path $binDir 'AscetDiffClass.exe') `
    -MainType 'AscetDiffClass' `
    -Sources @($readDomain, $advancedDtos, $implementationRead, $referenceRead, $esdlAnalysis, $stateMachineAnalysis, $classDomain, (Join-Path $cliDir 'AscetReadClassSummary.cs'), (Join-Path $cliDir 'AscetDiffClass.cs')) `
    -References (Get-AscetReferences -IncludeWebExtensions)

Invoke-AscetCsc `
    -OutputPath (Join-Path $binDir 'AscetDiffStateMachine.exe') `
    -Sources @($readDomain, $implementationRead, $referenceRead, $stateMachineAnalysis, $advancedDtos, $stateMachineDiff, $esdlAnalysis, (Join-Path $cliDir 'AscetDiffStateMachine.cs')) `
    -References (Get-AscetReferences -IncludeWebExtensions)

Invoke-AscetCsc `
    -OutputPath (Join-Path $binDir 'AscetSetMethodCode.exe') `
    -Sources @($readDomain, $artifactPathResolver, (Join-Path $cliDir 'AscetSetMethodCode.cs')) `
    -References (Get-AscetReferences)

Invoke-AscetCsc `
    -OutputPath (Join-Path $binDir 'AscetReadDependentChain.exe') `
    -MainType 'AscetReadDependentChain' `
    -Sources @($readDomain, $dbExplorerCommon, $componentReadService, (Join-Path $singleExeReadServiceDir 'AscetDependentChainXml.cs'), (Join-Path $singleExeReadServiceDir 'AscetDependentChainReadService.cs'), (Join-Path $cliDir 'AscetReadDependentChain.cs')) `
    -References (Get-AscetReferences -IncludeWebExtensions)

Invoke-AscetCsc `
    -OutputPath (Join-Path $binDir 'AscetSetElementDependency.exe') `
    -MainType 'AscetSetElementDependency' `
    -Sources @($readDomain, $elementSync, (Join-Path $cliDir 'AscetElementDependencyXml.cs'), (Join-Path $cliDir 'AscetElementDependencyOverlay.cs'), (Join-Path $cliDir 'AscetElementDependencyPlanSupport.cs'), (Join-Path $cliDir 'AscetDependencyCycleDetector.cs'), (Join-Path $cliDir 'AscetDependencySnapshotStore.cs'), (Join-Path $cliDir 'AscetSetElementDependency.cs')) `
    -References (Get-AscetReferences -IncludeWebExtensions)

if ($buildLegacyExecutables) {
Invoke-AscetCsc `
    -OutputPath (Join-Path $binDir 'AscetBatchSetMethodCode.exe') `
    -MainType 'AscetBatchSetMethodCode' `
    -Sources @($readDomain, (Join-Path $cliDir 'AscetBatchSetMethodCode.cs')) `
    -References (Get-AscetReferences -IncludeWebExtensions)

Invoke-AscetCsc `
    -OutputPath (Join-Path $binDir 'AscetBatchApplyElementSpec.exe') `
    -MainType 'AscetBatchApplyElementSpec' `
    -Sources @($readDomain, $elementSync, (Join-Path $cliDir 'AscetElementDependencyXml.cs'), (Join-Path $cliDir 'AscetBatchApplyElementSpec.cs')) `
    -References (Get-AscetReferences -IncludeWebExtensions)

Invoke-AscetCsc `
    -OutputPath (Join-Path $binDir 'AscetBatchCreateComponent.exe') `
    -MainType 'AscetBatchCreateComponent' `
    -Sources @($readDomain, $dbExplorerCommon, $componentCreateDomain, $componentDeleteDomain, (Join-Path $cliDir 'AscetBatchCreateComponent.cs')) `
    -References (Get-AscetReferences -IncludeWebExtensions)

Invoke-AscetCsc `
    -OutputPath (Join-Path $binDir 'AscetBatchCreateMethod.exe') `
    -MainType 'AscetBatchCreateMethod' `
    -Sources @($readDomain, $methodReadService, $methodCreateDomain, $methodDeleteDomain, (Join-Path $cliDir 'AscetListMethods.cs'), (Join-Path $cliDir 'AscetReadMethodCode.cs'), (Join-Path $cliDir 'AscetBatchCreateMethod.cs')) `
    -References (Get-AscetReferences -IncludeWebExtensions)
}

Invoke-AscetCsc `
    -OutputPath (Join-Path $binDir 'AscetSetClassMethodCode.exe') `
    -MainType 'AscetSetClassMethodCode' `
    -Sources @($readDomain, $advancedDtos, $implementationRead, $referenceRead, $esdlAnalysis, $stateMachineAnalysis, $classDomain, $artifactPathResolver, (Join-Path $cliDir 'AscetReadClassSummary.cs'), (Join-Path $cliDir 'AscetSetClassMethodCode.cs')) `
    -References (Get-AscetReferences -IncludeWebExtensions)

Invoke-AscetCsc `
    -OutputPath (Join-Path $binDir 'AscetSetModuleCode.exe') `
    -MainType 'AscetSetModuleCode' `
    -Sources @($readDomain, $advancedDtos, $implementationRead, $referenceRead, $esdlAnalysis, $stateMachineAnalysis, $classDomain, $componentWriteDomain, $artifactPathResolver, (Join-Path $cliDir 'AscetSetModuleCode.cs')) `
    -References (Get-AscetReferences -IncludeWebExtensions)

Invoke-AscetCsc `
    -OutputPath (Join-Path $binDir 'AscetSetStateMachineCode.exe') `
    -MainType 'AscetSetStateMachineCode' `
    -Sources @($readDomain, $advancedDtos, $implementationRead, $referenceRead, $esdlAnalysis, $stateMachineAnalysis, $classDomain, $componentWriteDomain, $artifactPathResolver, (Join-Path $cliDir 'AscetSetStateMachineCode.cs')) `
    -References (Get-AscetReferences -IncludeWebExtensions)

Invoke-AscetCsc `
    -OutputPath (Join-Path $binDir 'AscetApplyElementSpec.exe') `
    -MainType 'AscetApplyElementSpec' `
    -Sources @($readDomain, $elementSync, (Join-Path $cliDir 'AscetElementDependencyXml.cs'), $artifactPathResolver, (Join-Path $cliDir 'AscetApplyElementSpec.cs')) `
    -References (Get-AscetReferences -IncludeWebExtensions)

Invoke-AscetCsc `
    -OutputPath (Join-Path $binDir 'AscetReadElementCatalog.exe') `
    -MainType 'AscetReadElementCatalog' `
    -Sources @($readDomain, $elementSync, (Join-Path $cliDir 'AscetElementDependencyXml.cs'), (Join-Path $cliDir 'AscetReadElementCatalog.cs')) `
    -References (Get-AscetReferences -IncludeWebExtensions)

Invoke-AscetCsc `
    -OutputPath (Join-Path $binDir 'AscetDiffElementSpec.exe') `
    -MainType 'AscetDiffElementSpec' `
    -Sources @($readDomain, $elementSync, (Join-Path $cliDir 'AscetElementDependencyXml.cs'), (Join-Path $cliDir 'AscetDiffElementSpec.cs')) `
    -References (Get-AscetReferences -IncludeWebExtensions)

Invoke-AscetCsc `
    -OutputPath (Join-Path $binDir 'AscetApplyProjectFormula.exe') `
    -MainType 'AscetApplyProjectFormula' `
    -Sources @($readDomain, $projectFormulaSync, $artifactPathResolver, (Join-Path $cliDir 'AscetApplyProjectFormula.cs')) `
    -References (Get-AscetReferences -IncludeWebExtensions)

Invoke-AscetCsc `
    -OutputPath (Join-Path $binDir 'AscetDiffProjectFormulas.exe') `
    -MainType 'AscetDiffProjectFormulas' `
    -Sources @($readDomain, $projectFormulaSync, (Join-Path $cliDir 'AscetDiffProjectFormulas.cs')) `
    -References (Get-AscetReferences -IncludeWebExtensions)

}

Invoke-AscetCsc `
    -OutputPath (Join-Path $binDir 'AscetReadDomainQuickCheck.exe') `
    -Sources @($readDomain, (Join-Path $cliDir 'AscetReadDomainQuickCheck.cs')) `
    -References (Get-AscetReferences)

Invoke-AscetCsc `
    -OutputPath (Join-Path $binDir 'AscetReadDomainDeepCheck.exe') `
    -Sources @($readDomain, (Join-Path $cliDir 'AscetReadDomainDeepCheck.cs')) `
    -References (Get-AscetReferences)

Invoke-AscetCsc `
    -OutputPath (Join-Path $binDir 'AscetReadDomainSmoke.exe') `
    -Sources @($readDomain, (Join-Path $cliDir 'AscetReadDomainSmoke.cs')) `
    -References (Get-AscetReferences)

Invoke-AscetCsc `
    -OutputPath (Join-Path $binDir 'AscetReadHost.exe') `
    -MainType 'AscetReadHost' `
    -Sources @(
        $readDomain,
        $dbExplorerCommon,
        $implementationRead,
        $projectFormulaSync,
        $folderReadService,
        $componentReadService,
        $methodReadService,
        $methodSignatureDomain,
        $summaryReadService,
        $getReadService,
        $readHostCapabilityService,
        $readHostDispatcher,
        (Join-Path $singleExeRoutingDir 'ExecutionLane.cs'),
        (Join-Path $singleExeRoutingDir 'OperationDescriptor.cs'),
        (Join-Path $singleExeRoutingDir 'OperationRegistry.cs'),
        (Join-Path $cliDir 'AscetReadMethodCode.cs'),
        (Join-Path $cliDir 'AscetReadMethodSignature.cs'),
        (Join-Path $cliDir 'AscetReadImplementation.cs'),
        (Join-Path $cliDir 'AscetReadBlockDiagram.cs'),
        (Join-Path $cliDir 'AscetReadHost.cs')
    ) `
    -References (Get-AscetReferences)

Invoke-AscetCsc `
    -OutputPath (Join-Path $binDir 'AscetCli.exe') `
    -MainType 'AscetCli' `
    -Sources @(
        $readDomain,
        $dbExplorerCommon,
        $implementationRead,
        $referenceRead,
        $stateMachineAnalysis,
        $advancedDtos,
        $referenceTrace,
        $flowAnalysis,
        $componentSnapshot,
        $esdlAnalysis,
        $componentCreateDomain,
        $componentDeleteDomain,
        $elementSync,
        $projectFormulaSync,
        $methodCreateDomain,
        $methodSignatureDomain,
        $methodDeleteDomain,
        $folderDeleteDomain,
        $folderReadService,
        $componentReadService,
        $methodReadService,
        $summaryReadService,
        $getReadService,
        (Join-Path $singleExeReadServiceDir 'AscetDependentChainXml.cs'),
        (Join-Path $singleExeReadServiceDir 'AscetDependentChainReadService.cs'),
        $batchReadExecutor,
        $batchWriteExecutor,
        $writeExecutor,
        $writeVerificationService,
        $componentWriteService,
        $methodExecWriteService,
        $elementSpecWriteService,
        $batchDtos,
        $execDtos,
        $hostDtos,
        $capabilityDtos,
        $jsonProtocol,
        $errorMapper,
        $liveContext,
        $liveContextFactory,
        $sessionRefreshPolicy,
        $writeHostContext,
        $readHostCapabilityService,
        $writeHost,
        $writeHostServer,
        $writeHostDispatcher,
        $writeHostCapabilityService,
        (Join-Path $singleExeRoutingDir 'ExecutionLane.cs'),
        (Join-Path $singleExeRoutingDir 'OperationDescriptor.cs'),
        (Join-Path $singleExeRoutingDir 'OperationRegistry.cs'),
        (Join-Path $singleExeRoutingDir 'OperationParser.cs'),
        (Join-Path $cliDir 'AscetCreateComponent.cs'),
        (Join-Path $cliDir 'AscetCreateFolder.cs'),
        (Join-Path $cliDir 'AscetReadImplementation.cs'),
        (Join-Path $cliDir 'AscetReadReferences.cs'),
        (Join-Path $cliDir 'AscetReadStateMachine.cs'),
        (Join-Path $cliDir 'AscetReadStateMachineFlow.cs'),
        (Join-Path $cliDir 'AscetReadComponentSnapshot.cs'),
        (Join-Path $cliDir 'AscetReadComponentChildren.cs'),
        (Join-Path $cliDir 'AscetReadDependentChain.cs'),
        (Join-Path $cliDir 'AscetElementDependencyXml.cs'),
        (Join-Path $cliDir 'AscetElementDependencyOverlay.cs'),
        (Join-Path $cliDir 'AscetElementDependencyPlanSupport.cs'),
        (Join-Path $cliDir 'AscetReadElementDependency.cs'),
        (Join-Path $cliDir 'AscetDependencyCycleDetector.cs'), (Join-Path $cliDir 'AscetDependencySnapshotStore.cs'), (Join-Path $cliDir 'AscetSetElementDependency.cs'),
        (Join-Path $cliDir 'AscetReadBlockDiagram.cs'),
        (Join-Path $cliDir 'AscetReadMethodCode.cs'),
        (Join-Path $cliDir 'AscetReadMethodSignature.cs'),
        (Join-Path $cliDir 'AscetSetMethodCode.cs'),
        (Join-Path $cliDir 'AscetSetMethodSignature.cs'),
        (Join-Path $cliDir 'AscetApplyElementSpec.cs'),
        $artifactPathResolver,
        (Join-Path $cliDir 'AscetCli.cs'),
        (Join-Path $singleExeCliDir 'ExecCommand.cs'),
        (Join-Path $singleExeCliDir 'BatchCommand.cs'),
        (Join-Path $singleExeCliDir 'HostCommand.cs'),
        (Join-Path $singleExeCliDir 'CapabilitiesCommand.cs'),
        (Join-Path $singleExeCliDir 'SelfTestCommand.cs'),
        (Join-Path $singleExeCliDir 'BenchmarkCommand.cs')
    ) `
    -References (Get-AscetReferences)

Invoke-AscetCsc `
    -OutputPath (Join-Path $binDir 'AscetWorker.exe') `
    -Sources @($readDomain, $concurrencyCommon, (Join-Path $cliDir 'AscetWorker.cs')) `
    -References (Get-AscetReferences -IncludeWebExtensions)

Invoke-AscetCsc `
    -OutputPath (Join-Path $binDir 'AscetOrchestrator.exe') `
    -Sources @($readDomain, $concurrencyCommon, (Join-Path $cliDir 'AscetOrchestrator.cs')) `
    -References (Get-AscetReferences -IncludeWebExtensions)

Invoke-AscetCsc `
    -OutputPath (Join-Path $binDir 'AscetBackendPoolDemo.exe') `
    -MainType 'AscetBackendPoolDemo' `
    -Sources @(
        $readDomain,
        $concurrencyCommon,
        (Join-Path $cliDir 'AscetBackendPoolDemo.cs')
    ) `
    -References (Get-AscetReferences)

Invoke-AscetCsc `
    -OutputPath (Join-Path $binDir 'AscetThreadHarness.exe') `
    -Sources @($readDomain, $concurrencyCommon, (Join-Path $cliDir 'AscetThreadHarness.cs')) `
    -References (Get-AscetReferences -IncludeWebExtensions)

if ($buildLegacyExecutables -or $buildStandaloneProxyExecutables) {
$autotestPrepare = Join-Path $autotestCliDir 'AutotestPrepareEsdlCoverage.cs'
$autotestRun = Join-Path $autotestCliDir 'AutotestRunEsdlCoverageCases.cs'
$autotestReport = Join-Path $autotestCliDir 'AutotestReportEsdlCoverage.cs'
if ((Test-Path $autotestPrepare) -and (Test-Path $autotestRun) -and (Test-Path $autotestReport)) {
    Invoke-AscetCsc `
        -OutputPath (Join-Path $binDir 'AutotestPrepareEsdlCoverage.exe') `
        -MainType 'AutotestPrepareEsdlCoverage' `
        -Sources @($readDomain, (Join-Path $coreDir 'AscetCoverageShadowCopy.cs'), $autotestPrepare) `
        -References (Get-AscetReferences)

    Invoke-AscetCsc `
        -OutputPath (Join-Path $binDir 'AutotestRunEsdlCoverageCases.exe') `
        -MainType 'AutotestRunEsdlCoverageCases' `
        -Sources @($readDomain, $autotestRun) `
        -References (Get-AscetReferences)

    Invoke-AscetCsc `
        -OutputPath (Join-Path $binDir 'AutotestReportEsdlCoverage.exe') `
        -MainType 'AutotestReportEsdlCoverage' `
        -Sources @($readDomain, $autotestReport) `
        -References (Get-AscetReferences)
}
else {
    Write-Host "Skipping AutotestCli builds because one or more source files are missing under $autotestCliDir"
}

Invoke-AscetCsc -OutputPath (Join-Path $binDir 'AscetReadStateMachineSummary.exe') -MainType 'AscetReadStateMachineSummary' -Sources @($readDomain, $implementationRead, $referenceRead, $stateMachineAnalysis, $advancedDtos, $referenceTrace, $flowAnalysis, $stateMachineDiff, $esdlAnalysis, $stateMachineDomain, $classDomain, $componentWriteDomain, (Join-Path $cliDir 'AscetReadStateMachineSummary.cs')) -References (Get-AscetReferences -IncludeWebExtensions)
Invoke-AscetCsc -OutputPath (Join-Path $binDir 'AscetReadStateMachineSnapshot.exe') -MainType 'AscetReadStateMachineSnapshot' -Sources @($readDomain, $implementationRead, $referenceRead, $stateMachineAnalysis, $advancedDtos, $referenceTrace, $flowAnalysis, $stateMachineDiff, $esdlAnalysis, $stateMachineDomain, $classDomain, $componentWriteDomain, (Join-Path $cliDir 'AscetReadStateMachineSummary.cs'), (Join-Path $cliDir 'AscetReadStateMachine.cs'), (Join-Path $cliDir 'AscetReadStateMachineFlow.cs'), (Join-Path $cliDir 'AscetReadImplementation.cs'), (Join-Path $cliDir 'AscetReadReferences.cs'), (Join-Path $cliDir 'AscetReadStateMachineSnapshot.cs')) -References (Get-AscetReferences -IncludeWebExtensions)
Invoke-AscetCsc -OutputPath (Join-Path $binDir 'AscetDiffStateMachineDomain.exe') -MainType 'AscetDiffStateMachineDomain' -Sources @($readDomain, $implementationRead, $referenceRead, $stateMachineAnalysis, $advancedDtos, $referenceTrace, $flowAnalysis, $stateMachineDiff, $esdlAnalysis, $stateMachineDomain, $classDomain, $componentWriteDomain, (Join-Path $cliDir 'AscetReadStateMachineSummary.cs'), (Join-Path $cliDir 'AscetDiffStateMachineDomain.cs')) -References (Get-AscetReferences -IncludeWebExtensions)
}

foreach ($requiredExecutable in $coreExecutableNames) {
    if (-not (Test-Path (Join-Path $binDir $requiredExecutable))) {
        throw "Expected $requiredExecutable to be produced in $binDir."
    }
}

if ($buildLegacyExecutables -and -not (Test-Path (Join-Path $binDir 'AscetListDiagrams.exe'))) {
    throw "Expected AscetListDiagrams.exe to be produced in $binDir when build mode is legacy."
}

& (Join-Path $PSScriptRoot 'build-ascet-compat-shims.ps1')
if ($LASTEXITCODE -ne 0) {
    throw "ASCET compatibility shim build failed."
}

foreach ($requiredShim in $compatShimNames) {
    if (-not (Test-Path (Join-Path $binDir $requiredShim))) {
        throw "Expected compatibility shim $requiredShim to be produced in $binDir."
    }
}

$generateContractsScript = Get-RepoPath '..\scripts\generate-ascet-contracts.ps1'
if (-not (Test-Path -LiteralPath $generateContractsScript)) {
    throw "ASCET contract generation script not found at '$generateContractsScript'."
}

& $generateContractsScript
if ($LASTEXITCODE -ne 0) {
    throw "ASCET contract generation failed."
}

Write-Host "Built ASCET C# executables into $binDir (mode: $resolvedBuildMode)"
