# Non-live Milestone A Bridge verification. Does not connect to ASCET ToolAPI.
$ErrorActionPreference = 'Stop'

. "$PSScriptRoot\ascet-csharp-common.ps1"

function Get-BridgeProductionSources {
    $excludedFileNames = @(
        'AscetBackendPoolDemo.cs',
        'AscetCli.cs',
        'AscetOrchestrator.cs',
        'AscetReadHost.cs',
        'AscetReadOnlyExample.cs',
        'AscetThreadHarness.cs',
        'AscetWorker.cs',
        'FindElementsReadService.cs',
        'HostCommand.cs'
    )
    return @(
        Get-ChildItem -LiteralPath (Get-RepoPath 'src\AscetCopilot') -Recurse -File -Filter '*.cs'
        Get-ChildItem -LiteralPath (Get-RepoPath 'src\AscetCli') -Recurse -File -Filter '*.cs'
    ) | Where-Object {
        $_.Name -notin $excludedFileNames -and
        $_.FullName -notmatch '[\\/]Compat[\\/]' -and
        $_.FullName -notmatch '[\\/]Host[\\/]'
    } | Sort-Object FullName -Unique | Select-Object -ExpandProperty FullName
}

function Convert-SingleResponseEnvelope {
    param(
        [Parameter(Mandatory = $true)][object[]]$Output,
        [Parameter(Mandatory = $true)][string]$Name
    )

    $lines = @(
        $Output | ForEach-Object { $_.ToString() } | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
    )
    if ($lines.Count -ne 1) {
        throw "$Name must emit exactly one non-empty stdout envelope line. Found $($lines.Count).`n$($lines -join [Environment]::NewLine)"
    }

    try {
        $envelope = $lines[0] | ConvertFrom-Json
    }
    catch {
        throw "$Name did not emit valid JSON.`n$($lines[0])"
    }

    if ($envelope.type -ne 'response' -or $envelope.protocolVersion -ne 1 -or $null -eq $envelope.ok) {
        throw "$Name emitted an invalid Bridge response envelope.`n$($lines[0])"
    }
    if ($null -eq $envelope.meta -or $envelope.meta.bridgePid -le 0 -or [string]::IsNullOrWhiteSpace($envelope.meta.bridgeGeneration)) {
        throw "$Name emitted invalid Bridge metadata.`n$($lines[0])"
    }
    if ($envelope.meta.durationMs -lt 0 -or [string]::IsNullOrWhiteSpace($envelope.meta.sessionPolicy)) {
        throw "$Name emitted invalid duration/session metadata.`n$($lines[0])"
    }
    if ($envelope.meta.PSObject.Properties.Name -notcontains 'mutationStarted') {
        throw "$Name omitted mutationStarted metadata.`n$($lines[0])"
    }

    return $envelope
}

function Invoke-JsonProbe {
    param(
        [Parameter(Mandatory = $true)][string]$BridgePath,
        [Parameter(Mandatory = $true)][string[]]$Arguments,
        [Parameter(Mandatory = $true)][string]$Name
    )

    $output = @(& $BridgePath @Arguments 2>&1)
    $exitCode = $LASTEXITCODE
    $envelope = Convert-SingleResponseEnvelope -Output $output -Name $Name
    if ($exitCode -ne 0) {
        throw "$Name failed with exit code $exitCode.`n$($output -join [Environment]::NewLine)"
    }
    if (-not $envelope.ok) {
        throw "$Name returned ok=false.`n$($output -join [Environment]::NewLine)"
    }
    return $envelope
}

function Invoke-ExpectedErrorProbe {
    param(
        [Parameter(Mandatory = $true)][string]$BridgePath,
        [Parameter(Mandatory = $true)][string[]]$Arguments,
        [Parameter(Mandatory = $true)][string]$ExpectedCode,
        [Parameter(Mandatory = $true)][string]$Name
    )

    $output = @(& $BridgePath @Arguments 2>&1)
    $exitCode = $LASTEXITCODE
    $envelope = Convert-SingleResponseEnvelope -Output $output -Name $Name
    if ($exitCode -eq 0) {
        throw "Expected Bridge error '$ExpectedCode' but $Name succeeded.`n$($output -join [Environment]::NewLine)"
    }
    if ($envelope.ok -or $envelope.error.code -ne $ExpectedCode) {
        throw "Expected Bridge error '$ExpectedCode' from $Name.`n$($output -join [Environment]::NewLine)"
    }
    return $envelope
}

$binDirectory = Get-RepoPath 'output\ascet-csharp\bin'
$bridgePath = Join-Path $binDirectory 'AscetBridge.exe'
if (-not (Test-Path -LiteralPath $bridgePath)) {
    throw "Missing production Bridge '$bridgePath'. Run scripts\build-ascet-csharp.ps1 first."
}

$artifactPaths = @(
    Get-ChildItem -LiteralPath $binDirectory -Recurse -File | ForEach-Object {
        $_.FullName.Substring($binDirectory.Length).TrimStart('\')
    } | Sort-Object
)
$expectedArtifacts = @('Ascetapidll\Etas.AscetNET.dll', 'AscetBridge.exe')
if ($artifactPaths.Count -ne 2 -or @($artifactPaths | Where-Object { $_ -notin $expectedArtifacts }).Count -gt 0) {
    throw "Production bin must contain exactly AscetBridge.exe and Ascetapidll\Etas.AscetNET.dll. Found: $($artifactPaths -join ', ')."
}

$capabilities = Invoke-JsonProbe -BridgePath $bridgePath -Arguments @('capabilities', '--json') -Name 'capabilities'
$routes = @($capabilities.result.routes)
$operationIds = @($routes | Select-Object -ExpandProperty operationId)
if (@($capabilities.result.operations).Count -ne 65 -or $routes.Count -ne 65 -or @($operationIds | Sort-Object -Unique).Count -ne 65) {
    throw 'Capabilities operation/route inventory does not match Milestone A.'
}
if ($capabilities.result.persistentImplemented -or @($capabilities.result.modes) -join ',' -ne 'exec,batch,capabilities,selftest') {
    throw 'Capabilities must advertise only implemented Milestone A modes.'
}
if (@($capabilities.result.reservedModes) -join ',' -ne 'benchmark,serve') {
    throw 'Capabilities must explicitly declare reserved non-production modes.'
}
if (@($capabilities.result.selftestProfiles) -join ',' -ne 'offline,quick,deep,smoke') {
    throw 'Capabilities selftest profile inventory is invalid.'
}
if ([string]::IsNullOrWhiteSpace($capabilities.result.capabilitiesHash) -or -not $capabilities.result.capabilitiesHash.StartsWith('sha256:')) {
    throw 'Capabilities hash is missing or invalid.'
}
if ($capabilities.meta.sessionPolicy -ne 'no_session') {
    throw 'Capabilities must report no_session.'
}
$publicRoutes = @($routes | Where-Object { $_.routeVisibility -eq 'public_contract' })
$internalRoutes = @($routes | Where-Object { $_.routeVisibility -eq 'internal_runtime' })
$legacyRoutes = @($routes | Where-Object { $_.handlerKind -eq 'legacy_one_shot_adapter' })
$invalidRoutes = @($routes | Where-Object {
    $_.sessionPolicy -ne 'fresh_session' -or
    $_.transportPolicy -ne 'one_shot_only' -or
    $_.retryPolicy -ne 'never' -or
    $_.handlerKind -notin @('typed', 'legacy_one_shot_adapter') -or
    ($_.mutatesDatabase -and $_.executionProfile.timeoutClass -ne 'write') -or
    ($_.handlerKind -eq 'legacy_one_shot_adapter' -and $_.transportPolicy -ne 'one_shot_only')
})
if ($publicRoutes.Count -ne 52 -or $internalRoutes.Count -ne 13 -or $legacyRoutes.Count -ne 38 -or $invalidRoutes.Count -ne 0) {
    throw 'Capabilities route policy inventory is invalid.'
}
$compatibilityAliases = @('read_code', 'diff', 'read_block_diagram_raw')
if (@($internalRoutes | Where-Object { $_.operationId -in $compatibilityAliases }).Count -ne $compatibilityAliases.Count) {
    throw 'Bridge compatibility aliases must be registered internal runtime routes.'
}

$offline = Invoke-JsonProbe -BridgePath $bridgePath -Arguments @('selftest', 'offline', '--json') -Name 'offline selftest'
if (-not $offline.result.passed -or $offline.result.toolApiConnected -or -not $offline.result.inProcess) {
    throw 'Offline selftest must pass in-process without connecting to ToolAPI.'
}
if ($offline.result.operationCount -ne 65 -or $offline.result.legacyOneShotCount -ne 38 -or $offline.meta.sessionPolicy -ne 'no_session') {
    throw 'Offline selftest registry/session metadata is invalid.'
}

$invalidChain = Invoke-ExpectedErrorProbe -BridgePath $bridgePath -Arguments @('exec', 'configure_parameter_dependency_chain_execute', '--json') -ExpectedCode 'invalid_argument' -Name 'missing dependency chain request file'
if ($invalidChain.meta.sessionPolicy -ne 'fresh_session' -or $invalidChain.meta.mutationStarted -ne $false) {
    throw 'Rejected dependency chain arguments must report fresh_session and mutationStarted=false.'
}
$invalidWrite = Invoke-ExpectedErrorProbe -BridgePath $bridgePath -Arguments @('exec', 'create_folder', '--json') -ExpectedCode 'invalid_arguments' -Name 'missing create_folder target'
if ($invalidWrite.meta.sessionPolicy -ne 'fresh_session' -or $invalidWrite.meta.mutationStarted -ne $false) {
    throw 'Rejected write arguments must report fresh_session and mutationStarted=false.'
}
$serve = Invoke-ExpectedErrorProbe -BridgePath $bridgePath -Arguments @('serve', '--stdio') -ExpectedCode 'not_implemented' -Name 'Milestone B serve probe'
if ($serve.meta.sessionPolicy -ne 'no_session') {
    throw 'Unimplemented serve control path must report no_session.'
}

$testDirectory = Get-RepoPath ('output\ascet-csharp\bridge-tests-' + [System.Guid]::NewGuid().ToString('N'))
Ensure-Directory $testDirectory
try {
    Publish-AscetRuntimeSupport $testDirectory
    $sources = Get-BridgeProductionSources
    $tests = @(
        @{ Name = 'AscetOperationRegistrySmoke'; Source = (Get-RepoPath 'tests\AscetOperationRegistrySmoke.cs') },
        @{ Name = 'AscetBridgeAdapterSmoke'; Source = (Get-RepoPath 'tests\AscetBridgeAdapterSmoke.cs') },
        @{ Name = 'AscetDatabaseCatalogContractTest'; Source = (Get-RepoPath 'tests\AscetDatabaseCatalogContractTest.cs') },
        @{ Name = 'AscetSetEnumeratorsOutputTest'; Source = (Get-RepoPath 'tests\AscetSetEnumeratorsOutputTest.cs') },
        @{ Name = 'AscetParameterDependencyChainExecuteOutputTest'; Source = (Get-RepoPath 'tests\AscetParameterDependencyChainExecuteOutputTest.cs') }
    )
    foreach ($test in $tests) {
        $testPath = Join-Path $testDirectory ($test.Name + '.exe')
        Invoke-AscetCsc -OutputPath $testPath -MainType $test.Name -Sources ($sources + @($test.Source)) -References (Get-AscetReferences -IncludeWebExtensions)
        Invoke-CompiledExecutable -Path $testPath
    }
}
finally {
    $outputRoot = [System.IO.Path]::GetFullPath((Get-RepoPath 'output\ascet-csharp')).TrimEnd('\') + '\'
    $resolvedTestDirectory = [System.IO.Path]::GetFullPath($testDirectory)
    if (-not $resolvedTestDirectory.StartsWith($outputRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "Refusing to remove test directory outside '$outputRoot': '$resolvedTestDirectory'."
    }
    if (Test-Path -LiteralPath $testDirectory) {
        Remove-Item -LiteralPath $testDirectory -Recurse -Force
    }
}

Write-Host 'ASCET Bridge Milestone A non-live tests passed.'
