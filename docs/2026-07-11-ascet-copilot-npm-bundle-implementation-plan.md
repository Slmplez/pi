# ASCET Copilot npm 组合包落地方案与开发任务规划

## 1. 目标

目标用户安装方式：

```powershell
npm install -g @earendil-works/pi-coding-agent
pi install npm:@vaf-agentworks/ascet-copilot
pi
```

这不是发布 `@earendil-works/pi-coding-agent` 的 fork。实现方式是：

- 官方 `@earendil-works/pi-coding-agent` 继续作为 agent 主体。
- `@vaf-agentworks/ascet-copilot` 作为 ASCET Copilot 的 Pi 组合包。
- 用户只安装一个组合包，但组合包内部带上当前项目配置过的全部 Pi package。

## 2. 当前项目基线

当前项目级 `.pi/settings.json` 里已有 8 个 package 条目：

```json
[
  "npm:pi-subagents",
  "npm:@juicesharp/rpiv-todo",
  "npm:@juicesharp/rpiv-ask-user-question",
  "..\\packages\\ascet-extension",
  "..\\packages\\Pi-ascet-ui-extension",
  "npm:pi-hermes-memory@0.7.23",
  "npm:@plannotator/pi-extension@0.23.0",
  "npm:pi-web-access@0.13.0"
]
```

当前两个本地 ASCET package 状态：

```text
packages\ascet-extension
  当前 name: @ascet/pi-extension
  当前 private: true
  包含: ASCET tools, /ascet-init, skills, subagents, templates, ascet-cli

packages\Pi-ascet-ui-extension
  当前 name: pi-ascet-ui-extension
  包含: startup UI extension, themes
```

当前 `.pi/settings.json` 里的下面配置不放进 npm 组合包：

```json
"extensions": [
  "-extensions\\ascet\\index.ts"
]
```

它是本仓库用于禁用旧本地 extension 路径的项目级覆盖项，不是可分发功能。

## 3. 关键设计结论

Pi package 的加载依据是 package 自己的 `pi` manifest。普通 npm `dependencies` 只会安装依赖，不会自动把依赖包里的 `pi.extensions`、`pi.skills`、`pi.themes` 展开给 Pi 加载。

因此，`@vaf-agentworks/ascet-copilot` 必须是一个 Pi 组合包：

1. 在 `dependencies` 里列出所有要带上的 package。
2. 在 `bundledDependencies` 里列出所有 Pi package，让 npm 发布 tarball 时把它们带进 `node_modules`。
3. 在组合包自己的 `pi` 字段里用 `node_modules/...` 显式转发所有 extension、skill、prompt、theme、subagent 路径。

## 4. 最终包结构

发布 3 个 npm 包：

```text
@vaf-agentworks/ascet-copilot-extension
@vaf-agentworks/ascet-copilot-ui
@vaf-agentworks/ascet-copilot
```

建议源码目录：

```text
packages\ascet-extension
packages\Pi-ascet-ui-extension
release\ascet-copilot
```

组合包建议放在 `release\ascet-copilot`，不要放在 `packages\*`。根 `package.json` 的 workspace 是 `packages/*`，如果把组合包放进 `packages`，npm workspace 与 `bundledDependencies` 容易产生路径解析问题。组合包作为独立发布目录更稳。

## 5. 包一：ASCET 工具扩展包

文件：

```text
packages\ascet-extension\package.json
```

目标修改：

```json
{
  "name": "@vaf-agentworks/ascet-copilot-extension",
  "version": "0.1.0",
  "description": "ASCET Copilot tool extension for Pi.",
  "private": false,
  "publishConfig": {
    "access": "public"
  }
}
```

必须保留：

```json
"pi": {
  "extensions": [
    "src/index.ts"
  ],
  "skills": [
    "skills"
  ],
  "subagents": {
    "agents": [
      "agents"
    ]
  }
}
```

建议调整：

```json
"peerDependencies": {
  "typebox": "*"
}
```

原因：Pi 文档把 `typebox` 列为 Pi 核心包，extension/skill 里导入这类核心包时建议作为 peer dependency，不要重复打包。

发布前必须刷新 ASCET 后端资产：

```powershell
npm --workspace @vaf-agentworks/ascet-copilot-extension run copy-assets
```

必须确认包内包含：

```text
ascet-cli\contracts\cli-catalog.json
ascet-cli\bin\AscetCli.exe
src\
skills\
agents\
templates\
```

## 6. 包二：ASCET UI 扩展包

文件：

```text
packages\Pi-ascet-ui-extension\package.json
```

目标修改：

```json
{
  "name": "@vaf-agentworks/ascet-copilot-ui",
  "version": "0.1.0",
  "description": "ASCET Copilot startup UI extension for Pi.",
  "publishConfig": {
    "access": "public"
  }
}
```

必须保留：

```json
"pi": {
  "extensions": [
    "./extensions/index.ts"
  ],
  "themes": [
    "./themes"
  ]
}
```

## 7. 包三：ASCET Copilot 组合包

文件：

```text
release\ascet-copilot\package.json
```

目标内容：

```json
{
  "name": "@vaf-agentworks/ascet-copilot",
  "version": "0.1.0",
  "description": "ASCET Copilot package bundle for Pi.",
  "type": "module",
  "license": "MIT",
  "private": false,
  "keywords": [
    "pi-package",
    "pi-extension",
    "ascet",
    "ascet-copilot"
  ],
  "publishConfig": {
    "access": "public"
  },
  "dependencies": {
    "@vaf-agentworks/ascet-copilot-extension": "0.1.0",
    "@vaf-agentworks/ascet-copilot-ui": "0.1.0",
    "pi-subagents": "0.34.0",
    "@juicesharp/rpiv-todo": "1.20.0",
    "@juicesharp/rpiv-ask-user-question": "1.20.0",
    "pi-hermes-memory": "0.7.23",
    "@plannotator/pi-extension": "0.23.0",
    "pi-web-access": "0.13.0"
  },
  "bundledDependencies": [
    "@vaf-agentworks/ascet-copilot-extension",
    "@vaf-agentworks/ascet-copilot-ui",
    "pi-subagents",
    "@juicesharp/rpiv-todo",
    "@juicesharp/rpiv-ask-user-question",
    "pi-hermes-memory",
    "@plannotator/pi-extension",
    "pi-web-access"
  ],
  "pi": {
    "extensions": [
      "node_modules/@vaf-agentworks/ascet-copilot-extension/src/index.ts",
      "node_modules/@vaf-agentworks/ascet-copilot-ui/extensions/index.ts",
      "node_modules/pi-subagents/src/extension/index.ts",
      "node_modules/@juicesharp/rpiv-todo/index.ts",
      "node_modules/@juicesharp/rpiv-ask-user-question/index.ts",
      "node_modules/pi-hermes-memory/src/index.ts",
      "node_modules/@plannotator/pi-extension",
      "node_modules/pi-web-access/index.ts"
    ],
    "skills": [
      "node_modules/@vaf-agentworks/ascet-copilot-extension/skills",
      "node_modules/pi-subagents/skills",
      "node_modules/pi-web-access/skills"
    ],
    "prompts": [
      "node_modules/pi-subagents/prompts"
    ],
    "themes": [
      "node_modules/@vaf-agentworks/ascet-copilot-ui/themes"
    ],
    "subagents": {
      "agents": [
        "node_modules/@vaf-agentworks/ascet-copilot-extension/agents"
      ]
    }
  }
}
```

## 8. npm build 的角色

`npm run build` 可以用于验证本地 agent 源码能编译，但它不是这个分发方案的核心。

这个方案的核心是 Pi package 发布：

- Pi extension 本身可以发布 `.ts` 入口。
- `pi install npm:@vaf-agentworks/ascet-copilot` 会安装 npm 包并按 `pi` manifest 加载资源。
- ASCET 后端二进制和 contracts 通过 `packages\ascet-extension\files` 白名单进入 `@vaf-agentworks/ascet-copilot-extension` 包。

因此发布前要做：

```powershell
npm run build
npm --workspace @vaf-agentworks/ascet-copilot-extension run copy-assets
npm pack --workspace @vaf-agentworks/ascet-copilot-extension --dry-run
npm pack --workspace @vaf-agentworks/ascet-copilot-ui --dry-run
```

组合包的 dry-run 必须在两个底层包发布后执行，因为它需要从 npm 安装 `@vaf-agentworks/ascet-copilot-extension` 和 `@vaf-agentworks/ascet-copilot-ui` 后再打包 bundled dependencies。

## 9. 发布流程

### 9.1 发布前检查

```powershell
npm whoami
```

期望：

```text
zeerke
```

检查包名是否可用：

```powershell
npm view @vaf-agentworks/ascet-copilot-extension version
npm view @vaf-agentworks/ascet-copilot-ui version
npm view @vaf-agentworks/ascet-copilot version
```

如果返回 `E404 Not Found`，说明首次发布可用。

### 9.2 修改本地 package metadata

修改：

```text
packages\ascet-extension\package.json
packages\Pi-ascet-ui-extension\package.json
```

然后更新 lockfile：

```powershell
npm install --package-lock-only --ignore-scripts
```

如果 npm 版本导致 lockfile 出现大量无关 optional platform 字段漂移，只保留包名、workspace link、dependency 类型相关的最小变化。

### 9.3 本地验证

```powershell
npm --workspace @vaf-agentworks/ascet-copilot-extension run copy-assets
npm --workspace @vaf-agentworks/ascet-copilot-ui test
npm pack --workspace @vaf-agentworks/ascet-copilot-extension --dry-run
npm pack --workspace @vaf-agentworks/ascet-copilot-ui --dry-run
```

ASCET 工具包 dry-run 必须看到：

```text
src/
agents/
skills/
templates/
ascet-cli/contracts/
ascet-cli/bin/AscetCli.exe
README.md
package.json
```

UI 包 dry-run 必须看到：

```text
extensions/
themes/
README.md
LICENSE
package.json
```

禁止出现：

```text
.env
tmp/
.pi/npm/
node_modules/
*.log
*.out
*.err
个人绝对路径
```

### 9.4 发布底层两个包

```powershell
npm publish --workspace @vaf-agentworks/ascet-copilot-extension --access public
npm publish --workspace @vaf-agentworks/ascet-copilot-ui --access public
```

如果启用 npm 2FA：

```powershell
npm publish --workspace @vaf-agentworks/ascet-copilot-extension --access public --otp 123456
npm publish --workspace @vaf-agentworks/ascet-copilot-ui --access public --otp 123456
```

### 9.5 准备并发布组合包

```powershell
cd release\ascet-copilot
npm install --omit=dev --ignore-scripts
npm pack --dry-run
npm publish --access public
cd ..\..
```

组合包 dry-run 必须看到：

```text
node_modules/@vaf-agentworks/ascet-copilot-extension/
node_modules/@vaf-agentworks/ascet-copilot-ui/
node_modules/pi-subagents/
node_modules/@juicesharp/rpiv-todo/
node_modules/@juicesharp/rpiv-ask-user-question/
node_modules/pi-hermes-memory/
node_modules/@plannotator/pi-extension/
node_modules/pi-web-access/
package.json
```

## 10. 用户侧验证

在干净目录执行：

```powershell
mkdir C:\Temp\ascet-copilot-smoke
cd C:\Temp\ascet-copilot-smoke
npm install -g @earendil-works/pi-coding-agent
pi install npm:@vaf-agentworks/ascet-copilot
pi list
pi
```

期望 `pi list` 出现：

```text
npm:@vaf-agentworks/ascet-copilot
```

Pi 启动后验证：

```text
/ascet-status
/ascet-init
/ascet-full-check
```

还要确认以下能力可见或可用：

- ASCET 工具命令和 tool definitions。
- ASCET startup UI 和 theme。
- pi-subagents 的 extensions、skills、prompts。
- rpiv todo overlay。
- ask-user-question 交互提问。
- Hermes memory。
- Plannotator。
- pi-web-access extension 和 skills。

## 11. 开发任务规划

### 阶段 A：确认发布边界

- [ ] 确认不发布 `@earendil-works/pi-coding-agent` fork。
- [ ] 确认 `@vaf-agentworks/ascet-copilot` 是 Pi 组合包，不是 CLI 主程序。
- [ ] 确认 `.pi/settings.json` 当前 8 个 package 都要纳入组合包。
- [ ] 确认 `-extensions\ascet\index.ts` 不纳入 npm 包。

### 阶段 B：准备 ASCET 工具扩展包

- [ ] 修改 `packages\ascet-extension\package.json` 的 `name` 为 `@vaf-agentworks/ascet-copilot-extension`。
- [ ] 修改 description。
- [ ] 设置 `private: false`。
- [ ] 增加 `publishConfig.access = public`。
- [ ] 保留 `pi.extensions`、`pi.skills`、`pi.subagents`。
- [ ] 确认 `files` 白名单包含 `src`、`agents`、`skills`、`templates`、`ascet-cli`。
- [ ] 运行 `copy-assets`。
- [ ] dry-run 检查包内容。

### 阶段 C：准备 ASCET UI 扩展包

- [ ] 修改 `packages\Pi-ascet-ui-extension\package.json` 的 `name` 为 `@vaf-agentworks/ascet-copilot-ui`。
- [ ] 修改 description。
- [ ] 增加 `publishConfig.access = public`。
- [ ] 保留 `pi.extensions` 和 `pi.themes`。
- [ ] 运行 UI test。
- [ ] dry-run 检查包内容。

### 阶段 D：准备组合包

- [ ] 新增 `release\ascet-copilot\package.json`。
- [ ] 写入 8 个 dependencies。
- [ ] 写入 8 个 bundledDependencies。
- [ ] 写入 `pi.extensions` 转发路径。
- [ ] 写入 `pi.skills`、`pi.prompts`、`pi.themes`、`pi.subagents` 转发路径。
- [ ] 不把组合包放进 `packages\*` workspace。

### 阶段 E：更新 lockfile 与格式检查

- [ ] 运行 `npm install --package-lock-only --ignore-scripts`。
- [ ] 检查 `package-lock.json` 只出现预期包名变更。
- [ ] 检查没有 `.pi/npm`、`tmp`、运行报告被纳入。
- [ ] 运行 JSON 校验。

### 阶段 F：发布底层包

- [ ] `npm whoami` 确认为 `zeerke`。
- [ ] `npm view` 确认 3 个包名状态。
- [ ] 发布 `@vaf-agentworks/ascet-copilot-extension`。
- [ ] 发布 `@vaf-agentworks/ascet-copilot-ui`。

### 阶段 G：发布组合包

- [ ] 进入 `release\ascet-copilot`。
- [ ] 运行 `npm install --omit=dev --ignore-scripts`。
- [ ] 运行 `npm pack --dry-run`。
- [ ] 确认 tarball 包含 bundled `node_modules`。
- [ ] 发布 `@vaf-agentworks/ascet-copilot`。

### 阶段 H：干净环境验证

- [ ] 新建 `C:\Temp\ascet-copilot-smoke`。
- [ ] 全局安装官方 Pi Agent。
- [ ] 安装 `npm:@vaf-agentworks/ascet-copilot`。
- [ ] `pi list` 确认组合包存在。
- [ ] 启动 `pi`。
- [ ] 验证 `/ascet-status`。
- [ ] 验证 `/ascet-init`。
- [ ] 验证 `/ascet-full-check`。
- [ ] 验证 UI theme、memory、web access、subagents、todo、ask-user-question、plannotator。

### 阶段 I：提交代码

- [ ] 只 stage 发布相关文件：

```powershell
git add -- package-lock.json packages/ascet-extension/package.json packages/ascet-extension/README.md packages/Pi-ascet-ui-extension/package.json packages/Pi-ascet-ui-extension/README.md release/ascet-copilot/package.json release/ascet-copilot/README.md docs/2026-07-11-ascet-copilot-npm-bundle-implementation-plan.md
```

- [ ] 不 stage：

```text
.pi/npm/
tmp/
ascet-full-check-report.md
运行日志
个人缓存
```

- [ ] 提交：

```powershell
git commit -m "chore(ascet-copilot): plan npm bundle distribution"
```

## 12. 升级策略

底层包变更后，组合包也必须同步升级。

ASCET 工具包更新：

```powershell
npm version patch --workspace @vaf-agentworks/ascet-copilot-extension --no-git-tag-version
npm publish --workspace @vaf-agentworks/ascet-copilot-extension --access public
```

UI 包更新：

```powershell
npm version patch --workspace @vaf-agentworks/ascet-copilot-ui --no-git-tag-version
npm publish --workspace @vaf-agentworks/ascet-copilot-ui --access public
```

组合包更新：

```powershell
cd release\ascet-copilot
npm version patch --no-git-tag-version
npm install --omit=dev --ignore-scripts
npm pack --dry-run
npm publish --access public
cd ..\..
```

用户升级：

```powershell
pi update --extension npm:@vaf-agentworks/ascet-copilot
```

## 13. 风险与处理

| 风险 | 原因 | 处理 |
| --- | --- | --- |
| 用户安装组合包后 Pi 不加载依赖扩展 | 只写了 dependencies，没有写 bundledDependencies 和 `pi` 转发路径 | 组合包必须通过 `node_modules/...` 转发 resources |
| 组合包 tarball 只有 package.json | 没有先在组合包目录执行 `npm install` | 发布组合包前必须 `cd release\ascet-copilot && npm install --omit=dev --ignore-scripts` |
| ASCET CLI 缺失 | 没有运行 `copy-assets` 或 files 白名单遗漏 | 发布工具包前运行 copy-assets 并 dry-run 检查 |
| lockfile 出现大量无关变化 | npm 版本重写 optional platform 字段 | 只保留发布相关最小 lockfile diff |
| 把组合包放进 workspace 导致 npm 解析异常 | 根 workspace 是 `packages/*` | 组合包放到 `release\ascet-copilot` |
| 第三方扩展版本漂移 | 未固定版本 | 组合包 dependencies 固定当前版本 |
| npm 包名被占用 | scoped 包已存在 | 改名为 `@vaf-agentworks/ascet-copilot-tools` 或 `@vaf-agentworks/pi-ascet-copilot` |

## 14. 完成标准

- [ ] `@vaf-agentworks/ascet-copilot-extension` 可从 npm 安装。
- [ ] `@vaf-agentworks/ascet-copilot-ui` 可从 npm 安装。
- [ ] `@vaf-agentworks/ascet-copilot` tarball 包含 bundled dependencies。
- [ ] 干净环境执行 `pi install npm:@vaf-agentworks/ascet-copilot` 成功。
- [ ] `pi list` 显示组合包。
- [ ] `/ascet-status`、`/ascet-init`、`/ascet-full-check` 可见并可执行到预期阶段。
- [ ] 当前 8 个 extension/package 能力都被带上。
- [ ] 没有发布或修改 `@earendil-works/pi-coding-agent` fork。
