# Bosch LLM Farm 系统 CA 修复任务规划

日期：2026-07-15  
状态：待实施  
范围：仅修改 `packages/ascet-extension` 及对应测试，不修改 Pi core

## 目标

解决 Bosch 企业网络下 ASCET Copilot 调用 Bosch LLM Farm 时，Node/Pi `fetch` 因不信任 Windows 系统 CA 而报错的问题：

```text
UNABLE_TO_VERIFY_LEAF_SIGNATURE
unable to verify the first certificate
Retry failed after 3 attempts: fetch failed
```

修复后应满足：

- `/login bosch-llmfarm` 仍只做配置，不访问 Bosch gateway。
- 真实 Bosch 请求前自动合并 Node 默认 CA 与 Windows 系统 CA。
- 不关闭 TLS 证书校验。
- 不修改 Pi core。
- 不破坏 Pi 现有代理、`HTTPS_PROXY`、`NO_PROXY` 行为。
- TLS 失败时能显示底层证书错误 code，而不是只有 `fetch failed`。
- `gatewayKey` 不出现在错误、日志或测试快照中。

## 非目标

- 不处理 Bosch gateway key 申请、权限开通、轮换。
- 不自动发现 Digital Assets 中的模型 ID。
- 不修复 401、403、404、模型权限、模型不存在等服务端问题。
- 不新增 `/loginBoschLLMAPI` 或其它 Pi core 命令。
- 不使用 `NODE_TLS_REJECT_UNAUTHORIZED=0`。
- 不自建全局 `undici` dispatcher。

## 根因判断

公司网络测试现象：

- DNS 可解析 Bosch gateway。
- TCP 443 可达。
- `curl` 可完成 TLS 握手。
- Node/Pi `fetch` 失败，底层错误为 `UNABLE_TO_VERIFY_LEAF_SIGNATURE`。
- 启用 Node 系统 CA 后，同一请求可完成 TLS，并在未携带有效 key 时返回 401。

结论：endpoint、DNS、TCP、代理链路不是当前首要根因；根因是 Node 默认 CA 集合未信任 Bosch 企业系统 CA 或 TLS inspection CA。

## 实施任务

### 1. 新增 Bosch TLS helper

文件：

```text
packages/ascet-extension/src/bosch-llmfarm-tls.ts
```

任务：

- 使用 `node:tls` 的 `getCACertificates()` 读取 Node 默认 CA。
- 使用 `getCACertificates("system")` 读取系统 CA。
- 使用 `setDefaultCACertificates()` 合并两者。
- 保证 helper 幂等，重复调用只配置一次。
- 不输出、不返回 PEM 证书正文。
- 提供可注入 TLS API，方便单元测试不污染真实 Node 进程。

建议接口：

```ts
export interface BoschTlsApi {
  getCACertificates(type: "default" | "system"): string[];
  setDefaultCACertificates(certificates: string[]): void;
}

export function ensureBoschSystemCa(api?: BoschTlsApi): BoschSystemCaResult;
```

### 2. 接入 Bosch provider 请求流程

文件：

```text
packages/ascet-extension/src/bosch-llmfarm-provider.ts
```

任务：

- 在 `streamBoschLlmFarm()` 中真实 `fetch()` 前调用 `ensureBoschSystemCa()`。
- 仅当未注入 `options.fetch` 时调用，避免单元测试污染 TLS 全局状态。
- 不在 `/login bosch-llmfarm` 阶段访问网络。
- 保持现有 request URL、headers、payload 逻辑不变。

目标位置：

```ts
const requestFetch = options?.fetch ?? fetch;
if (!options?.fetch) {
  ensureBoschSystemCa();
}
const response = await requestFetch(...);
```

### 3. 增强错误格式化

文件：

```text
packages/ascet-extension/src/bosch-llmfarm-provider.ts
```

任务：

- 新增 `formatBoschRequestError(error: unknown): string`。
- 读取 `error.cause` 中的 TLS cause code。
- 对以下证书错误输出明确提示：

```text
UNABLE_TO_VERIFY_LEAF_SIGNATURE
SELF_SIGNED_CERT_IN_CHAIN
DEPTH_ZERO_SELF_SIGNED_CERT
UNABLE_TO_GET_ISSUER_CERT
UNABLE_TO_GET_ISSUER_CERT_LOCALLY
```

- 所有错误输出继续经过 `redactSecret()`。
- 确保 `gatewayKey` 在外层 error message、cause message、HTTP body 中都被脱敏。

预期错误示例：

```text
Bosch LLM Farm TLS certificate verification failed (UNABLE_TO_VERIFY_LEAF_SIGNATURE): unable to verify the first certificate
```

### 4. 声明 Node 版本要求

文件：

```text
packages/ascet-extension/package.json
```

任务：

- 增加：

```json
"engines": {
  "node": ">=22.19.0"
}
```

原因：

- 当前 Pi runtime 已要求 Node 22.19+。
- `tls.getCACertificates()` 和 `tls.setDefaultCACertificates()` 依赖该运行时能力。

### 5. 增加单元测试

建议文件：

```text
packages/coding-agent/test/ascet-extension-bosch-llmfarm-tls.test.ts
packages/coding-agent/test/ascet-extension-bosch-llmfarm-provider.test.ts
```

TLS helper 测试：

- default CA 和 system CA 均存在时，会调用 setter，且传入合并后的列表。
- system CA 为空时，不调用 setter。
- 连续调用两次时，setter 只执行一次。
- setter 抛错时，错误信息不包含 PEM 正文。

Provider 测试：

- 注入 `fetchMock` 时不调用真实 TLS helper。
- 非流式请求行为保持不变。
- SSE 流式请求行为保持不变。
- TLS cause code 会格式化成明确证书错误。
- 普通网络 cause 保留外层和底层错误信息。
- `gatewayKey` 在外层 error、cause、HTTP body 中均被脱敏。
- abort 行为仍返回 `stopReason = "aborted"`。

### 6. 更新文档

文件：

```text
packages/ascet-extension/README.md
release/ascet-copilot/README.md
```

任务：

- 说明 Bosch provider 会在真实请求前合并系统 CA。
- 说明不需要设置 `NODE_TLS_REJECT_UNAUTHORIZED=0`。
- 说明 `NODE_OPTIONS=--use-system-ca` 仅作为旧版本扩展的临时绕过方式。
- 说明 `/login bosch-llmfarm` 不访问网络，真实 TLS 验证发生在发送消息时。

## 本地验证任务

在非公司网络可执行：

```powershell
npm --workspace @earendil-works/pi-coding-agent test -- test/ascet-extension-bosch-llmfarm-tls.test.ts
npm --workspace @earendil-works/pi-coding-agent test -- test/ascet-extension-bosch-llmfarm-provider.test.ts
npm run check
npm pack --workspace @vaf-agentworks/ascet-copilot-extension --dry-run
```

验收点：

- 单元测试全部通过。
- 类型检查通过。
- pack 内容包含新增 TLS helper。
- 未修改 Pi core。

## 公司网络集成验证任务

需要在 Bosch 企业网络或等价 VPN/代理环境执行。

### 环境检查

```powershell
$env:NODE_TLS_REJECT_UNAUTHORIZED
$env:NODE_OPTIONS
```

要求：

- 不依赖 `NODE_TLS_REJECT_UNAUTHORIZED=0`。
- 最终验收时不依赖 `NODE_OPTIONS=--use-system-ca`。

### 安装新扩展

```powershell
pi update --extension npm:@vaf-agentworks/ascet-copilot
```

重启 Pi 后确认 ASCET Copilot 扩展已加载。

### 登录配置

执行：

```text
/login bosch-llmfarm
```

输入：

- Bosch gateway endpoint：

```text
https://apiroutecccn.apac.bosch.com/openapi/aigatewayprod/bdo-llmfarm-llm/v1
```

- gateway key。
- key placement 优先使用：

```text
authorization-gateway-header
```

- 输入一个或多个真实模型 ID。
- 配置每个模型 context window、max output tokens、input modalities、reasoning、streaming。

### 模型调用验证

选择：

```text
/model bosch-llmfarm/<model-id>
```

发送：

```text
你好，请回复 pong
```

验收：

- 不再出现 `fetch failed`。
- 不再出现 `UNABLE_TO_VERIFY_LEAF_SIGNATURE`。
- 返回正常 completion。
- 如果出现 401/403/404，按 key placement、gateway key、模型权限或模型 ID 继续排查。

### 错误信息验证

可选：在未配置系统 CA 或证书异常环境下验证：

- UI 能显示 TLS cause code。
- 错误信息不包含完整 `gatewayKey`。

## 验收标准

全部满足后才认为完成：

- 未修改 `packages/coding-agent/src`、`packages/ai/src` 等 Pi core 文件。
- `/login bosch-llmfarm` 不发起网络请求。
- 真实 Bosch 请求前自动合并 Node 默认 CA 与系统 CA。
- TLS 证书校验保持开启。
- Pi 现有代理链路保持不变。
- TLS 失败时显示底层 cause code。
- `gatewayKey` 不泄露。
- 本地单元测试和 `npm run check` 通过。
- 公司网络真实 Bosch gateway 调用通过。

## 风险与回滚

风险：

- `setDefaultCACertificates()` 是当前 Node 进程级设置，首次 Bosch 请求后，同进程后续 TLS 连接也会信任系统 CA。

缓解：

- 仅在真实 Bosch 请求前启用。
- 只合并操作系统已信任 CA，不加载扩展自带未知 CA。
- 不关闭 TLS 校验。

回滚：

- 回滚扩展版本到上一版。
- 临时使用：

```powershell
$env:NODE_OPTIONS = (($env:NODE_OPTIONS + " --use-system-ca").Trim())
pi
```

该临时方式只用于绕过旧版本扩展，不作为最终交付方案。

## Goal 执行建议

建议拆成 4 个 goal：

1. 实现系统 CA helper，并完成 helper 单测。
2. 接入 Bosch provider 请求流程，并完成 provider 错误格式化单测。
3. 更新文档、运行本地验证、提交代码。
4. 在公司网络执行真实 Bosch gateway 验证，并记录结果。

每个 goal 完成后记录：

- 修改文件。
- 执行命令。
- 测试结果。
- 未完成事项。
- 是否需要公司网络继续验证。

## 当前落地进度

更新时间：2026-07-15

### 已完成的本地开发项

- 已新增 `packages/ascet-extension/src/bosch-llmfarm-tls.ts`。
- 已在 `streamBoschLlmFarm()` 的真实 HTTPS 请求前接入系统 CA 合并逻辑。
- `/login bosch-llmfarm` 阶段未接入任何网络访问逻辑。
- 已增加 TLS cause 错误格式化，覆盖 `UNABLE_TO_VERIFY_LEAF_SIGNATURE` 等证书错误。
- 已保留 `gatewayKey` 脱敏路径，覆盖 HTTP body、外层 error message、嵌套 cause message。
- 已避免修改 Pi core。
- 已声明扩展 Node runtime 要求：`^22.19.0 || >=24.5.0`。
- 已更新扩展 README 与 release README。
- 已新增 Bosch TLS helper 单元测试。
- 已扩展 Bosch provider 单元测试。

### 已完成的本地验证项

需要以实际命令输出为准，最新验证命令应包括：

```powershell
npm --workspace @earendil-works/pi-coding-agent test -- test/ascet-extension-bosch-llmfarm-tls.test.ts test/ascet-extension-bosch-llmfarm-provider.test.ts
npm run check
npm pack --workspace @vaf-agentworks/ascet-copilot-extension --dry-run
```

本地验证覆盖：

- TLS helper 合并 default CA 与 system CA。
- system CA 为空时不修改 TLS 默认 CA。
- helper 重复调用幂等。
- TLS helper 错误不泄露 PEM 证书正文。
- 缺少 `tls.setDefaultCACertificates()` 的 Node runtime 会给出明确提示。
- 注入 `fetchMock` 的 provider 测试不会触发真实 TLS 全局配置。
- 本地 HTTP OpenAI-compatible gateway 回归仍可通过。
- TLS certificate cause code 会展示到 provider 错误信息中。
- 嵌套 error/cause 中的 `gatewayKey` 会脱敏。
- dry-run pack 包含 `src/bosch-llmfarm-tls.ts`。

### 仍未完成的验收项

以下内容必须在 Bosch 企业网络或等价 VPN/代理环境中验证，当前本地环境不能证明完成：

- 公司网络验证记录模板见 `docs/bosch-llmfarm-company-validation.md`。
- 真实 Bosch gateway TLS 握手不再报 `UNABLE_TO_VERIFY_LEAF_SIGNATURE`。
- 不依赖 `NODE_TLS_REJECT_UNAUTHORIZED=0`。
- 最终验收不依赖 `NODE_OPTIONS=--use-system-ca`。
- `/model bosch-llmfarm/<model-id>` 真实文本请求返回正常 completion。
- 如果启用 streaming、vision 或 tool calling，需要分别做真实模型验证。
- 如出现 401、403、404，需要进入 gateway key、key placement、模型 ID 或权限排查，不再归因于系统 CA。

### 当前监督结论

本地开发和本地验证已推进到可提交候选状态，但整体 goal 不能关闭。关闭条件是公司网络真实 Bosch gateway 验证通过，并把验证结果记录回本文件或对应提交说明中。
