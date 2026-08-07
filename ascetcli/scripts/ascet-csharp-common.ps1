$Script:RepoRoot = Split-Path -Parent $PSScriptRoot
$Script:CscPath = 'C:\Windows\Microsoft.NET\Framework\v4.0.30319\csc.exe'
$Script:AscetDllRelativePath = 'Ascetapidll\Etas.AscetNET.dll'
$Script:AscetDllPath = Join-Path $Script:RepoRoot $Script:AscetDllRelativePath
$Script:FrameworkDirectory = Split-Path -Parent $Script:CscPath

function Get-RepoPath {
    param(
        [Parameter(Mandatory = $true)]
        [string]$RelativePath
    )

    return Join-Path $Script:RepoRoot $RelativePath
}

function Resolve-AscetReferencePath {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Reference
    )

    if ([System.IO.Path]::IsPathRooted($Reference)) {
        return $Reference
    }

    return Join-Path $Script:FrameworkDirectory $Reference
}

function Get-AscetFileLockGuidance {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path,

        [Parameter(Mandatory = $true)]
        [string]$Operation
    )

    return "Unable to $Operation '$Path' because the target is unavailable. This commonly means the file is locked by a running process. Close any running executable from output\ascet-csharp\bin, stop shells or tools that launched it, then rerun scripts\build-ascet-csharp.ps1."
}

function Assert-FileAvailableForWrite {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path,

        [string]$Operation = 'write to'
    )

    $directory = Split-Path -Parent $Path
    if (-not [string]::IsNullOrWhiteSpace($directory)) {
        Ensure-Directory $directory
    }

    if (Test-Path -LiteralPath $Path) {
        try {
            $fileStream = [System.IO.File]::Open($Path, [System.IO.FileMode]::Open, [System.IO.FileAccess]::ReadWrite, [System.IO.FileShare]::None)
            $fileStream.Dispose()
            return
        }
        catch [System.UnauthorizedAccessException], [System.IO.IOException] {
            throw (Get-AscetFileLockGuidance -Path $Path -Operation $Operation)
        }
    }

    $probeFileName = '.ascet-write-probe-' + [System.Guid]::NewGuid().ToString('N') + '.tmp'
    $probePath = Join-Path $directory $probeFileName

    try {
        $probeStream = [System.IO.File]::Open($probePath, [System.IO.FileMode]::CreateNew, [System.IO.FileAccess]::ReadWrite, [System.IO.FileShare]::None)
        $probeStream.Dispose()
        Remove-Item -LiteralPath $probePath -Force -ErrorAction Stop
    }
    catch {
        if (Test-Path -LiteralPath $probePath) {
            Remove-Item -LiteralPath $probePath -Force -ErrorAction SilentlyContinue
        }

        throw "Unable to prepare output directory '$directory' for '$Path'. Confirm the directory exists, is writable, and is not blocked by another process. $($_.Exception.Message)"
    }
}

function Assert-AscetToolchain {
    if (-not (Test-Path $Script:CscPath)) {
        throw "csc.exe not found at '$Script:CscPath'. Install or enable the .NET Framework 4.x C# compiler before running scripts\build-ascet-csharp.ps1."
    }

    if (-not (Test-Path $Script:AscetDllPath)) {
        throw "Etas.AscetNET.dll not found at '$Script:AscetDllPath'. Restore or copy the ASCET ToolAPI runtime into Ascetapidll before running scripts\build-ascet-csharp.ps1."
    }

    foreach ($reference in (Get-AscetReferences)) {
        $resolvedReference = Resolve-AscetReferencePath $reference
        if (-not (Test-Path -LiteralPath $resolvedReference)) {
            throw "Required compiler reference '$reference' was not found at '$resolvedReference'. Repair the .NET Framework reference assemblies or update ascet-csharp-common.ps1 before building."
        }
    }
}

function Ensure-Directory {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    New-Item -ItemType Directory -Force -Path $Path | Out-Null
}

function Get-AscetReferences {
    param(
        [switch]$IncludeWebExtensions
    )

    $references = @(
        $Script:AscetDllPath,
        'System.Web.Extensions.dll'
    )

    return $references
}

function Test-AscetFilesMatch {
    param(
        [Parameter(Mandatory = $true)]
        [string]$SourcePath,

        [Parameter(Mandatory = $true)]
        [string]$DestinationPath
    )

    if (-not (Test-Path -LiteralPath $SourcePath) -or -not (Test-Path -LiteralPath $DestinationPath)) {
        return $false
    }

    try {
        $sourceInfo = Get-Item -LiteralPath $SourcePath -ErrorAction Stop
        $destinationInfo = Get-Item -LiteralPath $DestinationPath -ErrorAction Stop
        if ($sourceInfo.Length -ne $destinationInfo.Length) {
            return $false
        }

        $sourceHash = Get-FileHash -LiteralPath $SourcePath -Algorithm SHA256 -ErrorAction Stop
        $destinationHash = Get-FileHash -LiteralPath $DestinationPath -Algorithm SHA256 -ErrorAction Stop
        return $sourceHash.Hash -eq $destinationHash.Hash
    }
    catch {
        return $false
    }
}

function Publish-AscetRuntimeSupport {
    param(
        [Parameter(Mandatory = $true)]
        [string]$OutputDirectory
    )

    Assert-AscetToolchain

    $runtimeDirectory = Join-Path $OutputDirectory 'Ascetapidll'
    Ensure-Directory $runtimeDirectory
    $runtimeDestination = Join-Path $runtimeDirectory 'Etas.AscetNET.dll'

    if (Test-AscetFilesMatch -SourcePath $Script:AscetDllPath -DestinationPath $runtimeDestination) {
        return
    }

    Assert-FileAvailableForWrite -Path $runtimeDestination -Operation 'copy to'

    try {
        Copy-Item -Path $Script:AscetDllPath -Destination $runtimeDestination -Force -ErrorAction Stop
    }
    catch [System.UnauthorizedAccessException], [System.IO.IOException] {
        throw ((Get-AscetFileLockGuidance -Path $runtimeDestination -Operation 'copy to') + " Original error: $($_.Exception.Message)")
    }
    catch {
        throw "Failed to copy runtime dependency to '$runtimeDestination'. $($_.Exception.Message)"
    }
}

function Invoke-AscetCsc {
    param(
        [Parameter(Mandatory = $true)]
        [string]$OutputPath,

        [Parameter(Mandatory = $true)]
        [string[]]$Sources,

        [string]$MainType,

        [string[]]$References = @()
    )

    Assert-AscetToolchain
    Assert-FileAvailableForWrite -Path $OutputPath -Operation 'compile to'

    $arguments = @(
        '/nologo',
        '/platform:x86',
        '/target:exe',
        "/out:$OutputPath"
    )

    if (-not [string]::IsNullOrWhiteSpace($MainType)) {
        $arguments += "/main:$MainType"
    }

    foreach ($reference in $References) {
        $arguments += "/r:$(Resolve-AscetReferencePath $reference)"
    }

    $arguments += $Sources

    $responseFile = [System.IO.Path]::GetTempFileName()
    try {
        Set-Content -LiteralPath $responseFile -Value ($arguments -join [Environment]::NewLine) -Encoding ASCII

        $compilerOutput = & $Script:CscPath "@$responseFile" 2>&1
        $compilerExitCode = $LASTEXITCODE
    }
    finally {
        Remove-Item -LiteralPath $responseFile -Force -ErrorAction SilentlyContinue
    }

    if ($compilerExitCode -ne 0) {
        $compilerText = ($compilerOutput | Out-String).Trim()
        if ($compilerText -match '(?i)being used by another process|access is denied|cannot access the file|CS2012') {
            throw ((Get-AscetFileLockGuidance -Path $OutputPath -Operation 'compile to') + "`nCompiler output:`n$compilerText")
        }

        throw "Compilation failed for '$OutputPath' with exit code $compilerExitCode.`n$compilerText"
    }
}

function Invoke-CompiledExecutable {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    & $Path
    if ($LASTEXITCODE -ne 0) {
        throw "Executable failed: $Path"
    }
}

function Get-AscetSerialModuleLiveCommands {
    param(
        [Parameter(Mandatory = $true)]
        [string]$ModulePath
    )

    $binDir = Get-RepoPath 'output\ascet-csharp\bin'

    return @(
        @{ Name = 'summary'; Path = (Join-Path $binDir 'AscetReadModuleSummary.exe'); Args = @($ModulePath, '--json') },
        @{ Name = 'snapshot'; Path = (Join-Path $binDir 'AscetReadModuleSnapshot.exe'); Args = @($ModulePath, '--json') },
        @{ Name = 'diff'; Path = (Join-Path $binDir 'AscetDiffModule.exe'); Args = @($ModulePath, $ModulePath, '--json', '--changes-only') }
    )
}

function Invoke-AscetModuleLiveVerification {
    param(
        [Parameter(Mandatory = $true)]
        [string]$ModulePath
    )

    $commands = Get-AscetSerialModuleLiveCommands -ModulePath $ModulePath

    foreach ($command in $commands) {
        if (-not (Test-Path $command.Path)) {
            throw "Missing executable '$($command.Path)'. Run scripts\\build-ascet-csharp.ps1 first."
        }
    }

    $results = New-Object System.Collections.Generic.List[object]

    foreach ($command in $commands) {
        $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
        $output = & $command.Path @($command.Args) 2>&1
        $exitCode = $LASTEXITCODE
        $stopwatch.Stop()

        if ($exitCode -ne 0) {
            throw "Live command '$($command.Name)' failed with exit code $exitCode.`n$($output | Out-String)"
        }

        $results.Add([pscustomobject]@{
            Name = $command.Name
            ExitCode = $exitCode
            ElapsedMs = $stopwatch.ElapsedMilliseconds
            Output = ($output | Out-String).Trim()
        }) | Out-Null
    }

    return [pscustomobject]@{
        Mode = 'SerialLiveToolApiVerification'
        Rule = 'Do not parallelize live ToolAPI verification.'
        ModulePath = $ModulePath
        Results = $results
    }
}
