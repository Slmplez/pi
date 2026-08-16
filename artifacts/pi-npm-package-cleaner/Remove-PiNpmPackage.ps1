[CmdletBinding(SupportsShouldProcess)]
param(
    [Parameter(Mandatory)]
    [ValidatePattern('^(?:@[a-zA-Z0-9._-]+/)?[a-zA-Z0-9._-]+$')]
    [string]$PackageName,
    [string]$PiAgentRoot = $(if ($env:PI_AGENT_DIR) { $env:PI_AGENT_DIR } else { Join-Path $HOME '.pi\agent' }),
    [switch]$SkipPiCheck
)

$ErrorActionPreference = 'Stop'

function Write-JsonFile {
    param([string]$Path, [object]$Value)
    $tempPath = "$Path.$([Guid]::NewGuid().ToString('N')).tmp"
    $json = $Value | ConvertTo-Json -Depth 100
    [IO.File]::WriteAllText($tempPath, $json + [Environment]::NewLine, [Text.UTF8Encoding]::new($false))
    [IO.File]::Copy($tempPath, $Path, $true)
    [IO.File]::Delete($tempPath)
}

function Invoke-LockfileNodeTool {
    param(
        [ValidateSet('remove', 'contains')][string]$Action,
        [string]$Path,
        [string]$Name
    )

    if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
        throw 'Node.js is required to update package-lock.json.'
    }

    $nodeSource = @"
const fs = require('fs');
const args = process.argv.slice(2);
const action = args[0];
const lockPath = args[1];
const packageName = args[2];
const lockText = fs.readFileSync(lockPath, 'utf8').replace(/^\uFEFF/, '');
const lock = JSON.parse(lockText);
const exact = 'node_modules/' + packageName;
const nestedPrefix = exact + '/node_modules/';
function removeDependencies(value) {
  if (!value || typeof value !== 'object') return;
  for (const section of ['dependencies', 'devDependencies', 'optionalDependencies']) {
    if (value[section] && typeof value[section] === 'object') delete value[section][packageName];
  }
}
function containsPackage() {
  if (lock.packages && typeof lock.packages === 'object') {
    if (Object.keys(lock.packages).some(key => key === exact || key.startsWith(nestedPrefix))) return true;
    if (lock.packages['']) {
      for (const section of ['dependencies', 'devDependencies', 'optionalDependencies']) {
        if (lock.packages[''][section] && lock.packages[''][section][packageName]) return true;
      }
    }
  }
  return Boolean(lock.dependencies && lock.dependencies[packageName]);
}
if (action === 'contains') process.exit(containsPackage() ? 0 : 1);
if (action !== 'remove') process.exit(2);
removeDependencies(lock);
if (lock.packages && typeof lock.packages === 'object') {
  removeDependencies(lock.packages['']);
  for (const key of Object.keys(lock.packages)) {
    if (key === exact || key.startsWith(nestedPrefix)) delete lock.packages[key];
  }
}
if (lock.dependencies && typeof lock.dependencies === 'object') delete lock.dependencies[packageName];
fs.writeFileSync(lockPath, JSON.stringify(lock, null, 2) + '\n', 'utf8');
"@

    $tempPath = Join-Path ([IO.Path]::GetTempPath()) "pi-lock-tool-$([Guid]::NewGuid().ToString('N')).cjs"
    [IO.File]::WriteAllText($tempPath, $nodeSource, [Text.UTF8Encoding]::new($false))
    try {
        & node $tempPath $Action $Path $Name
        $exitCode = $LASTEXITCODE
    }
    finally {
        if (Test-Path -LiteralPath $tempPath) { [IO.File]::Delete($tempPath) }
    }
    if ($Action -eq 'contains') { return $exitCode -eq 0 }
    if ($exitCode -ne 0) { throw "Failed to update package-lock.json; node exit code $exitCode" }
}

function Remove-DependencyDeclaration {
    param([object]$Manifest, [string]$Name)
    foreach ($section in 'dependencies', 'devDependencies', 'optionalDependencies') {
        $property = $Manifest.PSObject.Properties[$section]
        if ($null -ne $property -and $null -ne $property.Value) { $property.Value.PSObject.Properties.Remove($Name) }
    }
}

function Remove-SettingsPackage {
    param([object]$Settings, [string]$Name)
    $property = $Settings.PSObject.Properties['packages']
    if ($null -eq $property -or $null -eq $property.Value) { return }
    $property.Value = @($property.Value | Where-Object { $_ -ne "npm:$Name" -and $_ -ne $Name })
}

$piAgentRoot = [IO.Path]::GetFullPath($PiAgentRoot)
$npmRoot = Join-Path $piAgentRoot 'npm'
$nodeModulesRoot = Join-Path $npmRoot 'node_modules'
$packageJsonPath = Join-Path $npmRoot 'package.json'
$packageLockPath = Join-Path $npmRoot 'package-lock.json'
$settingsPath = Join-Path $piAgentRoot 'settings.json'
$packagePath = $nodeModulesRoot
foreach ($segment in $PackageName.Split('/')) { $packagePath = Join-Path $packagePath $segment }
$packagePath = [IO.Path]::GetFullPath($packagePath)

$nodeModulesPrefix = [IO.Path]::GetFullPath($nodeModulesRoot).TrimEnd('\') + '\'
if (-not $packagePath.StartsWith($nodeModulesPrefix, [StringComparison]::OrdinalIgnoreCase)) { throw "Refusing to access path outside node_modules: $packagePath" }
if (-not (Test-Path -LiteralPath $packageJsonPath)) { throw "Pi npm package.json was not found: $packageJsonPath" }

$manifest = Get-Content -LiteralPath $packageJsonPath -Raw | ConvertFrom-Json
$lockExists = Test-Path -LiteralPath $packageLockPath
$settingsExists = Test-Path -LiteralPath $settingsPath
$settings = if ($settingsExists) { Get-Content -LiteralPath $settingsPath -Raw | ConvertFrom-Json } else { $null }
$manifestHasPackage = @('dependencies', 'devDependencies', 'optionalDependencies') | Where-Object {
    $section = $manifest.PSObject.Properties[$_]
    $null -ne $section -and $null -ne $section.Value -and $null -ne $section.Value.PSObject.Properties[$PackageName]
}
$settingsHasPackage = $false
if ($null -ne $settings) {
    $packages = $settings.PSObject.Properties['packages']
    $settingsHasPackage = $null -ne $packages -and (@($packages.Value) -contains "npm:$PackageName" -or @($packages.Value) -contains $PackageName)
}
$installed = Test-Path -LiteralPath $packagePath

[pscustomobject]@{
    Package = $PackageName
    PiAgentRoot = $piAgentRoot
    ManifestEntry = [bool]$manifestHasPackage
    SettingsEntry = $settingsHasPackage
    LockfilePresent = $lockExists
    InstalledDirectory = $installed
} | Format-List

if (-not $manifestHasPackage -and -not $settingsHasPackage -and -not $installed) { Write-Host 'Nothing to clean.'; exit 0 }
if (-not $PSCmdlet.ShouldProcess($PackageName, 'Remove package from Pi npm environment and settings')) { exit 0 }

$backupRoot = Join-Path $npmRoot "cleanup-backup-$(Get-Date -Format yyyyMMdd-HHmmss)"
[IO.Directory]::CreateDirectory($backupRoot) | Out-Null
Copy-Item -LiteralPath $packageJsonPath -Destination (Join-Path $backupRoot 'package.json') -Force
if ($lockExists) { Copy-Item -LiteralPath $packageLockPath -Destination (Join-Path $backupRoot 'package-lock.json') -Force }
if ($settingsExists) { Copy-Item -LiteralPath $settingsPath -Destination (Join-Path $backupRoot 'settings.json') -Force }

try {
    Remove-DependencyDeclaration $manifest $PackageName
    Write-JsonFile $packageJsonPath $manifest
    if ($lockExists) { [void](Invoke-LockfileNodeTool -Action remove -Path $packageLockPath -Name $PackageName) }
    if ($null -ne $settings) { Remove-SettingsPackage $settings $PackageName; Write-JsonFile $settingsPath $settings }
    if (Test-Path -LiteralPath $packagePath) {
        Get-ChildItem -LiteralPath $packagePath -Recurse -Force -ErrorAction SilentlyContinue | ForEach-Object { $_.Attributes = 'Normal' }
        [IO.Directory]::Delete($packagePath, $true)
    }
    $scopePath = Join-Path $nodeModulesRoot ($PackageName.Split('/')[0])
    if ($PackageName.StartsWith('@') -and (Test-Path -LiteralPath $scopePath) -and @(Get-ChildItem -LiteralPath $scopePath -Force).Count -eq 0) { [IO.Directory]::Delete($scopePath) }
}
catch {
    Copy-Item -LiteralPath (Join-Path $backupRoot 'package.json') -Destination $packageJsonPath -Force
    if (Test-Path -LiteralPath (Join-Path $backupRoot 'package-lock.json')) { Copy-Item -LiteralPath (Join-Path $backupRoot 'package-lock.json') -Destination $packageLockPath -Force }
    if (Test-Path -LiteralPath (Join-Path $backupRoot 'settings.json')) { Copy-Item -LiteralPath (Join-Path $backupRoot 'settings.json') -Destination $settingsPath -Force }
    throw
}

$manifestAfter = Get-Content -LiteralPath $packageJsonPath -Raw
$settingsAfter = if (Test-Path -LiteralPath $settingsPath) { Get-Content -LiteralPath $settingsPath -Raw } else { '' }
$lockStillContains = $lockExists -and (Invoke-LockfileNodeTool -Action contains -Path $packageLockPath -Name $PackageName)
[pscustomobject]@{
    ManifestClean = $manifestAfter -notmatch [regex]::Escape($PackageName)
    SettingsClean = $settingsAfter -notmatch [regex]::Escape("npm:$PackageName")
    LockfileClean = -not $lockStillContains
    PackageDirectoryRemoved = -not (Test-Path -LiteralPath $packagePath)
    Backup = $backupRoot
} | Format-List
if ($lockStillContains -or (Test-Path -LiteralPath $packagePath)) { throw 'Cleanup verification failed.' }

if (-not $SkipPiCheck -and (Get-Command pi -ErrorAction SilentlyContinue)) {
    & pi --version
    if ($LASTEXITCODE -ne 0) { throw "Pi verification failed with exit code $LASTEXITCODE" }
}
Write-Host 'Cleanup completed.'


