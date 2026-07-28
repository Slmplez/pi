import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, test } from "node:test";
import type { AscetCliExecutionResult, AscetCliRequest } from "./cli.ts";
import { runAscetListComponents } from "./list-components.ts";
import { runAscetResolveComponent } from "./resolve-component.ts";
import { resetAscetSearchIndexForTest } from "./search-index.ts";

afterEach(() => {
	resetAscetSearchIndexForTest();
});

describe("component index consumers", () => {
	test("resolve_component warms and reads the components partition before live fallback", async () => {
		const requests: AscetCliRequest[] = [];
		const cwd = mkdtempSync(join(tmpdir(), "pi-ascet-component-index-"));
		const originalStorage = process.env.PI_ASCET_SEARCH_INDEX_STORAGE;
		process.env.PI_ASCET_SEARCH_INDEX_STORAGE = "memory";
		try {
			const result = await runAscetResolveComponent(
				{ query: "PID", scopePath: "DEMO", match: "contains", limit: 5 },
				{
					cwd,
					env: { PI_ASCET_SEARCH_INDEX_STORAGE: "memory" },
					executeCli: makeComponentExecution(requests),
				},
			);

			assert.equal(result.ok, true);
			assert.deepEqual(
				requests.map((request) => request.args[1]),
				["warm_search_index"],
			);
			assert.deepEqual(requests[0]?.args.slice(0, 9), [
				"exec",
				"warm_search_index",
				"--partition",
				"components",
				"--json",
				"--max-components",
				"50",
				"--timeout-ms",
				"15000",
			]);
			assert.match(JSON.stringify(result.data), /quick_search_index/);
			assert.match(JSON.stringify(result.data), /DEMO\\\\PID/);
		} finally {
			rmSync(cwd, { recursive: true, force: true });
			if (originalStorage === undefined) {
				delete process.env.PI_ASCET_SEARCH_INDEX_STORAGE;
			} else {
				process.env.PI_ASCET_SEARCH_INDEX_STORAGE = originalStorage;
			}
		}
	});

	test("list_components keeps the live CLI fallback when the index is explicitly disabled", async () => {
		const requests: AscetCliRequest[] = [];

		const result = await runAscetListComponents(
			{ folderPath: "DEMO", kind: "module", query: "PID", limit: 10, recursive: true },
			{
				cwd: process.cwd(),
				env: { PI_ASCET_SEARCH_INDEX: "0" },
				executeCli: makeComponentExecution(requests),
			},
		);

		assert.equal(result.ok, true);
		assert.deepEqual(
			requests.map((request) => request.args[1]),
			["list_components"],
		);
		assert.deepEqual(requests[0]?.args, [
			"exec",
			"list_components",
			"DEMO",
			"--kind",
			"module",
			"--query",
			"PID",
			"--limit",
			"10",
			"--recursive",
			"--json",
		]);
	});
});

function makeComponentExecution(requests: AscetCliRequest[]) {
	return async (request: AscetCliRequest): Promise<AscetCliExecutionResult> => {
		requests.push(request);
		return okExecution(request, {
			operation: "warm_search_index",
			partition: "components",
			database: { name: "DemoDb", path: "C:\\ASCET\\DemoDb" },
			generatedAtUtc: "2026-07-25T00:00:00.000Z",
			elapsedMs: 2,
			scanComplete: true,
			components: [
				{
					path: "DEMO\\PID",
					name: "PID",
					kind: "module",
					languageKind: "ESDL",
					displayName: "PID",
					parentPath: "DEMO",
					ownerKind: "folder",
					targetKind: "component",
					objectKind: "module",
				},
				{
					path: "DEMO\\Controller",
					name: "Controller",
					kind: "class",
					languageKind: "ESDL",
					displayName: "Controller",
					parentPath: "DEMO",
					ownerKind: "folder",
					targetKind: "component",
					objectKind: "class",
				},
			],
			counts: { components: 2 },
		});
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
