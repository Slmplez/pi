$ErrorActionPreference = 'Stop'

$packageRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$cliPath = Join-Path $packageRoot 'ascet-cli\bin\AscetTest.exe'
$runDirectory = Join-Path $packageRoot 'tmp\ascet-build-live'
$buildResultPath = Join-Path $runDirectory 'build-result.json'
$requestPath = Join-Path $runDirectory 'run-request.json'
$responsePath = Join-Path $runDirectory 'run-response.json'
$runResultPath = Join-Path $runDirectory 'run-result.json'

if (-not (Test-Path -LiteralPath $cliPath)) { throw "AscetTest.exe is missing: $cliPath" }
if (-not (Test-Path -LiteralPath $buildResultPath)) { throw "Build result is missing: $buildResultPath" }

$request = [ordered]@{
  schemaVersion = 'ascet-test-request/v1'
  runId = 'ascet-run-live'
  componentPath = 'Fixture/Class'
  runDirectory = $runDirectory
  buildResultPath = $buildResultPath
  run = [ordered]@{
    timeoutMs = 30000
    args = @('--gtest_color=no')
    runtimePath = @('C:/TDM-GCC-64/bin')
  }
}
$request | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $requestPath -Encoding UTF8

& $cliPath --action run --request $requestPath --out $responsePath --json
$exitCode = $LASTEXITCODE
$response = Get-Content -LiteralPath $responsePath -Raw | ConvertFrom-Json

if ($exitCode -ne 0 -or -not $response.ok -or $response.status -ne 'executed' -or $response.data.status -ne 'passed') {
  throw "AscetTest run did not pass. exitCode=$exitCode status=$($response.status) error=$($response.error | ConvertTo-Json -Compress)"
}
if (-not (Test-Path -LiteralPath $runResultPath)) { throw "run-result.json is missing: $runResultPath" }
$runResult = Get-Content -LiteralPath $runResultPath -Raw | ConvertFrom-Json
if ($runResult.status -ne 'passed' -or $runResult.exitCode -ne 0) { throw 'run-result.json did not report a passed runtime.' }
if ([int]$runResult.testsRun -lt 1 -or [int]$runResult.failures -ne 0 -or [int]$runResult.errors -ne 0) { throw 'GoogleTest summary is not a passing non-empty result.' }
if (-not (Test-Path -LiteralPath $runResult.gtestXmlPath)) { throw "GoogleTest XML is missing: $($runResult.gtestXmlPath)" }

Write-Host 'AscetTest RunService smoke test passed.'
