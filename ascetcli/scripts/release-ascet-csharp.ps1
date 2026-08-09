[CmdletBinding()]
param(
    [string]$OutputZipPath,
    [string]$ReleaseDirectory,
    [string]$PackageRootName = 'ascet-csharp-runtime',
    [string[]]$KnownLockingProcesses = @(),
    [switch]$CheckOnlyProcessLocks,
    [switch]$SkipTests,
    [switch]$Force
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$ExitSuccess = 0
$ExitLockDetected = 10
$ExitLockStopFailed = 11
$ExitBuildFailed = 20
$ExitTestFailed = 21
$ExitPackageValidationFailed = 22
$ExitPackagingFailed = 23
$ExitUnexpectedFailure = 99

function Get-ReleaseRepoRoot {
    return (Split-Path -Parent (Split-Path -Parent $PSScriptRoot))
}

function Resolve-DefaultOutputZipPath {
    param(
        [Parameter(Mandatory = $true)]
        [string]$RepoRoot
    )

    return (Join-Path $RepoRoot 'release\ascet-csharp-runtime.zip')
}

function Resolve-DefaultReleaseDirectory {
    param(
        [Parameter(Mandatory = $true)]
        [string]$RepoRoot,

        [Parameter(Mandatory = $true)]
        [string]$PackageRootName
    )

    return (Join-Path $RepoRoot ("release\" + $PackageRootName))
}

function Ensure-Directory {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    New-Item -ItemType Directory -Path $Path -Force | Out-Null
}

function Remove-DirectoryContents {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    if (-not (Test-Path -LiteralPath $Path)) {
        return
    }

    Get-ChildItem -LiteralPath $Path -Force | Remove-Item -Recurse -Force
}

function Copy-DirectoryContents {
    param(
        [Parameter(Mandatory = $true)]
        [string]$SourceDirectory,

        [Parameter(Mandatory = $true)]
        [string]$DestinationDirectory
    )

    $items = @(Get-ChildItem -LiteralPath $SourceDirectory -Force)
    foreach ($item in $items) {
        Copy-Item -LiteralPath $item.FullName -Destination $DestinationDirectory -Recurse -Force
    }
}

function Get-LockingProcessDetails {
    param(
        [string[]]$ProcessNames = @()
    )

    $details = @()
    foreach ($processName in ($ProcessNames | Where-Object { -not [string]::IsNullOrWhiteSpace($_) } | Select-Object -Unique)) {
        $processes = Get-Process -Name $processName -ErrorAction SilentlyContinue
        foreach ($process in $processes) {
            $details += [pscustomobject]@{
                Name = $process.ProcessName
                Id = $process.Id
                StartTime = $null
            }

            try {
                $details[$details.Count - 1].StartTime = $process.StartTime
            }
            catch {
                $details[$details.Count - 1].StartTime = $null
            }
        }
    }

    return @($details)
}

function Stop-LockingProcesses {
    param(
        [Parameter(Mandatory = $true)]
        [object[]]$Processes
    )

    foreach ($process in $Processes) {
        Stop-Process -Id $process.Id -Force -ErrorAction Stop
    }
}

function Invoke-PowerShellScriptFile {
    param(
        [Parameter(Mandatory = $true)]
        [string]$ScriptPath
    )

    $powershellPath = (Get-Command powershell.exe -ErrorAction Stop).Source
    & $powershellPath -NoProfile -ExecutionPolicy Bypass -File $ScriptPath | Out-Host
    return $LASTEXITCODE
}

function Get-PackageExecutableInventory {
    param(
        [Parameter(Mandatory = $true)]
        [string]$PackageDirectory
    )

    $files = @(Get-ChildItem -LiteralPath $PackageDirectory -Recurse -File -Filter '*.exe') |
        Sort-Object FullName

    $inventory = @()
    foreach ($file in $files) {
        $inventory += [pscustomobject]@{
            Name = $file.Name
            RelativePath = $file.FullName.Substring($PackageDirectory.Length).TrimStart('\')
            Length = $file.Length
        }
    }

    return $inventory
}

function Get-PackageDirectoryInventory {
    param(
        [Parameter(Mandatory = $true)]
        [string]$PackageDirectory
    )

    $directories = @(Get-ChildItem -LiteralPath $PackageDirectory -Recurse -Directory) |
        Sort-Object FullName

    $items = @('.')
    foreach ($directory in $directories) {
        $items += $directory.FullName.Substring($PackageDirectory.Length).TrimStart('\')
    }

    return ($items | Select-Object -Unique)
}

function New-ReleaseManifest {
    param(
        [Parameter(Mandatory = $true)]
        [string]$PackageDirectory,

        [Parameter(Mandatory = $true)]
        [string]$PackageRootName,

        [Parameter(Mandatory = $true)]
        [string]$SourceBinDirectory,

        [Parameter(Mandatory = $true)]
        [string]$OutputZipPath,

        [Parameter(Mandatory = $true)]
        [bool]$TestsSkipped,

        [string[]]$HandledLockingProcesses = @()
    )

    $executables = @(Get-PackageExecutableInventory -PackageDirectory $PackageDirectory)
    $directories = Get-PackageDirectoryInventory -PackageDirectory $PackageDirectory

    return [ordered]@{
        packageRootName = $PackageRootName
        generatedAtUtc = [DateTime]::UtcNow.ToString('o')
        sourceBinDirectory = $SourceBinDirectory
        releaseDirectory = $PackageDirectory
        outputZipPath = $OutputZipPath
        executableCount = $executables.Count
        handledLockingProcesses = $HandledLockingProcesses
        testsSkipped = $TestsSkipped
        keyDirectories = $directories
        executables = $executables
    }
}

function Write-ReleaseManifest {
    param(
        [Parameter(Mandatory = $true)]
        [string]$ManifestPath,

        [Parameter(Mandatory = $true)]
        [object]$Manifest
    )

    $Manifest | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $ManifestPath -Encoding ASCII
}

function Test-PackageLayout {
    param(
        [Parameter(Mandatory = $true)]
        [string]$PackageDirectory
    )

    if (-not (Test-Path -LiteralPath $PackageDirectory)) {
        throw "Release directory '$PackageDirectory' was not created."
    }

    $expectedFiles = @('AscetBridge.exe', 'Ascetapidll\Etas.AscetNET.dll')
    $actualFiles = @(
        Get-ChildItem -LiteralPath $PackageDirectory -Recurse -File | ForEach-Object {
            $_.FullName.Substring($PackageDirectory.Length).TrimStart('\')
        } | Sort-Object
    )
    $missing = @($expectedFiles | Where-Object { $_ -notin $actualFiles })
    $unexpected = @($actualFiles | Where-Object { $_ -notin $expectedFiles })
    if ($actualFiles.Count -ne 2 -or $missing.Count -gt 0 -or $unexpected.Count -gt 0) {
        throw "Release package must contain exactly AscetBridge.exe and Ascetapidll\Etas.AscetNET.dll. Missing: [$($missing -join ', ')]. Unexpected: [$($unexpected -join ', ')]."
    }
}
function Test-ReleaseZipLayout {
    param(
        [Parameter(Mandatory = $true)][string]$ZipPath,
        [Parameter(Mandatory = $true)][string]$PackageRootName
    )

    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $archive = [IO.Compression.ZipFile]::OpenRead($ZipPath)
    try {
        $expected = @(
            "$PackageRootName\AscetBridge.exe",
            "$PackageRootName\Ascetapidll\Etas.AscetNET.dll",
            "$PackageRootName\manifest.json"
        )
        $actual = @($archive.Entries | Where-Object { -not [string]::IsNullOrWhiteSpace($_.Name) } | ForEach-Object { $_.FullName } | Sort-Object)
        $missing = @($expected | Where-Object { $_ -notin $actual })
        $unexpected = @($actual | Where-Object { $_ -notin $expected })
        if ($actual.Count -ne 3 -or $missing.Count -gt 0 -or $unexpected.Count -gt 0) {
            throw "Release zip allowlist mismatch. Missing: [$($missing -join ', ')]. Unexpected: [$($unexpected -join ', ')]."
        }
    }
    finally {
        $archive.Dispose()
    }
}
$repoRoot = Get-ReleaseRepoRoot
if ([string]::IsNullOrWhiteSpace($OutputZipPath)) {
    $OutputZipPath = Resolve-DefaultOutputZipPath -RepoRoot $repoRoot
}

if ([string]::IsNullOrWhiteSpace($ReleaseDirectory)) {
    $ReleaseDirectory = Resolve-DefaultReleaseDirectory -RepoRoot $repoRoot -PackageRootName $PackageRootName
}

$buildScriptPath = Join-Path $PSScriptRoot 'build-ascet-csharp.ps1'
$testScriptPath = Join-Path $PSScriptRoot 'test-ascet-bridge.ps1'
$sourceBinDirectory = Join-Path $repoRoot 'ascetcli\output\ascet-csharp\bin'
$manifestPath = Join-Path $ReleaseDirectory 'manifest.json'
$zipParentDirectory = Split-Path -Parent $OutputZipPath

try {
    Write-Host "Preparing ASCET C# runtime release."
    Write-Host "Package root: $PackageRootName"
    Write-Host "Release directory: $ReleaseDirectory"
    Write-Host "Output zip: $OutputZipPath"

    $lockingProcesses = @(Get-LockingProcessDetails -ProcessNames $KnownLockingProcesses)
    if ($lockingProcesses.Count -gt 0) {
        $processSummary = ($lockingProcesses | ForEach-Object { "$($_.Name)#$($_.Id)" }) -join ', '
        if ($CheckOnlyProcessLocks) {
            Write-Host "Detected known locking processes: $processSummary"
            exit $ExitLockDetected
        }

        Write-Host "Stopping known locking processes: $processSummary"
        try {
            Stop-LockingProcesses -Processes $lockingProcesses
        }
        catch {
            Write-Host "Failed to stop known locking processes. $($_.Exception.Message)"
            exit $ExitLockStopFailed
        }
    }
    else {
        Write-Host "No known locking processes detected."
    }

    $buildExitCode = Invoke-PowerShellScriptFile -ScriptPath $buildScriptPath
    if ($buildExitCode -ne 0) {
        Write-Host "Build script failed with exit code $buildExitCode."
        exit $ExitBuildFailed
    }

    if (-not $SkipTests) {
        $testExitCode = Invoke-PowerShellScriptFile -ScriptPath $testScriptPath
        if ($testExitCode -ne 0) {
            Write-Host "Test script failed with exit code $testExitCode."
            exit $ExitTestFailed
        }
    }
    else {
        Write-Host "Skipping ASCET C# tests by request."
    }

    if (-not (Test-Path -LiteralPath $sourceBinDirectory)) {
        Write-Host "Expected build output directory '$sourceBinDirectory' to exist."
        exit $ExitPackageValidationFailed
    }

    Ensure-Directory -Path $ReleaseDirectory
    Ensure-Directory -Path $zipParentDirectory

    if ((Test-Path -LiteralPath $ReleaseDirectory) -and -not $Force) {
        $existingReleaseContents = @(Get-ChildItem -LiteralPath $ReleaseDirectory -Force -ErrorAction SilentlyContinue)
        if ($existingReleaseContents.Count -gt 0) {
            Write-Host "Release directory '$ReleaseDirectory' is not empty. Use -Force to replace existing contents."
            exit $ExitPackagingFailed
        }
    }

    Remove-DirectoryContents -Path $ReleaseDirectory
    Copy-DirectoryContents -SourceDirectory $sourceBinDirectory -DestinationDirectory $ReleaseDirectory

    Test-PackageLayout -PackageDirectory $ReleaseDirectory

    $manifest = New-ReleaseManifest `
        -PackageDirectory $ReleaseDirectory `
        -PackageRootName $PackageRootName `
        -SourceBinDirectory $sourceBinDirectory `
        -OutputZipPath $OutputZipPath `
        -TestsSkipped ([bool]$SkipTests) `
        -HandledLockingProcesses @($KnownLockingProcesses | Select-Object -Unique)
    Write-ReleaseManifest -ManifestPath $manifestPath -Manifest $manifest

    if ((Test-Path -LiteralPath $OutputZipPath) -and -not $Force) {
        Write-Host "Output zip '$OutputZipPath' already exists. Use -Force to overwrite it."
        exit $ExitPackagingFailed
    }

    if (Test-Path -LiteralPath $OutputZipPath) {
        Remove-Item -LiteralPath $OutputZipPath -Force
    }

    $stagingRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("ascet-csharp-release-" + [Guid]::NewGuid().ToString('N'))
    try {
        Ensure-Directory -Path $stagingRoot
        $stagingPackageDirectory = Join-Path $stagingRoot $PackageRootName
        Copy-Item -LiteralPath $ReleaseDirectory -Destination $stagingPackageDirectory -Recurse -Force
        Compress-Archive -LiteralPath $stagingPackageDirectory -DestinationPath $OutputZipPath -CompressionLevel Optimal -Force
        Test-ReleaseZipLayout -ZipPath $OutputZipPath -PackageRootName $PackageRootName
    }
    finally {
        if (Test-Path -LiteralPath $stagingRoot) {
            Remove-Item -LiteralPath $stagingRoot -Recurse -Force
        }
    }

    Write-Host "ASCET C# runtime release is ready."
    Write-Host "Release directory: $ReleaseDirectory"
    Write-Host "Manifest: $manifestPath"
    Write-Host "Zip package: $OutputZipPath"
    exit $ExitSuccess
}
catch {
    Write-Host "Unexpected release failure: $($_.Exception.Message)"
    exit $ExitUnexpectedFailure
}
