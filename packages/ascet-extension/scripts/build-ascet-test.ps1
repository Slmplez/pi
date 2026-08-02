param(
  [string]$Configuration = 'Debug'
)

$ErrorActionPreference = 'Stop'

$packageRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$sourceRoot = Join-Path $packageRoot 'ascet-cli\source\AscetTest'
$internalBin = Join-Path $packageRoot 'ascet-cli\internal-bin'
$publicBin = Join-Path $packageRoot 'ascet-cli\bin'
$outputPath = Join-Path $internalBin 'AscetTest.exe'
$publishedPath = Join-Path $publicBin 'AscetTest.exe'
$cscPath = 'C:\Windows\Microsoft.NET\Framework\v4.0.30319\csc.exe'
$frameworkDirectory = Split-Path -Parent $cscPath

if (-not (Test-Path -LiteralPath $cscPath)) {
  throw "C# compiler not found: $cscPath"
}

foreach ($required in @('Program.cs', 'CommandLine.cs', 'Contracts.cs', 'ActionDispatcher.cs')) {
  $sourcePath = Join-Path $sourceRoot $required
  if (-not (Test-Path -LiteralPath $sourcePath)) {
    throw "AscetTest source is missing: $sourcePath"
  }
}

New-Item -ItemType Directory -Force -Path $internalBin, $publicBin | Out-Null

$arguments = @(
  '/nologo',
  '/platform:x86',
  '/target:exe',
  "/out:$outputPath",
  '/main:AscetTestProgram',
  "/r:$(Join-Path $frameworkDirectory 'System.Web.Extensions.dll')",
  "/r:$(Join-Path $frameworkDirectory 'System.Xml.dll')"
)
$arguments += Get-ChildItem -LiteralPath $sourceRoot -Filter '*.cs' -File | Sort-Object Name | Select-Object -ExpandProperty FullName

& $cscPath @arguments
if ($LASTEXITCODE -ne 0) {
  throw "AscetTest.exe compilation failed with exit code $LASTEXITCODE."
}

Copy-Item -LiteralPath $outputPath -Destination $publishedPath -Force
Write-Host "Built internal AscetTest.exe: $publishedPath"
