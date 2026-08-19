# Compile and run the focused editability test without the full ASCET production source closure.
[CmdletBinding()]
param(
    [Parameter(Mandatory = $false)]
    [string]$TestSource = 'ascetcli/tests/AscetComponentEditableTcmOutputTest.cs',

    [Parameter(Mandatory = $false)]
    [string]$MainType = 'AscetComponentEditableTcmOutputTest'
)

$ErrorActionPreference = 'Stop'
. "$PSScriptRoot\ascet-csharp-common.ps1"

$repositoryRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$resolvedTestSource = [System.IO.Path]::GetFullPath((Join-Path $repositoryRoot $TestSource))
$productionSource = [System.IO.Path]::GetFullPath((Join-Path $repositoryRoot 'ascetcli\src\AscetCli\AscetComponentEditable.cs'))
$tempParent = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath())
$tempRoot = Join-Path $tempParent ('ascet-component-editable-focused-' + [System.Guid]::NewGuid().ToString('N'))

function Assert-PathInside {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)][string]$Parent
    )

    $resolvedParent = [System.IO.Path]::GetFullPath($Parent).TrimEnd('\') + '\'
    $resolvedPath = [System.IO.Path]::GetFullPath($Path)
    if (-not $resolvedPath.StartsWith($resolvedParent, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "Refusing filesystem operation outside '$resolvedParent': '$resolvedPath'."
    }
}

function Remove-VerifiedTempRoot {
    param([Parameter(Mandatory = $true)][string]$Path)

    if (Test-Path -LiteralPath $Path) {
        Assert-PathInside -Path $Path -Parent $tempParent
        [System.IO.Directory]::Delete($Path, $true)
    }
}

try {
    Assert-AscetToolchain
    if (-not (Test-Path -LiteralPath $resolvedTestSource -PathType Leaf)) {
        throw "Focused test source does not exist: '$resolvedTestSource'."
    }
    if (-not (Test-Path -LiteralPath $productionSource -PathType Leaf)) {
        throw "Focused production source does not exist: '$productionSource'."
    }
    if (Test-Path -LiteralPath $tempRoot) {
        throw "Focused output directory already exists: '$tempRoot'."
    }

    Ensure-Directory -Path $tempRoot
    Assert-PathInside -Path $tempRoot -Parent $tempParent
    $outputPath = Join-Path $tempRoot ($MainType + '.exe')
    Assert-PathInside -Path $outputPath -Parent $tempRoot

    Invoke-AscetCsc `
        -OutputPath $outputPath `
        -MainType $MainType `
        -Sources @($productionSource, $resolvedTestSource) `
        -References (Get-AscetReferences -IncludeWebExtensions)
    Publish-AscetRuntimeSupport -OutputDirectory $tempRoot

    $runOutput = & $outputPath 2>&1
    $exitCode = $LASTEXITCODE
    if ($runOutput) {
        [Console]::Out.WriteLine(($runOutput | Out-String).TrimEnd())
    }
    if ($exitCode -ne 0) {
        throw "Focused editability test failed with exit code $exitCode."
    }

    [Console]::Error.WriteLine('FOCUSED_COMPONENT_EDITABLE_RESULT: PASS')
    exit 0
}
catch {
    [Console]::Error.WriteLine("Focused editability runner failed: $($_.Exception.Message)")
    exit 1
}
finally {
    try {
        Remove-VerifiedTempRoot -Path $tempRoot
    }
    catch {
        [Console]::Error.WriteLine("Focused editability runner cleanup failed: $($_.Exception.Message)")
    }
}