# Pi ASCET UI Extension

ASCET Copilot startup UI package for Pi.

## Features

- ASCET COPILOT / VM startup header
- VM ANSI logo with a 3 second intro animation
- Spectral gradient palettes and startup rule animation
- Quiet startup mode for Pi's loaded-resource summary
- Real recent sessions in the startup panel
- Rotating startup tips and feedback copy
- ASCET COPILOT terminal title with an agent activity spinner
- Optional `ascet-spectrum-dark` theme

## Requirements

- Pi latest
- Node.js and npm for local development or npm publishing

## Install

### From npm

Recommended ASCET Copilot install:

```powershell
pi install npm:@vaf-agentworks/ascet-copilot
```

Standalone UI package:

```powershell
pi install npm:@vaf-agentworks/ascet-copilot-ui
```

Install a pinned version:

```powershell
pi install npm:@vaf-agentworks/ascet-copilot-ui@0.1.0
```

Try once without installing:

```powershell
pi -e npm:@vaf-agentworks/ascet-copilot-ui
```

### From GitHub

```powershell
pi install git:github.com/Slmplez/Pi-ascet-ui-extension
```

Install a pinned tag:

```powershell
pi install git:github.com/Slmplez/Pi-ascet-ui-extension@v0.1.0
```

### From Local Checkout

```powershell
git clone https://github.com/Slmplez/Pi-ascet-ui-extension.git
cd Pi-ascet-ui-extension
npm install
pi install .
```

Run once from a local checkout:

```powershell
pi -e .
```

From a Pi source checkout:

```powershell
.\pi-test.ps1 --extension C:\path\to\Pi-ascet-ui-extension
```

## Update

```powershell
pi update --extension npm:@vaf-agentworks/ascet-copilot-ui
```

Update all installed Pi packages:

```powershell
pi update --all
```

If you installed from GitHub, use the same package source id that Pi registered during install.

## Update Registry

The startup update checker reads `dist-tags.latest` from the internal ASCET Copilot Nexus registry. Override the registry for testing or migration with:

```powershell
$env:ASCET_COPILOT_NPM_REGISTRY = "https://nexus.example.com/repository/ascet-copilot-npm/"
```

Cached results are scoped to the registry URL and are not reused after a registry change.

## Remove

```powershell
pi remove npm:@vaf-agentworks/ascet-copilot-ui
```

If you installed from GitHub, remove the matching GitHub package id instead.

## Commands

- `/vm-header-on`: enable the ASCET COPILOT startup header.
- `/vm-header-off`: restore Pi's built-in startup header.

## Development

```powershell
npm install
npm run check
npm test
```

Pi load verification from a Pi source checkout:

```powershell
.\pi-test.ps1 --extension C:\Users\ZJR\Documents\OMP\Pi-ascet-ui-extension --list-models
```

Preview npm package contents:

```powershell
npm pack --dry-run
```

## Package Layout

```text
extensions/
  index.ts
  AscetHeader.ts
  logo.ts
  recentSessions.ts
  recentSessions.test.ts
  releaseInfo.ts
  releaseInfo.test.ts
  tips.ts
themes/
  ascet-spectrum-dark.json
```
