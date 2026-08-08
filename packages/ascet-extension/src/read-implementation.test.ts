import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { buildReadImplementationArgs, runAscetReadImplementation } from "./read-implementation.ts";

describe("read_implementation request", () => {
	test("passes only CLI-supported implementation selection arguments", () => {
		assert.deepEqual(
			buildReadImplementationArgs({
				componentPath: "DEMO/PID",
				mode: "default",
				timeoutMs: 5000,
			}),
			["exec", "read_implementation", "DEMO\\PID", "--default", "--json"],
		);
	});

	test("applies timeout to the CLI process rather than unsupported operation arguments", async () => {
		let observedArgs: string[] | undefined;
		let observedTimeoutMs: number | undefined;
		const result = await runAscetReadImplementation(
			{ componentPath: "DEMO/PID", timeoutMs: 5000 },
			{
				cwd: process.cwd(),
				executeCli: async (request) => {
					observedArgs = request.args;
					observedTimeoutMs = request.timeoutMs;
					return {
						exitCode: 0,
						stdout: JSON.stringify({ ok: true, result: {}, error: null }),
						stderr: "",
						timedOut: false,
						request,
					};
				},
			},
		);

		assert.equal(result.ok, true);
		assert.deepEqual(observedArgs, ["exec", "read_implementation", "DEMO\\PID", "--json"]);
		assert.equal(observedTimeoutMs, 5000);
	});
});
