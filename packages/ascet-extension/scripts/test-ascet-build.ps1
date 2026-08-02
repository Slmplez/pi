param()

$ErrorActionPreference = 'Stop'

$packageRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$buildScript = Join-Path $packageRoot 'scripts\build-ascet-test.ps1'
$exePath = Join-Path $packageRoot 'ascet-cli\bin\AscetTest.exe'
$outputRoot = Join-Path $packageRoot 'tmp\ascet-build-test'
$requestPath = Join-Path $outputRoot 'request.json'
$responsePath = Join-Path $outputRoot 'response.json'
$cSourcePath = Join-Path $outputRoot 'generated.c'

New-Item -ItemType Directory -Force -Path $outputRoot | Out-Null
@'
int ascet_fixture_value(void) { return 1; }
'@ | Set-Content -LiteralPath $cSourcePath -Encoding UTF8

$request = [ordered]@{
  schemaVersion = 'ascet-test-request/v1'
  runId = 'build-preflight'
  componentPath = 'Fixture/Class'
  levels = @('class_ut')
  runDirectory = $outputRoot
  contract = [ordered]@{
    schemaVersion = 'ascet-test-contract/v1'
    componentPath = 'Fixture/Class'
    suites = @(
      [ordered]@{
        id = 'Fixture_class_ut'
        level = 'class_ut'
        entryPoint = 'fixture'
        dependencyMode = 'stub'
        cases = @(
          [ordered]@{
            id = 'nominal'
            inputs = [ordered]@{}
            expectedOutputs = [ordered]@{ value = 1 }
            oracleSource = 'requirement'
          }
        )
      }
    )
  }
  generatedCSources = @($cSourcePath)
  adapterSource = @'
extern "C" int ascet_fixture_value(void);
extern "C" int ascet_test_run_case(const char*, const char*) {
  return ascet_fixture_value() == 1 ? 0 : 1;
}
'@
  toolchain = [ordered]@{
    gccPath = 'C:\\missing\\gcc.exe'
    gxxPath = 'C:\\missing\\g++.exe'
    googleTestRoot = 'C:\\missing\\googletest'
  }
}
$request | ConvertTo-Json -Depth 30 | Set-Content -LiteralPath $requestPath -Encoding UTF8

& $buildScript | Out-Null
if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $exePath)) {
  throw "AscetTest.exe was not built: $exePath"
}

& $exePath --action build --request $requestPath --out $responsePath --json 1>$null
if ($LASTEXITCODE -ne 2) {
  throw "Build preflight should return exit code 2 for a missing toolchain, got $LASTEXITCODE."
}
$response = Get-Content -LiteralPath $responsePath -Raw -Encoding UTF8 | ConvertFrom-Json
if ($response.ok -ne $false -or $response.status -ne 'blocked') {
  throw 'Build preflight did not return a blocked envelope.'
}
if ($response.error.code -ne 'toolchain_missing') {
  throw "Build preflight returned unexpected error code: $($response.error.code)"
}

Write-Host 'AscetTest BuildService preflight test passed.'
