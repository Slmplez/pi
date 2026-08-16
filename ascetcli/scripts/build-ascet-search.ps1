Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

. (Join-Path $PSScriptRoot 'ascet-csharp-common.ps1')

Assert-AscetToolchain
$outputDirectory = Get-RepoPath 'output\ascet-search'
Ensure-Directory $outputDirectory
$outputPath = Join-Path $outputDirectory 'AscetSearch.exe'
$sources = @(
    (Get-RepoPath 'src\AscetSearch\AscetSearch.cs'),
    (Get-RepoPath 'src\AscetSearch\AscetNativeSearchSession.cs')
)

Invoke-AscetCsc `
    -OutputPath $outputPath `
    -MainType 'AscetSearch' `
    -Sources $sources `
    -References (Get-AscetReferences)
Publish-AscetRuntimeSupport $outputDirectory

Write-Host "Built ASCET Search CLI: $outputPath"
