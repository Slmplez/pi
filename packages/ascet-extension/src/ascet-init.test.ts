import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, test } from "node:test";
import { buildAscetInitPrompt, executeAscetInitCommand } from "./ascet-init.ts";
import type { AscetSearchIndexWarmupOptions, AscetSearchIndexWarmupResult } from "./search-index.ts";

function createReadyEnv(): { cwd: string; env: Record<string, string | undefined>; cleanup: () => void } {
	const root = mkdtempSync(join(tmpdir(), "pi-ascet-init-command-"));
	const contractsRoot = join(root, "contracts");
	mkdirSync(contractsRoot, { recursive: true });
	writeFileSync(join(root, "AscetCli.exe"), "", "utf8");
	writeFileSync(join(contractsRoot, "cli-catalog.json"), "{}", "utf8");
	return {
		cwd: root,
		env: {
			ASCET_CLI_PATH: join(root, "AscetCli.exe"),
			ASCET_CONTRACTS_PATH: contractsRoot,
		},
		cleanup: () => rmSync(root, { recursive: true, force: true }),
	};
}

function warmupResult(options: AscetSearchIndexWarmupOptions): AscetSearchIndexWarmupResult {
	return {
		ok: true,
		commandId: "warm_search_index",
		databaseName: "DemoDb",
		databasePath: "C:\\ASCET\\DemoDb",
		entryCount: options.partition === "text_code" ? 3 : 2,
		elapsedMs: 7,
		scanComplete: true,
		fromCache: false,
		exitCode: 0,
		timedOut: false,
		stdout: "",
		stderr: "",
	};
}

describe("buildAscetInitPrompt", () => {
	test("uses artifacts and no longer asks the model to rebuild the index", () => {
		const prompt = buildAscetInitPrompt({
			scope: { ok: true, kind: "database" },
			artifacts: {
				manifest: ".ascet/index/manifest.json",
				summary: ".ascet/ascet-workspace-summary.json",
			},
		});

		assert.match(prompt, /\.ascet\/index\/manifest\.json/);
		assert.match(prompt, /Deterministic ASCET initialization has already run/);
		assert.match(prompt, /Do not rebuild the index/);
		assert.doesNotMatch(prompt, /Run bounded ASCET model exploration/);
	});
});

describe("executeAscetInitCommand", () => {
	test("warms the requested index, writes artifacts, and sends a synthesis prompt", async () => {
		const fixture = createReadyEnv();
		const messages: string[] = [];
		const notifications: string[] = [];
		const statuses: Array<{ key: string; text: string | undefined }> = [];
		const calls: AscetSearchIndexWarmupOptions[] = [];
		try {
			await executeAscetInitCommand("database --index core", {
				cwd: fixture.cwd,
				env: fixture.env,
				isIdle: () => true,
				sendUserMessage(content) {
					messages.push(content);
				},
				warmSearchIndex: async (options) => {
					calls.push(options);
					return warmupResult(options);
				},
				ui: {
					notify(message) {
						notifications.push(message);
					},
					setStatus(key, text) {
						statuses.push({ key, text });
					},
				},
			});

			assert.equal(calls.length, 5);
			assert.equal(messages.length, 1);
			assert.match(messages[0] ?? "", /\.ascet\/ascet-workspace-summary\.json/);
			assert.match(notifications.join("\n"), /ASCET init started/);
			assert.match(notifications.join("\n"), /ASCET init index ready/);
			assert.equal(
				statuses.every((status) => status.key === "ascet-init"),
				true,
			);
			assert.match(statuses.map((status) => status.text).join("\n"), /\[1\/5\] components/);
			assert.match(statuses.at(-1)?.text ?? "", /ASCET init ok 0:00 ready/);
		} finally {
			fixture.cleanup();
		}
	});

	test("index none skips warmup and can skip artifact writes", async () => {
		const fixture = createReadyEnv();
		let calls = 0;
		let message = "";
		try {
			await executeAscetInitCommand("--index none --no-write-summary", {
				cwd: fixture.cwd,
				env: fixture.env,
				isIdle: () => true,
				sendUserMessage(content) {
					message = content;
				},
				warmSearchIndex: async (options) => {
					calls += 1;
					return warmupResult(options);
				},
				ui: { notify() {} },
			});

			assert.equal(calls, 0);
			assert.doesNotMatch(message, /ASCET init artifacts:/);
		} finally {
			fixture.cleanup();
		}
	});
});
