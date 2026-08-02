param(
  [switch]$Offline
)

$ErrorActionPreference = 'Stop'
$packageRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$cliPath = Join-Path $packageRoot 'ascet-cli\bin\AscetTest.exe'
$sourceRequestPath = Join-Path $packageRoot 'tmp\ascet-build-live\request.json'
$acceptanceRoot = Join-Path $packageRoot 'tmp\ascet-test-acceptance'
$positiveRoot = Join-Path $acceptanceRoot 'positive'

if (-not $Offline) {
  throw 'Only -Offline is supported in this internal gate; live ASCET remains serial-gated and is not part of this acceptance script.'
}

powershell -ExecutionPolicy Bypass -File (Join-Path $packageRoot 'scripts\build-ascet-test.ps1')
if ($LASTEXITCODE -ne 0) { throw 'AscetTest.exe build failed.' }
foreach ($required in @($cliPath, $sourceRequestPath)) {
  if (-not (Test-Path -LiteralPath $required)) { throw "Required acceptance input is missing: $required" }
}

Remove-Item -LiteralPath $acceptanceRoot -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force -Path $positiveRoot | Out-Null
$base = Get-Content -LiteralPath $sourceRequestPath -Raw | ConvertFrom-Json

function New-Request {
  param(
    [string]$RunId,
    [string]$RunDirectory,
    [string]$AdapterSource,
    [string]$GeneratedC,
    [string]$GccPath
  )
  $request = Get-Content -LiteralPath $sourceRequestPath -Raw | ConvertFrom-Json
  $request.runId = $RunId
  $request.runDirectory = $RunDirectory
  if (-not [string]::IsNullOrWhiteSpace($AdapterSource)) { $request.adapterSource = $AdapterSource }
  if (-not [string]::IsNullOrWhiteSpace($GeneratedC)) { $request.generatedCSources = @($GeneratedC) }
  if (-not [string]::IsNullOrWhiteSpace($GccPath)) { $request.toolchain.gccPath = $GccPath }
  $request | Add-Member -NotePropertyName verification -NotePropertyValue ([pscustomobject]@{ profile = 'offline' }) -Force
  $request | Add-Member -NotePropertyName run -NotePropertyValue ([pscustomobject]@{
    timeoutMs = 30000
    args = @('--gtest_color=no')
    runtimePath = @('C:/TDM-GCC-64/bin')
  }) -Force
  return $request
}

function Invoke-Action {
  param(
    [string]$Action,
    [string]$RequestPath,
    [string]$OutputPath
  )
  $consolePath = "$OutputPath.console.log"
  & $cliPath --action $Action --request $RequestPath --out $OutputPath --json *> $consolePath
  $exitCode = $LASTEXITCODE
  $response = Get-Content -LiteralPath $OutputPath -Raw | ConvertFrom-Json
  return [pscustomobject]@{ ExitCode = $exitCode; Response = $response; ConsolePath = $consolePath }
}

function Assert-Path {
  param([string]$Path)
  if (-not (Test-Path -LiteralPath $Path)) { throw "Expected artifact is missing: $Path" }
}

function Assert-FailedCode {
  param($Result, [string]$ExpectedCode)
  if ($Result.ExitCode -eq 0 -or $Result.Response.ok -or $Result.Response.status -eq 'passed') {
    throw "Expected failure but action passed: $ExpectedCode"
  }
  $actual = if ($null -ne $Result.Response.error) { $Result.Response.error.code } else { '' }
  if ($actual -ne $ExpectedCode) { throw "Expected failure code $ExpectedCode but got $actual" }
}

function Write-Request {
  param($Request, [string]$Directory, [string]$Name)
  $path = Join-Path $Directory $Name
  $Request | ConvertTo-Json -Depth 30 | Set-Content -LiteralPath $path -Encoding UTF8
  return $path
}

# Positive complete build -> run -> verify pipeline.
$positiveRequest = New-Request 'ascet-acceptance-positive' $positiveRoot '' '' ''
$positiveRequestPath = Write-Request $positiveRequest $positiveRoot 'pipeline-request.json'
$positiveResult = Invoke-Action 'pipeline' $positiveRequestPath (Join-Path $positiveRoot 'pipeline-response.json')
if ($positiveResult.ExitCode -ne 0 -or -not $positiveResult.Response.ok -or $positiveResult.Response.status -ne 'passed') {
  throw "Positive pipeline failed: $($positiveResult.Response | ConvertTo-Json -Compress -Depth 8)"
}
foreach ($artifact in @(
  'pipeline-state.json',
  'build-result.json',
  'run-result.json',
  'verify-result.json',
  'google-test\compile_commands.json',
  'google-test\test-results.xml'
)) { Assert-Path (Join-Path $positiveRoot $artifact) }
$state = Get-Content -LiteralPath (Join-Path $positiveRoot 'pipeline-state.json') -Raw | ConvertFrom-Json
if ($state.status -ne 'passed') { throw "Positive pipeline state is not passed: $($state.status)" }
foreach ($stageName in @('build', 'run', 'verify')) {
  $stage = @($state.stages | Where-Object { $_.stage -eq $stageName }) | Select-Object -First 1
  if ($null -eq $stage -or $stage.status -ne 'passed') { throw "Positive stage did not pass: $stageName" }
}
$binary = Join-Path $positiveRoot 'google-test\ascet_acceptance_positive.exe'
Assert-Path $binary
$format = (& C:\TDM-GCC-64\bin\objdump.exe -f $binary | Out-String)
if ($format -notmatch 'pei-i386' -or $format -notmatch 'architecture: i386') { throw 'Positive binary is not proven to be a 32-bit i386 executable.' }
$originalVerifyResultPath = Join-Path $positiveRoot 'verify-result.json'
$originalVerifyResult = Get-Content -LiteralPath $originalVerifyResultPath -Raw

# Missing compiler must stop at build preflight.
$missingRoot = Join-Path $acceptanceRoot 'missing-toolchain'
New-Item -ItemType Directory -Force -Path $missingRoot | Out-Null
$missingRequest = New-Request 'ascet-acceptance-missing-toolchain' $missingRoot '' '' 'C:/missing/does-not-exist-gcc.exe'
$missingResult = Invoke-Action 'pipeline' (Write-Request $missingRequest $missingRoot 'request.json') (Join-Path $missingRoot 'response.json')
Assert-FailedCode $missingResult 'toolchain_missing'

# C compiler failure must be classified by the build stage.
$cFailRoot = Join-Path $acceptanceRoot 'c-compile-failure'
New-Item -ItemType Directory -Force -Path $cFailRoot | Out-Null
$badC = Join-Path $cFailRoot 'broken.c'
'int broken( {' | Set-Content -LiteralPath $badC -Encoding ASCII
$cFailRequest = New-Request 'ascet-acceptance-c-failure' $cFailRoot '' $badC ''
$cFailResult = Invoke-Action 'pipeline' (Write-Request $cFailRequest $cFailRoot 'request.json') (Join-Path $cFailRoot 'response.json')
Assert-FailedCode $cFailResult 'c_compile_failed'

# Adapter failure must reach runtime and then verification evidence.
$runtimeFailRoot = Join-Path $acceptanceRoot 'runtime-failure'
New-Item -ItemType Directory -Force -Path $runtimeFailRoot | Out-Null
$failingAdapter = 'extern "C" int ascet_fixture_value(void); extern "C" int ascet_test_run_case(const char*, const char*) { return ascet_fixture_value() == 1 ? 1 : 0; }'
$runtimeRequest = New-Request 'ascet-acceptance-runtime-failure' $runtimeFailRoot $failingAdapter '' ''
$runtimeResult = Invoke-Action 'pipeline' (Write-Request $runtimeRequest $runtimeFailRoot 'request.json') (Join-Path $runtimeFailRoot 'response.json')
Assert-FailedCode $runtimeResult 'runtime_failed'

# A runtime timeout must terminate the child and remain a failed pipeline.
$timeoutRoot = Join-Path $acceptanceRoot 'runtime-timeout'
New-Item -ItemType Directory -Force -Path $timeoutRoot | Out-Null
$slowAdapter = '#include <windows.h>' + [Environment]::NewLine + 'extern "C" int ascet_fixture_value(void);' + [Environment]::NewLine + 'extern "C" int ascet_test_run_case(const char*, const char*) { Sleep(1000); return ascet_fixture_value() == 1 ? 0 : 1; }'
$timeoutRequest = New-Request 'ascet-acceptance-runtime-timeout' $timeoutRoot $slowAdapter '' ''
$timeoutRequest.run.timeoutMs = 50
$timeoutResult = Invoke-Action 'pipeline' (Write-Request $timeoutRequest $timeoutRoot 'request.json') (Join-Path $timeoutRoot 'response.json')
Assert-FailedCode $timeoutResult 'runtime_timeout'

# A ready build result that points at a missing binary must be blocked by RunService.
$originalRunResultPath = Join-Path $positiveRoot 'run-result.json'
$originalRunResult = Get-Content -LiteralPath $originalRunResultPath -Raw
$missingBinaryObject = Get-Content -LiteralPath (Join-Path $positiveRoot 'build-result.json') -Raw | ConvertFrom-Json
$missingBinaryObject.artifacts.binary = Join-Path $positiveRoot 'google-test\does-not-exist.exe'
$missingBinaryBuildPath = Join-Path $positiveRoot 'missing-binary-build-result.json'
$missingBinaryObject | ConvertTo-Json -Depth 30 | Set-Content -LiteralPath $missingBinaryBuildPath -Encoding UTF8
$missingBinaryRequest = New-Request 'ascet-acceptance-positive' $positiveRoot '' '' ''
$missingBinaryRequest | Add-Member -NotePropertyName buildResultPath -NotePropertyValue $missingBinaryBuildPath -Force
$missingBinaryResult = Invoke-Action 'run' (Write-Request $missingBinaryRequest $positiveRoot 'missing-binary-run-request.json') (Join-Path $positiveRoot 'missing-binary-run-response.json')
Assert-FailedCode $missingBinaryResult 'binary_missing'
Set-Content -LiteralPath $originalRunResultPath -Value $originalRunResult -Encoding UTF8

# Corrupting XML must make verify fail even when the process result was previously successful.
$originalXmlPath = Join-Path $positiveRoot 'google-test\test-results.xml'
$originalXml = Get-Content -LiteralPath $originalXmlPath -Raw
try {
  '<testsuites>' | Set-Content -LiteralPath $originalXmlPath -Encoding UTF8
  $xmlRequest = New-Request 'ascet-acceptance-positive' $positiveRoot '' '' ''
  $xmlRequest | Add-Member -NotePropertyName runResultPath -NotePropertyValue (Join-Path $positiveRoot 'run-result.json') -Force
  $xmlResult = Invoke-Action 'verify' (Write-Request $xmlRequest $positiveRoot 'xml-verify-request.json') (Join-Path $positiveRoot 'xml-verify-response.json')
  Assert-FailedCode $xmlResult 'gtest_xml_invalid'
}
finally {
  Set-Content -LiteralPath $originalXmlPath -Value $originalXml -Encoding UTF8
}

# Build evidence with an x64-style link command must fail verification.
$buildObject = Get-Content -LiteralPath (Join-Path $positiveRoot 'build-result.json') -Raw | ConvertFrom-Json
$linkCommand = @($buildObject.compileCommands | Where-Object { $_.language -eq 'link' }) | Select-Object -First 1
$linkCommand.arguments = @($linkCommand.arguments | Where-Object { $_ -ne '-m32' })
$badLinkBuildPath = Join-Path $positiveRoot 'bad-link-build-result.json'
$buildObject | ConvertTo-Json -Depth 30 | Set-Content -LiteralPath $badLinkBuildPath -Encoding UTF8
$linkRequest = New-Request 'ascet-acceptance-positive' $positiveRoot '' '' ''
$linkRequest | Add-Member -NotePropertyName buildResultPath -NotePropertyValue $badLinkBuildPath -Force
$linkRequest | Add-Member -NotePropertyName runResultPath -NotePropertyValue (Join-Path $positiveRoot 'run-result.json') -Force
$linkResult = Invoke-Action 'verify' (Write-Request $linkRequest $positiveRoot 'link-verify-request.json') (Join-Path $positiveRoot 'link-verify-response.json')
Assert-FailedCode $linkResult 'link_architecture_mismatch'

# A C source compiled by the C++ compiler must fail ownership verification.
$compilerObject = Get-Content -LiteralPath (Join-Path $positiveRoot 'build-result.json') -Raw | ConvertFrom-Json
$cCommand = @($compilerObject.compileCommands | Where-Object { $_.language -eq 'c' }) | Select-Object -First 1
$cCommand.compiler = 'C:/TDM-GCC-64/bin/g++.exe'
$badCompilerBuildPath = Join-Path $positiveRoot 'bad-compiler-build-result.json'
$compilerObject | ConvertTo-Json -Depth 30 | Set-Content -LiteralPath $badCompilerBuildPath -Encoding UTF8
$compilerRequest = New-Request 'ascet-acceptance-positive' $positiveRoot '' '' ''
$compilerRequest | Add-Member -NotePropertyName buildResultPath -NotePropertyValue $badCompilerBuildPath -Force
$compilerRequest | Add-Member -NotePropertyName runResultPath -NotePropertyValue (Join-Path $positiveRoot 'run-result.json') -Force
$compilerResult = Invoke-Action 'verify' (Write-Request $compilerRequest $positiveRoot 'compiler-verify-request.json') (Join-Path $positiveRoot 'compiler-verify-response.json')
Assert-FailedCode $compilerResult 'c_compiler_mismatch'

Set-Content -LiteralPath $originalVerifyResultPath -Value $originalVerifyResult -Encoding UTF8

Write-Host 'AscetTest internal offline acceptance passed, including negative verdict checks.'
