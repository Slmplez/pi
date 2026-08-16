# ASCET Copilot npm 发布任务规划

## 1. 发布目标

目标不是发布 `@earendil-works/pi-coding-agent` 的 fork，而是在官方 Pi agent 之上发布 ASCET Copilot 的 Pi package。为了让别人安装 ASCET Copilot 时同时带上当前项目已经配置好的全部 extension，发布结构改为“三包”：

- `@vaf-agentworks/ascet-copilot-extension`：ASCET 工具、命令、skills、subagents、templates、ASCET CLI contracts/bin。
- `@vaf-agentworks/ascet-copilot-ui`：ASCET Copilot 启动 UI、header、tips、theme。
- `@vaf-agentworks/ascet-copilot`：组合包，依赖并转发当前 `.pi/settings.json` 里的全部 Pi package 资源。

用户安装路径：

```powershell
npm install -g @earendil-works/pi-coding-agent
pi install npm:@vaf-agentworks/ascet-copilot
pi
```

目标验证命令：

```text
/ascet-status
/ascet-init
/ascet-full-check
```

## 2. 当前仓库基线

工作目录：

```text
E:\Rep\AscetAgent\PI
```

当前 npm 登录账号：

```text
zeerke
```

当前待发布包源目录：

```text
packages\ascet-extension
packages\Pi-ascet-ui-extension
packages\ascet-copilot-bundle
```

当前项目级本地加载配置已经存在：

```json
"npm:pi-subagents",
"npm:@juicesharp/rpiv-todo",
"npm:@juicesharp/rpiv-ask-user-question",
"..\\packages\\ascet-extension",
"..\\packages\\Pi-ascet-ui-extension",
"npm:pi-hermes-memory@0.7.23",
"npm:@plannotator/pi-extension@0.23.0",
"npm:pi-web-access@0.13.0"
```

这说明本地开发仍可通过 `.pi/settings.json` 加载源码包；npm 发布只改变外部分发方式。

## 3. 非目标

- 不改 `packages/coding-agent/package.json` 的包名。
- 不把 `@earendil-works/pi-coding-agent` 改成 `@vaf-agentworks/ascet-copilot`。
- 不改 `packages/orchestrator` 对 `@earendil-works/pi-coding-agent` 的依赖。
- 不新增默认包自动安装机制到 Pi agent 主体。
- 不提交 `.pi\npm\node_modules`、`tmp`、运行报告、日志、个人缓存。

## 4. 发布包设计

### 4.1 ASCET 工具扩展包

文件：

```text
packages\ascet-extension\package.json
```

目标 metadata：

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

必须保留或确认包含：

```json
"files": [
  "src",
  "agents",
  "skills",
  "templates",
  "ascet-cli",
  "README.md",
  "!ascet-cli/bin/**/*.log",
  "!ascet-cli/bin/**/*.out",
  "!ascet-cli/bin/**/*.err"
]
```

发布前必须刷新 ASCET 资产：

```powershell
npm --workspace @vaf-agentworks/ascet-copilot-extension run copy-assets
```

预期包含：

```text
packages\ascet-extension\ascet-cli\contracts\cli-catalog.json
packages\ascet-extension\ascet-cli\bin\AscetCli.exe
```

### 4.2 ASCET UI 扩展包

文件：

```text
packages\Pi-ascet-ui-extension\package.json
```

目标 metadata：

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

必须保留或确认包含：

```json
"files": [
  "extensions/AscetHeader.ts",
  "extensions/index.ts",
  "extensions/logo.ts",
  "extensions/recentSessions.ts",
  "extensions/tips.ts",
  "themes",
  "README.md",
  "LICENSE"
]
```

### 4.3 ASCET Copilot 组合包

文件：

```text
packages\ascet-copilot-bundle\package.json
```

目标 metadata：

```json
{
  "name": "@vaf-agentworks/ascet-copilot",
  "version": "0.1.0",
  "description": "ASCET Copilot package bundle for Pi.",
  "private": false,
  "publishConfig": {
    "access": "public"
  }
}
```

组合包必须包含当前 `.pi/settings.json` 里的全部 package，不只后面安装过的三个：

```json
"dependencies": {
  "@vaf-agentworks/ascet-copilot-extension": "0.1.0",
  "@vaf-agentworks/ascet-copilot-ui": "0.1.0",
  "pi-subagents": "0.34.0",
  "@juicesharp/rpiv-todo": "1.20.0",
  "@juicesharp/rpiv-ask-user-question": "1.20.0",
  "pi-hermes-memory": "0.7.23",
  "@plannotator/pi-extension": "0.23.0",
  "pi-web-access": "0.13.0"
}
```

重要：只写 `dependencies` 不够。Pi 加载 package 时读取的是当前 package 自己的 `pi` manifest，不会自动把依赖包里的 Pi resources 全部展开。因此组合包要把依赖打入 tarball，并在自己的 `pi` 字段里显式转发：

```json
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
```

不要把项目配置里的下面这一项放进 npm 组合包：

```json
"extensions": [
  "-extensions\\ascet\\index.ts"
]
```

它是本仓库用于禁用旧本地 extension 路径的项目级覆盖规则，不是可分发的 ASCET Copilot 功能。

## 5. 实施任务清单

### 阶段 A：发布前元数据修改

- [ ] 修改 `packages\ascet-extension\package.json`：
  - [ ] `name` 改为 `@vaf-agentworks/ascet-copilot-extension`
  - [ ] `description` 改为 `ASCET Copilot tool extension for Pi.`
  - [ ] `private` 改为 `false`
  - [ ] 增加 `publishConfig.access = public`
- [ ] 修改 `packages\Pi-ascet-ui-extension\package.json`：
  - [ ] `name` 改为 `@vaf-agentworks/ascet-copilot-ui`
  - [ ] `description` 改为 `ASCET Copilot startup UI extension for Pi.`
  - [ ] 增加 `publishConfig.access = public`
- [ ] 新增 `packages\ascet-copilot-bundle\package.json`：
  - [ ] `name` 设置为 `@vaf-agentworks/ascet-copilot`
  - [ ] 写入当前项目配置里的全部 8 个 package 依赖
  - [ ] 写入 `bundledDependencies`
  - [ ] 写入转发后的 `pi.extensions`、`pi.skills`、`pi.prompts`、`pi.themes`、`pi.subagents`
- [ ] 运行 JSON 校验：

```powershell
node -e "for (const p of ['packages/ascet-extension/package.json','packages/Pi-ascet-ui-extension/package.json','packages/ascet-copilot-bundle/package.json']) JSON.parse(require('fs').readFileSync(p,'utf8')); console.log('package json ok')"
```

### 阶段 B：更新 lockfile

- [ ] 运行：

```powershell
npm install --package-lock-only --ignore-scripts
```

- [ ] 检查 lockfile 只出现新的 workspace 包名，不应引入无关 registry 依赖漂移：

```powershell
rg -n "@vaf-agentworks/ascet-copilot|@ascet/pi-extension|pi-ascet-ui-extension" package-lock.json packages
```

### 阶段 C：复制 ASCET 后端资产

- [ ] 执行：

```powershell
npm --workspace @vaf-agentworks/ascet-copilot-extension run copy-assets
```

- [ ] 检查核心资产：

```powershell
Test-Path packages\ascet-extension\ascet-cli\contracts\cli-catalog.json
Test-Path packages\ascet-extension\ascet-cli\bin\AscetCli.exe
```

### 阶段 D：本地测试

- [ ] ASCET extension 定向测试：

```powershell
npm --workspace @earendil-works/pi-coding-agent test -- test/ascet-init-command.test.ts test/ascet-extension-status.test.ts test/ascet-extension-scheduler.test.ts test/ascet-extension-canonical-tools.test.ts test/ascet-extension-readonly-tools.test.ts test/ascet-extension-write-tools.test.ts test/ascet-extension-copilot-routing.test.ts test/ascet-extension-cli-coverage.test.ts test/ascet-extension-read-code-alias.test.ts test/ascet-extension-core.test.ts
```

- [ ] Biome 定向检查：

```powershell
npx biome check packages/ascet-extension packages/Pi-ascet-ui-extension
```

- [ ] UI extension 自测：

```powershell
npm --workspace @vaf-agentworks/ascet-copilot-ui test
```

如 workspace 名变更后命令不可用，先用路径方式：

```powershell
npm --prefix packages\Pi-ascet-ui-extension test
```

### 阶段 E：dry-run 包内容检查

- [ ] ASCET extension dry-run：

```powershell
npm pack --workspace @vaf-agentworks/ascet-copilot-extension --dry-run
```

必须看到：

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

- [ ] UI extension dry-run：

```powershell
npm pack --workspace @vaf-agentworks/ascet-copilot-ui --dry-run
```

必须看到：

```text
extensions/
themes/
README.md
LICENSE
package.json
```

- [ ] 组合包 dry-run：

```powershell
npm pack --workspace @vaf-agentworks/ascet-copilot --dry-run
```

必须看到：

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

### 阶段 F：npm 名称和登录检查

- [ ] 确认登录：

```powershell
npm whoami
```

期望：

```text
zeerke
```

- [ ] 确认包名未占用：

```powershell
npm view @vaf-agentworks/ascet-copilot-extension version
npm view @vaf-agentworks/ascet-copilot-ui version
npm view @vaf-agentworks/ascet-copilot version
```

如果返回 `E404 Not Found`，说明首次发布可用。

### 阶段 G：正式发布

- [ ] 发布工具扩展：

```powershell
npm publish --workspace @vaf-agentworks/ascet-copilot-extension --access public
```

- [ ] 发布 UI 扩展：

```powershell
npm publish --workspace @vaf-agentworks/ascet-copilot-ui --access public
```

- [ ] 发布组合包：

```powershell
npm publish --workspace @vaf-agentworks/ascet-copilot --access public
```

如启用 npm 2FA：

```powershell
npm publish --workspace @vaf-agentworks/ascet-copilot-extension --access public --otp 123456
npm publish --workspace @vaf-agentworks/ascet-copilot-ui --access public --otp 123456
npm publish --workspace @vaf-agentworks/ascet-copilot --access public --otp 123456
```

### 阶段 H：发布后验证

在干净目录执行：

```powershell
mkdir C:\Temp\ascet-copilot-smoke
cd C:\Temp\ascet-copilot-smoke
npm install -g @earendil-works/pi-coding-agent
pi install npm:@vaf-agentworks/ascet-copilot
pi list
```

期望 `pi list` 出现：

```text
npm:@vaf-agentworks/ascet-copilot
```

启动：

```powershell
pi
```

手工验证：

```text
/ascet-status
/ascet-init
/ascet-full-check
```

### 阶段 I：提交发布配置

- [ ] 只暂存发布相关文件：

```powershell
git add -- package-lock.json packages/ascet-extension/package.json packages/Pi-ascet-ui-extension/package.json
```

- [ ] 检查暂存区：

```powershell
git diff --cached --name-status
git diff --cached --stat
```

- [ ] 提交：

```powershell
git commit -m "chore(ascet-copilot): prepare npm extension packages"
```

- [ ] 推送：

```powershell
git push
```

## 6. 用户安装文档模板

发布后 README 推荐写：

```powershell
npm install -g @earendil-works/pi-coding-agent
pi install npm:@vaf-agentworks/ascet-copilot-extension
pi install npm:@vaf-agentworks/ascet-copilot-ui
pi
```

升级：

```powershell
pi update --extensions
```

卸载：

```powershell
pi remove npm:@vaf-agentworks/ascet-copilot-extension
pi remove npm:@vaf-agentworks/ascet-copilot-ui
```

## 7. 版本升级策略

首发：

```text
@vaf-agentworks/ascet-copilot-extension@0.1.0
@vaf-agentworks/ascet-copilot-ui@0.1.0
```

补丁更新：

```powershell
npm version patch --workspace @vaf-agentworks/ascet-copilot-extension --no-git-tag-version
npm publish --workspace @vaf-agentworks/ascet-copilot-extension --access public
```

UI 更新：

```powershell
npm version patch --workspace @vaf-agentworks/ascet-copilot-ui --no-git-tag-version
npm publish --workspace @vaf-agentworks/ascet-copilot-ui --access public
```

重要原则：

- npm 同一版本不可重复发布。
- 每次发布前必须 `npm pack --dry-run`。
- ASCET extension 每次发布前必须刷新 `copy-assets`。
- 如果 ASCET CLI 后端有变更，必须重新复制并 dry-run 确认 `ascet-cli` 内容。

## 8. 风险和处理

### 风险：包内包含运行垃圾

处理：

- 检查 `npm pack --dry-run`
- 确认 `files` 白名单
- 不提交 `.pi/npm`、`tmp`、日志

### 风险：ASCET 后端资产缺失

处理：

```powershell
npm --workspace @vaf-agentworks/ascet-copilot-extension run copy-assets
```

并检查：

```powershell
Test-Path packages\ascet-extension\ascet-cli\contracts\cli-catalog.json
Test-Path packages\ascet-extension\ascet-cli\bin\AscetCli.exe
```

### 风险：别人安装后 Pi 不加载扩展

处理：

```powershell
pi list
pi install npm:@vaf-agentworks/ascet-copilot-extension
pi install npm:@vaf-agentworks/ascet-copilot-ui
```

确认 package.json 中有 `pi.extensions`。

### 风险：npm 包名被占用

处理：

- 改为 `@vaf-agentworks/ascet-copilot-tools`
- 或改为 `@vaf-agentworks/ascet-pi-extension`

### 风险：pre-commit 钩子被 `.pi\npm\package.json` 生成依赖挡住

处理：

- 发布配置提交只 stage package metadata 和 lockfile。
- 不 stage `.pi\npm\package.json`。
- 如果钩子仍扫描未跟踪生成目录，需要先清理/忽略生成目录，或在确认边界后使用 `--no-verify` 并说明原因。

## 9. 回滚方案

如果发布后发现问题：

1. 不能覆盖同版本 npm 包。
2. 立即发布 patch 修复版：

```powershell
npm version patch --workspace @vaf-agentworks/ascet-copilot-extension --no-git-tag-version
npm publish --workspace @vaf-agentworks/ascet-copilot-extension --access public
```

3. 如果必须阻止安装某个坏版本，可考虑 npm deprecate：

```powershell
npm deprecate @vaf-agentworks/ascet-copilot-extension@0.1.0 "Use 0.1.1 instead."
```

4. 用户侧更新：

```powershell
pi update --extension npm:@vaf-agentworks/ascet-copilot-extension
```

## 10. 完成标准

- [ ] 两个 package.json 已改为 `@vaf-agentworks` scope。
- [ ] `private` 不阻止发布。
- [ ] `publishConfig.access` 为 `public`。
- [ ] ASCET assets 已复制。
- [ ] `npm pack --dry-run` 输出符合预期。
- [ ] 两个 npm 包发布成功。
- [ ] 干净目录可 `pi install`。
- [ ] `pi list` 能看到两个包。
- [ ] `/ascet-status`、`/ascet-init`、`/ascet-full-check` 可见并可执行到预期阶段。
