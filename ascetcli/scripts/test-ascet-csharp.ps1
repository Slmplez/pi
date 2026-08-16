# Non-live Bridge smoke. Live ToolAPI verification remains serial and is run separately.
. "$PSScriptRoot\ascet-csharp-common.ps1"

Assert-AscetToolchain

$binDir = Get-RepoPath 'output\ascet-csharp\bin'
$bridgePath = Join-Path $binDir 'AscetBridge.exe'
$runtimePath = Join-Path $binDir 'Ascetapidll\Etas.AscetNET.dll'
if (-not (Test-Path -LiteralPath $bridgePath)) {
    throw "Missing required ASCET Bridge executable '$bridgePath'. Run scripts\build-ascet-csharp.ps1 first."
}
if (-not (Test-Path -LiteralPath $runtimePath)) {
    throw "Missing required ASCET runtime support '$runtimePath'. Run scripts\build-ascet-csharp.ps1 first."
}

function Invoke-BridgeJsonProbe {
    param(
        [Parameter(Mandatory = $true)][string[]]$Arguments,
        [Parameter(Mandatory = $true)][string]$Name
    )

    $output = & $bridgePath @Arguments 2>&1
    $exitCode = $LASTEXITCODE
    $text = ($output | Out-String).Trim()
    if ($exitCode -ne 0) {
        throw "ASCET Bridge $Name failed with exit code $exitCode.`n$text"
    }
    try {
        $envelope = $text | ConvertFrom-Json
    }
    catch {
        throw "ASCET Bridge $Name did not emit one JSON envelope.`n$text"
    }
    if (-not $envelope.ok -or $envelope.type -ne 'response' -or $envelope.protocolVersion -ne 1) {
        throw "ASCET Bridge $Name returned an invalid response envelope.`n$text"
    }
    if ($envelope.meta.bridgePid -le 0 -or [string]::IsNullOrWhiteSpace($envelope.meta.bridgeGeneration)) {
        throw "ASCET Bridge $Name omitted process metadata.`n$text"
    }
    return $envelope
}

$capabilities = Invoke-BridgeJsonProbe -Arguments @('capabilities', '--json') -Name 'capabilities'
$operations = @($capabilities.result.operations)
$requiredOperations = @(
    'preflight_create_folder',
    'preflight_create_method',
    'guarded_create_method',
    'create_folder',
    'create_method',
    'component_editable_check',
    'component_editable_set'
)
$missing = @($requiredOperations | Where-Object { $_ -notin $operations })
if ($missing.Count -gt 0) {
    throw "ASCET Bridge capabilities are missing required guarded-write operations: $($missing -join ', ')."
}

$routes = @($capabilities.result.routes)
foreach ($operation in @('preflight_create_folder', 'preflight_create_method')) {
    $route = $routes | Where-Object { $_.operationId -eq $operation } | Select-Object -First 1
    if ($null -eq $route -or $route.mutatesDatabase -ne $false) {
        throw "ASCET Bridge route '$operation' must be registered as non-mutating."
    }
}
$guardedRoute = $routes | Where-Object { $_.operationId -eq 'guarded_create_method' } | Select-Object -First 1
if ($null -eq $guardedRoute -or $guardedRoute.mutatesDatabase -ne $true -or $guardedRoute.sessionPolicy -ne 'fresh_session') {
    throw "ASCET Bridge guarded_create_method route metadata is invalid."
}

$selftest = Invoke-BridgeJsonProbe -Arguments @('selftest', 'offline', '--json') -Name 'offline selftest'
if (-not $selftest.result.passed -or $selftest.result.status -ne 'passed' -or -not $selftest.result.inProcess) {
    throw 'ASCET Bridge offline selftest did not pass in-process.'
}
if (-not $selftest.result.guardedCreateMethodCompensation) {
    throw 'ASCET Bridge offline selftest did not verify guarded create_method compensation classification.'
}

if (-not $selftest.result.guardedMutationStartedMetadata) {
    throw 'ASCET Bridge offline selftest did not verify guarded mutationStarted metadata propagation.'
}
Write-Host "ASCET C# single-Bridge smoke passed ($($operations.Count) operations)."
