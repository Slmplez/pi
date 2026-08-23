# Compile and run one focused ASCET C# runtime test against the production source closure.
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$TestSource,

    [Parameter(Mandatory = $true)]
    [string]$MainType,

    [Parameter(Mandatory = $false)]
    [string[]]$AdditionalSource = @()
)

$ErrorActionPreference = 'Stop'

. "$PSScriptRoot\ascet-csharp-common.ps1"

$RepositoryRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$FocusedTempRoot = $null
$ExitCode = 2

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

function Remove-OwnVerifiedDirectory {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)][string]$ParentDirectory
    )

    Assert-PathInsideDirectory -Path $Path -ParentDirectory $ParentDirectory
    if (Test-Path -LiteralPath $Path) {
        Remove-Item -LiteralPath $Path -Recurse -Force -ErrorAction Stop
    }
}

function Resolve-RequiredTestSource {
    param([Parameter(Mandatory = $true)][string]$Path)

    $resolvedPath = [System.IO.Path]::GetFullPath($Path)
    if (-not (Test-Path -LiteralPath $resolvedPath -PathType Leaf)) {
        throw "TestSource must be an existing file: '$Path'."
    }

    Assert-PathInsideDirectory -Path $resolvedPath -ParentDirectory $RepositoryRoot
    if ([System.IO.Path]::GetExtension($resolvedPath) -ne '.cs') {
        throw "TestSource must be a C# source file: '$resolvedPath'."
    }

    return $resolvedPath
}

function Resolve-MainType {
    param([Parameter(Mandatory = $true)][string]$TypeName)

    $normalizedType = $TypeName.Trim()
    if ([string]::IsNullOrWhiteSpace($normalizedType) -or $normalizedType -notmatch '^[A-Za-z_][A-Za-z0-9_]*(\.[A-Za-z_][A-Za-z0-9_]*)*$') {
        throw "MainType must be a C# type name such as 'AscetWriteExecutorSmoke': '$TypeName'."
    }

    return $normalizedType
}

function Get-FocusedProductionSources {
    # Keep this closure identical to build-ascet-csharp.ps1. The focused runner
    # cannot dot-source that script because it would execute the production build.
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

function Assert-FocusedProductionSourceClosure {
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
        throw "Focused production source closure must remain synchronous on the Bridge STA thread: $($first.Path):$($first.LineNumber)."
    }

    $binLogMatches = @(
        $Sources | Select-String -Pattern 'AppDomain\.CurrentDomain\.BaseDirectory[^\r\n]*\.(log|trace)'
    )
    if ($binLogMatches.Count -gt 0) {
        $first = $binLogMatches[0]
        throw "Production source closure must not write diagnostic logs beside the focused executable: $($first.Path):$($first.LineNumber)."
    }

    $registryPath = Get-RepoPath 'src\AscetCli\Routing\OperationRegistry.cs'
    $registryExecutableMatches = @(Select-String -LiteralPath $registryPath -Pattern '(?i)\.exe\b')
    if ($registryExecutableMatches.Count -gt 0) {
        $first = $registryExecutableMatches[0]
        throw "OperationRegistry must not reference helper executables: $($first.Path):$($first.LineNumber)."
    }
}

function Assert-X86PortableExecutable {
    param([Parameter(Mandatory = $true)][string]$Path)

    $bytes = [System.IO.File]::ReadAllBytes($Path)
    if ($bytes.Length -lt 64 -or $bytes[0] -ne 0x4d -or $bytes[1] -ne 0x5a) {
        throw "Focused output is not a valid PE executable: '$Path'."
    }

    $peOffset = [BitConverter]::ToInt32($bytes, 0x3c)
    if ($peOffset -lt 0 -or $peOffset + 6 -gt $bytes.Length -or [BitConverter]::ToUInt32($bytes, $peOffset) -ne 0x00004550) {
        throw "Focused output has an invalid PE header: '$Path'."
    }

    $machine = [BitConverter]::ToUInt16($bytes, $peOffset + 4)
    if ($machine -ne 0x014c) {
        throw ("Focused output must target x86 (PE machine 0x014c), found 0x{0:x4}." -f $machine)
    }
}

function Invoke-FocusedExecutable {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)][string]$WorkingDirectory
    )

    $startInfo = New-Object System.Diagnostics.ProcessStartInfo
    $startInfo.FileName = $Path
    $startInfo.WorkingDirectory = $WorkingDirectory
    $startInfo.UseShellExecute = $false
    $startInfo.CreateNoWindow = $true
    $startInfo.RedirectStandardOutput = $true
    $startInfo.RedirectStandardError = $true
    $startInfo.EnvironmentVariables["ASCET_REPOSITORY_ROOT"] = (Join-Path $RepositoryRoot 'ascetcli')

    $process = New-Object System.Diagnostics.Process
    $process.StartInfo = $startInfo
    try {
        if (-not $process.Start()) {
            throw "Unable to start focused test executable '$Path'."
        }

        $stdoutTask = $process.StandardOutput.ReadToEndAsync()
        $stderrTask = $process.StandardError.ReadToEndAsync()
        $process.WaitForExit()
        $stdout = $stdoutTask.Result
        $stderr = $stderrTask.Result
        $exitCode = $process.ExitCode
    }
    finally {
        $process.Dispose()
    }

    return [pscustomobject]@{
        ExitCode = $exitCode
        Stdout = $stdout
        Stderr = $stderr
    }
}

function Get-PropertyValue {
    param(
        [Parameter(Mandatory = $true)]$Object,
        [Parameter(Mandatory = $true)][string]$Name
    )

    $property = $Object.PSObject.Properties[$Name]
    if ($null -eq $property) {
        throw "Runtime report is missing '$Name'."
    }

    return $property.Value
}

function Test-LegacyPassOutput {
    param([Parameter(Mandatory = $true)][string]$Stdout)

    $lines = @($Stdout -split "`r?`n" | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
    if ($lines.Count -ne 1) {
        return $false
    }

    return $lines[0].Trim() -match '^[A-Za-z_][A-Za-z0-9_.]* passed\.$'
}

function Assert-FinalRuntimeReport {
    param([Parameter(Mandatory = $true)][string]$Stdout)

    $text = $Stdout.Trim()
    if ([string]::IsNullOrWhiteSpace($text)) {
        throw 'Runtime test emitted no stdout report.'
    }

    try {
        $report = $text | ConvertFrom-Json
    }
    catch {
        throw "Runtime test stdout is not valid final JSON: $($_.Exception.Message)"
    }

    if ($null -eq $report -or $report -is [System.Array]) {
        throw 'Runtime report must be one JSON object.'
    }

    $passed = Get-PropertyValue -Object $report -Name 'passed'
    if ($passed -isnot [bool]) {
        throw "Runtime report 'passed' must be a JSON boolean."
    }

    $assertionValue = Get-PropertyValue -Object $report -Name 'runtimeProtocolAssertions'
    if ($assertionValue -isnot [ValueType] -or $assertionValue -is [bool]) {
        throw "Runtime report 'runtimeProtocolAssertions' must be a number."
    }
    $assertionCount = 0
    try {
        $assertionCount = [int]$assertionValue
    }
    catch {
        throw "Runtime report 'runtimeProtocolAssertions' must be an integer."
    }
    if ([double]$assertionValue -ne $assertionCount -or $assertionCount -lt 0) {
        throw "Runtime report 'runtimeProtocolAssertions' must be a non-negative integer."
    }

    $metrics = Get-PropertyValue -Object $report -Name 'metrics'
    if ($null -eq $metrics -or $metrics -is [System.Array] -or $metrics -is [ValueType] -or $metrics -is [string]) {
        throw "Runtime report 'metrics' must be a JSON object."
    }

    return [pscustomobject]@{
        Passed = $passed
        RuntimeProtocolAssertions = $assertionCount
    }
}

try {
    Assert-AscetToolchain
    $resolvedTestSource = Resolve-RequiredTestSource -Path $TestSource
    $resolvedMainType = Resolve-MainType -TypeName $MainType
    $resolvedAdditionalSources = @($AdditionalSource | ForEach-Object { Resolve-RequiredTestSource -Path $_ })
    $productionSources = Get-FocusedProductionSources
    Assert-FocusedProductionSourceClosure -Sources $productionSources

    $tempParent = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath())
    $FocusedTempRoot = Join-Path $tempParent ('ascet-csharp-focused-' + [System.Guid]::NewGuid().ToString('N'))
    if (Test-Path -LiteralPath $FocusedTempRoot) {
        throw "Generated focused output directory already exists: '$FocusedTempRoot'."
    }
    Ensure-Directory -Path $FocusedTempRoot
    Assert-PathInsideDirectory -Path $FocusedTempRoot -ParentDirectory $tempParent

    $outputPath = Join-Path $FocusedTempRoot ($resolvedMainType.Split('.')[-1] + '.exe')
    Assert-PathInsideDirectory -Path $outputPath -ParentDirectory $FocusedTempRoot

    $sources = @($productionSources + $resolvedTestSource + $resolvedAdditionalSources)
    Invoke-AscetCsc `
        -OutputPath $outputPath `
        -MainType $resolvedMainType `
        -Sources $sources `
        -References (Get-AscetReferences -IncludeWebExtensions)
    Publish-AscetRuntimeSupport -OutputDirectory $FocusedTempRoot

    if (-not (Test-Path -LiteralPath $outputPath -PathType Leaf)) {
        throw "Focused compiler did not produce '$outputPath'."
    }
    Assert-X86PortableExecutable -Path $outputPath

    $runtimePath = Join-Path $FocusedTempRoot $Script:AscetDllRelativePath
    if (-not (Test-AscetFilesMatch -SourcePath $Script:AscetDllPath -DestinationPath $runtimePath)) {
        throw 'Focused output runtime dependency does not match the reviewed ASCET runtime DLL.'
    }

    $run = Invoke-FocusedExecutable -Path $outputPath -WorkingDirectory $FocusedTempRoot
    if (-not [string]::IsNullOrEmpty($run.Stdout)) {
        [Console]::Out.Write($run.Stdout)
    }
    if (-not [string]::IsNullOrEmpty($run.Stderr)) {
        [Console]::Error.Write($run.Stderr)
    }

    if ($run.ExitCode -ne 0) {
        $ExitCode = 1
        throw "Focused test process failed with exit code $($run.ExitCode)."
    }

    $trimmedStdout = $run.Stdout.Trim()
    $jsonReport = $null
    $jsonParseSucceeded = $false
    if (-not [string]::IsNullOrWhiteSpace($trimmedStdout)) {
        try {
            $jsonReport = Assert-FinalRuntimeReport -Stdout $run.Stdout
            $jsonParseSucceeded = $true
        }
        catch {
            if (-not (Test-LegacyPassOutput -Stdout $run.Stdout)) {
                $ExitCode = 3
                throw
            }
        }
    }

    if ($jsonParseSucceeded) {
        if (-not $jsonReport.Passed -or $jsonReport.RuntimeProtocolAssertions -lt 1) {
            $ExitCode = 1
            throw "Runtime protocol assertions failed: passed=$($jsonReport.Passed), runtimeProtocolAssertions=$($jsonReport.RuntimeProtocolAssertions)."
        }

        [Console]::Error.WriteLine("FOCUSED_RUNTIME_RESULT: JSON passed (runtimeProtocolAssertions=$($jsonReport.RuntimeProtocolAssertions)).")
        $ExitCode = 0
    }
    else {
        if (-not (Test-LegacyPassOutput -Stdout $run.Stdout)) {
            $ExitCode = 3
            throw 'Runtime test did not emit a valid JSON report or an explicitly supported legacy pass line.'
        }

        [Console]::Error.WriteLine('FOCUSED_RUNTIME_RESULT: LEGACY_COMPATIBILITY_PASS (runtimeProtocolAssertions=not_asserted; JSON report absent).')
        $ExitCode = 0
    }
}
catch {
    [Console]::Error.WriteLine("Focused C# runner failed: $($_.Exception.Message)")
}
finally {
    if ($null -ne $FocusedTempRoot -and (Test-Path -LiteralPath $FocusedTempRoot)) {
        try {
            Remove-OwnVerifiedDirectory -Path $FocusedTempRoot -ParentDirectory ([System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath()))
        }
        catch {
            [Console]::Error.WriteLine("Focused C# runner cleanup failed: $($_.Exception.Message)")
            if ($ExitCode -eq 0) {
                $ExitCode = 2
            }
        }
    }
}

exit $ExitCode
