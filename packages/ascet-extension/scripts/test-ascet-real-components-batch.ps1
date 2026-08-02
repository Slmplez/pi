$ErrorActionPreference = 'Stop'

$packageRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$cliPath = Join-Path $packageRoot 'ascet-cli\bin\AscetTest.exe'
$outputRoot = 'E:\Rep\AscetCopolit\output\ascet-real-components-batch-20260802'
$releaseExport = 'E:\Rep\AscetCopolit\output\ascet-googletest-aeb-release-live-001\export-manifest.json'
$releaseGenerated = 'E:\Rep\AscetCopolit\output\ascet-googletest-aeb-release-live-001\generated-code'
$releaseTests = 'E:\Rep\AscetCopolit\tests\generated_c\AEB_Release'
$releaseRuntime = Join-Path $releaseTests 'mocks\ascet_project_runtime.c'
$releaseAdapter = Join-Path $releaseTests 'AEB_Release_adapter.cpp'
$releaseTest = Join-Path $releaseTests 'AEB_Release_test.cpp'
$legacyRoot = 'E:\ETAS\ASCET6.4\target\legacy'
$legacyPc = Join-Path $legacyRoot 'pc'
$legacyCommon = Join-Path $legacyRoot 'common'
$targetCommon = Join-Path $legacyRoot 'common'
$gccPath = 'E:\ETAS\ASCET6.4\Tools\compiler\mingw_GNU_472\bin\gcc.exe'
$gxxPath = 'E:\ETAS\ASCET6.4\Tools\compiler\mingw_GNU_472\bin\g++.exe'
$googleTestRoot = 'E:\Rep\AscetCopolit\output\ascet-live\real-acceptance-20260802\googletest-etas-compat'
$compatIncludeRoot = 'E:\Rep\AscetCopolit\output\ascet-live\real-acceptance-20260802\etas-compat-include'

foreach ($required in @($cliPath, $releaseExport, $releaseGenerated, $releaseRuntime, $releaseAdapter, $releaseTest, $gccPath, $gxxPath, $googleTestRoot)) {
  if (-not (Test-Path -LiteralPath $required)) { throw "Required real-component artifact is missing: $required" }
}

if (Test-Path -LiteralPath $outputRoot) { Remove-Item -LiteralPath $outputRoot -Recurse -Force }
$releaseRun = Join-Path $outputRoot 'aeb-release'
$xpassRun = Join-Path $outputRoot 'xpass'
New-Item -ItemType Directory -Force -Path $releaseRun, $xpassRun | Out-Null

$releaseRuntimeShim = Join-Path $releaseRun 'ascet_release_runtime.c'
@'
#include "a_basdef.h"
#include "a_dacqui.h"
#include "AEB_Release_DEFAULTM.h"
#undef malloc
#undef calloc
#undef free
#include <stdlib.h>

void *asdMalloc(uint32 size) { return calloc(1U, (size_t)size); }
void *asdMallocNoInit(size_t size) { return malloc(size); }
void *asdCalloc(size_t count, size_t size) { return calloc(count, size); }
void asdFree(void *block) { free(block); }

uint8_Obj *v3_initInstance_uint8(uint8 value, uint32 attribute) {
  uint8_Obj *object = (uint8_Obj *)calloc(1U, sizeof(uint8_Obj));
  object->val = value; object->logIndex = attribute; return object;
}
real64_Obj *v3_initInstance_real64(real64 value, uint32 attribute) {
  real64_Obj *object = (real64_Obj *)calloc(1U, sizeof(real64_Obj));
  object->val = value; object->logIndex = attribute; return object;
}

void asdSimPreCall(uint8 *buffer) { (void)buffer; }
void asdSimPostCall(uint8 *buffer) { (void)buffer; }
sint32 addBlock(void *buffer, void *arg, uint32 bytes) { (void)buffer; (void)arg; (void)bytes; return 0; }
sint32 removeBlock(void *buffer, void *arg, uint32 bytes) { (void)buffer; (void)arg; (void)bytes; return 0; }
'@ | Set-Content -LiteralPath $releaseRuntimeShim -Encoding ASCII

$releaseManifest = Get-Content -LiteralPath $releaseExport -Raw | ConvertFrom-Json
$releaseSources = @($releaseManifest.sourceFiles | ForEach-Object { Join-Path $releaseGenerated $_ })
$adapterSource = (Get-Content -LiteralPath $releaseAdapter -Raw) + "`r`nextern `"C`" int ascet_test_run_case(const char*, const char*) { return 0; }`r`n"
$releaseRequest = [ordered]@{
  schemaVersion = 'ascet-test-request/v1'
  runId = 'real-aeb-release-class-ut'
  componentPath = 'PlatformLibrary\Package\AEB_AutomaticEmergencyBrake\Private\AEB_Core\AEB_Release'
  levels = @('class_ut')
  runDirectory = $releaseRun
  generatedCSources = $releaseSources
  cTestSources = @($releaseRuntimeShim)
  adapterSource = $adapterSource
  testSources = @($releaseTest)
  exportManifestPath = $releaseExport
  contract = [ordered]@{
    schemaVersion = 'ascet-test-contract/v1'
    componentPath = 'PlatformLibrary\Package\AEB_AutomaticEmergencyBrake\Private\AEB_Core\AEB_Release'
    suites = @([ordered]@{
      id = 'AEB_Release_class_ut'
      level = 'class_ut'
      entryPoint = 'AEB_Release'
      dependencyMode = 'stub'
      cases = @([ordered]@{ id = 'nominal'; inputs = [ordered]@{}; expectedOutputs = [ordered]@{ initialized = $true }; oracleSource = 'requirement' })
    })
  }
  toolchain = [ordered]@{ gccPath = $gccPath; gxxPath = $gxxPath; googleTestRoot = $googleTestRoot; googleTestLibraries = @() }
  cFlags = @('-m32','-O0','-g','-std=gnu89','-DWIN32','-DSTRICT','-D_WINDOWS','-DSIM_PC','-DPC_TEST','-DTARGET_PC','-DENDIANESS_LSB','-D_POSIX_SOURCE','-I',$compatIncludeRoot,'-I',$releaseGenerated,'-I',$targetCommon,'-I',$legacyRoot,'-I',$legacyPc,'-I',$legacyCommon)
  cppFlags = @('-m32','-O0','-g','-std=gnu++11','-DWIN32','-DSTRICT','-D_WINDOWS','-DSIM_PC','-DPC_TEST','-DTARGET_PC','-DENDIANESS_LSB','-D_POSIX_SOURCE','-I',$compatIncludeRoot,'-I',$releaseGenerated,'-I',$releaseTests,'-I',$targetCommon,'-I',$legacyRoot,'-I',$legacyPc,'-I',$legacyCommon)
  linkFlags = @('-m32','-O0','-g')
  run = [ordered]@{ timeoutMs = 30000; args = @('--gtest_color=no'); runtimePath = @('E:\ETAS\ASCET6.4\Tools\compiler\mingw_GNU_472\bin') }
  verification = [ordered]@{ profile = 'offline'; requireExport = $true; exportManifestPath = $releaseExport; requireCaseCoverage = $true }
}
$releaseRequestPath = Join-Path $releaseRun 'request.json'
$releaseRequest | ConvertTo-Json -Depth 40 | Set-Content -LiteralPath $releaseRequestPath -Encoding UTF8

$xpassSource = Get-Content -LiteralPath 'E:\Rep\AscetCopolit\output\ascet-live\real-acceptance-20260802\pipeline-request.json' -Raw | ConvertFrom-Json
$xpassSource.runId = 'real-xpass-component-ct'
$xpassSource.runDirectory = $xpassRun
$xpassSource | Add-Member -NotePropertyName executeLive -NotePropertyValue $false -Force
$xpassRequestPath = Join-Path $xpassRun 'request.json'
$xpassSource | ConvertTo-Json -Depth 40 | Set-Content -LiteralPath $xpassRequestPath -Encoding UTF8

$batchRequest = [ordered]@{
  schemaVersion = 'ascet-test-batch/v1'
  runId = 'real-components-manifest-batch'
  runDirectory = $outputRoot
  items = @(
    [ordered]@{ id = 'aeb-release-class-ut'; requestPath = $releaseRequestPath }
    [ordered]@{ id = 'xpass-component-ct'; requestPath = $xpassRequestPath }
  )
}
$batchRequestPath = Join-Path $outputRoot 'batch-request.json'
$batchResponsePath = Join-Path $outputRoot 'batch-response.json'
$batchRequest | ConvertTo-Json -Depth 40 | Set-Content -LiteralPath $batchRequestPath -Encoding UTF8

& $cliPath --action batch --request $batchRequestPath --out $batchResponsePath --json | Out-Null
$exitCode = $LASTEXITCODE
$response = Get-Content -LiteralPath $batchResponsePath -Raw | ConvertFrom-Json
if ($exitCode -ne 0 -or -not $response.ok -or $response.status -ne 'passed') {
  throw "Real component batch failed. exitCode=$exitCode status=$($response.status) error=$($response.error | ConvertTo-Json -Compress)"
}
if ($response.data.total -ne 2 -or $response.data.passed -ne 2 -or $response.data.failed -ne 0) { throw 'Real component batch totals are not 2/2/0.' }
foreach ($run in @($releaseRun, $xpassRun)) {
  foreach ($artifact in @('build-result.json','run-result.json','verify-result.json','report.json','report.md','junit.xml')) {
    if (-not (Test-Path -LiteralPath (Join-Path $run $artifact))) { throw "Real component artifact is missing: $(Join-Path $run $artifact)" }
  }
}
Write-Host 'Two real ASCET generated-C components passed the manifest-only GoogleTest batch.'
