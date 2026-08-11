import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type { AscetCliExecutionResult, AscetCliRequest } from "../cli.ts";
import {
	buildAscetEditabilityArgs,
	formatAscetEditabilityResult,
	getAscetEditabilityOperation,
	runApprovedAscetEditability,
	runAscetEditability,
} from "./editability.ts";

function successfulExecution(request: AscetCliRequest, result: unknown): AscetCliExecutionResult {
	return {
		exitCode: 0,
		stdout: JSON.stringify(result),
		stderr: "",
		timedOut: false,
		request,
	};
}

describe("ASCET editability actions", () => {
	test("keeps check and set as mode-discriminated edit actions", () => {
		assert.equal(getAscetEditabilityOperation("check"), "component_editable_check");
		assert.equal(getAscetEditabilityOperation("set"), "component_editable_set");
		assert.deepEqual(buildAscetEditabilityArgs({ mode: "check", componentPath: "\\DEMO\\PID" }), [
			"exec",
			"component_editable_check",
			"DEMO\\PID",
			"--json",
		]);
	});

	test("check normalizes the path and never requests confirmation", async () => {
		let observedArgs: string[] | undefined;
		let confirmationCalls = 0;
		const result = await runApprovedAscetEditability(
			{ mode: "check", componentPath: "\\DEMO\\PID" },
			{
				cwd: process.cwd(),
				executeCli: async (request) => {
					observedArgs = request.args;
					return successfulExecution(request, { ok: true, result: true, error: null });
				},
			},
			{
				hasUI: true,
				ui: {
					async confirm() {
						confirmationCalls += 1;
						return true;
					},
				},
			},
		);

		assert.equal(result.ok, true);
		assert.equal(result.data, true);
		assert.equal(confirmationCalls, 0);
		assert.deepEqual(observedArgs, ["exec", "component_editable_check", "DEMO\\PID", "--json"]);
	});

	test("set uses generic preflight and confirmation-not-granted behavior", async () => {
		const preflight = await runApprovedAscetEditability(
			{ mode: "set", componentPath: "DEMO/PID" },
			{ cwd: process.cwd() },
			{},
		);
		assert.equal(preflight.error?.code, "ascet_edit_preflight_required");

		const notGranted = await runApprovedAscetEditability(
			{ mode: "set", componentPath: "DEMO/PID", executeWrite: true },
			{ cwd: process.cwd() },
			{
				hasUI: true,
				ui: {
					async confirm() {
						return false;
					},
				},
			},
		);
		assert.equal(notGranted.error?.code, "ascet_edit_confirmation_not_granted");
		assert.deepEqual(notGranted.data, {
			operation: "component_editable_set",
			writeExecuted: false,
			summary: "ASCET editability request:\noperation: component_editable_set\ncomponentPath: DEMO/PID",
			confirmation: { code: "ascet_edit_confirmation_not_granted" },
		});
	});

	test("set never starts its CLI write after the tool run is cancelled during confirmation", async () => {
		const toolRun = new AbortController();
		let cliCalls = 0;
		const resultPromise = runApprovedAscetEditability(
			{ mode: "set", componentPath: "DEMO/PID", executeWrite: true },
			{
				cwd: process.cwd(),
				signal: toolRun.signal,
				executeCli: async (request) => {
					cliCalls += 1;
					return successfulExecution(request, { ok: true, result: true, error: null });
				},
			},
			{
				hasUI: true,
				ui: {
					async confirm() {
						toolRun.abort();
						return true;
					},
				},
			},
		);

		const result = await resultPromise;
		assert.equal(cliCalls, 0);
		assert.equal(result.error?.code, "ascet_edit_operation_aborted_before_write");
		assert.equal((result.data as { preflightOnly?: boolean } | null)?.preflightOnly, undefined);
	});

	test("normalizes direct, object, and envelope results to the agent payload", async () => {
		for (const cliResult of [false, { editable: true }, { result: false }, { result: { editable: true } }]) {
			const result = await runAscetEditability(
				{ mode: "check", componentPath: "DEMO/PID" },
				{ cwd: process.cwd(), executeCli: async (request) => successfulExecution(request, cliResult) },
			);
			assert.equal(result.ok, true);
			assert.equal(typeof result.data, "boolean");
			assert.deepEqual(JSON.parse(formatAscetEditabilityResult(result)), { editable: result.data });
		}
	});

	test("treats a successful set response with editable=false as a failed write", async () => {
		const result = await runAscetEditability(
			{ mode: "set", componentPath: "DEMO/PID" },
			{
				cwd: process.cwd(),
				executeCli: async (request) =>
					successfulExecution(request, { ok: true, result: { editable: false }, error: null }),
			},
		);

		assert.equal(result.ok, false);
		assert.equal(result.data, false);
		assert.equal(result.error?.code, "component_not_editable");
	});

	test("returns ascet_edit_invalid_output for non-boolean CLI output", async () => {
		const result = await runAscetEditability(
			{ mode: "check", componentPath: "DEMO/PID" },
			{ cwd: process.cwd(), executeCli: async (request) => successfulExecution(request, { rawOutput: "false" }) },
		);
		assert.equal(result.ok, false);
		assert.equal(result.error?.code, "ascet_edit_invalid_output");
	});
});
