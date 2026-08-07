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
$retiredCommandIds = @(
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
$obsoleteFamilies = @('search', 'explore', 'index')

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
      Select-String -Pattern '"family"\s*:\s*"(search|explore|index)"'
  )
  if ($obsoleteFamilyMatches.Count -gt 0) {
    $firstMatch = $obsoleteFamilyMatches[0]
    throw "Obsolete ASCET contract family token remains: $($firstMatch.Path):$($firstMatch.LineNumber)"
  }
}

Write-Host 'ASCET get contracts validated.'