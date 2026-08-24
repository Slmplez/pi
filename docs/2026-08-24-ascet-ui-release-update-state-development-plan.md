# ASCET UI Release 更新状态一致性开发方案

- 日期：2026-08-24
- 适用版本：下一个 ASCET Copilot patch release（目标 `0.1.47`）
- 状态：待实施
- 范围：ASCET UI 扩展
- Pi 核心：不修改

## 1. 背景

当前启动界面存在两个独立的更新检查来源：

1. Pi 核心的包管理器检查已安装扩展包，并显示：

   ```text
   Package Updates Available
   @vaf-agentworks/ascet-copilot
   ```

2. ASCET UI 扩展的 Release 面板独立查询 Nexus，并根据自己的缓存显示 Release 状态。

当 UI 缓存仍为旧版本时，可能同时出现：

```text
Release: 0.1.46 - Up to date
Package Updates Available: @vaf-agentworks/ascet-copilot
```

这不是 ASCET 功能逻辑问题，而是两个更新检查结果在 UI 层产生了互相矛盾的语义。

## 2. 决策

采用 **UI 扩展内修复、Pi 核心零修改** 的方案。

Pi 核心继续作为包更新通知的实际来源；ASCET UI 保留独立 Nexus 查询能力，用于发现新版本，但不再根据独立查询结果声称“当前已是最新”。

### 2.1 不修改的范围

不得修改：

```text
packages/coding-agent
```

不新增 Pi 核心更新状态 API，不修改 `DefaultPackageManager`，不修改 Pi 核心包更新流程。

### 2.2 UI 状态原则

Release 面板只允许表达以下语义：

- 当前本地安装版本和 Release highlights；
- 明确发现有更高版本时的 `Update available`；
- 检查中；
- 检查不可用。

Release 面板不得显示：

```text
Up to date
```

原因是 UI 扩展没有 Pi 核心包管理器的统一实时状态，不能可靠断言所有包已经是最新版本。

## 3. 用户可见行为

### 3.1 当前版本

```text
Release
0.1.46
Single-session parameter dependency execution
Canonical ASCET get, read, diff, and edit tools
ASCET engineering Skill and guarded writes
```

不再显示：

```text
0.1.46 - Up to date
```

### 3.2 发现新版本

当 Nexus 返回版本高于本地版本时：

```text
Update available
0.1.46 -> 0.1.47
pi update npm:@vaf-agentworks/ascet-copilot
```

### 3.3 检查中

```text
Release
0.1.46 - Single-session parameter dependency execution
Canonical ASCET get, read, diff, and edit tools
ASCET engineering Skill and guarded writes
Checking updates...
```

### 3.4 检查失败

```text
Release
0.1.46 - update check unavailable (NETWORK)
Single-session parameter dependency execution
Canonical ASCET get, read, diff, and edit tools
ASCET engineering Skill and guarded writes
```

检查失败时不得降级为 `Up to date`。

### 3.5 与 Pi 核心通知同时出现

允许：

```text
Release
0.1.46

Package Updates Available
@vaf-agentworks/ascet-copilot
```

也允许：

```text
Update available
0.1.46 -> 0.1.47

Package Updates Available
@vaf-agentworks/ascet-copilot
```

禁止：

```text
Release: 0.1.46 - Up to date
Package Updates Available: @vaf-agentworks/ascet-copilot
```

## 4. 实现方案

### 4.1 `releaseInfo.ts`

文件：

```text
packages/Pi-ascet-ui-extension/extensions/releaseInfo.ts
```

保留以下能力：

- `checkAscetCopilotUpdate()`；
- `fetchAscetCopilotLatestVersion()`；
- `UpdateState`；
- Nexus registry override；
- 更新检查失败分类；
- 发现新版本时生成定向更新命令。

修改 `createReleaseRows()` 的 `current` 分支：

```ts
if (state.status === "current") {
	return ["Release", release.version, ...release.highlights];
}
```

不得再生成：

```ts
`${release.version} - Up to date`
```

修改 `unavailable` 分支，使状态和原因合并到版本行，以保持 Release 区域固定五行：

```ts
if (state.status === "unavailable") {
	const reason = state.reason ? ` (${state.reason.toUpperCase()})` : "";
	return ["Release", `${release.version} - update check unavailable${reason}`, ...release.highlights];
}
```

### 4.2 缓存策略

缓存只允许复用“明确存在更高版本”的结果。

有效缓存必须同时满足：

```text
registry URL 相同
缓存未过期
缓存版本可解析
cached.latestVersion > currentVersion
```

核心条件：

```ts
isVersionGreater(cache.latestVersion, currentVersion)
```

以下缓存不得直接返回 `current`：

```text
cached.latestVersion === currentVersion
cached.latestVersion < currentVersion
```

上述情况必须重新查询 Nexus。

这样可以避免发布新版本后，旧的 `current` 缓存继续影响 Release 面板。

### 4.3 `AscetHeader.ts`

文件：

```text
packages/Pi-ascet-ui-extension/extensions/AscetHeader.ts
```

不改变 Pi 核心 Header API，不新增核心依赖。

仅确认 Header 的异步更新流程满足：

- `available` 状态触发重新渲染；
- `current` 状态只显示本地 Release 信息；
- `unavailable` 状态不显示 `Up to date`；
- Header dispose 后不再触发异步渲染。

如果现有实现已满足以上条件，不修改该文件。

## 5. 文件变更范围

预期修改：

```text
packages/Pi-ascet-ui-extension/extensions/releaseInfo.ts
packages/Pi-ascet-ui-extension/extensions/releaseInfo.test.ts
packages/Pi-ascet-ui-extension/extensions/AscetHeader.test.ts
packages/Pi-ascet-ui-extension/CHANGELOG.md
```

如果 Header 测试无需调整，则不修改：

```text
packages/Pi-ascet-ui-extension/extensions/AscetHeader.ts
```

新增本开发方案文件：

```text
docs/2026-08-24-ascet-ui-release-update-state-development-plan.md
```

禁止修改：

```text
packages/coding-agent
```

禁止删除 ASCET UI 的新版本发现能力，除非后续明确决定完全由 Pi 核心通知承担该能力。

## 6. 测试方案

### 6.1 Release 状态测试

修改：

```text
packages/Pi-ascet-ui-extension/extensions/releaseInfo.test.ts
```

必须覆盖：

1. `current` 状态不包含 `Up to date`。
2. `current` 状态显示本地版本和 highlights。
3. `available` 状态显示当前版本、目标版本和定向更新命令。
4. `checking` 状态显示检查中。
5. `unavailable` 状态显示检查不可用，不显示已最新。

### 6.2 缓存测试

必须覆盖：

1. 当前版本 `0.1.45`，缓存版本 `0.1.45`，Nexus 返回 `0.1.46`：
   - 必须请求 Nexus；
   - 返回 `available`。

2. 当前版本 `0.1.46`，缓存版本 `0.1.45`，Nexus 返回 `0.1.47`：
   - 不得直接使用旧缓存；
   - 必须请求 Nexus。

3. 当前版本 `0.1.45`，缓存版本 `0.1.46`：
   - 可以复用缓存；
   - 不请求 Nexus；
   - 返回 `available`。

4. 缓存来自其他 registry：
   - 必须忽略缓存；
   - 请求配置的 registry。

5. Nexus 网络失败或 TLS 失败：
   - 返回 `unavailable`；
   - 不显示 `Up to date`。

### 6.3 Header 测试

修改：

```text
packages/Pi-ascet-ui-extension/extensions/AscetHeader.test.ts
```

验证：

- 宽屏布局；
- 窄屏布局；
- Release 区域行数稳定；
- `current`、`available`、`unavailable` 三种状态渲染正确；
- 异步检查结束后触发一次有效渲染；
- dispose 后不再触发渲染。

## 7. 验证命令

按仓库规则运行 UI 专项测试：

```powershell
npm --workspace @vaf-agentworks/ascet-copilot-ui test
```

运行完整静态检查：

```powershell
npm run check
```

不运行：

```powershell
npm test
```

不运行全仓库无关 e2e 测试。

## 8. 发布方案

`0.1.46` 已经发布，禁止覆盖重发。

本次修复使用新的 patch 版本：

```text
0.1.47
```

三个包保持 lockstep：

```text
@vaf-agentworks/ascet-copilot-extension@0.1.47
@vaf-agentworks/ascet-copilot-ui@0.1.47
@vaf-agentworks/ascet-copilot@0.1.47
```

发布顺序：

```text
extension -> UI -> aggregate
```

发布前必须完成：

- UI 测试通过；
- `npm run check` 通过；
- UI package tarball 审计通过；
- aggregate 依赖版本均为 `0.1.47`；
- aggregate 无嵌套 `.tgz`；
- Nexus 版本和完整性验证通过。

## 9. 验收标准

### 功能验收

- Release 面板不再出现 `Up to date`；
- 本地版本始终来自 `ASCET_COPILOT_RELEASE.version`；
- 检测到更高版本时显示 `Update available`；
- 更新检查失败时不声称已最新；
- Pi 核心更新通知保持原样；
- 不修改 Pi 核心代码。

### 一致性验收

以下状态必须不存在：

```text
Release: <current> - Up to date
Package Updates Available: @vaf-agentworks/ascet-copilot
```

### 回归验收

- UI 测试全部通过；
- `npm run check` 全部通过；
- 发布包中的 `releaseInfo.ts` 为修复后的版本；
- 从 Nexus 全新安装后，Release 面板不显示 `Up to date`；
- 新版本发现和定向更新命令可用。

## 10. 实施顺序

1. 修改 `createReleaseRows()`，移除 `Up to date`。
2. 保留并确认缓存版本比较逻辑。
3. 更新 UI 回归测试。
4. 更新 UI changelog。
5. 运行 UI 专项测试。
6. 运行 `npm run check`。
7. 审核显式 git diff，避免纳入其他会话文件。
8. 生成 `0.1.47` 三包候选物。
9. 完成包安装和 Nexus 验证。
10. 按 `extension -> UI -> aggregate` 顺序发布。
11. 使用定向命令验证：

    ```powershell
    pi update npm:@vaf-agentworks/ascet-copilot
    ```

12. 重启 Pi，确认 Release 面板和 Pi 核心包更新提示不再语义冲突。
