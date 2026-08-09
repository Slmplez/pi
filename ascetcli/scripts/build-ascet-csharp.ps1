# Non-live production build. This script must never connect to ASCET ToolAPI.
param(
    [string]$BuildMode = ''
)

$ErrorActionPreference = 'Stop'

. "$PSScriptRoot\ascet-csharp-common.ps1"

function Assert-ProductionBuildMode {
    param([string]$RequestedMode)

    $mode = $RequestedMode
    if ([string]::IsNullOrWhiteSpace($mode)) {
        $mode = $env:ASCET_CSHARP_BUILD_MODE
    }
    if ([string]::IsNullOrWhiteSpace($mode)) {
        return
    }

    switch ($mode.Trim().ToLowerInvariant()) {
        'core' { return }
        'default' { return }
        'production' { return }
        default {
            throw "Unsupported ASCET C# production build mode '$mode'. Milestone A builds only AscetBridge.exe; legacy helper executable builds are removed."
        }
    }
}

function Assert-PathInsideDirectory {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)][string]$ParentDirectory
    )

    $resolvedParent = [System.IO.Path]::GetFullPath($ParentDirectory).TrimEnd('\') + '\'
    $resolvedPath = [System.IO.Path]::GetFullPath($Path)
    if (-not $resolvedPath.StartsWith($resolvedParent, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "Refusing filesystem operation outside '$resolvedParent': '$resolvedPath'."
    }
}

function Remove-VerifiedDirectory {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)][string]$ParentDirectory
    )

    Assert-PathInsideDirectory -Path $Path -ParentDirectory $ParentDirectory
    if (Test-Path -LiteralPath $Path) {
        Remove-Item -LiteralPath $Path -Recurse -Force -ErrorAction Stop
    }
}

function Get-AscetBridgeProductionSources {
    $coreDirectory = Get-RepoPath 'src\AscetCopilot'
    $cliDirectory = Get-RepoPath 'src\AscetCli'
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

    $sources = @(
        Get-ChildItem -LiteralPath $coreDirectory -Recurse -File -Filter '*.cs'
        Get-ChildItem -LiteralPath $cliDirectory -Recurse -File -Filter '*.cs'
    ) | Where-Object {
        $_.Name -notin $excludedFileNames -and
        $_.FullName -notmatch '[\\/]Compat[\\/]' -and
        $_.FullName -notmatch '[\\/]Host[\\/]'
    } | Sort-Object FullName -Unique | Select-Object -ExpandProperty FullName

    if ($sources.Count -eq 0) {
        throw 'ASCET Bridge production source closure is empty.'
    }

    return @($sources)
}

function Assert-AscetBridgeSourceClosure {
    param([Parameter(Mandatory = $true)][string[]]$Sources)

    $processLaunchMatches = @(
        $Sources | Select-String -Pattern '\bProcess\.Start\s*\(|\bProcessStartInfo\b'
    )
    if ($processLaunchMatches.Count -gt 0) {
        $first = $processLaunchMatches[0]
        throw "Production source closure contains sibling-process launch code: $($first.Path):$($first.LineNumber)."
    }

    $threadHandoffMatches = @(
        $Sources | Select-String -Pattern '\bnew\s+Thread\s*\(|\bTask\.Run\s*\(|\bThreadPool\.|\basync\b|\bawait\b'
    )
    if ($threadHandoffMatches.Count -gt 0) {
        $first = $threadHandoffMatches[0]
        throw "Milestone A production source closure must remain synchronous on the Bridge STA thread: $($first.Path):$($first.LineNumber)."
    }

    $binLogMatches = @(
        $Sources | Select-String -Pattern 'AppDomain\.CurrentDomain\.BaseDirectory[^\r\n]*\.(log|trace)'
    )
    if ($binLogMatches.Count -gt 0) {
        $first = $binLogMatches[0]
        throw "Production source closure must not write diagnostic logs beside AscetBridge.exe: $($first.Path):$($first.LineNumber)."
    }

    $registryPath = Get-RepoPath 'src\AscetCli\Routing\OperationRegistry.cs'
    $registryExecutableMatches = @(Select-String -LiteralPath $registryPath -Pattern '\.exe' -SimpleMatch)
    if ($registryExecutableMatches.Count -gt 0) {
        $first = $registryExecutableMatches[0]
        throw "OperationRegistry must not reference helper executables: $($first.Path):$($first.LineNumber)."
    }
}

function Invoke-BridgeOfflineProbe {
    param(
        [Parameter(Mandatory = $true)][string]$BridgePath,
        [Parameter(Mandatory = $true)][string[]]$Arguments,
        [Parameter(Mandatory = $true)][string]$ProbeName
    )

    $output = & $BridgePath @Arguments 2>&1
    $exitCode = $LASTEXITCODE
    $text = ($output | Out-String).Trim()
    if ($exitCode -ne 0) {
        throw "ASCET Bridge $ProbeName probe failed with exit code $exitCode.`n$text"
    }

    try {
        $envelope = $text | ConvertFrom-Json
    }
    catch {
        throw "ASCET Bridge $ProbeName probe did not emit one JSON envelope.`n$text"
    }

    if (-not $envelope.ok) {
        throw "ASCET Bridge $ProbeName probe returned ok=false.`n$text"
    }
    if ($envelope.type -ne 'response' -or $envelope.protocolVersion -ne 1 -or $envelope.meta.bridgePid -le 0 -or [string]::IsNullOrWhiteSpace($envelope.meta.bridgeGeneration)) {
        throw "ASCET Bridge $ProbeName probe returned incomplete protocol metadata.`n$text"
    }
}

function Assert-X86PortableExecutable {
    param([Parameter(Mandatory = $true)][string]$Path)

    $bytes = [IO.File]::ReadAllBytes($Path)
    if ($bytes.Length -lt 64 -or $bytes[0] -ne 0x4d -or $bytes[1] -ne 0x5a) {
        throw "ASCET Bridge is not a valid PE executable: $Path"
    }
    $peOffset = [BitConverter]::ToInt32($bytes, 0x3c)
    if ($peOffset -lt 0 -or $peOffset + 6 -gt $bytes.Length -or [BitConverter]::ToUInt32($bytes, $peOffset) -ne 0x00004550) {
        throw "ASCET Bridge has an invalid PE header: $Path"
    }
    $machine = [BitConverter]::ToUInt16($bytes, $peOffset + 4)
    if ($machine -ne 0x014c) {
        throw ("ASCET Bridge must target x86 (PE machine 0x014c), found 0x{0:x4}." -f $machine)
    }
}
function Assert-AscetBridgeArtifactAllowlist {
    param([Parameter(Mandatory = $true)][string]$BinDirectory)

    $expected = @(
        'AscetBridge.exe',
        'Ascetapidll\Etas.AscetNET.dll'
    )
    $actual = @(
        Get-ChildItem -LiteralPath $BinDirectory -Recurse -File | ForEach-Object {
            $_.FullName.Substring($BinDirectory.Length).TrimStart('\')
        } | Sort-Object
    )

    $unexpected = @($actual | Where-Object { $_ -notin $expected })
    $missing = @($expected | Where-Object { $_ -notin $actual })
    if ($unexpected.Count -gt 0 -or $missing.Count -gt 0 -or $actual.Count -ne 2) {
        throw "ASCET Bridge artifact allowlist mismatch. Missing: [$($missing -join ', ')]. Unexpected: [$($unexpected -join ', ')]."
    }
}

Assert-ProductionBuildMode -RequestedMode $BuildMode
Assert-AscetToolchain

$outputRoot = Get-RepoPath 'output\ascet-csharp'
Ensure-Directory $outputRoot
$stagingRoot = Join-Path $outputRoot ('.bridge-staging-' + [System.Guid]::NewGuid().ToString('N'))
$stagingBin = Join-Path $stagingRoot 'bin'
$finalBin = Join-Path $outputRoot 'bin'
$backupBin = Join-Path $outputRoot ('.bridge-backup-' + [System.Guid]::NewGuid().ToString('N'))
Ensure-Directory $stagingBin

try {
    $sources = Get-AscetBridgeProductionSources
    Assert-AscetBridgeSourceClosure -Sources $sources

    $bridgePath = Join-Path $stagingBin 'AscetBridge.exe'
    Invoke-AscetCsc `
        -OutputPath $bridgePath `
        -MainType 'AscetBridge' `
        -Sources $sources `
        -References (Get-AscetReferences -IncludeWebExtensions)
    Publish-AscetRuntimeSupport $stagingBin

    Assert-X86PortableExecutable -Path $bridgePath
    $stagedRuntime = Join-Path $stagingBin 'Ascetapidll\Etas.AscetNET.dll'
    if (-not (Test-AscetFilesMatch -SourcePath $Script:AscetDllPath -DestinationPath $stagedRuntime)) {
        throw 'Staged Etas.AscetNET.dll hash does not match the reviewed source runtime DLL.'
    }
    Assert-AscetBridgeArtifactAllowlist -BinDirectory $stagingBin
    Invoke-BridgeOfflineProbe -BridgePath $bridgePath -Arguments @('capabilities', '--json') -ProbeName 'capabilities'
    Invoke-BridgeOfflineProbe -BridgePath $bridgePath -Arguments @('selftest', 'offline', '--json') -ProbeName 'offline selftest'

    Assert-PathInsideDirectory -Path $finalBin -ParentDirectory $outputRoot
    Assert-PathInsideDirectory -Path $backupBin -ParentDirectory $outputRoot
    if (Test-Path -LiteralPath $finalBin) {
        Move-Item -LiteralPath $finalBin -Destination $backupBin -ErrorAction Stop
    }

    try {
        Move-Item -LiteralPath $stagingBin -Destination $finalBin -ErrorAction Stop
    }
    catch {
        if ((Test-Path -LiteralPath $backupBin) -and -not (Test-Path -LiteralPath $finalBin)) {
            Move-Item -LiteralPath $backupBin -Destination $finalBin -ErrorAction SilentlyContinue
        }
        throw
    }

    Assert-AscetBridgeArtifactAllowlist -BinDirectory $finalBin
    if (Test-Path -LiteralPath $backupBin) {
        Remove-VerifiedDirectory -Path $backupBin -ParentDirectory $outputRoot
    }

    $contractValidationScript = Get-RepoPath '..\scripts\generate-ascet-contracts.ps1'
    & $contractValidationScript
    if ($LASTEXITCODE -ne 0) {
        throw 'ASCET contract validation failed.'
    }

    Write-Host "Built production ASCET Bridge into $finalBin (1 EXE + 1 DLL; $($sources.Count) source files)."
}
finally {
    if (Test-Path -LiteralPath $stagingRoot) {
        Remove-VerifiedDirectory -Path $stagingRoot -ParentDirectory $outputRoot
    }
}
