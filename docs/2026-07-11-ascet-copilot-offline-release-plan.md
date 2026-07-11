# ASCET Copilot Pi 离线发布包落地方案与开发任务规划

## 1. 背景

当前 `PI` 仓库已经可以通过源码方式运行：

```powershell
cd E:\Rep\AscetAgent\PI
.\pi-test.ps1
```

但 `pi-test.ps1` 依赖仓库根目录下的 `node_modules/.bin/tsx.cmd`。因此用户从 GitHub 直接下载源码后，如果没有执行依赖安装，就不能直接运行。

`node_modules` 不应提交到 Git：

- 体积大，提交和拉取成本高。
- 文件数量极多，会拖慢 Git 状态、diff、提交和 CI。
- Windows/Linux/macOS 依赖解析、可执行 shim、可选依赖可能不同。
- 安全审计和依赖复现应依赖 `package-lock.json`，不是依赖把安装产物提交进仓库。

正确方向是：Git 仓库保持源码和 lockfile 干净；发布时生成一个带运行依赖的 zip 包。

## 2. 目标

做一个面向 Windows 的 ASCET Copilot Pi 发布包，用户下载 zip 后可以直接运行。

目标使用方式：

```powershell
Expand-Archive .\ascet-copilot-pi-windows-x64.zip -DestinationPath .\ascet-copilot-pi
cd .\ascet-copilot-pi
.\pi.cmd
```

基本目标：

- 发布包包含 Pi 源码、ASCET 扩展、ASCET UI 扩展和项目级 `.pi/settings.json`。
- 发布包包含完整 `node_modules`，用户运行时不需要执行 `npm install`。
- 发布包启动器固定使用包内依赖，避免依赖用户的当前工作目录。
- 打包过程在构建机执行依赖安装，运行用户只解压和启动。
- 发布包可以做一次自检，确认 `.\pi.cmd --list-models` 能启动到模型列表阶段。

进阶目标：

- 发布包内置 portable Node.js，用户机器不需要预装 Node。
- 发布包内置版本信息、构建日志和校验文件。
- 打包脚本可以在 CI 或本地一键执行。

## 3. 当前工程基线

当前相关路径：

```text
E:\Rep\AscetAgent\PI
  package.json
  package-lock.json
  pi-test.ps1
  .pi\settings.json
  packages\coding-agent
  packages\agent
  packages\ai
  packages\tui
  packages\ascet-extension
  packages\Pi-ascet-ui-extension
```

`pi-test.ps1` 当前启动方式：

```powershell
$tsxBin = Join-Path $scriptDir "node_modules/.bin/tsx.cmd"
& $tsxBin $cliPath @forwardArgs
```

这说明源码运行依赖根目录 `node_modules`。Git 下载后没有这个目录，所以裸跑会失败。

当前已有 `scripts/local-release.mjs`，它适合官方 Pi 发布验证：

- 打包 `@earendil-works/pi-*` publishable packages。
- 创建隔离 npm install。
- 可生成 Bun binary release。

但它不是 ASCET Copilot 离线整包：

- 不会保留当前项目级 `.pi/settings.json`。
- 不会按你的“带 ASCET UI extension、ASCET tools extension、配置好就能用”的目标组织目录。
- 不适合直接作为给最终用户的 zip。

因此建议新增一个专用脚本，而不是改造 `local-release.mjs`。

## 4. 发布包形态选择

### 4.1 方案 A：带 `node_modules`，要求用户已安装 Node

目录结构：

```text
ascet-copilot-pi\
  pi.cmd
  pi.ps1
  package.json
  package-lock.json
  node_modules\
  .pi\
  packages\
  scripts\
  README-RUN.md
  RELEASE-MANIFEST.json
```

优点：

- 实现最快。
- 包体比内置 Node 小。
- 和当前源码运行方式最接近。

缺点：

- 用户机器必须有 Node.js，且版本要满足 `>=22.19.0`。
- 用户 PATH 中 Node 异常时仍会启动失败。

适用场景：

- 只给开发者或内部同事使用。
- 用户机器已统一安装 Node。

### 4.2 方案 B：带 `node_modules` 和 portable Node

目录结构：

```text
ascet-copilot-pi\
  pi.cmd
  pi.ps1
  runtime\
    node\
      node.exe
      npm.cmd
      npx.cmd
  app\
    package.json
    package-lock.json
    node_modules\
    .pi\
    packages\
    scripts\
  README-RUN.md
  RELEASE-MANIFEST.json
```

启动器：

```bat
@echo off
set "ROOT=%~dp0"
set "PATH=%ROOT%runtime\node;%PATH%"
cd /d "%ROOT%app"
powershell -ExecutionPolicy Bypass -File "%ROOT%app\pi-test.ps1" %*
```

优点：

- 用户不需要预装 Node。
- 运行环境更可控。
- 更接近“下载即用”。

缺点：

- 包体更大。
- 需要在打包脚本里下载或引用 portable Node zip。
- 需要验证 Windows x64/arm64 差异。

适用场景：

- 给非开发用户。
- 希望减少安装步骤。

### 4.3 方案 C：Bun 单文件 binary

已有 `local-release.mjs` 可以走 Bun binary 方向，但对当前需求不建议作为第一阶段。

原因：

- Pi extension 是运行时加载的 TypeScript/资源包，binary 方案需要额外确认动态加载、`.pi/settings.json`、主题、模板、ASCET CLI 资源是否都能被正确发现。
- ASCET 扩展仍需要携带大量资源文件，单文件 binary 不能自然替代整个发布目录。

建议：

- 第一阶段做方案 B。
- 后续再评估 Bun binary 是否能作为更小的启动器。

## 5. 推荐方案

推荐优先实现 **方案 B：Windows x64 离线 zip，内置 portable Node + node_modules**。

理由：

- 满足“用户 Git 下载不能直接用，所以做带依赖发布包”的实际诉求。
- 不污染 Git 仓库，不提交 `node_modules`。
- 用户启动路径最短：解压后运行 `pi.cmd`。
- ASCET 扩展仍按源码包形式保留，方便你继续在 `packages\Pi-ascet-ui-extension` 中开发。

发布包中可以同时保留源码和依赖：

- `app\packages\Pi-ascet-ui-extension`：后续开发位置。
- `app\node_modules`：发布时生成的运行依赖。
- `app\.pi\settings.json`：预配置加载 ASCET 相关本地 package。

## 6. 打包脚本设计

新增脚本：

```text
scripts\package-ascet-copilot-offline.ps1
```

建议参数：

```powershell
param(
  [string]$RepoRoot = (Resolve-Path "$PSScriptRoot\..").Path,
  [string]$OutDir = "$env:TEMP\ascet-copilot-pi-release",
  [string]$ArchivePath = "",
  [switch]$Force,
  [switch]$IncludePortableNode,
  [string]$PortableNodeZip = "",
  [switch]$SkipChecks,
  [switch]$KeepStage
)
```

核心步骤：

1. 检查运行位置是否为 `pi-monorepo`。
2. 检查 `package-lock.json` 是否存在。
3. 检查必要目录：
   - `packages\coding-agent`
   - `packages\ascet-extension`
   - `packages\Pi-ascet-ui-extension`
   - `.pi\settings.json`
4. 创建 staging 目录，建议在仓库外：
   - 防止递归复制自己。
   - 防止污染 Git 状态。
5. 复制源码到 `stage\app`，排除：
   - `.git`
   - `node_modules`
   - `tmp`
   - `dist-release`
   - `.worktrees`
   - 日志和临时文件
6. 在 `stage\app` 执行依赖安装：
   - `cmd.exe /c npm.cmd ci --ignore-scripts`
   - 如果 lockfile 暂时不稳定，可临时使用 `npm install --ignore-scripts`，但正式发布必须回到 `npm ci`。
7. 写入启动器：
   - `stage\pi.cmd`
   - `stage\pi.ps1`
8. 写入运行说明：
   - `README-RUN.md`
9. 写入发布清单：
   - `RELEASE-MANIFEST.json`
10. 执行自检：
    - `.\pi.cmd --list-models`
    - `.\pi.cmd --help`
11. 压缩 zip。

## 7. 启动器设计

### 7.1 `pi.cmd`

```bat
@echo off
setlocal
set "ROOT=%~dp0"

if exist "%ROOT%runtime\node\node.exe" (
  set "PATH=%ROOT%runtime\node;%PATH%"
)

cd /d "%ROOT%app"
powershell -NoProfile -ExecutionPolicy Bypass -File "%ROOT%app\pi-test.ps1" %*
exit /b %ERRORLEVEL%
```

### 7.2 `pi.ps1`

```powershell
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$nodeDir = Join-Path $root "runtime\node"

if (Test-Path -LiteralPath (Join-Path $nodeDir "node.exe")) {
  $env:PATH = "$nodeDir;$env:PATH"
}

$appDir = Join-Path $root "app"
Set-Location -LiteralPath $appDir
& (Join-Path $appDir "pi-test.ps1") @args
exit $LASTEXITCODE
```

## 8. Portable Node 处理方式

第一版不建议脚本自动联网下载 Node。原因：

- 发布构建应可复现。
- 避免构建时网络失败。
- 避免下载源被替换带来的供应链风险。

推荐做法：

1. 手动下载官方 Windows x64 Node zip。
2. 放在固定位置，例如：

```text
E:\Rep\AscetAgent\PI\vendor\node-v24.4.1-win-x64.zip
```

3. 打包脚本用 `-PortableNodeZip` 指向它。
4. 脚本解压到：

```text
stage\runtime\node\
```

后续可以增加校验：

```text
vendor\node-v24.4.1-win-x64.zip.sha256
```

## 9. 配置策略

发布包应该使用包内项目级配置：

```text
app\.pi\settings.json
```

该配置中本地 package 应使用相对路径：

```json
{
  "packages": [
    "npm:pi-subagents",
    "npm:@juicesharp/rpiv-todo",
    "npm:@juicesharp/rpiv-ask-user-question",
    "..\\packages\\ascet-extension",
    "..\\packages\\Pi-ascet-ui-extension"
  ]
}
```

需要注意：

- 如果 `.pi/settings.json` 里仍有 npm package，发布包运行时 Pi 可能会尝试安装缺失 package。
- 离线发布包要么把这些 package 也纳入可加载资源，要么在发布包里使用已经安装好的 `.pi\npm`。
- 最稳做法是第一版复制 `.pi\npm`，并确保 `.pi/settings.json` 中的 npm package 对应目录存在。

第一版建议：

- 复制 `.pi\settings.json`。
- 复制 `.pi\npm`，但排除 npm cache 和临时文件。
- 自检时断网或设置 `PI_OFFLINE=1` 跑一次，确认不会尝试联网补包。

## 10. 依赖策略

### 10.1 构建机依赖

构建机需要：

- Windows
- PowerShell
- Node.js >= 22.19.0
- npm
- Git 可选，仅用于记录 commit 信息

### 10.2 用户机依赖

方案 B 下用户机只需要：

- Windows
- PowerShell 可运行脚本
- 解压工具

用户不需要：

- Git
- npm
- Node 全局安装

### 10.3 lockfile 要求

正式使用 `npm ci` 前，必须保证：

```text
package-lock.json
```

包含当前 workspace：

```text
packages/Pi-ascet-ui-extension
packages/ascet-extension
```

如果 lockfile 不包含新 workspace，`npm ci` 可能不会按预期构建依赖图。

## 11. 自检矩阵

### 11.1 打包前检查

```powershell
cd E:\Rep\AscetAgent\PI
.\node_modules\.bin\tsc.cmd -p packages\Pi-ascet-ui-extension\tsconfig.json --noEmit
.\node_modules\.bin\tsx.cmd --test packages\Pi-ascet-ui-extension\extensions\recentSessions.test.ts
.\pi-test.ps1 --list-models
```

如果要包含 ASCET tools extension，还应跑：

```powershell
.\pi-test.ps1 --help
.\pi-test.ps1 list
```

### 11.2 打包后检查

```powershell
cd <release-root>
.\pi.cmd --help
.\pi.cmd --list-models
```

离线检查：

```powershell
$env:PI_OFFLINE = "1"
.\pi.cmd --list-models
Remove-Item Env:\PI_OFFLINE
```

### 11.3 解压路径检查

至少验证这些路径：

```text
C:\Temp\ascet-copilot-pi
C:\Users\ZJR\Desktop\ascet copilot pi
D:\ASCET\Pi
```

重点验证：

- 路径含空格。
- 不在原仓库目录。
- PowerShell execution policy 不阻塞 `pi.cmd`。

## 12. 开发任务规划

### 阶段 1：确定发布包边界

任务：

- 明确发布包是否内置 portable Node。
- 明确发布包是否包含 `.pi\npm`。
- 明确是否支持完全离线启动。
- 明确支持平台：先只做 Windows x64。

交付物：

- 本文档确认后的最终边界。

验收标准：

- 用户启动命令明确。
- 运行依赖边界明确。
- 不再讨论是否提交 `node_modules` 到 Git。

### 阶段 2：实现 PowerShell 打包脚本

任务：

- 新增 `scripts\package-ascet-copilot-offline.ps1`。
- 实现参数解析。
- 实现 staging 目录创建。
- 实现源码复制排除规则。
- 实现 `npm ci --ignore-scripts` 安装依赖。
- 实现 `pi.cmd` 和 `pi.ps1` 写入。
- 实现 `README-RUN.md` 写入。
- 实现 `RELEASE-MANIFEST.json` 写入。
- 实现 zip 压缩。

验收标准：

- 脚本可以从 repo root 执行。
- 输出 zip 在仓库外生成。
- 生成包中不存在 `.git`。
- 生成包中存在 `app\node_modules\.bin\tsx.cmd`。
- 生成包中存在 `app\packages\Pi-ascet-ui-extension`。

### 阶段 3：内置 portable Node

任务：

- 增加 `-IncludePortableNode`。
- 增加 `-PortableNodeZip`。
- 解压 Node 到 `runtime\node`。
- 启动器优先使用 `runtime\node\node.exe`。
- 在 `RELEASE-MANIFEST.json` 记录 Node 版本。

验收标准：

- 在没有全局 Node 的环境中仍能运行。
- `.\pi.cmd --help` 成功。
- `.\pi.cmd --list-models` 成功。

### 阶段 4：处理 `.pi` 项目 package

任务：

- 检查 `.pi/settings.json` 的 package 列表。
- 如果有 npm package，确认发布包中是否包含 `.pi\npm\node_modules`。
- 如果需要完全离线，复制 `.pi\npm` 到发布包。
- 增加离线启动检查。

验收标准：

- 设置 `PI_OFFLINE=1` 后启动不尝试联网。
- `pi list` 能看到本地 ASCET extension 和 UI extension。
- 启动标题能显示 ASCET COPILOT。

### 阶段 5：发布包自检脚本

任务：

- 新增 `scripts\test-ascet-copilot-release.ps1`。
- 输入 zip 路径。
- 解压到临时目录。
- 执行 `pi.cmd --help`。
- 执行 `pi.cmd --list-models`。
- 可选执行 RPC `get_commands`，检查 `/vm-header-on` 等扩展命令是否存在。

验收标准：

- 自检脚本退出码为 0。
- 失败时输出明确是哪一步失败。
- 自检不会修改源码仓库。

### 阶段 6：文档和用户说明

任务：

- 写 `README-RUN.md`。
- 说明首次启动、模型配置、API key 配置。
- 说明如何更新发布包。
- 说明如何开发 `packages\Pi-ascet-ui-extension`。

验收标准：

- 用户不用读源码 README 就能启动。
- 文档明确不需要运行 `npm install`。
- 文档说明如果杀毒软件拦截或 PowerShell policy 报错如何处理。

### 阶段 7：版本和归档

任务：

- 发布包命名：

```text
ascet-copilot-pi-windows-x64-YYYYMMDD-HHMM.zip
```

- 生成 manifest：

```json
{
  "name": "ascet-copilot-pi",
  "platform": "windows-x64",
  "gitCommit": "...",
  "builtAt": "...",
  "nodeVersion": "...",
  "piVersion": "...",
  "includesPortableNode": true
}
```

验收标准：

- 每个 zip 可追溯到 git commit。
- 用户反馈问题时能确认使用的是哪个发布包。

## 13. 第一版脚本伪代码

```powershell
$ErrorActionPreference = "Stop"

param(
  [string]$RepoRoot = (Resolve-Path "$PSScriptRoot\..").Path,
  [string]$OutDir = "$env:TEMP\ascet-copilot-pi-release",
  [string]$ArchivePath = "",
  [switch]$Force,
  [switch]$IncludePortableNode,
  [string]$PortableNodeZip = "",
  [switch]$SkipChecks,
  [switch]$KeepStage
)

$repoRoot = (Resolve-Path $RepoRoot).Path
$stageRoot = Join-Path $OutDir "stage"
$appDir = Join-Path $stageRoot "app"

if ($Force -and (Test-Path $OutDir)) {
  Remove-Item -LiteralPath $OutDir -Recurse -Force
}

New-Item -ItemType Directory -Path $appDir -Force | Out-Null

robocopy $repoRoot $appDir /E `
  /XD .git node_modules tmp dist-release .worktrees `
  /XF *.log *.tsbuildinfo

if ($LASTEXITCODE -gt 7) {
  throw "robocopy failed: $LASTEXITCODE"
}

Push-Location $appDir
try {
  cmd.exe /c npm.cmd ci --ignore-scripts
  if ($LASTEXITCODE -ne 0) { throw "npm ci failed" }
} finally {
  Pop-Location
}

if ($IncludePortableNode) {
  if (-not (Test-Path -LiteralPath $PortableNodeZip)) {
    throw "Portable Node zip not found: $PortableNodeZip"
  }
  Expand-Archive -LiteralPath $PortableNodeZip -DestinationPath (Join-Path $stageRoot "runtime-node-raw") -Force
  # Move extracted node-* folder to runtime\node
}

# Write launchers and manifest.
# Run self-tests.
# Compress stageRoot into zip.
```

## 14. 风险和处理策略

### 风险 1：发布包体积过大

处理：

- 第一版接受包体较大，优先保证可用。
- 后续分析 `node_modules` 大头，考虑 npm production install 或 binary release。

### 风险 2：`.pi\npm` 中的 npm package 未固定版本

处理：

- 发布包阶段可以先复制当前已安装结果。
- 后续应把 `.pi\npm\package.json` 的范围版本改成精确版本。
- 当前已知风险示例：

```text
^1.20.0
^0.34.0
```

这会影响可复现性。

### 风险 3：路径含空格导致启动失败

处理：

- `pi.cmd` 和 `pi.ps1` 中所有路径必须加引号。
- 自检必须覆盖含空格路径。

### 风险 4：PowerShell 执行策略拦截

处理：

- 用户主入口使用 `pi.cmd`。
- `pi.cmd` 调用 PowerShell 时带：

```text
-ExecutionPolicy Bypass
```

### 风险 5：构建机污染发布包

处理：

- 复制时排除 `.git`、`tmp`、`dist-release`、`.worktrees`。
- 发布前生成文件清单。
- 发布包不应包含开发机绝对路径。

## 15. 推荐实施顺序

建议按以下顺序执行：

1. 先实现不内置 Node 的最小 zip，确认 `node_modules` 打包和启动器可用。
2. 再加入 portable Node，达成真正解压即用。
3. 再加入 `.pi\npm` 离线策略。
4. 最后做自检脚本和 manifest。

第一版最小可交付：

```text
scripts\package-ascet-copilot-offline.ps1
dist-release\ascet-copilot-pi-windows-x64.zip
README-RUN.md
```

第一版验收命令：

```powershell
cd E:\Rep\AscetAgent\PI
.\scripts\package-ascet-copilot-offline.ps1 -Force -IncludePortableNode -PortableNodeZip E:\Rep\AscetAgent\PI\vendor\node-v24.4.1-win-x64.zip

Expand-Archive .\dist-release\ascet-copilot-pi-windows-x64.zip -DestinationPath C:\Temp\ascet-copilot-pi-test -Force
cd C:\Temp\ascet-copilot-pi-test
.\pi.cmd --help
.\pi.cmd --list-models
```

## 16. 最终结论

不要把 `node_modules` 提交到 Git。要解决“Git 下载后不能直接运行”的问题，应新增离线发布包构建流程。

最佳落地路径是：

```text
Git 仓库：源码 + package-lock + 打包脚本
发布 zip：源码副本 + node_modules + portable Node + 启动器 + .pi 配置
```

这样既保持仓库可维护，也能给最终用户一个真正可运行的软件包。
