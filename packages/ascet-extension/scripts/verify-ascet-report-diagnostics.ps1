param()

$ErrorActionPreference = 'Stop'
$packageRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$cliPath = Join-Path $packageRoot 'ascet-cli\bin\AscetTest.exe'
if (-not (Test-Path -LiteralPath $cliPath)) { throw "AscetTest.exe is missing: $cliPath" }

# Re-run the existing deterministic negative matrix, then collect its response
# envelopes as a single diagnostic acceptance artifact. All executions are
# local/offline and sequential; no ASCET live write is attempted here.
powershell -ExecutionPolicy Bypass -File (Join-Path $packageRoot 'scripts\verify-ascet-test-internal.ps1') -Offline | Out-Null
powershell -ExecutionPolicy Bypass -File (Join-Path $packageRoot 'scripts\test-ascet-test.ps1') | Out-Null
powershell -ExecutionPolicy Bypass -File (Join-Path $packageRoot 'scripts\test-ascet-generated-c-googletest.ps1') | Out-Null

$cases = @(
  [ordered]@{ id = 'missing_toolchain'; path = 'tmp\ascet-test-acceptance\missing-toolchain\response.json'; code = 'toolchain_missing' },
  [ordered]@{ id = 'c_compile_failed'; path = 'tmp\ascet-test-acceptance\c-compile-failure\response.json'; code = 'c_compile_failed' },
  [ordered]@{ id = 'runtime_failed'; path = 'tmp\ascet-test-acceptance\runtime-failure\response.json'; code = 'runtime_failed' },
  [ordered]@{ id = 'runtime_timeout'; path = 'tmp\ascet-test-acceptance\runtime-timeout\response.json'; code = 'runtime_timeout' },
  [ordered]@{ id = 'binary_missing'; path = 'tmp\ascet-test-acceptance\positive\missing-binary-run-response.json'; code = 'binary_missing' },
  [ordered]@{ id = 'gtest_xml_invalid'; path = 'tmp\ascet-test-acceptance\positive\xml-verify-response.json'; code = 'gtest_xml_invalid' },
  [ordered]@{ id = 'link_architecture_mismatch'; path = 'tmp\ascet-test-acceptance\positive\link-verify-response.json'; code = 'link_architecture_mismatch' },
  [ordered]@{ id = 'c_compiler_mismatch'; path = 'tmp\ascet-test-acceptance\positive\compiler-verify-response.json'; code = 'c_compiler_mismatch' },
  [ordered]@{ id = 'approval_missing'; path = 'tmp\ascet-test-skeleton\apply-gate-response.json'; code = 'approval_missing' },
  [ordered]@{ id = 'export_not_ready'; path = 'tmp\ascet-generated-c-googletest\invalid-build\response.json'; code = 'export_not_ready' }
)

$records = @()
foreach ($case in $cases) {
  $path = Join-Path $packageRoot $case.path
  if (-not (Test-Path -LiteralPath $path)) { throw "Diagnostic response is missing: $path" }
  $response = Get-Content -LiteralPath $path -Raw | ConvertFrom-Json
  $actual = if ($null -ne $response.error) { [string]$response.error.code } else { '' }
  if ($actual -ne $case.code) { throw "Diagnostic $($case.id) expected $($case.code), got $actual." }
  $reportPath = if ($null -ne $response.data) { [string]$response.data.reportPath } else { '' }
  $reportStatus = ''
  $reportVerdict = ''
  $junitFailures = -1
  if (-not [string]::IsNullOrWhiteSpace($reportPath) -and (Test-Path -LiteralPath $reportPath)) {
    $report = Get-Content -LiteralPath $reportPath -Raw | ConvertFrom-Json
    $reportStatus = [string]$report.status
    $reportVerdict = [string]$report.verdict
    $junitPath = Join-Path (Split-Path -Parent $reportPath) 'junit.xml'
    if (Test-Path -LiteralPath $junitPath) {
      $junit = [xml](Get-Content -LiteralPath $junitPath -Raw)
      $junitFailures = [int]$junit.testsuites.failures
    }
    if ($reportVerdict -notin @('failed', 'not_proven')) { throw "Diagnostic report did not carry a failure verdict: $reportPath" }
    if ($junitFailures -le 0) { throw "Diagnostic JUnit did not carry a failure count: $junitPath" }
  }
  $records += [pscustomobject][ordered]@{ id = $case.id; expectedCode = $case.code; actualCode = $actual; responsePath = $path; reportStatus = $reportStatus; reportVerdict = $reportVerdict; junitFailures = $junitFailures }
}

$root = Join-Path $packageRoot 'tmp\ascet-report-diagnostics'
New-Item -ItemType Directory -Force -Path $root | Out-Null
$summary = [ordered]@{
  schemaVersion = 'ascet-test-report-diagnostics/v1'
  status = 'passed'
  serial = $true
  total = $records.Count
  distinctCodes = @($records.actualCode | Sort-Object -Unique).Count
  cases = $records
}
$jsonPath = Join-Path $root 'diagnostics.json'
$mdPath = Join-Path $root 'diagnostics.md'
$junitPath = Join-Path $root 'diagnostics.junit.xml'
$summary | ConvertTo-Json -Depth 30 | Set-Content -LiteralPath $jsonPath -Encoding UTF8
@("# ASCET report diagnostics", "", "- Status: **passed**", "- Cases: $($records.Count)", "- Distinct failure codes: $($summary.distinctCodes)", "", ($records | ForEach-Object { "- $($_.id): $($_.actualCode)" })) | Set-Content -LiteralPath $mdPath -Encoding UTF8
$suite = [System.Xml.XmlWriterSettings]::new(); $suite.Indent = $true
$writer = [System.Xml.XmlWriter]::Create($junitPath, $suite)
$writer.WriteStartDocument()
$writer.WriteStartElement('testsuites')
$writer.WriteAttributeString('name','AscetTestDiagnostics')
$writer.WriteAttributeString('tests',[string]$records.Count)
$writer.WriteAttributeString('failures','0')
$writer.WriteStartElement('testsuite')
$writer.WriteAttributeString('name','diagnostics')
$writer.WriteAttributeString('tests',[string]$records.Count)
$writer.WriteAttributeString('failures','0')
foreach($record in $records) {
  $writer.WriteStartElement('testcase')
  $writer.WriteAttributeString('name',$record.id)
  $writer.WriteEndElement()
}
$writer.WriteEndElement()
$writer.WriteEndElement()
$writer.WriteEndDocument()
$writer.Dispose()
Write-Output ($summary | ConvertTo-Json -Depth 20)
