param(
  [string]$SourceRequest = 'E:\Rep\AscetCopolit\output\ascet-live\real-acceptance-20260802\pipeline-request.json'
)

$ErrorActionPreference = 'Stop'

$packageRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$cliPath = Join-Path $packageRoot 'ascet-cli\bin\AscetTest.exe'
$testRoot = Join-Path $packageRoot 'tmp\ascet-generated-c-googletest'
$runDirectory = Join-Path $testRoot 'run'
$requestPath = Join-Path $testRoot 'request.json'
$responsePath = Join-Path $runDirectory 'pipeline-response.json'

foreach ($required in @($cliPath, $SourceRequest)) {
  if (-not (Test-Path -LiteralPath $required)) { throw "Required file is missing: $required" }
}

if (Test-Path -LiteralPath $testRoot) {
  Remove-Item -LiteralPath $testRoot -Recurse -Force
}
New-Item -ItemType Directory -Force -Path $runDirectory | Out-Null

$request = Get-Content -LiteralPath $SourceRequest -Raw | ConvertFrom-Json
$request.runId = 'manifest-only-generated-c-googletest'
$request.runDirectory = $runDirectory
$request | Add-Member -NotePropertyName pipelineStages -NotePropertyValue @('build', 'run', 'verify') -Force
$request | Add-Member -NotePropertyName executeLive -NotePropertyValue $false -Force
$request | ConvertTo-Json -Depth 30 | Set-Content -LiteralPath $requestPath -Encoding UTF8

& $cliPath --action pipeline --request $requestPath --out $responsePath --json | Out-Null
$exitCode = $LASTEXITCODE
if (-not (Test-Path -LiteralPath $responsePath)) { throw "Pipeline response is missing: $responsePath" }
$response = Get-Content -LiteralPath $responsePath -Raw | ConvertFrom-Json
if ($exitCode -ne 0 -or -not $response.ok -or $response.status -ne 'passed') {
  throw "Manifest-only C/GoogleTest pipeline did not pass. exitCode=$exitCode status=$($response.status) error=$($response.error | ConvertTo-Json -Compress)"
}

foreach ($artifact in @('report.json', 'report.md', 'junit.xml', 'build-result.json', 'run-result.json', 'verify-result.json')) {
  $path = Join-Path $runDirectory $artifact
  if (-not (Test-Path -LiteralPath $path)) { throw "Expected pipeline artifact is missing: $path" }
}

$report = Get-Content -LiteralPath (Join-Path $runDirectory 'report.json') -Raw | ConvertFrom-Json
if ($report.schemaVersion -ne 'ascet-test-report/v1') { throw "Unexpected report schema: $($report.schemaVersion)" }
if ($report.verdict -ne 'passed' -or $report.status -ne 'passed') { throw "Unexpected report verdict: $($report.verdict)/$($report.status)" }
if ($report.metrics.testsRun -lt 1 -or $report.metrics.testsFailed -ne 0) { throw 'Report metrics do not prove a passing GoogleTest run.' }

$junit = Get-Content -LiteralPath (Join-Path $runDirectory 'junit.xml') -Raw
if ($junit -notmatch '<testsuites' -or $junit -notmatch 'tests="') { throw 'JUnit report is not a valid test-suite document.' }

$invalidManifestPath = Join-Path $testRoot 'invalid-live-export.json'
$invalidManifest = Get-Content -LiteralPath $request.exportManifestPath -Raw | ConvertFrom-Json
$invalidManifest.generatedCodeManifest.status = 'failed'
$invalidManifest | ConvertTo-Json -Depth 30 | Set-Content -LiteralPath $invalidManifestPath -Encoding UTF8
$invalidRunDirectory = Join-Path $testRoot 'invalid-build'
$invalidRequest = Get-Content -LiteralPath $requestPath -Raw | ConvertFrom-Json
$invalidRequest.runId = 'invalid-export-manifest'
$invalidRequest.runDirectory = $invalidRunDirectory
$invalidRequest.exportManifestPath = $invalidManifestPath
$invalidRequest.verification.exportManifestPath = $invalidManifestPath
$invalidRequest | ConvertTo-Json -Depth 30 | Set-Content -LiteralPath (Join-Path $testRoot 'invalid-request.json') -Encoding UTF8
$invalidResponsePath = Join-Path $invalidRunDirectory 'response.json'
New-Item -ItemType Directory -Force -Path $invalidRunDirectory | Out-Null
& $cliPath --action build --request (Join-Path $testRoot 'invalid-request.json') --out $invalidResponsePath --json | Out-Null
$invalidResponse = Get-Content -LiteralPath $invalidResponsePath -Raw | ConvertFrom-Json
if ($invalidResponse.ok -or $invalidResponse.error.code -ne 'export_not_ready') { throw "Invalid export manifest was not rejected: $($invalidResponse.error | ConvertTo-Json -Compress)" }

Write-Host 'Manifest-only generated C and GoogleTest pipeline passed.'
