param(
  [string]$SourceRequest = 'E:\Rep\AscetCopolit\output\ascet-live\real-acceptance-20260802\pipeline-request.json'
)

$ErrorActionPreference = 'Stop'
$packageRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$cliPath = Join-Path $packageRoot 'ascet-cli\bin\AscetTest.exe'
$testRoot = Join-Path $packageRoot 'tmp\ascet-generated-c-googletest-batch'
$itemRoot = Join-Path $testRoot 'item-001'
$batchPath = Join-Path $testRoot 'batch.json'
$responsePath = Join-Path $testRoot 'batch-response.json'
if (Test-Path -LiteralPath $testRoot) { Remove-Item -LiteralPath $testRoot -Recurse -Force }
New-Item -ItemType Directory -Force -Path $itemRoot | Out-Null

foreach ($required in @($cliPath, $SourceRequest)) {
  if (-not (Test-Path -LiteralPath $required)) { throw "Required file is missing: $required" }
}

$request = Get-Content -LiteralPath $SourceRequest -Raw | ConvertFrom-Json
$request.runId = 'batch-item-001'
$request.runDirectory = $itemRoot
$request | Add-Member -NotePropertyName executeLive -NotePropertyValue $false -Force
$itemRequestPath = Join-Path $itemRoot 'request.json'
$request | ConvertTo-Json -Depth 30 | Set-Content -LiteralPath $itemRequestPath -Encoding UTF8

$batch = [pscustomobject]@{
  schemaVersion = 'ascet-test-batch/v1'
  runId = 'manifest-only-batch'
  runDirectory = $testRoot
  items = @([pscustomobject]@{ id = 'item-001'; requestPath = $itemRequestPath })
}
$batch | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath $batchPath -Encoding UTF8

& $cliPath --action batch --request $batchPath --out $responsePath --json | Out-Null
$exitCode = $LASTEXITCODE
if (-not (Test-Path -LiteralPath $responsePath)) { throw "Batch response is missing: $responsePath" }
$response = Get-Content -LiteralPath $responsePath -Raw | ConvertFrom-Json
if ($exitCode -ne 0 -or -not $response.ok -or $response.status -ne 'passed') {
  throw "Batch pipeline did not pass. exitCode=$exitCode status=$($response.status) error=$($response.error | ConvertTo-Json -Compress)"
}
if ($response.data.total -ne 1 -or $response.data.passed -ne 1 -or $response.data.failed -ne 0) { throw 'Batch totals do not match one passing item.' }
$batchResultPath = Join-Path $testRoot 'batch-result.json'
if (-not (Test-Path -LiteralPath $batchResultPath)) { throw "Batch result is missing: $batchResultPath" }
if (-not (Test-Path -LiteralPath (Join-Path $itemRoot 'report.json'))) { throw 'Batch item report is missing.' }
Write-Host 'Manifest-only generated C and GoogleTest batch passed.'
