import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { buildReadImplementationArgs, runAscetReadImplementation } from "./read-implementation.ts";

describe("read_implementation request", () => {
	test("passes traversal budgets to the CLI contract", () => {
		assert.deepEqual(
			buildReadImplementationArgs({
				componentPath: "DEMO/PID",
				mode: "default",
				detailLevel: "full",
				maxDepth: 3,
				maxElements: 25,
				timeoutMs: 5000,
			}),
			[
				"exec",
				"read_implementation",
				"DEMO\\PID",
				"--default",
				"--detail-level",
				"full",
				"--max-depth",
				"3",
				"--max-elements",
				"25",
				"--timeout-ms",
				"5000",
				"--json",
			],
		);
	});

	test("supports disabling the budget rollout for an explicit legacy fallback", async () => {
		let observedArgs: string[] | undefined;
		const result = await runAscetReadImplementation(
			{ componentPath: "DEMO/PID" },
			{
				cwd: process.cwd(),
				env: { ASCET_IMPLEMENTATION_BUDGETS: "0", ASCET_CLI_PATH: process.execPath },
				executeCli: async (request) => {
					observedArgs = request.args;
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
		assert.deepEqual(observedArgs, ["exec", "read_implementation", "DEMO\\PID", "--detail-level", "full", "--json"]);
	});
});
