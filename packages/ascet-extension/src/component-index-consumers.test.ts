import assert from "node:assert/strict";
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

		const result = await runAscetResolveComponent(
			{ query: "PID", scopePath: "DEMO", match: "contains", limit: 5 },
			{ cwd: process.cwd(), executeCli: makeComponentExecution(requests) },
		);

		assert.equal(result.ok, true);
		assert.deepEqual(
			requests.map((request) => request.args[1]),
			["warm_search_index"],
		);
		assert.deepEqual(requests[0]?.args, [
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
	});

	test("list_components uses the components partition for folder navigation", async () => {
		const requests: AscetCliRequest[] = [];

		const result = await runAscetListComponents(
			{ folderPath: "DEMO", kind: "module", query: "PID", limit: 10, recursive: true },
			{ cwd: process.cwd(), executeCli: makeComponentExecution(requests) },
		);

		assert.equal(result.ok, true);
		assert.deepEqual(
			requests.map((request) => request.args[1]),
			["warm_search_index"],
		);
		assert.match(JSON.stringify(result.data), /quick_search_index/);
		assert.match(JSON.stringify(result.data), /DEMO\\\\PID/);
		assert.doesNotMatch(JSON.stringify(result.data), /DEMO\\\\Controller/);
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
