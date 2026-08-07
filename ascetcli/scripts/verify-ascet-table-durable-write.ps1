# Serial live verification only. Do not parallelize live ASCET ToolAPI commands.
param(
    [string[]]$ComponentPath,
    [string[]]$TargetLabel,
    [string[]]$CaseId,
    [string]$MatrixPath,
    [string]$OutputRoot,
    [switch]$BuildBinaries,
    [switch]$IncludeRestartGate,
    [switch]$ListCases
)

$ErrorActionPreference = 'Stop'

. "$PSScriptRoot\ascet-csharp-common.ps1"

if ([string]::IsNullOrWhiteSpace($MatrixPath)) {
    $MatrixPath = Get-RepoPath 'specs\ascet-table-durable-write\matrix.json'
}

if ([string]::IsNullOrWhiteSpace($OutputRoot)) {
    $OutputRoot = Get-RepoPath 'output\ascet-live\table-durable-write'
}

function Read-MatrixDefinition {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    if (-not (Test-Path $Path)) {
        throw "Matrix file not found: $Path"
    }

    $raw = Get-Content $Path -Raw
    $matrix = $raw | ConvertFrom-Json
    if ($null -eq $matrix -or $null -eq $matrix.cases) {
        throw "Matrix file '$Path' does not define any cases."
    }

    return $matrix
}

function Select-MatrixCases {
    param(
        [Parameter(Mandatory = $true)]
        $Matrix,

        [string[]]$SelectedIds
    )

    $allCases = @($Matrix.cases)
    if ($null -eq $SelectedIds -or $SelectedIds.Count -eq 0) {
        return $allCases
    }

    $requested = @()
    foreach ($id in $SelectedIds) {
        if ([string]::IsNullOrWhiteSpace($id)) {
            continue
        }

        $match = $allCases | Where-Object { $_.id -eq $id }
        if ($null -eq $match -or @($match).Count -eq 0) {
            $available = ($allCases | ForEach-Object { $_.id }) -join ', '
            throw "Unknown case id '$id'. Available ids: $available"
        }

        $requested += @($match)
    }

    return $requested
}

function Convert-ToSafeTargetLabel {
    param(
        [string]$Value,
        [int]$Index
    )

    $candidate = if ([string]::IsNullOrWhiteSpace($Value)) { '' } else { $Value.Trim() }
    if (-not [string]::IsNullOrWhiteSpace($candidate)) {
        $candidate = [System.Text.RegularExpressions.Regex]::Replace($candidate, '[^A-Za-z0-9._-]+', '-')
        $candidate = $candidate.Trim('-')
    }

    if ([string]::IsNullOrWhiteSpace($candidate)) {
        $candidate = ('target-{0:D2}' -f ($Index + 1))
    }

    return $candidate
}

function Normalize-VerificationTargets {
    param(
        [string[]]$ComponentPaths,
        [string[]]$TargetLabels
    )

    $paths = @()
    foreach ($path in @($ComponentPaths)) {
        if (-not [string]::IsNullOrWhiteSpace($path)) {
            $paths += $path.Trim()
        }
    }

    if ($paths.Count -eq 0) {
        throw "At least one ComponentPath is required unless -ListCases is used."
    }

    $labels = @()
    if ($null -ne $TargetLabels -and $TargetLabels.Count -gt 0) {
        foreach ($label in @($TargetLabels)) {
            if (-not [string]::IsNullOrWhiteSpace($label)) {
                $labels += $label.Trim()
            }
            else {
                $labels += ''
            }
        }

        if ($labels.Count -ne $paths.Count) {
            throw "TargetLabel count must match ComponentPath count."
        }
    }

    $usedLabels = @{}
    $targets = New-Object System.Collections.Generic.List[object]

    for ($i = 0; $i -lt $paths.Count; $i++) {
        $baseLabel = if ($labels.Count -gt 0) {
            $labels[$i]
        }
        else {
            Split-Path -Leaf $paths[$i]
        }

        $safeLabel = Convert-ToSafeTargetLabel -Value $baseLabel -Index $i
        if ($usedLabels.ContainsKey($safeLabel)) {
            $usedLabels[$safeLabel] = [int]$usedLabels[$safeLabel] + 1
            $safeLabel = ('{0}-{1:D2}' -f $safeLabel, [int]$usedLabels[$safeLabel])
        }
        else {
            $usedLabels[$safeLabel] = 1
        }

        $targets.Add([pscustomobject]@{
            Label = $safeLabel
            ComponentPath = $paths[$i]
        }) | Out-Null
    }

    return $targets
}

function Ensure-TableVerificationBinaries {
    param(
        [switch]$Build
    )

    if ($Build) {
        & (Join-Path $PSScriptRoot 'build-ascet-csharp.ps1')
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to build ASCET C# binaries."
        }
    }

    $binDir = Get-RepoPath 'output\ascet-csharp\bin'
    $required = @(
        (Join-Path $binDir 'AscetApplyElementSpec.exe'),
        (Join-Path $binDir 'AscetReadElementCatalog.exe')
    )

    foreach ($path in $required) {
        if (-not (Test-Path $path)) {
            throw "Missing executable '$path'. Run scripts\build-ascet-csharp.ps1 first or use -BuildBinaries."
        }
    }

    return [pscustomobject]@{
        BinDir = $binDir
        ApplyExe = (Join-Path $binDir 'AscetApplyElementSpec.exe')
        ReadCatalogExe = (Join-Path $binDir 'AscetReadElementCatalog.exe')
    }
}

function Read-SpecElement {
    param(
        [Parameter(Mandatory = $true)]
        [string]$SpecPath
    )

    if (-not (Test-Path $SpecPath)) {
        throw "Spec file not found: $SpecPath"
    }

    $document = (Get-Content $SpecPath -Raw) | ConvertFrom-Json
    if ($null -eq $document -or $null -eq $document.elements -or @($document.elements).Count -ne 1) {
        throw "Spec file '$SpecPath' must define exactly one element."
    }

    return $document.elements[0]
}

function Convert-ValueToJson {
    param(
        $Value
    )

    if ($null -eq $Value) {
        return '<null>'
    }

    return ($Value | ConvertTo-Json -Depth 32 -Compress)
}

function Get-ListCount {
    param(
        $Value
    )

    if ($null -eq $Value) {
        return 0
    }

    if ($Value -is [string]) {
        return 1
    }

    if ($Value -is [System.Collections.IEnumerable]) {
        return @($Value).Count
    }

    return 1
}

function Compare-OptionalValue {
    param(
        $Expected,
        $Actual
    )

    if ($null -eq $Expected -and $null -eq $Actual) {
        return $true
    }

    return (Convert-ValueToJson $Expected) -eq (Convert-ValueToJson $Actual)
}

function Get-TableComparison {
    param(
        $Expected,
        $Actual
    )

    if ($null -eq $Actual) {
        return [pscustomobject]@{
            Found = $false
            StructureMatch = $false
            PayloadMatch = $false
            DimensionMatch = $false
            XValuesMatch = $false
            YValuesMatch = $false
            ValuesMatch = $false
            Expected = [pscustomobject]@{
                TableDimension = $Expected.tableDimension
                XCount = Get-ListCount $Expected.xValues
                YCount = Get-ListCount $Expected.yValues
                ValueCount = Get-ListCount $Expected.values
            }
            Actual = $null
        }
    }

    $dimensionMatch = Compare-OptionalValue $Expected.tableDimension $Actual.tableDimension
    $xValuesMatch = Compare-OptionalValue $Expected.xValues $Actual.xValues
    $yValuesMatch = Compare-OptionalValue $Expected.yValues $Actual.yValues
    $valuesMatch = Compare-OptionalValue $Expected.values $Actual.values

    $expectedXCount = Get-ListCount $Expected.xValues
    $expectedYCount = Get-ListCount $Expected.yValues
    $expectedValueCount = Get-ListCount $Expected.values
    $actualXCount = Get-ListCount $Actual.xValues
    $actualYCount = Get-ListCount $Actual.yValues
    $actualValueCount = Get-ListCount $Actual.values

    $structureMatch = $dimensionMatch -and
        $expectedXCount -eq $actualXCount -and
        $expectedYCount -eq $actualYCount -and
        $expectedValueCount -eq $actualValueCount

    if ($dimensionMatch -and $Expected.tableDimension -eq '2d') {
        $expectedInnerCounts = @()
        foreach ($row in @($Expected.values)) {
            $expectedInnerCounts += Get-ListCount $row
        }

        $actualInnerCounts = @()
        foreach ($row in @($Actual.values)) {
            $actualInnerCounts += Get-ListCount $row
        }

        $structureMatch = $structureMatch -and
            ((Convert-ValueToJson $expectedInnerCounts) -eq (Convert-ValueToJson $actualInnerCounts))
    }

    return [pscustomobject]@{
        Found = $true
        StructureMatch = $structureMatch
        PayloadMatch = ($dimensionMatch -and $xValuesMatch -and $yValuesMatch -and $valuesMatch)
        DimensionMatch = $dimensionMatch
        XValuesMatch = $xValuesMatch
        YValuesMatch = $yValuesMatch
        ValuesMatch = $valuesMatch
        Expected = [pscustomobject]@{
            TableDimension = $Expected.tableDimension
            XCount = $expectedXCount
            YCount = $expectedYCount
            ValueCount = $expectedValueCount
            XValues = $Expected.xValues
            YValues = $Expected.yValues
            Values = $Expected.values
        }
        Actual = [pscustomobject]@{
            TableDimension = $Actual.tableDimension
            XCount = $actualXCount
            YCount = $actualYCount
            ValueCount = $actualValueCount
            XValues = $Actual.xValues
            YValues = $Actual.yValues
            Values = $Actual.values
        }
    }
}

function Get-TableCategory {
    param(
        [Parameter(Mandatory = $true)]
        $CatalogRead1Comparison,

        [Parameter(Mandatory = $true)]
        $CatalogRead2Comparison,

        $PostRestartComparison,

        [switch]$RestartIncluded
    )

    $preRestartPayloadMatch = $CatalogRead1Comparison.PayloadMatch -and $CatalogRead2Comparison.PayloadMatch
    $anyStructureMatch = $CatalogRead1Comparison.StructureMatch -or $CatalogRead2Comparison.StructureMatch

    if ($RestartIncluded) {
        if ($null -ne $PostRestartComparison) {
            if ($PostRestartComparison.PayloadMatch) {
                return 'D3'
            }

            if ($preRestartPayloadMatch) {
                return 'D2'
            }

            if ($anyStructureMatch -or $PostRestartComparison.StructureMatch) {
                return 'D1'
            }
        }

        return 'D0'
    }

    if ($preRestartPayloadMatch) {
        return 'pending_restart'
    }

    if ($anyStructureMatch) {
        return 'D1'
    }

    return 'D0'
}

function Get-CaseEnvironment {
    param(
        $Case
    )

    $environment = @{}
    if ($null -eq $Case.env) {
        return $environment
    }

    foreach ($property in $Case.env.PSObject.Properties) {
        $environment[$property.Name] = [string]$property.Value
    }

    return $environment
}

function Invoke-CapturedProcess {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path,

        [Parameter(Mandatory = $true)]
        [string[]]$Arguments,

        [Parameter(Mandatory = $true)]
        [string]$CaseDirectory,

        [Parameter(Mandatory = $true)]
        [string]$StepName,

        [hashtable]$Environment = @{}
    )

    $stdoutPath = Join-Path $CaseDirectory ($StepName + '.stdout.txt')
    $stderrPath = Join-Path $CaseDirectory ($StepName + '.stderr.txt')
    $savedEnvironment = @{}

    foreach ($name in $Environment.Keys) {
        $existing = Get-Item -Path ("Env:" + $name) -ErrorAction SilentlyContinue
        $savedEnvironment[$name] = if ($null -eq $existing) { $null } else { $existing.Value }
        Set-Item -Path ("Env:" + $name) -Value $Environment[$name]
    }

    try {
        $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
        $process = Start-Process `
            -FilePath $Path `
            -ArgumentList $Arguments `
            -WorkingDirectory $Script:RepoRoot `
            -Wait `
            -PassThru `
            -RedirectStandardOutput $stdoutPath `
            -RedirectStandardError $stderrPath
        $stopwatch.Stop()
    }
    finally {
        foreach ($name in $Environment.Keys) {
            if ($null -eq $savedEnvironment[$name]) {
                Remove-Item -Path ("Env:" + $name) -ErrorAction SilentlyContinue
            }
            else {
                Set-Item -Path ("Env:" + $name) -Value $savedEnvironment[$name]
            }
        }
    }

    $stdout = if (Test-Path $stdoutPath) { Get-Content $stdoutPath -Raw } else { '' }
    $stderr = if (Test-Path $stderrPath) { Get-Content $stderrPath -Raw } else { '' }

    return [pscustomobject]@{
        Path = $Path
        Arguments = $Arguments
        ExitCode = $process.ExitCode
        ElapsedMs = $stopwatch.ElapsedMilliseconds
        StdOutPath = $stdoutPath
        StdErrPath = $stderrPath
        StdOut = $stdout
        StdErr = $stderr
    }
}

function Invoke-ElementApply {
    param(
        [Parameter(Mandatory = $true)]
        [string]$ApplyExe,

        [Parameter(Mandatory = $true)]
        [string]$ComponentPath,

        [Parameter(Mandatory = $true)]
        [string]$SpecPath,

        [Parameter(Mandatory = $true)]
        [string]$CaseDirectory,

        [Parameter(Mandatory = $true)]
        [string]$StepName,

        [hashtable]$Environment = @{}
    )

    $arguments = @(
        $ComponentPath,
        $SpecPath,
        '--mode',
        'restore',
        '--delete-missing',
        '--verify-readback',
        '--json'
    )

    return Invoke-CapturedProcess -Path $ApplyExe -Arguments $arguments -CaseDirectory $CaseDirectory -StepName $StepName -Environment $Environment
}

function Invoke-CatalogRead {
    param(
        [Parameter(Mandatory = $true)]
        [string]$ReadCatalogExe,

        [Parameter(Mandatory = $true)]
        [string]$ComponentPath,

        [Parameter(Mandatory = $true)]
        [string]$ElementName,

        [Parameter(Mandatory = $true)]
        [string]$CaseDirectory,

        [Parameter(Mandatory = $true)]
        [string]$StepName,

        [hashtable]$Environment = @{}
    )

    $result = Invoke-CapturedProcess -Path $ReadCatalogExe -Arguments @($ComponentPath, '--json') -CaseDirectory $CaseDirectory -StepName $StepName -Environment $Environment
    $catalog = $null
    $element = $null
    $parseError = $null

    if ($result.ExitCode -eq 0 -and -not [string]::IsNullOrWhiteSpace($result.StdOut)) {
        try {
            $catalog = $result.StdOut | ConvertFrom-Json
            if ($null -ne $catalog -and $null -ne $catalog.elements) {
                $element = @($catalog.elements | Where-Object { $_.name -eq $ElementName }) | Select-Object -First 1
            }
        }
        catch {
            $parseError = $_.Exception.Message
        }
    }

    return [pscustomobject]@{
        Process = $result
        Catalog = $catalog
        Element = $element
        ParseError = $parseError
    }
}

function Write-JsonFile {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path,

        [Parameter(Mandatory = $true)]
        $Value
    )

    $json = $Value | ConvertTo-Json -Depth 32
    Set-Content -Path $Path -Value $json -Encoding ASCII
}

function Write-CaseSummaryText {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path,

        [Parameter(Mandatory = $true)]
        $Summary
    )

    $lines = @()
    $lines += ('Case: ' + $Summary.CaseId)
    $lines += ('Description: ' + $Summary.Description)
    $lines += ('VerificationTargetLabel: ' + $Summary.VerificationTargetLabel)
    $lines += ('Dimension: ' + $Summary.Dimension)
    $lines += ('Target: ' + $Summary.Target)
    $lines += ('Operation: ' + $Summary.Operation)
    $lines += ('Category: ' + $Summary.Category)
    $lines += ('ComponentPath: ' + $Summary.ComponentPath)
    $lines += ('SpecFile: ' + $Summary.SpecFile)
    if (-not [string]::IsNullOrWhiteSpace($Summary.SetupSpecFile)) {
        $lines += ('SetupSpecFile: ' + $Summary.SetupSpecFile)
    }
    $lines += ('ApplyExitCode: ' + $Summary.Apply.ExitCode)
    $lines += ('ApplyElapsedMs: ' + $Summary.Apply.ElapsedMs)
    $lines += ('CatalogRead1PayloadMatch: ' + $Summary.CatalogRead1Comparison.PayloadMatch)
    $lines += ('CatalogRead2PayloadMatch: ' + $Summary.CatalogRead2Comparison.PayloadMatch)
    if ($null -ne $Summary.PostRestartComparison) {
        $lines += ('PostRestartPayloadMatch: ' + $Summary.PostRestartComparison.PayloadMatch)
    }

    Set-Content -Path $Path -Value ($lines -join [Environment]::NewLine) -Encoding ASCII
}

$matrix = Read-MatrixDefinition -Path $MatrixPath
$selectedCases = Select-MatrixCases -Matrix $matrix -SelectedIds $CaseId

if ($ListCases) {
    @($selectedCases) |
        Select-Object id, dimension, target, operation, description |
        Format-Table -AutoSize
    return
}

$verificationTargets = Normalize-VerificationTargets -ComponentPaths $ComponentPath -TargetLabels $TargetLabel

$binaries = Ensure-TableVerificationBinaries -Build:$BuildBinaries

Ensure-Directory $OutputRoot
$runDirectory = Join-Path $OutputRoot (Get-Date -Format 'yyyyMMdd_HHmmss')
Ensure-Directory $runDirectory

$matrixDirectory = Split-Path -Parent $MatrixPath
$runSummaries = New-Object System.Collections.Generic.List[object]

Write-Host ("Running {0} table durable write case(s) serially across {1} verification target(s)" -f @($selectedCases).Count, @($verificationTargets).Count)

foreach ($verificationTarget in @($verificationTargets)) {
    $targetDirectory = Join-Path $runDirectory $verificationTarget.Label
    Ensure-Directory $targetDirectory

    Write-Host ("Target [{0}] -> {1}" -f $verificationTarget.Label, $verificationTarget.ComponentPath)

    foreach ($case in @($selectedCases)) {
        $caseDirectory = Join-Path $targetDirectory $case.id
        Ensure-Directory $caseDirectory

        $environment = Get-CaseEnvironment -Case $case
        $specPath = Join-Path $matrixDirectory $case.specFile
        $setupSpecPath = if ([string]::IsNullOrWhiteSpace([string]$case.setupSpecFile)) { $null } else { Join-Path $matrixDirectory $case.setupSpecFile }
        $expectedElement = Read-SpecElement -SpecPath $specPath

        Write-Host ("  [{0}] {1}" -f $case.id, $case.description)

        $setupApply = $null
        if ($null -ne $setupSpecPath) {
            Write-Host ("    setup -> {0}" -f $case.setupSpecFile)
            $setupApply = Invoke-ElementApply `
                -ApplyExe $binaries.ApplyExe `
                -ComponentPath $verificationTarget.ComponentPath `
                -SpecPath $setupSpecPath `
                -CaseDirectory $caseDirectory `
                -StepName 'setup-apply' `
                -Environment @{}
        }

        $applyResult = Invoke-ElementApply `
            -ApplyExe $binaries.ApplyExe `
            -ComponentPath $verificationTarget.ComponentPath `
            -SpecPath $specPath `
            -CaseDirectory $caseDirectory `
            -StepName 'apply' `
            -Environment $environment

        $catalogRead1 = Invoke-CatalogRead `
            -ReadCatalogExe $binaries.ReadCatalogExe `
            -ComponentPath $verificationTarget.ComponentPath `
            -ElementName $expectedElement.name `
            -CaseDirectory $caseDirectory `
            -StepName 'catalog-read-1' `
            -Environment @{}

        $catalogRead2 = Invoke-CatalogRead `
            -ReadCatalogExe $binaries.ReadCatalogExe `
            -ComponentPath $verificationTarget.ComponentPath `
            -ElementName $expectedElement.name `
            -CaseDirectory $caseDirectory `
            -StepName 'catalog-read-2' `
            -Environment @{}

        $catalogRead1Comparison = Get-TableComparison -Expected $expectedElement -Actual $catalogRead1.Element
        $catalogRead2Comparison = Get-TableComparison -Expected $expectedElement -Actual $catalogRead2.Element

        $postRestartRead = $null
        $postRestartComparison = $null
        if ($IncludeRestartGate) {
            Write-Host ("    restart gate -> close ASCET completely, reopen the project, then press Enter for target {0} case {1}" -f $verificationTarget.Label, $case.id)
            [void](Read-Host "    press Enter when ASCET is ready")

            $postRestartRead = Invoke-CatalogRead `
                -ReadCatalogExe $binaries.ReadCatalogExe `
                -ComponentPath $verificationTarget.ComponentPath `
                -ElementName $expectedElement.name `
                -CaseDirectory $caseDirectory `
                -StepName 'catalog-read-post-restart' `
                -Environment @{}

            $postRestartComparison = Get-TableComparison -Expected $expectedElement -Actual $postRestartRead.Element
        }

        $category = Get-TableCategory `
            -CatalogRead1Comparison $catalogRead1Comparison `
            -CatalogRead2Comparison $catalogRead2Comparison `
            -PostRestartComparison $postRestartComparison `
            -RestartIncluded:$IncludeRestartGate

        $summary = [pscustomobject]@{
            CaseId = $case.id
            Description = $case.description
            VerificationTargetLabel = $verificationTarget.Label
            Dimension = $case.dimension
            Target = $case.target
            Operation = $case.operation
            Category = $category
            ComponentPath = $verificationTarget.ComponentPath
            SpecFile = $case.specFile
            SetupSpecFile = $case.setupSpecFile
            Environment = $environment
            ExpectedElement = $expectedElement
            SetupApply = $setupApply
            Apply = $applyResult
            CatalogRead1 = $catalogRead1
            CatalogRead2 = $catalogRead2
            CatalogRead1Comparison = $catalogRead1Comparison
            CatalogRead2Comparison = $catalogRead2Comparison
            PostRestartRead = $postRestartRead
            PostRestartComparison = $postRestartComparison
        }

        Write-JsonFile -Path (Join-Path $caseDirectory 'summary.json') -Value $summary
        Write-CaseSummaryText -Path (Join-Path $caseDirectory 'summary.txt') -Summary $summary
        $runSummaries.Add($summary) | Out-Null

        Write-Host ("    result -> {0}" -f $category)
    }
}

$runSummary = [pscustomobject]@{
    GeneratedAt = (Get-Date).ToString('s')
    VerificationTargets = $verificationTargets
    MatrixPath = $MatrixPath
    OutputDirectory = $runDirectory
    IncludeRestartGate = [bool]$IncludeRestartGate
    Cases = $runSummaries
}

Write-JsonFile -Path (Join-Path $runDirectory 'run-summary.json') -Value $runSummary

$runSummaries |
    Select-Object VerificationTargetLabel, CaseId, Dimension, Target, Operation, Category |
    Format-Table -AutoSize

Write-Host ("Table durable write results written to {0}" -f $runDirectory)
