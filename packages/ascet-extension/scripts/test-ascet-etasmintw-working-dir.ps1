param()

$ErrorActionPreference = 'Stop'

$packageRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$buildScript = Join-Path $packageRoot 'scripts\build-ascet-test.ps1'
$exePath = Join-Path $packageRoot 'ascet-cli\bin\AscetTest.exe'
$outputRoot = Join-Path $packageRoot 'tmp\ascet-etasmintw-working-dir-test'
$requestPath = Join-Path $outputRoot 'request.json'
$responsePath = Join-Path $outputRoot 'response.json'
$cSourcePath = Join-Path $outputRoot 'generated.c'
$googleTestSourceRoot = Join-Path $packageRoot 'tmp\googletest-v1.10.0'
$googleTestRoot = Join-Path $outputRoot 'googletest-etas-compat'
$compatIncludeRoot = Join-Path $outputRoot 'etas-compat-include'

$gccPath = 'E:\ETAS\ASCET6.4\Tools\compiler\mingw_GNU_472\bin\gcc.exe'
$gxxPath = 'E:\ETAS\ASCET6.4\Tools\compiler\mingw_GNU_472\bin\g++.exe'

if (-not (Test-Path -LiteralPath $gccPath) -or -not (Test-Path -LiteralPath $gxxPath)) {
  Write-Host 'AscetTest ETAS MinGW working-directory regression test skipped: compiler not installed.'
  exit 0
}

New-Item -ItemType Directory -Force -Path $outputRoot | Out-Null
'int ascet_fixture_value(void) { return 1; }' | Set-Content -LiteralPath $cSourcePath -Encoding ASCII
Copy-Item $googleTestSourceRoot $googleTestRoot -Recurse -Force
New-Item -ItemType Directory -Force -Path $compatIncludeRoot | Out-Null

$gtestPort = Join-Path $googleTestRoot 'googletest\include\gtest\internal\gtest-port.h'
$gtestPortText = (Get-Content -LiteralPath $gtestPort -Raw).Replace('[[noreturn]] ', '')
Set-Content -LiteralPath $gtestPort -Value $gtestPortText -Encoding UTF8
$gtestParam = Join-Path $googleTestRoot 'googletest\include\gtest\internal\gtest-param-util.h'
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

$request = [ordered]@{
  schemaVersion = 'ascet-test-request/v1'
  runId = 'etasmintw-working-dir'
  componentPath = 'Fixture/EtasMinGW'
  levels = @('component_ct')
  runDirectory = $outputRoot
  contract = [ordered]@{
    schemaVersion = 'ascet-test-contract/v1'
    componentPath = 'Fixture/EtasMinGW'
    suites = @(
      [ordered]@{
        id = 'Fixture_component_ct'
        level = 'component_ct'
        entryPoint = 'fixture'
        dependencyMode = 'real'
        cases = @(
          [ordered]@{
            id = 'nominal'
            inputs = [ordered]@{}
            expectedOutputs = [ordered]@{ value = 1 }
            oracleSource = 'requirement'
          }
        )
      }
    )
  }
  generatedCSources = @($cSourcePath)
  adapterSource = @'
extern "C" int ascet_fixture_value(void);
extern "C" int ascet_test_run_case(const char*, const char*) {
  return ascet_fixture_value() == 1 ? 0 : 1;
}
'@
  toolchain = [ordered]@{
    gccPath = $gccPath
    gxxPath = $gxxPath
    googleTestRoot = $googleTestRoot
    googleTestLibraries = @('E:\ETAS\ASCET6.4\target\legacy\pc\lib\libsystem_gnu_472.a')
  }
  cFlags = @('-m32', '-O0', '-g', '-std=gnu89')
  cppFlags = @('-m32', '-O0', '-g', '-std=gnu++11', '-I', $compatIncludeRoot)
  linkFlags = @('-m32', '-O0', '-g')
}
$request | ConvertTo-Json -Depth 30 | Set-Content -LiteralPath $requestPath -Encoding UTF8

& $buildScript | Out-Null
if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $exePath)) {
  throw "AscetTest.exe was not built: $exePath"
}

& $exePath --action build --request $requestPath --out $responsePath --json 1>$null
if (-not (Test-Path -LiteralPath $responsePath)) {
  throw "Build response was not written: $responsePath"
}

$response = Get-Content -LiteralPath $responsePath -Raw -Encoding UTF8 | ConvertFrom-Json
if ($response.ok -ne $true -or $response.status -ne 'built') {
  throw "ETAS MinGW build failed: $($response.error.code) $($response.error.message)"
}

Write-Host 'AscetTest ETAS MinGW working-directory regression test passed.'
