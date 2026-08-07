param(
  [string]$AscetAgentRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..')).Path
)

$ErrorActionPreference = 'Stop'

$packageRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$resolvedAscetAgentRoot = (Resolve-Path $AscetAgentRoot).Path
$sourceRootCandidates = @(
  (Join-Path $resolvedAscetAgentRoot 'src\ascetcli'),
  (Join-Path $resolvedAscetAgentRoot 'ascetcli')
)
$ascetCliSourceRoot = $sourceRootCandidates | Where-Object {
  Test-Path (Join-Path $_ 'contracts\cli-catalog.json')
} | Select-Object -First 1
if (-not $ascetCliSourceRoot) {
  throw "ASCET source root must contain src\ascetcli or ascetcli with contracts\cli-catalog.json: $resolvedAscetAgentRoot"
}

$contractsSource = Join-Path $ascetCliSourceRoot 'contracts'
$binSource = Join-Path $ascetCliSourceRoot 'output\ascet-csharp\bin'
$contractsTarget = Join-Path $packageRoot 'ascet-cli\contracts'
$binTarget = Join-Path $packageRoot 'ascet-cli\bin'

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
Get-ChildItem -Path $contractsTarget -Recurse -File | ForEach-Object {
  $content = [IO.File]::ReadAllText($_.FullName)
  $normalized = [Text.RegularExpressions.Regex]::Replace($content, "`r?`n", "`r`n")
  [IO.File]::WriteAllText($_.FullName, $normalized, [Text.UTF8Encoding]::new($true))
}
Copy-Item -Path (Join-Path $binSource '*') -Destination $binTarget -Recurse -Force
Get-ChildItem -Path $binTarget -Recurse -File -Include *.log,*.out,*.err |
  Remove-Item -Force

Write-Host "Copied ASCET contracts to $contractsTarget"
Write-Host "Copied ASCET binaries to $binTarget"