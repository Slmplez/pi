# Pi ASCET UI Extension

ASCET COPILOT startup UI package for Pi.

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

```powershell
pi install npm:pi-ascet-ui-extension
```

Install a pinned version:

```powershell
pi install npm:pi-ascet-ui-extension@0.1.0
```

Try once without installing:

```powershell
pi -e npm:pi-ascet-ui-extension
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
pi update --extension npm:pi-ascet-ui-extension
```

Update all installed Pi packages:

```powershell
pi update --all
```

If you installed from GitHub, use the same package source id that Pi registered during install.

## Remove

```powershell
pi remove npm:pi-ascet-ui-extension
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
  tips.ts
themes/
  ascet-spectrum-dark.json
```
