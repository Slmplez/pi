# ASCET UI Enter 延迟与 Scrollback 回弹 Bugfix 规格

- 日期：2026-08-19
- 状态：Implemented，正式运行部署与 Windows Terminal 验收待完成
- 范围：ASCET core extension、ASCET UI extension、Pi TUI
- 关联测试计划：`docs/2026-08-19-ascet-ui-enter-latency-scrollback-test-plan.md`

## 1. 摘要

本规格处理两个已通过代码检查和最小运行时测试确认的问题：

1. ASCET core extension 在每轮 `before_agent_start` 中重复激活相同 profile，导致相同工具列表重复传给 `setActiveTools()`，进而重复重建 system prompt。
2. 当 ASCET Header 或其他顶部组件在当前 viewport 之前发生变化时，Pi TUI 进入全量重绘并输出 `ESC[3J`，清除 terminal scrollback，可能表现为历史内容消失或视口回弹。

修复采用最小范围方案：

- 配置层只加载一套 ASCET core/UI。
- ASCET `activateProfile()` 只在最终工具列表变化时调用 `setActiveTools()`。
- ASCET Header 的 dashboard 高度在异步状态变化前后保持稳定。
- TUI 对 viewport 之前、不改变行结构的普通文本更新跳过不可见部分，只渲染可见变化，不清除 scrollback。

第一轮不修改 Pi `AgentSession` 的通用工具缓存，不自动按包名去重扩展，不全局删除所有 `ESC[3J`，也不建立永久性能 tracing 框架。

## 2. 已确认事实

### 2.1 现有测试

当前聚焦测试结果：

```text
packages/tui:
58 passed, 0 failed

packages/Pi-ascet-ui-extension:
14 passed, 0 failed

packages/ascet-extension exposure controller:
8 passed, 1 failed
```

ASCET exposure controller 的一个失败来自过期 prompt 文案断言：

```text
测试期待：exact resolved targets
当前实现：validate the exact target
```

该失败与 Enter 延迟和 scrollback 回弹无直接关系。

### 2.2 `activateProfile()` 重复激活

最小复现：

```ts
controller.activateProfile("base");
controller.activateProfile("base");
controller.activateProfile("base");
```

当前结果：

```text
setActiveTools() 调用次数 = 3
```

相关调用链：

```text
before_agent_start
-> exposure.activateProfile(exposure.getProfile())
-> pi.setActiveTools(...)
-> AgentSession.setActiveToolsByName(...)
-> system prompt 重建
```

### 2.3 TUI scrollback 清除

最小复现场景：

```text
虚拟终端：40 x 5
Header
Chat 0
...
Chat 9
Editor
```

初次渲染后只修改第一行 Header，当前结果：

```text
fullRedraws: 1 -> 2
terminal writes 包含 ESC[2J
terminal writes 包含 ESC[3J
最终 viewport：Chat 6, Chat 7, Chat 8, Chat 9, Editor
```

触发路径：

```text
firstChanged < prevViewportTop
-> fullRender(true)
-> ESC[2J ESC[H ESC[3J
```

虚拟终端最终仍显示底部内容，但 `ESC[3J` 已清除真实终端的 scrollback。

### 2.4 重复扩展配置

当前环境同时配置：

```text
全局：@vaf-agentworks/ascet-copilot@0.1.42
项目：packages/ascet-extension
项目：packages/Pi-ascet-ui-extension
```

全局 bundle 与项目配置还重复包含：

- `pi-subagents`
- `@juicesharp/rpiv-todo`
- `@juicesharp/rpiv-ask-user-question`
- `@narumitw/pi-goal`
- `pi-web-access`

不同安装路径不会被 Pi 的路径去重逻辑合并，因此重复 handler 和重复工具激活是有效风险。

该重复配置只在从本仓库启动且项目 `.pi/settings.json` 被读取时成立。用户从普通目录直接执行 `pi` 的正式运行场景通常只加载全局 bundle；即使没有重复加载，旧 bundle 中非幂等的 controller、动态 Header 与正式 Pi TUI 的组合仍可独立触发 Enter 迟滞和 scrollback 回弹。配置重复是放大因素，不是问题成立的前提。

## 3. 目标

### 3.1 Enter 延迟目标

正常单 ASCET core 配置下：

```text
首次 profile 激活：setActiveTools() 调用 1 次
相同 profile 和相同最终工具列表的后续激活：调用 0 次
profile 或最终工具列表变化：只新增 1 次调用
```

相同工具列表的后续提交不得因 ASCET core 重建 system prompt。

### 3.2 Header 目标

ASCET Header 在以下状态变化前后保持相同 dashboard 行数：

- intro 动画帧变化。
- feedback 动画帧变化。
- update checking/current/available/unavailable。
- recent sessions loading/ready/error。
- recent sessions 为 0 至 3 条。

### 3.3 TUI 目标

当 viewport 之前的普通文本发生变化且总行数不变时：

- 不执行 `fullRender(true)`。
- 不增加 `fullRedraws`。
- 不发送 `ESC[3J`。
- 可见区域有其他变化时仍正确更新。
- Editor 和最新聊天内容保持在当前 viewport。

### 3.4 配置目标

开发和生产运行时均只加载一套 ASCET core/UI。

## 4. 非目标

第一轮明确不做：

- 不重写整个 TUI differential renderer。
- 不从所有 full-render 路径中直接删除 `ESC[3J`。
- 不修改 Pi extension loader 按包名自动去重。
- 不修改 `AgentSession.setActiveToolsByName()` 的通用缓存策略。
- 不仅根据 `activeProfile` 名称缓存激活结果。
- 不将 profile 激活迁移到新的复杂生命周期。
- 不引入默认开启的长期性能日志。
- 不使用真实 provider 或付费 token 进行自动化回归测试。

如果修复后日志证明 terminal resize 或其他 full-render 原因仍持续清除 scrollback，应建立独立后续问题，不扩大本修复范围。

## 5. 设计一：ASCET profile 激活幂等

### 5.1 修改位置

```text
packages/ascet-extension/src/tools/exposure/controller.ts
packages/ascet-extension/src/tools/exposure/controller.test.ts
```

### 5.2 当前问题

当前实现每次激活都会：

1. 设置 `activeProfile`。
2. 解析 profile 工具。
3. 注册 profile 工具。
4. 获取当前 active tools。
5. 生成最终工具列表。
6. 无条件调用 `setActiveTools()`。

第 6 步在最终列表相同时属于冗余工作。

### 5.3 目标算法

保留现有 profile 解析和工具注册行为，只在最终工具列表变化时调用 Pi API：

```ts
function activateProfile(profile: AscetProfile): void {
    activeProfile = profile;
    const activeAscetTools = resolveProfileTools(profile, env);
    registerProfileTools(profile);

    if (!pi.setActiveTools) {
        return;
    }

    const current = pi.getActiveTools?.() ?? [];
    const nonAscet = current.filter((name) => !allAscetToolNameSet.has(name));
    const next = [...new Set([...nonAscet, ...activeAscetTools])];

    if (
        current.length === next.length &&
        current.every((name, index) => name === next[index])
    ) {
        return;
    }

    pi.setActiveTools(next);
}
```

最终实现必须符合仓库格式和 lint 规则；以上代码仅描述算法。

### 5.4 不使用 profile 名称短路

禁止仅使用：

```ts
if (activeProfile === profile) return;
```

原因是其他扩展可能在两轮之间添加或移除非 ASCET 工具。每次重新计算最终工具列表可以：

- 保留新的第三方工具。
- 移除不属于目标 profile 的 ASCET 工具。
- 补充缺失的目标 ASCET 工具。
- 消除重复项。
- 保持工具顺序变化的可观察语义。

### 5.5 行为测试

必须覆盖：

1. 相同 `base` profile 连续激活三次，`setActiveTools()` 只调用一次。
2. `base -> advanced-read -> advanced-read`，总调用次数为两次。
3. 当前工具已经等于目标列表，首次调用也不执行 `setActiveTools()`。
4. 其他扩展新增非 ASCET 工具后，再次激活相同 profile 会保留该工具。
5. 当前列表包含重复或不属于目标 profile 的 ASCET 工具时会修正一次。
6. 宿主未提供 `setActiveTools()` 时不抛异常，profile metadata 保持正确。

### 5.6 过期断言

`uses native reference Search and exact-read guidance` 的 prompt 文案断言应单独确认产品语义。

如果 `validate the exact target` 是当前期望文案，则更新测试以断言该行为；不得为了使测试通过而恢复过期文案。

## 6. 设计二：ASCET Header 高度稳定

### 6.1 修改位置

```text
packages/Pi-ascet-ui-extension/extensions/AscetHeader.ts
packages/Pi-ascet-ui-extension/extensions/AscetHeader.test.ts
```

### 6.2 当前风险

Release rows 当前可能为：

```text
checking/current/unavailable：5 行
available：3 行
```

Recent session rows 当前可能为：

```text
loading/error/empty：2 行
1 session：2 行
2 sessions：3 行
3 sessions：4 行
```

异步状态完成后，dashboard 高度可能变化，导致全部聊天行索引移动。

### 6.3 固定行预算

定义固定预算：

```ts
const RELEASE_ROW_COUNT = 5;
const RECENT_SESSION_ROW_COUNT = 4;
```

要求：

- `renderReleaseRows()` 始终返回 5 行，不足部分补空行。
- `renderRecentSessionRows()` 始终返回 4 行，不足部分补空行。
- 多余内容仍按现有产品限制截断，例如最近 session 最多 3 条。
- compact 模式保持现有固定结构，不增加 release/session dashboard。

### 6.4 行为测试

必须覆盖：

1. checking/current/available/unavailable 的 dashboard 总行数一致。
2. recent sessions loading/error/empty/1/2/3 条时总行数一致。
3. intro 开始、中间、结束帧行数一致。
4. feedback 动画前后行数一致。
5. 85 列和 86 列边界不会输出超宽行。
6. `dispose()` 后 timer 不再请求重绘。
7. 异步 recent sessions 和 update check 在 dispose 后完成时不请求重绘。

## 7. 设计三：TUI 忽略不可见的非结构变化

### 7.1 修改位置

```text
packages/tui/src/tui.ts
packages/tui/test/tui-render.test.ts
```

### 7.2 适用条件

优化仅适用于：

```text
firstChanged < prevViewportTop
newLines.length === previousLines.length
viewport 之前的变化不涉及 Kitty image
```

总行数相同表示后续逻辑行索引未发生结构性移动。

### 7.3 仅不可见区域变化

如果所有变化都位于 viewport 之前：

```text
lastChanged < prevViewportTop
```

TUI 应：

- 不向终端输出。
- 不执行 full render。
- 更新 `previousLines`。
- 更新 Kitty image ID snapshot。
- 更新 width/height metadata。
- 保持 `previousViewportTop`。
- 正常处理 hardware cursor。

终端 scrollback 中已经输出的旧 Header 可以保持旧文本；不可为了更新不可见历史行而清除全部 scrollback。

### 7.4 不可见和可见区域同时变化

如果同一 render batch 同时包含：

```text
Header 动画变化
Editor 清空
Working indicator 更新
```

则 TUI 应：

1. 忽略 viewport 之前无法安全改写的文本变化。
2. 从第一条可见变化行开始执行现有差分渲染。
3. 最终将完整 `newLines` 保存为新的 snapshot。
4. 不执行 `fullRender(true)`。

这避免 Header timer 与 Enter 状态更新在同一帧合并时重新触发 scrollback 清除。

### 7.5 保留 fallback 的情况

以下情况继续使用现有安全 fallback：

- 新旧总行数不同。
- terminal width 变化。
- 当前不支持的 terminal height 变化路径。
- viewport 之前的变化涉及 Kitty image 或图片保留行。
- 删除或插入内容导致行索引移动。
- 其他现有 Kitty image 安全检查失败。

本修复不改变这些路径的 `ESC[3J` 策略。

### 7.6 行为测试

必须覆盖：

1. `40 x 5` 长内容下，只修改 Header，不增加 `fullRedraws`，不输出 `ESC[3J`。
2. Header 和 Editor 同时变化，Editor 正确更新，不输出 `ESC[3J`。
3. Header ANSI 颜色变化不清除 scrollback。
4. Header 宽字符或 emoji 变化且行数不变时行为正确。
5. Header 行数变化时保留 fallback，最终 viewport 不损坏。
6. viewport 之前涉及 Kitty image 时保留图片安全路径。
7. terminal width/height 现有测试继续通过。
8. content shrink、branch switch、空内容恢复等现有测试继续通过。

## 8. 配置去重要求

### 8.1 本地开发

在本仓库测试本地 ASCET 源码时，只加载：

```text
packages/ascet-extension
packages/Pi-ascet-ui-extension
```

测试命令应通过 `pi-test.ps1 -ne` 和显式 `-e` 参数隔离全局 bundle，不需要永久删除或禁用全局 ASCET 配置。

项目中显式列出的其他扩展可以继续保留，以维持现有开发功能。

### 8.2 已发布环境

使用已发布 bundle 时：

- 保留全局 `@vaf-agentworks/ascet-copilot`。
- 不加载项目内 ASCET core/UI 源码。
- 不重复配置 bundle 已包含的扩展。

### 8.3 不修改 loader

本修复不改变 Pi extension loader。不同路径的扩展仍按现有规则分别加载。

## 9. 开发顺序

采用垂直测试切片：

### Slice 1：ASCET profile 幂等

1. 新增相同 profile 连续激活的失败测试。
2. 实现最终工具列表相等时 no-op。
3. 运行 controller 聚焦测试。
4. 补充 profile 切换和第三方工具测试。

### Slice 2：Header 高度稳定

1. 新增 release/session 状态高度变化的失败测试。
2. 固定两个区域的行预算。
3. 增加 timer/dispose 测试。
4. 运行 ASCET UI 聚焦测试。

### Slice 3：TUI 不可见 Header 变化

1. 新增长聊天顶部变化的失败测试，确认当前输出 `ESC[3J`。
2. 实现不可见非结构变化跳过逻辑。
3. 增加 Header 与 Editor 同帧变化测试。
4. 运行 TUI render 聚焦测试。

### Slice 4：真实终端验证

1. 使用只加载本地 ASCET core/UI 的配置。
2. 恢复长 session。
3. 观察启动前 5 秒 Header 动画。
4. 连续提交至少 30 条消息。
5. 检查 redraw 日志和 Windows Terminal scrollback。

## 10. 验证命令

### ASCET core

```powershell
cd packages\ascet-extension
npx tsx --test src/tools/exposure/controller.test.ts
```

### ASCET UI

```powershell
cd packages\Pi-ascet-ui-extension
npx tsx --tsconfig ../../tsconfig.json --test extensions/*.test.ts
```

如果 shell glob 已经包含 `AscetHeader.test.ts`，不得重复传入导致测试重复执行。

### TUI

```powershell
cd packages\tui
node --test test/input.test.ts test/tui-render.test.ts
```

### 仓库检查

所有代码修改完成后：

```powershell
npm run check
```

不运行 `npm test`、全量 Vitest 或 `npm run build`，除非用户明确要求。

## 11. Windows Terminal 验收

启用日志：

```powershell
$env:PI_DEBUG_REDRAW = "1"
.\pi-test.ps1
```

测试条件：

- Windows Terminal 约 `80 x 20`。
- 聊天内容超过 viewport。
- 使用干净的单 ASCET 来源配置。
- 分别测试新 session 和恢复长 session。
- 启动后等待 Header intro/feedback 和异步状态更新。
- 连续提交 30 条短消息和 10 条多行消息。

检查：

```powershell
Get-Content "$HOME\.pi\agent\pi-debug.log" -Tail 500
```

验收期间不得出现由 Header 普通文本更新导致的：

```text
fullRender: firstChanged < viewportTop
```

如果出现 `terminal height changed`，记录为单独的 Windows Terminal/ConPTY 路径，不扩展本修复。

## 12. 验收标准

### ASCET core

- 相同 profile 连续激活三次，`setActiveTools()` 总调用次数为 1。
- 当前列表已经等于目标列表时，调用次数为 0。
- profile 变化时只新增一次调用。
- 外部非 ASCET 工具保持正常。
- profile metadata 和工具注册行为不变。

### ASCET Header

- dashboard 各异步状态的总行数一致。
- compact 模式行为不变。
- timer 按时停止。
- dispose 后不再请求重绘。
- 每行不超过终端宽度。

### Pi TUI

- 不可见 Header 普通文本变化不增加 `fullRedraws`。
- 不可见 Header 普通文本变化不发送 `ESC[3J`。
- Header 与可见 Editor 同帧变化时 Editor 正确更新。
- 最新聊天内容和 Editor 保持在当前 viewport。
- resize、content shrink 和 Kitty image 现有行为不回归。

### 配置

- 开发或生产运行时只存在一套 ASCET core/UI。

### 质量门槛

- 所有新增或修改的聚焦测试通过。
- `npm run check` 无 error、warning 或 info。
- 不覆盖工作区中其他会话的未提交修改。

## 13. 回滚策略

三个代码改动相互独立，可分别回滚：

1. `activateProfile()` 幂等判断仅影响冗余 `setActiveTools()` 调用；回滚后恢复原有每轮更新行为。
2. Header 固定行预算仅增加空白占位；回滚后恢复动态高度。
3. TUI 不可见差分优化仅处理总行数不变且无图片的路径；回滚后恢复原有 full-render fallback。

如果 TUI 优化在真实终端出现可见内容不同步，应优先回滚 TUI 切片，保留 ASCET profile 幂等和 Header 高度稳定修复。

## 14. 后续工作触发条件

仅在本修复完成后仍满足以下条件时，建立后续问题：

- 单 ASCET 来源配置下，后续相同 profile 仍重建 system prompt。
- `before_agent_start` 本地耗时相对无扩展基线稳定增加超过 20ms。
- scrollback 仍因 terminal height/width 变化被清除。
- Kitty image fallback 仍频繁触发 full redraw。
- Windows Terminal 中无 `ESC[3J` 但仍出现视口回弹。

这些问题不应预先并入本规格，以控制实现范围。
## 15. 实施与 Review 结果

### 15.1 已完成代码改动

- ASCET exposure controller 已按最终有序工具列表实现幂等激活。
- ASCET Header release 区域固定为 5 行，recent sessions 区域固定为 4 行。
- ASCET Header timer、dispose 和异步完成路径已有确定性测试。
- Pi TUI 对 viewport 之前、行结构不变且不涉及 Kitty image 的更新跳过不可见历史行，并继续差分更新可见区域。
- TUI 其他 full-render 和 Kitty image fallback 保持不变。

### 15.2 自动化验证

2026-08-19 在最终代码和测试状态下验证：

```text
ASCET exposure controller: 16 passed, 0 failed
ASCET UI extension:       34 passed, 0 failed
Pi TUI input/render:      63 passed, 0 failed
npm run check:            passed
```

单 ASCET 来源的非交互启动验证通过：

```powershell
.\pi-test.ps1 -ne `
  -e .\packages\ascet-extension\src\index.ts `
  -e .\packages\Pi-ascet-ui-extension\extensions\index.ts `
  --version

.\pi-test.ps1 -ne `
  -e .\packages\ascet-extension\src\index.ts `
  -e .\packages\Pi-ascet-ui-extension\extensions\index.ts `
  --offline --list-models
```

结果：Pi `0.80.3` 正常启动，离线模型列表正常输出，未调用真实 provider。

ASCET UI 源码测试使用：

```powershell
cd packages\Pi-ascet-ui-extension
npx tsx --tsconfig ../../tsconfig.json --test extensions/*.test.ts
```

原因是 workspace peer package 当前没有构建后的 `dist/index.js`，root tsconfig 将 Pi workspace package 映射到源码；本修复未运行 `npm run build`。

### 15.3 独立 Review

独立 review 已检查：

- profile 激活 no-op 和工具顺序语义。
- Header 固定高度、timer、dispose、async 生命周期。
- TUI cursor、viewport、snapshot 和 Kitty image 安全路径。
- 测试假阳性和公开 API 污染风险。

Review 中发现的 Header 测试依赖公开 API 和 timer 断言缺口已修复；最终增量复审无新增代码 finding。

### 15.4 剩余阻断项

当前代码修复仍位于开发工作区，尚未发布或部署到用户直接执行 `pi` 时加载的全局 ASCET bundle 和正式 Pi TUI。正式运行环境因此仍可能执行旧 controller，并保留旧 scrollback 重绘行为。

从本仓库直接启动时还可能同时读取全局 bundle 和项目本地 ASCET 源码；该开发配置重复需要通过隔离启动参数规避，但不应通过永久禁用全局 ASCET 解决。

因此以下项目尚未验收：

- 修复代码部署后的单 ASCET 来源正式运行配置。
- Windows Terminal 长 session 的 30 条短消息和 10 条多行消息验收。
- 当前实际运行环境中的 Enter 体感改善。

开发阶段不发布。只有后续明确执行正式部署并完成真实终端验收后，才能将本规格状态标记为 Completed。
