import assert from "node:assert/strict";
import { afterEach, describe, test } from "node:test";
import type { AscetCliExecutionResult, AscetCliRequest } from "./cli.ts";
import { runAscetReadComponentChildren } from "./read-component-children.ts";
import { resetAscetSearchIndexForTest } from "./search-index.ts";

afterEach(() => {
	resetAscetSearchIndexForTest();
});

describe("read_component_children index-backed previews", () => {
	test("preview_children elements warms and reads element_decls without live fallback", async () => {
		const requests: AscetCliRequest[] = [];

		const result = await runAscetReadComponentChildren(
			{ componentPath: "DEMO\\PID", group: "elements" },
			{ cwd: process.cwd(), executeCli: makeExecution(requests) },
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
			"element_decls",
			"--force",
			"--component",
			"DEMO\\PID",
			"--json",
		]);
		assert.match(JSON.stringify(result.data), /quick_search_index/);
		assert.match(JSON.stringify(result.data), /pidKp/);
	});

	test("preview_children methods warms method_decls and omits primitive elements", async () => {
		const requests: AscetCliRequest[] = [];

		const result = await runAscetReadComponentChildren(
			{ componentPath: "DEMO/PID", group: "methods" },
			{ cwd: process.cwd(), executeCli: makeExecution(requests) },
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
			"method_decls",
			"--force",
			"--component",
			"DEMO/PID",
			"--json",
		]);
		const rendered = JSON.stringify(result.data);
		assert.match(rendered, /calc/);
		assert.doesNotMatch(rendered, /pidKp/);
	});

	test("preview_children methods falls back live when method metadata is empty", async () => {
		const requests: AscetCliRequest[] = [];

		const result = await runAscetReadComponentChildren(
			{ componentPath: "DEMO\\NoMethods", group: "methods" },
			{ cwd: process.cwd(), executeCli: makeEmptyMethodExecution(requests) },
		);

		assert.equal(result.ok, true);
		assert.deepEqual(
			requests.map((request) => request.args[1]),
			["warm_search_index", "read_component_children"],
		);
		assert.match(JSON.stringify(result.data), /live_fallback/);
	});
});

function makeEmptyMethodExecution(requests: AscetCliRequest[]) {
	return async (request: AscetCliRequest): Promise<AscetCliExecutionResult> => {
		requests.push(request);
		if (request.args[1] === "warm_search_index") {
			return okExecution(request, {
				operation: "warm_search_index",
				database: { name: "DemoDb", path: "C:\\ASCET\\DemoDb" },
				generatedAtUtc: "2026-07-25T00:00:00.000Z",
				elapsedMs: 2,
				scanComplete: true,
				components: [],
				entries: [],
				counts: { entries: 0 },
			});
		}
		return okExecution(request, {
			componentPath: "DEMO\\NoMethods",
			group: "methods",
			items: [{ name: "liveCalc", kind: "method" }],
		});
	};
}

function makeExecution(requests: AscetCliRequest[]) {
	return async (request: AscetCliRequest): Promise<AscetCliExecutionResult> => {
		requests.push(request);
		if (request.args[1] === "warm_search_index") {
			const partition = request.args[request.args.indexOf("--partition") + 1];
			const methodDeclarations =
				partition === "method_decls"
					? [
							{
								group: "method",
								componentPath: "DEMO\\PID",
								componentKind: "module",
								componentLanguageKind: "ESDL",
								methodName: "calc",
								methodKind: "Process",
								path: "DEMO\\PID::calc",
							},
						]
					: [];
			const entries =
				partition === "empty" || partition === "method_decls"
					? []
					: [
							{
								group: "primitive",
								componentPath: "DEMO\\PID",
								componentKind: "module",
								componentLanguageKind: "ESDL",
								elementName: "pidKp",
								elementKind: "cont",
								displayType: "cont",
								displayScope: "exported",
								referencedComponentPath: "",
								path: "DEMO\\PID::pidKp",
							},
							{
								group: "primitive",
								componentPath: "DEMO\\PID",
								componentKind: "module",
								componentLanguageKind: "ESDL",
								elementName: "calc",
								elementKind: "process",
								displayType: "process",
								displayScope: "local",
								referencedComponentPath: "",
								path: "DEMO\\PID::calc",
							},
						];
			return okExecution(request, {
				operation: "warm_search_index",
				database: { name: "DemoDb", path: "C:\\ASCET\\DemoDb" },
				generatedAtUtc: "2026-07-25T00:00:00.000Z",
				elapsedMs: 2,
				scanComplete: true,
				components: [],
				entries,
				methodDeclarations,
				counts: { entries: entries.length, methods: methodDeclarations.length },
			});
		}
		return okExecution(request, {
			componentPath: "DEMO\\NoMethods",
			group: "methods",
			items: [{ name: "liveCalc", kind: "method" }],
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
