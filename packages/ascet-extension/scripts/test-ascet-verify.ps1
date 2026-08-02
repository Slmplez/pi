$ErrorActionPreference = 'Stop'

$packageRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$cliPath = Join-Path $packageRoot 'ascet-cli\bin\AscetTest.exe'
$runDirectory = Join-Path $packageRoot 'tmp\ascet-build-live'
$requestPath = Join-Path $runDirectory 'verify-request.json'
$responsePath = Join-Path $runDirectory 'verify-response.json'
$verifyResultPath = Join-Path $runDirectory 'verify-result.json'

foreach ($required in @($cliPath, (Join-Path $runDirectory 'build-result.json'), (Join-Path $runDirectory 'run-result.json'))) {
  if (-not (Test-Path -LiteralPath $required)) { throw "Required artifact is missing: $required" }
}

$request = [ordered]@{
  schemaVersion = 'ascet-test-request/v1'
  runId = 'ascet-run-live'
  componentPath = 'Fixture/Class'
  runDirectory = $runDirectory
  buildResultPath = (Join-Path $runDirectory 'build-result.json')
  runResultPath = (Join-Path $runDirectory 'run-result.json')
  verification = [ordered]@{
    profile = 'offline'
  }
}
$request | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $requestPath -Encoding UTF8

& $cliPath --action verify --request $requestPath --out $responsePath --json
$exitCode = $LASTEXITCODE
$response = Get-Content -LiteralPath $responsePath -Raw | ConvertFrom-Json

if ($exitCode -ne 0 -or -not $response.ok -or $response.status -ne 'verified' -or $response.data.verdict -ne 'passed') {
  throw "AscetTest verify did not pass. exitCode=$exitCode status=$($response.status) verdict=$($response.data.verdict) error=$($response.error | ConvertTo-Json -Compress)"
}
if (-not (Test-Path -LiteralPath $verifyResultPath)) { throw "verify-result.json is missing: $verifyResultPath" }
$verifyResult = Get-Content -LiteralPath $verifyResultPath -Raw | ConvertFrom-Json
if ($verifyResult.verdict -ne 'passed' -or $verifyResult.status -ne 'verified') { throw 'verify-result.json did not report a passed verification.' }

Write-Host 'AscetTest VerifyService smoke test passed.'
