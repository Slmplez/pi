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
- `ascet_get`
- `ascet_read`
- `ascet_diff`
- `ascet_edit`
- `ascet_verify`

Retired discovery, search, and index tools are not registered as model tools and have no compatibility aliases. `ascet_get` is the only ASCET discovery surface.

The requirements Excel tool is temporarily hidden from the registered model-facing tool surface.

Guarded write tools are preflight-only by default and require explicit interactive approval before CLI execution. Canonical `ascet_edit` returns a non-error `status: "preflight"` outcome when `executeWrite` is false. `ascet_batch_write` uses operation-specific request schemas and reports partial completion as `status: "partial"` when the ASCET batch backend returns item failures.

## 0.2.0 Migration

This release replaces the two former edit tool names with one canonical surface:

```text
ascet_write(...)              -> ascet_edit(...)
ascet_component_editable(...) -> ascet_edit(...)
ascet_write_* errors          -> ascet_edit_* errors
```

Mutation arguments keep their `action` discriminator. Component editability keeps `mode: "check" | "set"`. ASCET backend logical command IDs and CLI operations are unchanged.

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

The default gateway-key placement is `authorization + gatewayKey header`, matching the live-validated Bosch gateway shape:

```http
Authorization: Bearer <gatewayKey>
gatewayKey: <gatewayKey>
```

With the default placement, Bosch models use Pi's built-in `openai-completions` streaming provider. Legacy placements are still available during login for gateways that expect `gatewayKey` in the request body or query string; those placements keep using the Bosch custom transport fallback.

If the gateway only requires a bearer token, choose `header only` during login. The selected placement is stored with the model configuration and applied to later `/model bosch-llmfarm/<model-id>` requests.

After login, select a configured model:

```text
/model bosch-llmfarm/<model-id>
```

When the provider sends a real Bosch HTTPS request, it merges the Node default CA set with the operating system trusted CA set before the provider transport runs. This supports Bosch enterprise TLS inspection or internal root CA chains on Windows without disabling certificate verification. `/login bosch-llmfarm` only stores configuration and does not contact the gateway.

Do not use `NODE_TLS_REJECT_UNAUTHORIZED=0`. For old extension builds, `NODE_OPTIONS=--use-system-ca` can be used as a temporary workaround, but the provider-level system CA merge is the intended path.

Requests are sent as OpenAI-compatible streaming chat completions:

```text
POST <baseUrl>/chat/completions
```

with `model`, `messages`, `stream: true`, optional `temperature`, `max_tokens`, default `reasoning_effort`, optional OpenAI-style `tools`, `Accept: text/event-stream`, and default `gatewayKey` header. It does not request OpenAI `stream_options` by default. Bosch LLM Farm requests are always sent as SSE streaming requests. The default path reuses Pi OpenAI completions streaming; legacy key placements use the Bosch custom transport fallback.

The extension also declares Bosch provider-scoped retry defaults for hosts that support extension settings defaults, so long-context first-token latency does not require raising global retry budgets. These defaults are low priority and can be overridden in `settings.json` with `providerOverrides["bosch-llmfarm"].retry`.

Company-network validation checklist:

Run a text streaming live smoke from the repo root when Bosch network access and a gateway key are available:

```powershell
$env:BOSCH_LLMFARM_BASE_URL = "https://.../v1"
$env:BOSCH_LLMFARM_GATEWAY_KEY = "..."
$env:BOSCH_LLMFARM_MODEL = "..."
npm run smoke:bosch-llmfarm
```

Optional live smoke inputs: `BOSCH_LLMFARM_PROMPT`, `BOSCH_LLMFARM_IMAGE_BASE64`, `BOSCH_LLMFARM_IMAGE_MIME`, `BOSCH_LLMFARM_TOOL_SMOKE=1`, `BOSCH_LLMFARM_TIMEOUT_MS`, `BOSCH_LLMFARM_CONTEXT_WINDOW`, and `BOSCH_LLMFARM_MAX_TOKENS`.

The default smoke uses the live-validated `authorization-gateway-header` placement. To compare with the Python-style body placement without changing saved Pi login state:

```powershell
$env:BOSCH_LLMFARM_KEY_PLACEMENT = "header-body"
npm run smoke:bosch-llmfarm
```

Supported smoke placements are `authorization-gateway-header`, `header-body`, `header-query-body`, `header-only`, and `header-query`. The default is `authorization-gateway-header`, which reuses Pi's OpenAI completions provider. Non-default placements use the Bosch custom transport fallback for live compatibility checks.

Manual validation checklist:

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

## On-Demand Get And Exact Read Actions

`ascet_get` is the only live discovery surface. Its seven actions are:

- `tree`: bounded Folder, Project, and Component structure; it does not read Elements, references, or code.
- `elements`: complete Element directory for one selected Component or bounded Folder scope. It has no artificial item-count limit.
- `formulas`: complete Project formula definitions with formula content and parameter metadata.
- `component_refs`: outgoing Component references without code or implementation payloads.
- `bde_edges`: BDE/block-diagram signal edges for one selected Class or Module.
- `import_binding`: exact Imported Element binding for an explicitly selected provider.
- `dbitem_refs`: outgoing references for one exact DataBaseItem.

Start with `tree`, then pass an exact returned `path` or stable `oid` to a bounded follow-up action. Small Get results return inline. Large results are stored as an NDJSON observation with a metadata file; use Pi `find`, `grep`, and `read` against the returned paths. Observations are task evidence, not a global database index.

Use `ascet_read` only for exact deep reads after the target is known: complete code, implementation metadata, dependency/formula detail, state-machine flow, or detailed block-diagram data. `read_dependent_chain` and `read_element_dependency` do not replace bounded provider discovery with Get observations.

`ascet_edit` includes `set_element_dependency` for dependency flag changes. It uses the same guarded write contract as other write actions: preflight by default, interactive approval when `executeWrite=true`, optional `dryRun`, optional `backupDir`, and readback verification. Successful writes invalidate affected stored observations; request fresh bounded Get data before relying on prior structure evidence.

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

- `ascet_edit`
- `ascet_read`
- `ascet_verify`

For `apply_project_formula`, provide an explicitly created disposable Project in the ASCET `TEST` folder. The smoke first proves guarded preflight, then applies an identity formula with readback verification:

```powershell
$env:ASCET_SMOKE_CWD = "E:\Rep\AscetAgent"
$env:ASCET_PROJECT_FORMULA_SMOKE = "1"
$env:ASCET_PROJECT_FORMULA_SMOKE_PROJECT = "TEST\PI_EDIT_MIGRATION_<run-id>\PiSmokeProject"
npm run smoke:ascet-extension:project-formula
```

After the result is recorded, remove the disposable Project and its parent folder through the same canonical edit tool:

```powershell
$env:ASCET_PROJECT_FORMULA_SMOKE_CLEANUP_ONLY = "1"
npm run smoke:ascet-extension:project-formula
```

The script does not create Projects: a fixture must be explicitly provisioned by the test environment. It rejects missing Project paths and performs no writes unless `ASCET_PROJECT_FORMULA_SMOKE=1` is set.

## Environment Overrides

- `ASCET_CLI_PATH`
- `ASCET_CONTRACTS_PATH`
- `PI_ASCET_RUNTIME_DIR`
- `PI_ASCET_LOCK_PATH`
- `PI_ASCET_OPERATION_HEALTH_PATH`
- `ASCET_WRITE_SMOKE`
- `ASCET_WRITE_SMOKE_COMPONENT`
- `ASCET_WRITE_SMOKE_METHOD`
- `ASCET_PROJECT_FORMULA_SMOKE`
- `ASCET_PROJECT_FORMULA_SMOKE_PROJECT`
- `ASCET_PROJECT_FORMULA_SMOKE_FORMULA`
- `ASCET_PROJECT_FORMULA_SMOKE_CLEANUP_ONLY`
