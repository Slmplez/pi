param(
  [string]$ComponentPath = 'PlatformLibrary\Package\AEB_AutomaticEmergencyBrake\Component\XPass_BB00000_AEB',
  [string]$OutputRoot = 'E:\Rep\AscetCopolit\output\ascet-live\real-acceptance-20260802'
)

$ErrorActionPreference = 'Stop'

$packageRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$ascetRoot = 'E:\Rep\AscetCopolit'
$liveBin = Join-Path $ascetRoot 'output\ascet-csharp\bin'
$buildScript = Join-Path $packageRoot 'scripts\build-ascet-test.ps1'
$ascetTestExe = Join-Path $packageRoot 'ascet-cli\bin\AscetTest.exe'
$gccPath = 'E:\ETAS\ASCET6.4\Tools\compiler\mingw_GNU_472\bin\gcc.exe'
$gxxPath = 'E:\ETAS\ASCET6.4\Tools\compiler\mingw_GNU_472\bin\g++.exe'
$targetCommon = 'E:\ETAS\ASCET6.4\target\common'
$legacyRoot = 'E:\ETAS\ASCET6.4\target\legacy'
$legacyPc = Join-Path $legacyRoot 'pc'
$legacyCommon = Join-Path $legacyRoot 'common'
$systemLibrary = Join-Path $legacyPc 'lib\libsystem_gnu_472.a'
$googleTestSourceRoot = Join-Path $packageRoot 'tmp\googletest-v1.10.0'

New-Item -ItemType Directory -Force -Path $OutputRoot | Out-Null
$exportDirectory = Join-Path $OutputRoot 'xpass-export'
$exportJsonPath = Join-Path $OutputRoot 'live-export.json'
$snapshotPath = Join-Path $OutputRoot 'live-readback.json'
$summaryPath = Join-Path $OutputRoot 'live-summary.json'
$requestPath = Join-Path $OutputRoot 'pipeline-request.json'
$responsePath = Join-Path $OutputRoot 'pipeline-response.json'
$runtimeShimPath = Join-Path $OutputRoot 'google-test\tests\ascet_runtime_shim.cpp'
$compatRoot = Join-Path $OutputRoot 'googletest-etas-compat'
$compatIncludeRoot = Join-Path $OutputRoot 'etas-compat-include'

if (-not (Test-Path -LiteralPath $gccPath) -or -not (Test-Path -LiteralPath $gxxPath)) {
  throw 'ETAS MinGW 4.7.2 compiler was not found.'
}
if (-not (Test-Path -LiteralPath $systemLibrary)) {
  throw "ETAS PC runtime library was not found: $systemLibrary"
}
if (-not (Test-Path -LiteralPath $googleTestSourceRoot)) {
  throw "GoogleTest source tree was not found: $googleTestSourceRoot"
}

function Invoke-LiveJson {
  param(
    [Parameter(Mandatory = $true)][string]$Executable,
    [Parameter(Mandatory = $true)][string[]]$Arguments,
    [Parameter(Mandatory = $true)][string]$OutputPath
  )

  $output = & $Executable @Arguments 2>&1
  if ($LASTEXITCODE -ne 0) {
    throw "Live ToolAPI command failed ($LASTEXITCODE): $Executable`n$($output -join [Environment]::NewLine)"
  }
  $output | Set-Content -LiteralPath $OutputPath -Encoding UTF8
  return (Get-Content -LiteralPath $OutputPath -Raw -Encoding UTF8 | ConvertFrom-Json)
}

$summary = Invoke-LiveJson `
  -Executable (Join-Path $liveBin 'AscetReadComponentSummary.exe') `
  -Arguments @($ComponentPath, '--json') `
  -OutputPath $summaryPath

$snapshot = Invoke-LiveJson `
  -Executable (Join-Path $liveBin 'AscetReadComponentSnapshot.exe') `
  -Arguments @($ComponentPath, '--json') `
  -OutputPath $snapshotPath

$export = Invoke-LiveJson `
  -Executable (Join-Path $liveBin 'AscetExportBuildArtifacts.exe') `
  -Arguments @($ComponentPath, '--out', $exportDirectory, '--no-asam2mc', '--generated-code-recursive', '--json') `
  -OutputPath $exportJsonPath

if ($export.succeeded -ne $true -or $export.generatedCodeManifest.status -ne 'ready') {
  throw 'Live ASCET generated-code export did not produce a ready manifest.'
}

$generatedSource = [string]$export.generatedCodeManifest.componentSourcePath
$generatedDirectory = [string]$export.generatedCodeManifest.generatedDir
$headerName = [IO.Path]::GetFileName([string]$export.generatedCodeManifest.headerFiles[0])
if (-not (Test-Path -LiteralPath $generatedSource)) {
  throw "Live generated C source was not found: $generatedSource"
}

Copy-Item $googleTestSourceRoot $compatRoot -Recurse -Force
New-Item -ItemType Directory -Force -Path $compatIncludeRoot | Out-Null
$gtestPort = Join-Path $compatRoot 'googletest\include\gtest\internal\gtest-port.h'
$gtestPortText = (Get-Content -LiteralPath $gtestPort -Raw).Replace('[[noreturn]] ', '')
Set-Content -LiteralPath $gtestPort -Value $gtestPortText -Encoding UTF8
$gtestParam = Join-Path $compatRoot 'googletest\include\gtest\internal\gtest-param-util.h'
$gtestParamText = (Get-Content -LiteralPath $gtestParam -Raw).Replace('<::std::tuple', '< ::std::tuple')
Set-Content -LiteralPath $gtestParam -Value $gtestParamText -Encoding UTF8
@'
#ifndef ASCET_ETAS_COMPAT_CRTDBG_H
#define ASCET_ETAS_COMPAT_CRTDBG_H
#define _CRT_ASSERT 2
#define _CRTDBG_MODE_FILE 0x1
#define _CRTDBG_MODE_DEBUG 0x2
#define _CRTDBG_FILE_STDERR ((void*)-5)
#define _CRTDBG_REPORT_FLAG (-1)
#define _CRTDBG_ALLOC_MEM_DF 0x01
static inline int _CrtSetReportMode(int, int) { return 0; }
static inline void* _CrtSetReportFile(int, void*) { return (void*)0; }
static inline int _CrtSetDbgFlag(int flag) { static int current = 0; int previous = current; if (flag != _CRTDBG_REPORT_FLAG) current = flag; return previous; }
#endif
'@ | Set-Content -LiteralPath (Join-Path $compatIncludeRoot 'crtdbg.h') -Encoding ASCII
@'
#ifndef ASCET_ETAS_COMPAT_DEBUGAPI_H
#define ASCET_ETAS_COMPAT_DEBUGAPI_H
static inline HANDLE OpenThread(DWORD, BOOL, DWORD) { return (HANDLE)0; }
#endif
'@ | Set-Content -LiteralPath (Join-Path $compatIncludeRoot 'debugapi.h') -Encoding ASCII

& $buildScript | Out-Null
if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $ascetTestExe)) {
  throw "AscetTest.exe was not built: $ascetTestExe"
}

$adapterSource = @"
extern "C" {
#include "$headerName"
}

extern "C" int ascet_test_run_case(const char*, const char*) {
  _040QM00100001MO70OB0HFRCR50HG_Class value = {};
  initClass__040QM00100001MO70OB0HFRCR50HG(&value);
  if (value.ClutchPedalPosition == 0) return 1;
  if (value.ClutchPedalPosition == 0 || value.ClutchPedalPosition->val != 0.0) return 1;
  if (value.CurrentStateAEB == 0 || value.CurrentStateAEB->val != 0U) return 1;
  if (value.ESPAEBExecID == 0 || value.ESPAEBExecID->val != 0U) return 1;
  return 0;
}
"@

# The ASCET PC system archive is built for ASCET's host executable and expects
# these generated-model entry points from the final application. GoogleTest is
# the host executable here, so provide the narrow ABI bridge without modifying
# the live-exported C source.
New-Item -ItemType Directory -Force -Path (Split-Path -Parent $runtimeShimPath) | Out-Null
@"
extern "C" {
#include "$headerName"
}
#undef calloc
#undef malloc
#undef free
#include <cstdlib>

extern "C" void* asdMalloc(uint32 size) { return std::calloc(1U, size); }
extern "C" void* asdMallocNoInit(size_t size) { return std::malloc(size); }
extern "C" void* asdCalloc(size_t count, size_t size) { return std::calloc(count, size); }
extern "C" void asdFree(void* block) { std::free(block); }
extern "C" uint8_Obj* v3_initInstance_uint8(uint8 value, uint32) {
  uint8_Obj* object = static_cast<uint8_Obj*>(std::calloc(1U, sizeof(uint8_Obj)));
  object->val = value;
  return object;
}
extern "C" uint32_Obj* v3_initInstance_uint32(uint32 value, uint32) {
  uint32_Obj* object = static_cast<uint32_Obj*>(std::calloc(1U, sizeof(uint32_Obj)));
  object->val = value;
  return object;
}
extern "C" real64_Obj* v3_initInstance_real64(real64 value, uint32) {
  real64_Obj* object = static_cast<real64_Obj*>(std::calloc(1U, sizeof(real64_Obj)));
  object->val = value;
  return object;
}
"@ | Set-Content -LiteralPath $runtimeShimPath -Encoding ASCII

$request = [ordered]@{
  schemaVersion = 'ascet-test-request/v1'
  runId = 'xpass-live-acceptance'
  componentPath = $ComponentPath
  levels = @('component_ct')
  runDirectory = $OutputRoot
  generatedCSources = @($generatedSource)
  exportManifestPath = $exportJsonPath
  esdlReadbackPath = $snapshotPath
  adapterSource = $adapterSource
  testSources = @($runtimeShimPath)
  contract = [ordered]@{
    schemaVersion = 'ascet-test-contract/v1'
    componentPath = $ComponentPath
    suites = @(
      [ordered]@{
        id = 'XPass_BB00000_AEB_component_ct'
        level = 'component_ct'
        entryPoint = 'XPass_BB00000_AEB'
        dependencyMode = 'real'
        cases = @(
          [ordered]@{
            id = 'initialization_defaults'
            inputs = [ordered]@{}
            expectedOutputs = [ordered]@{ initialized = $true }
            oracleSource = 'requirement'
          }
        )
      }
    )
  }
  toolchain = [ordered]@{
    gccPath = $gccPath
    gxxPath = $gxxPath
    googleTestRoot = $compatRoot
    # The generated C module is linked against the narrow host shim above;
    # the ASCET system archive is an ASCET host executable archive and pulls
    # scheduler/application entry points that are not part of this component.
    googleTestLibraries = @()
  }
  # ASCET generated C expects the PC target definitions from a_basdef.h.
  # Keep this explicit in the acceptance request to mirror ASCET's PC build.
  cFlags = @('-m32', '-O0', '-g', '-std=gnu89', '-DWIN32', '-DSTRICT', '-D_WINDOWS', '-DSIM_PC', '-DPC_TEST', '-DTARGET_PC', '-DENDIANESS_LSB', '-D_POSIX_SOURCE', '-I', $compatIncludeRoot, '-I', $generatedDirectory, '-I', $targetCommon, '-I', $legacyRoot, '-I', $legacyPc, '-I', $legacyCommon)
  cppFlags = @('-m32', '-O0', '-g', '-std=gnu++11', '-DWIN32', '-DSTRICT', '-D_WINDOWS', '-DSIM_PC', '-DPC_TEST', '-DTARGET_PC', '-DENDIANESS_LSB', '-D_POSIX_SOURCE', '-I', $compatIncludeRoot, '-I', $generatedDirectory, '-I', $targetCommon, '-I', $legacyRoot, '-I', $legacyPc, '-I', $legacyCommon)
  linkFlags = @('-m32', '-O0', '-g')
  run = [ordered]@{
    timeoutMs = 30000
    # The ETAS MinGW DLLs must precede the system PATH. Without this, Windows
    # can load an incompatible libstdc++/libgcc and terminate with 0xC0000139.
    runtimePath = @((Split-Path -Parent $gccPath))
  }
  verification = [ordered]@{
    profile = 'live'
    requireExport = $true
    exportManifestPath = $exportJsonPath
    esdlReadbackPath = $snapshotPath
    requireCaseCoverage = $true
  }
}
$request | ConvertTo-Json -Depth 40 | Set-Content -LiteralPath $requestPath -Encoding UTF8

& $ascetTestExe --action pipeline --request $requestPath --out $responsePath --json
if ($LASTEXITCODE -ne 0) {
  throw "AscetTest live pipeline returned exit code $LASTEXITCODE."
}
$response = Get-Content -LiteralPath $responsePath -Raw -Encoding UTF8 | ConvertFrom-Json
if ($response.ok -ne $true -or $response.status -ne 'passed') {
  throw "AscetTest live pipeline failed: $($response.error.code) $($response.error.message)"
}

Write-Output ([ordered]@{
  status = 'passed'
  componentPath = $ComponentPath
  liveSummary = $summaryPath
  liveReadback = $snapshotPath
  liveExport = $exportJsonPath
  pipelineResponse = $responsePath
  pipelineState = [string]$response.data.pipelineStatePath
  generatedSource = $generatedSource
  googleTestBinary = (Join-Path $OutputRoot 'google-test\xpass_live_acceptance.exe')
} | ConvertTo-Json -Depth 8)
