param(
  [string]$OutputRoot = 'E:\Rep\AscetCopolit\output\ascet-live\batch-acceptance-20260802'
)

$ErrorActionPreference = 'Stop'
$liveBin = 'E:\Rep\AscetCopolit\output\ascet-csharp\bin'
$summaryExe = Join-Path $liveBin 'AscetReadComponentSummary.exe'
$snapshotExe = Join-Path $liveBin 'AscetReadComponentSnapshot.exe'
$childrenExe = Join-Path $liveBin 'AscetReadComponentChildren.exe'
$refsExe = Join-Path $liveBin 'AscetReadComponentRefs.exe'
$implementationExe = Join-Path $liveBin 'AscetReadImplementation.exe'
$exportExe = Join-Path $liveBin 'AscetExportBuildArtifacts.exe'

foreach ($required in @($summaryExe, $snapshotExe, $childrenExe, $refsExe, $implementationExe, $exportExe)) {
  if (-not (Test-Path -LiteralPath $required)) { throw "ASCET live executable is missing: $required" }
}

New-Item -ItemType Directory -Force -Path $OutputRoot | Out-Null
$items = @(
  [ordered]@{ id = 'xpass-module'; kind = 'module'; path = 'PlatformLibrary\Package\AEB_AutomaticEmergencyBrake\Component\XPass_BB00000_AEB' },
  [ordered]@{ id = 'aeb-release-class'; kind = 'class'; path = 'PlatformLibrary\Package\AEB_AutomaticEmergencyBrake\Private\AEB_Core\AEB_Release' },
  [ordered]@{ id = 'aeb-engine-stall-class'; kind = 'class'; path = 'PlatformLibrary\Package\AEB_AutomaticEmergencyBrake\Private\AEB_Core\AEB_EngineStall' },
  [ordered]@{ id = 'aeb-trigger-ba-from-off-class'; kind = 'class'; path = 'PlatformLibrary\Package\AEB_AutomaticEmergencyBrake\Private\AEB_Core\AEB_Trigger_BA_From_Off' }
)

function Invoke-LiveRead {
  param([string]$Executable, [string[]]$Arguments, [string]$OutputPath)
  $stdout = & $Executable @Arguments 2>&1
  $exitCode = $LASTEXITCODE
  $text = ($stdout -join [Environment]::NewLine)
  $text | Set-Content -LiteralPath $OutputPath -Encoding UTF8
  $parsed = $null
  try { $parsed = $text | ConvertFrom-Json } catch { }
  return [pscustomobject]@{ exitCode = $exitCode; text = $text; json = $parsed }
}

function Get-Sha256Text {
  param([string]$Text)
  $sha = [System.Security.Cryptography.SHA256]::Create()
  try {
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($Text)
    return ([System.BitConverter]::ToString($sha.ComputeHash($bytes))).Replace('-', '').ToLowerInvariant()
  } finally { $sha.Dispose() }
}

function New-NormalizedInspection {
  param(
    [hashtable]$Item,
    [object]$Summary,
    [object]$Snapshot,
    [object]$MethodsPayload,
    [object]$ElementsPayload,
    [object]$ComponentsPayload,
    [object]$RefsPayload,
    [object]$ImplementationPayload,
    [object]$ExportPayload,
    [bool]$ReadPassed,
    [bool]$ExportReady,
    [string]$Status
  )

  $methods = @($MethodsPayload.items | Where-Object { $_.kind -notin @('Method Argument', 'Return Value') } | ForEach-Object {
    [ordered]@{ name = [string]$_.name; kind = [string]$_.kind; path = [string]$_.path }
  })
  $parameters = @($ElementsPayload.items | Where-Object { $_.kind -eq 'Parameter' } | ForEach-Object {
    [ordered]@{ name = [string]$_.name; type = [string]$_.displayType; scope = [string]$_.displayScope; path = [string]$_.path }
  })
  $variables = @($ElementsPayload.items | Where-Object { $_.kind -eq 'Variable' } | ForEach-Object {
    [ordered]@{ name = [string]$_.name; type = [string]$_.displayType; scope = [string]$_.displayScope; path = [string]$_.path }
  })
  $readErrors = @()
  if (-not $ReadPassed) { $readErrors += 'one_or_more_live_reads_failed' }
  $exportManifest = if ($null -ne $ExportPayload.generatedCodeManifest) { $ExportPayload.generatedCodeManifest } else { $null }
  $inspection = [ordered]@{
    schemaVersion = 'ascet-inspection/v1'
    componentPath = [string]$Item.path
    objectKind = [string]$Summary.kind
    languageKind = [string]$Summary.languageKind
    complete = $ReadPassed
    summary = $Summary
    snapshot = $Snapshot
    methods = $methods
    interfaces = [ordered]@{ inputs = @(); outputs = @(); parameters = $parameters; variables = $variables }
    dependencies = @($RefsPayload.edges)
    operations = [ordered]@{
      summary = [ordered]@{ ok = ($null -ne $Summary) }
      snapshot = [ordered]@{ ok = ($null -ne $Snapshot) }
      methods = [ordered]@{ ok = ($null -ne $MethodsPayload) }
      elements = [ordered]@{ ok = ($null -ne $ElementsPayload) }
      components = [ordered]@{ ok = ($null -ne $ComponentsPayload) }
      references = [ordered]@{ ok = ($null -ne $RefsPayload) }
      implementation = [ordered]@{ ok = ($null -ne $ImplementationPayload) }
      generatedCodeExport = [ordered]@{ ok = $ExportReady; status = if ($null -ne $exportManifest) { [string]$exportManifest.status } else { 'not_ready' } }
    }
    warnings = @()
    errors = $readErrors
    cycles = @()
    raw = [ordered]@{ summary = $Summary; snapshot = $Snapshot; methods = $MethodsPayload; elements = $ElementsPayload; components = $ComponentsPayload; references = $RefsPayload; implementation = $ImplementationPayload; generatedCodeExport = $ExportPayload }
    liveExecutionStarted = $true
    exportStatus = if ($ExportReady) { 'ready' } else { 'not_ready' }
    generatedSources = if ($null -ne $exportManifest) { @($exportManifest.sourceFiles) } else { @() }
    testLevels = if ($ExportReady -and [string]$Summary.languageKind -eq 'ESDL') { @('class_ut', 'component_ct') } elseif ($ExportReady) { @('component_ct') } else { @() }
    unsupportedReasons = if ($Status -eq 'unsupported') { @('resolved_kind_or_language_not_supported') } elseif (-not $ExportReady) { @('generated_code_export_not_ready') } else { @() }
  }
  $canonical = $inspection | ConvertTo-Json -Depth 50 -Compress
  $inspection['sourceHash'] = Get-Sha256Text $canonical
  return $inspection
}

$results = @()
foreach ($item in $items) {
  # The loop is intentionally serial: ASCET ToolAPI/worker access is a single
  # global resource and this script never starts two live operations together.
  $itemRoot = Join-Path $OutputRoot $item.id
  New-Item -ItemType Directory -Force -Path $itemRoot | Out-Null
  $summary = Invoke-LiveRead $summaryExe @($item.path, '--json') (Join-Path $itemRoot 'summary.json')
  $snapshot = Invoke-LiveRead $snapshotExe @($item.path, '--trace-depth', '2', '--json') (Join-Path $itemRoot 'snapshot.json')
  $childrenMethods = Invoke-LiveRead $childrenExe @($item.path, '--group', 'methods', '--json') (Join-Path $itemRoot 'children-methods.json')
  $childrenElements = Invoke-LiveRead $childrenExe @($item.path, '--group', 'elements', '--json') (Join-Path $itemRoot 'children-elements.json')
  $childrenComponents = Invoke-LiveRead $childrenExe @($item.path, '--group', 'components', '--json') (Join-Path $itemRoot 'children-components.json')
  $refs = Invoke-LiveRead $refsExe @($item.path, '--direction', 'out', '--depth', '2', '--json') (Join-Path $itemRoot 'refs.json')
  $implementation = Invoke-LiveRead $implementationExe @($item.path, '--default', '--json') (Join-Path $itemRoot 'implementation.json')
  $exportRoot = Join-Path $itemRoot 'export'
  $export = Invoke-LiveRead $exportExe @($item.path, '--out', $exportRoot, '--no-asam2mc', '--generated-code-recursive', '--json') (Join-Path $itemRoot 'export.json')

  $summaryJson = $summary.json
  $exportJson = $export.json
  $resolvedKind = if ($null -ne $summaryJson.kind) { [string]$summaryJson.kind } else { 'unknown' }
  $languageKind = if ($null -ne $summaryJson.languageKind) { [string]$summaryJson.languageKind } else { 'unknown' }
  $exportReady = $null -ne $exportJson -and $exportJson.succeeded -eq $true -and $exportJson.generatedCodeManifest.status -eq 'ready'
  $readExitCodes = @($summary.exitCode, $snapshot.exitCode, $childrenMethods.exitCode, $childrenElements.exitCode, $childrenComponents.exitCode, $refs.exitCode, $implementation.exitCode)
  $readPassed = (@($readExitCodes | Where-Object { $_ -ne 0 }).Count -eq 0)
  $status = if ($readPassed -and $exportReady) { 'passed' } elseif ($readPassed -and $resolvedKind -eq 'unknown') { 'unsupported' } elseif (-not $readPassed) { 'failed' } else { 'blocked' }
  $entry = [ordered]@{
    id = $item.id
    componentPath = $item.path
    requestedKind = $item.kind
    resolvedKind = $resolvedKind
    languageKind = $languageKind
    status = $status
    readExitCodes = $readExitCodes
    exportExitCode = $export.exitCode
    exportStatus = if ($exportReady) { 'ready' } else { 'not_ready' }
    methods = if ($null -ne $childrenMethods.json) { @($childrenMethods.json.items).Count } else { 0 }
    implementationElements = if ($null -ne $summaryJson.counts.implementationElements) { [int]$summaryJson.counts.implementationElements } else { 0 }
    references = if ($null -ne $summaryJson.counts.references) { [int]$summaryJson.counts.references } else { 0 }
    generatedSources = if ($exportReady) { @($exportJson.generatedCodeManifest.sourceFiles) } else { @() }
    failureCode = if ($exportReady) { '' } elseif ($null -ne $exportJson.generatedCodeManifest -and @($exportJson.generatedCodeManifest.issues).Count -gt 0) { [string]$exportJson.generatedCodeManifest.issues[0] } else { 'live_export_failed' }
    unsupportedReasons = if ($status -eq 'unsupported') { @('resolved_kind_or_language_not_supported') } elseif (-not $exportReady) { @('generated_code_export_not_ready') } else { @() }
    evidenceDirectory = $itemRoot
  }
  $normalizedInspection = New-NormalizedInspection -Item $item -Summary $summaryJson -Snapshot $snapshot.json -MethodsPayload $childrenMethods.json -ElementsPayload $childrenElements.json -ComponentsPayload $childrenComponents.json -RefsPayload $refs.json -ImplementationPayload $implementation.json -ExportPayload $exportJson -ReadPassed $readPassed -ExportReady $exportReady -Status $status
  $normalizedInspection | ConvertTo-Json -Depth 50 | Set-Content -LiteralPath (Join-Path $itemRoot 'inspection.json') -Encoding UTF8
  if ($null -ne $exportJson.generatedCodeManifest) {
    $exportJson.generatedCodeManifest | ConvertTo-Json -Depth 50 | Set-Content -LiteralPath (Join-Path $itemRoot 'export-manifest.json') -Encoding UTF8
  }
  $results += [pscustomobject]$entry
}

$batch = [ordered]@{
  schemaVersion = 'ascet-live-inspection-batch/v1'
  status = if (@($results | Where-Object status -eq 'failed').Count -eq 0 -and @($results | Where-Object status -eq 'passed').Count -ge 3) { 'passed_with_coverage_gaps' } else { 'failed' }
  acceptanceGate = if (@($results | Where-Object status -eq 'failed').Count -eq 0 -and @($results | Where-Object status -eq 'passed').Count -ge 3) { 'passed' } else { 'failed' }
  serial = $true
  total = $results.Count
  passed = @($results | Where-Object status -eq 'passed').Count
  failed = @($results | Where-Object status -eq 'failed').Count
  unsupported = @($results | Where-Object status -eq 'unsupported').Count
  blocked = @($results | Where-Object status -eq 'blocked').Count
  items = $results
}
$batchPath = Join-Path $OutputRoot 'batch-inspection.json'
$batch | ConvertTo-Json -Depth 30 | Set-Content -LiteralPath $batchPath -Encoding UTF8
$batch | ConvertTo-Json -Depth 30
if ($batch.acceptanceGate -ne 'passed') { throw "ASCET live batch inspection/export acceptance gate failed. Evidence: $batchPath" }
