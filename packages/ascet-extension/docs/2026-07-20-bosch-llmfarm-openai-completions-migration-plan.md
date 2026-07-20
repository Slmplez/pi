# Bosch LLM Farm OpenAI Completions Provider 优化方案与实现规划

## 结论

最终优化路线采用：

```text
Bosch LLM Farm provider ID
  -> 复用 Pi 内置 openai-completions provider
  -> 保留 Bosch 专属适配层
```

也就是 Bosch 模型默认注册为 Pi 的 `openai-completions` 模型，不再默认走自定义 `bosch-llmfarm-api` 流式实现。

原因：

- Bosch LLM Farm 的 Python 示例本质是 OpenAI Chat Completions 兼容协议。
- Pi 内置 `openai-completions` 已经实现默认流式请求、SSE 解析、消息转换、工具调用、vision 消息结构和错误处理。
- 当前自定义 Bosch provider 重复实现了 transport 和 SSE 解析，维护成本高，且更容易与 Pi 主线 OpenAI provider 行为不一致。
- Bosch 的特殊点主要是认证、`gatewayKey` 放置规则、CA 处理和少数字段兼容，不需要重新实现完整 provider。

## 当前问题

原 Bosch LLM Farm 实现路径是：

```text
bosch-llmfarm-api
  -> 自定义 fetch
  -> 自定义请求体
  -> 自定义 SSE 解析
  -> 自定义事件转换
```

这带来几个问题：

- 与 Pi 内置 OpenAI provider 的能力重复。
- 流式行为需要单独维护，容易出现非流式、半流式或事件解析差异。
- OpenAI 兼容模型的新字段、tool call、reasoning、vision 适配无法自动继承 Pi 主线能力。
- Bosch gateway key、CA、endpoint 这些真正特殊的逻辑和通用 OpenAI transport 混在一起。

## OpenAI SDK 示例对应关系

Bosch 提供的 Python 调用方式：

```python
from openai import OpenAI

client = OpenAI(
    api_key=gatewayKey,
    base_url=baseUrl,
)

res = client.chat.completions.create(
    model=modelName,
    messages=messages,
    temperature=0.5,
    extra_body={"gatewayKey": gatewayKey},
)
```

流式请求等价于：

```python
stream = client.chat.completions.create(
    model=modelName,
    messages=messages,
    temperature=0.5,
    stream=True,
    extra_body={"gatewayKey": gatewayKey},
)
```

映射到 Pi 后：

| Python OpenAI SDK | Pi 配置或运行时行为 |
| --- | --- |
| `api_key=gatewayKey` | Pi provider key，发送为 `Authorization: Bearer <gatewayKey>` |
| `base_url=baseUrl` | Bosch model 的 `baseUrl` |
| `client.chat.completions.create()` | Pi `openai-completions` provider |
| `stream=True` | Pi 默认通过 `streamSimple()` 走流式请求 |
| `extra_body={"gatewayKey": gatewayKey}` | Python SDK 参考形态；真实 Bosch 网关验证未接受该默认形态 |
| `model=modelName` | Bosch 登录后注册的模型 ID |
| vision `image_url` content part | 复用 Pi OpenAI provider 的 vision 消息转换 |

## 最终架构

Bosch 模型默认注册为：

```ts
{
    provider: "bosch-llmfarm",
    api: "openai-completions",
    baseUrl: "<Bosch LLM Farm /v1 endpoint>",
    headers: {
        Accept: "text/event-stream",
    },
    compat: {
        maxTokensField: "max_tokens",
        supportsStore: false,
        supportsDeveloperRole: false,
        supportsStrictMode: false,
    },
}
```

实际请求形态：

```http
POST <baseUrl>/chat/completions
Authorization: Bearer <gatewayKey>
gatewayKey: <gatewayKey>
Accept: text/event-stream
Content-Type: application/json
```

```json
{
    "model": "<modelName>",
    "messages": [],
    "stream": true,
    "temperature": 0.5,
    "max_tokens": 4096
}
```

现场验证结果显示，真实 Bosch 网关接受 `Authorization` 加 `gatewayKey` header 的组合；`Authorization` 加 `body.gatewayKey` 返回 `401`。因此默认实现以 live-validated 形态为准，Python SDK body 形态保留为兼容性参考和 fallback 验证项。

## 需要保留的 Bosch 专属适配层

即使复用 Pi 的 OpenAI provider，Bosch 仍需要一层薄适配：

- `/login bosch-llmfarm`：继续收集 endpoint、gateway key、模型 ID、context window、max output tokens。
- 模型注册：把 Bosch 模型注册成 `api: "openai-completions"`。
- 请求 hook：在 OpenAI provider 发请求前执行 Bosch CA 初始化，不改写默认 payload。
- header 适配：默认加入 `Accept: text/event-stream` 和 `gatewayKey` header。
- CA 适配：真实 HTTPS 请求前继续执行 Bosch system CA 初始化。
- 字段兼容：使用 `max_tokens`，关闭 Bosch 不支持或未验证的 OpenAI 扩展字段。
- legacy fallback：保留旧 key placement 路径，避免现场环境仍依赖 header/query 时直接断路。

## 为什么不直接只使用 OpenAI SDK

可以在独立脚本里直接使用 OpenAI SDK 验证 Bosch 服务，但 Pi 产品内不建议把 Bosch provider 改成直接依赖 OpenAI SDK。

原因：

- Pi 已经有统一 provider 抽象和 `openai-completions` 实现，直接引入 SDK 会绕开现有模型注册、事件转换、工具调用、日志、取消、统计和配置机制。
- Pi 内置 OpenAI provider 已经承担 SDK 类似职责，重复接入 SDK 会增加两套行为差异。
- Bosch 的特殊逻辑仍然存在：`gatewayKey` header 注入、CA、legacy placement、字段 compat，SDK 不能自动解决这些 Pi 内部集成问题。
- 最优方案是产品内复用 Pi provider；SDK 只作为外部协议参考和 live smoke 验证基准。

## 实现任务规划

### 阶段 1：默认路径迁移

目标：Bosch 默认走 Pi OpenAI provider 的流式实现。

任务：

- 将默认 Bosch 模型注册从 `bosch-llmfarm-api` 改为 `openai-completions`。
- 保留 provider ID 为 `bosch-llmfarm`，用于账号、模型来源和 Bosch hook 判断。
- 设置 `baseUrl` 为登录输入的 Bosch `/v1` endpoint。
- 设置默认 header：`Accept: text/event-stream`。
- 设置 OpenAI compat：
  - `maxTokensField: "max_tokens"`
  - `supportsStore: false`
  - `supportsDeveloperRole: false`
  - `supportsStrictMode: false`

状态：已实现。

### 阶段 2：gatewayKey header 注入

目标：请求头匹配真实 Bosch 网关验证通过的 `gatewayKey: <gatewayKey>` 形态。

任务：

- 在 ASCET extension 注册 `before_provider_headers` hook。
- 仅当 `ctx.model.provider === "bosch-llmfarm"` 且 `ctx.model.api === "openai-completions"` 时生效。
- 通过 `ctx.modelRegistry.getApiKeyForProvider("bosch-llmfarm")` 获取 gateway key。
- 对 headers 注入 `gatewayKey`。
- 确保 headers 包含 `Accept: text/event-stream`。
- 非 Bosch 请求、不存在 key 时保持原样。
- 不在日志、错误或 diagnostics 中输出 key。

状态：已实现。

### 阶段 3：CA 保留

目标：迁移后仍支持 Bosch 企业 CA。

任务：

- 在 Bosch 请求 hook 中继续调用 `ensureBoschSystemCa()`。
- 仅对 Bosch provider 请求执行。
- 保持测试环境下可控，不引入真实网络依赖。

状态：已实现基础路径，仍需现场 HTTPS 验证。

### 阶段 4：legacy placement 兼容

目标：避免一次迁移破坏仍依赖旧 gateway key placement 的环境。

任务：

- 默认使用真实 Bosch 网关验证通过的 `authorization-gateway-header` 语义：
  - `Authorization: Bearer <gatewayKey>`
  - `gatewayKey: <gatewayKey>`
- 对非默认 placement 保留旧 `bosch-llmfarm-api` fallback。
- 不在本阶段删除旧自定义 provider。
- 现场验证通过后，再单独评估删除旧路径。

状态：已实现。

### 阶段 5：测试与回归

目标：证明默认 Bosch 请求实际经过 Pi OpenAI provider，并保持流式。

任务：

- 更新 Bosch provider 单元测试。
- 增加默认模型注册断言：
  - `api === "openai-completions"`
  - `provider === "bosch-llmfarm"`
  - `headers.Accept === "text/event-stream"`
  - `compat.maxTokensField === "max_tokens"`
- 增加 header hook 断言：
  - Bosch 请求注入 `gatewayKey` header
  - Bosch 请求保留或补充 `Accept: text/event-stream`
  - 非 Bosch 请求不注入
- 增加集成断言：
  - payload 包含 `stream: true`
  - payload 使用 `max_tokens`
  - payload 不使用 `max_completion_tokens`
  - payload 不使用 `stream_options`
  - header 包含 `Authorization`
  - header 包含 `gatewayKey`
  - header 包含 `Accept: text/event-stream`

状态：已实现并通过本地测试。

### 阶段 6：live smoke

目标：用真实 Bosch LLM Farm endpoint 验证协议和流式返回。

任务：

- 增加 `scripts/bosch-llmfarm-live-smoke.ts`。
- 增加 npm script：`smoke:bosch-llmfarm`。
- 支持环境变量：
  - `BOSCH_LLMFARM_BASE_URL`
  - `BOSCH_LLMFARM_GATEWAY_KEY`
  - `BOSCH_LLMFARM_MODEL`
  - `BOSCH_LLMFARM_KEY_PLACEMENT`
  - `BOSCH_LLMFARM_PROMPT`
  - `BOSCH_LLMFARM_IMAGE_BASE64`
  - `BOSCH_LLMFARM_IMAGE_MIME`
  - `BOSCH_LLMFARM_TOOL_SMOKE`
  - `BOSCH_LLMFARM_TIMEOUT_MS`
  - `BOSCH_LLMFARM_CONTEXT_WINDOW`
  - `BOSCH_LLMFARM_MAX_TOKENS`
- 未提供必要 env 时跳过，不发真实请求。
- 输出事件数量、text delta 数量、tool/reasoning 事件数量、usage、response id/model 和文本预览。
- 默认 `BOSCH_LLMFARM_KEY_PLACEMENT=authorization-gateway-header`，验证迁移后的 OpenAI completions 路径。
- 如需对照 Python body 形态，使用 `header-body` 验证现场网关是否接受 `body.gatewayKey`。

状态：脚本已实现；真实 Bosch 网络验证待执行。

## 验证命令

本地 focused test：

```powershell
cd packages/coding-agent
node ../../node_modules/vitest/dist/cli.js --run test/ascet-extension-bosch-llmfarm-provider.test.ts
```

全量静态检查：

```powershell
npm run check
```

live smoke：

```powershell
$env:BOSCH_LLMFARM_BASE_URL = "https://.../v1"
$env:BOSCH_LLMFARM_GATEWAY_KEY = "..."
$env:BOSCH_LLMFARM_MODEL = "..."
npm run smoke:bosch-llmfarm
```

Python body placement comparison smoke：

```powershell
$env:BOSCH_LLMFARM_KEY_PLACEMENT = "header-body"
npm run smoke:bosch-llmfarm
```

vision smoke：

```powershell
$env:BOSCH_LLMFARM_IMAGE_BASE64 = "<base64 image>"
$env:BOSCH_LLMFARM_IMAGE_MIME = "image/png"
npm run smoke:bosch-llmfarm
```

tool-call smoke：

```powershell
$env:BOSCH_LLMFARM_TOOL_SMOKE = "1"
npm run smoke:bosch-llmfarm
```

## 手工验收步骤

1. 启动 Pi。
2. 执行 `/login bosch-llmfarm`。
3. 输入 Bosch LLM Farm `/v1` endpoint。
4. 输入 gateway key。
5. 使用默认 live-validated placement：`authorization + gatewayKey header`。
6. 切换到 Bosch 模型。
7. 发送短文本 prompt，确认 token-by-token 流式输出。
8. 使用 vision-capable 模型发送图片输入，确认 image_url 消息可用。
9. 触发一次工具调用，确认 tool call delta 和 final tool call 正常。
10. 确认不需要 `NODE_TLS_REJECT_UNAUTHORIZED=0`。
11. 如可抓包或记录服务端日志，确认请求包含：
    - `Authorization: Bearer <gatewayKey>`
    - `Accept: text/event-stream`
    - `stream: true`
    - `gatewayKey` header
    - `max_tokens`

## 风险与处理

### Bosch 某些环境仍要求 gatewayKey body 或 query

处理：

- 当前不删除 legacy placement。
- 非默认 placement 继续走旧 `bosch-llmfarm-api` fallback。
- 现场确认所有目标环境都支持 `Authorization + gatewayKey header` 后，再讨论删除旧路径。

### Bosch 不支持部分 OpenAI 扩展字段

处理：

- 默认关闭 `store`。
- 默认关闭 developer role。
- 默认关闭 streaming usage options。
- 默认关闭 strict mode。
- 使用 `max_tokens`，不用 `max_completion_tokens`。
- 如果现场发现 reasoning 参数不兼容，再按模型粒度关闭或映射。

### Reasoning 字段格式不一致

处理：

- 优先复用 Pi OpenAI provider 已支持的 reasoning 字段解析。
- 如果 Bosch 返回 `thinking` 或其他非标准字段，再补 Bosch-specific parser 测试。

### CA 初始化时机不正确

处理：

- 在 Bosch provider request hook 中执行 CA 初始化。
- live smoke 必须覆盖真实 HTTPS 连接。

## 验收标准

- Bosch 默认模型注册为 `api: "openai-completions"`。
- Bosch 请求默认流式，payload 包含 `stream: true`。
- 请求与真实 Bosch 网关验证结果一致：bearer gateway key 加 `gatewayKey` header。
- 请求 header 包含 `Accept: text/event-stream`。
- 请求 token 字段使用 `max_tokens`。
- Bosch CA 处理仍生效。
- 文本、vision、tool call、reasoning 行为不因迁移回退。
- focused Bosch provider test 通过。
- `npm run check` 通过。
- live smoke 在真实 Bosch 环境中通过后，可进入删除旧 custom provider 的下一阶段。

## 后续清理计划

只有在真实 Bosch 环境验证通过，并得到明确批准后，才删除旧实现：

- `BOSCH_LLMFARM_API`
- `streamBoschLlmFarm()`
- 自定义 SSE parser
- Bosch 自定义 streaming chunk 类型
- `INTERNAL_STREAM_HEADER`

保留：

- 登录和 credential 逻辑
- endpoint normalization
- 模型注册
- Bosch request hook
- CA helper
- key redaction helper
