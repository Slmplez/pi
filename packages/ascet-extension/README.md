# ASCET PI Extension

ASCET tool extension package for PI. It registers ASCET read, verify, and guarded write tools while keeping all ASCET ToolAPI-backed access sequential.

## Resolver Modes

The runtime resolver uses these modes:

- `env`: `ASCET_CLI_PATH` or `ASCET_CONTRACTS_PATH` is set.
- `bundle`: package assets exist under `ascet-cli/contracts` or `ascet-cli/bin`.
- `source`: development fallback beside the parent `E:\Rep\AscetAgent` checkout.

Bundle mode is fail-closed. If any bundled ASCET asset exists but another required bundled asset is missing, `ascet_status` reports bundle mode with missing checks instead of silently falling back to source mode.

## Bundled Assets

Refresh bundled contracts and C# binaries from the parent `AscetAgent` checkout:

```powershell
npm --workspace @zeerke/ascet-copilot-extension run copy-assets
```

Expected bundled paths:

- `packages/ascet-extension/ascet-cli/contracts/cli-catalog.json`
- `packages/ascet-extension/ascet-cli/bin/AscetCli.exe`

## Tools

Canonical Copilot-aligned tools:

- `ascet_status`
- `ascet_capabilities`
- `ascet_recover`
- `ascet_scheduler_status`
- `ascet_requirements`
- `ascet_explore`
- `ascet_search`
- `ascet_read`
- `ascet_reference`
- `ascet_diff`
- `ascet_write`
- `ascet_batch_write`
- `ascet_verify`

Old fine-grained tools are not registered as model tools or legacy aliases. Their low-level runner modules remain available internally for canonical tools.

`ascet_requirements` is a read-only pre-design gate for requirements Excel risk retrieval before `/ascet-design`. It supports `.xlsx` workbooks, maps requirement ID, title, description, Supplier Comments, feature, CCP, Signal, Reused Signal, Bosch Defect, COEM SWIM, and LL columns, and preserves Excel evidence with sheet, row, column, cell address, raw value, reason, and direct/inferred evidence kind.

The requirements gate separates summary, relation, and evidence retrieval:

- `risk_context`: returns gate state, counts, risk summaries, blocking reasons, clarification items, and `nextAction`. It does not expose raw risk content or ASCET design conclusions.
- `relation_leads`: explains why related requirements are connected, for example by same signal, reused signal, feature, CCP, signal family, or risk keyword.
- `risk_details`: returns paginated raw Excel risk evidence with stable risk IDs, risk type, raw cell text, extracted identifiers, evidence location, impact hint basis, completion state, and paging metadata.

`design_gate_ready` is the requirements-risk gate for entering ASCET design. It is unrelated to ASCET GUI or ToolAPI runtime availability. `/ascet-design` may proceed to ASCET design only when risk details are complete, evidence is complete, all pages are retrieved, and there are no blocking clarifications. The default `relationDepth` is `1`, meaning one-hop related requirements and signals only.

Guarded write tools are preflight-only by default and require explicit interactive approval before CLI execution. Canonical `ascet_write` returns a non-error `status: "preflight"` outcome when `executeWrite` is false. `ascet_batch_write` uses operation-specific request schemas and reports partial completion as `status: "partial"` when the ASCET batch backend returns item failures.

## Design Command

Use `/ascet-design` when starting from a requirement, signal, function description, or design intent:

```text
/ascet-design 907829
/ascet-design WhlSlipSt quality handling
/ascet-design implement wheel speed plausibility fallback for reused vehicle speed signal
```

The command asks the model to clarify missing anchors with `ask_user_question`, then call `ascet_requirements(action="risk_context")` before ASCET live design. If `design_gate_ready=false`, the model must follow `nextAction` such as `relation_leads` or `risk_details`, or ask blocking clarification questions before continuing. If Excel retrieval returns ambiguous candidates, the workflow asks the user to choose the target requirement before continuing.

The first requirements-risk retrieval phase is read-only. `/ascet-design` must not enter ASCET design or call `ascet_write` / `ascet_batch_write` until `design_gate_ready=true`. Any later write must be explicitly requested by the user and preceded by design intent, risk controls, and verification plan.

## Bosch LLM Farm Provider

The extension registers a configurable `bosch-llmfarm` model provider for Bosch LLM Farm OpenAI-compatible gateways.

Start the login flow directly:

```text
/login bosch-llmfarm
```

On Pi builds that include custom login-method labels, `/login` also shows:

```text
Use Bosch LLM Farm
```

On `@earendil-works/pi-coding-agent@0.80.6`, the top-level `/login` selector is limited to:

```text
Use a subscription
Use an API key
```

For that runtime, choose `Use a subscription` and then select `Bosch LLM Farm`, or use `/login bosch-llmfarm` directly.

During login, enter:

- Bosch LLM Farm endpoint, normally ending at `/v1`.
- Gateway key.
- Gateway key placement.
- One or more model IDs, comma-separated.
- Per-model context window and max output tokens.

Streaming, reasoning, text input, and image input are enabled by default for every configured Bosch LLM Farm model and are not prompted during login.

The endpoint can be entered as either the base URL or the chat-completions URL. These forms normalize to the same base URL:

```text
https://apiroutecccn.apac.bosch.com/openapi/aigatewayprod/bdo-llmfarm-llm/v1
https://apiroutecccn.apac.bosch.com/openapi/aigatewayprod/bdo-llmfarm-llm/v1/
https://apiroutecccn.apac.bosch.com/openapi/aigatewayprod/bdo-llmfarm-llm/v1/chat/completions
https://apiroutecccn.apac.bosch.com/openapi/aigatewayprod/bdo-llmfarm-llm/v1/chat/completions?gatewayKey=...
```

The default gateway-key placement is `authorization + gatewayKey header`, matching the verified Bosch OpenAI SDK call shape:

```http
Authorization: Bearer <gatewayKey>
gatewayKey: <gatewayKey>
```

With the default placement, the gateway key is not added to the URL query string or JSON body. Legacy placements are still available during login for gateways that expect `gatewayKey` in the query string, request body, or both.

If the gateway only requires a bearer token, choose `header only` during login. The selected placement is stored with the model configuration and applied to later `/model bosch-llmfarm/<model-id>` requests.

After login, select a configured model:

```text
/model bosch-llmfarm/<model-id>
```

When the provider sends a real Bosch request, it merges the Node default CA set with the operating system trusted CA set before the first `fetch`. This supports Bosch enterprise TLS inspection or internal root CA chains on Windows without disabling certificate verification. `/login bosch-llmfarm` only stores configuration and does not contact the gateway.

Do not use `NODE_TLS_REJECT_UNAUTHORIZED=0`. For old extension builds, `NODE_OPTIONS=--use-system-ca` can be used as a temporary workaround, but the provider-level system CA merge is the intended path.

Requests are sent as OpenAI-compatible streaming chat completions:

```text
POST <baseUrl>/chat/completions
```

with `model`, `messages`, `stream: true`, optional `temperature`, `max_tokens`, default `reasoning_effort`, optional OpenAI-style `tools`, and the configured gateway-key placement. Bosch LLM Farm requests are always sent as SSE streaming requests. The provider parses text deltas, tool-call deltas, usage chunks, and OpenAI-compatible reasoning fields such as `reasoning_content`, `reasoning`, `reasoning_text`, and `thinking`.

Company-network validation checklist:

- Run `/login bosch-llmfarm` directly, or run `/login`, choose `Use a subscription`, then select `Bosch LLM Farm`.
- Enter the real endpoint and gateway key.
- Enter one or more model IDs from Bosch Digital Assets.
- Select `/model bosch-llmfarm/<model-id>`.
- Send a text-only message and verify a normal response.
- Verify the request works without `NODE_TLS_REJECT_UNAUTHORIZED=0` and without relying on `NODE_OPTIONS=--use-system-ca`.
- Ask for an ASCET action and verify OpenAI-style tool calling works through the gateway.
- Verify image input.
- Verify SSE text streaming on at least one configured model.
- Verify thinking output appears in the UI.

## Dependent Chain And Dependency Actions

`ascet_read` includes these ASCET ToolAPI-backed actions:

- `read_dependent_chain`: read a local dependent parameter chain from the consuming component through its imported parameter to the exported parameter/provider component. The provider can be discovered automatically, or constrained with `exporterComponentPath` / `providerScopePath`.

`ascet_write` includes `set_element_dependency` for dependency flag changes. It uses the same guarded write contract as other write actions: preflight by default, interactive approval when `executeWrite=true`, optional `dryRun`, optional `backupDir`, and readback verification. Folder writes require `match="all"` so multi-component changes are explicit.

These actions call `runAscetCliJson`, enter the ASCET scheduler, and execute under the shared `ascet.toolapi.global` resource.

## Scheduler Diagnostics

ASCET ToolAPI-backed calls are serialized through the PI extension scheduler resource `ascet.toolapi.global` with concurrency `1`. This protects the ASCET CLI and ToolAPI host from concurrent calls that can otherwise overlap in the same local ASCET database session.

Use `ascet_status` for resolver, bundled asset, and ASCET runtime availability. Use `ascet_scheduler_status` or the PI command `ascet-scheduler-status` for queue, active job, CLI lock, and per-operation health diagnostics. Use `ascet_recover` with `scheduler_status`, `scheduler_recover`, or `clear_stale_cli_lock` when a stale local lock or degraded operation needs recovery.

Default PI-local runtime files:

- lock: `%LOCALAPPDATA%\PI\ascet\locks\ascet-toolapi.lock`
- operation health: `%LOCALAPPDATA%\PI\ascet\operation-health.json`

`ascet_scheduler_status` returns the same information as the command:

```text
ASCET Scheduler Status

Host: healthy
Active: 0
Resource: ascet.toolapi.global active=0 queued=0 concurrency=1
Pending: 0
Running: none

CLI Lock:
  owner: none

Operation Health:
  degraded: none
```

## Verification

Run the read-only live smoke from the PI repo root while an ASCET database containing `DEMO` is open:

```powershell
npm run smoke:ascet-extension
```

Run focused static coverage for status, scheduler, read-only tools, guarded write policy, and catalog negative cases:

```powershell
npm --workspace @earendil-works/pi-coding-agent test -- test/ascet-extension-status.test.ts test/ascet-extension-scheduler.test.ts test/ascet-extension-readonly-tools.test.ts test/ascet-extension-write-tools.test.ts
```

Run the default write smoke gate:

```powershell
npm run smoke:ascet-extension:write
```

The default write smoke does not write. It exits with `skipped: true`.

The real disposable write smoke requires explicit operator approval because it modifies the open ASCET database:

```powershell
$env:ASCET_WRITE_SMOKE = "1"
npm run smoke:ascet-extension:write
```

Default disposable target:

- component: `DEMO\__pi_write_smoke__\PiSmoke`
- method: `calc`

When enabled, setup, write, readback, and verify all run through canonical PI tools:

- `ascet_write`
- `ascet_read`
- `ascet_verify`

## Environment Overrides

- `ASCET_CLI_PATH`
- `ASCET_CONTRACTS_PATH`
- `PI_ASCET_RUNTIME_DIR`
- `PI_ASCET_LOCK_PATH`
- `PI_ASCET_OPERATION_HEALTH_PATH`
- `ASCET_WRITE_SMOKE`
- `ASCET_WRITE_SMOKE_COMPONENT`
- `ASCET_WRITE_SMOKE_METHOD`
