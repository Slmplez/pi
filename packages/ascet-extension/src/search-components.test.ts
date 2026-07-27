import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, test } from "node:test";
import type { AscetCliExecutionResult, AscetCliRequest } from "./cli.ts";
import { runAscetSearchComponents } from "./search-components.ts";
import { resetAscetSearchIndexForTest } from "./search-index.ts";

function createReadyEnv(): { cwd: string; env: Record<string, string | undefined>; cleanup: () => void } {
	const root = mkdtempSync(join(tmpdir(), "pi-ascet-search-components-"));
	const contractsRoot = join(root, "contracts");
	mkdirSync(contractsRoot, { recursive: true });
	writeFileSync(join(root, "AscetCli.exe"), "", "utf8");
	writeFileSync(join(contractsRoot, "cli-catalog.json"), "{}", "utf8");
	return {
		cwd: root,
		env: {
			ASCET_CLI_PATH: join(root, "AscetCli.exe"),
			ASCET_CONTRACTS_PATH: contractsRoot,
			PI_ASCET_RUNTIME_DIR: join(root, "runtime"),
			PI_ASCET_OPERATION_HEALTH_PATH: join(root, "operation-health.json"),
		},
		cleanup: () => rmSync(root, { recursive: true, force: true }),
	};
}

function makeSearchComponentsResult(request: AscetCliRequest): AscetCliExecutionResult {
	return {
		exitCode: 0,
		stdout: JSON.stringify({
			ok: true,
			result: {
				query: "Missing",
				matches: [],
				counts: { matches: 0 },
			},
			error: null,
			meta: { mode: "exec", operation: "search_components" },
		}),
		stderr: "",
		timedOut: false,
		request,
	};
}

afterEach(() => {
	resetAscetSearchIndexForTest();
});

describe("runAscetSearchComponents index fast path", () => {
	test("returns ready-index hits without invoking the CLI", async () => {
		const fixture = createReadyEnv();
		resetAscetSearchIndexForTest({
			databaseName: "DemoDb",
			databasePath: "C:\\ASCET\\DemoDb",
			generatedAtMs: Date.now(),
			elapsedMs: 5,
			scanComplete: true,
			components: [
				{
					path: "AEB\\Controller",
					name: "Controller",
					kind: "module",
					languageKind: "ESDL",
					displayName: "Controller",
					parentPath: "AEB",
					ownerKind: "folder",
					targetKind: "component",
					objectKind: "module",
				},
			],
			entries: [],
		});

		const result = await runAscetSearchComponents(
			{ query: "Controller", match: "exact", limit: 20 },
			{
				cwd: fixture.cwd,
				env: { ...fixture.env, PI_ASCET_SEARCH_INDEX_STORAGE: "memory" },
				executeCli: async () => {
					throw new Error("CLI should not be invoked for an indexed component hit.");
				},
			},
		);

		const envelope = result.data as { result?: { source?: unknown; matches?: Array<{ path?: string }> } };
		assert.equal(result.ok, true);
		assert.equal(envelope.result?.source, "quick_search_index");
		assert.deepEqual(
			envelope.result?.matches?.map((match) => match.path),
			["AEB\\Controller"],
		);
		fixture.cleanup();
	});

	test("does not start a live warmup when the SQLite P0 index is unavailable", async () => {
		const fixture = createReadyEnv();
		try {
			let executeCount = 0;
			const result = await runAscetSearchComponents(
				{ query: "Controller", match: "exact", limit: 20 },
				{
					cwd: fixture.cwd,
					env: fixture.env,
					executeCli: async () => {
						executeCount += 1;
						throw new Error("search_components must not access live ASCET while P0 is unavailable.");
					},
				},
			);

			assert.equal(result.ok, false);
			assert.equal(result.error?.code, "search_index_unavailable");
			assert.equal(executeCount, 0);
		} finally {
			fixture.cleanup();
		}
	});

	test("uses the live CLI only when the index is explicitly disabled", async () => {
		let capturedRequest: AscetCliRequest | undefined;
		const fixture = createReadyEnv();
		try {
			const result = await runAscetSearchComponents(
				{ query: "Missing", match: "exact", limit: 20 },
				{
					cwd: fixture.cwd,
					env: { ...fixture.env, PI_ASCET_SEARCH_INDEX: "0" },
					executeCli: async (request) => {
						capturedRequest = request;
						return makeSearchComponentsResult(request);
					},
				},
			);

			assert.equal(result.ok, true);
			assert.deepEqual(capturedRequest?.args, [
				"exec",
				"search_components",
				"Missing",
				"--match",
				"exact",
				"--limit",
				"20",
				"--json",
			]);
		} finally {
			fixture.cleanup();
		}
	});
});
