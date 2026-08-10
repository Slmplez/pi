# ASCET Copilot

ASCET Copilot package bundle for Pi.

## Install

Install the official Pi agent first:

```powershell
npm install -g @earendil-works/pi-coding-agent
```

Then install ASCET Copilot:

```powershell
pi install npm:@vaf-agentworks/ascet-copilot
pi
```

This bundle loads the ASCET tool extension, ASCET startup UI, subagents, todo overlay, ask-user-question, and web access package resources.

## Bosch LLM Farm Login

With `@earendil-works/pi-coding-agent@0.80.6`, the top-level `/login` selector only shows:

```text
Use a subscription
Use an API key
```

Configure Bosch LLM Farm with:

```text
/login bosch-llmfarm
```

or select `Use a subscription`, then choose `Bosch LLM Farm`.

The Bosch provider only contacts the gateway after you select `/model bosch-llmfarm/<model-id>` and send a message. Before that real request, it merges Node's default CA set with the operating system trusted CA set so Bosch enterprise TLS certificates can be verified on Windows. Do not use `NODE_TLS_REJECT_UNAUTHORIZED=0`; `NODE_OPTIONS=--use-system-ca` is only a temporary workaround for old extension builds.

## Update

```powershell
pi update --extension npm:@vaf-agentworks/ascet-copilot
```

## Remove

```powershell
pi remove npm:@vaf-agentworks/ascet-copilot
```
