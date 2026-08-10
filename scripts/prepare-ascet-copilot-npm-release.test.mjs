import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import {
	ASCET_COPILOT_EXTERNAL_DEPENDENCIES,
	assertStableVersion,
	prepareReleaseState,
	selectHighestStableVersion,
	updateReleaseInfoVersion,
} from "./prepare-ascet-copilot-npm-release.mjs";

function createFixture() {
	return {
		extensionManifest: {
			name: "@vaf-agentworks/ascet-copilot-extension",
			version: "0.1.37",
		},
		uiManifest: {
			name: "@vaf-agentworks/ascet-copilot-ui",
			version: "0.1.37",
		},
		aggregateManifest: {
			name: "@vaf-agentworks/ascet-copilot",
			version: "0.1.37",
			dependencies: {
				"@vaf-agentworks/ascet-copilot-extension": "0.1.37",
				"@vaf-agentworks/ascet-copilot-ui": "0.1.37",
				"pi-subagents": "0.34.0",
				"@juicesharp/rpiv-todo": "1.20.0",
				"@juicesharp/rpiv-ask-user-question": "1.20.0",
				"@narumitw/pi-goal": "0.20.0",
				"pi-web-access": "0.13.0",
			},
			bundledDependencies: [
				"@vaf-agentworks/ascet-copilot-extension",
				"@vaf-agentworks/ascet-copilot-ui",
				...ASCET_COPILOT_EXTERNAL_DEPENDENCIES,
			],
		},
		releaseInfoSource: `export const ASCET_COPILOT_RELEASE = {\n\tversion: "0.1.37",\n};\n`,
		targetVersion: "0.1.38",
		externalVersions: {
			"pi-subagents": "0.35.0",
			"@juicesharp/rpiv-todo": "1.21.0",
			"@juicesharp/rpiv-ask-user-question": "1.21.0",
			"@narumitw/pi-goal": "0.21.0",
			"pi-web-access": "0.14.0",
		},
	};
}

test("assertStableVersion accepts exact stable versions only", () => {
	assert.doesNotThrow(() => assertStableVersion("0.1.38"));
	assert.throws(() => assertStableVersion("^0.1.38"), /exact stable semantic version/);
	assert.throws(() => assertStableVersion("0.1.38-beta.1"), /exact stable semantic version/);
});

test("prepareReleaseState synchronizes first-party versions and external bundle dependencies", () => {
	const result = prepareReleaseState(createFixture());

	assert.equal(result.extensionManifest.version, "0.1.38");
	assert.equal(result.uiManifest.version, "0.1.38");
	assert.equal(result.aggregateManifest.version, "0.1.38");
	assert.equal(result.aggregateManifest.dependencies["@vaf-agentworks/ascet-copilot-extension"], "0.1.38");
	assert.equal(result.aggregateManifest.dependencies["@vaf-agentworks/ascet-copilot-ui"], "0.1.38");
	assert.equal(result.aggregateManifest.dependencies["pi-subagents"], "0.35.0");
	assert.equal(result.aggregateManifest.dependencies["@juicesharp/rpiv-todo"], "1.21.0");
	assert.match(result.releaseInfoSource, /version: "0\.1\.38"/);
	assert.ok(result.changes.length >= 8);
});

test("prepareReleaseState rejects an external dependency missing from bundledDependencies", () => {
	const fixture = createFixture();
	fixture.aggregateManifest.bundledDependencies = fixture.aggregateManifest.bundledDependencies.filter(
		(dependency) => dependency !== "pi-web-access",
	);

	assert.throws(() => prepareReleaseState(fixture), /pi-web-access must remain in bundledDependencies/);
});

test("updateReleaseInfoVersion only changes ASCET_COPILOT_RELEASE metadata", () => {
	const source = `const other = { version: "9.9.9" };\nexport const ASCET_COPILOT_RELEASE = {\n\tversion: "0.1.37",\n};\n`;
	const updated = updateReleaseInfoVersion(source, "0.1.38");

	assert.match(updated, /other = \{ version: "9\.9\.9" \}/);
	assert.match(updated, /ASCET_COPILOT_RELEASE = \{\n\tversion: "0\.1\.38"/);
});

test("selectHighestStableVersion selects the newest compatible npm view result", () => {
	assert.equal(selectHighestStableVersion(["0.34.0", "0.34.2", "0.34.1"], "pi-subagents"), "0.34.2");
	assert.equal(selectHighestStableVersion("1.20.1", "rpiv-todo"), "1.20.1");
	assert.throws(
		() => selectHighestStableVersion(["2.0.0-beta.1"], "rpiv-todo"),
		/no stable version/,
	);
});

test("aggregate package excludes generated npm tarballs", () => {
	const repoRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
	const npmIgnore = readFileSync(resolve(repoRoot, "release/ascet-copilot/.npmignore"), "utf8");
	assert.match(npmIgnore, /^\*\.tgz$/m);
});
