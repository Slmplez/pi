import assert from "node:assert/strict";
import { test } from "node:test";
import {
	ASCET_COPILOT_RELEASE,
	checkAscetCopilotUpdate,
	createReleaseRows,
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
	assert.deepEqual(writes, [{ checkedAt: now.getTime(), latestVersion: "0.1.2" }]);
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

test("checkAscetCopilotUpdate uses fresh cache without network", async () => {
	let fetchCalled = false;
	const state = await checkAscetCopilotUpdate({
		currentVersion: "0.1.1",
		now,
		fetchLatestVersion: async () => {
			fetchCalled = true;
			return "0.1.2";
		},
		readCache: async () => ({ checkedAt: now.getTime() - 1_000, latestVersion: "0.1.2" }),
		writeCache: async () => {},
	});

	assert.equal(fetchCalled, false);
	assert.deepEqual(state, { status: "available", latestVersion: "0.1.2" });
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

	assert.deepEqual(state, { status: "unavailable" });
});

test("createReleaseRows renders concise release and update text", () => {
	assert.deepEqual(
		createReleaseRows({ status: "checking" }, ASCET_COPILOT_RELEASE),
		[
			"Release",
			"0.1.35 - Dependency bundle refresh",
			"ASCET Copilot update recovery",
			"Extension and UI install sync",
			"Checking updates...",
		],
	);
	assert.deepEqual(
		createReleaseRows({ status: "available", latestVersion: "0.1.36" }, ASCET_COPILOT_RELEASE),
		["Update available", "0.1.35 -> 0.1.36", "pi update npm:@zeerke/ascet-copilot"],
	);
	assert.deepEqual(
		createReleaseRows({ status: "current", latestVersion: "0.1.35" }, ASCET_COPILOT_RELEASE),
		[
			"Release",
			"0.1.35 - Up to date",
			"Dependency bundle refresh",
			"ASCET Copilot update recovery",
			"Extension and UI install sync",
		],
	);
});
