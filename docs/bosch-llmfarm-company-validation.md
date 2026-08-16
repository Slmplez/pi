# Bosch LLM Farm Company Network Validation

Date: 2026-07-15  
Status: pending company-network execution  
Scope: validate the committed Bosch LLM Farm system CA fix without exposing `gatewayKey`

## Commit Under Test

```text
7861ac7a Support Bosch LLM Farm system CA
```

Remote branch:

```text
codex/pi-ascet-extension-prototype
```

## Runtime Requirement

The provider-level system CA merge uses:

- `tls.getCACertificates()`
- `tls.setDefaultCACertificates()`

`tls.setDefaultCACertificates()` is available in Node `v22.19.0` and `v24.5.0` or newer. The extension declares:

```json
"node": "^22.19.0 || >=24.5.0"
```

Before testing, record:

```powershell
node -p "process.version"
node -e "const tls=require('node:tls'); console.log(typeof tls.getCACertificates, typeof tls.setDefaultCACertificates)"
```

Expected:

```text
function function
```

If `setDefaultCACertificates` is `undefined`, this fix cannot complete in that Node runtime. Upgrade Node to a compatible version or use this temporary workaround only for diagnosis:

```powershell
$env:NODE_OPTIONS = (($env:NODE_OPTIONS + " --use-system-ca").Trim())
pi
```

The temporary workaround is not final acceptance.

## Pre-Test Environment Checks

Run before launching Pi:

```powershell
$env:NODE_TLS_REJECT_UNAUTHORIZED
$env:NODE_OPTIONS
```

Acceptance baseline:

- `NODE_TLS_REJECT_UNAUTHORIZED` is empty or unset.
- Final acceptance does not rely on `NODE_OPTIONS=--use-system-ca`.
- Do not print or paste the real `gatewayKey` into logs or screenshots.

## Install Or Update Candidate

Use the branch/commit that contains `7861ac7a`.

If testing through the published package flow:

```powershell
pi update --extension npm:@vaf-agentworks/ascet-copilot
```

If testing from the checked-out repo or a packed tarball, record the exact install command here:

```text
<install command>
```

Restart Pi after install/update.

## Login Configuration

Run:

```text
/login bosch-llmfarm
```

Enter:

```text
Endpoint: https://apiroutecccn.apac.bosch.com/openapi/aigatewayprod/bdo-llmfarm-llm/v1
Gateway key: <do not record>
Key placement: authorization-gateway-header
Model IDs: <record non-secret model IDs only>
```

Expected:

- Login completes without contacting the gateway.
- Configured models appear under `/model`.

## Text Completion Validation

Select:

```text
/model bosch-llmfarm/<model-id>
```

Send:

```text
你好，请只回复 pong
```

Record:

```text
Model ID:
Result:
Error text, if any:
```

Pass criteria:

- No `UNABLE_TO_VERIFY_LEAF_SIGNATURE`.
- No generic retry failure ending in only `fetch failed`.
- Response returns normal completion text.
- If the response is 401, 403, or 404, classify as gateway key, key placement, model ID, or permission issue instead of CA failure.

## Error Message Validation

If a TLS failure still occurs, record the sanitized error text.

Expected after this fix:

```text
Bosch LLM Farm TLS certificate verification failed (<TLS_CODE>): <cause>
```

The error must not include:

- Full `gatewayKey`
- `Authorization: Bearer <gatewayKey>`
- Full `gatewayKey` query parameter
- Full request body `gatewayKey`

## Optional Capability Validation

Run only after text completion passes.

### Streaming

Streaming is mandatory for Bosch LLM Farm in this extension. Send a short prompt and confirm text appears normally.

Record:

```text
Streaming model:
Pass/Fail:
Error text, if any:
```

### Reasoning / Thinking

Reasoning is enabled by default for Bosch LLM Farm models in the extension. Send a prompt that requires brief reasoning and verify thinking output is visible.

Record:

```text
Reasoning model:
Thinking visible in UI:
Error text, if any:
```

### Vision

Image input is enabled by default for Bosch LLM Farm models in the extension. Send an image URL or base64 image.

Record:

```text
Vision model:
Pass/Fail:
Error text, if any:
```

### Tool Calling

Ask for a simple ASCET read-only action and confirm OpenAI-style tool calls still round-trip through the gateway.

Record:

```text
Tool calling model:
Pass/Fail:
Error text, if any:
```

## Final Acceptance Record

```text
Date:
Tester:
Network/VPN:
Node version:
Pi version:
ASCET Copilot extension version or commit:
NODE_TLS_REJECT_UNAUTHORIZED:
NODE_OPTIONS:
Endpoint host:
Model IDs tested:
Text completion pass/fail:
Streaming pass/fail/not tested:
Vision pass/fail/not tested:
Tool calling pass/fail/not tested:
Sanitized error text, if any:
Conclusion:
```

Final acceptance can be marked only when:

- Text completion passes on the real Bosch gateway.
- The test does not disable TLS verification.
- The test does not depend on `NODE_OPTIONS=--use-system-ca`.
- No secret appears in recorded output.
