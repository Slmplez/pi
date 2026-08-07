param(
    [string]$RepoRoot = (Split-Path -Parent $PSScriptRoot)
)

$ErrorActionPreference = 'Stop'

$skillsRoot = Join-Path $RepoRoot 'skills'
$manifestPath = Join-Path $skillsRoot 'cli-skills-manifest.json'

if (-not (Test-Path $manifestPath)) {
    throw "Manifest not found: $manifestPath"
}

$manifest = Get-Content -Path $manifestPath -Raw | ConvertFrom-Json

foreach ($entry in $manifest) {
    $dir = Join-Path $skillsRoot $entry.slug
    New-Item -ItemType Directory -Force -Path $dir | Out-Null

    $skillPath = Join-Path $dir 'SKILL.md'
    $content = @()
    $content += '---'
    $content += ('name: ' + $entry.name)
    $content += ('description: ' + $entry.description)
    $content += '---'
    $content += ''
    $content += ('# ' + $entry.title)
    $content += ''
    $content += '## Overview'
    $content += ('This skill wraps `.\output\ascet-csharp\bin\' + $entry.exe_name + '.exe`.')
    $content += 'Prefer this CLI when you want a stable command-line or JSON interface instead of calling the lower-level ASCET ToolAPI directly.'
    $content += ''
    $content += '## Metadata'
    $content += ('- `component-kind`: ' + $entry.metadata.component_kind)
    $content += ('- `operation-kind`: ' + $entry.metadata.operation_kind)
    $content += ('- `access-mode`: ' + $entry.metadata.access_mode)
    $content += ('- `live-safety`: ' + $entry.metadata.live_safety)
    $content += ''
    $content += '## When to Use'
    foreach ($line in $entry.use_cases) { $content += ('- ' + $line) }
    $content += ''
    $content += '## Command'
    foreach ($cmd in $entry.commands) {
        $content += '```powershell'
        $content += $cmd
        $content += '```'
    }
    $content += ''
    $content += '## Inputs'
    foreach ($line in $entry.inputs) { $content += ('- ' + $line) }
    $content += ''
    $content += '## Output'
    foreach ($line in $entry.outputs) { $content += ('- ' + $line) }
    $content += ''
    $content += '## Constraints'
    foreach ($line in $entry.constraints) { $content += ('- ' + $line) }
    $content += ''
    $content += '## Related'
    foreach ($line in $entry.related) { $content += ('- ' + $line) }
    $content += ''
    $content += '## Reference'
    $content += '- Main repository reference: [docs/ascet-cli-reference.md](/E:/Rep/AscetAgent/src/ascetcli/docs/ascet-cli-reference.md)'

    Set-Content -Path $skillPath -Value $content -Encoding UTF8
}

Write-Host ('Generated ' + $manifest.Count + ' CLI skills from manifest: ' + $manifestPath)
