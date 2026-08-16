Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$buildScript = Join-Path $PSScriptRoot 'build-ascet-search.ps1'
& $buildScript
if ($LASTEXITCODE -ne 0) {
    throw 'ASCET Search build failed.'
}

$executable = Join-Path (Split-Path -Parent $PSScriptRoot) 'output\ascet-search\AscetSearch.exe'
$jsonText = & $executable types
if ($LASTEXITCODE -ne 0) {
    throw 'AscetSearch types command failed.'
}

$payload = $jsonText | ConvertFrom-Json
if (-not $payload.ok) {
    throw 'AscetSearch types returned ok=false.'
}

$expected = [ordered]@{
    'comp' = 'Components'
    'comp-ref' = 'References to component'
    'method' = 'Declarations of method/process'
    'method-ref' = 'References to method/process'
    'method-element' = 'Declarations of method/process element'
    'element' = 'Declarations of element'
    'element-ref' = 'References to element'
    'sender' = 'Senders of message'
    'receiver' = 'Receivers of message'
    'text' = 'Text in ESDL or C code'
}
$actualProperties = @($payload.types.PSObject.Properties)
if ($actualProperties.Count -ne $expected.Count) {
    throw "Expected $($expected.Count) native Search menu types, received $($actualProperties.Count)."
}
foreach ($entry in $expected.GetEnumerator()) {
    $actual = $payload.types.PSObject.Properties[$entry.Key]
    if ($null -eq $actual -or $actual.Value -ne $entry.Value) {
        throw "Search type '$($entry.Key)' did not map to '$($entry.Value)'."
    }
}

$plainHelp = & $executable help -p
if ($LASTEXITCODE -ne 0 -or ($plainHelp -join "`n") -notmatch 'Default output is compact JSON') {
    throw 'AscetSearch plain help contract failed.'
}

Write-Host 'ASCET Search CLI offline contract test passed.'
