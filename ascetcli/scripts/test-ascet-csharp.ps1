# Non-live only. Do not use this script to parallelize live ASCET ToolAPI verification.
# Use scripts\\verify-ascet-module-live.ps1 for serial live smoke checks.
. "$PSScriptRoot\ascet-csharp-common.ps1"

$testDir = Get-RepoPath 'output\ascet-csharp\tests'
$binDir = Get-RepoPath 'output\ascet-csharp\bin'
$coreDir = Get-RepoPath 'src\AscetCopilot'
$cliDir = Get-RepoPath 'src\AscetCli'
$autotestCliDir = Get-RepoPath 'src\AutotestCli'
$testsDir = Get-RepoPath 'tests'
$singleExeHostDir = Join-Path $cliDir 'Host'
$readDomain = Join-Path $coreDir 'AscetReadDomain.cs'
$elementWriteContract = Join-Path $coreDir 'AscetElementWriteContract.Generated.cs'
$dbExplorerCommon = Join-Path $cliDir 'AscetDatabaseExplorerCommon.cs'
$folderReadService = Join-Path $coreDir 'Services\Read\FolderReadService.cs'
$componentReadService = Join-Path $coreDir 'Services\Read\ComponentReadService.cs'
$methodReadService = Join-Path $coreDir 'Services\Read\MethodReadService.cs'
$dependentChainXmlService = Join-Path $coreDir 'Services\Read\AscetDependentChainXml.cs'
$dependentChainReadService = Join-Path $coreDir 'Services\Read\AscetDependentChainReadService.cs'
$batchReadExecutor = Join-Path $coreDir 'Execution\AscetBatchReadExecutor.cs'
$batchWriteExecutor = Join-Path $coreDir 'Execution\AscetBatchWriteExecutor.cs'
$errorMapper = Join-Path $coreDir 'Core\AscetErrorMapper.cs'
$jsonProtocol = Join-Path $coreDir 'Core\AscetJsonProtocol.cs'
$execDtos = Join-Path $coreDir 'Protocol\AscetExecDtos.cs'
$batchDtos = Join-Path $coreDir 'Protocol\AscetBatchDtos.cs'
$capabilityDtos = Join-Path $coreDir 'Protocol\AscetCapabilityDtos.cs'
$hostDtos = Join-Path $coreDir 'Protocol\AscetHostDtos.cs'
$liveContext = Join-Path $coreDir 'Core\AscetLiveContext.cs'
$liveContextFactory = Join-Path $coreDir 'Core\AscetLiveContextFactory.cs'
$sessionRefreshPolicy = Join-Path $coreDir 'Core\AscetSessionRefreshPolicy.cs'
$writeHostContext = Join-Path $coreDir 'Core\AscetWriteHostContext.cs'
$writeExecutor = Join-Path $coreDir 'Execution\AscetWriteExecutor.cs'
$writeVerificationService = Join-Path $coreDir 'Services\Write\WriteVerificationService.cs'
$componentWriteService = Join-Path $coreDir 'Services\Write\ComponentWriteService.cs'
$methodExecWriteService = Join-Path $coreDir 'Services\Write\MethodWriteService.cs'
$elementSpecWriteService = Join-Path $coreDir 'Services\Write\ElementSpecWriteService.cs'
$methodCreateDomain = Join-Path $coreDir 'AscetMethodCreate.cs'
$methodSignatureDomain = Join-Path $coreDir 'AscetMethodSignature.cs'
$methodDeleteDomain = Join-Path $coreDir 'AscetMethodDelete.cs'
$folderDeleteDomain = Join-Path $coreDir 'AscetFolderDelete.cs'
$ascetGetService = Join-Path $coreDir 'Services\Get\AscetGetService.cs'
$projectFormulaSync = Join-Path $coreDir 'AscetProjectFormulaSync.cs'
$classDomain = Join-Path $coreDir 'AscetClassDomain.cs'
$artifactPathResolver = Join-Path $cliDir 'AscetArtifactPathResolver.cs'
$singleExeCommandSupportSources = @(
    $errorMapper,
    $jsonProtocol,
    $execDtos,
    $batchDtos,
    $capabilityDtos,
    $hostDtos,
    $liveContext,
    $liveContextFactory,
    $sessionRefreshPolicy,
    $writeHostContext,
    $readDomain,
    $dbExplorerCommon,
    (Join-Path $coreDir 'AscetImplementationRead.cs'),
    (Join-Path $coreDir 'AscetReferenceRead.cs'),
    (Join-Path $coreDir 'AscetStateMachineAnalysis.cs'),
    (Join-Path $coreDir 'AscetAdvancedDtos.cs'),
    (Join-Path $coreDir 'AscetReferenceTrace.cs'),
    (Join-Path $coreDir 'AscetStateMachineFlowAnalysis.cs'),
    (Join-Path $coreDir 'AscetComponentSnapshot.cs'),
    (Join-Path $coreDir 'AscetEsdlAnalysis.cs'),
    (Join-Path $coreDir 'AscetComponentCreate.cs'),
    (Join-Path $coreDir 'AscetComponentDelete.cs'),
    $classDomain,
    (Join-Path $coreDir 'AscetComponentWriteDomain.cs'),
    $elementWriteContract,
    (Join-Path $coreDir 'AscetElementSync.cs'),
    $projectFormulaSync,
    $methodCreateDomain,
    $methodSignatureDomain,
    $methodDeleteDomain,
    $folderDeleteDomain,
    $writeExecutor,
    $batchReadExecutor,
    $batchWriteExecutor,
    $writeVerificationService,
    $componentWriteService,
    $methodExecWriteService,
    $elementSpecWriteService,
    (Join-Path $singleExeHostDir 'AscetWriteHost.cs'),
    (Join-Path $singleExeHostDir 'AscetWriteHostServer.cs'),
    (Join-Path $singleExeHostDir 'AscetWriteHostDispatcher.cs'),
    (Join-Path $singleExeHostDir 'AscetWriteHostCapabilityService.cs'),
    (Join-Path $coreDir 'Services\Read\FolderReadService.cs'),
    (Join-Path $coreDir 'Services\Read\ComponentReadService.cs'),
    (Join-Path $coreDir 'Services\Read\MethodReadService.cs'),
    (Join-Path $coreDir 'Services\Read\SummaryReadService.cs'),
    $ascetGetService,
    $dependentChainXmlService,
    $dependentChainReadService,
    (Join-Path $cliDir 'AscetCreateComponent.cs'),
    (Join-Path $cliDir 'AscetCreateFolder.cs'),
    (Join-Path $cliDir 'AscetReadImplementation.cs'),
    (Join-Path $cliDir 'AscetReadReferences.cs'),
    (Join-Path $cliDir 'AscetReadStateMachine.cs'),
    (Join-Path $cliDir 'AscetReadStateMachineFlow.cs'),
    (Join-Path $cliDir 'AscetReadComponentSnapshot.cs'),
    (Join-Path $cliDir 'AscetReadComponentChildren.cs'),
    (Join-Path $cliDir 'AscetReadDependentChain.cs'),
    (Join-Path $cliDir 'AscetReadElementDependency.cs'),
    (Join-Path $cliDir 'AscetElementDependencyXml.cs'),
    (Join-Path $cliDir 'AscetElementDependencyOverlay.cs'),
    (Join-Path $cliDir 'AscetElementDependencyPlanSupport.cs'),
    (Join-Path $cliDir 'AscetDependencyCycleDetector.cs'), (Join-Path $cliDir 'AscetDependencySnapshotStore.cs'), (Join-Path $cliDir 'AscetSetElementDependency.cs'),
    (Join-Path $cliDir 'AscetReadBlockDiagram.cs'),
    (Join-Path $cliDir 'AscetReadMethodCode.cs'),
    (Join-Path $cliDir 'AscetReadMethodSignature.cs'),
    (Join-Path $cliDir 'AscetReadClassSummary.cs'),
    (Join-Path $cliDir 'AscetSetMethodCode.cs'),
    (Join-Path $cliDir 'AscetSetClassMethodCode.cs'),
    (Join-Path $cliDir 'AscetSetMethodSignature.cs'),
    (Join-Path $cliDir 'AscetSetModuleCode.cs'),
    (Join-Path $cliDir 'AscetSetStateMachineCode.cs'),
    (Join-Path $cliDir 'AscetApplyElementSpec.cs'),
    (Join-Path $cliDir 'AscetDiffElementSpec.cs'),
    (Join-Path $cliDir 'AscetApplyProjectFormula.cs'),
    $artifactPathResolver,
    (Join-Path $cliDir 'AscetCli.cs'),
    (Join-Path $cliDir 'Routing\ExecutionLane.cs'),
    (Join-Path $cliDir 'Routing\OperationDescriptor.cs'),
    (Join-Path $cliDir 'Routing\OperationRegistry.cs'),
    (Join-Path $cliDir 'Routing\OperationParser.cs'),
    (Join-Path $cliDir 'Host\AscetReadHostCapabilityService.cs'),
    (Join-Path $cliDir 'Commands\ExecCommand.cs'),
    (Join-Path $cliDir 'Commands\BatchCommand.cs'),
    (Join-Path $cliDir 'Commands\HostCommand.cs'),
    (Join-Path $cliDir 'Commands\CapabilitiesCommand.cs'),
    (Join-Path $cliDir 'Commands\SelfTestCommand.cs'),
    (Join-Path $cliDir 'Commands\BenchmarkCommand.cs')
)

Ensure-Directory $testDir
Publish-AscetRuntimeSupport $testDir

$requiredBinExe = Join-Path $binDir 'AscetCli.exe'
if (-not (Test-Path $requiredBinExe)) {
    throw "Missing required ASCET CLI executable '$requiredBinExe'. Run scripts\\build-ascet-csharp.ps1 first."
}

& (Join-Path $PSScriptRoot 'build-ascet-compat-shims.ps1')
if ($LASTEXITCODE -ne 0) {
    throw "Legacy shim build failed."
}

$focusedJsonTest = Join-Path $testsDir 'AscetCliJsonOutputTest.cs'
$fullSuiteAnchor = Join-Path $testsDir 'ProgramOutputTest.cs'
if ((Test-Path $focusedJsonTest) -and -not (Test-Path $fullSuiteAnchor)) {
            Invoke-AscetCsc `
        -OutputPath (Join-Path $testDir 'AscetDependentChainXmlOutputTest.exe') `
        -MainType 'AscetDependentChainXmlOutputTest' `
        -Sources @($readDomain, $dependentChainXmlService, (Join-Path $testsDir 'AscetDependentChainXmlOutputTest.cs')) `
        -References (Get-AscetReferences -IncludeWebExtensions)

    Invoke-AscetCsc `
        -OutputPath (Join-Path $testDir 'AscetReadDependentChainOutputTest.exe') `
        -MainType 'AscetReadDependentChainOutputTest' `
        -Sources @($readDomain, $dbExplorerCommon, $componentReadService, $dependentChainXmlService, $dependentChainReadService, (Join-Path $cliDir 'AscetReadDependentChain.cs'), (Join-Path $testsDir 'AscetReadDependentChainOutputTest.cs')) `
        -References (Get-AscetReferences -IncludeWebExtensions)

    Invoke-AscetCsc `
        -OutputPath (Join-Path $testDir 'AscetElementDependencyPlanOutputTest.exe') `
        -MainType 'AscetElementDependencyPlanOutputTest' `
        -Sources @($readDomain, (Join-Path $cliDir 'AscetElementDependencyXml.cs'), (Join-Path $testsDir 'AscetElementDependencyPlanOutputTest.cs')) `
        -References (Get-AscetReferences -IncludeWebExtensions)

    Invoke-AscetCsc `
        -OutputPath (Join-Path $testDir 'AscetElementDependencyOverlayOutputTest.exe') `
        -MainType 'AscetElementDependencyOverlayOutputTest' `
        -Sources @($readDomain, $elementWriteContract, (Join-Path $coreDir 'AscetElementSync.cs'), (Join-Path $cliDir 'AscetElementDependencyXml.cs'), (Join-Path $cliDir 'AscetElementDependencyOverlay.cs'), (Join-Path $testsDir 'AscetElementDependencyOverlayOutputTest.cs')) `
        -References (Get-AscetReferences -IncludeWebExtensions)

    Invoke-AscetCsc `
        -OutputPath (Join-Path $testDir 'AscetSetElementDependencyOutputTest.exe') `
        -MainType 'AscetSetElementDependencyOutputTest' `
        -Sources @($readDomain, $elementWriteContract, (Join-Path $coreDir 'AscetElementSync.cs'), (Join-Path $cliDir 'AscetElementDependencyXml.cs'), (Join-Path $cliDir 'AscetElementDependencyOverlay.cs'), (Join-Path $cliDir 'AscetElementDependencyPlanSupport.cs'), (Join-Path $cliDir 'AscetDependencyCycleDetector.cs'), (Join-Path $cliDir 'AscetDependencySnapshotStore.cs'), (Join-Path $cliDir 'AscetSetElementDependency.cs'), (Join-Path $testsDir 'AscetSetElementDependencyOutputTest.cs')) `
        -References (Get-AscetReferences -IncludeWebExtensions)

            Invoke-AscetCsc `
        -OutputPath (Join-Path $testDir 'AscetSetMethodSignatureOutputTest.exe') `
        -MainType 'AscetSetMethodSignatureOutputTest' `
        -Sources @($readDomain, $methodReadService, $methodSignatureDomain, (Join-Path $cliDir 'AscetListMethods.cs'), (Join-Path $cliDir 'AscetReadMethodCode.cs'), (Join-Path $cliDir 'AscetReadMethodSignature.cs'), (Join-Path $cliDir 'AscetSetMethodSignature.cs'), (Join-Path $testsDir 'AscetSetMethodSignatureOutputTest.cs')) `
        -References (Get-AscetReferences)

    Invoke-AscetCsc `
        -OutputPath (Join-Path $testDir 'AscetReadMethodSignatureOutputTest.exe') `
        -MainType 'AscetReadMethodSignatureOutputTest' `
        -Sources @($readDomain, $methodReadService, $methodSignatureDomain, (Join-Path $cliDir 'AscetListMethods.cs'), (Join-Path $cliDir 'AscetReadMethodCode.cs'), (Join-Path $cliDir 'AscetReadMethodSignature.cs'), (Join-Path $testsDir 'AscetReadMethodSignatureOutputTest.cs')) `
        -References (Get-AscetReferences)

        Invoke-AscetCsc `
        -OutputPath (Join-Path $testDir 'AscetWriteHostSmoke.exe') `
        -MainType 'AscetWriteHostSmoke' `
        -Sources @((Join-Path $testsDir 'AscetWriteHostSmoke.cs')) `
        -References (Get-AscetReferences)

    Invoke-CompiledExecutable -Path (Join-Path $testDir 'AscetWriteHostSmoke.exe')

    Invoke-AscetCsc `
        -OutputPath (Join-Path $testDir 'AscetWriteExecutorSmoke.exe') `
        -MainType 'AscetWriteExecutorSmoke' `
        -Sources @(
            $writeExecutor,
            $writeVerificationService,
            (Join-Path $testsDir 'AscetWriteExecutorSmoke.cs')
        ) `
        -References (Get-AscetReferences)

    Invoke-AscetCsc `
        -OutputPath (Join-Path $testDir 'AscetCliExecWriteSmoke.exe') `
        -MainType 'AscetCliExecWriteSmoke' `
        -Sources ($singleExeCommandSupportSources + @((Join-Path $testsDir 'AscetCliExecWriteSmoke.cs'))) `
        -References (Get-AscetReferences -IncludeWebExtensions)

    Invoke-AscetCsc `
        -OutputPath (Join-Path $testDir 'AscetBatchReadSmoke.exe') `
        -MainType 'AscetBatchReadSmoke' `
        -Sources ($singleExeCommandSupportSources + @((Join-Path $testsDir 'AscetBatchReadSmoke.cs'))) `
        -References (Get-AscetReferences -IncludeWebExtensions)

    Invoke-AscetCsc `
        -OutputPath (Join-Path $testDir 'AscetBatchWriteSmoke.exe') `
        -MainType 'AscetBatchWriteSmoke' `
        -Sources ($singleExeCommandSupportSources + @((Join-Path $testsDir 'AscetBatchWriteSmoke.cs'))) `
        -References (Get-AscetReferences -IncludeWebExtensions)

    Invoke-AscetCsc `
        -OutputPath (Join-Path $testDir 'AscetLegacyShimSmoke.exe') `
        -MainType 'AscetLegacyShimSmoke' `
        -Sources @((Join-Path $testsDir 'AscetLegacyShimSmoke.cs')) `
        -References (Get-AscetReferences)

    Invoke-AscetCsc `
        -OutputPath (Join-Path $testDir 'AscetCliBenchmarkSmoke.exe') `
        -MainType 'AscetCliBenchmarkSmoke' `
        -Sources @((Join-Path $testsDir 'AscetCliBenchmarkSmoke.cs')) `
        -References (Get-AscetReferences)

    Invoke-CompiledExecutable -Path (Join-Path $testDir 'AscetDependentChainXmlOutputTest.exe')
    Invoke-CompiledExecutable -Path (Join-Path $testDir 'AscetReadDependentChainOutputTest.exe')
    Invoke-CompiledExecutable -Path (Join-Path $testDir 'AscetElementDependencyPlanOutputTest.exe')
    Invoke-CompiledExecutable -Path (Join-Path $testDir 'AscetElementDependencyOverlayOutputTest.exe')
    Invoke-CompiledExecutable -Path (Join-Path $testDir 'AscetSetElementDependencyOutputTest.exe')
    Invoke-CompiledExecutable -Path (Join-Path $testDir 'AscetSetMethodSignatureOutputTest.exe')
    Invoke-CompiledExecutable -Path (Join-Path $testDir 'AscetReadMethodSignatureOutputTest.exe')
    Invoke-CompiledExecutable -Path (Join-Path $testDir 'AscetWriteExecutorSmoke.exe')
    Invoke-CompiledExecutable -Path (Join-Path $testDir 'AscetCliExecWriteSmoke.exe')
    Invoke-CompiledExecutable -Path (Join-Path $testDir 'AscetBatchReadSmoke.exe')
    Invoke-CompiledExecutable -Path (Join-Path $testDir 'AscetBatchWriteSmoke.exe')
    Invoke-CompiledExecutable -Path (Join-Path $testDir 'AscetLegacyShimSmoke.exe')
    Invoke-CompiledExecutable -Path (Join-Path $testDir 'AscetCliBenchmarkSmoke.exe')
    if (-not (Test-Path $requiredBinExe)) {
        throw "Focused ASCET C# verification expected '$requiredBinExe' to exist."
    }
    Write-Host "ASCET C# focused JSON output test passed from $testDir"
    return
}

$implementationRead = Join-Path $coreDir 'AscetImplementationRead.cs'
$referenceRead = Join-Path $coreDir 'AscetReferenceRead.cs'
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
$elementSync = @($elementWriteContract, (Join-Path $coreDir 'AscetElementSync.cs'))
$projectFormulaSync = Join-Path $coreDir 'AscetProjectFormulaSync.cs'

Invoke-AscetCsc `
    -OutputPath (Join-Path $testDir 'ProgramOutputTest.exe') `
    -MainType 'ProgramOutputTest' `
    -Sources @($readDomain, (Join-Path $cliDir 'AscetReadOnlyExample.cs'), (Join-Path $testsDir 'ProgramOutputTest.cs')) `
    -References (Get-AscetReferences)

Invoke-AscetCsc `
    -OutputPath (Join-Path $testDir 'AscetReadDomainOutputTest.exe') `
    -Sources @($readDomain, (Join-Path $testsDir 'AscetReadDomainOutputTest.cs')) `
    -References (Get-AscetReferences)

Invoke-AscetCsc `
    -OutputPath (Join-Path $testDir 'AscetToolApiPathOutputTest.exe') `
    -MainType 'AscetToolApiPathOutputTest' `
    -Sources @($readDomain, (Join-Path $testsDir 'AscetToolApiPathOutputTest.cs')) `
    -References (Get-AscetReferences)

Invoke-AscetCsc `
    -OutputPath (Join-Path $testDir 'AscetWriteHostSmoke.exe') `
    -MainType 'AscetWriteHostSmoke' `
    -Sources @((Join-Path $testsDir 'AscetWriteHostSmoke.cs')) `
    -References (Get-AscetReferences)

Invoke-CompiledExecutable -Path (Join-Path $testDir 'AscetWriteHostSmoke.exe')

Invoke-AscetCsc `
    -OutputPath (Join-Path $testDir 'AscetWriteExecutorSmoke.exe') `
    -MainType 'AscetWriteExecutorSmoke' `
    -Sources @(
        $writeExecutor,
        $writeVerificationService,
        (Join-Path $testsDir 'AscetWriteExecutorSmoke.cs')
    ) `
    -References (Get-AscetReferences)

Invoke-AscetCsc `
    -OutputPath (Join-Path $testDir 'AscetCliExecWriteSmoke.exe') `
    -MainType 'AscetCliExecWriteSmoke' `
    -Sources ($singleExeCommandSupportSources + @((Join-Path $testsDir 'AscetCliExecWriteSmoke.cs'))) `
    -References (Get-AscetReferences -IncludeWebExtensions)

Invoke-AscetCsc `
    -OutputPath (Join-Path $testDir 'AscetBatchReadSmoke.exe') `
    -MainType 'AscetBatchReadSmoke' `
    -Sources ($singleExeCommandSupportSources + @((Join-Path $testsDir 'AscetBatchReadSmoke.cs'))) `
    -References (Get-AscetReferences -IncludeWebExtensions)

Invoke-AscetCsc `
    -OutputPath (Join-Path $testDir 'AscetBatchWriteSmoke.exe') `
    -MainType 'AscetBatchWriteSmoke' `
    -Sources ($singleExeCommandSupportSources + @((Join-Path $testsDir 'AscetBatchWriteSmoke.cs'))) `
    -References (Get-AscetReferences -IncludeWebExtensions)

Invoke-AscetCsc `
    -OutputPath (Join-Path $testDir 'AscetLegacyShimSmoke.exe') `
    -MainType 'AscetLegacyShimSmoke' `
    -Sources @((Join-Path $testsDir 'AscetLegacyShimSmoke.cs')) `
    -References (Get-AscetReferences)

Invoke-AscetCsc `
    -OutputPath (Join-Path $testDir 'AscetCliBenchmarkSmoke.exe') `
    -MainType 'AscetCliBenchmarkSmoke' `
    -Sources @((Join-Path $testsDir 'AscetCliBenchmarkSmoke.cs')) `
    -References (Get-AscetReferences)

Invoke-AscetCsc `
    -OutputPath (Join-Path $testDir 'AutotestPrepareEsdlCoverageOutputTest.exe') `
    -MainType 'AutotestPrepareEsdlCoverageOutputTest' `
    -Sources @($readDomain, (Join-Path $coreDir 'AscetCoverageShadowCopy.cs'), (Join-Path $autotestCliDir 'AutotestPrepareEsdlCoverage.cs'), (Join-Path $testsDir 'AutotestPrepareEsdlCoverageOutputTest.cs')) `
    -References (Get-AscetReferences)

Invoke-AscetCsc `
    -OutputPath (Join-Path $testDir 'AutotestRunEsdlCoverageCasesOutputTest.exe') `
    -MainType 'AutotestRunEsdlCoverageCasesOutputTest' `
    -Sources @($readDomain, (Join-Path $autotestCliDir 'AutotestRunEsdlCoverageCases.cs'), (Join-Path $testsDir 'AutotestRunEsdlCoverageCasesOutputTest.cs')) `
    -References (Get-AscetReferences)

Invoke-AscetCsc `
    -OutputPath (Join-Path $testDir 'AutotestReportEsdlCoverageOutputTest.exe') `
    -MainType 'AutotestReportEsdlCoverageOutputTest' `
    -Sources @($readDomain, (Join-Path $autotestCliDir 'AutotestReportEsdlCoverage.cs'), (Join-Path $testsDir 'AutotestReportEsdlCoverageOutputTest.cs')) `
    -References (Get-AscetReferences)

Invoke-AscetCsc `
    -OutputPath (Join-Path $testDir 'AscetReadComponentCodeOutputTest.exe') `
    -MainType 'AscetReadComponentCodeOutputTest' `
    -Sources @($readDomain, (Join-Path $cliDir 'AscetReadComponentCode.cs'), (Join-Path $testsDir 'AscetReadComponentCodeOutputTest.cs')) `
    -References (Get-AscetReferences)

Invoke-AscetCsc `
    -OutputPath (Join-Path $testDir 'AscetReadBlockDiagramOutputTest.exe') `
    -MainType 'AscetReadBlockDiagramOutputTest' `
    -Sources @($readDomain, (Join-Path $cliDir 'AscetReadBlockDiagram.cs'), (Join-Path $testsDir 'AscetReadBlockDiagramOutputTest.cs')) `
    -References (Get-AscetReferences -IncludeWebExtensions)

Invoke-AscetCsc `
    -OutputPath (Join-Path $testDir 'AscetReadImplementationOutputTest.exe') `
    -MainType 'AscetReadImplementationOutputTest' `
    -Sources @($readDomain, $implementationRead, (Join-Path $cliDir 'AscetReadImplementation.cs'), (Join-Path $testsDir 'AscetReadImplementationOutputTest.cs')) `
    -References (Get-AscetReferences -IncludeWebExtensions)

Invoke-AscetCsc `
    -OutputPath (Join-Path $testDir 'AscetReadReferencesOutputTest.exe') `
    -MainType 'AscetReadReferencesOutputTest' `
    -Sources @($readDomain, $referenceRead, (Join-Path $cliDir 'AscetReadReferences.cs'), (Join-Path $testsDir 'AscetReadReferencesOutputTest.cs')) `
    -References (Get-AscetReferences -IncludeWebExtensions)

Invoke-AscetCsc `
    -OutputPath (Join-Path $testDir 'AscetReadStateMachineOutputTest.exe') `
    -MainType 'AscetReadStateMachineOutputTest' `
    -Sources @($readDomain, $stateMachineAnalysis, (Join-Path $cliDir 'AscetReadStateMachine.cs'), (Join-Path $testsDir 'AscetReadStateMachineOutputTest.cs')) `
    -References (Get-AscetReferences -IncludeWebExtensions)

Invoke-AscetCsc `
    -OutputPath (Join-Path $testDir 'AscetReadStateMachineFlowOutputTest.exe') `
    -MainType 'AscetReadStateMachineFlowOutputTest' `
    -Sources @($readDomain, $implementationRead, $referenceRead, $stateMachineAnalysis, $advancedDtos, $referenceTrace, $flowAnalysis, $esdlAnalysis, (Join-Path $cliDir 'AscetReadStateMachineFlow.cs'), (Join-Path $testsDir 'AscetReadStateMachineFlowOutputTest.cs')) `
    -References (Get-AscetReferences -IncludeWebExtensions)

Invoke-AscetCsc `
    -OutputPath (Join-Path $testDir 'AscetEsdlAnalysisOutputTest.exe') `
    -MainType 'AscetEsdlAnalysisOutputTest' `
    -Sources @($esdlAnalysis, (Join-Path $testsDir 'AscetEsdlAnalysisOutputTest.cs')) `
    -References (Get-AscetReferences)

Invoke-AscetCsc `
    -OutputPath (Join-Path $testDir 'AscetEsdlCoverageModelOutputTest.exe') `
    -MainType 'AscetEsdlCoverageModelOutputTest' `
    -Sources @($readDomain, $esdlAnalysis, (Join-Path $coreDir 'AscetEsdlCoverageModel.cs'), (Join-Path $testsDir 'AscetEsdlCoverageModelOutputTest.cs')) `
    -References (Get-AscetReferences)

Invoke-AscetCsc `
    -OutputPath (Join-Path $testDir 'AscetEsdlCoverageInstrumentationOutputTest.exe') `
    -MainType 'AscetEsdlCoverageInstrumentationOutputTest' `
    -Sources @($readDomain, $esdlAnalysis, (Join-Path $coreDir 'AscetEsdlCoverageModel.cs'), (Join-Path $coreDir 'AscetEsdlCoverageInstrumentation.cs'), (Join-Path $testsDir 'AscetEsdlCoverageInstrumentationOutputTest.cs')) `
    -References (Get-AscetReferences)

Invoke-AscetCsc `
    -OutputPath (Join-Path $testDir 'AscetReadModuleSummaryOutputTest.exe') `
    -MainType 'AscetReadModuleSummaryOutputTest' `
    -Sources @($readDomain, $advancedDtos, $implementationRead, $referenceRead, $esdlAnalysis, $stateMachineAnalysis, $moduleDomain, (Join-Path $cliDir 'AscetReadModuleSummary.cs'), (Join-Path $testsDir 'AscetReadModuleSummaryOutputTest.cs')) `
    -References (Get-AscetReferences -IncludeWebExtensions)

Invoke-AscetCsc `
    -OutputPath (Join-Path $testDir 'AscetReadModuleSnapshotOutputTest.exe') `
    -MainType 'AscetReadModuleSnapshotOutputTest' `
    -Sources @($readDomain, $advancedDtos, $implementationRead, $referenceRead, $esdlAnalysis, $stateMachineAnalysis, $moduleDomain, (Join-Path $cliDir 'AscetReadModuleSummary.cs'), (Join-Path $cliDir 'AscetReadBlockDiagram.cs'), (Join-Path $cliDir 'AscetReadImplementation.cs'), (Join-Path $cliDir 'AscetReadReferences.cs'), (Join-Path $cliDir 'AscetReadModuleSnapshot.cs'), (Join-Path $testsDir 'AscetReadModuleSnapshotOutputTest.cs')) `
    -References (Get-AscetReferences -IncludeWebExtensions)

Invoke-AscetCsc `
    -OutputPath (Join-Path $testDir 'AscetReadModuleClosureOutputTest.exe') `
    -MainType 'AscetReadModuleClosureOutputTest' `
    -Sources @($readDomain, $implementationRead, $referenceRead, $stateMachineAnalysis, $advancedDtos, $referenceTrace, $flowAnalysis, $componentSnapshot, $esdlAnalysis, $moduleDomain, $moduleClosure, (Join-Path $cliDir 'AscetReadModuleSummary.cs'), (Join-Path $cliDir 'AscetReadBlockDiagram.cs'), (Join-Path $cliDir 'AscetReadImplementation.cs'), (Join-Path $cliDir 'AscetReadReferences.cs'), (Join-Path $cliDir 'AscetReadModuleClosure.cs'), (Join-Path $testsDir 'AscetReadModuleClosureOutputTest.cs')) `
    -References (Get-AscetReferences -IncludeWebExtensions)
Invoke-AscetCsc `
    -OutputPath (Join-Path $testDir 'AscetReadClassSummaryOutputTest.exe') `
    -MainType 'AscetReadClassSummaryOutputTest' `
    -Sources @($readDomain, $advancedDtos, $implementationRead, $referenceRead, $esdlAnalysis, $stateMachineAnalysis, $classDomain, (Join-Path $cliDir 'AscetReadClassSummary.cs'), (Join-Path $testsDir 'AscetReadClassSummaryOutputTest.cs')) `
    -References (Get-AscetReferences -IncludeWebExtensions)

Invoke-AscetCsc `
    -OutputPath (Join-Path $testDir 'AscetReadClassSnapshotOutputTest.exe') `
    -MainType 'AscetReadClassSnapshotOutputTest' `
    -Sources @($readDomain, $advancedDtos, $implementationRead, $referenceRead, $esdlAnalysis, $stateMachineAnalysis, $classDomain, (Join-Path $cliDir 'AscetReadClassSummary.cs'), (Join-Path $cliDir 'AscetReadBlockDiagram.cs'), (Join-Path $cliDir 'AscetReadImplementation.cs'), (Join-Path $cliDir 'AscetReadReferences.cs'), (Join-Path $cliDir 'AscetReadClassSnapshot.cs'), (Join-Path $testsDir 'AscetReadClassSnapshotOutputTest.cs')) `
    -References (Get-AscetReferences -IncludeWebExtensions)

Invoke-AscetCsc `
    -OutputPath (Join-Path $testDir 'AscetReadComponentSnapshotOutputTest.exe') `
    -MainType 'AscetReadComponentSnapshotOutputTest' `
    -Sources @($readDomain, $implementationRead, $referenceRead, $stateMachineAnalysis, $advancedDtos, $referenceTrace, $flowAnalysis, $componentSnapshot, $esdlAnalysis, (Join-Path $cliDir 'AscetReadImplementation.cs'), (Join-Path $cliDir 'AscetReadReferences.cs'), (Join-Path $cliDir 'AscetReadStateMachine.cs'), (Join-Path $cliDir 'AscetReadStateMachineFlow.cs'), (Join-Path $cliDir 'AscetReadComponentSnapshot.cs'), (Join-Path $testsDir 'AscetReadComponentSnapshotOutputTest.cs')) `
    -References (Get-AscetReferences -IncludeWebExtensions)

Invoke-AscetCsc `
    -OutputPath (Join-Path $testDir 'AscetDiffModuleOutputTest.exe') `
    -MainType 'AscetDiffModuleOutputTest' `
    -Sources @($readDomain, $advancedDtos, $implementationRead, $referenceRead, $esdlAnalysis, $stateMachineAnalysis, $moduleDomain, (Join-Path $cliDir 'AscetReadModuleSummary.cs'), (Join-Path $cliDir 'AscetDiffModule.cs'), (Join-Path $testsDir 'AscetDiffModuleOutputTest.cs')) `
    -References (Get-AscetReferences -IncludeWebExtensions)
Invoke-AscetCsc `
    -OutputPath (Join-Path $testDir 'AscetDiffClassOutputTest.exe') `
    -MainType 'AscetDiffClassOutputTest' `
    -Sources @($readDomain, $advancedDtos, $implementationRead, $referenceRead, $esdlAnalysis, $stateMachineAnalysis, $classDomain, (Join-Path $cliDir 'AscetReadClassSummary.cs'), (Join-Path $cliDir 'AscetDiffClass.cs'), (Join-Path $testsDir 'AscetDiffClassOutputTest.cs')) `
    -References (Get-AscetReferences -IncludeWebExtensions)

Invoke-AscetCsc `
    -OutputPath (Join-Path $testDir 'AscetDiffStateMachineOutputTest.exe') `
    -MainType 'AscetDiffStateMachineOutputTest' `
    -Sources @($readDomain, $implementationRead, $referenceRead, $stateMachineAnalysis, $advancedDtos, $stateMachineDiff, $esdlAnalysis, (Join-Path $cliDir 'AscetDiffStateMachine.cs'), (Join-Path $testsDir 'AscetDiffStateMachineOutputTest.cs')) `
    -References (Get-AscetReferences -IncludeWebExtensions)

Invoke-AscetCsc `
    -OutputPath (Join-Path $testDir 'AscetSetMethodCodeOutputTest.exe') `
    -MainType 'AscetSetMethodCodeOutputTest' `
    -Sources @($readDomain, (Join-Path $cliDir 'AscetSetMethodCode.cs'), (Join-Path $testsDir 'AscetSetMethodCodeOutputTest.cs')) `
    -References (Get-AscetReferences)

Invoke-AscetCsc `
    -OutputPath (Join-Path $testDir 'AscetSetClassMethodCodeOutputTest.exe') `
    -MainType 'AscetSetClassMethodCodeOutputTest' `
    -Sources @($readDomain, $advancedDtos, $implementationRead, $referenceRead, $esdlAnalysis, $stateMachineAnalysis, $classDomain, (Join-Path $cliDir 'AscetReadClassSummary.cs'), (Join-Path $cliDir 'AscetSetClassMethodCode.cs'), (Join-Path $testsDir 'AscetSetClassMethodCodeOutputTest.cs')) `
    -References (Get-AscetReferences -IncludeWebExtensions)

    Invoke-AscetCsc `
        -OutputPath (Join-Path $testDir 'AscetSetMethodSignatureOutputTest.exe') `
        -MainType 'AscetSetMethodSignatureOutputTest' `
        -Sources @($readDomain, $methodReadService, $methodSignatureDomain, (Join-Path $cliDir 'AscetListMethods.cs'), (Join-Path $cliDir 'AscetReadMethodCode.cs'), (Join-Path $cliDir 'AscetReadMethodSignature.cs'), (Join-Path $cliDir 'AscetSetMethodSignature.cs'), (Join-Path $testsDir 'AscetSetMethodSignatureOutputTest.cs')) `
        -References (Get-AscetReferences)

Invoke-AscetCsc `
    -OutputPath (Join-Path $testDir 'AscetReadMethodSignatureOutputTest.exe') `
    -MainType 'AscetReadMethodSignatureOutputTest' `
    -Sources @($readDomain, $methodReadService, $methodSignatureDomain, (Join-Path $cliDir 'AscetListMethods.cs'), (Join-Path $cliDir 'AscetReadMethodCode.cs'), (Join-Path $cliDir 'AscetReadMethodSignature.cs'), (Join-Path $testsDir 'AscetReadMethodSignatureOutputTest.cs')) `
        -References (Get-AscetReferences)

Invoke-AscetCsc `
    -OutputPath (Join-Path $testDir 'ClassRouterOutputTest.exe') `
    -Sources @($readDomain, $advancedDtos, $implementationRead, $referenceRead, $esdlAnalysis, $stateMachineAnalysis, $classDomain, (Join-Path $testsDir 'ClassRouterOutputTest.cs')) `
    -References (Get-AscetReferences)

Invoke-AscetCsc `
    -OutputPath (Join-Path $testDir 'ComponentWriteRouterOutputTest.exe') `
    -Sources @($readDomain, $advancedDtos, $implementationRead, $referenceRead, $esdlAnalysis, $stateMachineAnalysis, $classDomain, $componentWriteDomain, (Join-Path $testsDir 'ComponentWriteRouterOutputTest.cs')) `
    -References (Get-AscetReferences)

Invoke-AscetCsc `
    -OutputPath (Join-Path $testDir 'AscetSetModuleCodeOutputTest.exe') `
    -MainType 'AscetSetModuleCodeOutputTest' `
    -Sources @($readDomain, $advancedDtos, $implementationRead, $referenceRead, $esdlAnalysis, $stateMachineAnalysis, $classDomain, $componentWriteDomain, (Join-Path $cliDir 'AscetSetModuleCode.cs'), (Join-Path $testsDir 'AscetSetModuleCodeOutputTest.cs')) `
    -References (Get-AscetReferences -IncludeWebExtensions)

Invoke-AscetCsc `
    -OutputPath (Join-Path $testDir 'AscetSetStateMachineCodeOutputTest.exe') `
    -MainType 'AscetSetStateMachineCodeOutputTest' `
    -Sources @($readDomain, $advancedDtos, $implementationRead, $referenceRead, $esdlAnalysis, $stateMachineAnalysis, $classDomain, $componentWriteDomain, (Join-Path $cliDir 'AscetSetStateMachineCode.cs'), (Join-Path $testsDir 'AscetSetStateMachineCodeOutputTest.cs')) `
    -References (Get-AscetReferences -IncludeWebExtensions)

Invoke-AscetCsc `
    -OutputPath (Join-Path $testDir 'AscetApplyElementSpecOutputTest.exe') `
    -MainType 'AscetApplyElementSpecOutputTest' `
    -Sources @($readDomain, $elementSync, (Join-Path $cliDir 'AscetElementDependencyXml.cs'), (Join-Path $cliDir 'AscetApplyElementSpec.cs'), (Join-Path $testsDir 'AscetApplyElementSpecOutputTest.cs')) `
    -References (Get-AscetReferences -IncludeWebExtensions)

Invoke-AscetCsc `
    -OutputPath (Join-Path $testDir 'AscetReadElementCatalogOutputTest.exe') `
    -MainType 'AscetReadElementCatalogOutputTest' `
    -Sources @($readDomain, $elementSync, (Join-Path $cliDir 'AscetElementDependencyXml.cs'), (Join-Path $cliDir 'AscetReadElementCatalog.cs'), (Join-Path $testsDir 'AscetReadElementCatalogOutputTest.cs')) `
    -References (Get-AscetReferences -IncludeWebExtensions)

Invoke-AscetCsc `
    -OutputPath (Join-Path $testDir 'AscetDiffElementSpecOutputTest.exe') `
    -MainType 'AscetDiffElementSpecOutputTest' `
    -Sources @($readDomain, $elementSync, (Join-Path $cliDir 'AscetElementDependencyXml.cs'), (Join-Path $cliDir 'AscetDiffElementSpec.cs'), (Join-Path $testsDir 'AscetDiffElementSpecOutputTest.cs')) `
    -References (Get-AscetReferences -IncludeWebExtensions)

Invoke-AscetCsc `
    -OutputPath (Join-Path $testDir 'ComponentElementSyncPlannerOutputTest.exe') `
    -MainType 'ComponentElementSyncPlannerOutputTest' `
    -Sources @($readDomain, $elementSync, (Join-Path $cliDir 'AscetElementDependencyXml.cs'), (Join-Path $testsDir 'ComponentElementSyncPlannerOutputTest.cs')) `
    -References (Get-AscetReferences -IncludeWebExtensions)

Invoke-AscetCsc `
    -OutputPath (Join-Path $testDir 'AscetElementProvenanceOutputTest.exe') `
    -MainType 'AscetElementProvenanceOutputTest' `
    -Sources @($readDomain, $elementSync, (Join-Path $cliDir 'AscetElementDependencyXml.cs'), (Join-Path $cliDir 'AscetReadElementCatalog.cs'), (Join-Path $testsDir 'AscetElementProvenanceOutputTest.cs')) `
    -References (Get-AscetReferences -IncludeWebExtensions)

Invoke-AscetCsc `
    -OutputPath (Join-Path $testDir 'AscetDependentDataValuePolicyOutputTest.exe') `
    -MainType 'AscetDependentDataValuePolicyOutputTest' `
    -Sources @($readDomain, $elementSync, (Join-Path $cliDir 'AscetElementDependencyXml.cs'), (Join-Path $testsDir 'AscetDependentDataValuePolicyOutputTest.cs')) `
    -References (Get-AscetReferences -IncludeWebExtensions)

Invoke-AscetCsc `
    -OutputPath (Join-Path $testDir 'AscetDependencySnapshotStoreOutputTest.exe') `
    -MainType 'AscetDependencySnapshotStoreOutputTest' `
    -Sources @($readDomain, (Join-Path $cliDir 'AscetElementDependencyXml.cs'), (Join-Path $cliDir 'AscetDependencyCycleDetector.cs'), (Join-Path $cliDir 'AscetDependencySnapshotStore.cs'), (Join-Path $testsDir 'AscetDependencySnapshotStoreOutputTest.cs')) `
    -References (Get-AscetReferences -IncludeWebExtensions)

Invoke-AscetCsc `
    -OutputPath (Join-Path $testDir 'AscetElementDependencyPrimitiveOutputTest.exe') `
    -MainType 'AscetElementDependencyPrimitiveOutputTest' `
    -Sources @($readDomain, (Join-Path $cliDir 'AscetElementDependencyXml.cs'), (Join-Path $testsDir 'AscetElementDependencyPrimitiveOutputTest.cs')) `
    -References (Get-AscetReferences -IncludeWebExtensions)

Invoke-AscetCsc `
    -OutputPath (Join-Path $testDir 'AscetDependencyCycleDetectorOutputTest.exe') `
    -MainType 'AscetDependencyCycleDetectorOutputTest' `
    -Sources @((Join-Path $cliDir 'AscetDependencyCycleDetector.cs'), (Join-Path $testsDir 'AscetDependencyCycleDetectorOutputTest.cs')) `
    -References (Get-AscetReferences)

Invoke-AscetCsc `
    -OutputPath (Join-Path $testDir 'AscetElementWriteOptimizationOutputTest.exe') `
    -MainType 'AscetElementWriteOptimizationOutputTest' `
    -Sources @($readDomain, $elementSync, (Join-Path $cliDir 'AscetElementDependencyXml.cs'), (Join-Path $testsDir 'AscetElementWriteOptimizationOutputTest.cs')) `
    -References (Get-AscetReferences -IncludeWebExtensions)

Invoke-AscetCsc `
    -OutputPath (Join-Path $testDir 'AscetElementFormulaValidationOutputTest.exe') `
    -MainType 'AscetElementFormulaValidationOutputTest' `
    -Sources @($readDomain, $elementSync, (Join-Path $cliDir 'AscetElementDependencyXml.cs'), (Join-Path $testsDir 'AscetElementFormulaValidationOutputTest.cs')) `
    -References (Get-AscetReferences -IncludeWebExtensions)

Invoke-AscetCsc `
    -OutputPath (Join-Path $testDir 'AscetElementSpecValidationOutputTest.exe') `
    -MainType 'AscetElementSpecValidationOutputTest' `
    -Sources @($readDomain, $elementSync, (Join-Path $cliDir 'AscetElementDependencyXml.cs'), (Join-Path $testsDir 'AscetElementSpecValidationOutputTest.cs')) `
    -References (Get-AscetReferences -IncludeWebExtensions)

Invoke-AscetCsc `
    -OutputPath (Join-Path $testDir 'AscetElementEnumSpecValidationOutputTest.exe') `
    -MainType 'AscetElementEnumSpecValidationOutputTest' `
    -Sources @($readDomain, $elementSync, (Join-Path $cliDir 'AscetElementDependencyXml.cs'), (Join-Path $testsDir 'AscetElementEnumSpecValidationOutputTest.cs')) `
    -References (Get-AscetReferences -IncludeWebExtensions)

Invoke-AscetCsc `
    -OutputPath (Join-Path $testDir 'AscetElementTable1DSpecValidationOutputTest.exe') `
    -MainType 'AscetElementTable1DSpecValidationOutputTest' `
    -Sources @($readDomain, $elementSync, (Join-Path $cliDir 'AscetElementDependencyXml.cs'), (Join-Path $testsDir 'AscetElementTable1DSpecValidationOutputTest.cs')) `
    -References (Get-AscetReferences -IncludeWebExtensions)

Invoke-AscetCsc `
    -OutputPath (Join-Path $testDir 'AscetElementTable2DSpecValidationOutputTest.exe') `
    -MainType 'AscetElementTable2DSpecValidationOutputTest' `
    -Sources @($readDomain, $elementSync, (Join-Path $cliDir 'AscetElementDependencyXml.cs'), (Join-Path $testsDir 'AscetElementTable2DSpecValidationOutputTest.cs')) `
    -References (Get-AscetReferences -IncludeWebExtensions)

Invoke-AscetCsc `
    -OutputPath (Join-Path $testDir 'AscetDiffElementEnumTableOutputTest.exe') `
    -MainType 'AscetDiffElementEnumTableOutputTest' `
    -Sources @($readDomain, $elementSync, (Join-Path $cliDir 'AscetElementDependencyXml.cs'), (Join-Path $testsDir 'AscetDiffElementEnumTableOutputTest.cs')) `
    -References (Get-AscetReferences -IncludeWebExtensions)

Invoke-AscetCsc `
    -OutputPath (Join-Path $testDir 'AscetElementArrayImplementationOutputTest.exe') `
    -MainType 'AscetElementArrayImplementationOutputTest' `
    -Sources @((Join-Path $testsDir 'AscetElementArrayImplementationOutputTest.cs')) `
    -References (Get-AscetReferences -IncludeWebExtensions)

Invoke-AscetCsc `
    -OutputPath (Join-Path $testDir 'AscetElementReadbackNormalizationOutputTest.exe') `
    -MainType 'AscetElementReadbackNormalizationOutputTest' `
    -Sources @($readDomain, $elementSync, (Join-Path $cliDir 'AscetElementDependencyXml.cs'), (Join-Path $testsDir 'AscetElementReadbackNormalizationOutputTest.cs')) `
    -References (Get-AscetReferences -IncludeWebExtensions)

Invoke-AscetCsc `
    -OutputPath (Join-Path $testDir 'AscetElementEnumReadbackOutputTest.exe') `
    -MainType 'AscetElementEnumReadbackOutputTest' `
    -Sources @($readDomain, $elementSync, (Join-Path $cliDir 'AscetElementDependencyXml.cs'), (Join-Path $testsDir 'AscetElementEnumReadbackOutputTest.cs')) `
    -References (Get-AscetReferences -IncludeWebExtensions)

Invoke-AscetCsc `
    -OutputPath (Join-Path $testDir 'AscetElementTable1DReadbackOutputTest.exe') `
    -MainType 'AscetElementTable1DReadbackOutputTest' `
    -Sources @($readDomain, $elementSync, (Join-Path $cliDir 'AscetElementDependencyXml.cs'), (Join-Path $testsDir 'AscetElementTable1DReadbackOutputTest.cs')) `
    -References (Get-AscetReferences -IncludeWebExtensions)

Invoke-AscetCsc `
    -OutputPath (Join-Path $testDir 'AscetElementTable1DLiveWriteRulesOutputTest.exe') `
    -MainType 'AscetElementTable1DLiveWriteRulesOutputTest' `
    -Sources @($readDomain, $elementSync, (Join-Path $cliDir 'AscetElementDependencyXml.cs'), (Join-Path $testsDir 'AscetElementTable1DLiveWriteRulesOutputTest.cs')) `
    -References (Get-AscetReferences -IncludeWebExtensions)

Invoke-AscetCsc `
    -OutputPath (Join-Path $testDir 'AscetElementTable1DWritePathOutputTest.exe') `
    -MainType 'AscetElementTable1DWritePathOutputTest' `
    -Sources @((Join-Path $testsDir 'AscetElementTable1DWritePathOutputTest.cs')) `
    -References (Get-AscetReferences -IncludeWebExtensions)

Invoke-AscetCsc `
    -OutputPath (Join-Path $testDir 'AscetElementTable2DReadbackOutputTest.exe') `
    -MainType 'AscetElementTable2DReadbackOutputTest' `
    -Sources @($readDomain, $elementSync, (Join-Path $cliDir 'AscetElementDependencyXml.cs'), (Join-Path $testsDir 'AscetElementTable2DReadbackOutputTest.cs')) `
    -References (Get-AscetReferences -IncludeWebExtensions)

Invoke-AscetCsc `
    -OutputPath (Join-Path $testDir 'AscetElementTable2DWritePathOutputTest.exe') `
    -MainType 'AscetElementTable2DWritePathOutputTest' `
    -Sources @((Join-Path $testsDir 'AscetElementTable2DWritePathOutputTest.cs')) `
    -References (Get-AscetReferences -IncludeWebExtensions)

Invoke-AscetCsc `
    -OutputPath (Join-Path $testDir 'AscetElementTable2DLiveWriteRulesOutputTest.exe') `
    -MainType 'AscetElementTable2DLiveWriteRulesOutputTest' `
    -Sources @($readDomain, $elementSync, (Join-Path $cliDir 'AscetElementDependencyXml.cs'), (Join-Path $testsDir 'AscetElementTable2DLiveWriteRulesOutputTest.cs')) `
    -References (Get-AscetReferences -IncludeWebExtensions)

Invoke-AscetCsc `
    -OutputPath (Join-Path $testDir 'AscetTableDurableWriteArtifactsOutputTest.exe') `
    -MainType 'AscetTableDurableWriteArtifactsOutputTest' `
    -Sources @($readDomain, $elementSync, (Join-Path $cliDir 'AscetElementDependencyXml.cs'), (Join-Path $testsDir 'AscetTableDurableWriteArtifactsOutputTest.cs')) `
    -References (Get-AscetReferences -IncludeWebExtensions)

Invoke-AscetCsc `
    -OutputPath (Join-Path $testDir 'AscetTableCommitModeOutputTest.exe') `
    -MainType 'AscetTableCommitModeOutputTest' `
    -Sources @((Join-Path $testsDir 'AscetTableCommitModeOutputTest.cs')) `
    -References (Get-AscetReferences -IncludeWebExtensions)

Invoke-AscetCsc `
    -OutputPath (Join-Path $testDir 'AscetApplyElementEnumTableOutputTest.exe') `
    -MainType 'AscetApplyElementEnumTableOutputTest' `
    -Sources @((Join-Path $testsDir 'AscetApplyElementEnumTableOutputTest.cs')) `
    -References (Get-AscetReferences -IncludeWebExtensions)

Invoke-AscetCsc `
    -OutputPath (Join-Path $testDir 'AscetElementRestoreOutputTest.exe') `
    -MainType 'AscetElementRestoreOutputTest' `
    -Sources @($readDomain, $elementSync, (Join-Path $cliDir 'AscetElementDependencyXml.cs'), (Join-Path $cliDir 'AscetApplyElementSpec.cs'), (Join-Path $testsDir 'AscetElementRestoreOutputTest.cs')) `
    -References (Get-AscetReferences -IncludeWebExtensions)

Invoke-AscetCsc `
    -OutputPath (Join-Path $testDir 'AscetApplyProjectFormulaOutputTest.exe') `
    -MainType 'AscetApplyProjectFormulaOutputTest' `
    -Sources @($readDomain, $projectFormulaSync, (Join-Path $cliDir 'AscetApplyProjectFormula.cs'), (Join-Path $testsDir 'AscetApplyProjectFormulaOutputTest.cs')) `
    -References (Get-AscetReferences -IncludeWebExtensions)

Invoke-AscetCsc `
    -OutputPath (Join-Path $testDir 'AscetConcurrencyOutputTest.exe') `
    -MainType 'AscetConcurrencyOutputTest' `
    -Sources @($readDomain, $concurrencyCommon, (Join-Path $testsDir 'AscetConcurrencyOutputTest.cs')) `
    -References (Get-AscetReferences -IncludeWebExtensions)

Invoke-AscetCsc -OutputPath (Join-Path $testDir 'AscetReadStateMachineSummaryOutputTest.exe') -MainType 'AscetReadStateMachineSummaryOutputTest' -Sources @($readDomain, $implementationRead, $referenceRead, $stateMachineAnalysis, $advancedDtos, $referenceTrace, $flowAnalysis, $stateMachineDiff, $esdlAnalysis, $stateMachineDomain, $classDomain, $componentWriteDomain, (Join-Path $cliDir 'AscetReadStateMachineSummary.cs'), (Join-Path $testsDir 'AscetReadStateMachineSummaryOutputTest.cs')) -References (Get-AscetReferences -IncludeWebExtensions)
Invoke-AscetCsc -OutputPath (Join-Path $testDir 'AscetReadStateMachineSnapshotOutputTest.exe') -MainType 'AscetReadStateMachineSnapshotOutputTest' -Sources @($readDomain, $implementationRead, $referenceRead, $stateMachineAnalysis, $advancedDtos, $referenceTrace, $flowAnalysis, $stateMachineDiff, $esdlAnalysis, $stateMachineDomain, $classDomain, $componentWriteDomain, (Join-Path $cliDir 'AscetReadStateMachineSummary.cs'), (Join-Path $cliDir 'AscetReadStateMachine.cs'), (Join-Path $cliDir 'AscetReadStateMachineFlow.cs'), (Join-Path $cliDir 'AscetReadImplementation.cs'), (Join-Path $cliDir 'AscetReadReferences.cs'), (Join-Path $cliDir 'AscetReadStateMachineSnapshot.cs'), (Join-Path $testsDir 'AscetReadStateMachineSnapshotOutputTest.cs')) -References (Get-AscetReferences -IncludeWebExtensions)
Invoke-AscetCsc -OutputPath (Join-Path $testDir 'AscetDiffStateMachineDomainOutputTest.exe') -MainType 'AscetDiffStateMachineDomainOutputTest' -Sources @($readDomain, $implementationRead, $referenceRead, $stateMachineAnalysis, $advancedDtos, $referenceTrace, $flowAnalysis, $stateMachineDiff, $esdlAnalysis, $stateMachineDomain, $classDomain, $componentWriteDomain, (Join-Path $cliDir 'AscetReadStateMachineSummary.cs'), (Join-Path $cliDir 'AscetDiffStateMachineDomain.cs'), (Join-Path $testsDir 'AscetDiffStateMachineDomainOutputTest.cs')) -References (Get-AscetReferences -IncludeWebExtensions)

Invoke-CompiledExecutable -Path (Join-Path $testDir 'ProgramOutputTest.exe')
Invoke-CompiledExecutable -Path (Join-Path $testDir 'AscetReadDomainOutputTest.exe')
Invoke-CompiledExecutable -Path (Join-Path $testDir 'AscetToolApiPathOutputTest.exe')
Invoke-CompiledExecutable -Path (Join-Path $testDir 'AscetCliJsonOutputTest.exe')
Invoke-CompiledExecutable -Path (Join-Path $testDir 'AscetCliExecSmoke.exe')
Invoke-CompiledExecutable -Path (Join-Path $testDir 'AscetOperationRegistrySmoke.exe')
Invoke-CompiledExecutable -Path (Join-Path $testDir 'AscetReadHostSmoke.exe')
Invoke-CompiledExecutable -Path (Join-Path $testDir 'AscetWriteExecutorSmoke.exe')
Invoke-CompiledExecutable -Path (Join-Path $testDir 'AscetCliExecWriteSmoke.exe')
Invoke-CompiledExecutable -Path (Join-Path $testDir 'AscetBatchReadSmoke.exe')
Invoke-CompiledExecutable -Path (Join-Path $testDir 'AscetBatchWriteSmoke.exe')
Invoke-CompiledExecutable -Path (Join-Path $testDir 'AscetLegacyShimSmoke.exe')
Invoke-CompiledExecutable -Path (Join-Path $testDir 'AscetCliBenchmarkSmoke.exe')
Invoke-CompiledExecutable -Path (Join-Path $testDir 'AutotestPrepareEsdlCoverageOutputTest.exe')
Invoke-CompiledExecutable -Path (Join-Path $testDir 'AutotestRunEsdlCoverageCasesOutputTest.exe')
Invoke-CompiledExecutable -Path (Join-Path $testDir 'AutotestReportEsdlCoverageOutputTest.exe')
Invoke-CompiledExecutable -Path (Join-Path $testDir 'AscetReadComponentCodeOutputTest.exe')
Invoke-CompiledExecutable -Path (Join-Path $testDir 'AscetReadBlockDiagramOutputTest.exe')
Invoke-CompiledExecutable -Path (Join-Path $testDir 'AscetReadImplementationOutputTest.exe')
Invoke-CompiledExecutable -Path (Join-Path $testDir 'AscetReadReferencesOutputTest.exe')
Invoke-CompiledExecutable -Path (Join-Path $testDir 'AscetReadStateMachineOutputTest.exe')
Invoke-CompiledExecutable -Path (Join-Path $testDir 'AscetReadStateMachineFlowOutputTest.exe')
Invoke-CompiledExecutable -Path (Join-Path $testDir 'AscetEsdlAnalysisOutputTest.exe')
Invoke-CompiledExecutable -Path (Join-Path $testDir 'AscetEsdlCoverageModelOutputTest.exe')
Invoke-CompiledExecutable -Path (Join-Path $testDir 'AscetEsdlCoverageInstrumentationOutputTest.exe')
Invoke-CompiledExecutable -Path (Join-Path $testDir 'AscetReadModuleSummaryOutputTest.exe')
Invoke-CompiledExecutable -Path (Join-Path $testDir 'AscetReadModuleSnapshotOutputTest.exe')
Invoke-CompiledExecutable -Path (Join-Path $testDir 'AscetReadModuleClosureOutputTest.exe')
Invoke-CompiledExecutable -Path (Join-Path $testDir 'AscetReadClassSummaryOutputTest.exe')
Invoke-CompiledExecutable -Path (Join-Path $testDir 'AscetReadClassSnapshotOutputTest.exe')
Invoke-CompiledExecutable -Path (Join-Path $testDir 'AscetReadComponentSnapshotOutputTest.exe')
Invoke-CompiledExecutable -Path (Join-Path $testDir 'AscetDiffClassOutputTest.exe')
Invoke-CompiledExecutable -Path (Join-Path $testDir 'AscetDiffStateMachineOutputTest.exe')
Invoke-CompiledExecutable -Path (Join-Path $testDir 'AscetSetMethodCodeOutputTest.exe')
Invoke-CompiledExecutable -Path (Join-Path $testDir 'AscetSetClassMethodCodeOutputTest.exe')
Invoke-CompiledExecutable -Path (Join-Path $testDir 'AscetSetMethodSignatureOutputTest.exe')
Invoke-CompiledExecutable -Path (Join-Path $testDir 'AscetReadMethodSignatureOutputTest.exe')
Invoke-CompiledExecutable -Path (Join-Path $testDir 'ClassRouterOutputTest.exe')
Invoke-CompiledExecutable -Path (Join-Path $testDir 'AscetApplyElementSpecOutputTest.exe')
Invoke-CompiledExecutable -Path (Join-Path $testDir 'AscetReadElementCatalogOutputTest.exe')
Invoke-CompiledExecutable -Path (Join-Path $testDir 'AscetDiffElementSpecOutputTest.exe')
Invoke-CompiledExecutable -Path (Join-Path $testDir 'ComponentElementSyncPlannerOutputTest.exe')
Invoke-CompiledExecutable -Path (Join-Path $testDir 'AscetElementProvenanceOutputTest.exe')
Invoke-CompiledExecutable -Path (Join-Path $testDir 'AscetDependentDataValuePolicyOutputTest.exe')
Invoke-CompiledExecutable -Path (Join-Path $testDir 'AscetDependencySnapshotStoreOutputTest.exe')
Invoke-CompiledExecutable -Path (Join-Path $testDir 'AscetElementDependencyPrimitiveOutputTest.exe')
Invoke-CompiledExecutable -Path (Join-Path $testDir 'AscetDependencyCycleDetectorOutputTest.exe')
Invoke-CompiledExecutable -Path (Join-Path $testDir 'AscetElementWriteOptimizationOutputTest.exe')
Invoke-CompiledExecutable -Path (Join-Path $testDir 'AscetElementFormulaValidationOutputTest.exe')
Invoke-CompiledExecutable -Path (Join-Path $testDir 'AscetElementSpecValidationOutputTest.exe')
Invoke-CompiledExecutable -Path (Join-Path $testDir 'AscetElementEnumSpecValidationOutputTest.exe')
Invoke-CompiledExecutable -Path (Join-Path $testDir 'AscetElementTable1DSpecValidationOutputTest.exe')
Invoke-CompiledExecutable -Path (Join-Path $testDir 'AscetElementTable2DSpecValidationOutputTest.exe')
Invoke-CompiledExecutable -Path (Join-Path $testDir 'AscetDiffElementEnumTableOutputTest.exe')
Invoke-CompiledExecutable -Path (Join-Path $testDir 'AscetElementArrayImplementationOutputTest.exe')
Invoke-CompiledExecutable -Path (Join-Path $testDir 'AscetElementReadbackNormalizationOutputTest.exe')
Invoke-CompiledExecutable -Path (Join-Path $testDir 'AscetElementEnumReadbackOutputTest.exe')
Invoke-CompiledExecutable -Path (Join-Path $testDir 'AscetElementTable1DReadbackOutputTest.exe')
Invoke-CompiledExecutable -Path (Join-Path $testDir 'AscetElementTable1DLiveWriteRulesOutputTest.exe')
Invoke-CompiledExecutable -Path (Join-Path $testDir 'AscetElementTable1DWritePathOutputTest.exe')
Invoke-CompiledExecutable -Path (Join-Path $testDir 'AscetElementTable2DReadbackOutputTest.exe')
Invoke-CompiledExecutable -Path (Join-Path $testDir 'AscetElementTable2DWritePathOutputTest.exe')
Invoke-CompiledExecutable -Path (Join-Path $testDir 'AscetElementTable2DLiveWriteRulesOutputTest.exe')
Invoke-CompiledExecutable -Path (Join-Path $testDir 'AscetTableDurableWriteArtifactsOutputTest.exe')
Invoke-CompiledExecutable -Path (Join-Path $testDir 'AscetTableCommitModeOutputTest.exe')
Invoke-CompiledExecutable -Path (Join-Path $testDir 'AscetApplyElementEnumTableOutputTest.exe')
Invoke-CompiledExecutable -Path (Join-Path $testDir 'AscetElementRestoreOutputTest.exe')
Invoke-CompiledExecutable -Path (Join-Path $testDir 'AscetApplyProjectFormulaOutputTest.exe')
Invoke-CompiledExecutable -Path (Join-Path $testDir 'AscetConcurrencyOutputTest.exe')
Invoke-CompiledExecutable -Path (Join-Path $testDir 'ComponentWriteRouterOutputTest.exe')
Invoke-CompiledExecutable -Path (Join-Path $testDir 'AscetSetModuleCodeOutputTest.exe')
Invoke-CompiledExecutable -Path (Join-Path $testDir 'AscetSetStateMachineCodeOutputTest.exe')

Invoke-CompiledExecutable -Path (Join-Path $testDir 'AscetReadStateMachineSummaryOutputTest.exe')
Invoke-CompiledExecutable -Path (Join-Path $testDir 'AscetReadStateMachineSnapshotOutputTest.exe')
Invoke-CompiledExecutable -Path (Join-Path $testDir 'AscetDiffStateMachineDomainOutputTest.exe')
Invoke-CompiledExecutable -Path (Join-Path $testDir 'AscetDiffModuleOutputTest.exe')

Write-Host "ASCET C# non-live tests passed from $testDir"
