# ASCET Copilot

ASCET Copilot package bundle for Pi.

## Install

Install the official Pi agent first:

```powershell
npm install -g @earendil-works/pi-coding-agent
```

Then install ASCET Copilot:

```powershell
pi install npm:@zeerke/ascet-copilot
pi
```

This bundle loads the ASCET tool extension, ASCET startup UI, subagents, todo overlay, ask-user-question, Hermes memory, and web access package resources.

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

Pi core builds that include the Bosch login shortcut patch can also use:

```text
/login-bosch-llmapi
```

`/loginBoschLLMAPI` is kept as a compatibility alias.

## Update

```powershell
pi update --extension npm:@zeerke/ascet-copilot
```

## Remove

```powershell
pi remove npm:@zeerke/ascet-copilot
```
