param(
  [string]$RepoRoot = (Resolve-Path "$PSScriptRoot\..").Path,
  [string]$PiRuntimeDir = "E:\Rep\pi-windows-x64",
  [string]$OutDir = "",
  [string]$ArchivePath = "",
  [switch]$Force,
  [switch]$NoArchive,
  [switch]$SkipSmoke
)

$ErrorActionPreference = "Stop"

function Resolve-FullPath([string]$Path) {
  $executionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($Path)
}

function Copy-DirectoryClean {
  param(
    [Parameter(Mandatory = $true)][string]$Source,
    [Parameter(Mandatory = $true)][string]$Destination,
    [string[]]$ExcludeDirs = @(),
    [string[]]$ExcludeFiles = @()
  )

  if (-not (Test-Path -LiteralPath $Source)) {
    throw "Source directory not found: $Source"
  }

  New-Item -ItemType Directory -Path $Destination -Force | Out-Null

  $robocopyArgs = @($Source, $Destination, "/E", "/NFL", "/NDL", "/NJH", "/NJS", "/NP")
  if ($ExcludeDirs.Count -gt 0) {
    $robocopyArgs += "/XD"
    $robocopyArgs += $ExcludeDirs
  }
  if ($ExcludeFiles.Count -gt 0) {
    $robocopyArgs += "/XF"
    $robocopyArgs += $ExcludeFiles
  }

  & robocopy @robocopyArgs | Out-Host
  if ($LASTEXITCODE -gt 7) {
    throw "robocopy failed with exit code $LASTEXITCODE while copying $Source"
  }
}

$repoRoot = Resolve-FullPath $RepoRoot
$piRuntimeDir = Resolve-FullPath $PiRuntimeDir

$packageJsonPath = Join-Path $repoRoot "package.json"
if (-not (Test-Path -LiteralPath $packageJsonPath)) {
  throw "package.json not found: $packageJsonPath"
}

$packageJson = Get-Content -LiteralPath $packageJsonPath -Raw | ConvertFrom-Json
if ($packageJson.name -ne "pi-monorepo") {
  throw "Run this script against the PI repo root. Found package name '$($packageJson.name)' at $packageJsonPath"
}

$piExe = Join-Path $piRuntimeDir "pi.exe"
if (-not (Test-Path -LiteralPath $piExe)) {
  throw "pi.exe not found in Pi runtime directory: $piRuntimeDir"
}

$requiredPaths = @(
  ".pi\settings.json",
  "packages\ascet-extension\package.json",
  "packages\Pi-ascet-ui-extension\package.json"
)

foreach ($relativePath in $requiredPaths) {
  $path = Join-Path $repoRoot $relativePath
  if (-not (Test-Path -LiteralPath $path)) {
    throw "Required release input missing: $path"
  }
}

if ([string]::IsNullOrWhiteSpace($OutDir)) {
  $OutDir = Join-Path $repoRoot "dist-release"
}

$outDirFull = Resolve-FullPath $OutDir
$releaseName = "ascet-copilot-pi-windows-x64"
$releaseDir = Join-Path $outDirFull $releaseName

if (Test-Path -LiteralPath $releaseDir) {
  if (-not $Force) {
    throw "Release directory already exists. Use -Force to replace it: $releaseDir"
  }
  Remove-Item -LiteralPath $releaseDir -Recurse -Force
}

New-Item -ItemType Directory -Path $releaseDir -Force | Out-Null

Write-Host "Copying Pi runtime from $piRuntimeDir"
Copy-DirectoryClean -Source $piRuntimeDir -Destination $releaseDir

Write-Host "Copying ASCET project configuration"
Copy-DirectoryClean `
  -Source (Join-Path $repoRoot ".pi") `
  -Destination (Join-Path $releaseDir ".pi") `
  -ExcludeDirs @("git") `
  -ExcludeFiles @("*.log", "*.tmp")

$releasePackagesDir = Join-Path $releaseDir "packages"
New-Item -ItemType Directory -Path $releasePackagesDir -Force | Out-Null

Write-Host "Copying ASCET tool extension"
Copy-DirectoryClean `
  -Source (Join-Path $repoRoot "packages\ascet-extension") `
  -Destination (Join-Path $releasePackagesDir "ascet-extension") `
  -ExcludeDirs @("node_modules", "tmp", "dist", ".git") `
  -ExcludeFiles @("*.log", "*.out", "*.err", "*.tsbuildinfo")

Write-Host "Copying ASCET UI extension"
Copy-DirectoryClean `
  -Source (Join-Path $repoRoot "packages\Pi-ascet-ui-extension") `
  -Destination (Join-Path $releasePackagesDir "Pi-ascet-ui-extension") `
  -ExcludeDirs @("node_modules", "tmp", "dist", ".git") `
  -ExcludeFiles @("*.log", "*.out", "*.err", "*.tsbuildinfo")

$cmdLauncher = @'
@echo off
setlocal
set "ROOT=%~dp0"
cd /d "%ROOT%"
"%ROOT%pi.exe" %*
exit /b %ERRORLEVEL%
'@
Set-Content -LiteralPath (Join-Path $releaseDir "pi.cmd") -Value $cmdLauncher -Encoding ASCII

$psLauncher = @'
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location -LiteralPath $root
& (Join-Path $root "pi.exe") @args
exit $LASTEXITCODE
'@
Set-Content -LiteralPath (Join-Path $releaseDir "pi.ps1") -Value $psLauncher -Encoding UTF8

$readme = @"
# ASCET Copilot Pi Windows x64 Release

Run:

````powershell
.\pi.cmd
````

Useful checks:

````powershell
.\pi.cmd --help
.\pi.cmd --list-models
````

This package is based on the Pi Windows x64 runtime in:

````text
$piRuntimeDir
````

ASCET-specific resources are bundled in:

````text
.pi\settings.json
packages\ascet-extension
packages\Pi-ascet-ui-extension
````

The release keeps the same layout as the official `pi-windows-x64` runtime, then adds the ASCET packages beside it. Start through `pi.cmd` so the working directory is pinned to this release folder and project `.pi` settings are discovered.
"@
Set-Content -LiteralPath (Join-Path $releaseDir "README-RUN.md") -Value $readme -Encoding UTF8

$gitCommit = ""
try {
  $gitCommit = (& git -C $repoRoot rev-parse HEAD 2>$null).Trim()
} catch {
  $gitCommit = ""
}

$manifest = [ordered]@{
  name = "ascet-copilot-pi"
  platform = "windows-x64"
  piVersion = [string](Get-Content -LiteralPath (Join-Path $piRuntimeDir "package.json") -Raw | ConvertFrom-Json).version
  repoVersion = [string]$packageJson.version
  builtAt = (Get-Date).ToUniversalTime().ToString("o")
  gitCommit = $gitCommit
  piRuntimeDir = $piRuntimeDir
  entrypoints = @("pi.cmd", "pi.ps1", "pi.exe")
  bundledPaths = @(
    ".pi",
    "packages\ascet-extension",
    "packages\Pi-ascet-ui-extension"
  )
}

$manifestPath = Join-Path $releaseDir "RELEASE-MANIFEST.json"
$manifest | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $manifestPath -Encoding UTF8

if (-not $SkipSmoke) {
  Write-Host "Running release smoke: pi.cmd --help"
  & (Join-Path $releaseDir "pi.cmd") --help | Out-Host
  if ($LASTEXITCODE -ne 0) {
    throw "Release smoke failed: pi.cmd --help exited with $LASTEXITCODE"
  }
}

if (-not $NoArchive) {
  if ([string]::IsNullOrWhiteSpace($ArchivePath)) {
    $timestamp = Get-Date -Format "yyyyMMdd-HHmm"
    $ArchivePath = Join-Path $outDirFull "$releaseName-$timestamp.zip"
  }

  $archiveFull = Resolve-FullPath $ArchivePath
  if (Test-Path -LiteralPath $archiveFull) {
    if (-not $Force) {
      throw "Archive already exists. Use -Force to replace it: $archiveFull"
    }
    Remove-Item -LiteralPath $archiveFull -Force
  }

  Write-Host "Creating archive: $archiveFull"
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  [System.IO.Compression.ZipFile]::CreateFromDirectory(
    $releaseDir,
    $archiveFull,
    [System.IO.Compression.CompressionLevel]::Optimal,
    $false
  )
}

Write-Host ""
Write-Host "ASCET Copilot release created:"
Write-Host "  Directory: $releaseDir"
if (-not $NoArchive) {
  Write-Host "  Archive:   $archiveFull"
}
