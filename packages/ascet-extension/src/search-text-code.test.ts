import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, test } from "node:test";
import type { AscetCliExecutionResult, AscetCliRequest } from "./cli.ts";
import { type AscetTextCodeSearchIndexEntry, resetAscetSearchIndexForTest } from "./search-index.ts";
import { runAscetSearchTextCode } from "./search-text-code.ts";

const textCodeEntries: AscetTextCodeSearchIndexEntry[] = [
	{
		componentPath: "AEB\\Controller",
		componentKind: "module",
		componentLanguageKind: "ESDL",
		section: "body",
		methodName: "calc",
		methodKind: "Process",
		text: "P_AEB_IB_MaxVelocityDrop_Curve = speed - drop;",
		path: "AEB\\Controller::calc#body",
	},
];

describe("ASCET text code search", () => {
	test("serves text searches from the ready quick-search index", async () => {
		resetAscetSearchIndexForTest({
			databaseName: "DemoDb",
			databasePath: "C:\\ASCET\\DemoDb",
			entries: [],
			textCodeEntries,
			generatedAtMs: Date.now(),
			elapsedMs: 7,
			scanComplete: true,
		});
		let calls = 0;
		const fixture = createReadyEnv();

		try {
			const result = await runAscetSearchTextCode(
				{ query: "speed - drop", match: "contains", limit: 20 },
				{
					cwd: fixture.cwd,
					executeCli: async (request) => {
						calls += 1;
						return okExecution(request, {});
					},
				},
			);

			assert.equal(result.ok, true);
			assert.equal(calls, 0);
			const envelope = result.data as {
				result?: { source?: unknown; matches?: Array<{ componentPath?: string }> };
			};
			assert.equal(envelope.result?.source, "quick_search_index");
			assert.equal(envelope.result?.matches?.[0]?.componentPath, "AEB\\Controller");
		} finally {
			fixture.cleanup();
		}
	});

	test("falls back to scoped read_text_code when the index is unavailable", async () => {
		resetAscetSearchIndexForTest();
		const requests: AscetCliRequest[] = [];

		const result = await runAscetSearchTextCode(
			{ query: "speed - drop", componentPath: "AEB/Controller", match: "contains", limit: 20 },
			{
				cwd: process.cwd(),
				env: { PI_ASCET_SEARCH_INDEX: "0" },
				executeCli: async (request) => {
					requests.push(request);
					return okExecution(request, {
						componentPath: "AEB\\Controller",
						componentKind: "Module",
						languageKind: "ESDL",
						section: "body",
						text: "x = 1;\nP_AEB_IB_MaxVelocityDrop_Curve = speed - drop;\n",
					});
				},
			},
		);

		assert.equal(result.ok, true);
		assert.deepEqual(requests[0]?.args, ["exec", "read_text_code", "AEB\\Controller", "--json"]);
		const envelope = result.data as { result?: { source?: unknown; matches?: Array<{ lineNumber?: number }> } };
		assert.equal(envelope.result?.source, "read_text_code_fallback");
		assert.equal(envelope.result?.matches?.[0]?.lineNumber, 2);
	});

	test("uses scoped read_text_code directly when componentPath is provided and no text index is ready", async () => {
		resetAscetSearchIndexForTest();
		const requests: AscetCliRequest[] = [];
		const fixture = createReadyEnv();

		try {
			const result = await runAscetSearchTextCode(
				{ query: "speed - drop", componentPath: "AEB\\Controller", match: "contains", limit: 20 },
				{
					cwd: fixture.cwd,
					executeCli: async (request) => {
						requests.push(request);
						return okExecution(request, {
							componentPath: "AEB\\Controller",
							componentKind: "Module",
							languageKind: "ESDL",
							section: "body",
							text: "P_AEB_IB_MaxVelocityDrop_Curve = speed - drop;",
						});
					},
				},
			);

			assert.equal(result.ok, true);
			assert.deepEqual(
				requests.map((request) => request.args),
				[["exec", "read_text_code", "AEB\\Controller", "--json"]],
			);
		} finally {
			fixture.cleanup();
		}
	});

	test("requests text-code warmup for unscoped text searches", async () => {
		resetAscetSearchIndexForTest();
		const requests: AscetCliRequest[] = [];
		const fixture = createReadyEnv();

		try {
			const result = await runAscetSearchTextCode(
				{ query: "speed - drop", match: "contains", limit: 20 },
				{
					cwd: fixture.cwd,
					executeCli: async (request) => {
						requests.push(request);
						return okExecution(request, {
							operation: "warm_search_index",
							database: { name: "DemoDb", path: "C:\\ASCET\\DemoDb" },
							generatedAtUtc: "2026-07-25T00:00:00.000Z",
							elapsedMs: 7,
							scanComplete: true,
							textCodeIncluded: true,
							textCodeScanComplete: true,
							components: [],
							entries: [],
							textCodeEntries,
							counts: {
								entries: 0,
								components: 0,
								primitive: 0,
								complex: 0,
								referenced: 0,
								methods: 0,
								textCodeEntries: 1,
								textCodeChars: textCodeEntries[0]?.text.length ?? 0,
							},
						});
					},
				},
			);

			assert.equal(result.ok, true);
			assert.deepEqual(requests[0]?.args.slice(0, 6), [
				"exec",
				"warm_search_index",
				"--partition",
				"text_code",
				"--json",
				"--include-text-code",
			]);
			const envelope = result.data as { result?: { source?: unknown; matches?: unknown[] } };
			assert.equal(envelope.result?.source, "quick_search_index");
			assert.equal(envelope.result?.matches?.length, 1);
		} finally {
			fixture.cleanup();
		}
	});
});

function createReadyEnv(): { cwd: string; cleanup: () => void } {
	const root = mkdtempSync(join(tmpdir(), "pi-ascet-search-text-code-"));
	const contractsRoot = join(root, "contracts");
	mkdirSync(contractsRoot, { recursive: true });
	writeFileSync(join(root, "AscetCli.exe"), "", "utf8");
	writeFileSync(join(contractsRoot, "cli-catalog.json"), "{}", "utf8");
	return {
		cwd: root,
		cleanup: () => rmSync(root, { recursive: true, force: true }),
	};
}

function okExecution(request: AscetCliRequest, payload: unknown): AscetCliExecutionResult {
	return {
		exitCode: 0,
		stdout: JSON.stringify({ ok: true, result: payload, error: null, meta: { mode: "exec" } }),
		stderr: "",
		timedOut: false,
		request,
	};
}
