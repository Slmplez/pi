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
$expectedBinFiles = @('AscetBridge.exe', 'Ascetapidll\Etas.AscetNET.dll')

function Clear-PackageAssetDirectory {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][string]$PackageRoot
  )

  New-Item -ItemType Directory -Force -Path $Path | Out-Null
  $resolvedPath = [IO.Path]::GetFullPath((Resolve-Path $Path).Path)
  $resolvedPackageRoot = [IO.Path]::GetFullPath((Resolve-Path $PackageRoot).Path).TrimEnd('\') + '\'
  if (-not ($resolvedPath + '\').StartsWith($resolvedPackageRoot, [StringComparison]::OrdinalIgnoreCase)) {
    throw "Refusing to clear path outside package root: $resolvedPath"
  }

  Get-ChildItem -LiteralPath $resolvedPath -Force | ForEach-Object {
    Remove-Item -LiteralPath $_.FullName -Recurse -Force
  }
}

function Get-RelativeAssetFiles {
  param([Parameter(Mandatory = $true)][string]$Root)

  return @(
    Get-ChildItem -LiteralPath $Root -Recurse -File | ForEach-Object {
      $_.FullName.Substring($Root.Length).TrimStart('\')
    } | Sort-Object
  )
}

function Assert-BridgeBinAllowlist {
  param([Parameter(Mandatory = $true)][string]$Root)

  $actual = Get-RelativeAssetFiles -Root $Root
  $missing = @($expectedBinFiles | Where-Object { $_ -notin $actual })
  $unexpected = @($actual | Where-Object { $_ -notin $expectedBinFiles })
  if ($actual.Count -ne 2 -or $missing.Count -gt 0 -or $unexpected.Count -gt 0) {
    throw "ASCET Bridge asset allowlist mismatch in '$Root'. Missing: [$($missing -join ', ')]. Unexpected: [$($unexpected -join ', ')]."
  }
}

if (-not (Test-Path (Join-Path $contractsSource 'cli-catalog.json'))) {
  throw "ASCET contracts source is missing cli-catalog.json: $contractsSource"
}
Assert-BridgeBinAllowlist -Root $binSource

Clear-PackageAssetDirectory -Path $contractsTarget -PackageRoot $packageRoot
Clear-PackageAssetDirectory -Path $binTarget -PackageRoot $packageRoot

Copy-Item -Path (Join-Path $contractsSource '*') -Destination $contractsTarget -Recurse -Force
Copy-Item -LiteralPath (Join-Path $binSource 'AscetBridge.exe') -Destination (Join-Path $binTarget 'AscetBridge.exe') -Force
$runtimeTarget = Join-Path $binTarget 'Ascetapidll'
New-Item -ItemType Directory -Force -Path $runtimeTarget | Out-Null
Copy-Item -LiteralPath (Join-Path $binSource 'Ascetapidll\Etas.AscetNET.dll') -Destination (Join-Path $runtimeTarget 'Etas.AscetNET.dll') -Force
Assert-BridgeBinAllowlist -Root $binTarget
$sourceBridgeHash = (Get-FileHash -LiteralPath (Join-Path $binSource 'AscetBridge.exe') -Algorithm SHA256).Hash
$targetBridgeHash = (Get-FileHash -LiteralPath (Join-Path $binTarget 'AscetBridge.exe') -Algorithm SHA256).Hash
$sourceToolApiHash = (Get-FileHash -LiteralPath (Join-Path $binSource 'Ascetapidll\Etas.AscetNET.dll') -Algorithm SHA256).Hash
$targetToolApiHash = (Get-FileHash -LiteralPath (Join-Path $binTarget 'Ascetapidll\Etas.AscetNET.dll') -Algorithm SHA256).Hash
if ($sourceBridgeHash -ne $targetBridgeHash -or $sourceToolApiHash -ne $targetToolApiHash) {
  throw 'Copied ASCET Bridge asset hashes do not match their reviewed source artifacts.'
}


Write-Host "Copied ASCET contracts to $contractsTarget"
Write-Host "Copied strict ASCET Bridge assets to $binTarget (1 EXE + 1 DLL)"
