import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type { AscetCliExecutionResult, AscetCliRequest } from "./cli.ts";
import { buildSetEnumeratorsArgs, runAscetSetEnumerators } from "./set-enumerators.ts";

function response(request: AscetCliRequest, result: unknown): AscetCliExecutionResult {
	return {
		exitCode: 0,
		stdout: JSON.stringify({ ok: true, result, error: null }),
		stderr: "",
		timedOut: false,
		request,
	};
}

describe("set_enumerators automatic readback", () => {
	test("requests verification and accepts exact enumerator name/order", async () => {
		let args: string[] = [];
		const result = await runAscetSetEnumerators(
			{ componentPath: "DEMO/Switch", enumerators: ["OFF", "ON"], verifyReadback: true },
			{
				cwd: process.cwd(),
				executeCli: async (request) => {
					args = request.args;
					return response(request, {
						enumerators: ["OFF", "ON"],
						verifyReadbackRequested: true,
						readbackVerified: true,
					});
				},
			},
		);

		assert.equal(result.ok, true);
		assert.deepEqual(args, [
			"exec",
			"set_enumerators",
			"DEMO\\Switch",
			"--items",
			"OFF,ON",
			"--verify-readback",
			"--json",
		]);
	});

	test("converts a successful backend envelope into readback_mismatch when order differs", async () => {
		const result = await runAscetSetEnumerators(
			{ componentPath: "DEMO/Switch", enumerators: ["OFF", "ON"], verifyReadback: true },
			{
				cwd: process.cwd(),
				executeCli: async (request) =>
					response(request, {
						enumerators: ["ON", "OFF"],
						verifyReadbackRequested: true,
						readbackVerified: true,
					}),
			},
		);

		assert.equal(result.ok, false);
		assert.equal(result.error?.code, "readback_mismatch");
		assert.deepEqual(result.error?.details, {
			matches: false,
			expected: ["OFF", "ON"],
			actual: ["ON", "OFF"],
			mismatchIndex: 0,
			requiresReadback: true,
		});
	});

	test("does not require automatic readback evidence for a non-verifying internal call", async () => {
		const result = await runAscetSetEnumerators(
			{ componentPath: "DEMO/Switch", enumerators: ["OFF", "ON"] },
			{
				cwd: process.cwd(),
				executeCli: async (request) => response(request, { enumerators: [] }),
			},
		);
		assert.equal(result.ok, true);
		assert.deepEqual(buildSetEnumeratorsArgs({ componentPath: "DEMO/Switch", enumerators: ["OFF", "ON"] }), [
			"exec",
			"set_enumerators",
			"DEMO\\Switch",
			"--items",
			"OFF,ON",
			"--json",
		]);
	});
});
