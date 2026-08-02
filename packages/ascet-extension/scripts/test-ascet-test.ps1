param(
  [switch]$ContractOnly
)

$ErrorActionPreference = 'Stop'

$packageRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$buildScript = Join-Path $packageRoot 'scripts\build-ascet-test.ps1'
$exePath = Join-Path $packageRoot 'ascet-cli\bin\AscetTest.exe'
$outputRoot = Join-Path $packageRoot 'tmp\ascet-test-skeleton'
$requestPath = Join-Path $outputRoot 'request.json'
$responsePath = Join-Path $outputRoot 'response.json'

New-Item -ItemType Directory -Force -Path $outputRoot | Out-Null
$validRequest = [ordered]@{
  schemaVersion = 'ascet-test-request/v1'
  runId = 'skeleton-test'
  componentPath = 'AEB_Core'
  levels = @('class_ut', 'component_ct')
  contract = [ordered]@{
    schemaVersion = 'ascet-test-contract/v1'
    componentPath = 'AEB_Core'
    suites = @(
      [ordered]@{
        id = 'AEB_Release_class_ut'
        level = 'class_ut'
        entryPoint = 'AEB_Release'
        dependencyMode = 'stub'
        cases = @(
          [ordered]@{
            id = 'nominal'
            inputs = [ordered]@{ vehicleSpeed = 50 }
            expectedOutputs = [ordered]@{ brakeRequest = $true }
            oracleSource = 'requirement'
          }
        )
      }
      [ordered]@{
        id = 'AEB_Core_component_ct'
        level = 'component_ct'
        entryPoint = 'AEB_Core'
        dependencyMode = 'real'
        cycles = 10
        cases = @(
          [ordered]@{
            id = 'normal_sequence'
            expectedSteps = @(
              [ordered]@{ tick = 1; outputs = [ordered]@{ brakeRequest = $true } }
            )
          }
        )
      }
    )
  }
}
$validRequest | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath $requestPath -Encoding UTF8

& $buildScript
if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $exePath)) {
  throw "AscetTest.exe was not built: $exePath"
}

& $exePath --action prepare --request $requestPath --out $responsePath --json 1>$null
$recognizedExitCode = $LASTEXITCODE
if ($recognizedExitCode -ne 0) {
  throw "Valid prepare request should return exit code 0, got $recognizedExitCode."
}

$recognized = Get-Content -LiteralPath $responsePath -Raw -Encoding UTF8 | ConvertFrom-Json
if ($recognized.action -ne 'prepare' -or $recognized.status -ne 'preflight' -or $recognized.ok -ne $true) {
  throw "Valid prepare response did not match the preflight contract."
}
if ($recognized.data.ready -ne $true -or $recognized.data.contract.suiteCount -ne 2) {
  throw "Valid prepare response did not summarize the two test suites."
}
if ($recognized.diagnostics.liveExecutionStarted -ne $false -or $recognized.diagnostics.schedulerUsed -ne $false) {
  throw "Prepare must not start live ASCET or use the live scheduler."
}

$invalidResponsePath = Join-Path $outputRoot 'invalid.json'
& $exePath --action invalid --request $requestPath --out $invalidResponsePath --json 1>$null
if ($LASTEXITCODE -ne 2) {
  throw "Invalid action should return exit code 2, got $LASTEXITCODE."
}
$invalid = Get-Content -LiteralPath $invalidResponsePath -Raw -Encoding UTF8 | ConvertFrom-Json
if ($invalid.error.code -ne 'invalid_action') {
  throw "Invalid action did not return invalid_action."
}

function Write-JsonRequest([string]$name, $value) {
  $path = Join-Path $outputRoot $name
  $value | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath $path -Encoding UTF8
  return $path
}

function Invoke-BlockedPrepare([string]$name, $value, [string]$expectedCode) {
  $request = Write-JsonRequest ($name + '-request.json') $value
  $response = Join-Path $outputRoot ($name + '-response.json')
  & $exePath --action prepare --request $request --out $response --json 1>$null
  if ($LASTEXITCODE -ne 2) {
    throw "$name should return exit code 2, got $LASTEXITCODE."
  }
  $payload = Get-Content -LiteralPath $response -Raw -Encoding UTF8 | ConvertFrom-Json
  if ($payload.ok -ne $false -or $payload.status -ne 'blocked' -or $payload.error.code -ne 'invalid_contract') {
    throw "$name did not return the blocked invalid_contract envelope."
  }
  $codes = @($payload.error.issues | ForEach-Object { $_.code })
  if ($codes -notcontains $expectedCode) {
    throw "$name did not contain expected validation code $expectedCode."
  }
}

$invalidLevelRequest = $validRequest | ConvertTo-Json -Depth 20 | ConvertFrom-Json
$invalidLevelRequest.contract.suites[0].level = 'module_ut'
Invoke-BlockedPrepare 'invalid-level' $invalidLevelRequest 'invalid_level'

$approvalRequest = $validRequest | ConvertTo-Json -Depth 20 | ConvertFrom-Json
$approvalRequest | Add-Member -NotePropertyName executeLive -NotePropertyValue $true
Invoke-BlockedPrepare 'approval-missing' $approvalRequest 'approval_missing'

$unsafePathRequest = $validRequest | ConvertTo-Json -Depth 20 | ConvertFrom-Json
$unsafePathRequest.componentPath = '../AEB_Core'
Invoke-BlockedPrepare 'unsafe-component-path' $unsafePathRequest 'unsafe_path'

$duplicateSuiteRequest = $validRequest | ConvertTo-Json -Depth 20 | ConvertFrom-Json
$duplicateSuiteRequest.contract.suites[1].id = $duplicateSuiteRequest.contract.suites[0].id
Invoke-BlockedPrepare 'duplicate-suite' $duplicateSuiteRequest 'duplicate_suite'

$missingContractRequest = $validRequest | ConvertTo-Json -Depth 20 | ConvertFrom-Json
$missingContractRequest.PSObject.Properties.Remove('contract')
$missingContractRequest | Add-Member -NotePropertyName testContractPath -NotePropertyValue (Join-Path $outputRoot 'missing-contract.json')
Invoke-BlockedPrepare 'missing-contract-file' $missingContractRequest 'test_contract_missing'

$inspectionRunDirectory = Join-Path $outputRoot 'inspect-run'
$inspectionRequest = [ordered]@{
  schemaVersion = 'ascet-test-request/v1'
  runId = 'inspect-fixture'
  componentPath = 'AEB_Core/AEB_Release'
  objectKind = 'class'
  runDirectory = $inspectionRunDirectory
  cliResults = [ordered]@{
    read_component_summary = [ordered]@{ ok = $true; result = [ordered]@{ objectKind = 'class'; name = 'AEB_Release' } }
    read_component_snapshot = [ordered]@{ ok = $true; result = [ordered]@{ objectKind = 'class'; cycles = [ordered]@{ main = 0.01 } } }
    'read_component_children:methods' = [ordered]@{ ok = $true; result = [ordered]@{ items = @([ordered]@{ name = 'step' }) } }
    'read_component_children:elements' = [ordered]@{ ok = $true; result = [ordered]@{ items = @(
      [ordered]@{ name = 'vehicleSpeed'; direction = 'input'; type = 'float'; min = 0; max = 200; step = 1; metadata = [ordered]@{ threshold = 50; allowInvalid = $true } }
      [ordered]@{ name = 'brakeRequest'; direction = 'output'; type = 'bool' }
    ) } }
    'read_component_children:components' = [ordered]@{ ok = $true; result = [ordered]@{ items = @([ordered]@{ path = 'AEB_Core/AEB_Environment'; kind = 'class' }) } }
    read_component_refs = [ordered]@{ ok = $true; result = [ordered]@{ references = @([ordered]@{ path = 'AEB_Core/AEB_Environment'; relation = 'outgoing' }) } }
    read_implementation = [ordered]@{ ok = $true; result = [ordered]@{ implementation = 'default' } }
    'read_method_signature:step' = [ordered]@{ ok = $true; result = [ordered]@{ name = 'step' } }
    'read_method_code:step' = [ordered]@{ ok = $true; result = [ordered]@{ language = 'ESDL'; code = 'brakeRequest = vehicleSpeed > 50;' } }
  }
}
$inspectionRequestPath = Write-JsonRequest 'inspect-request.json' $inspectionRequest
$inspectionResponsePath = Join-Path $outputRoot 'inspect-response.json'
& $exePath --action inspect --request $inspectionRequestPath --out $inspectionResponsePath --json 1>$null
if ($LASTEXITCODE -ne 0) { throw "Fixture inspect should return exit code 0, got $LASTEXITCODE." }
$inspectionResponse = Get-Content -LiteralPath $inspectionResponsePath -Raw -Encoding UTF8 | ConvertFrom-Json
if ($inspectionResponse.status -ne 'inspected' -or $inspectionResponse.ok -ne $true -or $inspectionResponse.data.inspection.complete -ne $true) { throw 'Fixture inspect response was not complete.' }
if ($inspectionResponse.data.inspection.methods[0].name -ne 'step' -or $inspectionResponse.data.inspection.interfaces.inputs[0].name -ne 'vehicleSpeed') { throw 'Fixture inspect did not normalize method/interface data.' }
if (-not (Test-Path -LiteralPath (Join-Path $inspectionRunDirectory 'inspection.json'))) { throw 'Inspect did not write inspection.json.' }

$esdlRunDirectory = Join-Path $outputRoot 'esdl-run'
$esdlRequest = [ordered]@{
  schemaVersion = 'ascet-test-request/v1'
  runId = 'esdl-fixture'
  componentPath = 'AEB_Core/AEB_Release'
  runDirectory = $esdlRunDirectory
  inspection = $inspectionResponse.data.inspection
  methodDrafts = @([ordered]@{ methodName = 'step'; code = 'brakeRequest = vehicleSpeed > 50;'; operation = 'replace' })
  elementSpec = [ordered]@{
    schemaVersion = 'ascet-element-spec/v1'
    elements = @(
      [ordered]@{ name = 'emergencyThreshold'; kind = 'parameter'; type = 'float'; defaultValue = 50; min = 0; max = 200; operation = 'create' }
    )
  }
}
$esdlRequestPath = Write-JsonRequest 'generate-esdl-request.json' $esdlRequest
$esdlResponsePath = Join-Path $outputRoot 'generate-esdl-response.json'
& $exePath --action generate-esdl --request $esdlRequestPath --out $esdlResponsePath --json 1>$null
if ($LASTEXITCODE -ne 0) { throw "Fixture generate-esdl should return exit code 0, got $LASTEXITCODE." }
$esdlResponse = Get-Content -LiteralPath $esdlResponsePath -Raw -Encoding UTF8 | ConvertFrom-Json
if ($esdlResponse.status -ne 'drafted' -or $esdlResponse.ok -ne $true -or $esdlResponse.data.draft.valid -ne $true) { throw 'Fixture generate-esdl response was not valid.' }
if ($esdlResponse.data.draft.readbackRequired -ne $true -or $esdlResponse.data.liveWritePerformed -ne $false) { throw 'ESDL draft must remain review-only.' }
if ($esdlResponse.data.elementSpec.schemaVersion -ne 'ascet-element-spec/v1' -or $esdlResponse.data.applyPlan.schemaVersion -ne 'ascet-esdl-apply-plan/v1') { throw 'ESDL element-spec/apply-plan contracts are missing.' }
if ($esdlResponse.data.applyPlan.operations[0].action -ne 'create' -or $esdlResponse.data.applyPlan.operations[0].element.name -ne 'emergencyThreshold') { throw 'ESDL apply plan did not preserve the new parameter operation.' }
foreach ($artifact in @('inspection.json', 'esdl-draft.json', 'esdl-draft.esdl', 'element-spec.json', 'esdl-apply-plan.json')) { if (-not (Test-Path -LiteralPath (Join-Path $esdlRunDirectory $artifact))) { throw "Missing generate-esdl artifact: $artifact" } }

# Live ESDL apply must be rejected before any ASCET process starts unless the
# caller supplies an explicit approval, disposable target and matching baseline.
$applyRequest = $esdlRequest | ConvertTo-Json -Depth 40 | ConvertFrom-Json
$applyRequest.runId = 'apply-gate-fixture'
$applyRequest.runDirectory = (Join-Path $outputRoot 'apply-gate-run')
$applyRequest | Add-Member -NotePropertyName executeLive -NotePropertyValue $true -Force
$applyRequest | Add-Member -NotePropertyName applyPlanPath -NotePropertyValue (Join-Path $esdlRunDirectory 'esdl-apply-plan.json') -Force
$applyRequest | Add-Member -NotePropertyName elementSpecPath -NotePropertyValue (Join-Path $esdlRunDirectory 'element-spec.json') -Force
$applyRequestPath = Write-JsonRequest 'apply-gate-request.json' $applyRequest
$applyResponsePath = Join-Path $outputRoot 'apply-gate-response.json'
& $exePath --action apply --request $applyRequestPath --out $applyResponsePath --json 1>$null
if ($LASTEXITCODE -ne 2) { throw 'Unapproved live apply should be blocked.' }
$applyResponse = Get-Content -LiteralPath $applyResponsePath -Raw -Encoding UTF8 | ConvertFrom-Json
if ($applyResponse.error.code -ne 'approval_missing' -or $applyResponse.diagnostics.liveExecutionStarted -ne $false -or $applyResponse.data.liveWritePerformed -ne $false) { throw 'Live apply gate did not reject before live execution.' }

$casesRequest = [ordered]@{
  schemaVersion = 'ascet-test-request/v1'
  runId = 'cases-fixture'
  componentPath = 'AEB_Core/AEB_Release'
  runDirectory = (Join-Path $outputRoot 'cases-run-a')
  levels = @('class_ut', 'component_ct')
  seed = 'fixed-seed'
  inspection = $inspectionResponse.data.inspection
}
$casesRequestPath = Write-JsonRequest 'generate-cases-request-a.json' $casesRequest
$casesResponsePath = Join-Path $outputRoot 'generate-cases-response-a.json'
& $exePath --action generate-cases --request $casesRequestPath --out $casesResponsePath --json 1>$null
if ($LASTEXITCODE -ne 0) { throw "Fixture generate-cases should return exit code 0, got $LASTEXITCODE." }
$casesResponse = Get-Content -LiteralPath $casesResponsePath -Raw -Encoding UTF8 | ConvertFrom-Json
if ($casesResponse.status -ne 'cases_ready' -or $casesResponse.ok -ne $true) { throw 'Fixture generate-cases response was not ready.' }
$suites = @($casesResponse.data.generated.contract.suites)
if ($suites.Count -ne 2 -or ($suites | Where-Object level -eq 'class_ut').dependencyMode -ne 'stub' -or ($suites | Where-Object level -eq 'component_ct').dependencyMode -ne 'real') { throw 'Generated cases did not contain class_ut/component_ct dependency modes.' }
if (($suites | Where-Object level -eq 'class_ut').cases.id -notcontains 'vehicleSpeed_threshold_at') { throw 'Generated class_ut boundary case is missing.' }
if (($suites | Where-Object level -eq 'component_ct').cases.id -notcontains 'multi_cycle_sequence') { throw 'Generated component_ct multi-cycle case is missing.' }

$casesRequest.runId = 'cases-fixture-repeat'
$casesRequest.runDirectory = (Join-Path $outputRoot 'cases-run-b')
$casesRequestPathB = Write-JsonRequest 'generate-cases-request-b.json' $casesRequest
$casesResponsePathB = Join-Path $outputRoot 'generate-cases-response-b.json'
& $exePath --action generate-cases --request $casesRequestPathB --out $casesResponsePathB --json 1>$null
if ($LASTEXITCODE -ne 0) { throw "Repeated fixture generate-cases should return exit code 0, got $LASTEXITCODE." }
$casesResponseB = Get-Content -LiteralPath $casesResponsePathB -Raw -Encoding UTF8 | ConvertFrom-Json
$casesA = $casesResponse.data.generated.contract | ConvertTo-Json -Depth 30 -Compress
$casesB = $casesResponseB.data.generated.contract | ConvertTo-Json -Depth 30 -Compress
if ($casesA -ne $casesB) { throw 'Repeated generate-cases output was not deterministic.' }

$missingEsdlRequest = [ordered]@{ schemaVersion = 'ascet-test-request/v1'; runId = 'missing-esdl'; componentPath = 'AEB_Core/AEB_Release'; inspection = $inspectionResponse.data.inspection; runDirectory = (Join-Path $outputRoot 'missing-esdl-run') }
$missingEsdlPath = Write-JsonRequest 'missing-esdl-request.json' $missingEsdlRequest
$missingEsdlResponsePath = Join-Path $outputRoot 'missing-esdl-response.json'
& $exePath --action generate-esdl --request $missingEsdlPath --out $missingEsdlResponsePath --json 1>$null
if ($LASTEXITCODE -ne 2) { throw 'Missing methodDrafts should fail generate-esdl.' }
$missingEsdlResponse = Get-Content -LiteralPath $missingEsdlResponsePath -Raw -Encoding UTF8 | ConvertFrom-Json
if ($missingEsdlResponse.error.code -ne 'esdl_invalid') { throw 'Missing methodDrafts did not return esdl_invalid.' }

$partialInspectionRequest = $inspectionRequest | ConvertTo-Json -Depth 30 | ConvertFrom-Json
$partialInspectionRequest.cliResults.PSObject.Properties.Remove('read_component_refs')
$partialInspectionPath = Write-JsonRequest 'partial-inspect-request.json' $partialInspectionRequest
$partialInspectionResponsePath = Join-Path $outputRoot 'partial-inspect-response.json'
& $exePath --action inspect --request $partialInspectionPath --out $partialInspectionResponsePath --json 1>$null
if ($LASTEXITCODE -ne 2) { throw 'Partial offline inspect should fail with exit code 2.' }
$partialInspectionResponse = Get-Content -LiteralPath $partialInspectionResponsePath -Raw -Encoding UTF8 | ConvertFrom-Json
if ($partialInspectionResponse.error.code -ne 'inspection_incomplete' -or $partialInspectionResponse.diagnostics.liveExecutionStarted -ne $false) { throw 'Partial offline inspect did not remain offline or return inspection_incomplete.' }

$missingCasesRequest = [ordered]@{ schemaVersion = 'ascet-test-request/v1'; runId = 'missing-cases'; componentPath = 'AEB_Core/AEB_Release'; runDirectory = (Join-Path $outputRoot 'missing-cases-run') }
$missingCasesPath = Write-JsonRequest 'missing-cases-request.json' $missingCasesRequest
$missingCasesResponsePath = Join-Path $outputRoot 'missing-cases-response.json'
& $exePath --action generate-cases --request $missingCasesPath --out $missingCasesResponsePath --json 1>$null
if ($LASTEXITCODE -ne 2) { throw 'Missing inspection should fail generate-cases.' }
$missingCasesResponse = Get-Content -LiteralPath $missingCasesResponsePath -Raw -Encoding UTF8 | ConvertFrom-Json
if ($missingCasesResponse.error.code -ne 'inspection_incomplete') { throw 'Missing inspection did not return inspection_incomplete.' }

if (-not $ContractOnly) {
  $missingResponsePath = Join-Path $outputRoot 'missing.json'
  & $exePath --action prepare --request (Join-Path $outputRoot 'missing-request.json') --out $missingResponsePath --json 1>$null
  if ($LASTEXITCODE -ne 2) {
    throw "Missing request should return exit code 2, got $LASTEXITCODE."
  }
  $missing = Get-Content -LiteralPath $missingResponsePath -Raw -Encoding UTF8 | ConvertFrom-Json
  if ($missing.error.code -ne 'request_missing') {
    throw "Missing request did not return request_missing."
  }
}

Write-Host 'AscetTest single-exe prepare and contract verification passed.'
