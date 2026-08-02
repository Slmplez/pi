import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, test } from "node:test";
import type { AscetCliExecutionResult, AscetCliRequest } from "./cli.ts";
import { runAscetSearchElements } from "./search-elements.ts";
import { resetAscetSearchIndexForTest } from "./search-index.ts";

function createReadyEnv(): { cwd: string; env: Record<string, string | undefined>; cleanup: () => void } {
	const root = mkdtempSync(join(tmpdir(), "pi-ascet-search-elements-"));
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
			PI_ASCET_SEARCH_INDEX_STORAGE: "memory",
		},
		cleanup: () => rmSync(root, { recursive: true, force: true }),
	};
}

function makeCliResult(request: AscetCliRequest): AscetCliExecutionResult {
	const stdout = JSON.stringify({
		ok: true,
		result: {
			query: "FallbackElement",
			matches: [],
			counts: { matches: 0 },
		},
		error: null,
		meta: { mode: "exec", operation: "search_elements" },
	});
	return {
		exitCode: 0,
		stdout,
		stderr: "",
		timedOut: false,
		request,
	};
}

afterEach(() => {
	resetAscetSearchIndexForTest();
});

describe("runAscetSearchElements index fast path", () => {
	test("returns ready-index hits without invoking the CLI", async () => {
		resetAscetSearchIndexForTest({
			databaseName: "DemoDb",
			databasePath: "C:\\ASCET\\DemoDb",
			generatedAtMs: Date.now(),
			elapsedMs: 5,
			scanComplete: true,
			entries: [
				{
					group: "primitive",
					componentPath: "AEB\\Controller",
					componentKind: "module",
					componentLanguageKind: "ESDL",
					elementName: "P_AEB_IB_MaxVelocityDrop_Curve",
					elementKind: "cont",
					displayType: "cont",
					displayScope: "exported",
					referencedComponentPath: "",
					path: "AEB\\Controller::P_AEB_IB_MaxVelocityDrop_Curve",
				},
			],
		});

		const fixture = createReadyEnv();
		try {
			const result = await runAscetSearchElements(
				{ query: "P_AEB_IB_MaxVelocityDrop_Curve", match: "exact" },
				{
					cwd: fixture.cwd,
					executeCli: async () => {
						throw new Error("CLI should not be invoked for an indexed hit.");
					},
				},
			);

			const envelope = result.data as { result?: { source?: unknown; matches?: unknown[] } };
			assert.equal(result.ok, true);
			assert.equal(envelope.result?.source, "quick_search_index");
			assert.equal(envelope.result?.matches?.length, 1);
		} finally {
			fixture.cleanup();
		}
	});

	test("serves kind and scopePath filters from the ready index", async () => {
		resetAscetSearchIndexForTest({
			databaseName: "DemoDb",
			databasePath: "C:\\ASCET\\DemoDb",
			generatedAtMs: Date.now(),
			elapsedMs: 5,
			scanComplete: true,
			entries: [
				{
					group: "primitive",
					componentPath: "AEB\\Controller",
					componentKind: "module",
					componentLanguageKind: "ESDL",
					elementName: "FallbackElement",
					elementKind: "CalibrationParameter",
					displayType: "scalar",
					displayScope: "exported",
					referencedComponentPath: "",
					path: "AEB\\Controller::FallbackElement",
				},
				{
					group: "primitive",
					componentPath: "Other\\Controller",
					componentKind: "module",
					componentLanguageKind: "ESDL",
					elementName: "FallbackElement",
					elementKind: "CalibrationParameter",
					displayType: "scalar",
					displayScope: "exported",
					referencedComponentPath: "",
					path: "Other\\Controller::FallbackElement",
				},
			],
		});

		const fixture = createReadyEnv();
		try {
			const result = await runAscetSearchElements(
				{ query: "FallbackElement", scopePath: "AEB", kind: "calibration", match: "exact" },
				{
					cwd: fixture.cwd,
					executeCli: async () => {
						throw new Error("CLI should not be invoked for indexed kind and scopePath filters.");
					},
				},
			);

			const envelope = result.data as {
				result?: { source?: unknown; matches?: Array<{ componentPath?: string }> };
			};
			assert.equal(result.ok, true);
			assert.equal(envelope.result?.source, "quick_search_index");
			assert.deepEqual(
				envelope.result?.matches?.map((match) => match.componentPath),
				["AEB\\Controller"],
			);
		} finally {
			fixture.cleanup();
		}
	});

	test("falls back to search_elements CLI when warm_search_index fails", async () => {
		let capturedRequest: AscetCliRequest | undefined;
		const fixture = createReadyEnv();
		try {
			const result = await runAscetSearchElements(
				{ query: "FallbackElement", kind: "calibration", match: "exact" },
				{
					cwd: fixture.cwd,
					env: fixture.env,
					executeCli: async (request) => {
						if (request.args[1] === "warm_search_index") {
							return {
								exitCode: 1,
								stdout: JSON.stringify({
									ok: false,
									result: null,
									error: { code: "database_not_open", message: "No database is open." },
									meta: { mode: "exec", operation: "warm_search_index" },
								}),
								stderr: "",
								timedOut: false,
								request,
							};
						}
						capturedRequest = request;
						return makeCliResult(request);
					},
				},
			);

			assert.equal(result.ok, true);
			assert.deepEqual(capturedRequest?.args, [
				"exec",
				"search_elements",
				"FallbackElement",
				"--kind",
				"calibration",
				"--match",
				"exact",
				"--json",
			]);
		} finally {
			fixture.cleanup();
		}
	});

	test("returns partial-index hits when warm_search_index finds a match inside its budget", async () => {
		const fixture = createReadyEnv();
		try {
			const result = await runAscetSearchElements(
				{ query: "FallbackElement", match: "exact" },
				{
					cwd: fixture.cwd,
					env: fixture.env,
					executeCli: async (request) => {
						if (request.args[1] === "warm_search_index") {
							return {
								exitCode: 0,
								stdout: JSON.stringify({
									ok: true,
									result: {
										operation: "warm_search_index",
										database: { name: "DemoDb", path: "C:\\ASCET\\DemoDb" },
										generatedAtUtc: "2026-07-25T00:00:00.000Z",
										elapsedMs: 15_000,
										scanComplete: false,
										entries: [
											{
												group: "primitive",
												componentPath: "AEB\\Controller",
												componentKind: "module",
												componentLanguageKind: "ESDL",
												elementName: "FallbackElement",
												elementKind: "cont",
												displayType: "cont",
												displayScope: "exported",
												referencedComponentPath: "",
												path: "AEB\\Controller::FallbackElement",
											},
										],
										counts: { entries: 1, components: 1 },
									},
									error: null,
									meta: { mode: "exec", operation: "warm_search_index" },
								}),
								stderr: "",
								timedOut: false,
								request,
							};
						}
						throw new Error("CLI fallback should not run when partial index has a hit.");
					},
				},
			);

			const envelope = result.data as {
				result?: { source?: unknown; searchComplete?: unknown; matches?: unknown[] };
			};
			assert.equal(result.ok, true);
			assert.equal(envelope.result?.source, "quick_search_index");
			assert.equal(envelope.result?.searchComplete, false);
			assert.equal(envelope.result?.matches?.length, 1);
		} finally {
			fixture.cleanup();
		}
	});

	test("falls back to search_elements CLI when a partial index misses", async () => {
		let capturedRequest: AscetCliRequest | undefined;
		const fixture = createReadyEnv();
		try {
			const result = await runAscetSearchElements(
				{ query: "MissingElement", match: "exact" },
				{
					cwd: fixture.cwd,
					env: fixture.env,
					executeCli: async (request) => {
						if (request.args[1] === "warm_search_index") {
							return {
								exitCode: 0,
								stdout: JSON.stringify({
									ok: true,
									result: {
										operation: "warm_search_index",
										database: { name: "DemoDb", path: "C:\\ASCET\\DemoDb" },
										generatedAtUtc: "2026-07-25T00:00:00.000Z",
										elapsedMs: 15_000,
										scanComplete: false,
										entries: [
											{
												group: "primitive",
												componentPath: "AEB\\Controller",
												componentKind: "module",
												componentLanguageKind: "ESDL",
												elementName: "FallbackElement",
												elementKind: "cont",
												displayType: "cont",
												displayScope: "exported",
												referencedComponentPath: "",
												path: "AEB\\Controller::FallbackElement",
											},
										],
										counts: { entries: 1, components: 1 },
									},
									error: null,
									meta: { mode: "exec", operation: "warm_search_index" },
								}),
								stderr: "",
								timedOut: false,
								request,
							};
						}
						capturedRequest = request;
						return makeCliResult(request);
					},
				},
			);

			assert.equal(result.ok, true);
			assert.equal(capturedRequest?.args[1], "search_elements");
		} finally {
			fixture.cleanup();
		}
	});
});
