# ASCET Copilot Release Topology

## Internal Nexus

```text
https://szh6-v-000cy.szh.apac.bosch.com/nexus/repository/ascet-copilot-npm/
```

Use `NODE_OPTIONS=--use-system-ca`. Keep authentication in the user npm configuration or environment. Never commit credentials.

## Package Order

1. `@vaf-agentworks/ascet-copilot-extension`
   - Source: `packages/ascet-extension`
   - Contains ASCET tools, Bridge integration, contracts, templates, runtime assets, prompts, and `ascet-engineering` Skill.
2. `@vaf-agentworks/ascet-copilot-ui`
   - Source: `packages/Pi-ascet-ui-extension`
   - Contains startup UI, release/update display, and themes.
3. `@vaf-agentworks/ascet-copilot`
   - Source: `release/ascet-copilot`
   - Physically bundles first-party and approved external packages.

## Automatically Managed External Dependencies

```text
pi-subagents
@juicesharp/rpiv-todo
@juicesharp/rpiv-ask-user-question
@narumitw/pi-goal
pi-web-access
```

`scripts/prepare-ascet-copilot-npm-release.mjs` updates this allowlist only. Default updates stay within the current compatible range and remain exact. Breaking updates require `--allow-breaking-dependency-updates` and explicit user approval.

## Version Synchronization

The following values must equal the target release version:

- extension package `version`
- UI package `version`
- aggregate package `version`
- aggregate dependency on extension
- aggregate dependency on UI
- UI `ASCET_COPILOT_RELEASE.version`

The aggregate lockfile can resolve a new first-party version only after extension and UI have been published to Nexus. Therefore regenerate `release/ascet-copilot/package-lock.json` after those two serial publications and before aggregate publication.

## Update Checker Contract

The UI queries package metadata from internal Nexus:

```text
<registry>/@vaf-agentworks%2Fascet-copilot
```

Read the latest version from:

```text
dist-tags.latest
```

Allow registry override through `ASCET_COPILOT_NPM_REGISTRY`. Cache entries are valid only for the registry that produced them.

## Security Gates

- Do not use `strict-ssl=false`.
- Do not run lifecycle scripts while refreshing dependencies or locks.
- Do not add dependencies outside the allowlist silently.
- Do not accept new high or critical audit findings without explicit approval.
- Do not perform concurrent npm publication.
- Do not report preflight, plan, or dry-run output as a successful live write.
