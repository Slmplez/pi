import assert from "node:assert/strict";
import { test } from "node:test";
import {
	ASCET_COPILOT_NPM_REGISTRY,
	ASCET_COPILOT_RELEASE,
	checkAscetCopilotUpdate,
	createReleaseRows,
	fetchAscetCopilotLatestVersion,
	isVersionGreater,
	type CachedUpdateInfo,
} from "./releaseInfo.ts";

const now = new Date("2026-07-12T10:00:00Z");

test("isVersionGreater compares semver-like versions", () => {
	assert.equal(isVersionGreater("0.1.2", "0.1.1"), true);
	assert.equal(isVersionGreater("0.2.0", "0.1.9"), true);
	assert.equal(isVersionGreater("1.0.0", "0.9.9"), true);
	assert.equal(isVersionGreater("0.1.1", "0.1.1"), false);
	assert.equal(isVersionGreater("0.1.0", "0.1.1"), false);
	assert.equal(isVersionGreater("0.1.1-beta.1", "0.1.1"), false);
});

test("fetchAscetCopilotLatestVersion queries the configured Nexus npm registry", async () => {
	let requestedUrl: string | undefined;
	const latestVersion = await fetchAscetCopilotLatestVersion(ASCET_COPILOT_NPM_REGISTRY, async (url) => {
		requestedUrl = url.toString();
		return new Response(JSON.stringify({ "dist-tags": { latest: "0.1.38" } }), {
			status: 200,
			headers: { "content-type": "application/json" },
		});
	});

	assert.equal(latestVersion, "0.1.38");
	assert.equal(
		requestedUrl,
		"https://szh6-v-000cy.szh.apac.bosch.com/nexus/repository/ascet-copilot-npm/@vaf-agentworks%2Fascet-copilot",
	);
});

test("checkAscetCopilotUpdate returns available when registry latest is newer", async () => {
	const writes: CachedUpdateInfo[] = [];
	const state = await checkAscetCopilotUpdate({
		currentVersion: "0.1.1",
		now,
		fetchLatestVersion: async () => "0.1.2",
		readCache: async () => undefined,
		writeCache: async (cache) => {
			writes.push(cache);
		},
	});

	assert.deepEqual(state, { status: "available", latestVersion: "0.1.2" });
	assert.deepEqual(writes, [
		{
			checkedAt: now.getTime(),
			latestVersion: "0.1.2",
			registryUrl: ASCET_COPILOT_NPM_REGISTRY,
		},
	]);
});

test("checkAscetCopilotUpdate returns current when registry latest matches current", async () => {
	const state = await checkAscetCopilotUpdate({
		currentVersion: "0.1.1",
		now,
		fetchLatestVersion: async () => "0.1.1",
		readCache: async () => undefined,
		writeCache: async () => {},
	});

	assert.deepEqual(state, { status: "current", latestVersion: "0.1.1" });
});

test("checkAscetCopilotUpdate uses fresh cache from the same registry without network", async () => {
	let fetchCalled = false;
	const state = await checkAscetCopilotUpdate({
		currentVersion: "0.1.1",
		now,
		fetchLatestVersion: async () => {
			fetchCalled = true;
			return "0.1.2";
		},
		readCache: async () => ({
			checkedAt: now.getTime() - 1_000,
			latestVersion: "0.1.2",
			registryUrl: ASCET_COPILOT_NPM_REGISTRY,
		}),
		writeCache: async () => {},
	});

	assert.equal(fetchCalled, false);
	assert.deepEqual(state, { status: "available", latestVersion: "0.1.2" });
});

test("checkAscetCopilotUpdate ignores cache entries from another registry", async () => {
	let fetchCalled = false;
	const state = await checkAscetCopilotUpdate({
		currentVersion: "0.1.1",
		now,
		fetchLatestVersion: async () => {
			fetchCalled = true;
			return "0.1.3";
		},
		readCache: async () => ({
			checkedAt: now.getTime() - 1_000,
			latestVersion: "0.1.2",
			registryUrl: "https://registry.npmjs.org/",
		}),
		writeCache: async () => {},
	});

	assert.equal(fetchCalled, true);
	assert.deepEqual(state, { status: "available", latestVersion: "0.1.3" });
});

test("checkAscetCopilotUpdate returns unavailable when registry check fails", async () => {
	const state = await checkAscetCopilotUpdate({
		currentVersion: "0.1.1",
		now,
		fetchLatestVersion: async () => {
			throw new Error("offline");
		},
		readCache: async () => undefined,
		writeCache: async () => {},
	});

	assert.deepEqual(state, { status: "unavailable", reason: "network" });
});

test("classifies TLS update failures and renders the reason", async () => {
	const tlsError = Object.assign(new TypeError("fetch failed"), {
		cause: {
			code: "UNABLE_TO_VERIFY_LEAF_SIGNATURE",
			message: "unable to verify the first certificate",
		},
	});
	const state = await checkAscetCopilotUpdate({
		currentVersion: ASCET_COPILOT_RELEASE.version,
		now,
		fetchLatestVersion: async () => {
			throw tlsError;
		},
		readCache: async () => undefined,
		writeCache: async () => {},
	});

	assert.deepEqual(state, { status: "unavailable", reason: "tls" });
	assert.deepEqual(createReleaseRows(state), [
		"Release",
		`${ASCET_COPILOT_RELEASE.version} - update check unavailable (TLS)`,
		...ASCET_COPILOT_RELEASE.highlights,
	]);
});

test("createReleaseRows renders concise release and update text", () => {
	const currentVersion = ASCET_COPILOT_RELEASE.version;
	const versionParts = currentVersion.split(".").map((part) => Number.parseInt(part, 10));
	const nextVersion = `${versionParts[0]}.${versionParts[1]}.${versionParts[2] + 1}`;

	assert.deepEqual(
		createReleaseRows({ status: "checking" }, ASCET_COPILOT_RELEASE),
		[
			"Release",
			`${currentVersion} - Single-session parameter dependency execution`,
			"Canonical ASCET get, read, diff, and edit tools",
			"ASCET engineering Skill and guarded writes",
			"Checking updates...",
		],
	);
	assert.deepEqual(
		createReleaseRows({ status: "available", latestVersion: nextVersion }, ASCET_COPILOT_RELEASE),
		[
			"Update available",
			`${currentVersion} -> ${nextVersion}`,
			"pi update npm:@vaf-agentworks/ascet-copilot",
		],
	);
	assert.deepEqual(
		createReleaseRows({ status: "current", latestVersion: currentVersion }, ASCET_COPILOT_RELEASE),
		[
			"Release",
			`${currentVersion} - Up to date`,
			"Single-session parameter dependency execution",
			"Canonical ASCET get, read, diff, and edit tools",
			"ASCET engineering Skill and guarded writes",
		],
	);
});
