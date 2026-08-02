$ErrorActionPreference = 'Stop'

$packageRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$cliPath = Join-Path $packageRoot 'ascet-cli\bin\AscetTest.exe'
$sourceRequestPath = Join-Path $packageRoot 'tmp\ascet-build-live\request.json'
$runDirectory = Join-Path $packageRoot 'tmp\ascet-pipeline-live'
$requestPath = Join-Path $runDirectory 'pipeline-request.json'
$responsePath = Join-Path $runDirectory 'pipeline-response.json'
$statePath = Join-Path $runDirectory 'pipeline-state.json'

foreach ($required in @($cliPath, $sourceRequestPath)) {
  if (-not (Test-Path -LiteralPath $required)) { throw "Required file is missing: $required" }
}
New-Item -ItemType Directory -Force -Path $runDirectory | Out-Null
$request = Get-Content -LiteralPath $sourceRequestPath -Raw | ConvertFrom-Json
$request.runId = 'ascet-pipeline-live'
$request.runDirectory = $runDirectory
$request | Add-Member -NotePropertyName verification -NotePropertyValue ([pscustomobject]@{ profile = 'offline' }) -Force
$request | Add-Member -NotePropertyName run -NotePropertyValue ([pscustomobject]@{
  timeoutMs = 30000
  args = @('--gtest_color=no')
  runtimePath = @('C:/TDM-GCC-64/bin')
}) -Force
$request | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath $requestPath -Encoding UTF8

& $cliPath --action pipeline --request $requestPath --out $responsePath --json
$exitCode = $LASTEXITCODE
$response = Get-Content -LiteralPath $responsePath -Raw | ConvertFrom-Json

if ($exitCode -ne 0 -or -not $response.ok -or $response.status -ne 'passed') {
  throw "AscetTest pipeline did not pass. exitCode=$exitCode status=$($response.status) error=$($response.error | ConvertTo-Json -Compress)"
}
if (-not (Test-Path -LiteralPath $statePath)) { throw "pipeline-state.json is missing: $statePath" }
$state = Get-Content -LiteralPath $statePath -Raw | ConvertFrom-Json
if ($state.status -ne 'passed') { throw "Pipeline state is not passed: $($state.status)" }
foreach ($stage in @('build', 'run', 'verify')) {
  $record = @($state.stages | Where-Object { $_.stage -eq $stage }) | Select-Object -First 1
  if ($null -eq $record -or $record.status -ne 'passed') { throw "Pipeline stage did not pass: $stage" }
}

$resumeRequest = Get-Content -LiteralPath $requestPath -Raw | ConvertFrom-Json
$resumeRequest | Add-Member -NotePropertyName resumeFrom -NotePropertyValue $statePath -Force
$resumeRequestPath = Join-Path $runDirectory 'resume-request.json'
$resumeRequest | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath $resumeRequestPath -Encoding UTF8
& $cliPath --action pipeline --request $resumeRequestPath --out (Join-Path $runDirectory 'resume-response.json') --json | Out-Null
if ($LASTEXITCODE -ne 0) { throw "Pipeline resume failed with exit code $LASTEXITCODE" }
$resumeResponse = Get-Content -LiteralPath (Join-Path $runDirectory 'resume-response.json') -Raw | ConvertFrom-Json
if (-not $resumeResponse.ok -or $resumeResponse.status -ne 'passed') { throw 'Pipeline resume did not reuse the matching passed state.' }

$staleRequest = Get-Content -LiteralPath $requestPath -Raw | ConvertFrom-Json
$staleRequest.componentPath = 'Fixture/Changed'
$staleRequest | Add-Member -NotePropertyName resumeFrom -NotePropertyValue $statePath -Force
$staleRequestPath = Join-Path $runDirectory 'stale-resume-request.json'
$staleRequest | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath $staleRequestPath -Encoding UTF8
& $cliPath --action pipeline --request $staleRequestPath --out (Join-Path $runDirectory 'stale-resume-response.json') --json | Out-Null
if ($LASTEXITCODE -eq 0) { throw 'A changed pipeline request incorrectly resumed successfully.' }
$staleResponse = Get-Content -LiteralPath (Join-Path $runDirectory 'stale-resume-response.json') -Raw | ConvertFrom-Json
if ($staleResponse.ok -or $staleResponse.error.code -ne 'resume_stale') { throw "Expected resume_stale but got $($staleResponse.error.code)" }

Write-Host 'AscetTest Pipeline smoke test passed.'
