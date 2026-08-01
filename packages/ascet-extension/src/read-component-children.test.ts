import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type { AscetCliExecutionResult, AscetCliRequest } from "./cli.ts";
import { runAscetReadComponentChildren } from "./read-component-children.ts";

describe("read_component_children direct reads", () => {
	test("reads element children directly", async () => {
		const requests: AscetCliRequest[] = [];

		const result = await runAscetReadComponentChildren(
			{ componentPath: "DEMO\\PID", group: "elements" },
			{ cwd: process.cwd(), executeCli: makeExecution(requests) },
		);

		assert.equal(result.ok, true);
		assert.deepEqual(
			requests.map((request) => request.args[1]),
			["read_component_children"],
		);
		assert.deepEqual(requests[0]?.args, [
			"exec",
			"read_component_children",
			"DEMO\\PID",
			"--group",
			"elements",
			"--json",
		]);
		assert.match(JSON.stringify(result.data), /pidKp/);
	});

	test("reads method children directly and omits primitive elements", async () => {
		const requests: AscetCliRequest[] = [];

		const result = await runAscetReadComponentChildren(
			{ componentPath: "DEMO/PID", group: "methods" },
			{ cwd: process.cwd(), executeCli: makeExecution(requests) },
		);

		assert.equal(result.ok, true);
		assert.deepEqual(
			requests.map((request) => request.args[1]),
			["read_component_children"],
		);
		assert.deepEqual(requests[0]?.args, [
			"exec",
			"read_component_children",
			"DEMO/PID",
			"--group",
			"methods",
			"--json",
		]);
		const rendered = JSON.stringify(result.data);
		assert.match(rendered, /calc/);
		assert.doesNotMatch(rendered, /pidKp/);
	});

	test("reads methods directly when metadata is empty", async () => {
		const requests: AscetCliRequest[] = [];

		const result = await runAscetReadComponentChildren(
			{ componentPath: "DEMO\\NoMethods", group: "methods" },
			{ cwd: process.cwd(), executeCli: makeEmptyMethodExecution(requests) },
		);

		assert.equal(result.ok, true);
		assert.deepEqual(
			requests.map((request) => request.args[1]),
			["read_component_children"],
		);
		assert.match(JSON.stringify(result.data), /liveCalc/);
	});
});

function makeExecution(requests: AscetCliRequest[]) {
	return async (request: AscetCliRequest): Promise<AscetCliExecutionResult> => {
		requests.push(request);
		const group = request.args[request.args.indexOf("--group") + 1];
		return okExecution(request, {
			componentPath: request.args[2],
			group,
			items: group === "methods" ? [{ name: "calc", kind: "method" }] : [{ name: "pidKp", kind: "parameter" }],
		});
	};
}

function makeEmptyMethodExecution(requests: AscetCliRequest[]) {
	return async (request: AscetCliRequest): Promise<AscetCliExecutionResult> => {
		requests.push(request);
		return okExecution(request, {
			componentPath: request.args[2],
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
