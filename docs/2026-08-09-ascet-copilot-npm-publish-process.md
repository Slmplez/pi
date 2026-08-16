# ASCET Copilot npm 发布流程

本文记录 ASCET Copilot 三个 npm 包的版本同步、打包、GitHub Actions 发布、验证和失败处理流程。

## 1. 发布包结构

ASCET Copilot 由三个 npm 包组成，三个包必须使用同一个版本号：

```text
@zeerke/ascet-copilot-extension
@zeerke/ascet-copilot-ui
@zeerke/ascet-copilot
```

职责：

- `@zeerke/ascet-copilot-extension`：ASCET 工具、命令、skills、subagents、templates、contracts 和运行时资产。
- `@zeerke/ascet-copilot-ui`：ASCET Copilot 启动 UI、header、tips 和 themes。
- `@zeerke/ascet-copilot`：聚合包，使用 `pi` manifest 转发上述资源以及其他 Pi 扩展资源。

用户安装方式：

```powershell
npm install -g @earendil-works/pi-coding-agent
pi install npm:@zeerke/ascet-copilot
pi
```

发布顺序必须是：

```text
1. @zeerke/ascet-copilot-extension
2. @zeerke/ascet-copilot-ui
3. @zeerke/ascet-copilot
```

聚合包依赖前两个包的同版本，不能先发布聚合包。

## 2. 目录位置

```text
packages/ascet-extension/
packages/Pi-ascet-ui-extension/
release/ascet-copilot/
```

聚合包位于 `release/ascet-copilot`，不在根 workspace `packages/*` 中。对聚合包执行 npm 命令时必须使用：

```powershell
npm ci --ignore-scripts --workspaces=false
npm install --package-lock-only --ignore-scripts --workspaces=false
```

不要在聚合包目录中省略 `--workspaces=false`，否则 npm 可能向上发现根 workspace 并修改根项目 lockfile。

## 3. 版本同步

以 `0.1.37` 为例，先在仓库根目录确认当前工作区和版本：

```powershell
git status --short
npm pkg get version --workspace @zeerke/ascet-copilot-extension
npm pkg get version --workspace @zeerke/ascet-copilot-ui
node -p "require('./release/ascet-copilot/package.json').version"
```

将两个基础包设置为目标版本：

```powershell
npm version 0.1.37 --workspace @zeerke/ascet-copilot-extension --no-git-tag-version
npm version 0.1.37 --workspace @zeerke/ascet-copilot-ui --no-git-tag-version
```

更新聚合包：

```powershell
Set-Location release/ascet-copilot
npm version 0.1.37 --no-git-tag-version
npm pkg set "dependencies.@zeerke/ascet-copilot-extension=0.1.37"
npm pkg set "dependencies.@zeerke/ascet-copilot-ui=0.1.37"
npm install --package-lock-only --ignore-scripts --workspaces=false --registry=https://registry.npmjs.org/
Set-Location ../..
```

确认三个 package manifest 和聚合包 lockfile 都是 `0.1.37`：

```powershell
node - <<'NODE'
const fs = require('node:fs');
const files = [
  'packages/ascet-extension/package.json',
  'packages/Pi-ascet-ui-extension/package.json',
  'release/ascet-copilot/package.json',
];
for (const file of files) {
  const pkg = JSON.parse(fs.readFileSync(file, 'utf8'));
  console.log(`${pkg.name}: ${pkg.version}`);
}
const lock = JSON.parse(fs.readFileSync('release/ascet-copilot/package-lock.json', 'utf8'));
console.log(`aggregate lockfile: ${lock.packages[''].version}`);
NODE
```

Windows PowerShell 不支持上述 Bash heredoc 写法时，可使用临时 `.mjs` 文件，或直接检查三个 `package.json` 和 `package-lock.json`。

## 4. 移除不需要的聚合依赖

如果某个扩展不再属于 ASCET Copilot 聚合包，必须同时从以下位置移除：

1. `release/ascet-copilot/package.json` 的 `dependencies`。
2. `release/ascet-copilot/package.json` 的 `bundledDependencies`。
3. `release/ascet-copilot/package.json` 的 `pi.extensions`、`pi.skills`、`pi.prompts`、`pi.themes` 或 `pi.subagents`。
4. `release/ascet-copilot/package-lock.json`。
5. `release/ascet-copilot/README.md` 中的功能描述。

例如，`pi-hermes-memory` 被移除后，不能在聚合包中保留以下任一内容：

```text
pi-hermes-memory
node_modules/pi-hermes-memory
Hermes memory
```

检查命令：

```powershell
git grep -n -I -E "pi-hermes-memory|Hermes memory" -- release/ascet-copilot
```

## 5. ASCET 资产刷新

发布前必须从当前源码刷新 ASCET 资产：

```powershell
npm --workspace @zeerke/ascet-copilot-extension run copy-assets
npm --workspace @zeerke/ascet-copilot-extension run verify-assets
```

应确认包中包含：

```text
packages/ascet-extension/ascet-cli/contracts/cli-catalog.json
packages/ascet-extension/ascet-cli/bin/AscetBridge.exe
packages/ascet-extension/ascet-cli/bin/Ascetapidll/Etas.AscetNET.dll
```

如果 extension 发布包提供 skills 或 subagents，`packages/ascet-extension/package.json` 必须同时声明并打包：

```json
{
  "pi": {
    "skills": ["skills"],
    "subagents": {
      "agents": ["agents"]
    }
  },
  "files": [
    "src",
    "agents",
    "skills",
    "templates",
    "ascet-cli",
    "README.md"
  ]
}
```

## 6. 本地验证门禁

修改代码后运行：

```powershell
npm run check
```

ASCET focused tests：

```powershell
npm --workspace @earendil-works/pi-coding-agent test -- test/ascet-extension-status.test.ts test/ascet-extension-readonly-tools.test.ts test/ascet-extension-write-tools.test.ts
```

检查三个包的 tarball：

```powershell
npm pack --dry-run --ignore-scripts
```

分别在以下目录执行：

```text
packages/ascet-extension
packages/Pi-ascet-ui-extension
release/ascet-copilot
```

extension tarball 必须包含 contracts、Bridge EXE、ToolAPI DLL，以及声明的 skills/subagents。聚合包 tarball 必须包含 `bundledDependencies` 对应的 `node_modules` 内容。

## 7. GitHub Actions 发布方式

不要把 ASCET 包加入现有 Pi 核心包的 `scripts/publish.mjs`。建议新增：

```text
.github/workflows/publish-ascet.yml
```

使用独立 tag：

```text
ascet-copilot-v0.1.37
```

这样不会与 Pi 核心包的 `v0.80.x` 版本线和二进制 release 流程耦合。

### 7.1 npm Trusted Publisher 一次性配置

在 npm 中分别为以下三个包配置 Trusted Publisher：

```text
@zeerke/ascet-copilot-extension
@zeerke/ascet-copilot-ui
@zeerke/ascet-copilot
```

当前公共仓库为：

```text
Slmplez/pi
```

三个包使用相同配置：

```text
Provider: GitHub Actions
Organization or user: Slmplez
Repository: pi
Workflow filename: publish-ascet.yml
Environment name: npm-publish
```

GitHub 仓库中创建同名 Environment：

```text
Settings → Environments → New environment → npm-publish
```

建议为该 environment 配置 required reviewer，并限制允许部署的 tag 为：

```text
ascet-copilot-v*
```

Trusted Publishing 使用 OIDC，不需要在 GitHub Secrets 中保存长期 npm token。workflow 的发布 job 必须拥有：

```yaml
permissions:
  contents: read
  id-token: write
```

### 7.2 推荐 workflow

以下为 `.github/workflows/publish-ascet.yml` 的基线模板。正式使用前，应将 action 版本按仓库现有依赖策略固定到完整 commit SHA。

```yaml
name: Publish ASCET Copilot

on:
  push:
    tags:
      - "ascet-copilot-v*"
  workflow_dispatch:
    inputs:
      version:
        description: "ASCET Copilot version, for example 0.1.37"
        required: true
        type: string

permissions: {}

concurrency:
  group: publish-ascet-copilot
  cancel-in-progress: false

jobs:
  validate:
    name: Validate ASCET packages
    runs-on: ubuntu-latest
    permissions:
      contents: read
    outputs:
      version: ${{ steps.version.outputs.version }}

    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          persist-credentials: false

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "24"
          registry-url: "https://registry.npmjs.org"
          cache: npm

      - name: Upgrade npm
        run: |
          npm install --global npm@11.16.0 --ignore-scripts
          npm --version

      - name: Resolve release version
        id: version
        shell: bash
        env:
          INPUT_VERSION: ${{ inputs.version }}
          RELEASE_TAG: ${{ github.ref_name }}
        run: |
          set -euo pipefail

          if [[ -n "${INPUT_VERSION}" ]]; then
            version="${INPUT_VERSION}"
          else
            version="${RELEASE_TAG#ascet-copilot-v}"
          fi

          if [[ ! "${version}" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
            echo "::error::Invalid release version: ${version}"
            exit 1
          fi

          echo "version=${version}" >> "${GITHUB_OUTPUT}"

      - name: Install root dependencies
        run: npm ci --ignore-scripts

      - name: Refresh ASCET assets
        run: npm --workspace @zeerke/ascet-copilot-extension run copy-assets

      - name: Verify ASCET assets
        run: npm --workspace @zeerke/ascet-copilot-extension run verify-assets

      - name: Verify package versions and aggregate manifest
        shell: bash
        env:
          RELEASE_VERSION: ${{ steps.version.outputs.version }}
        run: |
          set -euo pipefail
          node <<'NODE'
          const fs = require("node:fs");
          const version = process.env.RELEASE_VERSION;
          const files = [
            "packages/ascet-extension/package.json",
            "packages/Pi-ascet-ui-extension/package.json",
            "release/ascet-copilot/package.json",
          ];

          for (const file of files) {
            const pkg = JSON.parse(fs.readFileSync(file, "utf8"));
            if (pkg.version !== version) {
              throw new Error(`${file}: expected ${version}, found ${pkg.version}`);
            }
          }

          const aggregate = JSON.parse(
            fs.readFileSync("release/ascet-copilot/package.json", "utf8"),
          );
          if (aggregate.dependencies["@zeerke/ascet-copilot-extension"] !== version) {
            throw new Error("Aggregate extension dependency is stale");
          }
          if (aggregate.dependencies["@zeerke/ascet-copilot-ui"] !== version) {
            throw new Error("Aggregate UI dependency is stale");
          }
          if ("pi-hermes-memory" in aggregate.dependencies) {
            throw new Error("pi-hermes-memory must not be an aggregate dependency");
          }
          if (aggregate.bundledDependencies.includes("pi-hermes-memory")) {
            throw new Error("pi-hermes-memory must not be bundled");
          }
          if (aggregate.pi.extensions.some((entry) => entry.includes("pi-hermes-memory"))) {
            throw new Error("pi-hermes-memory must not be an extension");
          }
          NODE

      - name: Run repository checks
        run: npm run check

      - name: Check generated changes
        shell: bash
        run: |
          set -euo pipefail
          git diff --exit-code

      - name: Check extension package
        working-directory: packages/ascet-extension
        run: npm pack --dry-run --ignore-scripts

      - name: Check UI package
        working-directory: packages/Pi-ascet-ui-extension
        run: npm pack --dry-run --ignore-scripts

  publish-extension:
    name: Publish ASCET extension
    needs: validate
    runs-on: ubuntu-latest
    environment: npm-publish
    permissions:
      contents: read
      id-token: write
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          persist-credentials: false

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "24"
          registry-url: "https://registry.npmjs.org"

      - name: Upgrade npm
        run: npm install --global npm@11.16.0 --ignore-scripts

      - name: Publish extension
        working-directory: packages/ascet-extension
        run: npm publish --access public --provenance --ignore-scripts

  publish-ui:
    name: Publish ASCET UI
    needs:
      - validate
      - publish-extension
    runs-on: ubuntu-latest
    environment: npm-publish
    permissions:
      contents: read
      id-token: write
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          persist-credentials: false

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "24"
          registry-url: "https://registry.npmjs.org"

      - name: Upgrade npm
        run: npm install --global npm@11.16.0 --ignore-scripts

      - name: Publish UI
        working-directory: packages/Pi-ascet-ui-extension
        run: npm publish --access public --provenance --ignore-scripts

  publish-aggregate:
    name: Publish ASCET aggregate
    needs:
      - validate
      - publish-extension
      - publish-ui
    runs-on: ubuntu-latest
    environment: npm-publish
    permissions:
      contents: read
      id-token: write
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          persist-credentials: false

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "24"
          registry-url: "https://registry.npmjs.org"

      - name: Upgrade npm
        run: npm install --global npm@11.16.0 --ignore-scripts

      - name: Install aggregate dependencies
        working-directory: release/ascet-copilot
        run: npm ci --ignore-scripts --workspaces=false

      - name: Verify aggregate package
        working-directory: release/ascet-copilot
        run: npm pack --dry-run --ignore-scripts

      - name: Publish aggregate
        working-directory: release/ascet-copilot
        run: npm publish --access public --provenance --ignore-scripts
```

说明：聚合包的安装必须放在基础包发布成功之后。否则 `npm ci` 无法从 npm registry 获取还未发布的 `0.1.37` 基础包。

## 8. 发布前命令

本地完成版本和代码准备后：

```powershell
npm --workspace @zeerke/ascet-copilot-extension run copy-assets
npm --workspace @zeerke/ascet-copilot-extension run verify-assets
npm run check
```

确认三个 package 版本一致：

```powershell
npm pkg get version --workspace @zeerke/ascet-copilot-extension
npm pkg get version --workspace @zeerke/ascet-copilot-ui
node -p "require('./release/ascet-copilot/package.json').version"
```

提交后创建 ASCET 专用 tag：

```powershell
git add -- packages/ascet-extension/package.json packages/Pi-ascet-ui-extension/package.json release/ascet-copilot/package.json release/ascet-copilot/package-lock.json release/ascet-copilot/README.md .github/workflows/publish-ascet.yml
git commit -m "fix(coding-agent): remove hermes memory from ASCET bundle"
git push origin main
git tag ascet-copilot-v0.1.37
git push origin ascet-copilot-v0.1.37
```

不要使用：

```powershell
npm run release:patch
npm run publish
```

这些命令面向 Pi 核心包，不负责 ASCET 三包的独立版本线。

## 9. 发布后验证

查询 npm 版本：

```powershell
npm view @zeerke/ascet-copilot-extension@0.1.37 version --registry=https://registry.npmjs.org/
npm view @zeerke/ascet-copilot-ui@0.1.37 version --registry=https://registry.npmjs.org/
npm view @zeerke/ascet-copilot@0.1.37 version --registry=https://registry.npmjs.org/
```

查询聚合包依赖：

```powershell
npm view @zeerke/ascet-copilot@0.1.37 dependencies --json --registry=https://registry.npmjs.org/
npm view @zeerke/ascet-copilot@0.1.37 bundledDependencies --json --registry=https://registry.npmjs.org/
```

确认 `pi-hermes-memory` 不在 dependencies、bundledDependencies 或 `pi.extensions` 中。

在仓库外新建干净目录验证：

```powershell
New-Item -ItemType Directory -Force C:\Temp\ascet-copilot-smoke | Out-Null
Set-Location C:\Temp\ascet-copilot-smoke
pi install npm:@zeerke/ascet-copilot@0.1.37
pi list
pi --version
pi --list-models
pi
```

Pi 会话中验证：

```text
ascet_status
ascet_scheduler_status
```

确认：

- ASCET extension 已注册。
- `skills` 和 `subagents` 可以加载。
- ASCET contracts 和 Bridge 资产存在。
- 缺少 ASCET 运行时前置条件时，显示诊断而不是崩溃。

## 10. 发布失败处理

### extension 发布成功，后续失败

已经发布的版本不能覆盖。只重试尚未发布的包；不要重复发布已成功的包。

### 某个包的版本已错误发布

npm 版本不可覆盖。修复后统一递增到新的 patch 版本，例如：

```text
0.1.38
```

然后同步三个 package manifest、聚合包依赖和 lockfile，再重新发布。

### GitHub Actions 失败

先检查失败 job 属于：

- 资产刷新或验证。
- 包版本不一致。
- 聚合包 lockfile 过期。
- npm Trusted Publisher 配置错误。
- npm package 已存在。
- 包 tarball 缺少文件。

如果基础包已发布而聚合包失败，修复聚合包 workflow 后只发布聚合包，不重新发布相同版本的基础包。

## 11. 当前实现注意事项

- 根 workspace 目前是 Pi 核心包 workspace，ASCET 聚合包不应加入 `packages/*`。
- 根 `scripts/publish.mjs` 不包含 ASCET 包。
- `pi-hermes-memory` 已从 `release/ascet-copilot` 的 manifest、lockfile 和 README 移除。
- 发布前应确保 `packages/ascet-extension/package.json` 的 `files` 包含 `skills` 和 `agents`，否则聚合包中的对应 Pi manifest 路径会指向不存在的内容。
- 正式发布前应确认 worktree 中没有未审查的临时输出、生成文件或其他会被 tag 包含的修改。