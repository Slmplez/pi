param(
    [Parameter(Mandatory = $true)]
    [string]$ComponentPath,

    [ValidateSet('serial-baseline', 'multiprocess-read', 'multiprocess-mixed', 'multithread-read', 'multithread-mixed')]
    [string]$Mode = 'serial-baseline',

    [int]$ReaderCount = 2,

    [int]$WriterCount = 1,

    [int]$Iterations = 5,

    [int]$TimeoutSeconds = 20
)

$ErrorActionPreference = 'Stop'

. "$PSScriptRoot\ascet-csharp-common.ps1"

function Require-Path {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path,

        [Parameter(Mandatory = $true)]
        [string]$Label
    )

    if (-not (Test-Path $Path)) {
        throw "Missing $Label '$Path'."
    }
}

function Quote-Argument {
    param(
        [AllowNull()]
        [string]$Value
    )

    if ($null -eq $Value) {
        return '""'
    }

    if ($Value -match '[\s"]') {
        return '"' + $Value.Replace('"', '\"') + '"'
    }

    return $Value
}

function Format-CommandDisplay {
    param(
        [Parameter(Mandatory = $true)]
        [string]$FilePath,

        [string[]]$ArgumentList = @()
    )

    $parts = @($FilePath)
    foreach ($argument in $ArgumentList) {
        $parts += Quote-Argument $argument
    }

    return ($parts -join ' ')
}

function Format-ArgumentString {
    param(
        [string[]]$ArgumentList = @()
    )

    $parts = @()
    foreach ($argument in $ArgumentList) {
        $parts += Quote-Argument $argument
    }

    return ($parts -join ' ')
}

function Get-ExecutableMap {
    $binDir = Get-RepoPath 'output\ascet-csharp\bin'

    return [ordered]@{
        BinDir = $binDir
        SummaryExe = Join-Path $binDir 'AscetReadModuleSummary.exe'
        SnapshotExe = Join-Path $binDir 'AscetReadModuleSnapshot.exe'
        DiffExe = Join-Path $binDir 'AscetDiffModule.exe'
        WorkerExe = Join-Path $binDir 'AscetWorker.exe'
        OrchestratorExe = Join-Path $binDir 'AscetOrchestrator.exe'
        ThreadHarnessExe = Join-Path $binDir 'AscetThreadHarness.exe'
        SerialScript = Join-Path $PSScriptRoot 'verify-ascet-module-live.ps1'
    }
}

function Assert-Dependencies {
    param(
        [Parameter(Mandatory = $true)]
        [System.Collections.IDictionary]$Executables
    )

    Require-Path -Path $Executables.BinDir -Label 'ASCET CLI bin directory'
    Require-Path -Path $Executables.SummaryExe -Label 'AscetReadModuleSummary.exe'
    Require-Path -Path $Executables.SnapshotExe -Label 'AscetReadModuleSnapshot.exe'
    Require-Path -Path $Executables.DiffExe -Label 'AscetDiffModule.exe'
    Require-Path -Path $Executables.WorkerExe -Label 'AscetWorker.exe'
    Require-Path -Path $Executables.OrchestratorExe -Label 'AscetOrchestrator.exe'
    Require-Path -Path $Executables.ThreadHarnessExe -Label 'AscetThreadHarness.exe'
    Require-Path -Path $Executables.SerialScript -Label 'verify-ascet-module-live.ps1'
}

function New-RunDirectory {
    param(
        [Parameter(Mandatory = $true)]
        [string]$ModeName
    )

    $archiveRoot = Get-RepoPath 'output\ascet-concurrency'
    Ensure-Directory $archiveRoot

    $runId = (Get-Date).ToUniversalTime().ToString('yyyyMMdd-HHmmss-fff') + '-' + $ModeName
    $runDir = Join-Path $archiveRoot $runId
    Ensure-Directory $runDir

    return [ordered]@{
        ArchiveRoot = $archiveRoot
        RunID = $runId
        RunDir = $runDir
    }
}

function Get-PreviousRunMetadata {
    param(
        [Parameter(Mandatory = $true)]
        [string]$ArchiveRoot,

        [Parameter(Mandatory = $true)]
        [string]$Component
    )

    if (-not (Test-Path $ArchiveRoot)) {
        return $null
    }

    $metadataFiles = Get-ChildItem -Path $ArchiveRoot -Filter metadata.json -Recurse -File -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTimeUtc -Descending

    foreach ($metadataFile in $metadataFiles) {
        try {
            $candidate = Get-Content $metadataFile.FullName -Raw | ConvertFrom-Json
        }
        catch {
            continue
        }

        if ($null -ne $candidate -and $candidate.component_path -eq $Component) {
            return $candidate
        }
    }

    return $null
}

function Get-CommandSpec {
    param(
        [Parameter(Mandatory = $true)]
        [string]$ModeName,

        [Parameter(Mandatory = $true)]
        [System.Collections.IDictionary]$Executables,

        [Parameter(Mandatory = $true)]
        [string]$Component,

        [Parameter(Mandatory = $true)]
        [int]$Readers,

        [Parameter(Mandatory = $true)]
        [int]$Writers,

        [Parameter(Mandatory = $true)]
        [int]$LoopIterations,

        [Parameter(Mandatory = $true)]
        [int]$TimeoutSecondsValue
    )

    switch ($ModeName) {
        'serial-baseline' {
            return [ordered]@{
                RunnerKind = 'serial-baseline'
                FilePath = $Executables.SerialScript
                ArgumentList = @(
                    '-ModulePath', $Component
                )
                WorkingDirectory = $Script:RepoRoot
            }
        }
        'multiprocess-read' {
            return [ordered]@{
                FilePath = $Executables.OrchestratorExe
                ArgumentList = @(
                    [string]$Readers,
                    '0',
                    [string]$LoopIterations
                )
                WorkingDirectory = $Executables.BinDir
            }
        }
        'multiprocess-mixed' {
            return [ordered]@{
                FilePath = $Executables.OrchestratorExe
                ArgumentList = @(
                    [string]$Readers,
                    [string]$Writers,
                    [string]$LoopIterations
                )
                WorkingDirectory = $Executables.BinDir
            }
        }
        'multithread-read' {
            return [ordered]@{
                FilePath = $Executables.ThreadHarnessExe
                ArgumentList = @(
                    [string]$Readers,
                    '0',
                    [string]$LoopIterations,
                    [string]($TimeoutSecondsValue * 1000)
                )
                WorkingDirectory = $Executables.BinDir
            }
        }
        'multithread-mixed' {
            return [ordered]@{
                FilePath = $Executables.ThreadHarnessExe
                ArgumentList = @(
                    [string]$Readers,
                    [string]$Writers,
                    [string]$LoopIterations,
                    [string]($TimeoutSecondsValue * 1000)
                )
                WorkingDirectory = $Executables.BinDir
            }
        }
        default {
            throw "Unsupported mode '$ModeName'."
        }
    }
}

function Invoke-ArchivedProcess {
    param(
        [Parameter(Mandatory = $true)]
        [string]$FilePath,

        [string[]]$ArgumentList = @(),

        [Parameter(Mandatory = $true)]
        [string]$WorkingDirectory,

        [Parameter(Mandatory = $true)]
        [int]$TimeoutSecondsValue,

        [Parameter(Mandatory = $true)]
        [string]$RunDirectory
    )

    $stdoutPath = Join-Path $RunDirectory 'stdout.txt'
    $stderrPath = Join-Path $RunDirectory 'stderr.txt'
    $startedAt = (Get-Date).ToUniversalTime()
    $timedOut = $false
    $stdoutText = ''
    $stderrText = ''
    $exitCode = -1

    $startInfo = New-Object System.Diagnostics.ProcessStartInfo
    $startInfo.FileName = $FilePath
    $startInfo.Arguments = Format-ArgumentString -ArgumentList $ArgumentList
    $startInfo.WorkingDirectory = $WorkingDirectory
    $startInfo.UseShellExecute = $false
    $startInfo.CreateNoWindow = $true
    $startInfo.RedirectStandardOutput = $true
    $startInfo.RedirectStandardError = $true

    $process = New-Object System.Diagnostics.Process
    $process.StartInfo = $startInfo

    try {
        [void]$process.Start()
        if (-not $process.WaitForExit($TimeoutSecondsValue * 1000)) {
            $timedOut = $true
            try {
                $process.Kill()
            }
            catch {
            }
        }

        try {
            $process.WaitForExit()
        }
        catch {
        }

        $stdoutText = $process.StandardOutput.ReadToEnd()
        $stderrText = $process.StandardError.ReadToEnd()
        if ($process.HasExited) {
            $exitCode = $process.ExitCode
        }
    }
    finally {
        if ($null -ne $process) {
            $process.Dispose()
        }
    }

    Set-Content -Path $stdoutPath -Value $stdoutText -Encoding UTF8
    Set-Content -Path $stderrPath -Value $stderrText -Encoding UTF8
    $completedAt = (Get-Date).ToUniversalTime()

    return [ordered]@{
        started_at_utc = $startedAt.ToString('o')
        completed_at_utc = $completedAt.ToString('o')
        elapsed_ms = [int]($completedAt - $startedAt).TotalMilliseconds
        timed_out = $timedOut
        exit_code = $exitCode
        stdout_path = $stdoutPath
        stderr_path = $stderrPath
        stdout_text = $stdoutText
        stderr_text = $stderrText
    }
}

function Invoke-ArchivedSerialBaseline {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Component,

        [Parameter(Mandatory = $true)]
        [string]$RunDirectory
    )

    $stdoutPath = Join-Path $RunDirectory 'stdout.txt'
    $stderrPath = Join-Path $RunDirectory 'stderr.txt'
    $startedAt = (Get-Date).ToUniversalTime()
    $stdoutText = ''
    $stderrText = ''
    $exitCode = 0

    try {
        $result = Invoke-AscetModuleLiveVerification -ModulePath $Component
        $stdoutText = $result | ConvertTo-Json -Depth 6
    }
    catch {
        $exitCode = 1
        $stderrText = $_ | Out-String
    }

    Set-Content -Path $stdoutPath -Value $stdoutText -Encoding UTF8
    Set-Content -Path $stderrPath -Value $stderrText -Encoding UTF8
    $completedAt = (Get-Date).ToUniversalTime()

    return [ordered]@{
        started_at_utc = $startedAt.ToString('o')
        completed_at_utc = $completedAt.ToString('o')
        elapsed_ms = [int]($completedAt - $startedAt).TotalMilliseconds
        timed_out = $false
        exit_code = $exitCode
        stdout_path = $stdoutPath
        stderr_path = $stderrPath
        stdout_text = $stdoutText
        stderr_text = $stderrText
    }
}

function Get-Classification {
    param(
        [Parameter(Mandatory = $true)]
        [bool]$TimedOut,

        [Parameter(Mandatory = $true)]
        [int]$ExitCode,

        [string]$StdoutText,

        [string]$StderrText
    )

    if ($TimedOut) {
        if ([string]::IsNullOrWhiteSpace($StdoutText) -and [string]::IsNullOrWhiteSpace($StderrText)) {
            return 'hung-no-output'
        }

        return 'timeout'
    }

    if ($ExitCode -eq 0) {
        return 'passed'
    }

    $safeStdout = if ($null -eq $StdoutText) { '' } else { $StdoutText }
    $safeStderr = if ($null -eq $StderrText) { '' } else { $StderrText }
    $combined = ($safeStdout + "`n" + $safeStderr).ToLowerInvariant()
    if ($combined.Contains('readback_mismatch')) {
        return 'readback-mismatch'
    }

    return 'failed-with-error'
}

function Try-ParseJson {
    param(
        [string]$Text
    )

    if ([string]::IsNullOrWhiteSpace($Text)) {
        return $null
    }

    try {
        return $Text | ConvertFrom-Json
    }
    catch {
        return $null
    }
}

function Get-BaselineResultsMarkdown {
    param(
        $ParsedOutput
    )

    if ($null -eq $ParsedOutput) {
        return '- baseline details unavailable'
    }

    $propertyNames = @($ParsedOutput.PSObject.Properties.Name)
    if ($propertyNames -notcontains 'Results') {
        return '- baseline details unavailable'
    }

    $lines = @()
    foreach ($result in $ParsedOutput.Results) {
        $lines += ('- {0}: exit={1}, elapsed_ms={2}' -f $result.Name, $result.ExitCode, $result.ElapsedMs)
    }

    if ($lines.Count -eq 0) {
        return '- baseline details unavailable'
    }

    return ($lines -join [Environment]::NewLine)
}

function Render-Template {
    param(
        [Parameter(Mandatory = $true)]
        [string]$TemplatePath,

        [Parameter(Mandatory = $true)]
        [hashtable]$Values
    )

    $content = Get-Content $TemplatePath -Raw
    foreach ($key in $Values.Keys) {
        $replacement = [string]$Values[$key]
        $content = $content.Replace($key, $replacement)
    }

    return $content
}

$executables = Get-ExecutableMap
Assert-Dependencies -Executables $executables

$run = New-RunDirectory -ModeName $Mode
$previousRun = Get-PreviousRunMetadata -ArchiveRoot $run.ArchiveRoot -Component $ComponentPath
$commandSpec = Get-CommandSpec `
    -ModeName $Mode `
    -Executables $executables `
    -Component $ComponentPath `
    -Readers $ReaderCount `
    -Writers $WriterCount `
    -LoopIterations $Iterations `
    -TimeoutSecondsValue $TimeoutSeconds

$commandDisplay = Format-CommandDisplay -FilePath $commandSpec.FilePath -ArgumentList $commandSpec.ArgumentList
if ($commandSpec.RunnerKind -eq 'serial-baseline') {
    $execution = Invoke-ArchivedSerialBaseline -Component $ComponentPath -RunDirectory $run.RunDir
}
else {
    $execution = Invoke-ArchivedProcess `
        -FilePath $commandSpec.FilePath `
        -ArgumentList $commandSpec.ArgumentList `
        -WorkingDirectory $commandSpec.WorkingDirectory `
        -TimeoutSecondsValue $TimeoutSeconds `
        -RunDirectory $run.RunDir
}

$classification = Get-Classification `
    -TimedOut $execution.timed_out `
    -ExitCode $execution.exit_code `
    -StdoutText $execution.stdout_text `
    -StderrText $execution.stderr_text

$parsedOutput = Try-ParseJson -Text $execution.stdout_text
$metadataPath = Join-Path $run.RunDir 'metadata.json'
$summaryPath = Join-Path $run.RunDir 'summary.md'
$templatePath = Get-RepoPath 'docs\plans\artifacts\ascet-concurrency-validation-template.md'
Require-Path -Path $templatePath -Label 'concurrency validation template'

$isRecoveryBaseline = $false
$previousRunID = ''
$previousRunMode = ''
$previousRunClassification = ''
$recoveryBaselinePassed = ''

if ($null -ne $previousRun) {
    $previousRunID = [string]$previousRun.run_id
    $previousRunMode = [string]$previousRun.mode
    $previousRunClassification = [string]$previousRun.classification

    if ($Mode -eq 'serial-baseline' -and `
        $previousRunMode -ne 'serial-baseline' -and `
        $previousRunClassification -ne 'passed') {
        $isRecoveryBaseline = $true
        $recoveryBaselinePassed = if ($classification -eq 'passed') { 'true' } else { 'false' }
    }
}

$metadata = [ordered]@{
    run_id = $run.RunID
    component_path = $ComponentPath
    mode = $Mode
    reader_count = $ReaderCount
    writer_count = $WriterCount
    iterations = $Iterations
    timeout_seconds = $TimeoutSeconds
    archive_dir = $run.RunDir
    classification = $classification
    command = [ordered]@{
        file_path = $commandSpec.FilePath
        argument_list = $commandSpec.ArgumentList
        display = $commandDisplay
        working_directory = $commandSpec.WorkingDirectory
    }
    process = [ordered]@{
        started_at_utc = $execution.started_at_utc
        completed_at_utc = $execution.completed_at_utc
        elapsed_ms = $execution.elapsed_ms
        exit_code = $execution.exit_code
        timed_out = $execution.timed_out
        stdout_path = $execution.stdout_path
        stderr_path = $execution.stderr_path
    }
    recovery = [ordered]@{
        is_recovery_baseline = $isRecoveryBaseline
        previous_run_id = $previousRunID
        previous_mode = $previousRunMode
        previous_classification = $previousRunClassification
        recovery_baseline_passed = $recoveryBaselinePassed
    }
    parsed_output = $parsedOutput
    summary_path = $summaryPath
    template_path = $templatePath
}

$metadata | ConvertTo-Json -Depth 8 | Set-Content -Path $metadataPath -Encoding UTF8

$summary = Render-Template -TemplatePath $templatePath -Values @{
    '{{run_id}}' = $run.RunID
    '{{mode}}' = $Mode
    '{{component_path}}' = $ComponentPath
    '{{classification}}' = $classification
    '{{command_display}}' = $commandDisplay
    '{{started_at_utc}}' = $execution.started_at_utc
    '{{completed_at_utc}}' = $execution.completed_at_utc
    '{{elapsed_ms}}' = [string]$execution.elapsed_ms
    '{{exit_code}}' = [string]$execution.exit_code
    '{{timed_out}}' = [string]$execution.timed_out
    '{{stdout_path}}' = $execution.stdout_path
    '{{stderr_path}}' = $execution.stderr_path
    '{{metadata_path}}' = $metadataPath
    '{{summary_path}}' = $summaryPath
    '{{is_recovery_baseline}}' = [string]$isRecoveryBaseline
    '{{previous_run_id}}' = $previousRunID
    '{{previous_mode}}' = $previousRunMode
    '{{previous_classification}}' = $previousRunClassification
    '{{recovery_baseline_passed}}' = $recoveryBaselinePassed
    '{{baseline_results_markdown}}' = Get-BaselineResultsMarkdown -ParsedOutput $parsedOutput
}

Set-Content -Path $summaryPath -Value $summary -Encoding UTF8

$metadata | ConvertTo-Json -Depth 8
