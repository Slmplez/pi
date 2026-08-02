param(
  [string]$AscetAgentRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..\..')).Path
)

$ErrorActionPreference = 'Stop'

$packageRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$contractsSource = Join-Path $AscetAgentRoot 'src\ascetcli\contracts'
$binSource = Join-Path $AscetAgentRoot 'src\ascetcli\output\ascet-csharp\bin'
$contractsTarget = Join-Path $packageRoot 'ascet-cli\contracts'
$binTarget = Join-Path $packageRoot 'ascet-cli\bin'
$internalBinSource = Join-Path $packageRoot 'ascet-cli\internal-bin'

function Clear-PackageAssetDirectory {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path,
    [Parameter(Mandatory = $true)]
    [string]$PackageRoot
  )

  New-Item -ItemType Directory -Force -Path $Path | Out-Null
  $resolvedPath = (Resolve-Path $Path).Path
  $resolvedPackageRoot = (Resolve-Path $PackageRoot).Path
  if (-not $resolvedPath.StartsWith($resolvedPackageRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Refusing to clear path outside package root: $resolvedPath"
  }

  Get-ChildItem -LiteralPath $resolvedPath -Force | Remove-Item -Recurse -Force
}

if (-not (Test-Path (Join-Path $contractsSource 'cli-catalog.json'))) {
  throw "ASCET contracts source is missing cli-catalog.json: $contractsSource"
}

if (-not (Test-Path (Join-Path $binSource 'AscetCli.exe'))) {
  throw "ASCET CLI source is missing AscetCli.exe: $binSource"
}

Clear-PackageAssetDirectory -Path $contractsTarget -PackageRoot $packageRoot
Clear-PackageAssetDirectory -Path $binTarget -PackageRoot $packageRoot

Copy-Item -Path (Join-Path $contractsSource '*') -Destination $contractsTarget -Recurse -Force
Copy-Item -Path (Join-Path $binSource '*') -Destination $binTarget -Recurse -Force
if (Test-Path -LiteralPath $internalBinSource) {
  Copy-Item -Path (Join-Path $internalBinSource '*') -Destination $binTarget -Recurse -Force
}
Get-ChildItem -Path $binTarget -Recurse -File -Include *.log,*.out,*.err |
  Remove-Item -Force

Write-Host "Copied ASCET contracts to $contractsTarget"
Write-Host "Copied ASCET binaries to $binTarget"
