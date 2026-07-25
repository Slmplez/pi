import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, test } from "node:test";
import type { AscetCliExecutionResult, AscetCliRequest } from "./cli.ts";
import {
	type AscetComponentSearchIndexEntry,
	type AscetSearchIndexEntry,
	type AscetTextCodeSearchIndexEntry,
	ensureAscetSearchIndex,
	getAscetSearchIndexPartitionState,
	getAscetSearchIndexState,
	queryAscetComponentIndex,
	queryAscetSearchIndex,
	queryAscetTextCodeIndex,
	resetAscetSearchIndexForTest,
} from "./search-index.ts";

function createReadyEnv(): { cwd: string; env: Record<string, string | undefined>; cleanup: () => void } {
	const root = mkdtempSync(join(tmpdir(), "pi-ascet-search-index-"));
	const contractsRoot = join(root, "contracts");
	const runtimeRoot = join(root, "runtime");
	mkdirSync(contractsRoot, { recursive: true });
	writeFileSync(join(root, "AscetCli.exe"), "", "utf8");
	writeFileSync(join(contractsRoot, "cli-catalog.json"), "{}", "utf8");

	return {
		cwd: root,
		env: {
			ASCET_CLI_PATH: join(root, "AscetCli.exe"),
			ASCET_CONTRACTS_PATH: contractsRoot,
			PI_ASCET_RUNTIME_DIR: runtimeRoot,
			PI_ASCET_OPERATION_HEALTH_PATH: join(root, "operation-health.json"),
		},
		cleanup: () => rmSync(root, { recursive: true, force: true }),
	};
}

function warmupPayload() {
	const components: AscetComponentSearchIndexEntry[] = [
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
		{
			path: "Common\\Curve1D",
			name: "Curve1D",
			kind: "class",
			languageKind: "ESDL",
			displayName: "Curve1D",
			parentPath: "Common",
			ownerKind: "folder",
			targetKind: "component",
			objectKind: "class",
		},
	];
	const entries: AscetSearchIndexEntry[] = [
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
		{
			group: "complex",
			componentPath: "AEB\\Controller",
			componentKind: "module",
			componentLanguageKind: "ESDL",
			elementName: "VehicleSpeedCurve",
			elementKind: "component",
			displayType: "component",
			displayScope: "local",
			referencedComponentPath: "Common\\Curve1D",
			path: "AEB\\Controller::VehicleSpeedCurve",
		},
	];
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

	return {
		operation: "warm_search_index",
		database: { name: "DemoDb", path: "C:\\ASCET\\DemoDb" },
		generatedAtUtc: "2026-07-25T00:00:00.000Z",
		elapsedMs: 7,
		scanComplete: true,
		textCodeIncluded: true,
		textCodeScanComplete: true,
		components,
		entries,
		textCodeEntries,
		counts: {
			entries: 2,
			components: 1,
			primitive: 1,
			complex: 1,
			referenced: 1,
			methods: 0,
		},
	};
}

function makeExecution(request: AscetCliRequest, payload: unknown): AscetCliExecutionResult {
	const stdout = JSON.stringify({
		ok: true,
		result: payload,
		error: null,
		meta: { mode: "exec", operation: "warm_search_index" },
	});
	return {
		exitCode: 0,
		stdout,
		stderr: "",
		timedOut: false,
		request,
	};
}

async function waitForCallCount(getCount: () => number, expected: number): Promise<void> {
	const deadline = Date.now() + 250;
	while (Date.now() < deadline) {
		if (getCount() === expected) {
			return;
		}
		await new Promise((resolve) => setTimeout(resolve, 5));
	}
	assert.equal(getCount(), expected);
}

afterEach(() => {
	resetAscetSearchIndexForTest();
});

describe("ASCET search index warmup", () => {
	test("builds an in-memory index from warm_search_index output and serves exact queries", async () => {
		const fixture = createReadyEnv();
		let calls = 0;
		try {
			const warmup = await ensureAscetSearchIndex({
				cwd: fixture.cwd,
				env: fixture.env,
				timeoutMs: 1000,
				executeCli: async (request) => {
					calls += 1;
					assert.deepEqual(request.args, ["exec", "warm_search_index", "--json"]);
					return makeExecution(request, warmupPayload());
				},
			});

			assert.equal(warmup.ok, true);
			assert.equal(warmup.commandId, "warm_search_index");
			assert.equal(warmup.fromCache, false);
			assert.equal(warmup.entryCount, 5);
			assert.equal(getAscetSearchIndexState().status, "ready");

			const second = await ensureAscetSearchIndex({
				cwd: fixture.cwd,
				env: fixture.env,
				timeoutMs: 1000,
				executeCli: async (request) => {
					calls += 1;
					return makeExecution(request, warmupPayload());
				},
			});
			assert.equal(second.fromCache, true);
			assert.equal(calls, 1);

			const indexed = queryAscetSearchIndex(
				{ query: "P_AEB_IB_MaxVelocityDrop_Curve", componentPath: "aeb\\controller", match: "exact", limit: 20 },
				{ cwd: fixture.cwd },
			);
			assert.equal(indexed?.ok, true);
			const envelope = indexed?.data as { result?: { source?: unknown; matches?: unknown[] } };
			assert.equal(envelope.result?.source, "quick_search_index");
			assert.equal(envelope.result?.matches?.length, 1);
			assert.equal((envelope.result?.matches?.[0] as { componentPath?: unknown }).componentPath, "AEB\\Controller");

			const componentResult = queryAscetComponentIndex(
				{ query: "Controller", match: "exact", limit: 20 },
				{ cwd: fixture.cwd },
			);
			const componentEnvelope = componentResult?.data as { result?: { source?: unknown; matches?: unknown[] } };
			assert.equal(componentResult?.ok, true);
			assert.equal(componentEnvelope.result?.source, "quick_search_index");
			assert.equal(componentEnvelope.result?.matches?.length, 1);

			const textCodeResult = queryAscetTextCodeIndex(
				{ query: "speed - drop", match: "contains", limit: 20 },
				{ cwd: fixture.cwd },
			);
			const textCodeEnvelope = textCodeResult?.data as { result?: { source?: unknown; matches?: unknown[] } };
			assert.equal(textCodeResult?.ok, true);
			assert.equal(textCodeEnvelope.result?.source, "quick_search_index");
			assert.equal(textCodeEnvelope.result?.matches?.length, 1);
		} finally {
			fixture.cleanup();
		}
	});

	test("does not start warm_search_index when PI_ASCET_SEARCH_INDEX disables warmup", async () => {
		const fixture = createReadyEnv();
		let calls = 0;
		try {
			const result = await ensureAscetSearchIndex({
				cwd: fixture.cwd,
				env: {
					...fixture.env,
					PI_ASCET_SEARCH_INDEX: "0",
				},
				timeoutMs: 1000,
				executeCli: async (request) => {
					calls += 1;
					return makeExecution(request, warmupPayload());
				},
			});

			assert.equal(result.ok, false);
			assert.equal(result.error?.code, "search_index_disabled");
			assert.equal(calls, 0);
			const state = getAscetSearchIndexState();
			assert.equal(state.status, "failed");
			assert.equal(state.error.code, "search_index_disabled");
		} finally {
			fixture.cleanup();
		}
	});

	test("force rebuild bypasses the ready cache", async () => {
		resetAscetSearchIndexForTest({
			databaseName: "DemoDb",
			databasePath: "C:\\ASCET\\DemoDb",
			entries: warmupPayload().entries.slice(0, 1),
			generatedAtMs: Date.now(),
			elapsedMs: 5,
			scanComplete: true,
		});
		const fixture = createReadyEnv();
		let calls = 0;
		try {
			const result = await ensureAscetSearchIndex({
				cwd: fixture.cwd,
				env: {
					...fixture.env,
					PI_ASCET_SEARCH_INDEX_FORCE: "1",
				},
				timeoutMs: 1000,
				executeCli: async (request) => {
					calls += 1;
					return makeExecution(request, warmupPayload());
				},
			});

			assert.equal(result.ok, true);
			assert.equal(result.fromCache, false);
			assert.equal(result.entryCount, 5);
			assert.equal(calls, 1);
		} finally {
			fixture.cleanup();
		}
	});

	test("TTL zero treats a ready index as stale and rebuilds it", async () => {
		resetAscetSearchIndexForTest({
			databaseName: "DemoDb",
			databasePath: "C:\\ASCET\\DemoDb",
			entries: warmupPayload().entries.slice(0, 1),
			generatedAtMs: Date.now(),
			elapsedMs: 5,
			scanComplete: true,
		});
		const fixture = createReadyEnv();
		let calls = 0;
		try {
			const result = await ensureAscetSearchIndex({
				cwd: fixture.cwd,
				env: {
					...fixture.env,
					PI_ASCET_SEARCH_INDEX_TTL_MS: "0",
				},
				timeoutMs: 1000,
				executeCli: async (request) => {
					calls += 1;
					return makeExecution(request, warmupPayload());
				},
			});

			assert.equal(result.ok, true);
			assert.equal(result.fromCache, false);
			assert.equal(result.entryCount, 5);
			assert.equal(calls, 1);
		} finally {
			fixture.cleanup();
		}
	});

	test("passes text-code warmup intent and max text char budget", async () => {
		const fixture = createReadyEnv();
		let observedArgs: string[] | undefined;
		try {
			const result = await ensureAscetSearchIndex({
				cwd: fixture.cwd,
				env: {
					...fixture.env,
					PI_ASCET_SEARCH_INDEX_MAX_TEXT_CHARS: "12345",
				},
				timeoutMs: 1000,
				includeTextCode: true,
				executeCli: async (request) => {
					observedArgs = request.args;
					return makeExecution(request, warmupPayload());
				},
			});

			assert.equal(result.ok, true);
			assert.deepEqual(observedArgs, [
				"exec",
				"warm_search_index",
				"--json",
				"--include-text-code",
				"--max-text-chars",
				"12345",
			]);
		} finally {
			fixture.cleanup();
		}
	});

	test("passes component partition and force flags to warm_search_index", async () => {
		const fixture = createReadyEnv();
		let observedArgs: string[] | undefined;
		try {
			const result = await ensureAscetSearchIndex({
				cwd: fixture.cwd,
				env: fixture.env,
				timeoutMs: 1000,
				partition: "components",
				forceRefresh: true,
				executeCli: async (request) => {
					observedArgs = request.args;
					return makeExecution(request, warmupPayload());
				},
			});

			assert.equal(result.ok, true);
			assert.deepEqual(observedArgs, [
				"exec",
				"warm_search_index",
				"--partition",
				"components",
				"--force",
				"--json",
			]);
		} finally {
			fixture.cleanup();
		}
	});

	test("does not serve text-code queries from a declaration-only index", () => {
		resetAscetSearchIndexForTest({
			databaseName: "DemoDb",
			databasePath: "C:\\ASCET\\DemoDb",
			entries: warmupPayload().entries,
			generatedAtMs: Date.now(),
			elapsedMs: 7,
			scanComplete: true,
			textCodeIncluded: false,
			textCodeScanComplete: false,
		});

		const result = queryAscetTextCodeIndex(
			{ query: "speed - drop", match: "contains", limit: 20 },
			{ cwd: process.cwd() },
		);
		assert.equal(result, undefined);
	});

	test("serves contains and group-filtered queries from the ready index", async () => {
		resetAscetSearchIndexForTest({
			databaseName: "DemoDb",
			databasePath: "C:\\ASCET\\DemoDb",
			entries: warmupPayload().entries,
			generatedAtMs: Date.now(),
			elapsedMs: 7,
			scanComplete: true,
		});

		const indexed = queryAscetSearchIndex(
			{ query: "Curve", match: "contains", group: "complex", limit: 10 },
			{ cwd: process.cwd() },
		);
		assert.equal(indexed?.ok, true);
		const envelope = indexed?.data as { result?: { matches?: Array<{ elementName?: string }> } };
		assert.deepEqual(
			envelope.result?.matches?.map((match) => match.elementName),
			["VehicleSpeedCurve"],
		);
	});

	test("filters text-code matches by section partition", async () => {
		resetAscetSearchIndexForTest({
			databaseName: "DemoDb",
			databasePath: "C:\\ASCET\\DemoDb",
			entries: [],
			textCodeEntries: [
				{
					componentPath: "AEB\\Controller",
					componentKind: "module",
					componentLanguageKind: "ESDL",
					section: "body",
					methodName: "calc",
					methodKind: "Process",
					text: "shared_symbol = 1;",
					path: "AEB\\Controller::calc#body",
				},
				{
					componentPath: "AEB\\Controller",
					componentKind: "module",
					componentLanguageKind: "C",
					section: "header",
					methodName: "",
					methodKind: "",
					text: "#define shared_symbol 1",
					path: "AEB\\Controller#header",
				},
			],
			generatedAtMs: Date.now(),
			elapsedMs: 7,
			scanComplete: true,
		});

		const result = queryAscetTextCodeIndex(
			{ query: "shared_symbol", section: "header", match: "contains", limit: 20 },
			{ cwd: process.cwd() },
		);
		const envelope = result?.data as { result?: { matches?: Array<{ section?: string; methodName?: string }> } };
		assert.equal(result?.ok, true);
		assert.deepEqual(
			envelope.result?.matches?.map((match) => match.section),
			["header"],
		);
		assert.deepEqual(
			envelope.result?.matches?.map((match) => match.methodName),
			[""],
		);
	});

	test("parses legacy worker text_code entries into partitioned text-code index", async () => {
		const fixture = createReadyEnv();
		try {
			const payload = {
				operation: "warm_search_index",
				database: { name: "DemoDb", path: "C:\\ASCET\\DemoDb" },
				generatedAtUtc: "2026-07-25T00:00:00.000Z",
				elapsedMs: 7,
				scanComplete: true,
				textCodeScanComplete: true,
				entries: [
					{
						group: "text_code",
						name: "calc",
						componentPath: "AEB\\Controller",
						componentKind: "module",
						componentLanguageKind: "ESDL",
						elementKind: "body",
						displayType: "Process",
						path: "AEB\\Controller::calc#body",
						searchText: "P_AEB_IB_MaxVelocityDrop_Curve = speed - drop;",
					},
					{
						group: "text_code",
						name: "Controller:external_c",
						componentPath: "AEB\\Controller",
						componentKind: "module",
						componentLanguageKind: "C",
						elementKind: "external_c",
						displayType: "",
						path: "AEB\\Controller#external-c",
						searchText: "void helper_for_drop(void);",
					},
				],
			};

			const warmup = await ensureAscetSearchIndex({
				cwd: fixture.cwd,
				env: fixture.env,
				timeoutMs: 1000,
				includeTextCode: true,
				executeCli: async (request) => makeExecution(request, payload),
			});
			assert.equal(warmup.ok, true);

			const body = queryAscetTextCodeIndex(
				{ query: "speed - drop", section: "body", match: "contains", limit: 20 },
				{ cwd: fixture.cwd },
			);
			const bodyEnvelope = body?.data as { result?: { matches?: Array<{ section?: string; methodName?: string }> } };
			assert.equal(body?.ok, true);
			assert.equal(bodyEnvelope.result?.matches?.length, 1);
			assert.equal(bodyEnvelope.result?.matches?.[0]?.section, "body");
			assert.equal(bodyEnvelope.result?.matches?.[0]?.methodName, "calc");

			const external = queryAscetTextCodeIndex(
				{ query: "helper_for_drop", section: "external-c", match: "contains", limit: 20 },
				{ cwd: fixture.cwd },
			);
			const externalEnvelope = external?.data as { result?: { matches?: Array<{ section?: string }> } };
			assert.equal(external?.ok, true);
			assert.deepEqual(
				externalEnvelope.result?.matches?.map((match) => match.section),
				["external-c"],
			);
		} finally {
			fixture.cleanup();
		}
	});

	test("keeps unrelated ready partitions queryable when one partition fails", async () => {
		resetAscetSearchIndexForTest({
			databaseName: "DemoDb",
			databasePath: "C:\\ASCET\\DemoDb",
			components: warmupPayload().components,
			entries: warmupPayload().entries,
			textCodeEntries: warmupPayload().textCodeEntries,
			generatedAtMs: Date.now(),
			elapsedMs: 7,
			scanComplete: true,
			textCodeIncluded: true,
			textCodeScanComplete: true,
		});
		const fixture = createReadyEnv();
		try {
			const failed = await ensureAscetSearchIndex({
				cwd: fixture.cwd,
				env: { ...fixture.env, PI_ASCET_SEARCH_INDEX_FORCE: "1" },
				timeoutMs: 1000,
				partition: "text_code",
				includeTextCode: true,
				executeCli: async (request) => ({
					exitCode: 1,
					stdout: JSON.stringify({
						ok: false,
						result: null,
						error: { code: "text_scan_failed", message: "text code scan failed" },
					}),
					stderr: "",
					timedOut: false,
					request,
				}),
			});

			assert.equal(failed.ok, false);
			assert.equal(getAscetSearchIndexPartitionState("text_code")?.status, "failed");
			assert.equal(getAscetSearchIndexPartitionState("components")?.status, "ready");
			assert.equal(
				queryAscetComponentIndex({ query: "Controller", match: "exact", limit: 20 }, { cwd: fixture.cwd })?.ok,
				true,
			);
			assert.equal(
				queryAscetTextCodeIndex({ query: "speed - drop", match: "contains", limit: 20 }, { cwd: fixture.cwd }),
				undefined,
			);
		} finally {
			fixture.cleanup();
		}
	});

	test("shares concurrent warmups for the same partition", async () => {
		const fixture = createReadyEnv();
		const immediateScheduler = {
			submit: async <T>(job: { run: () => Promise<T> }) => job.run(),
			getSnapshot: () => ({
				hostState: "healthy" as const,
				runningJob: null,
				queuedJobs: [],
				recentJobs: [],
				pendingByAgent: {},
				activeCount: 0,
				resource: {
					key: "test",
					active: 0,
					queued: 0,
					concurrency: 1 as const,
					runningJob: null,
				},
			}),
		};
		let releaseTextCode: (() => void) | undefined;
		const textCodeStarted = new Promise<void>((resolve) => {
			releaseTextCode = resolve;
		});
		let calls = 0;
		try {
			const executeCli = async (request: AscetCliRequest) => {
				calls += 1;
				if (request.args.includes("text_code")) {
					await textCodeStarted;
				}
				return makeExecution(request, warmupPayload());
			};

			const firstTextCode = ensureAscetSearchIndex({
				cwd: fixture.cwd,
				env: { ...fixture.env, PI_ASCET_SEARCH_INDEX_FORCE: "1" },
				timeoutMs: 1000,
				partition: "text_code",
				includeTextCode: true,
				scheduler: immediateScheduler,
				executeCli,
			});
			const secondTextCode = ensureAscetSearchIndex({
				cwd: fixture.cwd,
				env: { ...fixture.env, PI_ASCET_SEARCH_INDEX_FORCE: "1" },
				timeoutMs: 1000,
				partition: "text_code",
				includeTextCode: true,
				scheduler: immediateScheduler,
				executeCli,
			});
			await waitForCallCount(() => calls, 1);
			releaseTextCode?.();
			await Promise.all([firstTextCode, secondTextCode]);
			assert.equal(calls, 1);

			await ensureAscetSearchIndex({
				cwd: fixture.cwd,
				env: { ...fixture.env, PI_ASCET_SEARCH_INDEX_FORCE: "1" },
				timeoutMs: 1000,
				partition: "components",
				scheduler: immediateScheduler,
				executeCli,
			});
			assert.equal(calls, 2);
		} finally {
			releaseTextCode?.();
			fixture.cleanup();
		}
	});

	test("does not share concurrent warmups across different cwd values", async () => {
		const firstFixture = createReadyEnv();
		const secondFixture = createReadyEnv();
		let calls = 0;
		try {
			const first = ensureAscetSearchIndex({
				cwd: firstFixture.cwd,
				env: { ...firstFixture.env, PI_ASCET_SEARCH_INDEX_FORCE: "1" },
				timeoutMs: 1000,
				partition: "components",
				executeCli: async (request) => {
					calls += 1;
					return makeExecution(request, warmupPayload());
				},
			});
			const second = ensureAscetSearchIndex({
				cwd: secondFixture.cwd,
				env: { ...secondFixture.env, PI_ASCET_SEARCH_INDEX_FORCE: "1" },
				timeoutMs: 1000,
				partition: "components",
				executeCli: async (request) => {
					calls += 1;
					return makeExecution(request, warmupPayload());
				},
			});

			await Promise.all([first, second]);
			assert.equal(calls, 2);
		} finally {
			firstFixture.cleanup();
			secondFixture.cleanup();
		}
	});
});
