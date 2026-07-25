import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, test } from "node:test";
import { ASCET_INIT_ALL_PARTITIONS, ASCET_INIT_CORE_PARTITIONS, runAscetInitIndex } from "./ascet-init-index.ts";
import type { AscetSearchIndexWarmupOptions, AscetSearchIndexWarmupResult } from "./search-index.ts";

function createReadyEnv(): { cwd: string; env: Record<string, string | undefined>; cleanup: () => void } {
	const root = mkdtempSync(join(tmpdir(), "pi-ascet-init-index-"));
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

describe("runAscetInitIndex", () => {
	test("warms all partitions serially by default", async () => {
		const fixture = createReadyEnv();
		const calls: AscetSearchIndexWarmupOptions[] = [];
		try {
			const result = await runAscetInitIndex({
				cwd: fixture.cwd,
				env: fixture.env,
				indexMode: "all",
				warmSearchIndex: async (options) => {
					calls.push(options);
					return warmupResult(options);
				},
			});

			assert.equal(result.index.status, "ready");
			assert.deepEqual(
				calls.map((call) => call.partition),
				ASCET_INIT_ALL_PARTITIONS,
			);
			assert.equal(
				calls.every((call) => call.toolName === "ascet_init"),
				true,
			);
			assert.equal(calls.find((call) => call.partition === "text_code")?.includeTextCode, true);
			assert.equal(result.database?.path, "C:/ASCET/DemoDb");
		} finally {
			fixture.cleanup();
		}
	});

	test("supports core and none modes", async () => {
		const fixture = createReadyEnv();
		const calls: AscetSearchIndexWarmupOptions[] = [];
		try {
			const core = await runAscetInitIndex({
				cwd: fixture.cwd,
				env: fixture.env,
				indexMode: "core",
				warmSearchIndex: async (options) => {
					calls.push(options);
					return warmupResult(options);
				},
			});
			const none = await runAscetInitIndex({
				cwd: fixture.cwd,
				env: fixture.env,
				indexMode: "none",
				warmSearchIndex: async (options) => {
					calls.push(options);
					return warmupResult(options);
				},
			});

			assert.deepEqual(
				calls.map((call) => call.partition),
				ASCET_INIT_CORE_PARTITIONS,
			);
			assert.equal(core.index.status, "ready");
			assert.equal(none.index.status, "skipped");
		} finally {
			fixture.cleanup();
		}
	});

	test("returns partial failure with partition name and recovery steps", async () => {
		const fixture = createReadyEnv();
		try {
			const result = await runAscetInitIndex({
				cwd: fixture.cwd,
				env: fixture.env,
				indexMode: "core",
				warmSearchIndex: async (options) => {
					if (options.partition === "element_decls") {
						return {
							...warmupResult(options),
							ok: false,
							error: { code: "boom", message: "failed" },
						};
					}
					return warmupResult(options);
				},
			});

			assert.equal(result.index.status, "partial");
			assert.equal(result.error?.code, "ascet_init_index_failed");
			assert.match(result.error?.message ?? "", /element_decls/);
			assert.ok(result.error?.recover.includes("Run ascet_status."));
		} finally {
			fixture.cleanup();
		}
	});
});
