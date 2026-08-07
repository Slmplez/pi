param(
    [string]$RepoRoot = (Split-Path -Parent $PSScriptRoot)
)

$ErrorActionPreference = 'Stop'

$skillsRoot = Join-Path $RepoRoot 'skills'
$indexPath = Join-Path $skillsRoot 'index.json'

function Get-PlainText {
    param([object]$Value)
    if ($null -eq $Value) { return '' }
    if ($Value -is [string]) { return [string]$Value }
    if ($Value.PSObject -and $null -ne $Value.PSObject.BaseObject) { return [string]$Value.PSObject.BaseObject }
    return [string]$Value
}

function Get-FrontmatterValue {
    param(
        [object[]]$Lines,
        [string]$Key
    )

    foreach ($rawLine in $Lines[0..([Math]::Min($Lines.Count - 1, 20))]) {
        $line = Get-PlainText $rawLine
        if ($line -match ('^' + [regex]::Escape($Key) + ':\s*(.+)$')) {
            return [string]$Matches[1].Trim()
        }
    }

    return ''
}

function Get-SectionList {
    param(
        [object[]]$Lines,
        [string]$SectionName
    )

    $results = @()
    $inSection = $false
    foreach ($rawLine in $Lines) {
        $line = Get-PlainText $rawLine
        if ($line -match '^##\s+(.+)$') {
            $inSection = ($Matches[1].Trim() -eq $SectionName)
            continue
        }

        if ($inSection -and $line -match '^-\s+(.*)$') {
            $results += [string]$Matches[1]
        }
    }

    return @($results)
}

$skills = @()
foreach ($dir in Get-ChildItem -Path $skillsRoot -Directory | Sort-Object Name) {
    $skillPath = Join-Path $dir.FullName 'SKILL.md'
    if (-not (Test-Path $skillPath)) { continue }

    [object[]]$lines = @(Get-Content -Path $skillPath)
    $titleLine = $lines | Where-Object { (Get-PlainText $_) -match '^# ' } | Select-Object -First 1
    $title = [string]((Get-PlainText $titleLine) -replace '^#\s+', '')

    $metadataMap = @{}
    foreach ($item in Get-SectionList -Lines $lines -SectionName 'Metadata') {
        if ($item -match '^`([^`]+)`:\s*(.+)$') {
            $metadataMap[$Matches[1]] = [string]$Matches[2]
        }
    }

    $commandExamples = @()
    $inCommand = $false
    foreach ($rawLine in $lines) {
        $line = Get-PlainText $rawLine
        if ($line -eq '## Command') { $inCommand = $true; continue }
        if ($inCommand -and $line -match '^##\s+') { $inCommand = $false }
        if ($inCommand -and $line -notin @('```powershell', '```', '')) {
            $commandExamples += [string]$line
        }
    }

    $related = @((Get-SectionList -Lines $lines -SectionName 'Related') | ForEach-Object { [string](Get-PlainText $_) })

    $skills += [ordered]@{
        slug = [string]$dir.Name
        skill_path = [string]$skillPath
        name = [string](Get-FrontmatterValue -Lines $lines -Key 'name')
        description = [string](Get-FrontmatterValue -Lines $lines -Key 'description')
        title = $title
        metadata = [ordered]@{
            component_kind = [string]$metadataMap['component-kind']
            operation_kind = [string]$metadataMap['operation-kind']
            access_mode = [string]$metadataMap['access-mode']
            live_safety = [string]$metadataMap['live-safety']
        }
        command_examples = @($commandExamples | ForEach-Object { [string](Get-PlainText $_) })
        related = $related
        has_agents_metadata = [bool](Test-Path (Join-Path $dir.FullName 'agents\openai.yaml'))
        has_scripts = [bool](Test-Path (Join-Path $dir.FullName 'scripts'))
        has_references = [bool](Test-Path (Join-Path $dir.FullName 'references'))
        has_assets = [bool](Test-Path (Join-Path $dir.FullName 'assets'))
    }
}

$index = [ordered]@{
    schema_version = '1.0.0'
    generated_at = (Get-Date).ToString('yyyy-MM-ddTHH:mm:ssK')
    repo_root = [string]$RepoRoot
    skills_root = [string]$skillsRoot
    skill_count = $skills.Count
    skills = $skills
}

$index | ConvertTo-Json -Depth 8 | Set-Content -Path $indexPath -Encoding UTF8
Write-Host ('Generated skills index: ' + $indexPath + ' (' + $skills.Count + ' skills)')
