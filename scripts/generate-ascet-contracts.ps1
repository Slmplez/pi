$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$contractRoots = @(
  (Join-Path $repoRoot 'ascetcli\contracts'),
  (Join-Path $repoRoot 'packages\ascet-extension\ascet-cli\contracts')
)
$requiredGetCommands = @(
  'AscetGetTree',
  'AscetGetElements',
  'AscetGetFormulas',
  'AscetGetComponentRefs',
  'AscetGetBdeEdges',
  'AscetGetImportBinding',
  'AscetGetDbitemRefs'
)
$requiredSetElementDependencyOptions = @(
  '--variant-mapping',
  '--variant-policy',
  '--variant',
  '--restoration-policy',
  '--restore-value',
  '--overlay-spec'
)
$retiredCommandIds = @(
  'AscetBenchmark',
  'AscetOrchestrator',
  'AscetReadDomainDeepCheck',
  'AscetReadDomainQuickCheck',
  'AscetReadDomainSmoke',
  'AscetReadHost',
  'AscetReadOnlyExample',
  'AscetSelfTest',
  'AscetThreadHarness',
  'AscetWorker',
  'AscetFindElements',
  'AscetListComponents',
  'AscetListDiagrams',
  'AscetListFolders',
  'AscetListMethods',
  'AscetReadComponentChildren',
  'AscetReadComponentSummary',
  'AscetReadProjectFormulas',
  'AscetShowOccurrences',
  'AscetResolveComponent',
  'AscetSearchComponents',
  'AscetSearchElements',
  'AscetSearchOccurrences',
  'AscetWarmSearchIndex'
)
$retiredOperations = @(
  'find_elements',
  'list_components',
  'list_diagrams',
  'list_folders',
  'list_methods',
  'read_component_children',
  'read_component_summary',
  'read_project_formulas',
  'show_occurrences',
  'resolve_component',
  'search_components',
  'search_elements',
  'search_occurrences',
  'warm_search_index'
)
$obsoleteFamilies = @('search', 'explore', 'index', 'ops')
$bridgePath = Join-Path $repoRoot 'ascetcli\output\ascet-csharp\bin\AscetBridge.exe'
if (-not (Test-Path -LiteralPath $bridgePath)) {
  throw "ASCET Bridge is missing for contract validation: $bridgePath"
}
$capabilitiesOutput = & $bridgePath capabilities --json 2>&1
if ($LASTEXITCODE -ne 0) {
  throw "ASCET Bridge capabilities failed during contract validation.`n$($capabilitiesOutput | Out-String)"
}
$capabilitiesEnvelope = ($capabilitiesOutput | Out-String).Trim() | ConvertFrom-Json
if (-not $capabilitiesEnvelope.ok) {
  throw 'ASCET Bridge capabilities returned ok=false during contract validation.'
}
$capabilityRoutes = @($capabilitiesEnvelope.result.routes)
$capabilityRouteByOperation = @{}
foreach ($route in $capabilityRoutes) {
  $capabilityRouteByOperation[$route.operationId] = $route
}

foreach ($contractsRoot in $contractRoots) {
  $catalogPath = Join-Path $contractsRoot 'cli-catalog.json'
  if (-not (Test-Path -LiteralPath $catalogPath)) {
    throw "ASCET contract catalog is missing: $catalogPath"
  }

  $catalog = Get-Content -LiteralPath $catalogPath -Raw | ConvertFrom-Json
  $catalogCommands = @($catalog.commands)
  $duplicateCatalogIds = @($catalogCommands | Group-Object id | Where-Object Count -gt 1 | Select-Object -ExpandProperty Name)
  if ($duplicateCatalogIds.Count -gt 0) {
    throw "ASCET contract catalog contains duplicate command ids: $($duplicateCatalogIds -join ', ')"
  }

  $normalizedContractRoutes = New-Object System.Collections.Generic.HashSet[string]
  foreach ($command in $catalogCommands) {
    $execution = $command.execution
    if ($null -eq $execution -or $execution.kind -ne 'bridge') {
      throw "ASCET production command must use execution.kind=bridge: $($command.id)"
    }
    if ($execution.protocolVersion -ne 1 -or $execution.sessionPolicy -ne 'fresh_session' -or $execution.transportPolicy -ne 'one_shot_only') {
      throw "ASCET production command has invalid Bridge policy metadata: $($command.id)"
    }
    if (-not $command.requiresSerialLiveAccess) {
      throw "ASCET production command must declare requiresSerialLiveAccess=true: $($command.id)"
    }
    if ($execution.PSObject.Properties.Name -contains 'executableRelativePath') {
      throw "ASCET production command must not contain executableRelativePath: $($command.id)"
    }
    if ($execution.subcommand -notin @('exec', 'batch') -or [string]::IsNullOrWhiteSpace($execution.operation)) {
      throw "ASCET production command has an invalid Bridge route: $($command.id)"
    }
    $route = $capabilityRouteByOperation[$execution.operation]
    if ($null -eq $route) {
      throw "ASCET production command is absent from Bridge capabilities: $($command.id) -> $($execution.operation)"
    }
    if ($route.routeVisibility -ne 'public_contract') {
      throw "ASCET production command targets a non-public Bridge route: $($command.id) -> $($execution.operation)"
    }
    if ($execution.subcommand -eq 'batch' -and $route.batchSupport -eq 'none') {
      throw "ASCET production batch command targets an operation without batch support: $($command.id)"
    }
    if ($command.risk -in @('write', 'destructive') -and -not $route.mutatesDatabase) {
      throw "ASCET write/destructive contract targets a non-mutating Bridge route: $($command.id)"
    }
    if ($route.mutatesDatabase -and $command.risk -notin @('write', 'destructive')) {
      throw "ASCET mutating Bridge route must use write/destructive contract risk: $($command.id)"
    }
    $routeSupportsBatch = $route.batchSupport -ne 'none'
    if ([bool]$command.supportsBatch -ne $routeSupportsBatch) {
      throw "ASCET contract supportsBatch does not match Bridge capabilities: $($command.id)"
    }
    $normalizedRoute = "$($execution.subcommand):$($execution.operation)"
    if (-not $normalizedContractRoutes.Add($normalizedRoute)) {
      throw "ASCET production contract contains a duplicate normalized route: $normalizedRoute"
    }
  }

  foreach ($route in @($capabilityRoutes | Where-Object { $_.routeVisibility -eq 'public_contract' })) {
    if (-not $normalizedContractRoutes.Contains("exec:$($route.operationId)")) {
      throw "Public Bridge exec capability is absent from the production contract: $($route.operationId)"
    }
  }
  foreach ($command in $catalogCommands) {
    if ([string]::IsNullOrWhiteSpace($command.id)) {
      throw "ASCET contract catalog contains a command without an id: $catalogPath"
    }
    if ($command.id -in $retiredCommandIds -or $command.family -in $obsoleteFamilies) {
      throw "ASCET contract catalog exposes a retired command: $($command.id)"
    }

    $commandPath = Join-Path $contractsRoot (Join-Path 'commands' ($command.id + '.json'))
    if (-not (Test-Path -LiteralPath $commandPath)) {
      throw "ASCET contract catalog command is missing its contract: $commandPath"
    }

    $commandContract = Get-Content -LiteralPath $commandPath -Raw | ConvertFrom-Json
    if ($commandContract.id -ne $command.id) {
      throw "ASCET contract id mismatch for $commandPath"
    }
    if (-not $commandContract.requiresSerialLiveAccess) {
      throw "ASCET command contract must declare requiresSerialLiveAccess=true: $commandPath"
    }
    if ($commandContract.execution.kind -ne $command.execution.kind -or
        $commandContract.execution.protocolVersion -ne $command.execution.protocolVersion -or
        $commandContract.execution.subcommand -ne $command.execution.subcommand -or
        $commandContract.execution.operation -ne $command.execution.operation -or
        $commandContract.execution.sessionPolicy -ne $command.execution.sessionPolicy -or
        $commandContract.execution.transportPolicy -ne $command.execution.transportPolicy) {
      throw "ASCET catalog/command execution metadata mismatch: $commandPath"
    }
    if ($command.id -eq 'AscetSetElementDependency') {
      $argumentNames = @($commandContract.args | ForEach-Object { $_.name })
      foreach ($requiredOption in $requiredSetElementDependencyOptions) {
        if ($requiredOption -notin $argumentNames -or $commandContract.usage -notlike "*$requiredOption*") {
          throw "ASCET set-element-dependency contract is missing runtime option $requiredOption`: $commandPath"
        }
      }
    }
  }

  foreach ($commandId in $requiredGetCommands) {
    $commandPath = Join-Path $contractsRoot (Join-Path 'commands' ($commandId + '.json'))
    if (-not (Test-Path -LiteralPath $commandPath)) {
      throw "ASCET get contract is missing: $commandPath"
    }

    $command = Get-Content -LiteralPath $commandPath -Raw | ConvertFrom-Json
    if ($command.id -ne $commandId -or $command.operation -notlike 'get_*') {
      throw "ASCET get contract is invalid: $commandPath"
    }

    if (-not @($catalogCommands | Where-Object { $_.id -eq $commandId -and $_.operation -eq $command.operation })) {
      throw "ASCET contract catalog does not contain $commandId in $catalogPath"
    }
  }

  foreach ($commandId in $retiredCommandIds) {
    $commandPath = Join-Path $contractsRoot (Join-Path 'commands' ($commandId + '.json'))
    if (Test-Path -LiteralPath $commandPath) {
      throw "Retired ASCET contract must be removed: $commandPath"
    }
  }

  foreach ($family in $obsoleteFamilies) {
    $familyPath = Join-Path $contractsRoot (Join-Path 'families' ($family + '.json'))
    if (Test-Path -LiteralPath $familyPath) {
      throw "Obsolete ASCET contract family must be removed: $familyPath"
    }
  }

  Get-ChildItem -LiteralPath (Join-Path $contractsRoot 'families') -File -Filter '*.json' | ForEach-Object {
    $familyContract = Get-Content -LiteralPath $_.FullName -Raw | ConvertFrom-Json
    foreach ($commandId in @($familyContract.commandIds)) {
      $commandPath = Join-Path $contractsRoot (Join-Path 'commands' ($commandId + '.json'))
      if (-not (Test-Path -LiteralPath $commandPath)) {
        throw "ASCET family contract references a missing command: $($_.FullName) -> $commandId"
      }
    }
  }

  Get-ChildItem -LiteralPath (Join-Path $contractsRoot 'playbooks') -File -Filter '*.json' | ForEach-Object {
    $playbook = Get-Content -LiteralPath $_.FullName -Raw | ConvertFrom-Json
    foreach ($step in @($playbook.steps | Where-Object { $_.kind -eq 'command' })) {
      $commandPath = Join-Path $contractsRoot (Join-Path 'commands' ($step.commandId + '.json'))
      if (-not (Test-Path -LiteralPath $commandPath)) {
        throw "ASCET playbook references a missing command: $($_.FullName) -> $($step.commandId)"
      }
    }
  }

  $prohibitedProductionMatches = @(
    Get-ChildItem -LiteralPath $contractsRoot -Recurse -File -Filter '*.json' |
      Select-String -Pattern '"kind"\s*:\s*"(standalone|unified_cli)"|executableRelativePath|AscetCli\.exe|AscetReadHost\.exe|AscetWorker\.exe|AscetOrchestrator\.exe'
  )
  if ($prohibitedProductionMatches.Count -gt 0) {
    $firstMatch = $prohibitedProductionMatches[0]
    throw "Prohibited pre-Bridge production contract token remains: $($firstMatch.Path):$($firstMatch.LineNumber)"
  }
  $legacyTokenMatches = @(
    Get-ChildItem -LiteralPath $contractsRoot -Recurse -File -Filter '*.json' |
      Select-String -SimpleMatch -Pattern ($retiredCommandIds + $retiredOperations)
  )
  if ($legacyTokenMatches.Count -gt 0) {
    $firstMatch = $legacyTokenMatches[0]
    throw "Retired ASCET contract token remains: $($firstMatch.Path):$($firstMatch.LineNumber)"
  }

  $obsoleteFamilyMatches = @(
    Get-ChildItem -LiteralPath $contractsRoot -Recurse -File -Filter '*.json' |
      Select-String -Pattern '"family"\s*:\s*"(search|explore|index|ops)"'
  )
  if ($obsoleteFamilyMatches.Count -gt 0) {
    $firstMatch = $obsoleteFamilyMatches[0]
    throw "Obsolete ASCET contract family token remains: $($firstMatch.Path):$($firstMatch.LineNumber)"
  }
}

Write-Host 'ASCET get contracts validated.'
