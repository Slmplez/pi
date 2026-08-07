. "$PSScriptRoot\ascet-csharp-common.ps1"

$binDir = Get-RepoPath 'output\ascet-csharp\bin'
$generatedDir = Get-RepoPath 'output\ascet-csharp\generated\compat-shims'
$shimGeneratorPath = Get-RepoPath 'src\AscetCli\Compat\LegacyShimGenerator.cs'

Assert-AscetToolchain
Ensure-Directory $binDir
Ensure-Directory $generatedDir

$cliPath = Join-Path $binDir 'AscetCli.exe'
if (-not (Test-Path $cliPath)) {
    throw "Missing '$cliPath'. Run scripts\build-ascet-csharp.ps1 before building compatibility shims."
}

if (-not (Test-Path $shimGeneratorPath)) {
    throw "Missing shim generator source '$shimGeneratorPath'."
}

function Write-LegacyShimSource {
    param(
        [Parameter(Mandatory = $true)]
        [LegacyShimDefinition]$Definition,

        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    $sourceText = [LegacyShimGenerator]::GenerateSource($Definition)
    Assert-FileAvailableForWrite -Path $Path -Operation 'write shim source to'
    [System.IO.File]::WriteAllText($Path, $sourceText, [System.Text.Encoding]::ASCII)
}

Add-Type -Path $shimGeneratorPath

$definitions = [LegacyShimGenerator]::GetShimDefinitions()
if ($definitions -eq $null -or $definitions.Length -eq 0) {
    throw "LegacyShimGenerator returned no shim definitions."
}

foreach ($definition in $definitions) {
    if ($definition -eq $null) {
        continue
    }

    if ([string]::IsNullOrWhiteSpace($definition.ProgramTypeName)) {
        throw "Legacy shim definition is missing ProgramTypeName."
    }

    if ([string]::IsNullOrWhiteSpace($definition.OutputFileName)) {
        throw "Legacy shim definition is missing OutputFileName."
    }

    $sourcePath = Join-Path $generatedDir ($definition.ProgramTypeName + '.generated.cs')
    Write-LegacyShimSource -Definition $definition -Path $sourcePath

    Invoke-AscetCsc `
        -OutputPath (Join-Path $binDir $definition.OutputFileName) `
        -MainType $definition.ProgramTypeName `
        -Sources @($shimGeneratorPath, $sourcePath) `
        -References @()
}

Write-Host ("Built {0} ASCET legacy compatibility shims into {1}" -f $definitions.Length, $binDir)
