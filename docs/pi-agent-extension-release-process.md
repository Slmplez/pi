# Pi Agent Extension Release Process

This document defines the required process for developing and releasing Pi Agent as a distribution that includes extension packages. Future work on the ASCET-enabled Pi release should follow this process unless the user explicitly approves a different path.

## Release Model

Pi Agent must stay small and generic. Domain-specific capabilities, including ASCET tools, are released as Pi packages that register extensions.

The release has two layers:

1. Core Pi Agent: the reusable CLI and runtime packages, including `@earendil-works/pi-coding-agent`, `@earendil-works/pi-agent-core`, `@earendil-works/pi-ai`, and `@earendil-works/pi-tui`.
2. Extension packages: installable Pi packages such as `@ascet/pi-extension`, containing extension entrypoints, runtime assets, tool schemas, commands, and domain-specific docs.

The project-local development entrypoint under `.pi/extensions/` is for development only. A formal release must prove that the extension works after package installation from outside the workspace.

## Required Package Shape

Each extension package must be installable by `pi install` and must declare Pi resources in `package.json`.

Minimum package shape:

```json
{
  "name": "@ascet/pi-extension",
  "version": "0.1.0",
  "type": "module",
  "main": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  },
  "pi": {
    "extensions": ["src/index.ts"],
    "skills": ["skills"],
    "subagents": {
      "agents": ["agents"]
    }
  },
  "files": [
    "src",
    "agents",
    "skills",
    "ascet-cli",
    "README.md"
  ],
  "dependencies": {
    "typebox": "1.1.38"
  },
  "peerDependencies": {
    "@earendil-works/pi-coding-agent": "*"
  }
}
```

Rules:

- Do not rely on `.pi/extensions/<name>/index.ts` for the released extension.
- Do not rely on workspace-relative imports in the published package.
- Runtime dependencies needed by the extension must be in `dependencies`, not `devDependencies`.
- Pi core packages imported by extensions should be listed as `peerDependencies` with a `"*"` range.
- The package must include every runtime asset required by the extension, or fail closed with a clear diagnostic.
- Package-shipped skills must be exposed through `pi.skills` and included in `files`.
- Package-shipped subagent profiles must be exposed through `pi.subagents.agents` and included in `files`.

## ASCET Extension Requirements

The ASCET extension package is `packages/ascet-extension`.

Before any release candidate, refresh bundled ASCET assets:

```powershell
npm --workspace @ascet/pi-extension run copy-assets
```

The release candidate must contain these bundled files:

```text
packages/ascet-extension/ascet-cli/contracts/cli-catalog.json
packages/ascet-extension/ascet-cli/bin/AscetCli.exe
```

Resolver expectations:

- `env` mode may use `ASCET_CLI_PATH` or `ASCET_CONTRACTS_PATH`.
- `bundle` mode must use files inside the extension package.
- `source` mode is allowed only for local development fallback beside the parent ASCET checkout.
- Bundle mode must fail closed when partial bundled assets exist.

ASCET ToolAPI-backed operations must go through the extension scheduler resource `ascet.toolapi.global`. Parallel requests from agents are allowed; the scheduler coordinates active execution, queueing, timeout handling, and operation health.

## Development Flow

1. Start from the repo root:

   ```powershell
   cd E:\Rep\AscetAgent\PI
   ```

2. Inspect the worktree before changing files:

   ```powershell
   git status --short
   ```

   Do not revert unrelated user changes.

3. Develop extension behavior in `packages/ascet-extension/src`.

4. Keep `.pi/extensions/ascet/index.ts` as a project-local development loader only:

   ```ts
   export { default } from "../../../packages/ascet-extension/src/index.ts";
   ```

5. Update focused tests for every behavior change. Prefer the existing coding-agent extension tests for extension registration, guarded write policy, schema behavior, status output, and catalog failures.

6. Update `packages/ascet-extension/README.md` when commands, environment variables, tools, or diagnostics change.

7. Update changelogs under `packages/*/CHANGELOG.md` according to `AGENTS.md`.

## Local Validation Before Packaging

Run focused static coverage:

```powershell
npm --workspace @earendil-works/pi-coding-agent test -- test/ascet-extension-status.test.ts test/ascet-extension-readonly-tools.test.ts test/ascet-extension-write-tools.test.ts
```

Run `npm run check` for the repository checks required by the release process. ASCET releases must not run repository-wide `test.sh` or `npm test`: those suites include unrelated core, AI, coding-agent, and platform coverage and are not ASCET release gates.

If a change touches a shared core package, run only the corresponding specific test(s). Keep validation scoped to the affected package and specific tests. Do not run the full vitest suite directly; follow `AGENTS.md` for test selection.

## ASCET Live Validation

Live ASCET verification is required when changes affect:

- ASCET CLI resolution
- bundled contracts or binaries
- ToolAPI-backed read, search, reference, diff, write, batch write, or verify operations
- scheduler, lock, recovery, timeout, or process cleanup behavior
- JSON projection of ASCET results

Live validation rules:

- Route live ASCET commands through the scheduler when running them from multiple agents.
- Parallel live ASCET requests are allowed, but evidence collection must preserve exact tool/action/target details so reports can be merged deterministically.
- Clean up stale `AscetCli` or ToolAPI child processes before retrying.
- Treat runtime behavior as the source of truth, not just green build output.
- If a smoke test reports success but the UI/tool/runtime disagrees, trace the failing layer and revalidate end to end.

Read-only smoke, while an ASCET database containing `DEMO` is open:

```powershell
npm run smoke:ascet-extension
```

Default write smoke gate:

```powershell
npm run smoke:ascet-extension:write
```

The default write smoke must skip actual writes. Real disposable write smoke requires explicit operator approval because it modifies the open ASCET database:

```powershell
$env:ASCET_WRITE_SMOKE = "1"
npm run smoke:ascet-extension:write
```

Default disposable target:

```text
DEMO\__pi_write_smoke__\PiSmoke
```

## Package Candidate Validation

The release blocker is this question:

Can a user install Pi Agent and the ASCET extension package outside the monorepo, then use ASCET tools without workspace-relative files?

To answer it, build a local unpublished release from outside workspace resolution:

```powershell
npm run release:local -- --out C:\tmp\pi-local-release --force
```

Then verify the core Pi release:

```powershell
C:\tmp\pi-local-release\node\pi --help
C:\tmp\pi-local-release\node\pi --version
C:\tmp\pi-local-release\node\pi --list-models
C:\tmp\pi-local-release\node\pi -p "Say exactly: ok"

C:\tmp\pi-local-release\bun\pi --help
C:\tmp\pi-local-release\bun\pi --version
C:\tmp\pi-local-release\bun\pi --list-models
C:\tmp\pi-local-release\bun\pi -p "Say exactly: ok"
```

Also start interactive mode for both Node and Bun builds and submit at least one real prompt with the intended default provider:

```powershell
C:\tmp\pi-local-release\node\pi
C:\tmp\pi-local-release\bun\pi
```

## Extension Install Validation

Validate the extension through package install, not through `.pi/extensions`.

For a local package candidate:

```powershell
mkdir C:\tmp\pi-extension-install-test
cd C:\tmp\pi-extension-install-test
C:\tmp\pi-local-release\node\pi install E:\Rep\AscetAgent\PI\packages\ascet-extension
C:\tmp\pi-local-release\node\pi list
```

Then start Pi from the isolated directory:

```powershell
C:\tmp\pi-local-release\node\pi
```

The startup header must show the installed ASCET extension. Inside Pi, verify:

```text
ascet_status
ascet_scheduler_status
```

If using the model to call tools, ask it to call `ascet_status` and confirm:

- the extension tool is registered
- the resolver mode is expected
- bundled contracts and binary checks are present
- missing ASCET runtime prerequisites are reported as diagnostics, not crashes

Repeat install validation for the Bun build if the release is expected to support Bun:

```powershell
mkdir C:\tmp\pi-extension-install-test-bun
cd C:\tmp\pi-extension-install-test-bun
C:\tmp\pi-local-release\bun\pi install E:\Rep\AscetAgent\PI\packages\ascet-extension
C:\tmp\pi-local-release\bun\pi list
C:\tmp\pi-local-release\bun\pi
```

For npm release candidates, use the package spec instead:

```powershell
pi install npm:@ascet/pi-extension@<version>
```

For project-local extension rollout:

```powershell
pi install -l npm:@ascet/pi-extension@<version>
```

## Release Execution

1. Confirm changelogs are current. If the `/cl` prompt has not been run on the latest `main`, run it before releasing.

2. Refresh ASCET extension assets:

   ```powershell
   npm --workspace @ascet/pi-extension run copy-assets
   ```

3. Run the focused and live validation gates from this document.

4. Run the existing release command from `AGENTS.md`:

   ```powershell
   $env:PI_ALLOW_LOCKFILE_CHANGE = "1"
   $env:npm_config_min_release_age = "0"
   npm run release:patch
   ```

   Use `release:minor` instead of `release:patch` when the release contains breaking changes.

5. Review generated lockfile, shrinkwrap, changelog, tag, and package diffs before push.

6. CI publishes npm packages from the pushed tag. Do not run local `npm publish`.

7. If CI publish fails, fix the failing CI condition and rerun the tag workflow. Do not rerun the release script for the same version after a tag was pushed.

## Post-Release Validation

After CI publishes:

```powershell
pi update --self
pi install npm:@ascet/pi-extension@<version>
pi list
```

Then run a fresh session from a directory outside the repo and verify:

- `--help`, `--version`, and `--list-models` work
- interactive startup works
- extension appears in the startup extension list
- `ascet_status` works
- `ascet_scheduler_status` works
- read-only ASCET smoke works when the required ASCET database is open

If the extension is already installed, test update behavior:

```powershell
pi update --extensions
pi update --extension npm:@ascet/pi-extension
```

## Rollback and Failure Handling

If the core Pi release is bad:

- Stop promotion immediately.
- Identify whether the failure is in the core package, binary packaging, model/provider behavior, or extension loading.
- Fix forward with a new patch release.

If the extension package is bad:

- Do not republish the same version.
- Fix forward with a new extension package version.
- If the bug is only package metadata or missing assets, prove the fixed package from a clean install directory before announcing availability.

If ASCET runtime behavior disagrees with smoke output:

- Reproduce using the exact tool name and component path that failed.
- Inspect resolver mode, contracts path, binary path, scheduler status, lock file, and operation health.
- Rebuild or refresh assets only after confirming which layer is stale.
- Re-run the exact failing operation, then run the broader smoke.

## Definition of Done

A release candidate is done only when all of these are true:

- Core Pi starts from an isolated local release directory.
- The ASCET extension installs as a Pi package from outside the monorepo.
- The extension loads without `.pi/extensions` development paths.
- Bundled ASCET assets are present or fail closed with clear diagnostics.
- Focused extension tests pass.
- Required live ASCET checks pass through the scheduler with deterministic evidence and reports.
- Changelogs document user-visible changes.
- Installation, update, and rollback notes are clear.

## Agent Checklist

For future agent work on this release path:

- Read this document before modifying release, package, or extension behavior.
- Preserve the core-vs-extension separation.
- Keep development loaders separate from released package entrypoints.
- Validate from outside the repo before claiming release readiness.
- Prefer exact runtime proof over nominal command success.
