# PI ASCET `/ascet-init` Development Task Plan

## 1. Goal

在 PI 的 `packages/ascet-extension` 中复现 ASCET Copilot `/ascet init` 的核心能力，新增 PI 命令 `/ascet-init`：

- 初始化项目级 ASCET 规则目录：`<project>/.ascet/rules`
- 引导 agent 对当前 ASCET database、folder 或 project 做浅层采样式 onboarding 扫描
- 生成或更新 ASCET workspace overview section
- 复用 PI 已有 canonical ASCET tools，不引入旧的细粒度 ASCET Copilot tool 名称
- 保持 bounded scan，避免全库深扫和 raw JSON dump

## 2. Non-Goals

- 不在第一版实现 `/ascet init` 空格命令兼容。PI extension command 当前按第一个空格切分命令名，第一版只实现 `/ascet-init`。
- 不迁移 ASCET Copilot 中未接线的直接执行式 `runAscetInitWorkflow` 到 PI runtime。
- 不复制完整 ASCET help tree 到 PI 模板，第一版只提供精简 rules scaffold。
- 不自动执行写入 ASCET database 的操作；该命令只做 onboarding 扫描和 markdown 更新。

## 3. Design Summary

### 3.1 Command Shape

实现为 PI extension command：

```text
/ascet-init
/ascet-init database
/ascet-init folder DEMO
/ascet-init project PID
```

命令行为沿用 ASCET Copilot 当前设计：命令本身不直接扫描 ASCET database，而是构造一段高约束 prompt，然后通过 `pi.sendUserMessage()` 交给 agent 执行。

### 3.2 Output Target

原 ASCET Copilot 写 `agent.md`。PI 当前上下文文件机制主要发现 `AGENTS.md` / `CLAUDE.md`，因此第一版 prompt 采用以下规则：

1. 如果项目已有 `agent.md`，更新 `agent.md`。
2. 否则优先更新 `AGENTS.md`。
3. 如果两者都不存在，创建 `AGENTS.md`。
4. 只替换或追加 `## ASCET Workspace Overview` section，不覆盖其他内容。

### 3.3 Tool Mapping

Prompt 中必须使用 PI canonical ASCET tools：

| ASCET Copilot 原概念 | PI 工具 |
| --- | --- |
| runtime check | `ascet_status` |
| scheduler/lock diagnostics | `ascet_scheduler_status` |
| list/inspect | `ascet_explore` |
| resolve/search | `ascet_search` |
| representative reads | `ascet_read` |

禁止在 prompt 中使用旧名称：

- `AscetExploreTool`
- `AscetSearchTool`
- `AscetReadTool`
- 旧 fine-grained block diagram tool names

## 4. Files To Add

### 4.1 `packages/ascet-extension/src/ascet-init.ts`

职责：

- 定义 `ASCET_AGENT_SECTION_TITLE`
- 构造 `/ascet-init` prompt
- 暴露 `executeAscetInitCommand(args, ctx, pi)`
- 根据 `ctx.isIdle()` 选择立即发送或 follow-up queue

建议导出：

```ts
export const ASCET_AGENT_SECTION_TITLE = "## ASCET Workspace Overview";

export function buildAscetInitPrompt(options: {
  args: string;
  projectRulesPrompt?: string;
}): string;

export async function executeAscetInitCommand(
  args: string,
  ctx: AscetCommandContext,
  pi: AscetInitPiApi,
): Promise<void>;
```

实现要点：

- `args.trim()` 非空时，将原始 scope 放进 prompt：
  - `Requested scope from command args: folder DEMO`
- `args.trim()` 为空时，要求 agent 先向用户确认 scope。
- idle 时：

```ts
pi.sendUserMessage(prompt);
```

- busy 时：

```ts
pi.sendUserMessage(prompt, { deliverAs: "followUp" });
ctx.ui.notify("Queued ASCET init as a follow-up.", "info");
```

### 4.2 `packages/ascet-extension/src/ascet-project-rules.ts`

职责：

- 创建 `<ctx.cwd>/.ascet/rules`
- 从 extension bundled template 复制默认规则
- 加载 manifest 默认 entrypoints
- 渲染 command-scoped project rules prompt

建议导出：

```ts
export interface AscetInitEntrypoint {
  id: string;
  path: string;
  content: string;
}

export async function ensureRepoAscetRulesScaffold(projectRoot: string): Promise<{
  created: boolean;
  rulesDir: string;
}>;

export async function loadAscetInitEntrypoints(rulesDir: string): Promise<AscetInitEntrypoint[]>;

export function renderAscetInitRulesPrompt(entrypoints: AscetInitEntrypoint[]): string;
```

实现要求：

- 如果 `<project>/.ascet/rules/manifest.yaml` 已存在，返回 `created: false`，不得覆盖用户规则。
- 如果不存在，复制 `packages/ascet-extension/templates/ascet-project/rules`。
- manifest entrypoint 路径必须 resolve 后仍位于 rulesDir 内，防止 `../` 路径逃逸。
- manifest 缺少默认 entrypoint 时应 throw 明确错误。
- 文件读写使用 Node `fs/promises` 或现有项目通用 fs 模式，保持代码局部清晰。

### 4.3 `packages/ascet-extension/templates/ascet-project/rules/manifest.yaml`

建议内容：

```yaml
version: 1
system: pi-ascet-extension
default_entrypoints:
  - ascet.init.workflow
  - ascet.tools.pi

rules:
  - id: ascet.init.workflow
    path: tasks/init.md
    layer: task
  - id: ascet.tools.pi
    path: tools/pi-ascet-tools.md
    layer: tools
  - id: ascet.core.workflow
    path: core/workflow.md
    layer: core
```

### 4.4 `packages/ascet-extension/templates/ascet-project/rules/tasks/init.md`

内容目标：

- 定义 `/ascet-init` 的 bounded onboarding workflow
- 明确不要全库深扫
- 明确输出 section 结构
- 明确 sampled inference 标注方式

### 4.5 `packages/ascet-extension/templates/ascet-project/rules/tools/pi-ascet-tools.md`

内容目标：

- 列出 PI canonical tool map
- 告诉 agent 不要使用旧 ASCET Copilot tool names
- 明确 BDE 读取使用 `ascet_read` action `read_block_diagram`

### 4.6 `packages/ascet-extension/templates/ascet-project/rules/core/workflow.md`

内容目标：

- 通用 ASCET navigation 原则
- database / folder / project scope 的差异
- representative sampling 原则

## 5. Files To Modify

### 5.1 `packages/ascet-extension/src/index.ts`

新增 import：

```ts
import { executeAscetInitCommand } from "./ascet-init.ts";
```

在 `ascet-status`、`ascet-scheduler-status`、`ascet-full-check` 附近注册：

```ts
pi.registerCommand("ascet-init", {
  description: "Create or update an ASCET workspace onboarding section",
  handler: async (args, ctx) => {
    await executeAscetInitCommand(args, ctx, pi);
  },
});
```

## 6. Prompt Requirements

`buildAscetInitPrompt()` 输出必须包含以下阶段。

### 6.1 Phase 1: Confirm Scope

如果 command args 没有明确 scope，要求 agent 向用户确认：

- current database
- folder `<path>`
- project `<path-or-name>`

默认选择：current database。

### 6.2 Phase 2: Read Project Context

只读必要上下文：

- `README.md`
- `AGENTS.md`
- `agent.md`
- `.ascet/rules` manifest default entrypoints

不得把任务扩大成普通 repo onboarding。

### 6.3 Phase 3: Runtime Preflight

先调用：

```text
ascet_status
```

如果状态不清楚、队列异常、lock 异常或 runtime degraded，再调用：

```text
ascet_scheduler_status
```

### 6.4 Phase 4: Bounded ASCET Exploration

推荐顺序：

```text
1. ascet_explore action=list_components folderPath="" kind="folder"
2. ascet_explore action=list_components folderPath=<sample-folder> kind="all"
3. ascet_search action=resolve_component
4. ascet_search action=search_components
5. ascet_explore action=inspect_target
```

代表性读取限制：

```text
ascet_read action=read_implementation
ascet_read action=read_block_diagram
ascet_read action=read_state_machine_flow
```

### 6.5 Phase 5: Sampling Limits

Prompt 中写死第一版建议预算：

- top-level folder sample <= 4
- components per sampled folder <= 4
- representative targets <= 4
- deep reads <= 2

### 6.6 Phase 6: Synthesize Summary

输出 section：

```md
## ASCET Workspace Overview

### ASCET workspace scope
### Database shape
### Architecture patterns
### Recommended navigation path
### Known limitations
```

必须说明：

- 分析范围
- database / folder / project scope 类型
- 哪些结论是 sampled / heuristic inference
- 这是 onboarding summary，不是 semantic index

### 6.7 Phase 7: Update Markdown

写入规则：

- 只替换 `## ASCET Workspace Overview`
- 不覆盖其他 section
- 不写 raw JSON payload
- 保留用户手写内容

## 7. Test Plan

### 7.1 Prompt Builder Tests

断言 prompt 包含：

- `current database`
- `folder <path>`
- `project <path-or-name>`
- `ascet_status`
- `ascet_scheduler_status`
- `ascet_explore`
- `ascet_search`
- `ascet_read`
- `## ASCET Workspace Overview`
- `bounded`
- `sampled`

### 7.2 Args Tests

输入：

```text
folder DEMO
project PID
database
```

断言 prompt 包含原始 requested scope。

### 7.3 Scaffold Creation Tests

临时目录无 `.ascet/rules`：

- 创建 `.ascet/rules/manifest.yaml`
- 复制默认 entrypoints
- 返回 `created: true`

### 7.4 Scaffold Idempotency Tests

临时目录已有 `.ascet/rules/manifest.yaml`：

- 不覆盖已有 manifest
- 返回 `created: false`

### 7.5 Manifest Path Safety Tests

manifest 中 entrypoint 为 `../outside.md`：

- `loadAscetInitEntrypoints()` 必须 throw

### 7.6 Command Handler Tests

mock `pi.sendUserMessage`：

- `ctx.isIdle() === true` 时直接发送 prompt
- `ctx.isIdle() === false` 时使用 `{ deliverAs: "followUp" }`
- busy 时调用 `ctx.ui.notify()`

## 8. Manual Verification

从 `E:\Rep\AscetAgent\PI` 启动 PI 后验证：

```text
/ascet-init
/ascet-init database
/ascet-init folder DEMO
/ascet-init project PID
```

检查：

- 是否创建 `.ascet/rules`
- 是否没有覆盖已有 `.ascet/rules/manifest.yaml`
- 是否发送 prompt 而不是本地直接卡住
- agent 是否先使用 `ascet_status`
- agent 是否只调用 canonical `ascet_*` tools
- `AGENTS.md` 或 `agent.md` 是否只更新 ASCET overview section

## 9. Suggested Implementation Order

1. 新增模板目录和三份规则文件。
2. 实现 `ascet-project-rules.ts`。
3. 实现 `ascet-init.ts` prompt builder 和 command executor。
4. 在 `index.ts` 注册 `/ascet-init`。
5. 添加 prompt/scaffold/handler 单元测试。
6. 运行相关测试和 typecheck。
7. 手动验证 `/ascet-init` 三种 scope。

## 10. Follow-Up Enhancements

### 10.1 `/ascet init` Compatibility Dispatcher

第二期可注册 `/ascet` 作为命令组：

```ts
pi.registerCommand("ascet", {
  description: "ASCET command group",
  handler: async (args, ctx) => {
    const [subcommand, ...rest] = args.trim().split(/\s+/);
    if (subcommand === "init") {
      return executeAscetInitCommand(rest.join(" "), ctx, pi);
    }
    ctx.ui.notify("Usage: /ascet init [database|folder <path>|project <name>]", "warning");
  },
});
```

### 10.2 Direct Workflow Mode

如果后续需要非 LLM 直接扫描，可再迁移 ASCET Copilot 的 `runAscetInitWorkflow` 思路，用 PI canonical tool client 包装 `ascet_explore` / `ascet_search` / `ascet_read`。这不建议放进第一版。

### 10.3 Richer Project Rules

后续可把 ASCET object-specific guidance 拆成更多按需规则：

- modules
- classes
- state machines
- BDE diagrams
- import/export dependencies
- write safety

## 11. Acceptance Criteria

- `/ascet-init` 出现在 PI slash command 列表中。
- `/ascet-init` 能在 idle 和 busy 两种状态下正确发送或排队 prompt。
- 首次运行会创建 `.ascet/rules`。
- 重复运行不会覆盖已有 project rules。
- 生成 prompt 明确使用 PI canonical `ascet_*` tools。
- 生成 prompt 明确要求 bounded sampling。
- agent 最终只更新 `AGENTS.md` 或 `agent.md` 的 ASCET overview section。
- 单元测试覆盖 prompt builder、scaffold、path safety、command handler。

## 12. Implementation Status

Status: completed on 2026-07-11.

Implemented files:

- `packages/ascet-extension/src/ascet-init.ts`
- `packages/ascet-extension/src/ascet-project-rules.ts`
- `packages/ascet-extension/templates/ascet-project/rules/manifest.yaml`
- `packages/ascet-extension/templates/ascet-project/rules/tasks/init.md`
- `packages/ascet-extension/templates/ascet-project/rules/tools/pi-ascet-tools.md`
- `packages/ascet-extension/templates/ascet-project/rules/core/workflow.md`
- `packages/coding-agent/test/ascet-init-command.test.ts`

Modified files:

- `packages/ascet-extension/src/index.ts`
- `packages/ascet-extension/package.json`
- `packages/coding-agent/test/ascet-extension-cli-coverage.test.ts`

Completion evidence:

- `/ascet-init` is registered by the ASCET extension.
- `executeAscetInitCommand()` creates or reuses `<project>/.ascet/rules`.
- Existing project rules manifests are not overwritten.
- Manifest default entrypoints are loaded and path-escape checked.
- The generated prompt uses PI canonical `ascet_*` tool names and avoids old ASCET Copilot tool names.
- The generated prompt requires bounded sampling and the `## ASCET Workspace Overview` markdown section.
- Idle command execution sends the prompt immediately.
- Busy command execution queues the prompt as a follow-up and notifies the user.

Verification run:

```powershell
npm --workspace @earendil-works/pi-coding-agent test -- test/ascet-init-command.test.ts test/ascet-extension-status.test.ts test/ascet-extension-scheduler.test.ts test/ascet-extension-canonical-tools.test.ts test/ascet-extension-readonly-tools.test.ts test/ascet-extension-write-tools.test.ts test/ascet-extension-copilot-routing.test.ts test/ascet-extension-cli-coverage.test.ts test/ascet-extension-read-code-alias.test.ts test/ascet-extension-core.test.ts
```

Result: passed, 10 test files and 90 tests.

```powershell
npx biome check packages/ascet-extension/src/ascet-init.ts packages/ascet-extension/src/ascet-project-rules.ts packages/ascet-extension/src/index.ts packages/coding-agent/test/ascet-init-command.test.ts packages/coding-agent/test/ascet-extension-cli-coverage.test.ts packages/ascet-extension/package.json
```

Result: passed.

```powershell
npx tsc --noEmit --module NodeNext --moduleResolution NodeNext --target ES2022 --types node --allowImportingTsExtensions --skipLibCheck packages/ascet-extension/src/ascet-init.ts packages/ascet-extension/src/ascet-project-rules.ts
```

Result: passed.

Known verification boundary:

- Full `npx tsgo --noEmit` still fails on pre-existing ASCET extension and test typing issues outside `/ascet-init`, including nullable child process streams in `packages/ascet-extension/src/cli.ts`, enum syntax under `erasableSyntaxOnly` in scheduler files, and existing test context type mismatches.
