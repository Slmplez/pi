param(
  [string]$AscetAgentRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..\..')).Path
)

$ErrorActionPreference = 'Stop'

$packageRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$contractsSource = Join-Path $AscetAgentRoot 'src\ascetcli\contracts'
$binSource = Join-Path $AscetAgentRoot 'src\ascetcli\output\ascet-csharp\bin'
$contractsTarget = Join-Path $packageRoot 'ascet-cli\contracts'
$binTarget = Join-Path $packageRoot 'ascet-cli\bin'

if (-not (Test-Path (Join-Path $contractsSource 'cli-catalog.json'))) {
  throw "ASCET contracts source is missing cli-catalog.json: $contractsSource"
}

if (-not (Test-Path (Join-Path $binSource 'AscetCli.exe'))) {
  throw "ASCET CLI source is missing AscetCli.exe: $binSource"
}

New-Item -ItemType Directory -Force -Path $contractsTarget | Out-Null
New-Item -ItemType Directory -Force -Path $binTarget | Out-Null

Copy-Item -Path (Join-Path $contractsSource '*') -Destination $contractsTarget -Recurse -Force
Copy-Item -Path (Join-Path $binSource '*') -Destination $binTarget -Recurse -Force
Get-ChildItem -Path $binTarget -Recurse -File -Include *.log,*.out,*.err |
  Remove-Item -Force

Write-Host "Copied ASCET contracts to $contractsTarget"
Write-Host "Copied ASCET binaries to $binTarget"
