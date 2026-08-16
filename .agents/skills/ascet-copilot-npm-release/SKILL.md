---
name: ascet-copilot-npm-release
description: Prepare, validate, and publish the three ASCET Copilot npm packages to the internal Bosch Nexus registry. Use for ASCET Copilot version bumps, bundled dependency refreshes, package dry runs, isolated installation checks, serial Nexus publishing, post-publish verification, or release failure recovery.
---

# ASCET Copilot npm Release

Publish `extension`, `ui`, then the aggregate package. Refresh compatible bundled dependencies before every release and keep all direct versions exact.

## Read First

1. Read repository `AGENTS.md` and `docs/pi-agent-extension-release-process.md`.
2. Read [release topology](references/release-topology.md).
3. Inspect `git status --short`. Never stage, revert, or overwrite unrelated work.
4. Never print Nexus credentials or copy authentication into repository files.
5. Use the system CA. Never set `strict-ssl=false`.

## Release Invariants

- Publish only to the internal `ascet-copilot-npm` Nexus repository.
- Keep the three ASCET Copilot packages on one exact version.
- Keep aggregate dependencies and `bundledDependencies` synchronized.
- Update compatible stable external dependencies automatically before every release.
- Do not take breaking dependency updates unless the user explicitly approves them.
- Do not publish until focused tests, packaging checks, required live ASCET validation, and `npm run check` pass.
- Run the repository-wide `test.sh` gate when Bash is available. On Windows without Bash/WSL, execute an equivalent PowerShell run that isolates and restores `auth.json`, sets `PI_NO_LOCAL_LLM=1`, removes provider credentials, and runs `npm test`.
- Treat failures from untouched packages as baseline exceptions only after the user explicitly accepts the unverified scope. Never waive failures in changed packages, packaging, ASCET live validation, or `npm run check`.
- Request one explicit confirmation immediately before the first irreversible `npm publish`.
- Publish serially. Never use batch publication.
- Write generated `.tgz` files only to a temporary directory outside every package source directory.
- Never republish an existing version; fix forward with another patch.

## 1. Establish the Release Version

Set the session environment:

```powershell
$env:NODE_OPTIONS = "--use-system-ca"
$env:npm_config_min_release_age = "0"
$registry = "https://szh6-v-000cy.szh.apac.bosch.com/nexus/repository/ascet-copilot-npm/"
```

Verify registry configuration without displaying credentials:

```powershell
npm config get @vaf-agentworks:registry
npm whoami --registry=$registry
npm view @vaf-agentworks/ascet-copilot version --registry=$registry
```

Read the latest published version and choose the next patch unless the user requested another stable version. Confirm that the target version is absent for all three packages:

```powershell
npm view @vaf-agentworks/ascet-copilot-extension@$version version --registry=$registry
npm view @vaf-agentworks/ascet-copilot-ui@$version version --registry=$registry
npm view @vaf-agentworks/ascet-copilot@$version version --registry=$registry
```

A not-found response is expected. Any existing target version is a release blocker.

## 2. Refresh Versions and Bundled Dependencies

Preview the deterministic release preparation:

```powershell
node scripts/prepare-ascet-copilot-npm-release.mjs --version $version
```

The default policy updates only compatible stable versions:

- `1.x` dependencies remain within the current major version.
- `0.x` dependencies remain within the current minor version.
- All resulting versions remain exact.

Show the version and dependency diff. Then apply it:

```powershell
node scripts/prepare-ascet-copilot-npm-release.mjs --version $version --write
```

Use `--allow-breaking-dependency-updates` only after separate explicit user approval and additional compatibility testing.

The preparation script must synchronize:

- `packages/ascet-extension/package.json`
- `packages/Pi-ascet-ui-extension/package.json`
- `release/ascet-copilot/package.json`
- UI `ASCET_COPILOT_RELEASE.version`
- aggregate first-party dependencies
- approved external bundled dependencies

Refresh the root lockfile without lifecycle scripts:

```powershell
npm install --package-lock-only --ignore-scripts
```

Review all manifest and lockfile diffs before continuing.

## 3. Validate Source and ASCET Assets

Ensure changelogs describe user-visible changes. Refresh and verify packaged ASCET assets:

```powershell
npm --workspace @vaf-agentworks/ascet-copilot-extension run copy-assets
npm --workspace @vaf-agentworks/ascet-copilot-extension run verify-assets
npm --workspace @vaf-agentworks/ascet-copilot-extension run verify-isolated-install
```

Run focused release tests:

```powershell
npm --workspace @vaf-agentworks/ascet-copilot-ui test
node --test scripts/prepare-ascet-copilot-npm-release.test.mjs
```

Run the repository-required gates:

```powershell
bash ./test.sh
npm run check
```

On Windows without Bash/WSL, use the equivalent PowerShell gate described above and record any accepted untouched-package baseline failures in the final release summary.

For runtime, Bridge, tool, contract, prompt, or Skill changes, run the required serial real ASCET Live validation against the approved database. Treat nominal preflight or plan output as insufficient. Require committed writes, readback evidence, cleanup-only verification, and zero residual locks. If live validation is skipped, obtain explicit user acceptance and state the unverified scope.

## 4. Pack the First-Party Packages

Create package candidates without publishing:

```powershell
$packDir = Join-Path $env:TEMP "ascet-copilot-packs-$version"
New-Item -ItemType Directory -Force $packDir | Out-Null
npm pack --workspace @vaf-agentworks/ascet-copilot-extension --pack-destination=$packDir --json
npm pack --workspace @vaf-agentworks/ascet-copilot-ui --pack-destination=$packDir --json
```

Inspect tarball file lists, package names, versions, sizes, integrity, bundled ASCET assets, and removal of deprecated full-check/checker-agent surfaces. Validate installation from outside the repository.

## 5. Confirm and Publish Serially

Present one final summary containing:

- registry
- target version
- dependency changes
- test and live-validation results
- tarball names, sizes, and integrity
- current relevant git diff

Ask for explicit confirmation to publish all three packages. After confirmation, publish extension and UI serially:

```powershell
npm publish --workspace @vaf-agentworks/ascet-copilot-extension --registry=$registry
npm view @vaf-agentworks/ascet-copilot-extension@$version version --registry=$registry

npm publish --workspace @vaf-agentworks/ascet-copilot-ui --registry=$registry
npm view @vaf-agentworks/ascet-copilot-ui@$version version --registry=$registry
```

Stop immediately on failure.

## 6. Rebuild and Publish the Aggregate

Only after extension and UI are visible in Nexus, rebuild the aggregate lock and installed bundle:

```powershell
Push-Location release/ascet-copilot
npm install --package-lock-only --ignore-scripts --workspaces=false --registry=https://registry.npmjs.org/
npm ci --ignore-scripts --workspaces=false --registry=https://registry.npmjs.org/
npm pack --dry-run --json
npm pack --pack-destination=$packDir --json
Pop-Location
```

The configured `@vaf-agentworks` scope must still resolve through internal Nexus while external dependencies resolve through the approved external registry.

Verify the aggregate contains all declared resources, contains no nested `.tgz`, and does not contain removed packages or surfaces. A nested tarball is a release blocker. Then publish and verify:

```powershell
Push-Location release/ascet-copilot
npm publish --registry=$registry
Pop-Location
npm view @vaf-agentworks/ascet-copilot@$version version --registry=$registry
```

## 7. Post-Publish Verification

Verify metadata for all packages and aggregate dependency pins:

```powershell
npm view @vaf-agentworks/ascet-copilot-extension@$version dist.integrity --registry=$registry
npm view @vaf-agentworks/ascet-copilot-ui@$version dist.integrity --registry=$registry
npm view @vaf-agentworks/ascet-copilot@$version dist.integrity --registry=$registry
npm view @vaf-agentworks/ascet-copilot@$version dependencies --json --registry=$registry
npm view @vaf-agentworks/ascet-copilot@$version bundledDependencies --json --registry=$registry
```

Use an empty temporary npm user config to verify anonymous aggregate download. Then perform a clean isolated install and confirm Pi startup, package discovery, UI release display, and representative ASCET status/read operations.

Confirm the UI update metadata endpoint returns `dist-tags.latest` for the new version. Record the exact version, package integrities, validation results, and any accepted exceptions.

## Failure Handling

- If preparation or validation fails, publish nothing.
- If extension publishes but UI fails, fix the UI release and continue only when the same target version remains unpublished for UI and aggregate.
- If published first-party package contents require correction, bump all three packages to another patch; never overwrite.
- If aggregate publication fails after first-party publication, repair aggregate metadata or packaging and publish it only if its target version is still unused.
- Do not commit or push unless the user explicitly requests it.
